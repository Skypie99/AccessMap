# Phase 03A final owner-decision and production-authorization packet — independent review

```text
REVIEWED_COMMIT: f677c45f2f1622396a66c9b8503b8885a90f6e5e
REVIEWED_TREE: 08bc4b6c92c786af0b080676ee5b36afa8f40d1e
PACKET_SHA256: b930bf7b005b740b3f78914f570e7725e19389d33e040b6b5e854905867fe40a
INDEPENDENT_FINAL_PACKET_REVIEW: PASS
PRODUCTION_DRY_RUN_AUTHORIZED_BY_PACKET_PRESENCE: NO
PRODUCTION_APPLY_AUTHORIZED: NO
PRODUCTION_OR_STAGING_CONTACT_THIS_REVIEW: NONE
SOURCE_EDITS: NONE
```

## Verdict

The exact frozen packet passes independent local review. I found no material contradiction, hidden mutation authority, identity mismatch, or unsupported policy claim in the requested scope. The packet is suitable for Sky to approve the recorded MF-05 posture and limiter policy and, if Sky uses the exact template, authorize one target-explicit production dry-run. Its presence and this review do not authorize that dry-run or any apply.

## 1. MF-05 and rollout boundary — PASS

The packet and policy proposal consistently define `S3_LIMITER_PRESENT_BYPASS_OPEN` as a temporary Stage A posture. They expressly state that legacy direct guest inserts remain available and make no claim that all guest traffic is limiter-backed. This matches the accepted staged behavior: the limiter is present, while the legacy bypass remains open for Build 33 and pinned-web compatibility.

Stage B is excluded throughout. The packet does not force a client upgrade, native or web release, pinned-web cutover, or legacy-path removal. It assigns bypass closure to a later coordinated native and pinned-web cutover with separate evidence and owner authorization. This preserves the accepted Build 33 role-compatibility boundary rather than treating Stage A as a client cutover.

## 2. Eight-value limiter policy — PASS

The proposal, final packet, accepted limiter migration defaults, and frozen R7 hosted configuration agree exactly:

| Field | Value | Confidence | Independent assessment |
|---|---:|---|---|
| `normal_allowance` | 5 | High | Preserves the shipped guest-facing five-per-window contract; the grant tier enforces this value. |
| `bucket_allowance` | 50 | Provisional | Funds ten normal grants per normalized prefix and bounds grant-reset amplification at 10x. The privacy-safe production aggregate supports a non-aggressive initial ceiling, while absent prefix distribution correctly keeps this provisional. |
| `window_seconds` | 86400 | High | Matches the shipped 24-hour message and the accepted database window model. The proposal also states the legitimate-lockout and abuse tradeoff. |
| `ipv4_prefix` | 32 | High | Is the least-coalescing IPv4 mask and avoids merging unrelated public IPv4 addresses; NAT sharing and network switching remain acknowledged limits. |
| `ipv6_prefix` | 64 | Provisional | Matches the accepted normalization architecture and its IPv4-embedded/NAT64 unwrapping. The proposal states the `/128` rotation and broader-prefix collision tradeoff and does not elevate unknown production prefix distribution or IPv6 transport to proven behavior. |
| `retention_windows` | 1 | Provisional | The purge implementation retains the live and immediately prior window under normal timing. The proposal states the bounded privacy cost and the need for operational purge evidence. |
| `reseed_interval` | 7 | Provisional | The accepted ratchet generates a fresh random key when the interval is reached, bounding forward derivation from an older key. Production rotation evidence is correctly identified as unavailable. |
| `catchup_cap` | 32 | High | The implementation caps serial ratchet work at 32 missed epochs and reseeds directly at the current bounded epoch after a longer gap. |

The R7 hosted receipt confirms all eight configured values and 31/31 accepted assertions, including grant/bucket exhaustion, no overshoot, purge/lifecycle behavior, Vault continuity, source normalization, and fail-closed paths. Earlier 25-way concurrency and 254/254 hosted pgTAP remain separate supporting evidence. The proposal uses the banked production evidence only as privacy-safe aggregates, labels the sample and missing prefix distribution as limitations, and requests aggregate denial/saturation tuning without raw addresses or stable bucket identifiers. No extra production configuration mutation is included because these are the migration defaults.

## 3. Exact Stage A identities — PASS

Independent parsing of the packet and candidate contract found exactly 14 Stage A rows in canonical contract order. For all 14, the packet version, filename, SHA-256, contract entry, and current file bytes match. All 14 versions are absent from the frozen 71-row production ledger.

Commit history from repair SHA `22e1db5aa7e58d7129551cb1325f921b37f95105` through the reviewed commit changes QA evidence only; no migration, limiter, script, application-source, or target-link file changed.

## 4. Stage B exclusion — PASS

`20260911130000_phase03a_fda026_stage_b_cutover.sql` is not in the 14-row Stage A table. Its separately recorded hash matches its current file, and the packet repeatedly labels it excluded. Pre-apply planning refuses Stage B and recovery files; post-apply verification requires no Stage B ledger row. The authority exclusions also withhold Stage B and every client/release action.

## 5. MF-03 and MF-04 prerequisites — PASS

The banked read-only evidence records exactly one non-empty, shape-valid MF-03 row and exactly one non-empty, HTTPS-shape-valid MF-04 row. Each prerequisite object contains only `rowCount`, `nonempty`, and `shapeValid`; no credential or endpoint body field is present. The envelope records `transactionReadOnly: on`, `applicationRowsRead: false`, and `credentialValuesReturned: false`. Independent structural scanning found no unexpected URL or credential-shaped value in that evidence.

The packet's `SATISFIED` labels are therefore supported as current shape/count prerequisites only. They do not claim that any value was read, copied, disclosed, or changed by this review.

## 6. Forward recovery — PASS

The packet contains 12 restore rows and 12 reapply rows. Each version, filename, hash, and current SQL byte sequence matches the independently reviewed R2 recovery manifest:

- restore sequence: exact reverse dependency order;
- reapply sequence: exact original order for the same 12 recoverable candidates;
- 24 unique forward-only versions, all absent from the current production ledger;
- every restoration remains `UNSAFE_BASELINE_RESTORE` and requires an exact dependency-safe subset plus separate authorization;
- trigger conditions require an attributable material regression after a separately authorized apply, owner subset selection, fresh reconciliation, unused-version proof, and before/after captures;
- stop conditions cover all identity, source, hash, ledger, version, prerequisite, dependency, uncertain/partial-result, and legitimate-data-impact mismatches.

The two non-restorable security crossings remain `20260904000400_adopt_execute_revokes.sql` and `20260911120000_phase03a_webhook_target_env_scoped.sql`. Neither has a restore or reapply artifact. The packet prohibits recreating the retired credential, client execution grants, or hardcoded endpoint and assigns any defect to owner-selected application/release containment or a newly reviewed forward correction with a fresh version. Recovery execution remains unauthorized.

## 7. Target safety — PASS

The packet names the exact production ref `kldlwszpfkdmsjrjhjym`, repair SHA, and repair tree. It requires explicit project metadata and database-side identity and rejects implicit, linked, local, URL, staging, whitespace-altered, and duplicate selectors. Neither `supabase/.temp/linked-project.json` nor `supabase/.temp/project-ref` exists or is tracked at the reviewed commit.

The production-plan implementation independently passed its 18 focused tests: exact-ref-only selection, whitespace and staging refusal, linked/URL selector refusal, production-apply refusal, frozen-ledger binding, source/evidence binding, candidate hashes, Stage B exclusion, and no surviving workspace on refusal.

## 8. Production drift — PASS

The final 71-row ledger is canonically identical to the accepted re-preflight ledger. Its independently recomputed ordered digest is `8fd1da6ea324d6b458951a41970d729e1e879b09b502b68f16ba22b09bb9dc9b` and its latest version remains `20260830130000`.

The final comparator-v3 catalog is canonically identical to the accepted re-preflight catalog. Independent `jq -S` hashing reproduces both packet digests:

```text
canonical catalog:  2c0bacf76c71924ffd8543852dc830f593058b8cb67a1016871f55908dae0443
non-ledger catalog: 1c4cdbc441d3747f56109955c7b31840720d4cd09373572d961e9638fcc255c8
```

Within the banked read-only evidence, no new production ledger or catalog drift is present. This review made no hosted freshness claim beyond those frozen captures.

## 9. Mutation-authority falsification — PASS

The packet begins and ends with `PRODUCTION_AUTHORIZED: NO`; MF-05 owner approval and policy approval are also `NO`. It contains no apply argv, `--apply` option, executable non-dry-run shell command, Vault/config instruction, function invocation, webhook probe, or production test-traffic command. The future apply sequence is descriptive and twice conditioned on a new separate owner token after an independently reviewed dry-run receipt.

The dry-run plan itself is limited to an isolated workspace, the exact target, `--dry-run --skip-vault`, the 14 Stage A files, workspace destruction, and independent receipt review. Manual SQL execution, Management API apply, implicit targeting, direct ledger edits, recovery, Vault/config mutation, function/webhook invocation, and production traffic are explicitly prohibited.

## 10. Exact owner phrase — PASS

The packet contains one owner-phrase template and labels its presence as non-authorizing. The phrase:

- approves the MF-05 posture and eight-value policy;
- authorizes only one target-explicit production dry-run;
- binds the exact project ref, repair SHA/tree, 14 packet versions/hashes, `--skip-vault`, Stage B/recovery exclusion, STOP handling, workspace destruction, and independent receipt review;
- expressly withholds production apply, Vault/config change, function invocation, production traffic, webhook, recovery, push, merge, deployment, client release, TestFlight, App Store action, Stage B, and Phase 03B;
- requires the reviewed dry-run to return to Sky for a separate apply decision.

No wording in the template silently supplies apply or adjacent release authority.

## Verification

```text
exact commit/tree and packet SHA-256: PASS
packet static-validation claims independently rechecked: PASS
14 Stage A contract rows/order/hashes/current bytes: PASS
Stage A production-version collision check: PASS — zero
Stage B exclusion/current hash: PASS
MF-03/MF-04 shape-only evidence structure: PASS
policy values vs proposal/migration/hosted receipt/packet: PASS — 8/8
final vs accepted re-preflight ledger: PASS — exact canonical equality
final vs accepted re-preflight comparator catalog: PASS — exact canonical equality
24 recovery rows/order/hashes/current bytes: PASS
recovery production-version collision check: PASS — zero
target and authority static falsification: PASS
production-plan focused suite: PASS — 18/18
credential guard: PASS — 10/10
git diff --check for frozen packet commit: PASS
production or staging contact: NONE
```

## DECISIONS FOR SKY

The packet leaves two explicit decisions for Sky: whether to accept the temporary MF-05 bypass-open Stage A posture and whether to approve the proposed eight-value production policy. My recommendation is to accept both as framed and use the packet's exact phrase only when Sky intends to authorize the single production dry-run. The alternative is to retain `PRODUCTION_AUTHORIZED: NO` and gather more aggregate operational evidence before selecting policy values. Either choice leaves apply, Stage B, recovery, deployment, release, and Phase 03B unauthorized.
