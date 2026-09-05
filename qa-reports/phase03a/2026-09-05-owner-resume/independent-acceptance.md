# Phase 03A independent FDA012/local-subset acceptance — complete CODE HOLD

**FDA012 local subset: PASS. Complete Phase 03A CODE: HOLD. Backend foundation: BLOCKED. Safe to integrate: NO.**

No actionable defect was found in the reviewed local subset. This accepts the bounded local evidence below; it does not accept a complete Phase 03A candidate or close any FDA finding. FDA028 has no accepted trusted mechanism preserving an exhausted anonymous-client budget across clearing or replacing sessions. The owner has explicitly retained that architecture hold. INT and hosted STAGE were not run by this reviewer.

## Exact source and preservation

- Repository/worktree: `/Users/skypie/AccessMap-codex/p03a-backend-foundation-20260903`
- Branch: `repair/flagstone-p03a-backend-foundation-20260903`
- Reviewed SHA: `0a6a6b03fd0cbe72f70f67260f6cab746e098f6a`
- Reviewed tree: `857411dc733b93686d789a72e461856698bec814`
- Accepted predecessor: `c2e36800b269ee22f29d0be35cfb88dace7c2afc`, tree `7a68541462f0a9e1d55f48d98ea54df0fc0b01b7`.
- Worktree was clean at initial inspection, actual replay and final verification. All 335 initially pinned files remained identical; changed callers/tests also matched the frozen commit. The accepted predecessor is an ancestor.
- All 71 applied migration sources match the accepted Phase 02 commit. The prior six migration/restoration pairs remain byte-identical to receipt `c794ba8544df2f128269eabf6d87c9ed07a8fd68`. All seven current pair hashes match the manifest.

The parent was the sole implementation writer. This reviewer wrote only `independent-*` evidence/scripts under the assigned Documents work directory. Repository source, staging and production were not modified.

## Review findings

The seventh migration removes external table and column grants before regranting the explicit contract. The effective query and guard cover all non-extension-member public/private objects, exact owners and kinds, RLS, view invoker protection, columns, PUBLIC and inherited access, table-implied column privileges, grant options, schema capabilities, role attributes/membership, and application defaults including implicit global function EXECUTE. CI invokes the real disposable PostgreSQL guard. Unknown objects and migration/restoration inventory changes fail closed.

The service allowlist matches the saved deployed dependency excerpts: delete-account v4 requires only flags SELECT/UPDATE(user_id); notification v6/v8 requires push_tokens SELECT(token,user_id), with verify_webhook_secret(text) EXECUTE. This reviewer inspected the saved source excerpts and bundle hashes; no live source fetch or function invocation occurred. The database owner remains distinct from the external service role. Owner-held Auth/reward/history triggers retain their authority.

The exact 48 managed supabase_admin default entries match the saved live receipt. The local model matches their 36 client/service entries and leaves the additional 12 postgres-grantee entries explicitly outside its modeled platform state. Managed defaults were unchanged before/after local application. Application/postgres defaults and effective application objects are narrowed independently. All seven optional schema-only historical backup fixtures have zero external effective privileges; no production rows were copied.

Current profile, leaderboard, comment-author, token, feedback and preserved policy contracts remain supported. Local positive/negative role tests demonstrate transitional owner/admin direct flag deletion and unauthorized deletion refusal. The historical direct realtime-log write route is intentionally removed; its bounded RPC remains available. Guest flag/feedback insertion remains transitional pending FDA028.

## Gates actually run

| Independent gate | Result |
|---|---|
| Genuine pgTAP in disposable PostgreSQL 17.11 | **217/217 PASS**: media 25, foundation 113, effective privileges 79; zero failed/skipped/TODO/bailout/parse errors |
| Effective guard | **PASS**: 23 relations, 2 sequences, 35 routines; reapply guard also passes |
| Actual database mutation refusals | **18/18 PASS**, including PUBLIC/inherited access, column grants, grant options, managed ownership, new overloads, RLS/invoker drift and unsafe defaults |
| Independent manifest/hash tampering | **8/8 refusals before capture/apply**, plus one unchanged-inventory positive control |
| Standalone TAP parser Jest | **9/9 PASS** |
| Schema snapshot provenance | **PASS**, 87 ordered inputs, stamp v2 |
| Frozen commit diff whitespace check | **PASS**, exit 0 |
| Seven restorations in reverse order | **Exact combined catalog restoration**, followed by deterministic reapply |

Restoration compares the complete reverse chain; separate intermediate snapshots after each individual pair were not captured. Before/restored hash: `1af751339866c181c600d45135a704b97d0ba1162dc4b318da544f6e75ef45cc`. After/reapplied hash: `372e20ce2ca1afa273cbf5018ad07f22e6c18de898f05bd5e5a5b552b3899795`.

The pgTAP archive and generated SQL independently match the pinned hashes. Node and PostgreSQL binary hashes are saved. Replay stdout was captured directly to a regular file, producing complete parseable JSON of 1,469,013 bytes, SHA-256 `f5228f4a6268affc2525fdd86b759cabbd704e34bc86dc3d6cddc24baaf95049`. The only three stderr warnings report absent local Vault secrets and skipped webhook delivery; they are not skipped TAP assertions. Global PostgreSQL extension files were unchanged and the disposable cluster was destroyed.

Exact commands, exit codes and output filenames are in `independent-commands.json`. Full stdout/stderr, all three TAP files, parser results, source/tool hashes, preservation checks, guard refusals and detailed conclusions are retained beside this report; `independent-acceptance.json` provides their hashes.

## Writer evidence independently inspected

The writer's typecheck output reports `tsc --noEmit` success; lint reports 0 errors and 91 warnings. Focused Jest reports 5 suites/182 tests passed. The affected `flags.supabase.test.ts` is outside that focused command but passed all 40 tests in full Jest.

I independently parsed the full Jest JSON and the prior verified JSON: 273 suites passed, 12 failed; 4,204 tests passed, 14 failed, 32 TODO, 4,250 total. All 14 failure names match the prior evidence exactly; introduced failure names: **none**. These typecheck/lint/focused/full Jest runs are writer evidence, not new executions by this reviewer. The independent parser rerun is distinguished above.

## What's left

Hosted nonsuperuser execution authority, Auth/Storage behavior, REST/RPC column grants, delivery, gateway identity, two-client budgets and bypass prevention remain unverified here. The local platform stubs do not establish those results. Full app deletion remains Phase 04-owned. Restorations are `UNSAFE_BASELINE_RESTORE` artifacts that recreate known weaknesses; they are not safe production rollback authority. The changed app callers depend on currently undeployed RPCs and cannot ship ahead of an accepted backend rollout.

No complete CODE acceptance, INT acceptance, hosted STAGE acceptance, finding closure, production authorization or Phase 03B handoff is issued. No hosted call, external write, push, merge, deploy or app build was performed by this reviewer.

## DECISIONS FOR SKY

No new owner decision is requested for this FDA012 local review. Preserve the already-confirmed FDA028 architecture hold until an approved trusted mechanism can enforce the required budget persistence without violating the privacy contract. Recommendation: retain complete CODE/INT/STAGE holds. Alternative: explicitly revise the owner contract before choosing a different architecture. Impact: this useful local subset remains available, while the overall phase cannot advance.
