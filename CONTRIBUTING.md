# Contributing to SWARA

Start with the [local setup](README.md#local-development). Work in `Client/` for the interface and `backend/` for the API. Keep a change focused on one behavior or maintenance goal and include its rationale in the pull request.

## Local checks

| Directory | Commands |
| --- | --- |
| `Client/` | `bun run typecheck`, `bun test`, `bun run build` |
| `backend/` | `npm run typecheck`, `npm run build`, `npm test` |

Set `SWARA_TEST_MONGO_URI` to a disposable loopback MongoDB instance for the full backend suite. Tests create temporary databases and drop them afterward. Without the variable, the MongoDB suites skip. See [test setup](README.md#checks) for commands.

- Add focused coverage for new behavior and regressions. For changes to the interface, exercise the affected Spanish and Japanese flows and note whether API responses were simulated.
- Keep `Client/bun.lock` or `backend/package-lock.json` up to date when changing dependencies. Keep environment files, build output, and browser artifacts out of Git.
- Design notes live in [`.agents/Specs`](.agents/Specs). They record past decisions and local verification. Use the current setup and deployment guides for operating instructions.
- Report security issues privately using [the security policy](SECURITY.md).
