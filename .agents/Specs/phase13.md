I want to start working on the frontend implementation of our Notes feature, associated with the existing backend route:

`import notesRoutes from "./routes/notes.routes";`

### 1. Understand the feature before implementation

Explore the existing backend routes, controllers, services, schemas, API contracts, database models, and related frontend architecture.

Understand the current capabilities of the Notes feature and how it connects with SWARA's overall language-learning experience.

Don't simply build a conventional notes management interface with a list of notes and basic CRUD operations. Expand upon the existing idea and explore how notes can become a meaningful part of a user's language-learning journey.

Think about how learners can capture knowledge, organize vocabulary, revisit conversations, understand grammatical concepts, and retain what they have learned throughout the application.

### 2. Design direction and application consistency

**The highest priority is maintaining consistency with our existing application theme and design identity.**

- Study the existing dashboard, reading experience, conversation interface, typography, colors, spacing, and interaction patterns.
- Make the Notes feature feel like a natural extension of SWARA rather than a separate productivity application.
- Maintain a premium, minimal, modern, and thoughtfully designed interface.
- Avoid generic note-taking templates, repetitive card layouts, unnecessary borders, excessive gradients, and AI-generated design patterns.
- Utilize available screen space effectively and avoid unnecessary blank areas.
- Maintain consistency without limiting creative exploration.

The experience should feel personal, approachable, organized, and enjoyable to revisit.

### 3. Utilize our existing frontend tools and skills

Make intelligent use of our existing skills, MCP servers, component libraries, and animation capabilities.

- **21st.dev:** Discover high-quality components, creative layouts, and interaction patterns that could enhance the Notes experience.
- **React Bits:** Explore interactive components, animated elements, text effects, and creative UI enhancements.
- **Motion:** Implement smooth layout transitions, note interactions, state changes, component transitions, and micro-interactions.
- **Anime.js:** Explore creative animation sequences, staggered effects, interactive feedback, and subtle continuous animation loops.
- **GSAP:** Use where sophisticated transitions, coordinated animation sequences, or more complex interactions would improve the experience.
- **Paper Shaders:** Explore animated textures, organic patterns, and subtle atmospheric effects if they can add meaningful visual depth while maintaining our application theme.
- **Lottie:** Search LottieFiles for suitable animated illustrations, empty-state animations, loading experiences, or contextual visual feedback. Verify asset licensing before use.
- **shadcn:** Utilize accessible and reusable components wherever appropriate.
- **Taste Skill:** Use throughout the design process and during the final visual review to eliminate AI slop and ensure production-quality design.

Use other relevant installed skills and tools wherever they provide meaningful value.

Do not force every library into the implementation. Select the most appropriate tool for each use case. Paper Shaders and Lottie animations should only be used if they genuinely improve the experience.

Check existing dependencies before installing anything. If necessary, install missing dependencies using Bun inside the Client directory.

### 4. Expand the Notes experience creatively

Think beyond traditional note-taking functionality. Explore how this feature can actively support users learning Spanish and Japanese.

Consider possibilities such as:

- A personal language-learning notebook that evolves alongside the user's progress.
- Vocabulary collections with translations, pronunciation, and contextual examples.
- Grammar notes and useful expressions organized around learning activities.
- Notes connected to AI character conversations and reading articles.
- Categorization through meaningful tags, topics, and language-specific collections.
- Quick note creation without interrupting the learning experience.
- Interactive note previews and focused editing experiences.
- Intelligent search and filtering.
- Pinned notes and frequently revisited learning material.
- Vocabulary revision and knowledge retention opportunities.
- Creative ways to present previously learned words and concepts.
- Thoughtful organization that becomes more useful as the learner progresses.
- Contextual navigation between notes and other learning features.

These are suggestions, not mandatory requirements. Explore better ideas independently based on our application's direction, purpose, and existing backend capabilities.

Keep English as the primary navigational and instructional language so that beginners can comfortably use the feature while learning Spanish or Japanese.

Do not fabricate backend functionality or present mock interactions as completed features. Identify any additional backend requirements separately.

### 5. Bring the experience to life

I want the Notes feature to feel interactive, engaging, and alive rather than resembling a static collection of information.

Explore opportunities to improve the experience using Motion, Anime.js, GSAP, and our other creative frontend capabilities.

Consider:

- Smooth transitions when opening, creating, editing, and organizing notes.
- Animated search and filtering interactions.
- Natural layout transitions when notes are added, removed, or rearranged.
- Meaningful hover and press feedback.
- Interactive vocabulary and translation elements.
- Polished transitions between browsing and focused editing.
- Creative saving and completion feedback.
- Thoughtfully designed loading states.
- Encouraging and visually interesting empty states instead of dry messages such as "No notes found."
- Subtle ambient animations, animated textures, or illustrations where they complement the experience.

Explore Paper Shaders and LottieFiles for visual enhancements that could make the feature more distinctive and beautiful. Think creatively about their placement rather than automatically applying them to backgrounds or empty states.

Pay particular attention to small quality-of-life improvements that make everyday interactions feel polished and intuitive.

Animations should support the user's workflow rather than interrupt it. Avoid unnecessary motion, ensure good performance, and respect reduced-motion preferences.

### 6. Implementation quality

Build this as a production-ready feature, not a visual prototype.

- Integrate with the actual Notes backend APIs.
- Follow existing project architecture and coding conventions.
- Reuse existing components, hooks, utilities, and design tokens wherever appropriate.
- Maintain proper TypeScript typing and separation of concerns.
- Ensure reliable note creation, editing, deletion, and persistence wherever supported.
- Handle loading, error, empty, and success states gracefully.
- Prevent accidental loss of unsaved content.
- Ensure responsive behavior, accessibility, and keyboard navigation.
- Optimize animation performance and properly clean up animation instances.
- Preserve existing application functionality and avoid unnecessary architectural changes.
- Use Graphify through the existing graph-context skill when cross-file dependencies or architectural impact justify its usage.

### 7. Final design and implementation review

After implementation, perform a comprehensive design and usability review using Taste Skill.

Review the actual rendered experience using available browser inspection tools rather than evaluating only the source code.

Evaluate:

- Consistency with SWARA's existing theme and visual identity.
- Visual hierarchy, typography, spacing, and layout.
- Creativity and meaningful use of interactive components.
- Animation quality, timing, and natural transitions.
- Overall note-taking and language-learning experience.
- Ease of navigation and organization.
- Empty states, loading experiences, and quality-of-life details.
- Responsiveness, accessibility, and performance.
- Backend integration and functional correctness.
- Whether Paper Shaders or Lottie animations genuinely enhance the experience, if used.

Identify and refine anything that feels generic, disconnected, unfinished, unnecessarily complicated, or AI-generated.

Remove effects or dependencies that do not contribute meaningful value.

### Overall objective

Create a distinctive, personal, and interactive language-learning notebook that feels like it was designed specifically for SWARA.

I don't want another generic CRUD-based notes page. I want an experience that encourages users to capture what they learn, revisit their knowledge, and develop a deeper connection with their language-learning journey.

Prioritize application identity, theme consistency, meaningful interactivity, creativity, usability, and production quality.

You have creative freedom to expand upon the existing idea, explore unconventional approaches, and make thoughtful design decisions. Do not treat these instructions as a rigid component or animation checklist.

Use your own intelligence, explore the available tools, understand the application holistically, and build something genuinely polished.

Proceed with implementation, visual verification, and refinement rather than stopping at a design proposal.