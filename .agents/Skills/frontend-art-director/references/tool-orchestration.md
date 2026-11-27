# Tool orchestration — capability-first, not library-first

Start by reading [capability-discovery.md](capability-discovery.md) and [component-selection.md](component-selection.md). Avoid blanket rules such as "GSAP only for scroll", "React Bits only for decoration" or "shadcn only for buttons". All tools may offer multiple kinds of visual and functional solutions. The goal is the best **integrated product experience**, not using every tool.

## Before touching code

- Check active **skills, MCP connections, registry configuration, package versions and installed components** in the current session. Read installed Taste/GSAP/React Bits/21st/Code Simplifier skill instructions if present. `package.json` alone cannot confirm MCP availability.
- Discover by design goal and inspect actual previews/docs. For a flagship visual treatment, explore plausible overlap: typography might come from GSAP SplitText, React Bits text effect, custom CSS or a 21st.dev community piece.
- Project requirements and user's selected reference sites take priority over blindly copying catalog demos. A design can be beautiful without external components, and sophisticated with them.

## Flexible routing

- **GSAP:** text (SplitText/ScrambleText/TextPlugin), CSS property/style interpolation, SVG/graphics, layout transitions (Flip), dragging/gestures (Draggable/Observer), narrative and scroll systems, complex sequencing. See official docs for plugin/version/access specifics.
- **React Bits:** animations, text treatments, backgrounds, UI components, microinteractions, cursors, galleries and creative visuals. Inspect actual source and dependencies.
- **shadcn/ui:** accessible primitives **and** composed blocks, dashboard shells, logins, navigation and third-party registry components via CLI/MCP. Adapt the generated code and styling.
- **21st.dev:** search community components and full sections, preview options, optionally generate variants/CLI/MCP according to actual access. Adapt heavily rather than paste unrelated styles.
- **Taste Skill:** interpret real installed instructions for art direction and critique; request concrete region-specific fixes, not only vague adjectives.
- **Custom implementation:** original layout CSS, semantic React, SVG/canvas, or other project-appropriate techniques when catalog pieces are unsuitable.

## Integration discipline

1. Pick a cohesive visual concept **before** importing candidate components. A sourced component is a starting point, not the art direction.
2. Inspect source, license/terms, imports, dependencies, generated file destinations and SSR constraints. Obtain permission before destructive operations or paid resources if needed.
3. Adapt tokens and typography, breakpoints, UI states, content and branding to the site. Preserve accessible semantics, focus and keyboard interactions.
4. Scope animation lifecycle properly. For React `@gsap/react` `useGSAP()`/context can simplify cleanup; handle strict mode, route transitions and hydration. Determine which animation engine owns each effect.
5. Measure bundle/performance when possible. Progressive enhancement and reduced-motion can coexist with an ambitious visual concept.
6. Run a visual comparison, functionality check and cleanup pass before calling a sourced component finished.

## Fallbacks

No external browsing? Inspect local references and known-in-repo components; clearly label unverified inspiration. No 21st MCP? Use verified public catalog for conceptual research, or proceed with shadcn/custom. No browser? Perform static/code review but don't claim pixel testing. No Taste Skill? Apply concrete visual scorecard. Never fabricate tool outputs, sources or component availability.
