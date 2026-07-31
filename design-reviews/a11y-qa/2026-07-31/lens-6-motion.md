# LENS 6 — MOTION + TRANSPARENCY (banked 2026-07-31)

## Verified (programmatic)

- **The RM 6-layer contract holds at HEAD**, guard-proven: (1) all 36 live modal `animationType`s RM-gated (dismissables sweep + `reduceMotion.modalGate` tree-walk — a new Modal cannot escape it); (2) primitives (Skeleton static, Button/PressableScale springs gated, press-dim survives RM by construction); (3) drawer zero-timers + same-tick RM snap latch (PROTECT-22, 220ms delay-gate); (4) map camera — native `duration:0` jump, web `{animate:false}` never numeric 0 (the falsy-zero trap has its own assertion), leaflet `zoomAnimation`/`fadeAnimation` RM-gated (`PlatformMap.web.tsx:1032-1033`); (5) banners — announce decoupled from motion (PROTECT-7/18), RM path uses `setValue`; (6) web pre-JS `prefers-reduced-motion` media query (`public/index.html:138`) so the splash respects RM before the bundle parses.
- **2.2.2**: no autoplaying/moving/scrolling content exists — no video, Skeleton static at 0.5 under RM, FlagCard sheen *unmounted* (not frozen) under RM/RT. **2.3.1**: nothing flashes.
- **Reduce Transparency (native)**: GlassSurface owns RT centrally (drops blur for the arbitrated opaque fill); TabBarGlass mirrors the contract (`RootNavigator.tsx:125-137`). Device rows D-A10/D-A11 remain the runtime proof.

## Findings

- **A11Y-232 (Low · SR-073 re-surfaced, re-scoped · programmatic): the web build's blur is not user-suppressible.** 4 web-only CSS `backdropFilter` sites (RootNavigator tab bar :325, SignInScreen :345, OnboardingCards :679, HamburgerDrawer :509 — the drawer alone gates on the RN RT signal, which is structurally `false` on web, so all four behave identically). The RM story has a pre-JS media query; the RT story has no `@media (prefers-reduced-transparency: reduce)` twin anywhere. Low: iOS RT users are fully served natively; this is web progressive-enhancement. Phase B: add the media-query twin (CSS-only, no RN change), and re-measure the four sites' text floors over their un-blurred fallbacks when doing so.

## Device rows

**D-A9** — RM + native map camera jump (the one RM claim jest cannot prove: react-native-maps may read `duration: 0` as falsy) · D-A10/D-A11 — RT surfaces incl. the two SR-073 native-adjacent screens · R2-D13 — one felt press dialect.

**FINISHED** — 1 Low (re-scoped re-surface); the motion contract is one of the strongest subsystems in the app.
