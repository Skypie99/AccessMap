# Flagstone R2 — Forms + Accessibility Resilience

**Date:** 2026-08-27  
**Worktree:** `/Users/skypie/AccessMap-codex/presubmission-ui-polish`  
**Branch:** `codex/presubmission-ui-polish`  
**R2 starting SHA:** `ba62599dee30a756c251f1db52f8b6b8eaa250df` (`docs(qa): record Flagstone R1 verification`)

## Scope and reconciliation

R2 implemented only the approved four repairs:

1. Nearby’s secondary chrome now scrolls with the results list at large text.
2. The denied-location banner uses a narrow stacked presentation that does not require either child to shrink horizontally.
3. Meaningful unsent Report drafts receive a discard confirmation from every explicit dismissal route.
4. The Report location-warning sentence uses the established body-medium text role; numeric coordinate disclosure remains monospace.

Preflight was completed with `GIT_OPTIONAL_LOCKS=0`, without fetching. The R1 report was the only initial dirty artifact and was committed first as the R2 starting SHA above. The planning-time R1 commits and passing gates remained accurately recorded. `.env` was confirmed ignored with `git check-ignore`; it was not opened. The audit handoff remained stopped, there were no unmerged paths, and no competing R2 source/test owner was identified.

### Candidate reconciliation

Candidate `3d8e71cbf4ddf721ab387cd6e14b5f030dce3a23` on `fix/map-banner-overflow-2026-08-27` was inspected read-only as its exact one-file `MapScreen.tsx` diff. R2 reproduced only its verified presentation mechanism in the RC lane:

- `styles.banner`: horizontal centered row → vertically stacked, stretched layout.

No candidate branch was merged, checked out, modified, or deleted. R2 did not alter `bannerLocating`, permission state, location transitions, camera behavior, gestures, or the `Linking.openSettings()` action.

## Root-cause registry

| Classification | Finding | Result |
| --- | --- | --- |
| VERIFIED | R2-F1 Nearby large-text starvation came from fixed notice/search/category siblings above the only vertical `FlatList`. | The three secondary controls now render through `ListHeaderComponent`; only grabber and title/Close remain fixed. Card and empty-state spacing own their horizontal/bottom spacing. |
| VERIFIED | R2-F2 banner clipping came from the denied-location copy and action competing in a centered horizontal row. | The local banner style now stretches and stacks its children; open-settings semantics and target remain covered. |
| VERIFIED | R2-F3 every explicit Report dismissal previously reset and closed without comparing user work to an opening state. | A Report-local session baseline and `requestClose` guard protect meaningful edits while preserving sign-in and place-pin bypasses. |
| VERIFIED | R2-F4 the human location line selected `mono` when location was absent. | The sentence is always body-medium; only separately disclosed numeric data is monospace. |
| PROVISIONAL | Candidate `3d8e71c` was runtime-verified presentation evidence, not a tested branch integration. | Its presentation-only mechanism was independently reproduced and covered in the RC lane. |
| WITHDRAWN | Shared `Sheet`, Feedback, and duplicate keyboard-avoidance ownership were not confirmed causes of an R2 defect. | No shared Sheet or Feedback source change was made. Existing preservation suites pass. |
| DEFERRED | Runtime acceptance for accessibility text, keyboard, assistive technology, reduced-motion/transparency, themes, and real devices. | Held for R5; no simulator, device, EAS build, deployment, or release action was run. |

## Implementation commits

| SHA | Commit | Files and purpose |
| --- | --- | --- |
| `866a17bddf4634921c07253ac1d536d165d32f16` | `fix(a11y): preserve usable content at large text` | `NearbyFlagsModal` and its structural test: moved location notice, search, and category controls into the list header while retaining fixed title/Close chrome. |
| `093a0af4c0fec275e548a8afb2ea1847df013c11` | `fix(forms): keep location guidance readable` | `MapScreen` and open-settings test: reproduced only the candidate’s stretched vertical banner layout and guarded the structural contract. |
| `e4164d100d5d48dada650b656866eb8e5668c2a5` | `fix(forms): protect unsent report drafts` | `ReportFlagModal`, Report tests, and the SheetPull guard: added local dirty-baseline comparison, shared close routing, typography coverage, and an async-close guard contract. |

**Final implementation SHA:** `e4164d100d5d48dada650b656866eb8e5668c2a5`

### Files changed

- `src/screens/NearbyFlagsModal.tsx`
- `src/screens/MapScreen.tsx`
- `src/screens/ReportFlagModal.tsx`
- `src/screens/__tests__/NearbyFlagsModal.description.test.tsx`
- `src/screens/__tests__/MapScreen.openSettings.test.ts`
- `src/screens/__tests__/ReportFlagModal.test.tsx`
- `src/__tests__/sheetPull.guard.test.ts`

No public props, shared primitives, storage schemas, dependencies, backend interfaces, auth behavior, permission timing, or production paths changed.

## Verification

All commands below ran in the dedicated R2 worktree. Exit status is recorded from the final invocation unless otherwise noted.

### Focused checkpoints

| Checkpoint | Command | Result |
| --- | --- | --- |
| A — Nearby allocation and focus | `npx --no-install jest --ci -w 3 src/screens/__tests__/NearbyFlagsModal.description.test.tsx src/screens/__tests__/NearbyFlagsModal.focus.test.tsx` | Exit 0 — 2 suites, 6 tests passed. |
| B — Map banner/open settings | `npx --no-install jest --ci -w 3 src/screens/__tests__/MapScreen.openSettings.test.ts` | Exit 0 — 1 suite, 10 tests passed. |
| C — Report draft protection | `npx --no-install jest --ci -w 3 src/screens/__tests__/ReportFlagModal.test.tsx` | Exit 0 — 1 suite, 86 tests passed. Covers clean/default/whitespace/revert paths; category, severity, context, staged-photo/alt-text, quick-fill, restored-draft, and explicit-location dirtiness; confirmation copy; Cancel, request-close, accessibility escape, and pull dismissal; failed/successful submit preservation; and warning typography. All submission effects remain mocks in the draft tests. |
| C — dismissal source guards | `npx --no-install jest --ci -w 3 src/__tests__/sheetPull.guard.test.ts src/__tests__/dismissalStandard.guard.test.ts` | Exit 0 — 2 suites, 24 tests passed. |
| D — Feedback, Sheet, SheetPull, keyboard preservation | `npx --no-install jest --ci -w 3 src/components/__tests__/FeedbackModal.test.tsx src/components/ui/__tests__/Sheet.dismissal.test.tsx src/components/ui/__tests__/Sheet.presentation.test.tsx src/components/ui/__tests__/SheetPull.test.tsx src/__tests__/feedbackKeyboard.guard.test.ts src/__tests__/keyboardClass.guard.test.ts` | Exit 0 — 6 suites, 59 tests passed. |

### Full gates

```bash
npm run typecheck
```

Exit 0. `tsc --noEmit` completed with no diagnostics.

```bash
npm run lint
```

Exit 0. ESLint reported 90 warnings and 0 errors. The warning inventory was not auto-fixed or otherwise changed in this narrowly scoped repair.

```bash
npx --no-install jest --ci -w 3
```

Exit 0. **246 suites passed; 3,641 tests passed; 32 todo; 0 failures; 0 snapshots; 65.891 s.**

```bash
git diff --check
```

Exit 0. No whitespace errors.

Jest output also contained non-failing Watchman filesystem-permission warnings and existing SafeAreaView deprecation warnings. These warnings were recorded, not suppressed. The final run had no Jest test failures.

## Preservation and runtime boundary

- Feedback and shared `Sheet` source were preserved.
- Static ownership remains one keyboard-avoidance layer per form: Report owns its existing layer; Feedback delegates to the expanded shared Sheet; Nearby uses list keyboard insets.
- **PRESERVED — RUNTIME CHECK DEFERRED TO R5.** Automated tests do not establish software-keyboard, default/accessibility text, VoiceOver, light/dark, Reduce Motion/Transparency, or real-device visual acceptance.
- No simulator, EAS build, merge, push, deploy, App Store, production, auth, permission-timing, database, or external-send action was performed.

## What remains

R3 and later phases, H2A, R4+, and R5 were intentionally not started. R5 retains the runtime/device acceptance matrix described above, followed by Sky’s independent review, merge, and push decisions.

## DECISIONS FOR SKY

None. R2 remained within the approved local presentation and unsent-draft-protection scope; no human decision is required to review this branch.
