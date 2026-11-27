The current implementation makes several poor design and interaction choices regarding the characters and their environment. I want you to reconsider the experience from the ground up rather than simply improving the existing layout.

### 1. Character Exploration and Interaction

- Before implementing anything, thoroughly explore both `.vrm` models located in `C:\Users\ASUS\Desktop\SWARA\Client\Characters`.
- Understand their skeletons, facial expressions, blend shapes, humanoid bones, available animations, spring bones, and other supported capabilities.
- Determine how we can utilize these models to their fullest potential to create a genuinely immersive and interactive experience.
- Revisit the descriptions and requirements I provided in Phase 6 and implement the appropriate character behaviours accordingly.
- Make the characters feel alive through natural idle movements, breathing, blinking, eye tracking, lip synchronization, facial expressions, gestures, emotional responses, and smooth animation transitions wherever supported.
- Characters should react naturally to the conversation and transition between listening, thinking, speaking, and idle states without appearing mechanical or repetitive.
- Don't implement animations just for the sake of having them. Every movement should feel intentional, contextual, and natural.

### 2. Immersive Environment and Page Design

Completely reconsider the existing page layout. I don't want the character or environment restricted to a container, card, or boxed section.

- Create a full-screen, immersive animated environment that occupies the entire viewport.
- Position the character naturally in the centre of the screen, interacting with the surrounding environment.
- Design an atmospheric background with subtle animations, appropriate lighting, depth, and environmental details that complement the conversation.
- The experience should feel like interacting with a virtual companion rather than using a conventional chatbot interface.

### 3. Conversational Interface

- Place a minimal, translucent glass-style chat input at the bottom centre of the screen.
- When the user submits a prompt, display it in a smoothly animated glass-style message card.
- Keep the user's message visible while the companion processes and prepares its response.
- Stream the companion's response progressively into a separate, similarly styled message card while synchronizing the character's speaking behaviour.
- When a new prompt or response arrives, smoothly transition the existing message towards the right side of the screen, making room for the latest message.
- Older messages should gradually fade away after an appropriate duration without interrupting the conversation. Active messages should remain readable until their content has finished streaming.
- Avoid a traditional stacked chat interface. Conversations should feel fluid, lightweight, spatial, and integrated into the environment.

### 4. Contextual Suggestions and Controls

- Position contextual conversation suggestions, such as ordering coffee, in the left corner of the screen.
- Keep suggestions unobtrusive, context-aware, and easily accessible.
- Maintain a consistent monochromatic visual language using translucent black and white glass-style components, subtle borders, backdrop blur, and refined typography.
- Avoid unnecessary panels, excessive controls, heavy borders, distracting gradients, and generic dashboard-style layouts.

### 5. Overall Experience and Implementation

Use your own intelligence and design judgment to make the experience cohesive, polished, and production-ready. Leverage GSAP and the available frontend tools wherever they genuinely improve the experience rather than forcing their usage.

Pay particular attention to animation orchestration, character responsiveness, visual hierarchy, rendering performance, responsive layouts, and seamless transitions between interaction states.

Explore the existing codebase and character assets before making architectural decisions. Reuse working functionality wherever appropriate, and avoid introducing unnecessary complexity.

**The goal is not to build a chatbot with a 3D character attached to it. The goal is to build an immersive, living virtual companion experience where the conversation, character, interface, and environment feel like parts of one unified system.**