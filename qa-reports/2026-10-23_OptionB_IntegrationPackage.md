# Option B — Web Performance Integration Package (2026-10-23)

```
workspace: /Users/skypie/Desktop/Flagstone sprint/Option-B-20261023.D9ZaRZ/AccessMap
branch:    perf/optionb-2026-10-23 (local only — nothing pushed)
base:      main @ 6195bf01d555a5d94185f3ff51995f877561e5e1
           (verified == origin/main via live git ls-remote, 2026-10-23)
base tree: 3739927399c8f37d53392756bcac2e876be41c5a
driver:    MiMo 2.6 Pro · performance-scalability workflow
```

Scope executed: the deferred Option B website improvements (first-launch load
reduction + Lighthouse remediation for QD-1/QD-2/QD-3), implemented as the
smallest website-only changes that are independently safe, plus this
integration package. No pushes, no merges, no deploys, no native releases, no
backend/DB changes, no portfolio-repo access.

---

## 1. Completed improvements (exact local commits)

All commits local on `perf/optionb-2026-10-23`, in order:

| # | Commit | What |
|---|--------|------|
| 1 | `cec00d46b7c9160c7a0b1fcf89c4739ce55abb07` | Welcome-first font gate + `font-display: swap` on all 8 web faces (**QD-1**). Web gate: welcome waits for its 3 faces, everything past the cards waits for all 8. Native behavior unchanged by construction. |
| 2 | `06833790be7f3503d17a1de96fff8b5db7d20868` | Preload the welcome's 3 font faces from `public/index.html` + `welcomeFontPreload.guard.test.ts` (pins preload set to `welcomeFonts`, re-hashes installed `.ttf` MD5s). |
| 3 | `b6a348753250b899b135ce79239dc041ef3d23f9` | Platform-split `GestureRoot` / `SignInWall`: keeps react-native-gesture-handler (~192 KB raw) + hammer.js (~26 KB) + `SignInScreen` out of the web entry. Native re-exports the exact same components. |
| 4 | `7fc188ff5cbe640a1e022ac748134b14e82ba838` | The app loads as **one lazy navigator chunk** behind the welcome (**QD-2** core), with chunk prefetch at Skip/Continue (avoids the measured +2.2 s Skip regression) and `deferredScreens.web.ts` putting Settings/Admin/Report/FlagDetail inside that chunk (avoids Expo's eager `__common` chunk on the first-launch page). Native: plain re-export + unchanged dynamic imports. |
| 5 | `71cb43e074aa93580f58400fe2d70012ba8dafb8` | `expo-notifications` downloads on demand on web (`loadNotifications.web.ts`); native keeps the identical synchronous `require()`. 6-test suite covers both paths. |
| 6 | `5f2deda733c80dcc695bb88e298e4d128de3e73c` | **QD-3**: `--source-maps` in the deployment build (`vercel.json`) **and** the CI audit build (`lighthouse.yml`), deliberately identical so the audit can never pass on fixture/deployment divergence. |
| 7 | *(this receipt + perf report)* | Documentation only. |

Net diff `main..perf/optionb-2026-10-23`: 23 source files, +461/−72 (code
commits), +docs. No `docs/`, `release/`, `supabase/`, `.lighthouserc.js`, or
contract files touched.

### Files changed (code)
```
App.tsx                                       shared  font gate, gesture/sign-in imports, navigator preload
src/lib/fonts.ts                              shared  welcome-first gate + font-display (QD-1)
src/lib/loadNotifications.ts                  NEW     native sync loader (identical require)
src/lib/loadNotifications.web.ts              NEW     web on-demand loader
src/lib/pushNotifications.ts                  shared  routes through loader; native semantics unchanged
src/navigation/AppNavigator.tsx               NEW     native: re-export + no-op preload
src/navigation/AppNavigator.web.tsx           NEW     web: lazy chunk + shared load promise + retry
src/navigation/deferredScreens.ts             NEW     native: same dynamic imports as before
src/navigation/deferredScreens.web.ts         NEW     web: screens bundled with navigator chunk
src/navigation/RootNavigator.tsx              shared  loader swap only
src/screens/MapScreen.tsx                     shared  loader swap only
src/screens/TasksScreen.tsx                   shared  loader swap only
src/screens/ProfileScreen.tsx                 shared  loader swap only
src/screens/SignInWall.tsx                    NEW     native: re-exports SignInScreen
src/screens/SignInWall.web.tsx                NEW     web: throwing stub (unreachable by design)
src/components/GestureRoot.tsx                NEW     native: re-exports GestureHandlerRootView (first import)
src/components/GestureRoot.web.tsx            NEW     web: plain flex:1 View
public/index.html                             web     3 font preloads
vercel.json                                   web     --source-maps in deployment build
.github/workflows/lighthouse.yml              CI      --source-maps in audit build
src/__tests__/welcomeFontPreload.guard.test.ts  NEW   guard
src/lib/__tests__/pushNotifications.loading.test.ts NEW guard (6 tests)
src/screens/__tests__/MapScreen.detail.test.ts    co-change of a source guard it asserts
```

## 2. Verified background (reconciliation, step 4 of the assignment)

- **Remote main** `6195bf01d555a5d94185f3ff51995f877561e5e1` — live-verified with
  `git ls-remote`; local main identical. Contains merged Option A PRs **#32**
  (`e056b1f`) and **#34** (`6195bf0`).
- **PR #33** (`bb9f5e2eeae5fa674d8562c8f5ee496cdacc57b7`, branch
  `pr-b/accessmap-release-truth-20261020`) — OPEN, 8 commits, merge-base
  `37b960c`, currently **CONFLICTING** with main (its docs/release-record and
  Lighthouse-config commits collide with Option A's merged docs + CI repair).
- Since PR #33's base, **main's app source is unchanged** (only
  `.github/workflows/lighthouse.yml` + `.lighthouserc.js` differ) — that is why
  the performance code ports cleanly and the conflicts are all in docs/CI.
- **Preserved Opus candidate located and verified:**
  `4420d72a8257f4e1d2794caa9085e1db203040f5` — "docs(qa): first-launch
  acceptance review and errata", author Sky Pie, 2026-10-21 22:26 -0700, on
  branch `opus/flagstone-pr33-welcome-first-review-20261021` **in the
  `/Users/skypie/AccessMap` checkout** (it is NOT on GitHub — `ls-remote` says
  "not our ref"). Provenance: it contains PR #33's head `bb9f5e2` as an
  ancestor plus 13 commits (welcome-first restructure `efdfc60…69b3027`, the
  independent review `4102de4`, acceptance review `4420d72`); reviewed by a
  second Opus pass whose verdict was "conditional go as draft PR, not
  merge-ready under the current Lighthouse rule". The candidate is **superset
  of PR #33**, forked from the same base `37b960c`. Mirrors fetched read-only
  into this workspace as `preserved/opus-pr33-welcome-first-review` (=4420d72)
  and `preserved/opus-pr33-welcome-first` (=4102de4). The original in
  `~/AccessMap` was never modified.
- **What this branch takes from that lineage:** the welcome-first font gate,
  index.html preloads, gesture/sign-in splits, lazy navigator + deferred
  screens, chunk-at-Skip prefetch (the review's R1 correction `69b3027`), and
  PR #33's notifications deferral. **What it deliberately does not take:** the
  severity-palette/contract-manifest refactor, the docs/release-record
  reconciliation, the CI fixture rewrite + runner pins, and the proposed
  Lighthouse budget change (see §6).

## 3. Performance evidence

**Baseline (before-state) — measured, not reconstructed:**
- Lighthouse run **39755992084** on `65471ff1` (PR #32 head, 2026-10-22,
  Lighthouse 12.1.0): Performance 0.9 / Accessibility 1.0 / Best Practices 1.0
  / SEO 1.0. QD findings from this run: **QD-1** font-display score 0.5 (8
  faces, wastedMs 20–29 each), **QD-2** `AppEntry` 903,059 B with **647,364 B
  unused (71.7 %)**, **QD-3** valid-source-maps 0. Source:
  `Option A QA Closeout 2026-10-22/QUALITY-DEBT-RECORD-2026-10-22.md`.
- PR #33 head run **39557683763** (2026-10-21) already failed unused-javascript
  (found: 2) — the findings predate and are independent of Option A.

**Prior results from the preserved candidate's review** (Lighthouse mobile
profile, slow-4G phone, medians; source: acceptance review `4420d72` + the
full Lexar report `Task Outputs/accessmap-pr33-performance-20261021-2z9TQIRV/…`):
- Welcome usable: 6,625 ms (PR #33) → **3,514 ms** (candidate)
- Blank gap between splash and welcome: 2,753 ms → **~53 ms**
- Skip at once → app shell visible: 10,418 → **9,474 ms** (with the R1
  chunk-at-Skip correction; before R1 the regression was 8,431 ms vs 4,116)
- Script transfer: PR #33 449,481 B → candidate **275,778 B**; this branch
  excludes the severity refactor, so expect ≈ +13.8 KB over the candidate.

⚠️ **These numbers describe the preserved candidate, not this branch's final
source.** They require final-source re-verification (web export + Lighthouse on
`perf/optionb-2026-10-23`) — deferred per the assignment's "defer expensive
validation" instruction while the portfolio session owns the machine. Do not
quote them as this branch's measured results.

**Lightweight checks run now (this branch):**
- `npx tsc --noEmit` — **green** (exit 0), before and after all code commits.
- Focused Jest — **16 suites / 182 tests, 0 failures**:
  welcomeFontPreload.guard (3), pushNotifications.loading (6), pushPermission,
  MapScreen.detail, privacy.guard, onboardingCoherence.guard, keyboardClass.guard,
  dismissalStandard.guard, drawerRoutes.guard, tabBarCount.guard,
  perceptionGuards, RootNavigator.pushEducation.integration (renders the real
  navigator through the new loaders), admin, terms.guard,
  legalSheetPresentation.guard, onboardingState.
- `npx eslint src` — **0 errors** (90 pre-existing warnings, none introduced).

## 4. Lighthouse status — the three open findings

| Finding | Fix on this branch | Status |
|---|---|---|
| **QD-1 font-display** (0.5) | All 8 `@font-face` rules now carry `font-display: swap` via expo-font's web-only `display` descriptor (commit 1) | **Implemented — OPEN until re-measured.** Close only on a new run ID + score (debt-record rule). |
| **QD-2 unused-javascript** (647 KB of 903 KB) | Entry no longer carries the navigator/map stack, 4 deferred screens, RNGH+hammer, SignInScreen, expo-notifications web shim (commits 3–5); `__common`-chunk trap avoided (commit 4) | **Substantially addressed — OPEN until re-measured.** Residual expected: framework code the welcome never runs (the preserved review measured ≈146,976 B wasted at candidate; Lighthouse's listing threshold is 20,480 B/script, so the assertion may still list entries). |
| **QD-3 valid-source-maps** (0) | `--source-maps` in **both** the deployment and audit builds (commit 6) | **Implemented — OPEN until re-measured.** The debt record forbids closing on fixture-only evidence. |

**Real fixes vs test adjustments — explicit:** every change above is a product
or build change. **No assertion was disabled, suppressed, or weakened.**
`.lighthouserc.js` is untouched on this branch: the three genuine findings keep
failing honestly at `lighthouse:recommended` preset severity, and the three
no-value assertions (`lcp-lazy-loaded`, `non-composited-animations`,
`prioritize-lcp-image`) remain exactly as Option A left them (gatherer-crash
enforcement change, owner approval pending) — not touched either way.

The preserved review's **budget proposal** (`unused-javascript` → warning,
script-transfer ≤ 300 KB) would change the acceptance standard and therefore
**was NOT applied** — it is an owner decision (see §6).

## 5. Shared-code compatibility risks (assignment step 6)

PR #33's own history proves "website-only intent ≠ native-safe": its font work
needed a native fix (`6071bab` "native FirstLaunchGate has no second font
wait"), and the preserved review left **iOS/Android runtime untested**. This
branch therefore uses platform-split modules so the native call paths are
identical by construction:

| Shared file | Native delta | Residual risk |
|---|---|---|
| `App.tsx` | `useAllAppFonts` on native = `[true, null]` → the gate condition collapses to the exact old `onboarded === null`; preload effect is `Platform.OS === 'web'`-guarded no-op; `GestureRoot`/`SignInWall`/`AppNavigator` native variants re-export the same components; `<RootNavigator` JSX tag unchanged | Low. Requires one native smoke pass (first launch, Skip, gestures, sign-in wall) before any native release. |
| `src/lib/fonts.ts` | `useAppFonts` on native = the same `useFonts(appFonts)` gate as before; `display` is documented web-only ("setting the fontDisplay does nothing on native platforms" — expo-font, verified in installed `expo-font/build/Font.types.d.ts`); native also skips the web module block | Low, but this is the one place native receives a `{uri, display}` wrapper instead of a bare module ref — validate on device once. |
| `pushNotifications.ts` | Same synchronous `require('expo-notifications')` via `loadNotifications.ts`; web-only await branch | Very low (6 tests cover both paths). |
| `RootNavigator/Map/Tasks/Profile` | `deferredScreens.ts` re-exports the same `import(...)` calls; loader swap only | Very low (integration test renders the real navigator). |
| `GestureRoot.tsx` | Re-exports `GestureHandlerRootView` as first import → same RNGH init order as the old side-effect import | Very low. |

**Gate:** all of the above is *reasoned + tested-in-Jest* native safety, not
*build-verified*. No EAS build, simulator run, or device check was performed
(native releases are out of scope this run). Required before the next native
release: `npm run typecheck` + full Jest + an iOS dev-client smoke (cold
first-launch gate, OnboardingCards, Skip path, gestures/sheet pull-to-dismiss,
sign-in wall, push permission prompts).

## 6. Deferred work (not done — with reasons)

1. **Severity-palette refactor** (preserved `c377bb0` + `e9c9842` + `4e1f3ff`):
   moves `severityColor` out of `src/lib/flags.ts` so the welcome doesn't pull
   the data module; **costs ≈13.8 KB transfer on first launch**. Deferred
   because `4e1f3ff` rewrites `supabase/contract/client-expectations.v1.json`
   line fields — a backend-contract governance file awaiting **contract-owner
   sign-off** (the preserved review's own recommendation). No backend behavior
   change; safe to port after sign-off.
2. **PR #33 docs/release-record reconciliation** (`dde9298`, `3efee25`,
   `0bdb209`) — README/CHANGELOG/release manifest/RELEASE_IDENTITY updates.
   These are the conflicting part of PR #33 and touch the release control
   plane. Per `AGENTS.md`, main/release-code convergence is **DEFERRED and
   owner-governed**; `release:verify` must pass before/after any control-plane
   change. Not mine to land.
3. **PR #33 CI fixture rewrite + runner pins** (`.github/lighthouse/*`,
   `9d41990`, `09236bc`, `2f88689`, `staticDistDir` + `throttlingMethod:
   'devtools'`) — replaces main's Option A-repaired workflow wholesale. Kept
   out to preserve baseline comparability (same collect config as run
   39755992084). Note recorded: PR #33 switched to devtools throttling because
   lantern returned **NO_LCP** for the first-launch modal — worth revisiting if
   re-measures look suspicious.
4. **Lighthouse budget proposal** (script transfer ≤ 300 KB error,
   `unused-javascript` → warn) — changes the acceptance standard; explicitly an
   owner decision. NOT applied (would weaken a valid assertion).
5. **Interaction-triggered navigator prefetch** (the preserved review's
   alternative to the after-Skip trade-offs) — not built there, not built here.
6. **First-launch cache headers** (`uses-long-cache-ttl`, 13 assets) — fixture
   artifact of `npx serve`; the live site sits behind Vercel's CDN. Do not
   chase in app code.

## 7. Remaining tests (priority order)

1. **Web export smoke + Lighthouse re-measure** (the QD closure runs): `npx expo
   export --platform web --source-maps`, serve `dist`, run Lighthouse/LHCI on
   the branch head and on the production domain after any deployment; record
   new run IDs + scores into `QUALITY-DEBT-RECORD-2026-10-22` and close QD-1/2/3
   **only** on that evidence.
2. **Full Jest** (~2,950 tests) + `npm run typecheck` + `npm run lint` on the
   branch head (focused subset green now; full run deferred while the portfolio
   session loads the machine).
3. **Bundle accounting**: compare `dist/_expo/static/js/web/*` sizes vs main
   (entry vs navigator chunk) to quantify QD-2 on final source.
4. **iOS dev-client smoke** (native-compat gate in §5).
5. **Safari/Firefox spot pass** (the preserved review flagged them untested).
6. **CI on a draft PR** (LHCI report + the workflow's own build step) — a push
   is Sky-only; nothing was pushed.
7. `npm run release:preflight` re-run on a calm machine (it stalls today — see
   §9) and `npm run release:verify` before/after any control-plane change in
   the release-readiness track.

## 8. Shortest route to production readiness

Production web is intentionally served from the frozen Build 33 branch
(`release/web-4.1.1-build33-openfreemap`, deployment `HMszH26wADRRDd1CqH4UkJ8kAugQ`)
under an approved `web-only-descendant` overlay; main release-code convergence
is deferred. Given that, the shortest honest path for THIS work:

1. Finish §7.1–7.2 on `perf/optionb-2026-10-23` (web export + Lighthouse + full
   Jest). *(blocked on machine capacity — §9)*
2. Sky reviews this branch + the preserved candidate's open owner decisions
   (Lighthouse budget, contract-manifest sign-off, publication path).
3. Push the branch and open a **stacked draft PR** (Sky-only action) so CI/LHCI
   measures final source; resolve PR #33's docs conflicts separately in the
   release-record track (owner-governed).
4. Port to the production web lineage **through the release-identity process**
   (manifest + receipt + `release:verify`), as the preserved review recommends —
   production must not be repaired from stale main.
5. Deploy, then verify the serving deployment ID/SHA/domains per
   `docs/RELEASE_IDENTITY.md`; run the QD closure Lighthouse run against
   production; update the debt record.

## 9. Environment incident (machine health — affects both sessions)

During this run the startup disk reached **100 % (3.7 GB free of 460 GB)** and
macOS iCloud-evicted **2,078 files** in this workspace to `dataless`
placeholders; `git status`/`checkout` stalls and one `npm install` failed with
cache EACCES while the portfolio session was writing its R7 release on the same
volume. Recovered without touching anything outside this workspace: tracked
placeholder content restored is unnecessary (git operations switched to
plumbing), deps installed with an isolated npm cache
(`…/T/opencode/npm-cache`), and every commit here was built with
`hash-object`/`write-tree`/`commit-tree` (no full-tree refresh). **Free disk
space** before the next heavy build — a full Jest/Lighthouse run needs several
GB of headroom, and the portfolio session is exposed to the same risk.

## 10. How to review

```bash
git log --oneline main..perf/optionb-2026-10-23
git diff main..perf/optionb-2026-10-23            # 23 files, +461/−72
git diff 4420d72a8257f4e1d2794caa9085e1db203040f5..perf/optionb-2026-10-23  # vs preserved candidate (needs the ~/AccessMap fetch)
npx tsc --noEmit
npx jest src/__tests__/welcomeFontPreload.guard.test.ts src/lib/__tests__/pushNotifications.loading.test.ts
```

Nothing was pushed; the branch is local-only. Rollback: `git branch -D
perf/optionb-2026-10-23` (all evidence also lives in this receipt and in the
preserved `~/AccessMap` candidate, which was never modified).
