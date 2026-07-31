# LENS 3 — KEYBOARD (web surface) (banked 2026-07-31)

**Scope note:** native iOS full-keyboard-access is device-script territory (rn-web laws make it jest-invisible); this lens is the web build, verified programmatically against source + the installed `react-native-web@0.21.x`.

## Verified operable (evidence tag: programmatic)

| Requirement | Verdict | Evidence |
|---|---|---|
| 2.1.1 Keyboard — modals | ✅ | 50 `onRequestClose` sites; rn-web `ModalContent.js:26-35` binds document `keyup` Escape → `onRequestClose`. Escape-key dismissal is platform-provided at every site. |
| 2.1.2 No keyboard trap (+ containment) | ✅ | rn-web `ModalFocusTrap.js` FocusBracket traps Tab inside every open `<Modal>`; dismissal via Escape per above. |
| 2.4.7 Focus visible | ✅ | Global `:focus-visible` safety-net ring in `public/index.html:54-60` (written citing 2.4.7); component-level focus styles in `ui/Button`, `ui/Card`, theme tokens; map callout buttons get injected `:focus-visible` CSS (`PlatformMap.web.tsx:359`). Ring contrast measured by BP2 arbiter: 3.70 light / 3.24 dark ≥ 3:1 (1.4.11). |
| 2.4.3 Focus order — occluded scenes | ✅ | `ScreenInertLayer` (`RootNavigator.tsx:228-239`) mirrors scene focus → `inert` via `applySceneInert`; BP2 proved `aria-hidden` alone left 13 occluded Home controls tabbable and `inert` fixed it (CDP-probed then; guard tests pin it). |
| Map keyboard operability | ✅ | Leaflet `MapContainer` keeps default `keyboard:true` (arrow pan, `+`/`-` zoom when focused); flag pins + cluster bubbles are focusable markers with labels (cluster: "…Tap to zoom in and expand", `PlatformMap.web.tsx:438`); Enter activates. `keyboard={false}` appears ONLY on decorative heatmap centroid labels (`:1069`) — correct use, keeps focus on real pins. App-styled 44pt zoom buttons (S6, `MapScreen.tsx:2559-2580`) are focusable Pressables labeled "Zoom in"/"Zoom out". |
| 2.4.1 Bypass blocks | ✅ pass-by-technique, see note | Repeated chrome is minimal (editorial ScreenHeader: menu + Feedback; tab bar sits at DOM bottom, not before content). Each screen opens with an `accessibilityRole="header"` heading (H69 sufficient technique — cross-checked in lens 2). Functional map-bypass exists: the List button → NearbyFlagsModal enumerates all flags without traversing pins. |

## Findings

- **L3-1 (Low, web):** no explicit skip link. Not a violation (2.4.1 satisfied by headings + minimal repeated chrome), but a "Skip to content" anchor in `public/index.html` would harden the story if the header family ever grows. Evidence: no "skip" match in `public/index.html` / navigation; programmatic.
- **L3-2 (NEEDS-SKY-DEVICE, native):** external-keyboard + Full Keyboard Access pass on iOS (tab bar, modals, map) has no programmatic proof possible — rn-web stubs make jest silent here. → device script.

**FINISHED** — 1 Low + 1 device row. No Blocker/High. Prior keyboard work (BP2 inert, S6 zoom, escape law) all verified still present at `5ab3f0c` — no regressions.
