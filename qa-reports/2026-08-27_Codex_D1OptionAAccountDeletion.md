# Codex D1-FIX-01 Account Deletion Correction Report — 2026-08-27

## Scope and Provenance

- **Candidate worktree:** `/Users/skypie/AccessMap-codex/d1-option-a-account-deletion`
- **Branch:** `codex/d1-option-a-account-deletion`
- **WORK-D2 reviewed head:** `6f7286b464ea41cb87b84f9e58b8826a9ae4585b`
- **Accepted D1S-A base:** `ed37860e9cc7989802a87f9994b78ed258210cc7`
- **D1-FIX-01 source and regression-test commit:** `21ff3fcb4319df08ec464cc25b2e9aa0451c4357`

This report records only the three confirmed WORK-D2 corrections. No migration
was applied, no Edge Function was deployed, no Storage/Auth/production data was
read or changed, and no merge or push occurred. The D1S-A migration remains
byte-identical to the accepted base.

## WORK-D2 Blockers and Corrections

### 1. `flags_user_scoped` permissive-RLS bypass — corrected

**Finding:** The live-catalog evidence records `flags_user_scoped` as a
permissive `ALL`, owner-scoped policy on `public.flags`. It was not in D1's
replacement inventory. Because applicable permissive policies compose with OR,
an owner could otherwise use this path while their deletion lock existed.

**Correction:** The D1 migration now drops and recreates `flags_user_scoped`
with its existing `(select auth.uid()) = user_id` owner condition and the
approved `(select public.current_account_can_write())` predicate in both
`USING` and `WITH CHECK`. It is intentionally scoped to `authenticated`:
the former `TO public` owner predicate could not grant anonymous access, while
the lock helper is executable only by `authenticated`. This preserves anonymous
reporting and does not alter public-photo reads.

**Regression coverage:** The D1 lock-policy inventory now includes
`flags_user_scoped`. A focused guard requires its `FOR ALL TO authenticated`
shape and verifies the owner-plus-lock predicate in both `USING` (UPDATE and
DELETE) and `WITH CHECK` (INSERT and UPDATE), so a locked owner cannot reach
any write verb through that permissive policy.

### 2. `bk_2026_08_22_point_links` cross-owner residue — corrected

**Finding:** The retained point-link table has `point_event_id` and `flag_id`,
but no `user_id`. The prior purge matched only a subject-owned backup `flag_id`
and deleted the subject's live `point_events` before retaining their ids. A
subject's event on another account's flag could therefore leave its backup link.

**Correction:** Before deleting live `point_events`, the transaction captures
the subject's `bigint` event ids into `backup_point_event_ids`. Backup
`point_links` deletion and its zero-residue query now both use the same exact
predicate:

```sql
point_event_id = any(backup_point_event_ids)
or flag_id = any(backup_flag_ids)
```

This removes a subject's direct point-link contribution even when the linked
flag is owned by another account, while preserving unrelated event/link and
report content. Coalesced empty arrays keep a retry with absent relevant live
rows idempotent and subject-safe.

**Regression coverage:** The guard verifies event-id capture precedes live
point-event deletion, the exact complete predicate occurs in both delete and
residue clauses, and a cross-owner fixture retains User B's point link after
removing User A's event link. Its empty-array retry case leaves User B's row
unchanged.

### 3. Migration-history restriction — documented affirmatively

The D1 migration and this QA record now state:

> **DO NOT run `supabase db push`.**

> **DO NOT run `supabase migration repair`.**

D1S-A was manually applied through SQL Editor and is live but absent from the
remote migration ledger. Generic push/repair commands are prohibited until Sky
explicitly authorizes a separately reviewed migration-history reconciliation.
D1 deployment requires a separately reviewed, history-safe application method.
No reconciliation was attempted in this work.

## Preserved D1 Behavior

The correction does not modify the Edge Function, client deletion helper,
Profile/Terms/Privacy copy, D1S-A migration, or external Portfolio policy
pages. Source review and existing guards retain the accepted behavior:

- Edge subject identity remains server-derived through `getUser()`; no
  caller-supplied deletion target is accepted.
- The purge remains pinned-search-path, transactional, lock-required, and
  executable only by `service_role`; it does not delete `auth.users`.
- Storage cleanup remains recursive, paginated, batched, and constrained to
  the authenticated user's UUID namespace.
- Auth deletion remains last. Pre-Auth failure retains the lock and reports an
  error rather than false success; client cleanup happens only after confirmed
  Edge success.
- Anonymous reporting and public-photo behavior remain unchanged.

## Required Deployment Hold: JWT Verification

> Before D1 Edge Function deployment, independently verify that
> `delete-account` is deployed with JWT verification enabled, or otherwise
> establish the approved authenticated invocation configuration.

The repository has no `delete-account` function configuration file proving the
deployed `verify_jwt = true` state. No configuration was invented or changed.
The Edge Function's own `getUser()` authentication remains required regardless.

## Validation Results

All commands below were run locally against a disposable checkout of
`21ff3fcb4319df08ec464cc25b2e9aa0451c4357` using existing dependencies only.
The temporary checkout did not modify the candidate, Supabase, or production.

| Gate | Actual result |
|---|---|
| Focused D1/D1S-A/account/copy/legal guards | **PASS** — 6 suites, 262 tests, 0 failures |
| `npm run typecheck` | **PASS** — `tsc --noEmit` exited 0 |
| `npm run lint` | **PASS** — 0 errors; 90 warnings, none from the changed D1 files |
| `npx --no-install jest --ci --no-watchman -w 3` | **PASS** — 255 suites passed; 3,783 passed, 32 todo, 0 failures |
| `git diff --check` before source/test commit | **PASS** — no whitespace errors |

Focused command:

```bash
npx --no-install jest --ci --no-watchman -w 3 src/__tests__/d1OptionAAccountDeletion.guard.test.ts src/__tests__/d1saSecurityContainment.guard.test.ts src/lib/__tests__/account.test.ts src/lib/__tests__/copy.test.ts src/__tests__/terms.guard.test.ts src/__tests__/privacy.guard.test.ts
```

Runtime database/Storage/Auth testing was deliberately not run: this task
forbids applying SQL, deploying the Edge Function, querying production rows, or
modifying Supabase. The new migration assertions are source-level regression
guards; future release validation remains a separate Sky-controlled activity.

## Changed Files

- `supabase/migrations/2026-08-27_d1_option_a_account_deletion.sql`
  - Adds the history-safe deployment prohibitions, lock-fences
    `flags_user_scoped`, and completes cross-owner backup point-link deletion
    and residue verification.
- `src/__tests__/d1OptionAAccountDeletion.guard.test.ts`
  - Pins the legacy policy inventory and all-write lock condition, and adds
    point-link capture/order/cross-owner/retry regression coverage.
- `qa-reports/2026-08-27_Codex_D1OptionAAccountDeletion.md`
  - Records this correction, exact prohibitions, JWT hold, and observed gates.

## DECISIONS FOR SKY

- [ ] **Choose a history-safe D1 application method before deployment.**
  - **Recommendation:** Keep the branch local and do not use generic Supabase
    push or migration-repair commands.
  - **Why:** D1S-A is live but absent from the remote migration ledger;
    unreviewed reconciliation can replay or misrepresent deployed history.
  - **Alternative:** Authorize a separately reviewed reconciliation first.
  - **Impact:** No D1 migration deployment until that review approves a method.

- [ ] **Independently verify the `delete-account` JWT deployment setting.**
  - **Recommendation:** Before Edge deployment, establish that gateway JWT
    verification is enabled or approve the authenticated invocation setup.
  - **Why:** Repository source does not prove the deployed configuration.
  - **Alternative:** Do not deploy the Edge Function.
  - **Impact:** `getUser()` remains mandatory in either case.

- [ ] **Publish matching external Privacy/Terms copy before a release.**
  - **Recommendation:** Keep the existing external-publication hold.
  - **Why:** In-app Option A copy is committed, but no external page was
    changed in this task.
  - **Alternative:** Defer release.
  - **Impact:** The app must not claim policy alignment that has not been
    published.

## No-Production-Actions Attestation

- No `supabase db push` ran.
- No `supabase migration repair` ran.
- No SQL was applied.
- No Edge Function was deployed.
- No production query, Storage operation, Auth operation, merge, or push ran.
