# Phase 03B pre-merge repair — correction

**Date:** 2026-09-20
**Scope:** LOCAL ONLY. No production/staging contact. No push. No merge to main.
**Corrects:** `e1359854b80191e6a693be6d7aa9a9cf442411f0` ("fix(phase03b): repair pre-merge local test gate — 12 suites / 14 tests")
**Base closure SHA (accepted, unchanged):** `aed2981338fb19abae69ce58034025c95c5d3f3d`
**Repair branch:** `codex/flagstone-p03b-premerge-test-gate-repair-20260920`
**Worktree:** `/Users/skypie/AccessMap-phase03b-merge-20260920`

## Why this correction exists

`e1359854` classified both the privacy-copy drift and the TasksScreen a11y-label
drift as "real regressions" against `d7b33fd` (`Sky Pie`, 2026-08-31,
"fix(copy): remove release-blocking em dashes") and reverted both back to
em-dash wording. Independent re-verification found that treatment was only
half right:

- **Privacy copy:** the doc `e1359854` trusted as ratifying ground truth
  (`design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md`) carries only an
  **AGENT-PROPOSED** note (QA 2026-08-18, closes S11) — never ratified — and
  was simply never updated when `d7b33fd` shipped three weeks later. `d7b33fd`
  is Sky's own, more recent, standing decision; the doc was stale, not the
  code.
- **TasksScreen a11y labels:** by contrast, `design-reviews/r2-audit/build-plan/DECISIONS.md:61`
  (dated 2026-07-26, device-verified per
  `design-reviews/r2-audit/build-plan/evidence/BP03-verification-evidence.md`)
  is a **ratified** VoiceOver contract (BP3 → R2-D1) that specifies em-dash
  wording — `"Verify this flag — No ramp, 639 m"` — as the fix for a real
  blind-user (R2 persona) confusion bug (hearing "Verify this flag" ×6 in a
  row with no way to tell which flag). `d7b33fd`'s em-dash removal was a
  blanket, mechanical sweep across `copy.ts` and `TasksScreen.tsx` with no
  evidence it was meant to knowingly override this specific, tested
  accessibility contract. `e1359854`'s restoration to em dash was therefore
  correct here — this repair preserves it as a documented, narrow exception,
  confirmed with Sky directly.

Sky confirmed this split decision explicitly on 2026-09-20.

## Corrected precedence

1. `d7b33fd` remains authoritative for **ordinary copy punctuation** — the
   privacy-policy sentence in `src/lib/copy.ts` uses the period wording.
2. The **4** TasksScreen `a11yLabel` strings (Verify, Reject, and both "View
   flag details" — *not 5*; "Mark this flag resolved" and "Sign in to review"
   already read with colons and were never touched by `e1359854`) keep the
   **em-dash** wording already restored by `e1359854`, as a narrow exception
   carved out by the more specific, ratified, device-verified BP3/R2-D1
   VoiceOver contract. `TasksScreen.tsx` is unchanged by this correction.
3. `design-reviews/r2-audit/build-plan/DECISIONS.md` (the BP3/R2-D1 contract)
   is **unchanged** — it is not stale, it is the reason for the exception.
4. `src/screens/__tests__/bp3TrustEngineGuards.test.ts` and
   `src/screens/__tests__/TasksScreenFlagCard.test.tsx` are **unchanged** —
   they already assert the em-dash wording that matches the preserved
   implementation.

## Files changed (2)

- `src/lib/copy.ts` — 1 line: the "Who else sees your data." body reverted
  from em dash back to period, matching `d7b33fd`.
- `design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md` — the same sentence
  updated to period wording to match, plus the stale AGENT-PROPOSED note
  annotated as superseded by `d7b33fd`.

No other file was touched. In particular, unchanged and preserved:

- `src/screens/TasksScreen.tsx` (em-dash a11y labels, from `e1359854`)
- `design-reviews/r2-audit/build-plan/DECISIONS.md` (BP3/R2-D1 contract)
- All 9 guard test files `e1359854` fixed for unrelated stale-guard reasons
  (`dismissalStandard`, `focusOnOpen`, `hitTargetFrame`, `keyboardClass`,
  `visualFreezeFixWave`, `Wave2ScreenGeometry`, `bp11PressVocabGuards`,
  `mapChromeBudget`, `tasksHeaderReclaim`)
- Migrations, Supabase config, Phase03B closure/restoration evidence,
  recovery comparator/exclusion logic, Phase03C files — none exist in this
  diff.

## Validation

- Focused retest of the 12 originally-failing suites: **12/12 PASS**,
  193/193 tests passed.
- `npx tsc --noEmit`: **PASS** (exit 0).
- `npx jest --ci -w 3`: **297/297 suites PASS**, 4390/4422 tests passed + 32
  todo, **0 failed**.

## Next safe action

Return this corrected candidate to Sky for a fresh, independent final
main-reconciliation validation and push authorization. Not pushed, not
merged.
