# C-D1F4R3-FIX3 — review-audit regression closure QA handoff

**Date:** 2026-08-28
**Scope:** Only the one new regression the independent FIX2 acceptance found: the missing privacy-audit write for non-final account-deletion review resolutions. No D1F4 redesign; FIX2 blockers 1 and 2 remain closed as accepted.
**Outcome:** Source repair complete on a new isolated branch and requires fresh independent acceptance. This is not a deployed, catalog, Storage, Auth, or physical-runtime verdict.

## Branch + SHA

- Branch: `claude/d1f4r3-fix3-review-audit-20260828` (new; the published `codex/d1f4r3-fix2` branch was not modified)
- Base: `b28ed042ca828dcdd6bb7ae47e900b45330fd7a8` (`docs(qa): record d1f4r3 fix2 verification`, exact published FIX2 HEAD)
- Source implementation: `780d79418fc60232b1159ca55e96adb1ca875f10` (`fix(deletion): preserve review audit evidence`)
- Base verification before work: `origin/codex/d1f4r3-fix2` = `b28ed042…`; `b28ed042…` is documentation-only over `d0da58321d0bf17508e39ae95907ec38f82a0736`; FIX2 base is `b4c11a3e4eda646fa99313165f1527972e935adb`; `origin/main` = `a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`; neither FIX2 commit is an ancestor of main.

## The regression (re-derived from source)

In `supabase/migrations/20260828020000_d1f4r3_fix2_review_replay_and_flag_delete.sql`, `resolve_account_deletion_review_item`:

1. marked the current review item resolved (`set resolution = p_action`);
2. returned `waiting_for_review` immediately when another unresolved item remained;
3. only after that early return — after the final-item resume transition — did it INSERT into `public.account_deletion_review_audit`.

So the first resolution of a multi-item review committed with no durable audit record and no evidence digest, and because identical replay returns through the resolved-item replay branch, the missing record could never be reconstructed. Historical comparison: the superseded R3 resolver wrote the audit row outside the has-other-unresolved branch, so every first resolution was audited; the FIX2 restructure introduced the regression.

## Exact repair

New forward-only migration `supabase/migrations/20260828030000_d1f4r3_fix3_review_audit.sql`. It `create or replace`s only `public.resolve_account_deletion_review_item(uuid, text, uuid, text)` (same signature, same `jsonb` durable-state contract) and re-asserts the service-role-only grant. The body is the FIX2 body with one structural change: the single audit INSERT (existing audit model, `actor_kind = 'privacy_reviewer'`, `action = 'review_item_' || p_action`, the supplied `p_evidence_digest`) moves to immediately after the review-item update and before ANY success return — the non-final `waiting_for_review` return and the final resume transition alike. Both success paths share that one INSERT, and a failed INSERT aborts the item resolution in the same transaction. The resolved-item replay branch stays ahead of every first-resolution effect, so replay can never duplicate audit evidence. No other database object, table, policy, grant, Edge function, or client file changes; the review Edge route contract is untouched.

## Files changed (6)

- `supabase/migrations/20260828030000_d1f4r3_fix3_review_audit.sql` — new forward-only migration (the repair)
- `supabase/tests/d1f4r3_fix3_review_audit.test.sql` — new staging-only pgTAP proof (26 assertions)
- `src/__tests__/d1f4r3Fix3ReviewAudit.test.ts` — new Jest regression guard (10 tests)
- `src/__tests__/d1f4r3Fix2ReviewReplay.test.ts` — 3 resolver-behavior tests retargeted from the superseded FIX2 body to the effective FIX3 body (stale-proof removal; FIX2-owned containment assertions unchanged)
- `src/__tests__/d1f4r3SourceClosure.guard.test.ts` — 3 resolver slices retargeted from the superseded R3 body to the effective FIX3 body
- `src/__tests__/d1f4AsyncAccountDeletion.guard.test.ts` — 1 resolver slice retargeted from the superseded R2 body to the effective FIX3 body (COMPLETE-shortcut guard restated against the effective phase mapping)

## Executable database proof (local disposable cluster)

Executed in this session against a disposable PostgreSQL 16.13 cluster (local `initdb`, unix socket only, destroyed afterwards). Fixture DDL copied the real column definitions and CHECK constraints for `account_deletion_operations`, `account_deletion_review_audit`, `account_deletion_review_items`, `account_deletion_terminal_evidence`, and `flag_photo_upload_intents` from the actual migrations, plus minimal `storage.objects` / `flags` stubs and the `anon`/`authenticated`/`service_role` roles. The FIX2 resolver was applied first, then the FIX3 migration file byte-for-byte, proving `create or replace` supersession.

**Regression reproduced first (FIX2 resolver, before the fix):** two-item review; first resolution returned `waiting_for_review` with **0** audit rows; final resolution left **1** total (item 1's digest permanently absent); identical replay of item 1 could not backfill it.

**FIX3 battery (all passed):**

1. Item 1 first execution → `waiting_for_review` / `FAILED_REVIEW_REQUIRED`; item 1 resolved; item 2 unresolved; exactly 1 `review_item_%` audit row with item 1's exact digest; operation still held.
2. Item 1 identical replay → truthful `waiting_for_review`; audit count still 1; `resolved_at` and terminal evidence untouched.
3. Item 1 conflicting replay (different action) → `P0001` "already has a different resolution"; no audit row; resolution unchanged.
4. Item 2 final resolution (DELETE on a subject-owned exact object) → second audit row with its exact digest (total exactly 2); operation resumed `CLEANING` per the accepted FIX2 mapping; `review_resume_from`, `review_reason`, worker lease cleared; terminal evidence → `PENDING_DELETE`.
5. Final-item identical replay after simulated worker progress (`VERIFYING`) → truthful `requeued`/`VERIFYING`; audit still 2.
6. Replay after `COMPLETE` + `subject_id` redaction → truthful `complete` for both items; audit still 2; no PII restoration.
7. Malformed evidence digest → `22023` before any effect.
8. Corrupt/unsupported stored resume phase → fails closed (`P0001` "no safe resume phase") before consuming the item; no audit row; operation stays held.
9. Forced audit-INSERT failure (trigger) → the resolution rolls back atomically: item stays `UNRESOLVED`, operation stays held, zero audit rows; after removing the fault, retry resolves once with exactly one audit row.
10. LOCK_DRAIN single-item review → `requeued`/`REQUESTED` with `resume_from` null and its audit row (drain path preserved).
11. AUTH_RECONCILIATION single-item review → `requeued`/`RETRY_REQUIRED` with `resume_from = 'AUTH_RECONCILIATION'` and its audit row (Auth-last preserved).
12. Function privileges after the migration's revoke/grant: `anon` and `authenticated` cannot execute; `service_role` can.

**Committed pgTAP file executed:** `supabase/tests/d1f4r3_fix3_review_audit.test.sql` was run verbatim on the same cluster via a strict local shim implementing `plan`/`is`/`ok`/`throws_ok`/`finish` (every failure raises): all 26 assertions passed and the plan count matched, with full rollback.

## Source-order guard (Jest, runs in CI everywhere)

`d1f4r3Fix3ReviewAudit.test.ts` proves on the effective FIX3 body that no later migration redefines the resolver; that `set resolution = p_action` precedes the single `insert into public.account_deletion_review_audit`, which precedes both the non-final `waiting_for_review` return and the final resume transition; that the insert carries `p_evidence_digest` through the existing audit model; that the resolved-item replay branch precedes every first-resolution effect; that the FIX2 replay-before-subject-guard and fail-closed resume validation orderings survive; that the FIX2 phase mapping is byte-identical with no COMPLETE shortcut; and that the migration contains no table/policy/flags/Storage DDL.

## Direct-delete regression result

FIX3 touches nothing in the FIX2 containment: no grants, no policies, no `public.flags` statements, no `verify_jwt`, no client files, no `config.toml` change (0-line diff vs base). The FIX2 assertions (DELETE revoked from `public`/`anon`/`authenticated`, service_role authority retained, `flags_user_scoped` / `flags delete own` / `admin delete any flag` dropped, canonical `delete-flag` route with `{ flagId }`) all remain green, and the new Jest guard additionally asserts the FIX3 migration reintroduces none of it. `supabase/tests/d1f4r3_fix2_flags_delete_rls.test.sql` remains the staging proof.

## Gates (all green, in order)

- **A. FIX3 tests:** `d1f4r3Fix3ReviewAudit.test.ts` — 10/10 passed.
- **B+C. FIX2 + D1F4 focused suite:** `d1OptionAAccountDeletion.guard`, `d1f4AsyncAccountDeletion.guard`, `d1f4r2Adversarial`, `d1f4r3SourceClosure.guard`, `d1f4r3Fix2ReviewReplay`, `d1f4r3Fix3ReviewAudit` — 6 suites, 129/129 passed.
- **D. Typecheck:** `npm run typecheck` — clean.
- **E. Lint:** 0 errors, 90 warnings — byte-identical count to the base commit (no new warnings).
- **F. Static/privacy integrity:** whitespace clean; no `from('flags').delete` in app code; no service-role reference under `src/` outside tests; frozen hashes exact (below); the working tree contains exactly the 6 intended files.
- **G. Full canonical Jest (run once):** 263 suites passed, 3860 tests total = 3828 passed + 32 todo, 0 failures.

Dependencies were installed with `npm ci --legacy-peer-deps` from the existing lockfile; no dependency changes, no `npm audit fix`.

## Frozen migrations (verified before work and at commit)

- `2026-08-27_d1sa_deployed_security_containment.sql` = `d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d`
- `2026-08-27_d1_option_a_account_deletion.sql` = `a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01`

## Source vs staging boundary

Proven here: source ordering, and real-PostgreSQL execution of the exact FIX3 migration text and the exact committed pgTAP file on a disposable local cluster with faithful table DDL (including the audit digest and operation-status CHECK constraints) — covering the multi-item audit sequence, replay idempotence, conflict rejection, rollback coupling, LOCK_DRAIN/AUTH_RECONCILIATION mapping, and function privileges.

Staging-only (after a separately authorized migration apply; not performed by this task): the real Supabase catalog and migration chain, `supabase/tests/d1f4r3_fix3_review_audit.test.sql` under real pgTAP, effective deployed grants/RLS, owner/admin JWT direct-DELETE denial, the deployed Edge runtime, Storage/Auth behavior, MVCC/held-writer behavior, scheduler timing, and real concurrent replay. No remote Supabase mutation, `db push`, or `migration repair` was attempted; `.env` was not read.

## Branch publication status

PUSH BLOCKED — READY FOR WORK HANDOFF. `claude/d1f4r3-fix3-review-audit-20260828` is complete and committed in the cloud workspace, but publication was denied: `git push` to `Skypie99/AccessMap` returns 403 (the Claude GitHub App lacks access for this repository), and the GitHub API write path returns `403 Resource not accessible by integration` (reads work; writes do not). No credentials were improvised, no merge, no PR, no force-push; the remote was verified unchanged (`codex/d1f4r3-fix2` still `b28ed042…`, `main` still `a0bf4d04…`). To publish: reconnect GitHub with write access (claude.ai Settings → Connectors, or install the Claude GitHub App for the repo) and push this branch, or hand this workspace's two commits to a machine with push access.
