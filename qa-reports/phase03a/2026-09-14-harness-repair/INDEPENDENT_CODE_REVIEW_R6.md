# FDA-028 hosted harness repair — independent code review R6

**Review date:** 2026-09-14

**Reviewer lane:** narrow independent CODE re-review; source and banked evidence only

**Executable source commit:** `48e8732b3437943716b347cc84cc06adf9aefff0`

**Executable source tree:** `910b8dc152f9522ba331931aa8cfa947874a9de2`

**Docs/evidence checkpoint:** `7655c3692c486efdabe94bc8b33e841c6a249feb`

**Verdict:** `FDA028_HARNESS_CODE_REVIEW: PASS`

## Scope and safety

The R5 bounded run correctly stopped after its negative-control exception reached fresh staging and the strict R5 parser rejected the newly observed Management API wrapper. Its main proof did not run and its full post-state matched pre-state. R6 changes only the rollback-evidence parser and its Node tests to add that exact observed wrapper as a second transport contract.

I reviewed the exact R6 Git objects, the R5-to-R6 source delta, the committed R5 run receipt and raw files at commit `923fda7e284cd4dd80efa5745f4c1c85df2e69ff`, `HOSTED_RUN_R5_HOLD.md`, and `SOURCE_FREEZE_R6.md`. I made no hosted or control-plane call and contacted neither production nor old staging. I did not edit any runner, test, SQL, limiter, migration, or rollback source. The only repository change from this review is this report.

## Verdict

R6 is a narrow, fail-closed harness parser repair. It accepts exactly two structured Supabase CLI error forms:

1. the previously measured direct database `LegacyDbQueryExecError`; and
2. the banked Management API `LegacyDbQueryUnexpectedStatusError`, HTTP 400 body, PostgreSQL `ERROR` / `P0001`, required rollback marker, terminal inline-code-block `RAISE` context, and exact evidence payload.

Both routes converge on the unchanged version/kind/plan/assertion validator. No parser path can produce PASS from an HTTP error without the correct marker, complete assertion payload, expected plan, sequential unique assertion records, Boolean results, and all 31 main assertions true. Proof commands must also exit nonzero, and exact cleanup still runs after every primary failure.

The exact R6 repair is authorized for the continued already owner-authorized bounded fresh-stage validation, using:

```text
--project-ref cepayqmsoqxshsiyqnvz
--branch-id 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
--reviewed-sha 48e8732b3437943716b347cc84cc06adf9aefff0
```

This PASS authorizes only that continued bounded disposable fresh-stage harness validation. It is not production, push, merge, release, or Phase 03B authority, and it is not itself hosted acceptance evidence.

## Findings

No review-blocking defect remains.

### Both measured envelopes are strict

The outer output must parse as one JSON document with only `_tag,error`; `_tag` must be `Error`; and `error` must contain only `code,message`.

The direct route requires exact code `LegacyDbQueryExecError` and exact leading text:

```text
failed to execute query: error: <required marker><payload>
```

The hosted route requires exact code `LegacyDbQueryUnexpectedStatusError` and exact `unexpected status 400: ` framing. The remaining text must parse wholly as one JSON body with only `message`. That message must begin with:

```text
Failed to run sql query: ERROR:  P0001: <required marker><payload>
```

and end with exactly one positive-integer inline-block context line:

```text
CONTEXT:  PL/pgSQL function inline_code_block line <positive integer> at RAISE
```

The line number may vary between the 16-line negative block and the longer main block, but it must be a canonical positive integer. The context is anchored to the end and removed before the payload is parsed. Extra context, detail, hint, diagnostic, or suffix text therefore makes the payload or wrapper invalid.

I independently accepted both valid wrapper variants for the negative and 31-assertion main payloads. I rejected:

- outer prefix/suffix records and extra outer or error keys;
- unknown error codes and HTTP 200, 401, and 500;
- malformed, absent, non-object, or extra-key HTTP bodies;
- altered severity or SQLSTATE;
- wrong negative/main markers;
- context line zero, leading-zero line numbers, missing final newline, missing context, and extra detail/hint/suffix text;
- extra payload keys, version/kind/plan/count drift, plan zero, and empty assertions;
- a structurally valid main payload containing one false assertion.

The exact banked R5 negative stdout parses under R6 as plan 1, passed 0, failed 1, deliberate negative detected true.

### Nonzero and false-PASS behavior remain sound

The wrapper alone is insufficient. `executeProtocol()` rejects either proof if the subprocess exits zero before parsing its output. My zero-exit negative simulation used an otherwise exact hosted wrapper; it still failed, skipped the main proof, ran the post-state check, and preserved overall HOLD.

A complete capture-only fake-CLI run exercised pre-state, hosted-wrapped negative control, hosted-wrapped main proof, and post-state. The runner produced PASS only with the exact deliberate false negative assertion, 31 true main assertions, nonzero proof statuses, and equal pre/post state.

Unexpected stderr remains independently fatal. Receipt PASS continues to require successful parsing, the exact negative result, all main results, and cleanup. Parser or assertion failure cannot be converted into PASS by the Management API's HTTP status wrapper.

## Banked R5 evidence

The committed raw-file hashes independently match `HOSTED_RUN_R5_HOLD.md`. The receipt records:

```text
reviewed SHA: f7fecc01fc7e13b3590becb5fb928e98f6eb2283
target project: cepayqmsoqxshsiyqnvz
target branch: 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
status: HOLD
negativeControl: null
hostedAcceptance: null
cleanup: PASS
```

The pre and post raw JSON differ only in their per-response safety boundary. After exact envelope parsing, their complete state objects compare equal. Both pass the accepted 103-row ledger, empty flags/buckets/grants/helpers/HTTP queue, Vault shape, absent `dev_key_material`, accepted config, key state, and exact function-contract checks.

The only proof raw file is `negative.stdout.txt`; no suite raw file exists and `hostedAcceptance` is null. This corroborates that the negative statement reached the fresh stage, raised its required exception, and rolled back; the R5 parser then stopped the protocol before the main proof. The banked evidence supports the claimed harness-wrapper mismatch and cleanup PASS. It provides no main hosted result, and none is claimed.

## R4/R5 regression and source integrity

The R6 executable commit changes only:

```text
scripts/run-fda028-hosted.mjs
scripts/__tests__/fda028HostedHarness.test.mjs
```

The exact R5 target transport remains unchanged: internal `--linked` is paired with the explicit exact fresh ref, while user selectors remain refused. The state, negative, and main SQL files are byte-identical to R4/R5:

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

All five executable hashes match `SOURCE_FREEZE_R6.md`. Reviewed-source binding accepts exact R6 and refuses R5 because the runner bytes differ. The prior single-statement rollback, real schema/config/Vault/function/role checks, constraint-specific ramp control, removal of the 600-second and `dev_key_material` couplings, deterministic inputs, target refusal, raw evidence, cleanup, and residue guarantees remain unchanged.

## Gates run

```text
npm run db:fda028:hosted:test
PASS: 20 tests; 20 pass; 0 fail; 0 skipped; 0 todo

node --check scripts/run-fda028-hosted.mjs
PASS

artifact sha256 verification
PASS: runner/tests/three hosted SQL files match R6 freeze
PASS: limiter forward and rollback match accepted hashes

independent parser adversarial checks
PASS: both measured wrappers accepted
PASS: exact banked R5 negative accepted
PASS: HTTP/body/SQLSTATE/context/framing/payload/result drift rejected

independent protocol checks
PASS: zero proof exit refused and post cleanup still ran
PASS: full hosted-wrapper simulation required negative, 31/31 main, and cleanup

banked pre/post evidence parse
PASS: exact envelopes accepted; complete parsed states equal

reviewed-source binding
PASS: exact R6 accepted; R5 refused

git diff --check
PASS
```

## Limits

No new hosted contact occurred. R6's handling of the main Management API wrapper is tested against the same measured wrapper shape with the main marker and locally validated 31-assertion payload. The actual R6 main hosted proof remains unrun. Its result and rollback must be established by the continued bounded validation and independently reviewed before any FDA-028 hosted-acceptance claim.

## What's left

Continue the exact bounded fresh-stage validation with R6. Preserve the new raw negative, main, pre, and post outputs and receipt; verify exact cleanup; and independently review that evidence.

## DECISIONS FOR SKY

No new decision is required before continuing the already owner-authorized bounded fresh-stage validation. Recommendation: run exact R6 with the three pinned identity arguments above. The alternative is to retain HOLD without completing the main hosted proof.
