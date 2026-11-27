# Phase 16 — Bun Client workspace

## Step 1 — Dashboard

The Bun Client Dashboard leads with the next conversation. The shared workspace frame, header, language switch, sidebar, typography, and Spanish and Japanese themes follow Phase 15.

### Dashboard changes

- The featured practice action resumes an existing unsent draft first. Otherwise it uses the most recent named reading or lesson in the activity feed, even when newer exchanges exist. It offers a language-specific introduction or daily conversation when there is no recent topic. The greeting uses the selected language and the learner’s first name when available.
- On phones the practice action precedes the portrait. On larger screens the two columns retain their language-specific arrangement and align with the shared workspace edges.
- **This week** groups the current streak, three-day goal, illustrated progress lanterns, and seven-day calendar. The goal counts distinct practice days in the seven-day window ending today, using UTC. Selecting a day updates its status and leaves the goal fixed.
- **Recent activity** groups the exchanges in the returned feed by UTC date and keeps completed readings and lessons individually visible. The API returns up to five events, so grouped counts describe that feed. The short feed no longer needs a filter or a second conversation button.
- **Learning record** holds lesson XP, level, totals, best streak, and milestones. Milestone rows show the earned state or the next target directly. New learners see how to earn XP and what activity will appear, with the primary conversation action directly above.
- Existing Anime.js checks and level ring, Motion transitions and count-ups, and CSS hover effects retain their roles. The 21st catalog’s habit calendar and task list were considered. The existing calendar and simple list rows cover the flow with the current components and dependencies.

### Weekly progress animation

The weekly summary now shares a rooftop backdrop with three illustrated lanterns. This gives the area beside the count a purpose and keeps the date controls clear. The original Rive lanterns matched the story but felt like an inserted tile, the waveform left the same gap, and the calendar-only light treatment blurred the distinction between day selection and the weekly goal. [Larger Rive lanterns](../MCP/.playwright-mcp/phase16-lantern-large-spanish-1440.png), [waveform](../MCP/.playwright-mcp/phase16-progress-wave-spanish-1440.png), and [calendar light study](../MCP/.playwright-mcp/phase16-calendar-lights-study.png).

The exploration also considered 21st’s [Animated Progress Stepper](https://21st.dev/@shadcnspace/components/stepper-03) and [Isometric Steps](https://21st.dev/@abhishek-mallick/components/steps). Both frame progress as a sequence of tasks. Forest’s visual practice reward and Duolingo’s identifiable milestone animations informed the use of objects tied to SWARA’s own setting. [Forest](https://forestapp.cc/), [Duolingo](https://blog.duolingo.com/streak-milestone-design-animation/).

Each completed practice day lights and briefly sways one lantern. Three lights mark the goal and the text reports the actual count above three. Selecting a date does not replay the lights. Reduced motion shows the final light state immediately. The animation uses the Client’s existing Motion dependency. The Dashboard does not request the Rive runtime. [Motion accessibility guide](https://motion.dev/docs/react-accessibility).

Playwright verified zero through four days, the light and sway transitions, reduced motion, calendar keyboard selection, and responsive layouts from 320 to 1440 px. [Spanish desktop](../MCP/.playwright-mcp/phase16-terrace-dashboard-spanish-1440.jpg), [Japanese mobile](../MCP/.playwright-mcp/phase16-terrace-dashboard-japanese-390.jpg), and [unlit state at 320 px](../MCP/.playwright-mcp/phase16-terrace-progress-0-320.png).

The built-in ImageGen tool produced the [paper lantern sprite](../../Client/src/assets/weekly-paper-lantern.webp). The [weekly backdrop](../../Client/src/assets/weekly-terrace.jpg) is a smaller export of SWARA’s existing rooftop artwork.

ImageGen prompt

> Use case: illustration-story. Create ONE isolated hanging paper lantern game sprite, actual transparent alpha, as a production asset for SWARA’s illustrated twilight language-learning terrace. A short oval, slightly rectangular paper lantern with a gently rounded silhouette, subtle vertical ribs, warm ivory parchment, a dark brown cap and base, fine bronze wire hoop, and a short understated tassel. Center a complete, straight-on lantern, including its small hook and tassel, in a tight vertical crop with enough clean transparent margin on every side. The shape must read at 64px high. Hand-painted cel animation background art, late-twilight tones, painterly ink edges and faint paper grain, understated natural materials. Shade the paper in warm neutral cream, bright enough to be convincingly illuminated later by application code. No light rays, no baked glow outside the lantern, no long cable, no supporting beam, no people, no scenery, no text, no logos, only one object. Transparent background is essential.

### Verification

- The production build, Client TypeScript check, and all 21 Client tests passed. Dashboard tests cover UTC dates, grouped exchanges, and selecting a recent reading after newer exchanges.
- Playwright used the locally served production build and deterministic API responses. Both languages were checked at 320, 390, 768, 1024, and 1440 px for workspace alignment, visible artwork, no horizontal overflow, calendar keyboard interaction, and a stable weekly goal. The browser checks also covered topic handoff, draft resumption, guest sign-in, Dashboard request failure and retry, the signed-in empty state, and reduced motion.
- Taste informed hierarchy, alignment, action-first mobile order, and contrast. The signed-out quick check passed text contrast, viewport containment, collision, and visible focus. Its landing-page fold and section-height requirements remain the intentional exceptions recorded in Phase 15. It also flags the shared sidebar inset and stylesheet focus rules, the featured heading scale, and the existing full-size portrait on mobile. Playwright separately checked alignment and keyboard operation in the actual workspace.

#### Screenshots

- [Spanish desktop](../MCP/.playwright-mcp/phase16-spanish-1440.jpg) and [Spanish phone](../MCP/.playwright-mcp/phase16-spanish-390.jpg)
- [Japanese desktop](../MCP/.playwright-mcp/phase16-japanese-1440.jpg), [Japanese tablet](../MCP/.playwright-mcp/phase16-japanese-768.jpg), and [Japanese phone](../MCP/.playwright-mcp/phase16-japanese-390.jpg)
- [Japanese new learner, reduced motion](../MCP/.playwright-mcp/phase16-japanese-new-390.jpg)

Step 1 used fixture accounts and activity. See [Step 3 — Notebook](./phase16-notebook.md) for the editor and review changes.

## Step 4 — Workspace verification

Dashboard, Reading Desk, and Notebook share the workspace frame, display and interface fonts, and practice language accents. The Dashboard portrait and lanterns, the reader’s narrower passage measure and sticky tools, and the Notebook’s paper surface and writing measure serve different tasks within that frame.

### Refinements

- Completed readings in Dashboard activity now link to the original passage when the API can resolve it. Grouped exchanges, lesson summaries, and readings whose records are unavailable remain readable as activity. The recent reading still supplies the suggested conversation topic.
- The shared skip link now moves keyboard focus to main content without changing the URL. This keeps an open Notebook note and its URL fragment intact.
- Retained the existing hover, motion, language themes, and content-height layouts. The documented Taste `hero-fold` and `screen-short` exceptions still apply. No viewport-height spacing was added. See [Phase 15 layout decision](./phase15.md).

### Verification evidence

- **Playwright with fixture API responses.** Checked Dashboard, Reading Desk, the article reader, Notebook, and the note editor in Spanish and Japanese at 320, 390, 768, 1024, and 1440 px. All 50 views stayed within the viewport. Workspace header edges matched across screens at each size. Keyboard checks opened Dashboard reading links, toggled English, and exercised the skip link in the editor without closing it.
- Delayed and failed fixture requests distinguished loading, empty, and error states on all three pages. Retries recovered Dashboard activity, the reading shelf and first passage assignment, and Notebook loading. Playwright also verified the reduced motion lantern state, a link to a passage in the other practice language, and recovery from an invalid article URL.
- In both languages, keyboard calendar selection, quiz failure and retry, vocabulary save failure and retry, and Notebook vocabulary review worked through their normal entry points. The reading handoff kept the learner’s existing draft and added the passage prompt in the correct room. An edit made while saving was unavailable survived a reload in local storage, then saved to the fixture API and reopened after another reload.
- **Build and API regression checks.** The Bun production build and both TypeScript checks passed. All 24 Client tests and six backend tests passed. The backend tests used temporary local MongoDB and simulated external providers. The Dashboard regression checks that a reading includes its article ID and a lesson does not.

### Taste findings

Taste’s quick checker covered the signed-out build at all five widths. Its landing page rules still flag the fold, section heights, call to action, and page structure. The sidebar occupies a dedicated inset, card text has internal padding, and the Dashboard keeps its existing portrait placement. Playwright confirmed the shared header edges, equal typography across features at 320 px, and consistent accents for each language.

Taste also reported stylesheet focus and skip-link findings. In Playwright, the skip link was the first visible Tab stop at 320 px in both languages. It moved focus to main content, and the keyboard flows retained visible focus on interactive controls. Taste’s shared stylesheet scan also includes the Companion composer, outside the Step 4 UI scope.

Raw reports and checker counts are available for [Dashboard, 41 fails and 20 warnings](../MCP/.playwright-mcp/phase16-final-taste-dashboard/report.json), [Reading Desk, 26 fails and 9 warnings](../MCP/.playwright-mcp/phase16-final-taste-reading/report.json), and [Notebook, 25 fails and 10 warnings](../MCP/.playwright-mcp/phase16-final-taste-notes/report.json). These counts include repeated findings at different widths.

#### Capture samples

[Spanish Dashboard at 1440 px](../MCP/.playwright-mcp/phase16-final-spanish-1440-dashboard.jpg), [Japanese Dashboard at 320 px](../MCP/.playwright-mcp/phase16-final-japanese-320-dashboard.jpg), [Japanese Reading Desk at 390 px](../MCP/.playwright-mcp/phase16-final-japanese-390-desk.jpg), [Japanese article at 390 px](../MCP/.playwright-mcp/phase16-final-japanese-390-article.jpg), [Spanish Notebook at 1440 px](../MCP/.playwright-mcp/phase16-final-spanish-1440-notebook.jpg), [Japanese note editor at 390 px](../MCP/.playwright-mcp/phase16-final-japanese-390-editor.jpg), and [Japanese vocabulary review at 390 px](../MCP/.playwright-mcp/phase16-final-japanese-390-review.jpg).

### Limits and deferred work

Hosted account persistence, deployment, and live Gemini and ElevenLabs calls were outside the verification. The Companion coverage ends at opening the existing room with a draft. Companion design work remains deferred.

Taste flagged the size of the existing Dashboard portrait on phones. Both portraits rendered in the browser matrix. Transfer and render time on a throttled mobile connection were not measured. Responsive portrait encodes are deferred.
