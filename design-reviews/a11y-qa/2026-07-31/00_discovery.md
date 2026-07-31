# A11Y DEEP QA — STEP 0 DISCOVERY (banked)

**Train:** THE A11Y DEEP QA + FIX TRAIN · **Phase A (audit, read-only)** · first run of this train on AccessMap (no prior `a11y-qa/` ledger exists — self-ledger starts here).
**Date:** 2026-07-31 · **Auditor model:** Fable 5 max effort (provenance tag: every finding in this run is Fable-authored unless marked otherwise).
**Bar:** WCAG 2.2 Level AA floor · house floors where stricter (44pt targets; the repo's own escape/announce/focus laws). Deliberate manual verification of the 2.2-six: 2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8.

## What is being audited (ground truth, verified in-repo)

- **Checkout:** branch `shipready/3-polish-submission` @ `5ab3f0c` ("merge r2/bp11-press-vocab into shipready/3-polish-submission").
- **Topology:** HEAD is **87 commits ahead of `main`** (`512494a`); main is 0 ahead of HEAD (merge-base = main tip). `main == origin/main`.
- **Everything is integrated here:** all `r2/bp1..bp17`, all `r2/mp0..mp5`, all `devicetune/1..4`, `fix/photo-privacy-sanitize`, `fix/severity-badge-aa`, `fix/qa-sweep`, `fix/visual-sweep`, `shipready/2` — all `--merged HEAD`. **Not merged:** `fix/noscript-fallback`, `fix/tasksflagcard-date-flake` (known /ago$/ flake fix), `fix/fmt-xcode26-local-sim`.
- **Consequence for ledger discipline:** this tree is the most-fixed state (what ships when Sky merges). A prior-audit fix that is absent HERE is a real regression finding; a finding already fixed here must not be re-reported.
- **Working tree:** 69 dirty items — all docs/design-review assets, `_to_delete/`, and one deleted-unstaged `.claude/launch.json` (Sky's, untouched). **No `src/` files dirty.** No IN-FLIGHT surfaces declared by Sky at fire time.

## Stack

Expo SDK 54 · RN 0.81 · React 19.1 · TypeScript strict · Supabase (auth/Postgres/RLS/Storage) · react-native-maps (native) / react-leaflet 5 (web) · @react-navigation/bottom-tabs · path alias `@/*` → `src/*`. Web is a real surface (`public/`, `dist/`, `vercel.json`, `docs/BROWSER_COMPATIBILITY.md`); iOS is the submission target.

## Gates (floors this audit runs, never re-litigates)

| Gate | Baseline (Run 3 @ `99faada`, to re-verify at `5ab3f0c`) |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors / **80 warnings** (80 is true; "79" in older docs is stale) |
| `npx jest --ci -w 3` | 186 suites / 2826 passed / 0 failed / 84 todo |
| Arbiter proof sets (ratified) | all exit 0 |
| `GlassSurface.tsx` | PROTECT — 0 changed lines |
| Agent-applied migrations | 0, always |

Gate quirks (inherited, verified in ship-ready HANDOFF): `-w 3` is the deterministic worker cap (timing-heavy suites flake at default); **never `--silent`** (2 false suite failures); `ReportFlagModal.test.tsx` may time out under full-suite load — known class, passes in isolation.

## House laws this audit enforces as floors (from prior trains)

1. **Escape law:** `onAccessibilityEscape` is a **silent no-op on `<Modal>`** in RN 0.81.5 — every escape handler must ride the AVM containment **View**. Guard B2 pins this.
2. **Web reality law:** react-native-web **drops** `accessibilityViewIsModal` + `onAccessibilityEscape` and stubs `setAccessibilityFocus` → native focus/escape work has zero web-observable delta; jest green ≠ device green. Device script is the honest proof.
3. **Focus-return law (G5):** dismissible surfaces return focus via `useSurfaceTrigger` (guard J counts call sites repo-wide).
4. **Touch-target floor:** 44pt/48dp (house, from QA_PLAN_A11Y + HIG); SC 2.5.8's 24px is the hard Blocker floor beneath it.
5. **Contrast law:** measured, never eyeballed; on-glass ink goes through the arbiter proof-set harness; "already shipped elsewhere" is an argument, not a measurement (Run-2 Car-4 precedent).
6. **Copy law:** user-facing strings are PROPOSED/RATIFIED-marked in `copy.ts`; agents never author ratified copy.
7. **Announce law:** status messages announced (4.1.3) — house infra: `src/lib/announce.ts`, `A11yLiveRegion`, `LiveStatusRegion`; mirrors like `COMMENT_HIDDEN_ANNOUNCEMENT`.

## Themes

Light + dark (OS-follow + Settings toggle via `useThemeMode()`); glass surfaces with `glassMode` (reduce-transparency accommodation — verify in lens 6/4). Every measured check runs in both light and dark.

## Surfaces (current, verified against `src/`)

Tabs: Home (r2 editorial) · Map · Tasks · Profile. Screens: SignIn, Onboarding, Settings, About, Resources, HowToHelp, Leaderboard, NotificationPreferences, Admin, Legend, NearbyFlags (SR alternative to the map — first-class path), Terms, Privacy, GuestProfile. Modals/components: ReportFlag, FlagDetail, PhotoLightbox/PhotoGallery, StatusHistory, MyReports, MyWatched, MyFeedback, Feedback, ActivityFeed, Achievements, SavedPlaces, AddressSearch, FilterPresets, Help, Changelog, ReportContent, HiddenComments, HamburgerDrawer, FlashBanner, UpdateBanner, SeverityBadge/Disc, StatusBadge, Sheet/GlassSurface/Input/Button/AppText/Skeleton/ScreenHeader/HeaderActions/PressableScale/OverflowFade/RemoteImage/ScreenStage primitives.

## Known-open items (prior ledgers — NOT new findings of this audit)

- `createAnonFlag` bypasses `containsBlockedTerm` (Apple 1.2(a)) — surfaced Run 3, **Sky's moderation-policy call**.
- B-6 reviewer credentials · SR-021 binary-launch evidence — physical blockers, Sky's.
- D-B6 conditional: Help/About at AX5 on device before Phase-3-complete/merge — **feeds this train's device script**.
- Report submit handoff focus (PROTECT-18/BP12 seam) — SURFACED not fixed → device row D-B15.
- 1.2(a) filter is client-side (🟠) · 1.2(c) comments-only by scope (🟠) — Sky-accepted state.
- `fix/tasksflagcard-date-flake` branch unmerged (the `/ago$/` fixture flake remedy).
- Six `color.brand`-as-text sites measured (Car D): all pass; 1 dead style, 2 inert (SVG chevrons).

## Predecessor audits this run is ledger-aware of

QA_PLAN_A11Y.md (Alex pass 2026-06-01, ~31-surface inventory) · fable-audit (2026-07-04, 20 proposals) · r2-audit + build train BP1–BP17 (DECISIONS.md §P = ground truth) · ship-ready Runs 1–3 (SR-xxx series; 02_ui_a11y_findings, 09_G5_FOCUS_RETURN, 10_CONSERVATION_TABLE) · device-tune Phases 1–4. Exhaustive closed/open/PROTECT distillation: see `01_ledger_baseline.md` (agent-distilled, Fable-verified).

## Output convention

Everything banks to `design-reviews/a11y-qa/2026-07-31/` the moment it completes: per-lens findings files, `MASTER-TABLE.md`, `DEVICE-SCRIPT-DRAFT.md`, `HANDOFF.md` updated at each bank. Evidence tags: `programmatic` / `rendered` / `NEEDS-SKY-DEVICE`. Phase A is read-only on code; no commits; STOP after banking.

## Lens order (limit-death value)

1 automated baseline → 2 SR semantics → 3 keyboard (web surface) → 7a the 2.2-six → 9 claims verdict → 4 contrast → 5 resize/reflow/Dynamic Type → 6 motion → 8 images/media → 7b forms remainder → master table + device script.
