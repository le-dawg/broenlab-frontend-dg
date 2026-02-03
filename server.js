require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const session = require('express-session');
const msal = require('@azure/msal-node');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Session middleware for OAuth flow
const SESSION_SECRET = process.env.SESSION_SECRET;

// Validate session secret is set and secure
if (!SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: SESSION_SECRET must be set in production');
    process.exit(1);
  } else {
    console.warn('WARNING: SESSION_SECRET not set. Using temporary random secret for development.');
    console.warn('Set SESSION_SECRET in .env for consistent sessions across restarts.');
  }
}

if (process.env.NODE_ENV === 'production' && SESSION_SECRET === 'change_this_in_prod') {
  console.error('FATAL: SESSION_SECRET must be changed from default value in production');
  process.exit(1);
}

// Use provided secret or generate a random one for development
const crypto = require('crypto');
const sessionSecret = SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
// Optional: support an alternate/test webhook path (e.g. /webhook-test/...)
const N8N_WEBHOOK_URL_TEST = process.env.N8N_WEBHOOK_URL_TEST;
const N8N_FEEDBACK_WEBHOOK_URL = process.env.N8N_FEEDBACK_WEBHOOK_URL;
const N8N_USERNAME = process.env.N8N_USERNAME;
const N8N_PASSWORD = process.env.N8N_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_in_prod';

// Microsoft Entra ID (Azure AD) Configuration
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || 'common'; // 'common' enables multi-tenant
const AZURE_REDIRECT_URI = process.env.AZURE_REDIRECT_URI || `http://localhost:${PORT}/auth/redirect`;

// MSAL Configuration for multi-tenant authentication
let msalConfig = null;
let confidentialClientApplication = null;

if (AZURE_CLIENT_ID && AZURE_CLIENT_SECRET) {
  msalConfig = {
    auth: {
      clientId: AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
      clientSecret: AZURE_CLIENT_SECRET,
    },
    system: {
      loggerOptions: {
        loggerCallback(loglevel, message, containsPii) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[MSAL]', message);
          }
        },
        piiLoggingEnabled: false,
        logLevel: process.env.NODE_ENV === 'development' ? msal.LogLevel.Info : msal.LogLevel.Warning,
      },
    },
  };

  confidentialClientApplication = new msal.ConfidentialClientApplication(msalConfig);
  console.log('Microsoft Entra ID authentication enabled (multi-tenant mode)');
} else {
  console.log('Microsoft Entra ID authentication disabled - AZURE_CLIENT_ID or AZURE_CLIENT_SECRET not set');
}

if (!N8N_WEBHOOK_URL || !N8N_USERNAME || !N8N_PASSWORD) {
  console.warn('Warning: N8N_WEBHOOK_URL, N8N_USERNAME or N8N_PASSWORD not set in environment. Set them before production deployment.');
}

if (!N8N_FEEDBACK_WEBHOOK_URL) {
  console.warn('Warning: N8N_FEEDBACK_WEBHOOK_URL not set in environment. Feedback feature will not work properly.');
}

// Serve static files (your index.html lives at project root)
app.use(express.static(path.join(__dirname)));

// GET /api/config - provide client-side configuration (non-sensitive values only)
app.get('/api/config', (req, res) => {
  res.json({
    feedbackWebhookUrl: N8N_FEEDBACK_WEBHOOK_URL || null,
    azureAuthEnabled: !!(AZURE_CLIENT_ID && AZURE_CLIENT_SECRET),
  });
});

// Microsoft Entra ID OAuth Routes
// GET /auth/signin - Initiate OAuth flow
app.get('/auth/signin', async (req, res) => {
  if (!confidentialClientApplication) {
    return res.status(503).json({ error: 'Microsoft authentication not configured' });
  }

  try {
    // Generate PKCE codes for enhanced security
    const cryptoProvider = new msal.CryptoProvider();
    const { verifier, challenge } = await cryptoProvider.generatePkceCodes();

    // Store PKCE verifier in session
    req.session.pkceCodes = {
      challengeMethod: 'S256',
      verifier: verifier,
      challenge: challenge,
    };

    // Build authorization URL
    const authCodeUrlParameters = {
      scopes: ['user.read', 'openid', 'profile', 'email'],
      redirectUri: AZURE_REDIRECT_URI,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      prompt: 'select_account', // Allow users to select account
    };

    const authUrl = await confidentialClientApplication.getAuthCodeUrl(authCodeUrlParameters);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating auth:', error);
    res.status(500).json({ error: 'Failed to initiate authentication' });
  }
});

// GET /auth/redirect - OAuth callback endpoint
app.get('/auth/redirect', async (req, res) => {
  if (!confidentialClientApplication) {
    return res.status(503).json({ error: 'Microsoft authentication not configured' });
  }

  const { code, error, error_description } = req.query;

  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.redirect(`/?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect('/?error=No authorization code received');
  }

  try {
    const pkceCodes = req.session.pkceCodes;
    if (!pkceCodes) {
      return res.redirect('/?error=Session expired. Please try again.');
    }

    // Exchange authorization code for tokens
    const tokenRequest = {
      code: code,
      scopes: ['user.read', 'openid', 'profile', 'email'],
      redirectUri: AZURE_REDIRECT_URI,
      codeVerifier: pkceCodes.verifier,
    };

    const response = await confidentialClientApplication.acquireTokenByCode(tokenRequest);

    // Extract user information from ID token
    const { account, idTokenClaims } = response;
    
    if (!account) {
      return res.redirect('/?error=Failed to retrieve user account');
    }

    // Create a JWT session token with user info
    const userInfo = {
      sub: account.homeAccountId,
      email: idTokenClaims.preferred_username || idTokenClaims.email || account.username,
      name: idTokenClaims.name || account.name,
      provider: 'microsoft',
      tenantId: account.tenantId,
    };

    const token = jwt.sign(userInfo, JWT_SECRET, { expiresIn: '24h' });

    // Set secure httpOnly cookie with consistent security settings
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Clear PKCE codes from session (no longer needed)
    delete req.session.pkceCodes;

    // Redirect to chat page
    res.redirect('/chat.html');
  } catch (error) {
    console.error('Token exchange error:', error);
    res.redirect(`/?error=${encodeURIComponent('Authentication failed. Please try again.')}`);
  }
});

// POST /login - validate credentials against env and set httpOnly cookie
app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  console.log('Login attempt:', { username, providedPassword: password ? '***' : 'empty', expectedUser: N8N_USERNAME });
  if (username === N8N_USERNAME && password === N8N_PASSWORD) {
    const token = jwt.sign({ sub: username }, JWT_SECRET, { expiresIn: '2h' });
    console.log('Login successful');
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000,
    });
    return res.json({ ok: true });
  }
  console.log('Login failed - invalid credentials');
  return res.status(401).json({ ok: false, error: 'Invalid credentials' });
});

// POST /logout - clear cookie and session
app.post('/logout', (req, res) => {
  res.clearCookie('session');
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
    });
  }
  res.json({ ok: true });
});

// Proxy endpoint - forwards request to real n8n webhook attaching Basic Auth
app.all('/proxy/webhook', async (req, res) => {
  try {
    const token = req.cookies.session;
    console.log('Proxy request - cookies received:', req.cookies);
    if (!token) {
      console.log('No session cookie found - returning 401');
      return res.status(401).json({ error: 'Not authenticated' });
    }
    jwt.verify(token, JWT_SECRET);

    const basic = Buffer.from(`${N8N_USERNAME}:${N8N_PASSWORD}`).toString('base64');

    // Build headers for upstream request
    const upstreamHeaders = {
      'Content-Type': req.get('content-type') || 'application/json',
      Authorization: `Basic ${basic}`,
    };

    // Forward body when applicable
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {});

    const upstream = await fetch(N8N_WEBHOOK_URL, {
      method: req.method,
      headers: upstreamHeaders,
      body,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      if (!['transfer-encoding', 'content-encoding', 'connection'].includes(k.toLowerCase())) {
        res.setHeader(k, v);
      }
    });
    res.send(text);
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).json({ error: 'Proxy error' });
  }
});

// Additional proxy route for webhook-test path (some n8n installs use `/webhook-test/...`)
// For example: https://n8n-ldlsb-u47163.vm.elestio.app/webhook-test/<id>
app.all('/proxy/webhook-test', async (req, res) => {
  try {
    const token = req.cookies.session;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    jwt.verify(token, JWT_SECRET);

    const target = N8N_WEBHOOK_URL_TEST || N8N_WEBHOOK_URL;
    if (!target) return res.status(500).json({ error: 'N8N webhook URL not configured' });

    const basic = Buffer.from(`${N8N_USERNAME}:${N8N_PASSWORD}`).toString('base64');
    const upstreamHeaders = {
      'Content-Type': req.get('content-type') || 'application/json',
      Authorization: `Basic ${basic}`,
    };
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {});

    const upstream = await fetch(target, {
      method: req.method,
      headers: upstreamHeaders,
      body,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      if (!['transfer-encoding', 'content-encoding', 'connection'].includes(k.toLowerCase())) {
        res.setHeader(k, v);
      }
    });
    res.send(text);
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).json({ error: 'Proxy error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
