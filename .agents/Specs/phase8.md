Refine the existing companion experience with the following improvements. Preserve the current visual direction while significantly improving character behaviour, animation orchestration, interface design, and interaction quality.

### 1. Character Behaviour and Animation System

I want the character behaviour to be divided into two primary modes: **Default Mode** and **Interaction Mode**, with seamless, event-driven transitions between them.

Before implementing this system, thoroughly explore both `.vrm` models located in `C:\Users\ASUS\Desktop\SWARA\Client\Characters`. Understand their skeletons, humanoid bones, facial expressions, blend shapes, and animation capabilities. Revisit the descriptions provided in Phase 6 and utilize the models to their fullest potential.

#### Default Mode — Independent Character Behaviour

Currently, the character simply stands still when the user is not interacting. Instead, make the character feel like a living individual with its own personality, curiosity, emotions, and spontaneous activities.

Creative examples include:

- Standing with folded arms and casually looking around.
- Walking, jogging, or playfully running around the environment.
- Stretching, yawning, and relaxing.
- Sitting down or casually changing posture.
- Dancing or performing spontaneous playful movements.
- Exploring and interacting with the surroundings.
- Waving at the user to attract their attention.
- Tapping its foot or placing its hands on its hips.
- Expressing boredom, curiosity, happiness, and excitement.
- Approaching the camera out of curiosity before moving away.
- Performing small spontaneous activities that reflect the character's personality.

These are creative examples, not strict requirements. Use your own intelligence to explore additional behaviours that are technically achievable and appropriate for each character.

Activities should be dynamically selected with randomized intervals, varied durations, natural movement, and smooth animation blending. Avoid predictable or repetitive animation loops.

The character should feel like it exists independently within the environment rather than waiting for user instructions.

#### Interaction Mode — Conversation-Driven Behaviour

The moment the user submits a prompt, the character should transition from Default Mode into Interaction Mode.

During this mode, the character should:

- Naturally interrupt or complete its current activity.
- Return to an appropriate conversational position.
- Establish eye contact and direct its attention towards the user.
- Display contextual thinking expressions while processing prompts.
- Utilize lip synchronization, facial expressions, body language, and hand gestures while responding.
- React emotionally and physically according to the conversation's context.
- Nod, smile, laugh, express surprise, or demonstrate actions when appropriate.
- Maintain subtle conversational idle behaviours while waiting for the next prompt.

For example, if the character is running around when the user submits a prompt, it should naturally slow down, turn towards the user, and transition into a conversational posture instead of abruptly teleporting or resetting its animation.

#### Automatic Mode Transitions

Implement an event-driven character behaviour system that manages the following lifecycle:

- **Initial page load:** Activate Default Mode.
- **User submits a prompt:** Transition into Interaction Mode.
- **Prompt processing:** Activate thinking behaviour.
- **Response streaming or speech:** Activate speaking and contextual animations.
- **Response completed:** Remain attentive and wait for further interaction.
- **Continued conversation:** Remain in Interaction Mode.
- **Prolonged inactivity:** Naturally disengage and return to Default Mode.
- **User re-engages:** Immediately prioritize Interaction Mode again.

The inactivity timer should account for active typing, response generation, and speech playback to prevent the character from disengaging during an active conversation.

Build a properly managed character behaviour system with animation prioritization, interruption handling, smooth blending, contextual behaviour selection, and state management rather than independently triggering animations from different components.

### 2. Conversation Start Components

- Once the user initiates a conversation, smoothly dismiss the introductory and "Start Conversation" components.
- These components should not reappear during the existing conversation, even if the character returns to Default Mode due to inactivity.
- Use subtle and polished exit animations without disrupting the immersive environment.

### 3. Chat Input Component

Redesign and refine the existing chat writing component to make it feel more premium, minimal, and visually consistent with the translucent glass aesthetic.

- Automatically expand the component vertically as the user types longer prompts.
- Once it reaches a reasonable maximum height, stop expanding and make the text area internally scrollable.
- Automatically return to its original height after the prompt is submitted.
- Keep the component anchored to the bottom centre of the screen.
- Improve typography, padding, borders, backdrop blur, transparency, focus states, and send button interactions.
- Ensure smooth height transitions without abrupt layout shifts.
- Maintain a clean and comfortable writing experience for both short and long prompts.
- Avoid unnecessary visual elements or excessive component sizing.

### 4. Component Sizing and Visual Balance

- Slightly reduce the size of the character name and city information component.
- Make the right-side conversation cards smaller and more compact while maintaining readability.
- Refine spacing, typography, padding, and visual hierarchy.
- Maintain a consistent monochromatic black-and-white translucent glass aesthetic across all interface components.
- Reduce unnecessary visual weight so that the character and immersive environment remain the primary focus.

### 5. Implementation Expectations

Explore the existing codebase, character models, animation resources, and available tools before making implementation decisions.

Use your own creativity, technical understanding, and design judgment regarding animation selection, inactivity thresholds, transition timings, component dimensions, and character-specific personalities.

Leverage compatible animation assets, procedural animations, VRM capabilities, GSAP, and existing frontend tools wherever they genuinely improve the experience. Do not force their usage unnecessarily.

Prioritize:

- Natural and expressive character movements.
- Seamless transitions between behaviour modes.
- Character-specific personality and spontaneous activities.
- Context-aware conversational reactions.
- Animation blending and interruption handling.
- Rendering performance and responsive design.
- Clean, maintainable, and extensible architecture.
- Minimal, refined, production-quality interfaces.

Avoid repetitive animations, robotic movements, abrupt transitions, unnatural poses, unnecessary components, and overengineered solutions.

**The ultimate objective is to create a living virtual companion that has a life of its own when left alone but becomes attentive, expressive, and engaging the moment the user interacts with it. The character, conversation, environment, and interface should feel like parts of one cohesive experience rather than separate features assembled together.**