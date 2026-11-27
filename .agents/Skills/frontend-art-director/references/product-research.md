# Research the right reference sites

Read for BUILD or RESCUE. For FEATURE skip unless explicitly asked. Research is **workflow benchmarking + visual pattern extraction**, not inspiration-name-dropping.

## Candidate discovery

1. Define job-to-be-done in plain language: "Users need to [action] with [object] to [result]"; list primary roles, task complexity, environment (mobile/desktop), product genre.
2. Search 3–5 **same-job** products; if quality/coverage weak add 1–2 adjacent visual leaders. Prefer official live pages, screenshots, docs, product tours and actual accessible interfaces over aesthetic galleries.
3. Where tools permit, open candidate pages and inspect a relevant screen or walkthrough; note what was genuinely observed versus inferred from marketing copy. Current pages can change; note date and access limitation.
4. Match by **workflow relevance first**, information architecture second, visual polish third. A visually stunning unrelated site is not primary evidence.

## Reference matrix (short, source-grounded)

| Product & verified URL | Similar user job / observed screen | Effective UI pattern | Weakness or limit | Original idea to adapt |
| --- | --- | --- | --- | --- |
| Product A | e.g., creation flow; public screenshot only | Step progression visible | Too much wizard friction | Adapt the clear progress indication to our faster flow |

Do not fill this with fabricated products or guess at private dashboards. It is acceptable to record "login required; public product tour only". Include direct URLs only if verified or given by user; cite externally when applicable.

## Analyze specific design decisions

- Entry point: can first-time users identify the primary action within seconds?
- Structure: nav position, view hierarchy, grouping, context preservation.
- Workflow: creation, review, approval, editing, analytics, empty states, undo and return path.
- Data: tables vs cards, sorting, filtering, contextual actions, uncertainty, trustworthy data presentation.
- Visual: font personality, line-height, density, art direction, contrast, color restraint and image usage.
- Motion: which animation makes state transitions easier to understand?
- Differentiation: where does the reference's visual language **not** fit our app or brand?

## Use explicit translation, not copying

Write a short mapping: "Observed pattern → user problem solved → our original implementation → acceptance check". Example: peer shows persistent draft status → prevents lost work → our editor shows save state and undo → test slow connections. Copy principles, not pixel layouts, branded colors, exact copy, proprietary icons, or code.

If user supplies a screenshot/reference: first decompose its layout, hierarchy, whitespace, scale, interaction states; then explain what is transferable and what must be adapted to our product. When screenshots seem contradictory, prioritize the user's current product goals and accessibility.

Add a second, *different* exploration pass for implementation references: relevant GSAP showcase/docs, React Bits components, shadcn blocks/registries and 21st.dev components. Product peers tell you **what UX is appropriate**; component galleries tell you **how a treatment might be built**. Don't confuse a visually cool animation demo with proof it works for the product's user journey.

If no web or browser exists: examine available local screenshots and requirements; do not masquerade as having inspected live sites. Continue with clearly labeled heuristics. Keep research proportional to task; 20 reference links are less useful than three well-understood flows.
