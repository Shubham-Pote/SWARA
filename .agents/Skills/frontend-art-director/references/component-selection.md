# Component and creative-treatment selection

Do not start with "which library should I use?" Start with the **visual and product goal**. This protocol applies to flagship sections and complex interactions; for a small button change, use the established local design system without broad browsing.

## Selection procedure

1. Describe intended behavior in one sentence, including audience/device and accessibility fallback.
2. Sketch the static composition first (typography, hierarchy, media, layout and content). Motion cannot rescue an incoherent composition.
3. Look for owned in-repo solutions, then search relevant official catalogs/registries **by behavior and visual form** rather than by library name alone.
4. For high-visibility decisions, review ~2–3 realistic alternatives; don't pretend to evaluate invisible demos. Candidates can be custom CSS/React, GSAP plugin/technique, React Bits element, shadcn block/registry component or 21st.dev component. Avoid comparisons that add no value.
5. Score lightly: **visual fit, UX/functional fit, ability to customize, accessibility, responsive/mobile, loading/performance, code cleanliness, dependency/license cost**. Choose the best whole-product outcome, not the loudest demo.
6. Integrate the selected piece and **re-author** tokens, typography, spacing, states, content and interactions to match the site. Keep behavior and terms correct. Reinspect live screenshots and interaction flow after integration.

## Illustrative candidate routing (not hard limits)

| Desired moment | Candidates worth exploring |
| --- | --- |
| Expressive animated headline | GSAP SplitText/stagger/typography timeline; React Bits text collection; semantic CSS masking; custom animation |
| Visual style transformation | CSS variables/tokens + GSAP CSSPlugin on colors/transforms/style properties; React Bits visuals; custom CSS gradients/masks/shaders |
| Interactive hero with depth | React Bits backgrounds/effects; custom canvas/WebGL; GSAP property/timeline orchestration; 21st creative hero sections |
| Motion-rich product walkthrough | GSAP ScrollTrigger/Flip/DrawSVG/MotionPath; React Bits media interactions; 21st composed sections; accessible still alternative |
| Complex dashboard shell | shadcn blocks, 21st dashboards, repo-owned components; custom visual systems with responsive data density |
| Drag-rearrange workspace | GSAP Draggable/Flip where appropriate; native DnD or accessible drag/drop solution; React Bits UI when functionality matches |
| Premium gallery, carousel, image treatment | React Bits components; 21st.dev gallery; shadcn carousel/registry; custom CSS/GSAP |
| Forms, dialogs, popovers, menu | Existing shadcn primitives and composed blocks, 21st UI with reviewed semantics, accessible custom components as needed |
| AI creation workbench | Discover comparable real product workflows; combine shell, focused editor, editable outputs, useful states, thoughtfully animated transitions |

## Creative composition rules

- Maintain **one art direction**. Different tools can work together on one page but should share type scales, geometry, color palette, animation timing and interaction rules.
- No artificial cap on visual creativity. Use cinematic text, advanced SVG, layered 3D, rich backgrounds or scroll chapters if they serve the audience and content.
- No compulsory motion budget. Set deliberate budgets based on mobile/desktop hardware and user goals. Reserve stable, fast interactions for task-critical work.
- Prefer locally owned components when they already match. Don't fabricate missing catalog entries or copy a whole competitor UI. Source provenance matters.
- If stacking GSAP and React Bits, inspect what animation engine React Bits already uses; **avoid two engines writing the same transforms/properties simultaneously**. Establish one controller or isolate effects.
- If the imported source is 300 lines with 12 dependencies for a tiny visual cue, simplify or recreate it. If it uniquely enables an ambitious signature, invest in sound integration rather than rejecting it on line count alone.

## Example: impressive AI product landing page

Research products with similar workflows → choose a clear product-specific story → compare GSAP SplitText vs React Bits text reveal for the hero → compare 21st.dev section layout vs custom composition → source accessible buttons/forms from existing shadcn → design real product UI screenshots/media → test low-motion and mobile → refactor imported source to shared tokens. None of those tools has an exclusive job; the choices are based on observed results.
