# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a chat proxy application that provides secure access to an n8n webhook-based chatbot. The architecture consists of:

- **Express.js proxy server** (`server.js`) - Handles authentication, session management, and proxies requests to n8n webhook
- **Static HTML frontend** - Login page (`index.html`) and chat interface (`chat.html`)
- **Authentication flow** - JWT-based session cookies with httpOnly security

The proxy server keeps n8n credentials server-side while allowing the client to interact with the chatbot securely.

## Development Commands

### Install dependencies
```bash
npm install
```

### Environment setup
Before running, copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
# Edit .env and set:
# - JWT_SECRET (use a long random string)
# - N8N_WEBHOOK_URL (your n8n webhook endpoint)
# - N8N_USERNAME and N8N_PASSWORD (for Basic Auth to n8n)
```

### Run in development
```bash
npm run dev
```
Sets `NODE_ENV=development` and runs on port 3000 (cookies not set as secure).

### Run in production
```bash
npm start
```
Uses `NODE_ENV=production` by default (cookies set as secure for HTTPS).

### Access the application
Visit `http://localhost:3000` - you'll see the login page. After authenticating, you're redirected to `/chat.html`.

## Architecture Details

### Authentication Flow
1. User submits credentials at `/` (index.html)
2. POST to `/login` validates credentials against `N8N_USERNAME` and `N8N_PASSWORD` from env
3. Server signs a JWT and sets it as an httpOnly session cookie (expires in 2 hours)
4. User is redirected to `/chat.html`
5. Chat widget calls `/proxy/webhook` which verifies the JWT and forwards to n8n with Basic Auth

### Key Files
- **server.js** - Express server with three main routes:
  - `POST /login` - Validates credentials and sets session cookie
  - `POST /logout` - Clears session cookie
  - `ALL /proxy/webhook` - Verifies JWT, proxies to n8n with Basic Auth headers
- **index.html** - Login form with inline styles and client-side validation
- **chat.html** - n8n chat widget integration using the `@n8n/chat` library from CDN
- **.env.example** - Template for required environment variables

### Security Considerations
- JWT secret must be strong and never committed to version control
- Session cookies use `httpOnly`, `sameSite: lax`, and `secure` flag in production
- n8n credentials never exposed to client - only server knows them
- Basic Auth header constructed server-side in the proxy endpoint

### Dependencies
- `express` - Web server framework
- `jsonwebtoken` - JWT signing and verification
- `cookie-parser` - Parse cookies from requests
- `node-fetch` - HTTP client for proxying to n8n webhook
- `dotenv` - Load environment variables from `.env`

## Deployment

### Render Web Service
1. Connect repository to Render
2. Create new Web Service
3. Set Start Command: `npm start`
4. Add environment variables: `N8N_WEBHOOK_URL`, `N8N_USERNAME`, `N8N_PASSWORD`, `JWT_SECRET`, `PORT` (optional)
5. Deploy - Render provides HTTPS automatically

Full deployment instructions in `README_RENDER.md`.

## Styling and Branding

CSS uses custom properties with the BROEN-LAB color scheme:
- Primary color: `#e74266` (pink/red)
- Secondary color: `#20b69e` (teal)
- Dark text: `#101330`
- Light background: `#f2f4f8`

Both HTML files include inline styles for simplicity. The n8n chat widget styles are loaded from CDN.

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `N8N_WEBHOOK_URL` | Target n8n webhook endpoint | `https://n8n.example.com/webhook/...` |
| `N8N_USERNAME` | Username for Basic Auth to n8n | `user@example.com` |
| `N8N_PASSWORD` | Password for Basic Auth to n8n | `securepassword` |
| `JWT_SECRET` | Secret for signing session tokens | Long random string |
| `PORT` | Server port (optional) | `3000` (default) |
