# FDA-028 GAB-1 recommendation — independent adversarial review

Reviewer role: bounded, read-only, adversarial. Reviewed `FDA028_RECOMMENDATION.md` and
`evidence-platform-and-boundary.json` (2026-09-09) against the owner's locked contract and
the privacy contract, cross-checked against the 2026-09-05 prior review, the real schema
(`supabase/schema.generated.sql`), the real client code (`src/lib/flags.ts`,
`src/lib/feedbackStore.ts`, `src/lib/anonRateLimit.ts`, `src/lib/featureFlags.ts`), the real
Phase 03A migration candidates, the real Edge Function precedents, and two independently
re-fetched Supabase documentation pages. Where the document's central SQL artifact made a
falsifiable claim, I built the exact schema and ran the exact SQL against a disposable local
PostgreSQL 17.11 instance (outside the repo, in `/private/tmp/...scratchpad/pgtest`, torn
down after use — no repo file was created or modified other than this one). No hosted
Supabase project, staging branch, or production system was contacted. No file other than
this one was written.

## VERDICT: ACCEPT_WITH_MANDATORY_CHANGES

The architectural direction — network address as the only currently-available trusted
scarce input, a two-tier bucket/grant ledger, trust-the-shape-not-the-value header handling,
Postgres-native atomicity, fail-closed-by-shared-database — is sound and is genuinely the
best option among the four candidates it considered. But the concrete artifact has two
empirically-confirmed defects that make it non-functional as published (the core SQL never
actually spends anything, and the bypass-closure mechanism cannot fire under PostgREST's
request model), plus a missing binding check that lets a spend be redirected to a different
bucket than the one that earned it. These are fixable — I verified working fixes for the
first two — but the document cannot be accepted as-is.

## The seven claims

| # | Claim | Verdict | Why (one line) |
|---|-------|---------|-----------------|
| 1 | Reset persistence | **WEAKENED** | Sound concept; the published SQL persists nothing at all (see #6); IPv6 prefix delegation breaks the "bounded at K×" bound for a large share of real subscribers |
| 2 | Independent-client behaviour | **WEAKENED** | Breaks under prior-consumption-on-the-same-bucket, under the untrusted fallback (which is one *global* bucket, not per-NAT), and under the unbound grant→bucket redirection in #3 |
| 3 | Anti-forgery | **WEAKENED** | Directional claim ("forgery only shrinks") holds and E1/E4 evidence checks out; but the fallback's blast radius is global, whitespace-handling is unspecified, and bucket redirection is possible |
| 4 | Bypass protection | **FALSIFIED** | Transaction-local GUC cannot be visible in the client's separate, later INSERT request — empirically confirmed twice; the mechanism as described cannot admit anything |
| 5 | Privacy claims | **WEAKENED** | No-raw-IP and no-client-identifier hold up; "unlinkable" overstates a real live-window correlation path against publicly-readable `flags.created_at`, and ignores backup retention |
| 6 | Concurrency | **FALSIFIED** | Reproduced against real PostgreSQL 17: the published CTE's `spend` term returns 0 rows on every call, always — a documented data-modifying-CTE same-snapshot restriction, not a race condition |
| 7 | Deployability | **WEAKENED** | `verify_jwt=false` and SECURITY DEFINER patterns are proven in this repo; Vault-from-Edge-Function and pg_cron have no local precedent; a required `GRANT EXECUTE` is missing from the design |

## Findings

### F1 [MUST-FIX] — The published ledger SQL never spends anything (Claims 1, 6)

`FDA028_RECOMMENDATION.md:87-105` was reproduced verbatim against PostgreSQL 17.11 (schema:
`limiter.bucket(bucket_key, window_id, units_consumed, grants_issued)` PK
`(bucket_key,window_id)`; `limiter.grant(grant_id, units_consumed, expires_at)`). Calling it
on a **brand-new** bucket key returns `(0 rows)` and leaves `units_consumed = 0`. Calling it
again on that now-existing row (fresh statement, autocommitted, unambiguously pre-existing)
**also** returns `(0 rows)` and leaves `units_consumed = 0`. Three consecutive calls, three
zero-row results, bucket never moves off 0.

Cause: PostgreSQL's data-modifying CTEs "are executed with the same snapshot ... so they
cannot see one another's effects on the target tables." CTE `b` performs
`INSERT ... ON CONFLICT DO UPDATE` on `limiter.bucket`, which is itself a *write* to that
row (even though the `SET` is a value-preserving no-op, it still produces a new tuple
version and takes the row lock). CTE `spend`'s own scan of `limiter.bucket AS t` — needed to
evaluate `t.units_consumed < p_bucket_allowance` and to locate the row via
`t.bucket_key = b.bucket_key` — runs under that same shared snapshot and cannot see the row
`b` just touched, in this single statement, whether that row was created by `b` moments ago
or already existed from an earlier, separately committed statement. `spend` therefore
matches zero rows, its `RETURNING` is empty, and the final `UPDATE limiter.grant ... FROM
spend` inherits zero rows by construction. Per the document's own stated semantics ("zero
rows returned = refused"), **every single admission request is refused, unconditionally,
forever** — including the very first legitimate one against a brand-new bucket. This is not
the "bounded K× amplification" residual the document discusses; it is total non-function,
and it would fail step 1 of the document's own `LOCAL_TEST_PLAN` ("mint a second grant and
assert its opening balance equals `BUCKET_ALLOWANCE − units_consumed`") on the very first
run, which strongly suggests this exact SQL was never executed before being published.

**Minimum fix, verified working:** split `b`/`spend`/the grant update into **sequential
statements inside a PL/pgSQL function body** (still one function call = one transaction, so
the stated atomicity goal survives) — `INSERT ... ON CONFLICT DO NOTHING` to ensure the row
exists, then a separate `SELECT ... FOR UPDATE` to lock-and-read (a later statement in the
same PL/pgSQL body gets a fresh command snapshot that *does* see the transaction's own prior
writes, unlike a second CTE term in one SQL statement), then a guarded `UPDATE`. I
implemented and tested this exact rewrite: sequential single-grant calls correctly return
1, 2, 3, then correctly refuse at the configured cap; and firing **20 concurrent** callers
with distinct grants at one bucket capped at 10 admitted **exactly 10**, refused exactly 10,
left `units_consumed` at exactly 10, and summed grant spend to exactly 10 — no overshoot, no
lost update. The underlying lock-then-guard *strategy* the document describes is sound; only
its expression as a single multi-CTE statement is broken.

### F2 [MUST-FIX] — The transaction-local GUC cannot gate a separate client request (Claim 4)

`FDA028_RECOMMENDATION.md:126-133` proposes closing the direct-INSERT bypass with
`CREATE POLICY "flags guest ingest only" ON public.flags AS RESTRICTIVE FOR INSERT TO anon
WITH CHECK (current_setting('limiter.admitted', true) = 'on')`, where `limiter.admitted` is
described as "a transaction-local GUC set only by the admission RPC via `set_config(...,
true)`" (line 43 area, restated at 130). This composes correctly with the existing
permissive policies mechanically (confirmed: `flags_user_scoped` at
`supabase/schema.generated.sql:2015` has no `TO` clause but its `WITH CHECK (user_id =
auth.uid())` is never true for `anon`, whose `auth.uid()` is `NULL`, so it doesn't broaden
anon's admission and a new RESTRICTIVE policy correctly ANDs against the OR of permissive
ones — the same idiom this repo already uses at
`supabase/migrations-next/phase03a/20260905055630_phase03a_open_inserts.sql:6-7`). The
problem is not composition; it is **visibility**.

I confirmed empirically that `set_config(name, value, true)` (is_local = true) is visible
only inside the transaction that set it and is gone the instant that transaction commits —
even in the *same* database session:
```
BEGIN; SELECT set_config('limiter.admitted','on',true);
SELECT current_setting('limiter.admitted', true);   --> 'on'   (inside the txn)
COMMIT;
SELECT current_setting('limiter.admitted', true);   --> ''     (same session, after commit)
```
and it is empty from any other connection regardless. PostgREST executes each HTTP request
as its own transaction — this is foundational, well-documented PostgREST behaviour, not an
edge case. The admission RPC call (from the Edge Function, or from the client) and the
client's subsequent direct `supabase.from('flags').insert(payload)` (the exact call at
`src/lib/flags.ts:1772-1776`, unchanged by this proposal at T0) are, definitionally, two
separate HTTP requests. Whatever the admission RPC sets via `set_config(...,true)` cannot
exist by the time the INSERT's own transaction begins. Under the literal two-call reading
the document's own prose requires (a restrictive policy "gating the existing idiom" implies
the existing idiom — the client's direct table insert — still fires as a separate step),
**the restrictive policy's condition can never be true, so every guest insert is refused,
not just abusive ones.**

The alternative reading — fold admission and the actual row insert into one RPC call/one
transaction — does not save the design as described either: I confirmed empirically that a
`postgres`-owned `SECURITY DEFINER` function inserting into a `postgres`-owned table bypasses
RLS entirely regardless of which role invoked the function (table owners bypass RLS unless
`FORCE ROW LEVEL SECURITY` is set; grepping `supabase/schema.generated.sql` finds it set on
**no** table). So under this reading the elaborate RESTRICTIVE-policy-plus-GUC mechanism
described in such detail is simply never consulted for that path — it would need to be
replaced by an ordinary `IF NOT admitted THEN RAISE EXCEPTION` inside the RPC itself, and the
*actual* bypass closure at T1 would need to **directly revoke or replace** the permissive
`"flags anon insert"` / `feedback_insert_self_or_anon` policies, not gate them with a GUC.

Either way, **T1 as specified does not work**, and rescuing it requires retiring the client's
direct `.insert()` call in favour of one RPC — which is a bigger, and different, change than
"add the restrictive policies... gated on a client-version floor" (line 140) implies. This
also happens to be the natural fix for F3 and the cleanest fit for F14 below — see the
unifying recommendation there.

### F3 [MUST-FIX] — The grant is not bound to the bucket it spends against (Claims 2, 3)

The published `spend` SQL (`FDA028_RECOMMENDATION.md:101-104`) is:
```sql
UPDATE limiter.grant g SET units_consumed = g.units_consumed + 1
FROM spend WHERE g.grant_id = p_grant AND g.units_consumed < p_grant_allowance
  AND g.expires_at > now()
```
There is no `AND g.bucket_key = p_bucket` (or equivalent). `p_bucket` is recomputed fresh,
server-side, on every call from that request's own headers (the document is explicit that
the client never sees or supplies a bucket key), but nothing stops a **single grant** from
spending against a **different** bucket on each call, as long as whatever address the caller
currently presents passes the trusted-shape check. This doesn't inflate what any one grant
can spend in total (still capped at `p_grant_allowance`), but it means a grant minted (and
whose opening balance was computed) against bucket A can spend its remaining units against
bucket B, C, D... on demand. Combined with the fact that a single residential/mobile
subscriber routinely controls many valid, real, trusted-shape source addresses (see F5 for
why), this is a **targeted-griefing vector the redesign introduces that the old global cap
did not have in this specific shape**: a single held grant can be used to nibble at any
number of *other* networks' shared daily allowances, one unit at a time, contributing to
their (K+1)-th-guest lockout, without ever needing to re-mint (which is the only currently
rate-limited action). It also means "attack: replay another client's grant... gains nothing:
it spends that grant's balance and the shared bucket's, both of which the attacker already
shares" (line 158) is only true if attacker and victim are forced to share a bucket — which,
absent this check, they are not.

**Minimum fix:** store `bucket_key` (and `window_id`) on `limiter.grant` at mint time and add
`AND g.bucket_key = p_bucket AND g.window_id = p_window` to the spend `WHERE` clause, so a
grant can only ever spend against the one bucket it was issued against.

### F4 [SHOULD-FIX] — The new RPC needs an explicit `GRANT EXECUTE ... TO anon` (Claim 7)

This database's standing convention, established in
`supabase/migrations-next/phase03a/20260905055636_phase03a_client_privileges.sql:29-33`, is
`ALTER DEFAULT PRIVILEGES FOR ROLE postgres ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,
anon, authenticated` — i.e. **every new function is unreachable by `anon` until explicitly
granted**, by deliberate design (the companion rationale at
`supabase/migrations-next/20260904000400_adopt_execute_revokes.sql:9-18` is FDA-010: a
`SECURITY DEFINER` function reachable by `anon` is exactly the shape of a prior finding).
This is good hardening, and 24 `SECURITY DEFINER` functions already exist in the shipped
schema as reasonable precedent for the *pattern* — but it means the admission/spend RPC this
proposal needs is, by this database's own current default, **DENIED to anon** the moment it
is created, unless the migration that adds it also adds a `GRANT EXECUTE`. The document never
mentions this. Trivial to fix, easy to forget, and forgetting it produces a 100%-guest-outage
failure mode with no other symptom — which is exactly what F9 says the "fail-closed is free"
framing underestimates.

### F5 [SHOULD-FIX] — IPv6 prefix delegation breaks "bounded at K×" (Claim 1)

The design normalises IPv6 to a `/64` specifically because "/64 is per-subscriber" (line
162: "IPv6 uses /64, which is per-subscriber, so CGNAT pressure is IPv4-only"). That is true
for how a *single LAN* is addressed, but RFC 6177 explicitly recommends ISPs delegate **more
than one `/64`** to a residential end site (commonly a `/56` — 256 distinct `/64` prefixes,
sometimes `/48` — 65,536 of them) via DHCPv6-PD. A subscriber whose ISP does this can
legitimately configure and originate real, non-spoofed traffic from many different `/64`
prefixes within their own delegation, entirely without header forgery — each one is a fresh,
full `BUCKET_ALLOWANCE`. For any such subscriber, the "bounded at `K`×" bound in the
document's own attack table (line 153) does not hold; the real bound is "however many `/64`s
your ISP delegates to you," which for common residential/mobile plans is large. This is the
mirror image of the CGNAT problem the document already treats seriously for IPv4 — it
deserved the same treatment for IPv6, and currently gets none.

### F6 [SHOULD-FIX] — The untrusted fallback is one global bucket, not one per network (Claims 2, 3)

"Otherwise the request goes to a single shared **untrusted bucket**" (line 59, "global" in
the parameters table, line 190). Every client anywhere that fails the trusted-shape check —
whether through actual forgery or through **legitimate hop-count variance the document's own
evidence file admits is still unresolved** (`evidence-platform-and-boundary.json`:
`"F28-A REMAINS OPEN on 2026-09-09"`) — lands in the *same* 5-per-hour pool as every other
such client on the planet. "Forgery can only shrink a caller's budget" (line 67) is true for
the individual forger, but undersells the blast radius: if `EXPECTED_HOPS` is pinned even
slightly wrong for a whole platform region or client category (a mobile carrier's transparent
proxy, a corporate VPN, a POP with a different topology), the failure mode is not "those
users get less" but "those users collectively get ~5 admissions per hour, worldwide, until
someone notices and fixes the constant." Given F28-A is explicitly not yet closed, this
should be a per-bucket-shaped fallback (e.g., untrusted traffic still keyed by *some* portion
of its available signal, even if weaker) rather than one global pool, or at minimum the
staging metadata probe (already planned) should be treated as a hard pre-req for T0, not just
for full confidence.

### F7 [SHOULD-FIX] — Live-window correlation against `public.flags` (Claim 5)

`"flags readable by anon" ON public.flags FOR SELECT TO anon USING (true)`
(`supabase/schema.generated.sql:1990`) means the entire `flags` table, `created_at` included,
is readable by anyone, unauthenticated, today. The ledger's bucket key is a keyed HMAC, not a
raw address — good — but for as long as the epoch secret for a given window is alive (up to
~25h per the retention plan), anyone who (a) has DB/ledger access and (b) has or can guess a
candidate real-world IP prefix for a specific person can recompute
`HMAC(K_epoch, candidate_prefix || window_id)` and check it against the ledger's
`bucket_key`s and their per-window spend counts, then correlate a low-traffic bucket's spend
count and timing against `flags.created_at` to identify *which specific report* likely came
from *that specific network*, during the live window. This is not a claim that raw IPs leak,
or that the design is careless — it is a real, live-window re-identification path that "no
durable cross-session tracking identifier" doesn't fully foreclose, in an app whose reports
carry lat/lng. Naming it explicitly (see Residual Risk) and keeping the ledger schema
inaccessible to anything short of the same access tier as raw request logs would already have
implied is the minimum the document should say out loud but currently does not.

### F8 [SHOULD-FIX] — "Destroyed" secret vs. routine backup retention (Claim 5)

"Because the secret dies with the window, a bucket key from Monday is mathematically
unlinkable" (line 79) is true against *live* application access, but says nothing about
Postgres backup/PITR retention, which routinely exceeds 25 hours (commonly 7-30 days on
hosted Postgres). A destroyed-in-place Vault secret does not un-happen from an earlier backup
that still contains it. This is a known, generally-accepted tension in "crypto-shredding"
designs, not a flaw unique to this one, but the document's confident "unlinkable" framing
should be qualified rather than left absolute.

### F9 [SHOULD-FIX] — "Fail-closed is free" elides latency/contention, not just availability (framing)

"If the ledger is unreachable, the INSERT was unreachable anyway" (line 111) is a valid
argument against a *separate service* (Redis) and I don't dispute it there. But it silently
equates "same database" with "same contention profile." The ledger's spend path takes an
explicit row lock and serialises concurrent writers *by design* (correctly, per my
concurrency test) — which means a burst of legitimate, simultaneous submissions from one
popular shared network (a school, a community "mapping party" — exactly the kind of organised
accessibility-reporting activity this app should want to encourage, see F16) now queues on a
lock a bare `INSERT INTO flags` never had to take. That queuing can hit `statement_timeout`
under load that would not have troubled the old, lock-free path — and a missing `GRANT
EXECUTE` (F4) or a misconfigured `limiter` schema grant produces a limiter-only outage with
zero symptoms elsewhere in the database, precisely the scenario "the ledger shares fate with
the target table" reasoning would lead someone not to specifically test for. Recommend an
explicit load/latency test for "many genuine concurrent submissions against one bucket," which
the current `LOCAL_TEST_PLAN` (concurrency item 2) checks for correctness, not for timeouts.

### F10 [SHOULD-FIX] — Comma-split without whitespace trimming (Claim 3)

`FDA028_RECOMMENDATION.md:48-49` specifies `xff.split(',')` with no trimming. A proxy that
writes `", "` between hops (extremely common) would leave `cand` with a leading space,
plausibly failing "parses as a public, non-reserved address" for an entirely legitimate,
single-hop client, demoting it to the untrusted bucket. Notably, the Supabase Turnstile
example this document critiques for trusting the wrong element (`evidence-platform-and-
boundary.json`, E1) actually *does* trim (`split(/\s*,\s*/)`, confirmed by re-fetching
https://supabase.com/docs/guides/functions/examples/cloudflare-turnstile directly) — this
proposal's own pseudocode is looser than the example it is correcting. Fails safe (less
budget, not more), so low severity, but worth a one-line fix.

### F11 [NOTE] — Grant lifetime (26h) isn't bound to the window it was minted in (Claim 1)

The spend SQL never checks a `window_id` on `limiter.grant` (only `expires_at` and
`units_consumed`). A grant minted late in window N, not yet exhausted, can carry its leftover
balance into window N+1's fresh bucket once `p_bucket`/`p_window` roll over — spending part of
its allowance against two different buckets across the boundary. This likely does not violate
the owner's contract (nothing is being *reset*; the grant is simply still alive and still
under its own original cap), but it does not match the stated rationale ("a grant cannot
outlive its bucket's usefulness") and should be an explicit, tested decision rather than a
side effect of unshown mint-path SQL — the document only shows the spend path, never the mint
path, so this and several adjacent questions (is minting itself rate-limited independently of
spending? is `grants_issued` — present in the `INSERT` column list at line 90 but never read
or incremented anywhere in the given SQL — meant to cap grant *count*, and if so where is that
enforced?) are UNVERIFIABLE from the document as written.

### F12 [NOTE] — Epoch-secret creation is a race at window boundaries (Claim 1)

The document specifies rotation/destruction timing ("purge at `window_end + 1h`") but not
creation. If a window's Vault secret is created lazily by whichever request first needs it,
the first two concurrent requests of a new window could race to create it; without an atomic
get-or-create (mirroring the bucket table's own upsert-lock idiom), the same real address
could momentarily resolve to two different bucket keys for what should be one window.

### F13 [NOTE] — The "only four scarce inputs" theorem omits a fifth candidate (framing)

Phone-number verification (SMS OTP) is a real, industry-common scarce input for exactly this
problem and is not in the candidate table (`FDA028_RECOMMENDATION.md:21-26`) at all. It is
very likely rejectable on the same grounds as anonymous Auth — a phone number is durable PII,
arguably a *stronger* persistent identity anchor than an IP-derived HMAC, so it would fail the
privacy contract harder, and it adds real friction and SMS-gateway cost to a "drop a quick
anonymous report" flow. The conclusion is probably right; the theorem calling itself
exhaustive ("only four scarce inputs exist for this app") while silently omitting a
well-known one is a completeness gap, not a correctness one.

### F14 [NOTE] — No local precedent for reading a Vault secret from the Edge Function layer (Claim 7)

Every existing use of Vault in this codebase (`verify_webhook_secret` at
`supabase/schema.generated.sql:807`, `notify_flag_status_webhook` at `:750`) reads
`vault.decrypted_secrets` **inside a `SECURITY DEFINER` SQL function**, never from Deno/JS.
The proposal's `IDENTIFIER_DERIVATION` section doesn't say where the HMAC is computed; if it
is computed in the Edge Function, the raw `K_epoch` would need to leave Postgres into the
Deno runtime, which has no precedent here and adds exposure surface (logging, memory dumps)
the existing pattern avoids entirely. Recommend: the Edge Function only validates header
*shape* in JS (hop count, `cf-connecting-ip` cross-check, address parsing) and passes just the
validated prefix string to a `SECURITY DEFINER` SQL function that does the HMAC-with-Vault-
secret **and** the ledger spend **and**, ideally, the actual `flags`/`feedback` INSERT, all in
one call — which is also the cleanest resolution of F2.

### F15 [NOTE] — `pg_cron` availability is UNVERIFIED for this project (Claim 7)

No use of `pg_cron`, `cron.schedule`, or any scheduled-job mechanism exists anywhere in this
repository (searched all `.sql`/`.ts`/`.toml`); by contrast `pg_net` clearly *is* live
(`notify_flag_status_webhook`'s `net.http_post` call). This doesn't mean `pg_cron` is
unavailable — it's a standard, commonly-enabled Supabase extension — but there is no local
evidence either way for *this* project, and the retention/purge design leans on it being
available. Confirm via the dashboard before relying on it; Supabase's Scheduled Edge
Functions feature is a documented fallback that doesn't require the extension.

### F16 [NOTE] — Parameters don't discuss this app's own most relevant usage pattern (framing)

`K=10` (50 units/network/day, `FDA028_RECOMMENDATION.md:189`) is presented as a generic
NAT-tolerance-vs-amplification dial. For an accessibility-flagging app specifically, the
population most likely to exceed 10 anonymous reporters on one shared connection in a day is
not "an office" in the abstract — it's a group home, a shared-accessible-housing building, a
disability services center, or an organised community "mapping party" logging multiple
inaccessible curb cuts/ramps from one venue's wifi in one sitting. That is exactly the
pro-social burst usage the app should want to reward, and exactly what this cap suppresses
first. Worth naming explicitly rather than treating purely as an abstract engineering
trade-off.

### F17 [NOTE] — T1 is framed as a logistics gate; per F2 it is a redesign (framing)

"T1... Gated on a client-version floor shipping first and on adoption telemetry" (line 140)
reads as "flip a policy once enough clients have updated." Given F2, T1 actually requires
retiring the client's direct-insert call in favour of RPC-based ingestion — a real API
contract change across every call site, not a database-only migration. The T0/T1 split's
candour about *scope* ("claiming FDA-028 fully closed at T0 would be false", line 142) is
genuine and worth crediting; its implication about *difficulty* is not yet accurate.

## What the proposal got right

The core reasoning is good: it correctly re-derives that reset-resistance needs a trusted
scarce input, correctly rejects client-held state/tokens/CAPTCHA as a *primary* anchor (a
solve-once cost doesn't remember a prior solve — sound, and I could not break it), and
correctly identifies the network address as the only such input available without a new app
binary. The "trust the shape, not the value" anti-forgery instinct is a genuinely more
defensible reading of an open question than the very Supabase example it critiques — I
independently re-fetched both cited Supabase docs pages and confirmed E1 and E4 are
accurately represented. It is honest that FDA-028 is not fully closed at T0 and says so
plainly rather than burying it. It correctly reuses this repository's own established
RESTRICTIVE-policy idiom instead of inventing something new (the idiom itself, from FDA-023,
is sound — it's the new cross-request condition hung on it that doesn't fit). No raw IP
storage and no client-exposed limiter identifier both hold up under scrutiny. And the
underlying concurrency *strategy* — lock the counter row, guard the increment, treat zero
rows as refusal — is correct: once expressed as sequential statements instead of chained
CTEs, I verified it holds exactly under 20-way concurrent load with zero overshoot and zero
lost updates. The design is closer to right than wrong; it just was not run before it was
written down.

## Residual risk the owner must accept

Even after every MUST-FIX above is applied, some things don't have a clean fix and are worth
accepting with eyes open, in plain terms:

- **No network-address-only design can perfectly tell two honest people apart from one
  dishonest one on the same connection.** `K` is a dial, not a solution. Someone on a busy
  shared network will occasionally be told to sign in when they didn't deserve it; someone
  else will occasionally get more free anonymous reports than intended.
- **IPv6 users on plans where the provider hands out more than one `/64` (common) have an
  easier time getting a fresh budget than IPv4 users do.** Nothing short of device
  attestation (blocked on a new App Store build) closes this fully.
- **For roughly a day at a time, someone with database access — not an outside attacker —
  could plausibly work out which network a specific accessibility report probably came
  from**, by lining up ledger timestamps against the publicly-readable `flags` table. This
  risk expires with the window; it is not zero while the window is live.
- **This mechanism can make legitimate reporting briefly slower or occasionally fail** in
  situations the old, simpler direct-insert path never could — specifically, many genuine
  people on one shared connection reporting at the same moment now contend on a database
  lock that didn't exist before.
- **The actual bypass (the app's ability to skip the limiter entirely) cannot close without
  shipping a new app version and waiting for people to install it.** Every already-installed
  copy of the app keeps unlimited anonymous reporting until its owner updates, for as long as
  that takes — there is no server-side lever to force it.
