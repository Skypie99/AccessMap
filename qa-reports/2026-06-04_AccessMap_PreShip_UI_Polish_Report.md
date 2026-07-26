# AccessMap — Pre-Ship UI Polish Report
**Date:** 2026-06-04 · **Branch:** `ui-polish/accessmap-preship-2026-06-04` (off `main` `f499fc8`, commit `01aa78a`)
**Scope chosen by Sky:** Surgical finish + verify · **Result:** Build-ready, zero QA-floor regression

---

## DECISIONS FOR SKY

1. **Do NOT merge / I did not merge or push.** Work is committed to the branch only; `main` stays your gate. Review with `git diff main..ui-polish/accessmap-preship-2026-06-04`. Push the branch (or run the build off it locally) when you're ready.

2. **On-device a11y/perf re-check before TestFlight** — this is the one thing I **cannot** self-verify and it should be done because the build ships to testers:
   - **VoiceOver (iOS) + TalkBack (Android):** the 2 HIGH items already in the QA floor (Profile "Real-time updates" switch, Settings "Push notifications" switch, Admin Remove/Dismiss buttons) **plus** the new Card/Pill focus rings via an external keyboard / Switch Control.
   - **Dynamic Type** at the largest size and **Reduce Motion ON** on the touched screens; **60fps** on the map.
   - Recommend a focused **Alex (a11y)** + **Peter (perf)** pass on the changed screens. My changes are low-risk by construction (details below), but on-device screen-reader behavior is genuinely device-only.

3. **Security blockers — NOT a UI task, but they gate the build** (carry-overs from the security gate; all propose-only / yours to apply — nothing in this pass touched the DB, auth, or RLS):
   - Rotate the webhook secret (F0).
   - Apply **F2** (`search_path` + EXECUTE revoke) and **F3** (`flag_photos` INSERT guard) to a preview branch → smoke-test → prod.
   - Drop the duplicate points trigger `trigger_flag_status_change` (the double-points bug).
   - Provision the reviewer test account.

4. **Report delivery:** direct external email is gated (Constitution + the Gmail connector was blocked last session), so this report is saved to **Access Map Summarys** and the repo `qa-reports/`. A copy-paste **Cowork prompt** to email it to yourself is at the end — I did **not** auto-send.

5. **Heads-up on the premise:** the brief described a "deep refinement across the entire app," but the audit found AccessMap was **already ~98% polished** from three prior passes (original tokens + the 2026-06-03 expressive pass `7018bd5` + the 2026-06-04 brand-fonts pass `f499fc8`). You chose the honest **surgical finish + verify** path — so this is a finishing pass that closes the real remaining gaps and re-verifies, not a redesign. If you ever want the bolder aesthetic swing instead, that's a separate, higher-risk call to make *before* (not after) a ship build.

---

## What this pass actually changed (4 files, +58 / −12)

All token-driven, no new dependencies, no new motion, no new colors. Every change re-uses existing design-system tokens.

| # | File | Change | Why |
|---|------|--------|-----|
| 1 | `src/components/ui/Card.tsx` | **Brand focus ring** on tappable cards (keyboard / switch-control focus) | Closes a real WCAG 2.4.7/2.4.11 gap — Button had a ring, Card didn't |
| 2 | `src/components/ui/Pill.tsx` | **Brand focus ring** on interactive pills (filters, chips, toggles) | Same gap; pills are the primary filter control |
| 3 | `src/screens/ProfileScreen.tsx` | **Hairline dividers** between point-history rows | Rows previously ran together; now the list scans cleanly |
| 4 | `src/navigation/RootNavigator.tsx` | Header **Feedback** label `Text` → `AppText` (`label` variant) | The one button the brand-fonts pass missed — now renders the brand font + gets a Dynamic-Type cap |

**How the focus ring works (both Card & Pill):** a `focused` state toggled by `onFocus`/`onBlur`, drawing an absolute overlay `View` just outside the component frame, reusing `a11y.focusRingWidth` / `a11y.focusRingOffset` / `color.brand` — exactly the pattern already shipped in `Button`. It is drawn as an overlay, so **no layout shift**, and it only appears on keyboard / switch-control focus, so **touch users see no visual change at all**. Pure accessibility add.

---

## BEFORE → AFTER, screen by screen

Because three prior passes already lifted every screen to a premium bar, "BEFORE" here is *already-polished*, and "AFTER" is the specific gap this pass closed (or an explicit "verified, no change" where the screen was already at-bar). This is the honest, reviewable picture.

| Screen | Coming in (BEFORE) | This pass (AFTER) |
|--------|--------------------|-------------------|
| **Shared `Card`** | Token surface, soft elevation, press + haptic — but **no visible focus** for keyboard/switch users | **+ brand focus ring** on focus; touch unchanged. Every card across the app (Tasks, Profile, Admin, etc.) inherits it |
| **Shared `Pill`** | Active/inactive states, 44pt hit-slop, press tint — but **no visible focus** | **+ brand focus ring** on interactive pills; non-interactive pills unaffected |
| **ProfileScreen** | Gradient hero, gold progress, tabular stats; point-history rows **stacked with no separator** | **+ hairline dividers** between point-history rows → clean scanning. Hero/stats unchanged |
| **RootNavigator (header)** | Brand-font app-wide — except the **Feedback** button still on raw `Text` | **Feedback now `AppText`** (brand font + DT cap); `#f0f6ff`-on-navy color preserved exactly |
| **MapScreen** | Hairline chrome, `font.tracking.loose` filter headers, **amber** offline banner (`WifiOff`, not error-red) | **Verified — no change.** Offline banner is correctly warm/informational; filter headers already use the loose-tracking token |
| **TasksScreen** | Severity stripe, photo shimmer, badges; 3-variant empty state (`Sparkles` + "All caught up — nice work!") | **Verified — no change.** Empty state already celebratory with icon + title + helpful copy |
| **SettingsScreen** | `AppText` rows, AT-hidden chevrons, real radiogroup appearance picker; icons consistent at 18px | **Verified — no change.** Bumping icons to 20px would *break* the consistent 18px system, not improve it |
| **AdminScreen** | Full token migration in the prior pass (navy hexes → tokens, icon action buttons, severity pill, warm empty state) | **Inherits Card focus ring.** Otherwise already ship-ready |
| **SignInScreen / ReportFlagModal / Leaderboard / About / Resources / Onboarding** | `AppText` + Lucide throughout, complete states | **Verified — no change** (interactive pills/cards within them inherit the new focus ring) |

---

## Verify-or-tweak: read each, changed nothing (on purpose)

The audit flagged three spots to "verify." I read the actual code for each and confirmed they were **already at-bar**, so I made **no change-for-change's-sake edits** (which would only add pre-ship risk):

- **Map offline banner** (`MapScreen.tsx:1114`): `WifiOff` at `color.warningFg` (amber) with a polite live region and calm copy — warm/informational, not alarming. ✓
- **Map filter headers** (`MapScreen.tsx:2087`): already `letterSpacing: font.tracking.loose`. ✓
- **Settings row icons** (`SettingsScreen.tsx`): consistent 18px / `strokeWidth 2.2`, decorative chevrons AT-hidden. ✓
- **Tasks empty state** (`TasksScreen.tsx:887`): three context-aware variants, celebratory default copy. ✓

---

## Second sweep — "polish the polish"

A fresh-eyes residual hunt across the whole app:

- **Legacy icon sets (Ionicons/MaterialIcons/vector-icons/etc.):** **0** — confirmed 100% Lucide.
- **Raw `<Text>` (should be `AppText`):** **6 found** →
  - **1 genuine miss fixed:** the header Feedback button (change #4).
  - **5 deliberately left raw:** all inside native `react-native-maps` `<Marker>`/`<Callout>` views in `PlatformMap.tsx` (cluster count, heat-cell badge, callout title/meta/desc). Native markers rasterize and **freeze** their children (`tracksViewChanges={false}`), so swapping in `AppText` risks **blank/overflowing markers** on font-load or Dynamic-Type re-render — a real rendering regression. They're already screen-reader-handled (decorative props / Marker labels). Leaving them raw is the correct no-new-risk call and matches the project's "map markers are platform-specific" gotcha.
- **Magic-number hexes in screens:** the few that exist (e.g. the dark-header navy `#0d1829`, the `#f0f6ff` tagline) are **documented intentional overrides** for specific dark-hero contexts — out of scope for a surgical pass and risky to "tokenize" blind. Left untouched.

Clean sweep: nothing else meaningful left.

---

## Design system & dark-mode parity

- **No new tokens, no new dependencies.** Everything reuses the existing mature system (`src/theme.ts` + `ThemeContext`): `a11y.focusRing*`, `color.brand`, `color.border`, `radius.lg`/`radius.full`, the `label` AppText variant.
- **Dark-mode parity:** all reused tokens are theme-aware via `useColor()`. The focus ring is `color.brand` in both light and dark (the same AA-verified accent Button already uses); the divider is `color.border` (neutral hairline) in both modes; the Feedback label keeps its explicit dark-hero color. No mode-specific code was added because none was needed.

---

## QA floor preserved — re-verify results

The locked floor (Alex a11y gate: 2 HIGH SR + 8 MED; Steve/Dana security; Peter perf) was preserved **by construction** — this pass touches none of those code paths. Re-verify:

| Check | Result |
|-------|--------|
| **TypeScript** (`tsc --noEmit`) | ✅ clean — at baseline and after every step |
| **Full Jest suite** | ✅ **95 suites / 1564 passed** (1700 incl. 136 todo) — **identical to the pre-change baseline at `f499fc8`** |
| **Contrast** | ✅ no new colors; focus ring = `color.brand` (AA-verified accent, same as Button), divider = neutral hairline, Feedback color unchanged |
| **Visible focus** | ✅ **improved** — added to Card & Pill; none removed |
| **SR labels/roles/states** | ✅ untouched; `onFocus`/`onBlur` are additive (keyboard/switch focus ≠ VoiceOver swipe focus) |
| **Dynamic Type** | ✅ Feedback button gains the `label` cap (small improvement); map markers correctly left unscaled to avoid overflow |
| **Reduced motion** | ✅ no new motion; focus rings are static |
| **Layout shift** | ✅ rings are absolute overlays; divider is a sub-pixel hairline |
| **Performance** | ✅ no new animations/queries/lists; one extra overlay `View` only while focused |
| **Privacy** | ✅ nothing touches location or disability data |

**Cannot self-verify (→ Decision 2):** on-device VoiceOver/TalkBack of the new rings + the 2 HIGH items, large-font, Reduce-Motion, 60fps map.

---

## How to review + EAS build checklist

**Review the code:**
```
git diff main..ui-polish/accessmap-preship-2026-06-04
```
4 files, +58/−12. **Migrations:** none (pure UI pass).

**Before a fresh EAS build (run `eas` from `~/AccessMap`):**
- `eas.json` has **no `//` comments** (EAS v20 rejects them and blocks all commands).
- `appVersionSource=remote`; the production/testflight profile sets `environment=production` (injects Supabase env).
- Confirm Supabase vars exist in the EAS **production** env, or the app launches blank:
  `eas env:list --environment production`
- Apply the security blockers (Decision 3) **before** the build goes to testers.

**On real iOS + Android before TestFlight:**
- VoiceOver/TalkBack + large-font pass on Profile, Settings, Admin, Map, Tasks and the new Card/Pill focus rings (use an external keyboard / Switch Control to see the rings).
- Reduce Motion ON; light + dark mode.
- Smoke-test every key flow: sign in → map → report → triage → profile.

---

## Appendix — audit summary (the "already 98% polished" finding)

- **Git:** all recent bug fixes (EAS config ×4, webhook-secret-via-Vault-RPC, edge-fn JWT, status-pill collapse) are **already merged into `main`** (`f499fc8`); `main` is clean and in sync with origin → branched cleanly from `main`, nothing stranded. (`eas-build-fix` and `qa-steve/*` branches are stale/redundant.)
- **Design system:** MATURE — full light+dark tokens, 3 brand typefaces via expo-font, 8 token-driven primitives with states + dark mode, Lucide-only icons, 349-line `DESIGN.md`. The one real gap was the Card/Pill focus ring (now closed).
- **Note:** the brief listed **Reanimated** as available — it is **not installed**; motion uses RN `Animated` on the native driver. This pass added no motion, so no dependency was needed.
