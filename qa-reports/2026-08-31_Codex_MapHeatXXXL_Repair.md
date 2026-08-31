# Map Heat XXXL repair

## What changed

The Map Heat notice/control surface now uses the existing `TypeBlock` chrome cap for both the coverage notice and the empty-heat notice. The notice text also has a 20pt line height and `minWidth: 0`, allowing it to reflow beside the existing 44pt dismiss button at large Dynamic Type without changing copy, map data, location behavior, privacy thresholds, shared primitives, dependencies, or release settings.

Changed files:

- `src/screens/MapScreen.tsx`
- `src/screens/__tests__/MapScreenHeatEmpty.test.ts`

## Candidate identity

- Worktree: `/Users/skypie/AccessMap-codex/map-heat-xxxl-fix-20260831`
- Branch: `codex/map-heat-xxxl-fix-20260831`
- Base/source commit: `d7b33fd23917c643d083d2dd549c07ec12891351`
- Base/source tree: `0eba3bbd7af5249c9f670e46fadc867a0ccd326d`
- Current HEAD before commit: `d7b33fd23917c643d083d2dd549c07ec12891351`
- Resulting local commit: `70de4e0d2e5cc3a8facab0f42b536eaf6da4ca98` (`fix(a11y): contain map heat notices at large type`)

The repair was performed only in this dedicated worktree. The primary checkout and `/Users/skypie/AccessMap-prompt-c-final` were not edited.

## Gates

```bash
./node_modules/.bin/eslint src/screens/MapScreen.tsx src/screens/__tests__/MapScreenHeatEmpty.test.ts
```

Result: PASS.

```bash
NODE_PATH=/private/tmp/accessmap-test-stubs/node_modules:/Users/skypie/AccessMap/node_modules /Users/skypie/AccessMap/node_modules/.bin/jest --ci --watchman=false src/screens/__tests__/MapScreenHeatEmpty.test.ts src/screens/__tests__/MapScreen.heatmap.test.tsx --runInBand
```

Result: PASS — 2 suites, 23 passed, 14 todo.

The temporary test module stub supplied only the missing local `expo-secure-store` test dependency; it did not touch repository files or application code.

```bash
npm run typecheck
```

Result: BLOCKED by the existing incomplete dependency set: `expo-crypto` and `expo-secure-store` are missing from the available local `node_modules`. The command produced no error pointing at the repair files.

```bash
npm run lint -- --no-warn-ignored
```

Result: BLOCKED by the same missing `expo-crypto` / `expo-secure-store` modules in existing account-deletion files (3 errors, 92 pre-existing warnings). Changed files were separately linted successfully.

```bash
git diff --check
```

Result: PASS.

No EAS, deployment, TestFlight, App Review, push, merge, or production action was performed.

## Runtime proof

Simulator build/install and Metro-origin proof were not completed. The local worktree has no complete dependency installation, and the available primary checkout dependencies are missing `expo-crypto`, `expo-secure-store`, and the native runtime needed for a trustworthy exact-candidate build. I did not substitute a stale binary or claim runtime evidence from another worktree.

## Runtime verdicts

The supplied baseline evidence was: Onboarding default PASS; Onboarding XXXL PASS; Map Heat default PASS; Map Heat XXXL FAIL. No post-repair runtime verdict is claimed:

| Scenario | Post-repair verdict |
| --- | --- |
| Onboarding default | NOT VERIFIED — Simulator blocked |
| Onboarding accessibility XXXL | NOT VERIFIED — Simulator blocked |
| Map Heat default | NOT VERIFIED — Simulator blocked |
| Map Heat accessibility XXXL | LIVE UNPROVEN — Simulator blocked; source repair applied |

Dynamic Type was not changed by this task.

## What's left

- Complete dependency restoration in an approved local environment, then build/install this exact worktree and prove Metro is serving this worktree.
- Rerun only the four requested scenarios at default and XXXL, restore Dynamic Type to Large, and append the runtime evidence to this report.

## DECISIONS FOR SKY

### Accept the scoped source repair pending runtime proof

- **Decision:** Accept the local notice-only repair as code-complete while runtime proof remains outstanding?
- **Recommendation:** Review the two-file diff and run the exact-candidate Simulator check before merge.
- **Why:** The change is limited to existing Map Heat notice layout/accessibility behavior and the focused suites plus changed-file lint pass.
- **Alternative:** Hold the branch until dependencies and a connected Simulator are available.
- **Impact:** The XXXL fix is not release- or runtime-accepted until the four scenarios are rerun on this candidate.
