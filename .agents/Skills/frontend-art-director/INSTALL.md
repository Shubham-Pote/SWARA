# Frontend Art Director v4 — installation

The folder to copy is **`frontend-art-director/`**, not the outer `frontend-art-director-v4/` folder. This v4 version upgrades the v3 skill in place with an expansive capability-discovery and component-selection workflow.

## Project-local (recommended)

Extract the ZIP into `YOUR_PROJECT/.agents/skills/` so the final file is:

```text
YOUR_PROJECT/.agents/skills/frontend-art-director/SKILL.md
```

If a v3 folder already exists, replace *only* that `frontend-art-director` folder; preserve other skills. No second folder named `frontend-art-director-v4` is needed.

## Global Windows install

Copy `frontend-art-director/` to:

```text
%USERPROFILE%\.agents\skills\frontend-art-director\
```

From a PowerShell directory containing the extracted `frontend-art-director` folder:

```powershell
New-Item -ItemType Directory -Force "$HOME\.agents\skills" | Out-Null
Copy-Item -Recurse -Force ".\frontend-art-director" "$HOME\.agents\skills\"
```

If the old folder has orphaned files from older versions, replace that skill folder entirely rather than overlaying. Restart Codex or reload skills if not visible, and try `$frontend-art-director` / `/skills`.

## What this skill does NOT install

It does **not** install GSAP, React Bits, shadcn, 21st.dev or Taste Skill, nor connect MCP servers, sign into paid catalogs or enable browsing/screenshot tools. Confirm each connection in the actual Codex session; 21st.dev may require login/API key and has plan-dependent limits. For 21st's current CLI/MCP options see https://21st.dev/mcp . shadcn MCP docs: https://ui.shadcn.com/docs/mcp .

## Copy-paste prompt: deep full frontend redesign

```text
$frontend-art-director
RESCUE mode. Treat this as a major product-design and frontend-engineering task.
First audit our existing app, routes and workflows and preserve every feature. Research 3-5 real products solving similar problems and inspect relevant accessible UI/interaction patterns. Then explore relevant live catalogs and available tools before deciding: GSAP full capabilities (including SplitText, CSS/style, SVG, Flip, draggable, scroll and expressive sequencing), React Bits text/UI/backgrounds/microinteractions, shadcn components/blocks/registries, 21st.dev components and variants, and the actual Taste Skill instructions.
Do not artificially restrict any library to one purpose or force all of them into the site. Compare realistic options for our flagship visual interactions and choose the best integrated, original design. Make autonomous art-direction decisions about typography, layout, color, content, assets and UX; avoid generic AI slop. Implement responsive, accessible, performance-conscious, clean React/TypeScript without harming current behavior. Run the app, inspect desktop/mobile screenshots and real interactions, fix visual weaknesses in at least two iterative passes when tools allow, and validate build/types/lint/tests. Report observed references, chosen components, actual tool usage and limitations.
```

## Focused component task

```text
$frontend-art-director
FEATURE mode. For this interaction, inspect existing components and explore the most relevant GSAP, React Bits, shadcn and 21st.dev options that are actually accessible. Compare the meaningful candidates before choosing one, adapt it to our design system and clean code, keep the user flow accessible, and test at mobile and desktop. Don't research unrelated competitor sites.
```

## Folder layout

```text
frontend-art-director/
├── SKILL.md
├── agents/openai.yaml
├── scripts/project_probe.mjs
└── references/
    ├── capability-discovery.md   # full official catalogs & live verification
    ├── component-selection.md    # choosing among overlapping tools
    ├── tool-orchestration.md
    ├── motion.md
    ├── product-research.md
    ├── art-direction.md
    ├── content-assets.md
    ├── ux-product-flows.md
    ├── clean-engineering.md
    ├── visual-qa.md
    ├── accessibility-responsive.md
    └── release-gates.md
```
