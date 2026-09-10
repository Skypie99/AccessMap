# FDA028-GAB-3 — architecture recommendation (v3)

**Supersedes [FDA028_RECOMMENDATION_V2.md](../2026-09-09-fda028-recommendation/FDA028_RECOMMENDATION_V2.md).** v2 must not be implemented: its trusted input was empirically disproved and it carried a network-lockout defect. v1 and v2 are preserved unchanged because their reviews cite their line numbers.

**Status: NOT IMPLEMENTED. Owner approval required.** Frozen source `0a6a6b03fd0cbe72f70f67260f6cab746e098f6a` / tree `857411dc733b93686d789a72e461856698bec814`.

**This is the first version written *after* measurement rather than before it.** Every trusted-input claim below comes from the executed probe ([resolution](../2026-09-09-f28a-probe/F28A_RESOLUTION.md)), and the complete admission function is published and tested, not elided.

---

## FDA_028_RECOMMENDATION_ID

`FDA028-GAB-3-20260909`

## What changed from v2, and why

| v2 | Status | v3 |
|---|---|---|
| Trusted input = rightmost `x-forwarded-for` under a pinned hop count | **DISPROVED by probe** | `cf-connecting-ip` only |
| Cross-check against `x-real-ip` | **IMPOSSIBLE** — absent at the function | Dropped; replaced by a single-value assertion |
| `grants_issued` cap of `K` | **NEW DEFECT** — starved every future client on a NAT | **Cap removed.** The bucket allowance is the only ceiling |
| Untrusted shape → fall back to global caps | **Escape hatch** | **Fail closed.** The caller cannot suppress the signal |
| Extraction pseudocode `.split()` on a possibly-null header | **Throws** | Guarded; only two outcomes, never an exception |
| IPv6 → `/48` | **Collapses `::ffff:` to `::/48`** | Unwrap mapped→IPv4; genuine IPv6 fails safe at `/128` |
| `limiter.grant.expires_at` | **Mint-time oracle** | **No timestamp column at all**; validity is `window_id` |
| Step 4 + `DECLARE` elided | **Unpublishable** | [Complete function published](gab3-admission-function.sql) and tested |
| Dedicated `flagstone_guest_ingest` role | **No precedent** | Uses `service_role`, the pattern all 7 existing functions use |
| "six existing pairs" | **Miscount** | Seven |
| "Web is unaffected" | **False** | Web is a pinned Build 33 deployment — a legacy client too |

## MECHANISM

One guest-ingest Edge Function is the only route into the database. It performs no cryptography and holds no secret: it validates the *shape* of `cf-connecting-ip` in JS and passes a normalised prefix string to Postgres. One `SECURITY DEFINER` function then does the HMAC, the ledger decision and the `INSERT` in a single transaction.

- **Tier 1 — network-window bucket.** The authority; survives every session reset.
- **Tier 2 — grant bound to `(bucket_key, window_id)`.** Per-client fairness.

A new grant opens at `LEAST(NORMAL, BUCKET_ALLOWANCE − units_consumed)`. **A reset buys a new envelope, not new money.**

## TRUSTED_INPUT

`cf-connecting-ip`, and nothing else.

```
raw = req.headers.get('cf-connecting-ip')        // may be null — never call .split() on it
if (raw === null || raw === '')            -> REFUSE (fail closed)
if (raw.includes(',') || /\s/.test(raw))   -> REFUSE   // must be exactly one value
if (!isPublicUnicastAddress(raw))          -> REFUSE
```

`true-client-ip`, `forwarded`, `x-forwarded-for` and `x-real-ip` are **explicitly ignored**. The probe showed the first two arrive verbatim from the caller, the third has uncharacterised composition, and the fourth does not reach the function at all.

## TRUST_BOUNDARY

The Cloudflare edge, **measured, not assumed**: supplying `cf-connecting-ip` yields **HTTP 403 / `error code: 1000` / `server: cloudflare`**, and the function never executes. Not overwritten, not appended to — **refused**. Verified on both the REST and Edge Function routes.

## HOW_SESSION_RESET_CONTINUITY_WORKS

`bucket_key` derives from the network prefix, the window id and a server secret. No reset vector touches any of the three. Measured: at 48/50 a fresh grant opens with 2 units; at 50/50 the next new client gets `REFUSED_BUCKET_EXHAUSTED`.

## HOW_CLIENT_A_AND_CLIENT_B_REMAIN_INDEPENDENT

Distinct grants, distinct sub-budgets, no grant-slot cap. Measured (T4): A exhausted → `REFUSED_GRANT`; B on the same bucket → `ADMITTED`.

**The v2 starvation defect is fixed by removal, not mitigation.** `grants_issued` was redundant as a cap: total consumption is already bounded by `BUCKET_ALLOWANCE` regardless of how many grants exist, because each grant's opening balance is drawn from the bucket's remaining capacity. Grant rows per bucket-window are likewise bounded, since a mint with zero remaining is refused before a row is created. The cap therefore added no safety and caused the lockout. It is retained as a **statistic only** — never a refusal condition. Measured (T2): after five mint-and-abandon resets, a brand-new client is **ADMITTED**, where v2 returned `REFUSED_GRANT_CAP`.

## IDENTIFIER_DERIVATION

Computed in SQL inside the `SECURITY DEFINER` function.

```
normalise:  "::ffff:a.b.c.d"  ->  a.b.c.d       (RFC 4291 mapped form, unwrapped FIRST)
            IPv4              ->  /32
            genuine IPv6      ->  /128          (see IPv6 note)
bucket_key = HMAC-SHA256(K_secret, prefix || '|' || window_id) truncated to 16 bytes
```

`pgcrypto`'s `hmac()` is confirmed present and correct. **Honest note:** this repository has **zero** existing `hmac(` calls and **zero** `vault.create_secret` calls — the real precedent is only "read a Vault secret inside a `SECURITY DEFINER` function" (`verify_webhook_secret`), which is a plain string comparison. v3 therefore uses **one long-lived Vault secret with `window_id` mixed into the HMAC input**, rotated on an operational schedule, rather than v2's per-window `create_secret` get-or-create, whose signature, uniqueness semantics and concurrent-creation behaviour are **UNVERIFIED**. Keys still differ per window; the unlinkability guarantee weakens from "secret destroyed" to "secret rotated", which is stated rather than hidden.

### IPv6 — fails safe, deliberately

G4 is **open**: this host has no native IPv6 route to `supabase.co`, and **0 of 85** real production requests were IPv6. So v3 does **not guess a prefix**.

Genuine IPv6 buckets at **`/128`**. That is weak reset resistance (a subscriber can rotate within their delegation) but it **cannot over-collapse**. The asymmetry decides it: guessing `/48` wrongly lumps unrelated subscribers into one bucket and **locks out real users**; `/128` merely limits less than ideal. **For an accessibility app, under-collapsing is the correct failure direction.** Revisit once G4 is measured.

## IDENTIFIER_LIFETIME / DATA_RETENTION

One window. `limiter.grant` carries **no timestamp column** — validity is `window_id` equality, which removes v2's mint-time oracle entirely. The ledger stores counters and a window id only. Purge at `window_end + 1h`.

## RAW_IP_STORED: **NO** · PERSISTENT_DEVICE_FINGERPRINT: **NO** · DURABLE_CROSS_SESSION_TRACKING_ID: **NO**

Cross-session by design (as required); not durable. Qualified as before: crypto-shredding is approximate against PITR and backups.

## CONCURRENCY_CONTROL

[Complete function published](gab3-admission-function.sql), `DECLARE` included. `%ROWTYPE`, **not** `RECORD` — the review showed a `RECORD` declaration throws `record "g" is not assigned yet` on every first-time client. Measured (T1): a first-ever client with no token is **ADMITTED**. Measured (T8): 40 parallel callers against an allowance of 10 → **exactly 10 admitted, 30 refused, final `units_consumed` = 10.** No overshoot, no lost update.

## FAILURE_BEHAVIOR — fail closed

If `cf-connecting-ip` is absent, multi-valued, or unparseable, the request is **refused**. v2 fell back to the global caps, which the review correctly called a zero-cost escape hatch.

**The probe removes the objection.** A caller cannot suppress the signal: supplying it yields 403, and omitting it means Cloudflare supplies it. It was present on 100% of both real production traffic and probe traffic. So fail-closed costs legitimate users nothing while closing the hatch.

**The risk this creates, stated plainly:** if the platform ever stops setting the header, guest reporting stops entirely. Mitigations: the `limiter.config.enabled` kill switch (no deploy, no migration), and an explicit refusal-reason metric so a sudden absence is visible rather than silent. This is a real dependency on Cloudflare's current behaviour, which Supabase does not document contractually.

## Bypass constraints

`REVOKE INSERT ON public.flags, public.feedback FROM anon` plus dropping `"flags anon insert"` and `feedback_insert_self_or_anon` (the latter has **no `TO` clause**, so it applies to every role and must be dropped, not narrowed). Confirmed empirically by the reviewer: the table-privilege revoke alone stops `anon`, independent of policy, and a `postgres`-owned `SECURITY DEFINER` function writes as owner because `FORCE ROW LEVEL SECURITY` is set on **no** table.

`EXECUTE` is granted to **`service_role` only** — never `anon`, never `authenticated`. v2's bespoke `flagstone_guest_ingest` role is dropped: all seven existing Edge Functions reach Postgres via `SUPABASE_SERVICE_ROLE_KEY` and there is **zero precedent** for any other role, which would need either a direct pooler connection with a new secret class or a custom-signed JWT. The migration must carry the explicit `GRANT EXECUTE`, because `20260905055636_phase03a_client_privileges.sql` revokes function execute by default and omitting it produces a silent total guest outage.

**Residual, named:** all guest-write enforcement becomes one `IF NOT admitted THEN RAISE EXCEPTION` in one function, with no RLS backstop once `anon` INSERT is revoked.

## GLOBAL_EMERGENCY_BACKSTOP

The existing 100/h and 30/h caps stay, unchanged, as the emergency backstop. They are **no longer a fallback path** — v3 fails closed instead.

## Rollout constraint — unchanged and binding

Per [OLD_CLIENT_ROLLOUT_CONSTRAINT.md](../2026-09-09-final-verification/OLD_CLIENT_ROLLOUT_CONSTRAINT.md). Stages are named **S0–S6** throughout; "T1" is retired as a name to stop it colliding with test IDs.

Build 33 clients insert directly (`src/lib/flags.ts:1773`, `src/lib/feedbackStore.ts:83`). **Web is a legacy client too** — a pinned Vercel deployment of a frozen Build 33 descendant, not a rolling bundle. **S3** (mechanism live, direct INSERT still permitted, breaks nobody) is the honest limit of backend-only work. **S6** (revoke) requires a client release neither Phase 03A nor 03B owns, and Build 33 is `submitted_for_review`. No minimum-version gate is proposed here.

## PRODUCTION_THRESHOLD_DECISION: **DEFERRED**

`NORMAL`, `BUCKET_ALLOWANCE`, `WINDOW`, and prefix widths remain Sky's to set, per [THRESHOLD_SEPARATION.md](../2026-09-09-final-verification/THRESHOLD_SEPARATION.md). v2's `NORMAL=5`/`K=10` stay withdrawn. Note `K` no longer exists as a cap at all; `BUCKET_ALLOWANCE` is now the single policy number. Staging test values (`NORMAL=2`, allowance `6`, 60-second window) are deliberately absurd as policy and must be read from `limiter.config`.

## Local test results — already measured

| Test | Result |
|---|---|
| T1 first-ever client, no token (`RECORD` trap) | **ADMITTED** |
| T2 starvation fix — new client after 5 resets | **ADMITTED** (v2: `REFUSED_GRANT_CAP`) |
| T3 reset continuity bounded | opening reduced at 48/50; `REFUSED_BUCKET_EXHAUSTED` at 50/50 |
| T4 two-client independence | A `REFUSED_GRANT`, B `ADMITTED` |
| T5 cross-bucket grant replay | fresh grant issued, no cross-charge |
| T6 window boundary | old-window grant ignored, new window starts clean |
| T7 kill switch | `ADMITTED_LIMITER_DISABLED` |
| T8 concurrency 40-way, allowance 10 | **exactly 10 admitted**, no overshoot |

Still to do before CODE: guarded-extraction unit tests (absent/multi-valued/malformed/mapped-IPv6), the full bypass matrix, purge/retention, restoration against **seven** existing pairs, load/latency under lock contention, and receipt-hygiene assertions.

## KNOWN_LIMITATIONS

1. Reset amplification bounded by `BUCKET_ALLOWANCE`, not eliminated.
2. IPv4 NAT pressure still lands first on group homes, services centres and mapping sessions.
3. **IPv6 reset resistance is provisional** — `/128` until G4 is measured.
4. Network rotation grants a fresh budget.
5. **Fail-closed depends on Cloudflare continuing to set `cf-connecting-ip`.** Undocumented by Supabase; kill switch is the mitigation.
6. Live-window correlation by an actor with ledger access remains possible, though narrowed by removing the grant timestamp.
7. Unlinkability is approximate against backups/PITR, and now rests on secret *rotation* rather than destruction.
8. New lock contention on a previously lock-free path.
9. **Bypass closure (S6) is not deliverable inside Phase 03A** and requires a coordinated native + web release.
10. The trusted-signal evidence is ~22 requests from one client, one network, one 24-hour window.

## REJECTED_ALTERNATIVES

Unchanged from v2 — client counters, re-mintable tokens, CAPTCHA/PoW as primary anchor, Turnstile Ephemeral IDs, App Attest, anonymous Auth, SMS OTP, Redis, counting inside RLS — plus, now empirically: v1's multi-CTE statement, v2's `RESTRICTIVE`+GUC closure, v2's rightmost-XFF trusted input, v2's `x-real-ip` cross-check, and v2's `grants_issued` cap.
