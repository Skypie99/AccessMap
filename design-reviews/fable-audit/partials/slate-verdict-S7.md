# Adversarial Skeptic Verdict — S7 "Claim the flagship map: theme the tiles, tame the third-party chrome (web-scoped)"

**Resolves:** L8-5 / L2-3 (canonical I) · absorbs L1-6 dark-void slice + L5-16 attribution slice · pairs with S17 for the Home peek. **Effort M · Tier ★SIGNATURE (web-scoped).**
**Verdict: FIX** (sound, high-value, access-POSITIVE — the first-contact flagship fix — but two rails need concrete conditions and one seam needs reconciliation with S6).

---

## Per-rail verdict

| Rail | Result | Basis |
|---|---|---|
| tracesToFinding | ✅ true | Genuinely resolves L8-5/L2-3's real, code-verified mechanism (`PlatformMap.web.tsx:531`); tile-theme + attribution are S7's legitimate lane. |
| wcagFloorHeld | ✅ true | IMPROVES the floor — restores light-mode map legibility (a near-black map in light mode is a de-facto contrast catastrophe for R3). No floor traded. |
| glassLawHeld | ✅ true | No blur intensities touched (tiles + Leaflet CSS, not a BlurView — stays 12/24); box-none left to S6; `GlassSurface.tsx` not edited/forked; virtualization + `forceEngineered` untouched. |
| **protectPreserved** | ❌ **false** | The "preserves PROTECT-9" citation is WRONG — PROTECT-9 = web-as-guest-mode, not the always-light overlay strategy. Substance is true, the numbered claim fails verification. **FIX #1.** |
| rnExpoFeasible | ✅ true | `useColor()` is in-scope at `.web.tsx:566`; scheme→URL is an additive prop to `CachedTileLayerWrapper`, no primitive fork; `light_all` is a real CARTO basemap on the same CDN; no web-announce dependency. |
| accessNotTradedForPolish | ✅ true | Access-POSITIVE, not a hidden regression. The one access RISK (pin ring over light tiles) is exactly what FIX #2 forces the arbiter to catch. |
| **arbiterReRunPresent** | ❌ **false** | Tile switch composites map-world inks over a NEW light backdrop; S7 names the arbiter only "conditionally" / scoped to "overlay ink," MISSING the predictable pin-ring failure over light tiles (audit-stacks line 63: white ring vs `#FFFFFF` = 1.0:1). **FIX #2.** |

---

## What I verified in the code (did not trust the entry)

- **Tiles are `dark_all` unconditionally** → `PlatformMap.web.tsx:531` (`const OSM_URL = '…/dark_all/…'`) with the literal comment "matches the app's dark UI" — a single module-level const, **no `color.scheme` branch**. S7's central premise is accurate and the finding is CONFIRMED CURRENT.
- **Theme IS reachable in the component** → `const themeColor = useColor()` at `.web.tsx:566`. The tile URL is consumed inside module-level `CachedTileLayerWrapper` (`:536`, mounted at `:644`), so the scheme/URL must be threaded down as a prop — a real, additive integration (not a one-liner, not a fork). Feasible.
- **`MapContainer` has no `zoomControl` prop** → `.web.tsx:638` (defaults true, Leaflet renders its default top-left buttons). This is the same fact S6 relies on — and it exposes the S6/S7 seam (below).
- **Leaflet CSS is imported** → `.web.tsx:1` (`import 'leaflet/dist/leaflet.css'`), so `.leaflet-control-zoom` / `.leaflet-control-attribution` are styleable. Attribution string is a real legal credit (`OSM_ATTRIBUTION`, `:532-534`). S7's "restyle, never delete" framing is legally correct.
- **The always-light overlays are genuinely pinned literals** → locating banner `tint="light"` + `rgba(255,255,255,0.95)` literal with the "always-light DESIGN.md exception … over any tile" comment (`MapScreen.tsx:1984-1994`); place chips 0.95-white literal (`:2406-2414`); status pill on `variant="row" forceEngineered` opaque fill. So S7's *substance* — "these stay untouched, AA-by-construction over any tile" — is TRUE. Only the PROTECT *number* is wrong.
- **The arbiter machinery exists and already models tiles** → `design-reviews/fable-audit/tools/audit-stacks.json` declares `"tileExtremes": ["#000000","#FFFFFF"]` (line 31) and probes map-world inks against BOTH extremes (pins/cluster/heat, lines 63-69). `contrast-check.mjs` lives at the GLASS.md-documented lab path (`~/AccessMap-material-lab/2026-07-02/shared/contrast-check.mjs`, cited in audit-stacks line 4), consistent with S1/S2/S6. The tooling S7 names is real.

## Attack that landed #1 — the arbiter clause is materially under-scoped (→ FIX)

This is the sharpest issue and it is an *access* issue, not a polish nit. Switching web light-mode to a light CARTO basemap is the exact trigger for the GLASS §12 rule-4 failure mode the codebase already documents in its own words:

- **`audit-stacks.json:63`** declares `{ "text": "#FFFFFF", "surface": "tileExtremes", … "pin 2.5px white ring vs tile extremes … 1.4.11", "min": 3.0 }`. A pure `#FFFFFF` ring over the `#FFFFFF` tile arm = **1.0:1 — a guaranteed FAIL** against min 3.0.
- The audit's own honesty note (`audit-stacks.json:13`) says today this is survived ONLY because "**Web tiles are always dark (ring 21:1); the #FFF arm models iOS light tiles (NEEDS-SKY-DEVICE).**" **S7 converts that dormant `#FFF` arm into a LIVE, in-harness web reality.** The pin ring at `PlatformMap.web.tsx:122` is a literal `2.5px solid #fff`, and `light_all` is predominantly near-white — so the white ring can drop below 3.0 over the new tiles. This is the textbook "a white ring vanishes on white tiles" (GLASS §12 rule 4).
- S7 field (7) calls the arbiter re-run **"conditional"** and scopes it to "any app-owned overlay **ink**" — language that reads as the always-light *overlay* chrome, NOT the map-world *pin/cluster/heat* boundaries (1.4.11 tappable components). The single most predictable contrast casualty of the tile switch is left outside the stated verification scope.
- The fix is token-clean and already ratified in mechanism: `audit-stacks.json:13` notes "**The shipped sets prove ring/hairline unions for CLUSTERS and heat badges**" — i.e. a regime-decomposed **paired light+dark ring union** is the sanctioned way to make a boundary survive both tile regimes (GLASS §12 rule 4). So the FIX does not require inventing a token; it requires (a) making the arbiter re-run MANDATORY, (b) scoping it to the map-world inks over the new light tile family, and (c) adopting the existing paired-ring union if `#fff`-ring alone fails — never eye-tuned (PROTECT-5 / GLASS §7.1).

Without this, the "restore light-mode legibility" win could ship a pin whose ring is invisible on light tiles — trading one legibility problem for another on the safety datum. This is why the rail is false and why it is a FIX, not a cosmetic note.

## Attack that landed #2 — the PROTECT-9 citation is wrong (→ FIX)

S7 field (6): "**Preserves PROTECT-9** (the pinned-always-light *overlay* strategy…)." Verified against `partials/protect-merged.md`:
- **PROTECT-9 = "Web-as-guest-mode"** (no root sign-in wall on web) — a different crown jewel entirely.
- The always-light overlay strategy S7 actually preserves is **not a numbered PROTECT item**; it maps to GLASS §12 (rule 8, always-light literals) + the load-bearing "GLASS.md arbitrated floors" invariant, and to the L8 nomination "Deep Field's discipline on the live map."
- Under the *correct* reading, S7 also does not regress the real PROTECT-9 (it adds no sign-in wall), so this is a mislabel, not a hidden regression. But rail 7 requires each "preserves PROTECT-N" claim to be verifiable, and this one is not. Correct the reference (cite GLASS §12 always-light discipline for the overlays; separately note real PROTECT-9 web-as-guest-mode is untouched).

## Attack that landed #3 (seam, non-fatal) — the S6/S7 zoom-control split contradicts

S6's verdict (verified) has S6 setting `zoomControl={false}` (removing `.leaflet-control-zoom`) and building app-native 44pt buttons. S7 item (2) says "**style `.leaflet-control-zoom`** … and reposition it." You cannot both remove the Leaflet control and restyle it. Both entries acknowledge coordination ("one overlay pass"), but the fix-shapes collide. Resolution is clean and must be stated: **S6's native buttons supersede the Leaflet control; S7 keeps the tile-theme + attribution restyle and DROPS the now-redundant `.leaflet-control-zoom` restyle** (the occlusion is resolved by S6 removing the control, not by S7 restyling it). This is a scope-seam correction, not a KILL.

## Rails that survived attack

- **tracesToFinding:** L8-5/L2-3 are real HIGH findings, code-verified at HEAD (`PlatformMap.web.tsx:531`); the dark-void (L1-6) and attribution (L5-16) slices are genuine facets. The tile-theme + attribution restyle are squarely S7's lane (the zoom *mechanism* correctly forks to S6).
- **wcagFloorHeld / accessNotTradedForPolish:** the change is access-POSITIVE — a near-black map in light mode is a legibility catastrophe for R3, and theming the tiles fixes it. No floor is lowered; the one risk (pin ring over light tiles) is caught by FIX #2, not silently traded.
- **glassLawHeld:** tiles + Leaflet CSS are outside the glass primitive — no BlurView touched (intensities stay 12/24), box-none left to S6, `GlassSurface.tsx` untouched, virtualization/`forceEngineered` untouched. No eye-tuned floor is *proposed* (it names the arbiter; the defect is scope, captured under `arbiterReRunPresent`).
- **rnExpoFeasible:** scheme→URL branch is additive (prop to `CachedTileLayerWrapper`), `useColor()` is in-scope (`:566`), `light_all` is a real CARTO basemap, Leaflet CSS is styleable, no `announceForAccessibility`/web-announce dependency. No RN-web no-op trap.

---

## fixConditions

1. **Make the arbiter re-run MANDATORY and scope it to the map-world inks over the NEW light tile family.** Change field (7) from "conditional / overlay ink" to: run `contrast-check.mjs` against `tools/audit-stacks.json` with the light CARTO tile family added as a base regime, covering (a) the 2.5px pin ring, (b) each severity pin fill + the `#9CA3AF` anon fill, (c) cluster + heat-badge boundaries — all 1.4.11 min 3.0 vs the light-tile luminance window (GLASS §12 rules 3-4) → exit 0. The white pin ring (`PlatformMap.web.tsx:122`) FAILS on near-white tiles by construction (audit-stacks:63 = 1.0:1), so this is required, not optional.
2. **If the white ring fails on light tiles, adopt the already-ratified paired light+dark ring UNION** (the cluster/heat-badge union mechanism named at audit-stacks:13; GLASS §12 rule 4) — never eye-tune the ring, invent no new token (PROTECT-5 / GLASS §7.1).
3. **Correct the PROTECT citation.** Field (6): the preserved crown jewel is the GLASS §12 always-light-overlay discipline (legend/locating-banner/place-chip literals), NOT PROTECT-9. State that real PROTECT-9 (web-as-guest-mode) is also untouched. Verify the overlays' own translucent-fill bases (legend 0.82, pill glass) still pass over the light tiles they now show through (re-run their existing audit-stacks rows under the light-tile base — they are declared but currently only probed against `#000/#FFF` extremes, which already covers `#FFF`, so this is a confirm-not-change).
4. **Reconcile the S6/S7 zoom-control seam.** S6's `zoomControl={false}` + native 44pt buttons supersede the Leaflet control; S7 keeps ONLY the tile-theme + attribution restyle and drops the redundant `.leaflet-control-zoom` restyle. State this explicitly so the "one overlay pass" doesn't double-own the zoom control.

With conditions 1-4 folded in, S7 is clean, access-positive, and ★SIGNATURE-worthy — it is the correct first-contact flagship fix, and its access risk becomes a proven guarantee rather than an eye-shipped hope.
