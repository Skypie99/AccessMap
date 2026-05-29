# A11y Audit — Heatmap Feature (WCAG 2.2 AA)
**Role:** Alex (Accessibility Engineer)
**Date:** 2026-05-28
**Branch:** `feat/heat-map-severity-2026-05-27`
**Scope:** `HeatmapLegend.tsx`, `MapScreen.tsx` (toggle chip + statusHint), `PlatformMap.tsx`, `PlatformMap.web.tsx`
**Constitutional basis:** WCAG 2.2 AA is a floor. AccessMap headline mandate: colour-not-sole-means (1.4.1) is the central use-case.

---

## Verdict: ✅ PASS — CLEAR FOR MERGE

All WCAG 2.2 AA criteria pass. Two polish notes below (neither is a blocker).

---

## Criteria Checked

### 1.4.1 Use of Color — THE HEADLINE MANDATE

**Concern:** The heatmap visualisation uses a green→yellow→red colour ramp to convey severity. If colour is the only signal, this violates the core accessibility promise of the app.

**Finding:** ✅ PASS

Three complementary non-colour signals are present:

| Layer | Non-colour signal |
|---|---|
| Each heat cell (native) | Numeric severity badge (e.g., `3`) rendered as a `<View>` at the cell centroid, with `accessibilityLabel="Heat zone: 4 flags, mean severity 2.9 out of 5."` |
| Each heat cell (web) | `icon` contains the numeric label; `alt="Heat zone: 4 flags, mean severity 2.9 out of 5."` |
| HeatmapLegend | Five items, each showing: colour swatch + numeric label + word (e.g., "1 Minor", "2 Mild", ...) |
| Toggle hint | `accessibilityHint` explains "Colour shows mean severity (1–5)" + k-floor |

The legend (always co-visible with the layer) and the per-cell numeric badge together satisfy G111 and G14. A user who cannot perceive colour receives severity as a number.

---

### 1.4.3 Contrast (Minimum)

| Element | Foreground | Background | Ratio | Result |
|---|---|---|---|---|
| Legend title "Heat map" | `#555` | `rgba(255,255,255,0.95)` | 7.46:1 | ✅ AA (>4.5) |
| Legend labels "1 Minor" etc. | `#333` | `rgba(255,255,255,0.95)` | 12.6:1 | ✅ AA |
| Filter sub-label "Layers" | `#666` | white panel | 5.74:1 | ✅ AA |
| Toggle chip text (inactive) | `#333` | `color.surfaceNeutral` (≈#f0f0f0) | ~9:1 | ✅ AA |
| Toggle chip text (active) | `color.textOnBrand` | `color.brand` | theme-defined, previously audited | ✅ |
| Status hint below toggle | `#a04040` | white panel | 6.33:1 | ✅ AA |

All text elements pass the 4.5:1 minimum for normal text.

---

### 4.1.2 Name, Role, Value

**Toggle chip:**
- `accessibilityRole="switch"` ✅
- `accessibilityLabel="Show neighbourhood heat map"` ✅
- `accessibilityState={{ checked: heatmapEnabled }}` — changes on toggle ✅
- `accessibilityHint` explains function and k-floor ✅

**HeatmapLegend:**
- Parent: `accessibilityRole="image"` ✅ (correct for a chart/legend)
- Parent: `accessibilityLabel` provides full verbal description of the entire scale ✅
- Children: `accessibilityElementsHidden` (iOS) + `importantForAccessibility="no-hide-descendants"` (Android) — single accessible element, no double-announcement ✅

**Heat cell markers (native):**
- `accessibilityRole="text"` ✅
- `accessibilityLabel` describes count + mean severity verbally ✅

**Heat cell markers (web):**
- `alt` prop = full verbal description ✅
- `keyboard={false}` — intentionally excluded from tab order (see polish P1)
- `interactive: false` on Rectangle — correct, non-interactive SVG overlay ✅

---

### 2.3.3 Animation from Interactions

- Native: fade-in duration = `reducedMotion ? 0 : 600ms` ✅
- Web: `flyTo` duration = `reducedMotion ? 0 : 0.6` ✅

`reducedMotion` is sourced from `useReducedMotion()` in MapScreen and passed to PlatformMap as a prop — correctly wired on both platforms.

---

### 2.5.8 Target Size (Minimum)

- Toggle chip: `paddingVertical: 6` + `fontSize: 12` ≈ **24px height** — meets WCAG 2.5.8 minimum ✅
- Heat cell badges: not interactive (`tappable={false}` / `keyboard={false}`) — target size N/A ✅
- HeatmapLegend: not interactive — target size N/A ✅

---

## Polish Notes (non-blocking)

### P1 — Web heat marker keyboard accessibility
**SC:** 1.4.1 / 1.3.1
Web heat markers have `keyboard={false}`, removing them from the tab order. Screen reader users who navigate by keyboard cannot focus individual cells. This is mitigated by the always-visible legend. The design tradeoff is intentional (adding 10–50 tab stops would disrupt map navigation).

**Recommendation for v2:** A single accessible element summarising heat zone distribution (e.g., "7 heat zones visible: 2 severe, 3 moderate, 2 mild") would let keyboard screen reader users get an overview without requiring per-cell focus. Outside the scope of this merge.

### P2 — Filter pill touch targets (pre-existing, not heatmap-specific)
All filter chips share `paddingVertical: 6` + `fontSize: 12` ≈ 24px height. This meets WCAG 2.5.8 (24px minimum) but is below Apple HIG / Google Material's 44pt recommendation. The heatmap toggle inherits this style. Flag for a future filter-panel a11y pass, not a heatmap blocker.

---

## Sign-Off

**CLEAR FOR MERGE.** `feat/heat-map-severity-2026-05-27` passes WCAG 2.2 AA. No code changes required. Jordan's conditions (k≥3, severity disclosure) are met in full. The headline mandate (colour-not-sole-means 1.4.1) is satisfied via the per-cell numeric badge + HeatmapLegend combination.
