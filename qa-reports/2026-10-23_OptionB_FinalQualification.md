# Option B — Final Qualification (2026-10-23)

```
mode:        ACTIVE (Sky-started session) · model_tier: opus (Sky-initiated)
project:     Flagstone (repo Skypie99/AccessMap)
branch:      perf/optionb-integration-2026-10-23 (LOCAL ONLY — nothing pushed, merged or deployed)
code head:   6f699a3f6ce210d2180703e3df2295142de07ab5 (tree 4994817f67166aba4dcd331fb9cbbf0af829ba74)
             the commit that adds this report changes qa-reports/ only (not bundled); see §9.1
base:        main 6195bf01d555a5d94185f3ff51995f877561e5e1 (live ls-remote 2026-10-23, unchanged)
workspace:   /Volumes/Lexar Project Archive/Task Outputs/Flagstone-OptionB-Final-Qualification-20261023-v1-XlrBNs/work.noindex/AccessMap
evidence:    /Volumes/Lexar Project Archive/Task Outputs/Flagstone-OptionB-Final-Qualification-20261023-v1-XlrBNs/02-evidence/
loop health: coherence_score high · state_consistency PASS (release:verify) · duplicate_work_detected none · drift_risk low
```

## 1. DECISIONS FOR SKY

- [ ] **Publish the candidate as a draft PR** — push `perf/optionb-integration-2026-10-23` and open a draft PR against `main` so CI measures it.
  - Option A (Recommended) — push and open a **draft** PR (body: §11); keep PR #33 open for its release-record commits.
  - Option B — keep it local and repeat §7–§9 on the MacBook Pro first.
  - **Rollback:** close the PR; `git push origin --delete perf/optionb-integration-2026-10-23`.
  - **Why deferred:** a push is an external side effect (Sky-only).
- [ ] **QD-2 acceptance standard** — `unused-javascript` is asserted by the preset as `maxLength: 0`. Lighthouse lists any script with more than
  20 KiB of unused (transfer-weighted) code, and react-dom alone leaves ~18.4 KB unused on the welcome (§7.3), so a client-rendered React
  page cannot reach zero without server rendering. QD-2 improved 77 % and still fails.
  - Option A (Recommended) — keep the assertion failing honestly; record QD-2 as OPEN with the measured trend; decide the standard in the next
    performance workstream.
  - Option B — adopt the preserved review's budget proposal (assertion → warning + script-transfer budget). This changes the acceptance
    standard and was **not** applied.
- [ ] **Lighthouse NO_LCP flake (new finding)** — on Option B builds 43 % of local lab runs report "The page did not display content that
  qualifies as a Largest Contentful Paint" (main: 0 of 4). Root cause from saved traces in §7.4. Each such run fails `redirects` and
  `third-party-facades` with "no value", so the PR's CI job will be red for either QD-2 or NO_LCP on every run.
  - Option A (Recommended) — Dani/Shamus decide whether the welcome may appear without its opacity fade-in on web (makes its first frame a real
    LCP candidate); measure again.
  - Option B — switch the CI collect to DevTools throttling (PR #33's method). Changes the measurement method and baseline comparability.
- [ ] **Auth-module review (Jordan + Sky)** — `3c1b184` changes `src/lib/supabase.ts` by one import line (`import './urlPolyfill'`). Client
  options, PKCE, session storage and URL detection are unchanged; native resolves the identical polyfill import, web an empty module (the
  package's own `auto` entry already installs nothing on web). Constitution Art. 7.6 requires this review before it leaves proposal stage.
- [ ] **Native smoke before any native release** — shared files changed (§10); nothing here was built or run on iOS or Android.

## 2. BLOCKERS / FAIL_FAST

- None that stops the local candidate. Open, measured items: QD-2 (§7.3), the NO_LCP lab flake (§7.4), native verification (§10).

## 3. Summary

Recovered and Lexar-preserved MiMo's seven commits (independent recovery proven), verified main and PR #33 live, and built one integration
candidate directly on `261caaf` (main is unchanged, so nothing was re-based or re-created). First-ever final-source measurements show QD-1
and QD-3 fixed, QD-2 improved 77 % but still failing, and two real problems in the lazy-navigator design: the app download was only
**postponed to Skip** (Skip → app 0.3 s → 6.8 s), and a failed chunk download left the error screen's **"Try again" unable to recover**. Both
are fixed and measured in real Chrome, and 47.7 KB of inert polyfill is gone from the first-launch entry. Verdict: **B. OPTION B QA HOLD** (§15).

## 4. Final candidate, ancestry and change inventory (deliverables 1–3)

**Branch** `perf/optionb-integration-2026-10-23` · **code head** `6f699a3f6ce210d2180703e3df2295142de07ab5`.
Ancestry (`git merge-base --is-ancestor`): `main 6195bf0` → MiMo's 7 commits, **SHAs unchanged** → `261caaf` → 4 new commits → `6f699a3`
(11 ahead / 0 behind `origin/main`). Nothing was re-created, rebased or rewritten.

| # | commit | what | platform reach |
|---|---|---|---|
| 1 | `cec00d4` | welcome-first font gate + `font-display: swap` (QD-1) | shared (`App.tsx`, `fonts.ts`) |
| 2 | `0683379` | index.html preloads the welcome's 3 faces + guard | web |
| 3 | `b6a3487` | `GestureRoot` / `SignInWall` platform splits | shared entry, web-only modules |
| 4 | `7fc188f` | navigator as one lazy web chunk + `deferredScreens` | shared (`App.tsx`, 4 screens), web-only modules |
| 5 | `71cb43e` | `expo-notifications` on demand on web | shared (`pushNotifications.ts`) |
| 6 | `5f2deda` | `--source-maps` in deploy + CI builds (QD-3) | web build config |
| 7 | `261caaf` | MiMo's integration package (docs) | — |
| 8 | **`d3d8a5e`** | **navigator chunk recovers from a failed download** (one quiet retry; fresh `React.lazy` so "Try again" works) + 3 tests | web-only |
| 9 | **`3c1b184`** | **inert URL polyfill off the web entry** + 4-test guard | one import line in shared `supabase.ts`; web-only module |
| 10 | **`71a6b53`** | **engagement prefetch of the navigator chunk** + 5 tests | `App.tsx` effect (web-gated), native no-op, web modules |
| 11 | **`6f699a3`** | comments: polyfill saving corrected to the measured 47,743 B | comments only |

`git diff --stat 6195bf0 6f699a3`: 31 files, +1,214 / −73 (code, tests, MiMo's two reports).

## 5. Integration analysis and source-conflict record (deliverable 4)

| lineage | ref | finding |
|---|---|---|
| A main | `6195bf0` | live-verified; contains Option A (PR #32 `e056b1f`, PR #34 `6195bf0`); untouched. |
| B PR #33 | `bb9f5e2` | OPEN draft, `mergeable: CONFLICTING`, `mergeStateStatus: DIRTY`, base `37b960c`. |
| C MiMo | `261caaf` | 7 commits on current main; adopted as-is. |
| D Opus | `4102de4` / `4420d72` | superset of PR #33; exists only in `~/AccessMap` (read-only fetch, never modified). |
| E production web | `ebf091c` | `release/web-4.1.1-build33-openfreemap`, web-only-descendant overlay of `f559417`; deployment `HMszH26wADRRDd1CqH4UkJ8kAugQ`. |

- **Why PR #33 is not mergeable: real, not stale.** In-memory `git merge-tree --write-tree origin/main bb9f5e2` → content conflicts in
  `.lighthouserc.js` and `README.md` (`lighthouse.yml` auto-merges). main's app source is byte-identical to PR #33's base `37b960c`, so no
  conflict is in app code: PR #33's docs/release-record and CI-fixture commits collide with Option A's merged docs + CI repair.
  `refs/pull/33/merge` (`1db62a2`) is a stale merge ref.
- **Already implemented / duplicate:** all app-side work of PR #33 (`72c3c5c`, `bb9f5e2`) and of D's welcome-first restructure is in C.
- **Not taken (still owner decisions):** PR #33's README/CHANGELOG/release-record commits (release control plane), its CI fixture rewrite +
  runner pins, D's Lighthouse budget change (weakens an assertion), D's severity-palette refactor (rewrites line pins in
  `supabase/contract/client-expectations.v1.json`; needs contract-owner sign-off; ≈13.8 KB transfer).
- **Conflicts resolved here:** none were needed; every new commit is additive. A pin MiMo's edit could have broken was re-verified:
  `client-expectations.v1.json` pins `src/lib/pushNotifications.ts:172` (`.from('push_tokens')`) — still exact; `contractManifest.guard` 13/13.
  No contract manifest pins `supabase.ts`.
- **Release dependency:** E is an ancestor of main, and main is 84 app-source files ahead of Build 33. Production therefore needs either the
  deferred main/release convergence or a new web-only-descendant overlay. In-memory port of `6195bf0..6f699a3` onto E: clean except
  `.github/workflows/lighthouse.yml` (E predates the Option A CI repair) and the import block of `src/screens/TasksScreen.tsx` (mechanical).
  No port branch was created (one authoritative candidate).

## 6. Phase 4 findings and corrections

1. **Work postponed, not removed — fixed for engaged visitors.** MiMo's lazy navigator moved the 625,654 B (transfer) navigator chunk from
   before the welcome to after Skip: the welcome came 5.5 s sooner, but Skip → app grew from 0.3 s to 6.8 s, and reading the cards did not help
   (5.2 s). `71a6b53` starts the chunk on the visitor's first press/tap/key/scroll (fetch + define only; no navigator code runs early). Trace:
   chunk requested at the Next press, app 2.6 s after Skip; interleaved median 0.98 s. A page nobody touches fetches nothing extra.
   Residual: an immediate Skip still waits for the download (§8).
2. **Unrecoverable chunk failure — fixed.** `React.lazy` keeps a rejected load for the page's lifetime, so "Try again" re-threw forever at the
   only way into the app. `d3d8a5e`: one quiet retry, plus a fresh lazy component after a rejection. Proven in Jest (old logic fails 2 of 3)
   and in real Chrome (§9.4).
3. **Inert polyfill — fixed.** `react-native-url-polyfill/auto` installs nothing on web but its whatwg-url implementation still shipped in the
   entry. `3c1b184`: entry 1,070,781 → 1,023,038 B raw. `buffer` stays (react-native-svg's data-URI helper imports it).
4. **Later splash paint — measured trade-off, kept.** In real throttled Chrome the static splash (FCP = LCP) paints ~150 ms later than on
   main (1,572 vs 1,420 ms medians, ranges do not overlap): the three welcome-font preloads (107 KB) download alongside the render-blocking
   CSS, and DevTools throttling splits bandwidth equally between concurrent requests, so the CSS gets a smaller share. Production's HTTP/2
   prioritisation probably narrows this. Lantern overstates it (LCP ~1,100 → ~1,850 ms) because it counts every request that *finished* before
   the observed LCP, whether or not the splash uses it. `fetchpriority="low"` on the preloads, interleaved A/B on harness v3: no measurable
   effect (FCP 1,548 vs 1,568 ms, welcome 3,738 vs 3,793 ms; Lantern 1,833 ms) → not adopted. The same preloads make the welcome usable ~5.8 s
   sooner, so the trade is kept. (An earlier v2-harness reading that the variant slowed the welcome is withdrawn; v2 was superseded, §9.7.)
5. **Warm loads.** Returning visits are served by `public/sw.js`; all three builds reach the app in ~3.6 s (§7.2). Production serves even
   hashed bundles with `cache-control: public, max-age=0, must-revalidate` (live HEAD check), so the earlier "fixture artifact" note on
   `uses-long-cache-ttl` does not hold for production. Not changed here: the SPA rewrite would answer a missing chunk with a 200 HTML page that
   an immutable header (and the SW) would keep (proposal in §12).
6. **Verified, no change needed:** the notifications chunk is not fetched at first launch; all 8 faces carry `font-display: swap`; the 5
   non-welcome faces download during the welcome; every chunk ships a source map; `__common` is 813 B (no eager shared chunk).

## 7. Performance before/after and Lighthouse verdicts (deliverables 5–6)

### 7.1 Bundles (Expo export, CI's build env; main's export is byte-identical to CI's `AppEntry-766b9eb8…`)

| | main `6195bf0` | MiMo `261caaf` | final `6f699a3` |
|---|---|---|---|
| first-launch entry, raw | 3,519,455 B | 1,070,781 B | **1,023,593 B** (−71 %) |
| first-launch entry, transfer | 903,446 B | 289,607 B | **277,340 B** |
| total bytes at first launch (Lighthouse) | 1,289,405 B | 670,939 B | **658,672 B** |
| navigator chunk (lazy) | in entry | 2,510,483 B | 2,510,445 B (42 % maplibre-gl) |
| notifications chunk (on demand) | in entry | 131,923 B | 131,923 B |

### 7.2 Startup in real Chrome 155 (harness v3)

Lighthouse's slow-4G DevTools constants (562.5 ms latency, 1,474.56 Kbps down) on the page **and the service worker**, 4× CPU, fresh profile per
cold run, only localhost resolvable, 4 interleaved rounds; median (range), ms.

| build | splash FCP | welcome usable | Skip at once → app | first launch → app | engage, Skip at +6 s → app | returning visitor → app | page errors |
|---|---|---|---|---|---|---|---|
| main `6195bf0` | 1420 (1416–1464) | 9550 (9464–9788) | 306 (271–411) | 9916 (9909–10208) | 406 (171–692) | 3626 (3034–4945) | 0 |
| MiMo `261caaf` | 1664 (1540–2648) | 4025 (3853–4192) | 6845 (6021–13733) | 11115 (9927–18023) | 5172 (4883–6775) | 3616 (3514–3645) | 0 |
| **final `6f699a3`** | 1572 (1560–1604) | **3778 (3726–3838)** | 6194 (6024–11037) | 10108 (9868–14878) | **980 (770–1859)** | 3604 (3317–3698) | 0 |

Welcome usable: −60 % vs main. Engage-then-Skip: −81 % vs MiMo. Immediate Skip: the total time to the app equals main's (work redistributed,
not added). Splash FCP: +152 ms vs main (§6.4). Outliers (11–18 s) coincide with the host swapping (7.9 of 9.2 GB swap in use).

### 7.3 Lighthouse 12.1.0 / LHCI 0.14.0 — repo `.lighthouserc.js` unchanged, no upload, each run asserted on its own (CI uses 1 run)

| build | runs | valid | NO_LCP | perf | a11y / BP / SEO | FCP | LCP (Lantern) | TTI | total bytes | QD-1 | QD-2 (valid runs) | QD-3 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| main `6195bf0` | 4 | 4 | 0 | 0.97–0.98 | 1 / 1 / 1 | 927–933 | 1,079–1,142 | 7,895–7,947 | 1,289,405 | 0.50 | 1 item, 647,364 B | 0 |
| MiMo `261caaf` | 4 | 1 | 3 | 0.99 | 1 / 1 / 1 | 932 | 1,832 | 3,494 | 670,939 | 1 | 1 item, 155,951 B | 1 |
| **final `6f699a3`** | 8 | 4 | 4 | 0.97 | 1 / 1 / 1 | 927–982 | 1,827–1,882 | 3,474–3,583 | 658,672 | **1** (8/8) | 1 item, 145,661–146,062 B | **1** (8/8) |

Single-run assertion outcome (CI semantics): main fails font-display + unused-javascript + valid-source-maps (the recorded baseline); every
valid candidate run fails **unused-javascript only**; every NO_LCP run fails `redirects` + `third-party-facades` ("no value").
TBT is host-noise-dominated here (identical JS measured 81–195 ms across batches) and is not compared.

**Verdicts**
- **QD-1 font-display — FIXED on final source.** 1.0 / 0 items in 8 of 8 runs of `6f699a3` (baseline 0.5, 8 faces). Formal closure in
  `QUALITY-DEBT-RECORD-2026-10-22` still needs, by that record's own rule, the PR's CI run ID and a production measurement after release.
- **QD-2 unused-javascript — OPEN, genuinely improved.** Wasted 647,364 → 145,661 B (−77 %); entry transfer 903,446 → 277,340 B. Still 1 item
  in 4 of 4 valid runs. Remaining waste by module (Lighthouse source-map attribution, transfer-scaled): react-dom 18.4 KB, @supabase/auth-js
  13.9 KB, react-native-web 7.0 KB, phoenix 6.1 KB, storage-js 5.3 KB. Deferring Supabase changes when the auth client starts (privacy/auth
  review); react-dom alone sits near the 20 KiB listing threshold.
- **QD-3 valid-source-maps — FIXED on final source.** 1.0 in 8 of 8 runs; maps come from identical `--source-maps` commands in
  `vercel.json` and `lighthouse.yml` (no fixture/deployment divergence). Same formal-closure condition as QD-1.
- **Never claimed as passing:** an aggregated 3-run LHCI assert on `6f699a3` printed `exit 0` only because LHCI's default *optimistic*
  aggregation took the broken NO_LCP run's empty value; it is excluded from all verdicts.

### 7.4 NO_LCP root cause (saved traces, 6 runs)

(Lighthouse CLI 12.1.0, `--save-assets`, on the `6f699a3` build: 2 of 6 NO_LCP.) Valid runs record the static splash text as the LCP candidate at ~100 ms (`largestContentfulPaint::Candidate`, text, 24,282 px²). NO_LCP runs
paint the splash (FCP 204 ms) but no candidate is ever emitted — React's first commit clears `#root` (the splash) before Chrome reports it — and
the welcome that replaces it fades in from opacity 0, which Chrome does not count as a contentful paint (one run had no FCP at all, only a first
paint at 877 ms). main's 3.5 MB entry keeps the splash alive long enough; Option B's fast entry loses the race in the unthrottled trace that
Lighthouse's simulated throttling records. Real throttled Chrome always reported LCP in the harness (PerformanceObserver).

## 8. Remaining genuine blockers / open items (deliverable 9)

1. **QD-2 assertion still fails** (§7.3).
2. **NO_LCP lab flake** — 43 % of Option B lab runs; the CI job will be red either way (§1).
3. **Native compatibility unverified** — Jest (jest-expo iOS preset) + typecheck only (§10).
4. **Immediate Skip still pays the navigator download** (~6 s on slow 4G). Next lever: split maplibre-gl (1.05 MB raw, 42 % of the chunk) out
   of the navigator chunk so the app frame paints first — a refactor of `PlatformMap.web.tsx`'s imperative handle; not attempted.
5. **Host limits** — this Air swapped heavily and other agents' apps were running; numbers are medians with ranges. Re-run §7.2–7.3 on the
   MacBook Pro before quoting absolute values externally.

## 9. Tests, builds and smoke results (deliverable 7)

All at code head `6f699a3`, in the Lexar workspace, logs in `02-evidence/logs/`.

1. **Builds:** `npx expo export --platform web --source-maps` with CI's env (`EXPO_NO_DOTENV=1`, synthetic Supabase placeholders) — exit 0 for
   `6195bf0`, `261caaf`, `3c1b184`, `6f699a3`. Build verification for the prefetch: zero literal `__prefetchImport` left, compiled to
   `asyncRequire.prefetch(d[2], d.paths, "./RootNavigator")` with `d[0] = d[2] = 482` and one chunk path.
2. **TypeScript:** `npx tsc --noEmit` — exit 0 (baseline at `261caaf` and at every new commit).
3. **Lint:** `npm run lint` — 0 errors, 90 warnings (the pre-existing set MiMo recorded).
4. **Jest, full:** `npx jest --maxWorkers=2 --ci` — 303 suites; **4,489 passed, 32 todo, 6 failed**. All 6 are in
   `scripts/__tests__/{canonicalApplyWorkspaceGuard,productionPlanOnly,targetTokenSafety}` and are environmental: those DB-tooling guards
   refuse workspace paths containing whitespace, and this workspace lives on "Lexar Project Archive/Task Outputs". Proof: **main `6195bf0` fails
   the identical 6** in the same workspace; with a space-free `TMPDIR` both main and the candidate fail the same single negative-control test
   (it inspects the worktree's own path). Not a regression. New tests: `AppNavigator.web.test.tsx` 8/8, `urlPolyfill.guard.test.ts` 4/4; the
   9 App-related suites 188/188.
5. **Real-browser smoke** (`02-evidence/smoke/`): 6 viewports (320, 375, 412, 768, 1280, 1920) — welcome and app render, no horizontal overflow,
   Skip is a 64×44 px target, in view and keyboard-focusable, on **both main and final**; console errors identical between them (only the
   hermetic environment's refused Supabase placeholder and blocked map hosts).
   Chunk failure at Skip (bypassing the SW so interception sees every request):

   | scenario | MiMo `261caaf` | final `6f699a3` |
   |---|---|---|
   | A: 1 failed download, Skip at once | error screen → Try again **stuck** (earlier run: passed by timing) | app (quiet retry) |
   | B: 2 failures, then network back | error screen → Try again **stuck** | error screen → Try again → **app** |
   | C: 1 failure after 6 s reading | error screen → Try again **stuck** | app (quiet retry) |

6. **Release identity (read-only):** `npm run release:preflight` PASS (tracked tree clean, 11 ahead / 0 behind); `npm run release:verify` PASS
   (control plane untouched; its pre-existing WARN about the manifest's "deferred" wording belongs to the release-record track).
7. **Measurement integrity notes:** first harness runs were **invalid** for read/warm scenarios (DevTools throttling did not apply to
   service-worker fetches) and a second version was superseded (request interception stalled requests under swap); both are kept with
   `.INVALID` / `.SUPERSEDED` suffixes and an explanation file. During those early runs a few anonymous map-style GETs reached
   `tiles.openfreemap.org` through the service worker; the final harness resolves only localhost.

## 10. Shared-code compatibility assessment (deliverable 8)

| shared file | native delta | evidence | residual |
|---|---|---|---|
| `App.tsx` | `GestureRoot` stays the first import (native re-exports `GestureHandlerRootView`); `useAllAppFonts` = `[true, null]`; both new effects return early unless `Platform.OS === 'web'` | Jest (iOS preset), typecheck | low — needs a device run |
| `src/lib/fonts.ts` (MiMo) | native gets `{ uri, display }` FontResources (`display` is web-only per expo-font) | typecheck | low — validate on device once |
| `src/lib/supabase.ts` | first import `./urlPolyfill` → native resolves `urlPolyfill.ts` → the same `react-native-url-polyfill/auto`, same order | guard test proves native install | very low |
| `src/lib/pushNotifications.ts` (MiMo) | `loadNotifications.ts` keeps the synchronous `require('expo-notifications')` | 6 tests | very low |
| `RootNavigator`, Map/Tasks/Profile screens (MiMo) | loader swap; native `deferredScreens.ts` keeps the same `import()` calls | navigator integration test | very low |
| `src/navigation/AppNavigator.tsx` | re-export + two no-op loaders | typecheck | none |

Web-only (never in a native bundle): every `*.web.ts(x)`, `rootNavigatorChunk.ts` (imported only by `AppNavigator.web.tsx`),
`public/index.html`, `vercel.json`, `lighthouse.yml`. **No native compatibility is claimed from web tests.** Before any native release:
`npm run typecheck`, full Jest, and an iOS dev-client smoke (cold first launch, welcome, Skip, gestures/sheet pull, sign-in wall, push prompts).

## 11. GitHub PR publication plan (deliverable 10) — Sky-only actions

1. `git -C "<workspace>" push -u origin perf/optionb-integration-2026-10-23`
2. `gh pr create --draft --base main --head perf/optionb-integration-2026-10-23 --title "perf(web): first-launch load reduction (Option B)"`
   with §§3–10 of this report as the body; note that it supersedes PR #33's two app-code commits.
3. Expect `Lighthouse CI` to be **red**: on valid runs for QD-2 only; on NO_LCP runs for `redirects` / `third-party-facades`. Record the run ID.
4. Before un-drafting: Jordan review of the `supabase.ts` line, a native smoke, and owner decisions on QD-2's standard and the NO_LCP path.

## 12. Production release safeguards and proposals (deliverable 11)

- Production stays on `release/web-4.1.1-build33-openfreemap` (`ebf091c`); nothing here changes it, and `release:verify` passes.
- Any production use goes through `docs/RELEASE_IDENTITY.md`: convergence (deferred) or a new web-only-descendant overlay with a receipt in
  `release/current.json`, `release:verify`, a deploy by Sky, then verification of the serving deployment ID/SHA on both domains, then the QD
  closure measurement on production.
- `vercel.json` emits public source maps (QD-3). The repository is public, so maps disclose nothing new; still a release-time call.
- **Proposal (not applied):** long-lived caching for hashed assets needs two coupled changes verified on a Vercel preview: exclude `/_expo/`
  and `/assets/` from the SPA rewrite (a missing chunk must 404, not return 200 HTML that the SW would cache), then
  `Cache-Control: public, max-age=31536000, immutable` for those paths.

## 13. Rollback (deliverable 12)

- Local: `git branch -D perf/optionb-integration-2026-10-23` — MiMo's branch, the original repo and both Lexar bundles are untouched.
- Per change: `git revert d3d8a5e`, `3c1b184` or `71a6b53` — independent, each with its own tests; reverting `71a6b53` restores Skip-time loading.
- After a future merge: revert the merge commit; production is unaffected until a separate release decision.

## 14. Lexar preservation receipts (deliverable 13)

Root: `/Volumes/Lexar Project Archive/Task Outputs/Flagstone-OptionB-Final-Qualification-20261023-v1-XlrBNs/` — APFS, volume UUID
`8C5CDF36-0819-48DB-A39F-7EA20C6C67D4`, 746 GiB free at start, new folder (mode 700), nothing pre-existing overwritten.

`01-preservation/` (before any change; `shasum -a 256 -c SHA256SUMS` → 9/9 OK):

```
b2828896c72d5503b51707f4fd2d0e59cb704679cb8016c4be25898a15ad5ce0  optionb-all-lineages.selfcontained.bundle   (420 MB, 7 lineage refs, complete history)
467dcb641550a1a98d2f06b09c4bf58ac68dab1ff3ed0bbd4534c962419f9eab  optionb-perf-branch.from-original.delta.bundle (from the original repo's own objects)
d7f8185eb7b9257d1601956c3a098a735c721ce5ee2e006012e53aa78695de21  original-repo-git-state.txt
6229a7702475a10258c0fa8daa103e1d9cbd04c805c7217021ee011cb068c687  original-worktree-verification.txt   (26/26 post-checkout files == HEAD)
f6bcceadd1eed020e44e98e64848dbd5e537564d32f291a7794ca767f65e3607  RECOVERY-INSTRUCTIONS.md
```

Independent recovery proof: mirror-clone of the self-contained bundle → 7/7 refs exact, `git fsck --full` clean, `261caaf` tree
`434ee4a7…` identical to the original, clean checkout; the delta bundle applies onto the recovered main → `261caaf`.
The final candidate's bundle, recovery proof and checksums of `02-evidence/` and `03-reports/` are recorded in
`03-reports/FINAL-RECEIPTS.md` (produced after this report is committed, because it covers this commit).

## 15. Verdict and next owner decision (deliverable 14)

**B. OPTION B QA HOLD** — one working, preserved local candidate (`perf/optionb-integration-2026-10-23`) with measured evidence. QD-1 and QD-3
fixed; the welcome is 60 % faster than main; two Option B defects found and fixed. Exact remaining measured problems: QD-2 still fails
(1 item, 145,661 B unused), Option B lab runs hit NO_LCP 43 % of the time, and native compatibility is untested.

**Next owner decision (Sky):** approve publishing the draft PR (§11), and choose QD-2's standard and the NO_LCP path (§1). Then: Jordan's
review of the `supabase.ts` line and an iOS dev-client smoke.
