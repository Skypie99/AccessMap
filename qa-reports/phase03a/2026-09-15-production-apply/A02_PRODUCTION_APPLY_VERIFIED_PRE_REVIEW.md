# A02 — production apply verified before independent review

```text
PRODUCTION_APPLY: PASS_PENDING_INDEPENDENT_REVIEW
TARGET_PROJECT: kldlwszpfkdmsjrjhjym
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
WORKSPACE_DESTROYED: YES
INDEPENDENT_PRODUCTION_REVIEW: PENDING
PHASE_03A_PRODUCTION_GATE: PENDING
PUSHES: NONE
MAIN_MERGES: NONE
PHASE_03B_STARTED: NO
MAIN_MERGE_AUTHORIZED: NO
```

The single target-explicit `--skip-vault` apply returned a complete structured response and exit 0. The authoritative read-only ledger contains exactly the 14 authorized versions once each after the prior 71 rows. Full comparator-v3 and structural-catalog captures, exact policy and prerequisite shapes, Build 33 privileges, FDA-028 objects and grants, notification metadata, safe aggregate counts, and cleanup state all pass the bounded verification contract.

The production verifier initially reused a query whose function hash expression cast `pg_get_functiondef()` text directly to `bytea`. The newly installed FDA-028 function source contains a regular-expression backslash, so PostgreSQL rejected that read-only query with `22P02`. The retained corrected query converts text explicitly with `convert_to(..., 'UTF8')`; it then completed in a read-only transaction. No production write resulted from the failed verifier query.

The immediate pre-apply aggregate query returned the same sanitized counts as the retained earlier preflight, and the post-apply counts remain identical. Its raw wrapper was replaced before banking while the verifier selection was corrected; `PRE_APPLY_SAFE_AGGREGATES_OBSERVED.json` records this evidence limitation. Ledger and full catalog pre-state artifacts are retained exactly.

Production acceptance remains pending one independent review. No recovery, push, merge, deployment, release, Stage B, or Phase 03B action is authorized.
