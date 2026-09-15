# R01 — before final owner-decision production inspection

```text
PROMPT_ID: FLAGSTONE-P03A-FINAL-OWNER-DECISIONS-20260914-R1
BRANCH: codex/flagstone-p03a-takeover-20260914
START_SHA: 3140e876af54c1d5945d0e266f8bc1760f7b1848
START_TREE: 3024466358326a2002843b0bf53bdc221c37de96
REPAIR_SHA: 22e1db5aa7e58d7129551cb1325f921b37f95105
REPAIR_TREE: 657f1b6ce01d3fdbb27102b5aa33616c918feade
TARGET_PROJECT_REF: kldlwszpfkdmsjrjhjym
AUTHORITY: READ_ONLY_PRODUCTION_INSPECTION_AND_LOCAL_PACKET_PREPARATION
PRODUCTION_MUTATION_AUTHORIZED: NO
```

## Frozen intake

- MF-03 is reported satisfied by the immediately preceding owner-authorized shape-only verification.
- MF-04 is reported complete and verified by the controlling prompt.
- The last accepted production ledger contained 71 rows and the exact pending Stage A plan contained 14 migrations.
- Stage B was excluded.
- Production forward recovery was `PREPARED_REVIEWED`.

## Next operation

Use only read-only project metadata and aggregate SQL to verify the exact project ref, MF-03/MF-04 shape-only state, ledger/catalog invariance, and current production-safe aggregate inputs relevant to the policy proposal. Do not return credential values, personal identifiers, raw IPs, user content, coordinates, or application-row identifiers.

No migration, dry-run, guest-ingest function, limiter function, webhook, Vault/config change, push, merge, deployment, or Phase 03B work is permitted.
