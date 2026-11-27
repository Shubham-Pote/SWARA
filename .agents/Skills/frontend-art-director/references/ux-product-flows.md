# Build complete product flows, not isolated screenshot screens

Use for dashboards, portals, tools, or any multi-route application.

## Feature map

Inspect actual routes, menus, authorization, domain terminology, query parameters, API hooks, server responses and state machines. List current features (including edge paths) to prevent redesign regression. Group into primary, supporting and administrative user jobs, then map each to navigation and visual priority. Avoid hiding critical features simply for a cleaner screenshot.

## Screen anatomy

For each major screen define:
- Context: where the user is and what the screen means.
- Key decision: what they need to understand.
- Primary action: a strong labeled control, never only an ambiguous icon.
- Secondary actions: discoverable but lower hierarchy.
- Objects: which real data they manipulate, with labels/units/source timestamps as relevant.
- States: initial, loading/skeleton, empty (first use vs no results), partially loaded, success, validation error, permission denied, offline/timeout, and unavailable.
- Recovery: how to retry, undo, cancel or return; preserve entered content when possible.

## Patterns worth choosing deliberately

- Dashboard: spotlight next action, status, important changes; tables for comparative records, charts only for meaningful trends; filters and sort state visible.
- Complex creation: progressive steps or single-page sections based on actual task complexity; autosave only if implemented and accurate; make AI-generated work editable.
- Multi-agent systems: show progress/state truthfully (pending/running/blocked/complete), ownership, human approval points, failures, logs and re-run affordances; do not fake "agents working" animations.
- Search/list: quick query feedback, useful sort/filter, empty result guidance, accessible pagination/infinite loading.
- Forms: clear labels/hints, inline errors near field and summary for longer forms; indicate optional/required, don't discard edits silently.
- Auth/admin: secure navigation states, scope of access, destructive confirmations, no impersonated data.

## Responsive information architecture

At small widths, **re-prioritize**, don't just squeeze: primary task remains visible, secondary nav collapses accessibly, tables may become scrollable with clear cues or structured details. Avoid removing essential functionality on mobile. Respect persistent controls, safe areas, input keyboard, and long text.

## Content honesty

Use actual project vocabulary and content. When data is missing, use minimal coherent demo data visibly identified as sample in development, not believable fake business metrics presented as real. Make status colors accompanied by text/icons. Avoid charts as decoration.
