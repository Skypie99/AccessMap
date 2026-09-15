# Phase 03A updated production owner decision sheet

No production authority is granted by this sheet. The two local prerequisite repairs and their independent code review pass; the bounded read-only production re-preflight also passes.

## MF-03 — production limiter Vault prerequisite

**State:** `OWNER_ACTION_REQUIRED`.

Fresh read-only evidence shows zero production `fda028_limiter_epoch_key` rows. Sky must create exactly one production-only Vault value through an owner-controlled secure interface. It must meet the accepted 64-hex/32-byte shape. Do not copy the staging value or expose the production value to an agent, terminal transcript, or report.

Later read-only verification may return only row count and shape validity. Until then, the prerequisite is unsatisfied.

## MF-04 — production webhook endpoint prerequisite

**State:** `OWNER_ACTION_REQUIRED`.

Fresh read-only evidence shows zero production `webhook_endpoint` rows. Before migration `20260911120000`, Sky must create exactly one production Vault entry named `webhook_endpoint` containing the correct production HTTPS endpoint through an owner-controlled secure interface.

Later verification may return only row count, non-empty status, and HTTPS-shape validity. No notification probe is authorized.

## MF-05 — legacy bypass posture

**State:** `OWNER_DECISION_REQUIRED`.

Sky must decide whether to accept Stage A with `S3_LIMITER_PRESENT_BYPASS_OPEN`. The recommendation remains to name and retain this state for Stage A while preserving Build 33 compatibility. It leaves the known direct guest-insert bypass open and does not prove all guest traffic traverses the limiter. Applying Stage B early would break shipped caller contracts.

## Production limiter policy and activation

**State:** `INCOMPLETE`.

Sky must choose `normal_allowance`, `bucket_allowance`, and `window_seconds` from production traffic and acceptable false-positive evidence. Fresh-stage values are test evidence and are not production recommendations. The source-backed proposals `ipv4_prefix=32`, `ipv6_prefix=64`, `retention_windows=1`, `reseed_interval=7`, and `catchup_cap=32` remain proposed and unapproved.

The accepted migration creates `enabled=true`; the prior recommendation remains `enabled=false` until the thresholds are approved and a separately evidenced limiter-backed ingest cutover exists. A later authorization must therefore name an exact post-migration configuration action or approve a source change. This task does neither.

## Recovery disposition

The 24 prepared forward-recovery SQL artifacts have unique versions that remain absent from the current 71-row production ledger. Twelve restore paths remain unsafe baseline restorations. The execute-revoke adoption and environment-scoped webhook repair are forward-only security crossings: a regression requires owner-selected application/release containment or a new defect-specific correcting migration. Their weaker baselines must not be recreated.

## Next owner action

Sky securely creates exactly one production Vault entry named `webhook_endpoint` with the correct production HTTPS endpoint, then records only completion status for a later shape-only verification. This does not authorize a migration dry-run or apply.
