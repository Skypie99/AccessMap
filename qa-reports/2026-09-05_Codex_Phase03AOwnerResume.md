# Phase 03A owner resume — local FDA-012 proof, FDA-028 hold

**BACKEND_FOUNDATION_GATE: BLOCKED. PHASE_GATE: BLOCKED. SAFE_TO_INTEGRATE: NO. MAIN_MERGE_AUTHORIZED: NO.**

FDA-012's application-privilege subset passes independent local review at `0a6a6b03fd0cbe72f70f67260f6cab746e098f6a` / tree `857411dc733b93686d789a72e461856698bec814`. Complete Phase 03A CODE remains on hold. Sky confirmed: **“Keep the budget across session resets; retain the architecture hold until a trusted mechanism is approved.”** FDA-028 has no approved mechanism meeting that contract. No limiter or hosted mutation was attempted; no complete Phase 03A candidate or finding is accepted.

This is the 2026-09-05 UTC continuation of `FLAGSTONE PHASE-03A — BACKEND HARDENING FOUNDATION`, under the authoritative owner-resume attachment and subsequent budget-persistence reply. The older BLOCKED reports remain historical evidence. The main phase receipt receives an append-only addendum; this report and the machine-readable [blocked handoff](phase03a/2026-09-05-owner-resume/blocked-handoff.json) supply its supporting detail. This is not a production-authorization packet or a Phase 03B handoff.

## Source identity and preservation

| Item | Verified identity or result |
|---|---|
| Repository remote identity | Skypie99/AccessMap |
| Accepted Phase 02 | `c2e36800b269ee22f29d0be35cfb88dace7c2afc` / `7a68541462f0a9e1d55f48d98ea54df0fc0b01b7`; ancestor of current source |
| Prior local partial source | `6a82b8212a2d0d3de96525d98b5824b4eb7121fb` / `d3b750fce6ae489f793b88867f1edeca23f5c9d4` |
| Resume start / prior receipt | `c794ba8544df2f128269eabf6d87c9ed07a8fd68` / `9f063b465f11127a590d1863d6ebf7a63abf8e55`; clean |
| New unaccepted partial source | `0a6a6b03fd0cbe72f70f67260f6cab746e098f6a` / `857411dc733b93686d789a72e461856698bec814`; clean through independent final check |
| Writer branch | `repair/flagstone-p03a-backend-foundation-20260903` |
| Writer worktree | `/Users/skypie/AccessMap-codex/p03a-backend-foundation-20260903` |
| Integration worktree, read only | `/Users/skypie/AccessMap-worktrees/flagstone-b33-convergence-20260903`; `integration/flagstone-b33-convergence-20260903`; `5a64c9174ae5d9d5a94ed543bc4663216df67e7f` / `edaa68182add5b9a41123f6864c7774f5969e03f`; not integrated |
| Main and freshly fetched origin/main | Both `70b52a30e9fff0f7d538509b110212bb8d872391`; divergence 0 / 0 |
| Applied migration sources | All 71 match accepted Phase 02 |
| Earlier Phase 03A pairs | All six forward and six restoration files byte-identical to prior receipt |
| Historical evidence | All prior QA files unchanged before this append; existing 31,677-byte main-receipt prefix SHA-256 `d49a6fb0f88ae3995481f6149e4d58af161694efcbb5ca06415faf4f07e63ffa` preserved |
| Other worktrees | All 41 other registered HEAD/branch/status records unchanged; 42 total, including the same one already-missing registered path |
| Packages, lockfile, generated schema SQL | Unchanged; only the generated provenance stamp reflects the new 87-input inventory |

`fix(db): constrain Phase 03A application privileges` is the source commit. A separate documentation-only commit packages this receipt. Its final SHA/tree cannot be embedded in its own bytes; the exported finalization receipt records those values and verifies that all source files still match the independently reviewed commit. No working tree was cleaned, stashed or reset. Primary `/Users/skypie/AccessMap` and other writers' directories were read only. The full preservation inventory contains 967 protected artifacts.

## What changed and why

The source commit changes 20 files. The complete candidate relative to accepted Phase 02 contains 39 non-QA changed files; [frozen-source.json](phase03a/2026-09-05-owner-resume/frozen-source.json) records every path and SHA-256, all seven forward/restoration pairs, callers and tests. This increment changes no application TypeScript caller or UI file.

- `20260905073925_phase03a_effective_privileges.sql` is a seventh CLI-generated migration after the six preserved pairs. It removes unnecessary table and independent column grants, then grants the explicit application contract. Its matching restoration recreates the state after the first six candidates.
- `application-privileges.v1.json`, `effective-privileges.sql` and `scripts/check-application-privileges.mjs` pin and evaluate effective application rights. They cover PUBLIC and inherited rights, table-implied column access, grant options, exact columns/objects/overloads, RLS, view invoker protection, owners, schema rights, role attributes/memberships and postgres defaults, including implicit global function EXECUTE.
- The replay scripts and CI run the effective guard against disposable PostgreSQL. Exact forward/restoration directory inventory and content hashes are validated before capture or apply. Full local mode requires actual pinned pgTAP; the CI privilege-only mode claims only its own database checks.
- A schema-only local fixture covers seven known historical backup tables without copying rows. New privilege assertions and three corrected REFERENCES test fixtures establish actual allow/deny behavior. The fixture grants local isolated-schema CREATE solely to reach a real REFERENCES denial; no such capability is granted to hosted clients.
- The client contract revision replaces a nonexistent notification-source pointer with the actual push-token source and labels retained policy-only contracts honestly. Five source-backed review/deployed-dependency/default-ACL receipts are committed. The schema stamp changes; generated SQL bytes do not.

The narrowed service role retains only deployed application dependencies: flags SELECT/UPDATE of `user_id` for delete-account v4, push_tokens SELECT of `token,user_id` for notification v6/v8, and EXECUTE on `verify_webhook_secret(text)`. No blanket service DML, private RPC, trigger EXECUTE or sequence privilege is retained. The postgres object owner remains distinct from service role; owner-held Auth/reward/history trigger behavior remains available.

Authenticated profile updates retain only three supported profile fields; selected self-profile data excludes private admin fields. Flag insert/update grants exclude server-controlled identity, location updates, timestamps and counters as appropriate to the actual payload. Existing owner/admin direct flag deletion remains supported. Guest flag/feedback writes remain transitional because their trusted replacement is held under FDA-028. Their continued existence is not a bypass-prevention PASS. The direct realtime-log table route is removed while its bounded logging RPC remains.

The underlying causes addressed are blanket grants that bypass column intent, inherited/PUBLIC permissions, undifferentiated service capabilities and unsafe future-object defaults. FDA-028's unresolved cause is trusted anonymous-client continuity/admission, not counter arithmetic.

## Managed defaults and deployed dependencies

The saved production default capture contains 144 explicit ACL entries: 48 each for postgres/public, postgres/storage and supabase_admin/public, including owner-grantee rows. All 48 managed entries are recorded exactly. The local platform model reproduces the 36 managed client/service entries; the other 12 postgres-grantee entries are explicitly outside that model. It does not claim full platform parity. The hosted execution role is postgres, not a superuser or member of the managed role.

The candidate leaves supabase_admin-owned defaults untouched and narrows postgres/application defaults and every reviewed application object separately. All 25 captured production application relations/sequences are postgres-owned. Locally the effective guard covers 23 relations, 2 sequences and 35 routines, including seven optional backup names. Unknown application objects fail closed. A raw managed-default row alone is no longer a blocker under Sky's explicit decision. This is not platform-wide hardening or proof that managed defaults were removed.

Only read-only deployed source retrieval was used to establish the current server dependencies. Saved bundle hashes are delete-account v4 `9edfdaf21ee036632b47a10438f0d7e0d6b97f19c62b3f6cb57884dd68abdb34`, send-push-notification v6 `0434671ed6ad9f62e8e5a94a200f8caad3d2771e8cbb3a0053229874a1595be8`, and notify-flag-status v8 `633db2d2ae659ffc03d4758be2538253413c65c54a4f9b66ca8d3057c0ba7a0e`. No function was invoked. The future deletion implementation in repository source is Phase 04-owned and was not treated as the deployed dependency contract.

## Actual gates and limits

| Gate | Actual result |
|---|---|
| Independent real pgTAP | **217 / 217 PASS**: 25 existing media, 113 foundation, 79 privilege assertions; no failed/skipped/TODO/bailout/parse errors |
| Effective privilege guard | **PASS**, initial application and deterministic reapply |
| Actual database mutation refusals | **18 / 18 PASS**, including PUBLIC/inherited/column/grant-option/default/owner/object drift |
| Independent file-inventory/hash refusals | **8 / 8 PASS before capture/apply**, plus positive control |
| Independent parser Jest | **9 / 9 PASS** |
| Writer focused Jest | **5 suites / 182 tests PASS**; the separate changed flags.supabase suite passes 40 tests in full Jest |
| Writer typecheck | **PASS**, exit 0 |
| Writer lint | **PASS**, exit 0; 0 errors and 91 inherited warnings |
| Writer full Jest | **273 passed / 12 failed suites; 4,204 passed / 14 failed / 32 TODO tests**, 4,250 total; exit 1 |
| Failure classification | All 14 failed names exactly match the prior verified result; introduced failed names **NONE** |
| Normal accepted Phase02 local replay and dump | **PASS**; generated schema SQL unchanged |
| Schema provenance | **PASS**, 87 ordered inputs, stamp v2 |
| Baseline ACL equality | **PASS**, 18 column / 108 client-default / 18 sequence entries |
| Seven reverse restorations and reapply | **PASS**, exact combined baseline restoration and deterministic reapply |
| Source diff whitespace | **PASS**; documentation packaging is checked separately before its commit |
| Hosted pgTAP / REST / RPC / Auth / Storage / limiter / restoration | **NOT RUN** |
| Runtime, device, accessibility screenshots or VoiceOver | **NOT RUN**; no UI acceptance claim |

The writer's local runs preceded the source commit and identify the dirty parent receipt HEAD in their own metadata. Independent replay then ran the exact clean `0a6a6b03fd0cbe72f70f67260f6cab746e098f6a` / `857411dc733b93686d789a72e461856698bec814`, with all 335 initially pinned files unchanged through the review. Do not relabel earlier dirty runs as committed-source executions.

The independent reviewer `/root/03a_effective_privilege_acceptance` found no actionable defect in this subset and issued **FDA012_LOCAL_SUBSET_ACCEPTANCE: PASS; COMPLETE_PHASE_03A_CODE_GATE: HOLD**. That reviewer reran real SQL, guard mutations, inventory tampering, parser tests and snapshot verification. The writer's typecheck, lint, focused and full Jest logs were independently inspected, not all rerun by the acceptor. Exact independent invocations, working directories, exit codes and regular-file output paths are in [independent-commands.json](phase03a/2026-09-05-owner-resume/independent-commands.json), SHA-256 `f158752f7537d28dfc7934eca56674c048513e0ff033bc56516650cba1f776a2`.

The core actual independent SQL command was:

```bash
/usr/bin/env -i PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin /usr/local/bin/node scripts/replay-migrations.mjs --with-next --local-only --phase03a --phase03a-pgtap-sql=/Users/skypie/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/pgtap-968eb53a33114e83042b3bdb0c664b5b80cf8bdf/sql/pgtap.sql --json > /Users/skypie/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/phase03a-owner-resume/independent-replay.stdout.json 2> /Users/skypie/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/phase03a-owner-resume/independent-replay.stderr.txt
```

It exited 0. Complete replay output, three raw TAP files, actual negative cases and command receipts are saved under this evidence directory. The pgTAP 1.3.4 source commit is `968eb53a33114e83042b3bdb0c664b5b80cf8bdf`; archive SHA-256 `78822aa24ab5119f6b1f57de1a25223e6c4a31f4df6d3ab16ca2aadd1dbdea6c`; generated SQL SHA-256 `d4f9c8a4b0bfa6f2e29c751ab4deb79208e43f5935bab1948750b95bad3926b3`. PostgreSQL 17.11 ran in a disposable Unix-socket-only cluster, with inherited PG environment excluded, TCP disabled and no global extension installation. The temporary cluster was destroyed. Three expected missing-Vault warnings skipped local webhook delivery, not TAP assertions.

The full Jest failure list and all raw result JSON are retained, not hidden behind a green summary. These are the same inherited failures in dismissal/focus/keyboard/visual guards, privacy copy, map/task geometry and related action-label tests. They remain deferred; no unrelated UI repair was attempted.

Two unsuccessful attempts are preserved: the first new SQL suite had three REFERENCES fixture failures (42P16), corrected before the final 217-test replay; the first focused Jest invocation used two nonexistent filenames, corrected before the 182-test result. Console logs are losslessly JSON-wrapped where necessary to preserve whitespace and escape codes. [artifact-relocations.json](phase03a/2026-09-05-owner-resume/artifact-relocations.json) maps each original log to its committed representation and original-byte hash. No log was silently normalized or discarded.

## FDA-028: owner-confirmed architecture hold

The owner now requires an exhausted anonymous budget to survive clearing or replacing session state. The earlier independent architecture document is retained as a pre-decision review; its unresolved entitlement question is superseded by [owner-rate-limit-decision.json](phase03a/2026-09-05-owner-resume/owner-rate-limit-decision.json) and [FDA028_INGESTION_BOUNDARY.md](phase03a/2026-09-05-owner-resume/FDA028_INGESTION_BOUNDARY.md).

The examined approaches do not yet supply the approved trusted continuity primitive. IP-derived buckets share one budget among clients behind the same address. Independently issued short sessions have separate budgets but can be reissued after reset unless admission adds a trusted distinction. Signing a capability prevents fabrication, not repeated legitimate issuance. The owner has not approved persistent fingerprinting, a durable cross-session tracking ID, anonymous-Auth adoption or a provider device signal as that distinction. No global-cap or resettable-session substitute was implemented.

Actual hosted original-client metadata and its anti-forgery contract remain unverified. Public examples and runtime source are useful architecture evidence, not the deployed branch's trust contract. References and their limits are retained in [FDA028_ARCHITECTURE_REVIEW.md](phase03a/2026-09-05-owner-resume/FDA028_ARCHITECTURE_REVIEW.md). None of the three deployed functions is a guest metadata probe. They were not invoked to infer identity. A shared private database counter could address atomic counting, but cannot solve missing identity/admission by itself.

The remaining scope is precise: approve a mechanism that distinguishes a returning exhausted client from a new same-network client within the privacy contract; establish actual trusted metadata; implement atomic budgets and close every direct/alternate guest ingestion bypass; test resets, renewal, pre-minting, concurrency, forged inputs, retention, emergency caps, independent A/B clients and restoration. No new provider, paid entitlement, persistent identifier, secret or infrastructure was provisioned.

## Staging and production truth

Read-only branch lookup confirms the exact approved development branch `441acc38-d71c-4a87-883e-61ff87e0c52e`, project `ctshxbykuemeqnofqcdh`, name `flagstone-p03a-staging-20260905`, parent `kldlwszpfkdmsjrjhjym`. It is non-default, nonpersistent, `with_data: false`, and `ACTIVE_HEALTHY` at capture. The generic project endpoint returned NotFoundException; that endpoint result is preserved and is not used to deny the positive branch/SQL evidence.

Counts only were read from all 13 public application tables, auth.users, storage.objects and vault.secrets: every count was zero. No user row or secret value was retrieved. Its starting catalog has 16 relations, 104 columns, 25 routines, 47 policies, 24 triggers and 71 migration rows. Migration names/versions match the accepted historical inventory after normalizing unordered metadata arrays; the five accepted Phase 02 adoption candidates are still needed. The remaining catalog sections are schemas, policies, triggers, routines and routine grants. The reconciliation plan names all five exact files but does not apply them.

**PHASE03A_STAGING_IDENTITY_GATE: NOT PASSED. PHASE02_BASELINE_RECONCILED: NO.** This is read-only feasibility evidence, not execution of the formal STAGE lane or proof of a reconciled baseline. Full CODE and INT are not complete. Starting normalized catalog SHA-256: `1679e494c63483c116b87b8aeac9344aa153d412bb1750b9f205943abbd4f686`. There is no after-candidate staging catalog, hosted pgTAP, role/REST/RPC, Auth/Storage, two-client or restoration acceptance. No staging migration, function deployment, probe, extension enablement or configuration mutation occurred.

Production catalog comparator v3 captures at `2026-09-05T07:31:07.892Z` and `2026-09-05T08:17:17.017Z` are identical: SHA-256 `6f3ee7f60f4134a83b2e013f4f3ffe98be1ae0fa489032062ee2f38cad9ca0d4`. This covers the saved catalog metadata, including 23 relations, 152 columns, 28 routines and 71 migration entries; it is not an inspection of application data, operational logs or every platform configuration. Production received zero mutations. Current default/schema/role metadata and read-only Edge dependency retrieval are separately recorded.

## Restoration, cleanup and release boundaries

All seven local restoration files are **UNSAFE_BASELINE_RESTORE**: they recreate captured weaknesses. The exact combined reverse chain restores SHA-256 `1af751339866c181c600d45135a704b97d0ba1162dc4b318da544f6e75ef45cc`; reapply reproduces `372e20ce2ca1afa273cbf5018ad07f22e6c18de898f05bd5e5a5b552b3899795`. No separate per-pair intermediate catalog snapshots were captured. This is disposable local rehearsal, not safe production rollback authority. All ordered hashes are in frozen-source.json.

**STAGING_CLEANUP_REQUIRED: YES. STAGING_CLEANUP_SAFE: NO. STAGING_BRANCH_DELETED: NO. STAGING_CLEANUP_VERIFIED: NO.** The exact retained branch is `ctshxbykuemeqnofqcdh` / `441acc38-d71c-4a87-883e-61ff87e0c52e`. Sky explicitly prohibits deletion before all twelve cleanup conditions hold. Complete CODE/INT/STAGE acceptance, independent staging review, required hosted evidence and the production-authorization packet are incomplete. The conditions are enumerated in blocked-handoff.json. No cleanup was attempted or forgotten; an early deletion would need a separate owner instruction superseding that rule.

App callers in the partial candidate depend on currently undeployed RPCs and must not ship ahead of accepted backend rollout. Transitional direct owner/admin flag-delete behavior has local synthetic role proof only. **FULL_APP_DELETE_E2E: PHASE_04_OWNED.** No Phase 04 implementation was absorbed. App Store review is protected by no action; live status was not inspected. No screenshot, simulator, VoiceOver, runtime or hosted UI claim is made.

Remote actions were read-only origin fetch/list, Supabase branch/function/catalog/count reads and public documentation/source reads. **Pushes, merges, deploys, paid builds, production changes, staging writes, external sends and Phase 03B actions: NONE.** No credentials, secret values, raw IPs or real application records were collected. Local test identities and platform stubs are synthetic. No production gateway policy, apply order, restoration plan or authorization packet is issued while CODE/INT/STAGE remain incomplete.

## Current-truth corrections and work left

The earlier “no staging identified” state is superseded by exact read-only branch evidence. The earlier managed-role default blocker is superseded by Sky's managed-residual decision and objective local effective-privilege proof. Earlier 138-assertion SQL evidence remains historical; the new exact-source result is 217. The confirmed reset-persistence requirement supersedes the architecture review's open per-session interpretation. The historical `AGENTS.md` 204-suite baseline is not the current baseline; actual full Jest is reported above.

No task is silently marked complete: **03A-CODE: PARTIAL/HOLD; INT: NOT RUN; 03A-STAGE: NOT RUN; 03A-PROD: read-only preflight only.** All seven findings FDA-009, FDA-010, FDA-012, FDA-021, FDA-023, FDA-026 and FDA-028 remain OPEN. No supporting finding or inherited deferral was closed, reassigned or dropped. The accepted Phase 02 baseline, Build 33/main lineage decision, frozen identifiers, earlier QA and all deferred work remain preserved.

## DECISIONS FOR SKY

| Decision | Recommendation and reason | Alternative and impact |
|---|---|---|
| FDA-028 budget continuity | **Already decided:** retain the strict reset-resistant budget requirement and architecture hold. Resume only after a specific trusted continuity/admission mechanism is approved within the privacy contract. | A weaker resettable-session policy would need an explicit change to the owner's decision. It is not the current plan. Complete CODE/INT/STAGE remain held. |
| Metadata verification sequence, only if a future design requires a probe | Prepare a concrete, independently reviewed synthetic-only probe and full identity/removal plan before seeking a narrow pre-CODE sequencing exception. First seek a sufficient approved read-only trust contract. | Preserve the existing CODE → INT → STAGE order; no probe runs. General staging authority does not silently change that order. |
| Retained disposable staging | Keep the exact branch under the explicit no-early-delete rule and mark cleanup required. This session requests no routine reapproval. | Sky can separately authorize early deletion if the architecture hold makes retention undesirable; absent that instruction, the original twelve conditions govern. |

Next permitted work is a scoped Phase 03A architecture resume under a specific owner-approved trusted mechanism. **ACCEPTED_PHASE_03A_SHA: NONE. ACCEPTED_PHASE_03A_TREE: NONE. PRODUCTION_AUTHORITY: NONE. PHASE_03B_HANDOFF: NOT ISSUED.**
