# FDA-028 hosted harness repair — independent code review R5

**Review date:** 2026-09-14

**Reviewer lane:** narrow independent CODE re-review; local, source, and banked evidence only

**Executable source commit:** `f7fecc01fc7e13b3590becb5fb928e98f6eb2283`

**Executable source tree:** `c0fb874137ee34af166f2f6c8670119377a3e8e7`

**Docs/evidence checkpoint:** `c5e4834e4751a9f622f2264b6cdba722cddcfb78`

**Verdict:** `FDA028_HARNESS_CODE_REVIEW: PASS`

## Scope and safety

R4 PASS was correctly invalidated after the first owner-authorized read-only preflight showed that Supabase CLI 2.116.0 rejects `--project-ref` unless the command also selects its `--linked` remote transport. I reviewed the exact R5 Git objects, the R4-to-R5 source delta, `REMOTE_TRANSPORT_DIAGNOSIS.md`, its four raw files, `SOURCE_FREEZE_R5.md`, and the unchanged R4 proof and cleanup design.

I made no hosted or control-plane call. I did not contact production, old staging, or any remote Git ref. I did not edit the runner, tests, SQL, limiter migration, or rollback. The only repository change from this review is this report.

## Verdict

R5 is a narrow harness transport correction. Its internally generated CLI command uses `--linked` only as the CLI-required remote mode and supplies the exact fresh-stage project ref in the same frozen argument array. No user value controls the internal `--linked` token, project ref, or SQL file. No persisted link state exists in this checkout, yet the banked exact R5 transport returned the accepted fresh-stage database identity. The successful transport therefore could not have fallen back to a persisted project selection.

All R4 source, rollback, structured evidence, nonzero propagation, target refusal, cleanup, residue, deterministic behavior, real schema/config/Vault/function/role compatibility, and fixture-coupling conclusions remain intact.

The exact R5 repair is authorized for the already owner-authorized bounded fresh-stage execution, using:

```text
--project-ref cepayqmsoqxshsiyqnvz
--branch-id 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
--reviewed-sha f7fecc01fc7e13b3590becb5fb928e98f6eb2283
```

This is only authorization for that bounded disposable fresh-stage harness run under the existing owner authorization. It is not production, push, merge, release, or Phase 03B authority.

## R5 transport review

### Explicit target remains authoritative

`buildDbQueryArgs()` refuses every project ref except `cepayqmsoqxshsiyqnvz`. For each internal query it constructs:

```text
db query --linked --project-ref cepayqmsoqxshsiyqnvz --file <frozen path> --output-format json
```

Supabase CLI 2.116.0's local help describes `--linked` as the remote Management API mode and `--project-ref` as the Supabase project ref. Its measured failure without `--linked` says `--project-ref` applies when targeting the linked project and must be combined with `--linked`. R5 follows that exact measured contract.

The checkout currently has neither `supabase/.temp/project-ref` nor `supabase/.temp/linked-project.json`. The banked successful command nonetheless returned the exact accepted fresh-stage state. This independently shows that `--linked` did not require or obtain a target from persisted link state; the explicit project ref supplied it.

The public runner arguments still refuse user-supplied `--linked`, `--local`, `--db-url`, `--profile`, and `--workdir`, as well as duplicate, missing, noncanonical, production, old-stage, unexpected-project, and wrong-branch inputs. Direct local invocations with the production ref, old-stage ref, another ref, and prohibited selectors each exited 1 before any command execution and created no receipt directory.

I ran the complete runner against a local capture-only fake `supabase` executable. It recorded exactly four calls in order: pre-state, negative control, main proof, and post-state. Every call contained exactly one `--project-ref`, the exact fresh ref, the internal `--linked` token, the expected frozen file, and JSON output mode. The simulated exact envelopes produced PASS only after the negative control, 31/31 main assertions, and pre/post cleanup comparison succeeded.

### Allowed stderr remains fail-closed

R5 adds only the exact measured line:

```text
Initialising login role...
```

The matcher remains line-exact. Altered capitalization, suffix text, trailing spaces, and any additional warning or fatal line were rejected locally. Accepting this informational line cannot create PASS: state stdout must still be one exact success envelope, proof stdout must still be one exact rollback-error envelope, process statuses must match their contracts, and the complete post-state must equal pre-state.

### Banked read-only preflight is valid

The four raw evidence files independently match the hashes in `REMOTE_TRANSPORT_DIAGNOSIS.md`. The first stdout is the exact CLI error envelope proving that `--project-ref` without `--linked` failed before query execution. Its stderr is empty.

The corrected command's stdout parses through the exact committed `extractState()` and passes `assertPreflightState()`. It contains:

- the 103-row migration ledger, latest version `20260913080000`, and accepted ordered digest;
- zero flags, buckets, grants, helpers, and queued HTTP rows;
- one Vault row and a 32-byte readable limiter key, without key material;
- absent `limiter.dev_key_material`;
- the complete accepted 86400-second config;
- exact true keys for the clockless, clocked, purge, and purge-at functions;
- the fresh key-state seed.

Its stderr consists only of `Initialising login role...` and the two measured CLI version-notice lines. The banked evidence is therefore a valid read-only fresh-state preflight. It is not proof that the negative control or main hosted acceptance ran; the diagnosis explicitly records that neither did.

## R4 guarantees and source integrity

The R5 executable commit changes only:

```text
scripts/run-fda028-hosted.mjs
scripts/__tests__/fda028HostedHarness.test.mjs
```

The three SQL files are byte-identical to R4. Their hashes remain:

```text
744f14f8371c03c557062547e0499581972556a07c4e5a0b1643670e69b06fc7  supabase/tests/fda028/hosted-state.sql
bade8a9a26677e8b76296ba75a5490fb1178ae98c3e292c35f499d880d5f36e0  supabase/tests/fda028/hosted-negative-control.sql
ba864a0ff9cccfdd27a9a160c82255d2ae9f25ac9e2bf0057cf071c571f70918  supabase/tests/fda028/hosted-acceptance.sql
```

The accepted limiter and rollback remain byte-for-byte unchanged:

```text
8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771  supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql
eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302  supabase/migrations-next/phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql
```

The five executable artifact hashes match `SOURCE_FREEZE_R5.md`. Exact reviewed-source binding accepts R5 and refuses R4 because the runner bytes differ. The runner rechecks reviewed Git blobs and in-memory artifact hashes around execution as before.

R5 does not change the one-statement rollback proofs, exact JSON envelope validation, plan 31, negative control, real `service_role` execution, constraint-specific `ramp` rejection, valid `no_ramp` fixtures, config-derived timing, Vault path, removal of `dev_key_material`, cleanup-after-failure behavior, or residual-state comparison already independently exercised in R4.

## Gates run

```text
npm run db:fda028:hosted:test
PASS: 19 tests; 19 pass; 0 fail; 0 skipped; 0 todo

node --check scripts/run-fda028-hosted.mjs
PASS

banked raw state parsed with exact R5 runner
PASS: exact state envelope, accepted preflight state, and exact allowed stderr
PASS: initial failed-transport envelope rejected as state evidence

independent target/source adversarial checks
PASS: bad project refs and all user transport selectors refused
PASS: exact R5 reviewed Git blobs accepted; R4 reviewed SHA refused

complete capture-only fake-CLI runner protocol
PASS: four exact internally linked plus explicit-ref commands
PASS: PASS required negative control, plan 31/31, and exact cleanup

direct refusal invocations
PASS: production, old stage, another ref, linked, local, profile, and workdir all exited 1 with no receipt

stderr adversarial checks
PASS: exact measured line accepted; variants and additional diagnostics rejected

git diff --check
PASS
```

## Limits

No new live query was permitted or needed. This review validates R5's source and the already banked read-only response. The main hosted proof remains unrun under R5, so FDA-028 hosted acceptance must remain unclaimed until the bounded execution finishes with its raw evidence, PASS receipt, exact rollback, and independent evidence review.

## What's left

Run exact R5 once under the existing bounded fresh-stage authorization. Preserve all raw outputs and the receipt, verify exact cleanup, and independently review the resulting hosted evidence.

## DECISIONS FOR SKY

No new decision is required before the already owner-authorized bounded fresh-stage run. Recommendation: execute exact R5 with the three pinned identity arguments above. The alternative is to leave hosted reproducibility on HOLD without testing the corrected CLI transport.
