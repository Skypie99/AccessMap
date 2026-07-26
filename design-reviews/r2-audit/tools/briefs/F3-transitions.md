# F3 — TRANSITIONS & CONTINUITY

Inventory EVERY screen/sheet/drawer/tab transition at HEAD: trigger · curve/duration vs the
`motion` tokens (theme.ts:462 — instant 0 / fast 120 / base 180 / slow 320 / pulse 700) ·
native-driver? · RM parity. Start from Round 1's motion inventory table (the Round-1 report §4 —
24 rows) and UPDATE it for the delta: S12 fixed the web camera ({animate:false} on all 5 paths),
B5 gated the drawer 220ms + tokenized pulse, B7b gated the iOS cluster spring, S6 added an
RM-gated zoomBy, S10 added an RM-gated recenter-on-new-pin. The ~25 Modal mounts are ALL
RM-gated ternaries (slide majority; fade: MapScreen ×2, PhotoLightbox, PhotoGallery,
OnboardingCards) — verify by grep, then judge each PRESENTATION as a designed moment.

The RM variant must be a DESIGNED stillness, not an amputation: the transitions/ rm-* frames
prove whether the end state is simply PRESENT at t120–150 (designed) or the UI half-arrives.
Judge the drawer's `animationType="none"` + hand-animated slide + 220ms sub-screen delay
(HamburgerDrawer.tsx:119) as designed moments — deliberate stillness or dead air? (subswap-t120
vs t400 frames; rm-subswap-t120 must already be swapped — B5.)

Does bulk glass ARRIVE like material? The sheet-presentation frames (report opening-t150/t400,
nearby/legend/detail opening-t150): does the pane slide in as one coherent surface (floor + edge
+ content together) or do layers pop separately (scrim first, content later, blur snapping in)?
Chromium approximates blur — tag honestly; the code path (Modal slide + GlassSurface mount) is
readable.

Cross-screen handoffs — continuity of the one material world through motion: Tasks card → Map
focus (`focusFlag` param + retryShowCallout ladder — judge the FEEL of arrive-then-callout);
callout → detail (S3's new doorway — trans:detail frames); Nearby row → detail under SR (nested
sheet, pattern B); Home pill → Map + auto-sheet (three layers stack — does the guest arrival feel
orchestrated or piled?); tab switches (no animation — is the cut clean or jarring given the
stage/wash differences between tabs?). Judge the theme-flip tile swap (S7 threads scheme into the
tile layer) if reachable — else code-read.

Your asset groups: `transitions/` (all frames incl. rm-*), `base/` (before/after anchors),
`press/` (press springs are F1's; boundary = anything that MOVES between screens/sheets is
yours). Repo: PlatformMap(.web).tsx camera paths, HamburgerDrawer, Sheet.tsx, the Modal mounts,
MapScreen retryShowCallout.
