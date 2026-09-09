# FDA-028 final verification wave — result

**FDA_028_ARCHITECTURE_GATE: HOLD.** Both required gates came back HOLD, so no corrected recommendation is offered for approval and no implementation is authorized.

Frozen source `0a6a6b03fd0cbe72f70f67260f6cab746e098f6a` / tree `857411dc733b93686d789a72e461856698bec814`. Zero non-QA files changed. No push, no merge, no staging mutation, no production contact beyond read-only aggregate log queries.

## Gate results

| Gate | Result |
|---|---|
| **F28-A** | **HOLD** — candidate signal identified and characterised; forgeability (G1) not provable from existing evidence |
| **V2_INDEPENDENT_REVIEW** | **HOLD** — 2 items FALSIFIED, 1 UPHELD, 10 WEAKENED; 7 MUST-FIX |
| OLD_CLIENT_ROLLOUT_CONSTRAINT | COMPLETE |
| PRODUCTION_THRESHOLD_DECISION | **DEFERRED** |
| LOCAL_IMPLEMENTATION_AUTHORIZATION | **NOT YET GRANTED** |

## The two blockers, exactly

### Blocker 1 — F28-A G1: forgeability of the trusted signal is unproven

Existing production logs (85 real requests, read-only, counts and equality tallies only) establish that the platform is Cloudflare-fronted and that `cf-connecting-ip` reaches **both** the REST and Edge Function routes on **100%** of requests, single-valued, always equal to `x-real-ip`, while `x-forwarded-for` appears in **0 of 85** captured attribute maps. Cloudflare documents that it **appends** to `x-forwarded-for` but **does not document an overwrite for `cf-connecting-ip`**, and its `Pseudo IPv4` setting can overwrite both.

What no volume of ordinary traffic can show is what happens when a caller *attacks* the header, because no real user has. Gaps G2 (is the log attribute map an allowlist), G3 (does the Deno runtime see these headers), and G4 (IPv6 — **0 of 85 requests were IPv6**) are also open. Documentation, existing Flagstone evidence and existing staging logs are each **exhausted**; staging holds no HTTP logs at all.

**Unblocked by:** the 12-call bounded probe in [STAGING_DIAGNOSTIC_PROBE_PLAN.md](STAGING_DIAGNOSTIC_PROBE_PLAN.md), which is **not authorized** and was **not executed**.

### Blocker 2 — v2 fails independent review on seven MUST-FIX findings

Verdict **HOLD** ([full review](INDEPENDENT_REVIEW_V2.md)). The reviewer rebuilt the mechanism from a blank schema — not copied from any prior artifact — and the *strategy* independently passed every concurrency, atomicity, reset-continuity and bucket-binding test it devised. The *artifact* did not.

Every load-bearing finding I could test independently, I did ([receipt](author-verification-v2-review.json)):

| # | MUST-FIX | Status |
|---|---|---|
| 1 | Trusted input keyed to the wrong header for this platform | **CONFIRMED**, by two independent routes |
| 2 | **`grants_issued` starvation — NEW defect** | **CONFIRMED, reproduced** |
| 3 | Extraction pseudocode throws on a missing header instead of falling back | **CONFIRMED, reproduced** |
| 4 | Untrusted fallback is a zero-cost unconditional escape hatch | **CONFIRMED by argument** |
| 5 | Safety-critical step 4 and `DECLARE` block never published | **CONFIRMED** |
| 6 | IPv4-mapped IPv6 collapses to a single `::/48` | **CONFIRMED, reproduced** |
| 7 | `DATA_RETENTION` contradicted by v2's own `limiter.grant.expires_at` | **CONFIRMED** |

**Finding 2 is the serious one, and it is new** — absent from v1's review and from v2's own text. `grants_issued` is a **per-bucket, monotonic, non-replenishing** counter. The *grant-slot pool*, not the unit budget, becomes the binding constraint. Reproduced with `K=3, NORMAL=5, BUCKET_ALLOWANCE=50`:

```
reset-submit 1 -> ADMITTED   units=1 grants=1
reset-submit 2 -> ADMITTED   units=2 grants=2
reset-submit 3 -> ADMITTED   units=3 grants=3
brand-new, never-seen client on the same network -> REFUSED_GRANT_CAP
bucket: units_consumed=3 of 50   grants_issued=3 of 3   47 of 50 units never spent
```

One person who clears app storage out of habit can lock out **every future guest on that network for the rest of the window**, while over 90% of the nominal budget goes unspent. It falsifies v2's independence claim outright and it lands hardest on exactly the population v2 already flagged as at risk: group homes, shared accessible housing, disability services centres, community mapping sessions.

## Finding 4 answered plainly, because it changes what the mechanism is worth

The reviewer was asked to treat the untrusted-fallback question as the most important in the review, and its answer stands: v2's literal claim ("never worse than the status quo") is **true** — the ceiling never rises — but that is the wrong test. The right test is whether a motivated abuser is better off **declining to present the trusted signal**, and they are: unconditionally, at zero cost, on every request, with no forgery required. They land back on today's shared 100/h global pool with no per-client throttling at all.

**So the mechanism's real benefit is confined to casual in-app reset abuse.** That is a genuine improvement over today and worth having — but a scripted abuser is no better constrained the day after it ships than the day before. v2 does not say this, and it must.

Note this is a *regression v2 introduced*: v1's untrusted bucket was a smaller separate pool, so failing the shape check made things worse for an attacker. v2 fixed v1's worldwide-collapse risk by removing the disincentive to evade. Both problems are real; the fix must address both at once, which is only possible once F28-A settles which signal is actually being checked.

## What survived

The strategy. A rotating-HMAC network-window bucket as the reset-resistant authority, a grant bound to `(bucket_key, window_id)` for fairness, sequential `SECURITY DEFINER` PL/pgSQL for atomicity, and `REVOKE`-based bypass closure were all independently reproduced and passed every test thrown at them, including a timing proof that the `ON CONFLICT DO UPDATE` idiom really does take a blocking row lock. `REVOKE INSERT` genuinely stops direct `anon` inserts regardless of RLS. The v1 falsifications are genuinely fixed. The "trust the shape, never a caller-chosen position" instinct is now **better** supported than when it was written — Cloudflare's documented append behaviour is exactly what it predicts. It was simply pointed at the wrong header.

**This is a v3 problem, not a dead end.** Nothing found shows the architecture cannot work.

## Why no v3 is offered here

The instruction was explicit: if either gate fails, keep FDA-028 on HOLD and identify the blocker. Writing a v3 now would also repeat the mistake that produced both v1's and v2's defects — **specifying against a signal whose behaviour has not been measured.** Finding 1 cannot be fixed by choosing `cf-connecting-ip` on paper; a v3 keyed to it without the probe would be exactly as unverified as v2 keyed to `x-forwarded-for`, and the pattern would repeat a third time.

The correct order is: **resolve F28-A first, then write v3 against measured behaviour, then review v3.**

## NEXT_SAFE_ACTION

**Put the bounded probe authorization request in [STAGING_DIAGNOSTIC_PROBE_PLAN.md](STAGING_DIAGNOSTIC_PROBE_PLAN.md) to Sky, and stop.** Nothing else is safe to do: no implementation, no v3, no staging mutation, no client work.
