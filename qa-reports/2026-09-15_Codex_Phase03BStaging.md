# Phase 03B staging execution receipt

**Date:** 2026-09-15

**Owner authorization:** `OWNER_DECISION: AUTHORIZE_PHASE03B_STAGING`

**Outcome:** `PHASE03B_STAGING_EXECUTION: PASS`

**Scope boundary:** staging only; no production change, push, merge, external notification, or Phase 03C action

## Identity and target

- Isolated branch: `codex/flagstone-p03b-staging-20260915`
- Executor source HEAD before this receipt: `0f66cbcb81ca09e8adad76854697678d910a4385`
- Executor source tree: `a8529dcb29366acfc8b03e1648954cf4936904ab`
- Exact Phase 03B implementation candidate: `be82b9e86d60765ef2224a174bf8498b42b9aa37`
- Exact candidate tree: `a244be7f62a30219ee20127031bbf16a67505e73`
- Candidate ancestry: PASS; `be82b9e` is an ancestor of the executor source HEAD.
- The only candidate-to-executor source difference before this receipt was the accepted Phase 03B QA report.
- Staging project ref: `cepayqmsoqxshsiyqnvz`
- Staging branch id: `4a37413a-01c2-4ab2-8bf8-a17a42a549b8`
- Parent production project ref: `kldlwszpfkdmsjrjhjym`
- Branch condition before execution: healthy, `with_data=false`
- Excluded obsolete staging target: `ctshxbykuemeqnofqcdh`
- Direct remote inspection during this session: `origin/main` remained `70b52a30e9fff0f7d538509b110212bb8d872391`. No ref was fetched or changed. Local `main` remained 301 commits ahead of that remote ref.

## Exact artifacts

| Artifact | SHA-256 |
|---|---|
| moderation migration | `a492fad03bd8dc817019cf6ec72d0492203eba716853104b777a9fbd677a1e9c` |
| points migration | `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5` |
| moderation restoration | `33cc64614702c564c78234470e4674b51c579e09a524b1897d8ddd32930e8476` |
| points restoration | `f4da0362fb6f2e7258268e0bfee8dc10b2cf330bd447144e8362e170d1197149` |
| moderation pgTAP | `2d7a7fb00f02a6e611722ea3be8adeb6c9b3be50d3678f49112c4d130cad0d2f` |
| points pgTAP | `7e16e13ee211f4bdf586d2f5d12f30356290b122c98d45e83744f17fa956a5b9` |
| replay harness | `4714f1dcee2f3a7570e7f40729181809955406c5787c45d8d5e6adc749ff4616` |
| candidate contract | `7d0db97cf7e9bba829e73414c8c7c46030f8568029f77ef391ae0efcb3f69446` |
| Edge Function `index.ts` | `5bd0a7732ae719a5692c4667aa5ff6f52c35ad67fbe5c04877d48b0c2e6d272c` |
| Edge Function `notification.ts` | `51823f7abd2bd5db54ddccb1886003a303b13adcca0b3dd1aa3016f19254ea2d` |

## Preflight

- The live staging migration ledger contained 103 rows, ended at `20260913080000`, and contained neither Phase 03B version.
- Its ordered `version<TAB>name` digest, including the terminal newline, was `9c7301f4e0880905a84b1e27a9360afc229034042506d1b651700643fc0c8316`.
- The complete preflight structural catalog matched the accepted Phase 03A snapshot exactly: `1cb772c877a25b87f5e1870301e974a5d23e938e9ed412d2a57b8d9fa3dd45d3`.
- Preflight catalog counts: 202 columns, 10 default ACLs, 72 functions, 47 policies, 31 relations, 5 roles, 4 schemas, and 30 triggers.
- All inspected public application tables were empty. `net.http_request_queue` and `net._http_response` were empty.
- Vault was inspected by name and count only. Neither `webhook_secret` nor `webhook_endpoint` existed. No secret value was read or printed.
- The deployed-function inventory before Phase 03B showed `send-push-notification` v6, `notify-flag-status` v8, and `delete-account` v4.

## Staging apply

The exact forward migration bodies were applied in order:

1. `20260915210255_phase03b_moderation_semantics`
2. `20260915210413_phase03b_points_integrity`

The canonical CLI workspace contained the 103 live migrations plus these exact two candidate files. Two CLI dry-run attempts hung without output and were terminated. The live ledger remained at 103 rows after both attempts. **The CLI dry-run is therefore NOT a PASS and is not used as acceptance evidence.**

The hosted apply used one transaction per exact candidate body. To preserve the canonical version and name that the management migration endpoint cannot accept, the final transaction commit was operationally wrapped with a same-transaction insert into `supabase_migrations.schema_migrations`. The stored `statements` value is the exact source file as a single array element. This makes the DDL and ledger entry atomic, but it also means the ledger reports `statement_count=1` for each migration instead of a CLI split count. The migration bodies themselves were not rewritten.

The Edge Function `notify-flag-status` was deployed to staging only from the exact candidate `index.ts` and `notification.ts` files. Result:

- status `ACTIVE`
- version `9`
- `verify_jwt=false`, intentionally retained because this DB-webhook endpoint implements its own shared-secret check before parsing the body
- bundle digest `a8169601e9de234c7d4b454edf9016a5a74237e9e89ecd31e1b925f2507ced50`
- a post-deploy fetch showed exactly those two files and byte-for-byte equality with the candidate

## Hosted gates

### Exact forward state and rollback rehearsal

- First-apply structural digest: `86011aa2a87543ede47f425f965b129d0498f7281ed72ab29bc39b4fb117d35a`
- First-apply counts: 229 columns, 10 default ACLs, 77 functions, 51 policies, 36 relations, 5 roles, 4 schemas, and 31 triggers.
- The exact restoration files ran in reverse order: points, then moderation.
- Restored-state checks confirmed that client execution of moderation/list RPCs was revoked; the transition RPC remained present but its restored body disabled moderation; evidence and counter tables were preserved; no application rows existed.
- The exact forward files then reapplied in original order without duplicating ledger rows.
- Reapply structural digest: `86011aa2a87543ede47f425f965b129d0498f7281ed72ab29bc39b4fb117d35a`
- Reapply catalog counts matched first apply exactly. Structural roundtrip residual: zero.

The restoration scripts intentionally do not delete migration-ledger rows. That behavior was known before rehearsal and the final reapply did not insert duplicates.

### Hosted pgTAP after final reapply

The exact test bodies ran inside rollback-only transactions. A temporary capture table changed only result routing so the management query interface could return every pgTAP line; it did not change an assertion or persist test data.

- Moderation semantics: PASS, 49/49, `not ok` count 0.
- Points integrity: PASS, 22/22, `not ok` count 0.
- Covered results include non-admin denial, admin queue scope, atomic moderation and audit, stale-CAS refusal, restore linkage, storage-safe deletion refusal, immutable moderation evidence, opt-out handling, daily comment cap, vote cap and one-way votes, idempotent verification rewards, zero-point reject/restore, and owner-zero milestone rules.

### Runtime fail-closed check

One synthetic POST was made directly to the staging `notify-flag-status` function **without** `X-Webhook-Secret`.

- HTTP result: `401 Unauthorized`
- Body: `Unauthorized`
- Pre- and post-request application-table counts: zero
- Pre- and post-request HTTP request/response queue counts: zero
- Pre- and post-request Vault name counts for `webhook_secret` and `webhook_endpoint`: zero
- No notification, webhook delivery, email, or other external send was attempted.

### Final ledger and data state

- Migration rows: 105
- Latest version: `20260915210413`
- Final ordered `version<TAB>name` digest with terminal newline: `b82f253edc05642547a02bc1311aa157f6c689455f4e0526328f9410123e6c75`
- Phase 03B rows exist exactly once with canonical versions and names; each stores one exact source-file statement element.
- Final counts were zero for users, flags, feedback, comments, moderation events, point events, reward claims, daily comment reward counters, vote reward counters, HTTP request queue, and HTTP response queue.

## Advisor review

The post-apply advisor run returned no ERROR finding. The new findings were reviewed rather than silently called green:

- Three INFO `rls_enabled_no_policy` findings identify the internal reward-counter/claim tables. They intentionally have RLS enabled, no client policies, and no client table privileges. Hosted pgTAP proved the intended access boundaries.
- The authenticated SECURITY DEFINER warning set increased from three inherited functions to six. The three Phase 03B functions are intentionally client-callable RPC entry points: the queue and moderation RPCs enforce the admin check in their bodies, while the transition RPC binds the authenticated actor and constrains legal transitions. The hosted suite proved the denied and allowed paths.
- Nine inherited `limiter` mutable-search-path warnings remain unchanged.
- Performance INFO added three unindexed foreign-key notices. Performance WARN also reports the expected overlapping policy shapes, including the new feedback maintainer/owner reads. No functional or security failure was produced by these notices.

Relevant remediation references: [RLS enabled without a policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [authenticated SECURITY DEFINER execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), and [multiple permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).

## Local gates rerun

Commands and actual results:

- `npm ci --ignore-scripts --no-audit --no-fund --cache /tmp/phase03b-npm-cache`: PASS, 1,166 packages installed. The first attempt using the pre-existing user cache failed with an EACCES cache-rename error; no package or source file changed. The isolated temporary cache retry passed.
- `npm run typecheck`: PASS.
- `npm run lint -- --quiet`: PASS.
- `git diff --check`: PASS.
- Exact nine-suite Phase 03B focus set with Jest CI, serial execution, and no cache: PASS — 9/9 suites, 107/107 tests, 0 snapshots.

The expected test-console messages about the mocked pre-migration `increment_reopen_request` RPC remained informational; no test failed.

## What changed

Hosted staging only:

- applied the two exact Phase 03B migration artifacts and recorded their canonical identities atomically;
- rehearsed exact reverse restoration and exact forward reapply;
- deployed exact `notify-flag-status` candidate files as staging version 9;
- ran rollback-only synthetic hosted assertions and an unauthorized fail-closed runtime check.

Repository:

- added this receipt only. No implementation file changed in this execution branch.

## What's left

- Independent review of this staging receipt and fresh staging state is not run in this executor session.
- No physical-device or end-user UI lane was authorized or run here.
- No production apply, deploy, branch merge, push, notification, Phase 03C action, or acceptance claim was performed.
- The two CLI dry-run hangs remain a tooling limitation; the successful managed transaction apply, canonical ledger verification, exact structural roundtrip, hosted pgTAP, and final zero-data proof are the evidence used for this staging result.

## DECISIONS FOR SKY

### Commission independent Phase 03B staging acceptance

- **Decision:** Whether to authorize a separate reviewer to inspect the exact staging state and this receipt.
- **Recommendation:** Yes. Keep production closed until that reviewer independently confirms candidate identity, hosted assertions, restoration/reapply parity, Edge Function bytes, final empty state, and the reviewed advisor findings.
- **Why:** This session executed and verified the staging change; it is not independent acceptance of its own work.
- **Alternative:** Stop with the executor PASS and do not advance Phase 03B.
- **Impact:** Independent acceptance can prepare a later, separately bounded owner decision. It does not itself authorize production.

No other owner decision is required to preserve the current staging state.
