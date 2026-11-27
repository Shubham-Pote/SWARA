Perform a comprehensive UI/UX and design consistency audit of the entire SWARA application. Use Taste Skill and your own design judgment to identify inconsistencies, poor design decisions, unnecessary elements, and anything that feels out of place within the application's visual identity.

Some issues I have already noticed:

- Inconsistent header sizes, positioning, typography, and spacing across pages.
- Japanese mode should follow the blue theme, but the sidebar's active state still uses the Spanish theme colors.
- The note editor has an unnecessary focus border or box that disrupts the natural writing experience.
- Inconsistent content widths, margins, and layout proportions between Dashboard, Reading, Notes, and other pages.
- Headers contain unnecessary secondary elements. Keep them simple, purposeful, and visually consistent.
- Sidebar feature icons lack character and visual cohesion. Explore better iconography and subtle Anime.js or Motion animations where appropriate.

**Do not limit your audit to these issues.** Independently explore every page, component, interaction, and UI state in both Spanish and Japanese modes.

Look specifically for:

- Design system inconsistencies in colors, typography, spacing, borders, shadows, and component sizing.
- Poor visual hierarchy, awkward alignment, excessive whitespace, and overcrowded layouts.
- Features or design ideas that feel irrelevant to a language-learning application.
- Components that stand out unnecessarily or look disconnected from the rest of the app.
- Inconsistent animations, hover effects, transitions, and interaction feedback.
- Generic AI-generated design patterns, unnecessary cards, badges, decorative elements, and redundant text.
- Poor empty, loading, error, and responsive states.
- Unnecessary interaction friction and missed quality-of-life improvements.
- Repeated components that should share a common design system.

Inspect the actual running application through the browser wherever possible, alongside the frontend codebase. Do not rely solely on source-code inspection.

For every issue identified, provide:

1. Affected page or component.
2. Current problem and why it negatively affects the experience.
3. Exact proposed improvement.
4. Relevant files or shared components that would require changes.
5. Priority and potential impact.

Conclude with a unified design direction and a prioritized implementation plan. Consider Taste Skill, Motion, Anime.js, GSAP, React Bits, 21st.dev, Paper Shaders, and Lottie wherever they genuinely improve the experience, without forcing their usage.

Preserve SWARA's existing identity and language-specific themes. The goal is to make the entire application feel like one intentionally designed, polished, production-grade product rather than a collection of independently designed pages.

**This phase is strictly audit and planning. Do not modify any code, install dependencies, or implement changes yet. Present your findings and proposed solutions first. We will proceed with implementation in the next phase.**