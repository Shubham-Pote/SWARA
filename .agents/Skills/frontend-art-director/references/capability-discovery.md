# Live capability discovery — do not pigeonhole the tools

**Why:** Animations, layout blocks, interactive graphics, visual treatments and component galleries evolve. Read this when a visual feature could benefit from external tools. **These are discovery entry points, not an exhaustive list.** Check official docs/catalogs when the user asks for the best possible frontend or when designing an important signature interaction.

## Discovery order

1. **In-repo:** inspect package versions, existing components, CSS, `components.json` registry names, installed skills, their instructions, and available MCP tools. A mention of a tool in chat is not proof it is active in this session.
2. **Problem-first query:** describe the needed effect/component visually and functionally, e.g., "responsive headline character reveal while retaining readable SSR text", "drag to rearrange workflow cards", "editor with accessible command palette", "fluid image mask", "comparison pricing table".
3. **Search the live catalog:** examine relevant previews, source/dependency requirements, usage docs, and official examples. Component names below are examples, **never assume their existence, version, cost, or API without checking**.
4. **Compare viable candidates:** assess composition/brand fit, editability, accessibility, performance/mobile behavior, licensing, SSR, Tailwind/CSS fit, and lifecycle cleanup. See [component-selection.md](component-selection.md).
5. **Choose and adapt:** own the integrated design; do not simply paste unrelated demo styles. Record the actual source/registry/component and any limitation.

## GSAP — far beyond scroll reveals

Official docs https://gsap.com/docs/v3/ | plugins https://gsap.com/docs/v3/Plugins/ | showcase https://gsap.com/showcase/

| Creative need | Relevant capabilities to investigate |
| --- | --- |
| Typography | SplitText (lines/words/chars), ScrambleText, TextPlugin, stagger/timelines, responsive re-splitting; always check meaningful screen-reader text |
| CSS styles and visual transitions | Core CSSPlugin interpolates CSS transforms, colors, opacity, gradients where supported, CSS variables and more; GSAP can **animate styling**, but CSS/Tailwind still defines the static design system |
| Scrollytelling | ScrollTrigger, pinning/scrubbing, timeline sequences, ScrollSmoother when justified |
| SVG/illustration | MorphSVG, DrawSVG, MotionPath, coordinate transforms, custom properties |
| Layout and shared-element transitions | Flip (FLIP), nested timelines, state transitions, spatial continuity |
| Drag/gesture interfaces | Draggable, Inertia, Observer; test touch, keyboard alternatives, conflicts with scroll |
| Custom/3D-adjacent effects | Tween plain JS object properties (including canvas/WebGL parameters), eases, custom effects; verify integration and performance |

Note: Check exact plugin import and registration, version and licensing/access terms from live docs. Do not suggest a GSAP plugin is unavailable simply based on outdated assumptions. GSAP may animate CSS variable values, but heavy repaint effects can be costly.

## React Bits — full component and effect catalog

Official https://reactbits.dev/ | text https://reactbits.dev/c/text-animations | animations https://reactbits.dev/c/animations | UI https://reactbits.dev/c/components | backgrounds https://reactbits.dev/c/backgrounds | micro https://reactbits.dev/c/micro

- Explore **text animations** (animated headings, reveal/morph/typing/loop treatments) when typography is the visual signature.
- Explore **general animations and microinteractions** (reveals, magnetic controls, click feedback, interactive shapes, logo treatments, cursor effects).
- Explore **components** (carousels, list/gallery treatments, cards and navigation) for real functionality and visual differentiation.
- Explore **backgrounds and graphic effects** (animated textures, fields, shaders). Account for motion reduction, GPU and mobile cost.
- Check the actual component's implementation and available variant (JS/TS, plain CSS/Tailwind), peer dependencies, semantics and source/attribution. Some code uses GSAP, Motion or WebGL; do not assume independence.
- React Bits Pro is a **separate** catalog with different access conditions; never assume user has it or claim a paid component is available.

## shadcn/ui — primitives, blocks and multi-registry discovery

Official components https://ui.shadcn.com/docs/components | blocks https://ui.shadcn.com/blocks | registry https://ui.shadcn.com/docs/registry | MCP https://ui.shadcn.com/docs/mcp

- Foundations: accessible dialog, menu, buttons, forms, tables, tabs, command/navigation, focus and state patterns. Adapt styles deeply.
- Blocks/layouts: ready-made dashboards, sidebars, login/auth and composed screens—**not just plain buttons**.
- Registry ecosystem: shadcn MCP can search multiple compatible registries configured in `components.json`; a React Bits registry may be available if configured. Search actual registries by intent, inspect installed generated source and resulting changes.
- Never assume the project's `components.json` permits every third-party source or that `shadcn add` is harmless. Review diff, install requests and overwritten files.

## 21st.dev — rich design patterns and AI-assisted alternatives

Official catalog https://21st.dev/community/components | agent/CLI/MCP docs https://21st.dev/mcp

- Browse community **components, page sections, complex UI pieces and visual treatments**; search for specific jobs such as pricing, editorial hero, command interface, timeline, tabs, toolbar, AI workbench, sidebar, animated cards.
- Where connected, use 21st MCP or CLI **search, inspect preview/source and retrieve/install**, plus AI-assisted variants if the account/tool provides that feature. Verify actual tools rather than hallucinating method names.
- 21st has access/usage limits on component retrieval depending on plan. Do **not** infer that 21st MCP is installed, authenticated or unlimited. Old "Magic MCP" references may point to renamed tooling; follow current docs.
- Clean and harmonize any imported community source; it may use third-party packages, custom fonts, large gradients or example copy that should not be carried over.

## Taste Skill and other installed skills

Taste Skill is user-configured, not a universal fixed API. Find its actual `SKILL.md`; read and follow it. It may critique layout, typography, references or process. It does **not** replace inspecting the render. If Code Simplifier, React Bits Pro skills, 21st skills, GSAP skills, accessibility or testing skills exist, inspect their real instructions. Additional relevant tools (Three.js, R3F, Motion, Lenis, Framer Motion, image services, charts) may be evaluated according to project constraints; no list is exhaustive.

## Honesty

A skill provides procedures, not extra network capability. Never claim live research, MCP access, licensed components, browser interaction, downloads or tests without actually running them. For each chosen tool, report the exact component/plugin, source and purpose (and failure/fallback if any).
