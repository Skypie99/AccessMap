# FDA-028 GAB-4 (v4) — independent adversarial re-review

**VERDICT: HOLD.** All 62 published assertions and all three published concurrency shapes reproduce exactly as claimed on a disposable local PostgreSQL 17.11 instance, and B1 (full path in one transaction) is genuinely closed — verified, including a forced-INSERT-failure atomicity test the author's own suite does not run. But two of the three things v4 exists to fix are not actually fixed: the "BUCKET_ALLOWANCE is the only ceiling" guarantee (v3 Finding 2) still breaks under a purge configuration the migration itself allows and the author's own fixture uses, and the key-lifecycle's central claim ("a caller cannot force an advance; epoch is a pure function of request time") is falsified outright — a single call with a caller-supplied `p_now` forces a global key re-seed or produces internally inconsistent bucket/window bookkeeping, with no validation anywhere in the migration. A third, independent defect (NAT64 and legacy IPv4-compatible IPv6 addresses collapsing distinct subscribers into one bucket) was also found under adversarial IPv6 testing. These are safety defects in the mechanism itself, not documentation gaps, so this is a HOLD, not a PASS-with-notes.

Reviewer role: bounded, read-only, adversarial. I did not author any artifact under review and treated every claim, including the author's own re-verified ones, as something to falsify. I built a disposable local PostgreSQL 17.11 cluster (TCP 127.0.0.1:55611, scratchpad-only, destroyed after use) and loaded the exact frozen files byte-for-byte (verified by hash before use). No staging or production database was touched, no Edge Function was deployed or invoked, no file other than this one was written.

## Hash verification

All eight frozen artifacts were hashed with `shasum -a 256` before review and matched the stated values exactly, with no discrepancy:

| File | Match |
|---|---|
| `supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql` | MATCH |
| `supabase/migrations-next/phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql` | MATCH |
| `supabase/tests/fda028/acceptance.sql` | MATCH |
| `supabase/tests/fda028/acceptance2.sql` | MATCH |
| `supabase/tests/fda028/acceptance3.sql` | MATCH |
| `supabase/tests/fda028/fixture.sql` | MATCH |
| `supabase/tests/fda028/devkey.sql` | MATCH |
| `supabase/tests/fda028/concurrency.sh` | MATCH |

Git HEAD (`7da4dd1c3e29e81cee2900cdac81f52fbbfe04eb`) and tree (`07f0514cb5660e18ce87402816d4298a9022a295`) also match `V4_SOURCE_SHA`/`V4_SOURCE_TREE` exactly.

## The nineteen items

| # | Item | Verdict |
|---|---|---|
| 1 | Trusted-input assumptions | **WEAKENED.** `cf-connecting-ip` (via `p_source_raw`) is rigorously validated and fails closed — confirmed. But `p_now` is an equally safety-critical, equally caller-controlled parameter to `admit()`/`admit_guest_flag()`/`admit_guest_feedback()`/`purge()` that receives **zero** validation anywhere. See Finding 1. |
| 2 | Missing-header behaviour (fail closed, nothing written) | **UPHELD.** Reproduced: `REFUSED_NO_TRUSTED_SIGNAL` on NULL and on malformed input, in both `admit_guest_flag` and `admit_guest_feedback`, with zero rows written in either table. Also reproduced under a forced INSERT-constraint failure (see Finding 4): the whole call rolls back, ledger included. |
| 3 | IPv4-mapped IPv6 handling | **UPHELD** for the canonical `::ffff:a.b.c.d` form — reproduced unwrap-before-branch, hex/dotted equivalence, no collapse of distinct mapped addresses, correct landing in the `v4:` namespace. **FALSIFIED** for adjacent IPv4-embedding schemes the migration does not special-case — see Finding 2 (NAT64, legacy IPv4-compatible). |
| 4 | Native IPv6 logic (compressed/expanded/uppercase/zone-id/malformed/`::`/`::1`/deprecated, /64 correctness, collisions) | **WEAKENED/FALSIFIED.** Compressed/expanded/case/`::`/`::1`/zone-id/CIDR/malformed all behave correctly (reproduced). But two different real subscribers **do** collide onto one bucket for two IPv4-embedding forms the code doesn't special-case (Finding 2). |
| 5 | Key lifecycle: one-way ratchet, re-seed, catchup_cap, epoch going backward, can a caller pass `p_now` | **FALSIFIED.** The ratchet is genuinely one-way and re-seed genuinely breaks the chain (empirically proven — see reproduction below). But a caller unambiguously CAN pass `p_now`, and a backward or far-future value breaks the function's own stated invariant ("a caller cannot force an advance") — see Finding 1. |
| 6 | Session-reset continuity | **UPHELD** under normal operation (reproduced: discarding the grant keeps the bucket's spend). **FALSIFIED** under Finding 3's purge scenario, which refills an exhausted budget mid-window with no client action at all — worse than the contract it's meant to protect. |
| 7 | Grant starvation (v2 defect) | **UPHELD.** No grant-slot cap exists; reproduced "brand-new client after 5 resets NOT starved." |
| 8 | Bucket deletion/recreation (v3 defect) | **FALSIFIED.** The literal symptom (an FK-orphaned grant row) is closed. The underlying safety property Finding 2 was actually about — total consumption bounded by BUCKET_ALLOWANCE only if the bucket row persists for the window's life — is not closed. See Finding 3. |
| 9 | Orphan grant behaviour | **UPHELD** for the structural claim: a direct orphan INSERT is rejected with `foreign_key_violation` (reproduced). Does not save item 8. |
| 10 | Concurrency (reproduce + invent worse) | **UPHELD** for all three published shapes (reproduced exactly: 10/10, 25/25, 1/1 with zero orphans) plus five adversarial shapes I invented: same-grant reuse under 30-way concurrency (31/31 consistent), 50-source/150-call fan-out (zero cross-contamination, zero orphans), 40-way concurrent epoch rollover (exactly one (epoch,key) pair returned, no split-brain), and concurrent purge-vs-admission (no deadlock, no crash — but see Finding 3 for what it does produce). No deadlock found anywhere. |
| 11 | Full insert enforcement (INSERT truly in the same transaction) | **UPHELD**, more rigorously than the author's own suite: forced a CHECK-constraint failure on the INSERT itself after admission succeeded — the entire ledger update (bucket + grant) rolled back with it. No unit-spent-without-row and no row-without-unit-spent path exists. |
| 12 | Direct/alternate/feedback bypass model | **UPHELD, honestly disclosed.** `flags anon insert` and `feedback_insert_self_or_anon` policies are untouched by this migration; `src/lib/flags.ts:1773` and `src/lib/feedbackStore.ts:83` still insert directly. The bypass is wide open by design (S1/S3 stage) and the artifacts say so plainly. |
| 13 | NAT/shared-network effects | **UPHELD.** Reproduced: two independent grants coexist on one shared bucket, one exhausting does not block the other, and the bucket-wide `bucket_allowance` (not a per-grant cap) prevents starvation. |
| 14 | Row/resource growth bounds | **UPHELD** under normal operation (every mint spends a unit in the same call, bounding grants_issued by bucket_allowance; verified `grants_issued <= units_consumed` invariant). **WEAKENED** under Finding 1's `p_now` defect, which can mint unboundedly many distinct `(bucket_key, window_id)` rows against a single live epoch key. |
| 15 | Cleanup/purge | **FALSIFIED.** See Finding 3. |
| 16 | Rollback/restoration completeness and idempotency | **UPHELD.** Reproduced forward→rollback→forward with an identical resulting catalog (byte-identical table/function name lists) and a fully working re-applied system (acceptance.sql passes again unmodified). |
| 17 | Secrets/logging leakage | **UPHELD.** Every `RAISE EXCEPTION` in the migration is a static string with no interpolated value (grep-verified: no key material, no IP, no bucket key in any error path). Client-visible outputs (`decision`, `out_grant`, `remaining`, `flag_id`) never include `bucket_key`, `epoch`, or the raw source string. |
| 18 | Production-threshold leakage into architecture | **UPHELD.** Every threshold (`normal_allowance`, `bucket_allowance`, `window_seconds`, `ipv4_prefix`, `ipv6_prefix`, `reseed_interval`, `catchup_cap`, `retention_windows`) is read live from `limiter.config`; none are compiled into function bodies. Test values (2/6/60) are ordinary `UPDATE` statements, not constants. |
| 19 | Rollout compatibility with legacy native + pinned web Build 33 | **UPHELD.** The migration touches nothing outside a brand-new `limiter` schema; no existing RLS policy, table, or grant on `public.flags`/`public.feedback` is altered. Confirmed inert against current traffic by inspection of `supabase/schema.generated.sql` (the `"flags anon insert"` and `feedback_insert_self_or_anon` policies are unchanged) and of the current client code, which still inserts directly. |

## Findings

### Finding 1 [MUST-FIX] — `p_now` is a fully caller-controlled, load-bearing input with zero validation, and the design's central invariant ("a caller cannot force an advance") is false as implemented

`V4A_PREPARED_AND_KEY_DESIGN.json` states as the key-lifecycle design's core safety property: *"advance only while stored_epoch < epoch_of(now()). A caller cannot force an advance; epoch is a pure function of request time."* This is not true of the shipped code. `limiter.current_epoch_key(p_now timestamptz)` (`...20260909120000_fda028_v4_limiter.sql:177-236`) takes `p_now` as a plain parameter with no bound against `clock_timestamp()`, and it is passed straight through from `limiter.admit(p_source_raw, p_grant, p_now)` (line 293) and from the two functions actually granted to `service_role`, `admit_guest_flag(...)` and `admit_guest_feedback(...)` (lines 366, 394) — both of which expose `p_now timestamptz DEFAULT now()` as their last argument, callable with any value.

**Reproduction 1 — forward jump forces a global re-seed and orphans every live bucket in the current window**, disposable Postgres 17.11, fixture+migration+devkey loaded verbatim:
```
-- honest client at real time 2026-09-09 12:00:00 spends 1 unit
select decision from limiter.admit_guest_flag('198.51.100.50', NULL, 1,2,'ramp',3,'a','2026-09-09 12:00:00+00');
--> ADMITTED   (bucket units_consumed=1, epoch=29815921)

-- a single call with an arbitrary future timestamp
select decision from limiter.admit_guest_flag('198.51.100.51', NULL, 1,2,'ramp',3,'attack','2099-01-01 00:00:00+00');
--> ADMITTED

select * from limiter.key_state;
--> epoch went from 29815921 to 67848480 in one call (a full re-seed, since the jump exceeds catchup_cap)

-- the SAME honest client, at their OWN real time, same window, tries again
select decision, remaining from limiter.admit_guest_flag('198.51.100.50', NULL, 1,2,'ramp',3,'a2','2026-09-09 12:00:00+00');
--> ADMITTED, remaining=48   (a BRAND NEW bucket/grant with a FULL allowance — the client's
    original spend is invisible because current_epoch_key(12:00:00) now returns the
    re-seeded key, not the epoch-29815921 key that produced the original bucket)
```
One malformed/malicious timestamp value silently resets the *entire system's* effective budget for the current window — every existing client's bucket becomes unreachable under its true key and any subsequent call (honest or not) mints a fresh, fully-funded bucket. This is not a local, per-attacker effect; it is global, because `key_state` is one shared row.

**Reproduction 2 — backward `p_now` decouples `window_id` from the returned key, creating unboundedly many independent full-allowance buckets from one caller**. `current_epoch_key`'s only branching logic for staleness is `WHILE v_state.epoch < v_target LOOP ... END LOOP` (line 212) — there is no `ELSIF v_target < v_state.epoch` branch at all. When `p_now` maps to an epoch *behind* the stored one, the loop body never executes, and the function falls through to `RETURN QUERY SELECT v_state.epoch, v_key` (line 235) returning the **current** epoch/key pair, silently, with no error. Meanwhile `limiter.admit()` computes `v_window := limiter.window_of(p_now, ...)` (line 322) **directly from the caller's `p_now`**, independent of whatever epoch `current_epoch_key` actually returned. The result: `v_bucket` (derived from the *current* key) is paired with `v_window` (derived from the *caller's chosen, arbitrary* timestamp) — a combination nothing else in the system will ever reproduce. Reproduced: calling with `p_now` one hour behind the stored epoch produced `bucket_key=\xd4a4532e..., window_id=29815860, units_consumed=1` — a fresh, fully-allowanced row, distinct from the real current-window bucket for the same source. Repeating with a different backward `p_now` on each call produces a *new* fully-funded row every time, since `bucket_key` never changes (same current key) but `window_id` does — this is simultaneously a rate-limit bypass (unbounded effective admissions from one source) and an unbounded-row-growth vector (falsifying item 14 whenever this path is reachable), because `(bucket_key, window_id)` is the natural key and every distinct window_id is a "new" bucket with full allowance.

**Why this matters despite `admit_guest_flag`/`admit_guest_feedback` currently being reachable only by `service_role`:** empirically confirmed (`SET ROLE anon`/`authenticated` → `permission denied for schema limiter`), so no external actor can invoke this today, and no Edge Function calling it exists yet (`supabase/functions/` has no `guest-ingest`). The defect is latent, not live. But it is a defect in the exact artifact under review, not in unwritten code: the function's own safety argument ("epoch is a pure function of request time... a caller cannot force an advance") is asserted in the design doc and disproven by the design doc's own function. The day an Edge Function forwards any client-influenceable value into `p_now` — a client-supplied "reported at" timestamp for offline drafts is an entirely plausible, innocent-looking future feature — the entire limiter collapses in one call, with no other defense layer (no RLS backstop exists yet either; see item 12).

**Minimum fix:** validate `p_now` against `clock_timestamp()` with a small, configurable tolerance inside `limiter.admit()` (and `limiter.purge()`), refusing (fail closed) outside it — e.g. `IF abs(extract(epoch FROM (p_now - clock_timestamp()))) > v_cfg.p_now_tolerance_seconds THEN RAISE EXCEPTION ...`. Separately, add the missing backward-epoch branch to `current_epoch_key` so a `p_now` mapping behind the stored epoch is an explicit, fail-closed error rather than a silent epoch/window mismatch — do not rely on the tolerance check alone to make the missing branch unreachable, since `purge()` calls `window_of` independently and has the same untested gap. Add an explicit test case for both directions before this can be called closed.

### Finding 2 [MUST-FIX] — NAT64 and legacy IPv4-compatible IPv6 addresses collapse distinct subscribers into one bucket

`limiter.normalize_source` (line 102-150) special-cases exactly one IPv4-in-IPv6 embedding: the canonical IPv4-mapped form (`v_addr <<= '::ffff:0:0/96'`, line 132). Any other scheme that embeds an IPv4 host address in the **low 32 bits** of an IPv6 address is not recognized, falls through to plain native-IPv6 handling, and gets masked to `/64` (line 149) — which zeroes exactly those low 32 (well, low 64) bits, so the embedded host information is destroyed and every such address collapses to the identical `/64` prefix regardless of which host is embedded.

**Reproduction — NAT64, RFC 6052's well-known prefix, an actively-deployed IPv6-only-mobile-network technology, not a historical curiosity:**
```
select limiter.normalize_source('64:ff9b::203.0.113.7');   --> v6:64:ff9b::/64
select limiter.normalize_source('64:ff9b::198.51.100.9');  --> v6:64:ff9b::/64   (SAME bucket, different host)
select limiter.normalize_source('64:ff9b::203.0.113.7') = limiter.normalize_source('64:ff9b::198.51.100.9');
--> true
```
**Reproduction — deprecated RFC 4291 IPv4-compatible form (`::a.b.c.d`, distinct from IPv4-mapped `::ffff:a.b.c.d`), with the production-default `require_public_ip=true`:**
```
select limiter.is_public_unicast('::203.0.113.7'::inet);  --> true  (not excluded by the IPv6 blacklist,
                                                                       which only names ::/128, ::1/128,
                                                                       fe80::/10, fc00::/7, ff00::/8)
select limiter.normalize_source('::203.0.113.7')  --> v6:::/64
select limiter.normalize_source('::198.51.100.9') --> v6:::/64   (SAME bucket, different host)
```
This directly violates the stated **privacy contract**: *"independent anonymous clients keep independent NORMAL budgets."* Two unrelated guests presenting either address form share one budget; either can exhaust the other's ability to report. Root cause: `is_public_unicast`'s IPv6 branch is an **exclusion blacklist** (deny five specific ranges, allow everything else) rather than an **inclusion allowlist** (accept only `2000::/3`, current global unicast space) — so it silently accepts other reserved/legacy ranges (Teredo `2001::/32`, ORCHIDv2 `2001:20::/28`, the whole deprecated `::/96` IPv4-compatible block, NAT64) without recognizing that several of them embed a distinguishing host address entirely within the bits `/64` masking destroys.

Practical severity: the deprecated compatible form is essentially dead in 2026 client stacks — low likelihood. NAT64 is not; it is standard on several IPv6-only mobile carrier deployments (T-Mobile US and others) reaching IPv4-only or dual-stack-uncertain origins, and this project has zero measured IPv6 traffic (0 of 85 real requests, per `F28A_RESOLUTION.md`), so this exact gap is silently unmeasured rather than ruled out. (6to4, `2002::/16`, was also tested and is fine — its embedded IPv4 sits in bits 16-47, which survive `/64` masking, so distinct 6to4 subscribers do get distinct buckets.)

**Minimum fix:** either (a) extend the unwrap-before-branch treatment to NAT64's well-known prefix and the deprecated IPv4-compatible block the same way `::ffff:0:0/96` is already handled, or (b) replace the exclusion blacklist in `is_public_unicast`'s IPv6 branch with an inclusion allowlist restricted to `2000::/3`. Add explicit test cases for both forms with two distinct embedded hosts, asserting non-collision, mirroring the existing "mapped: distinct mapped addrs do NOT collapse" test.

### Finding 3 [MUST-FIX] — purge can delete the live, currently-being-admitted-against bucket, resetting BUCKET_ALLOWANCE to zero mid-window; v3 Finding 2 is not closed, only its narrowest symptom is

v3's Finding 2 was: *"total consumption is already bounded by BUCKET_ALLOWANCE... only if the bucket row for a given (bucket_key, window_id) persists continuously for the life of that window."* v4's stated closure is the composite FK `ON DELETE CASCADE` from `limiter.grant` to `limiter.bucket` (`...v4_limiter.sql:74-76`), which does structurally prevent an *orphaned grant* — verified: a direct orphan INSERT is rejected with `foreign_key_violation`. But that closes only the literal FK-orphan symptom, not the underlying property Finding 2 was actually about. Nothing prevents the **bucket row itself** from being deleted and silently recreated at `units_consumed = 0` while its window is still live, and every fresh mint after that recreation gets a full new allowance.

`limiter.purge(p_now timestamptz DEFAULT now())` (lines 418-428) computes `v_cutoff := limiter.window_of(p_now, v_cfg.window_seconds) - v_cfg.retention_windows` and deletes `WHERE window_id <= v_cutoff`. `limiter.config.retention_windows` has `CHECK (retention_windows >= 0)` (line 35) — **0 is a legitimately accepted value**, and it is exactly the value the author's own fixture uses throughout (`acceptance.sql:11`, never reset). With `retention_windows = 0`, `v_cutoff` equals the *current* window, so `purge(now())` deletes the bucket a request is live against.

**Reproduction, no concurrency required — deterministic, single-threaded:**
```
update limiter.config set window_seconds=86400, bucket_allowance=5, normal_allowance=5, retention_windows=0;
-- 3 admits, all ADMITTED, bucket.units_consumed = 3
select limiter.purge(now());   --> 1 (one row deleted: the LIVE bucket)
-- bucket table is now empty for this source/window
-- 5 MORE admits against the SAME source in the SAME window, all ADMITTED
-- total flags rows written for one source in one window: 8, against a configured ceiling of 5
```
Confirmed the default (`retention_windows=1`) does NOT reproduce this — `purge(now())` correctly leaves the live window's bucket untouched when retention_windows is at least 1, so this is specifically a `retention_windows=0` hazard, not a defect in every configuration. But the CHECK constraint advertises 0 as valid with no comment warning against it, and the shipped test fixture models exactly that unsafe value without ever restoring it to a safe one.

Also reproduced under real concurrency (20 parallel `admit_guest_flag` calls interleaved with 20 parallel `purge(now())` calls, `retention_windows=0`): no crash, no deadlock, but the bucket's final `units_consumed` was 2 while 21 rows had actually been written to `public.flags` in that window — the ledger accounting is not merely bypassable, it becomes actively wrong (undercounts true consumption), because concurrent purges keep zeroing the counter while writes keep landing.

**This also breaks item 6 (session-reset continuity) in the *opposite* direction from what the owner's locked contract anticipates:** the contract says an exhausted budget must not refill from *client-side* actions (restart, new session, new token). This finding shows it can refill from an entirely *server-side, non-client* action — one `purge()` call — mid-window, for every client sharing that bucket simultaneously, not just an adversarial one. That is a stronger violation than the contract explicitly names.

Nothing in this migration currently schedules `purge()` (no `pg_cron` wiring exists — the same "no local pg_cron precedent" gap v1 Finding 15 / v2 Finding 12 already named is still unaddressed), so this is latent, not live, exactly like Finding 1. But it is present in the exact code being evaluated for eventual apply, and the author's own test fixture already demonstrates the unsafe configuration without flagging it as unsafe.

**Minimum fix:** clamp `purge()`'s cutoff so it can never include `limiter.window_of(p_now, v_cfg.window_seconds)` regardless of configured `retention_windows` (defense in depth), and/or raise the `CHECK` floor to `retention_windows >= 1`. Add an explicit acceptance test that purges the *live* window concurrently with live admissions and asserts the bucket_allowance ceiling still holds — the current suite's purge test (`acceptance3.sql:41-48`) only exercises purging a window ten window-lengths in the past, never a window a concurrent admit is still touching.

### Finding 4 [confirms, no code change] — full-transaction atomicity holds under a harder test than the author's own suite

Forced a CHECK-constraint failure on `public.flags` (`ALTER TABLE public.flags ADD CONSTRAINT force_fail CHECK (severity < 0)`) and called `admit_guest_flag` with a value that passes admission but fails the forced constraint. Result: the call errored as expected, and `units_consumed`, `grants_issued`, and `public.flags` row count were all unchanged afterward — the entire ledger update rolled back together with the failed INSERT. Neither "unit spent without a row" nor "row without a unit spent" is reachable. The author's own suite proves the row-is-written and no-row-on-refusal halves; it does not test mid-function failure after admission succeeds. This review does, and it holds.

### Finding 5 [confirms, no code change] — search_path and privilege hygiene are sound

Every cross-function call inside the migration is schema-qualified (`limiter.window_of(...)`, `limiter.normalize_source(...)`, etc.), every `pgcrypto` call is qualified `extensions.hmac(...)`/`extensions.gen_random_bytes(...)`/`extensions.gen_random_uuid(...)`, and every table reference is schema-qualified (`limiter.bucket`, `public.flags`, etc.) even inside functions whose `search_path` already includes that schema. None of the `SECURITY DEFINER` functions' `SET search_path` clauses list `pg_catalog` explicitly, which means Postgres implicitly searches `pg_catalog` first regardless — built-in functions (`network()`, `host()`, `family()`, `masklen()`, `set_masklen()`) cannot be shadowed via a same-session `pg_temp` object even though `pg_temp` is in every function's search path. Empirically confirmed `anon` and `authenticated` get `permission denied for schema limiter` outright (no `USAGE`, no table grants, no routine grants) — `REVOKE ALL ... FROM PUBLIC, anon, authenticated` correctly strips the default PUBLIC-EXECUTE grant Postgres attaches to every new function. `pgcrypto` living in `extensions` (matching Supabase's default, not stock Postgres' `public`) is an explicit, stated dependency (`fixture.sql:4-5` recreates that exact layout for local testing) rather than a silent assumption.

### Finding 6 [SHOULD-FIX] — the acceptance suite leaves the local database in a broken, non-idempotent state, and doesn't clean up its own destructive test

`acceptance3.sql`'s failure-mode test (`UPDATE limiter.dev_key_material SET k = NULL;`, line 65) is never reversed. Running `fixture.sql` → migration → `devkey.sql` → `acceptance.sql` → `acceptance2.sql` → `acceptance3.sql` in the documented order, then attempting any further call (e.g. `concurrency.sh` against the same database) fails with `FDA028: limiter epoch key absent`, because the dev key store is left permanently nulled. This cost nothing to the review (concurrency reproduction was simply run against a freshly rebuilt database), but it means the "62 assertions, all pass" claim and the concurrency claims are not actually reproducible back-to-back in one continuous session as the setup instructions imply, and if `V4EF_LOCAL_RESULTS.json`'s single JSON blob was meant to represent one continuous local run, that specific claim should be corrected to say two (or more) separate database instances were used.

## What v3's three MUST-FIX blockers actually look like after v4

- **B1 (full real path, one transaction): genuinely CLOSED.** Verified independently, including under a forced mid-function failure the author didn't test (Finding 4).
- **B2 (bucket/grant lifecycle, orphan grants): closed in letter, not in spirit.** No FK-orphan grant can exist — true, verified. But the actual safety property Finding 2 named ("BUCKET_ALLOWANCE bounded only if the bucket row persists for the window's life") is still false under a configuration (`retention_windows=0`) the migration accepts and the author's own fixture uses (Finding 3). Calling this "CLOSED" overstates what was fixed.
- **B3 (key linkability): the cryptography is genuinely closed; an adjacent invariant the same design doc asserts is not.** The ratchet is empirically one-way and re-seed empirically breaks the chain — both independently reproduced and traced through five consecutive epoch steps including a reseed boundary. But the doc's own claim "a caller cannot force an advance" is false as implemented (Finding 1), which undermines the trust model the ratchet design depends on just as much as raw linkability would.

## What v4 got right

The full-path, one-transaction design is real and correctly implemented — this is the single most important thing v3 was missing, and it now exists, is tested, and survives a harder atomicity test than the author ran. The IPv4-mapped-address unwrap (the specific v3 defect named in the brief) is correct and thoroughly tested, including the hex/dotted convergence case. The concurrency control (bucket-then-grant lock order, always) is genuinely deadlock-free under five separately-invented adversarial shapes beyond the three published ones, including concurrent epoch rollover, which resolved to exactly one epoch/key pair across 40 simultaneous callers with no split-brain — this specific race is what sank the *previous* attempt at this same code (`AUTH-3` in the author's own defect log) and it is now solid. Search-path and privilege hygiene are careful and correct throughout, better than most Postgres code this reviewer has seen. The honesty pattern is real: `VAULT_IO: UNVERIFIED_LOCALLY` and `IPV6_HOSTED_EVIDENCE: OPEN` are both accurate — neither branch is reachable in the local fixture (grep-confirmed no `vault` schema exists locally, so the Vault code path is genuinely never executed), and nothing in the artifacts asserts a pass on either claim. The rollback is complete and idempotent: forward → rollback → forward reproduces a byte-identical catalog and a fully working system. The migration is genuinely inert against current production traffic — confirmed by inspecting the actual RLS policies and client code, not merely by the author's assertion.

## Residual risk the owner must accept

- **The rate limiter can currently be made to admit unbounded requests from a single source, or to globally reset every client's budget in the current window, through a code path that is not reachable by any external actor today** because nothing outside `service_role` can call these functions and no Edge Function invoking them exists yet. This is a real defect in the reviewed artifact, not a hypothetical one, and it must be fixed before any future Edge Function is written against this contract — not discovered afterward when a well-meaning feature change (e.g., accepting a client-supplied report timestamp) accidentally wires it up.
- **Two IPv6 address families — NAT64 and the deprecated IPv4-compatible form — currently let two different real people share one rate-limit budget.** NAT64 in particular is not exotic; it is standard on some IPv6-only mobile carriers, and this project has zero measured IPv6 traffic to say how often it would actually occur.
- **The purge/retention mechanism is still, as v1/v2/v3 already noted, a bare function with no scheduling wired to it.** Nothing calls it today. When something eventually does, the default configuration (`retention_windows=1`) is safe against the live-window defect found here, but the config schema itself does not prevent the unsafe value, and the author's own test fixture already models it without a warning.
- **Everything this review upheld is still true only for the ledger and admission mechanism, not for the system.** The bypass (direct anon INSERT) remains fully open by design (S1/S3 stage) — this is honestly disclosed, not hidden, but it means none of the above defects are self-evidently containing damage today; they matter for the day this mechanism actually goes live, which requires client work this phase does not include.
- **The privacy regression noted in v3 Finding 3 is unchanged in kind:** a compromise of both DB and Vault access still lets an actor forward-ratchet from whatever epoch they hold, bounded by `reseed_interval` rather than eliminated. v4 does not claim otherwise and this review found nothing new to add here.
