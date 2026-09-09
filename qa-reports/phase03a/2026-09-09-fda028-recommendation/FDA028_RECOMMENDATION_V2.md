# FDA-028 — preferred architecture recommendation (v2, post-review)

**Supersedes [FDA028_RECOMMENDATION.md](FDA028_RECOMMENDATION.md) (v1).** v1 is preserved byte-identical because the [independent review](INDEPENDENT_REVIEW.md) cites its line numbers. v1 must not be implemented: two of its mechanisms were empirically falsified and are corrected here.

**Status: AWAITING_OWNER_APPROVAL. Nothing implemented.** No product source, migration, staging or production change. No hosted request. Frozen source `0a6a6b03fd0cbe72f70f67260f6cab746e098f6a` / tree `857411dc733b93686d789a72e461856698bec814`.

---

## FDA_028_RECOMMENDATION_ID

`FDA028-GAB-2-20260909` — Gateway Admission, Bound-grant ledger, revision 2.

## What changed from v1, and why you should trust v2 more

The independent reviewer built the schema and **ran** v1's SQL. I reproduced both failures myself on PostgreSQL 17.11 ([receipt](author-verification-postgres.json)):

| v1 mechanism | Result | Correction in v2 |
|---|---|---|
| Multi-CTE admission statement | **FALSIFIED.** Returns zero rows on *every* call and never increments a counter. Under v1's own semantics ("zero rows = refused") it refuses every guest, forever. | Sequential statements inside one `SECURITY DEFINER` PL/pgSQL function. Verified: admits, refuses at the cap, and admits **exactly** the allowance under 30-way concurrency with no overshoot. |
| Bypass closure via a transaction-local GUC read by a `RESTRICTIVE` policy | **FALSIFIED.** `set_config(...,true)` is gone in the next transaction; PostgREST runs every request in its own transaction, so the admission call and a separate client `INSERT` can never share it. | The GUC scheme is **abandoned**. Closure is `REVOKE INSERT` + drop the permissive anon policies; all guest writes go through one RPC that does admission *and* the insert in one transaction. |
| Grant not bound to a bucket | **UPHELD as a defect.** One grant could spend against any bucket, letting a single holder nibble at other networks' allowances. | `limiter.grant` carries `(bucket_key, window_id)`; the lookup requires both to match. Verified. |

v1 was written but not run. v2 was run.

---

## MECHANISM

One guest-ingest Edge Function is the only route by which an anonymous submission reaches the database. It performs **no cryptography and holds no secret**: it validates the *shape* of the request's forwarding headers in JS and passes a validated address prefix to Postgres. A single `SECURITY DEFINER` function then does the HMAC (reading the epoch secret from Vault, the way `verify_webhook_secret` already does), the ledger decision, and the `INSERT` — all in one transaction.

Two server-side counters, neither visible to the client:

- **Tier 1 — network-window bucket.** The authority. Keyed by a rotating HMAC of the trusted address prefix. **This is what survives a session reset**, because the client contributes nothing to its key.
- **Tier 2 — bound grant.** The fairness layer. Each client holds an opaque grant with its own sub-budget, bound to the bucket that minted it. **This is what keeps client A and client B independent** behind one NAT.

A client that exhausts its grant, wipes all state and asks for a new grant gets one — but the bucket already counted what was spent, so resets terminate at `BUCKET_ALLOWANCE`. **A reset buys a new envelope, not new money.**

## TRUSTED_INPUT

The rightmost element of `x-forwarded-for`, admitted only under a pinned hop count, optionally cross-checked against `cf-connecting-ip`. No secret and no header value ever becomes application data.

```
xff  = header('x-forwarded-for').split(/\s*,\s*/)      // trimmed — v1 was looser than the
hops = xff.length                                       // Supabase example it criticised
cand = xff[hops - 1]                                    // rightmost: appended by the nearest
                                                        // proxy, never by the caller
```

Admit to a trusted bucket only when **all** hold: `hops === EXPECTED_HOPS`; `cand` parses as a public, non-reserved address; and if `cf-connecting-ip` is present it equals `cand`. Multiple `X-Forwarded-For` header *lines* are joined by the runtime into one comma list and counted as hops, so line-splitting is not an escape.

## TRUST_BOUNDARY

Everything the caller controls is outside it. The boundary is the platform edge that appends the connection address. **Its exact contract is still undocumented — F28-A remains OPEN as of 2026-09-09** ([evidence](evidence-platform-and-boundary.json)). So the design never trusts a *value*; it trusts a *shape*, and is safe under either platform model:

- **Append model** (what the 2025-04 community report observed): an injected element makes `hops = EXPECTED_HOPS + 1` → demoted. Reading from the right also ignores the injected element.
- **Overwrite model**: `hops` stays 1 and the value is the platform's own.

Either way, **only a request with no caller contribution reaches a full-size bucket. Forgery can shrink a caller's budget; it cannot enlarge one, refresh one, or select someone else's.**

Supabase's own Turnstile example reads `xff[0]` — the caller-controlled end. Under the observed append model that read is affirmatively unsafe. This design reads the opposite end.

## BUDGET_STATE_LOCATION

`limiter.bucket` and `limiter.grant`, in a private schema in the project's own Postgres. No `anon` or `authenticated` grants. Same database as `public.flags`, deliberately — see FAILURE_BEHAVIOR.

## HOW_SESSION_RESET_CONTINUITY_WORKS

The bucket key derives from the request's network prefix, the window id and a server-held secret. None of the owner's enumerated reset vectors — restart, cleared or replaced session, new session token, reconnect, any fresh client-session state — changes any of those three inputs. A new grant opens at `LEAST(NORMAL, BUCKET_ALLOWANCE − bucket.units_consumed)`, so the bucket's prior spend is inherited.

**Measured** ([receipt](author-verification-postgres.json), T2): after exhausting a grant, three successive fresh grants opened while the bucket climbed 6/50, 7/50, 8/50 — i.e. the reset kept working until the bucket ceiling, then stopped. That is bounded amplification, not elimination, and it is the honest limit (see KNOWN_LIMITATIONS 1).

## HOW_CLIENT_A_AND_CLIENT_B_REMAIN_INDEPENDENT

Distinct grants carry distinct sub-budgets. Up to `K` co-located clients each reach the full `NORMAL` while the bucket has room. Measured (T1, T3).

## IDENTIFIER_DERIVATION

Computed **in SQL, inside the `SECURITY DEFINER` function** — matching this codebase's existing Vault pattern (`verify_webhook_secret`, `notify_flag_status_webhook`) so the raw secret never enters the Deno runtime:

```
prefix     = IPv4 → /32 ;  IPv6 → /48        (normalised, lowercased)
window_id  = floor(unix_seconds / 86400)
bucket_key = HMAC-SHA256(K_epoch, prefix || '|' || window_id)  truncated to 16 bytes
```

**IPv6 is /48, not /64.** RFC 6177 has ISPs delegate a `/56` or `/48` to one end site, so a `/64` key would let an ordinary subscriber rotate through hundreds of legitimate prefixes and mint a fresh full budget in each. `/48` is the largest commonly-delegated block and normally maps to one subscriber.

`K_epoch` is a 32-byte Vault secret, one per window generation, created **atomically** (get-or-create in the same function, mirroring the bucket upsert) so two concurrent first-requests of a new window cannot mint two different secrets for one window.

The grant token handed to the client is `base64url(grant_id) . base64url(HMAC(K_grant, grant_id || exp))` — an opaque id and an expiry, nothing else. No bucket key, no address, no counter, no secret-derived value. The client cannot read its own limiter identity and cannot forge another.

## IDENTIFIER_LIFETIME

Bucket key: one window (24 h). Grant: bound to `(bucket_key, window_id)`, so it cannot carry leftover balance across a window boundary — v1's 26 h grant lifetime did exactly that, and the binding removes it.

## DATA_RETENTION

Ledger rows purged at `window_end + 1 h` (≤ 25 h); the epoch secret is destroyed at the same time. **The ledger stores counters and a window id only — no per-request timestamps, no `last_seen`, no address.** That is what removes row-granularity correlation against `public.flags.created_at`, which is world-readable (`"flags readable by anon" ... USING (true)`).

## RAW_IP_STORED

**NO.** The address exists only in request memory and as an HMAC input. It is never written to any table, log, receipt or error string.

## PERSISTENT_DEVICE_FINGERPRINT

**NO.** No device, hardware, or browser characteristic is read or derived.

## DURABLE_CROSS_SESSION_TRACKING_ID

**NO — with one qualification stated rather than buried.** The bucket key is cross-*session* by design (that is precisely what the owner asked for) but not durable: it dies with its window and its secret. Two windows' keys for the same network are uncorrelatable once the earlier secret is destroyed. **Qualification:** destroying a secret in place does not remove it from Postgres backups or PITR, whose retention normally exceeds 25 h. "Unlinkable" is therefore true against live application access and only approximately true against a restored backup. This is the usual crypto-shredding tension, not unique to this design, but v1 stated it too absolutely.

## CONCURRENCY_CONTROL

One `SECURITY DEFINER` PL/pgSQL function, one transaction, sequential statements, stable lock order (bucket → grant):

```sql
-- 1. ensure the bucket row exists, then lock-and-read it
INSERT INTO limiter.bucket AS t (bucket_key, window_id) VALUES (p_bucket, p_window)
  ON CONFLICT (bucket_key, window_id) DO UPDATE SET units_consumed = t.units_consumed;
SELECT * INTO b FROM limiter.bucket
  WHERE bucket_key = p_bucket AND window_id = p_window FOR UPDATE;

-- 2. resolve the grant — it must belong to THIS bucket and window
SELECT * INTO g FROM limiter.grant
  WHERE grant_id = p_grant AND bucket_key = p_bucket
    AND window_id = p_window AND expires_at > now() FOR UPDATE;

-- 3. mint if absent: opening balance inherits the bucket's spend
IF g.grant_id IS NULL THEN
  IF b.grants_issued >= p_max_grants THEN RETURN 'REFUSED_GRANT_CAP'; END IF;
  opening := LEAST(p_normal, p_bucket_allow - b.units_consumed);
  IF opening <= 0 THEN RETURN 'REFUSED_BUCKET_EXHAUSTED'; END IF;
  INSERT INTO limiter.grant (grant_id, bucket_key, window_id, allowance, expires_at) ...;
  UPDATE limiter.bucket SET grants_issued = grants_issued + 1 WHERE ...;
END IF;

-- 4. spend under BOTH guards, then INSERT the row in the same transaction
```

A later statement in a PL/pgSQL body gets a fresh command snapshot and *does* see the transaction's own prior writes — which is exactly what a second CTE term does not. **Measured:** 30 parallel callers against one bucket capped at 10 admitted exactly 10, refused 21, left `units_consumed = 10`. No overshoot, no lost update.

## DIRECT_GUEST_WRITE_BYPASS_PROTECTION

Today `anon` can insert directly on both paths:

| Path | Current |
|---|---|
| `public.flags` | `CREATE POLICY "flags anon insert" ... FOR INSERT TO anon WITH CHECK (user_id IS NULL AND photo_url IS NULL AND status = 'open')` |
| `public.feedback` | `CREATE POLICY feedback_insert_self_or_anon ... WITH CHECK (user_id IS NULL OR user_id = auth.uid())` — **no `TO` clause, so it applies to every role including `anon`** |

Closure (**T1**) is `REVOKE INSERT ON public.flags, public.feedback FROM anon` plus dropping those two permissive policies — **not** v1's `RESTRICTIVE` + GUC scheme, which cannot fire. The RPC is a `postgres`-owned `SECURITY DEFINER` function; no table here sets `FORCE ROW LEVEL SECURITY`, so it writes as owner and its own `IF NOT admitted THEN RAISE EXCEPTION` is the enforcement, not a policy.

`EXECUTE` on that RPC is granted **only to a dedicated `flagstone_guest_ingest` role held by the Edge Function** — never to `anon`, never to `authenticated`, never broadly to `service_role`. This must be written explicitly in the migration: `20260905055636_phase03a_client_privileges.sql` establishes `ALTER DEFAULT PRIVILEGES ... REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated`, so a new function is unreachable by default and forgetting the grant produces a total guest outage with no other symptom.

## ALTERNATE_FLAG_PATH_PROTECTION

`REVOKE INSERT` is route-independent: it closes PostgREST single and bulk inserts, `Prefer: resolution=merge-duplicates` upserts, writable views and any RPC that inserts as the caller. Additionally: the authenticated `user_id IS NULL` variant is refused by `"flags insert own" WITH CHECK (auth.uid() = user_id)`; every exposed RPC and writable view must be enumerated and negatively tested rather than assumed.

## FEEDBACK_PATH_PROTECTION

Identical treatment, with the explicit note that `feedback_insert_self_or_anon` has no `TO` clause and must be dropped, not narrowed. Guest report/feedback UX must keep working through the RPC — `submitFeedback` deliberately does not read the row back, and that must survive.

## GLOBAL_EMERGENCY_BACKSTOP

`check_global_anon_rate_limit` (100/h) and `check_feedback_rate_limit` (30/h) stay exactly as they are, as the emergency backstop the brief permits. They are not the per-client limit and are not evidence of one — `20260904000300_adopt_live_insert_throttles.sql` already records that they are a shared denial-of-service lever and assigns their replacement to Phase 03A.

**They are also the untrusted-shape fallback.** v1 sent untrusted requests to a new global 5/hour bucket; the reviewer correctly identified that as a worldwide outage waiting for a mispinned `EXPECTED_HOPS`. In v2, a request that fails the shape check is admitted under **today's** global caps and nothing tighter. **The untrusted path is never worse than the status quo.** This makes a wrong hop-count pin a loss of *improvement*, not a loss of service.

## NAT_SHARED_NETWORK_TRADEOFF

Up to `K` fully-active guests per IPv4 `/32` per window. Beyond `K`, a genuine guest is refused and shown the existing "sign in to report more" path.

Named plainly, because this is an accessibility app: the population most likely to exceed `K` anonymous reporters on one connection in a day is a group home, an accessible-housing building, a disability services centre, or an organised community mapping session logging many curb cuts from one venue's wifi. **That is exactly the pro-social burst this cap suppresses first.** `K` is the dial; the harm of setting it too low is not abstract.

## NETWORK_ROTATION_TRADEOFF

Changing network changes the bucket and grants a fresh budget. Inherent to any network-derived signal, outside the owner's enumerated reset vectors, and materially harder than clearing an app. IPv6 is bucketed at `/48` so that in-delegation rotation does not achieve it.

## FAILURE_BEHAVIOR

**Fail-closed**, at near-zero cost: the ledger shares a database with `public.flags`, so if the ledger is unreachable the `INSERT` was unreachable anyway.

The reviewer's qualification is accepted and carried: "same database" is not "same contention profile." The spend path takes a row lock that a bare `INSERT` never took, so many genuine simultaneous submissions from one shared network now queue where they previously did not, and can reach `statement_timeout` under load the old path tolerated. A missing `EXECUTE` grant or a misconfigured `limiter` schema grant produces a limiter-only outage with no other symptom. Both need explicit tests.

A `limiter.config.enabled` row read in the same transaction degrades the function to record-only, with no deploy and no migration.

## ROLLBACK

Three independent levers, strongest first:

1. **Config flip** — `limiter.config.enabled = false`. Instant, no deploy, no migration.
2. **Restoration migration** — re-grants `anon INSERT`, recreates the two permissive policies, drops the limiter objects. Paired forward/restoration files per the convention the six existing Phase 03A pairs already follow, with catalog-hash equality proof.
3. **Undeploy** the Edge Function.

## INFRASTRUCTURE_REQUIRED

One Edge Function, two tables plus a config row in a private schema, one Vault secret per window, one purge job. **`pg_cron` availability is UNVERIFIED for this project** — no scheduled-job mechanism appears anywhere in the repository, though `pg_net` is clearly live. Confirm on the dashboard; Supabase Scheduled Edge Functions is the documented fallback that needs no extension.

## NEW_COST_REQUIRED

**None.** No new service, no vendor, no paid tier, no Redis. Supabase's rate-limiting example uses Upstash Redis; that is the example's choice, not a platform requirement, and a separate store would break the fail-closed-is-free property.

## LOCAL_TEST_PLAN

Disposable PostgreSQL, existing pgTAP + replay + effective-privilege harness. No hosted contact.

1. **Reset contract** — exhaust a grant, mint another, assert its opening balance is `LEAST(NORMAL, BUCKET_ALLOWANCE − units_consumed)` and that repeated resets terminate at `BUCKET_ALLOWANCE`. *(Prototype passes.)*
2. **Concurrency** — N parallel callers at the boundary; assert admitted never exceeds allowance. *(Prototype passes at 30-way.)*
3. **Load / latency** — many genuine concurrent submissions on one bucket, asserting no `statement_timeout` under realistic burst, not just arithmetic correctness.
4. **Independence** — two grants, one bucket, each reaching `NORMAL`.
5. **Grant binding** — a grant minted on bucket A presented against bucket B must not charge B through A's grant. *(Prototype passes.)*
6. **Grant forgery** — tampered id, tampered MAC, expired, foreign, absent: each falls back to minting from the bucket's *remaining* balance, never a fresh `NORMAL`.
7. **Extraction rule** — table-driven over synthetic shapes: absent, 1 hop, 2 hops, injected leading value, `", "` spacing, multiple header lines, mixed casing, bracketed IPv6 with port, reserved ranges, malformed, `cf-connecting-ip` agreeing and disagreeing. Every non-conforming shape must fall to the status-quo global caps.
8. **Epoch-secret get-or-create race** — concurrent first-requests of a new window must resolve to one secret.
9. **Bypass matrix** — with T1 applied locally: direct `anon` INSERT, authenticated `user_id IS NULL`, bulk/array insert, upsert, every exposed RPC, every writable view. All refused.
10. **Privilege regression** — assert `EXECUTE` is granted to the ingest role only, and that the default-revoke posture is otherwise intact.
11. **Purge and retention** — rows gone past retention; epoch secret destroyed; ledger contains no timestamps or addresses.
12. **Restoration** — forward, restoration, catalog equality, deterministic reapply, as the six existing pairs do.
13. **Receipt hygiene** — no receipt, log or error string contains an address, bucket key, token or secret-derived value.
14. Existing gates unchanged: `npm run typecheck`, `npm run lint`, full Jest, effective-privilege guard.

## STAGING_TEST_PLAN

Only on the disposable branch `ctshxbykuemeqnofqcdh` / `441acc38-d71c-4a87-883e-61ff87e0c52e`, synthetic data only.

1. **Metadata probe — a hard prerequisite, and it needs an explicit sequencing exception.** A single-purpose function returning **only** `{ hops, lastIsPublic, cfPresent, cfMatchesLast }` — no address, no hash, no header echo — sampled across several client networks to pin `EXPECTED_HOPS`, confirm the append-vs-overwrite model, and measure hop-count variance by POP. Removed afterwards with a recorded removal receipt. **This is the only step that can close F28-A, and it must run before CODE can be finalised — the owner's "verify actual metadata first" and the mandated CODE→INT→STAGE order genuinely conflict here. Only Sky can resolve that.** Because v2's untrusted path now falls back to the status quo, a mispinned constant costs improvement rather than service — but it should still be measured, not guessed.
2. Two synthetic clients on one network: independent normal budgets.
3. Client A exhausts, discards all state, re-requests: new grant opens reduced; repeated resets terminate at `BUCKET_ALLOWANCE`.
4. Concurrent burst from both clients at the boundary: no overshoot; record latency.
5. Forged / duplicated / multi-line `x-forwarded-for`, absent header, forged `cf-connecting-ip`: demotion to the status-quo path, never enlargement.
6. Every alternate ingest path negatively tested against T1.
7. Emergency-cap behaviour, kill-switch flip, expiry, purge, restoration, deterministic reapply — each with before/after catalog hashes.
8. Receipts carry outcomes, counts, bounded lifetimes and provenance only.

## INDEPENDENT_REVIEW_VERDICT

**ACCEPT_WITH_MANDATORY_CHANGES** on v1 ([full review](INDEPENDENT_REVIEW.md)) — two claims FALSIFIED (concurrency, bypass protection), five WEAKENED, none upheld unchanged. Three MUST-FIX, ten SHOULD-FIX/NOTE. **All three MUST-FIX items and all ten SHOULD-FIX/NOTE items are incorporated in v2.** The two falsifications were reproduced by the author before being accepted ([receipt](author-verification-postgres.json)); one causal detail in the reviewer's F1 explanation is refined in that receipt without changing its verdict.

v2 has not itself been through a second independent review. It is a correction of a reviewed design, not a re-reviewed design.

## KNOWN_LIMITATIONS

1. **Reset amplification is bounded, not eliminated.** Worst case `K`× per window, measured. Lowering `K` strengthens reset resistance and weakens NAT tolerance; no value maximises both. This is the irreducible consequence of the constraint that reset-resistance requires a trusted scarce input.
2. **NAT is a real accessibility cost**, and it lands on group homes, services centres and community mapping sessions first.
3. **IPv6 rotation within a delegation** is mitigated by `/48`, not eliminated — a subscriber delegated something larger could still rotate.
4. **Network rotation grants a fresh budget.** Inherent.
5. **F28-A is not closed.** `EXPECTED_HOPS` must be measured. v2 makes a wrong pin cost improvement rather than service, but it is still unmeasured.
6. **Live-window correlation.** Someone with database access who can guess a candidate prefix can recompute the HMAC and match it against the ledger while the epoch secret is alive. Removing per-request timestamps from the ledger reduces this to per-window spend counts; it does not reduce it to zero. In an app whose rows carry lat/lng this deserves naming.
7. **"Unlinkable" is approximate** against backups and PITR.
8. **New lock contention** on a path that previously had none.
9. **Bypass closure is not deliverable inside Phase 03A**, and per the review it is a redesign rather than a policy flip — the client's direct `.insert()` at `src/lib/flags.ts:1772` must be retired in favour of the RPC, across every guest call site. With no minimum-version gate and no remote config (`src/lib/featureFlags.ts` is a compile-time in-memory store), every already-installed native build keeps unlimited anonymous reporting until its owner updates. Web is unaffected.

## WHY_THIS_IS_PREFERRED

It is the only design that satisfies the owner's locked contract using a scarce input that exists on this platform today, at zero infrastructure cost, entirely within backend scope, with no vendor, no device linkage, no durable identifier, no raw IP, three rollback levers, and — now — verified concurrency behaviour. Its two genuine costs, bounded reset amplification and IPv4 NAT pressure, are exposed as one tunable knob rather than buried.

## REJECTED_ALTERNATIVES_AND_WHY

- **Client-side counters / AsyncStorage / in-memory / UI throttling** — today's mechanism. The client owns the counter; deleting one key restores a full budget, forever. Excluded by the brief.
- **Plain or re-mintable session tokens, client keys, proof-of-possession, HMAC of a caller-supplied id** — the caller chooses when to become a new client. Signatures prevent fabrication, never re-minting.
- **IP HMAC alone, no grant tier** — meets reset persistence, fails independent same-NAT normal budgets. Retained as Tier 1 only.
- **CAPTCHA / Turnstile / proof-of-work as the primary anchor** — a solve-once cost does not remember a prior solve, so it cannot anchor a budget. Viable later as an additional cost on *minting*; not a substitute. (The reviewer specifically tried and failed to break this rejection.)
- **Turnstile Ephemeral IDs** — device-linked, Enterprise-gated. A durable cross-session device signal is what the privacy contract forbids.
- **App Attest / Play Integrity** — strongest identity properties, would satisfy every enumerated reset vector, and is the only thing that fully closes limitations 1–3. Blocked on a new native module, a new EAS build and App Store resubmission, with no web path, against a frozen Build 33. Revisit only if the residual proves unacceptable in production.
- **Supabase anonymous Auth** — durable `auth.users` rows with no auto-cleanup, moves guests onto `authenticated` (requiring full policy re-review including the `users` mirror at `schema.generated.sql:586–595` and `20260904000200_adopt_d1sa_containment.sql:79–96`), and derives its own scarcity from the same IP signal. Strictly worse privacy for no additional reset resistance.
- **Phone / SMS OTP verification** — added at the reviewer's prompting; v1's "only four scarce inputs" was incomplete. Rejected harder than anonymous Auth: a phone number is durable PII and a *stronger* persistent identity anchor than a rotating IP-derived HMAC, so it fails the privacy contract more severely, adds gateway cost, and destroys the "drop a quick anonymous report" flow this app exists to offer.
- **Redis / Upstash** — a service, a cost, and a partition mode where the limiter fails while writes succeed. Postgres gives the same atomicity and makes fail-closed nearly free.
- **Counting inside an RLS policy** — rejected on correctness: RLS predicates must be side-effect free; they may be evaluated more than once per row and in unspecified order.
- **v1's `RESTRICTIVE` policy + transaction-local GUC** — empirically falsified. `set_config(...,true)` cannot survive to a separate PostgREST request.
- **v1's multi-CTE admission statement** — empirically falsified. Refuses every request.

## Parameters (proposed starting values; all are owner knobs)

| Parameter | Proposed | Note |
|---|---|---|
| `NORMAL` per grant / window | **5** | Matches today's client-side `MAX_PER_WINDOW`; no change for honest guests. |
| `WINDOW` | **24 h** | Matches the existing anonymous window. |
| `K` grants per bucket-window | **10** | `BUCKET_ALLOWANCE = 50`/network/day. Caps reset amplification at 10×; **this is the dial that decides whether a group home gets locked out.** |
| IPv4 prefix | **/32** | |
| IPv6 prefix | **/48** | Not /64 — RFC 6177 delegation. |
| Untrusted-shape path | **status-quo global caps** | Never worse than today. |
| Retention | **≤ 25 h** | Purge at `window_end + 1 h`; secret destroyed with it. |
