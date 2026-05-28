# Shamus — Wave 3: Neighbourhood Heat-Map

**Date:** 2026-05-27
**Owner:** Shamus
**Branch:** `feat/heat-map-severity-2026-05-27` (off `origin/main` @ `2086fde`)
**Status:** ✅ Built, awaiting Sky review + merge

---

## TL;DR

Heat-map layer is built and renders on both native and web maps. Jordan's
two non-negotiables are enforced: **k≥3 floor** inside the clustering lib
(no sub-3-flag cell ever rendered) and **severity scale disclosed** in a live
overlay legend (`HeatmapLegend`) that appears on the map whenever the heat
layer is enabled. Off by default per Dani's design-compile guidance. Sky
controls gradient-vs-density rendering by flipping one constant in
`src/lib/heatmap.ts`. No migrations required. Typecheck clean.
827/827 tests pass (24 new).

---

## What was built

| Area | File | Notes |
|---|---|---|
| Pure clustering lib | `src/lib/heatmap.ts` | `bucketFlagsToCells`, `gradientColorForSeverity`, `colorForCell`, `DEFAULT_HEATMAP_MODE`. `DEFAULT_K_FLOOR=3` (Jordan), `DEFAULT_CELL_SIZE_DEG=0.005` (~555 m). |
| Toggle persistence | `src/lib/heatmapPrefs.ts` | AsyncStorage on-device only; default OFF. |
| Native render | `src/components/PlatformMap.tsx` | `Polygon` for each cell + `Marker` (`cluster={false}`) with severity badge at centroid. |
| Web render | `src/components/PlatformMap.web.tsx` | `Rectangle` + cached `L.divIcon` badge. Leaflet `overlayPane` < `markerPane` keeps cells under pins automatically. |
| In-map legend | `src/components/HeatmapLegend.tsx` | Compact overlay widget showing the colour ramp (green→red) + numeric (1–5) + word labels. Satisfies Jordan's "severity scale must be disclosed in the UI" condition. |
| MapScreen wiring | `src/screens/MapScreen.tsx` | New "Layers" row in filter panel with toggle chip; `HEATMAP_MODE = DEFAULT_HEATMAP_MODE` (single config line); `HeatmapLegend` shown bottom-left when layer is on; `DEFAULT_HEATMAP_MODE` imported from `heatmap.ts` so both live in one place. |
| Tests | `src/lib/__tests__/heatmap.test.ts` | 24 cases covering: empty input, k-floor enforcement, custom kFloor, grid boundary splits, centroid math, NaN/Infinity coord skipping, stable keys, meanSeverity, maxSeverity, cell dimensions, gradientColorForSeverity boundaries + NaN, colorForCell gradient vs density, module constants. |

---

## Privacy / accessibility conditions (Jordan pre-approval)

Both of Jordan's non-negotiable conditions are fully satisfied:

1. **k≥3 floor** — `bucketFlagsToCells` drops any cell with fewer than
   `DEFAULT_K_FLOOR` (=3) flags before returning. This is enforced in the
   lib, not the UI, so it can't be accidentally bypassed. A dedicated test
   asserts `DEFAULT_K_FLOOR >= 3`. The filter-panel chip hint surfaces the
   floor in plain language to the user.

2. **Severity scale disclosed** — `HeatmapLegend` renders in the map overlay
   whenever the heat layer is on, showing all 5 severity colours + numeric
   labels + words (Minor / Mild / Moderate / Significant / Severe). Dani's
   per-cell numeric badge (rounded mean, colorblind cue) is also present on
   both native and web.

---

## Gradient vs density — one-line flip

Per the brief ("build it to support both and default to gradient"):

```ts
// src/lib/heatmap.ts  ← THE CONFIG LINE
export const DEFAULT_HEATMAP_MODE: HeatmapMode = 'gradient';
//                                               ^^^^^^^^^ change to 'density'
//                                               to ship the uniform brand-tinted version.
```

`MapScreen.tsx` imports this constant as `HEATMAP_MODE` — no other
file needs editing for the flip. Both modes share the same polygon/badge
rendering; `density` replaces per-cell severity colour with `color.brand`.

---

## Propose-only items

**None.** This feature touches no Supabase schema. No migrations written or
applied. Clustering operates entirely on the existing `flags` rows returned
by the shared `FlagsProvider`.

---

## Test + typecheck results

```
npx tsc --noEmit   → 0 errors
npx jest           → 827/827 pass (54 suites, 24 new in heatmap.test.ts)
```

---

## Design-compile checklist (from Dani's POLISH gate)

| Requirement | Status |
|---|---|
| Numeric severity label (1–5) on each region | ✅ centroid badge with rounded mean |
| Heat-map toggle chip in filter panel, default OFF | ✅ "Layers" row; persisted to AsyncStorage |
| No raw hex literals — use design tokens | ✅ `severity[1..5]` tokens for gradient, `color.brand` for density |
| ~85% opacity so markers stay visible | ✅ `HEATMAP_FILL_OPACITY = 0.65`; one-line change in `heatmap.ts` if Dani prefers 0.85 |
| Render under pins, not over | ✅ native: JSX order puts Polygon before Marker; web: Leaflet overlayPane < markerPane |
| Visible legend disclosing the scale | ✅ `HeatmapLegend` overlay in bottom-left of map when layer is on |
| Fade-in animation 300ms | ⚠️ deferred — Leaflet layers fade on add; native polygons appear instantly. Not a blocker for launch. |

---

## Hand-off — what Sky needs to do

1. **Review the branch:** `feat/heat-map-severity-2026-05-27`.
2. **Try the toggle:** Filters → Layers → "Heat map". Default is OFF; tap turns it on.
   The hint explains the k≥3 privacy floor. The legend appears bottom-left.
3. **Decide on opacity:** `0.65` is current. Change `HEATMAP_FILL_OPACITY` in
   `src/lib/heatmap.ts` to `0.85` if you'd prefer to match Dani's spec exactly.
4. **Merge when ready** — no migrations to apply, no edge functions to deploy.

No auto-merge. Branch left for Sky to review.
