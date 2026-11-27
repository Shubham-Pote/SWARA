# Deploying SWARA

## API

Set `MONGODB_URI` and a strong, unique `JWT_SECRET` in the service environment. Configure `GEMINI_API_KEY` for generated content and conversations, plus the optional ElevenLabs variables for voice. See the [backend environment template](../backend/.env.example) for the full list.

- **Node server** Run `npm ci` and `npm run build` in `backend/`, then run `npm start`. The build needs development dependencies. The server listens on `PORT` (5000 by default).
- **Vercel** The repository includes [an API configuration](../backend/vercel.json) with `backend/` as the project root. Its [entry point](../backend/api/index.ts) exports the same Express app used by the Node server.

Check `GET /health` on the API origin. Its `dbConnected` value reflects the current connection. The API opens the database connection when it first handles an `/api` request, so also verify sign-in and an authenticated read.

## Client

Choose one of these deployment paths:

- **Bun server** Run `bun install --frozen-lockfile` and `bun run start` in `Client/`. Set `SWARA_API_ORIGIN` to the API origin, without an `/api` suffix. Requests from the browser stay on the Client origin and the Bun server proxies the app’s API calls.
- **Static hosting** Run `bun install --frozen-lockfile` and `bun run build` in `Client/` and publish `Client/dist/`. Route same-origin `/api/*` to the API, or set `BUN_PUBLIC_API_BASE` to the public API URL ending in `/api` before building. For a separate API origin, add the exact Client origin to the backend’s `CORS_ORIGIN` list. Enable an SPA fallback to `index.html` for Client routes such as `/reading/<articleId>`. Give API and static asset routes precedence over that fallback.

Use HTTPS. Keep provider credentials out of all public Client variables. The checkout contains deployment configuration, and a deployment still needs its own environment and smoke checks.

## Smoke checks

Sign in, switch practice language, reload a reading link, and save and reopen a test note. Send a short Companion prompt and confirm the text arrives incrementally. If enabling speech, repeat with voice on. Proxies must pass through server-sent events and allow long enough requests for model and audio streaming. The default hourly Companion rate limit uses memory within each API instance.
