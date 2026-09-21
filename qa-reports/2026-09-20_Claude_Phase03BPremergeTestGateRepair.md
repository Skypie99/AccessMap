# Phase 03B pre-merge local test-gate repair

**Date:** 2026-09-20
**Scope:** LOCAL ONLY. No production/staging contact. No push. No merge to main.
**Base closure SHA (accepted, unchanged):** `aed2981338fb19abae69ce58034025c95c5d3f3d`
**Base closure tree (accepted, unchanged):** `bcfca69f0ee500140bbd0e2925d51ad4b04154c8`
**Repair branch:** `codex/flagstone-p03b-premerge-test-gate-repair-20260920`
**Worktree:** `/Users/skypie/AccessMap-phase03b-merge-20260920`

## Step 1 — baseline verification

Confirmed before touching anything:
- Worktree `HEAD` = `aed2981338fb19abae69ce58034025c95c5d3f3d`, tree = `bcfca69f0ee500140bbd0e2925d51ad4b04154c8` (both match the accepted closure exactly).
- `origin/main` = `70b52a3`, confirmed an ancestor of `aed2981` (351 commits between them, all already-existing Phase03B work — consistent with "clean fast-forward, zero conflicts").
- No Phase 03C work in the worktree (only closure docs asserting its absence).
- Working tree was clean before the repair branch was created.
- A prior QA snapshot (`qa-reports/phase03a/2026-09-05-owner-resume/full-jest-classification.json`) shows this exact set of 14 failing tests / 12 suites already existed on 2026-09-05, unchanged (`exactFailureNamesMatch: true`, `introducedFailures: []`) — this is long-standing, tracked debt, not something introduced by this merge. That report explicitly deferred fixing it ("Inherited failing files were not edited").

## Step 3 — reproduction

Full gate reproduced independently (not trusted from the task summary):
`297 suites total → 285 passed / 12 failed`, `4422 tests total → 4376 passed / 14 failed / 32 todo` — matches exactly.

## Classification (Step 3 requirement: every failure classified before any code changed)

| Suite | Classification | Root cause |
|---|---|---|
| `privacy.guard.test.ts` | **A. REAL REGRESSION** | `src/lib/copy.ts` drifted from the ratified em dash to a period; `design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md` (the ratifying doc) still has the em dash — no evidence of later ratification. |
| `TasksScreenFlagCard.test.tsx` | **A. REAL REGRESSION** | `TasksScreen.tsx`'s Verify/Reject/Details action labels used `:` instead of the accepted `—` (BP3/T8 contract, `DECISIONS.md`: "T8 CLOSED... F4-08 each action names its flag"). |
| `bp3TrustEngineGuards.test.ts` | **A. REAL REGRESSION** | Same root cause as above (source-text half of the same contract). |
| `mapChromeBudget.guard.test.ts` | **B. STALE GUARD** | Commit `92e0c2d` ("fix(a11y): resolve visual freeze layout failures", Sky Pie, 2026-08-31) deliberately extended the callout-inset formula with `locationBannerInset` to clear the denied-location banner. Guard never updated. |
| `hitTargetFrame.guard.test.ts` | **B. STALE GUARD** | Commit `0cb5329` ("fix(map): remove duplicate heat notice", Sky Pie, 2026-08-31) intentionally removed the empty-state heat notice entirely — confirmed by a sibling test (`MapScreenHeatEmpty.test.ts`) from the *same commit* asserting its absence. This guard was the one straggler still asserting the opposite. |
| `dismissalStandard.guard.test.ts` (test C) | **B. STALE GUARD** | `useSheetPullDismissLifecycle` (shared hook, `SheetPull.tsx`) genuinely gates `animationType` on reduced motion (`reducedMotion || pullDismissing ? 'none' : 'slide'`); the guard's regex only recognized an inline ternary, not the extracted-hook form. |
| `dismissalStandard.guard.test.ts` (test J) | **B. STALE GUARD** | Commit `8df6082` ("fix(ui): consolidate build 32 stabilization") wrapped every SheetPull-dismissable's `onDismiss` with `pullRef.current?.resetAfterDismiss()` — still calls the forwarded prop unconditionally, just no longer a bare identifier. Guard's exact-match and the `FOCUS_RETURN_EXEMPT` literals predate the wrapper. |
| `focusOnOpen.guard.test.ts` | **B. STALE GUARD** | Same commit (`8df6082`) moved `AddressSearchModal.tsx` off its own `<Modal>` onto the shared `<Sheet>` primitive (which already runs `useFocusOnOpen` once for all consumers, per this file's own pre-existing "DELEGATED SURFACES" convention). The old per-file exemption had nothing left to match. |
| `keyboardClass.guard.test.ts` | **B. STALE GUARD** | Same commit (`8df6082`) migrated `AddressSearchModal.tsx`, `HelpModal.tsx`, `MyFeedbackModal.tsx` onto the shared Sheet `keyboardAvoiding` delegate (Recipe D). Verified all three actually opt in. The guard's hardcoded consumer list was never grown to match. |
| `visualFreezeFixWave.guard.test.ts` | **B. STALE GUARD** | Same commit; `AddressSearchModal.tsx`'s top-safe-area margin moved into the shared `Sheet.tsx` (`expandedTopMargin = insets.top + spacing.sm`) instead of being local. |
| `Wave2ScreenGeometry.test.ts` | **B. STALE GUARD** | Same commit added an `onDismiss` handler to `FlagDetailModal.tsx`'s `<Modal>` tag, pushing it past Prettier's line width and wrapping `aria-label` onto its own line — same tag, same first prop, pure reformat. |
| `bp11PressVocabGuards.test.ts` | **B. STALE GUARD** | Commit `e1689d5d` (VP1, 2026-08-29) added a persistent, decorative, `pointerEvents="none"` active-tab selection wash (`styles.selectedFill`) — unrelated to the press-dim the guard (written 2026-07-17, predates VP1) was checking for. The Pressable itself still carries no `backgroundColor`. |
| `tasksHeaderReclaim.guard.test.ts` | **B. STALE GUARD** | Commit `76ee355` ("fix(final-polish): consolidate sheet and filter repairs") relabeled the All/Mine toggle chip from `"Show all flags"` to `"Reports, All"` (adding a shared "Reports," group prefix); same control, same position. |

No suite required an **C. AMBIGUOUS / HOLD** classification — every finding had direct, unambiguous evidence (git blame + commit message + in-repo cross-references, in two cases a sibling test from the very same commit).

## Accessibility findings (Step 4)

Both accessibility-flagged surfaces (reduced-motion gating, focus-return/onDismiss wiring) were verified as **NO REAL REGRESSION**: the underlying behavior is intact and, in the focus-return case, provably *more* correct than the bare-forward baseline (it now also resets the native pull-driven translation before the parent's own dismissal handler runs, preventing a one-frame visual flash — see `SheetPull.tsx`'s own JSDoc). Only the guards' pattern-matching needed to grow to recognize the shared-hook / wrapped-forward forms. No implementation changes were made for these two guards.

## Privacy copy (Step 5)

`src/lib/copy.ts`'s "Who else sees your data." paragraph was restored to the exact ratified text in `design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md` (em dash, lowercase "that's"). No evidence of later ratification of the drifted (period) text was found — the source document itself still has the em dash.

## Files changed

Implementation (2 files):
- `src/lib/copy.ts` — 1 line, privacy copy restored to ratified text.
- `src/screens/TasksScreen.tsx` — 4 lines, Verify/Reject/Details action-label punctuation restored to the accepted em-dash contract.

Guards updated, narrowly, with inline evidence comments (9 files):
- `src/__tests__/dismissalStandard.guard.test.ts`
- `src/__tests__/focusOnOpen.guard.test.ts`
- `src/__tests__/hitTargetFrame.guard.test.ts`
- `src/__tests__/keyboardClass.guard.test.ts`
- `src/__tests__/visualFreezeFixWave.guard.test.ts`
- `src/screens/__tests__/Wave2ScreenGeometry.test.ts`
- `src/screens/__tests__/bp11PressVocabGuards.test.ts`
- `src/screens/__tests__/mapChromeBudget.guard.test.ts`
- `src/screens/__tests__/tasksHeaderReclaim.guard.test.ts`

No migration files, no Phase03B closure/restoration evidence, no recovery comparator/exclusion logic, and no Phase03C files were touched (confirmed by `git status --short` before commit — exactly and only the 11 files above changed).

## Validation results

- Focused retest (all 12 originally-failing suites, individually and in groups): **PASS**.
- `npx tsc --noEmit`: **PASS** (exit 0, no output).
- `npx jest --ci -w 3`: **297/297 suites PASS**, **4390/4422 tests PASS + 32 todo** (0 failed). Counts unchanged from the pre-repair total (4422) — no tests were added or removed, only fixed/reclassified.

## Repair commit

See git log on `codex/flagstone-p03b-premerge-test-gate-repair-20260920` for the exact commit SHA/tree (recorded at commit time, after this report).

## Next safe action

Return the repaired candidate to Sky for a fresh, independent final main-reconciliation validation and push authorization. This branch has not been pushed and has not been merged.
