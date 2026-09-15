# FDA-028 hosted harness repair source freeze R7

```text
STATUS: FROZEN_FOR_INDEPENDENT_CODE_REVIEW
FDA028_HARNESS_REPAIR_SHA: 2a353336d442c5bb79579a2b0154d08aa43806c1
FDA028_HARNESS_REPAIR_TREE: 472559b72421ee1b4f2a7ce12ebe21867c8a0c0d
FDA028_LIMITER_IMPLEMENTATION_BYTES_CHANGED: NO
```

R6 hosted evidence returned 30/31 true assertions and exact cleanup PASS. The sole false result came from placing side-effecting `purge_at()` and the post-purge grant count on opposite sides of one SQL `AND`, whose evaluation order PostgreSQL does not guarantee. R7 saves the purge return value in `v_purged` first, then records assertion 26 from `v_purged > 0` and the post-purge count. No expected result or limiter behavior changed.

## Frozen artifacts

```text
5c09b26ebef64f43e648fa989d18ebcc14c7c983e1dac24b02133c27190ff56e  scripts/run-fda028-hosted.mjs
dae845009d371d00124dd630ee0463ded98937bea93032805023541410c24bf9  scripts/__tests__/fda028HostedHarness.test.mjs
744f14f8371c03c557062547e0499581972556a07c4e5a0b1643670e69b06fc7  supabase/tests/fda028/hosted-state.sql
bade8a9a26677e8b76296ba75a5490fb1178ae98c3e292c35f499d880d5f36e0  supabase/tests/fda028/hosted-negative-control.sql
1d323af5a725ffaf88a113c1da869923864a558dcba3dda53dbdc21b2cd5ea3f  supabase/tests/fda028/hosted-acceptance.sql
```

Accepted limiter hashes remain `8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771` forward and `eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302` rollback.

## Gates

```text
npm run db:fda028:hosted:test
PASS: 20/20

npm run db:pgtap:discover
PASS: problems []

node --check scripts/run-fda028-hosted.mjs
PASS

git diff --check
PASS
```

No new hosted contact occurred during R7 repair. The R6 cleanup receipt remains the latest exact remote state and shows zero flags, buckets, grants, helpers, and queued HTTP residue with accepted config, key state, Vault shape, and ledger identity.

```text
FDA028_HARNESS_CODE_REVIEW: PENDING_R7
PHASE_03A_FRESH_STAGE_GATE: HOLD
```
