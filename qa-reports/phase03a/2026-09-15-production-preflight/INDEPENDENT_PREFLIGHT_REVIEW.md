# Phase 03A independent production-preflight review

```text
PROMPT_ID: FLAGSTONE-P03A-PRODUCTION-PREFLIGHT-ONLY-R1
REVIEW_SCOPE: FROZEN_LOCAL_PACKET_ONLY
INDEPENDENT_PREFLIGHT_REVIEW: PASS
PRODUCTION_PREFLIGHT: HOLD
PRODUCTION_MUTATIONS: NONE
STAGING_MUTATIONS: NONE
```

## Verdict

The frozen packet accurately supports `PRODUCTION_PREFLIGHT: HOLD`. Its target, source, pending-operation, compatibility, prerequisite, policy, recovery, credential-gate, and authority boundaries are internally consistent and supported by the retained evidence. `INDEPENDENT_PREFLIGHT_REVIEW: PASS` accepts the packet's conservative HOLD; it does not approve a dry-run, provisioning step, database mutation, recovery operation, merge, or push.

No corrective edit to the frozen packet is required.

## Identity, integrity, and target safety

- Current source is `949c11093922d0b7d7b8665eda84dfde710f0d1c`, tree `a8ee59aac0e86239370aa55e14d897bed39c1a65`, on `codex/flagstone-p03a-takeover-20260914`.
- The proposed production implementation is the accepted frozen integration `9a0af4c88b5b00898e405992cfd44ba7dfd689fc`, tree `4e9d6aefc16cb8bce877dc6e0097b61ade8e22c5`. Git verifies the full reported CODE -> INT -> frozen integration -> harness -> R7 evidence -> independent review -> packet -> current-HEAD ancestor chain. Later executable changes are confined to the hosted FDA-028 harness/test surface and its package entry; the 14 proposed migration bytes remain bound to the accepted integration.
- `ARTIFACT_SHA256.txt` has exactly 52 entries and hashes to `e635285c5e9c1b930f00e9b6cf4941241b0efc81cfdb3b38dc38bfacd20950fc`. `shasum -a 256 -c` passed for all 52 retained artifacts. The four primary plans and both recovery manifests match the hashes frozen in `G03_PREFLIGHT_FROZEN.md`.
- All 14 proposed migration hashes and the excluded Stage B hash match their Git-object bytes at the accepted integration. All 12 source rollback hashes match that identity. The 24 generated recovery files match their manifest hashes and reconstruct the accepted rollback/source bodies under the documented generator normalization.
- The production target is explicitly `kldlwszpfkdmsjrjhjym` throughout the frozen artifacts. Exact tree inspection found neither `supabase/.temp/project-ref` nor `supabase/.temp/linked-project.json` tracked in the R7 review tree, packet tree, or current tree; neither selector exists in this worktree. The historical contrary sentence in the earlier R7 review is therefore superseded by the packet's exact-tree correction. The accepted command builders refused the production ref under staging-only mode, and the proposed repair continues to prohibit implicit, linked, database-URL, local, or apply selectors.
- This independent review made no hosted request. `PRODUCTION_IDENTITY_VERIFIED: YES` means the frozen read-only capture is internally bound to project ref/id `kldlwszpfkdmsjrjhjym`, with `transaction_read_only=on`; it is not a new live observation.

## Production state and pending operation

The frozen ledger contains 71 ordered rows, latest `20260830130000`, ordered SHA-256 `8fd1da6ea324d6b458951a41970d729e1e879b09b502b68f16ba22b09bb9dc9b`. The fresh comparator's canonical SHA-256 is `2c0bacf76c71924ffd8543852dc830f593058b8cb67a1016871f55908dae0443`; excluding migration history, its structural SHA-256 is `1c4cdbc441d3747f56109955c7b31840720d4cd09373572d961e9638fcc255c8`. Both exactly equal the accepted pre-apply comparator, and `PRODUCTION_DRIFT.diff` is empty. This structural equality plus canonical-version absence supports the five Phase 02 adoption candidates; ledger absence is not used alone.

The exact initial operation is 14 files in this order:

| # | Version | SHA-256 |
|---:|---|---|
| 1 | `20260904000000_adopt_private_admin_helper` | `1d504c3ad05c0b31052715406059071301a51f4359ef35ce85c92cb61202fbf7` |
| 2 | `20260904000100_drop_duplicate_status_triggers` | `9771e7c5df363b139e8bcd9e9f9e58b15e6c2f59eebb4523a330a774fc18db49` |
| 3 | `20260904000200_adopt_d1sa_containment` | `fbc986296aee71109639ad833d4c75422c28bbefa4fddfefe51f29eeaf03dfb6` |
| 4 | `20260904000300_adopt_live_insert_throttles` | `b346b2c7775543c9a268098c0956812b7ad9a9ddf49680202fe846073d4ef776` |
| 5 | `20260904000400_adopt_execute_revokes` | `e8a3d880d361e5d6be96c8b30709a9b1b3d8a8d94e6d23175342db41bb20cf13` |
| 6 | `20260905055629_phase03a_flag_policies` | `c8f4d419b01a624905c46bd168974d494d82af3a6960049c212d24e8fa07fcaa` |
| 7 | `20260905055630_phase03a_open_inserts` | `c6410a61cb195b6d6d70f0d33139064dd191a9cb193534b7f36dc33e25e90071` |
| 8 | `20260905055632_phase03a_profile_updates` | `ef24f6b44bcb7cdc7a2e89fe4a886a0d6a0688cf0a416564bde74b5d4c217187` |
| 9 | `20260905055633_phase03a_contextual_profiles` | `526d2c47f3c6edb6c3cffff94b8bec4f3c9e4c3602a30a5e4059b14261d86bf9` |
| 10 | `20260905055635_phase03a_trigger_execute` | `ca95d25a3219e541db555d5d8693e7240c7a927617c7a5969ee55cffa68074f9` |
| 11 | `20260905055636_phase03a_client_privileges` | `44e405bd9bc7b8c2cccb816825f57d43d617a83bdf38d7f0b4d58205cf997063` |
| 12 | `20260905073925_phase03a_effective_privileges` | `17970173cb28f29297a931751e9e8ca62c74366f1b83ab5cd36e536049562c20` |
| 13 | `20260909120000_fda028_v4_limiter` | `8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771` |
| 14 | `20260911120000_phase03a_webhook_target_env_scoped` | `9165f87e3571325fc847de5b08ca33aa9266e8786cee613be0cf61a06f4fbf6b` |

The accepted workspace evidence reports exactly 71 baseline, five adoption, and nine Phase 03A files, with these 14 entries in `wouldPush`. The normal plan contains no recovery file. Stage B `20260911130000_phase03a_fda026_stage_b_cutover.sql` (`a21c56b588b958a261766257482a08ceefb8857dc8d9e7c11b180c7584d8b963`) is explicitly excluded.

## Compatibility, prerequisites, and policy

- `ACCEPTED_STAGE_GATE: PASS` remains supported by the already accepted exact-source R7, 31/31 FDA-028 assertions, negative control, complete cleanup, 25-way concurrency evidence, and hosted pgTAP 254/254. None was rerun here.
- `BUILD33_PRODUCTION_COMPATIBILITY_PREFLIGHT: SUPPORTED` is correctly limited to exact production pre-apply comparator equality plus the accepted fresh-stage 37/37 authenticated/anonymous caller-shape suite and Stage B negative control. The packet explicitly records that no client-role call ran on production and requires post-apply role-context verification; superuser catalog access is not presented as client proof.
- `MF03_SECRET_PREREQUISITE: OWNER_ACTION_REQUIRED`: the captured shape has zero production `fda028_limiter_epoch_key` rows. Provisioning and later validation are correctly owner-controlled and non-disclosing.
- `MF04_ENDPOINT_PREREQUISITE: OWNER_ACTION_REQUIRED`: the captured shape has zero `webhook_endpoint` rows. The packet correctly requires provisioning before migration 14 and prohibits a notification probe.
- `MF05_BYPASS_DECISION: OWNER_DECISION_REQUIRED`: Stage A retains `S3_LIMITER_PRESENT_BYPASS_OPEN`. The packet does not claim that all guest traffic traverses the limiter or that IPv6 transport/end-to-end ingestion is proven.
- `PRODUCTION_POLICY: INCOMPLETE`: `normal_allowance`, `bucket_allowance`, and `window_seconds` require traffic and false-positive inputs. The remaining source-backed values are proposed but unapproved, and the migration's initial `enabled=true` state is explicitly reconciled with the recommended `enabled=false` activation choice.
- Prerequisite order is safe: repair/review local tools; recheck source, target, ledger, and catalog; provision MF-04; provision MF-03; decide MF-05 and the full policy/activation state; run only a separately authorized target-explicit dry-run; bank a new operation checkpoint; require another exact owner token before any apply.

## Tooling, credential gate, and recovery

- The local planner's nine-entry omission and the workspace builder's correct 14-entry `wouldPush` set are stated separately. Production command generation was `REFUSED_AS_DESIGNED`; the remote dry-run is `NOT_RUN`. Focused Jest tool tests are also correctly `NOT_RUN`, because the retained attempt produced no test result after the unavailable local Jest path and npm-cache failure.
- `CREDENTIAL_GATE: KNOWN_FALSE_POSITIVE_UNRESOLVED`. The packet does not relabel the `STAGE-MF-03/04/05` matches as a real secret or as PASS. Its proposed classifier repair is bounded to contextual finding-ID handling and requires real-secret-shape negative controls without printing matched values.
- `PRODUCTION_FORWARD_RECOVERY: HOLD`. Twelve restoration/reapplication pairs are present in reverse/original dependency order, use 24 unique locally and production-unused-at-capture versions, and are statically validated. Every restoration remains `UNSAFE_BASELINE_RESTORE`. `20260904000400_adopt_execute_revokes` and `20260911120000_phase03a_webhook_target_env_scoped` remain `NON_REVERSIBLE_SECURITY_REPAIR` with no restoration artifact because recreating their baselines would republish known weaknesses. Version availability must be rechecked before any later separately authorized use.
- `SOURCE_CHANGES_REQUIRED`: two narrow local prerequisites only: (1) add a production plan/dry-run-only mode that requires the exact target, accepted SHA/tree, complete 14-entry manifest, exact `wouldPush` equality, `--dry-run`, and `--skip-vault`, while retaining production apply refusal; (2) repair or precisely document the credential scanner so finding IDs are context-classified while genuine credential shapes still fail. Both require focused tests and independent patch review before a production dry-run.

## Required status

```text
PRODUCTION_PREFLIGHT: HOLD
ACCEPTED_STAGE_GATE: PASS
CURRENT_SOURCE_AND_TREE: 949c11093922d0b7d7b8665eda84dfde710f0d1c / a8ee59aac0e86239370aa55e14d897bed39c1a65
PROPOSED_RELEASE_IDENTITY: 9a0af4c88b5b00898e405992cfd44ba7dfd689fc / 4e9d6aefc16cb8bce877dc6e0097b61ade8e22c5 — verified ancestor of current source
PRODUCTION_IDENTITY_VERIFIED: YES — within the frozen read-only evidence
PRODUCTION_LEDGER_AND_CATALOG: PRODUCTION_LEDGER.json + PRODUCTION_CATALOG_CAPTURE.json + PRODUCTION_COMPARATOR_V3_CAPTURE.json + empty PRODUCTION_DRIFT.diff
PENDING_MIGRATIONS: 14 — exact ordered versions and hashes above
STAGE_B_INCLUDED: NO
BUILD33_PRODUCTION_COMPATIBILITY_PREFLIGHT: SUPPORTED — pre-apply comparator and accepted non-production caller-shape scope only
MF03_SECRET_PREREQUISITE: OWNER_ACTION_REQUIRED
MF04_ENDPOINT_PREREQUISITE: OWNER_ACTION_REQUIRED
MF05_BYPASS_DECISION: OWNER_DECISION_REQUIRED
PRODUCTION_POLICY: INCOMPLETE
CREDENTIAL_GATE: KNOWN_FALSE_POSITIVE_UNRESOLVED
PRODUCTION_FORWARD_RECOVERY: HOLD
INDEPENDENT_PREFLIGHT_REVIEW: PASS
SOURCE_CHANGES_REQUIRED: bounded production-plan-only tooling repair plus bounded credential-guard repair
OWNER_DECISIONS: OWNER_DECISION_SHEET.md
PRODUCTION_MUTATIONS: NONE
STAGING_MUTATIONS: NONE
PRODUCTION_AUTHORIZED: NO
MAIN_MERGE_AUTHORIZED: NO
PUSHES: NONE
NEXT_SAFE_ACTION: Sky decides whether to authorize only the two bounded local source prerequisite repairs, or requests changes; no production step is implied
```

## Review checks

- `shasum -a 256 -c ARTIFACT_SHA256.txt`: PASS, 52/52.
- Accepted Git-object migration hashes: PASS, 14/14; excluded Stage B: PASS.
- Accepted Git-object rollback hashes: PASS, 12/12.
- Generated recovery hashes, normalized bodies, version uniqueness, and order: PASS, 24/24; recovery semantics remain HOLD.
- Comparator canonical and non-ledger structural equality: PASS; drift diff is empty.
- Hosted calls, installs, builds, mutating tests, source edits, ref edits, commits: none.

## DECISIONS FOR SKY

**Decision:** Whether to authorize the two bounded local prerequisite repairs described in `PRODUCTION_APPLY_PLAN.md` and `OWNER_DECISION_SHEET.md`.

**Recommendation:** Authorize only those local repairs and their focused tests plus independent patch review. Keep production at HOLD until MF-03, MF-04, MF-05, policy/activation, credential, recovery, target-explicit dry-run, and final owner-token requirements are separately satisfied.

**Alternative:** Request changes to the repair proposal or retain the current production state.

**Impact:** The accepted fresh-stage gate remains PASS, while production, staging, Git integration, deployment, and release authority remain unchanged.
