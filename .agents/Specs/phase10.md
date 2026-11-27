Let's proceed feature by feature rather than redesigning everything simultaneously. For this phase, focus exclusively on **sidebar navigation, Companion selection, and minor refinements to the existing Companion interaction page.** Leave the Dashboard unchanged for now.

### 1. Design Direction

Use the existing Companion page as the primary visual reference. Maintain its atmosphere, theme, typography, translucent glass finish across the new interfaces.

Explore high-quality design references before implementing anything. Improve the existing visual language wherever possible without moving in a completely different direction.

### 2. Sidebar Navigation

- Replace the existing navigation with a refined sidebar accommodating all application features.
- The sidebar should smoothly expand when hovered over and collapse when the cursor moves outside its area.
- Use a premium translucent glass finish similar to the components on the Companion page, or improve upon that styling.
- Explore sidebar references and components from React Bits, 21st.dev, shadcn, and other creative design resources.
- Pay attention to iconography, typography, spacing, active states, hover interactions, and expansion animations.

The sidebar should feel like a naturally integrated part of SWARA rather than a generic navigation component.

### 3. Immersive Companion Selection

When the user selects Companion from the sidebar, present a creatively designed, cinematic character selection screen.

I envision an asymmetrical composition featuring large, interactive character cutouts integrated into a custom-generated atmospheric background.

For example, position one character towards the upper-right with their information on the left, and the other towards the lower-left with their information on the right.

- Use the existing VRM models as accurate visual references for the character cutouts.
- Showcase their names, personalities, languages, and relevant information through expressive typography and creative visual composition.
- Introduce meaningful hover interactions, character movements, cursor-responsive parallax, animated text, environmental reactions, or personality-specific greetings.
- Create suitable background imagery and visual assets where necessary.
- Use smooth, cinematic transitions when entering the selected character's interaction environment.

Take inspiration from premium game character selection screens, interactive storytelling websites, and creative GSAP showcases.

Avoid conventional boxed layouts. Choosing a companion should itself be a fun, immersive experience. The suggested composition is a creative direction, not a strict layout requirement.

### 4. Companion Interaction Page

The existing interaction page is good. **Do not redesign it or modify its core experience.** Only make the following refinements:

- Remove or relocate unnecessary controls, including Sign Out, Dashboard, Companion navigation, and Spanish/Japanese switching buttons.
- Hide the application sidebar within the immersive interaction environment.
- Provide a minimal, borderless back arrow in the upper-right corner.
- Reduce the size of the character information .
- Remove the "Ready to Talk" text.
- Retain the existing glassy buttons and interactive components, but improve their hover effects, click feedback, and transitions. Their current interactions feel slightly disconnected from the immersive experience.
- Make these interactions feel smoother, more responsive, and naturally integrated into the environment.

Preserve everything else, including character animations, behaviour states, conversation functionality, background, and existing layout.

### 5. Implementation Approach

Explore actual design references and animation showcases before making decisions. Use React Bits, 21st.dev, GSAP, and other suitable resources to achieve genuinely creative interactions. Use Taste Skill to review and refine the interface at each meaningful stage.

Use your own creativity and design judgment rather than strictly following every example. Prioritize visual consistency, meaningful animations, performance, and polished interactions.

**The objective of this phase is to establish a refined navigation experience and an immersive character selection journey that naturally leads into our existing Companion environment. Focus on quality rather than the number of features implemented.**
