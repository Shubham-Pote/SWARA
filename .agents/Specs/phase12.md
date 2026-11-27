I want to start working on the frontend implementation of our Reading Article feature, associated with the existing backend route:

`import readingArticleRoutes from "./routes/readingArticle.routes";`

### 1. Understand the feature before implementation

Explore the existing backend routes, controllers, services, schemas, API contracts, and related frontend architecture. Understand what functionality is already implemented and how this feature fits into SWARA's overall language-learning experience.

Don't simply build a frontend that displays articles returned by an API. Expand upon the existing idea and think about how reading can become an engaging, interactive, and meaningful part of our language-learning application.

Understand our application's direction, target audience, and learning philosophy before making design decisions.

### 2. Design direction and consistency

**The highest priority is maintaining consistency with our existing application theme and design language.**

- Study the existing dashboard, conversation interface, typography, colors, spacing, components, and interaction patterns.
- Make the reading experience feel like a natural extension of SWARA rather than a separate application.
- Maintain a premium, minimal, modern, and thoughtfully designed interface.
- Avoid generic AI-generated layouts, unnecessary cards, excessive gradients, repetitive components, and decorative elements without purpose.
- Make effective use of available screen space and avoid unnecessary blank areas.
- Maintain visual consistency without limiting creative exploration.

### 3. Utilize our existing frontend tools and skills

Make intelligent use of our installed skills, MCP servers, component libraries, and animation libraries wherever appropriate.

- **21st.dev:** Explore high-quality component designs and creative interaction patterns.
- **React Bits:** Explore interactive and animated components that complement the reading experience.
- **shadcn:** Utilize accessible, reusable components where appropriate.
- **GSAP:** Create sophisticated transitions, coordinated animation sequences, and immersive experiences.
- **Motion:** Implement smooth layout transitions, component interactions, state changes, and micro-interactions.
- **Anime.js:** Explore creative text animations, interactive visual feedback, staggered animations, and smaller details that bring the interface to life.
- **Taste Skill:** Use it during the design process and again during the final review to eliminate AI slop, improve visual hierarchy, and ensure production-quality design.
- Use other relevant installed skills and tools where they genuinely improve the implementation.

Do not force every library into every component. Use your own judgment to select the appropriate tool for each interaction. Avoid overlapping animations and unnecessary dependencies.

### 4. Expand the reading experience creatively

Think beyond a conventional article listing and reading page. Explore how this feature can actively help users learn Spanish and Japanese through reading.

Consider ideas such as:

- Personalized article discovery based on learning preferences and proficiency.
- Interactive vocabulary exploration within articles.
- Clickable words with contextual meanings, pronunciation, translations, and examples.
- Progressive reading experiences with optional learning assistance.
- Interactive reading progress indicators.
- Vocabulary saving and revision opportunities.
- Contextual comprehension exercises.
- Difficulty indicators that communicate useful information.
- Smooth transitions between article discovery and focused reading.
- Reading achievements and meaningful completion experiences.
- Contextual integration with our AI character conversation experience where appropriate.

These are suggestions, not mandatory requirements. Explore better ideas independently and determine what makes sense for our application and existing backend capabilities.

English should remain the primary navigational and instructional language so that beginners can comfortably use the application before becoming proficient in their selected language.

Do not fabricate backend functionality or present mock interactions as working features. Identify any additional backend requirements separately.

### 5. Bring the application to life

I want the experience to feel responsive, engaging, and alive rather than static.

Look for opportunities to introduce meaningful interactions using Motion, Anime.js, and GSAP:

- Animated article previews and selection states.
- Smooth reading-mode transitions.
- Interactive vocabulary popovers.
- Subtle hover and press feedback.
- Animated progress and completion states.
- Thoughtful loading and skeleton experiences.
- Creative, encouraging empty states instead of dry placeholder messages.
- Natural transitions between different learning activities.

Pay attention to small quality-of-life improvements throughout the experience. Even simple interactions should feel intentional and polished.

Animations should enhance usability, not interrupt reading or distract users from learning. Respect reduced-motion preferences and maintain good performance.

### 6. Implementation quality

Build this as a production-ready feature, not a visual prototype.

- Integrate with the actual backend APIs.
- Follow existing project architecture and coding conventions.
- Reuse existing components and utilities wherever appropriate.
- Maintain proper TypeScript typing and separation of concerns.
- Handle loading, error, empty, and success states gracefully.
- Ensure responsive behavior, accessibility, and keyboard navigation.
- Preserve existing functionality and avoid unnecessary architectural changes.
- Use Graphify through the existing graph-context skill when cross-file dependencies or architectural impact justify it.

### 7. Final design and implementation review

After implementation, perform a comprehensive review using Taste Skill.

Evaluate the actual rendered experience, not just the source code. Use available browser inspection tools to verify the interface and interactions.

Review:

- Consistency with SWARA's existing theme.
- Visual hierarchy and typography.
- Layout and spacing.
- Animation quality and timing.
- Interactive behavior.
- Beginner-friendly language-learning experience.
- Responsiveness and accessibility.
- Performance and code quality.
- API integration and functional correctness.

Identify and fix anything that feels generic, disconnected, unfinished, unnecessarily complicated, or AI-generated.

### Overall objective

Create a distinctive reading and language-learning experience that feels like it was designed specifically for SWARA.

Prioritize application identity, meaningful interactivity, creativity, usability, and production quality.

You have creative freedom to explore ideas, make thoughtful design decisions, and improve the experience beyond the suggestions provided here. Do not treat these instructions as a rigid component checklist.

Understand the application, think independently, make good decisions, and build something genuinely polished.

Proceed with implementation rather than stopping at a design proposal.