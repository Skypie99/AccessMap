# Option B — accessible loading after Skip and final web QA (2026-10-24)

```
mode:        ACTIVE (Sky-started session) · model_tier: opus (Sky-initiated, max effort)
project:     Flagstone (repo Skypie99/AccessMap)
branch:      optionb-accessible-loading (LOCAL ONLY — nothing pushed, no PR, no merge, no deploy)
start:       0de22e854e01f1e4635f5ad78303651eb0ecc680 (optionb-qd2-lcp-closure; code 0f3f1b6)
code head:   95d668184b558e225b3109c380c1246e7364bf80 (tree f5f16f32) — the commit adding this report changes qa-reports/ only
base:        main 6195bf0 (0 behind; fast-forward, no conflict)
workspace:   /Volumes/Lexar Project Archive/Task Outputs/Flagstone-OptionB-QA-Closure-WORKING-20261023
evidence:    /Volumes/Lexar Project Archive/Task Outputs/Flagstone-OptionB-Accessible-Loading-QA-20261023-v1-IZADZL/
prior:       …-QD2-LCP-Closure-20261023-v1-edEZVD and …-Final-Qualification-20261023-v1-XlrBNs (read only; verified unchanged)
loop health: coherence_score high · state_consistency PASS (release plane untouched) · duplicate_work_detected none · drift_risk low
```

Paths such as `02-evidence/…` and `03-reports/…` are relative to the evidence folder above.

## 1. DECISIONS FOR SKY
- [ ] **Publish the draft PR** — commands in `03-reports/RELEASE-CHECKLIST.md` §1, body in `DRAFT-PR-DESCRIPTION.md`.
  Push only through an explicit GitHub remote; this clone's `origin` is the sealed package.
- [ ] **QD-2 standard (unchanged, still failing honestly):** keep failing, change the standard in a separate CI PR, or
  change the architecture — `03-reports/QD2-DECISION-REQUIREMENTS.md`.
- [ ] **Dani:** the web welcome without its fade (reviewed here with real captures — keep it) and the new copy
  ("Loading Flagstone…", "Flagstone is open.", "Couldn't load Flagstone…") — `qa-reports/2026-10-24_DesignCompile_post-skip-loading-status.md`.
- [ ] **Still open from before:** Jordan + Sky review of the `supabase.ts` import line (`3c1b184`).
- [ ] **DEFERRED by the owner (not PASS):** Safari acceptance, VoiceOver acceptance, iPhone/iPad device testing, native smoke.

## 2. BLOCKERS / FAIL_FAST
None for the local work. One defect introduced and fixed in-session: the first status ink measured 4.47:1 (§5.3).

## 3. What a visitor got after Skip (baseline `0de22e8`, measured in Chromium 151 and WebKit 26.5)
- **Silence.** After Skip the focused button is removed and focus falls to the document; the wait shows a
  screen-reader-hidden skeleton; the accessibility tree is "Skip to content" plus an unnamed image. Nothing is
  announced at any point, including when the app arrives.
- **A blank wash first.** On a slow-4G link Chromium showed a flat wash for 1.84–2.06 s (two runs; the app held a
  blank screen while the last five font faces downloaded), then the skeleton on the stage until the app at
  5.72–5.75 s: stage → white → stage.
- **A crash screen for a network failure.** Two failed downloads (HTTP 503 or dropped mid-body) showed "Something went
  wrong — The app hit an unexpected problem and stopped"; "Try again" worked but remounted the whole app.
- **A stalled download** left the silent skeleton forever. Reduced motion made the skeleton static, so nothing at all
  signalled loading.

## 4. The correction (two commits, web-only behaviour)
`402c817d` fix(web): say the app is still loading after Skip, and when it fails
- **One loading frame for the whole wait.** The web navigator's lazy load now waits for the chunk *and* the remaining
  font faces (`Promise.all` with `allAppFontsSettled`), so `FirstLaunchGate` no longer holds a blank wash first.
- **Words after 1 s.** The frame (`ScreenFallback`, unchanged visually) gains a `role="status"` polite region mounted
  empty; after `NAVIGATOR_STATUS_DELAY_MS` (1 s) its text becomes "Loading Flagstone…", visible under the skeleton
  bars where the destination header's subtitle will sit, in the welcome's already-loaded face (no font swap).
- **Arrival announced once.** When the navigator mounts after an announced wait, the app-wide live region says
  "Flagstone is open." Waits under 1 s say nothing.
- **Accurate failure.** A download that fails twice (the existing quiet retry included) is tagged and caught by a
  small boundary that shows the existing error screen with "Couldn't load Flagstone / Check your connection and try
  again. If it keeps happening, reload the page."; "Try again" remounts only the navigator. Anything else is
  rethrown to the app-level boundary, so crashes keep their crash copy.
- Not added: progress figures, animation, focus moves.

`95d66818` fix(web): draw the loading status in body ink so it clears 4.5:1 (§5.3).

Files: `src/navigation/AppNavigator.web.tsx` (web-only), `App.tsx` (font clause removed; it was always false on
native), `src/lib/fonts.ts` (`useAllAppFonts` → `allAppFontsSettled`), `src/components/ErrorBoundary.tsx` (exports
`ErrorFallback` with optional copy), `src/navigation/ScreenFallback.tsx` (optional `children`), and the navigator
test. 6 files, +300 / −45 (≈125 of them tests).

## 5. Verification
### 5.1 Unit and integration
| check | result | log |
|---|---|---|
| navigator suite (13 tests, 5 new) | PASS 13 / 13 | `02-evidence/tests/` |
| negative control: new tests against the old source | 3 new-behaviour tests FAIL as intended; the 2 guards (quiet load, crash path) pass on both | `jest-negative-control.log` |
| 51 focused suites (every suite reading a touched file or walking `src/`) | PASS 51 / 51, 724 / 724 | `jest-focused-wip.log` |
| full Jest, 303 suites | 4,483 passed, 6 failed, 32 todo; the 6 fail identically at `0de22e8` (path-with-spaces guards in `scripts/__tests__`); one worker SIGSEGV whose suite passes alone | `jest-full.log`, `jest-env-suites-at-*.log` |
| CI's `test:ci` (coverage gate) | coverage gate PASS (90.17 / 85.68 / 89.11 / 91.22 % statements / branches / functions / lines vs 80 %); 4,495 passed, 7 failed = the same 6 path guards + 1 timeout (`LeaderboardScreen.monogram`, 15 s limit at load average 22; passes alone 7 / 7; imports no changed module) | `test-ci.log`, `test-ci-leaderboard-rerun.log` |
| `contract:check` | PASS | `contract-check.log` |
| typecheck / lint | PASS / 0 errors (90 pre-existing warnings, none in changed files); changed test file typechecks | `typecheck-*.log`, `lint-*.log` |
| secret scan (`.husky/pre-commit`, run by hand: hooks path not set in this clone) | PASS on both commits | `secret-scan-*.log` |

### 5.2 Browser matrix — 40 candidate and 26 baseline runs, all completed (`02-evidence/a11y/loading-matrix-summary.md`)
Playwright 1.62.1, offline Chromium 151 and WebKit 26.5, a local server shaping the network (held chunk, +6 s chunk,
slow-4G link, HTTP 503, mid-body drop, never-answering chunk), dead proxy for every other host; phone, desktop and
320 px viewports.
- The loading frame appears 4–82 ms after Skip in every candidate run (no blank wash in any); "Loading Flagstone…"
  at **+1,005–1,039 ms** in 38 of 40 runs — the other 2 are returning visitors whose app arrived in 0.36–0.39 s and
  correctly heard nothing; "Flagstone is open." once on arrival.
- Failures: the accurate copy in `role=alert`; "Try again" reachable by keyboard (Chromium: skip link, then Try
  again; WebKit: 1 Tab) and recovering in both engines, without the old full-app remount.
- Stalled download: the status stays; nothing claims completion. Reduced motion: static skeleton, no running
  animations, status still shown. Keyboard: no trap; nothing hidden is focusable.
- 320 px (WCAG 1.4.10): status on one line; failure screen wraps cleanly, both engines.

### 5.3 Contrast — found and fixed
axe cannot resolve the stage background ("incomplete"), so the text was measured against the rendered pixels:
`textMuted` reached only **4.47:1** at its worst pixel in light mode (the top-left brand pool is deepest at that
height). `95d6681` uses `color.text`: **9.83:1 light / 11.68:1 dark** minimum, both engines, phone and desktop.

### 5.4 axe — nothing new
The candidate's violations equal the baseline's in every state. Pre-existing and also on `main` 6195bf0 (reported,
not fixed here — Alex): welcome card scroller without keyboard access (serious); Home "Open full map" accessible name
"Open the full map" (serious, WCAG 2.5.3); page-level landmark / heading-one / region (moderate). Also surfaced:
react-native-web 0.21.2 drops `aria-atomic` everywhere (the new status relies on `role=status`, atomic by
definition — Chromium confirms `atomic=true`); ScreenStage's SVG is exposed as an unnamed image on web.

## 6. The welcome without its fade — keep it (`03-reports/WELCOME-NO-FADE-REVIEW.md`)
25 fps captures (Chromium, phone + desktop, light + dark) of the fade build `d69d886` and the no-fade builds:
- The fade never connected splash and welcome: it started from a blank page and in Chromium produced a ghost →
  white → ramp flicker. The no-fade welcome arrives complete in one frame.
- The white/pale gap between splash and welcome exists in both builds; it is app boot (fonts settling from cache,
  the onboarding read, the modal portal's first frame), lengthened here by CPU contention.
- During a fade react-native-web's Modal has no `role="dialog"` and no focus trap (both wait for `animationend`);
  axe (Chromium) flagged the role-less `aria-modal` as **critical** on the fade build. Without the fade the welcome
  is a dialog from its first frame.
WebKit's video recorder was unreliable on this host; WebKit is covered by timelines and settled screenshots.

## 7. Performance preservation (`03-reports/PERFORMANCE-COMPARISON.md`)
| | baseline `0de22e8` | candidate `95d6681` |
|---|---|---|
| AppEntry raw / gzip | 1,023,584 / 280,828 B | 1,025,502 / 281,480 B (+1,918 / +652 B) |
| Lighthouse NO_LCP / NO_FCP (5 runs each) | 0 / 0 | 0 / 0 |
| LCP element (trace) | welcome text, 5 / 5 | welcome text, 5 / 5 |
| Lantern LCP / FCP, median | 4,757 / 958 ms | 4,736 / 952 ms |
| QD-2 wasted | 145,946–145,963 B | 145,957–146,389 B |
| CI single-run result | `unused-javascript` only | `unused-javascript` only |
| welcome usable, real Chrome slow 4G (v3b, median) | 4,242 ms | 4,229 ms |
| immediate Skip → app, network-shaped harness, Chromium / WebKit | 5,750 / 6,975 ms | 5,679 / 5,907 ms |

The CPU-throttled v3b harness produced 7–79 s Skip → app outliers in **both** builds on this host (load 5–38). The
candidate's two 27 s runs were decomposed: the chunk downloaded in 3.9–4.9 s in every run; after it, both builds
spend CPU on identical work in identical proportions (react-native-web 32 %, react-dom 19 %…), uniformly stretched;
no sampled time in any new code. Navigation recovery: preserved, and "Try again" is cheaper.

## 8. Native
No runtime change is expected on iOS/Android: `AppNavigator.web.tsx` is web-only; the removed `App.tsx` clause read
`useAllAppFonts()`, which returned `[true, null]` on native; `ErrorFallback`/`ScreenFallback` only gain optional
props that native callers never pass. Typecheck and Jest (iOS preset) are not native acceptance: **DEFERRED TO
DEVICE** (owner-deferred device testing).

## 9. Remaining blockers
| item | kind | owner / next step |
|---|---|---|
| QD-2 `unused-javascript` fails every valid run (≈146 KB) | **technical failure** (documented; irreducible in this architecture) | Sky: standard decision |
| GitHub CI run of the branch | technical — not yet run (no push) | Sky publishes the draft PR |
| Safari + VoiceOver acceptance, iPhone/iPad | **owner-deferred** device testing | Alex / Sky, when un-deferred |
| native iOS / Android smoke | **owner-deferred** device testing | Sky |
| Dani design review (no-fade, copy, Layer 4/5 scores) | owner review | Dani |
| `supabase.ts` import review (`3c1b184`) | owner review (privacy) | Jordan + Sky |
| pre-existing axe serious ×2, ScreenStage SVG, RNW `aria-atomic` | pre-existing defects, not introduced | Alex backlog |
| no timeout for a download that never answers | limitation (accurate but open-ended) | proposal |

## 10. Verdict
**A. READY FOR DRAFT PR REVIEW.** The post-Skip wait is now worded, announced once, accurate on failure and
continuous on screen; one contrast defect found by testing was fixed; nothing regressed in the automated evidence.
Not merge-ready: QD-2 remains a technical failure awaiting the owner's standard decision, the branch has not run on
GitHub CI, and Safari/VoiceOver/device testing is DEFERRED by the owner — not passed.
