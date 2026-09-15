# FDA-028 hosted harness R5 pre-limit bank

`BANKED_AT_UTC: 2026-09-15T01:57:36Z`

`RUN_UNIT: FDA028_HOSTED_HARNESS_REPAIR`

`STATUS: PREPARED_FOR_ONE_BOUNDED_FRESH_STAGE_RUN`

## Reviewed repair

```text
branch: codex/flagstone-p03a-takeover-20260914
FDA028_HARNESS_REPAIR_SHA: f7fecc01fc7e13b3590becb5fb928e98f6eb2283
FDA028_HARNESS_REPAIR_TREE: c0fb874137ee34af166f2f6c8670119377a3e8e7
FDA028_HARNESS_CODE_REVIEW: PASS
review report commit: 637d60cb446366d183e75a73490e44ddbd351aea
worktree: clean
```

The accepted limiter bytes remain unchanged:

```text
8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771  supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql
eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302  supabase/migrations-next/phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql
```

## Exact executable artifact hashes

```text
77eedbc4550e6418f68dd74ac9ff9b3f200d59f4021f5c3cf88e169cd04c2980  scripts/run-fda028-hosted.mjs
744f14f8371c03c557062547e0499581972556a07c4e5a0b1643670e69b06fc7  supabase/tests/fda028/hosted-state.sql
bade8a9a26677e8b76296ba75a5490fb1178ae98c3e292c35f499d880d5f36e0  supabase/tests/fda028/hosted-negative-control.sql
ba864a0ff9cccfdd27a9a160c82255d2ae9f25ac9e2bf0057cf071c571f70918  supabase/tests/fda028/hosted-acceptance.sql
```

## Exact target and latest state

```text
project ref: cepayqmsoqxshsiyqnvz
branch id: 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
branch class: disposable fresh staging
ledger count: 103
latest ledger version: 20260913080000
ordered ledger sha256: 9c7301f4e0880905a84b1e27a9360afc229034042506d1b651700643fc0c8316
flags: 0
buckets: 0
grants: 0
helpers: 0
queued_http: 0
Vault secret rows: 1
Vault key bytes: 32
dev_key_material exists: false
config: exact accepted contract
function contract: exact accepted four-function contract
```

Source: `prelimit-20260915T0145Z/hosted-state-linked-explicit.stdout.json`, read-only and parsed successfully through exact R5. No current operation is recorded as `RUNNING`, `APPLIED_NOT_VERIFIED`, or `OUTCOME_UNKNOWN`.

## Exact runner command

```text
npm run db:fda028:hosted -- --project-ref cepayqmsoqxshsiyqnvz --branch-id 4a37413a-01c2-4ab2-8bf8-a17a42a549b8 --reviewed-sha f7fecc01fc7e13b3590becb5fb928e98f6eb2283 --receipt-dir qa-reports/phase03a/2026-09-14-harness-repair/hosted-run-20260915T015736Z
```

## Expected bounded temporary effects

The negative control changes no persistent relation and ends with its required exception.

The main proof, within one rollback-enforced `DO` statement, may temporarily:

- create three session-local temporary tables;
- change limiter configuration to allowance 2/4, 60-second windows, one retained window, and disabled public-IP enforcement;
- insert up to eight synthetic `no_ramp` flags through the real limiter path;
- create and delete bounded bucket and grant rows;
- update limiter key state and the single Vault secret in place while testing clock capping and ratcheting;
- grant session-local insert permission on one temporary result table to `service_role`.

The required final `FDA028_ROLLBACK_RESULT` exception rolls back all main-statement effects. Any earlier error also rolls back the statement. The runner then performs a separate read-only state query and requires exact canonical equality with the banked pre-state. It writes raw stdout, redacted stderr, and a summarized local receipt.

No helper function, queued HTTP request, migration row, production change, old-stage change, push, merge, or Phase 03B action is expected or authorized.

## Authority

```text
FRESH_STAGE_MUTATION: AUTHORIZED_FOR_THIS_ONE_REVIEWED_RUN
OLD_STAGING_AUTHORITY: NONE
PRODUCTION_AUTHORITY: NONE
PUSH_AUTHORITY: NONE
MAIN_MERGE_AUTHORITY: NONE
PHASE_03B_AUTHORITY: NONE
```
