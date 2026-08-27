# D1S-A — Deployed Security Containment

**Date:** 2026-08-27
**Worktree:** `/Users/skypie/AccessMap-codex/presubmission-ui-polish`
**Branch:** `codex/presubmission-ui-polish`
**Starting HEAD:** `110e61a95c99bf2362fd5ea5d53e3e146d14c748`
**Final branch / SHA:** `codex/presubmission-ui-polish` / `HEAD` — this report is committed with the containment change; resolve the exact immutable object at handoff with `git rev-parse HEAD`.

## Scope and evidence boundary

This is one local, reversible migration artifact for the supplied D1S-A/DV1 findings. The supplied findings are the deployed-scope authority. No Supabase CLI command, production/catalog/table/row/Storage inspection, migration apply, deployment, fetch, push, merge, account deletion, or client application source change was performed.

`supabase/schema.sql` was intentionally not rewritten: newer migrations are the source of truth for these deployed policy and function shapes.

## Ownership safety gate — passed

Current shipped source supports report-owner-only photo contributors:

1. `ReportFlagModal` uploads into the authenticated user's Storage namespace, creates the report with that same user ID, then calls `batchInsertFlagPhotos(result.row.id, ...)`.
2. `FlagDetailModal` passes its photo-add handler only when `shownFlag.user_id === user.id` and the sheet is idle.

No visible signed-in non-owner `flag_photos` metadata-write route was found in the shipped `src/` tree. The regression asserts that a signed-in non-owner gets neither photo-add affordance nor a mounted `PhotoGallery` add handler, while an idle report owner gets both. This migration does not remove a current user-visible contribution flow.

## What changed

| Finding / mechanism | Local containment | Rollback posture |
| --- | --- | --- |
| F1 — client exposure of seven `bk_2026_08_22_*` recovery tables | Enables RLS and revokes all direct table privileges from `PUBLIC`, `anon`, and `authenticated`; creates no client policy and does not force RLS or alter backup data. | A normal rollback is deliberately omitted. Regranting direct client access would reopen F1 and requires a separate Sky decision. |
| F2 — stale authenticated account writes | Recreates the existing Storage upload/delete policies with the same authenticated UID-path constraint plus `public.users.id = auth.uid()`; adds the same condition to status triage and both counter RPCs. | Commented migration reversal is technically possible but security-unsafe because it restores stale-account mutation capability. |
| F3 — cross-owner photo metadata attachment | Replaces only authenticated `flag_photos` INSERT: preserves caller-owned URL path, requires a surviving account, and requires the parent flag to belong to the caller. | Commented migration reversal is technically possible but security-unsafe because it restores cross-owner attachment capability. |
| F4 — direct execution of trigger-only status transition function | Revokes execute from `PUBLIC`, `anon`, and `authenticated`, preserving the existing security-definer trigger and binding. | Commented migration reversal is technically possible but security-unsafe because it restores direct client execution. |

Changed files:

- `supabase/migrations/2026-08-27_d1sa_deployed_security_containment.sql` — one containment migration and explicitly commented security-unsafe rollback definitions.
- `src/__tests__/d1saSecurityContainment.guard.test.ts` — migration-contract coverage for containment boundaries and out-of-scope exclusions.
- `src/components/__tests__/FlagDetailModal.sheetPresentation.test.tsx` — owner/non-owner photo-add affordance and handler-boundary regression.

No public object reads, bucket visibility, object URLs, object listing, photo ordering, report submission flow, photo cleanup, account deletion flow, voter persistence, durable dedupe, rate limiting, or D1S-B policy work changed.

## Independent review

A fresh read-only security diff review found no confirmed High, Medium, Low, or Informational defect. It independently verified the seven backup-table statements, account predicates, parent-flag ownership, preserved counter signatures/status predicates/grants, trigger execute revoke, unchanged public reads, and regression scope.

The shared limitation is static local verification: it cannot prove the current deployed catalog has the expected relations and preceding policy/function definitions, nor exercise live stale-account, cross-owner, or direct-RPC denial probes. That is deferred to a separately authorized release-validation activity.

## Local gates

| Command | Result |
| --- | --- |
| `npx --no-install jest --ci -w 3 src/components/__tests__/FlagDetailModal.sheetPresentation.test.tsx src/lib/__tests__/photos.test.ts src/screens/__tests__/ReportFlagModal.test.tsx src/__tests__/d1saSecurityContainment.guard.test.ts` | PASS — 4 suites, 128 tests, 0 failures. |
| `npm run typecheck` | PASS — `tsc --noEmit` completed successfully. |
| `npm run lint` | PASS — 0 errors; 90 pre-existing warnings, none introduced by these files. |
| `npx --no-install jest --ci -w 3` | PASS — 254 suites, 3,719 passed tests, 32 todo tests, 0 failures. |
| `git diff --check` | PASS — no whitespace errors. |

Jest needed a host session because sandboxed Watchman access was denied. The host runs retained non-failing existing warnings: Watchman permission warnings for unrelated macOS cache paths, `SafeAreaView` deprecation, async React `act(...)` warnings in modal tests, expected mocked storage/network logs, and a force-exited worker-teardown warning. None changed the exit status.

## Hold and next step

**NO DEPLOYMENT / NO SUPABASE APPLY.** This worktree contains only a local migration and tests. Sky should review the final local commit and, if approving release validation, separately authorize the deployment-side catalog and behavior checks before applying it anywhere.

## DECISIONS FOR SKY

1. **Decision:** whether to apply this reviewed migration in a separately authorized environment/release process. **Recommendation:** approve only after an authorized deployment-side check confirms the seven named backup relations and currently deployed policy/function signatures. **Alternative:** retain the local patch without applying it. **Impact:** no remote security posture changes until Sky authorizes that next step.

2. **Decision:** whether a future product change should allow community members to contribute photos to another person's report. **Recommendation:** treat that as a new explicit product/security design; keep the owner-only policy for current shipped behavior. **Alternative:** restore a non-owner INSERT policy. **Impact:** the alternative reopens a cross-owner attachment capability and requires separate abuse, attribution, and moderation decisions.
