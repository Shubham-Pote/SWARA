# Phase 16 · Step 3 — Notebook

The Bun Client keeps the Notebook collection and writing page separate. Both paper surfaces follow the shared workspace edges. The editor holds text to a 760 px measure on wide screens and grows with its content. The save status and star stay within reach when scrolling a long note. Topic, tags, the source reading link, and discard or delete remain available at the end of the page.

## Writing and finding notes

- New note opens straight into the writing field. The first line supplies the title until the learner edits it inline. Enter returns to writing, and Escape restores the previous title. The editor continues to autosave the body, title, and optional organization fields.
- The collection supports All notes, Starred, and Vocabulary. Every saved note can be starred from its row or its editor. Search combines terms across titles, text, topics, and tags. The current filter and query remain available when returning from an existing note.
- Review follows the current Starred or Vocabulary results. The title appears first, and the learner can reveal the rest of the note, go back, move on, or open the original. Reviews skip notes that contain only a title. Vocabulary saved from Reading Desk keeps its definition, pronunciation when supplied, and example.
- Save feedback stays brief during normal editing. A failed request offers a retry and reports when a local copy was saved. Reload and language changes preserve local drafts. Revision conflicts offer Save as a copy and preserve the server version. A failed collection request has its own retry and is distinct from an empty notebook.

Apple Notes informed the first-line title and uninterrupted writing flow. Samsung Notes informed the direct access to favorites. The 21st Inline Edit component was considered, and the existing inline field, native controls, and Motion transitions already met the interaction needs. [Apple Notes](https://support.apple.com/en-by/guide/notes/not9474646a9/mac), [Samsung Notes](https://www.samsung.com/us/support/answer/ANS10004548/), [21st Inline Edit](https://21st.dev/@0xUrvish/components/inline-edit).

## Verification

- The production build, TypeScript unused-code checks, and all 24 Client tests passed.
- Playwright checked the locally served production build with Spanish and Japanese fixture data at 320, 390, 768, 1024, and 1440 px. Checks covered workspace alignment, long notes, focus restoration, search and filters, vocabulary and starred review, inline title editing, autosave, language isolation, reload recovery, retries, and revision-conflict copies.
- The signed-out Taste quick check passed text contrast, viewport containment, collision, visible focus, and tap sizing. It continued to flag its landing-page fold and section-height rules and shared workspace stylesheet rules. The Notebook keeps content-height layout.
- Browser checks used fixture API responses. Live cloud persistence and deployment were outside this step.

[Spanish overview at 1440 px](../MCP/.playwright-mcp/phase16-notebook-list-spanish-1440.jpg) · [Spanish long note at 1440 px](../MCP/.playwright-mcp/phase16-notebook-editor-spanish-1440.jpg) · [Japanese editor at 768 px](../MCP/.playwright-mcp/phase16-notebook-editor-japanese-768.jpg) · [Japanese vocabulary review at 390 px](../MCP/.playwright-mcp/phase16-notebook-review-japanese-390.jpg)
