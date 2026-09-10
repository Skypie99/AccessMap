# FDA-028 GAB-4 (v4-r4) — independent adversarial re-review

**VERDICT: HOLD** (LOCAL gate only — not staging/integration/production). All three prior
MUST-FIX findings (r1 caller-clock, r2 NAT64-/96-only, r3 epoch-wedge) are genuinely repaired
and stay repaired under harder adversarial pressure than any prior round applied. All 107
acceptance assertions and all three published concurrency shapes reproduce exactly. But the
exact mechanism r4 introduces to close r3's wedge — a single-value `window_seconds` domain
marker on `limiter.key_state` with no memory of any value other than the one most recently
used — has two consequences neither the author's own `DOMAIN_RESET_ANALYSIS.json` nor any
prior review examined: (1) **returning to a previously-used `window_seconds` value re-seeds
and re-funds every bucket again, every single time**, not once — so the exact "tighten
temporarily, then revert" operator workflow the author's own analysis document uses as its
worked example produces *two* full-budget resets, not one; and (2) **raising `window_seconds`
after it was ever lower permanently orphans every ledger row that existed at that moment**,
because `purge()`'s cutoff is always computed in the *current* domain's epoch numbering, and old,
smaller-window-domain epoch numbers are numerically larger than any cutoff a longer-window
domain will ever compute — so `purge()` silently, permanently stops being able to reclaim them.
Both are demonstrated below with clean, minimal, single-threaded reproductions requiring no
attacker and no concurrency — only two or three ordinary `UPDATE limiter.config` statements, the
same kind of statement the migration's own recovery path and test suite already run. These are
safety defects in the mechanism the review chain exists to validate, not documentation gaps, so
this is HOLD.

Reviewer role: bounded, read-only, adversarial. I did not author any artifact under review and
treated every claim — including the author's own re-verified ones, all three prior independent
reviews' verdicts, and the author's own `DOMAIN_RESET_ANALYSIS.json` investigation of the
terminated reviewer's open lead — as something to verify or falsify myself, not to inherit. I
built a disposable local PostgreSQL 17.11 cluster (TCP 127.0.0.1:55950, scratchpad-only, torn
down after use) and loaded the exact frozen files byte-for-byte (hash-verified before use). No
staging or production database was touched, no Edge Function was deployed or invoked, no Vault
or hosted Supabase contact of any kind occurred, and no file other than this one was written.

(Housekeeping note: on starting this review I found roughly a dozen disposable Postgres clusters
left running from the earlier attempt at this same review that was terminated mid-run by a usage
limit — none had been torn down. I killed all of them before starting my own cluster; this cleanup
touched no files and is mentioned only for transparency about the environment I found.)

## Hash verification

All eight frozen artifacts hashed with `shasum -a 256` before any other action, and all match the
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

Git HEAD `a21673f12073f79cb3a3361cdc18b0918a2d8169`, tree
`ffb7c7e7e857ab144f2f2ebb466e2aefd3b8f340` — both match `V4_SOURCE_SHA`/`V4_SOURCE_TREE` exactly.
Per the task brief this HEAD is two bookkeeping commits ahead of the r4 freeze
(`ccaf6fd`); `git diff --name-only 0a6a6b0 -- .` confirms the only files that differ from the
pre-v4 baseline are under `qa-reports/`, `supabase/migrations-next/phase03a/`, and
`supabase/tests/fda028/` — zero application code changed, matching `REGRESSION_MATRIX.json`.

## Part A — did r3's findings close, and did the fix that closed them introduce anything new?

| # | Item | Verdict |
|---|---|---|
| A1 | Epoch-domain wedge (r3 MUST-FIX) | **REPAIRED for the exact wedge r3 found**, but the repair mechanism itself has two new defects — see Findings 1 and 2. |
| A2 | `::`/`::1` exclusion; public-unicast guard now exercised ON | **UPHELD.** Both close cleanly and independently of `require_public_ip`. |
| A3 | NULL/`infinity`/`-infinity` clock through every entry point | **PARTIALLY UPHELD.** `current_epoch_key`/`admit_at`/`admit_guest_flag_at`/`admit_guest_feedback_at` all fail closed cleanly. `purge_at` does not — see Finding 4. |

### A1 — the wedge itself is closed; try-to-re-wedge campaign

I tried, single-threaded and under concurrency, to reproduce r3's exact permanent-freeze wedge
and to invent worse: rapid alternating `window_seconds` changes (60→3600→60→86400, single
session), extreme values (`window_seconds=1` and `window_seconds=2147483647`), changing the
domain while 30 concurrent admissions and 6 concurrent config flips (in both directions) were in
flight, and a deliberate lock-holding session forcing another caller to block mid-call while
config changed underneath it. **None of these reproduce a permanent freeze.** Every single case
converges: once `window_seconds` settles, the very next admission call lands the epoch exactly on
`limiter.window_of(now(), current_window_seconds)`, confirmed repeatedly, including after the
30-way concurrent stress case. r3's specific defect — an epoch pinned forever, unreachable by real
time — is genuinely gone.

```
-- single-threaded rapid toggle, no wedge:
60→ADMITTED,epoch=29817118  3600→ADMITTED,epoch=496951  60→ADMITTED,epoch=29817118  86400→ADMITTED,epoch=20706
-- extreme values, no wedge:
window_seconds=1           → epoch=1789027142 (= window_of(now(),1))
window_seconds=2147483647  → epoch=0          (= window_of(now(),2147483647))
86400 (revert)              → epoch=20706      (= window_of(now(),86400))
-- 30 concurrent admits vs 6 concurrent opposite-direction config flips, then settle:
30 ADMITTED, 29 further ADMITTED (1 REFUSED — ordinary allowance contention, not a wedge), zero
errors, zero deadlocks; final state epoch=20706 = window_of(now(),86400) exactly.
```

But two of these same experiments, examined more closely, surfaced genuinely new problems in the
domain-tracking mechanism itself — see Findings 1 and 2, which is why A1 is not simply "closed."

## Part B — further hunting

| # | Item | Verdict |
|---|---|---|
| B1 | Reproduce all 107 assertions + 3 concurrency shapes | **UPHELD.** All 107 (28+21+58) reproduced, output text-identical (diffed) to `local-acceptance-r4.out.txt`. All three concurrency shapes (10/10, 25/25, 1/1) reproduced with zero overshoot, zero orphans. |
| B2 | `DOMAIN_RESET_ANALYSIS.json` claims | **The two narrow technical claims are TRUE, independently verified. The overall risk characterization is INCOMPLETE** — see Findings 1 and 2, which fall directly inside the scope that analysis set out to investigate but did not examine. |
| B3 | In-flight grants/buckets across a domain reset: orphans, stale grants, unpurgeable rows, unbounded growth | **FALSIFIED. This is the headline finding — see Findings 1 and 2.** Stale-grant handling itself is fine (a grant from before a domain change simply fails to match and a fresh one mints, same mechanism as the existing "stale grant from an old window" test). But bucket-row growth across repeated/reverted domain changes is unbounded in a way the "BUCKET_ALLOWANCE is the sole ceiling" guarantee does not survive, and purge's reachability of old rows is asymmetric and can drop to zero permanently. |
| B4 | Concurrency on the new domain-reset code path; lock ordering | **UPHELD** for crash/deadlock safety (no deadlock, no crash, in any configuration tried, including a deliberately lock-starved caller). **NOT upheld** for domain-marker correctness under a specific race — see Finding 3. |
| B5 | Full INSERT enforcement still atomic | **UPHELD, reconfirmed.** Forced a `CHECK` failure on `public.flags` after admission succeeded; `flags` count and `bucket.units_consumed` were both unchanged afterward — full rollback. |
| B6 | Secrets/logging across every error path, including new ones | **UPHELD.** All 7 `RAISE EXCEPTION` sites (lines 307, 385, 392, 396, 408, 421 — plus the duplicate at 385/392) are static strings, grep-confirmed, zero interpolation. No `RETURNS TABLE` shape exposes `bucket_key`/`epoch`/raw source. The new non-finite-clock check (line 306-308) adds no new leak surface. |
| B7 | Reset continuity, client independence, grant starvation, bucket/grant lifecycle, orphan grants | **UPHELD**, reproduced via the acceptance suite exactly as claimed; unaffected by Findings 1/2 in the single-domain case. |
| B8 | Rollback completeness; idempotent reapply | **UPHELD.** Actually ran rollback → reapply → devkey → all three acceptance files against a live database. 18 functions and 5 real tables (6 incl. fixture-only `dev_key_material`) both before and after, byte-for-byte; all 107 assertions pass again. |
| B9 | Privilege hygiene; `search_path` on every SECURITY DEFINER function; anon/authenticated reachability | **UPHELD.** All 8 `SECURITY DEFINER` functions have an explicit `search_path`. Confirmed via direct `has_table_privilege`/`has_function_privilege` probing (not just catalog inspection) that `service_role`, `anon`, `authenticated` hold zero privilege on all 6 `limiter` tables and zero EXECUTE on any clocked/internal function. |
| B10 | Inertness against production traffic / legacy Build 33 | **UPHELD.** `grep -rl "limiter\."` across `src/`, `supabase/functions/` returns nothing. `src/lib/flags.ts` (lines 1067/1117/1145/1295/1309) and `src/lib/feedbackStore.ts` (lines 83/90/148) still insert directly. `git diff --name-only 0a6a6b0` confirms zero non-`qa-reports`/non-migration/non-test files changed. |
| B11 | Threshold/config leakage into architecture | **UPHELD.** All 9 config fields read live via `v_cfg.*`/direct table reads; none compiled into function bodies. |
| B12 | Author's claims vs. observed reality | **UPHELD, no overstatement found.** Commit `ccaf6fd`'s claims ("107 acceptance assertions pass (was 90)", "restoration clean, deterministic reapply 18 functions", "zero TS/JS changed") are all independently verified true. `VAULT_IO: UNVERIFIED_LOCALLY` and `IPV6_HOSTED_EVIDENCE: OPEN` remain honestly unproven in `V4A_PREPARED_AND_KEY_DESIGN.json`/`V4EF_LOCAL_RESULTS.json`, unchanged and un-overstated. |
| B13 | Anything else, line-by-line | See Finding 3 (stale-config race) and Finding 4 (`purge_at` non-finite clock). |

## Findings

### Finding 1 [MUST-FIX] — the domain marker has no memory: revisiting a previously-used `window_seconds` value re-seeds and re-funds every bucket again, not just once

`limiter.key_state` (lines 60-70) stores exactly one `window_seconds` value: the domain the
*current* epoch was last computed under. `current_epoch_key`'s domain check (line 325,
`v_state.window_seconds IS DISTINCT FROM v_cfg.window_seconds`) cannot distinguish "this is a
domain we have never used before" from "this is a domain we used two changes ago and are simply
returning to" — both look identical, because only the single most-recent value is remembered. Both
trigger the exact same full reseed (line 330: `gen_random_bytes(32)`), which mints a brand-new
epoch key and therefore a brand-new `bucket_key` for every source, giving every active client a
fresh, fully-funded bucket.

This means the "operator footgun" `DOMAIN_RESET_ANALYSIS.json` accepts as *"a bounded one-time
reset"* is not bounded to one occurrence per deployment lifetime — it recurs on **every single
transition**, including a **revert to a value already in effect before**. The analysis document's
own worked example is: *"operator temporarily tightens the window for stricter abuse
monitoring... operator reverts to the shipped DEFAULT window_seconds."* That sequence is a
domain visit followed by a domain **revisit** — and produces **two** full resets, not the one the
"footgun, once" framing implies, with no way for an operator to know this without reading the
`key_state` table's implementation.

**Reproduction, disposable Postgres 17.11, single session, no concurrency required:**
```sql
update limiter.config set window_seconds=86400, bucket_allowance=1000, normal_allowance=1000, require_public_ip=false;
select decision from limiter.admit_guest_flag('203.0.113.171', NULL,1,2,'ramp',3,'v1');  -- ADMITTED
-- bucket: \xcc33a047... | window_id=20706

update limiter.config set window_seconds=3600;
select decision from limiter.admit_guest_flag('203.0.113.171', NULL,1,2,'ramp',3,'v2');  -- ADMITTED
-- bucket: (new key) | window_id=496952

update limiter.config set window_seconds=86400;   -- REVERT to the value used in v1
select decision from limiter.admit_guest_flag('203.0.113.171', NULL,1,2,'ramp',3,'v3');  -- ADMITTED
-- bucket: \x4a390bc7... | window_id=20706   <-- SAME window_id as v1, DIFFERENT bucket_key

update limiter.config set window_seconds=3600;    -- REVERT again
select decision from limiter.admit_guest_flag('203.0.113.171', NULL,1,2,'ramp',3,'v4');  -- ADMITTED
-- bucket: (yet another new key) | window_id=496952  <-- SAME window_id as v2, DIFFERENT bucket_key

select bucket_key, window_id, units_consumed from limiter.bucket order by window_id;
--  \xcc33a047...  | 20706  | 1
--  \x4a390bc7...  | 20706  | 1     <- SECOND, independent, fully-funded bucket for the SAME
--                                     source under what is nominally the SAME calendar window
--  \x24cc7cc6...  | 496952 | 1
--  \x95b17aed...  | 496952 | 1     <- same duplication in the other domain
```
A single source now has **two** independent, fully-funded buckets both claiming `window_id=20706`
— total effective consumable budget for that source in that calendar day is now `2 ×
bucket_allowance`, not `bucket_allowance`. A stress test toggling between the same two values 400
times while 400 concurrent admissions ran from one source produced **144 distinct `bucket_key`
values under a single `window_id`** (and 144 more under the other), each independently
fully-funded — direct, repeatable evidence that this compounds without bound: N domain round-trips
produce up to N independent full allowances per source per calendar window, not one.

This directly falsifies the "BUCKET_ALLOWANCE is the sole ceiling" invariant this migration exists
to establish (per-window_id, not merely per-deployment), and falsifies the "row/resource growth
bounds" item (14) for exactly the operational pattern (tighten, then revert) the author's own
analysis names as the expected, accepted use of this knob.

**Minimum fix:** give `key_state` memory of more than one domain — e.g., a small table keyed by
`window_seconds` holding its own `(epoch, reseed_anchor, epoch_key)` triple, so returning to a
previously-used domain resumes its own prior epoch/key instead of unconditionally re-seeding; or,
if a single active domain is an intentional simplification, document explicitly (and test) that
*every* transition — including a revert — costs a full reset, not just the first one, so an
operator (or an automated config tool) does not treat "revert" as free.

### Finding 2 [MUST-FIX] — raising `window_seconds` after it was ever lower permanently orphans every ledger row that existed at that moment; `purge()` can never reclaim them again

`limiter.purge_at` (lines 563-578) computes `v_cutoff := LEAST(window_of(p_now, v_cfg.window_seconds) - retention_windows, window_of(now(), v_cfg.window_seconds))` and deletes
`WHERE window_id < v_cutoff` — entirely in the **current** domain's epoch numbering (r2's fix,
still correctly clamped to never touch the live window). The problem: `window_id` values minted
under a **smaller** `window_seconds` (a shorter window, hence a larger divisor's inverse — more
windows per unit of wall-clock time) are **numerically larger** than `window_id` values minted
under a **larger** `window_seconds`. If an operator ever **raises** `window_seconds` — exactly the
recovery action r3's own fix relies on, and exactly what `acceptance3.sql`'s `r3b4` test performs
— every row left behind in the vacated (smaller-window) domain has a `window_id` that is now
**larger** than any cutoff the new (larger-window) domain will ever compute, for as long as that
new domain remains in effect. `purge()` will report `0` deleted, silently, forever, and the rows
are never freed by any amount of wall-clock time passing under the new setting.

**Reproduction, disposable Postgres 17.11, no concurrency required:**
```sql
update limiter.config set window_seconds=60, bucket_allowance=100, normal_allowance=100,
       require_public_ip=false, retention_windows=1;
select decision from limiter.admit_guest_flag('203.0.113.160', NULL,1,2,'ramp',3,'a');  -- ADMITTED
-- bucket rows land at window_id ~= 29817121..29817123 (60s epoch numbering)

update limiter.config set window_seconds=86400;   -- operator raises the window back to the default
select decision from limiter.admit_guest_flag('203.0.113.161', NULL,1,2,'ramp',3,'b');  -- ADMITTED
-- new bucket lands at window_id=20706 (86400s epoch numbering)

select limiter.purge();   --> 0     -- the 60s-domain rows are NOT reclaimed
select count(*) from limiter.bucket;  --> 34   -- every 60s-domain row is still present, untouched

-- confirms the asymmetry: LOWERING window_seconds instead DOES let purge reclaim the old rows,
-- because old (larger-window) epoch numbers become numerically SMALLER than the new cutoff:
update limiter.config set window_seconds=1;
select decision from limiter.admit_guest_flag('203.0.113.162', NULL,1,2,'ramp',3,'c');  -- ADMITTED
select limiter.purge();   --> 34    -- ALL 34 previously-stuck rows now sweep in one call
select count(*) from limiter.bucket;  --> 1
```
This is not a hypothetical direction: it is precisely the "operator temporarily tightens... then
reverts to the shipped default" sequence `DOMAIN_RESET_ANALYSIS.json` uses as its own example of
an accepted, expected action, and precisely the "lower it, then raise it back" recovery sequence
r3's Finding 1 reproduction and `acceptance3.sql`'s `r3b4` test both exercise. Every time it
happens, it leaves a permanent, silently-growing layer of unpurgeable `limiter.bucket` and
`limiter.grant` rows (grants cascade-delete only when their parent bucket is deleted, and the
parent bucket is now permanently undeletable by `purge()`). Nothing about this produces an error,
a log line, or any other symptom — `purge()` just returns a smaller number than expected, forever,
after the first such transition.

**Minimum fix:** either (a) purge per-domain using a comparable unit (e.g., store the wall-clock
instant each bucket was minted, not just its domain-relative `window_id`, and cut off on that
instead — this reopens a tradeoff the migration deliberately avoided by removing `expires_at`,
so consider instead), or (b) maintain a small history of retired domains (paired with the fix for
Finding 1) so `purge_at` can compute a correct, comparable cutoff for each one independently, or
(c) at minimum, run an unconditional one-time sweep of the *entire* `limiter.bucket` table
whenever a domain change is detected (accepting the loss of any legitimate in-flight budget in the
vacated domain, which is no worse than the reset that domain change already causes) so old rows
cannot outlive their own domain indefinitely.

### Finding 3 [SHOULD-FIX] — `current_epoch_key` reads `limiter.config` before acquiring the `key_state` lock and never re-validates it, so a caller blocked on that lock can persist a domain marker that disagrees with the live config

`current_epoch_key` reads `v_cfg` once (line 310), **before** attempting the `key_state` row lock
(line 323), and uses that same (potentially stale) `v_cfg` for every subsequent decision in the
call, including the value it **writes back** into `key_state.window_seconds` (lines 338, 370). If
another session changes `limiter.config.window_seconds` and changes it back while a first caller
is blocked waiting for the `key_state` row lock (held by some concurrent domain-changing call),
the first caller resumes using its now-stale `v_cfg` and can overwrite `key_state` with a domain
marker that no longer matches the actual, currently-live config.

**Reproduction:** seeded `key_state` at `window_seconds=60`. Changed config to `3600` (diverging
from `key_state`). Started session H: `BEGIN; SELECT * FROM limiter.key_state WHERE id FOR UPDATE;
SELECT pg_sleep(4); COMMIT;` (holds the row lock). ~0.7s later, started session A calling
`admit_guest_flag(...)` — A reads `v_cfg.window_seconds=3600` (current at that instant), then
blocks on H's lock. ~0.6s into A's block, a third session reverted config back to
`window_seconds=60` (matching what `key_state` already, correctly, held). H's sleep ends at 4s and
it commits, releasing the lock; A resumes with its **stale** `v_cfg=3600`, sees
`key_state.window_seconds(60) IS DISTINCT FROM 3600` → reseeds again → writes
`key_state.window_seconds=3600` — **even though the live config was, at that moment, actually
60**. `SELECT epoch, window_seconds FROM limiter.key_state` afterward showed `496952|3600` while
`SELECT window_seconds FROM limiter.config` showed `60` — a genuine, observed disagreement between
the persisted domain marker and the live config. The very next ordinary admission call
self-corrects it (confirmed), so this is not a permanent wedge, but it is an unplanned, avoidable
extra reseed (with the exact fresh-budget-grant cost of Finding 1) triggered purely by unlucky
timing between two config writes and a contended lock, requiring no attacker — only the same
DB-owner config-write access every other domain-change risk in this review already assumes.

**Minimum fix:** re-read `limiter.config` (at minimum `window_seconds`) *after* acquiring the
`key_state` `FOR UPDATE` lock, and base every decision and every write in the function on that
freshly-locked read rather than the pre-lock snapshot.

### Finding 4 [SHOULD-FIX] — `limiter.purge_at` has no non-finite/NULL clock guard; `infinity`/`-infinity` raise an uncaught Postgres error instead of the migration's own clean fail-closed exception

`current_epoch_key` (lines 306-308) explicitly checks `p_now IS NULL OR NOT isfinite(p_now)` and
raises a clean `FDA028: non-finite clock` (`P0001`) before touching `window_of`. This is what
r3's Finding 5 (NOTE) confirmed closed for the `admit_*` path. `purge_at` (lines 563-578) has **no
such check** and calls `limiter.window_of(p_now, ...)` (line 573) directly:
```sql
select limiter.purge_at('infinity'::timestamptz);
--> ERROR:  cannot convert infinity to bigint
--    CONTEXT:  SQL function "window_of" statement 1
--    PL/pgSQL function purge_at(timestamp with time zone) line 9 at assignment
select limiter.purge_at('-infinity'::timestamptz);
--> (same uncaught error)
```
The call still fails closed (no partial delete occurs — verified the bucket table is untouched
after the error), so there is no unsafe *behavior*, only an unhandled, unclean exception in a
security-relevant function — the exact class r3 flagged as a NOTE for the sibling clocked path,
except here nothing in the r3→r4 diff touched it and no test in the suite exercises `purge_at`
with a non-finite or NULL clock at all (only `admit_guest_flag_at` is tested this way, in
`acceptance3.sql` lines 260-265). `purge_at` is owner-only, matching `admit_at`'s threat model,
so this is not externally reachable today.

**Minimum fix:** add the same `IF p_now IS NULL OR NOT isfinite(p_now) THEN RAISE EXCEPTION...`
guard to the top of `purge_at`, and add a test exercising it, mirroring `acceptance3.sql`'s
existing infinite-clock test for `admit_guest_flag_at`.

## Verifying the author's `DOMAIN_RESET_ANALYSIS.json` myself (per task B2)

Both of the document's own narrow technical claims are **TRUE**, independently reproduced:

- **"Not one privilege is held" by `service_role`/`anon`/`authenticated` on any of the five
  `limiter` tables, across SELECT/INSERT/UPDATE/DELETE.** Confirmed via direct
  `has_table_privilege` probing for all 3 roles × 6 tables (including the fixture-only
  `dev_key_material`) × 4 privileges = 72 checks, all `false`. A domain reset genuinely requires
  raw DB-owner access.
- **"A `reseed_interval` re-seed only occurs while advancing the epoch... cannot reset budgets
  mid-window."** Confirmed by direct code reading: the catch-up loop (lines 350-366) only
  executes when `v_state.epoch < v_target` (line 350), and every loop iteration advances
  `v_state.epoch` by exactly 1 before it can possibly re-seed — so a periodic re-seed is always
  paired with a genuinely new `window_id`, never a same-window key change. No counterexample
  found.

**But the overall conclusion — "operator footgun, a bounded one-time reset... not attacker-
reachable" — is incomplete, not wrong.** Both individual technical claims hold, and the *privilege*
half of the conclusion (not attacker-reachable) is correctly reasoned and independently confirmed
by me above. What the analysis did not examine — because it was scoped to the narrower question
the terminated reviewer's lead actually asked ("is a domain reset itself attacker-reachable, and
can the periodic reseed do it mid-window") — is what happens on a **revisited** domain (Finding 1)
or a **raised** domain that is never lowered again (Finding 2). Both fire on exactly the
"tighten, then revert" example the analysis itself uses to justify accepting the risk, and neither
is "once": Finding 1 recurs on every visit, and Finding 2 is permanent. The analysis's own
recommendation — *"window_seconds should be treated as a rare, deliberate operational change, not
a routine tuning knob"* — undersells the actual cost: even a single such "rare, deliberate"
episode of tighten-then-revert, performed exactly once in the lifetime of a deployment, both
double-funds every active bucket for that day (Finding 1) and permanently orphans that day's rows
if the reversion happened to raise `window_seconds` as it typically would when reverting to a
larger default (Finding 2).

## What v4-r4 got right

The specific wedge r3 found — a permanently frozen epoch after a `window_seconds` increase — is
genuinely gone; I could not reproduce it under any single-threaded or concurrent stress I could
construct, including several harder than any prior round tried (rapid alternation, extreme
divisor values at both ends of the practical range, a deliberately lock-starved caller racing a
config flip). The `::`/`::1` exclusion (Finding 2 of r3) is clean and independent of
`require_public_ip`, verified under both settings, including the NAT64-embedded-private-address
interaction the fix could plausibly have broken and did not. The public-unicast guard is now
genuinely exercised end-to-end by the shipped suite, not merely by me. Rollback and reapply
continue to be honestly complete and idempotent, verified by actually running them. Privilege
hygiene remains careful and, on renewed direct probing (not just catalog inspection), airtight:
zero table or function privilege leaks to any of the three roles an Edge Function could ever hold.
The full-transaction atomicity property (B1's original blocker) continues to hold under a forced
mid-function failure. The author's own commit message for this round is candid and matches
observed reality with zero overstatement I could find, and the `VAULT_IO`/`IPV6_HOSTED_EVIDENCE`
honesty pattern from every prior round is intact.

## Residual risk the owner must accept

- **Two MUST-FIX defects in the domain-tracking mechanism r4 introduced to fix r3's wedge.** A
  `window_seconds` change that is ever reverted (the exact pattern the author's own analysis
  treats as the accepted, expected use of this knob) grants every active client a **second** full
  budget, not a one-time reset — and if that revert happens to raise `window_seconds` (as a revert
  to a larger default typically would), it **permanently** orphans every row that existed at that
  moment, silently defeating `purge()` for that domain forever. Neither requires an attacker;
  both require only the ordinary DB-owner config-write access every other domain-change risk in
  this review chain already assumes, and both fire on the exact operational sequence the system's
  own design and tests already treat as safe.
- **The domain-marker read-then-lock ordering has a narrow, self-healing but real race** that can
  briefly desynchronize the persisted domain from the live config under concurrent config writes,
  costing an extra unplanned reset (Finding 3).
- **`purge_at`'s non-finite-clock handling was never brought up to the same standard as `admit_at`'s**
  (Finding 4) — low severity, owner-only, fails closed, but untested and unaddressed.
- **Everything upheld in this and all three prior reviews is still true only for the ledger and
  admission mechanism, not for the system.** The bypass (direct anon INSERT into
  `public.flags`/`public.feedback`) remains fully open by design (S1/S3 stage) and is honestly
  disclosed, not hidden — none of the findings above cause damage today because nothing outside
  this migration's own test suite and this review calls any of these functions yet.
- **Nothing schedules `purge()`.** Once something does, Finding 2 means its effectiveness silently
  degrades to zero for any domain the system has permanently left behind, with no error to notice
  it by.
- **The privacy regression from v3 Finding 3 is unchanged in kind:** a compromise of both DB and
  Vault access still lets an actor forward-ratchet from whatever epoch they hold, bounded by
  `reseed_interval` rather than eliminated. This review found nothing new to add on that specific
  point.
