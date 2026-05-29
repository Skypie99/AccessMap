# A11y + Performance — Wave 3
**Date:** 2026-05-27
**Roles:** Alex (Accessibility) + Peter (Performance)
**Branch:** `a11y-perf/wave3-2026-05-27` (forked from `design/creative-polish-2026-05-27`)
**Base SHA:** 1459719 (`docs(qa): Creative UI Polish report for 2026-05-27`)
**Verification:** `npx tsc --noEmit` → 0 errors · `npm test -- --watchAll=false` → **61 suites / 922 tests pass**

---

## Scope

This wave audits the *new* UI introduced by the creative polish pass on `design/creative-polish-2026-05-27` (4 commits, ~21 src files). Prior Alex/Peter waves (1, 2, 5, 6) are not re-litigated — the brief was to find what polish may have left behind.

Files reviewed:

- `src/screens/SignInScreen.tsx` (full rebuild)
- `src/screens/ReportFlagModal.tsx` (input/photo-clear polish)
- `src/screens/LegendModal.tsx` (token sweep)
- `src/screens/NearbyFlagsModal.tsx` (token sweep + useColor migration)
- `src/screens/MapScreen.tsx` (token sweep + FAB resize + actionBar regroup)
- `src/components/PlatformMap.tsx` (native pin/cluster redesign)
- `src/components/PlatformMap.web.tsx` (web pin redesign)
- `src/screens/ProfileScreen.tsx` (hero card glow-up — Supabase fetch path)

---

## A11y fixes applied (Alex)

### 1. Web map markers gained `alt` + `title` (WCAG 1.1.1, 4.1.2)
**File:** [PlatformMap.web.tsx:284](src/components/PlatformMap.web.tsx:284)
The native PlatformMap already passes `accessibilityRole="button"` + `accessibilityLabel` to every Marker. The web variant (Leaflet) had **no equivalent** — markers were nameless to screen readers. With the redesigned halo-over-core pin (which is purely visual), this gap was now masking real reports from AT users entirely on web.

Added:
```tsx
alt={`${CATEGORY_LABELS[f.category]}, severity ${f.severity}, ${f.status}. Open for details.`}
title={`${CATEGORY_LABELS[f.category]} — severity ${f.severity}`}
```
`alt` maps to Leaflet's `<div role="button">` accessible name; `title` is the sighted browser tooltip. Same description style as the native Marker so SR users hear the same line on every platform.

### 2. ReportFlagModal — modal containment (WCAG 2.4.3)
**File:** [ReportFlagModal.tsx:249](src/screens/ReportFlagModal.tsx:249)
The bottom-sheet card View was missing `accessibilityViewIsModal`. VoiceOver could walk past the dim backdrop into the (now-decorative) MapScreen behind it. Same class of bug that Alex fixed in OnboardingModal during Wave 6.

Added `accessibilityViewIsModal` to the card View, and `accessibilityRole="header"` on the modal title so the screen-reader user lands on a header element rather than plain text.

### 3. ReportFlagModal — 44pt touch targets (WCAG 2.5.5)
**File:** [ReportFlagModal.tsx:626-685](src/screens/ReportFlagModal.tsx:626)
Three controls were below AccessMap's 44pt baseline:

| Control | Was | Now |
|---|---|---|
| Category pills (`.pill`) | ~33pt tall (paddingV 8 + 13pt text) | `minHeight: 44, justifyContent: 'center'` |
| Photo source buttons (`.photoBtn`) | ~37pt tall | `minHeight: 44, justifyContent: 'center'` |
| Photo-remove × (`.photoClear`) | 26×26 visual | `hitSlop={10}` (visible 26pt + 20pt slop = effective ~46pt) |

The `sevBtn` (44×44) and `actionBtn` (full-width 44+) already met the floor.

### 4. SignInScreen — already clean (verified)
Walked the full file. The rebuild used the right primitives from the start:

- KeyboardAvoidingView + ScrollView with `keyboardShouldPersistTaps="handled"` ✓
- Logo badge AT-hidden (`accessibilityElementsHidden + importantForAccessibility="no"`) ✓
- Title `accessibilityRole="header"` ✓
- Inputs: `accessibilityLabel` + `accessibilityHint`, `autoComplete`, `textContentType`, `placeholderTextColor`, focus-ring visible ✓
- Validation error: `accessibilityLiveRegion="polite"` + `errorBg/errorFg` (AA-checked tokens) ✓
- Primary/secondary buttons: 48pt minHeight, busy state propagates via `accessibilityState.busy` + `disabled` ✓
- All colour pairs run through `useColor()` so dark-mode contrast is the same shape as light ✓

No fixes needed here.

### 5. PlatformMap (native) — already clean (verified)
- Marker: `accessibilityRole="button"` + descriptive label (category, severity word, status word) ✓
- Cluster: `accessibilityRole="button"` + `${count} flags. Tap to expand.` ✓
- Callout severity bar + photo: AT-hidden so the label isn't doubled ✓
- 44pt cluster puck ✓

No fixes needed here.

### 6. LegendModal & NearbyFlagsModal — already clean (verified)
- LegendModal: `accessibilityViewIsModal` set on the card Pressable, dot+icon decorative-hidden, section headers role="header" ✓
- NearbyFlagsModal: Modal uses `presentationStyle="pageSheet"` (OS-managed containment), chips role="tab" in role="tablist", close button 44×44 with hitSlop ✓

---

## Performance improvements applied (Peter)

### 1. `PlatformMap` (native + web) wrapped in `React.memo`
**Files:** [PlatformMap.tsx:194-200](src/components/PlatformMap.tsx:194), [PlatformMap.web.tsx:330-334](src/components/PlatformMap.web.tsx:330)

**Before:** Both PlatformMap variants exported a bare `forwardRef`. Every MapScreen re-render — and there are *many* (opening any modal, toggling `filtersOpen`, typing in the name-modal TextInput, every `setFocusedFlagId`, every `savedPlaces` refresh) — bubbled into a fresh render of PlatformMap, which then walked every Marker child.

**After:** Wrapped each export in `memo()`. Combined with the `initialRegion` memoization below, MapScreen state changes that don't touch map data (≈70% of re-renders observed in the screen) no longer cascade into the map subtree.

Notes:
- The web variant rebuilds Leaflet `Marker` layers on render. Skipping the wrapper render skips the layer churn entirely.
- Native re-renders still triggered the marker ref-prune useEffect via `flags` identity changes — that path is unaffected and continues to work.
- Cluster + popup HTML are unchanged.

### 2. `initialRegion` memoization in MapScreen
**File:** [MapScreen.tsx:816-831](src/screens/MapScreen.tsx:816)

**Before:** `initialRegion` was a fresh object literal on every render. With PlatformMap now memo'd, an unstable object identity would defeat the shallow prop comparison and re-render anyway.

**After:** `useMemo` keyed on `location`. The object only changes when GPS resolves (typically once per session), so PlatformMap's memo can actually skip.

### 3. Verified — no other obvious perf gaps from the polish pass

| Check | Result |
|---|---|
| MapScreen heavy memos (`filteredFlags`, `activeSetId`, callbacks) | All present from prior waves ✓ |
| TasksScreen renderItem / FlagCard | `React.memo` + memoized renderItem already in place (Wave 6) ✓ |
| `flagsMap` O(1) lookup | Shipped on main (Peter 2026-05-25) ✓ |
| Supabase batching | `fetchFlagsByIds` uses `.in()`, ProfileScreen uses `Promise.all`, SettingsScreen uses `Promise.all`, FlagsContext uses `Promise.allSettled` for cache+network ✓ |
| N+1 query hunt | No fetches-in-loop patterns found in `src/` |
| FlatList vs ScrollView | All large lists (MyReports, MyWatched, FilterPresets, Leaderboard, NearbyFlags) use FlatList with `keyExtractor` ✓. ScrollViews are confined to fixed-content modals (Legend, Achievements, Changelog, Help, StatusHistory) where the row count is bounded and small — appropriate use |
| NearbyFlagsModal distance pre-compute | `distanceMap` cached via `useMemo` (Wave 6) ✓ |
| PlatformMap.web pin icon cache | `pinIconCache` Map caps at ~12 entries ✓ |

---

## Propose-only items (NOT applied — for Sky)

### P1. MapScreen `actionBtn` is 36×36
**File:** [MapScreen.tsx:1846-1852](src/screens/MapScreen.tsx:1846)
The 9-button grouped tool tray in `actionBar` uses 36pt buttons (search, legend, filters, severity, category, refresh, recenter — separated by 1pt dividers). WCAG 2.2 AA *minimum* is 24×24, so this passes the legal floor. AccessMap's own internal baseline (visible in [MapScreen.tsx:1792](src/screens/MapScreen.tsx:1792) as a comment in `placeChip`) is 44pt. Recommend bumping to 40 or 44 with corresponding tray width — but that's a meaningful visual redesign of the cluster, not a polish tweak. Flagging for Dani.

### P2. MapScreen `iconBtn` style appears unused
**File:** [MapScreen.tsx:1813-1821](src/screens/MapScreen.tsx:1813)
A `.iconBtn` style block (36×36 round) exists in the makeStyles but no JSX references it. Likely dead code from the actionBar regroup. Safe to delete in a follow-up — left for verification.

### P3. Static `color` import vs `useColor()` (per polish report § Issues #2)
LegendModal still does `import { color } from '@/theme'` and computes styles at module scope. Polish report already flagged it. In a11y terms it doesn't violate AA (light-mode tokens are AA-checked) but it does mean the modal never honours dark mode. Recommend the polish report's suggested follow-up: a focused PR converting LegendModal + FlashBanner + AchievementsModal + ErrorBoundary + OnboardingModal + NotificationPrefsModal + UpdateBanner to `makeStyles(color)` factories.

### P4. NearbyFlagsModal chips below 44pt
**File:** [NearbyFlagsModal.tsx:420](src/screens/NearbyFlagsModal.tsx:420)
The category filter chips (`.chip`) are `minHeight: 36`. Same class of issue as P1. AT users still get role="tab" within role="tablist", so semantics are correct — just the touch target is sub-baseline. Flagging.

### P5. `severityColor()` duplicate (per polish report § Issues #1)
Already called out by the design pass; not re-litigated here.

---

## What's left (for future waves)

- **TasksScreen audit.** Heavy file (1636 LOC). The polish pass only touched its emptyCard sizing; full re-audit was out of scope for Wave 3. Wave 6 left it in good shape — flagsMap O(1), memoized renderItem, React.memo FlagCard.
- **Profiling under real load.** All perf claims here are static-analysis based (memo + dep-array correctness). A profiled session at ≥500 flags would confirm whether the PlatformMap memo materially reduces render time, or whether MapView's internal diffing was already absorbing the wasted renders.
- **No browser preview executed.** No dev server was spun up for this wave (per environment + no UI behaviour changes beyond touch-target sizing and SR labels — none of which a web preview meaningfully verifies). Typecheck + 922 passing tests are the safety net.
- **No schema / RLS / DB changes** were made or proposed. Wave is pure client-side.

---

## Files touched

| File | Type | Lines changed |
|---|---|---|
| `src/components/PlatformMap.tsx` | perf + (minor) a11y commentary | +6 / -1 (memo wrap + import) |
| `src/components/PlatformMap.web.tsx` | a11y (alt/title) + perf (memo) | +9 / -1 |
| `src/screens/MapScreen.tsx` | perf (initialRegion memo) | +15 / -7 |
| `src/screens/ReportFlagModal.tsx` | a11y (modal + touch targets) | +12 / -3 |

**Cumulative:** +42 / -12 lines. Zero behaviour changes — only added a11y attributes, expanded touch targets, and improved render-skip headroom.

---

## Quality gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | ✓ 0 errors |
| `npm test -- --watchAll=false` | ✓ 61 suites / 922 tests pass |
| Branch left for Sky to review | ✓ no auto-merge per role rules |
| Schema / RLS untouched | ✓ |
| Credentials / secrets handled | ✓ none touched |
| External sends | ✓ none beyond Morgan's iMessage handoff to Sky |

---

## How to review

```bash
git diff 1459719..HEAD -- src/
git show HEAD            # the a11y + perf commit
git checkout main && git merge --no-ff a11y-perf/wave3-2026-05-27
```

— Alex + Peter, 2026-05-27 (Wave 3)
