# SWARA

SWARA is a practice workspace for learners of Spanish and Japanese. Read a short passage, save useful words, and bring what you learned into a conversation with María or Akira.

| Area | What you can do |
| --- | --- |
| Dashboard | Choose a practice language, see recent activity and streaks, and reopen completed readings. |
| Reading Desk | Read with optional English translations, look up words, check comprehension, and take a passage into Companion. |
| Notebook | Write and autosave notes, keep vocabulary from readings, and review starred notes or vocabulary. |
| Companion | Chat with an animated VRM tutor. Sign in to save exchanges. Tutor voice is optional, and dictation depends on browser support. |

## Local development

Install [Bun](https://bun.com/docs/installation) (CI uses 1.3.14), [Node.js](https://nodejs.org/) 22 with npm, and MongoDB 7 or a compatible Atlas deployment. Run each block from the repository root in a separate terminal.

**API**

```sh
cd backend
npm ci
cp .env.example .env
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

On PowerShell, use `Copy-Item .env.example .env`. Put the generated value in `JWT_SECRET` in `backend/.env` and start MongoDB, or set `MONGODB_URI` for an existing development instance. Then run `npm run dev` in `backend/`.

**Client**

```sh
cd Client
bun install --frozen-lockfile
bun run dev
```

Open <http://localhost:3000>. The Bun server proxies the app’s API requests to <http://127.0.0.1:5000> by default. The [Client environment template](Client/.env.example) shows how to override the proxy origin or port. You only need a Client `.env` to change a default.

Add `GEMINI_API_KEY` to [the backend environment](backend/.env.example) for AI conversation and newly generated content. Use the ElevenLabs variables to enable tutor voice. Account, notebook, and progress features use MongoDB. Browser dictation needs microphone access on HTTPS or localhost.

## Architecture

- [`Client/`](Client) is the Bun and React application. It uses TypeScript, Tailwind CSS, Motion, GSAP, and Anime.js. Three.js and the Pixiv VRM library render the companions.
- [`backend/`](backend) is the Node.js and Express API backed by MongoDB and Mongoose. It serves authenticated practice data and streams conversation replies over HTTP using server-sent events. Gemini generates the replies and ElevenLabs supplies optional speech. Provider keys stay on the API server.
- [`Client/Characters/`](Client/Characters) contains the two VRM models served by the Bun server and copied into the static build.
- [`.agents/Specs/`](.agents/Specs) records design decisions and past verification. Browser captures referenced there are kept as local QA artifacts.

## Checks

| Directory | Commands |
| --- | --- |
| `Client/` | `bun run typecheck` · `bun test` · `bun run build` |
| `backend/` | `npm run typecheck` · `npm run build` · `npm test` |

For the full backend suite, start a **disposable local MongoDB** instance and set `SWARA_TEST_MONGO_URI` to its loopback URI before running `npm test`. The tests create and remove temporary databases. The MongoDB suites skip if the variable is unset, and the tests simulate external providers.

```sh
SWARA_TEST_MONGO_URI=mongodb://127.0.0.1:27017 npm test
```

```powershell
$env:SWARA_TEST_MONGO_URI = 'mongodb://127.0.0.1:27017'
npm test
```

## Project guides

- [Deployment](docs/deployment.md) covers static hosting, the Bun server, and the Express API.
- [Contributing](CONTRIBUTING.md) explains how to prepare and verify a change.
- [Security](SECURITY.md) describes private reporting and credential handling.

The repository currently has no top-level license file. Confirm redistribution terms with the maintainer before reusing code or artwork.
