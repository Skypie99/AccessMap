# Phase 04A manifest truth and caller coverage repair

## Scope and identity

- Worktree: `/Users/skypie/AccessMap-worktrees/flagstone-p04a-sonnet-20260921`
- Branch: `sonnet/flagstone-phase04a-compat-20260921`
- Starting HEAD: `5a5394cc2aa1c9a9086ee681e8248898d7fa7a5f`
- Starting tree: `d653e5608a72931dc1736d944048db3afc6af019`
- Required base `7159d2499607b9e8b90fb03d0fa761a8dbe6e7a5` was an ancestor; worktree was clean before editing.
- This report is committed with the repair. The repair commit SHA is the branch HEAD after this commit; it is deliberately not embedded in its own contents.

## What changed

- `supabase/contract/client-expectations.v1.json`: corrected the `flag_photos` INSERT note to the accepted own-folder, account-exists, owns-flag policy from `supabase/migrations-next/20260904000200_adopt_d1sa_containment.sql:61-77`; corrected the `src/lib/photos.ts` call-site line from 77 to 82.
- `src/__tests__/contractManifest.guard.test.ts`: pinned that corrected policy description and call-site citation.
- `src/components/__tests__/FlagDetailModal.refusal.test.tsx`: added mounted caller tests for refused photo attachment and refused photo-bearing flag deletion. The attachment remains pending without a success announcement; refused deletion does not call `onDeleted` or `onClose`.
- `src/screens/__tests__/AdminScreen.test.tsx`: added a mounted caller test proving refused deletion leaves the flag in the moderation list and shows an error.
- No source implementation, migration, Phase 03/03C contract, or 04B file changed.

## Gates

| Command or check | Actual result |
| --- | --- |
| `npx jest --ci -w 3 src/components/__tests__/FlagDetailModal.refusal.test.tsx src/screens/__tests__/AdminScreen.test.tsx src/__tests__/contractManifest.guard.test.ts` | PASS: 3 suites, 23 tests |
| `npx tsc --noEmit` | PASS: exit 0, no output |
| `npx eslint src/components/__tests__/FlagDetailModal.refusal.test.tsx src/screens/__tests__/AdminScreen.test.tsx src/__tests__/contractManifest.guard.test.ts` | PASS: exit 0, no output |
| `npx jest --ci -w 3` | PASS: 298/298 suites, 4,421 passed, 32 todo, 0 failed; 4,453 total |
| `git diff --check` | PASS: exit 0 |

The focused FlagDetailModal run emitted an existing React Native `SafeAreaView` deprecation warning through `PrivacyScreen.tsx`; it did not fail a gate. The full Jest summary above is from the final run after the manifest guard was added.

## Mutation coverage

In a disposable detached worktree at the starting HEAD, the changed tests were copied in and each implementation mutation was applied separately, tested, then restored. That worktree was removed afterward. Each selected test failed for the intended fake-success behavior:

- M1: attachment refusal announced success and cleared the pending photo: **KILLED**, 1 failed test (expected error notification was absent).
- M2: deletion refusal called `onDeleted` and `onClose`: **KILLED**, 1 failed test (expected error notification was absent).
- M3: admin deletion refusal removed the flag from state: **KILLED**, 1 failed test (expected error alert was absent).

Result: **3/3 KILLED**. The real worktree's implementation files were not mutated.

## What's left

Final bounded independent reacceptance remains. No production or staging contact, database action, deployment, push, or merge occurred.

## DECISIONS FOR SKY

None in this repair lane. Final reacceptance is the next review step; this local commit does not grant release authority.
