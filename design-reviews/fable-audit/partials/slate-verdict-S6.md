# Adversarial Skeptic Verdict — S6 "Honest zoom: app-styled 44pt zoom buttons in the overlay bottom"

**Resolves:** L5-01 (CRITICAL) · facets L3-3, L6-20 (zoom slice of L8-5). **Effort M · Tier ★SIGNATURE.**
**Verdict: FIX** (sound and important — the audit's defining device-integrity CRITICAL — but one rail needs a concrete condition).

---

## Per-rail verdict

| Rail | Result | Basis |
|---|---|---|
| tracesToFinding | ✅ true | Genuinely resolves L5-01's real mechanism. |
| wcagFloorHeld | ✅ true | Improves 2.5.5 + 2.5.7; keeps keyboard path. |
| glassLawHeld | ✅ true | box-none repaired not broken; GlassSurface threaded; no blur-budget change. |
| protectPreserved | ✅ true | No PROTECT item touched; PROTECT-6 locating spine untouched; box-none invariant preserved. |
| rnExpoFeasible | ✅ true | Real Leaflet/`MapView` APIs; additive handle extension, no fork; no web-announce dependency. |
| accessNotTradedForPolish | ✅ true | Pure access gain, no hidden regression. |
| **arbiterReRunPresent** | ❌ **false** | Tappable control over live tiles ⇒ GLASS §12 1.4.11 boundary + 1.4.3 glyph obligations; "No arbiter" claim is wrong. **The FIX.** |

---

## What I verified in the code (did not trust the entry)

- **`MapContainer` has no `zoomControl` prop** → `PlatformMap.web.tsx:638` — confirmed. It defaults to `true`, so Leaflet renders its default top-left 26–30px buttons. S6's `zoomControl={false}` premise is accurate.
- **`topRow` is a plain `View`, NOT `box-none`** → `MapScreen.tsx:1266` (`<View style={styles.topRow}>`, inside the box-none `overlayTopGroup` at :1265 but itself un-guarded). This confirms the ADJUSTED L5-01 mechanism (taps die on `topRow`, even visible zoom pixels are pointer-dead). S6's central structural claim holds.
- **The overlay is a real `box-none` architecture with a bottom zone** → outer overlay `pointerEvents="box-none"` (:1259); the `bottomBar` (:2036) already hosts the FABs (`fabColumn` :2041), which are pointer-operable in the bottom zone. S6's "mount 44pt zoom buttons in the reachable bottom zone mirroring the overlay groups" is architecturally sound and precedented.
- **`a11y.minTargetSize: 44`** → `theme.ts:490` — confirmed (S6 cites this floor).
- **Native has no zoom-control props** → `PlatformMap.tsx` `<MapView>` at :118 sets `showsUserLocation` etc. but no `zoomControlEnabled`/zoom buttons; confirms the iOS "no button, single-pointer zoom-OUT gap" half (correctly scoped to iOS; Android `zoomControlEnabled` defaults true — noted in 02_findings §82).
- **Imperative handle currently lacks a zoom method** → `PlatformMapHandle` exposes only `animateTo` + `showCallout` (`.web.tsx:31-39`, `.tsx:24-30`). S6 says buttons are "wired to the map's imperative zoom." That method does not exist yet, so S6 requires ADDING one (or wiring the web buttons to the existing Leaflet `mapRef` from `setMapRef`, which already exposes `zoomIn/zoomOut/setZoom`; native `MapView` exposes `animateCamera`/`getCamera`). **This is a straightforward additive extension, not a primitive fork — fully RN/Expo-feasible.** It does not weaken feasibility; noted so the builder scopes the integration honestly ("a real integration, not a one-liner," which S6 already concedes in spirit).

## Attack that landed: the arbiter claim is materially wrong (→ FIX, not KEEP)

S6 field (7) states flatly: **"No arbiter (button chrome, not a contrast token)."** Under this codebase's OWN GLASS.md law that is incorrect:

- The zoom buttons are **tappable, app-owned controls floating over the map's live, unbounded tiles** — precisely the GLASS §12 LIVE-BACKDROP case.
- GLASS §12 rule 4 ("boundary colors can't span the range alone… prove the union covers all backdrop luminances") and the audit's own arbiter extension (`design-reviews/fable-audit/tools/audit-stacks.json` lines 63–69) establish the governing precedent: **pins are "TAPPABLE components → 1.4.11 boundary 3.0 vs tile extremes."** A new zoom button introduces exactly such a new surface + edge composited over `#000`/`#FFF` tile extremes.
- Therefore the button's **edge/hairline vs tile** is a 1.4.11 non-text-contrast obligation (min 3.0) and its **glyph (+/−) vs fill** is a 1.4.3 obligation (4.5). Both must be certified by `contrast-check.mjs` over tile extremes — the arbiter decides, never the eye (PROTECT-5, GLASS §7.1). "No arbiter" would let the eye ship a control edge that vanishes on a matching tile (the §12 rule-4 failure mode).
- The *values* need not be new: if the buttons are pinned opaque and reuse already-ratified tokens — `ctaFill` fill + `textOnBrand` glyph (GLASS.md:77) and/or the `variant="row" forceEngineered` hairline the existing FAB/actionBar/statusPill already use (opaque ⇒ tiles unreachable, per the audit-stacks COVERAGE LEDGER) — then the swap is provably conformant. But the **arbiter re-run is still the certifying mechanism**, exactly as S1's anon-pin ring and S7's over-tile inks name it. Rail 5/§D of this slate's own contract requires: touch anything that composites a color over a live/variable backdrop ⇒ VERIFICATION names `contrast-check.mjs` + `audit-stacks.json` AND adopts an existing token.

This is a FIX, not a KILL: the idea is correct, high-value (CRITICAL #4, the "defining device-integrity defect"), the tokens already exist, and the only defect is the missing arbiter clause in VERIFICATION.

## Rails that survived attack

- **glassLawHeld:** S6 *repairs* the box-none gesture-law violation (the un-guarded `topRow`) rather than breaching it; the new zoom group is `box-none` at its container with only the buttons intercepting, so map pans still pass through. GlassSurface is threaded, never forked. No BlurView is added — as `forceEngineered` opaque chrome the buttons are budget-free by mechanism (GLASS §12 rule 5), so intensities stay 12/24 untouched. Attribution correctly deferred to S7. Virtualization untouched.
- **protectPreserved:** verified each way — no PROTECT item is regressed. Crucially PROTECT-6 (the locating fix, `initialLocationAction`, `location.test.ts`, zero `watchPosition`) is nowhere near this fix; S6 does not touch the mount/permission path. The load-bearing box-none invariant is preserved. PROTECT-1/3/16 untouched (buttons are new chrome, no existing surface content altered).
- **rnExpoFeasible:** no `announceForAccessibility`/web-announce dependency (this is a *visual* control, not an SR announcement) — so the RN-web no-op trap does not apply. `zoomControl={false}` is a real Leaflet prop; imperative zoom exists on both platform refs; the handle extension is additive. Feasible.
- **wcagFloorHeld / accessNotTradedForPolish:** the change only adds an accessible non-gesture zoom path; no access is traded for polish.

---

## fixConditions

1. **Correct field (7): S6 DOES require an arbiter re-run.** Change "No arbiter" to: run `contrast-check.mjs` against `tools/audit-stacks.json` with a stack for the zoom button's (a) edge/hairline vs tile extremes `#000`/`#FFF` (1.4.11, min 3.0, per the pin-boundary precedent at audit-stacks lines 63–69) and (b) +/− glyph vs its fill (1.4.3, min 4.5) → exit 0. State the tile-extremes window per GLASS §12 rule 3.
2. **Adopt existing ratified tokens — invent none.** Pin the buttons opaque and reuse `ctaFill` + `textOnBrand` (GLASS.md:77) and/or the `variant="row" forceEngineered` chrome the FAB/actionBar/statusPill already ship; declare that reuse in `audit-stacks.json` (or cite the covering shipped pair in the COVERAGE LEDGER). No eye-tuned floor.
3. (Non-blocking, scope honesty) Note that wiring buttons to zoom requires **adding a zoom method to `PlatformMapHandle`** (or wiring the web buttons to the existing Leaflet `mapRef`); it is additive, not a GlassSurface/primitive fork.

With conditions 1–2 folded into VERIFICATION, S6 is clean and ★SIGNATURE-worthy.
