Render deployment instructions
=============================

This repo contains a static `index.html` and a small Express server (`server.js`) that:

- Serves the static `index.html` so client and server share the same origin.
- Provides `/login` to validate credentials (checked against environment variables) and set an httpOnly session cookie.
- **NEW:** Provides Microsoft Entra ID (Azure AD) multi-tenant OAuth authentication via `/auth/signin` and `/auth/redirect` endpoints.
- Provides `/proxy/webhook` which proxies requests to the real n8n webhook URL, attaching Basic Auth using environment variables.

This keeps your n8n credentials off the client and allows the chat widget to call `/proxy/webhook` as the webhook URL.

## Authentication Options

The application supports two authentication methods:

1. **Microsoft Entra ID OAuth 2.0** (Recommended for production)
   - Multi-tenant support - accepts any Microsoft account from any organizational directory
   - Industry-standard OAuth 2.0 with PKCE security
   - See [MICROSOFT_AUTH_SETUP.md](./MICROSOFT_AUTH_SETUP.md) for detailed setup instructions

2. **Username/Password** (Fallback)
   - Simple authentication using `N8N_USERNAME` and `N8N_PASSWORD` environment variables
   - Automatically used when Azure credentials are not configured

Local testing
-------------
1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from `.env.example` and fill in values (do NOT commit `.env`):

```bash
cp .env.example .env
# edit .env and replace JWT_SECRET with a secure random string
```

3. Start the server:

```bash
npm start
```

4. Visit `http://localhost:3000` in your browser. The login overlay in the app will POST to `/login` and the server will set an httpOnly cookie.

Deploy to Render (Web Service)
-----------------------------
1. Push this repo to GitHub (or connect Render to your Git provider).
2. In the Render dashboard, create a new "Web Service".
   - Connect your repository.
   - Root: the repo root where `server.js` and `package.json` are located.
   - Build Command: (none required)
   - Start Command: `npm start`
3. In the Render service settings, add the following Environment Variables (from `.env.example`):
   - `N8N_WEBHOOK_URL` (your real n8n webhook URL)
   - `N8N_USERNAME` (the username)
   - `N8N_PASSWORD` (the password)
   - `JWT_SECRET` (long random string)
   - **Optional - for Microsoft authentication:**
     - `AZURE_CLIENT_ID` (from Azure app registration)
     - `AZURE_CLIENT_SECRET` (from Azure app registration)
     - `AZURE_TENANT_ID=common` (for multi-tenant support)
     - `AZURE_REDIRECT_URI` (e.g., `https://your-app.onrender.com/auth/redirect`)
     - `SESSION_SECRET` (long random string)
   - See [MICROSOFT_AUTH_SETUP.md](./MICROSOFT_AUTH_SETUP.md) for detailed Azure setup instructions

4. Deploy. Render will run `npm start` and your app will serve the static site + endpoints on the same origin.

Notes
-----
- Ensure `JWT_SECRET` is strong and never committed.
- In production, Render serves TLS (HTTPS) automatically — session cookies are set with `secure: true` when NODE_ENV=production.
- If you want purely serverless functions instead of a persistent web service, you can port the endpoints to Render's serverless Functions or Vercel/Netlify functions, but you must adapt paths and cookie handling accordingly.

User Feedback Feature
---------------------
The chat interface includes a feedback mechanism for rating bot responses:

### User Experience
- Each bot message displays thumbs up (👍) and thumbs down (👎) emoji buttons
- Emojis appear greyed out initially
- Clicking an emoji makes it colored and active
- Users can switch between ratings freely
- Each message tracks its own feedback independently

### Technical Details
- Feedback webhook URL configured via `N8N_FEEDBACK_WEBHOOK_URL` environment variable on server
- Client fetches configuration from `/api/config` endpoint on page load
- Feedback submissions POST to: URL specified in `N8N_FEEDBACK_WEBHOOK_URL` (example: `https://n8n-ldlsb-u47163.vm.elestio.app/webhook/9f23ec09-0e55-43f1-9a4b-11bf1d9f211c`)
- Payload format: `{ "rating": 0 }` (0 = thumbs down) or `{ "rating": 1 }` (thumbs up)
- Implementation spans `chat.html` (client) and `server.js` (config endpoint)
- No authentication required for feedback webhook (separate from chat webhook)

### Visual Design
- Emojis are visually distinct from the main chat bubble
- Positioned below message content with a subtle border separator
- Small but clearly visible size (1.25rem)
- Smooth transitions on hover and activation states
