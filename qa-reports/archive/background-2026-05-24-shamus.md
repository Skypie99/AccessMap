# Shamus — Background Feature Spec — 2026-05-24

**mode:** background
**model_tier:** sonnet-4.6
**project:** AccessMap
**cycle_id:** shamus-feature-bg-2026-05-24
**role:** Shamus (Feature Engineer)
**branch:** none (AUDIT-ONLY per Const. 12.5 — AccessMap is privacy-sensitive)
**halt_check:** `~/.claude/BACKGROUND_HALT` absent at cycle start

---

## TL;DR

Branch safety audit + Cycle C Dark Mode spec. Two deliverables:

1. **CRITICAL: 2 branches (`perf/auto-2026-05-24`, `cycle/auto-2026-05-24`) are dangerously
   stale and will DELETE 33 shipped files if merged.** Do NOT merge them without rebasing first.

2. **7 branches are safe, ready to merge in any order** — all based on current main (`40d7dd2`).

3. **Dark Mode (F1) — Cycle C spec** is ready for the next ACTIVE Shamus run. Full design
   decision, dark palette, token strategy, and scoped phase-1 plan below.

---

## Section 1 — CRITICAL BLOCKER: Two Dangerously Stale Branches

Both branches were created off `f88f7fe` (the 2026-05-23 Morgan PM briefing commit), before Cycle A,
Cycle B, and the fastloop series were merged to `main`. They have NOT been rebased since.

### What happens if you merge them now

`git diff main..<branch> --name-status | grep "^D"` returns 33 deleted files on BOTH branches:

```
D  src/components/FilterPresetsModal.tsx        ← entire Filter Presets feature
D  src/components/OnboardingCards.tsx            ← onboarding cards
D  src/screens/SettingsScreen.tsx                ← Settings hub (F3)
D  src/lib/addressRecents.ts                     ← R14
D  src/lib/changelogExpanded.ts                  ← R12
D  src/lib/confirm.ts                            ← cross-cutting confirm helper
D  src/lib/dataExport.ts                         ← Export my data
D  src/lib/directionsLink.ts                     ← R2 get-directions
D  src/lib/feedbackFilter.ts                     ← R15
D  src/lib/filterPresets.ts                      ← F4 filter presets
D  src/lib/helpSearch.ts                         ← R10 help search
D  src/lib/myReportsFilter.ts                    ← R13
D  src/lib/nearestFlag.ts                        ← R9
D  src/lib/onboardingState.ts                    ← F2 onboarding state
D  src/lib/reputationTier.ts                     ← T4 reputation tiers
D  src/lib/shareFlag.ts                          ← share-a-flag
D  src/lib/taskSelection.ts                      ← bulk-select (Cycle B)
D  src/lib/tasksSort.ts                          ← R7 tasks sort
D  + 13 test files for all of the above
```

This would silently undo roughly 3 weeks of feature work in a single merge commit.

### Each branch's actual content (what's worth saving)

| Branch | Tip commit | What it actually builds | Verdict |
|---|---|---|---|
| `perf/auto-2026-05-24` | `acee1cf` | 4 memoization commits (nearby row, activity feed row, MyReports/MyWatched rows, profile achievements) + docs | **Rebase onto main first, then re-verify** |
| `cycle/auto-2026-05-24` | `25862c6` | Tasks "All / Mine" scope toggle + map-filter reset polish + 7 tests | **Rebase onto main first, then re-verify** |

### How to fix (Sky action)

```bash
# For each stale branch — rebase onto current main, re-run checks
git checkout perf/auto-2026-05-24
git rebase main      # resolve any conflicts
npm run typecheck    # must be zero errors
npm test             # must be green
# repeat for cycle/auto-2026-05-24
```

The content on these branches is genuinely useful — the memoization and scope-toggle work
should land once they're on the current base. The stale base is the only problem.

---

## Section 2 — Branch Merge Queue (7 Safe, All Green Base)

All of the following branches are based off `40d7dd2` (current main HEAD). They can be merged
in any order, each individually.

| Branch | Commit | What it ships | Schema req? | Merge order note |
|---|---|---|---|---|
| `feat/status-history-2026-05-24` | `79544b9` | StatusHistoryModal — audit trail for flag lifecycle (T1) | Yes — `supabase/migrations/2026-05-24_status_history_table.sql` | Merge first; the SQL apply is separate (Sky's hand) |
| `feat/time-of-day-tags-2026-05-24` | `7da774c` | Context tags (morning rush, high tide, slippery, etc.) on ReportFlagModal (C4) | Yes — `supabase/migrations/2026-05-24_flag_context_tags.sql` | Both migrations can be applied together |
| `chore/lift-shared-modals-2026-05-24` | `eaf59be` | CL1 — lifts 4 modals (Help, Changelog, NotifPrefs, Feedback) to single RootNavigator mount; eliminates double-mount + shared context lib | None | Merge before `brandtext` (touches ProfileScreen/SettingsScreen + RootNavigator) |
| `chore/brandtext-theme-token-2026-05-24` | `1 commit` | CL2 — adds `color.brandText` (#1c4f99, 7.6:1 on white) token; migrates 3 call sites off the AA-fragile `color.brand` on small text | None | Merge after CL1 if touching same files |
| `feat/decorative-glyph-2026-05-24` | `ff44775` | Velocity F1 — `DecorativeGlyph` a11y wrapper + Android-fix sweep at 12 callsites | None | Independent |
| `chore/placeholder-text-token-2026-05-24` | `6fa4a76` | Velocity F2 — `color.placeholderText` token; fixes 4 AA-failing placeholder callsites | None | Independent |
| `feat/search-input-row-2026-05-24` | `c7cead9` | Velocity F3 — `SearchInputRow` shared component (R10/R13/R14 search inputs are near-identical) | None | Independent (ships unused until consumers adopt it) |
| `docs/velocity-2026-05-24` | `9ddacb2` | Will's FEATURES.md + LEARNINGS.md corrections from velocity triage | None | Merge last (corrects stale entries that other merges resolve) |

**Note on the two SQL migrations:** Both are idempotent and propose-only. They can be applied in
the Supabase dashboard SQL editor at any time after their client branches land on main.
The client code degrades gracefully until the migrations are applied.

---

## Section 3 — Cycle C: Dark Mode (F1) — Implementation Spec

Designated as the "Cycle C" feature in the expansion plan: "F1 Dark mode (system / light / dark) —
needs theme refactor; treat as cycle theme."

**Accessibility note (first:** dark mode is an accessibility feature, not just a preference.
Low-vision users with photosensitivity, migraines, and contrast sensitivities rely on it. Ship it
right — every surface must be correct, and "mostly dark" is not acceptable for this app.

### What it does (user-visible)

- **Three preference options:** System / Light / Dark, stored per-device via AsyncStorage.
- Selecting "System" (default) follows the OS dark/light mode switch.
- Selecting "Light" or "Dark" locks the app regardless of OS setting.
- The preference toggle lives in **Settings → Appearance** (new row in the Preferences section).
- Every screen, modal, and component adapts in real-time when the preference changes.
- Map tiles: on web (react-leaflet) swap to OSM dark tiles; native maps can't be fully
  darkened without a paid API, so we use RN's `userInterfaceStyle: 'dark'` which darkens
  the chrome (status bar, labels) — an explicit note to the user ("map tiles remain light")
  is acceptable and honest.

### Architecture decision — ThemeContext with lazy StyleSheets

The current pattern:
```ts
// Imports static object at module load. Can't react to scheme change.
import { color } from '@/theme';
const styles = StyleSheet.create({ container: { backgroundColor: color.surface } });
```

The new pattern:
```ts
const { color } = useTheme();  // reads from context, re-runs on scheme change
const styles = useMemo(
  () => StyleSheet.create({ container: { backgroundColor: color.surface } }),
  [color]                      // re-creates styles when palette flips
);
```

Why ThemeContext (not just `useColorScheme` inline):
- Gives us the three-way preference (System/Light/Dark) that `useColorScheme` alone doesn't
- Single source of truth for the preference — no prop-drilling
- `useMemo` on StyleSheet.create is the React Native convention for dynamic colors; works
  without adding any new dependencies

### Files to create (Phase 1 — infrastructure + one screen)

| File | What it does |
|---|---|
| `src/lib/themeContext.tsx` | `ThemeProvider`, `useTheme()` hook, system/override logic |
| `src/lib/themePrefs.ts` | `getThemePreference()`, `setThemePreference()`, `useThemePreference()` via AsyncStorage key `@accessmap/theme_v1` |
| `src/lib/__tests__/themePrefs.test.ts` | ~8 unit tests (persist, hydrate, default, invalid value) |
| `src/theme.ts` (modify) | Add `darkColor` export — a Partial<typeof color> override map for dark mode |

### Dark color palette (proposed)

These are derived from Apple's UIColor dark system palette + validated for WCAG 2.2 AA pairings.

| Light token | Dark override | Ratio (on darkest bg) |
|---|---|---|
| `surface: '#fff'` | `'#1c1c1e'` | — |
| `surfaceMuted: '#f7f9fc'` | `'#000'` (pure OLED black) | — |
| `surfaceSoft: '#f7f8fa'` | `'#2c2c2e'` | — |
| `surfaceNeutral: '#eef1f5'` | `'#3a3a3c'` | — |
| `overlay: 'rgba(255,255,255,0.97)'` | `'rgba(30,30,30,0.98)'` | — |
| `scrim: 'rgba(0,0,0,0.4)'` | `'rgba(0,0,0,0.65)'` | — |
| `textStrong: '#222'` | `'#f5f5f7'` | 16.8:1 on #1c1c1e |
| `text: '#333'` | `'#e5e5ea'` | 13.7:1 on #1c1c1e |
| `textMuted: '#666'` | `'#98989d'` | 4.6:1 on #1c1c1e ✅ AA |
| `textSubtle: '#999'` | `'#636366'` | 2.8:1 on #1c1c1e ⚠️ keep non-essential-only rule |
| `textOnBrand: '#fff'` | `'#fff'` | unchanged |
| `brand: '#2f80ed'` | `'#4a9eff'` | 3.4:1 on #1c1c1e (UI/large only — same rule) |
| `brandText: '#1c4f99'` | `'#80bcff'` | 7.7:1 on #1c1c1e |
| `brandSoft: '#d6e6f9'` | `'#1a3a5c'` | — |
| `brandOnSoft: '#1c4f99'` | `'#80bcff'` | 7.7:1 on #1a3a5c |
| `statusOpenBg/Fg` | `'#3a2510'` / `'#fbbf72'` | 7.1:1 |
| `statusVerifiedBg/Fg` | `'#1a3a5c'` / `'#80bcff'` | 7.7:1 |
| `statusResolvedBg/Fg` | `'#183024'` / `'#6ed8a0'` | 6.8:1 |
| `statusRejectedBg/Fg` | `'#2a2a2c'` / `'#b0b0b5'` | 7.2:1 |
| `success: '#27ae60'` | `'#34c77b'` | — |
| `warningBg/Fg` | `'#2a1f00'` / `'#ffc84a'` | 9.2:1 |
| `error: '#c0392b'` | `'#ff6459'` | — |
| `errorBg/Fg` | `'#2a0d0d'` / `'#ff9b96'` | 7.4:1 |
| `border: '#e5e5e5'` | `'#38383a'` | — |
| `borderStrong: '#d0d4dc'` | `'#48484a'` | — |
| `borderSubtle: '#dde2ea'` | `'#2c2c2e'` | — |
| `divider: '#ddd'` | `'#38383a'` | — |

Tokens NOT overridden (same in dark): `shadow`, `severity[1..5]`, `a11y`, `spacing`, `radius`, `font`.
Severity colors stay the same — they're already high-contrast and colorblind-safe with icon+text redundancy.

### Scope for Phase 1 (single Shamus run, ~3-4 hrs wall)

Build the infrastructure + migrate one screen to prove the pattern:

1. **`src/lib/themePrefs.ts`** — AsyncStorage helper, `useThemePreference()` hook.
   ~50 lines + ~8 tests.

2. **`src/lib/themeContext.tsx`** — `ThemeProvider` + `useTheme()`. Wraps `useColorScheme` from
   react-native. Returns the full `{ color, spacing, radius, font, shadow, severity, a11y }` tuple.
   ~80 lines. No tests needed (React context plumbing — integration-level only).

3. **`src/theme.ts`** (modify) — Add `export const darkColor: Partial<typeof color> = { ... }` using
   the palette above. Keep `color` as the light default. `ThemeProvider` merges the two.

4. **`App.tsx`** (modify) — Wrap `<RootNavigator>` with `<ThemeProvider>`.

5. **`src/screens/SettingsScreen.tsx`** (modify) — Add Appearance section: System / Light / Dark
   segmented control. Calls `setThemePreference()`. Reads current value from `useThemePreference()`.
   Style via `useTheme()`.

6. **`src/screens/ProfileScreen.tsx`** (modify) — Migrate from `import { color } from '@/theme'`
   to `const { color } = useTheme()`. StyleSheets wrapped in `useMemo`. ~30 min effort; proves
   the migration path.

**Phase 1 does NOT migrate:** MapScreen, TasksScreen, SignInScreen, modals (17 components), ReportFlagModal. These are Phase 2.

**Phase 1 acceptance criteria:**
- TypeScript: zero errors
- Jest: all existing tests pass; 8 new themePrefs tests pass
- ProfileScreen and SettingsScreen visually flip when toggling System/Light/Dark in Settings
- Focus sequence in the Appearance control is announced correctly to VoiceOver (role: radiogroup)
- The three-way preference persists across a force-quit + relaunch

### Phase 2 (next Shamus run after Phase 1 merges)

Systematic migration of remaining screens + components. Suggested order (simplest to hardest):
1. `SignInScreen` — few styles, good warm-up
2. `TasksScreen` — medium complexity, no map
3. All modals (`src/components/`) — 18 files; can be batched in one run
4. `ReportFlagModal` — complex but self-contained
5. `MapScreen` — hardest (many inline styles + overlay panels). Leave for last.

### Hardcoded literal cleanup (runs alongside Phase 2)

There are **574 hardcoded color literals** across 24 files. Most are `#fff`, `#222`, `#333`,
`#666`, `#2f80ed`, `#eef1f5` — all have direct token equivalents. The migration is mechanical
but must be done before a file can reliably flip to dark mode. A "token-first" pass on each
file before the `useTheme()` migration keeps the diffs reviewable.

Most common literals and their tokens:
| Literal | Token |
|---|---|
| `'#fff'` | `color.surface` |
| `'#f7f9fc'` | `color.surfaceMuted` |
| `'#f7f8fa'` | `color.surfaceSoft` |
| `'#eef1f5'` | `color.surfaceNeutral` |
| `'#222'` | `color.textStrong` |
| `'#333'` | `color.text` |
| `'#666'` | `color.textMuted` |
| `'#999'` | `color.textSubtle` |
| `'#2f80ed'` | `color.brand` |
| `'#e5e5e5'` | `color.border` |
| `'#ddd'` | `color.divider` |
| `'#000'` | `color.shadow` |
| `'#c0392b'` | `color.error` |
| `'#27ae60'` | `color.success` |
| `'#e74c3c'` | `color.errorStrong` |
| `'#1c4f99'` | `color.brandText` (after CL2 merges) |

New unknowns: `#eaf3ff` (no token yet — soft brand-blue bg, could be `brandSoft`),
`#5b6470` (no token — mid-tone gray, close to textSubtle), `#888` (no token — mid-gray),
`#555` (no token — dark mid-gray). These 4 may need new tokens when encountered.

### Map tile strategy (web vs native)

- **Web (react-leaflet):** Swap the OSM tile URL to `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
  (CartoDB Positron Dark, free, no API key). Attribution stays per OSM rules. Switch based on the
  active theme from context.
- **Native (react-native-maps):** Pass `userInterfaceStyle={activeScheme}` to `<MapView>` — this
  adjusts the RN-managed chrome (status bar text, label contrast) but NOT the tile imagery.
  Apple Maps in dark mode on iOS does darken natively via the OS, but we don't control it.
  Show a subtle info note in the Appearance settings: "Map tiles may not follow dark mode."
  Do NOT block the feature on a paid tile API.

---

## DECISIONS FOR SKY

| # | Decision | Impact | Recommendation |
|---|---|---|---|
| D1 | **URGENT: Rebase `perf/auto-2026-05-24` and `cycle/auto-2026-05-24` before merging.** Merging either branch today destroys 33 shipped files. | Catastrophic data loss | Rebase both; re-verify typecheck + tests |
| D2 | **Merge order for the 7 safe branches.** No hard dependencies, but `chore/lift-shared-modals` before `chore/brandtext-theme-token` if they touch the same ProfileScreen/SettingsScreen lines. | Minor conflict risk | Merge CL1 first, then CL2 |
| D3 | **Apply 2 SQL migrations** (`2026-05-24_status_history_table.sql`, `2026-05-24_flag_context_tags.sql`) after their branches land on main. | T1 and C4 features are no-ops until applied | Apply together in one SQL editor session |
| D4 | **Authorize Dark Mode (F1) Phase 1 build.** This run can only spec; the build needs an ACTIVE Shamus run. | Cycle C blocked | Respond "yes" to kick off the build |
| D5 | **Web dark tile attribution.** CartoDB dark tiles require attribution. Our current tile layer already shows OSM attribution — we'd need to add CartoDB attribution. Low risk (same place on map). | Legal/attribution | Accept and add attribution line to PlatformMap.web.tsx |

---

## Carry-forward

- **5 Supabase migrations** still unapplied (unchanged from prior briefings): realtime.sql,
  feedback_table.sql, + 2 new above + 1 from prior cycles. All still your hand.
- **~60 stale feature branches** from prior cycles (branch triage is Sky-only).
- **Quinn/Gary deferred items** from Cycle B (double-mount fix → now built on CL1, the
  brandText token → now built on CL2). Both are in the merge queue above.

---

— Shamus, 2026-05-24 (background mode — AUDIT-ONLY)
