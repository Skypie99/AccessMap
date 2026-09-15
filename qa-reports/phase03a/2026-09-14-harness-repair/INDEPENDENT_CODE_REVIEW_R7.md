# FDA-028 hosted harness repair — independent code review R7

**Review date:** 2026-09-14

**Reviewer lane:** narrow independent CODE re-review; source and banked evidence only

**Executable source commit:** `2a353336d442c5bb79579a2b0154d08aa43806c1`

**Executable source tree:** `472559b72421ee1b4f2a7ce12ebe21867c8a0c0d`

**Docs/evidence checkpoint:** `4fc75a4dabc39a61243c5c09dc71bec1519a038e`

**Verdict:** `FDA028_HARNESS_CODE_REVIEW: PASS`

## Scope and safety

The R6 hosted run reached the exact fresh-stage target, passed its negative control, executed the complete main statement, returned 30 of 31 true assertions, failed only assertion 26, and restored the complete pre-state. R7 changes only assertion 26's evaluation sequence and a source guard test.

I reviewed the exact R7 Git objects, the R6-to-R7 source delta, the committed R6 receipt and raw evidence at `7597ba5aa24dbe5a153e9994547ecb4dd1bba798`, `HOSTED_RUN_R6_HOLD.md`, and `SOURCE_FREEZE_R7.md`. I made no hosted or control-plane call and contacted neither production nor old staging. I did not edit any harness, runner, test, SQL, limiter, migration, or rollback source. The only repository change from this review is this report.

## Verdict

R7 correctly removes an undefined SQL evaluation-order dependency without weakening assertion 26 or masking a limiter defect.

R6 placed a side-effecting `limiter.purge_at(...) > 0` call and an uncorrelated grant-count subquery in one Boolean `AND`. PostgreSQL does not guarantee left-to-right evaluation of Boolean subexpressions. The grant count can therefore be evaluated before `purge_at()` deletes the old bucket and its child grant, making the combined result false even when the purge later succeeds.

R7 executes the purge in a preceding PL/pgSQL statement:

```sql
v_purged := limiter.purge_at((SELECT live_at FROM fda028_clock));
```

It then records assertion 26 from:

```sql
v_purged > 0
AND (SELECT count(*) = 0 FROM limiter.grant)
```

The expected behavior is unchanged. At least one retained-old bucket must be deleted, and the grant table must be empty after that deletion. A real `purge_at()` failure leaves `v_purged <= 0`; a cascade failure leaves grants behind. Either still fails assertion 26. The repair changes only when the two observations occur, so it cannot turn either implementation defect into PASS.

The exact R7 repair is authorized for the continued already owner-authorized bounded fresh-stage validation, using:

```text
--project-ref cepayqmsoqxshsiyqnvz
--branch-id 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
--reviewed-sha 2a353336d442c5bb79579a2b0154d08aa43806c1
```

This PASS authorizes only that continued bounded disposable fresh-stage harness validation. It is not production, push, merge, release, or Phase 03B authority, and it is not itself hosted acceptance evidence.

## R6 evidence review

The R6 raw main envelope parses under the exact unchanged runner as plan 31. Exactly one assertion is false:

```text
26: timing: purge removes retained-old bucket and cascades its grant
```

Assertions 1–25 and 27–31 are true. That includes the real schema and named category constraint, Vault path, exact functions and privileges, empty preconditions, bounded config, real insert and grant behavior, allowance and no-overshoot checks, prior cascade and stale-grant lifecycle checks, actual `service_role` execution, kill switch, source normalization, clock/key behavior, and helper absence.

The R6 receipt records the deliberate negative control as detected, `hostedAcceptance: null` because one main assertion failed, overall HOLD, and cleanup PASS. The complete parsed pre/post states compare equal despite their independently generated output-boundary tokens. Both contain the accepted 103-row ledger, empty flags/buckets/grants/helpers/HTTP queue, one readable 32-byte Vault key, absent `dev_key_material`, exact key state, accepted config, and exact function contract.

This evidence identifies a harness expression that can observe grant count before its side effect. It does not establish that the limiter purge or cascade failed. R7 remains capable of detecting either defect during the next hosted run.

## Source and behavior review

The exact R7 executable commit changes only:

```text
scripts/__tests__/fda028HostedHarness.test.mjs
supabase/tests/fda028/hosted-acceptance.sql
```

The SQL delta adds one integer variable, assigns the unchanged `purge_at(live_at)` result before the assertion insert, and replaces the inline call with that saved value. It does not change the purge time, retention rule, expected deleted count, expected grant count, fixture, limiter config, function, or result description.

The main proof remains exactly one `DO $proof$ ... $proof$;` prepared statement ending in the required exception. It still produces exactly 31 unique sequential assertion records and freezes plan 31 before raising `FDA028_ROLLBACK_RESULT`. All state changes, including `v_purged`'s delete, remain inside the same atomically rolled-back statement.

I executed the exact R7 main SQL against disposable PostgreSQL 17.11 with the exact accepted limiter migration, compatible real `public.flags`, roles, and a local synthetic Vault contract. All 31 assertions were true, including assertion 26. The required final exception made the command nonzero, and the post-check showed zero flags, buckets, and grants, the accepted complete config restored, and one Vault row.

The source test additionally freezes the required statement ordering and rejects the old inline `purge_at(...) > 0 AND` form. Exact reviewed-source binding accepts R7 and refuses R6 because the hosted main SQL and test bytes differ.

## R4–R6 regression and limiter integrity

The runner is byte-identical to R6, so both strict error-envelope contracts, HTTP/body/SQLSTATE/context rejection, exact target transport, user-selector refusal, nonzero propagation, raw evidence, cleanup-after-failure, and source checks remain unchanged. The negative-control and state SQL are also unchanged.

Frozen R7 executable hashes independently match `SOURCE_FREEZE_R7.md`:

```text
5c09b26ebef64f43e648fa989d18ebcc14c7c983e1dac24b02133c27190ff56e  scripts/run-fda028-hosted.mjs
dae845009d371d00124dd630ee0463ded98937bea93032805023541410c24bf9  scripts/__tests__/fda028HostedHarness.test.mjs
744f14f8371c03c557062547e0499581972556a07c4e5a0b1643670e69b06fc7  supabase/tests/fda028/hosted-state.sql
bade8a9a26677e8b76296ba75a5490fb1178ae98c3e292c35f499d880d5f36e0  supabase/tests/fda028/hosted-negative-control.sql
1d323af5a725ffaf88a113c1da869923864a558dcba3dda53dbdc21b2cd5ea3f  supabase/tests/fda028/hosted-acceptance.sql
```

The accepted limiter and rollback remain byte-for-byte unchanged:

```text
8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771  supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql
eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302  supabase/migrations-next/phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql
```

The constraint-specific `ramp` negative control, valid `no_ramp` positive fixtures, config-derived timing, Vault-only hosted key path, absent 600-second and `dev_key_material` fixture couplings, actual role/function execution, deterministic inputs, rollback, cleanup, and residue checks remain intact.

## Gates run

```text
npm run db:fda028:hosted:test
PASS: 20 tests; 20 pass; 0 fail; 0 skipped; 0 todo

node --check scripts/run-fda028-hosted.mjs
PASS

npm run db:pgtap:discover
PASS: problems []

artifact sha256 verification
PASS: five executable artifacts match R7 freeze
PASS: limiter forward and rollback match accepted hashes

banked R6 evidence parse
PASS: exact plan 31; only assertion 26 false
PASS: negative detected; complete parsed pre/post states equal; cleanup PASS

sequencing/source checks
PASS: purge assignment precedes post-purge assertion
PASS: positive delete and zero-grant conditions preserved
PASS: old inline side-effecting Boolean form absent
PASS: exact R7 reviewed source accepted; R6 refused

disposable PostgreSQL 17.11 exact-main execution
PASS: intentional nonzero exception; plan 31; assertion 26 true; all 31 true
PASS: post-state flags 0; buckets 0; grants 0; accepted config restored; one Vault row

git diff --check
PASS
```

## Limits

No new hosted contact occurred. Local execution confirms the exact R7 statement and accepted limiter behavior in disposable PostgreSQL, but the hosted engine must run R7 to distinguish the eliminated evaluation-order issue from any actual hosted purge or cascade defect. If either implementation behavior is wrong, the unchanged two-part assertion will remain false.

## What's left

Continue the exact bounded fresh-stage validation with R7. Preserve its raw negative, main, pre, and post outputs and receipt; verify exact cleanup; and independently review that evidence before any hosted-acceptance claim.

## DECISIONS FOR SKY

No new decision is required before continuing the already owner-authorized bounded fresh-stage validation. Recommendation: run exact R7 with the three pinned identity arguments above. The alternative is to retain HOLD without resolving whether assertion 26's R6 result came from expression ordering or hosted limiter behavior.
