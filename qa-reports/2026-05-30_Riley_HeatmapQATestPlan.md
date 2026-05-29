# QA Test Plan: D5 Gradient Heatmap Feature

**Date:** 2026-05-30  
**Feature:** Gradient heatmap visualization (D5 decision: gradient YES, map A)  
**Scope:** HeatmapLayer, HeatmapLegend, heatmap.ts library + integration tests  
**Privacy Gate:** Jordan Art. 7 k-anonymity floor (k ≥ 3) + no individual flag coordinates exposed  
**Status:** Pre-merge QA readiness plan (ready for Shamus build completion)

---

## Executive Summary

The gradient heatmap aggregates flags into a k-anonymity-protected grid (0.005° cells ≈ 555 m), rendering only cells with 3+ flags. This test plan covers:

- **Happy path** (toggle, colors, legend, realtime updates)
- **Privacy gates** (k-floor enforcement, coordinate hiding, colorblind safety)
- **Edge cases** (zero flags, boundary k=3, high density, multi-category)
- **Accessibility** (screen reader, 44pt touch, accessible legend)
- **Performance** (500+ flags, instant toggle, no re-render jank)
- **Regression** (regular markers, clustering, search, reporting unaffected)
- **Device checklist** (iOS, Android, web quick 10-step validation)

**Pass Criteria:** All happy path + privacy tests pass on iOS + Android + web. No regressions in existing features. Performance targets met (toggle <500ms, map responsive at 500 flags).

---

## Happy Path Tests (Native + Web)

### 1. Toggle Heatmap On

**Precondition:** MapScreen with 5+ flags visible in the same cell  
**Steps:**
1. Open AccessMap, navigate to MapScreen
2. Locate a region with 3+ flags (cluster visible in Tasks)
3. Find heatmap toggle control (top right of map)
4. Tap toggle to enable heatmap
5. Observe: regular markers disappear, replaced by colored heat cells
6. Observe: Legend appears below toggle button
7. Repeat: toggle off → regular markers return

**Expected:** Heatmap renders as solid-color cell with mean severity color (not discrete points). Legend shows all 5 severity levels with color + label + numeric value.

**Device Variants:** Test on iOS 16+, Android 12+, web (Chrome, Safari)

**Test IDs:** `heatmap-happy-001-toggle-on-ios`, `heatmap-happy-001-toggle-on-android`, `heatmap-happy-001-toggle-on-web`

---

### 2. Gradient Colors Appear Over Appropriate Areas

**Precondition:** Heatmap ON, multiple cells with varying flag densities visible  
**Steps:**
1. Zoom out to see 3+ heat cells on screen
2. Observe color progression: green (low severity) → yellow → orange → red (high severity)
3. Hover map to see cell boundaries align with grid (0.005° cells)
4. Observe: each cell shows a single solid color based on its mean severity

**Expected:** Colors are deterministic per severity:
- 1.0–1.5: green (Minor)
- 1.5–2.5: light green (Mild)
- 2.5–3.5: yellow (Moderate)
- 3.5–4.5: orange (Significant)
- 4.5–5.0: red (Severe)

**Edge:** If a cell has flags [severity 1, 2, 3], mean = 2.0 → light green (not green).

**Test IDs:** `heatmap-happy-002-gradient-colors-native`, `heatmap-happy-002-gradient-colors-web`

---

### 3. Toggle Off Restores Regular Markers

**Precondition:** Heatmap ON, markers hidden  
**Steps:**
1. Tap heatmap toggle to disable
2. Observe: heat cells disappear immediately
3. Observe: individual flag markers re-appear
4. Verify: marker colors/icons match flag category (same as before heatmap was on)

**Expected:** All markers visible. Clustering (if enabled) works as before. No markers "stuck" or duplicated.

**Test IDs:** `heatmap-happy-003-toggle-off-markers-return`

---

### 4. Legend Visible When Heatmap Active

**Precondition:** Heatmap ON  
**Steps:**
1. Observe legend in map UI (typically bottom-left corner on native, within map bounds on web)
2. Read legend text: should show "Heat map" title + 5 rows (one per severity)
3. Tap legend container: should be readable (not blocked by other controls)
4. Toggle heatmap OFF → legend disappears
5. Toggle heatmap ON → legend re-appears

**Expected:** Legend always visible and unblocked when heatmap is ON. Legend immediately hidden when OFF.

**Legend Content:** 
- Title: "Heat map" (uppercase)
- Rows: "1 Minor" (green), "2 Mild" (light green), "3 Moderate" (yellow), "4 Significant" (orange), "5 Severe" (red)
- Each row has colored swatch + numeric value + label text

**Test IDs:** `heatmap-happy-004-legend-visible-and-readable`

---

### 5. Heatmap Updates When New Flags Are Added (Realtime)

**Precondition:** 
- Heatmap ON
- One cell visible with exactly 4 flags
- Second user or same user in another tab adds a flag in that cell

**Steps:**
1. Observe cell color (e.g., orange for mean severity ~4.0)
2. In another browser tab / device, create a new flag in the same cell
3. Return to heatmap screen, do NOT manually refresh
4. Wait 1–3 seconds for realtime subscription to fire
5. Observe: cell either changes color (if new flag severity differs) or updates count
6. Optional: tap on cell to see count increases

**Expected:** Heatmap recomputes and re-renders within 3 seconds of new flag insert. No manual refresh needed.

**Note:** Requires `2026-05-24_realtime_flags.sql` migration applied. If migration not yet live, test as "awaiting migration" (mark as SKIP for pre-migration runs).

**Test IDs:** `heatmap-happy-005-realtime-add-flag`, `heatmap-happy-005-realtime-SKIP-if-migration-not-applied`

---

### 6. Works on iOS (Native)

**Precondition:** iOS 16+ simulator or device with dev build  
**Steps:**
1. Build and run on iOS: `npm start` → select iOS simulator
2. Navigate to MapScreen
3. Run happy-path tests 1–5 on iOS
4. Verify: heatmap renders smoothly, no crashes, legends readable on smaller screens (iPhone SE)
5. Verify: heatmap toggle button meets 44pt minimum touch target

**Expected:** All tests pass. No console warnings or crashes related to heatmap code.

**Test IDs:** `heatmap-happy-006-ios-16-simulator`, `heatmap-happy-006-ios-device-physical`

---

### 7. Works on Android (Native)

**Precondition:** Android 12+ emulator or device with dev build  
**Steps:**
1. Build and run on Android: `npm start` → select Android emulator
2. Navigate to MapScreen
3. Run happy-path tests 1–5 on Android
4. Verify: heatmap renders smoothly, no crashes
5. Verify: heatmap toggle button meets 44pt minimum touch target

**Expected:** All tests pass. No console warnings or crashes related to heatmap code.

**Test IDs:** `heatmap-happy-007-android-12-emulator`, `heatmap-happy-007-android-device-physical`

---

### 8. Works on Web (Browser)

**Precondition:** Web build with react-leaflet heatmap layer  
**Steps:**
1. Start web build: `npm run web`
2. Open http://localhost:3000 in Chrome, Safari, Firefox
3. Navigate to map view
4. Run happy-path tests 1–5 on web
5. Verify: heatmap cells render as polygons/rectangles on leaflet map
6. Verify: legend text is readable
7. Test on different screen sizes: desktop (1920x1080), tablet (768x1024), mobile (375x667)

**Expected:** All tests pass on all browsers. Heatmap responsive (cells scale with zoom).

**Test IDs:** `heatmap-happy-008-web-chrome`, `heatmap-happy-008-web-safari`, `heatmap-happy-008-web-firefox`, `heatmap-happy-008-web-responsive`

---

## Privacy Tests (Jordan Art. 7 Requirements)

### 1. Areas with Fewer Than 3 Flags Show NO Heat Zone (k-Anonymity Floor)

**Precondition:** Test dataset with:
- Cell A: 2 flags (no heat zone expected)
- Cell B: 3 flags (heat zone expected)
- Cell C: 4 flags (heat zone expected)

**Steps:**
1. Create or navigate to test area with known flag counts
2. Enable heatmap
3. Verify: Cell A (2 flags) shows no heat color or cell outline
4. Verify: Cell B (3 flags) shows heat color
5. Verify: Cell C (4 flags) shows heat color

**Code Check:** `bucketFlagsToCells()` filters `acc.count < kFloor` (default 3) before emitting HeatCells.

**Expected:** Cells with <3 flags are completely absent from rendered heatmap. Zero visual indication of their existence.

**Test IDs:** `heatmap-privacy-001-k-floor-enforcement`

---

### 2. Individual Flag Coordinates NOT Visible in Heatmap View

**Precondition:** Heatmap ON, cell visible with 5+ flags  
**Steps:**
1. Zoom in on a heat cell as far as map zoom permits
2. Observe: cell remains a solid area (polygon or circle), does NOT show individual pin markers
3. Observe: no lat/lng coordinate labels on the map
4. Try to tap the heatmap cell: should NOT reveal individual flag details in a list
5. Try to long-press the heatmap cell: should NOT trigger a callout with individual flag info

**Expected:** Heatmap is a pure density aggregate. Individual flag locations completely hidden when heatmap is ON. Only cell centroid and cell color visible.

**UI Interaction:** If cell tap is wired to show details, ensure it shows only aggregated info (e.g., "3+ flags, mean severity 2.5") with no breakdown by user or individual coordinate.

**Test IDs:** `heatmap-privacy-002-no-individual-coords`

---

### 3. Disclaimer Text Visible: "Based on Community Reports — Coverage Varies by Area"

**Precondition:** Heatmap ON  
**Steps:**
1. Locate disclaimer text on the MapScreen (typically near legend or in an info button)
2. Read: "Based on community reports — coverage varies by area"
3. Verify: text is not grayed out or unreadable
4. Verify: text is persistent (does not disappear on pan/zoom)

**Expected:** Disclaimer always visible when heatmap is ON. Users clearly understand heatmap is aggregated data, not comprehensive coverage.

**Implementation Note:** Typically rendered in the HeatmapLegend component or a separate info icon near the legend.

**Test IDs:** `heatmap-privacy-003-disclaimer-text-visible`

---

### 4. No User Identity Inferable From Heatmap Density

**Precondition:** Heatmap ON, view a cell with 3–5 flags  
**Steps:**
1. Observe the heat cell visualization (solid color, no granularity)
2. Attempt to infer which user reported which flag: should be impossible
3. Verify: no user names, avatars, or IDs visible on the heatmap
4. Verify: clicking the cell does NOT reveal reporter names

**Expected:** Heatmap is anonymized aggregation. Even with k=3, a user cannot infer which specific person reported at a specific location.

**Privacy Model:** With 3+ flags, an attacker cannot uniquely identify a reporter even if they know roughly where flags were dropped.

**Test IDs:** `heatmap-privacy-004-user-identity-hidden`

---

### 5. Zoom In/Out — Grid Cells Snap to 50m Grid (Not Exact Flag Locations)

**Precondition:** Heatmap ON, cell visible  
**Steps:**
1. Note the cell boundaries (should align with a regular grid)
2. Zoom in gradually: cells should stay aligned to grid lines (0.005° intervals)
3. Zoom out gradually: cells stay in same grid
4. Pan the map: cells remain in same grid locations, not following individual flags
5. Create a new flag at the exact edge of a cell boundary: cell should NOT visibly "shift" to absorb it

**Expected:** All cells have fixed grid positions. Flags are binned into cells, not the reverse. Grid is deterministic and visible as regular boundaries.

**Math:** 0.005° latitude ≈ 555 m. 0.005° longitude ≈ 555 m at the equator, shrinking towards poles (basic cosine latitude effect, acceptable).

**Test IDs:** `heatmap-privacy-005-grid-cells-fixed`

---

## Edge Cases

### 1. Zero Flags in Area — No Heatmap Shown

**Precondition:** Area with no flags  
**Steps:**
1. Navigate to a map region with no flags (e.g., ocean, remote area)
2. Enable heatmap toggle
3. Observe: no heat cells rendered
4. Observe: heatmap toggle remains ON (no auto-toggle off)
5. Observe: legend remains visible

**Expected:** Empty heatmap (no cells, no error). Legend still shows for clarity. Toggle state preserved.

**Test IDs:** `heatmap-edge-001-zero-flags-no-cells`

---

### 2. Exactly 3 Flags in One Cell — Should Appear (Boundary: Exactly at k-Floor)

**Precondition:** Test dataset with one cell containing exactly 3 flags  
**Steps:**
1. Heatmap ON
2. Locate cell with exactly 3 flags
3. Verify: cell IS rendered (not hidden)
4. Verify: cell color reflects mean severity of the 3 flags
5. Repeat test with k-floor=4 (custom option): cell should NOT appear with 3 flags

**Expected:** Condition is `count >= kFloor`, not `count > kFloor`. At k=3 (default), 3 flags pass.

**Code Validation:** `if (acc.count < kFloor) continue;` line in `bucketFlagsToCells()`.

**Test IDs:** `heatmap-edge-002-exactly-3-flags-passes`

---

### 3. 2 Flags in One Cell — Should NOT Appear (Below k-Floor)

**Precondition:** Test dataset with one cell containing exactly 2 flags  
**Steps:**
1. Heatmap ON
2. Locate cell with exactly 2 flags
3. Verify: cell is NOT rendered
4. Verify: no heat color, no cell outline, no visual indication

**Expected:** Cell completely hidden. No artifact or ghosted visual.

**Test IDs:** `heatmap-edge-003-exactly-2-flags-rejected`

---

### 4. Very High Density Area (100+ Flags) — Renders Without Performance Issues

**Precondition:** 
- Load test area with 100+ flags in overlapping cells
- Or manually insert 100+ test flags via database

**Steps:**
1. Enable heatmap on high-density area
2. Observe: heatmap renders within 2 seconds
3. Verify: map remains interactive (no jank, 60 FPS if possible)
4. Pan and zoom: smooth interaction, no stutter
5. Toggle heatmap on/off: instant toggle (no multi-second delay)

**Expected:** 100 flags rendered as ~10–20 cells (aggregated). Map FPS stays ≥30. No memory spikes.

**Performance Target:** `bucketFlagsToCells()` is O(n) over flag list. With 100 flags, <5ms. Rendering depends on map library; expect <500ms total for toggle.

**Test IDs:** `heatmap-edge-004-high-density-100-flags-perf`

---

### 5. Flags in Multiple Categories — Heatmap Shows All Categories Combined

**Precondition:** One cell with:
- 2 "ramp missing" flags (severity 3)
- 1 "sidewalk cracked" flag (severity 2)
- Total: 3 flags, mean severity = (3+3+2)/3 = 2.67

**Steps:**
1. Heatmap ON
2. Locate cell with mixed categories
3. Verify: cell appears as single heat zone
4. Verify: cell color reflects combined mean (yellow for ~2.67)
5. Verify: no per-category breakdown or separate cells

**Expected:** Heatmap is category-agnostic. All flags in a cell contribute equally to the heat, regardless of category.

**Test IDs:** `heatmap-edge-005-multi-category-combined`

---

## Accessibility Tests

### 1. Screen Reader Announces "Heatmap Active" When Toggled On

**Precondition:** Device with screen reader enabled (VoiceOver on iOS, TalkBack on Android)  
**Steps:**
1. Enable screen reader
2. Navigate to heatmap toggle button
3. Read button label: should say "Enable Heatmap" or "Heatmap Toggle"
4. Tap toggle to turn ON
5. Listen: VoiceOver/TalkBack should announce "Heatmap is now active" or similar
6. Tap toggle to turn OFF
7. Listen: VoiceOver/TalkBack should announce "Heatmap is now off"

**Expected:** Screen reader announces toggle state changes. Users understand when heatmap is on/off without visual feedback.

**Implementation Note:** Use `accessibilityLabel` and `accessibilityState` on the toggle button. On state change, call `announceForAccessibility('Heatmap is now active')`.

**Test IDs:** `heatmap-a11y-001-screen-reader-toggle-announcement`

---

### 2. Legend Has Accessible Labels (Not Color-Only)

**Precondition:** Heatmap ON, screen reader enabled  
**Steps:**
1. Navigate to legend with screen reader
2. Read each legend entry: should hear "1 Minor", "2 Mild", "3 Moderate", "4 Significant", "5 Severe"
3. Verify: legend is NOT announced as "image" or "decorative"
4. Verify: color swatches have `accessibilityLabel` describing the color name + severity

**Expected:** Legend is fully accessible. Colorblind users can understand severity scale from numeric labels + words alone, not just colors.

**Implementation Note:** HeatmapLegend component includes `accessibilityRole="image"` + `accessibilityLabel` (full-text description of the color scale).

**Test IDs:** `heatmap-a11y-002-legend-accessible-labels`

---

### 3. Heatmap Toggle Button Meets 44pt Touch Target

**Precondition:** iOS or Android device  
**Steps:**
1. Inspect toggle button size in design tools or by measuring on device
2. Verify: button width ≥ 44pt, height ≥ 44pt
3. Verify: button padding/hitbox extends to at least 44x44
4. Test with thumb (not precise tap): should be easy to hit
5. Test on small phone (iPhone SE): should still be easy to hit

**Expected:** Touch target ≥ 44x44pt (Apple + Google standard). No pinpoint taps required.

**Test IDs:** `heatmap-a11y-003-toggle-44pt-touch-target`

---

### 4. Colorblind-Safe Gradient (Not Red/Green Only)

**Precondition:** Heatmap ON with multiple cells of varying severity  
**Steps:**
1. Simulate colorblindness (use online tool or iOS Settings > Accessibility > Display & Text Size > Color Filters > Deuteranopia for red-green)
2. Observe: heat cells are still distinguishable by color
3. Observe: legend labels (1, 2, 3, 4, 5) provide non-color cues
4. Verify: gradient uses blue, yellow, red, green in combination, not red/green alone

**Expected:** Colorblind users can identify severity levels using color + numeric labels. Gradient does not rely solely on red/green contrast.

**Implementation Note:** Use accessible color palette per WCAG 2.1 AA standards. Example: green → yellow → orange → red is safer than red/green alone.

**Test IDs:** `heatmap-a11y-004-colorblind-safe-gradient`

---

## Performance Tests

### 1. Map Remains Responsive (No Jank) With 500 Flags on Heatmap

**Precondition:** 500 flags distributed across overlapping cells  
**Steps:**
1. Enable heatmap on area with 500 flags
2. Measure initial render time: should be <2 seconds
3. Pan the map: verify FPS ≥ 30 (use DevTools or native frame-rate monitor)
4. Zoom in/out: smooth transitions, no stutter
5. Run for 30 seconds: confirm sustained performance

**Expected:** No noticeable lag. 500 flags aggregate to ~50–100 cells, which is well within React/map render budget.

**Metrics:**
- Initial heatmap render: <2000ms
- Pan/zoom interaction: ≥30 FPS
- Memory footprint: <20 MB additional

**Test IDs:** `heatmap-perf-001-500-flags-responsive`

---

### 2. Toggling Heatmap On/Off Is Instant (<500ms)

**Precondition:** Heatmap toggle available  
**Steps:**
1. Measure toggle response time using browser DevTools or frame-rate meter
2. Tap toggle ON: heatmap should appear <500ms
3. Tap toggle OFF: heatmap should disappear <500ms
4. Repeat 10 times: consistent response time

**Expected:** Toggle is snappy, no visible delay. Users perceive it as instant.

**Implementation Note:** Use `useMemo` for `bucketFlagsToCells()` so recomputation is cached when flags haven't changed. Toggle only updates visibility state, not data processing.

**Test IDs:** `heatmap-perf-002-toggle-instant`

---

### 3. Heatmap Doesn't Cause Re-Renders of Unrelated Components

**Precondition:** React DevTools Profiler open  
**Steps:**
1. Open React DevTools on web or Expo DevTools on native
2. Enable Profiler, mark a checkpoint
3. Toggle heatmap ON
4. Observe: only HeatmapLayer + HeatmapLegend re-render
5. Verify: TasksScreen, ReportFlagModal, ProfileScreen are NOT re-rendered
6. Verify: FlagsContext is NOT re-read unnecessarily

**Expected:** Heatmap toggle is isolated; no cascading re-renders. Only heatmap-specific components update.

**Implementation Note:** Heatmap state should be local to MapScreen or a separate HeatmapContext, not global.

**Test IDs:** `heatmap-perf-003-isolated-re-renders`

---

## Regression Tests

### 1. Regular Markers Still Visible/Tappable When Heatmap Is Off

**Precondition:** Heatmap OFF (default state)  
**Steps:**
1. Navigate to MapScreen
2. Verify: individual flag markers visible
3. Tap a marker: callout appears with flag details
4. Tap callout action (e.g., "View Details"): flag detail screen opens
5. Enable heatmap: markers disappear, heat cells appear
6. Disable heatmap: markers re-appear, tappable

**Expected:** Markers are fully functional when heatmap is OFF. No regression from heatmap code.

**Test IDs:** `heatmap-regression-001-markers-functional`

---

### 2. Marker Clustering Still Works When Heatmap Is Off

**Precondition:** Marker clustering enabled, heatmap OFF  
**Steps:**
1. Zoom out to see clustered markers (if clustering feature exists)
2. Tap cluster: should expand or zoom in
3. Zoom in: cluster should deconstruct into individual markers
4. Verify: clustering algorithm unaffected

**Expected:** Clustering behavior identical before/after heatmap merge. No performance degradation.

**Test IDs:** `heatmap-regression-002-clustering-works`

---

### 3. Search/Filter in TasksScreen Unaffected

**Precondition:** Heatmap ON or OFF  
**Steps:**
1. Navigate to TasksScreen
2. Search for a flag by name/location
3. Verify: results match expected (heatmap toggle does NOT filter results)
4. Apply category filter: verify heatmap toggle does NOT interfere
5. Sort by date: verify order is correct

**Expected:** TasksScreen search/filter work identically regardless of heatmap state. Heatmap is map-layer-only.

**Test IDs:** `heatmap-regression-003-search-filter-unaffected`

---

### 4. Flag Reporting Flow Unaffected

**Precondition:** Heatmap ON or OFF  
**Steps:**
1. From MapScreen with heatmap ON, open ReportFlagModal (tap FAB)
2. Fill out flag details (category, severity, description, photo)
3. Submit flag
4. Verify: flag is created and stored in Supabase
5. Return to MapScreen: new flag is visible (heatmap may update if realtime is live)

**Expected:** Reporting flow works identically. No data loss or corruption. Heatmap does NOT block or interfere with reporting.

**Test IDs:** `heatmap-regression-004-reporting-flow-works`

---

## Device Test Checklist (Quick 10-Step Real Device Validation)

Run this checklist on a real iOS device and a real Android device before marking heatmap as DONE. Simulator-only tests are insufficient for production.

### iOS Device Checklist

Device: _______________ (e.g., iPhone 15, iOS 18.0)

- [ ] **Step 1:** Open app → navigate to MapScreen
- [ ] **Step 2:** Find area with 5+ flags in same cell
- [ ] **Step 3:** Tap heatmap toggle → gradient heat cells appear
- [ ] **Step 4:** Verify disclaimer text "Based on community reports — coverage varies by area" is visible
- [ ] **Step 5:** Tap a heat cell → no individual user data or exact coordinates exposed (only aggregate info if any)
- [ ] **Step 6:** Zoom in to maximum → cell boundaries stay as grid, not exact flag points
- [ ] **Step 7:** Find area with only 2 flags → no heat zone shown
- [ ] **Step 8:** Tap toggle off → normal map restored, markers re-appear and are tappable
- [ ] **Step 9:** Open TasksScreen while heatmap was ON → verify search/filter unaffected
- [ ] **Step 10:** Test dark mode toggle → legend and heat cells readable in both modes

**Tester:** _________________  
**Date:** _________________  
**Pass/Fail:** _________________  
**Notes:** ________________________________________________________________________

---

### Android Device Checklist

Device: _______________ (e.g., Pixel 8, Android 15)

- [ ] **Step 1:** Open app → navigate to MapScreen
- [ ] **Step 2:** Find area with 5+ flags in same cell
- [ ] **Step 3:** Tap heatmap toggle → gradient heat cells appear
- [ ] **Step 4:** Verify disclaimer text "Based on community reports — coverage varies by area" is visible
- [ ] **Step 5:** Tap a heat cell → no individual user data or exact coordinates exposed
- [ ] **Step 6:** Zoom in to maximum → cell boundaries stay as grid, not exact flag points
- [ ] **Step 7:** Find area with only 2 flags → no heat zone shown
- [ ] **Step 8:** Tap toggle off → normal map restored, markers re-appear and are tappable
- [ ] **Step 9:** Open TasksScreen while heatmap was ON → verify search/filter unaffected
- [ ] **Step 10:** Test dark mode toggle → legend and heat cells readable in both modes

**Tester:** _________________  
**Date:** _________________  
**Pass/Fail:** _________________  
**Notes:** ________________________________________________________________________

---

## Test Summary & Sign-Off

| Category | Test Count | Status |
|---|---|---|
| Happy Path (native + web) | 8 | Ready |
| Privacy (k-floor + coordinate hiding) | 5 | Ready |
| Edge Cases | 5 | Ready |
| Accessibility | 4 | Ready |
| Performance | 3 | Ready |
| Regression | 4 | Ready |
| Device Checklists | 2 | Ready |
| **TOTAL** | **31** | **Ready for Shamus build completion** |

---

## Pre-Merge Gate Checklist

Before merging heatmap to main:

- [ ] All 31 test categories completed with Pass status
- [ ] No P1 bugs (crashes, privacy leaks, k-floor violations)
- [ ] No regressions in existing features (markers, clustering, search, reporting)
- [ ] Performance targets met: toggle <500ms, 500 flags responsive
- [ ] Device checklists passed on at least 1 iOS + 1 Android device
- [ ] Web variant tested on Chrome, Safari, Firefox
- [ ] Accessibility pass: legend readable, screen reader announces state, 44pt touch target
- [ ] Privacy sign-off: k-floor enforced, individual coords hidden, disclaimer visible
- [ ] Jordan Art. 7 pre-approval confirmed in code comments (`heatmap.ts` lines 6–7)
- [ ] Shamus code review completed (style, component contracts, test coverage)
- [ ] Gary CI/lint pass (no warnings, all type checks pass)

---

## Notes for Shamus & Gary

1. **Privacy is hardcoded:** The k-floor (default 3) is a constant in `heatmap.ts`. Don't accept kFloor < 3 at runtime without another privacy review from Jordan.

2. **Realtime dependency:** Tests 5 (realtime heatmap updates) require `2026-05-24_realtime_flags.sql` migration applied. If not applied yet, mark those tests as SKIP and run them post-merge.

3. **Legend accessibility:** HeatmapLegend component already has `accessibilityLabel` per the source code. Verify it's rendered in final build.

4. **Grid cell size:** DEFAULT_CELL_SIZE_DEG = 0.005° is signed off by Jordan (Dani approved design). Don't change without another review.

5. **Color palette:** Ensure severityColor() gradient is colorblind-safe. Current colors (green → yellow → orange → red) are acceptable.

---

**Test Plan Author:** Riley, QA Strategy  
**Date Created:** 2026-05-30  
**Target Completion:** When heatmap merge branch is ready  
**Status:** READY FOR IMPLEMENTATION
