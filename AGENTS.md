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
- Populate `N8N_WEBHOOK_URL`, `N8N_FEEDBACK_WEBHOOK_URL`, `N8N_USERNAME`, `N8N_PASSWORD`, and `JWT_SECRET` in a local `.env`; never commit secrets.
- Set `JWT_SECRET` to a strong value before deploying; rotate credentials alongside webhook URL changes.
- Use HTTPS proxies in production and confirm cookies remain `secure` by running behind TLS.

## Test Login Credentials
- Email: `broenlabtesting@ai-raadgivning.dk`
- Password: `Chatbot2025`

## User Feedback Feature
The chat interface includes a feedback mechanism allowing users to rate bot responses.

### Implementation Details
- **Location**: `chat.html` contains the complete feedback implementation
- **UI Components**: Thumbs up (👍) and thumbs down (👎) emoji buttons appear below each bot message
- **Visual Design**: 
  - Emojis are initially greyed out (30% opacity with grayscale filter)
  - Active emoji becomes colored (100% opacity, no filter) with slight scale effect
  - Positioned with visual separation from main chat bubble via border-top
  - Small but clearly visible (1.25rem font size)
- **Interaction**: 
  - Users can click either emoji to provide feedback
  - Clicking toggles the active state between thumbs up and down
  - Users can change their rating as often as desired
  - Each message maintains independent feedback state

### Technical Specification
- **Webhook Endpoint**: Configured via `N8N_FEEDBACK_WEBHOOK_URL` environment variable on the server
- **Default URL**: `https://n8n-ldlsb-u47163.vm.elestio.app/webhook/9f23ec09-0e55-43f1-9a4b-11bf1d9f211c` (set in `.env.example`)
- **Method**: POST
- **Payload**: `{ "rating": <integer> }`
  - `rating: 1` for thumbs up
  - `rating: 0` for thumbs down
- **Configuration**: Webhook URL is loaded from server's `/api/config` endpoint at page load
- **State Management**: Client-side Map tracks feedback per message using unique message IDs
- **Error Handling**: Failed submissions log warnings to console but don't block UI interaction

### Code Organization
- CSS: `.broen-feedback` and `.broen-feedback__btn` classes in `<style>` section
- JavaScript: 
  - `loadConfig()` fetches feedback webhook URL from `/api/config` endpoint
  - `buildFeedbackUI()` creates the emoji button UI
  - `handleFeedbackClick()` manages toggle logic and state updates
  - `sendFeedback()` performs the POST request to the webhook
  - `generateMessageId()` creates stable identifiers for messages
- Server: `/api/config` endpoint exposes `N8N_FEEDBACK_WEBHOOK_URL` to client
