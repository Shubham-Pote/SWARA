# Visual QA: iterative critique with concrete acceptance criteria

Read during rescue, polish and before declaring major UI complete. Design taste improves by **observing actual output and fixing specific failures**.

## Evidence gathering

1. Start app with its documented command. Verify it actually loads, including data/auth dependencies. Capture current screens before changes in RESCUE mode.
2. Inspect screenshot(s) at desktop and mobile, and if possible interact with the app, not just static page source. Include the flagship screen and at least one dense/edge-state screen.
3. Check light/dark themes if product supports both; respect user theme. Examine typography at normal browser zoom and 200% zoom when tools permit.
4. Compare changed results to baseline and reference **principles**. Explain where app has its own identity. Do not copy a competitor screenshot.
5. Repeat critique → fix → inspect. For major tasks aim for at least two iterations if browser tools work; stop when major defects are corrected or record blocker.

## 0–4 scorecard (each dimension)

| Dimension | 0 = broken | 2 = acceptable but weak | 4 = strong |
| --- | --- | --- | --- |
| Information hierarchy | No obvious primary task | Task visible, competing clutter | Immediate focal priority; clear next action |
| Typography & content | Hard to read | Readable, generic | Distinct, consistent, precise, purposeful |
| Composition & spacing | Misaligned/clipped | Basic grid, uneven rhythm | Deliberate balance, consistent rhythm |
| Design coherence | Mixed unrelated styles | Mostly consistent | Recognizable cohesive identity |
| Interaction & states | Missing/broken | Basic controls only | Responsive, clear feedback and recovery |
| Responsive usability | Broken on mobile | Usable with compromises | Adapted, comfortable on small screens |
| Accessibility | Critical blockers | Common basics | Keyboard, contrast, semantics and motion cared for |
| Motion & polish | Distracting/buggy | Decorative | Meaningful, restrained, robust |

Do not use the numeric score to pretend an objective guarantee; use it to force comparative criticism. A professional target is **no critical blocker** and most dimensions at 3–4, with explainable 2s.

## Blocker-level defects (fix before claiming done)

- Main task invisible or inaccessible; navigation misleading; contrast so low content cannot be read; mobile horizontal overflow; modal blocks access; missing keyboard focus; text overlaps; components clipped; failed API states not handled; first screen looks like unrelated generic UI; content hidden if animations don't fire; GSAP effect duplicated on route change; large layout shifts.

## Specific critique language

Bad: "Add premium feel", "make spacing better", "needs more modern design".

Good: "Sidebar width crowds the content on 390px; collapse nav behind labeled menu and keep campaign Create action visible". "H1 and card titles have almost equal weight; increase typographic contrast, reduce card borders and tighten information grouping".

Fix the three highest impact issues first, not twelve cosmetic nits. If there is no browser tool, review code/layout statically, list unverified render risks, and never invent screenshots.
