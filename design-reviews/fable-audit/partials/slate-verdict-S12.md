# Adversarial Skeptic Verdict — S12

**Proposal:** S12 — "Bring the web map camera up to the native reduce-motion standard (kill the falsy-zero trap)"
**Resolves:** L4-01 (primary), L4-02 (web cluster leg), L4-04 (Leaflet built-ins under RM), L4-09 (stale doc-comment).
**Effort:** S–M · **Tier:** Meaningful · **Signature:** no · **FORKS-TO-SKY:** none.
**Verdict: KEEP** — one of the cleanest fixes on the slate; a library-proven WCAG 2.3.3 correctness fix that touches no color/floor/glass/gesture law.

---

## What I did (read-only)

Read the full S12 entry, the cited findings (L4-01/02/04/09 in `partials/L4.md` + `02_findings.md`), the PROTECT list, GLASS.md, `sky-notes.md`, and — the decisive step — the **actual source** the proposal cites:
- `src/components/PlatformMap.web.tsx` (full file)
- `src/components/PlatformMap.tsx:88-110` (native camera path)
- `src/lib/accessibility.ts:90-100` (the doc comment)
- `node_modules/leaflet/dist/leaflet-src.js` `flyTo` (the falsy-zero mechanism)
- `MapScreen.tsx` (prop wiring + box-none overlay)
- jest config + existing web-map test inventory (guard-test feasibility)

## Claim-by-claim verification (every load-bearing code claim CONFIRMED against source)

| Proposal claim | Source check | Result |
|---|---|---|
| `flyTo(…, { duration: reducedMotion ? 0 : 0.6 })` at `:626` | `PlatformMap.web.tsx:624-627` | **CONFIRMED verbatim** |
| Leaflet treats `duration:0` as falsy → default distance flight | `leaflet-src.js`: `duration = options.duration ? 1000*options.duration : 1000*S*0.8` | **CONFIRMED** — `0` is falsy → arc flight |
| Fix mechanism `{ animate: false }` short-circuits to instant `setView` | `leaflet-src.js` flyTo: `if (options.animate === false || !Browser.any3d) { return this.setView(...) }` | **CONFIRMED** — the fix is library-correct, not a guess |
| Cluster fly `flyTo(…, { duration: 0.4 })` at `:345`, un-gated | `PlatformMap.web.tsx:345` | **CONFIRMED verbatim** |
| `ClusteredMarkers` never receives `reducedMotion` | props type `:252-258` + instantiation `:687-693` | **CONFIRMED** — no such prop passed |
| `MapContainer` has no `zoomAnimation`/`fadeAnimation`/autoPan overrides | `:638-643` | **CONFIRMED** — library defaults |
| Native already correct: `animateToRegion(…, reducedMotion ? 0 : 600)` | `PlatformMap.tsx:99-100` | **CONFIRMED** — genuinely instant on native |
| `accessibility.ts:95` stale "web…resolve to `false`" comment | `accessibility.ts:95` | **CONFIRMED** |
| `reducedMotion` prop is real + wired to the web map | `MapScreen.tsx:350` (`useReducedMotion()`) → `:1253` (`reducedMotion={reducedMotion}`) | **CONFIRMED** — the gate the fix repairs is live |

No claim in the proposal failed verification. The line numbers, the mechanism, and the fix are all accurate to HEAD.

## Per-rail attack

- **tracesToFinding — TRUE.** Genuinely resolves L4-01 (inverted web RM gate), L4-02 (both cluster legs — web `:345` literal + the missing `reducedMotion` prop threading), L4-04 (MapContainer zoom/fade/autoPan under RM), and L4-09 (the stale comment that "rationalized" the hole). L4-01/L4-02 are HIGH/CONFIRMED (probe-proven: intermediate frame @t700 for the flight, @t120 for the cluster). Bundling the adjacent MEDIUM (L4-04) + LOW (L4-09) into the same one-file/one-mechanism PR is efficient and correct, not scope-creep — they are the same file and the same reduce-motion law.
- **wcagFloorHeld — TRUE.** This *is* the WCAG 2.3.3 (Animation from Interactions) compliance fix. Improves the floor; non-RM users are untouched (the 0.6s flight is preserved). No trade.
- **glassLawHeld — TRUE.** The map camera is not a glass surface (GLASS.md §12: "camera ≠ glass"). No BlurView, no intensity, no floor, no ink touched — grepped the `:619-644` block: no hex/color/severity/contrast token present. `GlassSurface.tsx` untouched. The map overlay `pointerEvents="box-none"` gesture law is untouched — the fix changes Leaflet animation options, not hit-testing (the box-none wrapper at `MapScreen.tsx:1259` is unrelated to camera animation). Virtualization/`forceEngineered` laws are irrelevant here and untouched.
- **protectPreserved — TRUE (verified, not trusted).** PROTECT-7 = "reduce-motion discipline outside the map camera" + PROTECT-nom "the native camera gate is the behavior the web variant must be brought to match." I confirmed the native gate at `PlatformMap.tsx:99-100` is genuinely correct and that S12 is **web-scoped** — it does not touch the native path or the 32 Modal gates or the sheen/skeleton/splash gates. The merged PROTECT-7 text explicitly demands the L4-01/L4-02 fix "bring the web camera *up to* this standard, not touch the standard" — which is exactly what S12 does. No crown jewel regresses.
- **rnExpoFeasible — TRUE.** This is the *opposite* of the dead-on-arrival "announce on web" pattern: it makes **no** `announceForAccessibility`/`setAccessibilityFocus` call. It changes a Leaflet DOM API option (`animate: false`) + React props (`zoomAnimation`/`fadeAnimation` on `MapContainer`, `reducedMotion` threaded into `ClusteredMarkers`) — real, executable RN-web behavior. The required guard test is feasible: mature jest-expo suite (~1700 tests) with existing web-map tests (`CachedTileLayer.test.ts`, `MapScreen.deeplink.test.ts`, `HeatmapLayer.test.tsx`); `useReducedMotion` is a trivial hook to mock; asserting `flyTo` call args under a mocked RM hook is a standard jest pattern.
- **accessNotTradedForPolish — TRUE.** Pure access gain (removes the app's largest motion inflicted specifically on RM users). Nothing is hidden or degraded as "polish."
- **arbiterReRunPresent — TRUE (vacuously satisfied).** S12 touches **no** color/floor/severity value (confirmed by source grep). Per the rail, when no color/floor is touched, this is TRUE. The VERIFICATION correctly says "No arbiter" and instead names the load-bearing guard test — the right verification instrument for a motion fix, and it directly targets the exact mechanism (falsy-zero) by which the bug shipped and could regress.

## Residual risk (non-blocking, noted for the assembler)

- **`autoPan` under RM (L4-04 leg):** the focus/deep-link flows open a popup via `openPopup()` (`:630`) which can trigger Leaflet's animated `autoPan`. S12 correctly names setting popup `autoPan:false` under RM. This is real and covered by the proposal; no gap. (If the build wants to be surgical, `autoPan:false` under RM is sufficient — a full `autoPan` disable would harm non-RM usability, but the proposal already scopes it to RM.)
- **Native cluster leg (L4-02):** the proposal's primary web-cluster fix is verified; the *native* cluster leg (library `fitToCoordinates` with no `animated:false`) is a library-default behavior. The proposal's threading of `reducedMotion` handles the web leg cleanly; the native leg is device-only (NEEDS-SKY-DEVICE) and the proposal honestly tags the felt result as such. Not a rail issue.

None of these rise to a FIX condition — the proposal already scopes them correctly.

## Verdict

**KEEP.** Clean on all 7 rails. Accurate to source line-for-line, library-proven fix mechanism, correctly web-scoped (native PROTECT-7 untouched), no color/glass/gesture law touched, and a feasible + well-targeted guard test that pins the exact trap that let the bug ship. No fix conditions required.
