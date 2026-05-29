# Wave 2 Accessibility Audit — WCAG 2.2 AA
**Date:** 2026-05-29  
**Auditor:** Alex (A11y Specialist)  
**Branch:** `feat/wave2-quick-wins`  
**Scope:** MyWatchedModal search/filter, PlatformMap.web.tsx cluster bubbles, offline indicator

---

## Summary

| | Count |
|---|---|
| **BLOCKING** (WCAG 2.2 AA fail) | 2 |
| **ADVISORY** (best practice / improvement) | 6 |

No show-stoppers on screen reader labels, focus order, or live-region wiring — the foundation is solid. Two hard AA failures need fixing before merge: cluster bubble text contrast and filter chip touch targets.

---

## BLOCKING Issues

### B1 — Cluster bubble text contrast fails SC 1.4.3
**File:** `src/components/PlatformMap.web.tsx` — `makeClusterIcon()`  
**WCAG:** SC 1.4.3 Contrast (Minimum), Level AA  

The cluster icon renders white text (`#fff` / `textOnBrand`) on brand blue (`#2f80ed`) at 13px bold. Contrast ratio is ~3.3:1 — the theme's own comment acknowledges this: `brand: 3.3:1 on white → UI/large-text only`. WCAG AA requires 4.5:1 for normal text; 13px bold does not qualify as large text (large = ≥ 18pt any weight, or ≥ 14pt bold ≈ 18.67 px).

```ts
// CURRENT — fails for label text
html: `<div style="...color:${textColor}...">${label}</div>`
// textColor = themeColor.textOnBrand = '#fff' on '#2f80ed' → ~3.3:1
```

**Fix:** Use a darker background or lighter text. Easiest option: use `brandText` (`#1c4f99` light / `#60a5fa` dark) as the text color and a white or near-white bubble background, matching the `StatusBadge` pill pattern. Alternatively darken the bubble background.

```ts
// Option A: dark text on white bubble (matches light palette convention)
background: white; color: brandText (#1c4f99 = 7.6:1)

// Option B: pass a contrast-safe text colour from outside — theme already
// knows brandText for both modes; just thread it alongside textOnBrand.
```

---

### B2 — Filter chip touch targets below 44 px (SC 2.5.5)
**Files:** `src/screens/MapScreen.tsx` (`filterPill`, `sevPill`), `src/components/MyWatchedModal.tsx` (`statusChip`)  
**WCAG:** SC 2.5.5 Target Size (Minimum), Level AA  

Three chip styles are under the 44 pt/px minimum:

| Style | Actual size | File |
|---|---|---|
| `filterPill` (Category, Status, Distance chips) | `paddingVertical: 6` + 14 px font ≈ **30 px**, no `hitSlop` | MapScreen.tsx |
| `sevPill` (1–5 severity buttons) | `height: 32`, no `hitSlop` | MapScreen.tsx |
| `statusChip` (All / Open / Verified / Resolved) | `minHeight: 32`, no `hitSlop` | MyWatchedModal.tsx |

**Fix (pick one per chip):**
```ts
// Option A: bump minHeight and add vertical centering
filterPill: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
sevPill:    { minHeight: 44, width: 44, ... },
statusChip: { minHeight: 44, ... },

// Option B: keep compact visual size but add hitSlop on the Pressable
<Pressable hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} ...>
// (hitSlop expands the touch area without changing layout)
```

WCAG 2.2 also added SC 2.5.8 (AA, not present in 2.1) which requires ≥ 24 px with ≥ 24 px spacing between adjacent targets — even that would be borderline for the 30 px pills. Using `minHeight: 44` plus a `hitSlop` fallback is the safe play.

---

## ADVISORY Issues

### A1 — Search result count not re-announced in MyWatchedModal
**File:** `src/components/MyWatchedModal.tsx`  

When the user types in the search bar, `displayFlags` filters locally and the `FlatList`'s `accessibilityLabel` updates to `"Watched flags list, N items"`. But this label is static — React Native doesn't re-read a component's `accessibilityLabel` unless it gains focus or fires an explicit announcement. iOS VoiceOver users will not hear the new count.

MapScreen already does this correctly (line 727: `AccessibilityInfo.announceForAccessibility('No flags match your filters.')`). Add the same pattern:

```ts
// in MyWatchedModal, after the displayFlags useMemo:
const prevCountRef = useRef<number | null>(null);
useEffect(() => {
  if (!visible) return;
  // Only announce on changes, not on mount.
  if (prevCountRef.current !== null && prevCountRef.current !== displayFlags.length) {
    const msg =
      displayFlags.length === 0
        ? 'No watched flags match your search.'
        : `${displayFlags.length} ${displayFlags.length === 1 ? 'flag' : 'flags'} match.`;
    AccessibilityInfo.announceForAccessibility(msg);
  }
  prevCountRef.current = displayFlags.length;
}, [displayFlags.length, visible]);
```

The "No matches" empty-state visual also doesn't get an explicit `announceForAccessibility` call. A single effect that covers both `0` and `N` results covers both gaps.

---

### A2 — Cluster expansion ignores reducedMotion (WCAG 2.3.3 advisory)
**File:** `src/components/PlatformMap.web.tsx` — `ClusteredMarkers` `click` handler  

```ts
// CURRENT — hardcoded animation regardless of OS setting
map.flyTo([lat, lng], expansionZoom, { duration: 0.4 });
```

`PlatformMap` already threads a `reducedMotion` prop and uses it for `animateTo` (`duration: reducedMotion ? 0 : 0.6`), but `ClusteredMarkers` doesn't receive `reducedMotion` so cluster tap always animates. Users with vestibular disorders who set "Reduce Motion" in OS settings won't have that preference respected here.

WCAG 2.3.3 is Level AAA, so this is not a hard blocker, but it's a 2-line fix:

```ts
// Thread reducedMotion into ClusteredMarkersProps, then:
map.flyTo([lat, lng], expansionZoom, { duration: reducedMotion ? 0 : 0.4 });
```

---

### A3 — Exclusive-selection chips should use `accessibilityRole="radio"` not `"button"`
**Files:** `src/components/MyWatchedModal.tsx` (status chips), `src/screens/MapScreen.tsx` (severity pills)  

Status chips in MyWatchedModal are mutually exclusive — only one can be active. Severity pills are also single-select. Both use `accessibilityRole="button"` with `accessibilityState={{ selected: active }}`. The `selected` state is not standard for `button`; screen readers may announce it inconsistently.

Semantically correct alternative: `accessibilityRole="radio"` per chip, wrapped in a `View` with `accessibilityRole="radiogroup"`. This maps to native radio-button semantics and VoiceOver will announce "selected / unselected" correctly.

Category chips (multi-select, toggle behaviour) are correctly using `button` + `selected`. Only the single-select patterns need to change.

---

### A4 — Offline badge: `accessibilityRole="text"` weaker than `"alert"` for dynamic state
**File:** `src/screens/MapScreen.tsx` (line ~1485)  

```tsx
<View
  accessibilityRole="text"      // ← advisory: "alert" triggers more reliably
  accessibilityLiveRegion="polite"
  accessibilityLabel="Offline — viewing cached map data"
>
```

`accessibilityRole="text"` on a `View` is valid in React Native but it's a static semantic — it doesn't carry any implicit live-region behaviour on iOS. The `accessibilityLiveRegion="polite"` handles Android reliably, but on iOS the announcement on appearance is more reliable with `accessibilityRole="alert"` (maps to `UIAccessibilityLayoutChangedNotification`).

Change to `accessibilityRole="alert"` and drop `accessibilityLiveRegion` (alert implies assertive, redundant to stack both). If "polite" urgency is preferred, keep both and change role to `"status"` — but "status" isn't in the React Native supported list; "alert" + polite liveRegion is the pragmatic cross-platform combination.

---

### A5 — Individual pin `alt` text uses numeric severity (inconsistency with native)
**File:** `src/components/PlatformMap.web.tsx` — individual pin `Marker`  

```ts
// Web
alt={`${CATEGORY_LABELS[flag.category]}, severity ${flag.severity}, ${flag.status}. Open for details.`}
// e.g. "Broken sidewalk, severity 5, open. Open for details."

// Native (via accessibilityLabel built in MapScreen)
// uses severityA11y(flag.severity) → "Severity: Critical"
```

Numeric severity is readable but doesn't match the native experience. A VoiceOver user switching between web and native will hear different descriptions for the same pin. Low priority since both are unambiguous, but worth aligning.

---

### A6 — Leaflet popup keyboard focus not moved into popup on open
**File:** `src/components/PlatformMap.web.tsx` — `Popup` elements  

When a marker is activated (Enter/Space on keyboard focus), Leaflet opens the popup but does not move keyboard focus into it. A keyboard-only user must Tab forward to reach the popup's "close" button and the flag details. For popups containing only read-only text this is tolerable (WCAG 2.4.3 advisory), but if/when the popup gains interactive controls (a "report" link, navigation button, etc.) this would become a blocking focus-management failure.

For now: add a `ref` to the popup container and call `.focus()` inside an `onOpen` callback. Leaflet's `Popup` component fires an `add` event when shown.

---

## What's Already Good

- `SearchInputRow`: `minHeight: 44` on the text input and 44×44 clear button — passes 2.5.5. ✓  
- Magnifier glyph hidden from screen reader via `decorativeProps`. ✓  
- Every filter chip and watched-flag row has both `accessibilityLabel` and `accessibilityState`. ✓  
- Empty-filter and "No flags" transitions announce via `AccessibilityInfo.announceForAccessibility` in MapScreen. ✓  
- Cluster markers: `alt` + `title` attributes; keyboard expansion via Enter/Space works because Leaflet adds `tabindex="0"` to markers. ✓  
- Heat-zone label markers have `keyboard={false}` (correct — decorative aggregate). ✓  
- Offline badge has `accessibilityLiveRegion="polite"` (covers Android reliably). ✓  
- Reduce motion is wired in `animateTo` for programmatic pan. ✓  
- `decorativeProps` used consistently on non-semantic glyphs throughout. ✓  
- Resolved-flag accent bar uses `accessibilityElementsHidden` / `importantForAccessibility`. ✓  

---

## Priority Recommendation

| Fix | Effort | Blocks merge? |
|---|---|---|
| **B1** Cluster bubble contrast — use `brandText` as text color | ~30 min | **Yes** |
| **B2** Filter chip touch targets — `minHeight: 44` or `hitSlop` | ~1 hr | **Yes** |
| A1 Search result announcement in MyWatchedModal | 30 min | No |
| A2 Cluster reducedMotion | 10 min | No (AAA) |
| A3 Radio role for exclusive chips | 45 min | No |
| A4 Offline badge role | 5 min | No |
| A5 Pin alt text alignment | 10 min | No |
| A6 Popup focus management | 45 min | No |
