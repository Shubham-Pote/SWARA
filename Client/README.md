# SWARA Client

The Bun and React application serves Dashboard, Reading Desk, Notebook, and Companion. Start with the [repository setup](../README.md#local-development) and use [the environment template](.env.example) if you need to override defaults.

From this directory:

```sh
bun install --frozen-lockfile
bun run dev
bun run typecheck
bun test
bun run build
```

The dev server normally listens at <http://localhost:3000> and proxies the app’s API requests to <http://127.0.0.1:5000>. The static build is in `dist/` and includes both VRM models. See [deployment](../docs/deployment.md) for API routing, public configuration, and deep links.

`src/index.ts` serves the app and proxies API requests. `src/App.tsx` owns workspace navigation and the shared practice language. The Dashboard’s illustrated lantern goal uses Motion. Its original Rive source is kept in [`rive/practice-lanterns/`](rive/practice-lanterns).
