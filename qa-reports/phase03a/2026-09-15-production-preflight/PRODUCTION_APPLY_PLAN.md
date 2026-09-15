# Phase 03A production apply plan — prepared, never executed

```text
PLAN_STATUS: HOLD
TARGET: kldlwszpfkdmsjrjhjym
PRODUCTION_AUTHORITY: NONE
REMOTE_DRY_RUN: NOT_RUN
STAGE_B_INCLUDED: NO
```

This is a target-bound planning artifact. It is not an authorization token or an executable command.

## Bound source and production state

| Item | Exact identity |
|---|---|
| Accepted release source | `9a0af4c88b5b00898e405992cfd44ba7dfd689fc` |
| Accepted release tree | `4e9d6aefc16cb8bce877dc6e0097b61ade8e22c5` |
| Current source | `949c11093922d0b7d7b8665eda84dfde710f0d1c` |
| Current tree | `a8ee59aac0e86239370aa55e14d897bed39c1a65` |
| Production ledger | 71 rows; latest `20260830130000`; ordered SHA-256 `8fd1da6ea324d6b458951a41970d729e1e879b09b502b68f16ba22b09bb9dc9b` |
| Production comparator | canonical `2c0bacf76c71924ffd8543852dc830f593058b8cb67a1016871f55908dae0443`; structural `1c4cdbc441d3747f56109955c7b31840720d4cd09373572d961e9638fcc255c8` |

The accepted release commit is an ancestor of the current source. Every candidate byte at the accepted release commit matches the manifest hash below. The fresh production comparator is exactly equal to the accepted Phase 02 pre-apply production contract; `PRODUCTION_DRIFT.diff` is empty. This exact structural equality and the absent canonical ledger versions establish the 14-file pending set.

## Exact Stage A set and order

| # | Version and file | SHA-256 |
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

The exact machine-readable plan is `PENDING_MIGRATION_PLAN.json`. The accepted workspace builder retained 71 baseline files, bound all five adoption files and all nine Stage A candidates, and reported exactly 14 `wouldPush` entries. It created and safely destroyed its marked temporary workspace without contacting a hosted project.

`20260911130000_phase03a_fda026_stage_b_cutover.sql` (`a21c56b588b958a261766257482a08ceefb8857dc8d9e7c11b180c7584d8b963`) is explicitly excluded.

## Required operation order for a later authorization

1. Resolve both source prerequisites below and independently review their exact patches and tests.
2. Recheck the repository, accepted release ancestry, all 14 hashes, production project identity, full ledger, comparator-v3 catalog, target selectors, and unused recovery versions.
3. Sky provisions MF-04 `webhook_endpoint` through an owner-controlled secure interface. A read-only check may return only exactly-one-row and HTTPS-shape booleans.
4. Sky provisions a unique production-only MF-03 `fda028_limiter_epoch_key` as 64 hexadecimal characters, which decodes to 32 bytes. A read-only check may return only exactly-one-row and 64-hex/32-byte booleans.
5. Sky records the MF-05 bypass decision and approves exact production policy and activation values. If `enabled=false` is selected, the later mutation token must include the exact config step after migration 13 and before any limiter-backed ingest activation.
6. Run the repaired, target-explicit production **dry-run only** through the isolated apply workspace, with the exact production ref, `--dry-run`, and `--skip-vault`. Review that its pending set is exactly these 14 entries once each and excludes Stage B and all recovery files.
7. Bank a new `PREPARED` operation checkpoint. A later apply requires a separate owner token naming the target, source identity, 14 hashes, prerequisites, policy, recovery disposition, verification gates, and mutation window.
8. If separately authorized, execute one bounded canonical `db push` from the frozen isolated workspace. Record `RUNNING` before the request and `APPLIED_NOT_VERIFIED` after a confirmed response. Any timeout or uncertain response becomes `OUTCOME_UNKNOWN`; do not retry until read-only reconciliation.
9. Run `POST_APPLY_VERIFICATION_PLAN.md`. No client deployment, Stage B, notification probe, synthetic production write, or recovery action is implied.

## Current tool findings and narrow source repair

The accepted local planner returns `ok=true` for nine Phase 03A entries but omits the five declared Phase 02 adoption entries. The accepted workspace builder catches the real operation shape and reports 14 `wouldPush` files. Its command builder then exits 2 for the production ref because the CLI entry point always uses `expectStaging=true`. This guard must not be bypassed.

The smallest source repair is:

1. Add a distinct production **plan/dry-run** mode to `scripts/canonical-apply-workspace.mjs`; keep production apply unavailable by default.
2. Require an exact production ref, accepted release SHA/tree, and a 14-entry manifest digest before materialization.
3. Make plan output authoritative over every `wouldPush` file, including the five adoption entries; fail if `plan` and `wouldPush` differ.
4. Emit argv for `supabase db push --workdir <marked-temp-workspace> --project-ref kldlwszpfkdmsjrjhjym --dry-run --skip-vault`. Permit neither `--linked`, `--db-url`, `--local`, nor `--apply` in this mode.
5. Add negative tests for wrong target, missing release identity, omitted adoption entries, Stage B inclusion, recovery-file inclusion, missing `--skip-vault`, any apply flag, target whitespace, and selector ambiguity.
6. Obtain a separate independent patch review before running the production dry-run.

## Stop conditions

Stop before mutation on any target mismatch, selector ambiguity, source/hash drift, ledger or catalog drift, missing/invalid MF-03 or MF-04 shape, incomplete policy decision, unresolved credential gate, unreviewed recovery limitation, unexpected version, Stage B presence, Vault side effect, authentication initialization write, or uncertain response.

```text
PRODUCTION_APPLY_EXECUTED: NO
PRODUCTION_MUTATIONS: NONE
STAGING_MUTATIONS: NONE
```
