# Advanced motion, visual treatments and GSAP craft

Motion is one of several design materials alongside typography, layout, imagery and CSS. **Do not restrict GSAP to entrance animation or scrolling.** A powerful visual experience can use advanced animation while remaining readable, accessible and smooth.

## Motion/visual toolkit

| Intention | Techniques to explore |
| --- | --- |
| Editorial type and headings | GSAP SplitText on lines/words/chars with stagger, ScrambleText, TextPlugin, masks, kinetic letter spacing, semantic text fallback; React Bits text treatments |
| Style progression and material changes | GSAP CSSPlugin on opacity, transforms, colors, borders, CSS variables, supported gradients and custom properties; use CSS/Tailwind for stable baseline style |
| Cinematic scroll scenes | GSAP ScrollTrigger timelines, scrub, pin and section transitions, ScrollSmoother with careful focus/scroll handling |
| SVG visual storytelling | DrawSVG, MorphSVG, MotionPath, transformations, shape interpolation and vector progress |
| Spatial UI transitions | Flip layout motion for card rearrange, shared-element changes, step transitions; keep React state authoritative |
| Pointer, touch and gesture | Draggable, Inertia and Observer; synchronize touch, scroll, keyboard alternative and focus |
| Expressive background graphics | React Bits backgrounds, particles/shaders, canvas/WebGL with GSAP timeline control or controlled React effects; avoid compositing multiple engines on the same values |
| Interactive media, navigation and cards | React Bits UI/micro effects, shadcn or 21st structures with coherent custom GSAP/CSS behavior |

These are **examples rather than exclusivity rules**. Compare the actual result and costs against design intent.

## Recommended choreography approach

1. Define the still-frame design at normal and mobile sizes; ensure content is visible without JavaScript.
2. Describe states and transitions (initial → engaged → resolved) instead of adding generic `.from({opacity:0})` to everything.
3. Prototype one distinct interaction at real dimensions; inspect its timing, hierarchy and performance before scaling.
4. Use eases and timing families consistently; bold hero sequences may be longer than microfeedback, but never block controls or reading.
5. Keep layout stable and aim for transform/opacity during frequent frames; animating blur, shadows, CSS variables and filters may repaint—use them consciously and profile demanding effects.

## React lifecycle and accessibility

- Prefer scoped `useGSAP()` or `gsap.context()` with cleanup/revert and stable dependencies. Avoid duplicate ScrollTriggers, leaked listeners, global selectors, race conditions or fighting React's rendering state.
- When using SplitText or altered DOM typography, ensure readable accessible text, correct nested-link semantics, responsive reflow and teardown. Check current official GSAP SplitText accessibility instructions.
- Check GSAP plugin existence/import/version/terms from current docs; do not copy stale plugin snippets.
- Respect `prefers-reduced-motion`: replace essential transitions with immediate readable states, preserve all content and focus paths, and disable parallax/cursor-driven flashes where necessary.
- Preserve controls during timelines: no invisible clickable elements, stolen scrolling, trapped focus or hover-only actions. Test touch and keyboard.
- Avoid flash-heavy or visually overwhelming sequences, excessive WebGL on low-end devices and layout shifts. Prefer pause-on-hidden/offscreen for continual effects.

## Visual QA

Test normal and reduced-motion settings; inspect first load, scrolling, navigation, repeated mount/unmount, responsive reflow, long translated text, performance under mobile constraints, and slow connections. Report actual testing rather than claiming broad device support.
