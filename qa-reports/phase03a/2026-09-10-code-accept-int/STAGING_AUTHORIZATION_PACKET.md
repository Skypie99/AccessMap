# Phase 03A — STAGING AUTHORIZATION PACKET

**STATUS: PREPARED. NOT EXECUTED. Staging mutation is NOT authorized by the prompt that produced this packet.** This is the exact artefact for the next owner decision. Creating it is not staging completion.

## 1. Accepted source identity

| Item | Value |
|---|---|
| `PHASE03A_CODE_SHA` | `21b2bd7a96cd69a8d8fc3ff8756b88a5fe28d912` |
| `PHASE03A_CODE_TREE` | `b47f1221e8be9c57d147a80ee328359b32f66436` |
| Independently reviewed CODE commit | `5edd6455cac5fc5a42cd7e327b7a53f844a75d05` (zero non-QA drift to the frozen commit) |
| `ACCEPTED_INTEGRATION_SHA` | `7c43c07e69f74db4d65aa4ea329f419b6c715fb4` |
| `ACCEPTED_INTEGRATION_TREE` | `11de0eb4cf0cbf718fe17fa8a8cab8defef21af8` |
| Integration parents | `5a64c917…` (pre-INT tip) + `cee5f8e4…` (03A CODE source) |
| `FDA028_V4_SHA` / tree | `eec51b6723d04105a7ba31bf2efd2573b95e8902` / `23f352bec069522efe9a174a4551c2c484b91de2` |

## 2. Staging target — freshly reverified 2026-09-10

| Item | Verified value |
|---|---|
| Branch id | `441acc38-d71c-4a87-883e-61ff87e0c52e` |
| Branch name | `flagstone-p03a-staging-20260905` |
| Project ref | `ctshxbykuemeqnofqcdh` |
| Parent production ref | `kldlwszpfkdmsjrjhjym` |
| `is_default` | false |
| `persistent` | false |
| `with_data` | **false** |
| Health | `ACTIVE_HEALTHY` |

**Expected pre-state — exactly three Edge Functions, no others:**

| Slug | Version | verify_jwt | bundle sha256 |
|---|---|---|---|
| `send-push-notification` | 6 | false | `0434671e…1595be8` |
| `notify-flag-status` | 8 | false | `633db2d2…0ba7a0e` |
| `delete-account` | 4 | true | `9edfdaf2…8abdb34` |

No `limiter` schema, no `fda028-probe`, no guest-ingest function. If any of this differs at execution time, **STOP and re-verify** — the packet is stale.

## 3. Exact apply order

**Baseline reconciliation first.** Staging's canonical baseline was never reconciled (`identityGate: NOT_PASSED` in the banked handoff). Reconcile to the accepted Phase 02 baseline `c2e36800b269ee22f29d0be35cfb88dace7c2afc` (71 applied migrations) **before** any candidate, and capture a before-catalog.

**Then the five Phase 02 adoption candidates**, in order — *only if fresh evidence at execution time confirms they are still required*:

1. `20260904000000_adopt_private_admin_helper.sql`
2. `20260904000100_drop_duplicate_status_triggers.sql`
3. `20260904000200_adopt_d1sa_containment.sql`
4. `20260904000300_adopt_live_insert_throttles.sql`
5. `20260904000400_adopt_execute_revokes.sql`

**Then the eight Phase 03A candidates**, in this exact order:

| # | File | Finding | sha256 |
|---|---|---|---|
| 1 | `20260905055629_phase03a_flag_policies.sql` | FDA-009 | `c8f4d419…07fcaa` |
| 2 | `20260905055630_phase03a_open_inserts.sql` | FDA-023 | `c6410a61…5e90071` |
| 3 | `20260905055632_phase03a_profile_updates.sql` | FDA-021 | `ef24f6b4…d4c217187` |
| 4 | `20260905055633_phase03a_contextual_profiles.sql` | FDA-026 | `714cee56…de22d81b` |
| 5 | `20260905055635_phase03a_trigger_execute.sql` | FDA-010 | `ca95d25a…a68074f9` |
| 6 | `20260905055636_phase03a_client_privileges.sql` | FDA-012 | `44e405bd…5cf997063` |
| 7 | `20260905073925_phase03a_effective_privileges.sql` | FDA-012 | `64afe7aa…e73cc9928` |
| 8 | `20260909120000_fda028_v4_limiter.sql` | FDA-028 | `8d1cc7e1…0e6387771` |

Matching restorations in `rollback/`, applied in **reverse** order on rollback. Full hashes: [CODE_FREEZE.json](CODE_FREEZE.json).

**Prerequisite for candidate 8:** the Vault secret `fda028_limiter_epoch_key` must be **provisioned before first use**. `limiter.write_epoch_key` raises `FDA028: limiter epoch key secret not provisioned` if the secret row is absent — it deliberately never calls `vault.create_secret`. Provisioning it is an explicit staging step.

## 4. Fixture plan

Synthetic accounts only, no production data (`with_data:false` already guarantees an empty branch). Reuse the local fixture shape from `supabase/tests/phase03a-fixtures/`. Guest traffic uses RFC 5737 / RFC 3849 reserved addresses only.

## 5. MANDATORY staging tests

### 5.1 Existing Phase 03A
Hosted pgTAP (the same 217-assertion set); anon / authenticated / owner / admin / service-role matrix; RLS; REST; RPC; required Auth and Storage behaviour; profile, public-profile, leaderboard and comment-author caller behaviour; transitional owner and admin direct flag deletion; unauthorized direct deletion refusal.

### 5.2 FDA-028 hosted proof
Real Vault IO; `cf-connecting-ip` ingestion; reset continuity; client A / client B isolation; full insert enforcement; concurrent admission; bypass prevention; bucket/grant lifecycle; restoration and reapply; **no sensitive signal leakage** — no address, bucket key, token or secret in any response, log or receipt.

### 5.3 IPv6
Attempt genuine hosted IPv6 evidence **only if the environment can honestly provide it**. Otherwise record `IPV6_HOSTED_EVIDENCE: OPEN` with the exact reason. **Do not simulate hosted IPv6 and call it proof.** The local probe host had no native IPv6 route and 0 of 85 observed production requests were IPv6.

### 5.4 R6 residual attacks — required, not optional

- **R6-1** — exercise admission while an authorized config-domain-change transaction is deliberately held open. Measure whether admissions block, for how long, how they recover, and the operational consequence. Use a **deterministic bounded timeout**. **Do not leave the transaction open after the test.**
- **R6-2** — verify no anon, authenticated, application or service path can invoke arbitrary advisory-lock primitives or otherwise acquire the limiter's coordination key outside the accepted server path. **Do not attempt global PostgreSQL privilege surgery** to hide this residual.
- **R6-3** — run a deterministic hosted race: admission versus config-domain change. Capture proof that no old-domain row is stranded, the config mutation waits or refuses as designed, budget authority stays correct, and no guest admission is silently over- or under-counted.

**If hosted results upgrade any residual into a material vulnerability or availability defect: STAGE must HOLD and return to CODE.**

## 6. Capture, rollback and cleanup

Before/after catalog capture with sha256 either side of every apply. Rollback = restorations in reverse, then re-verify the catalog equals the before-capture; then deterministic reapply. Cleanup manifest: remove every fixture row and any temporary function, and capture a post-removal inventory as a receipt.

**All twelve existing staging cleanup conditions remain mandatory and unmet.** Early deletion of the staging branch is not authorized. A usage reset or session stop is not cleanup authorization.

## 7. Independent hosted review plan

One bounded independent reviewer, given the exact applied SHA/tree and artifact hashes, must reproduce the load-bearing hosted evidence and attempt to falsify: hosted trusted-input behaviour, Vault IO, reset continuity, client independence, concurrency, bypass prevention, and each R6 residual. The implementation owner cannot self-certify STAGE.

## 8. Carried-forward open items

| Item | State |
|---|---|
| `VAULT_IO` | **OPEN_FOR_STAGE** — no Supabase Vault exists in disposable local Postgres, so v4's Vault read/write branches are unexercised |
| `IPV6_HOSTED_EVIDENCE` | **OPEN_FOR_STAGE** |
| `R6-1` / `R6-2` / `R6-3` | **CARRY_TO_STAGE** — explicit STAGE acceptance items, not waived |
| All seven findings | **OPEN** until governing hosted/production closure |
| Guest-ingest bypass | Open **by design** until the S6 client cutover; `anon`/`authenticated` retain column-scoped INSERT on `public.flags` |

## 9. What this packet does not authorize

Staging mutation, production, push, main merge, credential rotation, App Store, Phase 03B, or staging cleanup. Each remains a separate owner decision.
