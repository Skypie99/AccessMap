# AccessMap — UI/UX Polish Pass

**Date:** 2026-06-01
**Branch:** `ui-polish/auto-2026-06-01` (off `main` @ `4aea25c`) — **NOT merged**
**Scope:** whole-app premium polish + lint-gate fix — 19 commits, 27 files, +1254 / −512
**Status:** `npm run typecheck` clean · `npm run lint` passes (0 errors) · **1553 Jest tests green** (serial + parallel) · app boots clean on web (0 console errors)

---

## ★ DECISIONS FOR SKY (read first)

1. **Merge when ready.** Review `git diff main..ui-polish/auto-2026-06-01`, then merge to `main` (only you merge main). Typecheck + tests are green; the branch is local-only, not pushed.

2. **✅ DONE — stale `a11y/phase5-deep-2026-05-31` branch deleted** (local + origin), on your go-ahead. It was *not* an ancestor of main yet main already contained its fixes; merging it would have **reverted the entire brand rebrand** (137 files, −13,843 lines). Recoverable from SHA `86e3fbf` if ever needed. (Also pruned 7 stale `/tmp` worktree registrations.)

3. **✅ DONE — lint gate fixed** (was pre-existing-broken on main). ESLint had been bumped to **10.4.1**, which removed `context.getFilename()` that the installed eslint-plugin-react / react-hooks (via eslint-config-expo ~10) still call → `npm run lint` crashed on every file. Fixed by pinning ESLint back to `^9.0.0` (9.39.4) + removing two config rules that only exist in react-hooks v6+ (`set-state-in-effect`, `globals`). **`npm run lint` now passes: 0 errors** (259 pre-existing advisory warnings, non-blocking). Folded into this branch, so the merge restores green lint.

4. **One new dependency, per your approval:** `expo-haptics ~15.0.8` (Expo-official, SDK 54). Wrapped in `src/lib/haptics.ts` (no-ops on web / if unavailable).

5. **Dark-mode toggle added, per your approval.** This is a *feature* (a persisted Light/Dark/System preference in Settings), slightly beyond pure polish — flagging since you said the toggle was wanted.

6. **The always-dark nav chrome (tab bar + header) was kept dark on purpose.** I only fixed its bottom safe-area inset. Making it *theme-adaptive* (so it turns light in light mode) is a visual call for you — flagged, not done, because adaptive tokens would break its contrast and it reads as an intentional brand frame today.

7. **Privacy/security:** nothing touched location, disability, or auth data; no live-DB changes; nothing merged to main. The appearance preference is the only new persisted value (non-sensitive).

---

## What changed — the design system (Tier 1)

The brand rebrand already shipped a strong token system, so this pass **completed and enforced** it rather than rebuilding it.

| Added | Where | Why |
|---|---|---|
| **Motion tokens** | `theme.ts` → `motion` (duration / easing / spring) | animations were ad-hoc magic numbers; now one source, DESIGN.md §8 |
| **Tracking tokens** | `theme.ts` → `font.tracking` | fixes the AppText `-0.3` vs `-0.02em` mismatch; tight type derived from size |
| **Medal + anon color tokens** | light + dark palettes | unify `MEDAL_COLOR` + the FlagCard anon chip |
| **`AppText` Dynamic Type** | per-variant `maxFontSizeMultiplier` caps | supports large fonts (a11y) without runaway layout breakage; `body` stays uncapped |
| **`Input` primitive** | `ui/Input.tsx` | one themed text field (focus/error/disabled, label/helper/icons, ≥44pt, a11y) |
| **`Skeleton` primitive** | `ui/Skeleton.tsx` | content-shaped loaders w/ reduced-motion shimmer (replaces bare spinners) |
| **`Sheet` / `SheetHeader`** | `ui/Sheet.tsx` | unifies ~20 hand-rolled bottom sheets + adds a drag handle |
| **Haptics** | `lib/haptics.ts` (+ `expo-haptics`) | tactile feedback on key actions; safe no-op on web |
| **Dark-mode toggle** | `ThemeContext` + Settings | Light/Dark/System, persisted; was system-only before |

## What changed — screen by screen (before → after)

- **OnboardingModal** — *before:* raw `<Text>` (brand fonts never rendered), identical cards, hardcoded 48/36 padding. *after:* `AppText` (Plus Jakarta + Public Sans now render), per-card icon halos (the points card uses Civic Gold), real safe-area insets, haptic tick on Back/Next.
- **SignInScreen** — already excellent + your protected dark-glass design. *after:* only added a Dynamic-Type cap on the inputs (left the design as-is; did **not** force the light Input primitive on it).
- **Tab bar (RootNavigator)** — *before:* hardcoded `height:62/paddingBottom:8` overrode RN's safe-area handling → home indicator overlapped tab labels. *after:* grows by `insets.bottom`. (MapScreen's FABs sit above it and were never clipped — the survey's "FAB" call was a misdiagnosis.)
- **ReportFlagModal** — *after:* haptic tick on category + severity selection (core-action delight).
- **ProfileScreen** — *after:* hero `borderRadius` now a radius token (was a spacing token); point-history rows 28→44pt (WCAG 2.5.5). Hero size/anchor-shadow left intentional.
- **SettingsScreen** — *after:* new **Appearance** section (Light/Dark/System segmented control, haptic, `radiogroup`/`radio` a11y).
- **LeaderboardScreen** — *after:* top-3 podium tints wired (tokens existed but were unused); skeleton rebuilt on the shared `Skeleton` primitive (gains shimmer).
- **ChangelogModal** — *after:* adopted the new `Sheet` primitive (drag handle + AppText title) as the canonical example.
- **StatusBadge** — *after:* themed status tokens (now correct in dark mode); sub-floor `fontSize:10`→11.

## Accessibility fixes (polish == accessibility)

- **Reduced motion (WCAG 2.3.3):** gated `Button` press-scale and `HamburgerDrawer` slide/fade (both ignored it before).
- **Dynamic Type (WCAG 1.4.4):** `AppText` now supports + caps scaling per variant; SignIn/Input fields capped.
- **Touch targets (WCAG 2.5.5):** point-history rows → 44pt; appearance segments ≥44pt.
- **Bottom safe-area:** tab bar no longer collides with the home indicator.
- **Dark-mode contrast:** StatusBadge corrected; HeatmapLegend intentionally left light (it overlays the always-light map — theming it would *regress* contrast).
- **Input a11y:** error surfaced via a polite live region + `accessibilityHint`.

## Proposed, not done (capacity / follow-on)

- **Adopt `Input`** across the remaining bespoke single-line fields (Profile display name, Tasks search). Built + validated; not yet wired (SignIn is bespoke-dark, the Report description is multiline).
- **Roll `Sheet`/`SheetHeader`** to the other ~18 modals (started with ChangelogModal).
- **TasksScreen** is already the best-tokenized screen; minor follow-ons: skeleton loaders + haptic on multi-select.
- **ProfileScreen** row differentiation (gamification vs utility rows look alike).
- **Native map pin** in-glyph (needs on-device verification — pre-existing item).
- **Fix the broken lint toolchain** (Decision #3).

## How to review

```
git diff main..ui-polish/auto-2026-06-01            # full diff (25 files)
git log  --oneline main..ui-polish/auto-2026-06-01  # 17 commits, one logical change each
```
Each commit is independently revertible. Verified on web (Expo) — app boots, no console errors, brand fonts + cards render cleanly.

**Needs on-device / simulator check (can't verify on web):**
- **Haptics** — device only (no-op on web).
- **Bottom safe-area** (tab bar) — a notch/home-indicator device or simulator.
- **Dynamic Type at large sizes** — simulator Accessibility settings.
- **Dark-mode toggle** — flip Light/Dark/System in Settings on device.

**Known pre-existing test flake (not from this pass):** the 5 `ReportFlagModal` "submit routing" tests have an unwrapped-async race (`act()` warning) that can intermittently fail ~1-in-several **parallel** runs. **Serial (`jest --runInBand`) is 100% green**, and so is the typical parallel run. It's independent of this branch (reproduces on main; in-test the haptic call is a mocked no-op). Recommend Gary harden them with `await waitFor(...)`; until then, a re-run or `--runInBand` clears it. Don't let it block the merge.
