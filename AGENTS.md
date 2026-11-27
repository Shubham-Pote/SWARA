# Working on SWARA

- The active frontend is the Bun Client in `Client/`. Setup and check commands are in [CONTRIBUTING.md](CONTRIBUTING.md).
- Preserve the shared workspace frame, Spanish and Japanese themes, and established interactions unless the task changes them. The practice language applies across the workspace. Companion rooms keep their own language.
- Dashboard, Reading Desk, and Notebook use content height. Taste’s landing page fold and section height rules have documented exceptions. Use the browser to confirm a suspected layout or interaction defect. See [the Phase 15 layout decision](.agents/Specs/phase15.md) and [Phase 16 verification](.agents/Specs/phase16.md).
- Keep Playwright artifacts in `.agents/MCP/.playwright-mcp/`. In verification reports, identify checks that used fixtures and checks that used live services.
