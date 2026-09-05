# Phase 03A — resumed local implementation

Prompt: FLAGSTONE-PHASE-03A-MAIN-OWNER-20260903. Session began 2026-09-04 America/Vancouver and was finalized 2026-09-05; captures use UTC.

**BACKEND_FOUNDATION_GATE: BLOCKED**
**03A-CODE: PARTIAL / HOLD**
**SAFE_TO_INTEGRATE: NO**
**MAIN_MERGE_AUTHORIZED: NO**

Six forward candidates, six exact restorations, bounded caller changes and genuine local pgTAP proof are prepared. FDA-012 retains a managed-role default-grant gap. FDA-028 has no verified implementable gateway contract. The staging reference is still the literal placeholder supplied in the resume request. All seven findings remain OPEN. No complete code acceptance, INT, hosted STAGE, PROD or Phase 03B handoff is issued.

## Exact source and history

| Identity | Value |
|---|---|
| Repository | https://github.com/Skypie99/AccessMap.git |
| Accepted predecessor SHA | c2e36800b269ee22f29d0be35cfb88dace7c2afc |
| Accepted predecessor tree | 7a68541462f0a9e1d55f48d98ea54df0fc0b01b7 |
| Preserved preflight commit | 9469c43ee68360dc28a74f8d0dd9a6930a602d33 |
| Initial local implementation | 6080215c409de9be67cc0c6f066f8567a2722fed; tree 23cf68c37574499d153e7e12dccf3031faf0f02d |
| Final candidate SHA | 6a82b8212a2d0d3de96525d98b5824b4eb7121fb |
| Final candidate tree | d3b750fce6ae489f793b88867f1edeca23f5c9d4 |
| Branch | repair/flagstone-p03a-backend-foundation-20260903 |
| Worktree | /Users/skypie/AccessMap-codex/p03a-backend-foundation-20260903 |
| Source acceptance | Local partial candidate; not accepted for INT or apply |

The source was clean at each committed independent run. The subsequent documentation-only commit and final clean state are recorded in the exported finalization receipt; a commit cannot embed its own SHA. The initial implementation and later test-fixture correction are separate, preserved commits.

The original phase receipt is preserved as an exact historical prefix: 25918 bytes, SHA-256 35d0f4959cff8949b4d608b4d3e481aeffdbde74c2a914969e6e3d25502cc64d. The append explicitly supersedes its former current-state statements. Other preflight artifacts remain unchanged.

The owner's later explicit approval resolves the former bounded-caller scope blocker (B03A-02) and full-app delete sequencing blocker (B03A-04). The supplied privacy policy is adopted. Its implementation and gateway capabilities still need the additional decision below. Conditional staging authority exists, but no actual project reference was supplied.

## What changed

| Finding | Local implementation | Boundary |
|---|---|---|
| FDA-009 | Drop only flags_user_scoped ALL. Preserve explicit owner/admin/guest/read policies. | Hosted effective-policy proof outstanding. |
| FDA-023 | Restrictive authenticated flag INSERT requires open status; existing ownership check remains. | Local open/non-open and service proofs pass. |
| FDA-021 | Remove broad users UPDATE; permit display_name, avatar_url, avatar_object_key. Keep media guards and trusted trigger writers. | Profile edit succeeds; sensitive and mixed-field forgery fails atomically; rewards/streak writes survive locally. |
| FDA-026 | Private SECURITY DEFINER helpers with fixed empty search_path; narrow invoker RPCs for current admin ability, top-20 leaderboard, own rank and actual comment authors. Rebind owner/admin delete dependencies. | Base users enumeration and client is_admin reads denied. Existing public display fields retained. |
| FDA-010 | Revoke PUBLIC/anon/authenticated EXECUTE on six exact internal trigger signatures. | Required RPCs, service grants and triggered writes retained. |
| FDA-012 | Remove client TRUNCATE/REFERENCES/TRIGGER/MAINTAIN on 16 named public relations; remove UPDATE on two sequences; narrow postgres-owned public/storage defaults and global PUBLIC function EXECUTE. | PARTIAL: supabase_admin-owned defaults unchanged; existing ordinary DML and service defaults retained. No claim that all unnecessary privileges are removed. |
| FDA-028 | Record verified capability limits and gateway decision. Guest callers and global emergency caps preserved. | NOT IMPLEMENTED; no per-client isolation proof. |

Admin callers accept only successful boolean true and log a fixed sanitized denial message on failure. Leaderboard exposes four existing fields and caps results at 20. Own-rank RPC accepts no arbitrary user ID. Comment reads hydrate only actual stored comment IDs, fail incomplete projections, preserve null attribution and keep the 200-row list and 100-item Unhide chunks. Comment INSERT retains its atomic own-author embed, avoiding a post-write hydration failure that could encourage duplicate retries or rewards.

Only one screen source line changes: the rank call no longer passes a user ID. No JSX, style, accessibility prop, modal, sheet, navigation or guest-flow refactor occurs. Caller/types/tests/manifest paths and all 31 source-file hashes are in source-artifact-hashes.json.

The six pairs are separate from the five accepted Phase 02 candidates. Supabase CLI generated their filenames with telemetry disabled; no applied migration was edited or renamed. The optional --phase03a replay requires --with-next and --local-only. The Phase 02 replay with --with-next still runs its original 71 sources plus five candidates. An actual default replay/dump retained schema.generated.sql bytes; only its generator input stamp changed. No package or lockfile version changed.

## Gates and actual output

All commands ran from the dedicated worktree. The linked JSON evidence retains exact commands, exit codes, timestamps and actual output.

| Gate | Result |
|---|---|
| Locked install | npm ci --no-audit --no-fund using task-local cache: exit 0, 1,166 packages. Node v24.15.0, npm 11.12.1. Package/lock hashes unchanged. |
| Typecheck | npm run typecheck: exit 0; tsc --noEmit. |
| Full lint | npm run lint: exit 0; 0 errors, 91 inherited warnings. |
| Changed caller/screen/parser tests | 5 suites / 106 assertions pass: admin 13, comments 37, flags 40, leaderboard screen 7, TAP parser 9. Independently repeated on 6080215. |
| Full Jest | Exit 1: 273 suites pass / 12 fail; 4,204 tests pass / 14 fail / 32 TODO; 4,250 total. Full suite is NOT PASS. No new failed names. |
| Genuine local pgTAP | 25 media + 113 Phase03A assertions executed; 138 pass, zero failed/skipped/TODO, bailout or parse errors. |
| Local restoration / reapply | All six exact restorations, reverse order: before catalog restored exactly; reapplied catalog deterministic. |
| Default Phase02 replay/dump | Exit 0, LOCAL_REPLAY_ONLY; unchanged snapshot SQL, global PostgreSQL unchanged, temporary cluster destroyed. |
| Snapshot/crosswalk guards | Exit 0: snapshot current with 87 ordered inputs; migration crosswalk current. |
| Discovery | Exit 0: four pgTAP suites and classified fixtures; no classification problems. Discovery is not execution. Only the two named suites ran here. |
| Diff / commit hook | Diff checks exit 0; normal secret scanner passed. Source commit hook emitted a grep broken-pipe warning; no credential value printed. |
| Hosted pgTAP / role REST/RPC / Storage / rollback | NOT RUN / BLOCKED. |
| Two-client anonymous rate isolation | NOT RUN / BLOCKED; no limiter or target. |
| App delete, mobile/web runtime, screenshots, VoiceOver | NOT RUN. Direct database-role deletion is the Phase03A proof; full Edge/app pipeline remains Phase04-owned. |

Exact final full-suite command:

```bash
node node_modules/jest/bin/jest.js --ci --maxWorkers=3 --watchman=false --json --outputFile=/Users/skypie/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/phase03a-resume/verified-jest-results.json
```

Exact local database proof:

```bash
node scripts/replay-migrations.mjs --with-next --local-only --phase03a --phase03a-pgtap-sql=/Users/skypie/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/pgtap-968eb53a33114e83042b3bdb0c664b5b80cf8bdf/sql/pgtap.sql --json
```

The initial baseline Jest run had eight additional releaseTools loopback EPERM failures; the approved local-socket focused rerun passed 52/52. The remaining 14 failures in 12 existing suites match the final full run. The first composed run added one asynchronous leaderboard test failure. A test-only await findByText correction passed its focused 7/7 and the final full run. Inherited failing files were not edited.

The 12 inherited suites concern dismissalStandard, focusOnOpen, hitTargetFrame, keyboardClass, privacy, visualFreezeFixWave, bp11PressVocabGuards, bp3TrustEngineGuards, mapChromeBudget, tasksHeaderReclaim, TasksScreenFlagCard and Wave2ScreenGeometry. test-summary.json records exact names and real failure-message excerpts; full raw output is retained with hashes and local locators. No inherited failure or warning is waived, closed or converted to PASS.

Earlier database attempts remain recorded in local-proof-history.json. Synthetic null-author, display-name and photo-folder fixture errors were corrected without weakening application policies. The restoration mismatch exposed omitted local ACL/default setup, resolved by an explicit local supplement and exact baseline gate. After independent review, the seed users UPDATE was restricted to its exact synthetic UUIDs before any prospective hosted use; only that test and its manifest hash changed. The final independent run verifies the corrected bytes. One author-side correction run used a pipe that truncated its JSON at 65,536 bytes; the wrapper failed parsing and that capture was not credited. The retained regular-file capture and independent run are complete.

A mistaken check-migration-crosswalk.mjs command failed MODULE_NOT_FOUND; the actual generate-migration-crosswalk.mjs --check passed after file discovery. final-small-gates.json records the failed subcommand even though its original combined shell returned a later successful exit code.

One initial caller patch was automatically rejected under the superseded documentation-only scope. The agent re-presented the explicit later bounded auth/admin approval and the scoped retry succeeded. No unresolved approval rejection remains and no approval channel was bypassed.

## Database proof and its limits

pgTAP 1.3.4 comes from upstream commit 968eb53a33114e83042b3bdb0c664b5b80cf8bdf. candidate-contract.json pins source/archive/generated-SQL hashes. Only the SQL target was built against PostgreSQL 17.11; no make install or global extension-file change occurred. The SQL loads into a disposable schema. There is no claim of a hosted pg_extension installation.

Perl TAP::Parser 3.43 enforces a complete exact nonzero plan, assertion count, no failure/skip/TODO/bailout/parse error and successful psql exit. Nine parser tests include eight refusal cases. [pgTAP execution semantics](https://pgtap.org/documentation.html#pgtaptestscripts) and [TAP::Parser](https://perldoc.perl.org/TAP::Parser) informed the strict gate.

Phase02 comparator v3 did not cover the column/default/sequence ACL fields needed by the expanded proof. Its accepted local model lacked one is_admin column grant and postgres/storage plus supabase_admin/public default grants. The new hashed, local-only baseline fixture models all captured missing grants, including service defaults. The runner checks the saved 18 column, 108 default and 18 sequence ACL entries before candidates. It does not grant the candidate execution role platform membership. This extends local test setup without rewriting historical Phase02 source or retroactively expanding its accepted claims.

| Role / path | Local proof | Still unproven |
|---|---|---|
| anon | Guest open insert preserved; disallowed users/admin/profile paths and non-open inserts refused. | Hosted gateway/direct API and independent budgets. |
| normal user / owner | Profile fields work; points/email/streak/timestamp/admin forgery and mixed updates refuse; own open insert and edits work. | Real REST/session/client behavior. |
| direct DELETE | Owner deletes own flag; admin deletes another user's flag; normal non-owner cannot. | Hosted direct-role/REST proof. Full app pipeline remains Phase04. |
| triggers | Reward/streak writes and media guards survive client revokes. | Actual hosted Auth and worker context. |
| contextual identity | Bounded leaderboard, own rank, real-comment author projection and null author work; deleted/no-account caller fails closed. | Hosted RPC exposure, schema cache, INSERT-returning embed and app runtime. |
| internal/service | Direct client EXECUTE refused on exact helpers; required RPC/service grants retained. | Actual deployed workers and event delivery. |
| Storage admin | Policy points at private helper in local catalog. | Hosted policy DDL and Storage API behavior. |

Local Auth, Storage and webhook bootstrap stubs and local bootstrap superuser capabilities remain. Local success cannot prove hosted DDL authority or deployment behavior. The expected missing-vault-secret warning only skips the local webhook stub; no real secret was read and no webhook was sent.

local-catalog-delta.json and the full replay preserve exact before/after/restored/reapplied catalogs. The before/restored hash is 4e6ccf5fc982d4880ae14cc12ad6ac9bdf8df018de436ff2abffcf4f03a2716b. The after/reapplied hash is 2a23c1dd9b70c175e29d379ce7d28cb190c53b6d6ed44ad1437a75d454ccd7b7.

## Fresh remote truth

The read-only production catalog at 2026-09-05T06:26:04.808Z matches the earlier preflight capture in all comparator-v3 sections: 71 migration versions, 47 policies, 25 triggers, 28 functions, 434 table grants and 49 function grants. This is pre-apply metadata, not candidate deployment proof. No application rows, credentials or raw function/policy bodies were collected. The unchanged query and exact comparison are linked in production-comparison-resume.json.

Read-only role metadata confirms hosted postgres is a nonsuperuser and cannot act as supabase_admin. The candidate changes only postgres-owned defaults; [PostgreSQL default-privilege ownership rules](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html) leave the managed defaults unresolved. Fresh global-default metadata shows no explicit postgres global override and effective PUBLIC EXECUTE true, supporting exact restoration.

Storage ownership is not an unresolved blocker. A boolean capability query verified supautils.policy_grants allows postgres policy DDL on storage.objects, consistent with [Supabase's documented ownership bypass](https://github.com/supabase/supautils#table-ownership-bypass). No hosted policy mutation was attempted; staging must verify it.

Guest flags and feedback currently use the direct Data API. The queried role/database settings contain no db_pre_request entry; that limited absence does not establish that no external gateway exists. Existing deployed function metadata does not prove an anonymous ingestion limiter. [Data API protection](https://supabase.com/docs/guides/api/securing-your-api) and [Edge rate-limit examples](https://supabase.com/docs/guides/functions/examples/rate-limiting) require configuration/deployment and a trusted ingestion path. External-store examples introduce infrastructure.

Raw-IP application storage violates the chosen policy. Hashing a shared IP alone cannot ensure independent clients behind one NAT. Untrusted client headers are spoofable; issued temporary client sessions need an issuance-abuse and retention design. No identifier, IP, fingerprint or counter was implemented, stored, logged or exposed. No gateway/Auth/config change occurred. Existing globals remain emergency caps; primary per-client control remains absent.

## DECISIONS FOR SKY

| ID | Decision | Recommendation and reason | Alternative and impact |
|---|---|---|---|
| B03A-R01 | Supply the actual separate non-production project ref. | Name the intended disposable project. The supplied literal placeholder cannot be positively verified. Conditional staging authority can operate only on an actual verified target after complete code acceptance. | Leave unset; hosted staging and later lanes stay blocked. No production, unrelated-project or paid-project substitution. |
| B03A-R02 | Permit necessary gateway dependency and guest-ingestion scope, or hold FDA-028. | Authorize bounded staging gateway design covering guest flag/feedback routing and direct-API bypass prevention, including necessary configuration/infrastructure evaluation. Require the exact trusted short-lived key, issuance-abuse defense, retention, thresholds and same-network two-client proof before concrete remote approval. This scope decision is not a purchase, deployment or privacy-tradeoff approval. | Preserve existing paths/caps; FDA-028 and full 03A-CODE stay blocked. Durable tracking or weakened independence needs separate explicit policy change. |
| B03A-R03 | Resolve supabase_admin-owned default grants. | Obtain a supported platform/owner mechanism, or explicitly adjudicate the managed residual. The current execution role cannot change it. No privilege escalation or external support send is authorized here. | Retain partial candidate and FDA-012 OPEN. An explicit waiver would be an owner disposition, not technical repair. |

These stops come from owner Decision 1, Decision 3 and the phase's privilege/acceptance stop conditions. No skill invented a new approval flow. A production token is not requested prematurely: complete CODE, INT and STAGE acceptance do not exist.

## Independent acceptance, lanes and preservation

The caller implementation agent 03a_code_dependency_review is not its own acceptor. The independent reviewer 03a_predecessor_review authored no candidate source. Its final report and separately executed logs are archived in this evidence directory. Its local-subset verdict does not represent Steve/Dana human signatures, hosted acceptance or overall phase acceptance.

Final independent verdict: PARTIAL LOCAL SUBSET PASS; complete 03A-CODE HOLD, INT/STAGE HOLD, PROD NOT AUTHORIZED, no finding closure. Exact source, corrected fixture, unchanged app/migration hashes, 138 real assertions and clean before/after identity are bound in independent-final-review-6a82b82.json (SHA-256 993d4759a7731f8090729b7d91d6aec41089d8b76e82ec4225d86dc6ca0381f1).

| Internal task | Disposition |
|---|---|
| 03A-CODE | Partial implementation and proof; HOLD for FDA-012 and FDA-028. |
| INT | NOT RUN / BLOCKED. Canonical worktree remains at 5a64c9174ae5d9d5a94ed543bc4663216df67e7f; no unaccepted source integrated. |
| 03A-STAGE | NOT RUN / BLOCKED. Missing target and complete code acceptance; no hosted test/install/apply/rehearsal. |
| 03A-PROD | Read-only preflight only; no token, mutation or acceptance. |
| Phase03B | NOT STARTED; no accepted handoff. |

After decisions: finish outstanding implementation, freeze and independently accept the complete code, integrate one accepted SHA, then stage exact artifacts. Actual hosted pgTAP, role REST/RPC, two-client isolation/spoof/shared-network tests, restoration/reapply and sanitized catalog proof remain required. Then stop for the phase/project/source/migration/rollback-bound production token.

All six paired restorations recreate captured weaknesses and are marked UNSAFE_BASELINE_RESTORE. They were rehearsed only locally in reverse order. They are not production rollback authority and do not use Phase02's separate unsafe restoration files. source-artifact-hashes.json and candidate-contract.json provide exact ordered forward/rollback names and full hashes.

All 40 pre-existing worktree HEAD/branch/status metadata records remain unchanged, including one still-missing registered scratch path; 41 are registered including this lane. Main and local origin/main remain 70b52a30e9fff0f7d538509b110212bb8d872391, divergence 0/0. The accepted predecessor remains an ancestor. Applied migration sources, five accepted candidates, original QA, package/lock and generated SQL remain unchanged. Other worktree checks are metadata checks, not rehashes of unrelated dirty contents.

There was no clean, stash, reset, prune, branch deletion, push, merge, deployment, production mutation, paid build or external send. App Store review is protected by no action; live status was not inspected. No new visual/VoiceOver/runtime acceptance, accessibility certification, release readiness or deployed privacy claim is made.

## Evidence

All paths below are under qa-reports/phase03a/2026-09-04-resume:

- source-artifact-hashes.json: all 31 source paths and hashes, six migration/restoration pairs, proof inputs and package hashes.
- independent acceptance report and replay receipts: exact clean commit, genuine TAP, restoration, reapply and reviewer limits.
- test-summary.json, final-typecheck.json, final-lint.json, final-small-gates.json: actual commands/results, inherited failures and warnings.
- local-proof-history.json and local-catalog-delta.json: preserved failed attempts, corrections and explicit grant/policy deltas.
- production-comparison-resume.json and capability captures: read-only current truth, target and query provenance.
- preservation-check-resume.json: other worktrees, accepted artifacts and historical receipt prefix.


## Source files in the final candidate

- `scripts/__tests__/phase03aReplay.test.ts`
- `scripts/replay-migrations.mjs`
- `scripts/replay-phase03a.mjs`
- `src/lib/__tests__/admin.test.tsx`
- `src/lib/__tests__/comments.test.ts`
- `src/lib/__tests__/flags.supabase.test.ts`
- `src/lib/admin.ts`
- `src/lib/comments.ts`
- `src/lib/flags.ts`
- `src/screens/LeaderboardScreen.tsx`
- `src/screens/__tests__/LeaderboardScreen.monogram.test.tsx`
- `src/types/database.ts`
- `supabase/contract/client-expectations.v1.json`
- `supabase/migrations-next/phase03a/20260905055629_phase03a_flag_policies.sql`
- `supabase/migrations-next/phase03a/20260905055630_phase03a_open_inserts.sql`
- `supabase/migrations-next/phase03a/20260905055632_phase03a_profile_updates.sql`
- `supabase/migrations-next/phase03a/20260905055633_phase03a_contextual_profiles.sql`
- `supabase/migrations-next/phase03a/20260905055635_phase03a_trigger_execute.sql`
- `supabase/migrations-next/phase03a/20260905055636_phase03a_client_privileges.sql`
- `supabase/migrations-next/phase03a/README.md`
- `supabase/migrations-next/phase03a/candidate-contract.json`
- `supabase/migrations-next/phase03a/catalog.sql`
- `supabase/migrations-next/phase03a/rollback/20260905055629_phase03a_flag_policies.rollback.sql`
- `supabase/migrations-next/phase03a/rollback/20260905055630_phase03a_open_inserts.rollback.sql`
- `supabase/migrations-next/phase03a/rollback/20260905055632_phase03a_profile_updates.rollback.sql`
- `supabase/migrations-next/phase03a/rollback/20260905055633_phase03a_contextual_profiles.rollback.sql`
- `supabase/migrations-next/phase03a/rollback/20260905055635_phase03a_trigger_execute.rollback.sql`
- `supabase/migrations-next/phase03a/rollback/20260905055636_phase03a_client_privileges.rollback.sql`
- `supabase/schema.generated.stamp.json`
- `supabase/tests/phase03a-fixtures/baseline-extra.sql`
- `supabase/tests/phase03a-foundation.test.sql`
