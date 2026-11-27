# Clean frontend engineering standards

Read during implementation or rescue. The goal is **simple, adaptable code**, not maximum abstractions.

## Architecture decisions

1. Follow existing repo conventions and lint/format/type settings; do not rewrite architecture merely because a new pattern is fashionable.
2. Organize by feature/domain when the project is complex; keep shared primitives (buttons, dialogs, layout, tokens) genuinely cross-feature. Avoid both giant kitchen-sink components and microscopic one-line component files.
3. Components should have a clear role: view/UI, data hooks/services, state, formatting/utilities. Separate when it reduces cognitive load or enables testing; don't create a service layer for a static landing hero.
4. Prefer composition, props and predictable state over boolean-prop explosion, excessive context providers, deep inheritance or magic configuration.
5. Use domain-specific types and discriminated unions for important UI states; do not use `any` or unsafe casts to hide failures. Avoid elaborate generic types when plain interfaces suffice.
6. Keep accessible semantic HTML and CSS layout first; use JavaScript only for actual interactivity. Avoid div-as-button and custom controls without keyboard behavior.

## React rules

- Keep render pure, stable keys, intentional memoization (measure rather than blanket `useMemo`), explicit state ownership, no state derivable from existing state unless justified.
- Use existing data-fetching stack and API types; distinguish loading/error/empty/stale states. Cancel or ignore stale requests and unmount effects when necessary.
- Clean up listeners, observers, intervals, subscriptions, GSAP timelines, ScrollTriggers and portals. Avoid direct DOM mutation outside isolated animation/integration code.
- Keep text data separate from component code if it improves readability, not in a massive constants file for two strings.
- Use routing/navigation frameworks as intended. Do not break SSR/hydration; guard browser-only APIs in client effects and clean them up.

## CSS / tokens

- Prefer existing Tailwind/CSS modules/vanilla system; do not introduce a parallel styling framework.
- Create a compact semantic token system for recurring values; avoid per-component unique colors, arbitrary spacing, unexplained z-index and hardcoded magic viewport breakpoints.
- Use fluid containers (`min`, `max`, `clamp` when suitable), logical properties where relevant, robust wrapping and long-content handling.
- Keep global styles minimal and intentional. Make variant rules explicit and delete unused classes when redesigning.

## Stability, security, performance

- No secrets in frontend, unsafe HTML injection, indiscriminate `dangerouslySetInnerHTML`, unnecessary unsafe dependencies or leaking API/private data in logs.
- Avoid gigantic client bundles, unnecessary full-library imports, large unoptimized images and layout shifts; add lazy-loading only if it actually benefits the route/experience.
- Use `button` for actions and `a` for navigation; stable loading/disabled behavior on forms; surface network failures with recovery.
- Avoid comments stating the obvious, dead components, placeholder TODOs, duplicate helpers and changes to unrelated config.

## Sourced component adaptation (React Bits, 21st.dev, shadcn, registries)

- Treat downloaded/generated code as **reviewed source owned by the project**, not a black box: check source/license, dependencies, imported assets, SSR, API boundaries, accessibility, focus, keyboard and reduced-motion support.
- Remove demo copy, hardcoded theme colors, fake stats, unnecessary wrappers and unrelated dependencies. Fold variants and shared style values into the existing design system without destroying the unique intended effect.
- If a component uses GSAP and is layered with standalone GSAP sequences, avoid conflicting transform/style ownership and double registration. Keep cleanup scoped and test strict mode and route changes.
- Preserve attribution and required license text; do not use unverified paid or proprietary assets. Prefer fewer high-quality integrated components over an unrelated collection.

## Mandatory finishing refactor for modified code

Review *only the touched area* for duplicate logic, vague names, needless wrappers, `any`, state/effect complexity, missing cleanup, hardcoded inconsistent styles, generated boilerplate, unexplained comments, and unused imports. Simplify safely **without changing behavior**. Use Code Simplifier skill if it is actually installed and compatible; do not claim it ran otherwise.

Run actual repo checks instead of inventing a clean bill of health. Never silence errors with wide `eslint-disable`, `ts-ignore` or skipped test changes without an explicit reason.
