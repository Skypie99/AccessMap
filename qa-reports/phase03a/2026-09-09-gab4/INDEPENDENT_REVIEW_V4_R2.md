# FDA-028 GAB-4 (v4-r2) — independent adversarial re-review

**VERDICT: HOLD.** All 78 published acceptance assertions and all three published concurrency
shapes reproduce exactly as claimed on a disposable local PostgreSQL 17.11 instance. Two of
the three r1 MUST-FIX repairs meaningfully reduce risk but do not close the underlying defect:
the purge live-window repair (A3) is genuinely solid under every case I could construct,
including real concurrency. But the caller-controlled-clock repair (A1) only removes today's
concrete attack surface — the code path itself (`current_epoch_key`/`admit_at`) still forces a
global key re-seed on a forward jump and mints unboundedly many fully-funded buckets on a
backward jump, unchanged, now gated behind privilege separation with zero other defense — and
the NAT64/IPv4-embedding repair (A2) closes exactly the forms named in the prior review but
misses RFC 6052's shorter Network-Specific Prefixes (/32,/40,/48,/56,/64), which real ISPs are
free to choose instead of the /96 well-known prefix. I constructed a concrete /56 example and
two different real hosts collapsed into one bucket — the exact defect class the repair claims
to have closed. These are safety/privacy defects in the mechanism itself, not documentation
gaps, so this is HOLD, not PASS-with-notes.

Reviewer role: bounded, read-only, adversarial. I did not author any artifact under review and
treated every claim — including the author's own re-verified ones — as something to falsify.
I built a disposable local PostgreSQL 17.11 cluster (TCP 127.0.0.1:55712, scratchpad-only,
stopped and not reused after this review) and loaded the exact frozen files byte-for-byte
(hash-verified before use). No staging or production database was touched, no Edge Function was
deployed or invoked, and no file other than this one was written.

## Hash verification

All eight frozen artifacts were hashed with `shasum -a 256` before review and matched the
stated values exactly, with no discrepancy:

| File | Match |
|---|---|
| `supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql` | MATCH |
| `supabase/migrations-next/phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql` | MATCH |
| `supabase/tests/fda028/acceptance.sql` | MATCH |
| `supabase/tests/fda028/acceptance2.sql` | MATCH |
| `supabase/tests/fda028/acceptance3.sql` | MATCH |
| `supabase/tests/fda028/concurrency.sh` | MATCH |
| `supabase/tests/fda028/devkey.sql` | MATCH |
| `supabase/tests/fda028/fixture.sql` | MATCH |

Git HEAD (`6311691608b131b4fdda065c4550785105b6ab74`) and tree
(`3df65dee8b90f3faf8690c814871b7c11b845428`) also match `V4_SOURCE_SHA`/`V4_SOURCE_TREE`
exactly.

## Part A — do the three r1 repairs hold?

| # | Repair | Verdict |
|---|---|---|
| A1 | Caller-controlled clock | **PARTIALLY_REPAIRED.** Today's concrete external attack surface is closed and verified. The underlying defect is unchanged. |
| A2 | NAT64 / IPv4-embedding | **PARTIALLY_REPAIRED.** The four named `/96` forms are fixed and verified non-colliding. RFC 6052's non-`/96` Network-Specific Prefixes are not covered and reproduce the same collision class. |
| A3 | Purge live-window | **REPAIRED.** Holds under every case tried, including real concurrent admit/purge racing. |

### A1 — Caller-controlled clock: PARTIALLY_REPAIRED

**What now blocks external callers (verified empirically, `SET ROLE service_role` /
`anon` / `authenticated` against the frozen migration in a fresh database):**

```
SET ROLE service_role;
SELECT * FROM limiter.admit_guest_flag_at(...);   -- ERROR: permission denied for function admit_guest_flag_at
SELECT * FROM limiter.admit_at(...);              -- ERROR: permission denied for function admit_at
SELECT * FROM limiter.admit_guest_feedback_at(...); -- ERROR: permission denied for function admit_guest_feedback_at
SELECT * FROM limiter.purge_at(...);              -- ERROR: permission denied for function purge_at
SELECT * FROM limiter.current_epoch_key(...);     -- ERROR: permission denied for function current_epoch_key
SELECT * FROM limiter.read_epoch_key();           -- ERROR: permission denied for function read_epoch_key
SELECT limiter.write_epoch_key(...);              -- ERROR: permission denied for function write_epoch_key
SELECT * FROM limiter.config;                     -- ERROR: permission denied for table config
UPDATE limiter.config SET window_seconds = 1;     -- ERROR: permission denied for table config
UPDATE limiter.key_state SET epoch = 999999999;   -- ERROR: permission denied for table key_state
INSERT INTO limiter.bucket (...);                 -- ERROR: permission denied for table bucket
```

`REVOKE ALL ON ALL FUNCTIONS/TABLES IN SCHEMA limiter FROM PUBLIC, anon, authenticated`
(`20260909120000_fda028_v4_limiter.sql:504-505`) strips the default PUBLIC-EXECUTE grant Postgres
attaches to every new function, so `service_role` — which is not separately granted anything on
the clocked functions or on any table — genuinely has zero reach into anything but the three
explicitly-granted clockless entry points (`admit_guest_flag/7`, `admit_guest_feedback/5`,
`purge/0`, lines 509-513). `acceptance3.sql`'s `rev1` block (lines 90-120) tests exactly this via
`has_function_privilege`, and I independently confirmed it by direct `SET ROLE` probing rather
than trusting the catalog query. This closes the specific hole r1 demonstrated (the OLD
`admit_guest_flag` took `p_now` as its 8th argument and WAS granted to `service_role`).

I also tested whether a `service_role` session could indirectly force the clockless wrapper to
use a fake clock by shadowing the built-in `now()` via `pg_temp` (the wrapper's `search_path` is
`'limiter', 'pg_temp'` and it calls `now()` unqualified):

```sql
SET ROLE service_role;
CREATE FUNCTION pg_temp.now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT '2099-01-01'::timestamptz $$;
SELECT now();  -- returns 2099-01-01 in THIS session
SELECT * FROM limiter.admit_guest_flag('198.51.100.77', NULL, 1,2,'ramp',3,'shadow-test');
```
Result: the bucket actually created used `window_id=20706` (the real day), not `47117` (the
2099 day) — `pg_catalog` is implicitly searched before `pg_temp` for built-ins regardless of
`search_path` ordering, so this shadow attempt fails. **No indirect route found.**

**But the repair does not touch the vulnerable code.** `current_epoch_key`
(`...v4_limiter.sql:202-261`) and `admit_at` (`...v4_limiter.sql:318-388`) are byte-identical to
what r1 reviewed. I reproduced BOTH of r1's original defects through the now-owner-only `*_at`
path (as `postgres`, i.e. exactly the privilege level the migration itself says is safe to keep
this on):

```
-- Reproduction 1 (forward jump forces a global re-seed), run against the FROZEN v4-r2 code:
select decision, out_grant from limiter.admit_guest_flag_at('198.51.100.50', NULL, 1,2,'ramp',3,'a','2026-09-09 12:00:00+00');
--> ADMITTED   (epoch=20705)
select decision from limiter.admit_guest_flag_at('198.51.100.51', NULL, 1,2,'ramp',3,'attack','2099-01-01 00:00:00+00');
--> ADMITTED
select epoch from limiter.key_state;  --> 47117  (re-seeded from 20705 in one call)

-- Reproduction 2 (backward jump mints unboundedly many full-allowance buckets from ONE source):
select decision from limiter.admit_guest_flag_at('198.51.100.60', NULL, 1,2,'ramp',3,'b1', now() - interval '10 years');  --> ADMITTED, new bucket
select decision from limiter.admit_guest_flag_at('198.51.100.60', NULL, 1,2,'ramp',3,'b2', now() - interval '11 years');  --> ADMITTED, new bucket
select decision from limiter.admit_guest_flag_at('198.51.100.60', NULL, 1,2,'ramp',3,'b3', now() - interval '12 years');  --> ADMITTED, new bucket
select count(*) from limiter.bucket;  --> 3 distinct fully-funded rows from ONE source, ONE call each
```

`current_epoch_key` still has no `ELSIF v_target < v_state.epoch` branch, and `admit()` still
computes `v_window` directly from the caller's `p_now` with no validation against
`clock_timestamp()`. The design doc's own claim
(`V4A_PREPARED_AND_KEY_DESIGN.json:34`: *"A caller cannot force an advance; epoch is a pure
function of request time"*) is still false of the shipped function — it is only true of the
*subset of callers Postgres privileges currently permit to reach it*. Nothing was added to
`admit_at`/`current_epoch_key`/`purge_at` themselves; the "minimum fix" r1 suggested (a
`p_now` vs `clock_timestamp()` tolerance check, plus the missing backward-epoch branch) was not
implemented. The fix is entirely a privilege-surface change, with **zero defense-in-depth**: the
day anyone grants EXECUTE on any `*_at` function to anything reachable by an external signal —
an Edge Function forwarding a client "reported at" timestamp is the exact scenario r1 named, and
remains exactly as plausible today — both reproductions above fire again verbatim, with no
second layer of protection to catch it.

**MUST-FIX (residual, before the `*_at` surface is ever granted to anything):** add a
`p_now` sanity check (bounded distance from `clock_timestamp()`) inside `admit_at()` and
`purge_at()`, and add the missing backward-epoch branch to `current_epoch_key`, so the invariant
the design doc claims is actually enforced by the code, not only by today's grant list.

### A2 — NAT64 / IPv4-embedding: PARTIALLY_REPAIRED

The four forms `embedded_ipv4` (`...v4_limiter.sql:107-121`) explicitly handles are correctly
unwrapped and verified non-colliding:

```
select limiter.normalize_source('64:ff9b::203.0.113.1') <> limiter.normalize_source('64:ff9b::203.0.113.99');  --> true
select limiter.normalize_source('::203.0.113.7') <> limiter.normalize_source('::198.51.100.9');                 --> true
```
Both reproduced independently (matching `acceptance3.sql` `rev2` and the deprecated-form
reproduction from the r1 review, which was NOT covered by any test file).

`::` and `::1` were checked for false-accept risk under the real default `require_public_ip =
true`: both correctly normalize to `NULL` (refused) via the ordinary IPv4 exclusion range
`0.0.0.0/8` after unwrapping. (An earlier probe of mine showed them normalizing to real bucket
keys — that was config left at `require_public_ip=false` by a prior `acceptance3.sql` run in the
same disposable database, not a defect; re-verified clean on the real default.)

**But `embedded_ipv4` only recognizes contiguous `/96` embeddings.** RFC 6052 §2.2 defines FIVE
standard translation prefix lengths for NAT64 — `/32, /40, /48, /56, /64, /96` — and for every
length shorter than `/96` the IPv4 address is embedded **non-contiguously**, split around a
reserved zero octet at bits 64-71. An ISP choosing e.g. a `/56` Network-Specific Prefix (a
completely ordinary, RFC-sanctioned choice, not an edge case) produces exactly the collision this
repair claims to have eliminated:

```sql
-- RFC 6052 /56 embedding of 203.0.113.1 and 203.0.113.99 under one operator NSP:
select limiter.embedded_ipv4('2001:0db8:aabb:ccCB:0000:7101:0000:0000'::inet);  --> NULL (not recognized)
select limiter.embedded_ipv4('2001:0db8:aabb:ccCB:0000:7163:0000:0000'::inet);  --> NULL (not recognized)
select limiter.normalize_source('2001:0db8:aabb:ccCB:0000:7101:0000:0000');     --> v6:2001:db8:aabb:cccb::/64
select limiter.normalize_source('2001:0db8:aabb:ccCB:0000:7163:0000:0000');     --> v6:2001:db8:aabb:cccb::/64
select limiter.normalize_source('2001:0db8:aabb:ccCB:0000:7101:0000:0000')
     = limiter.normalize_source('2001:0db8:aabb:ccCB:0000:7163:0000:0000');     --> TRUE  (COLLISION)
```
Two different real IPv4 hosts (203.0.113.1 and 203.0.113.99) behind the same operator's `/56`
NAT64 deployment share one rate-limit bucket, because neither `embedded_ipv4` nor
`is_public_unicast` recognizes this form; it falls straight through to plain native-`/64`
masking, which zeroes exactly the bits carrying the distinguishing host information — the same
root cause r1 named (`is_public_unicast`'s IPv6 branch is an exclusion blacklist, not an
inclusion allowlist), just manifesting through a prefix length the repair didn't add a case for.
No test in `acceptance.sql`/`acceptance2.sql`/`acceptance3.sql` exercises any non-`/96` NAT64
embedding.

**MUST-FIX:** either extend `embedded_ipv4` to decode the non-contiguous `/32,/40,/48,/56,/64`
RFC 6052 forms (per-prefix bit layout, skipping the reserved `u` octet), or replace
`is_public_unicast`'s IPv6 exclusion blacklist with an inclusion allowlist restricted to
`2000::/3`. Add explicit non-collision test cases for at least one non-`/96` NSP length.

### A3 — Purge live-window: REPAIRED

`purge_at` (`...v4_limiter.sql:448-463`) computes
`v_cutoff := LEAST(window_of(p_now) - retention_windows, window_of(now()))` and deletes
`WHERE window_id < v_cutoff`. Because `v_cutoff <= window_of(now())` unconditionally, the
`DELETE ... < v_cutoff` can never reach `window_id = window_of(now())` (the live window) for ANY
value of `retention_windows` or `p_now`. I tried every edge case I could construct, all against
the frozen code, all leaving the live bucket intact:

| Case | Result |
|---|---|
| `retention_windows=0`, `p_now=now()` (r1's exact repro) | live bucket untouched, `purge_at → 0` |
| `p_now = NULL` | `window_of(NULL)=NULL`; Postgres `LEAST()` ignores the NULL argument, `v_cutoff` falls back to `window_of(now())` — safe, not an exploit |
| `p_now = '9999-01-01'` (far future) | live bucket untouched |
| `p_now = '0001-01-01'` (far past) | live bucket untouched |
| Real concurrency: 20 parallel `admit_guest_flag` + 20 parallel `purge()`, `retention_windows=0` | 20/20 admitted, `flags` rows = 20, `bucket.units_consumed` = 20 (exact — r1's undercounting race is gone), all 20 `purge()` calls returned `0` |

This is a genuine fix, not a narrowed symptom: I could not construct any configuration or
timing that deletes the currently-live bucket.

## Part B — further hunting

| # | Item | Verdict |
|---|---|---|
| B1 | Reproduce all 78 assertions + 3 concurrency shapes | **UPHELD.** All 78 (`28+21+29`) reproduced verbatim on a fresh database in the documented order; all three concurrency shapes (10/10, 25/25, 1/1) reproduced with zero overshoot, zero orphans. |
| B2 | Harder concurrency | **UPHELD.** Invented and ran: 50-source/150-call fan-out (0 cross-contamination, 0 orphans); 40-way concurrent epoch rollover across a 3-window staleness gap (exactly one resulting `(epoch, key)` pair, no split-brain); 30-way same-grant reuse (allowance enforced exactly, `4 ADMITTED + 26 REFUSED_GRANT` against `allowance=5` with 1 pre-consumed); a long transaction holding the `key_state` row lock for 4s while a concurrent admission queued and then completed cleanly (no deadlock, no error, ~3s wait as expected). No deadlock found anywhere. |
| B3 | Lock ordering / global bottleneck | **UPHELD.** Lock order is always `key_state` (only on the stale-epoch slow path) → `bucket` → `grant`, consistently in `admit_at`; `purge_at` never touches `key_state` and locks `bucket` (cascading to `grant`) in the same relative order. Bucket-row locking is scoped per `(bucket_key, window_id)`, so unrelated sources never contend — confirmed by the 50-source fan-out running with no serialization stalls. |
| B4 | Row/resource growth bounds | **UPHELD** under normal operation — grants per bucket are bounded by `bucket_allowance` because every mint spends a unit in the same call before any row exists (verified via the growth-invariant acceptance test and the fan-out probe). **WEAKENED** by the still-open A1 residual: the owner-only `*_at` path can still mint unboundedly many distinct `(bucket_key, window_id)` rows from one source (see A1 Reproduction 2). |
| B5 | Full insert enforcement / atomicity | **UPHELD.** Forced a `CHECK` constraint failure on `public.flags` after admission succeeded (`severity < 0`); the call errored and `flags`, `bucket.units_consumed`, and `grant` count were all unchanged (`0/0/0`) afterward — the whole ledger update rolled back with the failed INSERT. |
| B6 | Secrets/logging leakage | **UPHELD.** Every `RAISE EXCEPTION` in the migration (grep-confirmed, 6 total) is a static string with no interpolation. `embedded_ipv4`'s `EXCEPTION WHEN others` handler returns `NULL` silently with no `RAISE`/`NOTICE` at all. No client-visible return row (`admit_at`, `admit_guest_flag_at`, `admit_guest_feedback_at`, `purge_at`) includes `bucket_key`, `epoch`, or the raw source string. |
| B7 | Reset continuity / client independence | **UPHELD.** Reproduced via `acceptance2.sql`: bucket keeps its spend across a client-side reset, and a brand-new client is not starved after 5 resets by another client. |
| B8 | Rollback/restoration completeness | **UPHELD.** Ran the actual rollback file, then the actual forward migration, against the live database (not just inspected them). Resulting catalog (16 functions + 4 tables + 4 PKey indexes + 1 extra index) is identical to the pre-rollback state, modulo `limiter.dev_key_material` (fixture-only, never created by the forward migration, correctly absent). Re-ran `devkey.sql` + `acceptance.sql` afterward: all 28 assertions passed again — genuinely idempotent, not merely catalog-identical. |
| B9 | Privilege hygiene | **UPHELD.** Every `SECURITY DEFINER` function has an explicit `SET search_path`; every internal reference is schema-qualified; grep confirms no `GRANT ... TO anon` / `GRANT ... TO authenticated` anywhere in the file. New probe beyond r1: confirmed empirically (not just by catalog inspection) that `pg_catalog`'s implicit-first search order defeats a `pg_temp` shadow of the actual `now()` builtin used by the clockless wrapper — see A1. |
| B10 | Inertness against production / Build 33 | **UPHELD.** `supabase/schema.generated.sql` still has `"flags anon insert"` and `feedback_insert_self_or_anon` unchanged; `src/lib/flags.ts` and `src/lib/feedbackStore.ts` still call `.from('flags'/'feedback').insert(...)` directly with zero reference to `limiter.` anywhere in either file; `supabase/functions/` has no `guest-ingest` (or any) function that calls into `limiter`. |
| B11 | Threshold leakage | **UPHELD.** Grep of every `v_cfg.*` use confirms all nine configuration values (`enabled`, `normal_allowance`, `bucket_allowance`, `window_seconds`, `ipv4_prefix`, `ipv6_prefix`, `require_public_ip`, `catchup_cap`, `reseed_interval`, `retention_windows`) are read live from `limiter.config`; none are compiled into function bodies. |
| B12 | Author's claims vs. observation | **UPHELD with one overstatement.** "78 acceptance assertions pass (was 62)", "3 concurrency shapes still show no overshoot", "restoration and deterministic reapply clean at 16 functions", and "Zero TS/JS changed" are all independently verified true (confirmed via `git diff --stat` against the pre-v4 base: 118 files changed, all under `qa-reports/`, `supabase/migrations-next/phase03a/`, and `supabase/tests/fda028/`). PGTAP_KIND markers are present in all 5 test files as claimed. **Overstatement:** the commit message's "Fixed by splitting the API" for REV-1 reads as if the defect were eliminated; per A1 above, the defect is unchanged in the code and only the currently-granted attack surface is closed. |

**VAULT_IO / IPV6_HOSTED_EVIDENCE:** confirmed neither is asserted as proven anywhere in the new
artifacts. No `vault` schema exists in any local test path (grep-confirmed), so the Vault branch
of `read_epoch_key`/`write_epoch_key` is genuinely never executed locally, matching the honest
`VAULT_IO: UNVERIFIED_LOCALLY` label. `IPV6_HOSTED_EVIDENCE: OPEN` is unchanged in
`V4A_PREPARED_AND_KEY_DESIGN.json` and `V4EF_LOCAL_RESULTS.json`; nothing in the r2 diff
overturns it.

## What v4-r2 got right

The purge live-window fix (A3) is a real, complete fix — I could not break it under any
configuration, edge-case timestamp, or concurrent load I could construct, including the exact
concurrency shape that produced ledger undercounting in r1. The API split for the clock (A1) is
a genuine, verified reduction in today's attack surface: `service_role` now has provably zero
reach into any clocked function or any table in the `limiter` schema, and the shadow-`now()`
attack I invented to test for a bypass failed cleanly. The 16 new NAT64/RFC-8215/legacy-IPv4
regression tests in `acceptance3.sql` are real, well-targeted tests for the forms they cover, and
the fixed `db:pgtap` PGTAP_KIND classification gap is genuinely closed (all 5 SQL test files now
carry the marker; the harness's own inherited baseline problem is correctly distinguished from
what v4-r2 introduced). Rollback and reapply are honestly complete and idempotent — verified by
actually running them, not just reading them.

## Residual risk the owner must accept

- **The rate limiter's core safety claim — "epoch is a pure function of request time; no caller
  can force an advance" — remains false of the code.** It is currently true only because nothing
  is granted execute on the vulnerable functions. This is a single `GRANT` statement away from
  reopening exactly the original defect, with no other layer to catch it. Fix the function
  itself before ever wiring an Edge Function or ops role to the `*_at` surface.
- **NAT64 deployments using a Network-Specific Prefix other than the well-known `/96` still let
  two different real people share one rate-limit budget.** This is not an exotic configuration —
  RFC 6052 names `/56` and other lengths as ordinary operator choices — and this project still
  has zero measured IPv6 traffic to say how often it would occur in practice.
- **Everything upheld here is still true only for the ledger and admission mechanism, not for the
  system**: the bypass (direct anon INSERT into `public.flags`/`public.feedback`) remains fully
  open by design and is honestly disclosed, not hidden. None of the findings above cause damage
  today because nothing outside this migration's own test suite calls any of these functions yet.
- **Nothing schedules `purge()`.** The fix means it's now safe whenever it does run, but the
  "no pg_cron wiring" gap first named at v1 is still present.
- **The privacy regression from v3 Finding 3 is unchanged in kind:** a compromise of both DB and
  Vault access still lets an actor forward-ratchet from whatever epoch they hold, bounded by
  `reseed_interval` rather than eliminated. v4-r2 does not claim otherwise.
