# FDA-028 hosted harness repair source freeze R5

`STATUS: FROZEN_FOR_INDEPENDENT_CODE_REVIEW`

## Frozen identity

```text
branch: codex/flagstone-p03a-takeover-20260914
FDA028_HARNESS_REPAIR_SHA: f7fecc01fc7e13b3590becb5fb928e98f6eb2283
FDA028_HARNESS_REPAIR_TREE: c0fb874137ee34af166f2f6c8670119377a3e8e7
```

R5 changes only the runner and its Node tests after the R4 read-only preflight proved the CLI transport flag was incomplete. It adds the CLI-required `--linked` remote mode internally beside the already validated exact `--project-ref`, permits the newly measured `Initialising login role...` stderr line, and freezes the command constructor to the fresh project and four recognized hosted SQL files. Callers still cannot supply a linked or alternative selector.

## Frozen artifact hashes

```text
77eedbc4550e6418f68dd74ac9ff9b3f200d59f4021f5c3cf88e169cd04c2980  scripts/run-fda028-hosted.mjs
e71f8a5107d2db58751ce355e46b13c9de9abe3b49f5661c2f538025287130af  scripts/__tests__/fda028HostedHarness.test.mjs
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
PASS: 19 tests, 19 pass, 0 fail

node --check scripts/run-fda028-hosted.mjs
PASS

git diff --check
PASS

fresh-stage read-only state query using exact R5 transport
PASS: exact state envelope and accepted preflight state
PASS: 103-row ledger with accepted digest; zero flags/buckets/grants/residue
PASS: one 32-byte Vault key; accepted config and function contract
```

The R4 CODE review PASS does not transfer across this source change. Hosted mutation remains blocked until an independent reviewer returns PASS for exact R5.

```text
FDA028_HARNESS_CODE_REVIEW: PENDING_R5
HOSTED_EXECUTION: BLOCKED_PENDING_R5_REVIEW_PASS
```
