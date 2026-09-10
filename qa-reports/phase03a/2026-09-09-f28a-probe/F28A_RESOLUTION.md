# F28-A — resolution

**F28_A: PASS**, with one scoped residual (IPv6, G4) that constrains *key derivation* but not the *trust boundary*.

Probe executed under Sky's explicit bounded authorization. Temporary function deployed, exercised, deleted and verified absent. No database, schema, row, migration or production change at any point.

## The question F28-A asked

> Does the hosted Supabase Edge Function environment provide a documented or empirically provable network-origin signal that a caller cannot enlarge or refresh by supplying header input?

**Yes. `cf-connecting-ip`.** Proven empirically at the exact route the design would use.

## Evidence

| Property | Result | How proven |
|---|---|---|
| Reaches the Deno runtime | **Yes — 10/10** successful calls | Function-view probe read `req.headers` directly |
| Single-valued | **Yes — always exactly 1 element** | `valueCount` from the function; 0/85 commas in real production traffic |
| Stable per source | **Yes — 1 distinct fingerprint across 10 calls** | 16-bit salted digest, transient only |
| **Caller-forgeable** | **NO — the attempt is refused** | Supplying `cf-connecting-ip` returns **HTTP 403, `error code: 1000`, `server: cloudflare`**, and the function never executes |

The rejection is the strongest available form of spoof resistance: not "overwritten", not "appended to" — **refused at the Cloudflare edge before Supabase sees it at all.** At the REST route, all four spoof attempts (A-phase B, D, K, B2) produced no Supabase log record whatsoever. At the Edge Function route, the two spoof attempts (B-phase B and D) were rejected before the function executed. See the correction note below for what was *not* tested.

## What the probe also disproved — and this is why it mattered

Every one of these contradicts FDA028-GAB-2 as written:

| Header | Behaviour at the function | Consequence |
|---|---|---|
| `x-real-ip` | **ABSENT** from `req.headers` | v2's corroborating cross-check is **impossible to implement**. It exists only in the gateway log map. |
| `true-client-ip` | Passes through **EXACTLY_SENTINEL** | **Fully caller-forgeable.** Must be explicitly ignored. |
| `forwarded` | Passes through **CONTAINS_SENTINEL** | **Fully caller-forgeable.** Must be explicitly ignored. |
| `x-forwarded-for` | 3 platform elements; caller values **stripped**; present even when the caller sends none | Caller cannot poison it at the function, but its composition is **uncharacterised** — which element is the true client is unproven. **Not usable as primary.** |
| `request.cf` binding | **Unreachable** from the runtime | Cannot serve as a structured non-forgeable anchor. |

Two observation points behave differently and must not be conflated: the **gateway log map** recorded a caller-supplied `x-forwarded-for` verbatim, while the **function** never saw it. The function's view is the one the design reads.

Had v2 shipped as written — rightmost `x-forwarded-for` element under a pinned hop count, cross-checked against `x-real-ip` — it would have read a header whose composition is undocumented, cross-checked it against a header that does not exist at the function, and pinned a hop count on a value the platform regenerates. The probe was worth running.

## Gap status

| Gap | Status |
|---|---|
| G1 — forgeability | **RESOLVED.** Refused at the edge. |
| G2 — is the log map an allowlist | **RESOLVED.** It is not: caller-supplied XFF appeared in it. |
| G3 — does the runtime receive the signal | **RESOLVED.** Yes. |
| G4 — IPv6 behaviour and Pseudo IPv4 | **OPEN.** |

### Why G4 does not block PASS

G4 is unresolved because this host has no native IPv6 route to `supabase.co` — `curl -6` resolved to `::ffff:104.18.38.10`, an IPv4-mapped address, so IPv6 transport was never genuinely exercised. Production corroborates the difficulty: **0 of 85 real requests were IPv6.**

G4 constrains **key derivation** (what prefix width to use for an IPv6 client, and whether Cloudflare's Pseudo IPv4 is in effect), not the **trust boundary**. Cloudflare's rejection of a caller-supplied `cf-connecting-ip` is a header-level control and is not transport-family dependent. So the signal is trustworthy; what remains unmeasured is how to *bucket* it for a family that currently carries no observed traffic.

**v3 must therefore treat IPv6 fail-safe rather than guess** — and must not assume `/48`, `/64`, or that Pseudo IPv4 is off. `cf-pseudo-ipv4` and `cf-connecting-ipv6` were both absent for IPv4 clients, which is consistent with Pseudo IPv4 being off but does not prove it, because a Pseudo IPv4 header would only appear for an IPv6 client.

## Residual risks the owner should see

1. **This is one client, one network, one 24-hour window.** The rejection behaviour was consistent across every attempt, but it is Cloudflare's current configuration for this project, not a contractual guarantee Supabase publishes. It could change without notice, and no Supabase document commits to it.
2. **G4 is genuinely open.** An IPv6 client's bucket key has no measured basis.
3. **The `x-forwarded-for` 3-element composition is uncharacterised.** It is tempting to use as a corroborator; it should not be used until characterised.
4. **`error code: 1000` is a hard rejection of the whole request.** If a legitimate client or intermediary ever sets `cf-connecting-ip`, that user gets a 403 and cannot use the app at all. This is the platform's behaviour, not something the design introduces — but it is worth knowing it exists.

---

## Corrections after independent verification

The [independent verifier](INDEPENDENT_F28A_VERIFICATION.md) returned **F28_A_PASS_WITH_NARROWED_CLAIM**, re-testing the core finding live from a fresh client and session. Two corrections and one upgrade follow. Both corrections were reproduced before being accepted.

### Correction 1 — an over-claim about which cases were rejected where

The original text said all four spoof attempts were rejected "across both the REST route and the Edge Function route." **That was wrong**, and the sentence above is now corrected.

- `B2` exists only in Phase A (REST route) bookkeeping.
- **Phase B's case K was not a `cf-connecting-ip` spoof test at all.** It sent `cf-connecting-ipv6: 2001:db8::1` and returned a normal 200. Verified: `probeB-case-K.json` shows `cf-connecting-ip: OTHER_VALUE_NO_SENTINEL` and `cf-connecting-ipv6: ABSENT`.

So only **B and D** were shown rejected at the Edge Function route. That is still sufficient — those two alone establish the mechanism at the route the design would use — but the broader sentence was not supported by the evidence.

**Consequence:** the IPv6-transport-plus-spoof combination that Phase A's case K was meant to cover was never confirmed at the function route. It folds into the open G4 residual.

### Correction 2 — cross-client distinctness was never demonstrated

All ten successful Phase B calls returned the **identical** fingerprint (`distinct = 1`), including the call intended to represent "a second network." Only **same-client stability** was shown. **Cross-client distinctness is UNVERIFIED** — the probe ran from one client on one network throughout.

This matters because the design depends on two different clients landing in two different buckets. That property is architecturally sound by construction (different source addresses produce different HMAC inputs), but it was **not measured**, and the earlier text implied more than the evidence supports.

### Upgrade — the rejection is documented Cloudflare behaviour, not merely observed

The resolution originally treated the 403 as an empirical, potentially fragile observation of this project's configuration. It is stronger than that. Cloudflare's own [Error 1000 page](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1000/) lists, verbatim, as a cause:

> "The request includes a `CF-Connecting-IP` header."

This is general, documented Cloudflare behaviour and is transport-family independent — which independently supports the judgement that the open IPv6 gap (G4) does not undermine the forgeability conclusion.

The same page also lists **"`X-Forwarded-For` header exceeds 100 characters"** and **"Request includes two `X-Forwarded-For` headers"** as Error 1000 causes. Two consequences for the design: certain caller-supplied XFF shapes produce a hard 403 rather than reaching the application at all, and this is a further reason not to build on XFF.

**Residual risk 1 in the list above is therefore softened but not removed.** The behaviour is documented rather than merely observed, but it remains Cloudflare's documentation about Cloudflare — Supabase still publishes no contractual commitment that its edge will continue to front this project.

### Net effect on the verdict

**F28_A remains PASS**, with the claim narrowed to what the evidence actually supports: the trusted signal is established and its unforgeability is documented and empirically confirmed at both routes; cross-client distinctness and IPv6 behaviour remain unmeasured.
