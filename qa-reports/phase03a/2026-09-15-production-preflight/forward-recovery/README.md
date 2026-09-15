# Production-specific forward recovery evidence

```text
STATUS: EVIDENCE_ONLY_HOLD_NOT_EXECUTABLE
TARGET: kldlwszpfkdmsjrjhjym
PREPARED_RESTORE_FILES: 12
PREPARED_REAPPLY_FILES: 12
NON_RESTORABLE_SECURITY_REPAIRS: 2
```

These files are local review artifacts outside every canonical migration directory. They were generated from the exact accepted source and rollback bytes. Their versions were absent from the inspected 71-row production ledger and from local migration filenames at preparation time; every future use must recheck version availability.

Restoration order is reverse dependency order. Reapplication order is original candidate order. Every prepared restoration is `UNSAFE_BASELINE_RESTORE`: it deliberately recreates a weaker pre-candidate posture and is never an automatic rollback.

No restoration file was prepared for:

- `20260904000400_adopt_execute_revokes.sql`, whose accepted rollback refuses to republish a retired credential literal and reopen trigger-only `SECURITY DEFINER` execution;
- `20260911120000_phase03a_webhook_target_env_scoped.sql`, whose baseline would restore the hardcoded production webhook target.

Because those two security transitions have no justified production restoration, the overall recovery verdict is `HOLD`. If a later regression crosses either boundary, use a new corrective migration or application/release containment selected by Sky; do not recreate the known weakness.

The authoritative entry order, source/rollback/generated hashes, classifications, trigger conditions, and stop conditions are in `FORWARD_RECOVERY_MANIFEST.json`.
