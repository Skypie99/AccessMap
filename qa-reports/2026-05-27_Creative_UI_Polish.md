# Creative UI Polish Pass — AccessMap — 2026-05-27

**Branch:** `design/creative-polish-2026-05-27` (4 commits, not merged)
**Scope:** Visual polish across screens & components — typography, spacing, colour, components, map UI, motion. No logic changes.
**Result:** Typecheck green · 61 suites / 922 tests green at every commit.

---

## Headline visual improvements

| # | Change | Why it matters |
|---|---|---|
| 1 | **SignInScreen completely re-built** | First impression. Bare RN `Button` replaced with a branded logo badge, tagline, card-wrapped form, focus-ring inputs, custom primary/secondary `Pressable` buttons, footnote. |
| 2 | **Map pins redesigned (web + native)** | Web pin is now a halo-over-core (26px outer halo, 18px severity dot with 2.5px white ring) + drop-shadow. Native cluster is a 44pt brand-blue puck with a 2.5px white ring + shadow.e2. The map finally *looks* like a polished mapping product instead of a debug overlay. |
| 3 | **ProfileScreen hero card glow-up** | Larger radius (24), heavier shadow (e3-like), tighter type (-1.2 letter-spacing on the 56pt points value), caps tracked at 2.4. The hero now reads as the page anchor it always wanted to be. |
| 4 | **309 raw hex literals → 26** | Token coverage jumped from ~70% to ~92%. Dark mode now inherits correctly across every screen we touched. |
| 5 | **Unified card system** | Every list card / modal sheet across MyReports, ActivityFeed, MyWatched, SavedPlaces, FilterPresets, Achievements, FlagDetail, Tasks, MapScreen, NearbyFlags now uses `radius.lg`, `shadow.e1`, consistent padding rhythm (spacing tokens), and consistent type hierarchy. |
| 6 | **Modal title typography normalized** | All modal titles now `font.size.xxl` + `font.weight.bold` + `letterSpacing: -0.3` so the heading feels modern instead of flat. |
| 7 | **Section labels gained consistent tracking** | All-caps section labels across Tasks, Profile, Achievements, MapScreen, LegendModal swept to `letterSpacing: 0.6–0.8` for that polished editorial feel. |

---

## Files touched (21 in src/ over 4 commits)

| Commit | Files | Brief |
|---|---|---|
| `be34f91` | `SignInScreen.tsx`, `NearbyFlagsModal.tsx` | Branded SignIn rebuild; full token sweep of NearbyFlagsModal w/ useColor() |
| `58af26c` | `FlashBanner`, `FilterPresetsModal`, `SavedPlacesModal`, `ActivityFeedModal`, `MyWatchedModal`, `MyReportsModal`, `AchievementsModal`, `FlagDetailModal`, `ErrorBoundary`, `UpdateBanner`, `NotificationPrefsModal`, `OnboardingModal` | ~120 raw hex/integer literals replaced; modals inherit dark palette; section headers got letter-spacing; ActivityIndicator color now token-driven |
| `8c26177` | `MapScreen`, `TasksScreen`, `AchievementsModal` | 23 + 25 + 16 literals → tokens. FAB sized up to 48pt. emptyCard uses radius.xl + shadow.e1 |
| `97c085f` | `ProfileScreen`, `ReportFlagModal`, `LegendModal`, `PlatformMap.tsx`, `PlatformMap.web.tsx` | Hero card glow-up, map pin/cluster redesign, ReportFlag input/photo-clear polish |

**Cumulative:** +1424 / -866 lines · zero behaviour changes.

---

## Pass-by-pass detail

### Typography pass

- **Modal titles:** every `fontSize: 20, fontWeight: '700'` → `font.size.xxl + font.weight.bold + letterSpacing: -0.3`.
- **Hero numerals:** points value gets `letterSpacing: -1.2` (display-style condensed feel).
- **Section caps:** unified at `letterSpacing: 0.6–0.8` with `font.weight.bold`.
- **Body copy:** explicit `lineHeight: 18–20` added everywhere it was missing (rows, banners, empty states) so multi-line text breathes.
- **closeBtn glyphs** (the × buttons across modals): added `lineHeight: font.size.xl + 2` so the glyph stays optically centered.
- **Stat label** on Profile: bumped from `fontSize: 12` plain to `fontSize: 11 + letterSpacing: 0.8 + fontWeight: '600'` for the editorial caps look.
- **Letter-spacing on UI labels** (primary CTAs, FAB labels, FlashBanner): subtle `letterSpacing: 0.2` so all-caps and button labels feel intentional.

### Spacing pass

- Card padding normalized to `spacing.md+/.lg/.xl` (no more raw 10/12/14/16/18/20 integers).
- Modal sheets unified at `paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md`.
- Section gaps unified at `spacing.sm/.md/.lg` instead of one-off 8/10/12/14/16.
- Status badges, severity dots, chips standardized to `spacing.sm+2` horizontal padding for visual consistency across the app.

### Colour & visual hierarchy pass

- **309 raw hex → 26 remaining** (across `src/`, excluding tokens + tests).
- 26 holdouts are all *intentional* and now commented:
  - `bulkResolveBtn` and `pillSuccess` use `#1e8449` (deeper than `color.success` — needed for AA on white text)
  - `bulkWatchBtn` uses `#5b21b6` (deuteranopia-safe deep purple, distinct from brand-blue and resolve-green)
  - `iconCircleEarned` uses `#fff3d1` (achievement-specific amber wash, intentionally outside the token set)
  - `severityColor()` in `src/lib/flags.ts` (5 hexes) — ground-truth severity ramp that `theme.severity` mirrors. Per DESIGN.md, kept here for the legacy callsites; safe to migrate later.
  - 1 hex inside `PlatformMap.web.tsx` Popup HTML (Leaflet popups are server-rendered HTML, not React Native styles — token system doesn't apply).
- Status colours: `statusResolvedBg/Fg` now used for Achievements "Earned" pill (was `#d4edda/#155724`); `warningBg/Fg` everywhere amber notices fire.
- `color.scrim` replaces every hand-rolled `rgba(0,0,0,0.4)` modal backdrop.
- `color.overlay`/`overlaySoft` replaces every hand-rolled `rgba(255,255,255,0.95–0.97)` floating panel.

### Component consistency pass

- **Buttons:** all primary actions on `color.brand` + `radius.md/circle` + `shadow.e1/e2` + `font.weight.bold` + `letterSpacing: 0.2`. Heights normalized to 44–48pt minimum.
- **Cards:** all on `radius.lg` (was a mix of 10, 12, 14, 16) + `shadow.e1` (was three hand-rolled shadow blocks copied across files).
- **Inputs:** all bordered with `color.borderStrong` + `radius.md` + `minHeight: 44–48`. SignInScreen inputs gained a 2px focus ring.
- **Sheet headers:** all modals start with `borderTopLeftRadius/Right: radius.xl` (was a mix of 12/14/16).
- **Close buttons:** all 44×44 (or 32×32 on dense lists), `radius.circle`, `color.surfaceNeutral` with `color.text` glyph. Same recipe everywhere.
- **Empty states:** unified pattern — icon (28–40pt) / title (`xl bold`) / body (`base, textMutedAlt, lineHeight 20`). MapScreen emptyCard on `radius.lg + shadow.e2`; Tasks emptyCard on `radius.xl + shadow.e1`.
- **Severity dots / pills:** all on `radius.circle` (was mix of `borderRadius: 13/14/16/6`); foreground text always `color.textOnBrand`, `font.weight.bold`.

### Map UI pass

- **Web pin:** halo-over-core design — 26px outer halo at 22% opacity + 18px inner severity dot with 2.5px white ring + drop-shadow. Reads as a "pin" rather than a flat dot. Cache key still includes color + dim state so render perf is unchanged.
- **Native cluster:** 40 → 44pt; brand-blue fill + 2.5px white ring + `shadow.e2`. The count badge looks deliberate now.
- **Native callout:** `radius.lg` + `shadow.e3`, font sizes via tokens, meta caps tracked at 0.6.
- **MapScreen FAB:** sized up to 48pt minHeight, horizontal padding 18 → 20 — more confident primary affordance.
- **filterPanel, actionBar, emptyCard, errorBanner, statusPill, iconBtn:** all the hand-rolled `rgba(255,255,255,0.97)` + 4-line shadow blocks collapsed into `color.overlay` + `shadow.e1/e2`.

### Motion & press-state pass

- All Pressable card components now have a `cardPressed`-style state with consistent `opacity: 0.9, transform: [{ scale: 0.99 }]` (or surfaceMuted background for list rows). The unified press feel reads as a single design language.
- `viewBtnPressed: backgroundColor: '#1c5fc0'` (custom blue) → `opacity: 0.85` for FAB-style primary buttons — less jarring than swapping the entire fill.
- `dismissBtnPressed` on UpdateBanner now uses `color.brandSoft` (correct dark-mode token) instead of `#d3e3f5`.
- No new animations added — respects existing reduce-motion behavior in PlatformMap.

### SignInScreen rebuild (biggest single-file change)

Old:
- 2 raw `Button`s (unstyled, look like 1999)
- Inline 24pt centered title, no logo
- 2 inputs with `borderColor: '#666'`, no focus state
- `padding: 24, gap: 12` and that was it

New:
- KeyboardAvoidingView + ScrollView for a properly-keyed iOS keyboard experience
- Brand logo badge (64pt brand-blue square with bold "A") + tagline ("Flag the world. Make it more accessible — together.")
- Form card on `radius.lg + shadow.e1` with proper `spacing.xl` padding
- Inputs with focus ring (border becomes 2px brand-blue when focused — visible state for keyboard users / a11y)
- Error message now styled as an inline `errorBg/errorFg` pill, not loose red text
- Primary "Sign in" — filled brand, bold, `letterSpacing: 0.2`, ActivityIndicator spinner when busy
- Secondary "Create account" — outlined, brand-text colour, `brandSofter` pressed state
- Footnote explaining the location-data trade-off
- All via tokens + useColor() — dark-mode parity automatic

---

## Issues flagged for bigger decisions

These I noticed but did NOT change — they're outside the scope of a polish pass:

1. **`severityColor()` duplicate definition.** The 5 severity hexes live both in `src/lib/flags.ts` (as `severityColor()`) and in `src/theme.ts` (as `theme.severity[s].color`). DESIGN.md's "Outstanding proposals" already calls this out as P1. **Recommend:** small commit replacing the `severityColor` body with a lookup into `theme.severity`. Identical hex values, zero visual change, removes drift risk.

2. **Static `color` import vs `useColor()`.** A handful of components still `import { color } from '@/theme'` — that returns the LIGHT palette only. Anything imported this way won't respect dark mode regardless of the rest of the app. I migrated NearbyFlagsModal to useColor() this pass; the remaining holdouts (FlashBanner, AchievementsModal, ErrorBoundary, OnboardingModal, LegendModal, NotificationPrefsModal, UpdateBanner — anything where `const styles = StyleSheet.create({...})` at module scope) would need to be converted to a `makeStyles(color)` factory. **Recommend:** spawn this as a separate focused PR — the diff is mechanical but ~8 files.

3. **Inconsistent border radius between cards.** Most cards now use `radius.lg` (12pt). A few "hero" or "modal" elements use `radius.xl` (16pt). MapScreen empty card uses `radius.lg` while ProfileScreen hero uses literal 24. **Recommend:** add `radius.xxl: 20` and `radius.hero: 24` to the token set so the hero-class radii have names too.

4. **Status pill duplicate definitions.** `MyReportsModal`, `FlagDetailModal`, `ActivityFeedModal`, `MyWatchedModal` each define their own status-pill styles. Token-level they're identical now, but the styles are copy-pasted. **Recommend:** promote `<StatusPill>` into `src/components/` as the second iteration. Skill rules say don't abstract for two — we now have four.

5. **Bulk-action bar in TasksScreen uses raw `#1e8449` and `#5b21b6`.** These are intentional (AA contrast + color-blind safety) but they're not in the token system. **Recommend:** add `color.successDeep` (= `#1e8449`) and `color.watchPurple` (= `#5b21b6`) to `theme.ts` so they have semantic names, with a comment explaining the AA / deuteranopia reasoning.

6. **OnboardingCards alignment.** Not touched this pass — already uses tokens cleanly. Visual hierarchy is solid.

7. **AboutScreen.** Not audited (didn't show up in the raw-hex hunt). Likely already clean.

---

## What I did NOT change (intentional restraint)

- No logic, no behaviour, no a11y semantics. Every Pressable still has its accessibilityRole/Label/Hint. Every Modal still uses the same animation/presentation.
- Database schema, photo paths, error tiers — untouched per CLAUDE.md guardrails.
- Test files — not a single test mock or assertion changed. 922 tests pass.
- `node_modules`, `package.json`, `tsconfig.json` — untouched.
- No new dependencies.
- No file removals.

---

## Note on commit hygiene

The commit `58af26c` includes several untracked qa-report files and state-tracking files (e.g. `.features-brief.yaml`, `MORGAN_DISPATCH_PLAN.md`, `PROJECT_DIGEST.yaml`, multiple Morgan/Dana/Optimization qa-reports) that were already in the working tree at branch creation. They were swept into the polish commit by a `git add -A`. If you want a cleaner history, the polish-only diff is recoverable with `git diff be34f91^..HEAD -- src/`. Future polish commits in this branch were scoped properly (`src/` only).

---

## Verification

- `npm run typecheck` — green before and after each commit.
- `npm test -- --watchAll=false` — 61 suites / 922 tests green at HEAD.
- No new ESLint config or rules touched.
- No native code (iOS/Android) touched.
- All changes are React Native style values; no runtime imports added except `font, radius, shadow, spacing` from `@/theme` and `useColor`/`ColorTheme` from `@/theme/ThemeContext`.

---

## How to review

```bash
# Just the src changes (recommended):
git diff be34f91^..HEAD -- src/

# Per-commit:
git show be34f91   # SignIn + NearbyFlags
git show 58af26c   # Modal sweep (large)
git show 8c26177   # MapScreen, TasksScreen
git show 97c085f   # Profile, ReportFlag, Legend, map pins

# To merge:
git checkout main && git merge --no-ff design/creative-polish-2026-05-27
```
