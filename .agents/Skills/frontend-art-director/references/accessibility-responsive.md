# Accessibility + responsive quality bar

Use while building and in QA. Aim for WCAG 2.2 AA where applicable; use project requirements if stricter.

## Semantic and accessible controls

- Semantic landmarks/headings and reading order; meaningful link/button names; inputs have visible labels; errors linked to fields; dialogs manage focus; focus rings remain visible.
- Keyboard-only walkthrough: Tab/Shift+Tab, Enter/Space, Escape, arrows where appropriate; no focus traps except valid modal focus containment. Restoring focus when dialogs close.
- Color is not the sole status signal. Text contrast generally >=4.5:1 (normal text) and >=3:1 (large text); non-text UI boundaries/focus indicators need discernible contrast. Evaluate actual backgrounds, not token names.
- Target sizes: WCAG 2.2 AA requires at least 24x24 CSS pixels or adequate spacing/exceptions for many targets; aim for ~44px comfortable touch areas in mobile where practical.
- Images have accurate alt where informative and empty alt when decorative; icons alone need accessible names.
- Support zoom up to 200%, dynamic text, high contrast preference where relevant; screen reader announcements for dynamic status when useful.

## Responsive exercise

Check at minimum 360/390, 768 and 1280/1440 widths (and short mobile height), using *actual browser rendering* if possible. Width numbers are probes, not universal breakpoints.

- No clipped buttons, unintentional horizontal overflow, inaccessible nav, overflowing toast/dialog, unreadable grids, or tables that become unusable.
- Layout adapts information priority: retain important controls and content on mobile rather than simply hiding them.
- Test long labels, realistic records, missing image, empty and loading states; hover should not be required on touch.
- Tap targets, input spacing and keyboard occlusion matter; avoid sticky layers hiding primary action.
- Respect safe area insets where needed; do not force 100vh layouts that cut off content on mobile browsers.

## Motion/a11y checks

- Implement reduced motion and make content visible when JS/animation fails.
- Ensure modal, menu and route transitions do not move keyboard focus unpredictably.
- Avoid autoplay video/audio, flashing and infinite distracting backgrounds. If content animates to communicate state, provide equivalent text state.

If automated a11y testing is available, use it, but never equate zero automated violations with complete accessibility.
