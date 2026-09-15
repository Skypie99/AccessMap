# R07 — before authorized production dry-run

```text
AUTHORIZATION_SCOPE: ONE_TARGET_EXPLICIT_PRODUCTION_DRY_RUN_ONLY
TARGET_PROJECT_REF: kldlwszpfkdmsjrjhjym
REPAIR_SHA: 22e1db5aa7e58d7129551cb1325f921b37f95105
REPAIR_TREE: 657f1b6ce01d3fdbb27102b5aa33616c918feade
PACKET_SHA256: b930bf7b005b740b3f78914f570e7725e19389d33e040b6b5e854905867fe40a
MF05_OWNER_DECISION: ACCEPT_S3_LIMITER_PRESENT_BYPASS_OPEN_FOR_STAGE_A
PRODUCTION_POLICY: 5 / 50 / 86400 / 32 / 64 / 1 / 7 / 32
PENDING_STAGE_A_MIGRATIONS: 14
STAGE_B_INCLUDED: NO
RECOVERY_FILES_INCLUDED: NO
SKIP_VAULT_REQUIRED: YES
PRODUCTION_APPLY_AUTHORIZED: NO
```

Sky explicitly authorized one dry-run against the exact target and repair identity. The operation must use the guarded production plan-only tooling and its marked temporary migration workspace. It must stop before the request on any target, source, hash, ledger, catalog, prerequisite, selector, Stage B, recovery, credential-gate, or workspace mismatch.

The dry-run may compare remote migration state but may not apply a migration, alter Vault/config, invoke a function or webhook, create production traffic, execute recovery, push, merge, deploy, release, start Stage B, or start Phase 03B. The exact temporary workspace must be destroyed after the attempt. A timeout or uncertain response becomes `OUTCOME_UNKNOWN` and must not be retried before read-only reconciliation.
