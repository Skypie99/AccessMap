# FDA-028 hosted harness repair source freeze R6

`STATUS: FROZEN_FOR_INDEPENDENT_CODE_REVIEW`

## Frozen identity

```text
branch: codex/flagstone-p03a-takeover-20260914
FDA028_HARNESS_REPAIR_SHA: 48e8732b3437943716b347cc84cc06adf9aefff0
FDA028_HARNESS_REPAIR_TREE: 910b8dc152f9522ba331931aa8cfa947874a9de2
```

## Exact repair

R5 failed closed after the fresh-stage negative control exposed the Management API's exact exception wrapper. R6 adds that measured wrapper as a second strict transport contract:

```text
outer error code: LegacyDbQueryUnexpectedStatusError
HTTP status: exactly 400
inner body keys: exactly message
PostgreSQL severity/state: exactly ERROR / P0001
required marker: FDA028_ROLLBACK_NEGATIVE| or FDA028_ROLLBACK_RESULT|
required context: exactly inline_code_block line <positive integer> at RAISE
payload: unchanged exact version/kind/plan/assertion schema
```

The already measured direct-database `LegacyDbQueryExecError` contract remains accepted. Every unrecognized code, status, body key, SQLSTATE, context, suffix, marker, payload key, plan, or assertion result is rejected.

## Frozen artifacts

```text
5c09b26ebef64f43e648fa989d18ebcc14c7c983e1dac24b02133c27190ff56e  scripts/run-fda028-hosted.mjs
221e4f6e59e7ee9f71672eb941a5cf8aa255b8619c87d41b75c5c784d29ea0c0  scripts/__tests__/fda028HostedHarness.test.mjs
744f14f8371c03c557062547e0499581972556a07c4e5a0b1643670e69b06fc7  supabase/tests/fda028/hosted-state.sql
bade8a9a26677e8b76296ba75a5490fb1178ae98c3e292c35f499d880d5f36e0  supabase/tests/fda028/hosted-negative-control.sql
ba864a0ff9cccfdd27a9a160c82255d2ae9f25ac9e2bf0057cf071c571f70918  supabase/tests/fda028/hosted-acceptance.sql
```

## Limiter integrity

```text
FDA028_LIMITER_IMPLEMENTATION_BYTES_CHANGED: NO
forward sha256: 8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771
rollback sha256: eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302
```

## Gates

```text
npm run db:fda028:hosted:test
PASS: 20 tests, 20 pass, 0 fail

exact banked R5 hosted negative-control stdout
PASS: parsed as plan 1, passed 0, failed 1, detected true

hosted-wrapper adversarial tests
PASS: wrong status, extra body key, wrong SQLSTATE, zero line, and appended context rejected

node --check scripts/run-fda028-hosted.mjs
PASS

git diff --check
PASS
```

The R5 hosted attempt ran no main proof and left exact cleanup PASS. No new hosted contact occurred during R6 repair. Hosted proof execution remains blocked until independent R6 CODE review PASS.

```text
FDA028_HARNESS_CODE_REVIEW: PENDING_R6
PHASE_03A_FRESH_STAGE_GATE: HOLD
```
