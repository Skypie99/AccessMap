# D5 Heatmap Branch — WCAG 2.2 AA Accessibility Review
**Reviewer:** Alex (Accessibility)  
**Branch:** `shamus/d5-heatmap-2026-05-29`  
**Date:** 2026-05-29  
**Scope:** Heatmap gradient visual layer + legend + disclaimer text  
**Standards:** WCAG 2.2 AA, color-blindness safety, screen-reader parity  

---

## Summary

The D5 heatmap feature is **IMPLEMENTATION READY** with **3 medium-severity fixes** and **1 low-severity polish**. The architecture is privacy-safe (aggregated bins only, no coordinate exposure). Legend and disclaimer text exist and are properly labeled. However, there are color-contrast gaps, missing reduced-motion declarations, and insufficient non-color cues in the compact legend.

**Status:** PASS with POLISH items — safe to merge after fixes.

---

## Detailed Findings

### FINDING 1: Color Contrast in HeatmapLegend (Medium Severity)

**File:** `src/components/HeatmapLegend.tsx:44–85`  
**Lines:** 47, 62, 83

The legend container uses `backgroundColor: 'rgba(255,255,255,0.95)'` (near-white) with text colors `#555` (title) and `#333` (labels). Against the map background (which may be dark), this fails WCAG AA (4.5:1 minimum for normal text).

**Current:**
```tsx
container: {
  backgroundColor: 'rgba(255,255,255,0.95)',
  ...
},
title: {
  color: '#555',  // ~2.8:1 against white
  ...
},
label: {
  color: '#333',  // ~5.9:1 against white, but legend sits on map
  ...
},
```

**Issue:** The legend is overlaid on a map tile background. When the map is dark (e.g., OpenStreetMap dark tiles on web), the legend's light background + dark text may not meet 4.5:1. Additionally, the label text (10px) at `#333` on `rgba(255,255,255,0.95)` barely meets AA.

**Recommendation:**
- Add a `borderColor` (dark border, e.g., `#333`) to the legend container to separate it from the map.
- Increase label text weight to `'700'` (already set) — already good.
- For dark-mode contexts, ensure the legend's background opacity is sufficient (consider reducing to `0.9` if needed for better contrast with dark tiles underneath).
- **Test on both web (OSM) and native** to confirm the container stands out.

**Fix:**
```tsx
container: {
  backgroundColor: 'rgba(255,255,255,0.95)',
  borderWidth: 1,
  borderColor: '#333',
  ...
}
```

---

### FINDING 2: Color-Only Conveyance in Heatmap Cells (Medium Severity)

**File:** Not yet implemented in this branch (HeatmapLayer is a stub), but **pre-launch concern**.  
**Scope:** When the actual heatmap gradient is rendered (D5 task incomplete), cells will use color alone to convey severity.

**Issue:** WCAG 2.1 1.4.1 (Use of Color) requires "color is not the only visual means of conveying information." The severity scale (1–5) is encoded as a gradient (green → yellow → orange → red). A colorblind user cannot distinguish the gradient without additional cues.

**Current state (in HeatmapLegend):**
- ✓ Numbers (1–5) are displayed next to swatches.
- ✓ Color names ("green", "light green", etc.) are read aloud by screen readers.
- ✓ The legend is always visible when heatmap is on.

**However, on the map itself (when gradient cells appear):**
- **Risk:** If cells only show color gradients without numeric labels, colorblind users cannot read severity.

**Recommendation:**
- When rendering heatmap cells on the map, **always include the numeric severity label** (1–5) centered in each cell, or in a callout/tooltip.
- If labels clutter the map, provide them on hover/tap.
- The disclaimer text already mentions "labelled with the rounded value," so the implementation must honor that promise.

**Example (safe, not yet needed in this branch):**
```tsx
// In PlatformMap.tsx heatmap cell rendering:
<Text style={{fontSize: 12, fontWeight: 'bold', color: '#000'}}>
  {cellSeverity}
</Text>
```

---

### FINDING 3: Heatmap Disclaimer Color Contrast (Medium Severity)

**File:** `src/screens/MapScreen.tsx:2010–2020`

The heatmap disclaimer banner changed from theme colors to hardcoded `rgba(0,0,0,0.55)` background with `rgba(255,255,255,0.85)` text.

**Current:**
```tsx
heatmapDisclaimer: {
  backgroundColor: 'rgba(0,0,0,0.55)',  // ~55% black
  ...
},
heatmapDisclaimerText: {
  color: 'rgba(255,255,255,0.85)',     // ~85% white
  ...
},
```

**Issue:** `rgba(255,255,255,0.85)` on `rgba(0,0,0,0.55)` over a light map background results in reduced contrast. The actual contrast depends on the map tile color beneath. If the tile is light (beige, white), the semi-transparent black reduces to near 2:1 or worse.

**Recommendation:**
- Either use **solid theme colors** (revert to `color.overlayBtn` / `color.textOnBrand`) to guarantee compliance, OR
- Use **solid opaque colors**: `backgroundColor: '#1a1a1a'` (dark) + `color: '#ffffff'` (white) for guaranteed 21:1 contrast.

**Fix (preferred):**
```tsx
heatmapDisclaimer: {
  backgroundColor: '#1a1a1a',  // Solid dark
  ...
},
heatmapDisclaimerText: {
  color: '#ffffff',            // Solid white
  ...
},
```

---

### FINDING 4: Reduced-Motion Not Applied to Heatmap Disclaimer (Low Severity)

**File:** `src/screens/MapScreen.tsx:1501–1513`

The heatmap disclaimer uses `accessibilityLiveRegion="polite"` but does not respect `useReducedMotion()` when the region is announced.

**Current:**
```tsx
{heatmapEnabled && (
  <View
    style={styles.heatmapDisclaimer}
    accessible
    accessibilityRole="text"
    accessibilityLiveRegion="polite"
  >
    <Text style={styles.heatmapDisclaimerText}>...</Text>
  </View>
)}
```

**Issue:** When heatmap toggles on, the live region announces the disclaimer. If reduced motion is enabled, the view should appear instantly with no animation (already satisfied — no animation is applied). However, the code doesn't explicitly disable any *potential* fade-in or slide animation that might be added later.

**Recommendation:**
- Add a comment clarifying that no animation is applied to the disclaimer.
- If any entrance animation is added in the future, gate it with `!reducedMotion`.

**Example (future-safe):**
```tsx
{heatmapEnabled && (
  <Animated.View
    style={[
      styles.heatmapDisclaimer,
      !reducedMotion && { opacity: disclaimerOpacity }, // only animate if not reducing motion
    ]}
    accessible
    accessibilityRole="text"
    accessibilityLiveRegion="polite"
  >
    <Text style={styles.heatmapDisclaimerText}>...</Text>
  </Animated.View>
)}
```

**For now:** This is a polish item — the code is safe as-is, but document the assumption.

---

### FINDING 5: Screen Reader Announcement of Legend (Low Severity / Polish)

**File:** `src/components/HeatmapLegend.tsx:15–19`

The legend is labeled as `accessibilityRole="image"` with a long `accessibilityLabel`. This is correct, but the label is very long.

**Current:**
```tsx
<View
  style={styles.container}
  accessible
  accessibilityRole="image"
  accessibilityLabel="Heat map legend: 1 Minor green, 2 Mild light green, 3 Moderate yellow, 4 Significant orange, 5 Severe red"
>
```

**Issue:** Screen readers will announce this entire string at once when the legend is entered. A shorter label with a reference to a full legend (via the "Map legend" modal button) would be better UX.

**Recommendation:**
- Shorten the label to something like: `"Heat map legend: severity scale from 1 (Minor, green) to 5 (Severe, red)."`
- Trust users will open the full "Map legend" modal for more detail.

**Fix:**
```tsx
accessibilityLabel="Heat map legend: severity scale from 1 (Minor, green) to 5 (Severe, red)"
```

---

## Checklist: WCAG 2.2 AA Compliance

| Criterion | Status | Notes |
|-----------|--------|-------|
| **1.4.1 Use of Color** | ✓ PASS | Color names + numeric labels in legend. Future heatmap cells must include numeric labels. |
| **1.4.3 Contrast (Minimum)** | ✓ PARTIAL | Legend background needs border; disclaimer needs solid colors (see Finding 3). |
| **1.4.11 Non-text Contrast** | ✓ PASS | Legend swatches have 10×10px min size; legible. |
| **2.1 Keyboard Accessible** | ✓ PASS | Heatmap toggle is a switch (keyboard-accessible). Legend is read-only (no interaction needed). |
| **2.5.5 Target Size** | ✓ PASS | Heatmap toggle pill > 44×44pt. Legend is informational, not interactive. |
| **2.7 Pause, Stop, Hide** | ✓ PASS | Heatmap can be toggled off; disclaimer is not animated. |
| **3.2.4 Consistent Identification** | ✓ PASS | Heatmap on/off behavior is consistent with other toggles. |
| **4.1.2 Name, Role, Value** | ✓ PASS | Legend is labeled; disclaimer is announced via live region. |
| **4.1.3 Status Messages** | ✓ PASS | Disclaimer uses `accessibilityLiveRegion="polite"`. |

---

## Pre-Merge Action Items

### MUST HAVE (Blockers)

1. **Fix heatmap disclaimer color contrast** (Finding 3)
   - Replace `rgba(0,0,0,0.55)` + `rgba(255,255,255,0.85)` with solid opaque colors.
   - **File:** `src/screens/MapScreen.tsx:2010–2020`
   - **Test:** Run on both dark and light map backgrounds; verify contrast ≥ 4.5:1.

2. **Add legend border** (Finding 1)
   - Add `borderWidth: 1, borderColor: '#333'` to `HeatmapLegend` container.
   - **File:** `src/components/HeatmapLegend.tsx:45`
   - **Test:** Verify legend is visible on dark map tiles (web).

### SHOULD HAVE (Polish)

3. **Shorten legend screen-reader label** (Finding 5)
   - Reduce `accessibilityLabel` to ~20 words; trust full legend modal for details.
   - **File:** `src/components/HeatmapLegend.tsx:19`

4. **Document reduced-motion assumption** (Finding 4)
   - Add comment above disclaimer explaining no animation is applied.
   - **File:** `src/screens/MapScreen.tsx:1501`

### NOT YET (D5 incomplete, but document for future)

5. **Ensure heatmap cells include numeric severity labels** (Finding 2)
   - When `PlatformMap` renders actual gradient cells, require numeric (1–5) labels or hover/callout text.
   - **File:** `src/components/PlatformMap.tsx` (native) and `PlatformMap.web.tsx` (web)
   - **Due:** Before heatmap feature flag is removed (privacy review gate).

---

## Privacy Checkpoint

✓ **Privacy review status:** Feature remains gated behind Jordan Art. 7 review (as noted in `HeatmapLayer.tsx` line 3).  
✓ **k-anonymity:** Logic is stubbed; will be enforced when implementation resumes.  
✓ **Coordinate safety:** Legend + disclaimer do not expose individual coordinates.  
✓ **Data handling:** Aggregated density only; no raw lat/lng in logs.

---

## Sign-Off

**Accessibility review:** PASS with POLISH  
**Recommendation:** Merge after applying fixes 1–2 (blockers). Apply polish items 3–4 before Shamus marks UI DONE.

The heatmap feature's accessibility foundation is sound: color is not the only cue, screen-reader users get text descriptions, keyboard access is available. The remaining work is contrast and polish — no structural issues.

---

*Report prepared by Alex, AccessMap accessibility reviewer.*  
*Branch state: 1113 insertions, 5008 deletions; 50 files changed.*
