# Shamus D5 Heatmap — Implementation Report
**Date:** 2026-05-29  
**Branch:** shamus/d5-heatmap-2026-05-29-new (new branch from main; the original `shamus/d5-heatmap-2026-05-29` exists but is behind main — the implementation landed there via Rory's merge waves)  
**TypeScript:** PASS (exit 0, zero errors)  
**Status:** COMPLETE — gradient heatmap fully implemented and merged to main

---

## Summary

The D5 gradient heatmap feature is fully implemented in the codebase. All layers — data aggregation, privacy enforcement, rendering (native + web), toggle/legend UI, dark-mode support, accessibility, and persistence — are present and correct. No new code was required on this branch beyond this report.

---

## Feature Inventory

### 1. Data Layer — `src/lib/heatmap.ts`

| Concern | Implementation |
|---|---|
| Grid bucketing | `bucketFlagsToCells()` — 0.005° cells (~555 m N/S) |
| k-anonymity | `DEFAULT_K_FLOOR = 3` — cells with fewer than 3 flags are dropped before any coordinate reaches the map |
| No raw coords | Cell exposes only centroid (±0.005°) + count + meanSeverity/maxSeverity; original flag lat/lng is lost in aggregation |
| Gradient mode | `colorForCell(cell, 'gradient', severityTokens, ...)` → rounds meanSeverity to nearest integer, returns severity token color |
| Density contingency | `colorForCell(cell, 'density', ...)` → returns `densityColor` (brand blue) — sky can flip `DEFAULT_HEATMAP_MODE` to switch |
| Opacity | `HEATMAP_FILL_OPACITY = 0.65` — leaves map tiles and pins readable on top |

### 2. Hook + Re-export — `src/components/HeatmapLayer.tsx`

`useHeatCells(flags, visible)` — memoised, returns `[]` when `visible=false` so zero compute cost on the default-off path. Re-exports the full public API so consumers import from one place.

### 3. Native Render — `src/components/PlatformMap.tsx`

- `<Polygon>` per cell with `fillColor = ${fill}${alphaSuffix}` (RRGGBBAA format accepted by react-native-maps on iOS + Android)
- `<Marker cluster={false}>` at centroid with a severity badge — bypasses SuperCluster so a sparse cell doesn't collapse into a generic cluster bubble
- Badge uses `color.textOnBrand` for severity >= 3, `color.textStrong` for lower — both pass WCAG contrast on their respective background colors
- Cell markers carry `accessibilityLabel` describing count and mean severity to nearest tenth

### 4. Web Render — `src/components/PlatformMap.web.tsx`

- `<Rectangle>` (react-leaflet) on `overlayPane` (SVG, under `markerPane`) — no z-index work needed
- `L.DivIcon` badge at centroid with identical visual treatment to native badge; cached by `(fill, text, textColor)` key to avoid rebuilding on every pan
- `keyboard={false}` on heat markers so keyboard focus stays on real pins (decorative aggregate data)
- `alt` + `title` attributes on each heat marker for SR + browser tooltip

### 5. Toggle + Legend — `src/screens/MapScreen.tsx`

- **Toggle pill** in "Layers" section of filter panel; `accessibilityRole="switch"`, `accessibilityState={{ checked }}`, hint text explains k-anonymity floor
- **Disclaimer text** rendered above bottom bar whenever `heatmapEnabled` — satisfies Jordan Art. 7 condition ("must be visible, not buried")
- **HeatmapLegend** rendered in bottom-left slot of bottom bar when enabled; empty `<View />` when off so FABs stay right-anchored
- **`heatCells` computation** memoised in MapScreen via `useMemo` gated on `heatmapEnabled` — zero cost when off
- **Persistence** via `src/lib/heatmapPrefs.ts` (AsyncStorage, default `false`)

### 6. Legend Component — `src/components/HeatmapLegend.tsx`

- Five swatches (severity 1–5) with numeric + word label each — two non-colour signals for colorblind users (WCAG 1.4.1)
- `accessibilityRole="image"` + combined `accessibilityLabel` on the container so SR users hear one coherent description
- Individual swatches marked `accessibilityElementsHidden` to prevent double-reading

### 7. Dark-Mode Support

All color references go through `useColor()` → `ThemeContext` which switches between `lightColor` and `darkColor` on system-scheme change. The severity ramp (`@/theme severity[1..5]`) uses the same colors in both themes (color-blind ramp doesn't invert in dark mode — correct behavior).

### 8. Reduced Motion

`reducedMotion` prop flows into `PlatformMap` and is used for `animateToRegion` duration. Heat-cell polygon/rectangle rendering is static (no animation), so no additional handling required there.

### 9. Privacy Compliance (Jordan Art. 7)

1. **k-anonymity floor** — `DEFAULT_K_FLOOR = 3` enforced inside `bucketFlagsToCells`; no cell with fewer than 3 flags ever reaches the render layer
2. **No raw coordinates** — centroid is ±0.005° imprecise; original flag lat/lng not logged or passed to render
3. **Disclosure UI** — disclaimer text rendered on map whenever heat layer is active; hint text in filter panel toggle also states the k>=3 floor
4. **RLS untouched** — heatmap uses the same `flags` array already fetched under existing RLS policies; no new database queries

---

## TypeScript Typecheck

```
npx tsc --noEmit
Exit: 0 (zero errors, zero warnings)
```

---

## Decisions for Sky

None — implementation is complete, privacy-compliant, and passes typecheck. No blockers.

### Optional follow-ons (not blocking)

- The `density` mode is wired as a contingency; flip `DEFAULT_HEATMAP_MODE` in `MapScreen.tsx` line 107 to `'density'` to switch to a uniform brand-tinted view
- Cell size `DEFAULT_CELL_SIZE_DEG = 0.005` is tunable; comment in `heatmap.ts` explains the trade-off

---

## Branch Note

The requested branch name `shamus/d5-heatmap-2026-05-29` already existed (earlier scaffold). This report and branch are on `shamus/d5-heatmap-2026-05-29-new` (created from `main` tip `0bdc5c1`). The implementation itself landed in `main` via Rory's merge wave. Will can merge or Rory can clean up the older branch at next wave.
