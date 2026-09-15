# FDA-028 hosted harness repair — independent code review R2

`REVIEWED_AT_UTC: 2026-09-15`

## Verdict

```text
FDA028_HARNESS_REPAIR_SHA: efd9ddf72d019017ef9f408e8e03e69ef4daafb3
FDA028_HARNESS_REPAIR_TREE: 07fc1881ce31a8f4f528ea1a48a71279b65b67ff
FDA028_LIMITER_IMPLEMENTATION_BYTES_CHANGED: NO
FDA028_HARNESS_CODE_REVIEW: HOLD
HOSTED_EXECUTION_AUTHORIZED_BY_THIS_REVIEW: NO
```

R2 resolves the prior source-boundary, production-parent contact, runtime-role, exact function-key, and constraint-specific category findings for the reviewed invocation. One genuine TAP acceptance defect remains. The repair remains harness-only; no limiter change is needed.

## Blocking finding

### H1 — the hosted TAP gate still accepts an incomplete or invalid assertion stream

`assertSuccessfulTap()` at `scripts/run-fda028-hosted.mjs:131-150` requires only one unique plan value and a matching sequence of numbered `ok` lines. It does not require the hosted suite's frozen plan of 39, does not require a positive plan, and does not reject a plan-level skip directive. Direct local probes produced:

```text
input: 1..0 # SKIP unavailable
result: ACCEPTED { plan: 0, passed: 0, failed: 0 }

input: WARNING: partial result + 1..1 + ok 1
result: ACCEPTED { plan: 1, passed: 1, failed: 0 }
```

The same hazard remains in the deliberate negative-control path. `assertNegativeControl()` at lines 119-129 parses counts and description only; it does not run the bailout/diagnostic checks used by `assertSuccessfulTap()`. Direct probes confirmed that each of these was accepted as a valid negative control:

```text
1..1
not ok 1 - FDA028 deliberate runner negative control
Bail out! transport lost

1..1
not ok 1 - FDA028 deliberate runner negative control
  ---
  message: bad
  ...
```

**Impact:** a hosted receipt can say PASS without the frozen 39 assertions having run, or after the negative control emitted a TAP bailout/diagnostic. Git-blob binding prevents source substitution, but it does not make an invalid or misframed execution result valid. This is the exact false-positive class the negative control and raw TAP gate are meant to prevent.

**Required harness-only repair:**

1. Require `plan === 39` for `hosted-acceptance.sql`, and require `plan === 1` for the negative control.
2. Reject plan-level `# SKIP` and `# TODO`, including `1..0` whole-suite skips; require `plan > 0` generically.
3. Apply bailout, YAML diagnostic, diagnostic-comment, and unexpected-record checks to both the successful suite and the negative control.
4. Parse the Supabase JSON result shape or otherwise reject unexpected stdout records instead of scanning through arbitrary leading output.
5. Add local negative tests for the four accepted examples above.

## Prior finding disposition

| Prior finding / required domain | R2 result | Evidence |
|---|---|---|
| Harness-only scope | PASS | The R2 code delta changes only `scripts/run-fda028-hosted.mjs`, its Node tests, and `supabase/tests/fda028/hosted-acceptance.sql`. Forward and rollback limiter hashes remain exact. |
| Reviewed Git-blob binding | PASS for exact R2 invocation | `--reviewed-sha` is mandatory and canonical; `assertReviewedArtifacts()` requires that SHA to be an ancestor and compares all four executable hosted files to its Git blobs before each query and after state queries. `efd9ddf...` passed; the changed R1 blobs at `4370ac9...` were refused. This review authorizes only `--reviewed-sha efd9ddf72d019017ef9f408e8e03e69ef4daafb3`. |
| No production or old-stage contact | PASS | The production-parent `branches list` call is removed. The only network operation in the runner is `supabase db query --project-ref <validated exact fresh ref>`. Production, old stage, unknown refs, linked/local/DB-URL/profile/workdir selectors are refused before any network call. |
| Exact fresh target | PASS within the approved contract | Exact project-ref and branch-ID tokens are mandatory. The connection uses only the exact fresh project ref; the first read checks the complete 103-row ordered ledger digest, latest version, accepted config, Vault shape, exact function keys, and empty residue state. The branch-ID token is recorded but not independently derived from the database; project ref plus full database identity supplies the live target proof authorized for R2. |
| Real `service_role` invocation | PASS | `hosted-acceptance.sql:312-330` grants only the temp result-table insert needed by the harness, sets local role to `service_role`, executes the real clockless function, resets role, and proves the real flag row. Everything remains inside the final rollback. |
| TAP skip/TODO/bailout/diagnostics | HOLD | Assertion-line SKIP/TODO, success-path bailout/YAML/comment diagnostics, and stderr are rejected. Plan-level skip, wrong-plan PASS, unexpected stdout, and negative-control bailout/YAML remain accepted. |
| Unexpected stderr | PASS | Every hosted query passes through `assertAllowedStderr`; only the two exact Supabase CLI version-notice lines are allowed. Unexpected stderr prevents PASS and is stored through the redaction path. |
| Exact function keys | PASS | The state contract requires exactly `clockless_flag`, `clocked_flag`, `purge`, and `purge_at`, all true. Empty or extra-key objects fail. |
| Constraint-specific `ramp` control | PASS | The caught `check_violation` must name `flags_category_check`; another constraint failure records false and fails its pgTAP assertion. |
| Config and 600-second coupling | PASS | Accepted 86400-second config is preflighted; bounded 60-second timing is derived inside the rollback transaction. No 600-second literal remains. |
| Vault and `dev_key_material` coupling | PASS | Hosted state requires one 32-byte Vault-backed key and absence of `limiter.dev_key_material`; the suite neither writes nor creates fixture key material. |
| Cleanup on PASS/FAIL | PASS for modeled state | Suite mutation is one rollback-only transaction. Protocol post-state runs after suite success, assertion failure, SQL failure, stderr failure, or artifact mismatch after mutation begins, and compares the complete captured state. Preflight failures occur before mutation. |
| Residual contamination | PASS | State comparison covers flags, buckets, grants, config, key state, Vault shape, helper count, queued HTTP count, ledger, and exact function contract. Temporary table grants and role changes are transaction/session bounded. |

## Additional attack results

- Artifact checks run before and after the pre-state query, before negative control and suite execution, and before and after the post-state query. No post-execution source-tamper window affects the hosted result.
- Suite SQL error, TAP failure, stderr rejection, and cleanup mismatch all produce nonzero/HOLD through `executeProtocol()`.
- A post-state query failure produces cleanup `HOLD`; a pre-state failure occurs before any mutating SQL.
- Raw stdout contains only the reviewed state/TAP query results. Stderr storage redacts password-bearing PostgreSQL URLs, JWT-shaped values, and `sb_secret_` keys.
- No new limiter, Vault, config, target-selection, or cleanup defect was found beyond the TAP result-validation issue above.

## Local gates run

```text
git source identity
PASS: commit efd9ddf72d019017ef9f408e8e03e69ef4daafb3
PASS: tree 07fc1881ce31a8f4f528ea1a48a71279b65b67ff

limiter integrity
PASS: no forward/rollback limiter diff in the R2 code commit
PASS: forward sha256 8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771
PASS: rollback sha256 eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302

npm run db:fda028:hosted:test
PASS: 20 tests, 20 pass, 0 fail

npm run db:pgtap:discover
PASS: problems [], hosted plan 39, negative-control plan 1

node --check scripts/run-fda028-hosted.mjs
PASS

git diff --check 2b1bef4..efd9ddf
PASS

Git-blob binding probes
PASS: exact R2 efd9ddf accepted, four executable artifacts checked
PASS: R1 4370ac9 refused because hosted SQL differs
PASS: current docs-only descendant accepted because all four executable blobs remain byte-identical

direct target refusal probes
PASS: production ref exit 1, no receipt path
PASS: old-stage ref exit 1, no receipt path
PASS: prohibited --linked selector exit 1, no receipt path
PASS: missing --reviewed-sha exit 1, no receipt path

adversarial TAP probes
FAIL AS DESIGNED FOR REVIEW: 1..0 whole-suite SKIP was accepted as zero-failure PASS
FAIL AS DESIGNED FOR REVIEW: wrong one-assertion plan with leading warning was accepted
FAIL AS DESIGNED FOR REVIEW: negative-control bailout was accepted
FAIL AS DESIGNED FOR REVIEW: negative-control YAML diagnostics were accepted
```

No hosted environment was contacted. No database, Vault, limiter implementation, harness source, Git ref, production state, or remote state was mutated by this review.

## What changed

- Added only this R2 independent review report.
- No harness, limiter, migration, rollback, runner, test, config, or receipt source was edited.

## Branch and reviewed identity

```text
branch: codex/flagstone-p03a-takeover-20260914
reviewed repair: efd9ddf72d019017ef9f408e8e03e69ef4daafb3
reviewed tree: 07fc1881ce31a8f4f528ea1a48a71279b65b67ff
current docs checkpoint observed before this report: 195c88e96f7fd8d8ce68df14c0d20067d1e2e031
```

The four executable hosted artifacts at the current checkpoint are byte-identical to the reviewed R2 commit.

## What's left

1. Repair only the TAP validation defect above.
2. Freeze the resulting executable artifacts and repeat exact independent review.
3. Keep hosted execution blocked until a subsequent exact review returns `FDA028_HARNESS_CODE_REVIEW: PASS`.

## DECISIONS FOR SKY

None. The remaining finding is a genuine harness false-positive path within the already authorized repair scope. It does not require a limiter change or expanded authority.
