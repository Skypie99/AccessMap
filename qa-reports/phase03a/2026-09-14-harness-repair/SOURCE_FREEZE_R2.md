# FDA-028 hosted harness — source freeze R2

`BANKED_AT_UTC: 2026-09-15T01:12:12Z`

```text
FDA028_HARNESS_REPAIR_SHA: efd9ddf72d019017ef9f408e8e03e69ef4daafb3
FDA028_HARNESS_REPAIR_TREE: 07fc1881ce31a8f4f528ea1a48a71279b65b67ff
FDA028_LIMITER_IMPLEMENTATION_BYTES_CHANGED: NO
PRIOR_CODE_REVIEW: HOLD
R2_REVIEW_STATUS: PENDING
HOSTED_EXECUTION: BLOCKED_PENDING_R2_REVIEW
```

## Repair of independent findings

- The runner now requires an exact 40-character `--reviewed-sha`, proves HEAD descends from it, and compares every executable hosted artifact to that commit's Git blobs before any query and again at every protocol boundary.
- The production-parent `branches list` request was removed. The runner contacts only the explicit fresh-stage project ref. The exact project/ref and branch-ID tokens are fixed and required; the first database query verifies the accepted full 103-row ledger digest, configuration, Vault shape, function contract, and empty residue state.
- The suite now executes the public clockless function under `SET LOCAL ROLE service_role`, then verifies the resulting real `public.flags` row as owner.
- TAP acceptance now rejects SKIP, TODO, bailout, YAML diagnostics, diagnostic comments, incomplete numbering, and any `not ok`. Unexpected CLI stderr also blocks PASS; only the CLI's two exact version-update notice lines are allowed.
- The function contract requires exactly four named true fields.
- The `ramp` negative control requires the actual `flags_category_check` constraint name, not merely any check violation.
- Raw stdout remains byte-for-byte assertion evidence. Stderr receipts are redacted for password-bearing database URLs, JWTs, and secret-key tokens before storage.

## Frozen artifact hashes

```text
scripts/run-fda028-hosted.mjs
sha256 89fc167944c83effe06bdc385c11382d8a4ed252101accc62380d5eb49a8439a

scripts/__tests__/fda028HostedHarness.test.mjs
sha256 d19e7d8b4f9aa47f95814f48d4d438bae0fe6d5fd9660c22e06da0494a174a8a

supabase/tests/fda028/hosted-state.sql
sha256 744f14f8371c03c557062547e0499581972556a07c4e5a0b1643670e69b06fc7

supabase/tests/fda028/hosted-negative-control.sql
sha256 fc18937c4fa86447829983d6114fbeda1f51463166dd01c1f7acfe2e5e2499ec

supabase/tests/fda028/hosted-acceptance.sql
sha256 62a7e3f1144535d79c96f23b84dd4cd47c16fd2ce2794b19d5c92a386f5c1fdd
```

Accepted limiter hashes remain:

```text
forward: 8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771
rollback: eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302
```

## R2 local gates

```text
npm run db:fda028:hosted:test: PASS, 20/20
npm run db:pgtap:discover: PASS, problems []
hosted acceptance plan: 39
hosted negative-control plan: 1
node --check scripts/run-fda028-hosted.mjs: PASS
git diff --check: PASS
reviewed Git-blob binding at efd9ddf72d019017ef9f408e8e03e69ef4daafb3: PASS
production-scoped command scan: PASS, none present
working tree at verification: clean
```

No hosted mutation was performed. The preview-scoped `supabase branches list --project-ref cepayqmsoqxshsiyqnvz` investigation returned a read-only 403 and no branch data; it did not contact the production ref or any database. An account-wide read-only projects listing did not enumerate preview branches. These results support the runner's choice to verify the exact preview connection by its explicit project ref and accepted full database identity rather than a production-parent control-plane request.

Independent R2 review must assess commit `efd9ddf72d019017ef9f408e8e03e69ef4daafb3` and tree `07fc1881ce31a8f4f528ea1a48a71279b65b67ff`. Hosted execution remains blocked until that exact review returns PASS.
