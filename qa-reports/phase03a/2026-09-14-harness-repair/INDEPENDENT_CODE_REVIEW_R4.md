# FDA-028 hosted harness repair — independent code review R4

**Review date:** 2026-09-14

**Reviewer lane:** independent CODE review; local and source inspection only

**Executable source commit:** `8940725b77bc5b79567179b1dc33186c6fdacc68`

**Executable source tree:** `89cde783191b707cc3feb997472828e1e1f7db35`

**Docs checkpoint reviewed:** `1c8d1233821a0a3b515bd81984d26c5ee7713e4f`

**Verdict:** `FDA028_HARNESS_CODE_REVIEW: PASS`

## Scope and safety

I reviewed the controlling prompt through Step 5, the takeover repair proposal, the accepted hosted contract, all prior R1–R3 independent reviews, and `SOURCE_FREEZE_R4.md`. I inspected the exact Git objects at the identities above rather than treating the checked-out documentation commit as the executable source identity.

No hosted database, Supabase control plane, production system, old stage, or remote Git ref was contacted. No harness, runner, limiter, migration, or rollback source was edited. The only repository change from this review is this report.

## Verdict

R4 resolves the sole R3 blocker. The runner now accepts only one exact measured Supabase CLI JSON error envelope whose exception message contains the correct rollback marker and a versioned, exact-key payload. It rejects appended JSON, extra envelope or payload keys, arbitrary nested records, malformed payloads, wrong plans, plan zero, missing or duplicate assertion records, non-Boolean outcomes, and any failed main assertion.

The exact R4 repair is a harness-only change and is authorized for the already owner-authorized bounded run against the pinned disposable fresh-stage target, subject to using:

```text
--project-ref cepayqmsoqxshsiyqnvz
--branch-id 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
--reviewed-sha 8940725b77bc5b79567179b1dc33186c6fdacc68
```

This PASS authorizes only that bounded fresh-stage harness run under the existing owner authorization. It is not hosted acceptance evidence, production authority, push authority, merge authority, or Phase 03B authority.

## Findings

No review-blocking defect remains.

### R3 JSON-envelope blocker: resolved

`parseRollbackEvidence()` parses the entire stdout as one JSON document and requires exact top-level `_tag,error` keys, exact `_tag: Error`, exact `LegacyDbQueryExecError`, exact `code,message` error keys, the expected exception prefix, and exact `version,kind,plan,assertions` payload keys. Each assertion must have only `number,description,passed`, use sequential numbering, have a nonempty unique description, and carry a Boolean result.

The negative control requires one specifically named false assertion. The main result requires plan 31 and all 31 assertions true. Normal exit zero is independently rejected for both proof commands. The required exception is therefore both the evidence carrier and the mechanism that makes the one prepared statement roll back atomically.

Adversarial cases rejected locally included:

- a second JSON record;
- arbitrary JSON objects and arrays;
- TAP `Bail out!`, whole-plan skip, partial TAP, and TODO-like text;
- appended context, YAML diagnostic text, or diagnostic fields;
- extra envelope, error, payload, or assertion keys;
- version, kind, prefix, plan, count, number, description, type, or result drift;
- main plans 0, 30, and 32;
- a negative control that passed or had the wrong description.

### Single prepared statement and rollback: sound

Both proof files contain exactly one `DO $proof$ ... $proof$;` statement. The main statement creates only temporary evidence tables, performs every config change and data mutation inside that statement, builds its per-assertion JSON, freezes the count at 31, and raises the required final exception. PostgreSQL statement atomicity rolls back all effects when that exception escapes.

I executed the exact R4 main SQL locally against disposable PostgreSQL 17.11 with the exact accepted limiter migration, a compatible `public.flags` constraint, the accepted roles, and a local synthetic Vault-compatible contract. The exact statement reached its intended exception with plan 31, every assertion was true, and the post-check showed zero flags, buckets, and grants, the complete accepted config restored, and exactly one Vault row. This also exercised `SET LOCAL ROLE service_role`, the real clockless function, the owner-only clocked function, config trigger, grant cascade, purge, Vault read/write path, and constraint-specific invalid-category control as one statement.

The runner performs an independent state query before the negative proof and after every proof outcome. It compares the complete canonical pre/post state, including migration ledger identity, flags, buckets, grants, helper count, queued HTTP count, Vault shape, key state, config, and exact function-contract keys. A main failure, negative-control failure, unexpected stderr, malformed envelope, state-query failure, or cleanup mismatch propagates to receipt `HOLD` and process exit 1. Cleanup remains attempted after every primary protocol failure.

### Real hosted contract: compatible

- Valid inserts use `no_ramp`. The sole `ramp` use is an invalid control that passes only when the named `flags_category_check` rejects it.
- Timing comes from transaction-local `limiter.config`; the bounded 60-second window is established only after proving the bucket and grant ledgers empty. Purge timing derives from that active configuration.
- The suite proves `vault.decrypted_secrets` exists, exactly one named Vault row exists, and the limiter reads 32 bytes. It never selects, prints, hashes, or persists the key value.
- No write targets `limiter.dev_key_material`; the suite requires that relation to be absent.
- Exact seven- and eight-argument function signatures are checked. The suite checks ACLs and then actually invokes the seven-argument clockless path under `SET LOCAL ROLE service_role` and verifies its returned decision and real `public.flags` write.
- The former 39 pgTAP checks are preserved as 31 equivalent assertion records: the obsolete pgTAP-installation check is removed and seven related pairs/triples are consolidated without losing the underlying Boolean conditions. The controlling prompt permits raw TAP **or equivalent per-assertion evidence**.

### Target and reviewed-source binding: sound

The runner accepts one canonical project ref and one canonical branch UUID, explicitly refuses the production and old-stage refs, refuses every unexpected ref or branch, and rejects linked, local, URL, profile, workdir, duplicate, missing, and noncanonical selectors before any database command. Direct local invocations against the production ref, old-stage ref, and wrong branch each exited 1 and created no receipt directory.

Before contact, it requires a clean worktree descended from the accepted integration SHA, verifies the accepted limiter forward and rollback hashes, and binds all four executable hosted artifacts to Git blobs at the explicit reviewed SHA. It repeats reviewed-blob checks around state queries and before each proof, retains an in-memory artifact snapshot, and refuses an older R3 reviewed SHA. The exact project token plus the frozen 103-row ledger digest, accepted config, Vault shape, empty state, key state, and full four-key function contract provide the database-side identity check.

### Determinism, evidence, and residue: sound

The deterministic paths use fixed synthetic source addresses and descriptions, an owner-only explicit clock derived from one transaction clock, a bounded transaction-local config, exact assertion numbering, and an exact plan. The public clockless call is intentionally a real `service_role` runtime compatibility check. Its variable UUIDs and current epoch are recorded only in transaction-local state and are covered by rollback and exact pre/post comparison.

Raw stdout and redacted stderr are written with exclusive creation. Only measured CLI connection/version-notice stderr lines are accepted; any other nonempty stderr fails. The summarized receipt cannot become PASS unless the negative control, all 31 main assertions, and exact cleanup comparison have succeeded.

No persistent helper is created. The suite both asserts absence of the old `public.pass` residue and the runner checks the helper count before and after. The pre/post state also detects flags, limiter ledger rows, queued HTTP residue, config drift, Vault-row drift, and key-state drift.

## Harness-only and limiter integrity

The R4 executable commit changes only:

```text
scripts/__tests__/fda028HostedHarness.test.mjs
scripts/run-fda028-hosted.mjs
supabase/tests/fda028/hosted-acceptance.sql
supabase/tests/fda028/hosted-negative-control.sql
```

The accepted limiter implementation remains byte-for-byte unchanged:

```text
8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771  supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql
eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302  supabase/migrations-next/phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql
```

The five hosted R4 artifact hashes independently matched `SOURCE_FREEZE_R4.md`.

## Gates run

```text
npm run db:fda028:hosted:test
PASS: 18 tests; 18 pass; 0 fail; 0 skipped; 0 todo

node --check scripts/run-fda028-hosted.mjs
PASS

npm run db:pgtap:discover
PASS: problems []

npm run db:replay -- --with-next --local-only --phase03a-privileges-only --json
PASS: LOCAL_REPLAY_ONLY
PASS: LOCAL_PRIVILEGE_GUARD_PASS
PASS: inheritedPgEnvironment false; tcpDisabled true; productionInputsAccepted false
PASS: globalPostgresUnchanged true; tempDestroyed true

independent adversarial Node assertions
PASS: strict rollback-envelope, plan, negative-control, diagnostics, source-binding, and cleanup-failure cases

direct production / old-stage / wrong-branch refusal invocations
PASS: each exited 1 before database contact and created no receipt directory

disposable PostgreSQL 17.11 exact-main execution
PASS: intentional nonzero exception; marker present; plan 31; all assertions true
PASS: post-state flags 0; buckets 0; grants 0; accepted config restored; one Vault row

git diff --check
PASS
```

## Limits

The disposable PostgreSQL execution used a local synthetic implementation of the Vault table/view/update API because hosted contact was prohibited. It validates the exact main statement, real limiter migration, role path, function behavior, and transactional rollback, but it does not replace the bounded hosted run against Supabase's actual Vault extension and CLI transport. The source freeze separately records the author's disposable CLI measurement of the exact negative-control envelope.

## What's left

Execute the already authorized bounded run exactly once against the pinned disposable fresh-stage target using the exact R4 reviewed SHA. Preserve its raw outputs and receipt, verify cleanup, and independently review that hosted evidence before making any FDA-028 hosted-acceptance claim.

## DECISIONS FOR SKY

No new decision is required to begin the already owner-authorized bounded fresh-stage run. Recommendation: run exact R4 once with the three pinned identity arguments above. The alternative is to keep hosted reproducibility on HOLD; that would leave the repaired harness unvalidated against the actual Supabase Vault and CLI path.
