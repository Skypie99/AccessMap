# Phase 03B compatibility bridge repair — HOLD

## Outcome

The bounded repository repair reached a locally green candidate, but fresh
independent review found a material cross-owner authorization defect. The
candidate is **HOLD** and is not ready for revised staging.

No staging or production system was accessed or changed. Nothing was deployed,
pushed, merged, released, or sent externally.

## Branch + SHA

- Branch: `codex/flagstone-p03b-compatibility-bridge-20260915`
- Worktree: `/Users/skypie/AccessMap-codex/flagstone-p03b-compatibility-bridge-20260915`
- Frozen repair candidate: `0a3c4bb066e1785593984968088a87274f247fea`
- Frozen repair tree: `d730e1dbaac5425a69eb669c930baa8dc0556ecb`
- Candidate base/staging receipt: `02032b74203d77b86e1c6d688fc18821f8fa0561`
- Accepted implementation: `be82b9e86d60765ef2224a174bf8498b42b9aa37`
- Accepted implementation tree: `a244be7f62a30219ee20127031bbf16a67505e73`

## What changed

The frozen candidate:

- replaced the accepted moderation migration identity
  `20260915210255_phase03b_moderation_semantics` with the explicitly revised
  `20260915210256_phase03b_moderation_semantics_compatibility_bridge`;
- retained `UPDATE(status)` for `authenticated` only, while leaving it revoked
  from `anon` and `public`;
- replaced the inherited recursive owner-edit policy with a non-recursive owner
  predicate;
- added a trigger requiring both the status RPC function owner and a
  transaction-local actor marker for reject/restore, keeping direct moderation
  closed while allowing the shipped verify/resolve/reopen transitions;
- retained the same bridge in the compensating rollback;
- added a 30-assertion compatibility pgTAP suite and expanded the replay to run
  it after migration one, after full apply, and after exact reapply;
- updated the candidate contract and documentation with the temporary bridge,
  invalidated staging identity, and exact artifact hashes.

The unchanged points migration remains
`20260915210413_phase03b_points_integrity`, SHA-256
`0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5`.
The revised moderation migration SHA-256 is
`8351ba689d41e11556d3833af3ef591a4ad2c224b2e61862fa977eef13aa69fd`.

## Shipped-path discovery

Build 33 source `f5594171e75bc5ec92a87d0392c361601ddedfba` and pinned
web source `ebf091c21066d39898160b1357bde0aa35bdb8bf` contain the
same `updateFlagStatus()` implementation and caller files. The helper performs
`flags.update({ status }).eq('id', flagId)`, adds
`.eq('status', expectedCurrent)`, and selects the resulting row.

The shipped callers require:

- open to verified;
- open to resolved;
- verified to resolved;
- resolved to open after the separate reopen-count RPC reaches the client-side
  threshold.

The pinned-web release changes none of `src/lib/flags.ts`,
`src/screens/TasksScreen.tsx`, or `src/components/FlagDetailModal.tsx` relative
to Build 33.

## Gates

Commands and actual results:

- `npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/phase03b-bridge-npm-cache`: PASS; 1,166 packages installed.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- Exact nine-suite Phase 03B focus set: PASS; 9/9 suites, 107/107 tests, 0 snapshots.
- `npm run db:pgtap:discover`: PASS; compatibility 30, moderation 49, points 22, no discovery problems.
- Socket-only `scripts/replay-phase03b.mjs`: PASS; TCP disabled, no production inputs accepted, compatibility 30/30 before points and on forward/reapply, moderation 49/49 on forward/reapply, points 22/22 on forward/reapply, safe compensating rollback PASS, schema reapply exact, temporary database destroyed.
- Candidate-contract migration/rollback/test/harness SHA-256 verification: PASS.
- `git diff --check`: PASS.
- `src/__tests__/noCredentialsInTree.guard.test.ts`: PASS; 10/10.
- Full Jest: 12 suites failed, 285 passed; 14 tests failed, 4,376 passed, 32 todo, 4,422 total. The failed suite and test identities exactly match the accepted baseline; no new regression identity appeared.

An initially reconstructed focus command included the inherited failing
`bp3TrustEngineGuards` suite and reproduced its accepted-baseline failure. The
exact accepted nine-suite focus set uses `contractManifest.guard` and passed
107/107. No failing identity was relabeled as a repair regression.

## Independent review — material finding

The fresh read-only Sol/high reviewer reproduced a cross-owner write outside
the accepted contract:

- Phase 03A grants `authenticated` `UPDATE(photo_alt)` on `public.flags`.
- The retained `flags status update by any authenticated` policy admits any
  authenticated row update.
- The inherited `enforce_flag_status_only_for_non_owner()` trigger restores
  description, category, severity, photo URL, and context tags, but omits
  `photo_alt`.
- An authenticated non-owner therefore changed another user's `photo_alt`, and
  the value persisted.

The candidate compatibility suite tested a mixed description/status attempt,
so it did not catch this independently discovered granted-column case. This is
a material authorization-boundary failure. `INDEPENDENT_CODE_REVIEW` is HOLD,
and the revised staging packet is NOT READY.

## What's left

- A separately owner-authorized repair iteration must close the cross-owner
  `photo_alt` path and audit every authenticated UPDATE-granted flag column
  against the non-owner trigger.
- The repaired candidate must receive new migration, rollback, contract, test,
  commit, and tree identities, full local reruns, and a new fresh independent
  review.
- The already accepted staging receipt is invalid for any revised migration and
  cannot be reused. Any later accepted candidate requires complete restaging.
- Native screen-reader/device verification remains `ACCEPTED_LATER_GATE`.

## DECISIONS FOR SKY

Decision: whether to authorize a second bounded repository-only repair iteration
for the independently confirmed cross-owner `photo_alt` defect.

Recommendation: authorize that narrow R2 repair before any staging work. It
should exhaustively compare every authenticated UPDATE-granted `flags` column
with the non-owner enforcement trigger, add negative regression coverage for
each column, then refreeze and obtain a new independent review.

Alternative: stop Phase 03B here. Impact: the compatibility bridge remains HOLD,
the revised staging packet stays NOT READY, and production remains unauthorized.
