# Content, visuals and credible product identity

Read when designing marketing pages, portfolios, dashboards with prominent illustrations, or any UI where missing content/imagery makes the page feel empty or generic.

## Content-first visual design

- Find existing brand assets, screenshots, documentation, real feature names and valid product data before writing interface copy. Keep the product's own vocabulary.
- Give every major section a purpose: user question answered, feature demonstrated, proof shown, task advanced. Eliminate generic filler sections and repeated claims.
- Headlines should be specific to the product and user outcome, not vague slogans. Write usable button labels (e.g. “Create campaign”, not “Get started” everywhere), concise errors and meaningful empty states.
- Avoid fabricated testimonials, customer logos, pricing, benchmarks, awards and usage metrics. In prototypes, mark sample/mock data clearly.
- Visualize actual workflows: screenshot of campaign editor beats irrelevant 3D blob; authentic status table beats a fake floating graph.

## Asset decisions

1. Inspect available local assets and licenses first. Use product-specific UI captures and supplied brand media over generic stock.
2. When external imagery is appropriate and permitted, choose a coherent art direction (lighting, crop, palette, subject, aspect ratios); verify rights and provenance before using. No image search result alone implies reuse rights.
3. Prefer scalable SVG for simple icons or existing project's icon system; avoid emoji as default interface icons and avoid mixing icon families/weights.
4. Optimize sizes, `srcset`/responsive image behavior, intrinsic dimensions, meaningful lazy loading and placeholders. Don't lazy-load important above-the-fold imagery without reason.
5. Informative visuals get accurate alt text or adjacent accessible explanation; decorative visuals get empty alt or are hidden appropriately.
6. Charts should explain actual data, units, time periods and states. Provide accessible labels or alternate tables when needed.

## Consistency and restraint

A cohesive landing page may use **one hero visual system**, **one consistent set of supporting product screenshots** and a repeatable diagram style. That is more convincing than a stack of unrelated effects. Use illustration/animation only when it communicates product meaning; create strong typography/layout when real media is unavailable.

## Marketing-page technical checks

For public indexable pages, verify title/meta descriptions, share previews where required, semantic heading order, crawlable content, descriptive links and image optimization. For authenticated SaaS dashboards, prioritize task UX rather than treating every internal screen as an SEO landing page.
