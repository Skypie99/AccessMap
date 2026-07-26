# BP13 — Verification Evidence — "The honest arrival + word every wait"

**Phase:** BP13 (T7 + T9) · **Branch:** `r2/bp13-arrival-waits` · **Base:** `705a798` (BP12 tip) → **Tip:** `6e8e636` · **Date:** 2026-07-18
**Commits (5):** `ee79bb1` T7 voice+frame · `877c9ab` T7 guards · `5d98df8` T9 · `01eb35c` T7 regionForFlags typecheck fix · `6e8e636` T7 race fix (deep-link retire + openReport exclusion, adversarial-driven).
**Provenance:** Authored on Claude Fable 5 max effort (2026-07-15, the synthesis window). EXECUTED on Opus 4.8 ultracode max effort, all sub-agents max (S-10). This was the **Sky-authorized in-window completion of a stranded/interrupted BP13 run** — a prior run left T7 partially built + uncommitted in the working tree; reconciled per the phase RESUME RULE (never redone; continued from the first gap).

## Resume reconciliation (stranded vs built)
The interrupted run had left, uncommitted:
- **Item 1 (T7/voice): ~complete** — `NO_LOCATION_HINT`, `noLocationHint` state, FAB-clears-on-real-answer, undetermined→`announce`(web), the polite `role="text"` banner. VERIFIED correct, committed.
- **Item 2 (T7/frame): PARTIAL** — native `snapToRegion` primitive only. MISSING: the web `snapToRegion` impl + ALL MapScreen bounds-fit wiring (0 T9 markers either). BUILT the missing halves.
- **Items 3–7: not started.** BUILT.

## Per commit-plan item
1. **T7/voice (F4-03)** — commit `ee79bb1`. NEW polite element (`accessibilityRole="text"`, `accessibilityLiveRegion="polite"`) reusing `styles.banner` INK only → `NO_LOCATION_HINT`. Gated on the RAW status via `arrivalPermissionDenied` — never "off". Mutually exclusive with the assertive DENIED banner (byte-identical). Web publishes once through the announce shim (`announce.ts`, consumed not edited). `noLocationHint` clears on the FAB's real answer (grant/deny).
2. **T7/frame (F5-03)** — commit `ee79bb1` (+ typecheck fix, see Gates). `regionForFlags` fits the viewport to the loaded rows; `snapToRegion` (new `PlatformMapHandle` method, BOTH variants) cuts to it ONCE, instantly. Native = `animateToRegion(_, 0)`; web = `instantCut` (setView animate:false) + `deltaToZoom` — reusing BP1's instant-camera path, never forked. Guarded: one-time (`didInitialFitRef`), `location === null`, plain no-param arrival only (never focusFlag/deep-link/openReport), no-gesture proxy (`currentRegionRef === DEFAULT_REGION`); empty→`DEFAULT_REGION`, singleton→fixed zoom.
3. **T7/guards** — commit `877c9ab`. `MapScreen.arrival.test.ts`: S4 gate assertion updated for the two-arm branch; new BP13/T7 describe (+5): status-neutral hint, undetermined→hint+announce, polite/role=text mutual-exclusion, one-time instant fit, `regionForFlags`→DEFAULT + web `snapToRegion` reuses `instantCut`. 9→14 tests. Banked probes re-cited (`probe-f403-denied-real.mjs` + `probe-f503-skeptic.mjs` — per the skeptic, the banked `map__*__permission-denied` captures depict the UNDETERMINED state this phase voices).
4. **T9/gates (F5-02, HIGH)** — commit `5d98df8`. Home headline gated on `error && flags.length === 0` (→ neutral "—"; never "0 barriers"); first-load → "Loading…". Map pill's honest 4th arm (`loadError && flags.length === 0 ? "Couldn't load flags"`), gated on `&& flags.length === 0` so the SWR stale path keeps its cached count; S11 loading/count strings byte-identical (only re-indented).
5. **T9/retry-verb (F5-05)** — commit `5d98df8`. Map error banner APPENDS the retry verb to its EXISTING single `AppText` via `copy.ts::failureBannerText` — no new child (M10 grouping + box-none footprint preserved); `accessibilityLabel`/`Hint` retry wiring unchanged.
6. **T9/one-recipe (F5-05/09)** — commit `5d98df8`. `copy.ts` single-sources `RETRY_VERB` + `failureBannerText` (provider msg + verb, de-duped). Tasks adopts it (drops its inline literal). ReportFlagModal keeps WORDS beside the submit spinner ("Filing your report…" in `submitBusyRow`). NOT a shared component — each screen keeps its container.
7. **Captures** — see §Captures.

## Gates
- **typecheck: 0 errors** (real `tsc` exit 0). NOTE: a `regionForFlags` `noUncheckedIndexedAccess` slip rode into the T7 commit (the first background typecheck's trailing `echo` masked tsc's real exit — a process slip on my part); the **full typecheck caught it** and it was fixed (`const first = rows[0]; if (!first) …`), commit `01eb35c` (also updated the guard's empty-fallback assertion to match).
- **jest: 2014 passed / 0 failed, 137/137 suites — a CLEAN full parallel run** (`be6xy56ba`). Baseline **2000** (BP12 tip) + **14 BP13 guards** (arrival +5, `bp13FailureVoice` +9). Two earlier parallel runs surfaced the documented BP1/BP2/BP11 async-`waitFor` / worker-teardown flakes (run 1: 3 suites incl. ReportFlagModal; run 2: 0 of those recurred) — all **green in isolation** (ReportFlagModal 41/41, arrival 14/14 via `--runInBand`) and **absent from the clean run 3**. The sole non-flake failure across runs was my own outdated assertion (fixed in `01eb35c`).
- **lint: 0 errors / 77 warnings = the BP1 baseline** — every warning is in an UNTOUCHED file (`flags.ts`, `flagsStore.tsx`, `NearbyFlagsModal.tsx`); **no new warnings** from any BP13 file.
- **7 immutable stacks: untouched** — diff-check: no `*-stacks.json` in the tracked diff.
- **Arbiter: NONE** — this phase changes no color/floor/ink pair (spec §4). The hint/pill/banner reuse existing inks (`styles.banner`, `styles.statusText`, `styles.errorBannerText`); no new token+backdrop pair introduced.
- **Diff scope: exactly 9 tracked files** (`PlatformMap.tsx`, `PlatformMap.web.tsx`, `copy.ts`, `HomeScreen.tsx`, `MapScreen.tsx`, `ReportFlagModal.tsx`, `TasksScreen.tsx`, `MapScreen.arrival.test.ts`, `bp13FailureVoice.test.ts`) + untracked `design-reviews/` artifacts. No stray files.

## PROTECT before/after (git-verified)
- **Assertive DENIED banner** (`permissionDenied`): **byte-identical** — not in the diff.
- **S11 read ladder**: string CONTENT + thresholds **byte-identical**; the `filtersActive`/`Showing` branches gained +2 spaces of indentation (mechanical nesting under the new 4th arm — no content/threshold change). "Words the states around it" honored; `'Loading flags…'`/`'Updating…'` untouched (context-only in diff).
- **PROTECT-2 recovery card** (Home error card "Couldn't load barriers." + Try again): **untouched** — only the headline was edited, not the error card.
- **Home honesty law** (no fabricated distances): the fit changes the CAMERA only; no distance row touched.
- **PROTECT-19 em-dash grammar**: `NO_LOCATION_HINT` uses the em-dash; `RETRY_VERB` is deliberately a second sentence (not a "state — next step" status line) — documented.
- **box-none overlay law**: the polite banner + the error banner stay in the existing overlay region; the retry verb was appended to the existing `AppText` (footprint unchanged).

## PROPOSED strings (S-8 — Sky signs final at BP16)
| Surface | Before | After (PROPOSED) | Note |
|---|---|---|---|
| Map undetermined arrival | (silence) | "Location isn't on yet — showing the most recent flags, not ones near you." | spec sketch said "reports"; shipped "flags" to match the shipped DENIED banner's voice |
| Home headline (first load) | "—" | "Loading…" | F5-01 |
| Home headline (settled failure) | "0 barriers" (computed) | "—" (neutral placeholder) | F5-02; the error card carries the words |
| Map pill (settled failure) | "Showing 0 flags" | "Couldn't load flags" | F5-02 4th arm |
| Failure banner retry verb | (Tasks-only inline) | "&lt;provider msg&gt;. Tap to retry." | F5-05 single-sourced (`RETRY_VERB`) |
| Submit (pending) | (silent spinner) | spinner + "Filing your report…" | F5-09 |

## Drift notes (VERIFY-FIRST)
- All spec line refs drifted (`a8549ff` → `705a798`+stranded); re-grepped each. Real anchors: Home headline `HomeScreen.tsx:~190` (spec :185); Map pill `MapScreen.tsx:~1618` (spec :1463); Tasks recipe `TasksScreen.tsx:621`; error banner `MapScreen.tsx:~2280`.
- **currentRegionRef gesture guard**: the spec's "no-gesture proxy (`currentRegionRef === DEFAULT_REGION`)" assumes the ref tracks gestures; in THIS tree it is written ONLY on the location-sync (line 1417), never on pan → the proxy is equivalent to "location still null." Adapted as written, belt-and-suspenders with the explicit `location === null` + one-time + plain-arrival guards. Noted, not a defect.
- The spec's ":315/:1022" mirror refs don't map 1:1; the GATING PATTERN (`error && flags.length === 0`) is what I mirrored, and it's present.

## Captures / NEEDS-SKY-DEVICE
- **Static-export render / captures: declared NEEDS-SKY-DEVICE (honest, per BP10 precedent).** The two frames this phase creates — the undetermined no-location arrival and the settled-failure states — are status/failure-triggered: the `probe-export.mjs` rig grants geolocation (so `status` = granted → neither the undetermined hint nor the null-location fit fire) and never forces a failed fetch, so it cannot exercise the new paths. The render-no-regression for the four touched render-path screens is covered instead by: typecheck 0, jest 2014/0 (incl. ReportFlagModal rendering 41/41 in jsdom + the source-invariant suites for Map/Home/Tasks), and the fact that the new web code reuses PROVEN primitives (`instantCut`/`deltaToZoom`, the S9 `announce` shim, `styles.banner`). A heavy export build was not run given that low risk + the strong gate coverage.
- **R2-D17** (device): native "Not now" (undetermined) arrival shows the polite hint; native REAL-denial arrival fires the assertive S4 banner; VoiceOver hears ONE arrival announcement; the no-location arrival shows real flags in-viewport (a TRUE frame), not the empty SF default. Plus the Home headline "Loading…"/"—"/count at Dynamic Type, and the F5-02 settled-failure frame (Home + Map pill).

## Adversarial verify (Opus, high effort — S-10)
**Round 1 — 4 skeptics (parallel Workflow `wf_b26cb334-3e2`):**
- `protect-byte-identity` — **UPHELD (high)**, 0 findings. DENIED banner byte-identical (base 2318-2327 == HEAD), S11 ladder strings/thresholds unchanged (4th arm inserted around them), Home recovery card byte-identical, error-banner footprint unchanged (verb appended to the existing AppText).
- `honest-counts` — **UPHELD (high)**, 0 findings. No {loading,error,offline,settled}×{empty,non-empty} combination renders a false zero; SWR stale path keeps its count; verified against `flagsStore` (error-without-cache keeps `flags`, cache-fallback sets `error=null`).
- `single-source-fence` — **UPHELD (high)**, 0 findings (1 NIT). De-dupe correct, Map+Tasks route through the helper, submit-verb component-level, blur budget +0, zero Supabase writes. NIT (applied): the `copy.ts` comment overclaimed that Home also routes through the helper — corrected (Home keeps its own button card).
- `arrival-frame` — **REFUTED → FIXED.** MEDIUM race: on a location-null **deep-link** arrival, the fit bailed on the truthy `flagId` without retiring; the deep-link's ~800ms `flagId` self-clear re-ran the effect (all guards then passed) and `snapToRegion` yanked the viewport off the linked flag. FIX (`6e8e636`): a camera-moving intent arrival (focusFlag/flagId) now retires the auto-fit BEFORE the flags gate.

**Round 2 — re-verify the fix (`general-purpose` skeptic, agent a646b58):** confirmed the deep-link race is fully closed, and caught a follow-up NEW-BUG — retiring on `openReport` was over-broad (openReport moves no camera → a null-location Report-pill arrival was stranded on the SF default). FIX (folded into `6e8e636`): dropped `openReport` from the retire + deps.
**Round 3 — confirm the follow-up fix (same skeptic, at HEAD `6e8e636`): CLEAN.** All three claims hold: (1) the openReport arrival earns the honest fit again + a resolving `requestLocation` is still superseded by `if (location) return`; (2) the deep-link/focusFlag stomp remains fully closed; (3) no new bug from the deps drop (exhaustive-deps satisfied, no stale closure) or from the fit firing behind the report sheet (the sheet reads its coord from `dropLocation`/GPS, not the visible map center). No refutation found.
**Net: 3/4 UPHELD + 1 REFUTED→FIXED (deep-link race) + 1 re-verify NEW-BUG→FIXED (openReport) → Round-3 CLEAN. Both fixes guard-tested (arrival 14/14).** The adversarial pass earned its keep — it caught a real viewport race the type/unit gates could not.
