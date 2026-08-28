# Codex D1 Option A Account Deletion Report — 2026-08-27

## DECISIONS FOR SKY

- [ ] **Keep D1 local until a separately approved release step** — the migration and Edge Function are committed for review, not applied or deployed.
  - **Action:** Review commits `ff4da72` and `d2e01a2` on `codex/d1-option-a-account-deletion`; retain the current no-deployment hold.
  - **Why deferred:** Applying a migration or deploying an Auth/Storage deletion flow changes production state and requires Sky's release authority.
  - **Impact:** The shipped app is unchanged until Sky explicitly authorizes a future release procedure.

- [ ] **Publish matching external Terms and Privacy Policy copy before any release** — the app-owned v1.1 documents and rendered in-app text now state Option A full deletion, but no external publication was changed.
  - **Action:** Publish externally matching reviewed v1.1 policy text before release.
  - **Why deferred:** Publication is external authority retained by Sky.
  - **Impact:** Do not release this implementation while an external policy still describes anonymization or retained photos/content.

## BLOCKERS / FAIL_FAST

- **[State: ENVIRONMENT LIMIT]** The exact requested full-Jest invocation could not initialize Watchman because the sandbox denies its global-state-directory permission change before the suite starts. No code or test configuration was changed to silence Watchman.
  - **Evidence:** The complete supported fallback, `npx --no-install jest --ci --no-watchman -w 3`, passed: 255 suites, 3,779 tests, 32 todo, 0 failures.
  - **Recommended path:** Re-run the exact Watchman-enabled command in Sky's normal host session only if Watchman-specific evidence is required.

## Summary

Implemented the approved D1-AMEND-02 race-safe Option A account-deletion architecture from the exact approved base `ed37860e9cc7989802a87f9994b78ed258210cc7`. The local implementation creates a durable service-role lock before cleanup, fences every relevant account-owned write path, recursively clears only the account Storage namespace, uses one transactional service-role purge RPC for live and retained backup data, verifies zero residue, and deletes Auth last.

Implementation commits: `ff4da72` (`feat(account): add race-safe account deletion`) and `d2e01a2` (`fix(account): fence inherited admin deletion paths`) on `codex/d1-option-a-account-deletion`. The final policy audit identified two inherited live permissive administrative delete routes; the D1 migration now replaces both with lock-aware equivalents so their OR composition cannot bypass the deletion lock. No migration was applied, no Edge Function was deployed, no production data was read or changed, no `supabase db push` or migration-history repair ran, and D1S-A was neither replayed nor modified.

## What Shipped (Local Commits `ff4da72`, `d2e01a2`)

- `supabase/migrations/2026-08-27_d1_option_a_account_deletion.sql`
  - Adds `account_deletion_locks` with RLS, client privilege revocation, and service-role-only lock use.
  - Adds the zero-argument, search-path-pinned `current_account_can_write()` helper and replaces every enumerated permissive client-write policy/RPC boundary—including inherited `flag-photos admin delete` and `admin delete any comment` administrative delete routes—with a lock-aware equivalent; anonymous report and feedback paths remain available.
  - Adds search-path-pinned, `SECURITY DEFINER`, service-role-only `purge_deleting_account(uuid)`, which requires the lock, removes the approved live and seven retained-backup scopes in one transaction, verifies zero residue, and never deletes `auth.users`.
  - Includes D1-only rollback prerequisites and constraints. It does not alter the D1S-A migration.

- `supabase/functions/delete-account/index.ts`
  - Preserves the `POST` endpoint, verified-JWT subject-only identity resolution, and `{ status: "deleted" }` success contract.
  - Implements: lock → initial recursive/paginated namespace-only Storage sweep → atomic purge RPC → final Storage sweep/check → Auth deletion last.
  - Leaves the lock durable on pre-Auth failure for safe retry and emits only an opaque failure log marker.

- `src/__tests__/d1OptionAAccountDeletion.guard.test.ts`, `src/lib/__tests__/account.test.ts`, and `src/lib/__tests__/copy.test.ts`
  - Pin D1S-A byte-for-byte to the approved base, lock privileges/lifecycle, every lock-aware policy replacement, anonymous behavior, purge authorization/scope/residue assertion, Edge ordering/Storage bounds/no identifier-bearing logs, local sign-out behavior, and provenance rules.

- `src/screens/ProfileScreen.tsx`, `src/lib/copy.ts`, `design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md`, `design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md`, and `design-reviews/ship-ready/DECISIONS.md`
  - Replace false anonymous-retention/support-removal language with truthful permanent full-deletion copy.
  - Update in-app Terms and Privacy to v1.1, effective 2026-08-27, with D1-AMEND-02 provenance; document that external publication remains a Sky-only release prerequisite.

## What Is Proposed, Not Applied

| Proposal | File | Impact | Rollback documented? |
|---|---|---|---|
| D1 database migration | `supabase/migrations/2026-08-27_d1_option_a_account_deletion.sql` | Adds the durable deletion fence and purge RPC when Sky later applies it | Yes — migration comments require Edge rollback first, no active locks, D1S-A-compatible restore only |
| D1 Edge Function revision | `supabase/functions/delete-account/index.ts` | Changes deletion sequencing only after Sky deploys it with the migration | Yes — deploy rollback is a separate Sky-controlled operation; no deleted content can be restored |
| In-app policy copy v1.1 | `src/lib/copy.ts` and source documents above | Truthful Option A wording in a future app build | External publication remains intentionally unapplied |

## Findings by Domain

### Security / Privacy

- 🟢 The deletion lock is durable by design: it is inserted before destructive work, has no client policies or client privileges, survives failed attempts, and is removed only through the final Auth-to-`public.users` cascade.
- 🟢 The atomic purge function is callable only by `service_role`, requires that lock, has a pinned empty search path with schema-qualified relations, verifies required residue, and never executes `DELETE FROM auth.users`.
- 🟢 Storage cleanup is recursive, page-bounded, batch-bounded, and limited to the authenticated subject's `<userId>/` namespace; no identifiers, paths, tokens, or provider-error detail are logged.

### Accessibility / Copy

- 🟢 Profile's destructive confirmation and accessibility hint now accurately state permanent deletion of the account, complete report trees, direct contributions, feedback, and uploaded photos.
- 🟢 Terms and Privacy v1.1 retain the existing source-to-rendered-copy drift guards. No external policy was claimed as published.

### Tests / CI

| Gate | Result | Evidence |
|---|---|---|
| Focused D1/D1S-A/account/copy/policy Jest suites | PASS | 6 suites, 258 tests passed |
| `npm run typecheck` | PASS | `tsc --noEmit` completed with exit 0 |
| `npm run lint` | PASS with pre-existing warnings | 0 errors; 90 warnings reported across unrelated existing files |
| `npx --no-install jest --ci -w 3` | ENVIRONMENT FAIL | Watchman global-state permission failure before suite execution |
| `npx --no-install jest --ci --no-watchman -w 3` | PASS | 255 suites, 3,779 tests passed, 32 todo |
| `git diff --check` | PASS | No whitespace errors |

Runtime/database checks were deliberately skipped: no local or production migration was applied, no Edge Function was deployed, no real Auth user was deleted, and no real Storage namespace was listed or changed.

## Process Self-Check

### Efficiency Check

The implementation started from the mandated base rather than reusing the prior D1S-A worktree. The existing Terms/Privacy source-to-rendered-copy guards and D1S-A guard were retained and extended instead of duplicated.

### Overlap Check

No source was copied from or written into the existing `presubmission-ui-polish` worktree. Its installed dependencies were read only through a temporary symlink for local gates, then the symlink was removed. No overlap detected in the D1 source lane.

### Simplification Opportunities

A sequential set of Edge Function table deletes would have been smaller, but it would violate the approved transaction and simultaneous-session guarantees. The retained lock + one purge RPC architecture is the smallest approved race-safe design.

## How to Review

Inspect the local implementation commits against their approved base:

```bash
git -C /Users/skypie/AccessMap-codex/d1-option-a-account-deletion diff ed37860e9cc7989802a87f9994b78ed258210cc7..d2e01a2
```

After dependencies are present in `/Users/skypie/AccessMap-codex/d1-option-a-account-deletion` (D1 did not install or retain any), run the focused D1 guards without using Watchman:

```bash
npx --no-install jest --ci --no-watchman -w 3 src/__tests__/d1OptionAAccountDeletion.guard.test.ts src/__tests__/d1saSecurityContainment.guard.test.ts src/lib/__tests__/account.test.ts src/lib/__tests__/copy.test.ts src/__tests__/terms.guard.test.ts src/__tests__/privacy.guard.test.ts
```

## Next Recommended Action

Sky should review and retain this local branch under the explicit no-deployment hold, publish matching external policy copy before authorizing any future release, and separately decide whether Watchman-specific gate evidence is required from a normal host session.
