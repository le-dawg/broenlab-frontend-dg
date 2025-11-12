# Repository Guidelines
This guide keeps broenlab-frontend contributions aligned with the lightweight Express proxy powering N8N chat flows. Follow these defaults unless the maintainer signals a change in an issue or PR thread.

## Project Structure & Module Organization
- `server.js` hosts the Express proxy, login flow, and webhook forwarding logic; keep new middleware close to related routes.
- `index.html` and `chat.html` are served statically from the repository root; adjust assets here or create a `public/` subtree if the surface grows.
- `package.json` tracks runtime dependencies and scripts; colocate additional configs (e.g., lint rules, env samples) at the repository root for visibility.

## Build, Test, and Development Commands
- `npm install` installs dependencies; run after cloning or when `package.json` changes.
- `npm run dev` starts the server with `NODE_ENV=development`; use for interactive debugging against local or staging webhooks.
- `npm start` launches the production-mode server on `PORT` (default 3000); rely on this for final smoke checks.

## Coding Style & Naming Conventions
- Stick to CommonJS modules and two-space indentation to match `server.js`.
- Prefer `const` for imports and single-responsibility helper functions; group Express route handlers by endpoint.
- Environment variables follow SCREAMING_SNAKE_CASE; document any additions in `.env` guidance.

## Testing Guidelines
- No automated suite exists yet; validate changes by running `npm run dev` and exercising the login/proxy flow in the browser.
- When introducing tests, place them under a `tests/` directory and wire a `npm test` script (Jest or supertest) so CI adoption remains straightforward.
- Share manual verification steps in PR descriptions until coverage expands.

## Commit & Pull Request Guidelines
- Existing history uses Conventional Commit prefixes (`chore:`, etc.); follow `type: short summary` with imperative mood.
- Reference linked tickets, list environment variables touched, and attach screenshots or cURL transcripts when UI or proxy behavior changes.
- Request at least one reviewer and ensure PRs stay focused; prefer follow-up issues for larger refactors.

## Security & Configuration Tips
- Populate `N8N_WEBHOOK_URL`, `N8N_USERNAME`, `N8N_PASSWORD`, and `JWT_SECRET` in a local `.env`; never commit secrets.
- Set `JWT_SECRET` to a strong value before deploying; rotate credentials alongside webhook URL changes.
- Use HTTPS proxies in production and confirm cookies remain `secure` by running behind TLS.

## Test Login Credentials
- Email: `broenlabtesting@ai-raadgivning.dk`
- Password: `Chatbot2025`
