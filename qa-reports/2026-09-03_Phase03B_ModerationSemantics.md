# Phase 03B moderation semantics — CODE/INT acceptance

Date: 2026-09-15
Prompt: `FLAGSTONE-PHASE-03B-MAIN-OWNER-20260903`
Status: **CODE/INT PASS — STAGING AUTHORIZATION REQUIRED**

## Outcome

The owner-approved reject, restore, notification, and trust-economy semantics are implemented on the isolated Phase 03B branch. Local database replay, rollback/reapply, focused client and Edge Function tests, typecheck, lint, artifact-integrity checks, and independent acceptance pass. No staging or production system was changed.

This is the explicit human gate before task `03B-STAGE`. Phase 03B is not complete and `MODERATION_SEMANTICS_GATE: PASS` is not issued.

## Accepted base and repository identity

- Repository: `https://github.com/Skypie99/AccessMap.git`
- Branch: `repair/flagstone-p03b-moderation-semantics-20260903`
- Worktree: `/Users/skypie/AccessMap-worktrees/flagstone-p03b-moderation-semantics-20260903`
- Accepted Phase 03A base commit: `342784c6205a824138d59025d65667e316022473`
- Accepted Phase 03A base tree: `337c8e7276f4385153ba832375826ec9f36149a0`
- Implementation commit: `be82b9e86d60765ef2224a174bf8498b42b9aa37`
- Implementation tree: `a244be7f62a30219ee20127031bbf16a67505e73`
- Remote `origin/main`: `70b52a30e9fff0f7d538509b110212bb8d872391` (unchanged)
- Local `main`: 301 commits ahead of `origin/main`; no push or main merge was performed.

## Owner decision applied

`OWNER_DECISION: APPROVE_RECOMMENDED_PHASE03B_SEMANTICS`

The implementation locks the approved model:

1. Only `public.users.is_admin = true` may reject or restore.
2. Reject/restore uses one atomic compare-and-set moderation RPC with immutable decision/recovery evidence.
3. Reject and restore require an approved public-safe reason code.
4. Rejected flags are hidden from normal public/default views and remain available to the admin recovery queue.
5. Reject/restore changes zero points and preserves historical point events.
6. Reporter notification uses the existing flag-status preference and discloses no moderator identity or internal note.
7. Owner verify/resolve remains available for zero points; verified/resolved rewards are once per flag and event type.
8. Comment votes are one-way.
9. Only the first five eligible comments per user per UTC day earn `+1`; later comments remain postable for zero points.

The exact five approved strategic copy strings are implemented and guarded by tests.

## Exact Phase 03B artifacts

### Forward migrations

- `supabase/migrations-next/phase03b/20260915210255_phase03b_moderation_semantics.sql`
  - SHA-256: `a492fad03bd8dc817019cf6ec72d0492203eba716853104b777a9fbd677a1e9c`
- `supabase/migrations-next/phase03b/20260915210413_phase03b_points_integrity.sql`
  - SHA-256: `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5`

### Forward-restoration artifacts

- `supabase/migrations-next/phase03b/rollback/20260915210255_phase03b_moderation_semantics.rollback.sql`
  - SHA-256: `33cc64614702c564c78234470e4674b51c579e09a524b1897d8ddd32930e8476`
- `supabase/migrations-next/phase03b/rollback/20260915210413_phase03b_points_integrity.rollback.sql`
  - SHA-256: `f4da0362fb6f2e7258268e0bfee8dc10b2cf330bd447144e8362e170d1197149`

### Proof and contract artifacts

- `supabase/tests/phase03b-moderation.test.sql`
  - SHA-256: `2d7a7fb00f02a6e611722ea3be8adeb6c9b3be50d3678f49112c4d130cad0d2f`
- `supabase/tests/phase03b-points.test.sql`
  - SHA-256: `7e16e13ee211f4bdf586d2f5d12f30356290b122c98d45e83744f17fa956a5b9`
- `scripts/replay-phase03b.mjs`
  - SHA-256: `4714f1dcee2f3a7570e7f40729181809955406c5787c45d8d5e6adc749ff4616`
- `supabase/migrations-next/phase03b/candidate-contract.json`
  - SHA-256: `7d0db97cf7e9bba829e73414c8c7c46030f8568029f77ef391ae0efcb3f69446`

The candidate contract embeds and matches all listed migration, rollback, pgTAP, and replay-harness hashes.

## What changed

- Added forward-only moderation and points-integrity migrations with paired safe forward-restoration files.
- Added an atomic admin moderation RPC, protected queue claim/close behavior, immutable reject/restore reasons, stale-conflict handling, public visibility rules, and least-privilege grants.
- Added service-role-only scalar notification-preference access compatible with the Stage A table grants.
- Added parentless v1/v2 comment-report support while validating any supplied parent relationship.
- Removed prospective rejection penalties and closed owner/reopen/vote/comment point-farming paths.
- Updated admin and flag-detail clients to use the authoritative RPC and exact approved copy.
- Added accessible reject/restore reason UI, including assistive-technology containment while the overlay is active.
- Updated the flag-status Edge Function's pure notification construction and preference contract. No function was deployed or invoked.
- Added executable pgTAP, focused unit/guard tests, contract manifest updates, and a socket-only replay harness.

Implementation diff: 34 files changed, 3,185 insertions, 1,769 deletions.

## Finding disposition at the local candidate boundary

- `FDA-020`: locally remediated by backend-authoritative admin-only reject/restore and atomic audited recovery.
- `FDA-022`: locally remediated by idempotent lifecycle rewards, owner-zero rules, one-way votes, and the daily eligible-comment cap.
- `FDA-004`: locally supported by the queue schema/RPC and compatibility behavior, including parentless report support.
- `FDA-035`: locally supported by zero-point reject/restore truth and preference-aware reporter notification construction.

These are local candidate dispositions, not claims about staging or production state.

## Gates and evidence

### Local PostgreSQL replay

`node scripts/replay-phase03b.mjs`

- PASS: socket-only local PostgreSQL; TCP disabled; production inputs rejected by the harness.
- PASS: moderation pgTAP `49/49` on forward apply and reapply.
- PASS: points pgTAP `22/22` on forward apply and reapply.
- PASS: moderation output was identical across replay; digest `035206050b640ae2532fc771f43100fc83d2bd546f7900510889e9a9c2356d3b`.
- PASS: points output was identical across replay; digest `77fc8a4fde567f272ed40d9d12ea3d1e5dc0ea5a2e805087a3addce981f1ab29`.
- PASS: safe forward restoration, exact reapply schema, and temporary-database destruction.
- Expected local-only warning: the disposable database has no webhook Vault entry. No request was made.

### Static and focused gates

- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- pgTAP discovery: PASS; moderation planned 49, points planned 22, no problems.
- Focused candidate tests: PASS.
- Independent acceptance rerun: PASS — 9 suites, 107 tests.

### Full Jest reconciliation

Candidate result:

- 12 suites failed, 285 passed.
- 14 tests failed, 4,376 passed, 32 todo; 4,422 total.

Accepted-base baseline:

- 12 suites failed, 281 passed.
- 14 tests failed, 4,384 passed, 32 todo.

The failed suite and failed-test identities are exactly unchanged from the accepted base:

- `TasksScreenFlagCard`
- `Wave2ScreenGeometry`
- `bp11PressVocabGuards`
- `bp3TrustEngineGuards`
- `mapChromeBudget`
- `tasksHeaderReclaim`
- `dismissalStandard`
- `focusOnOpen`
- `hitTargetFrame`
- `keyboardClass`
- `privacy`
- `visualFreezeFixWave`

The changed pass/total count reflects the rewritten and added Phase 03B tests. No new failed suite or test identity was introduced.

### Accessibility evidence boundary

Component/runtime tests verify focus trapping, dismiss behavior, labels, and assistive-technology containment for the reason picker. A native screen-reader/device runtime pass was not performed and is not claimed. It remains required at the later exact-candidate/device acceptance boundary.

## Independent acceptance

The first independent review returned HOLD for three concrete issues:

1. notification preference lookup relied on a service-role direct table grant that Stage A does not expose;
2. parentless comment reports were rejected;
3. the reason overlay did not fully contain assistive-technology traversal.

All three were corrected, tests were extended, and the candidate was replayed. Independent re-review found no remaining findings and returned **ACCEPT** for local CODE/INT integration. The implementation model was not the sole acceptor.

## Hosted-state boundary

- Staging mutation: NONE.
- Production mutation: NONE.
- Edge Function deployment or invocation: NONE.
- Webhook or notification request: NONE.
- Remote push: NONE.
- Main merge: NONE.
- Release/TestFlight/App Store action: NONE.
- Phase 03C: NOT STARTED.
- `MAIN_MERGE_AUTHORIZED: NO`.

## Staging target and required fresh preflight

The newest accepted evidence identifies the isolated staging target as:

- Project ref: `cepayqmsoqxshsiyqnvz`
- Branch identity: `4a37413a-01c2-4ab2-8bf8-a17a42a549b8`
- Parent production project: `kldlwszpfkdmsjrjhjym`
- Accepted evidence snapshot: healthy, Phase 03A Stage A present, 103-row migration ledger, zero test rows.

That snapshot must be independently reverified before any mutation. Any identity, ledger, catalog, or canonical-hash drift is a STOP. Historical staging ref `ctshxbykuemeqnofqcdh` is evidence-only and must not be targeted.

## Rollback posture

Local rollback/reapply passed. If staging is authorized, the governed sequence is: verify the exact staging identity and baseline; apply only the two exact forward migrations in order; deploy only the exact staging function required by the manifest; run the full role/transition and points matrix; disable queue/actions if a critical check fails; run the paired forward-restoration artifacts rather than rewriting migration history; and prove reapply before any later production request.

## DECISIONS FOR SKY

**Decision required:** Authorize or hold the exact Phase 03B staging lane for implementation commit `be82b9e86d60765ef2224a174bf8498b42b9aa37`, tree `a244be7f62a30219ee20127031bbf16a67505e73`, and the artifact hashes recorded above.

**Recommendation:** Authorize the isolated staging lane. CODE/INT is independently accepted, artifact identity is locked, rollback/reapply is proven locally, and staging is the next required place to establish hosted authorization, catalog, queue, runtime, and drift evidence.

**Exact scope granted by authorization:** After fresh identity, parent, migration-ledger, catalog, and canonical-hash verification of staging ref `cepayqmsoqxshsiyqnvz`, apply the two exact forward migrations in recorded order; deploy or update only `notify-flag-status` on that same staging ref if required by the locked candidate manifest; enable queue capability only after catalog verification; run the governed admin/reporter/anon/normal-user/owner transition, stale-conflict, queue, audit, restore, points, preference, and negative authorization checks using synthetic disposable data; rehearse the paired safe forward restoration and reapply; capture exact ledger/catalog/runtime evidence; and clean up synthetic data.

No push-notification, webhook, or other external delivery is authorized. Notification acceptance at this gate is limited to pure construction, preference enforcement, queue/state evidence, and proof that no external request was sent. A later explicitly authorized delivery test is required for real delivery proof.

**Alternatives and consequences:**

- HOLD: preserves the current local candidate but leaves hosted schema, policy, RPC, and runtime behavior unproven.
- Authorize database-only staging: proves migrations and pgTAP but leaves the changed Edge Function runtime contract unproven, so Phase 03B cannot advance to its production-token gate.

**Explicit exclusions:** Production apply; production database, Vault, Auth, or function changes; the historical staging ref; production webhook use; any external notification; any remote push; main merge; production deployment; release action; or Phase 03C.

If approved, the unambiguous decision is:

`OWNER_DECISION: AUTHORIZE_PHASE03B_STAGING`
