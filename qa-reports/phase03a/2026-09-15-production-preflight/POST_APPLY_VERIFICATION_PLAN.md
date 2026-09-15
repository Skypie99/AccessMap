# Phase 03A production post-apply verification plan

This plan is inert. It may be used only after a separate production token authorizes and completes the exact 14-file Stage A operation.

## 1. Reconcile operation outcome first

- If the apply response is missing, timed out, malformed, or otherwise uncertain, bank `OUTCOME_UNKNOWN` and perform only read-only ledger/catalog reconciliation. Do not retry.
- Require each of the 14 canonical versions exactly once with its canonical name. Reject wall-clock substitutions, duplicate rows, missing rows, unexpected versions, and Stage B.
- Reconfirm the exact production project ref and that no implicit selector participated.

## 2. Capture and compare the catalog

- Repeat the sanitized comparator-v3 catalog capture in `BEGIN TRANSACTION READ ONLY`.
- Retain functions, tables, columns/defaults, constraints, policies, triggers, ownership, schemas, table/routine/schema/default privileges, and direct/indirect role membership.
- Compare with the pre-apply capture and review every delta against `PENDING_MIGRATION_PLAN.json`. Equal hashes support equality only within the captured surface.
- Confirm all five Phase 02 adoption effects remain idempotent against the accepted production posture.
- Confirm Stage A additions and restrictions match the manifest and `20260911130000_phase03a_fda026_stage_b_cutover.sql` is absent.

## 3. Build 33 compatibility checks

The preflight status is `SUPPORTED` from two pieces of evidence: production exactly matches the accepted pre-apply comparator and the accepted fresh-stage suite exercised 37/37 shipped authenticated/anonymous query shapes with a Stage B negative control. This run did not execute client-role calls on production.

A later post-apply check must use approved non-production reproduction or separately authorized read-only role-context calls to distinguish denial, legitimate empty results, and RLS filtering. It must verify:

- admin lookup retains `private.current_user_is_admin()` and adds the public wrapper without removing the Build 33 path;
- leaderboard and rank RPCs return their defined shapes under an authenticated caller;
- comment-author profile hydration returns bounded public fields;
- comments, photos, flags, and guest flag/feedback paths retain the Stage A caller contracts;
- sensitive `public.users` fields remain unavailable for client update/read beyond the accepted allowlist;
- superuser success is never treated as client-role proof.

## 4. MF-03, MF-04, MF-05, and policy

- MF-03: return only exactly-one-row, 64-hex, and decoded-32-byte booleans. Do not invoke admission merely to test the key.
- MF-04: structurally confirm the function has no hardcoded HTTPS literal, reads `webhook_endpoint`, retains `webhook_secret`, and keeps client EXECUTE revoked. Do not send a notification.
- MF-05: retain `S3_LIMITER_PRESENT_BYPASS_OPEN`; confirm Stage B remains absent. Do not claim all guest requests use the limiter.
- Confirm the exact owner-approved config and activation state. No staging/default value may silently become production policy.

## 5. Preserve live data and measure residue by delta

Use a fresh immediate pre-operation aggregate capture as the baseline. The 2026-09-15 read-only snapshot was users 5, flags 21, feedback 6, comments 3, photos 1, point events 63, status history 37, storage objects 9, queued HTTP 0, with other listed aggregates zero. These values can change through legitimate live use and must not be treated as fixed expected totals.

Require zero residue attributable to the operation: no synthetic application rows, limiter grants/buckets, helper objects, queued HTTP requests, test secrets, test config, or temporary roles created by the operation. Do not require globally empty application, Auth, Storage, limiter, or HTTP tables. No production concurrency test, synthetic insert, disabled-secret probe, key ratchet, purge, or deliberate notification is authorized.

## 6. Required local gates on the same exact source

- exact manifest/source hash check;
- typecheck and lint;
- focused canonical-plan, target-token, workspace-destruction, FDA-028 contract, schema snapshot, release verification, and rollback classification tests;
- corrected credential scan with real-secret negative controls;
- independent review of the retained pre/post diff and operation receipt.

An unrun gate is recorded as unrun. Apply-command success alone is not acceptance.
