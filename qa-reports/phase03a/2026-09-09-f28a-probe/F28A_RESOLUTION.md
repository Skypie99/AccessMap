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

The rejection is the strongest available form of spoof resistance: not "overwritten", not "appended to" — **refused at the Cloudflare edge before Supabase sees it at all.** All four such attempts (B, D, K, B2) produced no Supabase log record whatsoever, across both the REST route and the Edge Function route.

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
