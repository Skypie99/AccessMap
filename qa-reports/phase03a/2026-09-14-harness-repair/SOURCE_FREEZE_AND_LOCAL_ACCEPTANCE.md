# FDA-028 hosted harness — source freeze and local acceptance

`BANKED_AT_UTC: 2026-09-15T00:58:21Z`

## Frozen repair

```text
FDA028_HARNESS_REPAIR_SHA: 4370ac99221fc056a3215598aec9e363b804186d
FDA028_HARNESS_REPAIR_TREE: f5308540e9ed287dc69605238ef8f5355eb3bedd
FDA028_LIMITER_IMPLEMENTATION_BYTES_CHANGED: NO
```

The accepted limiter artifacts remain:

```text
supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql
sha256 8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771

supabase/migrations-next/phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql
sha256 eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302
```

## Hosted artifact hashes

```text
scripts/run-fda028-hosted.mjs
sha256 5c3f9a2d10ee776f4cbed8a4d7d4f471ea9b3d2bde8fe4b43d89d0809c609655

scripts/__tests__/fda028HostedHarness.test.mjs
sha256 7b9795957971411ab49ac5946fb5f1189dc198c30f7dd5b106b9dd125569d7e4

supabase/tests/fda028/hosted-state.sql
sha256 744f14f8371c03c557062547e0499581972556a07c4e5a0b1643670e69b06fc7

supabase/tests/fda028/hosted-negative-control.sql
sha256 fc18937c4fa86447829983d6114fbeda1f51463166dd01c1f7acfe2e5e2499ec

supabase/tests/fda028/hosted-acceptance.sql
sha256 14b470a1f726abb72668df5fa07f79f9e00f72abcfcd16268febfa69291fe472
```

## Local gates

### Focused harness tests

```text
command: npm run db:fda028:hosted:test
result: PASS
tests: 17
pass: 17
fail: 0
```

This proves exact target acceptance/refusal, production and old-stage refusal, missing/ambiguous target refusal, branch metadata checks, TAP plan accounting, deliberate failure detection, assertion-failure propagation, cleanup after PASS, cleanup after FAIL, residue rejection, real fixture values, actual function signatures, active-config timing derivation, rollback-only SQL structure, and absence of hosted `dev_key_material` writes or persistent helpers.

### SQL discovery

```text
command: npm run db:pgtap:discover
result: PASS
problems: []
hosted acceptance plan: 38
hosted negative-control plan: 1
hosted state probe: fixture/read-only classification
```

### Disposable PostgreSQL replay

```text
command: npm run db:replay -- --with-next --local-only --phase03a-privileges-only --json
result: PASS
overall status: LOCAL_REPLAY_ONLY
phase03a status: LOCAL_PRIVILEGE_GUARD_PASS
production inputs accepted: false
TCP enabled: false
temporary cluster destroyed: true
global PostgreSQL state unchanged: true
```

This replay verifies the unchanged accepted Phase 03A migration and privilege/restoration path in a socket-only disposable PostgreSQL 17.11 cluster. It does not claim hosted Vault acceptance.

### Direct refusal commands

Three direct runner invocations returned exit code 1 before creating a receipt directory:

```text
production project: refused
ambiguous --linked selector: refused
missing --project-ref: refused
```

### Static/source gates

```text
node --check scripts/run-fda028-hosted.mjs: PASS
git diff --check: PASS
accepted limiter forward hash: PASS
accepted limiter rollback hash: PASS
working tree after source commit: clean
```

The first attempted repository Jest command could not run because this isolated worktree has no `node_modules` and the primary checkout's shared Jest installation resolves through a stale React Native worktree. The harness suite was therefore implemented with Node's dependency-free built-in test runner and passed as recorded above. No dependency installation or primary-checkout write was performed.

## Review boundary

Independent CODE review must assess commit `4370ac99221fc056a3215598aec9e363b804186d` / tree `f5308540e9ed287dc69605238ef8f5355eb3bedd`. No hosted mutation is permitted until that review returns PASS.
