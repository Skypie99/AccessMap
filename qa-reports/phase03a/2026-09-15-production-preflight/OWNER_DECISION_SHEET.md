# Phase 03A consolidated owner decision sheet

No production authorization is requested by this sheet. It collects the decisions still needed after the two local source prerequisites are repaired and reviewed.

## Decision 1 — MF-03 production limiter key

**State:** `OWNER_ACTION_REQUIRED`. Production has zero `fda028_limiter_epoch_key` rows.

**Recommendation:** In the production Supabase Dashboard or another owner-controlled secure Vault flow, Sky creates exactly one new production-only secret named `fda028_limiter_epoch_key`. Its value must be 64 hexadecimal characters and decode to exactly 32 bytes. Generate it inside the owner-controlled secret interface; do not copy the staging key, paste it into a terminal or report, or expose it to an agent.

**Later verification:** A read-only query returns only: row count equals one, value matches the 64-hex shape, and decoded length equals 32 bytes. It must never return the value, a substring, or a fingerprint.

**Impact:** Without this secret, limiter admission fails closed when it needs the epoch key.

## Decision 2 — MF-04 production webhook endpoint

**State:** `OWNER_ACTION_REQUIRED`. Production has zero `webhook_endpoint` rows. Its existing webhook function uses a hardcoded production HTTPS target and its existing `webhook_secret` is present.

**Recommendation:** Before migration `20260911120000`, Sky creates exactly one production Vault entry named `webhook_endpoint` containing the correct production HTTPS endpoint through an owner-controlled secure interface.

**Later verification:** A read-only query returns only: row count equals one, value is non-empty, and value matches the candidate's HTTPS shape. It must not return the endpoint. After migration 14, structural verification confirms the function references `webhook_endpoint`, contains no compiled-in HTTPS literal, and retains the existing secret lookup. Do not send a test notification.

**Impact:** Applying migration 14 before provisioning this entry makes notifications fail closed and can silently stop status notifications.

## Decision 3 — MF-05 legacy bypass posture

**State:** `OWNER_DECISION_REQUIRED`.

**Decision:** Whether to accept Stage A with rollout state `S3_LIMITER_PRESENT_BYPASS_OPEN`.

**Recommendation:** Retain this explicit state for Stage A only and do not claim guest ingestion is fully protected. Stage A installs the limiter while legacy direct guest inserts remain available. No deployed guest-ingest function or pinned/native client cutover has been proven, and IPv6 transport remains open.

**Alternative:** Defer the whole Stage A production operation until the guest-ingest deployment and client cutover have their own evidence and authorization.

**Impact:** Accepting Stage A preserves Build 33 compatibility but leaves the known bypass. Closing it early through Stage B breaks shipped caller contracts.

## Decision 4 — production limiter policy and activation

**State:** `INCOMPLETE`. Fresh-stage values are test evidence and are not approved production settings. There is no production traffic evidence in this preflight.

| Setting | Proposal | Status and owner input needed |
|---|---:|---|
| `normal_allowance` | unset | Choose the per-client guest flag-plus-feedback budget per window and acceptable false-positive rate. |
| `bucket_allowance` | unset | Choose the shared-network budget after estimating NAT/shared Wi-Fi volume. Users behind the same visible source can consume one shared bucket. |
| `window_seconds` | unset | Choose the recovery period after weighing abuse response against how long a legitimate user remains blocked. |
| `ipv4_prefix` | `32` | Proposed from the accepted source/test contract; keeps individual IPv4 addresses separate. Not approved. |
| `ipv6_prefix` | `64` | Proposed from the accepted source/test contract; groups a typical IPv6 network. Actual IPv6 transport is still unproven. Not approved. |
| `retention_windows` | `1` | Proposed minimum accepted history for lifecycle cleanup. Not approved. |
| `reseed_interval` | `7` | Proposed accepted design default for key-ratchet reseeding. This is a security/lifecycle value, not a traffic estimate. Not approved. |
| `catchup_cap` | `32` | Proposed accepted safety cap on ratchet catch-up work. Not approved. |

**Activation recommendation:** `enabled=false` until Sky approves the first three thresholds and a separately evidenced limiter-backed ingest cutover exists. The accepted migration currently creates `enabled=true`; a later authorization must therefore name an exact post-migration config step or approve a source change. This mismatch keeps the policy prerequisite incomplete.

## Decision 5 — two source prerequisites before any production dry-run

**State:** `OWNER_DECISION_REQUIRED`; recommended action is the narrow local repair only.

1. **Production planning mode:** implement the bounded plan/dry-run-only changes in `PRODUCTION_APPLY_PLAN.md`. Preserve the staging refusal for all existing modes, require the exact target and release manifest, include all 14 `wouldPush` files, add `--skip-vault`, and keep apply unavailable.
2. **Credential gate:** provide a committed, reproducible credential-scan command or precisely document the existing external scanner. Adjust its classifier so structured finding IDs such as `STAGE-MF-03`, `STAGE-MF-04`, and `STAGE-MF-05` are classified by context without allowlisting credential-shaped values. Add negative controls containing real secret shapes and prove they still fail without printing matched values.

**Impact:** Until both patches pass their focused tests and independent review, the production dry-run remains `NOT_RUN`, the credential gate remains red as a known false positive, and production readiness remains `HOLD`.

## Decision 6 — recovery limitation

**State:** `OWNER_DECISION_REQUIRED`, with current recovery verdict `HOLD`.

Twelve candidates have locally prepared forward restoration/reapplication evidence, each classified `UNSAFE_BASELINE_RESTORE`. Two security repairs deliberately have no production restoration artifact:

- `20260904000400_adopt_execute_revokes.sql`: restoring baseline would republish a retired credential literal and reopen trigger-only `SECURITY DEFINER` execution.
- `20260911120000_phase03a_webhook_target_env_scoped.sql`: restoring baseline would reinstate the hardcoded production endpoint.

**Recommendation:** Do not authorize production until Sky accepts that these two crossings are forward-only and selects explicit incident behavior for a regression after either one. Revert the application/release path or issue a new correcting migration rather than recreating the known weakness.

## One next action

Authorize only the narrow local planning-tool and credential-guard repair proposal above, or request changes to that proposal. This does not authorize a production dry-run, prerequisite provisioning, database mutation, deployment, Stage B, merge, or push.
