# Riley Wave B — Design Spec
**Author:** Dani (Creative Director)
**Date:** 2026-05-30
**Branch:** `design/riley-wave-b-spec-2026-05-29`
**Source:** `qa-reports/2026-05-29_Riley_UserResearch.md` — Findings F1, F3, F7
**Status:** SPEC ONLY — no code changes. Shamus implements against this document.

> **Scope note.** These three findings share a theme: screen reader users and
> motor-impaired users hit capability gaps where the visual experience is rich
> but the accessible path is bare. All three specs aim for parity with existing
> patterns — no new tokens, no new feature surface.

---

## F1 — NearbyFlagsModal filter parity

### Problem statement (Riley)

The map's filter panel offers category chips + minimum-severity picker + status
toggles + saved filter sets. When a screen reader is active, `useScreenReader()`
auto-opens `NearbyFlagsModal` as the accessible list view — the map itself
cannot be traversed by VoiceOver or TalkBack. But NearbyFlagsModal currently
exposes only a category chip row. There is no severity filter, no status filter,
and no saved presets inside the modal. The gap means screen reader users browse
an unfiltered flag list while sighted users can narrow to, e.g., "verified
no-ramp flags, severity 3+."

### What to add

Add two filter controls below the existing category chip row in
NearbyFlagsModal. They must match the visual language of the existing chips
exactly — no new patterns.

#### Control A — Minimum severity

**Pattern:** a horizontal row of five numbered buttons, matching the severity
picker in `ReportFlagModal` (not the five individual chips in MapScreen's full
filter panel — the compact button format reads better in the modal's
narrower context).

**Visual treatment:**
- Five `Pressable` buttons labeled 1, 2, 3, 4, 5 in a horizontal row.
- Default (no filter, minSeverity = 1): all five buttons inactive style —
  `color.surfaceNeutral` background, `color.text` foreground, `radius.full` pill.
- Active (minSeverity = N): button N through 5 highlight. Only button N itself
  changes to filled (`severityColor(N)` background, `color.textOnBrand`
  foreground). The "and above" sense is communicated via the accessibilityLabel,
  not a visual range indicator — keeping implementation simple.
- Minimum touch target: `minHeight: 44`, `minWidth: 44` per `a11y.minTargetSize`.
- Padding: `spacing.md` horizontal, `spacing.sm` vertical.
- Gap between buttons: `spacing.sm`.

**Section label above the row:**
- Text: "Min. severity"
- Style: matches `styles.filterSubLabel` from MapScreen — `font.size.sm`,
  `font.weight.semibold`, `color.textMuted`, `spacing.lg` horizontal padding.

**Default state:** minSeverity = 1 (no filter active — shows all).

**Reset on modal close:** yes, alongside existing category/search reset in the
`visible` effect.

#### Control B — Status

**Pattern:** a horizontal row of toggle chips for each status value (Open,
Verified, Resolved, Rejected), matching the status toggle chips in MapScreen's
filter panel.

**Visual treatment:**
- One chip per status in `STATUS_ORDER`: Open, Verified, Resolved, Rejected.
- Inactive chip: `color.surfaceNeutral` background, `color.text` foreground.
- Active chip (status included in filter): use the matching status token pair —
  Open → `color.statusOpenBg` / `color.statusOpenFg`,
  Verified → `color.statusVerifiedBg` / `color.statusVerifiedFg`,
  Resolved → `color.statusResolvedBg` / `color.statusResolvedFg`,
  Rejected → `color.statusRejectedBg` / `color.statusRejectedFg`.
- `radius.full` pill shape.
- `font.size.xs`, `font.weight.semibold`.
- `minHeight: 36` chip (lives inside a wrapper row that has `minHeight: 44`
  for touch compliance). This matches the existing chip pattern in NearbyFlagsModal.
- Padding: `spacing.md` horizontal, `spacing.xs` vertical.

**Multi-select behavior:** any combination of statuses can be active
simultaneously. When no status chips are active, show all statuses (same as
MapScreen's default: `DEFAULT_STATUSES = ['open', 'verified']`). When at least
one is active, the list filters to flags whose `status` is in the active set.

**Section label above the row:**
- Text: "Status"
- Same style as the Min. severity label above.

**Default state:** no chips active (show all statuses — no filter applied inside
the modal). This intentionally differs from MapScreen's default (`open` +
`verified` preselected) to avoid silently hiding flags the user might want to
see in list mode. See Open Questions #1 below.

**Reset on modal close:** yes, alongside the other resets.

#### Layout order in NearbyFlagsModal (top to bottom)

1. Header row (existing: title + Close button)
2. Location notice, if no location (existing)
3. Search bar (existing, when ≥ 2 flags)
4. Category chips (existing)
5. **[NEW] Min. severity row** — shown only when there are flags with at least
   two distinct severity levels in the list (same conditional logic as the
   category chip row: no point filtering if there's nothing to filter)
6. **[NEW] Status chips row** — shown only when there are flags with at least
   two distinct statuses in the list
7. FlatList (existing)

#### Filter interaction ordering

Apply filters in this order (left-to-right in the pipeline):
1. Category (existing `filterCat`)
2. Minimum severity (new `minSeverity`)
3. Status (new `activeStatuses`)
4. Search query (existing `searchQuery`)

Category chip counts reflect the full list (pre-all-filters), matching the
existing behavior.

### Saved filter presets

Do NOT add saved filter presets to NearbyFlagsModal in this wave. The modal
resets on close by design, and adding persistence introduces product complexity
(data model, sync with MapScreen's presets). Flag as a possible future wave.
See Open Questions #2.

### Accessibility labels

All new interactive elements:

| Element | accessibilityRole | accessibilityLabel | accessibilityState |
|---|---|---|---|
| Severity button 1 | `"button"` | `"Minimum severity: all — show flags of any severity"` | `{ selected: minSeverity === 1 }` |
| Severity button 2 | `"button"` | `"Minimum severity 2: Low and above"` | `{ selected: minSeverity === 2 }` |
| Severity button 3 | `"button"` | `"Minimum severity 3: Moderate and above"` | `{ selected: minSeverity === 3 }` |
| Severity button 4 | `"button"` | `"Minimum severity 4: High and above"` | `{ selected: minSeverity === 4 }` |
| Severity button 5 | `"button"` | `"Minimum severity 5: Severe only"` | `{ selected: minSeverity === 5 }` |
| Status chip: Open | `"button"` | `"Show Open flags, N flags"` | `{ selected: activeStatuses.has('open') }` |
| Status chip: Verified | `"button"` | `"Show Verified flags, N flags"` | `{ selected: activeStatuses.has('verified') }` |
| Status chip: Resolved | `"button"` | `"Show Resolved flags, N flags"` | `{ selected: activeStatuses.has('resolved') }` |
| Status chip: Rejected | `"button"` | `"Show Rejected flags, N flags"` | `{ selected: activeStatuses.has('rejected') }` |

Where N is the count of flags matching that status in the current (unfiltered by
status) list. Announce live count changes via `accessibilityLiveRegion="polite"`
on the result count element (reuse the existing count announcement pattern in
`useEffect` on `displayFlags.length`).

**Section container labels:**
- Severity row: wrap in a `View` with `accessibilityLabel="Filter by minimum severity"`.
- Status row: wrap in a `View` with `accessibilityLabel="Filter by status"`.

### Token reference

No new tokens needed. All tokens used:

| Token | Source | Purpose |
|---|---|---|
| `color.surfaceNeutral` | `src/theme.ts` | Inactive chip/button background |
| `color.text` | `src/theme.ts` | Inactive chip/button foreground |
| `color.textOnBrand` | `src/theme.ts` | Active severity button foreground |
| `color.statusOpenBg/Fg` | `src/theme.ts` | Open status active chip |
| `color.statusVerifiedBg/Fg` | `src/theme.ts` | Verified status active chip |
| `color.statusResolvedBg/Fg` | `src/theme.ts` | Resolved status active chip |
| `color.statusRejectedBg/Fg` | `src/theme.ts` | Rejected status active chip |
| `color.textMuted` | `src/theme.ts` | Section label color |
| `severity[N].color` via `severityColor()` | `src/theme.ts` | Active severity button background |
| `font.size.sm`, `font.size.xs` | `src/theme.ts` | Labels |
| `font.weight.semibold` | `src/theme.ts` | Label weight |
| `spacing.lg`, `spacing.md`, `spacing.sm`, `spacing.xs` | `src/theme.ts` | Padding/gap |
| `radius.full` | `src/theme.ts` | Pill shape |
| `a11y.minTargetSize` (44) | `src/theme.ts` | Touch target floor |

---

## F3 — Skip photo + library-first for ReportFlagModal

### Problem statement (Riley)

Camera capture is encouraged for high-severity reports (a photo nudge fires at
severity ≥ 4). For users who are one-handed (Priya: forearm crutches) or have
fine-motor limitations (Tom: MS tremor, power wheelchair), operating the camera
while holding the phone — or while balanced in a precarious position — is a
real physical risk. The current UI offers "Take photo" and "Choose from library"
side-by-side, with camera listed first and no visible way to skip the photo step.
The skip affordance is implicit (just don't tap either button), but that's not
discoverable, especially after the severity nudge banner fires.

### What to change

Two changes to the photo section of `ReportFlagModal`, applied together:

#### Change 1 — Reorder buttons: library first, camera second

**Current order:** `[📷 Take photo]  [🖼 Choose from library]`
**New order:** `[🖼 Choose from library]  [📷 Take photo]`

Rationale: library mode does not require the user to hold the phone steady or
aim at a subject. It is the lower-friction option for most motor-impaired users.
Camera remains available and prominent — it is not hidden or demoted visually,
just placed second.

No style change. Both buttons retain the existing `styles.photoBtn` appearance:
`color.surfaceNeutral` background, `color.text` foreground, `radius.md` corners,
equal flex width.

#### Change 2 — Add an explicit "No photo" skip button

**Label:** "No photo needed"

**Placement:** below the two photo pick buttons, full width (not inline with them).
The separate row placement signals it as a different class of action (exit, not
pick), without suggesting any shame or failure.

**Visual treatment:**
- Full-width Pressable, matching the row width of the photo buttons.
- Background: `color.surface` (white) — not filled, so it reads as the
  lower-commitment option visually.
- Border: 1pt `color.border` — gives the button definition without competing
  with the photo buttons above.
- Foreground text: `color.textMuted` — secondary, not invisible.
- Font: `font.size.sm`, `font.weight.regular`.
- Border radius: `radius.md`.
- Height: `minHeight: 44` (WCAG touch target).
- Padding: `spacing.md` vertical, `spacing.lg` horizontal.
- No icon or emoji.

**Button text:** "No photo needed"

Design rationale for wording: "Skip photo" implies an obligation being bypassed.
"No photo" (used in some other apps) reads as a negative ("I have no photo").
"No photo needed" is declarative and removes the guilt framing — the user is
asserting that the report stands on its own. It also matches AccessMap's tone:
plain, non-judgmental.

**Behavior:** tapping "No photo needed" does nothing — `photoUri` stays null and
the form continues normally. This button exists purely for discoverability; it
makes explicit the implicit skip that was always available. No new state needed.

**Visibility rule:** show this button only when no photo is attached (`!photoUri`).
When a photo is attached the preview + "Remove photo" button appear (existing
behavior) and the skip button disappears.

**High-severity nudge interaction:** the existing photo nudge (`severity >= 4 &&
!photoUri`) should remain — it is informational, not coercive. When the nudge is
visible, the "No photo needed" button is also visible. They coexist without
contradiction: the nudge explains the benefit; the button acknowledges the user's
choice. The nudge copy ("A photo helps verify this major barrier without a site
visit.") stays unchanged.

#### Exact UI layout, photo section (no photo attached)

```
[ Label: "Photo (optional)" ]

[ nudge banner — only at severity ≥ 4 ]           ← existing, unchanged

[ 🖼 Choose from library ]  [ 📷 Take photo ]     ← reordered, unchanged styles

[ No photo needed                               ]  ← new, full-width, border style
```

### Accessibility labels

| Element | accessibilityRole | accessibilityLabel | accessibilityHint |
|---|---|---|---|
| Choose from library (now first) | `"button"` | `"Choose a photo from your library"` | (none — action is self-explanatory) |
| Take photo (now second) | `"button"` | `"Take a photo with the camera"` | (none) |
| No photo needed | `"button"` | `"Continue without a photo"` | `"Your report will be submitted without a photo. Photos help but aren't required."` |

Note: the visible label is "No photo needed" but the `accessibilityLabel` is
"Continue without a photo" — slightly more explicit for screen reader users who
may not have the visual layout context. The `accessibilityHint` reinforces that
the report is still valid.

### Token reference

No new tokens needed.

| Token | Purpose |
|---|---|
| `color.surface` | Skip button background |
| `color.border` | Skip button border |
| `color.textMuted` | Skip button label color |
| `font.size.sm` | Skip button font |
| `font.weight.regular` | Skip button weight |
| `radius.md` | Skip button corners |
| `spacing.md`, `spacing.lg` | Skip button padding |
| `a11y.minTargetSize` (44) | Touch target floor |

---

## F7 — Map zoom +/− buttons (native map only)

### Problem statement (Riley)

The native map (react-native-maps, rendered by `PlatformMap.tsx`) offers only
pinch-to-zoom. Users with iOS System Zoom active (low-vision users like David
who use the Zoom magnifier) experience unpredictable results because iOS
intercepts three-finger-swipe gestures that react-native-maps also uses. Users
with tremor or limited fine motor control (Tom: MS, power wheelchair) cannot
reliably execute a two-finger pinch. Users who are one-handed (Priya) cannot
pinch at all without switching grip.

The web map (react-leaflet, rendered by `PlatformMap.web.tsx`) already has
Leaflet's built-in zoom controls. This spec adds equivalent controls to native.

### What to add

Two visible zoom buttons, placed in the bottom-left of the map view, inside
`MapScreen.tsx`.

#### Placement

- **Bottom-left** of the map view area.
- The Report FAB and List FAB occupy the bottom-right column (`fabColumn` in
  MapScreen, `justifyContent: 'space-between'`). The left side of the bottom
  bar currently holds `HeatmapLegend` (shown when heatmap is active) or an
  empty `View` (when heatmap is off). The zoom buttons sit in this left slot,
  replacing the empty View — and appearing below HeatmapLegend when the
  heatmap is on.
- Both buttons are positioned within the map view area (not the SafeAreaView
  header), using the existing `bottomBar` flex row layout.
- Vertical gap between the two buttons: `spacing.sm` (8pt).
- Maintain `spacing.lg` (16pt) margin from the left edge and bottom safe area.

#### Button design

Two identical square Pressables, stacked vertically: + on top, − below.

| Property | Value | Token |
|---|---|---|
| Width × Height | 44 × 44pt | `a11y.minTargetSize` |
| Background | `color.surface` (white, 97% opacity via `color.overlay`) | `color.overlay` |
| Border | 1pt `color.border` | `color.border` |
| Border radius | `radius.md` (8pt) — square/rounded, not pill | `radius.md` |
| Shadow | `shadow.e1` — gentle lift, consistent with filter panel buttons on the map | `shadow.e1` |
| Label text | "+" / "−" | — |
| Font size | `font.size.xxl` (20pt) — large enough to be an obvious tap target cue | `font.size.xxl` |
| Font weight | `font.weight.regular` | — |
| Text color | `color.text` (#333) | `color.text` |
| Pressed state | `opacity: 0.7` — minimal feedback that respects Reduce Motion | — |

Rationale for square over pill: the existing FABs are pill-shaped
(`radius.full`). Making the zoom buttons pill-shaped would make them look like
peer actions (report, list). Square/rounded (`radius.md`) communicates "map
control" rather than "primary app action," consistent with Leaflet's zoom
control visual language on the web.

Rationale for `color.overlay` (97% opacity white) over solid `color.surface`:
the buttons float over the map. Solid white creates a hard visual break;
97%-opacity white lets the map bleed through slightly, signaling that these
controls belong to the map layer.

#### Zoom increment

Each tap changes the map's zoom by one react-native-maps "delta" unit. The
implementation detail (adjusting `latitudeDelta` + `longitudeDelta`) is for
Shamus to determine — the design contract is: one tap = one perceptible zoom
step, consistent with how Leaflet handles +/− on the web build.

#### Platform guard

The zoom buttons are **native-only**. On web, Leaflet's built-in controls
already serve this purpose and the zoom buttons must not render. Use
`Platform.OS !== 'web'` as the guard condition, placed in the same location in
`MapScreen.tsx` where `HeatmapLegend` is conditionally rendered.

#### Accessibility labels

| Button | accessibilityRole | accessibilityLabel | accessibilityHint |
|---|---|---|---|
| + (zoom in) | `"button"` | `"Zoom in"` | `"Magnifies the map to show a smaller area in more detail"` |
| − (zoom out) | `"button"` | `"Zoom out"` | `"Zooms the map out to show a larger area"` |

Both buttons use `accessibilityRole="button"`. No `accessibilityState` needed —
zoom is not a toggle and there is no min/max zoom state surfaced to the user.

If react-native-maps exposes a `maximumZoomLevel` or `minimumZoomLevel` prop
that can be compared against the current delta, add
`accessibilityState={{ disabled: true }}` when the button would have no effect.
This is a nice-to-have, not a requirement for the first implementation.

#### Layout in MapScreen (bottom bar, left column)

Existing structure:
```
bottomBar (row, space-between):
  └─ left: <HeatmapLegend /> or <View />   ← zoom buttons go here
  └─ right: fabColumn (List FAB + Report FAB)
```

New structure:
```
bottomBar (row, space-between, align flex-end):
  └─ left: zoomColumn (column, align flex-start, gap spacing.sm)
      ├─ [Platform.OS !== 'web'] + button (44×44)
      ├─ [Platform.OS !== 'web'] − button (44×44)
      └─ [heatmapEnabled] <HeatmapLegend />
  └─ right: fabColumn (existing, unchanged)
```

HeatmapLegend stacks below the zoom buttons in the same left column.
When both are present (heatmap on + zoom buttons), add `spacing.sm` gap between
them. The HeatmapLegend's own margin is already defined; no change to its styles.

### Token reference

No new tokens needed.

| Token | Purpose |
|---|---|
| `color.overlay` | Button background (map-floated, slightly transparent) |
| `color.border` | Button border |
| `color.text` | Button label color |
| `shadow.e1` | Gentle map-surface shadow |
| `font.size.xxl` | +/− glyph size |
| `font.weight.regular` | +/− glyph weight |
| `radius.md` | Button corner radius |
| `a11y.minTargetSize` (44) | Width and height |
| `spacing.sm` | Gap between the two buttons |
| `spacing.lg` | Left/bottom margin from map edge |

---

## Open questions for Sky

| # | Question | Stakes | Recommended default |
|---|---|---|---|
| Q1 | Should NearbyFlagsModal's status filter default to "all statuses shown" (this spec) or mirror MapScreen's default of "open + verified only"? | If modal defaults to "all," screen reader users may see resolved/rejected flags that the sighted filter hides — creates a different view of reality. If modal defaults to "open + verified," users may not know they're filtered, and cannot see resolved flags to confirm a fix. | This spec recommends "all shown" — the list is explicitly a discovery surface, not a task queue. But this is a product call. |
| Q2 | Should a future wave add saved filter presets to NearbyFlagsModal (synced with MapScreen presets), or keep the modal filter as always-reset-on-close? | Syncing would give screen reader users the same named-filter power that sighted users have. But it adds a data model dependency and UX complexity. | Out of scope for this wave; flag for Wave C. |
| Q3 | "No photo needed" — is the wording right for AccessMap's voice? Alternatives considered: "Skip photo," "No photo," "Continue without photo." | Wording shapes how the photo step is perceived — a burden vs. an invitation. | "No photo needed" is the design recommendation. Sky has final call on copy. |
| Q4 | Zoom buttons — should they be visible at all times (even for users who never need them) or hidden behind an accessibility setting? | Always-visible is simpler and doesn't stigmatize disability; an opt-in setting adds complexity. Web map shows them always. | Always-visible. Keeps parity with the web map and benefits any user who prefers buttons to pinch (elderly, cold weather, gloves). |

---

*Dani — Creative Director. This is a design spec document only. No code was written or modified.*
*Branch: `design/riley-wave-b-spec-2026-05-29`. Do not merge.*
