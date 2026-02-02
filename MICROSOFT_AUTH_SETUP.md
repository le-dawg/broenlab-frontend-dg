# Microsoft Entra ID Multi-Tenant Authentication Setup Guide

This guide explains how to configure Microsoft Entra ID (formerly Azure AD) multi-tenant authentication for the BROEN-LAB application.

## Overview

The application now supports two authentication methods:
1. **Microsoft Entra ID OAuth 2.0** - Allows any Microsoft account from any organizational directory (multi-tenant)
2. **Username/Password** - Fallback authentication using environment variables

## Security Features

This implementation follows industry-standard security best practices:
- ✅ **Official Microsoft MSAL Library** - Uses `@azure/msal-node`, Microsoft's tested authentication library
- ✅ **OAuth 2.0 Authorization Code Flow** - Industry-standard authentication flow
- ✅ **PKCE (Proof Key for Code Exchange)** - Enhanced security for authorization code exchange
- ✅ **HttpOnly Cookies** - Session tokens stored in secure, httpOnly cookies
- ✅ **Multi-Tenant Support** - Accepts accounts from any Microsoft Entra ID tenant
- ✅ **Secure Session Management** - Uses `express-session` with cryptographic secrets
- ✅ **Token Validation** - All tokens are validated using JWT signatures

## Prerequisites

- An Azure subscription (free tier works)
- Access to Azure Portal (portal.azure.com)
- Ability to register applications in your Azure AD tenant (either administrator permissions, or regular user access if "Users can register applications" setting is enabled in your tenant)

## Step 1: Register Application in Azure Portal

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Microsoft Entra ID** (or **Azure Active Directory**)
3. Select **App registrations** from the left menu
4. Click **New registration**

### Application Registration Settings

Fill in the following information:

**Name:** `BROEN-LAB Chat Application` (or your preferred name)

**Supported account types:** Select one of:
- ✅ **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)** - RECOMMENDED for the requirement
- Or **Accounts in any organizational directory and personal Microsoft accounts** - If you also want to support personal Microsoft accounts (outlook.com, hotmail.com, etc.)

**Redirect URI:**
- Platform: **Web**
- URL: 
  - For local development: `http://localhost:3000/auth/redirect`
  - For production: `https://your-domain.com/auth/redirect`
  
  (You can add multiple redirect URIs later)

5. Click **Register**

## Step 2: Create Client Secret

1. After registration, you'll be taken to the app's overview page
2. Note the **Application (client) ID** - you'll need this for `AZURE_CLIENT_ID`
3. Note the **Directory (tenant) ID** - though for multi-tenant, we use `common`
4. From the left menu, select **Certificates & secrets**
5. Click **New client secret**
6. Add a description: `BROEN-LAB Server Secret`
7. Choose an expiration period (6 months, 12 months, 24 months, or custom)
8. Click **Add**
9. **IMPORTANT:** Copy the secret **Value** immediately - you can't view it again later
   - This will be your `AZURE_CLIENT_SECRET`

## Step 3: Configure API Permissions (Optional)

The application requests these permissions by default:
- `user.read` - Read user's profile
- `openid` - Sign in and read user profile
- `profile` - Read user's profile
- `email` - Read user's email address

These are basic permissions that don't require admin consent. If you need additional permissions:

1. Go to **API permissions** in your app registration
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Select the permissions you need
6. If required, click **Grant admin consent**

## Step 4: Configure Environment Variables

Update your `.env` file with the Azure application credentials:

```bash
# Microsoft Entra ID (Azure AD) Multi-Tenant Authentication
AZURE_CLIENT_ID=your-application-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-value-here
AZURE_TENANT_ID=common
AZURE_REDIRECT_URI=http://localhost:3000/auth/redirect

# Session Security
SESSION_SECRET=replace_this_with_a_long_random_string

# Keep existing N8N and JWT settings
JWT_SECRET=replace_this_with_a_long_random_string
N8N_WEBHOOK_URL=your-n8n-webhook-url
N8N_USERNAME=your-username
N8N_PASSWORD=your-password
```

### Important Notes:

- **`AZURE_TENANT_ID=common`** - This enables multi-tenant support. Don't change this unless you want to restrict to a specific tenant
- **Generate strong secrets** for `SESSION_SECRET` and `JWT_SECRET`:
  ```bash
  # Generate secure random strings on Linux/Mac:
  openssl rand -base64 32
  ```
- **Never commit** `.env` file to version control
- For **production deployment**, update `AZURE_REDIRECT_URI` to your production domain

## Step 5: Production Deployment

### Render.com Deployment

If deploying to Render:

1. Go to your service's **Environment** tab
2. Add these environment variables:
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`
   - `AZURE_TENANT_ID` (set to `common`)
   - `AZURE_REDIRECT_URI` (e.g., `https://your-app.onrender.com/auth/redirect`)
   - `SESSION_SECRET`
   - `NODE_ENV=production`

3. In Azure Portal, add the production redirect URI:
   - Go to your app registration → **Authentication**
   - Under **Web** platform, click **Add URI**
   - Add: `https://your-app.onrender.com/auth/redirect`
   - Save

### Other Platforms

For other platforms (Vercel, Netlify, Heroku, etc.):
- Set the same environment variables in your platform's settings
- Update the redirect URI in Azure Portal to match your deployment URL
- Ensure `NODE_ENV=production` for secure cookie settings

## Step 6: Test Authentication

1. Start your application:
   ```bash
   npm start
   ```

2. Visit `http://localhost:3000`

3. You should see two options:
   - **Sign in with Microsoft** button (if Azure credentials are configured)
   - Traditional email/password form

4. Click **Sign in with Microsoft**
   - You'll be redirected to Microsoft's login page
   - Sign in with any Microsoft account (any tenant if using multi-tenant)
   - Grant consent for the requested permissions
   - You'll be redirected back to your application
   - Session cookie will be set and you'll access the chat interface

## Troubleshooting

### "Sign in with Microsoft" button doesn't appear

- Verify `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` are set in `.env`
- Check server logs for initialization messages
- Restart the server after updating environment variables

### Redirect URI mismatch error

Error: `AADSTS50011: The redirect URI specified in the request does not match`

**Solution:**
- Ensure the redirect URI in `.env` matches exactly what's registered in Azure Portal
- Check for trailing slashes, http vs https, localhost vs 127.0.0.1
- Add the exact redirect URI to Azure Portal → Authentication → Web → Redirect URIs

### Multi-tenant not working

**Verify these settings:**
- In Azure Portal → App registration → Authentication
- "Supported account types" should be set to "Accounts in any organizational directory"
- `AZURE_TENANT_ID` in `.env` should be `common`

### Session expires too quickly

By default, sessions last 24 hours. To adjust:
- Update the JWT token expiration in `server.js` (search for `expiresIn: '24h'`)
- Update cookie maxAge (search for `maxAge: 24 * 60 * 60 * 1000`)

## Security Best Practices Implemented

1. **PKCE Flow** - Prevents authorization code interception attacks
2. **HttpOnly Cookies** - Protects session tokens from XSS attacks
3. **Secure Cookies** - Enabled automatically in production (HTTPS)
4. **SameSite=Lax** - Protects against CSRF attacks
5. **Token Validation** - All tokens validated with cryptographic signatures
6. **Session Secrets** - Strong random secrets for session encryption
7. **Official Libraries** - Uses Microsoft's official MSAL library
8. **Error Handling** - Proper error handling without leaking sensitive data
9. **Minimal Permissions** - Only requests necessary user permissions

## Architecture

```
User → Browser → Application Server → Microsoft Entra ID
                       ↓
                   JWT Cookie
                       ↓
                 Protected Routes
```

### Authentication Flow

1. User clicks "Sign in with Microsoft"
2. Server generates PKCE challenge and redirects to Microsoft login
3. User authenticates with Microsoft
4. Microsoft redirects back with authorization code
5. Server exchanges code for tokens using PKCE verifier
6. Server creates JWT session token with user info
7. Session token stored in httpOnly cookie
8. User accesses protected chat interface

## Fallback Authentication

If Azure credentials are not configured, the application automatically falls back to the traditional username/password authentication using `N8N_USERNAME` and `N8N_PASSWORD` from environment variables.

## Support

For issues with:
- **Azure configuration**: Check [Microsoft Entra ID documentation](https://learn.microsoft.com/en-us/entra/identity-platform/)
- **MSAL library**: See [@azure/msal-node documentation](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- **Application issues**: Check server logs and browser console for errors
