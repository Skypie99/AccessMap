# FDA-028 hosted harness repair — independent code review R3

`REVIEWED_AT_UTC: 2026-09-15`

## Verdict

```text
FDA028_HARNESS_REPAIR_SHA: 55b8b7ef60f28dfd52a0ecf82f22efa706d39252
FDA028_HARNESS_REPAIR_TREE: df6433180255d365cfcf58ace5922c124709c0f0
FDA028_LIMITER_IMPLEMENTATION_BYTES_CHANGED: NO
FDA028_HARNESS_CODE_REVIEW: HOLD
HOSTED_EXECUTION_AUTHORIZED_BY_THIS_REVIEW: NO
```

R3 closes the R2 exact-plan, zero-plan, whole-plan skip, duplicate-plan, malformed-JSON, named error/warning object, plain unexpected-record, negative bailout/YAML, stderr, and nonzero-propagation paths. One structured-JSON false-positive path remains. All non-TAP findings remain resolved, and no limiter change is required.

## Blocking finding

### H1 — JSON framing is parsed but JSON result records are not validated

`assertTapEnvelope()` at `scripts/run-fda028-hosted.mjs:113-127` verifies only that JSON-framed stdout is one parseable JSON document and contains no truthy property named `error`, `errors`, `warning`, or `warnings`. It does not validate the top-level result shape, allowed row keys, single-value row structure, or whether every JSON record is a recognized TAP record. `parseTap()` then scans the serialized JSON text for TAP-looking substrings regardless of which object/key contains them.

Direct local probes against the exact R3 code confirmed these false PASS results:

```text
main suite:
[
  {"plan":"1..39"},
  {"ok":"ok 1 - pass"},
  ... 38 more valid ok rows ...,
  {"message":"unexpected partial result"}
]
result: ACCEPTED, plan 39

main suite:
{"payload":"1..39\nok 1 - pass\n...ok 39 - pass\n"}
result: ACCEPTED, plan 39

negative control:
[
  {"plan":"1..1"},
  {"ok":"not ok 1 - FDA028 deliberate runner negative control"},
  {"message":"unexpected"}
]
result: ACCEPTED, negative control detected
```

**Impact:** unrelated, partial, or misframed JSON can be treated as the authoritative pgTAP stream. The receipt may report PASS even though the CLI response contains an unexpected record or the TAP text arrived under an arbitrary field rather than the expected SQL-result rows. This leaves the exact JSON-framing/unexpected-record false-positive class requested for R3 unresolved.

**Required harness-only repair:** parse the JSON response structurally and fail closed unless it matches the exact Supabase `db query --output-format json` result contract used by these files. Require the expected top-level collection and recognized single-result rows; accept TAP text only from expected result values; reject extra keys, extra records, nested/wrapped arbitrary payloads, non-string TAP values, and every unrecognized record. Apply the same structural validator to the main suite and negative control. Add the three probes above as required failures.

## R3 TAP attack matrix

| Case | R3 result | Review disposition |
|---|---|---|
| Exact main plan 39, assertions 1–39 once | Refused unless exact; valid stream accepted | PASS |
| Plan 0 / whole-plan SKIP | Refused | PASS |
| Wrong plan | Refused | PASS |
| Duplicate plan, including same value twice | Refused | PASS |
| Missing/duplicate assertion numbers | Refused | PASS |
| Assertion SKIP/TODO | Refused | PASS |
| Plan SKIP/TODO | Refused | PASS |
| Main bailout | Refused | PASS |
| Main YAML/comment/NOTICE/WARNING/ERROR/FATAL/PANIC diagnostics | Refused | PASS |
| Malformed JSON or concatenated JSON | Refused | PASS |
| Truthy JSON `error`/`errors`/`warning`/`warnings` property | Refused | PASS |
| Unexpected plain stdout record | Refused | PASS |
| Unexpected JSON record or arbitrary JSON payload key | Accepted | **HOLD** |
| Negative-control wrong plan/assertion | Refused | PASS |
| Negative-control bailout/YAML/unapproved comment | Refused | PASS |
| Negative-control unexpected JSON record | Accepted | **HOLD** |
| Unexpected CLI stderr | Refused except two exact version-notice lines | PASS |
| Negative or suite subprocess nonzero | Nonzero/HOLD; post-cleanup still checked | PASS |

## Regression disposition of all prior findings

| Domain | R3 result | Evidence |
|---|---|---|
| Harness-only scope | PASS | R3 source changes only the runner and its Node tests. The accepted limiter forward/rollback files and hosted SQL artifacts are unchanged from R2. |
| Reviewed Git-blob binding | PASS for exact R3 invocation | `--reviewed-sha 55b8b7ef...` binds all four executable hosted artifacts to the reviewed commit before every query and again after state queries. R3 passed; the R2 runner blob was refused. This review authorizes no other reviewed-SHA token. |
| No production/old-stage contact | PASS | The only network operation remains `supabase db query` with the exact validated fresh project ref. Production, old stage, unknown branch, and linked selectors were directly refused before receipt creation. No branch-list or production-parent request exists. |
| Exact fresh target/database identity | PASS | Exact project-ref and branch-ID tokens are required; pre-state checks the accepted 103-row ledger digest/latest version, config, Vault shape, exact function keys, and zero residue. |
| Real `service_role` path | PASS | The clockless entry point remains executed under local `service_role`, with its real flag row verified after role reset and all changes enclosed by rollback. |
| Exact function keys | PASS | Exactly four named true keys remain required. |
| Constraint-specific `ramp` control | PASS | Only `flags_category_check` satisfies the caught invalid-category control. |
| Config/timing | PASS | Accepted 86400-second preflight plus bounded transaction-local 60-second timing remains intact; no 600-second coupling. |
| Vault/key path | PASS | Vault shape/read/ratchet behavior remains exercised; `dev_key_material` must be absent and is never written. |
| Cleanup on PASS/FAIL | PASS for modeled state | The suite remains one rollback-only transaction. Post-state comparison still runs after TAP failure, subprocess nonzero, stderr failure, and suite completion; nonzero simulations returned cleanup `PASS` while preserving overall refusal. |
| Residual contamination | PASS | Full captured state comparison and no-helper checks remain unchanged. Temporary role/table grants remain transaction/session bounded. |

## Local gates run

```text
git source identity
PASS: commit 55b8b7ef60f28dfd52a0ecf82f22efa706d39252
PASS: tree df6433180255d365cfcf58ace5922c124709c0f0

limiter integrity
PASS: no limiter forward/rollback delta in R3
PASS: forward sha256 8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771
PASS: rollback sha256 eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302

npm run db:fda028:hosted:test
PASS: 20 tests, 20 pass, 0 fail

npm run db:pgtap:discover
PASS: problems [], hosted plan 39, negative-control plan 1

node --check scripts/run-fda028-hosted.mjs
PASS

git diff --check 7f604e8..55b8b7e
PASS

Git-blob binding
PASS: exact R3 accepted, four executable artifacts checked
PASS: R2 efd9ddf refused because runner blob differs

direct target refusal
PASS: production ref exit 1, no receipt path
PASS: old-stage ref exit 1, no receipt path
PASS: wrong branch ID exit 1, no receipt path
PASS: prohibited --linked selector exit 1, no receipt path

nonzero propagation simulations
PASS: negative-control status 7 refused; post-state ran; cleanup PASS
PASS: suite status 9 refused; post-state ran; cleanup PASS

adversarial JSON probes
FAIL AS DESIGNED FOR REVIEW: valid main TAP plus extra JSON message record was accepted
FAIL AS DESIGNED FOR REVIEW: full main TAP under arbitrary JSON payload key was accepted
FAIL AS DESIGNED FOR REVIEW: valid negative TAP plus extra JSON message record was accepted
```

No hosted environment was contacted. No database, Vault, limiter implementation, harness source, Git ref, production state, or remote state was mutated by this review.

## What changed

- Added only this R3 independent review report.
- No harness, limiter, migration, rollback, runner, test, config, or receipt source was edited.

## Branch and reviewed identity

```text
branch: codex/flagstone-p03a-takeover-20260914
reviewed repair: 55b8b7ef60f28dfd52a0ecf82f22efa706d39252
reviewed tree: df6433180255d365cfcf58ace5922c124709c0f0
current docs checkpoint observed before this report: b03053a84b6acd6de0ff3867015bb4bd416f16b8
```

The four executable hosted artifacts at the current checkpoint are byte-identical to the reviewed R3 commit.

## What's left

1. Close only the structured-JSON record validation gap.
2. Freeze the resulting executable artifacts and repeat exact independent review.
3. Keep hosted execution blocked until a later exact review returns `FDA028_HARNESS_CODE_REVIEW: PASS`.

## DECISIONS FOR SKY

None. The remaining defect is confined to the already authorized harness result parser and needs no limiter or authority change.
