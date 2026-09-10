# FDA-028 GAB-4 (v4-r6) — independent adversarial re-review (sixth pass)

**VERDICT: PASS** (LOCAL gate only — this authorizes no staging, integration, production, or
merge action; the bar is "sound as local work," not "safe to deploy"). r5's TOCTOU is genuinely
closed, independently reproduced closed under both the deterministic held-transaction case and
natural (unforced) concurrency at n=100, in both the lowering and raising direction, with no new
overshoot/corruption/bypass defect found in the mechanism itself. This round does introduce a new,
previously-nonexistent failure surface — the advisory lock itself can be used to stall or fully
freeze all guest admissions — but every path into that surface requires access this project's own
threat model already treats as fully trusted (owner/DB-level access), it degrades availability only
(no data corruption, no bypass, no privilege escalation), and it is fully recoverable. That keeps it
at SHOULD-FIX rather than a HOLD-forcing MUST-FIX, and it does not exist because of a "coupling
between a configurable/caller-supplied time base and the key/window derivation" defect — no such
defect was found this round, which is a first for this chain.

Reviewer role: bounded, read-only, adversarial. I did not author any artifact under review and
treated every claim — the author's, all five prior independent reviews, and the two supporting JSON
notes — as something to verify or falsify myself against a disposable local PostgreSQL 17.11
cluster, not to accept on the page. No staging or production database was touched, no Edge Function
was deployed or invoked, no Vault or hosted Supabase contact of any kind occurred, and no file other
than this one was written.

## Hash verification

All seven frozen artifact hashes hashed with `shasum -a 256` before any other action; all match the
stated values exactly:

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

Current branch HEAD (`a95554fe3ab7ef8bf4c20d9a4c7c33990f5f114a`, tree
`c0377b6e469976a719fe950c09aad5317b450bed`) does **not** literally equal the stated
`V4_SOURCE_SHA`/`V4_SOURCE_TREE` (`eec51b6723d04105a7ba31bf2efd2573b95e8902` /
`23f352bec069522efe9a174a4551c2c484b91de2`) — flagging this explicitly rather than silently
resolving it. Investigated: `eec51b6` is the exact commit `V4_SOURCE_SHA` names (confirmed via
`git rev-parse eec51b6...^{tree}` = the stated tree, exact match), and current HEAD is one commit
further, `git diff eec51b6 HEAD --stat` shows only `qa-reports/phase03a/2026-09-09-gab4/freeze-hashes-r6.txt`
and `qa-reports/phase03a/state.json` changed since — pure review-bookkeeping, zero bytes of drift in
any of the seven frozen files (confirmed independently by the shasum table above matching against
the working tree as checked out). Reviewed exactly the frozen commit's content; no discrepancy in
substance, only in which commit note the task brief's SHA line was written against.

## Part A — does r5's TOCTOU close?

| # | Item | Verdict |
|---|---|---|
| A1 | Lock-itself attack surface: held-open tx, natural concurrency, multi-column UPDATE, `UPDATE...FROM`, `INSERT...ON CONFLICT DO UPDATE`, savepoint rollback, early-return skip | **REPAIRED.** See Findings 0a-0f below for each sub-case. No case reopened the race. |
| A2 | Author's measurement correction (30/30 → 1/30 natural, corrected hit condition) | **CONFIRMED, independently reproduced at higher precision.** See Finding 0g. |

### Finding 0a — r5's exact held-open-transaction reproduction, both directions, now correctly refused

Reran r5's Reproduction 1 (lower 86400→3600) and Reproduction 2 (raise 60→86400) verbatim: Session A
`BEGIN; admit_guest_flag_at(...); SELECT pg_sleep(3); COMMIT;`, Session B fires
`UPDATE limiter.config SET window_seconds = X;` ~1s in, while A is still uncommitted.

Lower direction:
```
Session B: waited 3.03s (blocked on A's shared lock), then:
ERROR:  FDA028: window_seconds cannot change while limiter.bucket has rows. ...
Final: window_seconds still 86400, 1 row present in its own domain (not stranded).
```
Raise direction (60→86400):
```
Session B: correctly blocked, then refused the same way.
Final: window_seconds still 60. limiter.purge() -> 0 (nothing to reclaim; no stranding, because
nothing was stranded). limiter.bucket count -> 1, in the live domain.
```
Both of r5's deterministic reproductions, which previously **succeeded** (config changed, stranded
row survived, no error), now **fail correctly**: the config change waits for A to finish, then sees
A's committed row and refuses. This is the headline repair and it holds.

### Finding 0b — natural (unforced) concurrency, n=100, both directions: 0/100 corrected hits

Ran the fixed code through 100 independent trials (drain ledger, launch one `admit_guest_flag` and
one `UPDATE limiter.config SET window_seconds=<new>` as two unsynchronized background `psql`
processes with `wait`, no artificial delay) using the **corrected** hit condition from
`R5_RACE_MEASUREMENT_CORRECTION.json` (a surviving row whose `window_id` belongs to the OLD domain,
not merely "table non-empty"):
```
FIXED (r6) 100-trial run: config-changed=46 corrected-hits=0  rate=0/100
```
(The other 54/100 trials correctly refused the config change outright, because the admission won the
lock race and left a live row before the config transaction's `EXISTS` check ran — this is exactly
the intended coordination working, not a bug.) Zero stranded old-domain rows across 100 trials.

### Finding 0c — attacks on the lock mechanism itself: all still enforce correctly

- **`UPDATE ... FROM`** changing `window_seconds` on a non-empty ledger: correctly refused
  (`ERROR: FDA028: window_seconds cannot change...`).
- **`INSERT ... ON CONFLICT (id) DO UPDATE SET window_seconds = ...`**: fires the same
  `BEFORE UPDATE ... FOR EACH ROW` trigger (Postgres executes `ON CONFLICT DO UPDATE` as a real
  per-row `UPDATE` internally) — correctly refused on a non-empty ledger, same as a plain `UPDATE`.
- **Multi-row UPDATE**: not constructible — `limiter.config` is capped to exactly one row by
  `id boolean PRIMARY KEY DEFAULT true CHECK (id)`, so this vector does not exist.
- **Savepoint/subtransaction rollback**: `BEGIN; SAVEPOINT sp1; UPDATE ... SET window_seconds=999;
  ROLLBACK TO SAVEPOINT sp1; ...` — verified the EXCLUSIVE advisory lock taken inside the
  now-rolled-back subtransaction is released by the `ROLLBACK TO SAVEPOINT` (a second session's
  competing `UPDATE`, issued while the outer transaction was still open post-rollback, returned in
  0.04s rather than blocking) — Postgres's documented behavior for xact-scoped advisory locks
  acquired in a subtransaction that is later rolled back. No lock leak, no stranded state from this
  vector.
- **Early-return path (`window_seconds` unchanged)**: confirmed by code reading — the exclusive lock
  is only taken inside the `IF NEW.window_seconds IS DISTINCT FROM OLD.window_seconds THEN` guard, so
  an ordinary tuning change to `bucket_allowance`/`normal_allowance`/etc. never touches the advisory
  lock at all and cannot be delayed by it. This is correct and intentional, not a gap.

### Finding 0d — no deadlock

Traced lock-acquisition order on both paths: `admit_at` = advisory-shared → `key_state` row (`FOR
UPDATE`) → `bucket` row (`FOR UPDATE`) → `grant` row (`FOR UPDATE`); the trigger = advisory-exclusive
→ unlocked `EXISTS` read (no row lock at all). The trigger never acquires any row lock, so it cannot
participate in a wait-cycle with `admit_at`'s row locks; the only shared resource between the two
paths is the single advisory key itself, and multiple sessions contending for one lockable object can
only queue, never deadlock. Confirmed empirically: held a 4s `FOR UPDATE` on the sole bucket row while
racing a config `UPDATE` — the config statement returned immediately (correctly refused on a
committed row already visible), no wait, no cycle.

### Finding 0e — lock queueing is fair; the exclusive side cannot be starved by a stream of admissions

Verified Postgres's standard lock-manager fairness applies to advisory locks: with one long-held
shared lock (simulating an in-flight admission), a second session queued for the lock in EXCLUSIVE
mode, and while that exclusive request was still waiting, ten more shared-lock requests were fired in
a rolling stream — all ten queued *behind* the waiting exclusive request and were released only after
it acquired and released the lock, rather than jumping the queue. A `window_seconds` change cannot be
starved indefinitely by continuous ordinary guest traffic. (This is the flip side of Finding 1 below —
it is good news for the exclusive requester, not for everyone waiting behind it.)

### Finding 0f — `read_epoch_key`/`write_epoch_key`, `VAULT_IO`, `IPV6_HOSTED_EVIDENCE` unchanged and still honest

`grep`-confirmed no `vault` schema exists in the local test path; `to_regclass('vault.decrypted_secrets')`
returns NULL. `state.json` still records `VAULT_IO: UNVERIFIED_LOCALLY` and
`IPV6_HOSTED_EVIDENCE: OPEN`, matching every prior round; nothing in this round's three-line diff
touches either code path.

### Finding 0g — Author's measurement correction: CONFIRMED, and precisely reproduced independently

Rebuilt a second disposable cluster from the exact **pre-fix** (r5, commit `a43ce6c`) migration to
independently re-derive the natural race rate rather than trust either party's number. Using the
corrected hit condition (surviving row's `window_id` in the OLD domain, not "table non-empty"):

| Run | Config | Trials | Naive "non-empty" hits | Corrected hits |
|---|---|---|---|---|
| Author + original reviewer (both, first pass) | pre-fix | 30 | 30/30 | not computed (wrong condition) |
| This review, pre-fix, n=30 | pre-fix | 30 | 30/30 | 0/30 |
| This review, pre-fix, n=100 | pre-fix | 100 | 100/100 | **3/100** |
| This review, fixed (r6), n=30 | fixed | 30 | 17/30 (config-changed) | 0/30 |
| This review, fixed (r6), n=100 | fixed | 100 | 46/100 (config-changed) | **0/100** |

My own n=100 pre-fix rate (3/100 ≈ 1-in-33) closely matches the author's corrected figure
(reported as "1/30"); my n=30 sample showing 0 hits is well within the expected variance of a ~3%
true rate (P(zero hits in 30 draws at p=0.03) ≈ 40%). **The correction is right, on both counts the
task brief asked about:** (1) the true natural incidence is a low single-digit percentage, not 100%,
and the naive "table non-empty" condition inflated it exactly as described; (2) it was correct to
apply the same correction to both the reviewer's number and the author's own first (also 30/30, also
using the wrong condition) reproduction — neither party gets a pass for the original methodology, and
the JSON says so plainly rather than only correcting the other party's figure. The fixed code's 0/100
across two independent trial batches (30 and 100) is a strong, not merely lucky, confirmation that the
lock actually closes the window rather than just narrowing it further.

## Part B — hunt for what five reviews missed

| # | Item | Verdict |
|---|---|---|
| B1 | Reproduce all 120 acceptance assertions + 3 concurrency shapes | **UPHELD.** All 120 (28+21+71) reproduced against the frozen files, then reproduced again byte-identically after a full rollback→reapply cycle. All three `concurrency.sh` shapes (10/40, 25/100, 1/1) reproduced with zero overshoot, zero orphans. |
| B2 | Advisory lock as new attack/failure surface: deadlock, DoS via a stuck admission, DoS via a stuck config change, lock-acquisition ordering | **SHOULD-FIX — see Findings 1 and 2.** No deadlock (0d). A stuck/slow admission only ever holds the lock in SHARED mode, which never blocks other admissions (share-share never conflicts) — it can only delay a pending domain change, and per 0e it cannot starve that change forever. But a config-change transaction that takes the EXCLUSIVE lock and does not promptly commit (slow admin tooling, an operator who runs the `UPDATE` and then pauses before committing, a network-idle session) blocks **every** guest admission — the app's core function — for as long as that transaction stays open, unboundedly, with nothing in the schema setting a `lock_timeout` or `idle_in_transaction_session_timeout` to bound it. This is new because the lock itself is new; no prior round could have found it. |
| B3 | Throughput/contention cost of a shared lock on every admission | **NOTE, no meaningful cost found.** 200 concurrent separate-connection admissions (own process + connection each) completed in ~1s wall-clock, indistinguishable from ordinary connection/process overhead; `pg_advisory_xact_lock_shared` is a lightweight in-memory operation and shared-shared never contends, consistent with the author's "no throughput cost in the normal path" claim, which is accurate but only ever describes the normal path — see B12. |
| B4 | `pg_advisory_xact_lock_shared` correctness in `SECURITY DEFINER`, PostgREST one-tx-per-request, repeated calls in one session | **UPHELD.** 300 sequential admissions inside one explicit transaction (simulating repeated same-session calls) completed without error or self-deadlock — a session re-requesting the same shared key multiple times is a normal, additively-refcounted no-op. Xact-scoped locks release automatically at the transaction boundary, which is exactly PostgREST's per-request transaction model; no session-level leak risk (the migration correctly uses the `_xact_` variants, not the session-level `pg_advisory_lock`/`pg_advisory_lock_shared`). |
| B5 | Full insert enforcement atomicity; forced INSERT failure after admission | **UPHELD, reconfirmed on r6.** Added `CHECK (severity >= 0)` to the fixture's `public.flags`, called `admit_guest_flag` with `severity=-5`: call errored, and `public.flags`, `limiter.bucket.units_consumed`, `limiter.grant` were all `0` afterward. Unaffected by this round's change (the advisory lock is acquired and released within the same transaction as the write; a downstream failure still rolls back everything, including any lock side effects — advisory xact locks are automatically released on rollback too). |
| B6 | Secrets/logging across every error path, including the new lock | **UPHELD.** `guard_window_domain`'s `RAISE EXCEPTION` message is an unchanged static string with an operational hint, no interpolation of any bucket key, source address, or config value. `pg_advisory_xact_lock`/`_shared` calls raise no message of their own on success and cannot leak anything through a wait (a blocked session just blocks; no NOTICE, no partial state exposed). |
| B7 | Reset continuity, client independence, grant starvation, bucket/grant lifecycle, orphan grants | **UPHELD**, reproduced via the acceptance suite exactly as claimed, code paths unchanged since r5. |
| B8 | Rollback completeness (`domain_lock_key` is new) and idempotent reapply | **UPHELD, actually run, not just read.** Rollback correctly includes `DROP FUNCTION IF EXISTS limiter.domain_lock_key();`. Ran rollback → reapply → devkey → all three acceptance files against a live database: 20 functions + 6 tables both before and after (identical count), `select count(*) from pg_namespace where nspname='limiter'` = 0 mid-rollback confirming a total teardown, and all 120 assertions pass again after reapply. |
| B9 | Privilege hygiene; anon/authenticated reachability; who can take or observe the advisory lock | **MUST-FIX-flavored finding but scoped to already-trusted access — see Finding 2.** `limiter.domain_lock_key()` itself correctly has zero grants to `anon`/`authenticated`/`service_role` (all three probed `false`), consistent with every other function in the schema. But the underlying primitive it wraps, `pg_advisory_xact_lock(bigint)`/`pg_advisory_xact_lock_shared(bigint)`, is a Postgres built-in with `EXECUTE` granted to `PUBLIC` by default — confirmed directly (`has_function_privilege` returns `true` for `anon`, `authenticated`, `service_role`, and `public` all four). The migration's `REVOKE ALL ON ALL FUNCTIONS IN SCHEMA limiter FROM PUBLIC, anon, authenticated` cannot touch this, because the lockable resource is not a limiter-schema object at all — it is a bare 64-bit integer in Postgres's global advisory-lock keyspace, and the specific integer (`7028001042800001`) is not a secret (it is a literal in a version-controlled file). Anyone who can execute arbitrary SQL against this database at all — regardless of what grants they hold on `limiter.*` — can call `SELECT pg_advisory_xact_lock(7028001042800001)` directly and hold it forever without ever touching a limiter table or function. See Finding 2 for reachability scoping. |
| B10 | Inertness against existing production traffic and legacy Build 33 clients | **UPHELD.** `grep -rl "limiter\."` across `src/` and `supabase/functions/` returns nothing; `git diff --name-only 0a6a6b0 -- .` (pre-v4 baseline) touches nothing outside `qa-reports/`, `supabase/migrations-next/phase03a/`, `supabase/tests/fda028/`. |
| B11 | Threshold/config leakage; is `window_seconds` still meaningfully configuration | **NOTE, unchanged from r5.** All nine fields still read live via `v_cfg.*`. `window_seconds` remains the one field whose change now costs an unbounded wait (Finding 1) in addition to r5's already-established "requires a drained ledger" cost — configuration in the schema sense, increasingly not in the "freely tunable" sense. |
| B12 | Author claims vs. reality across commit message, `local-acceptance-r6.out.txt`, `R5_RACE_MEASUREMENT_CORRECTION.json`, `DOMAIN_RESET_ANALYSIS.json` | **No false claim found; one narrow-scope omission — see Finding 2.** "0/30 natural, and the deterministic held-transaction case now refuses instead of silently accepting" (`R5_RACE_MEASUREMENT_CORRECTION.json`) is true and independently reproduced at higher n (0/100). "Throughput cost: None in the normal path" is true as literally stated but never addresses the abnormal path (a stuck config transaction), which is exactly where the cost is unbounded rather than negligible — an omission of scope, not a misstatement. `120 acceptance assertions pass` (unchanged count) is verified true; note no *new* assertion was added exercising the lock itself (see Finding 3) despite r5 explicitly recommending one. `VAULT_IO`/`IPV6_HOSTED_EVIDENCE` remain honestly `UNVERIFIED_LOCALLY`/`OPEN`, unchanged and un-overstated (0f). |
| B13 | Anything else, line-by-line | See Findings 1-3. No other new defect found in the 27-line net diff (`domain_lock_key` function, two `PERFORM` lines, one rollback line) beyond what is reported here. |

## Findings

### Finding 1 [SHOULD-FIX] — a config-change transaction that does not commit promptly freezes all guest admissions, unboundedly

`limiter.guard_window_domain()` (`20260909120000_fda028_v4_limiter.sql:75`) takes
`pg_advisory_xact_lock` (EXCLUSIVE) for the remainder of whatever transaction issued the
`window_seconds` UPDATE, and `limiter.admit_at` (`:501`) requires the same key in SHARED mode for
every admission. Reproduced: opened `BEGIN; UPDATE limiter.config SET window_seconds = 222;
SELECT pg_sleep(6); COMMIT;` and, from a second session one second in, called
`admit_guest_flag('203.0.113.200', ...)` — it blocked for the full remaining duration (5.03s
measured) and only completed once the first transaction committed. Nothing in the migration sets a
`lock_timeout` on the admission side or an `idle_in_transaction_session_timeout` on the config-change
side, so this window is not bounded by anything the migration controls — an operator who runs the
`UPDATE`, then pauses (to verify something, to answer a message, because their tool defaults to
autocommit-off) before committing, freezes every guest flag/feedback submission app-wide for as long
as they remain paused. Per Finding 0e, this cannot be worked around by "just wait, traffic will get
through eventually" — new admissions queue *behind* the pending/held exclusive lock, not around it.
This requires an actor who already holds `UPDATE` privilege on `limiter.config` — i.e., already
inside this project's existing trusted-operator boundary, the same one every prior review has
accepted for "disabling the trigger requires owner access" — so it does not cross into
attacker-reachable territory and is not itself a MUST-FIX. It is a genuine new operational hazard
this round's own fix introduces and does not document: recommend a bounded `SET LOCAL lock_timeout`
around the admission's lock acquisition (fail the individual request loudly rather than hang it
indefinitely) and/or an explicit runbook note that a `window_seconds` change must be done as a single
autocommitted statement, never inside a longer interactive transaction.

### Finding 2 [SHOULD-FIX] — the domain lock is a bare Postgres advisory-lock integer, not a limiter-schema object, so the migration's own privilege model cannot protect it

Postgres grants `EXECUTE` on `pg_advisory_xact_lock(bigint)` and `pg_advisory_xact_lock_shared(bigint)`
to `PUBLIC` by default; directly confirmed (`has_function_privilege` true for `anon`, `authenticated`,
`service_role`, `public`). `limiter.domain_lock_key()` itself is correctly locked down (no grants to
any of the three roles, consistent with every other function in the schema), but that only protects
the *wrapper*: the literal value it returns, `7028001042800001`, is plainly visible in a
version-controlled source file and is not intended to be secret. Anyone able to run **any** SQL
against this Postgres instance — including a role holding **zero** grants anywhere in the `limiter`
schema, which is exactly the population `REVOKE ALL ON ALL TABLES/FUNCTIONS IN SCHEMA limiter FROM
PUBLIC, anon, authenticated` is meant to fully exclude — can call
`SELECT pg_advisory_xact_lock(7028001042800001)` directly inside an open transaction and reproduce
Finding 1's freeze indefinitely, without ever touching a single limiter table or function and without
tripping any privilege check this migration defines. In practice this still requires a raw SQL
connection to the database (the anon/authenticated path in this app goes through PostgREST's RPC
surface, which only exposes named functions in configured schemas — `pg_catalog` is not one of them
— so an ordinary app client cannot reach this today), which keeps it inside the same trusted-access
boundary as Finding 1 rather than opening a new externally-reachable hole. Recorded because it means
the careful, exhaustively-reprobed "zero privilege leaks to anon/authenticated/service_role on any
table or function in the schema" claim every prior round (correctly) made no longer fully describes
the attack surface this round adds — the new coordination point sits one layer below where that
claim's privilege model operates, and no artifact under review states that.

### Finding 3 [SHOULD-FIX, test-coverage gap] — the fix that closes r5's MUST-FIX has no regression test of its own

r5 Finding 1 explicitly recommended: "adding at least one acceptance test that races an admission
against a `window_seconds` change (something no acceptance file at v4-r1 through v4-r5 has ever
done)." The r6 diff (`git diff a43ce6c eec51b6 -- supabase/`) touches only the migration and its
rollback — `acceptance.sql`, `acceptance2.sql`, `acceptance3.sql`, and `concurrency.sh` are all
byte-identical to r5, hash-confirmed. `concurrency.sh` still only races admissions against each
other, never against a config write. The only verification that the advisory-lock fix works is this
review's own ad hoc reproduction (and the author's, recorded only in JSON prose, not as a runnable,
repeatable assertion). If a future round regresses this fix — e.g., someone "simplifies" the lock
ordering, or a later migration on `limiter.config` reintroduces a code path that bypasses the
trigger — nothing in the shipped, repeatable test suite would catch it. Recommend adding a
deterministic held-open-transaction test (this review's Finding 0a reproduction is directly portable
into `acceptance3.sql` as an `r5`/`r6`-labeled block) before treating this fix as durably locked in.

## What v4-r6 got right

The core repair works and is the first round in this chain where an independent adversarial
reproduction did **not** find a new way to strand or resurrect a ledger row through the
time-base/config coupling that sank r1 through r5. Both of r5's deterministic reproductions (lower
and raise direction) now correctly block and refuse rather than silently succeeding; natural
(unforced) concurrency at n=100 in the fixed code produced zero corrected hits, against a
independently-reproduced ~3% baseline rate in the unfixed code — a real, verified fix, not a
narrowing. The mechanism itself is sound where it was aimed: no deadlock, correct fairness
(exclusive requests cannot be starved by continuous admissions), correct behavior across
`UPDATE`/`UPDATE...FROM`/`ON CONFLICT DO UPDATE`/savepoint-rollback variants, and correct automatic
release semantics for the xact-scoped lock on every path tested including forced rollback. All 120
acceptance assertions and all three concurrency shapes reproduce exactly, including after a full
rollback→reapply cycle actually executed against a live database, not merely read. The author's
measurement correction — the single most falsifiable claim in this round's supporting material — was
independently rebuilt from the pre-fix commit and checked at higher sample size than either original
party used; it holds up, and holds up in both directions (the correction was honestly applied to the
author's own first, equally wrong, 30/30 number, not just the reviewer's). `VAULT_IO` and
`IPV6_HOSTED_EVIDENCE` remain honestly unproven, unchanged, un-overstated across six rounds. This is
a small, surgical, correctly-targeted diff (27 net lines) that does what it says it does.

## Residual risk the owner must accept

- **A `window_seconds` change must be executed as a single, immediately-committed statement.** Any
  operational tooling, script, or habit that leaves the transaction open even briefly after issuing
  the `UPDATE` will freeze all guest flag and feedback submission for the duration (Finding 1) — this
  is new in r6 and is not stated anywhere in the migration's comments or the operator-facing error
  message, which still only says "Drain the ledger first."
- **The coordination lock is a bare Postgres primitive outside the schema's own privilege
  boundary** (Finding 2). This is only exploitable by someone who already has a raw SQL connection to
  the database — a bar this project's threat model has consistently treated as fully trusted since
  r1 — but it means the schema's privilege hygiene, however careful, cannot fully describe who can
  affect the limiter's availability once this lock exists.
- **The fix has no regression test in the shipped suite** (Finding 3). Its correctness today rests on
  this review's and the author's own ad hoc, non-repeatable reproductions, not on anything that would
  fail CI if a later change reopened the race.
- **Everything upheld in this and all five prior reviews is still true only for the ledger and
  admission mechanism, not for the system.** No application code calls any `limiter.*` function yet
  (B10); the bypass (direct anon `INSERT` into `public.flags`/`public.feedback`) remains fully open
  by design, honestly disclosed, and unaffected by anything in this round.
- **`VAULT_IO: UNVERIFIED_LOCALLY` and `IPV6_HOSTED_EVIDENCE: OPEN`** remain genuinely open questions
  this review cannot close without hosted contact, which is out of scope by design.
- **The privacy regression from v3 Finding 3 is unchanged in kind:** a compromise of both DB and
  Vault access still lets an actor forward-ratchet from whatever epoch they hold, bounded by
  `reseed_interval` rather than eliminated. This review found nothing new to add on that point.
