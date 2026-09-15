# FDA-028 hosted harness repair source freeze R4

`RUN_UNIT: FDA028_HOSTED_HARNESS_REPAIR`

`STATUS: FROZEN_FOR_INDEPENDENT_CODE_REVIEW`

## Frozen identity

```text
branch: codex/flagstone-p03a-takeover-20260914
FDA028_HARNESS_REPAIR_SHA: 8940725b77bc5b79567179b1dc33186c6fdacc68
FDA028_HARNESS_REPAIR_TREE: 89cde783191b707cc3feb997472828e1e1f7db35
```

## R4 repair

Supabase CLI 2.116.0 was measured against disposable local PostgreSQL before this freeze. `supabase db query --file ... --output-format json` refuses multiple SQL commands in one prepared statement. A single `DO` statement ending in an intentional exception returns one exact JSON error envelope and rolls back all work performed by the statement.

R4 therefore:

- makes the negative control and main hosted proof exactly one `DO` statement each;
- returns versioned per-assertion JSON in the intentional rollback exception message;
- requires the exact measured CLI error envelope, code, marker, payload keys, plan, assertion keys, sequential numbers, unique descriptions, and Boolean outcomes;
- rejects normal exit zero for both rollback-enforced proof statements;
- strictly validates the measured successful state-query envelope and dynamic boundary warning;
- independently rechecks the entire accepted pre-state after every proof outcome;
- preserves the exact target refusal, reviewed Git-blob binding, raw-output capture, Vault non-disclosure, and limiter-byte guards from R3.

## Frozen artifact hashes

```text
a6cf3f14756c814fccf8c8e4f7bcd5221d7ef94a48e3213f88b52984c14d49a9  scripts/run-fda028-hosted.mjs
9e5a268eee17b5a0d1c72af12c268ec82cf08c75f6719d8ecab6fc2f9853bb04  scripts/__tests__/fda028HostedHarness.test.mjs
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

## Local gates

```text
npm run db:fda028:hosted:test
PASS: 18 tests, 18 pass, 0 fail

node --check scripts/run-fda028-hosted.mjs
PASS

npm run db:pgtap:discover
PASS: problems []
PASS: both hosted proof files discovered as raising-proof single statements

npm run db:replay -- --with-next --local-only --phase03a-privileges-only --json
PASS: LOCAL_REPLAY_ONLY
PASS: LOCAL_PRIVILEGE_GUARD_PASS
PASS: tcpDisabled true, productionInputsAccepted false, globalPostgresUnchanged true, tempDestroyed true

git diff --check
PASS

disposable CLI negative-control execution
PASS: process exit 1
PASS: exact LegacyDbQueryExecError envelope and FDA028_ROLLBACK_NEGATIVE marker
PASS: exact deliberate false assertion parsed by the committed runner

disposable PostgreSQL role probe
PASS: SET LOCAL ROLE service_role executed inside one DO statement
```

No hosted environment, production environment, old staging environment, remote Git ref, or limiter implementation was contacted or mutated during R4 repair and local acceptance.

## Review gate

```text
FDA028_HARNESS_CODE_REVIEW: PENDING
HOSTED_EXECUTION: BLOCKED_PENDING_REVIEW_PASS
```
