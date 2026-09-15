# Flagstone Phase 03A — independent production acceptance

```text
FROZEN_EVIDENCE_COMMIT: 17dfe0c076817ac519ab0afea0962192b7499b22
FROZEN_EVIDENCE_TREE: 56807dc4cff6b1617906c024e25a3f2731a506e5
AUTHORIZED_REPAIR_SOURCE: 22e1db5aa7e58d7129551cb1325f921b37f95105
AUTHORIZED_REPAIR_TREE: 657f1b6ce01d3fdbb27102b5aa33616c918feade
AUTHORIZED_DRY_RUN_EVIDENCE_COMMIT: c9c3ece64d30bc6154521bc3c8d9812754fa673b
AUTHORIZED_DRY_RUN_EVIDENCE_TREE: 1a10dea5debd950036eaa618c3a9c362afdbc663
TARGET_PROJECT: kldlwszpfkdmsjrjhjym

PRODUCTION_APPLY: PASS
AUTHORIZED_MIGRATIONS: 14
ACTUAL_APPLIED_MIGRATIONS: 14
PRODUCTION_LEDGER_COUNT_BEFORE: 71
PRODUCTION_LEDGER_COUNT_AFTER: 85
CANONICAL_PRODUCTION_LEDGER: PASS
PRODUCTION_STRUCTURAL_DELTA: PASS
MF03_SECRET_PREREQUISITE: SATISFIED
MF04_ENDPOINT_PREREQUISITE: SATISFIED
MF05_ROLLOUT_STATE: S3_LIMITER_PRESENT_BYPASS_OPEN
PRODUCTION_POLICY: PASS
BUILD33_PRODUCTION_COMPATIBILITY: PASS
FDA028_PRODUCTION_CONTRACT: PASS
STAGE_B_INCLUDED: NO
PRODUCTION_FORWARD_RECOVERY: READY
CREDENTIAL_GATE: PASS
INDEPENDENT_PRODUCTION_REVIEW: PASS
PHASE_03A_PRODUCTION_GATE: PASS
PUSHES: NONE_RECORDED
MAIN_MERGES: NONE
DEPLOYS: NONE_RECORDED
PHASE_03B_STARTED: NO
MAIN_MERGE_AUTHORIZED: NO
```

## Verdict

**PASS.** The frozen evidence supports the exact owner-authorized Phase 03A Stage A production apply and its read-only verification. The canonical ledger contains the 14 authorized migrations exactly once and no other new row; the captured production structure matches the independently accepted fresh-stage Stage A structure after the documented production-only backup objects are removed; prerequisite, policy, Build 33, FDA-028, cleanup, and local-gate evidence pass within their stated scopes.

This verdict does not authorize another production mutation, recovery execution, Stage B, Phase 03B, push, merge, deployment, or release.

## Frozen identity, authorization, and artifact integrity

- Git resolves the reviewed branch to the exact frozen commit/tree above. The repair commit and dry-run evidence commit both exist and resolve to the exact authorized trees. The repair is an ancestor of the frozen evidence, with no intervening change under `supabase`, `scripts`, or `src`.
- The owner prompt `FLAGSTONE-P03A-PRODUCTION-APPLY-VERIFY-20260914-R1` explicitly authorizes only the target-explicit Stage A database apply to `kldlwszpfkdmsjrjhjym`, from the exact repair and accepted dry-run identities, using the exact 14 versions/hashes and `--skip-vault`. It excludes Stage B, recovery, seeds, roles, Vault sync, ad hoc SQL, function/webhook invocation, production test traffic, push, merge, deployment, release, and Phase 03B.
- At the frozen commit, `ARTIFACT_SHA256_PRE_REVIEW.txt` has 72 unique entries. The directory has exactly those 72 artifacts apart from the manifest itself: zero missing entries, zero unlisted frozen artifacts, and zero hash mismatches. The manifest SHA-256 is `a7d73cabd125cf44290ea56319fa37574e88766f3dd97ae0cdf31976db0c5567`.

## Exact apply and migration identity

The prepared, running, validation, and applied-not-verified envelopes contain the same eight-token apply argv:

```text
supabase db push --workdir <guarded-isolated-workspace> --project-ref kldlwszpfkdmsjrjhjym --skip-vault
```

It has one explicit project ref and one `--skip-vault`, with no `--dry-run`, `--linked`, `--local`, `--db-url`, seed, role, recovery, or Stage B selector. The retained lineage contains one RUNNING checkpoint followed by one complete apply receipt; no retry or outcome-unknown state is recorded.

The apply exited `0`. Structured stdout reports `dryRun: false`, `upToDate: false`, a finished message, empty seed and role arrays, and exactly these files in the authorized order. Stderr lists the same 14 apply steps once. Each SHA-256 independently matches the current file bytes at the exact repair identity:

| Order | Version and file | SHA-256 |
|---:|---|---|
| 1 | `20260904000000_adopt_private_admin_helper.sql` | `1d504c3ad05c0b31052715406059071301a51f4359ef35ce85c92cb61202fbf7` |
| 2 | `20260904000100_drop_duplicate_status_triggers.sql` | `9771e7c5df363b139e8bcd9e9f9e58b15e6c2f59eebb4523a330a774fc18db49` |
| 3 | `20260904000200_adopt_d1sa_containment.sql` | `fbc986296aee71109639ad833d4c75422c28bbefa4fddfefe51f29eeaf03dfb6` |
| 4 | `20260904000300_adopt_live_insert_throttles.sql` | `b346b2c7775543c9a268098c0956812b7ad9a9ddf49680202fe846073d4ef776` |
| 5 | `20260904000400_adopt_execute_revokes.sql` | `e8a3d880d361e5d6be96c8b30709a9b1b3d8a8d94e6d23175342db41bb20cf13` |
| 6 | `20260905055629_phase03a_flag_policies.sql` | `c8f4d419b01a624905c46bd168974d494d82af3a6960049c212d24e8fa07fcaa` |
| 7 | `20260905055630_phase03a_open_inserts.sql` | `c6410a61cb195b6d6d70f0d33139064dd191a9cb193534b7f36dc33e25e90071` |
| 8 | `20260905055632_phase03a_profile_updates.sql` | `ef24f6b44bcb7cdc7a2e89fe4a886a0d6a0688cf0a416564bde74b5d4c217187` |
| 9 | `20260905055633_phase03a_contextual_profiles.sql` | `526d2c47f3c6edb6c3cffff94b8bec4f3c9e4c3602a30a5e4059b14261d86bf9` |
| 10 | `20260905055635_phase03a_trigger_execute.sql` | `ca95d25a3219e541db555d5d8693e7240c7a927617c7a5969ee55cffa68074f9` |
| 11 | `20260905055636_phase03a_client_privileges.sql` | `44e405bd9bc7b8c2cccb816825f57d43d617a83bdf38d7f0b4d58205cf997063` |
| 12 | `20260905073925_phase03a_effective_privileges.sql` | `17970173cb28f29297a931751e9e8ca62c74366f1b83ab5cd36e536049562c20` |
| 13 | `20260909120000_fda028_v4_limiter.sql` | `8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771` |
| 14 | `20260911120000_phase03a_webhook_target_env_scoped.sql` | `9165f87e3571325fc847de5b08ca33aa9266e8786cee613be0cf61a06f4fbf6b` |

Stage B version `20260911130000`, all recovery versions, wall-clock substitutes, phantom/unauthorized versions, seeds, and roles are absent. The guarded workspace is now absent, its destruction receipt is exit `0`, and the isolated apply worktree is absent while its provenance branch remains at the exact repair SHA/tree.

## Canonical production ledger

- The retained pre-ledger has 71 canonically ordered, unique version/name rows. Recomputing SHA-256 over the ordered `version<TAB>name<LF>` stream yields `8fd1da6ea324d6b458951a41970d729e1e879b09b502b68f16ba22b09bb9dc9b`.
- The retained post-ledger has 85 canonically ordered, unique version/name rows. Its first 71 rows equal the complete pre-ledger byte-for-structured-byte. Its final 14 rows equal the authorized migration version/name sequence exactly.
- The post-ledger equals `PRODUCTION_EXPECTED_POST_LEDGER.json` exactly. Its independently recomputed ordered digest is `811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec`.

This establishes `71 -> 85`, exact-once application, and no ledgerless, duplicate, recovery, Stage B, phantom, or unauthorized migration within the retained ledger.

## Structural reconciliation and Build 33

- The immediate pre-apply comparator-v3 catalog exactly equals the independently reviewed production dry-run catalog. Both are target-explicit, read-only captures with no application-row payload.
- The post-apply full structural capture covers `public`, `private`, `storage`, and `limiter`, including relation/column/schema/default ACLs, functions and bodies, policies, roles and membership options, triggers, defaults, RLS/force-RLS, owners, and security-definer/search-path surfaces. Its compact catalog checksum independently recomputes to `32df23c33f37e4cdc54a2b2eb26b0d4901869c5ce1735688dbdc76938075a3ac`.
- Removing only the seven named, inherited production backup relations prefixed `bk_2026_08_22_` and their 48 columns makes the complete captured production catalog exactly equal to the independently accepted fresh-stage Stage A catalog. Every other collection is already exactly equal. No stage-only structural item remains.
- Production metadata confirms the four required public/private Build 33 compatibility functions, authenticated EXECUTE on their accepted wrappers and private functions, authenticated direct column SELECT on `public.users.is_admin`, the Stage A anonymous read contracts, and the accepted protected-field/grant posture.

`BUILD33_PRODUCTION_COMPATIBILITY: PASS` is deliberately bounded to production structure/privilege evidence plus reuse of the accepted fresh-stage role-context behavior, including the banked 37/37 Build 33 suite and 254/254 composed pgTAP result. No Build 33 function or production application row was invoked during production verification.

## MF-03, MF-04, MF-05, and approved policy

- The post-apply read-only verifier reports exactly one MF-03 row with valid non-empty 32-byte decoded shape and exactly one MF-04 `webhook_endpoint` row with valid non-empty HTTPS shape. It returns neither secret nor endpoint values. These shapes equal the immediate pre-apply reconciliation.
- The environment-scoped webhook function references the required endpoint and secret names; client EXECUTE remains revoked. The broad `contains_https_literal` regex reports a match because it sees explanatory/validation text, so its `webhook_hardcoded_url_absent` derivative is false. Exact full-function structural equality with the accepted fresh stage resolves that known false positive and shows the accepted environment-scoped definition is installed.
- The captured limiter configuration is exactly: `normal_allowance=5`, `bucket_allowance=50`, `window_seconds=86400`, `ipv4_prefix=32`, `ipv6_prefix=64`, `retention_windows=1`, `reseed_interval=7`, `catchup_cap=32`.
- The limiter schema is present while Stage B is absent. Legacy guest paths therefore remain available. The supported rollout claim remains exactly `S3_LIMITER_PRESENT_BYPASS_OPEN`; this PASS does not claim that every guest request is rate-limited and does not authorize a forced upgrade or cutover.

## FDA-028 production contract and no test traffic

The sanitized production catalog contains the accepted five limiter relations, all 20 exact function signatures, and the enabled `guard_window_domain` trigger. Schema and function grants are exact: `anon` and `authenticated` have no limiter schema use or function EXECUTE; `service_role` has schema use and EXECUTE only on the three clockless entry points `admit_guest_flag`, `admit_guest_feedback`, and `purge`. Limiter table access remains owner-only.

`dev_key_material` and helper/test residue are absent. The limiter bucket and grant relations contain zero rows, production aggregate counts are unchanged, queued HTTP remains zero, and the evidence records no limiter function invocation, webhook invocation, recovery action, or synthetic production traffic. Exact full-catalog equality with the accepted fresh stage binds the production definitions and grants to the implementation that already passed the independent hosted behavior, concurrency, Vault, lifecycle, and cleanup reviews.

This no-invocation conclusion is a bounded receipt claim corroborated by the zero spend rows, unchanged aggregate counts, and empty queue. The evidence is not an exhaustive production access-log or control-plane audit.

## Production forward recovery

All 24 prepared forward-recovery artifacts independently match their recorded SHA-256 hashes, use 24 unique versions absent from the post-production ledger, preserve reverse dependency order for the 12 restoration files, and preserve original dependency order for the 12 reapplication files. The two non-restorable security crossings remain explicit refusals: they must use a newly reviewed forward correction or application containment and must never recreate the retired credential/grant or hardcoded-endpoint baseline.

`PRODUCTION_FORWARD_RECOVERY: READY` means the reviewed artifacts remain available if a separately adjudicated failure later requires them. Recovery was not executed and is not authorized by this review.

## Local and credential gates

The frozen receipts and recomputed hashes show exit `0` for typecheck, lint, contract check, schema snapshot, canonical plan/verify, rollback/forward-recovery verification, release verification, FDA-028 hosted-harness unit tests, 11 focused guard suites, the credential guard, and `git diff --check`. Focused guards passed 234/234; FDA-028 harness unit tests passed 20/20; the credential guard passed 10/10. An independent rerun of the credential guard at the frozen commit also passed 10/10 without hosted contact.

Lint completed with zero errors and 91 existing warnings. The release verifier passed its local identity checks while explicitly skipping its optional live remote check; it records main release-code convergence as deferred. No source change exists after the authorized repair, so these warnings and release notes are not production-apply regressions.

## Evidence limitations assessed

1. **Immediate pre-apply aggregates:** The immediate read-only aggregate values were observed and post-apply values match them exactly. The original immediate pre-aggregate raw wrapper was not retained, so the timing/provenance of that one observation is not independently hash-verifiable. The same values appear in two earlier retained read-only production captures and in the post-apply raw verifier; exact pre-ledger and full pre-catalog artifacts are retained. This limits the aggregate receipt but does not weaken the exact ledger or structural acceptance.
2. **Initial verifier `22P02`:** The first post-apply verifier selected a function digest using a direct text-to-`bytea` cast and failed with `22P02` when the FDA-028 definition contained a regular-expression backslash. The original query is retained and begins `BEGIN TRANSACTION READ ONLY`; it contains only reads before its transaction-ending `COMMIT`. The corrected retained query changes the digest input to `convert_to(..., 'UTF8')` and makes the Vault shape checks evaluation-safe, also under `BEGIN TRANSACTION READ ONLY`. Its raw successful capture reports `transaction_read_only=on`. The failed error wrapper itself is not retained, so the exact runtime error is supported by the banked limitation reports and the reproducible faulty expression rather than a raw error artifact. Both query shapes preclude a production write, and the corrected ledger/catalog reconciliation confirms the installed state.
3. **Comparator scope:** Structural PASS applies to the four captured schemas and the documented surfaces. Object identifiers and planner statistics are intentionally excluded; objects outside those schemas remain outside the proof.
4. **Remote Git/deploy negatives:** The evidence state records no push, merge, or deployment. There are no merge commits in the repair-to-freeze range, the review branch has no upstream, and no deployment action or artifact appears in the apply lineage. Because this review was prohibited from contacting remotes, it does not claim an independent global remote audit. This review itself performed no push, merge, deploy, or hosted operation.

None of these limitations changes the production acceptance verdict.

## Independent verification performed

```text
exact commit/tree/source/dry-run Git-object and ancestry checks
complete 72-entry artifact-manifest census and SHA-256 recomputation
exact argv and write-ahead state comparison across plan/prepared/running/receipt envelopes
exact current-byte SHA-256 verification for all 14 authorized migrations
independent 71-row and 85-row ledger digest recomputation and full expected-ledger comparison
deep comparator-v3 pre-state equality with accepted dry-run evidence
independent full structural-catalog checksum and normalized fresh-stage equality comparison
raw contract derivation for policy, prerequisites, Build 33 privileges, FDA-028 signatures/grants/trigger/residue
24-artifact forward-recovery SHA/version/order verification against the post ledger
workspace and isolated-worktree absence checks
local merge/upstream inspection
npm test -- --runInBand src/__tests__/noCredentialsInTree.guard.test.ts
```

No hosted target was contacted and no Supabase command was run during this independent review.

## DECISIONS FOR SKY

The Phase 03A production gate may be recorded PASS. Formal Phase 03A closure and any main-merge authorization packet are separate follow-up artifacts. No main merge, push, Stage B, Phase 03B, recovery, deployment, or further production action is authorized here.
