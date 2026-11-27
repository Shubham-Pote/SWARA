# Phase 15 — Shared application foundation

Phase 15 applies to the Bun Client. It addresses the learner reliability, design system, layout, and navigation findings in [the Phase 14 audit backlog](findings.md). Newsreader, Manrope, the warm Spanish and cool Japanese palettes, and the full-screen Companion environments define the visual direction.

## Learner reliability

- Unsent Companion text is scoped to the learner and room language. Resets, prompt insertion, same-tab reloads, interrupted sends, and authentication changes preserve it. A confirmed reply clears the sent draft. Guest and account drafts can be combined explicitly when both exist.
- The voice toggle persists on the device across tabs, reloads, and rooms.
- A passing or failed quiz focuses its result. Notebook review focuses the current note or completion heading and returns focus to the review trigger on exit. Opening a saved note focuses its heading, while a new note focuses the writing field. The editor uses a caret and accent rule for keyboard focus.
- Language-aware navigation preserves valid reading links through sign-in and offers a language switch when a passage belongs to the other language. Invalid or removed content has a recovery action. Registration from a Companion room uses that room’s language.
- Notebook separates unavailable data from a successful empty result. Save feedback distinguishes local drafts from synced notes, and local edits can be copied when the original is changed or removed. Conversation history retries inside its dialog.

## Shared design and navigation

- Central theme tokens provide the Spanish and Japanese accents, paper and chrome surfaces, selection colors, focus indicators, shared controls, and feedback. Language changes transition the palette and respect reduced-motion preferences.
- Dashboard, Reading Desk, and Notebook use one workspace frame, header, and language switcher. Article and note detail views share the header and retain their own content measure.
- The desktop rail expands on hover or keyboard focus within reserved workspace space. Escape collapses it without taking focus off the current control. Phones use the native navigation drawer, with Escape and focus restoration. Sidebar activation gives the destination a short entrance while the rail and shared header retain their positions. A delayed route uses the existing text status and animates its content when ready.

## Step 5 refinements

- The Dashboard weekly section and learning details use the same two-column grid and gap. The calendar heading, day controls, and status share the Recent activity column. Narrow screens stack these sections on the same workspace edges.
- The Learning record’s XP explanation now starts at the same edge as its heading and totals. Milestone names, meters, and details share row tracks, so wrapping labels preserve vertical alignment. The weekly goal keeps its lanterns near the associated text.
- The Reading Desk completion summary has a defined column aligned with the shared grid and stacks below its heading on narrow screens. Removed redundant Dashboard container resets and combined the drawer header styling.

## Verification

Playwright ran the production build in Chromium with deterministic API responses. The matrix covered seven views in each language at all five widths, for 70 combinations. Views included Dashboard, Reading Desk, the article reader, Notebook, the note editor, the Companion picker, and the room for the selected language.

Dashboard, Reading Desk, Notebook, and their detail views matched the following shared workspace measurements in both languages. Measurements are CSS pixels, rounded to one decimal place.

| Viewport width | Header left | Header width | Title top | Title size |
| --- | ---: | ---: | ---: | ---: |
| 320 | 18 | 268.8 | 77.6 | 36 |
| 390 | 18 | 339.2 | 77.6 | 36 |
| 768 | 164 | 561.7 | 28.6 | 38 |
| 1024 | 164 | 808.5 | 35.1 | 40.4 |
| 1440 | 219.3 | 1154.2 | 36 | 56 |

- Taste’s layout checker reported zero alignment flags for the three workspace pages across the final matrix. Playwright also checked the calendar and activity column edge, the Learning record text edge, and alignment across all three milestone meters.
- The matrix checked the language-specific palette, matching header geometry, rendered content edges, horizontal overflow, collisions between navigation and other primary controls, and the picker and room viewport dimensions.
- Navigation regression checks covered hover and keyboard expansion, Escape, the mobile drawer, the selected route and accent, focus after navigation, slow page loads, sidebar transitions and reduced motion. Delayed pages retained the existing text status.
- Learner regression checks covered draft retention during reset, reload, prompt selection, and auth changes, cross-tab mute persistence, quiz and starred-note focus, note save recovery, true empty versus error states, registration language, invalid links, and resumption after sign-in.
- Interactive checks in both themes covered the calendar and activity filter, the animated palette change and failed-switch retry, sign-in errors, translation and vocabulary save recovery, editor caret and draft recovery across language changes, destructive confirmation, and archive dialog focus. Both Companion rooms loaded their local 3D models at 390 px.
- The production build, Client TypeScript check, and all 20 Bun tests passed.

Browser captures include [Spanish Dashboard at 1440 px](../MCP/.playwright-mcp/phase15-step5-spanish-1440-dashboard.jpg), [Japanese Dashboard at 768 px](../MCP/.playwright-mcp/phase15-step5-japanese-768-dashboard.jpg), [Spanish Reading Desk at 390 px](../MCP/.playwright-mcp/phase15-step5-spanish-390-reading.jpg), and [Japanese Notebook at 390 px](../MCP/.playwright-mcp/phase15-step5-japanese-390-notebook.jpg). The run captured 30 screenshots.

## Verification limits

- The browser run used simulated service responses and viewport resizing. Live sign-in, cloud persistence, voice providers, microphone hardware, and other browser engines remain unverified by this run.

## Fold follow-up

Dashboard and Reading Desk use their original content-height layout. The viewport-height experiment cleared Taste's fold rules but separated the header, primary action, and supporting content with large gaps. The restored layout again produces Taste's landing-page fold and section-height warnings.

Sidebar navigation and the skip link still move focus to the main landmark. Its page-sized outline was removed. Interactive controls retain their keyboard focus indicators.

## Deferred work

- Phase 16 covers Dashboard content hierarchy, Reading Desk and article experience, and Notebook feature refinement. This includes the priority of practice metrics, the Reading introduction and study controls, and language markup on completed-reading titles.
- Phase 17 covers the Companion picker and rooms. This includes a clearer picker entry action and hit area, the room portrait during model startup, and visible names for History and New conversation where space allows.
