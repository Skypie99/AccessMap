# FDA-028 hosted harness R6 continuation bank

`BANKED_AT_UTC: 2026-09-15T02:06:10Z`

```text
RUN_UNIT: FDA028_HOSTED_HARNESS_REPAIR
STATUS: PREPARED_FOR_CONTINUED_BOUNDED_FRESH_STAGE_VALIDATION
FDA028_HARNESS_REPAIR_SHA: 48e8732b3437943716b347cc84cc06adf9aefff0
FDA028_HARNESS_REPAIR_TREE: 910b8dc152f9522ba331931aa8cfa947874a9de2
FDA028_HARNESS_CODE_REVIEW: PASS
review report commit: 2870a37dcae9dfd007802f61906db89355e9f21c
FDA028_LIMITER_IMPLEMENTATION_BYTES_CHANGED: NO
worktree: clean
```

## Latest exact remote state

The R5 post-state ran after its negative-control parser HOLD and matched pre-state exactly:

```text
project ref: cepayqmsoqxshsiyqnvz
branch id: 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
ledger: 103 rows; latest 20260913080000
ledger sha256: 9c7301f4e0880905a84b1e27a9360afc229034042506d1b651700643fc0c8316
flags / buckets / grants / helpers / queued_http: 0 / 0 / 0 / 0 / 0
Vault secret rows / key bytes: 1 / 32
dev_key_material: absent
config, key state, function contract: exact accepted values
cleanup: PASS
```

No main statement ran in R5. No current operation is recorded as `RUNNING`, `APPLIED_NOT_VERIFIED`, or `OUTCOME_UNKNOWN`.

## Exact executable hashes

```text
5c09b26ebef64f43e648fa989d18ebcc14c7c983e1dac24b02133c27190ff56e  scripts/run-fda028-hosted.mjs
744f14f8371c03c557062547e0499581972556a07c4e5a0b1643670e69b06fc7  supabase/tests/fda028/hosted-state.sql
bade8a9a26677e8b76296ba75a5490fb1178ae98c3e292c35f499d880d5f36e0  supabase/tests/fda028/hosted-negative-control.sql
ba864a0ff9cccfdd27a9a160c82255d2ae9f25ac9e2bf0057cf071c571f70918  supabase/tests/fda028/hosted-acceptance.sql
```

Accepted limiter hashes remain `8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771` forward and `eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302` rollback.

## Exact command

```text
npm run db:fda028:hosted -- --project-ref cepayqmsoqxshsiyqnvz --branch-id 4a37413a-01c2-4ab2-8bf8-a17a42a549b8 --reviewed-sha 48e8732b3437943716b347cc84cc06adf9aefff0 --receipt-dir qa-reports/phase03a/2026-09-14-harness-repair/hosted-run-20260915T020610Z
```

Expected bounded temporary effects and rollback procedure are unchanged from `PRELIMIT_BANK_R5.md`. The negative control and main proof each end in a required exception; the main statement's temporary config, flags, limiter ledgers, key state, and Vault update must all roll back. The final state query must match the latest exact state above.

```text
FRESH_STAGE_MUTATION: AUTHORIZED_FOR_THIS_CONTINUED_REVIEWED_RUN
OLD_STAGING_AUTHORITY: NONE
PRODUCTION_AUTHORITY: NONE
PUSH_AUTHORITY: NONE
MAIN_MERGE_AUTHORITY: NONE
PHASE_03B_AUTHORITY: NONE
```
