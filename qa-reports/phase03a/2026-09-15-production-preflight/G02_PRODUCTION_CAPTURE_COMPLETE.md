# Phase 03A production preflight — generation 02

```text
PROMPT_ID: FLAGSTONE-P03A-PRODUCTION-PREFLIGHT-ONLY-R1
RUN_UNIT: PRODUCTION_PREFLIGHT_READ_ONLY
GENERATION: 02
STATUS: COMPLETE
BANKED_AT_UTC: 2026-09-15T03:31:00Z
SOLE_WRITER: CODEX_PRIMARY_SESSION
PRODUCTION_AUTHORITY: READ_ONLY_INSPECTION_ONLY
PRODUCTION_MUTATION_AUTHORITY: NONE
STAGING_MUTATION_AUTHORITY: NONE
```

## Verified production identity and read boundary

The Supabase connector bound the read to project `kldlwszpfkdmsjrjhjym` (`Accessable City App`, `us-west-2`, `ACTIVE_HEALTHY`, PostgreSQL `17.6.1.121`). Every SQL capture declared `BEGIN TRANSACTION READ ONLY`; the database returned `transaction_read_only=on` and `session_role=postgres`. No application row, identifier, coordinate, IP, endpoint value, secret value, key fingerprint, or credential was selected.

Two read-only attempts failed safely and were retried only after local correction:

- the first privilege query used an invalid textual function signature and the read-only transaction rolled back;
- the first local response parser rejected the connector envelope, so the same read-only catalog query was repeated and parsed without changing the SQL scope.

Neither failure created a database side effect or changed the target mechanism.

## Canonical ledger

Production contains 71 ordered migration rows, from `20260523020620` through `20260830130000`. Its ordered ledger SHA-256 is `8fd1da6ea324d6b458951a41970d729e1e879b09b502b68f16ba22b09bb9dc9b`. None of the five Phase 02 adoption versions, nine Phase 03A Stage A versions, or the excluded Stage B version is recorded.

## Exact pre-apply comparison

The accepted comparator-v3 production capture from `qa-reports/phase03a/2026-09-05-owner-resume/production-catalog-final.json` and this fresh production capture have identical canonical catalog and non-ledger structural digests:

```text
canonical catalog SHA-256: 2c0bacf76c71924ffd8543852dc830f593058b8cb67a1016871f55908dae0443
non-ledger structural SHA-256: 1c4cdbc441d3747f56109955c7b31840720d4cd09373572d961e9638fcc255c8
catalog diff lines: 0
```

The fresh comparator contains 71 migration-history rows, 23 tables, 152 columns, 47 policies, 25 triggers, 28 functions, 49 function grants, and 434 table grants. Exact equality, rather than absent ledger rows alone, supports the five Phase 02 adoption candidates as pending.

## Relevant current production state

- `private` exists; `limiter` does not exist.
- `private.current_user_is_admin()` exists.
- The four additive Phase 03A client RPCs do not exist.
- `public.notify_flag_status_webhook()` exists and still contains the hardcoded HTTPS target form; it references `webhook_secret` and does not reference `webhook_endpoint`.
- MF-03 `fda028_limiter_epoch_key`: zero rows; required shape absent.
- MF-04 `webhook_endpoint`: zero rows; required shape absent.
- Existing `webhook_secret`: exactly one non-empty row; its value was not returned.

Safe aggregate baselines are retained for later delta checks: users 5, flags 21, feedback 6, flag comments 3, flag photos 1, point events 63, status history 37, edit history 0, verifications 0, comment votes 0, storage objects 9, queued HTTP 0. Later verification must compare operation-attributable deltas and must not require these live tables to be globally empty.

## Evidence files and hashes

```text
0ba4b5518e8092ef3e8f4b969630bba881e6f6b64e1b633060f572d8bfc65b1e  PRODUCTION_CATALOG_QUERY.sql
a9947e619e7ab607ce67b317031726155cc38d082d3f71d071aa1b57d1a7eca1  PRODUCTION_CATALOG_CAPTURE.json
78e7cc93e33d18f1acfc9dcf9732c051211e21c6fd402ff924b434930603b890  PRODUCTION_COMPARATOR_V3_CAPTURE.json
2a54be38a86c82bb194c7a46021605c776265849600058e3cc7114fe1be3a629  PRODUCTION_LEDGER.json
PRODUCTION_DRIFT.diff: empty, 0 lines
```

No production or staging mutation occurred.

```text
NEXT_SAFE_ACTION: prepare the exact 14-entry Stage A plan, local forward-recovery evidence, and consolidated owner decision sheet without execution
```
