# Option B — QD-2 / first-paint QA closure pass (2026-10-23)

```
mode:        ACTIVE (Sky-started session) · model_tier: opus (Sky-initiated, max effort)
project:     Flagstone (repo Skypie99/AccessMap)
branch:      optionb-qd2-lcp-closure (LOCAL ONLY — nothing pushed, no PR, no merge, no deploy)
start:       d69d886efcf826311c672514f7ebf759db4ba51f (sealed final candidate; tree ae5abf5c)
code head:   0f3f1b68fcabad723f8cae04b86a58db2f630be5 (tree 3f1203a1) — the commit adding this report changes qa-reports/ only
base:        main 6195bf0 (0 behind; fast-forward merge, no conflict)
workspace:   /Volumes/Lexar Project Archive/Task Outputs/Flagstone-OptionB-QA-Closure-WORKING-20261023
evidence:    /Volumes/Lexar Project Archive/Task Outputs/Flagstone-OptionB-QD2-LCP-Closure-20261023-v1-edEZVD/
prior:       Flagstone-OptionB-Final-Qualification-20261023-v1-XlrBNs (read only; verified unchanged)
loop health: coherence_score high · state_consistency PASS (release plane untouched) · duplicate_work_detected none (lineage D's severity refactor noted, not redone) · drift_risk low
```

Paths such as `02-evidence/…` and `03-reports/…` are relative to the evidence folder above.

## 1. DECISIONS FOR SKY

- [ ] **Accept `0f3f1b6` (welcome without its fade on web) — Dani's design review first.** It removes the NO_LCP flake
  (0 / 15 no-fade runs vs 4 / 10 baseline this session, 9 / 21 sealed). Native unchanged. The lab performance score
  will read lower (0.97 → 0.81–0.82) because LCP now measures the welcome (Lantern ≈4.7 s) instead of the splash.
  - Option A (Recommended) — keep it; the PR's CI then fails one honest assertion (QD-2) on every run.
  - Option B — revert it (`git revert 0f3f1b68`) and choose a different measurement path (e.g. PR #33's DevTools throttling).
- [ ] **QD-2 standard (unchanged from the sealed report, now with proof).** `maxLength: 0` is unreachable for this
  architecture: react + react-dom + react-native-web leave 54 KB unused against a 20 KiB per-script allowance, and even
  every app-owned deferral combined leaves 82 KB (§3). With LCP now measuring the welcome, Lighthouse attributes 750 ms
  of its simulated LCP to this waste, so the debt is real, not cosmetic. Option A (Recommended) — keep failing honestly and record QD-2
  as OPEN; Option B — change the standard (not done here).
- [ ] **Accessibility: silent ≈6 s wait after an immediate Skip (Alex).** Introduced by the lazy navigator: a static,
  screen-reader-hidden skeleton with no status (§5). Proposal only; needs Alex's review before un-drafting.
- [ ] **Publish the draft PR** (commands: `03-reports/PR33-RECONCILIATION-STRATEGY.md` §3; body: `DRAFT-PR-DESCRIPTION.md`).
  This clone's `origin` is the sealed package — push only through an explicit GitHub remote.
- [ ] Still open from the sealed report: Jordan + Sky review of the `supabase.ts` import line (`3c1b184`); native smoke.

## 2. BLOCKERS / FAIL_FAST

None for the local work. QA HOLD reasons in §11.

## 3. QD-2 — exact failure, root cause, result

**The failure.** LHCI's `lighthouse:recommended` asserts `unused-javascript` as `['error', {maxLength: 0}]`.
Lighthouse 12.1.0 lists any script whose transfer-weighted unused bytes exceed 20 KiB (20,480 B). Only the entry
`AppEntry` is listed: 1,023,593 B raw / 277,340 B transfer, 52.7 % unused → 145,661–146,244 B (145,963 B on
`0f3f1b6`). On d69d886 Lighthouse estimated its cost at `FCP 0 ms, LCP 0 ms` only because LCP measured the splash;
on `0f3f1b6`, where LCP measures the welcome, the same audit estimates **750 ms of LCP** (score 0, every run). The
waste does delay the main content; the old 0 ms understated it.

**Attribution (all 350 sources, via Lighthouse's own computed artifacts).** Classified per the brief:

| class | unused, transfer-weighted | share | main contributors |
|---|---|---|---|
| B React / RN-Web / Expo runtime | 65,195 B | 44.6 % | react-native-web 34,928 · react-dom 19,108 |
| A* app-owned, needs auth review | 53,126 B | 36.4 % | Supabase client created at module load (auth-js 24,187 …) |
| D required for the welcome | 14,343 B | 9.8 % | react-native-svg 8,890 · buffer 4,880 (svg data helper) |
| A* app-owned, needs contract sign-off | 7,525 B | 5.2 % | welcome imports 3 severity helpers from `flags.ts` → data layer, image manipulator, moderation list |
| D app code (welcome, shell) | 2,983 B | 2.0 % | |
| A* location / push (review-gated) | 2,190 B | 1.5 % | expo-location, push helpers — never called on web |
| A ungated | 544 B | 0.4 % | FlashBanner |
| U unmapped | 194 B | 0.1 % | |

react-native-web's unused bulk (`VirtualizedList`, `FlatList`, Animated nodes, `Touchable`) is runtime structure:
`babel-preset-expo` already rewrites `react-native` imports per export (no barrel), and these arrive through React
Native's `Animated` (which bundles animated list components) and react-native-svg's `Touchable` mixin.

**Deferral scenarios (module graph of the real bundle, 479 modules).**

| scenario | raw bytes leaving the entry | unused left | × threshold |
|---|---|---|---|
| baseline | — | 146,244 B | 7.1 |
| welcome stops importing `flags.ts` | 55,860 | 138,575 B | 6.8 |
| Supabase client lazy (auth review) | 256,148 | 92,973 B | 4.5 |
| every app-owned deferral combined | 336,163 | 82,207 B | 4.0 |

**Result: GENUINE REMAINING BLOCKER — irreducible within the current architecture.** react + react-dom + scheduler
alone leave 20,114 B (98 % of the allowance); with react-native-web 54,036 B (2.64 ×). Passing needs an architecture
change (first-launch page without the RN/React runtime, or static rendering) or a different standard. Splitting the
entry so each script stays under 20 KiB was rejected: it hides unused code rather than removing it.

**Measurement effect found:** on every NO_LCP run `unused-javascript` errors and LHCI's `maxLength: 0` passes
vacuously, so a green QD-2 on such a run is an artifact. `0f3f1b6` removes that path.

No QD-2 code change was made: the only ungated lever is 544 B (NOT WORTH CHANGING). Full analysis:
`02-evidence/bundle-analysis/QD2-ANALYSIS.md`.

## 4. LCP — root cause and result

**Root cause (from 6 sealed + 30 new saved traces).**
1. The welcome could never be an LCP candidate. It renders in a react-native-web `Modal` with `animationType="fade"`;
   `ModalAnimation` paints the first frame at `opacity: 0`, then runs a compositor keyframe from 0 → 1. Chrome never
   records text that is painted invisible and then only composited. In no baseline trace is the welcome a candidate.
2. The only candidate left is the static splash tagline (`p.am-tag`, 24,282 px²), painted 10–22 ms before AppEntry
   starts evaluating. React's first commit clears `#root`; when it lands before Chrome processes the splash's paint
   report, the candidate is dropped (NO_LCP), and if it lands before the splash's first paint there is no
   contentful paint at all (NO_FCP — seen twice in this session's baseline).
3. main's 3.5 MB entry kept the splash alive for about a second; Option B's 277 KB entry arrives within milliseconds on
   Lighthouse's unthrottled observed load, so ~10 ms of scheduling decides each run.

**Fix: `0f3f1b6` — the welcome opens at full opacity on web** (the presentation Reduce Motion users already get;
native keeps its fade). FIXED, VALIDATION PENDING (design review + GitHub CI).

| Lighthouse 12.1.0, interleaved | runs | NO_LCP / NO_FCP | LCP element | Lantern LCP | Lantern FCP | perf | CI single-run failures |
|---|---|---|---|---|---|---|---|
| sealed Option B runs (261caaf; 6f699a3, whose output equals d69d886's) | 21 | 9 | splash | 1,827–1,882 | 927–982 | 0.97–0.99 | QD-2, or redirects + third-party-facades |
| baseline d69d886, this session | 10 | 2 + 2 | splash | 1,823–1,834 | 923–941 | 0.97–0.99 | QD-2 ×6; no-value audits ×4 |
| built-output experiment: no fade | 5 | 0 | welcome body text (24,412 px²) | 4,708–5,419 | 929–1,328 | 0.76–0.81 | QD-2 ×5 |
| built-output experiment: no fade + map CSS non-blocking | 5 | 0 | welcome body text | 4,554–4,682 | 669–764 | 0.77–0.82 | QD-2 ×5 |
| built-output experiment: map CSS non-blocking only | 5 | 5 | — | — | 671–1,129 | — | redirects + third-party-facades ×5 |
| **real build `0f3f1b6`** | 5 | **0** | welcome body text, 5 / 5 | **4,695–4,713** | 923–932 | 0.81–0.82 | **QD-2 ×5, nothing else** |

LCP now measures the main content. Lantern's estimate is pessimistic (it charges every request finished before the
observed paint, including the five later font faces); real Chrome's own LCP is in §7. FCP is unchanged; QD-2's wasted
bytes are unchanged (145,963 B).

## 5. Skip → app (≈6 s), first splash paint, loading states

**Why the welcome is fast but an immediate Skip still waits ≈6 s.** Option B moved the navigator (maplibre, leaflet,
every signed-in screen) out of the entry into one 2.51 MB raw / 625,654 B transfer chunk. The engagement prefetch
starts it on the visitor's first press, so a visitor who reads the cards waits ≈0.7–1.2 s (harness medians); but when the first press
*is* Skip, the whole download starts at Skip. Decomposition of that path on `0f3f1b6` (real Chrome, slow-4G DevTools
throttling on page and service worker, 4× CPU; trace + CPU profile, `02-evidence/startup/skipdecomp-0f3f1b6/`):

| phase | run 1 | run 2 | category (brief) |
|---|---|---|---|
| Skip press → chunk request | 3 ms | 1 ms | — |
| chunk download (625,654 B; floor 3.96 s = 562.5 ms latency + 3.39 s at 1,474.56 kbit/s) | 4,711 ms (72 %) | 4,656 ms (84 %) | 1 network |
| chunk script evaluation | 3 ms | 2 ms | 2 parse (V8 compiles lazily) |
| module execution + navigator/Home render until the menu button exists | 1,829 ms | 911 ms | 2–4 execute, init, render |
| — of which react-native-web + react-dom | 767 ms | 293 ms | 4 rendering |
| — of which maplibre-gl + leaflet initialisation | 183 ms | 159 ms | 3 init of a screen not shown first |
| intentional visual transition | none | none | 5 |
| total Skip → app | 6,543 ms | 5,569 ms | |

Lighthouse is not involved (6): it never presses Skip. The map stack is downloaded and initialised although a guest's
first screen is Home: it is 51 % of the chunk's gzip bytes (330,681 of 645,289 B,
`bundle-analysis/rootnavigator-chunk-gzip-by-package.txt`). **Next lever (not attempted):** ship the map stack as its
own chunk loaded with the Map tab — estimated ≈2.3 s off an immediate Skip on slow 4G (51 % of the measured 4.66–4.71 s
download; not measured). Constraint found: Expo SDK 54 moves
any module shared by two lazy chunks into `__common`, which loads with the entry (`serializeChunks.js`), so a
maplibre-only chunk would put leaflet on the first-launch page; the map stack must move as one unit that shares no non-entry module with the navigator, and map calls
made before it loads (Tasks → focus a flag) need queuing. That is a design change with its own tests, not a narrow
fix. Result: **GENUINE REMAINING BLOCKER** for the first-launch target; total time to the app is unchanged from main
(work moved, not added).

**First splash paint (+150 ms vs main).** Refined cause: Expo hoists the lazy map's `leaflet.css` and
`maplibre-gl.css` (12.8 KB gzip) into `index.html` as render-blocking links; the splash waits for them while they share
bandwidth with the welcome-font preloads. Taking them off the critical path measured −240 ms Lantern FCP. Fix needs a
map-CSS loading change (static copies or resolver, FOUC handling, service-worker caching): **NOT WORTH CHANGING in this
closure**; proposal for the performance workstream.

**Loading states (the brief's premise checked).** The sealed Option B reports contain no finding that "the splash
lacked a convincing loading or failure presentation"; that wording is finding M2 of the SkyPi R7 visual review, about
the portfolio's plate image. Flagstone's own gaps, from source: (a) the static splash has a loading cue but no
failure state; (b) **the ≈6 s post-Skip wait shows a static, screen-reader-hidden skeleton with no status** — its
docstring still assumes a local chunk that "only flashes briefly". (b) is an accessibility gap introduced by the lazy
navigator: **GENUINE REMAINING BLOCKER** for Alex. Proposal (not implemented; needs Alex + Dani): from the web-only
navigator fallback, announce "Loading Flagstone…" through the existing aria-live shim after ≈1 s, and give chunk
failures network-specific copy. No fake progress, no added animation, no navigation delay.

## 6. Changes implemented (one commit)

`0f3f1b6` fix(web): show the welcome without its fade so Chrome can measure it — `src/components/OnboardingCards.tsx`
(+9 / −1: one expression `reduceMotion || Platform.OS === 'web' ? 'none' : 'fade'` plus its comment) and
`src/components/__tests__/OnboardingCards.dynamicType.test.tsx` (+23 / −1: web and native render cases).
Nothing else changed: no Lighthouse config, threshold, budget, workflow, Expo config, dependency, auth, backend or
release file.

## 7. Measurements obtained (all in the evidence folder)

Host: MacBook Air (8 GB, 9–11 GB swap in use, another agent session running intermittent browser jobs). Every
comparison is interleaved; absolute numbers should be re-run on a quieter machine before being quoted externally.

**Lighthouse 12.1.0 (LHCI-equivalent defaults), real build vs baseline, 5 interleaved rounds** — `lighthouse/ab-real-candidate-r5/`

| build | NO_LCP / NO_FCP | Lantern FCP | Lantern LCP | perf | total bytes | QD-2 wasted | CI single-run result |
|---|---|---|---|---|---|---|---|
| d69d886 | 0 / 2 of 5 | 923–930 ms | 1,823–1,830 ms (splash) | 0.97–0.99 | 658,672 B | 146,057 B | QD-2 ×3; NO_FCP ×2 (almost every audit "no value") |
| **0f3f1b6** | **0 / 0 of 5** | 923–932 ms | 4,695–4,713 ms (welcome) | 0.81–0.82 | 658,492 B | 145,963 B | **QD-2 only ×5** |

Built-output experiment (20 runs, `lighthouse/ab-nolcp-css-r5/`): no-fade 0 / 5 NO_LCP · map CSS off the critical path
5 / 5 NO_LCP · both 0 / 5, Lantern FCP 695 ms vs 938 ms.

**Real Chrome 155, harness v3b (slow-4G on page + service worker, 4× CPU), 3 interleaved rounds** — `startup/v3b-*`

| build | splash FCP | real-Chrome LCP (element) | welcome usable | Skip at once → app | engage, Skip at +6 s → app | returning visitor → app | page errors |
|---|---|---|---|---|---|---|---|
| d69d886 | 1,800 (1,572–1,972) | 1,800 — splash tagline, 1 entry | 3,842 (3,797–3,868) | 6,194 (5,809–6,201) | 1,185 (806–1,494) | 3,345 (3,321–3,469) | 0 |
| 0f3f1b6 | 1,556 (1,552–1,624) | **3,848 (3,808–3,976) — welcome body text**, 2 entries | 3,774 (3,731–3,870) | 5,690 (5,686–6,804) | 682 (617–1,721) | 3,523 (3,358–3,648) | 0 |

Ranges overlap on every timing column: no regression. The splash difference is noise (both builds serve identical HTML
apart from the entry file name). Sealed v3 medians for comparison: welcome 3,778 · Skip → app 6,194 · engage 980 ·
returning 3,604.

**Bundles** — `builds/*/dist.sha256`: `0f3f1b6` differs from `d69d886` only in AppEntry (1,023,593 → 1,023,584 B raw)
and `index.html`; all lazy chunks byte-identical. QD-2 attribution and scenarios: `bundle-analysis/`.

## 8. Tests

| check | command | result | log |
|---|---|---|---|
| focused Jest (every suite that reads the welcome's source or Modal animation, or walks `src/`) | `npx jest --ci --maxWorkers=2 <39 suites>` | **PASS** 39 / 39 suites, 503 / 503 tests | `02-evidence/tests/jest-focused.log` |
| negative control | new web case run against the d69d886 source | **FAILS as intended** (Expected "none", Received "fade"); native case passes | `jest-negative-control.log` |
| typecheck | `npm run typecheck` | **PASS** exit 0 | `typecheck.log` |
| test-file typecheck (project tsconfig excludes tests) | one-off `tsc -p` on the changed test | 2 errors, both pre-existing and identical on d69d886 (lines 36, 262); none from this change | `typecheck-changed-test.log` |
| lint | `npm run lint` | **PASS** 0 errors, 90 warnings (unchanged pre-existing set) | `lint.log` |
| secret scan | `.husky/pre-commit` on the staged diff | **PASS** | — |
| web export | `expo export --platform web --source-maps` (CI env, synthetic placeholders) | **PASS** exit 0; only AppEntry(+map) and index.html differ from d69d886 | `builds/0f3f1b6-candidate/export.log` |
| Lighthouse (CI semantics) | 5 interleaved runs per build, each asserted alone with the unchanged `.lighthouserc.js` | candidate: QD-2 only ×5 · baseline: QD-2 ×3, no-value ×2 | `lighthouse/ab-real-candidate-r5/single-run-asserts/` |
| real-Chrome startup | harness v3b, 3 interleaved rounds | **PASS** — no regression: every timing range overlaps the baseline; 0 page errors; real-Chrome LCP = welcome body text (3,808–3,976 ms) | `startup/v3b-*` |
| browser smoke | 6 viewports + chunk-failure A/B/C | **PASS** — 6 / 6 viewports (no horizontal overflow; Skip 64×44 px, in view, keyboard-focusable); chunk failure A → app (quiet retry), B → error screen → Try again → app, C → app; 0 page errors; console errors identical to the sealed run (3 hermetic-network errors) | `smoke/final-0f3f1b6/` |
| full Jest (303 suites) | — | **NOT RUN** — the change touches one component; the 39 suites above cover every test that reads it. Deferred to the PR's CI | — |
| iOS / Android | — | **DEFERRED TO DEVICE/CI** | — |

## 9. Native qualification remaining

`03-reports/NATIVE-IMPACT-ASSESSMENT.md`. The one shared-file change evaluates identically on native (`'fade'`, or
`'none'` under Reduce Motion), proven by the iOS-preset render test. No device build or run: **DEFERRED TO DEVICE/CI**.

## 10. PR #33

`03-reports/PR33-RECONCILIATION-STRATEGY.md`: publish Option B as its own draft PR (fast-forward onto main, ancestry
preserved); do not merge or rewrite PR #33 — its app commits are already in Option B (notification files identical,
fonts superseded); its release-record and CI-fixture commits are separate tracks that conflict with Option A's merged
README and Lighthouse repair.

## 11. Remaining QA HOLD reasons

1. QD-2 fails on every valid run (owner standard decision).
2. `0f3f1b6` needs Dani's design review and a GitHub CI run.
3. Silent post-Skip wait (accessibility) — Alex.
4. Immediate Skip → app ≈6 s on slow 4G (next lever documented, not attempted).
5. Native behaviour unverified on devices; `supabase.ts` review pending.

## 12. Exact next action to reach PR readiness

Sky: Dani reviews the web welcome (`0f3f1b6`) and Alex the post-Skip loading state; then push
`optionb-qd2-lcp-closure` through a GitHub remote and open the **draft** PR with the prepared body; record the CI run
ID (expected: `unused-javascript` fails, nothing else). Un-drafting additionally needs the QD-2 standard decision,
Jordan's `supabase.ts` review and an iOS/Android smoke.

## 13. Verdict

**B. IMPROVED, STILL ON QA HOLD.** NO_LCP is fixed and verified on the real build; QD-2 is proven irreducible within
the architecture and stays an honest failure; one accessibility gap and the native gate remain. This is not release
approval.
