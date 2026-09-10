# F28-A — smallest staging diagnostic probe plan

**NOT EXECUTED. NOT AUTHORIZED.** This plan exists because existing evidence, existing staging logs and current official documentation have all been exhausted and gap **G1 — forgeability** cannot be closed by observing non-adversarial traffic. See [F28A_EVIDENCE.json](F28A_EVIDENCE.json).

## Why a probe is still needed after the log work

The log evidence already closed a great deal without touching anything: the platform is Cloudflare-fronted, `cf-connecting-ip` reaches both the REST and Edge Function routes on 100% of real requests, it is single-valued, and `x-real-ip` is its exact twin. What no volume of ordinary traffic can show is what happens when a caller *attacks* it — because no real user has. That single unknown is load-bearing: if `cf-connecting-ip` can be injected, the whole limiter is selectable by the attacker it exists to stop.

## What the probe must establish

| # | Question | Why it is load-bearing |
|---|---|---|
| P1 | Which forwarding-relevant headers actually arrive **in the Deno function's own `req.headers`** | Closes G3. The log map is the gateway's view, not the function's. |
| P2 | Whether a caller-supplied `cf-connecting-ip` is **replaced, appended to, preserved, or stripped** | Closes G1. This is the decisive one. |
| P3 | Same for `x-real-ip`, `true-client-ip`, `forwarded`, `cf-ipcountry` | Prevents fixing one header and leaving a sibling open. |
| P4 | Whether `x-forwarded-for` arrives at all, and with what hop count at 0, 1 and 3 caller-supplied values | Closes G2 and validates or retires the rightmost-element corroborator. |
| P5 | Whether the caller-supplied value ends up **first or last** when appending occurs | Determines which end is ever safe to read. |
| P6 | IPv4 vs IPv6 request behaviour, and whether **Pseudo IPv4** is in effect | Closes G4. Pseudo IPv4 would silently collapse distinct IPv6 subscribers onto shared addresses. |
| P7 | Whether `request.cf.*` (a Cloudflare Worker binding, not a header) is reachable from the function | If reachable, it is structurally non-forgeable and a better anchor than any header. |
| P8 | Whether two requests from the same client are stable, and from different clients distinct | Sanity — confirms the signal is usable as a bucket key at all. |

## The probe itself — minimum viable shape

One temporary Edge Function on the disposable branch, `verify_jwt = false`, **no database access, no table, no RPC, no write of any kind**. It returns a JSON object of **derived facts only**:

```jsonc
{
  "headerPresent":  { "cf_connecting_ip": true, "x_real_ip": true, "x_forwarded_for": false, ... },
  "valueCount":     { "cf_connecting_ip": 1, "x_forwarded_for": 0 },   // comma-separated element count
  "echoedSentinel": { "cf_connecting_ip": "NOT_PRESENT" },             // enum, never a value
  "sentinelPosition": "ABSENT" | "FIRST" | "LAST" | "ONLY",
  "twinsAgree":     true,                                              // cf-connecting-ip == x-real-ip
  "family":         "IPV4" | "IPV6" | "UNKNOWN",
  "cfBindingReachable": true,
  "stableAcrossTwoRequests": true
}
```

**Hard output rules.** The probe never returns, logs, or stores an address, a header value, a hash, a token or any secret-derived value. `echoedSentinel` compares the arriving value against a **caller-supplied sentinel that is not a real address** (e.g. `192.0.2.1`, TEST-NET-1, reserved by RFC 5737 precisely for documentation) and reports only an enum: `NOT_PRESENT` / `EXACTLY_SENTINEL` / `CONTAINS_SENTINEL` / `SENTINEL_ABSENT_OTHER_VALUE`. **A sentinel comparison is what makes forgery detectable without ever handling a real address.**

## The request matrix — 12 calls, synthetic only

| Case | Sent by the probe caller | Proves |
|---|---|---|
| A | no forwarding headers | baseline shape (P1, P4) |
| B | `cf-connecting-ip: 192.0.2.1` | **P2 — the decisive case** |
| C | `x-real-ip: 192.0.2.1` | P3 |
| D | both B and C | P3 interaction |
| E | `true-client-ip: 192.0.2.1` | P3 |
| F | `forwarded: for=192.0.2.1` | P3 |
| G | `x-forwarded-for: 192.0.2.1` | P4, P5 |
| H | `x-forwarded-for: 192.0.2.1, 198.51.100.2, 203.0.113.3` | P4, P5 — multi-value |
| I | `X-Forwarded-For` mixed casing + `", "` spacing | parsing robustness |
| J | over IPv6 transport, no headers | P6 |
| K | over IPv6 transport + case B | P6 + Pseudo IPv4 |
| L | case A repeated, then from a second network | P8 |

Twelve calls. No production traffic, no user data, no writes.

## Sequencing conflict that only Sky can resolve

The brief requires actual metadata be verified **before** a signal is selected; the Phase 03A gate order requires **CODE → INT → STAGE**. A probe that answers P1–P8 necessarily runs on hosted infrastructure *before* CODE can be finalised, because CODE cannot be written correctly until P2 is known. These two requirements point in opposite directions. **This is a real conflict in the governing instructions, not an attempt to skip a gate.** Recording it rather than resolving it unilaterally.

## Cleanup and restoration

Delete the probe function immediately after the matrix completes; capture the post-deletion function inventory as a removal receipt; record before/after catalog hashes proving the database was never touched. The probe adds no schema, so restoration is deletion plus proof.

## AUTHORIZATION REQUEST — exact and bounded

**Existing owner authority does NOT cover this.** The banked handoff records `stagingMutations: "NONE"`, `identityGate: "NOT_PASSED"`, and `nextPermittedWork` limited to resuming after a mechanism is approved. Deploying even a read-only function is a remote staging mutation. So, precisely:

> **Requested:** permission to deploy ONE temporary Edge Function named `fda028-probe` to the disposable Phase 03A branch **`ctshxbykuemeqnofqcdh` / `441acc38-d71c-4a87-883e-61ff87e0c52e`** only; to invoke it at most **12 times** with the synthetic matrix above using only RFC 5737 / RFC 3849 reserved sentinel addresses; and to delete it immediately afterwards with a recorded removal receipt.
>
> **Explicitly NOT requested and NOT covered:** any database migration, any schema or data change on staging, any table read or write, any production contact of any kind, any deployment to production, any change to the production gateway, any limiter implementation, any client change, any push, any merge.
>
> **Guarantees:** no address, header value, hash, token or secret is returned, logged or banked — only booleans, small integers and fixed enums. The probe holds no credential and touches no table. Staging carries no production data (`with_data: false`; all counted tables, `auth.users`, `storage.objects` and `vault.secrets` verified empty).
>
> **If declined:** F28-A stays HOLD, FDA-028 stays HOLD, and no implementation proceeds. That is a safe resting state — it is exactly where things stand today.
