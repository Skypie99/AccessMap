# Flagstone VFW2B Residual Live-P1 Closure

## Scope and evidence

This repair is based on the valid Terra reverify of commit `93caa714b5293f66fee9c6debbef927144019575` (tree `3ac8039e606e8358c40a50a3ed0525984b5f89b5`). The manifest, live receipt, five residual failure images, and the two relevant normal-size comparison images were inspected before source mutation.

The product tree started clean. `qa-reports/FLAGSTONE_POST_RELEASE_VISUAL_AUDIT_BACKLOG.md` was the sole pre-existing status entry and remained untracked, unstaged, and untouched.

## Root causes and changes

### Profile Achievements XXXL

The expanded sheet had enough outer height, but the shared header title was the only vertically flexible child above its subtitle, allowing the AX subtitle to collapse it. Achievement rows also retained a three-column horizontal composition, leaving uncapped body text in an artificially narrow middle column.

- `src/components/AchievementsModal.tsx` opts into natural title height only at the accessibility recompose threshold.
- Achievement rows preserve their original normal branch and move the description below the icon/title/status header only at accessibility sizes.

### Profile Updates XXXL

The same header-title collapse applied. Each preference row also reserved width for a 76-point badge and a switch while leaving the uncapped explanatory sentence in the remaining middle column.

- `src/components/NotificationPrefsModal.tsx` opts into the AX-only header and row recomposition.
- `src/components/ui/PrefsRow.tsx` adds a default-off reflow option that keeps badge/title/switch together and gives the explanation full width below them. `NotificationPreferencesScreen` and every normal-size caller retain the existing branch.

### Watched Flags XXXL

Wave 2 correctly removed centered negative overflow, but the EmptyState retained normal-size padding and a 280-point body line length inside the smaller remaining body below the search/filter controls.

- `src/components/MyWatchedModal.tsx` reduces EmptyState padding and uses the available line width only at AX.
- `src/components/ui/EmptyState.tsx` adds a default-off body-style override. Every other adopter retains the 280-point default.

### Report MAX open and keyboard

The focus label and outer keyboard-avoiding chain were correct. The remaining obstruction was Report-local: its action row remained a fixed sibling of the body, subtracting a full footer from the MAX viewport and continuing to reserve that fixed block after the keyboard had already reduced the available region. The footer was not numerically counted twice; the nested physical reservations produced the same practical trap.

- `src/screens/ReportFlagModal.tsx` renders the same unchanged Cancel/Submit action element as the final body-scroll item at AX. Normal text keeps the existing sticky footer. This restores the physical reveal space needed by quick-fill and the focused description editor without changing shared keyboard behavior.

## Shared primitives

- `src/components/ui/Sheet.tsx`: additive `reflowHeaderTitle` option. Only AX Achievements and Updates opt in; defaults and passed Leaderboard geometry are unchanged.
- `src/components/ui/PrefsRow.tsx`: additive `reflow` option. Only Profile Updates opts in at AX.
- `src/components/ui/EmptyState.tsx`: additive `bodyStyle` option. Only Watched Flags opts in at AX.

## Tests

Updated bounded structural and direct primitive coverage:

- `src/__tests__/sheetBodyScrolls.guard.test.ts`
- `src/__tests__/visualFreezeFixWave.guard.test.ts`
- `src/components/ui/__tests__/EmptyState.test.tsx`
- `src/components/ui/__tests__/Sheet.presentation.test.tsx`

Final bounded run:

```text
Test Suites: 10 passed, 10 total
Tests:       186 passed, 186 total
Snapshots:   0 total
Exit:        0
```

Jest printed its generic asynchronous-open-handle advisory after the successful result; no suite or assertion failed.

```text
npm run typecheck
Exit: 0
```

```text
npm run lint
92 warnings, 0 errors
Exit: 0
```

The warning set is unchanged from the base candidate. The React quality review found no new hook dependency, semantic-control duplication, or default-branch regression.

```text
git diff --check
Exit: 0
```

Full Jest was not required: each shared change is additive, default-off, directly tested, and has an enumerated opt-in consumer set.

## Branch and provenance

- Branch: `claude/prompt-c-final-accessibility-20260830`
- Base SHA: `93caa714b5293f66fee9c6debbef927144019575`
- Base tree: `3ac8039e606e8358c40a50a3ed0525984b5f89b5`
- Delivery SHA: the commit containing this report; the exact SHA/tree are recorded in the final VFW2B receipt.

## Scope audit

- Visible shipping copy: unchanged.
- Address Search, Feedback, Profile main, Leaderboard, and PlatformMap: unchanged.
- Supabase, production data, privacy/release configuration, EAS, dependencies, and generated artifacts: unchanged.
- Simulator: not used.
- Push and merge: none.

## What's left

Terra should repeat only Profile Achievements XXXL, Profile Updates XXXL, VF-10 MAX, VF-17 MAX open, and VF-17 MAX with keyboard. Normal Achievements/Updates do not need repetition because all changed presentation branches are gated by `isAxRecompose`, while their default branches and shared defaults remain unchanged. Fable and UI freeze remain pending that live result.

## DECISIONS FOR SKY

### Advance only after the five-state residual Terra run passes

- Decision: whether this candidate is ready for Fable and final UI freeze.
- Recommendation: wait for the five exact live states above.
- Why: source and bounded automated coverage establish ownership, but only Terra can close the pixel-level failures that triggered VFW2B.
- Alternative: accept source-side closure without live confirmation.
- Impact of the alternative: FV-1 or FV-4 could remain a release P1 despite a green source tree.
