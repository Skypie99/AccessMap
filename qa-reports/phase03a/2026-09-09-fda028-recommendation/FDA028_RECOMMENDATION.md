# FDA-028 — preferred architecture recommendation

**Status: AWAITING_OWNER_APPROVAL. Nothing implemented.** No product source, migration, staging or production change was made. No hosted request was issued. This document is a recommendation and its evidence; it closes no finding and accepts no candidate.

Frozen source: `0a6a6b03fd0cbe72f70f67260f6cab746e098f6a` / tree `857411dc733b93686d789a72e461856698bec814`.

## The owner contract, restated as a test

> "Keep the budget across session resets; retain the architecture hold until a trusted mechanism is approved."

An exhausted anonymous budget must not refill because the app restarted, dropped or replaced a session, took a new session token, reconnected, or otherwise got fresh client-session state. Natural renewal after the approved window is allowed. Independent anonymous clients keep independent *normal* budgets. No persistent device fingerprint, no durable cross-session tracking identifier, no raw IP in application tables, no limiter identifiers exposed to clients, no secret-derived identifiers in logs or receipts.

## The constraint that decides the design

The 2026-09-05 review derived it and this review re-derived it independently:

> If a returning client can present exactly the observations of a fresh same-network client, no server can tell them apart.

So reset-resistance is impossible without **at least one trusted scarce input**. Everything the client holds — AsyncStorage, a session, a token, a generated key, a capability — can be discarded and re-obtained. Only four scarce inputs exist for this app:

| Scarce input | Reset-resistant | Independent same-network clients | Cost to adopt |
|---|---|---|---|
| **Server-observed network address** | Yes — survives every enumerated reset vector | No, by itself | None; already present |
| Minting cost (CAPTCHA / proof-of-work) | **No** — a reset costs seconds, not budget | Yes | Provider + client change |
| Device attestation (App Attest / Play Integrity) | Yes, until reinstall | Yes | New native module, new EAS build, App Store resubmission, no web path |
| Anonymous Auth | No — a fresh signup is a fresh identity | Inherits the network input anyway | Durable `auth.users` rows, no auto-cleanup, worse privacy |

Only the network address is both reset-resistant and available. Its two defects — unverified provenance and NAT sharing — are the entire engineering problem, and both are solvable. Every other candidate either fails the contract outright or is blocked on a new app binary.

The owner already anticipated this: the brief permits an IP-derived mechanism *as a trusted server/gateway-derived signal*, computed server-side, non-reversible, secret-keyed, short-window, short-retention, not application identity. The design below is built to those five conditions.

---

## MECHANISM — GAB-1: gateway admission with a two-tier Postgres ledger

One new Edge Function is the only way a guest submission reaches the database. Behind it, two counters, both server-side, both invisible to the client:

- **Tier 1 — network-window bucket.** The authority. Keyed by a rotating HMAC of the trusted source-address prefix. Holds `units_consumed` for the window. **This is what survives a reset**, because the client contributes nothing to its key.
- **Tier 2 — grant.** The fairness layer. Each client gets its own opaque grant with its own sub-budget carved out of the bucket. **This is what keeps client A and client B independent** behind one NAT.

A client that exhausts its grant, wipes its state and asks for a new grant gets one — but the new grant's opening balance is `min(NORMAL, BUCKET_ALLOWANCE − bucket.units_consumed)`. The bucket already counted what it spent. **A reset buys a new envelope, not new money.**

### TRUSTED_INPUT and the anti-forgery rule

The header cannot be trusted on its documented merits — that gap is still open (see [evidence](evidence-platform-and-boundary.json), E1–E3). So the design does not trust a *value*; it trusts a *shape*, and fails toward less budget.

```
xff   = request header 'x-forwarded-for', split on comma
hops  = xff.length
cand  = xff[hops - 1]        // rightmost: appended by the nearest proxy, never by the caller
```

Admit to the trusted bucket only when **all** hold:

1. `hops === EXPECTED_HOPS` (a pinned constant, established by the probe below);
2. `cand` parses as a public, non-reserved address;
3. if `cf-connecting-ip` is present, it equals `cand`.

Otherwise the request goes to a single shared **untrusted bucket** with a deliberately small allowance.

This is safe under *either* platform model, which is why it does not need the missing documentation:

- **Append model** (what the community report observed): a caller injecting a value makes `hops = EXPECTED_HOPS + 1` → mismatch → untrusted bucket. Reading from the right also ignores the injected element.
- **Overwrite model**: `hops` stays 1 and the value is the platform's own.
- Either way, **`hops === 1` with no caller contribution is the only way into a full-size bucket.**

The property that matters: **forgery can only shrink a caller's budget, never enlarge it and never select a fresh one.** Supabase's own Turnstile example reads `xff[0]` — the caller-controlled end — and under the observed append model that read is affirmatively unsafe. This design reads the opposite end and cross-checks the hop count.

`EXPECTED_HOPS` must be pinned from **measured** behaviour, not assumed. See LOCAL/STAGING plans: a bounded, synthetic-only probe that emits **only** booleans and counts — never an address, never a hash, never a header value.

### IDENTIFIER_DERIVATION

```
prefix     = IPv4 → /32 ; IPv6 → /64        (normalised, lowercased)
window_id  = floor(unix_seconds / 86400)
bucket_key = HMAC-SHA256(K_epoch, prefix || '|' || window_id)[0..15]
```

`K_epoch` is a 32-byte secret in Supabase Vault, **one per window generation**, destroyed with that window. Because the secret dies with the window, a bucket key from Monday is mathematically unlinkable to Monday's address or to Tuesday's key for the same address. The ledger cannot be walked backwards into a movement history — that is what stops it becoming a tracking store.

The grant token handed to the client is `base64url(grant_id) . base64url(HMAC(K_grant, grant_id || exp))`. It carries **only** an opaque id and an expiry: no bucket key, no address, no counter, no secret-derived value. The client cannot read its own limiter identity from it, and cannot forge another.

### Atomicity

One `SECURITY DEFINER` function, one transaction, stable lock order (bucket → grant):

```sql
-- lock-or-create the bucket, then spend under a guard; zero rows RETURNING = refused
WITH b AS (
  INSERT INTO limiter.bucket AS t (bucket_key, window_id, units_consumed, grants_issued)
  VALUES (p_bucket, p_window, 0, 0)
  ON CONFLICT (bucket_key, window_id) DO UPDATE SET units_consumed = t.units_consumed
  RETURNING t.bucket_key, t.window_id
),
spend AS (
  UPDATE limiter.bucket t SET units_consumed = t.units_consumed + 1
  FROM b WHERE t.bucket_key = b.bucket_key AND t.window_id = b.window_id
    AND t.units_consumed < p_bucket_allowance
  RETURNING t.units_consumed
)
UPDATE limiter.grant g SET units_consumed = g.units_consumed + 1
FROM spend WHERE g.grant_id = p_grant AND g.units_consumed < p_grant_allowance
  AND g.expires_at > now()
RETURNING g.units_consumed;
```

The no-op `DO UPDATE` is the standard idiom to take a row lock whether or not the row already existed. Concurrent Edge isolates serialise on that lock, so simultaneous requests cannot overshoot. Process-local counters could not do this; a shared store is mandatory, and Postgres already is one.

### Why Postgres and not Redis — and why fail-closed is free

The ledger lives in the same database as `public.flags`. **If the ledger is unreachable, the INSERT was unreachable anyway.** So failing closed forfeits no submission that would otherwise have succeeded — the usual "fail-closed blocks real users" objection does not apply here. A separate Redis would break that property, add a service, add cost, and add a partition mode in which the limiter fails while the write path is healthy. Supabase's rate-limiting example uses Upstash Redis; that is the example's choice, not a platform requirement.

A `limiter.config.enabled` row is read inside the same transaction. Flipping it to `false` degrades the function to record-only, with no deploy and no migration.

---

## Bypass closure — and the honest limit on how far Phase 03A can go

A limiter is theatre while `anon` can still `INSERT` directly. Today it can, on both paths:

| Path | Current state |
|---|---|
| `public.flags` | `CREATE POLICY "flags anon insert" ... FOR INSERT TO anon WITH CHECK (user_id IS NULL AND photo_url IS NULL AND status = 'open')` |
| `public.feedback` | `CREATE POLICY feedback_insert_self_or_anon ... WITH CHECK (user_id IS NULL OR user_id = auth.uid())` — **no `TO` clause, so it applies to every role including `anon`** |

Closure uses the idiom this repository already established in `20260905055630_phase03a_open_inserts.sql` — an `AS RESTRICTIVE` policy, which cannot be OR-composed away by any permissive policy:

```sql
CREATE POLICY "flags guest ingest only" ON public.flags AS RESTRICTIVE FOR INSERT TO anon
  WITH CHECK (current_setting('limiter.admitted', true) = 'on');
```

`limiter.admitted` is a transaction-local GUC set **only** by the admission RPC via `set_config(..., true)`. A direct PostgREST insert never has it. The same restrictive policy goes on `public.feedback`. Alternate routes are closed the same way and must each be negatively tested: authenticated callers submitting `user_id IS NULL`, bulk/array inserts, `Prefer: resolution=merge-duplicates` upserts, every exposed RPC, and any writable view.

**The limit, stated plainly.** The app has **no minimum-supported-version gate and no remote config** — `src/lib/featureFlags.ts` is a compile-time in-memory store. Adding that restrictive policy therefore breaks guest reporting instantly and permanently on **every already-installed native build**, with no server-side way to prompt an update. Web is unaffected (it always loads the current bundle).

So the rollout must be two decisions, not one:

- **T0 — mechanism live (this recommendation's scope).** Function + ledger + client routed through it. Direct `anon` INSERT still permitted, still covered by the existing global caps. New clients are properly per-client limited; the mechanism is proven under real traffic. **The bypass is not yet closed.**
- **T1 — bypass closed (a separate owner decision).** Add the restrictive policies. Gated on a client-version floor shipping first and on adoption telemetry. This is a Phase 04 client dependency.

Claiming FDA-028 fully closed at T0 would be false. **FDA-028's per-client budget is deliverable in Phase 03A/03B; its bypass closure is not, without breaking installed clients.**

The existing global caps (`check_global_anon_rate_limit` 100/h, `check_feedback_rate_limit` 30/h) stay exactly as they are, as the emergency backstop the brief permits. They are not the per-client limit and are not evidence of one — `20260904000300_adopt_live_insert_throttles.sql` already records that they are a shared denial-of-service lever and assigns their replacement to Phase 03A.

---

## Attacking the design

| Attack | Result |
|---|---|
| **Session reset** — restart, clear session, new token, reconnect | Bucket key is derived from the network address and a server secret. None of these vectors touch it. New grant opens at `BUCKET_ALLOWANCE − units_consumed`. **Contract met.** |
| **Reset amplification** (the residual) | A resetter on one prefix can mint up to `K` grants and consume at most `BUCKET_ALLOWANCE = NORMAL × K` in the window — then it is refused. **Bounded at K×, not unbounded.** Today it is unbounded. `K` is the single knob trading NAT tolerance against amplification. |
| **Multi-device / multi-client** | Distinct grants → distinct sub-budgets. Up to `K` co-located clients each get the full normal budget. **Independent normal budgets met** up to `K`. |
| **Concurrency** | Single-statement guarded update under a row lock; zero rows returned = refused. Cannot overshoot. |
| **Forgery — inject `x-forwarded-for`** | Hop count rises → untrusted bucket, which is *smaller*. Rightmost read ignores the injected element. Cannot select a fresh bucket. |
| **Forgery — forge a grant token** | HMAC over a server-generated UUID with a Vault secret. Unforgeable; an invalid token is treated as absent and a new grant is minted from the bucket's *remaining* balance. |
| **Forgery — replay another client's grant** | Gains nothing: it spends that grant's balance and the shared bucket's, both of which the attacker already shares. |
| **Bypass — direct guest INSERT** | Open at T0, closed at T1 by restrictive policy. **Stated, not hidden.** |
| **Bypass — guest feedback** | Same treatment; note `feedback_insert_self_or_anon` has no `TO` clause and must be handled explicitly. |
| **Bypass — alternate RPC / view / bulk / upsert** | Must be enumerated and negatively tested; restrictive policies apply per-row regardless of route. |
| **NAT / shared network** | Up to `K` fully-active guests per IPv4 /32 per window. IPv6 uses /64, which is per-subscriber, so CGNAT pressure is IPv4-only. Beyond `K`, a legitimate guest is refused and shown the existing "sign in to report more" path. **This is the real cost and it is an accessibility cost.** |
| **Network rotation** | Changing network changes the bucket and grants a fresh budget. Unavoidable for any network-derived signal; out of scope of the owner's enumerated reset vectors, and materially harder than clearing an app. |
| **Privacy** | No raw IP anywhere. One truncated HMAC per active prefix per window, under a secret destroyed with the window. Max retention ~25 h. No device fingerprint. No durable cross-session identifier. No limiter identity leaves the server. |
| **Failure mode** | Fail-closed, at zero cost — ledger availability equals target-table availability. Kill switch degrades to record-only without a deploy. |
| **Rollback** | Three independent levers: config flip (instant), restoration migration (drops policies, restores grants), undeploy the function. Each gets the paired forward/restoration file the repo convention already requires. |
| **Cost** | None. No new service, no vendor, no paid tier. One Edge Function, two small tables, one purge job. |

### Rejected alternatives

- **Client-side counters / AsyncStorage / in-memory / UI throttling** — the current mechanism. The client owns the counter; deleting one key restores a full budget, forever. Explicitly excluded by the brief.
- **Plain or re-mintable session tokens, client-generated keys, proof-of-possession, HMAC of a caller-supplied id** — all fail the same way: the caller chooses when to become a new client. Signature verification prevents *fabrication*, never *re-minting*.
- **IP HMAC alone (no grant tier)** — meets reset persistence, fails independent same-NAT normal budgets. Retained only as the Tier-1 authority, never as the whole design.
- **CAPTCHA / Turnstile / proof-of-work as the primary anchor** — excellent privacy and independence, but a reset costs seconds rather than budget, so it does not anchor a budget at all. Viable later as an *additional* cost on grant minting; not a substitute.
- **Turnstile Ephemeral IDs** — device-linked, Enterprise-gated, account-team enablement. A durable cross-session device signal is exactly what the privacy contract forbids.
- **App Attest / Play Integrity** — the strongest identity properties available, and it would satisfy every enumerated reset vector. Blocked on a new native module, a new EAS build and App Store resubmission, with no web path, against a frozen Build 33. Out of Phase 03A/04 boundaries. Worth revisiting only if the residual amplification proves unacceptable in production.
- **Supabase anonymous Auth** — creates durable `auth.users` rows with no automatic cleanup, moves guests onto the `authenticated` role (requiring a full policy re-review, including the `users` mirror at `schema.generated.sql:586–595` and `20260904000200_adopt_d1sa_containment.sql:79–96`), and derives its own scarcity from the same IP signal. Strictly worse privacy for no additional reset resistance.
- **Redis / Upstash for counters** — adds a service, a cost and a partition mode where the limiter fails while writes succeed. Postgres gives the same atomicity and makes fail-closed free.
- **Enforcing the count inside an RLS policy** — rejected on correctness grounds, not preference. RLS predicates must be side-effect free; they may be evaluated more than once per row and in an unspecified order. A decrementing policy would miscount. Counting belongs in the RPC; RLS only checks the transaction-local admission mark.

---

## Parameters (all tunable; these are the proposed starting values)

| Parameter | Proposed | Rationale |
|---|---|---|
| `NORMAL` (per grant / window) | **5** | Matches today's client-side `MAX_PER_WINDOW`, so no user-visible change for honest guests. |
| `WINDOW` | **24 h** | Matches the existing anonymous window. |
| `K` (grants per bucket-window) | **10** | `BUCKET_ALLOWANCE = 50`/prefix/day. Tolerates 10 fully-active guests behind one IPv4; caps reset amplification at 10×. |
| Untrusted-bucket allowance | **5 / hour, global** | Usable but deliberately unattractive. |
| Grant lifetime | **26 h** | Slightly over the window so a grant cannot outlive its bucket's usefulness. |
| Retention | **≤ 25 h** | Purge at `window_end + 1 h`; epoch secret destroyed at the same time. |

---

## LOCAL_TEST_PLAN

Runs against disposable PostgreSQL with the existing pgTAP + replay + effective-privilege harness. No hosted contact.

1. **Arithmetic and atomicity** — pgTAP: exhaust a grant; confirm refusal; mint a second grant and assert its opening balance equals `BUCKET_ALLOWANCE − units_consumed`, **not** `NORMAL`. This is the contract test.
2. **Concurrency** — N parallel sessions against one bucket at the boundary; assert total admitted never exceeds the allowance.
3. **Independence** — two grants, one bucket; assert each reaches `NORMAL` while the bucket has room.
4. **Grant forgery** — tampered id, tampered MAC, expired, foreign, absent; each must fall back to minting from the bucket's remaining balance, never to a fresh `NORMAL`.
5. **Extraction rule** — table-driven over synthetic header shapes (absent, 1 hop, 2 hops, injected leading value, IPv6, reserved/private ranges, malformed, `cf-connecting-ip` agreeing and disagreeing). Assert every non-conforming shape lands in the untrusted bucket.
6. **Bypass matrix** — with the T1 restrictive policies applied to a local database: direct `anon` INSERT, authenticated `user_id IS NULL`, bulk/array insert, upsert, every exposed RPC, every writable view. All must be refused.
7. **Purge and unlinkability** — assert rows are gone past retention and that the epoch secret is destroyed.
8. **Restoration** — apply forward, apply restoration, assert catalog equality; then deterministic reapply, as the six existing Phase 03A pairs already do.
9. **Receipt hygiene** — assert no receipt, log or error string contains an address, a bucket key, a token or a secret-derived value.
10. Existing gates unchanged: `npm run typecheck`, `npm run lint`, full Jest, the effective-privilege guard.

## STAGING_TEST_PLAN

Only after CODE and INT accept, and only on the disposable branch `ctshxbykuemeqnofqcdh` / `441acc38-d71c-4a87-883e-61ff87e0c52e`, with synthetic data only.

1. **Metadata probe first — and it needs an explicit sequencing exception.** A single-purpose function that returns **only** `{ hops: int, lastIsPublic: bool, cfPresent: bool, cfMatchesLast: bool }`. No address, no hash, no header echo. Sampled from several client networks to pin `EXPECTED_HOPS` and to confirm the append-vs-overwrite model empirically. Removed immediately afterwards with a recorded removal receipt. **This is the only step that can close F28-A, and it necessarily runs before CODE can be finalised — the owner's "verify actual metadata first" and the mandated CODE→INT→STAGE order point in opposite directions here, and only Sky can resolve that.**
2. Two synthetic clients on the **same** network: assert independent normal budgets.
3. Client A exhausts, discards all state, re-requests: assert the new grant opens reduced, and that repeated resets terminate at `BUCKET_ALLOWANCE`.
4. Concurrent burst at the boundary from both clients: assert no overshoot.
5. Forged and duplicated `x-forwarded-for`, absent header, forged `cf-connecting-ip`: assert untrusted-bucket demotion, never enlargement.
6. Every alternate ingest path negatively tested against the T1 policies.
7. Emergency-cap behaviour, kill-switch flip, expiry, purge, restoration and deterministic reapply — each with before/after catalog hashes.
8. Receipts carry outcomes, counts, bounded lifetimes and provenance only.

---

## KNOWN_LIMITATIONS

1. **Reset amplification is bounded, not eliminated.** Worst case `K`× within a window. Reducing `K` strengthens reset resistance and weakens NAT tolerance; there is no value that maximises both. This is the irreducible consequence of the constraint at the top of this document.
2. **NAT is a real accessibility cost.** The (K+1)-th genuine guest behind one IPv4 in a window is refused and told to sign in. IPv6 /64 avoids this; IPv4 CGNAT does not.
3. **Network rotation grants a fresh budget.** Inherent to any network-derived signal.
4. **F28-A is not yet closed.** The extraction rule is designed to be safe without the missing documentation, but `EXPECTED_HOPS` must be measured before the mechanism is trustworthy in production.
5. **Bypass closure is not deliverable inside Phase 03A** without breaking installed clients. T1 depends on a client-version floor that does not exist yet.
6. **The bucket key is a cross-window-scoped identifier for up to 25 hours.** It is not a device fingerprint and not durable, but it is not nothing. Rotating epoch secrets is what bounds it.

## WHY_THIS_IS_PREFERRED

It is the only evaluated design that satisfies the owner's locked contract using a scarce input that actually exists on this platform today, at zero infrastructure cost, entirely within backend scope, with no new vendor, no device linkage, no durable identifier, no raw IP, a free fail-closed posture, and three independent rollback levers. Every alternative either fails the contract (client state, tokens, CAPTCHA), costs materially more privacy (anonymous Auth, Ephemeral IDs), or is blocked on a new App Store binary (attestation). Its two genuine costs — bounded reset amplification and IPv4 NAT pressure — are exposed as a single tunable knob rather than buried.
