# FDA-028 GAB-3 (v3) — independent adversarial re-review

**VERDICT: HOLD.** The ledger/concurrency core is genuinely sound and independently reproduced — this is real progress over v1 and v2. But v3's central self-description ("the complete admission function is published and tested, not elided") is not accurate for the mechanism as a whole: the HMAC/Vault derivation and the actual guest-write enforcement — the two most safety-critical, most novel pieces — are still unpublished prose, exactly the defect class that sank v1 and drew v2's MUST-FIX Finding 5, just relocated to a different part of the pipeline. A purge-ordering gap can silently violate the "BUCKET_ALLOWANCE is the only ceiling" invariant the starvation-fix argument depends on. And the privacy regression from a destroyed per-window secret to one long-lived rotated secret is real and understated. None of this falsifies the architecture — it is not a FAIL — but it is not ready to put to the owner as a closed recommendation.

Reviewer role: bounded, read-only, adversarial. I did not author any of the documents under review and treated every claim — including claims already re-verified by the author — as something to falsify, not as settled fact. I built my own disposable local PostgreSQL 17.11 cluster (TCP 127.0.0.1:55521, scratchpad-only, torn down after use) and loaded `gab3-admission-function.sql` verbatim (not a reconstruction) to reproduce T1–T8 and run new adversarial cases. For the Cloudflare trust-boundary claim I made a small number of unauthenticated, read-only GETs/OPTIONS to `https://ctshxbykuemeqnofqcdh.supabase.co/rest/v1/` using only RFC 5737 sentinel addresses (192.0.2.1, 198.51.100.7, and a private 10.x control) — no real IP was ever sent or logged. No staging or production database was touched, no Edge Function was deployed or invoked, no file other than this one was written.

---

## The eleven items

| # | Item | Verdict |
|---|---|---|
| 1 | Run the published function (T1–T8 + adversarial) | **UPHELD** for the ledger logic itself — all 8 tests reproduced exactly, and it survived same-grant races, cross-bucket mixing, negative/zero/huge parameters, and mixed-key concurrency with no overshoot, no lost update, no deadlock. **WEAKENED** as a claim about "the complete function" — see Finding 1. |
| 2 | The starvation fix | **WEAKENED** — the "mint always costs a unit in the same call" half of the argument is UPHELD (proved: no mint-without-spend path exists). The "BUCKET_ALLOWANCE is the only ceiling, so it can never be exceeded" half is **FALSIFIED** under bucket-row purge with grant-row survival (Finding 2). |
| 3 | Fail-closed on missing signal | **UPHELD** for the specific claim tested (a caller cannot suppress or spoof `cf-connecting-ip`; OPTIONS/preflight is blocked identically). **WEAKENED** on completeness of "no path bypasses Cloudflare" (DNS-consistent, not exhaustive) and on what "fail closed" actually binds (client roles only, not anything already holding the service-role key). |
| 4 | The probe's conclusion | **UPHELD**, independently reproduced live, today, with clean controls (Finding 4-verification below). |
| 5 | IPv6 /128 fail-safe | **WEAKENED** — correct in principle, understates real-world severity given automatic OS-level IPv6 privacy-address rotation (Finding 4). |
| 6 | Privacy / unlinkability | **WEAKENED** — real regression from a destroyed per-window secret to one long-lived rotated secret, honestly flagged but materially understated in scope (Finding 3). |
| 7 | Bypass | **UPHELD** — REVOKE INSERT + dropping both policies (including the no-`TO`-clause one) verified against the actual schema; no other permissive policy/view/RPC/Storage/Realtime path found; `FORCE ROW LEVEL SECURITY` confirmed unset on both tables. |
| 8 | Vault / HMAC | **WEAKENED** — `pgcrypto`'s `hmac()` confirmed present and correct, 16-byte truncation is adequate for this non-adversarial-verification use. But the actual derivation code (Vault read + hmac + unwrap + truncate) is unpublished and untested — same gap class as Finding 1 (Finding 1/8 overlap). |
| 9 | Rollout / scope | **UPHELD** — S0–S6 framing verified against `OLD_CLIENT_ROLLOUT_CONSTRAINT.md`, consistent, doesn't overload "T1", doesn't authorize past S3. |
| 10 | Thresholds | **UPHELD empirically, wording overstated** — `p_normal` and `p_bucket_allow` are genuinely two independent knobs (proved: `p_normal > p_bucket_allow` is safely bounded by the smaller value); "BUCKET_ALLOWANCE is the single policy number" should read "the only refusal ceiling," not "the only knob" (Finding 6). |
| 11 | v3's "what changed from v2" table vs. the 15 v2 findings | **WEAKENED** — 12 of 15 are genuinely addressed or honestly restated. Findings 9 and 11 are silently dropped: no rollback-lever discussion exists anywhere in v3, and the network-rotation-difficulty overstatement is untouched (Finding 5). |

---

## Findings

### Finding 1 [MUST-FIX] — "the complete function is published and tested" is true only for the ledger, not for the mechanism v3 itself describes

`FDA028_GAB_3.md:33` (MECHANISM): *"One `SECURITY DEFINER` function then does the HMAC, the ledger decision and the `INSERT` in a single transaction."* `FDA028_GAB_3.md:67-78` (IDENTIFIER_DERIVATION) describes that HMAC computation — Vault secret read, IPv4-mapped unwrap, `/32`/`/128` branch, `hmac(K_secret, prefix||'|'||window_id)`, truncate to 16 bytes — entirely in prose and a pseudocode block, never as SQL.

`gab3-admission-function.sql` (the artifact actually loaded, run, and tested) does none of that. `grep -n "hmac\|vault\|decrypted_secret" gab3-admission-function.sql` returns nothing. `limiter.admit()` takes `p_bucket bytea` as an **already-formed** parameter — it is the ledger/concurrency layer only, and does not touch `flags`/`feedback` at all (no `INSERT` into either table anywhere in the function). The function that will actually receive a raw guest request, normalize its IP, read the Vault secret, compute the HMAC, and either `RAISE EXCEPTION` or write the row — the exact piece the platform will run against real traffic, and the piece with all of the remaining cryptographic and injection risk — does not exist as tested code anywhere in this review's evidence.

This is precisely the shape of v2's MUST-FIX Finding 5 ("the safety-critical code is never published anywhere... code that reads correctly on paper and was never run"), which v1 was also falsified for. v3's own changelog table claims this is fixed ("Step 4 + `DECLARE` elided → **Unpublishable** | Complete function published and tested"). That claim is accurate for the concurrency-control step v2's Finding 5 was specifically about — and I verified it: `%ROWTYPE` (not `RECORD`) is used throughout, T1 (first-time client, no token) reproduces `ADMITTED` with no crash, and 40-way concurrency reproduces exactly. But it does not make the *overall* mechanism's safety-critical code published — it moves the same category of gap to a different, still-untested part of the pipeline (derivation + enforcement + the actual write).

**Minimum fix:** publish and independently test the actual wrapper function — prefix normalization/unwrap, Vault secret read, `hmac()` call, truncation, the call into `limiter.admit()`, the `IF NOT admitted THEN RAISE EXCEPTION`, and the `INSERT` into `flags`/`feedback` — as one runnable artifact, the same standard v2 Finding 5 demanded and v3 met only for the ledger half.

### Finding 2 [MUST-FIX] — bucket-row purge with grant-row survival breaks "BUCKET_ALLOWANCE is the only ceiling"

`FDA028_GAB_3.md:65` states the entire justification for removing the `grants_issued` cap: *"total consumption is already bounded by `BUCKET_ALLOWANCE` regardless of how many grants exist, because each grant's opening balance is drawn from the bucket's remaining capacity."* This is true **only if the bucket row for a given `(bucket_key, window_id)` persists continuously for the life of that window.** `IDENTIFIER_LIFETIME/DATA_RETENTION` (`FDA028_GAB_3.md:88`) says purge happens at `window_end + 1h`, in prose only — no purge SQL, no `pg_cron` job, nothing runnable is published or tested anywhere in this review's evidence (the same "no local `pg_cron` precedent" gap v1's Finding 15 and v2's Finding 12 already named, now load-bearing for a different guarantee).

**Empirical proof**, against the loaded function on local Postgres:
```sql
-- mint grant on bucket \x0c, allowance=10, consume 3 (bucket units_consumed=3)
-- simulate a purge job that deletes ONLY the bucket row:
DELETE FROM limiter.bucket WHERE bucket_key = '\x0c'::bytea;
-- replay the SAME still-alive grant:
SELECT * FROM limiter.admit('\x0c'::bytea, 1, '<grant>'::uuid, 10, 100);
--  decision | out_grant | remaining
-- ADMITTED  | <grant>   |         6
```
The bucket row is silently recreated at `units_consumed = 0` and the grant continues spending against it. Draining the rest of the grant's own allowance (7 more units, correctly gated by `REFUSED_GRANT` once the grant's own 10/10 is reached — the *grant's* own cap is never violated) leaves the bucket showing `units_consumed = 7`, not the true cumulative `10`. If a second grant on the same bucket had also survived the purge with unspent balance, or if the retention job runs asynchronously per-table (nothing here prevents that), the bucket's real lifetime consumption can exceed `BUCKET_ALLOWANCE` — precisely the invariant the starvation-fix rests on.

**Minimum fix:** tie grant-row lifetime to bucket-row lifetime structurally (foreign key with `ON DELETE CASCADE` from grant to bucket, or a single statement that purges both tables for a window atomically), and add "grant survives bucket purge" as an explicit test case before CODE.

### Finding 3 [MUST-FIX / the flagged "think hard" item] — the privacy regression is real, honestly disclosed, but understated in scope

`FDA028_GAB_3.md:78` states v3 moves from v2's per-window `vault.create_secret` get-or-create to **one long-lived Vault secret with `window_id` mixed into the HMAC message**, and is explicit that *"the unlinkability guarantee weakens from 'secret destroyed' to 'secret rotated', which is stated rather than hidden."* Crediting that honesty, the actual severity is larger than the phrase "secret rotated" suggests:

Mixing `window_id` into the HMAC **input** (not the key) means the underlying secret `K` is identical across every window until the next rotation. Against the threat model v3's own `KNOWN_LIMITATIONS` item 6 names — "an actor with ledger access" — this is not a hypothetical: in this project, whoever has DB-owner/service-role access to read `limiter.bucket`/`limiter.grant` plausibly also has the privilege needed to read `vault.decrypted_secrets` (both require the same elevated Postgres role in Supabase's model). Anyone in that position can forward-compute `hmac(K, candidate_prefix || '|' || window_id)` for **any window `K` has ever covered**, not only the live one — this is a fundamentally different (and stronger) capability than v2's design gave an equivalent actor, because v2's secret for a closed window was gone.

Two things make this worse than "weaker per-window unlinkability":
1. **No rotation mechanism is specified or tested.** "Rotated on an operational schedule" has no defined interval, no defined deletion step, and no precedent anywhere in this codebase (same unverified-mechanism gap as Finding 1/2). "Rotation" commonly means *introducing* a new value, not *destroying* the old one — if the old value isn't deleted, the forward-computation capability above never expires.
2. **The document's own caveat compounds this.** `RAW_IP_STORED` (`FDA028_GAB_3.md:92`): *"crypto-shredding is approximate against PITR and backups."* Under v2's design that caveat bounded the residual risk to roughly one window's worth of backup exposure (after which the secret enabling verification was gone even in a restored backup, provided Vault deletion is also captured/respected by the same backup regime). Under v3's design, if an old secret value is retrievable from any historical Vault backup or was simply never deleted, that same PITR/backup exposure is not bounded by window at all — it is bounded only by how long *any* copy of that secret value survives, which could be months.

This changes `KNOWN_LIMITATIONS` items 6 and 7 from "one day of live-window exposure" to "an unbounded exposure window contingent on an unimplemented rotation-and-deletion policy." The design is not indefensible — it still defeats a **ledger-only** reader who lacks the secret, which is a real and useful property — but the specific actor the document names (ledger-access-holder) is exactly the actor most likely to also hold the secret.

**Minimum fix:** either implement genuine per-window secret destruction (accepting v2's own unresolved `vault.create_secret` atomicity/precedent questions, which then need to be answered rather than avoided), or rewrite `KNOWN_LIMITATIONS` 6/7 to state the true bound: exposure lasts as long as the operational secret plus any of its historical values plus any backup/PITR snapshot survive — and get the owner's explicit sign-off on that, not on "live window."

### Finding 4 [SHOULD-FIX, confirms + extends] — TRUST_BOUNDARY reproduces cleanly; IPv6 severity is understated

**Reproduction, done live against the real hosted project, read-only, RFC 5737 sentinels only:**
```
$ curl -H "cf-connecting-ip: 192.0.2.1"  .../rest/v1/   -> HTTP 403, "error code: 1000"
$ curl -H "cf-connecting-ip: 198.51.100.7" .../rest/v1/ -> HTTP 403, "error code: 1000"
$ curl -H "cf-connecting-ip: 10.1.2.3"    .../rest/v1/  -> HTTP 403, "error code: 1000"   (private/RFC1918 value, still blocked)
$ curl -H "x-real-ip: 192.0.2.1"          .../rest/v1/  -> HTTP 401 (normal "no apikey", NOT blocked)
$ curl -H "true-client-ip: 192.0.2.1"     .../rest/v1/  -> HTTP 401 (NOT blocked)
$ curl -H "x-forwarded-for: 192.0.2.1"    .../rest/v1/  -> HTTP 401 (NOT blocked)
$ curl -H "x-my-custom-test-header: ..."  .../rest/v1/  -> HTTP 401 (control, NOT blocked)
$ curl -X OPTIONS -H "cf-connecting-ip: 192.0.2.1" ...   -> HTTP 403 (preflight blocked identically)
$ curl -X OPTIONS (no spoofed header) ...                -> HTTP 200
```
This is a clean, controlled result: the block is specific to the `cf-connecting-ip` header name, independent of its value (a public sentinel, a different public sentinel, and a private RFC1918 address are all blocked identically), while every other header — including the ones the probe already flagged as forgeable at the function (`true-client-ip`, `forwarded`) — passes straight through to normal auth handling. This is strong, freshly-reproduced, independent confirmation of `TRUST_BOUNDARY` and the probe's conclusion; "error code: 1000" is not a coincidental WAF/bot-rule hit, and the same block applies to CORS preflight (OPTIONS), closing that specific sub-question. `dig` confirms both `ctshxbykuemeqnofqcdh.supabase.co` and its functions subdomain resolve only to Cloudflare-owned ranges (104.18.x, 172.64.x), consistent with (not proof of) "every path traverses Cloudflare."

On IPv6 (`FDA028_GAB_3.md:80-84`): the stated tradeoff (`/128` under-collapses rather than over-collapsing) is the right call given G4 is unmeasured, and the mapped-IPv4 unwrap-before-branch ordering is textually specified correctly (`FDA028_GAB_3.md:72`, "unwrapped FIRST") — but, per Finding 1, this ordering exists only as prose, not as tested SQL. Separately, the severity framing understates real-world exposure: modern mobile OSes (iOS, Android) enable IPv6 privacy-extension temporary addresses **by default**, rotating automatically and routinely — not only via a deliberate "clear storage" or "power-cycle the router" action. At `/128`, this means a meaningful, unquantified share of ordinary mobile guests on IPv6-first carriers will silently present a new bucket on ordinary background reconnects, which sits in tension with the owner's locked contract ("must not refill... reconnects, or otherwise obtains fresh client-session state") in a way that "a subscriber can rotate within their delegation" (read as a deliberate, effortful action) does not convey.

**Minimum fix:** name automatic OS-level IPv6 address rotation as a distinct sub-case of limitation 3/4, and get the owner to accept it knowingly, ideally with an order-of-magnitude estimate of IPv6 share of expected guest traffic.

### Finding 5 [SHOULD-FIX] — two v2 SHOULD-FIX findings are silently dropped, not carried forward

v3's "what changed from v2" table (`FDA028_GAB_3.md:17-29`) accounts for 12 of v2's 15 findings (1–8, 10, 12–15) — verified against `INDEPENDENT_REVIEW_V2.md` line by line. Two are simply absent, from both the table and the rest of the document:

- **v2 Finding 9** (`INDEPENDENT_REVIEW_V2.md:338-350`): `NETWORK_ROTATION_TRADEOFF`'s "materially harder than clearing an app" overstates cellular (airplane-mode toggling) and is false for VPN use. v3's only mention of network rotation is `KNOWN_LIMITATIONS` item 4, unchanged in substance from what v2 already said (`grep` confirms no mention of "airplane," "VPN," or "cellular" anywhere in `FDA028_GAB_3.md`). Not fixed, not restated, not carried forward as a limitation.
- **v2 Finding 11** (`INDEPENDENT_REVIEW_V2.md:376-389`): the three rollback levers are not independent (undeploying the Edge Function after `anon` INSERT is revoked leaves *no* ingestion path at all), and the kill switch's "record-only" semantics were never tested against a REVOKE-applied state. `grep -in "rollback\|lever" FDA028_GAB_3.md` returns nothing — **v3 has no ROLLBACK section at all.** This matters more now, not less: v3's kill switch returns `ADMITTED_LIMITER_DISABLED` (verified: `T7`), a different and clearer semantic than v2's ambiguous "record-only," which is good — but this improvement is never connected back to Finding 11's actual concern (lever independence once `anon` INSERT is revoked), and that concern is not addressed by the semantic change.

Neither omission is dishonest — v3 doesn't claim to have fixed either — but a reader relying on v3 alone, per its own "supersedes v2" framing (`FDA028_GAB_3.md:3`), has no way to know these findings ever existed or whether they still apply. They do.

**Minimum fix:** carry both forward explicitly — either restate them as still-true limitations, or resolve them — rather than dropping them from the record.

### Finding 6 [NOTE] — "BUCKET_ALLOWANCE is the single policy number" is an overstatement

`PRODUCTION_THRESHOLD_DECISION` (`FDA028_GAB_3.md:126`): *"`K` no longer exists as a cap at all; `BUCKET_ALLOWANCE` is now the single policy number."* Empirically, `p_normal` and `p_bucket_allow` remain two independent knobs: `v_opening := LEAST(p_normal, p_bucket_allow - b.units_consumed)` (`gab3-admission-function.sql:44`). Tested `p_normal=100, p_bucket_allow=5` → opens at `5` (bounded correctly by the smaller value); tested `p_normal=1, p_bucket_allow=50` repeatedly → each grant capped at `1` regardless of remaining bucket room. `BUCKET_ALLOWANCE` is correctly the only **refusal ceiling** (nothing can ever exceed it, absent Finding 2's purge gap) — but `NORMAL` still meaningfully shapes per-grant fairness whenever it is set below `BUCKET_ALLOWANCE`, which is presumably the intended production configuration. Wording fix only; no behavior change needed.

### Finding 7 [NOTE] — a concrete landmine for the still-unpublished derivation function

`limiter.admit()`'s `SECURITY DEFINER` sets `SET search_path TO 'limiter', 'pg_temp'` (`gab3-admission-function.sql:18`). The real wrapper function (Finding 1) will need `pgcrypto`'s `hmac()` and a Vault secret read. Supabase installs `pgcrypto` into the `extensions` schema by default, not `public` or `limiter`. If the wrapper copies `admit()`'s restrictive `search_path` pattern without schema-qualifying `extensions.hmac(...)` (or adding `extensions` to its own search path), it will fail at runtime with `function hmac(...) does not exist` — a small, concrete, "reads fine on paper" gap of exactly the kind this whole review chain exists to catch. Should be an explicit test case once Finding 1 is addressed.

### Finding 8 [confirms, no code change] — config fail-safety and PK/CHECK single-row invariant hold

Emptying `limiter.config` does not disable the limiter: `COALESCE(v_enabled, true)` defaults toward "stays enabled," i.e., toward the limiter still running, not toward a bypass — confirmed (`ADMITTED` with normal ledger accounting, not `ADMITTED_LIMITER_DISABLED`, when the config table is empty). The `id boolean PRIMARY KEY DEFAULT true CHECK (id)` design structurally admits at most one row: inserting `id=false` fails the `CHECK`, and a second `id=true` row fails the `PRIMARY KEY` — both verified empirically. No change needed.

### Finding 9 [confirms, no code change] — concurrency and locking hold up under new adversarial cases

Beyond reproducing T1–T8 exactly: 50 concurrent calls reusing the **same already-minted grant** (allowance 100, 1 unit already spent) landed at exactly `units_consumed = 51` on both the bucket and the grant row — no double-spend, no lost update; the bucket row's `FOR UPDATE` lock (taken before the grant lookup, always in that order) serializes all access to a given `(bucket_key, window_id)`, including grant reuse by concurrent callers. 100 concurrent calls spread across 10 different bucket keys produced zero errors and zero deadlocks — consistent with the fixed bucket-then-grant lock order making a lock cycle structurally impossible from `admit()` calls alone. Negative, zero, and `INT_MAX` values for `p_normal`/`p_bucket_allow` all failed safe (`REFUSED_BUCKET_EXHAUSTED` for non-positive values; no crash or overflow at `INT_MAX` in the ranges tested). No change needed.

---

## What v3 got right

All eight published local tests (T1–T8) reproduced exactly against the function loaded verbatim into a disposable Postgres 17.11 instance, including the two headline claims: the starvation fix (`T2`: five mint-and-abandon resets leave `units=5 grants=5`, and a sixth brand-new client is still `ADMITTED`, not `REFUSED_GRANT_CAP`) and 40-way concurrency at an allowance of 10 landing at exactly 10 admitted / 30 refused / `units_consumed = 10`. `%ROWTYPE` genuinely closes the `RECORD`-unassigned trap v2 Finding 5 demonstrated. The pivot of `TRUSTED_INPUT` away from `x-forwarded-for` to `cf-connecting-ip`, and dropping the `x-real-ip` cross-check as "impossible, not merely undesirable," both check out against `PHASE_B_FUNCTION_EVIDENCE.json` and against a fresh, independent, live reproduction of the Cloudflare block done for this review with clean negative controls. The bypass mechanics (`REVOKE INSERT` + drop both policies) were re-verified against the actual current schema, correctly catching that `feedback_insert_self_or_anon` has no `TO` clause and must be dropped rather than narrowed — confirmed by direct inspection of `supabase/schema.generated.sql:1776`. `FORCE ROW LEVEL SECURITY` is confirmed unset on both tables. The self-corrections ("seven pairs" not six; "Web is a legacy client too") check out exactly against `ls` and `release/current.json`. Every file:line citation I checked (`src/lib/flags.ts:1773`, `src/lib/feedbackStore.ts:83`, `20260905055636_phase03a_client_privileges.sql`) was accurate. `S0`–`S6` is used consistently and doesn't overload "T1" the way v2 did. This is a materially more careful, more honestly-caveated document than v1 or v2, and the parts it tested, it tested correctly.

---

## Residual risk the owner must accept

- **What's being approved is not the whole mechanism.** The tested, published artifact is the rate-limiting ledger only. The code that will actually see a raw guest request — IP normalization, the Vault-secret HMAC, and the enforcement `RAISE EXCEPTION` plus the real `INSERT` — does not exist yet in any tested form. Approving v3 approves a sound sub-component, not a working system.
- **The "can never exceed BUCKET_ALLOWANCE" guarantee depends on an unwritten retention job doing the right thing.** If bucket and grant rows for a window aren't purged together, atomically, the guarantee silently breaks in the direction of *more* consumption, not less — the opposite of fail-safe.
- **The privacy story is weaker than "secret rotated" suggests** for anyone who already holds both DB and Vault access in this project (plausibly one person). The exposure window is not bounded by "one live day" the way it reads; it is bounded by however long a secret value and a backup both happen to survive, which is currently unbounded because no rotation-and-deletion mechanism is specified.
- **A meaningful, unquantified share of ordinary mobile guests on IPv6 may get an effectively fresh budget on routine, non-deliberate reconnects**, because of default OS-level address privacy features, not because they tried to evade anything.
- **The entire guest-reporting path becomes hard-dependent on an undocumented Cloudflare behavior** that this review reproduced today but that Supabase does not contractually commit to. The kill switch is real and tested, but it is a manual lever requiring a human to notice an outage, not a fallback.
- **Once bypass closure (S6) ships — not in Phase 03A — all enforcement for guest writes is one `IF`/`RAISE EXCEPTION` in one function, with no RLS backstop**, confirmed structurally (no table has `FORCE ROW LEVEL SECURITY`). That is very likely the right tradeoff given the constraints, but it should be accepted knowingly when S6 is actually proposed, not assumed now.
