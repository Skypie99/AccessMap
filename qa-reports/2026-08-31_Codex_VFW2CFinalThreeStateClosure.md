# Flagstone VFW2C Final Three-State Closure

## Scope and evidence

This local repair starts from `143985411acb8ca9e09ea8cbd020a5d2e9d1c375` (tree `1690290354b68d4d957c3255fa9fbb351cdece74`). The fresh `targeted-143985` manifest and exactly three residual failure captures were inspected before source mutation:

- Profile Achievements XXXL
- Profile Updates XXXL
- VF-10 Watched Flags MAX

The tracked product tree started clean. `qa-reports/FLAGSTONE_POST_RELEASE_VISUAL_AUDIT_BACKLOG.md` was the sole pre-existing status entry and remained untracked, unstaged, and untouched.

## What changed

### Achievements and Updates XXXL headers

Both sheets already opted into the VFW2B `reflowHeaderTitle` path. That path added `flexGrow`, `flexShrink`, and `flexBasis` beside the title's base `flex: 1` shorthand. The flattened native style therefore still carried the shorthand, and Yoga continued treating the title as a zero-basis flexible child inside the indefinite-height title/subtitle column. The subtitle contributed height while the title collapsed out of the visible header.

`src/components/ui/Sheet.tsx` now overrides the same shorthand with `flex: 0` in the existing default-off reflow style. That makes the title's intrinsic text measurement contribute to header height. Only Achievements and Updates pass the option, and only at the accessibility recomposition threshold; every normal and non-adopting Sheet path keeps `flex: 1`.

### Watched Flags XXXL empty instruction

The prior top-alignment and width changes worked, but the fixed search/filter/sort controls left the AX body one line short. The empty state still spent height on its decorative path, remaining vertical pad, and the normal 1.4 body leading. The required sentence therefore began its final line below the visible edge.

`src/components/MyWatchedModal.tsx` now yields the decorative mark and vertical pad only at AX, and applies the existing `font.lineHeight.sm` token to that local body. The title and complete instruction retain uncapped Dynamic Type; the existing body ScrollView, reachable top, and overflow scrolling remain unchanged. Normal text keeps the mark, padding, line height, and centered composition.

## Shared primitive safety

- `Sheet.tsx` changed only the existing default-off `reflowHeaderTitle` style.
- Exact opt-in consumers: Achievements at AX and Updates at AX.
- Report, Address Search, Feedback, Profile main, Map, Leaderboard, and every default Sheet consumer are unaffected.
- `EmptyState.tsx` did not change; Watched Flags uses its existing optional `mark`, `style`, and `bodyStyle` inputs locally.

## Tests and gates

The bounded Jest command covered Sheet presentation/dismissal, Profile body ownership, Watched state-body scrolling, EmptyState defaults, Watched containment, and the visual-freeze structural guards:

```text
npx --no-install jest --runInBand --watchman=false --silent src/components/ui/__tests__/Sheet.presentation.test.tsx src/components/ui/__tests__/Sheet.dismissal.test.tsx src/components/ui/__tests__/EmptyState.test.tsx src/__tests__/sheetBodyScrolls.guard.test.ts src/__tests__/visualFreezeFixWave.guard.test.ts src/components/__tests__/MyWatchedModal.containment.test.tsx src/__tests__/sheetScrollFix4cStateBody.guard.test.ts
```

```text
Test Suites: 7 passed, 7 total
Tests:       77 passed, 77 total
Snapshots:   0 total
Exit:        0
```

```text
npm run typecheck
Exit: 0
```

```text
npm run lint
92 warnings, 0 errors
Exit: 0
```

```text
git diff --check
Exit: 0
```

The warning set matches the base candidate. The React quality review found no new hook dependency, effect, inline component, rerender-state, or accessibility-control issue.

Full Jest was not required: the shared Sheet change is default-off with exactly two tested AX opt-ins, while the Watched correction is component-local.

## Branch and provenance

- Branch: `claude/prompt-c-final-accessibility-20260830`
- Base SHA: `143985411acb8ca9e09ea8cbd020a5d2e9d1c375`
- Base tree: `1690290354b68d4d957c3255fa9fbb351cdece74`
- Delivery SHA: the local commit containing this report; the exact SHA and tree are recorded in the final VFW2C receipt.

## Scope audit

- Visible shipping copy: unchanged.
- Report and all other inherited live-pass surfaces: unchanged.
- Supabase, production data, privacy/release configuration, EAS, dependencies, and generated artifacts: unchanged.
- Simulator: not used.
- Push and merge: none.

## What's left

Terra should repeat only Profile Achievements XXXL, Profile Updates XXXL, and VF-10 Watched Flags XXXL. Fable and UI freeze remain pending that live result.

## DECISIONS FOR SKY

### Advance only after the three-state Terra reverify passes

- Decision: whether this candidate is ready for Fable and final UI freeze.
- Recommendation: wait for the three exact residual states above.
- Why: source ownership and bounded tests are green, but Terra must close the pixel failures that triggered VFW2C.
- Alternative: accept source-side closure without fresh live confirmation.
- Impact of the alternative: FV-4 could remain a release P1 despite a clean source tree.
