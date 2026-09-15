# Phase 03A new production authorization packet

**Generated:** 2026-09-15 after independent fresh-stage acceptance

```text
PACKET_STATUS: READY_FOR_OWNER_DECISION
PRODUCTION_AUTHORIZED: NO
PRODUCTION_MUTATIONS: NONE
```

This packet is a concrete request for a separate owner decision. It does not authorize or execute a production database, Vault, config, Edge Function, client, deploy, Git, TestFlight, or App Store operation.

## 1. Proposed target and exact accepted identities

```text
production project ref: kldlwszpfkdmsjrjhjym
accepted CODE SHA: 3ac416e2cd19c7322061efb689abc5bebcef3a83
accepted CODE tree: 99ee18fbeb72e0f31d501f749df920d30ea907de
accepted INT SHA: f2c2fbef36e88289c9c2a0663e6f26fc974e0a2a
accepted INT tree: 96d8e38b37e881fa1f4d6e39cf5e276e1f51b833
accepted frozen integration SHA: 9a0af4c88b5b00898e405992cfd44ba7dfd689fc
accepted frozen integration tree: 4e9d6aefc16cb8bce877dc6e0097b61ade8e22c5
FDA-028 harness SHA: 2a353336d442c5bb79579a2b0154d08aa43806c1
FDA-028 harness tree: 472559b72421ee1b4f2a7ce12ebe21867c8a0c0d
hosted evidence checkpoint: f4ef1e1f2a4e6220caff1d379d07b4a6f93b3ed3
independent hosted review commit: 7cd0c69a218cd22f947c2106677e8d0ed9a87297
```

The production implementation proposal is the accepted frozen integration and the exact migration hashes below. The later harness commits add test and evidence artifacts; they do not change the accepted limiter migration or rollback bytes.

## 2. Fresh-stage gate now satisfied

```text
fresh project: cepayqmsoqxshsiyqnvz
fresh branch: 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
fresh ledger: 103 rows; latest 20260913080000
ordered ledger sha256: 9c7301f4e0880905a84b1e27a9360afc229034042506d1b651700643fc0c8316
canonical migration identity: PASS
forward ledger truth: PASS
round-trip structural identity: PASS
Build 33 authenticated compatibility: PASS
Build 33 anon compatibility: PASS
composed hosted pgTAP: 254/254 PASS
FDA-028 committed hosted proof: 31/31 PASS
FDA-028 negative control: PASS
FDA-028 cleanup: PASS
FDA-028 25-way concurrency: PASS, 10 admitted at allowance 10, no overshoot, 0 orphans
independent stage review: PASS
other stage blockers: none
```

## 3. Canonical candidate order

Production applicability must be determined from a new read-only production ledger/catalog preflight. A candidate already present under its canonical version must not be reapplied. Any unexplained ledger or catalog drift is a STOP.

If the five Phase 02 adoption files remain required, their fixed order is:

| # | File | SHA-256 |
|---:|---|---|
| 1 | `supabase/migrations-next/20260904000000_adopt_private_admin_helper.sql` | `1d504c3ad05c0b31052715406059071301a51f4359ef35ce85c92cb61202fbf7` |
| 2 | `supabase/migrations-next/20260904000100_drop_duplicate_status_triggers.sql` | `9771e7c5df363b139e8bcd9e9f9e58b15e6c2f59eebb4523a330a774fc18db49` |
| 3 | `supabase/migrations-next/20260904000200_adopt_d1sa_containment.sql` | `fbc986296aee71109639ad833d4c75422c28bbefa4fddfefe51f29eeaf03dfb6` |
| 4 | `supabase/migrations-next/20260904000300_adopt_live_insert_throttles.sql` | `b346b2c7775543c9a268098c0956812b7ad9a9ddf49680202fe846073d4ef776` |
| 5 | `supabase/migrations-next/20260904000400_adopt_execute_revokes.sql` | `e8a3d880d361e5d6be96c8b30709a9b1b3d8a8d94e6d23175342db41bb20cf13` |

The accepted Phase 03A Stage A plan is exactly nine candidates:

| # | File under `supabase/migrations-next/phase03a/` | SHA-256 |
|---:|---|---|
| 1 | `20260905055629_phase03a_flag_policies.sql` | `c8f4d419b01a624905c46bd168974d494d82af3a6960049c212d24e8fa07fcaa` |
| 2 | `20260905055630_phase03a_open_inserts.sql` | `c6410a61cb195b6d6d70f0d33139064dd191a9cb193534b7f36dc33e25e90071` |
| 3 | `20260905055632_phase03a_profile_updates.sql` | `ef24f6b44bcb7cdc7a2e89fe4a886a0d6a0688cf0a416564bde74b5d4c217187` |
| 4 | `20260905055633_phase03a_contextual_profiles.sql` | `526d2c47f3c6edb6c3cffff94b8bec4f3c9e4c3602a30a5e4059b14261d86bf9` |
| 5 | `20260905055635_phase03a_trigger_execute.sql` | `ca95d25a3219e541db555d5d8693e7240c7a927617c7a5969ee55cffa68074f9` |
| 6 | `20260905055636_phase03a_client_privileges.sql` | `44e405bd9bc7b8c2cccb816825f57d43d617a83bdf38d7f0b4d58205cf997063` |
| 7 | `20260905073925_phase03a_effective_privileges.sql` | `17970173cb28f29297a931751e9e8ca62c74366f1b83ab5cd36e536049562c20` |
| 8 | `20260909120000_fda028_v4_limiter.sql` | `8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771` |
| 9 | `20260911120000_phase03a_webhook_target_env_scoped.sql` | `9165f87e3571325fc847de5b08ca33aa9266e8786cee613be0cf61a06f4fbf6b` |

`npm run db:apply:plan` currently returns these nine in canonical order with zero refusals and a clean local ledger audit. Production execution must use the supported canonical migration mechanism that records each applied file once under its own version. Manual `db query --file`, Management API SQL apply, wall-clock substitute versions, and direct ledger edits are prohibited.

Stage B remains withheld:

```text
20260911130000_phase03a_fda026_stage_b_cutover.sql
sha256: a21c56b588b958a261766257482a08ceefb8857dc8d9e7c11b180c7584d8b963
status: NOT IN THIS PRODUCTION PROPOSAL
```

## 4. Required production prerequisites and owner decisions

### MF-03 — production limiter Vault secret

Sky must separately provision a new production-only `fda028_limiter_epoch_key` using a secure owner-controlled path. The staging value must never be read, copied, printed, committed, or reused. The production preflight must prove exactly one row and a 32-byte decoded key without returning key material.

### MF-04 — production webhook endpoint

MF-04 is closed for stage and remains an open production prerequisite. A valid production `webhook_endpoint` configuration must exist before `20260911120000_phase03a_webhook_target_env_scoped.sql` becomes active. Without it, status notifications fail closed and silently stop. The endpoint value and any webhook secret remain owner-managed and must never enter this packet or receipts.

### MF-05 — guest bypass and coordinated cutover

Current rollout state is `S3_LIMITER_PRESENT_BYPASS_OPEN`. Stage A preserves Build 33 and pinned-web compatibility, so the tested limiter is present but legacy direct guest inserts remain possible. Sky must explicitly accept this posture for the Stage A production apply. Closing the bypass requires a coordinated native-client and pinned-web cutover plus separate Stage B authorization.

### Production thresholds

Production values remain `DEFERRED` for:

- `normal_allowance`
- `bucket_allowance`
- `window_seconds`
- `ipv4_prefix`
- `ipv6_prefix`
- `retention_windows`
- related operational `reseed_interval` and `catchup_cap`

The fresh-stage values `5 / 50 / 86400 / 32 / 64 / 1` are test evidence, not a production recommendation. Sky must supply or explicitly accept exact production values before any limiter activation.

### IPv6 claim boundary

`IPV6_NORMALIZATION: PASS`. `IPV6_TRANSPORT: OPEN`. The staging hostname published no AAAA record and no deployed guest-ingest function reads a trusted client address and calls the limiter. No end-to-end IPv6 ingestion claim is authorized.

### Credential guard

The broad credential guard remains `KNOWN_FALSE_POSITIVE`: it matches the identifiers `STAGE-MF-03`, `STAGE-MF-04`, and `STAGE-MF-05`. The false positive was not suppressed. The fresh-stage delta scan found zero real credential material. A red credential guard still needs a separate repair before it can reliably distinguish real secrets from these identifiers.

### Target safety

Current Git truth shows no tracked `supabase/.temp/project-ref` or `supabase/.temp/linked-project.json` in this checkout. The production workflow must still prohibit implicit targeting and require the exact production ref in every plan, preflight, apply, verify, and recovery step. Any persisted or newly tracked target selector is a STOP until independently reconciled.

## 5. Production preflight required before an apply decision

The owner-authorized production operation must begin read-only and bank a new checkpoint before any mutation:

1. Verify branch, HEAD, tree, clean worktree, exact candidate hashes, and accepted ancestry.
2. Verify the exact production project ref `kldlwszpfkdmsjrjhjym` through an explicit target token and database-side ledger/catalog identity.
3. Capture and retain full production ledger, structural catalog, relevant role/privilege state, config presence, Vault shape, webhook prerequisite shape, and application-row safety counts without reading credentials or application data.
4. Compare production against the expected pre-apply contract. The fresh branch began from a migration-derived baseline and does not prove production's complete existing anon grant posture; production-specific diff review is mandatory.
5. Generate the target-specific canonical dry-run plan. Confirm every planned candidate is required exactly once and Stage B is absent.
6. Bank `PREPARED`, then use write-ahead states `RUNNING` and `APPLIED_NOT_VERIFIED` around any later mutation. Any timeout or uncertain response becomes `OUTCOME_UNKNOWN` and stops retries until read-only reconciliation.

## 6. Verification required after a separately authorized apply

An apply is not accepted by command exit alone. Required production checks include:

- canonical ledger identity and exact versions;
- retained full post-apply structural capture and reviewed diff;
- Build 33 authenticated and anon compatibility in real role contexts;
- role and authorization matrix;
- FDA-012 payload narrowing and Stage B absence;
- FDA-028 function/role/Vault/config contract without exposing key material;
- MF-04 endpoint prerequisite and notification fail-closed behavior without sending a test notification;
- MF-05 still explicitly `S3_LIMITER_PRESENT_BYPASS_OPEN` unless a later cutover is separately authorized;
- no helper, synthetic row, limiter ledger, HTTP queue, or test residue;
- typecheck, lint, contract check, schema snapshot check, canonical plan/verify, rollback verification, release verification, workspace destruction guard, and corrected credential scan.

No production concurrency or synthetic insert test is authorized by this packet. Any production-data or privacy-sensitive validation requires a separate owner decision.

## 7. Forward recovery plan

Recovery is forward-only. Never delete or rewrite a production migration-ledger row.

The fresh-stage rehearsal generated nine later-version restoration migrations in reverse dependency order:

1. restore webhook target environment scope;
2. restore FDA-028 limiter;
3. restore effective privileges;
4. restore client privileges;
5. restore trigger execute posture;
6. restore contextual profiles;
7. restore profile updates;
8. restore open inserts;
9. restore flag policies.

It then generated nine still-later reapplication migrations in original candidate order. Ledger progression was `85 -> 94 -> 103`, zero ledger rows were deleted, and FIRST_APPLY matched REAPPLY_CLEAN exactly with zero structural residuals.

The staged files under `qa-reports/phase03a/2026-09-11-freshstage/forward-recovery/` prove the model but are not automatically authorized for production. Before production mutation, generate production-versioned forward recovery files from the exact accepted artifacts and unused production versions, verify their hashes and dependency order, review them independently, and include them in the owner token. The original rollback artifacts remain evidence inputs and must not be run as unledgered production scripts.

## 8. Exact owner authorization required

No agent may infer production authority from this packet. Sky's later authorization token must explicitly name:

1. the production project ref `kldlwszpfkdmsjrjhjym`;
2. the accepted CODE, INT, and frozen integration SHA/tree above;
3. the exact production preflight checkpoint and canonical target-specific apply plan;
4. every authorized candidate version and SHA-256, with Stage B excluded or separately decided;
5. completion of MF-03 and MF-04 through owner-controlled secret/config operations;
6. the MF-05 decision and accepted `S3_LIMITER_PRESENT_BYPASS_OPEN` impact;
7. exact production thresholds or an explicit choice to retain accepted defaults before activation;
8. the production-specific forward recovery files, versions, hashes, and trigger conditions;
9. retained pre/post structural captures and all mandatory verification gates;
10. the permitted mutation window and STOP/OUTCOME_UNKNOWN handling;
11. whether Codex may perform any production database step. Without an explicit yes, Codex authority remains none.

Push, main merge, deployment, client release, TestFlight, App Store, external sends, and Phase 03B require their own separate authority and are excluded.

## 9. Standing status

```text
NEW_PRODUCTION_AUTHORIZATION_PACKET: READY
PRODUCTION_AUTHORIZED: NO
PRODUCTION_MUTATIONS: NONE
PRODUCTION_VAULT_OR_CONFIG_ACTIONS: NONE
OLD_STAGING_MUTATIONS: NONE
PUSHES: NONE
MAIN_MERGES: NONE
PHASE_03B_STARTED: NO
NEXT_PERMITTED_PHASE: PHASE-03A ONLY
```
