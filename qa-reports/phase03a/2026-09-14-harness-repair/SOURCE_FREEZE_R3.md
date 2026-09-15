# FDA-028 hosted harness — source freeze R3

`BANKED_AT_UTC: 2026-09-15T01:22:01Z`

```text
FDA028_HARNESS_REPAIR_SHA: 55b8b7ef60f28dfd52a0ecf82f22efa706d39252
FDA028_HARNESS_REPAIR_TREE: df6433180255d365cfcf58ace5922c124709c0f0
FDA028_LIMITER_IMPLEMENTATION_BYTES_CHANGED: NO
PRIOR_R2_CODE_REVIEW: HOLD
R3_REVIEW_STATUS: PENDING
HOSTED_EXECUTION: BLOCKED_PENDING_R3_REVIEW
```

R3 changes only the remaining TAP validation path:

- the main suite must report the frozen plan of exactly 39, with assertions 1 through 39 exactly once;
- zero plans, whole-plan SKIP/TODO, assertion SKIP/TODO, duplicate plans, wrong plans, bailout, YAML diagnostics, diagnostic comments, warning/error/fatal/panic/notice records, malformed JSON framing, error-bearing JSON, and unexpected plain stdout records all fail;
- the negative control requires exactly plan 1 and its exact failing assertion, and applies the same bailout/YAML/unexpected-record checks;
- only the two exact diagnostics naturally emitted by pgTAP for the one deliberate named failure are permitted in the negative-control stream.

## Frozen artifact hashes

```text
scripts/run-fda028-hosted.mjs
sha256 4e74859373529f4b7443cb5274019ead39e5c8abc1108b81a14257f1dae00503

scripts/__tests__/fda028HostedHarness.test.mjs
sha256 d251a1149570c4839760b581be1a1af5c8eb3f76e158117031e0ee7290520eff

supabase/tests/fda028/hosted-state.sql
sha256 744f14f8371c03c557062547e0499581972556a07c4e5a0b1643670e69b06fc7

supabase/tests/fda028/hosted-negative-control.sql
sha256 fc18937c4fa86447829983d6114fbeda1f51463166dd01c1f7acfe2e5e2499ec

supabase/tests/fda028/hosted-acceptance.sql
sha256 62a7e3f1144535d79c96f23b84dd4cd47c16fd2ce2794b19d5c92a386f5c1fdd
```

Accepted limiter hashes remain exact:

```text
forward: 8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771
rollback: eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302
```

## R3 local gates

```text
npm run db:fda028:hosted:test: PASS, 20/20
npm run db:pgtap:discover: PASS, problems []
hosted acceptance plan: 39
hosted negative-control plan: 1
node --check scripts/run-fda028-hosted.mjs: PASS
git diff --check: PASS
working tree after source commit: clean
```

No hosted contact or mutation was performed for R3. Independent review must target exactly commit `55b8b7ef60f28dfd52a0ecf82f22efa706d39252` and tree `df6433180255d365cfcf58ace5922c124709c0f0`.
