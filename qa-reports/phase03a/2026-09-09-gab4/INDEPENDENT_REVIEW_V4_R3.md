# FDA-028 GAB-4 (v4-r3) — independent adversarial re-review

**VERDICT: HOLD.** All 90 published acceptance assertions and all three published concurrency
shapes reproduce exactly as claimed on a disposable local PostgreSQL 17.11 instance, and both r2
MUST-FIX findings (A1 caller-controlled clock, A2 non-`/96` RFC 6052 prefixes) are genuinely
REPAIRED in the code itself, not merely privilege-walled — I re-ran r1's and r2's exact exploits
against the frozen v4-r3 code and both now fail. But the very defence-in-depth mechanism that
closes A1 — clamping the epoch so it can never ratchet backward — introduces a new, more severe
defect than either one it replaces: an ordinary, foreseeable operational action (raising
`limiter.config.window_seconds` after it was ever set to a smaller value, even for an hour, even
by accident) permanently freezes the rate-limiter's epoch at a stale value that real wall-clock
time will not reach again for tens of thousands of years under the new setting. Because the
bucket's `window_id` is now the epoch itself, every subsequent request from *every* source —
including guests who have never made a request before — lands in that one frozen window forever.
Once that window's `bucket_allowance` is exhausted, the entire guest-reporting feature is
permanently denied for good, with no self-healing and no admin function to undo it; the only
escape is an operator manually setting `window_seconds` low enough (or hand-editing
`limiter.key_state`) to catch the frozen epoch up to real time. This is a genuine, previously
undiscussed safety/availability defect in the exact mechanism this review chain exists to
validate, so this is HOLD, not PASS-with-notes.

Reviewer role: bounded, read-only, adversarial. I did not author any artifact under review and
treated every claim — including the author's own re-verified ones and the two prior independent
reviews' verdicts — as something to falsify. I built a disposable local PostgreSQL 17.11 cluster
(TCP 127.0.0.1:55813, scratchpad-only, stopped and not reused after this review) and loaded the
exact frozen files byte-for-byte (hash-verified before use). No staging or production database
was touched, no Edge Function was deployed or invoked, and no file other than this one was
written.

## Hash verification

All eight frozen artifacts were hashed with `shasum -a 256` before any other action and matched
the stated values exactly, with no discrepancy:

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

Git HEAD (`919cec3a87644466326cfc62944fa4ca61d665a7`) and tree
(`8cf409cded847ef546e2d9856fd57048e32140ae`) also match `V4_SOURCE_SHA`/`V4_SOURCE_TREE` exactly.

## Part A — did the r2 findings actually close?

| # | Finding | Verdict |
|---|---|---|
| A1 | Caller-controlled clock (forward re-seed / backward decoupling) | **REPAIRED.** The code itself is fixed, not only privilege-walled. r1's and r2's exact reproductions no longer work against the owner-only `*_at` path. |
| A2 | RFC 6052 Network-Specific Prefixes other than `/96` | **REPAIRED** for all six standard prefix lengths (32/40/48/56/64/96), independently byte-verified against RFC 6052 §2.2 — not just the four lengths the author's own tests exercise. See Finding 2 for a residual edge the RFC-6052 work introduces. |

### A1 — REPAIRED, verified by re-attack, not by trusting the privilege wall

`limiter.current_epoch_key` (`20260909120000_fda028_v4_limiter.sql:284-351`) now adds two clamps
before doing anything else:
```
v_target := LEAST(v_target, limiter.window_of(now(), v_cfg.window_seconds) + 1);   -- line 302
...
v_target := GREATEST(v_target, v_state.epoch);                                      -- line 313
```
I re-ran r1's/r2's exact reproductions directly against the owner-only `*_at` path (not merely
confirming `service_role` can't reach it — confirming the *function itself* now resists the
attack it was built to resist):

```sql
-- fresh disposable DB, honest client seeds the real epoch (20706 under window_seconds=86400)
select * from limiter.admit_guest_flag('198.51.100.50', NULL,1,2,'ramp',3,'honest');
select epoch from limiter.key_state;                              --> 20706

-- FORWARD-JUMP ATTACK, r1's exact vector, p_now = year 2099
select * from limiter.admit_guest_flag_at('198.51.100.51', NULL,1,2,'ramp',3,'attack','2099-01-01+00');
select epoch from limiter.key_state;                              --> 20707  (advanced by exactly ONE window, not a global re-seed)
select bucket_key, window_id, units_consumed from limiter.bucket; --> honest client's original bucket (window 20706) is untouched

-- BACKWARD-JUMP ATTACK, r1's exact vector, p_now = now()-10y then now()-11y
select * from limiter.admit_guest_flag_at('198.51.100.60', NULL,1,2,'ramp',3,'b1', now()-interval '10 years');
select * from limiter.admit_guest_flag_at('198.51.100.60', NULL,1,2,'ramp',3,'b2', now()-interval '11 years');
select epoch from limiter.key_state;                              --> 20707 (unchanged, never went backward)
select count(*) from limiter.bucket;                              --> 3 total (not the unbounded growth r1 produced)
```
Neither the global-re-seed nor the unbounded-row-mint reproduction fires anymore. `p_now = NULL`
is also safe: `window_of(NULL,...)` is NULL and Postgres's `LEAST`/`GREATEST` ignore NULL
arguments, so it silently falls back to `window_of(now())+1`, matching r2's finding for
`purge_at`'s NULL handling. **A1 is closed in the mechanism itself**, which is a stronger and more
honest fix than r2's privilege-only wall (the privilege wall is also still in place as genuine
defence-in-depth — confirmed `service_role`/`anon`/`authenticated` still get `permission denied`
on every clocked function and every table). This is a real repair — but see Finding 1 for the new
defect this exact repair mechanism introduces.

### A2 — REPAIRED for all six standard RFC 6052 lengths, independently re-derived

`limiter.rfc6052_ipv4` (`...v4_limiter.sql:156-179`) implements this byte-index table:
```
32 -> [4,5,6,7]      40 -> [5,6,7,9]      48 -> [6,7,9,10]
56 -> [7,9,10,11]    64 -> [9,10,11,12]   96 -> [12,13,14,15]
```
I derived RFC 6052 §2.2's byte layout independently from the RFC text (prefix bits, then IPv4
bits, with a fixed reserved "u" octet always at byte 8 for every length shorter than `/96`, and
the remaining IPv4 bits continuing immediately after byte 8) rather than trusting the table, and
it matches exactly for all six lengths. The acceptance suite (`acceptance3.sql:168-175`) only
gives explicit numeric vectors for `/32`, `/56`, `/64`, `/96` — **`/40` and `/48` have no shipped
test vector**, so I hand-built my own from the RFC and ran them directly:
```sql
-- /40: v4=203.0.113.1 at bytes[5,6,7,9]
select limiter.rfc6052_ipv4('2001:0db8:aacb:0071:0001:0000:0000:0000'::inet, 40);  --> 203.0.113.1  (correct)
select limiter.rfc6052_ipv4('2001:0db8:aacb:0071:0063:0000:0000:0000'::inet, 40);  --> 203.0.113.99 (distinct, no collapse)
-- /48: v4=203.0.113.1 at bytes[6,7,9,10]
select limiter.rfc6052_ipv4('2001:0db8:aabb:cb00:0071:0100:0000:0000'::inet, 48);  --> 203.0.113.1  (correct)
select limiter.rfc6052_ipv4('2001:0db8:aabb:cb00:0071:6300:0000:0000'::inet, 48);  --> 203.0.113.99 (distinct, no collapse)
```
Both are byte-accurate and produce non-colliding results for distinct hosts. The reserved-octet
zero-check (`substr(hx,17,2) <> '00'`, line 172, which is byte index 8 in a 32-char hex string)
is also correct for every length `< 96`. **MUST-FIX from r2 is closed for the algorithm.** See
Finding 3 for the coverage gap (untested `/40`/`/48`) and Finding 2 for an adjacent edge the fix
does not cover.

## Part B — further hunting

| # | Item | Verdict |
|---|---|---|
| B1 | Reproduce all 90 assertions + 3 concurrency shapes | **UPHELD.** All 90 (`28+21+41`) reproduced verbatim, in the documented fixture→migration→devkey→acceptance*.sql order, output text-identical to `local-acceptance-r3.out.txt` (only cosmetic psql-invocation banner lines differ). All three concurrency shapes (10/10, 25/25, 1/1) reproduced with zero overshoot. `concurrency.sh` also ran successfully **in the same continuous database session immediately after all three acceptance files**, including the one that nulls `dev_key_material` — v3 Finding 6's "suite leaves the DB broken" complaint is resolved: `acceptance3.sql` now explicitly restores `key_state` (line 82) after that destructive sub-test. |
| B2 | Harder concurrency | **UPHELD.** Invented and ran: 30 concurrent admissions vs. 30 concurrent `purge()` calls at `retention_windows=0` (exact accounting: 30 admitted = 30 flags rows = 30 ledger units, no undercounting — a harder version of r2's 20-vs-20 case); 200-call/250-source fan-out spanning 3 real epoch rollovers under `window_seconds=1` (200 admitted = 200 rows = 200 units, zero orphans, zero split-brain); 30-way same-grant reuse against a 5-unit allowance with 1 pre-spent (exactly 4 ADMITTED + 26 REFUSED_GRANT); a 4-second held row lock on `key_state` with a concurrent admission queued behind it (no deadlock, ~4s wait, then success). No deadlock, no crash, no miscount anywhere. |
| B3 | `normalize_source`/`embedded_ipv4` STABLE volatility | **UPHELD, no defect.** Each is called exactly once per `admit_at` invocation; STABLE only affects cross-statement caching, and there is no multi-row scan or generated-column/index use of either function anywhere in the schema (grep-confirmed). No correctness or planner problem found. |
| B4 | Epoch "stickiness" — can it wedge the limiter? | **FALSIFIED / MUST-FIX. This is the headline finding of this review — see Finding 1.** Yes: raising `window_seconds` after it was ever set lower permanently freezes the epoch, and hence every bucket's `window_id`, at a value real time will not reach again on any human timescale under the new setting. |
| B5 | Row/resource growth bounds, incl. `translation_prefix` | **UPHELD** for the ledger tables under normal operation (reconfirmed via the 200-source fan-out: exactly one bucket/grant row per real distinct source-window, `grants_issued <= units_consumed` invariant intact). `limiter.translation_prefix` is admin-only (INSERT/UPDATE require direct DB-owner access, confirmed unreachable by `service_role`/`anon`/`authenticated`), grows only by deliberate operator action, and is not on the admission hot path for writes. See Finding 4 for a configuration-hygiene gap in this table (not externally exploitable). |
| B6 | Full insert enforcement, forced failure + rollback | **UPHELD, extended.** Forced a `CHECK` failure on `public.flags` (`severity < 0`) AND independently on `public.feedback` (`category <> 'bug'`) after admission succeeded in each case. Both calls errored and left `flags`/`feedback` row counts, `bucket.units_consumed`, and `grant` rows completely unchanged — full transactional rollback on both guest-facing entry points (prior reviews only tested the flags path). |
| B7 | Secrets/logging leakage | **UPHELD.** All 6 `RAISE EXCEPTION` call sites (lines 362, 369, 373, 385, 398) are static strings with zero interpolation. Both `EXCEPTION WHEN others` handlers (line 177 in `rfc6052_ipv4`, line 224 in `normalize_source`) return `NULL` silently with no `RAISE`/`NOTICE`. No client-visible `RETURNS TABLE` shape (grepped every one) ever includes `bucket_key`, `epoch`, or the raw source string. |
| B8 | Reset continuity, client independence, grant starvation, orphan grants | **UPHELD.** All reproduced via the acceptance suite exactly as claimed (session-reset keeps bucket spend; brand-new client not starved after 5 resets; orphan grant INSERT structurally rejected via FK). |
| B9 | Rollback completeness, idempotent reapply | **UPHELD.** Every one of the 18 functions and 5 tables (6 counting the fixture-only `dev_key_material`) the forward migration creates has a matching `DROP` in the rollback file (grep-diffed, zero mismatch). Actually ran rollback → reapply → fixture → devkey → all three acceptance files against a live database: catalog counts identical before/after (18 functions, 6 tables incl. `translation_prefix`), all 90 assertions pass again. |
| B10 | Privilege hygiene | **UPHELD.** Every `SECURITY DEFINER` function has an explicit `search_path` (`limiter`, optionally `public`/`extensions`, `pg_temp` — never lists `pg_catalog`, which Postgres implicitly searches first regardless, per r2's confirmed shadow-`now()` test). `service_role` gets `permission denied` on direct writes to every `limiter` table (`bucket`, `config`, `translation_prefix` tested explicitly). Zero grants to `anon`/`authenticated`/`PUBLIC` on any table or routine in the schema (empty result set, both queried directly). |
| B11 | Inertness against production / Build 33 | **UPHELD.** `grep -rl "limiter\."` across `src/` and `supabase/functions/` returns nothing. `supabase/schema.generated.sql` still has `"flags anon insert"` and `feedback_insert_self_or_anon` unchanged. `src/lib/flags.ts:1309` and `src/lib/feedbackStore.ts:83/90` still insert directly with no reference to `limiter`. `git diff --stat` against the migration's own stated base SHA shows only the 8 frozen SQL/shell files changed — structurally impossible to have caused a Jest/TS regression. |
| B12 | Threshold leakage | **UPHELD.** All nine `limiter.config` fields are read live via `v_cfg.*` throughout; no threshold is compiled into a function body (full-file read, not just grep). |
| B13 | Author's claims vs. observation | **UPHELD, with one undisclosed side effect — see Finding 1.** "90 acceptance assertions pass (was 78)" — confirmed exactly. "Concurrency unchanged: no overshoot on actual rows" — confirmed, and holds under harder concurrency I added. "Restoration clean, deterministic reapply 18 functions" — confirmed by actually running it. "Zero TS/JS changed" — confirmed via `git diff --stat`. The commit message (`919cec3a`) states it added "defence in depth... never ratchet backward, never advance more than one window past real time" and separately mentions correcting "a renewal test that assumed non-sticky epochs" — the author is demonstrably aware the epoch is now sticky, but nowhere in the commit message, `V4A_PREPARED_AND_KEY_DESIGN.json`, or any qa-report is the wedge condition in Finding 1 named, tested, or disclosed as a risk the owner must accept. This is not a false claim, but it is a real, undisclosed consequence of a claimed fix. |

**VAULT_IO / IPV6_HOSTED_EVIDENCE:** still honestly reported as unproven. No `vault` schema exists
anywhere in any local test path (grep-confirmed across the whole repo's `supabase/` tree used by
this review), so the Vault branches of `read_epoch_key`/`write_epoch_key` are genuinely never
executed locally, matching `VAULT_IO: UNVERIFIED_LOCALLY`. `IPV6_HOSTED_EVIDENCE: OPEN` is
unchanged and nothing in the r3 diff overturns it.

## Findings

### Finding 1 [MUST-FIX] — the anti-backward-ratchet clamp that closes A1 can permanently wedge the limiter after an ordinary `window_seconds` config change

`limiter.current_epoch_key` (`20260909120000_fda028_v4_limiter.sql:284-351`) computes the target
epoch as:
```
v_target := LEAST(v_target, limiter.window_of(now(), v_cfg.window_seconds) + 1);  -- line 302
...
v_target := GREATEST(v_target, v_state.epoch);                                     -- line 313
```
and `limiter.admit_at` (line 439) sets `v_window := v_epoch` — **the bucket's `window_id` is the
epoch itself**, exactly as the r2-era design intends (this is what closed the "arbitrary window
paired with current key" defect). The problem is what `window_of` does when `window_seconds`
changes: `window_of(p_at, s) = floor(extract(epoch from p_at) / s)`. Decreasing `s` makes the
computed epoch *jump up* (more, smaller windows per unit of real time) — harmless, the forward
catch-up loop or reseed handles it. **Increasing `s` after the epoch was ever computed under a
smaller `s` makes the computed epoch *jump down*** — and the `GREATEST(v_target, v_state.epoch)`
clamp, added specifically to stop a malicious caller from ratcheting backward, cannot tell the
difference between an attacker's forged `p_now` and a legitimate operator's config change. It
holds the epoch at the old, now-unreachable-under-the-new-config value, indefinitely.

**Reproduction, disposable Postgres 17.11, exact epoch numbers, no caller-supplied clock anywhere
— every call below uses the real, guest-facing, clockless entry point `admit_guest_flag`:**
```sql
-- operator temporarily tightens the window for stricter abuse monitoring
update limiter.config set window_seconds=60, bucket_allowance=1000000, normal_allowance=1000000,
       require_public_ip=false;
select limiter.window_of(now(), 60);                                    --> 29816872
select * from limiter.admit_guest_flag('203.0.113.11', NULL,1,2,'ramp',3,'seed');
select epoch from limiter.key_state;                                    --> 29816872  (matches real time)

-- operator reverts to the shipped DEFAULT window_seconds (86400)
update limiter.config set window_seconds=86400;
select limiter.window_of(now(), 86400);                                 --> 20706   (what the epoch SHOULD be now)
select epoch from limiter.current_epoch_key(now());                     --> 29816872 (STUCK at the old value)

-- a BRAND-NEW guest who has never made a request before
update limiter.config set bucket_allowance=3, normal_allowance=3;
select * from limiter.admit_guest_flag('198.51.100.222', NULL,1,2,'ramp',3,'x1');  --> ADMITTED
select * from limiter.admit_guest_flag('198.51.100.222', NULL,1,2,'ramp',3,'x2');  --> ADMITTED
select * from limiter.admit_guest_flag('198.51.100.222', NULL,1,2,'ramp',3,'x3');  --> ADMITTED
select * from limiter.admit_guest_flag('198.51.100.222', NULL,1,2,'ramp',3,'x4');  --> REFUSED_BUCKET_EXHAUSTED
select bucket_key, window_id, units_consumed from limiter.bucket order by window_id desc limit 2;
--> \xe8f6...  | 29816872 | 1     (this brand-new guest's bucket landed in the STALE window)
--> \xd8bd...  | 29816872 | 3     (the earlier seed source's bucket, ALSO stuck in the same window)
```
`29816872 * 86400` seconds is roughly the year 83,900 AD. Under the reverted, correct,
production-default configuration, **no future request from any source will ever get a fresh
window again** until either (a) real wall-clock time actually reaches that point, or (b) an
operator manually lowers `window_seconds` again to a value small enough that
`window_of(now(),s)` exceeds the stuck epoch, or directly hand-edits `limiter.key_state` (a table
no shipped function grants any role write access to — this would require raw `postgres`/owner
access, outside anything this migration exposes). I verified recovery path (b) works:
```sql
update limiter.config set window_seconds=1;
select limiter.window_of(now(),1);              --> 1789012824  (now exceeds the stuck epoch)
select * from limiter.admit_guest_flag('198.51.100.230', NULL,1,2,'ramp',3,'recover');  --> ADMITTED
select epoch from limiter.key_state;             --> 1789012824  (unstuck)
```
No such recovery is documented, tested, or automated anywhere in this migration or its rollback.
An operator who reverts `window_seconds` back to its own default value — an entirely ordinary,
foreseeable administrative action, not an attack — silently converts the per-window rate limiter
into a one-time lifetime cap for every guest, with no error, no log line, and no alarm: the first
sign would be every guest report and every guest feedback submission failing with
`REFUSED_BUCKET_EXHAUSTED` for no apparent reason, indefinitely.

**Answering the prompt's specific B4 question:** clock skew alone (a real system clock briefly
running backward, e.g. an NTP correction) is **not** dangerous — the clamp correctly holds the
epoch steady until real time under the *same, unchanged* `window_seconds` naturally catches back
up, which happens within the same window or the next one. **A `window_seconds` config change is
the dangerous case**, specifically an increase after any period at a smaller value, however
brief. This is a real defect in the exact mechanism this review chain exists to validate, not a
hypothetical: `window_seconds` is ordinary `limiter.config` data with no special protection, and
nothing about testing at a small window (which every acceptance test and this review's own
concurrency tests do, exactly to get fast, deterministic windows) hints that reverting it is
unsafe.

**Minimum fix:** either (a) never let `window_of()` output shrink for the same wall-clock instant
across a config change — e.g., store the `window_seconds` value the current epoch was computed
under, and force a re-seed (not a freeze) whenever `window_seconds` changes rather than silently
comparing raw epoch numbers computed under two different divisors, or (b) bound the clamp's
"backward" definition by elapsed real time rather than by the previous epoch number directly
(e.g., detect `v_target < v_state.epoch AND (real elapsed time since last update) exceeds some
sane bound` as a distinct, explicit re-seed trigger rather than routing it through the same path
that also defends against a malicious `p_now`). Add an explicit acceptance test that changes
`window_seconds` up after having been set down, and asserts the epoch (and hence admission)
recovers within one real window rather than staying frozen.

### Finding 2 [SHOULD-FIX] — the deprecated `::/96` translation prefix wrongly treats `::` and `::1` as embedding IPv4, masked only by an incidental IPv4 exclusion

`limiter.translation_prefix` seeds `('::/96'::inet, 96, 'RFC 4291 IPv4-compatible, deprecated')`
(line 55). `::` and `::1` (the unspecified and loopback addresses) both fall inside `::/96`, so
`embedded_ipv4` "successfully" unwraps them:
```sql
select limiter.embedded_ipv4('::'::inet);    --> 0.0.0.0
select limiter.embedded_ipv4('::1'::inet);   --> 0.0.0.1
```
Under the **production default** `require_public_ip = true` this is harmless by coincidence, not
by design: both `0.0.0.0` and `0.0.0.1` fall inside the pre-existing `0.0.0.0/8` IPv4 exclusion in
`is_public_unicast` (line 262), so `normalize_source` still correctly returns `NULL` for both.
But with `require_public_ip = false` — which is not an exotic setting; it is the setting **every
one of the 90 shipped acceptance assertions runs under**, since `acceptance.sql:12` sets it and
nothing in `acceptance.sql`/`acceptance2.sql`/`acceptance3.sql` ever sets it back to `true` —
these two addresses silently normalize to real, shared, spendable buckets:
```sql
update limiter.config set require_public_ip=false;
select limiter.normalize_source('::');    --> v4:0.0.0.0/32
select limiter.normalize_source('::1');   --> v4:0.0.0.1/32
```
Practical severity is low (a genuine Cloudflare-verified `cf-connecting-ip` reporting `::`/`::1`
as a client address is implausible), but it is exactly the class of edge case the prompt asked
this review to hunt for, it is unmasked only by an unrelated exclusion rule rather than by design,
and it is completely unmeasured by the shipped test suite because that suite never runs any
admission-path assertion under the actual production default. **Minimum fix:** either exclude
`::/128` and `::1/128` from the `::/96` translation-prefix match explicitly, or add an assertion
running at least the trusted-input and fail-closed test blocks under `require_public_ip=true`
before flipping it for the rest of the suite.

### Finding 3 [SHOULD-FIX] — RFC 6052 `/40` and `/48` are implemented and CHECK-constraint-legal but have zero acceptance-test coverage

`limiter.config`... no — `limiter.translation_prefix.plen CHECK (plen IN (32,40,48,56,64,96))`
(line 48) and `rfc6052_ipv4`'s `CASE p_plen` (lines 162-169) both fully support `/40` and `/48`,
and I independently verified both are byte-accurate against RFC 6052 §2.2 (see A2 above,
including a non-collision check for two distinct hosts at each length). But
`acceptance3.sql:168-175` only gives numeric vectors for `/32`, `/56`, `/64`, `/96` — an operator
who declares a `/40` or `/48` Network-Specific Prefix (both are entirely ordinary, RFC-sanctioned
choices, no less likely than `/56`) is relying on code with zero regression coverage. **Minimum
fix:** add the two vectors this review used (or equivalent) to `acceptance3.sql`.

### Finding 4 [NOTE] — `limiter.translation_prefix` has no guard against a declared NSP that shadows ordinary global-unicast space

`embedded_ipv4` (lines 189-203) iterates `translation_prefix` most-specific-first and unwraps the
first match unconditionally; there is no `CHECK` or code-level bound preventing an operator from
inserting an implausibly broad row (e.g. `2000::/3` with `plen=32`), which would misclassify
essentially all real global-unicast IPv6 traffic as "translated" and extract 4 arbitrary bytes
from each address as if it were an embedded IPv4, defeating the `/64` grouping for every genuine
IPv6 subscriber at once. This is **not externally exploitable** — `service_role`, `anon`, and
`authenticated` are all independently confirmed to get `permission denied` on
`limiter.translation_prefix` (only a `postgres`/owner-level session can write to it) — so this is
a pure operator-configuration-hygiene note, not a live defect, consistent with the migration's own
comment that an NSP-declaration mistake is "a fairness/lockout cost, never a limiter bypass" (the
comment addresses *under*-declaration; this note is about *over*-declaration, the other direction
of the same risk).

### Finding 5 [NOTE] — `p_now = 'infinity'` / `'-infinity'` raises an unhandled Postgres error rather than a controlled fail-closed exception

```sql
select * from limiter.admit_guest_flag_at('198.51.100.71', NULL,1,2,'ramp',3,'t','infinity');
--> ERROR:  cannot convert infinity to bigint  (uncaught, from window_of's extract/floor cast)
```
The whole call errors and the transaction rolls back cleanly (verified: zero rows written), so
there is no fail-open behavior — but this is an unhandled exception in a security-relevant
function rather than one of the migration's own deliberate `RAISE EXCEPTION ... USING ERRCODE`
sites. Currently unreachable externally: the guest-facing entry points always pass literal
`now()`, which can never be `infinity`, and the `*_at` path is owner-only. Worth a defensive
`IF p_now IN ('infinity','-infinity') THEN RAISE EXCEPTION` if this surface is ever exposed
further.

### Finding 6 [NOTE, documentation hygiene] — `REGRESSION_MATRIX.json` is stale relative to the current frozen source

`REGRESSION_MATRIX.json:5` records `"v4SourceSha": "7da4dd1c3e29e81cee2900cdac81f52fbbfe04eb"` —
the v4 (r1) checkpoint, two commits behind the current frozen HEAD (`919cec3a`). Its
`db_pgtap.v4IntroducedProblems: 5` (missing `PGTAP_KIND` markers) is **already resolved** in the
current frozen files — I confirmed every one of the five test/fixture files
(`fixture.sql`, `devkey.sql`, `acceptance.sql`, `acceptance2.sql`, `acceptance3.sql`) carries a
`-- PGTAP_KIND:` marker as its first line, matching r2's own note that this gap closed at r2. This
is not a new defect — r2 already flagged the closure — but the matrix file itself was never
refrozen to say so, so a reader who trusts only the frozen artifact list (as this review's own
instructions specify) would see a stale "OPEN" status for something that is, in fact, closed.

## What v4-r3 got right

Both r2 MUST-FIX findings are genuinely closed in the code, not routed around by privilege alone —
I verified this the only way that actually settles it: by re-running the exact prior exploits
against the exact vulnerable code paths and watching them fail. The RFC 6052 work is careful and
byte-correct across all six standard prefix lengths, including the two lengths (`/40`, `/48`) the
author's own suite never tests — I derived and ran those independently and they hold. The purge
live-window fix from r2 continues to hold under harder concurrency than either prior review tried
(30-vs-30 with retention_windows=0, exact ledger accounting, no undercounting this time). The full
transactional-rollback property now holds on both guest-facing entry points, not just the one
prior reviews tested. Rollback/reapply is honestly complete and idempotent, verified by actually
running it against a live database twice. Privilege hygiene remains careful throughout. The
author's own commit message is candid that "a renewal test... assumed non-sticky epochs" was
wrong — the epoch-stickiness behavior itself was noticed during v4-r3's own work, just not carried
through to recognizing the config-change wedge it enables.

## Residual risk the owner must accept

- **A single, ordinary configuration action — reverting `window_seconds` after ever lowering it,
  even briefly, even for legitimate reasons like tighter abuse monitoring or local testing — can
  permanently freeze the rate limiter for every guest, forever, with no alarm and no automated
  recovery.** This must be fixed, or at minimum the owner must explicitly accept a documented,
  monitored constraint of "never change `window_seconds` once it has been set" before this
  migration is ever applied anywhere real traffic will reach it — a constraint nothing in the
  schema, the functions, or the config table enforces or even warns about today.
- **The shipped acceptance suite never validates the production-default `require_public_ip=true`
  end-to-end.** All 90 assertions run with it disabled from the first statement onward. This is
  why the `::`/`::1` mis-unwrap (Finding 2) went unmeasured by 90 passing assertions — the suite's
  breadth is real, but its coverage of the actual default configuration is not.
- **Everything upheld here is still true only for the ledger and admission mechanism, not for the
  system.** The bypass (direct anon INSERT into `public.flags`/`public.feedback`) remains fully
  open by design and is honestly disclosed, not hidden. None of the findings above cause damage
  today because nothing outside this migration's own test suite calls any of these functions yet.
- **Nothing schedules `purge()`.** Once it is wired up, it is now safe against the live-window
  defect (re-confirmed under harder concurrency this round) — but Finding 1's epoch wedge would
  make `purge()` itself equally frozen (it uses the same `window_of`/`key_state` machinery), so a
  scheduled purge job would silently stop rotating retention windows under the exact same
  condition that freezes admission.
- **The privacy regression from v3 Finding 3 is unchanged in kind:** a compromise of both DB and
  Vault access still lets an actor forward-ratchet from whatever epoch they hold, bounded by
  `reseed_interval` rather than eliminated. v4-r3 does not claim otherwise, and this review found
  nothing new to add on that specific point.
