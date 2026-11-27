# Release quality gates: functional + visual + engineering

Use for substantial work; apply lightweight subset for feature fixes. Confirm commands from package.json or repo docs before running; do not guess scripts. Run checks without mutating unrelated files unnecessarily.

## Essential acceptance matrix

| Gate | Evidence | Fails if |
| --- | --- | --- |
| Behavior | Primary workflows tried; routes/navigations/forms complete | Existing feature lost, primary CTA dead, incorrect state |
| Visual | Browser screenshots at multiple widths when tool available; at least one critique iteration | Clipping, bad hierarchy, generic unfinished look |
| Accessibility | Semantic/keyboard/focus/labels/contrast/reduced motion evaluated | Major barriers or hidden UI |
| Responsive | 360/390, tablet, desktop checked | Offscreen content/controls, broken navigation |
| Clean code | Changed-code simplification, source/license/dependency review, effect ownership, component/type review | Dead code, leaks, copied demo artifacts, broad suppressions, unneeded abstractions |
| Checks | Applicable build, typecheck, lint, tests with exact results | Failures introduced or silently skipped |
| Performance | Measure if tooling permits; check image weights, major interactions, animation smoothness | Severe regressions, layout shift, pointless expensive effects |
| Data honesty | Real state or explicitly sample-only content | Made-up metrics or false "live" statuses |
| Security | No frontend secrets, unsafe markup, uncontrolled external scripts | Obvious unsafe changes |

## Suggested checks based on the repo, never forced blindly

- `bun run lint`, `bun run typecheck`, `bun run build`, `bun test` if those scripts exist (use same package manager as repo).
- Existing React Testing Library / Vitest / Jest unit tests for logic and important interactions.
- Existing Playwright / Cypress for nav, form completion, errors, mobile layout; add minimal tests only when proportionate and dependencies already available or explicitly permitted.
- Devtools/a11y checks, console errors, failed requests, layout shift and performance observations.
- If Lighthouse/axe available, use them as supporting evidence and diagnose issues; don't promise arbitrary scores. Chrome Core Web Vitals may be measured if the environment supports it.

## Final report template

- Design thesis and key user flow improved.
- Verified relevant peer URLs, what we learned and where applied; or browsing limitation.
- Routes/components changed, data/functions preserved, new behavior if any.
- Which actual components/plugins and tools ran (Taste Skill, GSAP plugin, React Bits, shadcn/registry, 21st.dev, browser), the alternatives considered, and which were unavailable or intentionally skipped.
- Before/after visual critique: top issues corrected, viewport evidence, remaining risks.
- Clean-code, a11y and performance decisions.
- Commands/tests and factual outcome; unfinished work and limitations.

Failure reporting must be specific: a build failure due to pre-existing environment is not a "pass", and not every failure is caused by the patch. Note the distinction.

For public marketing pages, additionally verify metadata, search-friendly page structure, functional links and asset-loading quality. For authenticated apps these are lower priority than application usability and correctness.
