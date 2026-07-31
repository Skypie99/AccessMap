# LENS 8 — IMAGES + MEDIA (banked 2026-07-31)

## Verified (programmatic)

- **Alt quality where context exists**: web map callout photos carry contextual alt ("Photo of {category} accessibility issue", `PlatformMap.web.tsx:538`); every icon-only control is named (255-element sweep); the bespoke CategoryIcon/Wayfinder set rides labeled parents; the web splash logo SVG is `aria-hidden` + `focusable="false"` (`public/index.html:158`); no decorative UI emoji (PROTECT-24); `decorativeProps` used correctly at its 4 adoption sites.
- **Media**: no video or audio exists in the app — 1.2.x and 2.2.2 autoplay have nothing to score. OnboardingCards visuals are decorative-hidden with SR mirrors.

## Findings / re-surfaces

- **A11Y-234 (Medium · systemic web decorative leak · F-22 re-surfaced, unchanged at HEAD): ~126 bare `accessibilityElementsHidden`/`importantForAccessibility` sites vs only 8 `aria-hidden`.** Both native props DO NOTHING on react-native-web (proven in the ledger via the shipped `sortLabel` still appearing in the web ARIA tree), so most "hidden decorative" content is hidden on native only and leaks into the web accessibility tree. `decorativeProps` (which includes `aria-hidden`) is the ready-made fix, adopted by only 4 files. Mechanical, high-count, low-risk — the definitive Phase B sweep item, with a guard so new hide-sites use the helper.
- **SR-080 re-surfaced (known-deferred, reason stands)**: photo alt is positional ("Photo N of M", `PhotoGallery.tsx:97,:201`) — the data model stores no caption, so a richer alt is a product decision (Sky), not a wiring fix. The web callout's category-contextual alt is the pattern to extend if the model ever grows one.

**FINISHED** — 1 Medium (systemic re-surface), 1 known-deferred pointer.
