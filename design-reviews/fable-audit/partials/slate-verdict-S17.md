# Adversarial Skeptic Verdict — S17

**Proposal:** S17 — "Contain the Home map peek: one clean button, no tap-theft, no app-exit" (resolves L5-06, L4-06; effort S; tier QuickWin; FORKS-TO-SKY: none).
**Verdict:** **KEEP**
**Reviewer:** Adversarial skeptic (Opus 4.8), Part 3 slate review, 2026-07-04.

---

## Per-rail verdict

| Rail | Result | Basis |
|---|---|---|
| tracesToFinding | ✅ true | Resolves L5-06 (HIGH, CONFIRMED) + L4-06 (motion facet, deduped into L5-06). Code verified. |
| wcagFloorHeld | ✅ true | Pure access improvement (WCAG 4.1.2 role=behavior, 2.5.1 no hidden gestures). No floor traded. |
| glassLawHeld | ✅ true | No color/floor/blur touched; GlassSurface.tsx untouched; map-overlay box-none is a different surface. |
| protectPreserved | ✅ true | PROTECT-10 verified intact — peek honesty/distance logic untouched; no PROTECT regressed. |
| rnExpoFeasible | ✅ true | `pointerEvents="none"` is a real RN prop (already used at :265); `zoomControl`/`attributionControl` are real react-leaflet MapContainer props. No web-announce no-op. |
| accessNotTradedForPolish | ✅ true | No hidden access regression; restores the peek's intended one-button behavior. |
| arbiterReRunPresent | ✅ true | Touches no color/floor/severity value — rail auto-satisfied; VERIFICATION correctly states "No arbiter." |

**fixConditions:** none — ships clean.

---

## Reasoning (what I attacked and what survived)

**The finding is real and code-verified.** I did not trust the proposal's code claims — I read `HomeScreen.tsx:257-269` directly. It matches the finding exactly: a plain `<Pressable onPress={() => navigation.navigate('FullMap')} accessibilityRole="button" accessibilityLabel="Open the full map">` wraps a live `<PlatformMap initialRegion={peekRegion} flags={flags} focusedFlagId={null} />`, with only the hint pill guarded (`<View style={styles.mapPeekHint} pointerEvents="none">` at :265). There is no `pointerEvents` guard on the map, and no `scrollEnabled`/`zoomEnabled`/`interactive` toggle on either PlatformMap variant. The web `MapContainer` (`PlatformMap.web.tsx:638-643`) sets **no** `zoomControl` or `attributionControl` prop, so Leaflet's defaults (`zoomControl: true`, `attributionControl: true`) render live zoom buttons + live "Leaflet / OpenStreetMap / CARTO" anchors inside the button — exactly the app-exit vector the finding names. L5-06 carries a CONFIRMED skeptic verdict (probe #6: wheel over the peek left page `scrollTop` 0→0 while the peek zoomed to all of SF). tracesToFinding holds hard.

**I attacked the fix mechanism hardest — it survives.** The proposal has two independent halves:
1. **A `pointerEvents="none"` wrapper** around the peek's `<PlatformMap>`, inside the existing `<Pressable>`. On RN-web this compiles to CSS `pointer-events: none`, which propagates to the whole subtree — killing web zoom-button clicks, attribution-link navigation, AND scroll/drag-zoom capture in one move. On native, a `pointerEvents="none"` wrapper makes its subtree ignore touches so they pass through to the parent Pressable — which is precisely the fix for the react-native-maps gesture-swallow. This half touches ONLY `HomeScreen.tsx` — not `PlatformMap`, not `GlassSurface.tsx`, not the FullMap. Sound and self-contained.
2. **Web-only `zoomControl={false}` + attribution suppression** on the peek instance. This requires threading ONE new optional prop into `PlatformMap.web.tsx`'s `MapContainer` (both are real react-leaflet props). That is *threading the primitive per-instance*, not forking it — the shared `PlatformMapProps` interface already carries per-instance flags (`reducedMotion`, `showsUserLocation`), so this follows the established pattern. Given half (1) already neutralizes the web app-exit risk via `pointer-events: none`, half (2) is defense-in-depth (removes the dead controls from the render entirely), not the load-bearing mechanism. Harmless and correct either way.

**GLASS law: clean.** No blur, no intensity, no contrast token, no floor is touched. `GlassSurface.tsx` is genuinely untouched — the HomeScreen peek does not use it. The proposal name-drops the map-overlay `pointerEvents="box-none"` gesture law only to say it is untouched; that law lives on the **MapScreen** overlay (a different surface), so S17 cannot violate it. The virtualization / forceEngineered laws are irrelevant here.

**PROTECT-10 verified, not trusted.** The claim is "peek still shows the map, just stops stealing gestures." I confirmed the fix touches only gesture inert-ization and the web zoom/attribution controls — it does NOT touch `peekRegion` (`HomeScreen.tsx:120`), the `hasCenter`/distance logic, or the LATEST/RECENT/CLOSEST honesty copy. Home's honesty law (distances never fabricated) is fully preserved. No other PROTECT item is on this surface (PROTECT-1 Nearby twin is a separate modal; untouched).

**Access is improved, not traded.** Making the peek fully inert could superficially read as "removing interactivity," but the peek was *never* meant to be interactive — it is announced to AT as ONE button. The fix makes behavior match the announced role (4.1.2), removes hidden interior gestures (2.5.1), and eliminates the single most disorienting failure on the landing surface (app-exit from a mis-tap inside a button — R4's exact population). Nothing accessible is lost.

**Feasibility + verification are honest.** `pointerEvents="none"` is already in use in this very component (:265), so no unknown API. The web behavior is in-harness (Chromium) verifiable and the proposal scopes its manual checks there; the native tap-to-open + drag resolution is correctly marked NEEDS-SKY-DEVICE (react-native-maps gesture-swallow can only be truly confirmed on a real build). No proposal here "announces on web" — there is no announcement leg at all.

**Minor, non-blocking note (not a fixCondition):** S17 introduces the per-instance `zoomControl`/`attributionControl` gate that neither S7 (map tile theme) nor S12 (RM camera) owns, yet all three touch `PlatformMap.web.tsx`. The proposal already flags this in its Shared-file coordination line ("with S7/S12"), so the coordination is acknowledged, not missed. If S7 also suppresses peek attribution, the assembler should ensure the two don't double-implement the same gate — a merge-ordering detail, not a rail issue.

**Conclusion:** A textbook QuickWin — a few lines that remove an entire class of the worst landing-surface failure, with zero floor/glass/PROTECT cost and a mechanism that is RN/Expo-real on both platforms. Every rail holds. **KEEP.**
