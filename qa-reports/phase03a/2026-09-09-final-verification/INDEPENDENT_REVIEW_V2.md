# FDA-028 GAB-2 (v2) — independent adversarial re-review

Reviewer role: bounded, read-only, adversarial. I did not author FDA028_RECOMMENDATION_V2.md
and treated it, its v1 predecessor, the prior independent review, and every supporting JSON as
claims to falsify, not as settled fact — including claims the author already re-verified.
Where a claim was falsifiable in Postgres, I built my own schema and function from scratch
(not copy-pasted from any prior artifact) and ran it on a disposable local PostgreSQL 17.11
cluster (`/private/tmp/.../scratchpad/pgtest`, TCP 127.0.0.1:55511, destroyed after use — no
repo file touched). Where a claim depended on HTTP/runtime semantics, I tested it directly
(Node's spec-compliant `Headers`, Python's `ipaddress`). Where a claim depended on public
platform documentation, I fetched it myself rather than trusting the document's paraphrase.
No hosted Supabase project was contacted; no staging or production system was touched; no
file other than this one was created or modified.

**Provenance note.** Three files not on my assigned reading list were already sitting in this
review's own output directory (`OLD_CLIENT_ROLLOUT_CONSTRAINT.md`, `THRESHOLD_SEPARATION.md`,
`F28A_EVIDENCE.json`, committed at `d555ce2`, dated the same day as v2). They make load-bearing
claims against v2 from what is described as real, read-only production log analysis. I cannot
re-run hosted log queries myself under this review's constraints, so I cannot independently
re-derive their raw numbers — but I independently re-verified their two most consequential
downstream claims against primary sources I *can* reach: the "web is unaffected" correction
against `release/current.json` directly, and the Cloudflare header-forwarding behavior against
Cloudflare's own public documentation directly (both confirmed — see Finding 1 and Finding 13).
I treat the log-derived numbers themselves as credible-but-unverified-by-me and say so
explicitly where I rely on them.

---

## VERDICT: HOLD

The core strategy — HMAC'd rotating network-window bucket as the reset-resistant authority,
a grant bound to `(bucket_key, window_id)` as the per-client fairness layer, sequential
`SECURITY DEFINER` PL/pgSQL statements for atomicity, `REVOKE`-based bypass closure — is sound,
and my own from-scratch reconstruction of it independently passes every concurrency,
atomicity, reset-continuity and bucket-binding test I could devise. This is not v1: v2's
central mechanism, as far as it is published, actually works. But v2 has real, concrete,
newly-discovered defects — some of them exactly the "written but not run" pattern that sank
v1 — plus at least one finding (the trusted-input choice) that is independently, materially
falsified against this specific hosted platform by evidence already sitting in this review's
own directory. It is not ready for owner approval as written. It is also not a FAIL: nothing
here shows the architecture itself cannot work, only that this draft of it cannot yet be
signed off on.

---

## The thirteen items

| # | Item | Verdict |
|---|---|---|
| 1 | Reset continuity | **WEAKENED** — arithmetic UPHELD by independent reconstruction; grants_issued/reset interaction is a new, undocumented starvation defect (Finding 2) |
| 2 | Client A / Client B independence | **WEAKENED** — holds only until any one client resets even once (Finding 2) |
| 3 | Caller forgery resistance | **FALSIFIED** — built on the wrong header for this platform (Finding 1); literal pseudocode crashes on a missing header (Finding 3); untrusted fallback is a standing, zero-cost, unconditional escape hatch (Finding 4, "the most important question") |
| 4 | Concurrent admission | **UPHELD for what is shown / UNVERIFIABLE for what is not** — my reconstruction of steps 1-3 plus a best-faith step 4 passes every test; the actual step 4 and DECLARE section are never published anywhere (Finding 5) |
| 5 | IPv4 / IPv6 handling | **FALSIFIED** — IPv4-mapped IPv6 collapses to one shared prefix under the stated rule (Finding 6); Cloudflare's real Pseudo IPv4 feature is a second, confirmed, unaddressed instance of the same risk class (Finding 1) |
| 6 | NAT / shared-network harm | **WEAKENED** — the "K genuine guests" accounting is wrong once Finding 2 is priced in |
| 7 | Network rotation | **WEAKENED** — true for a home router power-cycle; overstated for cellular airplane-mode toggling and false for VPN use (Finding 9) |
| 8 | Direct guest-write bypass protection | **UPHELD**, empirically, with a named residual (Finding 10) |
| 9 | Alternate flag/feedback bypass | **UPHELD for today's inventory** (no hidden RPC or view found), enumeration process itself still admittedly incomplete |
| 10 | Privacy / retention claims | **WEAKENED** — "no per-request timestamps" is contradicted by v2's own `limiter.grant.expires_at` (Finding 7) |
| 11 | Vault / HMAC assumptions | **WEAKENED** — pgcrypto `hmac()` confirmed available and correct; the cited "existing Vault pattern" does not actually compute an HMAC (Finding 8); atomic secret get-or-create is UNVERIFIED against local precedent and public docs (Finding 8) |
| 12 | Rollback | **WEAKENED** — two levers are solid; "three independent levers" overstates lever 3, and the kill-switch's "record-only" semantics are untested against the T1-applied case (Finding 11) |
| 13 | Deployability on actual Supabase | **WEAKENED** — `verify_jwt=false` and Vault-read-in-SECURITY-DEFINER are real precedent; a custom Postgres role reachable from an Edge Function has zero precedent and an unaddressed "how" (Finding 12); pg_cron remains honestly UNVERIFIED (unchanged from v1) |

---

## Findings

### Finding 1 [MUST-FIX] — TRUSTED_INPUT is specified against the wrong header for this platform

v2's `TRUSTED_INPUT` (lines 38-49) and `IDENTIFIER_DERIVATION` (lines 76-84) build the entire
anti-forgery mechanism around "the rightmost element of `x-forwarded-for`... admitted only
under a pinned hop count." `F28A_EVIDENCE.json` — already sitting in this review's own output
directory, dated the same day as v2 — reports real, read-only Supabase log analysis
(`E5_productionLogsEmpirical`, 85 real requests across both the REST and Edge Function routes)
showing: `cf-connecting-ip` present on 85/85 requests and single-valued on 85/85 (never a
comma list); `x-real-ip` an exact twin on 85/85; **`x-forwarded-for` absent from 100% of
captured request attributes.** Its own conclusion: *"v2 is built on the wrong signal for this
platform... A hop-count model cannot be applied to a single-valued header."* `state.json` in
this same tree already records `"v2TrustedInputMisspecified": true`.

I could not re-run the log query myself (no hosted contact permitted), so I independently
verified the downstream, checkable half of this claim instead: I fetched
`https://developers.cloudflare.com/fundamentals/reference/http-headers/` directly. It
confirms, in Cloudflare's own words: X-Forwarded-For is **appended** to ("Cloudflare will
append the IP address of the HTTP proxy connecting to Cloudflare to the header"); whether
`CF-Connecting-IP` is ever overwritten for a client-supplied value is genuinely **undocumented**
(confirming the log evidence's "G1 forgeability" gap is real, not an excuse); `True-Client-IP`
carries an explicit spoofing caution in stacked-CDN setups; and — new to this review — **a
real, documented "Pseudo IPv4" Cloudflare setting can overwrite both `Cf-Connecting-IP` and
`X-Forwarded-For` with a shared pseudo-IPv4 address for IPv6 clients**, whose status for this
Supabase project is unverified. This matches `F28A_EVIDENCE.json`'s `E7` section word for word,
which gives me confidence the log-derived claims are being read correctly even though I can't
re-run them myself.

Net effect: this is not a hypothetical edge case, it is a proven mismatch between what v2
specifies and what this specific hosted stack actually does. The underlying "trust the shape,
never a caller-chosen position" *instinct* survives (Cloudflare's append contract, now
confirmed, is exactly what that instinct predicts) — but `TRUSTED_INPUT`, `TRUST_BOUNDARY` and
the whole hop-count anti-forgery rule need to be re-specified against `cf-connecting-ip`
cross-checked by `x-real-ip`, with a single-value check standing in for the hop-count check,
before this goes to CODE. **Minimum fix:** rewrite `TRUSTED_INPUT`/`TRUST_BOUNDARY` around
`cf-connecting-ip`/`x-real-ip`; retain rightmost-XFF only as a tertiary corroborator if a
bounded probe later shows XFF actually reaches the function (`G2`/`G3` in `F28A_EVIDENCE.json`
are still open).

### Finding 2 [MUST-FIX] — `grants_issued` starves *every future client* on a bucket, at a fraction of the nominal budget

This is the one genuinely new defect I found by building and adversarially driving the
mechanism myself; it is not in v1's review, v2's own text, or any banked artifact.

The mint gate is `IF b.grants_issued >= p_max_grants THEN RETURN 'REFUSED_GRANT_CAP'`
(`FDA028_RECOMMENDATION_V2.md:130`). `grants_issued` is a **per-bucket, not per-client**
counter that only ever increments and is shared by every client behind that NAT for the whole
window. Because minting a grant only ever happens as a side effect of an actual submission
(the same call spends 1 unit immediately), a client that resets after *every single
submission* — not maliciously, just an app that clears storage each time, or a user pressing
"clear data" out of habit — consumes one scarce grant-slot per submission while leaving most of
that grant's allowance unspent.

**Empirical proof** (`t2_t5.sh`, `t10_t11.sh` against my own reconstruction, schema in
`01_schema.sql`): with `K=3`, `NORMAL=5`, `BUCKET_ALLOWANCE=50`, three mint-and-abandon calls
from one resetting client exhaust `grants_issued=3` while `units_consumed=3` — **47 of the 50
nominal daily units are still sitting unused.** A fourth call — deliberately modeled as a
brand-new, never-before-seen client on the same bucket — is refused `REFUSED_GRANT_CAP`,
identical to the resetting client's own refusal. Scaled to the proposed production value
`K=10` the mechanism is identical: I confirmed under 25-way concurrency (`t10_t11.sh`, `T10`)
that the cap holds exactly at `K`, no overshoot, even when contended.

This directly falsifies `HOW_CLIENT_A_AND_CLIENT_B_REMAIN_INDEPENDENT`'s claim (line 74): "Up
to `K` co-located clients each reach the full `NORMAL` while the bucket has room" is true only
if no one on that NAT ever resets. The moment anyone does, once, the *shared* grant-slot pool
— not the unit budget — becomes the binding constraint, and it does not replenish for the rest
of the window. This is strictly worse for exactly the sympathetic population
`NAT_SHARED_NETWORK_TRADEOFF` (line 173) already names (a group home, a disability services
centre, an organised mapping session): those are precisely the households most likely to
contain *someone* who reflexively clears app storage, and doing so once can spend down the
entire NAT's fairness budget for everyone else, with 90%+ of the nominal daily allowance never
touched.

**Minimum fix:** either (a) recycle a grant slot on natural expiry before its allowance is
exhausted (a `grants_issued`-decrement path does not currently exist anywhere in the
mechanism), or (b) gate minting on remaining bucket capacity *proportionally* rather than on a
flat count, or, at minimum, (c) name this explicitly as a KNOWN_LIMITATION with its own
number, distinct from limitation 1 (which only discusses unit-based amplification) — right now
it is not mentioned at all.

### Finding 3 [MUST-FIX] — the literal extraction pseudocode crashes on a missing header instead of falling back

`TRUSTED_INPUT` (line 43): `xff = header('x-forwarded-for').split(/\s*,\s*/)`. I tested this
exact idiom against a real, spec-compliant `Headers` implementation (Node 20, which — like
Deno — implements the WHATWG Fetch `Headers` interface `x-forwarded-for` is built against):

```
$ node -e "const h=new Headers(); console.log(h.get('x-forwarded-for'));  // null
           h.get('x-forwarded-for').split(/\s*,\s*/)"
TypeError: Cannot read properties of null (reading 'split')
```

`Headers.get()` returns `null`, not `''`, when the header is absent. Calling `.split` on that
throws, uncaught, unless the surrounding code specifically guards it. Given F28-A is
*admittedly* still open (the document's own words, line 53) — meaning it is not certain the
header is ever guaranteed present on every code path into this function — a request that hits
this exact gap does not "fall back to today's global caps," it 500s. That is measurably worse
than "never worse than status quo": a full request failure is worse than being placed in the
weaker but functioning global-cap pool. **Minimum fix:** guard every step of the shape check
(missing header, non-string, unparseable) inside one try/catch (or equivalent
null-coalescing) whose *only* possible outcomes are "trusted bucket" or "untrusted/global-cap
fallback" — never an unhandled exception. This must be an explicit `LOCAL_TEST_PLAN` case
(absent header is currently listed as a parsing-robustness case under item 7, but the plan
never states the requirement that it must not throw).

### Finding 4 [MUST-FIX / the flagged "most important question"] — the untrusted fallback is a standing, zero-cost, unconditional opt-out for exactly the population the mechanism targets

`GLOBAL_EMERGENCY_BACKSTOP` (lines 163-167): "a request that fails the shape check is admitted
under **today's** global caps and nothing tighter... The untrusted path is never worse than the
status quo." I read `check_global_anon_rate_limit` and `check_feedback_rate_limit` directly
(`supabase/schema.generated.sql:170-186`, `:72-95`): both are a flat `COUNT(*) ... WHERE
user_id IS NULL AND created_at > now() - interval '1 hour'` with **no partitioning by any
client signal at all** — a single shared pool (100/h flags, 30/h feedback) for every anonymous
caller on the planet, exactly the "shared denial-of-service lever" the codebase's own
`20260904000300_adopt_live_insert_throttles.sql` already names as the reason FDA-028 exists.

The literal claim ("never worse") is true — I cannot construct a way for the fallback ceiling
to exceed today's ceiling. But that framing answers the wrong question. The real question is
whether a **motivated abuser is rationally better off routing around the improvement**, and the
answer is yes, unconditionally, at zero cost: send one non-default header (or none at all —
Finding 3), or simply call the REST/Edge endpoint directly instead of through the app, and you
land back on the exact same weak, shared, 100/h global pool that existed before any of this
shipped, with **zero per-client throttling of your own traffic whatsoever.** No forgery of the
trusted signal is required — only declining to present it correctly, which any attacker willing
to read one paragraph about HTTP headers can do trivially, and this is *available on every
single request*, not a corner case.

Contrast this with v1's design: v1's untrusted bucket was a **new, smaller, separate** 5/hour
pool (its own line 190), so a deliberate abuser had no incentive to fail the shape check on
purpose — doing so made things *worse* for them, not neutral. v2's fix for the v1 reviewer's
F6 ("untrusted fallback is one global bucket... worldwide ~5/hour if mispinned") is real and
correct for the specific worldwide-collapse failure mode F6 named — but it does so by
*removing the disincentive to evade the mechanism entirely*, which is a different, new problem
v2 introduces and never names. The mechanism's entire real-world benefit is therefore
concentrated on **casual, in-app reset abuse** (someone who clears storage inside the actual
app, which does travel through the real gateway and does land on the trusted path); a
scripted or determined abuser is no better constrained the day after this ships than the day
before. **This should be stated as a named, explicit limitation, and the design should at
minimum keep the parts of Finding 1's evidence in mind: since `cf-connecting-ip` is present on
100% of *real* traffic (per `F28A_EVIDENCE.json`), the operationally meaningful failure mode
for the fallback is "the caller doesn't send `cf-connecting-ip` at all, or sends a
multi-valued/malformed one" — which is a much rarer, more suspicious shape than "any XFF
variance," and could plausibly be demoted to something stricter than the full global pool
without reintroducing F6's worldwide-collapse risk. v2 does not consider this because it is
still keyed to the wrong header (Finding 1).**

### Finding 5 [MUST-FIX] — the safety-critical code is never published anywhere, and the "obvious" implementation crashes on every first submission

`CONCURRENCY_CONTROL` (lines 112-138) shows steps 1-3 in full but elides step 4 entirely
("`-- 4. spend under BOTH guards, then INSERT the row in the same transaction`" is a comment,
no SQL) and never shows a `DECLARE` block. The author's own `author-verification-postgres.json`
describes only aggregate outcomes ("ADMITTED=9 concurrent... =10 total"), never the function
body that was tested. **No artifact provided anywhere for this review contains the complete
source of the function the owner is being asked to approve.** This matters because v1 was
falsified for exactly this reason — code that reads correctly on paper and was never run. v2
avoids re-falsification not by publishing correct code, but by not publishing the
safety-critical part at all.

I demonstrated concretely why this gap is not academic. The grant-lookup step
(`FDA028_RECOMMENDATION_V2.md:124-126`) is `SELECT * INTO g FROM limiter.grant WHERE ...`,
executed conditionally (only when the caller presents a token at all — a brand-new client has
none). I built both a `%ROWTYPE`-typed and a generic `RECORD`-typed version of exactly this
idiom and called each with no token (the single most common real-world case — every client's
very first request):

```sql
-- RECORD variant, p_grant = NULL, the SELECT INTO is skipped entirely:
ERROR:  record "g" is not assigned yet
DETAIL:  The tuple structure of a not-yet-assigned record is indeterminate.
-- %ROWTYPE variant, identical call:
 admit_rowtype_variant2
-------------------------
 no grant found (would mint)
```

Declaring the lookup variable as a generic `RECORD` — a completely natural, common PL/pgSQL
habit, and the more terse-looking choice — makes the function throw on every first-time guest,
unconditionally. This is not a contrived gotcha; it is exactly the class of "reads fine, was
never run" defect that sank v1's CTE, reproduced in miniature. Since the actual DECLARE block
is not published, there is no way for me, or the owner, to know which variant v2 intends to
ship. **Minimum fix:** publish the complete function (DECLARE included) before this goes to
CODE, and add "first-time client, no grant token, no prior bucket row" as an explicit line
item in `LOCAL_TEST_PLAN` (it is currently only implied, not listed).

To be fair to the design: my own from-scratch reconstruction of steps 1-3 (verbatim) plus a
best-faith completion of step 4, tested with an explicit `%ROWTYPE` declaration, passed **every
test I threw at it** — 30-way concurrency at a bucket cap of 10 (10 admitted, 20 refused, no
overshoot); 25-way concurrent first-time bucket creation (no deadlocks, no duplicate-key
errors); 20-way concurrent no-token minting on one bucket (grants_issued and units_consumed
both landed at exactly 20, no overshoot); 25-way concurrent minting against a `K=5` cap (exactly
5 admitted, 20 `REFUSED_GRANT_CAP`); and a direct two-session timing proof that
`INSERT ... ON CONFLICT DO UPDATE SET units_consumed = t.units_consumed` really does take and
hold a blocking row lock (a concurrent second session's call measurably blocked ~2.6s behind a
3-second `pg_sleep` held inside the first session's transaction). The *strategy* is sound and
independently reproducible. The *artifact* does not yet exist in a form anyone can check.

### Finding 6 [MUST-FIX] — IPv4-mapped IPv6 addresses collapse to one shared prefix under the stated rule

`IDENTIFIER_DERIVATION` (line 81): `prefix = IPv4 → /32 ; IPv6 → /48`, with no mention of
IPv4-mapped IPv6 addresses (`::ffff:a.b.c.d`, RFC 4291 §2.5.5.2). I verified with Python's
`ipaddress` module:

```
::ffff:192.0.2.1    -> ::/48
::ffff:203.0.113.77 -> ::/48
::ffff:10.0.0.5     -> ::/48
```

Every IPv4-mapped IPv6 address, regardless of which real IPv4 address it wraps, shares the
identical `/48` prefix `::/48`, because the `ffff` marker distinguishing them sits in bits
81-96 — entirely past the 48-bit truncation point. If the actual mapped IPv4 address is not
unwrapped before the IPv6 branch runs, **every client that happens to be represented this way
collapses into one shared bucket**, regardless of how many genuinely distinct people or
networks they are. This is not a rare edge case: dual-stack sockets commonly report an IPv4
peer as `::ffff:x.x.x.x`, and this is exactly the kind of representation a
load-balancer/gateway can produce. It is a strictly worse version of the NAT problem the
document already treats as a first-class harm (`NAT_SHARED_NETWORK_TRADEOFF`), caused by a gap
in the normalization rule rather than by real-world NAT topology, and it is unrelated to (and
additive with) Cloudflare's separate, confirmed "Pseudo IPv4" feature described in Finding 1,
which can independently produce the same class of collapse through platform configuration
rather than address representation. For contrast: 6to4 addresses (`2002:WWXX:YYZZ::/48`) do
**not** have this problem — I confirmed each distinct IPv4 address maps to a distinct `/48` —
but a client able to choose between native IPv4, native IPv6, and 6to4 tunneling still gets up
to three independent buckets for one physical connection, which is worth naming next to the
already-acknowledged "network rotation" limitation since it requires no network change at all.
**Minimum fix:** detect and unwrap IPv4-mapped IPv6 addresses into the `/32` branch before
applying the `/48` rule; test it explicitly.

### Finding 7 [MUST-FIX] — `DATA_RETENTION`'s "no per-request timestamps" claim is contradicted by v2's own schema

`DATA_RETENTION` (line 98): "The ledger stores counters and a window id only — **no
per-request timestamps**, no `last_seen`, no address." But `CONCURRENCY_CONTROL`'s own shown
schema (line 124-126, 133) has `limiter.grant` carry `expires_at`, set at mint time. This is a
timestamp in every functional sense that matters for correlation: an actor with ledger access
can back-calculate approximately *when* a given grant was minted (`expires_at` minus the fixed
grant lifetime), which is materially finer-grained than "how many units this bucket spent
somewhere in a ~24h window" — the resolution `DATA_RETENTION`'s own argument for reduced
correlation risk depends on. This compounds KNOWN_LIMITATION 6 (live-window correlation
against public `flags.created_at`, correctly inherited from the v1 review's F7): the true
correlation surface is not "per-window spend counts," it is "per-window spend counts *plus* a
set of approximate per-grant mint-times," which narrows a candidate match window
considerably. **Minimum fix:** either correct the `DATA_RETENTION` claim to acknowledge
`expires_at` explicitly, or coarsen it (e.g., truncate to the hour) so it stops functioning as
a mint-time oracle.

### Finding 8 [SHOULD-FIX] — the cited "existing Vault pattern" does not compute an HMAC, and atomic secret creation is unverified

`IDENTIFIER_DERIVATION` (line 78): "Computed in SQL, inside the `SECURITY DEFINER` function —
matching this codebase's existing Vault pattern (`verify_webhook_secret`,
`notify_flag_status_webhook`)..." I read both functions directly
(`supabase/schema.generated.sql:807-816`, `:750-767`). Neither computes an HMAC:
`verify_webhook_secret` does a **plain string equality** (`decrypted_secret = incoming`);
`notify_flag_status_webhook` reads the secret and embeds it **verbatim** in an outgoing header.
The only real precedent is "read a secret from `vault.decrypted_secrets` inside a `SECURITY
DEFINER` function," not "compute an HMAC of anything in SQL" — there is no `hmac(` call
anywhere in this repository (confirmed by grep). The underlying primitive is fine — I confirmed
`pgcrypto`'s `hmac()` is installed and correct in this exact Postgres build
(`select encode(hmac('hello','key','sha256'),'hex')` returned the expected digest) — but the
document overstates the precedent for the *specific* thing it is proposing.

Separately: "`K_epoch`... created **atomically** (get-or-create in the same function, mirroring
the bucket upsert)" (line 88) has no local precedent (grep finds zero uses of
`vault.create_secret` anywhere in this repo) and I could not confirm it from public
documentation either. I fetched `https://supabase.com/docs/guides/database/vault` directly and
it does not specify `vault.create_secret`'s exact signature, whether `name` carries an
enforceable unique constraint usable in an `ON CONFLICT` clause, what happens under concurrent
same-name creation, or whether it may be safely called at request time from inside a
transactional PL/pgSQL function versus only from privileged/administrative contexts. This is
the same class of gap the original review correctly flagged for `pg_cron` (its F15) — it should
be treated the same way here: **UNVERIFIED**, not assumed.

### Finding 9 [SHOULD-FIX] — "materially harder than clearing an app" is not uniformly true

`NETWORK_ROTATION_TRADEOFF` (line 177) states network rotation is "materially harder than
clearing an app," undifferentiated. This is fair for power-cycling a home router (real,
multi-minute friction, uncertain to even yield a new address on a short DHCP lease). It
overstates the case for cellular: toggling airplane mode is a two-tap, ~10-second action that
is widely known troubleshooting folklore, often (not always) yielding a new CGNAT-assigned
address, and requires no more sophistication than clearing app storage. It is outright false
for VPN use: installing a free VPN app is mainstream, and switching server/region gives an
instantly different source address, more *reliably* than clearing local storage does (which
depends on the app actually persisting nothing else identifying). **Minimum fix:** differentiate
by connection type rather than asserting one difficulty level; this doesn't change the
architecture, only the honesty of the tradeoff section.

### Finding 10 [Confirms Finding, no code change needed] — bypass-closure mechanics verified; the residual is now a single point of failure with no structural backstop

I built the exact scenario described in `DIRECT_GUEST_WRITE_BYPASS_PROTECTION` (lines 142-153)
from scratch — a table with RLS enabled, a permissive `anon` INSERT policy, then applied the
proposed closure:

1. With `GRANT INSERT` + the permissive policy present: `SET ROLE anon; INSERT ...` succeeds.
2. After `REVOKE INSERT ... FROM anon` + `DROP POLICY`: the identical `anon` insert fails with
   `ERROR: permission denied for table t9_flags` — **confirmed, the table-privilege revoke
   alone is what stops it, independent of any policy.**
3. A `postgres`-owned `SECURITY DEFINER` function, with `EXECUTE` granted to `anon`, inserts
   successfully **despite** step 2's revoke and the missing policy — confirming
   `relforcerowsecurity = false` on every table (`FORCE ROW LEVEL SECURITY` is set nowhere,
   confirmed by direct catalog query) means the RPC truly writes as table owner, bypassing RLS
   entirely, exactly as v2 states.

This means v2's `T1` closure mechanics are correct as far as they go. But it also means, now
demonstrated rather than asserted, that **all enforcement for guest ingestion becomes exactly
one `IF NOT admitted THEN RAISE EXCEPTION` inside one function, with zero structural backstop**
— no RLS policy will ever catch a bug in that check, a future refactor that removes it, or a
second SECURITY DEFINER function some future contributor adds without realizing this table has
no RLS safety net left. This should be named explicitly as a residual risk (see below), not
left implicit.

### Finding 11 [SHOULD-FIX] — the three rollback levers are not all "independent," and the kill switch's semantics are untested against the T1-applied state

`ROLLBACK` (lines 187-193) calls the three levers "independent." Lever 3 ("Undeploy the Edge
Function") is not safe on its own once `T1` (REVOKE INSERT) has shipped: with no ingestion
path left in the table's grants and no function to call, guest reporting is completely dead,
which is a materially different (and worse) outcome than what levers 1 and 2 produce. Lever 3
is only ever safe *paired with* lever 2 (the restoration migration) once T1 is live — they are
sequenced, not independent. Separately, `FAILURE_BEHAVIOR` (line 185) says
`limiter.config.enabled = false` "degrades the function to record-only" — but with T1 applied,
"record-only" must mean "skip only the cap check, still perform the actual `flags`/`feedback`
INSERT," or flipping the safety switch would paradoxically stop all guest submissions rather
than restoring unlimited ones. Nothing in `LOCAL_TEST_PLAN` or `STAGING_TEST_PLAN` tests "config
flip while T1 is active, confirm submissions still succeed" — this exact combination should be
an explicit test case given how easy it is to get backwards.

### Finding 12 [SHOULD-FIX] — the dedicated ingest role's reachability from an Edge Function has no precedent and is not explained

`DIRECT_GUEST_WRITE_BYPASS_PROTECTION` (line 153): "`EXECUTE` on that RPC is granted **only** to
a dedicated `flagstone_guest_ingest` role held by the Edge Function — never to `anon`... never
broadly to `service_role`." I read every existing Edge Function in this repo
(`supabase/functions/**`) that touches the database: `notify-flag-status`,
`send-push-notification`, `delete-account`, `account-deletion-*` — **every single one**
authenticates to Postgres via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` through
`@supabase/supabase-js`, i.e., as `service_role` over PostgREST. There is **zero precedent
anywhere in this codebase** for an Edge Function reaching Postgres as any other named role.
Doing so for real would require either (a) a direct Postgres connection (bypassing
PostgREST/supabase-js entirely) through the connection pooler, using a Postgres driver and a
role password managed as a new class of secret, or (b) minting a custom JWT carrying a `role`
claim, which needs access to the project's JWT signing key and custom logic neither present nor
precedented here. v2 presents this as though it is simply a `GRANT EXECUTE` decision; it does
not say which of these two paths it means, and neither has been demonstrated feasible for this
project. This should be resolved (or at minimum explicitly flagged as unresolved, the way v1's
F15 flagged `pg_cron`) before CODE.

### Finding 13 [SHOULD-FIX] — the T0/T1 framing has regressed in clarity, and "Web is unaffected" is false for this project's actual deployment

v1 had an explicit, unambiguous "T0 — mechanism live / T1 — bypass closed" subsection. v2 uses
"T1" repeatedly (lines 74, 151, 215, 231) but **never once defines or even mentions "T0"
anywhere in the document** — and worse, line 74 uses "T1" to mean a *test case ID*
("Measured (T1, T3)", matching the author's own `T1_admitsAndRefusesCorrectly` test in
`author-verification-postgres.json`) while lines 151/215/231 use "T1" to mean the *bypass-closure
rollout phase*. A reader relying on v2 alone cannot tell whether "T1" (full closure) is in
scope for this approval — `STAGING_TEST_PLAN` item 6 says alternate paths will be "negatively
tested against T1" as if it will be applied and exercised now, while `KNOWN_LIMITATIONS` 9
(correctly) says bypass closure "is not deliverable inside Phase 03A" at all. Both can be true
only if "test T1 locally/on staging without shipping it" is the intent, but the document never
says so.

`KNOWN_LIMITATIONS` 9 also states "Web is unaffected" (repeating v1's exact claim). This is
**false for this project's actual production deployment**, and I confirmed it directly against
`release/current.json`: production web is not "the current bundle," it is a pinned Vercel
deployment (`deploymentId: HMszH26wADRRDd1CqH4UkJ8kAugQ`, `productionBranch:
release/web-4.1.1-build33-openfreemap`, `sourceCommit: ebf091c2...`), a frozen `web-only-
descendant` of the same Build 33 source the native app is frozen at, serving
`flagstone.skypistudio.com` and `accessmap.skypistudio.com`. It does not "always load the
current bundle" — it loads exactly what was deployed on 2026-09-02 until Sky performs a new,
explicitly-authorized production web deployment. This means the population that keeps
unlimited anonymous reporting after `T1` ships is native installs **and** the live web
deployment, not native alone — the same correction already independently reached by
`OLD_CLIENT_ROLLOUT_CONSTRAINT.md` in this same output directory, which I verified rather than
took on faith. **Minimum fix:** restore an explicit T0/T1 (or renamed) framing, stop overloading
"T1" with the test-ID meaning, and correct "Web is unaffected" everywhere it appears.

### Finding 14 [NOTE] — "the six existing Phase 03A pairs" is actually seven

`ROLLBACK` (line 192) and `LOCAL_TEST_PLAN` item 12 (line 218) both say "six existing... pairs,"
unchanged from v1 (which said the same at its line 207). I counted directly:
`supabase/migrations-next/phase03a/*.sql` has 7 forward files, `.../rollback/*.rollback.sql`
has 7 matching files, and `candidate-contract.json` lists 7 `rollbackMode` entries. Harmless to
the architecture, but it is a small, concrete, `ls`-checkable miscount that was not corrected
across the v1→v2 revision despite the revision's stated goal of re-verifying everything, and is
worth fixing precisely because v2's whole credibility argument rests on "v1 was written but not
run; this one was."

### Finding 15 [NOTE] — the Parameters table reads as a recommendation but has been withdrawn

`Parameters` (lines 272-283) presents `NORMAL=5`, `K=10`, `WINDOW=24h`, `/32`, `/48` as
"proposed starting values; all are owner knobs." `THRESHOLD_SEPARATION.md`, in this same output
directory and dated the same day, explicitly withdraws these as a recommendation: real
production traffic (per the same log analysis underlying Finding 1) was "85 requests from 8
distinct source addresses across 2 Cloudflare colos in 24 hours" — far too little to calibrate
anything — and states plainly that `NORMAL=5` was carried over only because it matches today's
client-side constant and `K=10` "was chosen only to have a number... Neither should be treated
as a recommendation." I cannot independently verify the 85-request log figure myself, but I
have no reason to doubt it and it is consistent with a pre-launch/App-Store-review-stage app.
The owner should read v2's Parameters table as illustrative only, not as vetted starting
values, until a properly-authorized staging measurement exists (that authorization is exactly
what `STAGING_DIAGNOSTIC_PROBE_PLAN.md` is still waiting on).

---

## The additional challenges, answered directly

**Is the network address still the only available reset-resistant scarce input? Find a
fifth.** I could not falsify the conclusion. Beyond the four (network address, minting cost,
device attestation, anonymous Auth) and the reviewer-added fifth already folded into v2 (phone/
SMS OTP, correctly rejected as *stronger*, not weaker, durable PII), I considered: email
verification (weaker than phone — free disposable addresses are trivial to mint in bulk, fails
"scarce" worse, not better); carrier/SIM-level silent authentication (reset-resistant in
principle, but cellular-only, requires a new paid telecom-integration vendor with zero
precedent here, and raises its own device/SIM-linkage privacy question — same shape of
objection that sank Turnstile Ephemeral IDs and App Attest); payment-method tokenization (a
real card is genuinely scarce and reset-resistant, but wildly disproportionate friction and
privacy cost for "drop a quick anonymous report," clearly worse than phone OTP on the same
axis). None of these change the recommendation. The document's exhaustiveness language is
also, correctly, already softened from v1 — v2 dropped "only four scarce inputs exist for this
app" and now says only "a scarce input that exists," which is the right level of confidence.

**Is the untrusted-fallback design actually safe?** No, not in the sense the document's framing
implies — see Finding 4 above, which I treat as the central finding of this review.

**Is the T0/T1 split still honest?** The *substance* is still honest — `KNOWN_LIMITATIONS` 9
does correctly say bypass closure can't ship in Phase 03A. The *presentation* is not honest by
omission: it never names "T0," reuses "T1" for two different things in the same document, and
sits in real tension with the test plans' own language about testing "against T1." See Finding
13.

---

## What v2 got right

The two claims the prior review empirically falsified in v1 are genuinely fixed, and I
independently re-built both fixes from a blank schema rather than trusting the author's own
receipt: splitting the admission logic into sequential PL/pgSQL statements instead of chained
CTEs does spend correctly (I measured 1,2,3,4,5-then-refused on a fresh grant), and abandoning
the transaction-local GUC in favor of one RPC doing admission-and-insert together is the only
approach that can work given PostgREST's one-transaction-per-request model, which I did not
find any way around. The bucket-to-grant binding fix (`F3` from the prior review) works exactly
as claimed — I proved a grant minted on one bucket cannot be redirected to spend against
another. The window-boundary fix (`F11` from the prior review, grant lifetime carrying balance
across a window) also works — I proved a grant valid by `expires_at` but from the wrong
`window_id` is correctly ignored and a fresh grant minted instead, with the new window's bucket
starting at zero, independent of the old one. `REVOKE INSERT` genuinely stops direct `anon`
inserts regardless of RLS, confirmed empirically. `verify_jwt=false` for an unauthenticated
guest route and reading Vault from inside a `SECURITY DEFINER` function are both real,
shipped patterns in this exact codebase, not novel risk. The document is honest that it has not
itself been through a second independent review, and does not claim FDA-028 is closed. The
"trust the shape, not the value" instinct is, per Finding 1's Cloudflare confirmation, *better*
supported now than when v1 wrote it — it was simply pointed at the wrong header.

---

## Residual risk the owner must accept

Even after every MUST-FIX above is applied, in plain terms:

- **No network-address scheme, keyed to any header, can stop a determined abuser willing to
  send one non-default request.** The improvement this mechanism buys is real for people using
  the actual app and clearing its storage; it buys close to nothing against anyone willing to
  read a paragraph about HTTP headers or call the API directly, because doing so still lands
  them on the same shared, non-per-client global cap that exists today.
- **A single reset by a single person on a shared connection can lock every future guest on
  that connection out of a first grant for the rest of the day**, even though most of that
  connection's nominal daily budget was never spent. This is a new, non-obvious cost this
  design introduces beyond the already-acknowledged NAT tradeoff, and it lands on the same
  sympathetic population (group homes, shared disability housing, community mapping sessions)
  the document already worries about.
- **The mechanism, as currently specified, is keyed to a header that this platform's own,
  already-gathered log evidence says is absent from real traffic.** Shipping v2 exactly as
  written would very likely mean every real request fails the shape check and rides the weak
  global fallback forever — the opposite of the intended outcome — until it is re-pointed at
  `cf-connecting-ip`.
- **Both the live native build and the live web deployment keep unlimited anonymous reporting
  indefinitely** once any future closure ships, not native alone, because production web here
  is a frozen, pinned deployment rather than a rolling one.
- **For roughly a day at a time, someone with ledger access who can guess a candidate network
  prefix can narrow which live-window report likely came from it** to a tighter margin than
  "per-window spend counts" implies, because grant expiry times leak approximate mint times.
  This risk expires with the window; it is not zero while the window is live.
- **The entire enforcement surface for guest writes becomes one `IF` statement in one function**,
  with no RLS backstop of any kind once direct `anon` INSERT is revoked. That is very likely the
  right engineering tradeoff given the constraints, but it should be accepted knowingly, not
  discovered later.
