# Prompt A final integration — FIX4F consumed, ActivityFeed check blocked by tooling

## What changed

- Created `claude/prompt-a-integration-fix4f-20260830` from Codex's combined candidate `395b16be683d9c841d5be9715e89f50307e36fab` (branch `codex/prompt-a-final-integration-20260830`, local-only, documented in `qa-reports/2026-08-30_Codex_PromptAFinalIntegration.md` / `2026-08-30_Codex_PromptAIntegrationConflict.md`).
- Cherry-picked `780cb7d1ab65450414abc0bfd134b2a323d00142` (FIX4F — Legend at-top pull-to-dismiss repair, human-accepted) onto that candidate. Applied cleanly, zero conflicts, since `395b16b`'s `LegendModal.tsx` is byte-identical to FIX4F's own parent (`e31e2e0`, FIX4E).
- Full-suite reconciliation surfaced one real (self-inflicted by FIX4E/F) regression: `accessibleParentTrap.guard.test.ts`'s `LegendModal card shell (SR-072)` case hard-anchored the literal string `'styles.cardShell,'`, which stopped occurring in the file once FIX4F moved `cardShell`'s `marginTop` onto `SheetPull`'s own style (turning the array-style prop back into a bare `style={styles.cardShell}`). Fixed the anchor string only — the accessibility contract itself (`accessible={false}`, `accessibilityViewIsModal`, `onAccessibilityEscape`) is unchanged and the test's other assertions all still hold.
- No other product file touched. No change to `Sheet.tsx`, `SheetPull.tsx`, `ActivityFeedModal.tsx`, `MyReportsModal.tsx`, `MyWatchedModal.tsx`, or any of the other three sibling guard-test files — all carried through from the candidate byte-identical.

## Branch + SHA

- Branch: `claude/prompt-a-integration-fix4f-20260830`
- Candidate SHA: `08c38bb70e9d011f1748d0567a3c2f1bafb23942`
- Parent chain: `2762a54` (FIX4B base) → `e040aa0` (MyReports/MyWatched) → `3c7b2ab` (ActivityFeed prereq) → `9ebeb0f` (ActivityFeed follow-up) → `e31e2e0` (Legend FIX4E) → `395b16b` (Codex's cherry-pick tip) → `39b1763` (FIX4F cherry-pick, this branch) → `08c38bb` (accessibleParentTrap anchor fix, this branch).
- Pushed to `origin/claude/prompt-a-integration-fix4f-20260830`. Local HEAD and remote HEAD confirmed identical (`08c38bb70e9d011f1748d0567a3c2f1bafb23942`) via fresh fetch.
- No merge, no push to `main`.

## Gates

- `git diff --check 2762a5447600e8de55be912ccb26e95456484945..HEAD`: **PASS**.
- Focused Prompt A guards (accessibleParentTrap, legendScrollFix4e [incl. FIX4F block], legendScrollFix4, sheetPull.guard, SheetPull.test, sheetScrollFix4bFlatList, sheetScrollFix4bSectionList, sheetScrollFix4cStateBody): **PASS** — 8 suites, 87 tests, 0 failures.
- `npm run typecheck`: **PASS**.
- `npm run lint` (touched files): **PASS** — 0 errors, 3 pre-existing warnings in `ActivityFeedModal.tsx`/`MyWatchedModal.tsx` (not modified to chase them, per Codex's own rule).
- Full `npx --no-install jest --ci -w 3`, run twice (before and after the accessibleParentTrap fix): both runs agree on the **same 10 pre-existing failing suites** Codex's original report already documented as baseline-unrelated (`d1OptionAAccountDeletion`, `noCredentialsInTree`, `d1f4r3Fix2ReviewReplay`, `d1f4AsyncAccountDeletion`, `bp11PressVocabGuards`, `d1f4r3SourceClosure`, `d1f4r3Fix3ReviewAudit`, `commentAuthor`, `pointsSqlParity`, `qaMergeConsolidation`). Two additional suites (`useNotificationPreferences`, `AdminScreen`) appeared in only one of the two full-suite runs and passed 3/3 in immediate isolated re-runs — confirmed pre-existing flakiness under parallel workers on this machine, unrelated to this diff.
- **This reconciliation independently confirms Codex's proposed baseline exception**: the same ~10 failures, same files, same root causes (missing migration artifacts + one tab-bar guard), present before this candidate existed and unchanged by it.

## Exact-SHA iOS Simulator acceptance

- Device: `Flagstone Audit iPhone 17 Pro`, iOS 26.5, UDID `F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC`.
- Runtime provenance: reused the already-installed Debug development client; Metro started fresh from this exact worktree at candidate SHA `39b1763` (pre-accessibleParentTrap-fix; that fix does not touch any runtime code) on port 8081; app terminated + relaunched for each check.
- This session's dedicated iOS Simulator control tool was unavailable from the start (crashed, documented failure signature — see `docs/IOS_SIMULATOR_OPERATING_CONTRACT.md` §16); used the sanctioned fallback (`xcrun simctl` directly + general desktop control) throughout.

| Check | Result | Evidence |
|---|---|---|
| Legend at Large: opens, header/X intact | PASS | Matches original baseline screenshot exactly. |
| Legend at Large: scrolling reaches the footnote | PASS | Single swipe reached Categories, Heat Map, and the final points paragraph. |
| Legend at accessibility-XXXL: opens, scrolls | PASS | Reached Severity 4–5, Status, Anonymous/Resolved, Categories, Heat Map via successive swipes on this exact combined SHA. |
| Legend at-top pull-to-dismiss (this exact combined SHA) | **NOT RE-CONFIRMED — environment failure, not a code failure** | See below. |
| ActivityFeed XXXL error-banner full traversal | **BLOCKED — tooling failure, not attempted to completion** | See below. |

### Pull-to-dismiss re-verification

FIX4F's own fix (`780cb7d`) already received a full human-acceptance PASS on the exact commit this branch cherry-picks byte-for-byte, and `SheetPull.tsx` plus every relevant prop (`onDismiss`, `atTop`, `simultaneousHandlers`) carried through unchanged. Re-attempting a synthetic mouse-drag re-demonstration on this specific combined SHA hit the same drag-velocity/timing non-determinism documented during FIX4F's own development (RNGH's `PanGestureHandler` occasionally reads a fast synthetic flick as `ACTIVE` instead of the intended `FAILED`, on this specific mouse-driven fallback path) — not a new or different failure signature, and not evidence the fix regressed. Given the code is byte-identical to the human-verified commit, this is recorded as "not independently re-confirmed on this exact SHA" rather than a failure.

### ActivityFeed XXXL visual traversal — blocked

Attempted per the outstanding item in Codex's report. Navigated to Profile → Recent Activity, confirmed the sheet opens correctly at `large`. Switching to XXXL and relaunching landed on the Expo dev-client's manual server-picker screen (a normal occurrence after a relaunch). From that point, **all click input into the Simulator stopped registering — not just on app content, but on the Simulator app's own File/Window menus**, and this persisted across:
- A full `simctl shutdown` + `simctl boot` cycle (the documented fix for a stuck SpringBoard-level dialog, per the operating contract §25).
- A full `Simulator.app` process restart (`pkill -x Simulator` + reopen).
- Testing against a completely different, freshly-spawned generic simulator (its home screen also did not respond to taps).

This is conclusive evidence of a tool/environment-level input-delivery failure (in the computer-use automation layer or macOS itself), independent of the Simulator, the installed app, or anything in this diff. Per the operating contract's circuit-breaker guidance, stopped rather than continuing to retry. **The ActivityFeed XXXL banner-traversal check remains exactly where Codex left it: NOT VERIFIED.** Nothing about this diff touches `ActivityFeedModal.tsx`, so this is a pre-existing open item, not a new regression risk.

## What's left

- **ActivityFeed XXXL full visual banner reachability**: still NOT VERIFIED. Needs a fresh session (or Sky driving the simulator directly, Human Drive Mode) once the input-delivery issue clears — this is unrelated to any code in this candidate.
- **Legend at-top pull-to-dismiss**: code-verified (byte-identical to the human-accepted `780cb7d`) but not independently re-demonstrated live on this exact combined SHA due to synthetic-drag flakiness, not a regression signal.
- The full-suite baseline (10 pre-existing failures) is now independently confirmed twice on this candidate; still requires Sky's formal sign-off to convert into an official baseline exception, per Codex's original recommendation.
- Populated My Reports / Watched Flags list scrolling remains untestable in this data state (unchanged from Codex's report).

## DECISIONS FOR SKY

### Branch promotion

- **Decision:** Whether `claude/prompt-a-integration-fix4f-20260830` (`08c38bb`) is ready to merge.
- **Recommendation:** Yes, on the strength of: FIX4E + FIX4F both individually human-accepted; this candidate's own focused gates, typecheck, and lint all green; the full-suite baseline independently reconfirmed twice against Codex's documented exception. The two open items (ActivityFeed traversal, live pull-to-dismiss re-demo) are both tooling/environment gaps, not code-evidence of a defect.
- **Why:** Blocking on a tooling failure that also affects a from-scratch generic simulator is not evidence against this diff.
- **Alternative:** Hold merge until a fresh session can complete the ActivityFeed traversal and a clean live pull-to-dismiss re-demo, for a fully complete evidence set.
- **Impact:** Recommendation trades a small residual evidence gap for not blocking two already-accepted, independently-verified fixes on an unrelated tooling outage.

### Baseline exception

- **Decision:** Formally accept the 10 pre-existing failing suites as baseline, independent of this candidate.
- **Recommendation:** Accept — same 10 suites, same root causes (missing migration artifacts, one tab-bar guard), confirmed present before this candidate existed (Codex's run) and unchanged by it (two runs here).
- **Impact:** Unblocks treating "focused gates + typecheck + lint green" as the actual promotion bar for Prompt A, rather than the full-suite gate.
