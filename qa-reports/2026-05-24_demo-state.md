# AccessMap — Demo State Report
# 2026-05-24 | Morgan (orchestration)

**Basis:** main `51d0d21` (673 tests, 0 TSC errors) + confirmed gate-green branches in merge queue.
**Purpose:** Functional behavior trace of the confirmed feature set — what a user experiences end-to-end.
**Scope:** Main-confirmed features + cycle/E carry-forward (690 tests, 0 TSC errors). A11y branches noted as overlays. Dark mode shown as architecture-only layer (pending rebase).

---

## 🧠 1. CURRENT SYSTEM STATE

| Dimension | Value |
|---|---|
| `main` HEAD | `51d0d21` |
| Test count on main | 673 / 673 passing |
| TSC errors | 0 |
| Merge queue depth | 7 branches, all gate-green |
| Next expected test count (after cycle/E) | 690 |
| Dark mode | Design Compiler: COMMIT ✅ · jest: 673 ✅ · pending rebase (3 files) |

---

## 🧪 2. DEMO OUTPUT — Functional Behavior Trace

### App Launch

```
[DEVICE BOOT]
  └── App.tsx → AuthProvider mounts
        │
        ├── No active session
        │     └── SignInScreen
        │           · Email + password form
        │           · [a11y/signin ✅] visible labels + accessibilityLabel
        │           · [a11y/signin ✅] border contrast #ccc → #666 (5.7:1, AA)
        │           · [a11y/signin ✅] placeholderTextColor: textMuted (#666)
        │           · [a11y/signin ✅] title: accessibilityRole="header"
        │           · First launch → OnboardingModal (one-time, device-scoped)
        │
        └── Active session
              └── RootNavigator → 4-tab bottom navigation
                    [Map] [Tasks] [Profile] [Settings]
```

---

### Tab 1 — MAP

```
MapScreen (default tab on launch)
│
├── PlatformMap
│     · Native (iOS/Android): react-native-maps + OpenStreetMap tiles
│     · Web: react-leaflet 5 + OSM tiles (react-leaflet@5, --legacy-peer-deps)
│     · Pins: severity-colored circles (1=green → 5=red)
│     · Tap pin → callout bubble:
│           category label, severity badge, status pill,
│           photo thumbnail, "Open in Maps" directions link
│     · Deep-link: accessmap://flag/{id}
│           → animateTo(lat, lng) + showCallout()
│
├── [Address Search bar] → AddressSearchModal
│     [cycle/E ✅] SearchInputRow component
│           · accessibilityRole="search"
│           · accessibilityLabel + accessibilityHint
│           · placeholderTextColor: color.textMuted
│     · Nominatim geocoding (OpenStreetMap)
│     · Search-as-you-type (350ms debounce, 1 req/sec rate limit)
│     · User-Agent header required (API compliance)
│     · Recent searches (addressRecents.ts, AsyncStorage)
│
├── [Filter FAB, bottom-right] → Filter Panel (modal overlay)
│     Filters available:
│       · Category chips (multi-select): Ramp, Surface, Crossing, Signage, Lighting, Other
│       · Severity slider: 1 (Minor) → 5 (Severe)
│       · Status checkboxes: Open / Verified / Resolved / Rejected
│       · Distance radius toggle
│     Preset management:
│       · [Save preset] → named preset (max 5 presets per user)
│       · [Set as default] → auto-applies on app launch
│       · [Quick-apply] → one-tap from preset list
│     Active filter → badge count on FAB icon
│
├── [Long-press on map] → ReportFlagModal
│     · Coordinates pre-filled from press location
│     · Category picker (6 options)
│     · Severity picker (1–5)
│     · Description TextInput
│           placeholderTextColor: color.textMuted (#666, 5.7:1 on white)
│     · Photo: camera capture OR library pick
│           Upload path: <auth.uid>/<timestamp>.<ext> (Storage RLS enforced)
│     · Submit → POST to flags table → points trigger fires (+5 to reporter on verify)
│
└── [Report FAB, bottom-right] → same ReportFlagModal (no coord pre-fill)
```

---

### Tab 2 — TASKS

```
TasksScreen
│
├── Scope toggle (top bar)
│     [All Flags] ←→ [Mine Only]
│     [cycle/E ✅] Persisted device-wide via tasksScope.ts
│           AsyncStorage key: @accessmap/tasks_scope_v1
│           Fail-soft: defaults to "All" on read error
│
├── Sort control (top bar)
│     [Newest] [Oldest] [Severity]
│     Persisted device-wide via tasksSort.ts
│           AsyncStorage key: @accessmap/tasks_sort_v1
│
├── FlatList — FlagCard (memoized)
│     Per card:
│       · SevDot (severity color circle)
│             [a11y/placeholder ✅] decorativeProps triple:
│                   accessible={false}
│                   importantForAccessibility="no-hide-descendants"
│                   accessibilityElementsHidden={true}
│       · Category label, address/location
│       · Severity badge (number + word: Minor/Low/Moderate/High/Severe)
│       · Status pill (color-coded: Open/Verified/Resolved/Rejected)
│       · Thumbnail (if photo exists)
│     Card tap → Map tab: animateTo(lat, lng) + showCallout(flagId)
│
├── Card swipe / action buttons
│     Verify → flag.status: open → verified (+2 pts actor, +5 pts reporter)
│     Resolve → flag.status: → resolved (+5 pts actor, +10 pts reporter)
│     Reject → flag.status: → rejected (0 pts)
│     Details → FlagDetailModal (full info + status history)
│     All actions → FlashBanner:
│           "+X pts earned" (matches points trigger values)
│           [a11y/contrast ✅] green #27ae60 → #1e8449 (AA contrast pass)
│           [a11y/contrast ✅] fontSize 13 → 14, min-height 36 → 44px
│
└── Bulk-select mode
      Enter: long-press any card (or tap entry button)
      Select multiple cards → bulk action dispatch (Verify / Resolve / Reject)
      Exit: tap outside selection or [Cancel]
```

---

### Tab 3 — PROFILE

```
ProfileScreen (auto-refreshes on tab focus)
│
├── Hero card
│     · Total points (integer, from users.points)
│     · Reputation tier: Newcomer / Contributor / Advocate / Champion / Legend
│           Thresholds: 0 / 25 / 50 / 100 / 250 / 500 / 1000
│     · Progress bar to next milestone
│     · Display name TextInput (editable)
│           [a11y/placeholder ✅] placeholderTextColor: color.textMuted
│
├── Visit streak
│     · Consecutive-day counter (streak.ts, AsyncStorage)
│     · Resets if >24h gap between sessions
│
├── Nearest unresolved flag jump card
│     · Computes nearest open/verified flag to current location (nearestFlag.ts)
│     · One-tap → Map tab: animateTo(lat, lng) + showCallout(flagId)
│     · Empty state: "No open flags nearby"
│
├── Status pills (count per status)
│     Open · Verified · Resolved · Rejected · Watched
│
└── Modal gallery (6 modals, tap to open):
│
│   My Reports
│     · List of flags the user created
│     · Status + date + photo thumbnail per flag
│
│   My Watched
│     · Flags the user is watching (watchedFlags.ts)
│     · Update feed per watched flag
│
│   Recent Activity
│     · Chronological status changes across the map
│     · "Since your last visit" grouping
│
│   Achievements
│     · Earned badges (achievements.ts)
│     · Lock state for unearned badges
│
│   Notification Preferences
│     · Push opt-in per category (notificationPrefs.ts)
│     · [a11y/placeholder ✅] placeholderTextColor on any TextInputs
│
│   UpdateBanner settings
│     [a11y/contrast ✅] UpdateBanner: 44px min touch target, AA text
```

---

### Dark Mode Layer — Architecture (pending rebase, NOT on main)

```
ThemeContext.tsx  [feat/dark-mode-phase2-hook-cycle-f — Design Compiler: COMMIT]
│
├── ThemeProvider wraps App.tsx (inside AuthProvider)
│
├── Runtime palette selection
│     useColorScheme() → 'dark' | 'light'
│     Provides: lightColor (current main values) OR darkColor (inverted palette)
│     Re-renders all consumers on system appearance change
│
├── Consumer pattern (26 files migrated)
│     Before: import { color } from '@/theme'
│     After:  const color = useColor()
│     Type:   ColorTheme = typeof lightColor
│
├── Dark palette spot-check (WCAG 2.2 AA verified)
│
│   Surfaces:
│     surface:        #111      (primary dark bg)
│     surfaceSoft:    #222      (inputs, cards)
│     surfaceNeutral: #2a2a2a  (chips, pills)
│     overlay:        rgba(20,20,20,0.97)
│
│   Text (all on #111 surface):
│     textStrong:  #f5f5f5   ~18:1   ✅ AA
│     text:        #ddd      ~13:1   ✅ AA
│     textMuted:   #aaa      ~6.7:1  ✅ AA
│     textSubtle:  #777      ~4.22:1 ⚠️  non-essential/18pt+ only
│
│   Brand:
│     brand:       #2f80ed   (same as light — UI/large text)
│     brandText:   #60a5fa   (AA on dark surface)
│     brandOnSoft: #93c5fd   (4.7:1 on brandSoft #1e3a5f)
│
│   Status (all fg/bg pairs AA verified):
│     Open:     #fbbf24 on #3b2200  ~6.0:1  ✅
│     Verified: #93c5fd on #1e3a5f  ~4.7:1  ✅
│     Resolved: #6ee7a0 on #14361f  ~5.2:1  ✅
│     Rejected: #d1d5db on #2a2a2a  ~7.8:1  ✅
│
│   Misc:
│     shadow: #fff  (inverted — elevation glow pattern)
│             ⚠️ Any shadowOpacity > 0.15 will produce bright white halo
│             Post-merge audit required: confirm all callsites ≤ 0.15
│
└── Rebase blockers (3 files, trivial after cycle/E lands on main)
      SearchInputRow.tsx   — cycle/E creates it; dark mode imports it
      MyReportsModal.tsx   — cycle/E migrates SearchInputRow; dark mode adds useColor()
      AddressSearchModal.tsx — same pattern as MyReportsModal
```

---

## 📦 3. STABLE COMPONENTS LIST

| Component / Module | Git location | Notes |
|---|---|---|
| `App.tsx` | main | AuthProvider + RootNavigator gate |
| `src/navigation/RootNavigator.tsx` | main | 4-tab structure + deep-link handler |
| `src/screens/MapScreen.tsx` | main | Filter panel, FAB, long-press, address search |
| `src/screens/TasksScreen.tsx` | main + cycle/E | Sort + scope + FlagCard list + bulk-select |
| `src/screens/ProfileScreen.tsx` | main | Points, tier, streak, jump card, 6 modals |
| `src/screens/ReportFlagModal.tsx` | main | Flag submission form + photo upload |
| `src/screens/SignInScreen.tsx` | main + a11y/signin | Email/password auth + a11y improvements |
| `src/components/PlatformMap.tsx` | main | Native map wrapper (react-native-maps) |
| `src/components/PlatformMap.web.tsx` | main | Web map wrapper (react-leaflet 5) |
| `src/components/SearchInputRow.tsx` | cycle/E | Reusable accessible search input |
| `src/components/FlashBanner.tsx` | main + a11y/contrast | Points banner + AA color + 44px target |
| `src/components/UpdateBanner.tsx` | main + a11y/contrast | "Since last visit" banner + a11y |
| `src/lib/flags.ts` | main | All flag CRUD, Supabase queries |
| `src/lib/filterPresets.ts` | main | Per-user named presets, 20-cap |
| `src/lib/tasksSort.ts` | main | Newest/Oldest/Severity, AsyncStorage |
| `src/lib/tasksScope.ts` | cycle/E | All/Mine toggle, AsyncStorage |
| `src/lib/nearestFlag.ts` | main | Distance calc for Profile jump card |
| `src/lib/streak.ts` | main | Consecutive-day visit tracking |
| `src/lib/achievements.ts` | main | Badge system |
| `src/lib/watchedFlags.ts` | main | Watch/unwatch flags |
| `src/lib/accessibility.ts` | main | useScreenReader() hook |
| `src/lib/confirm.ts` | main | Web-safe destructive action confirm() |
| `src/theme.ts` | main | Static design tokens (all categories) |
| `src/theme/ThemeContext.tsx` | dark-mode branch | Light+dark palette, useColor(), ThemeProvider |
| `src/types/database.ts` | main | Typed Supabase schema (type, not interface) |

---

## 🚧 4. REMAINING BLOCKERS

| Blocker | Unblock condition | Owner |
|---|---|---|
| 7 branches not on main | Sky runs merge commands | Sky |
| Dark mode rebase (3-file conflict) | cycle/E on main first → then rebase | Morgan/Shamus |
| Cycle F features (8 items) | cycle/E on main + dark mode merged | Shamus |
| Flag editing (Jordan RLS review) | D5 deferred until post-stabilization | Jordan (D5) |
| Clustering (react-native-map-clustering) | Peter bundle validation first | Peter |
| 5 Supabase migrations unapplied | Sky applies via Dashboard SQL Editor | Sky |

**Stale branches to delete (Sky action — NEVER MERGE):**
- `cycle/auto-2026-05-24` — pre-dates Cycles B/C, deletes 33 shipped files
- `perf/auto-2026-05-24` — same base, same risk
- `a11y/placeholder-sweep-cycle-f` — superseded by clean branch
- `worktree-agent-a31117016067fc579` — leftover parallel agent worktree

---

## 🔁 5. NEXT CYCLE GOAL — SINGLE FOCUS

**CYCLE F KICKOFF — dark mode rebase → first carry-forward features**

**Trigger:** Sky merges the 7 queued branches → main reaches 690+ tests.

### Step 1 — Dark mode rebase (~30 min, immediate after cycle/E lands)

```bash
git checkout feat/dark-mode-phase2-hook-cycle-f
git rebase main

# Conflict 1: src/components/SearchInputRow.tsx
#   Take cycle/E's file as base
#   Apply useColor() import: add `import { type ColorTheme, useColor } from '@/theme/ThemeContext'`
#   Apply const: add `const color = useColor()` inside component body

# Conflict 2: src/components/MyReportsModal.tsx
#   Take cycle/E's SearchInputRow migration as base
#   Apply dark mode's useColor() call on top (same pattern)

# Conflict 3: src/components/AddressSearchModal.tsx
#   Same as MyReportsModal

npx tsc --noEmit    # gate: 0 errors
npm test            # gate: ≥ 690 tests
```

Then surface to Sky: "Dark mode rebase complete — ready for merge review."

### Step 2 — First 2 Cycle F carry-forwards (branch: `cycle/F-2026-05-24`)

1. **Remaining SearchInputRow migrations** — MyFeedbackModal (not in cycle/E)
2. **accessibilityHint on SearchInputRow** — hint text for empty-state screen readers

Gate: 0 TSC errors, ≥ 690 tests. Surface to Sky for merge.

### What this unlocks
- Dark mode on main = design system complete for all future features
- Cycle F open = 6 remaining features available to build
- Flag editing gated on Jordan review (D5) — Jordan can now be scheduled

---

*Demo State Report — 2026-05-24 | Morgan (orchestration) | Based on confirmed main + gate-green queue*
