# F28-A — independent verification

**VERDICT: F28_A_PASS_WITH_NARROWED_CLAIM**

The central claim — `cf-connecting-ip` cannot be caller-supplied because Cloudflare refuses the whole request at the edge — is well supported by the raw captures, independently reproduced live during this verification, and further corroborated by Cloudflare's own public documentation (which the original probe did not cite). The PASS holds. But one supporting sentence in `F28A_RESOLUTION.md` mis-describes what was actually tested at the function route (case K), and one capability the probe plan asked for (cross-client fingerprint distinctness, P8) was never actually exercised. Both should be corrected/narrowed; neither changes the bottom line.

## Verdict table

| # | Item | Verdict |
|---|---|---|
| 1 | Raw evidence supports "cf-connecting-ip is not caller-forgeable" | **JUSTIFIED** |
| 2 | PASS justified given G4 (IPv6) open | **JUSTIFIED** |
| 3 | Four disproved v2 assumptions correctly read from raw captures | **JUSTIFIED** |
| 4 | Gateway-view vs function-view reconciliation | **JUSTIFIED** |
| 5 | Sample-size honesty | **OVER-CLAIMED** (narrow, specific — see Finding 5) |
| 6 | Authorized scope respected | **JUSTIFIED** |
| 7 | Internal consistency across PHASE_A / PHASE_B / raw captures / resolution | **CONTRADICTED** (one sentence — see Finding 4b) |

## Findings

### 1. Core forgeability claim — JUSTIFIED, and more strongly than the resolution states

`probeB-case-B.txt` and `probeB-case-D.txt` both contain exactly the literal body `error code: 1000`, nothing else. Cross-referenced against `PHASE_B_FUNCTION_EVIDENCE.json:results.B_and_D_caller_supplied_cf_connecting_ip` (`"http": 403, "reachedFunction": false`) and `PHASE_A_GATEWAY_EVIDENCE.json:rejectionProvenance` (`server: cloudflare`, no `sb-*` headers), the reading "refused at the Cloudflare edge before Supabase sees it" is correct.

I independently re-ran the decisive comparison live (read-only, unauthenticated, RFC 5737 sentinel, against the same staging host):

```
GET /rest/v1/                                    -> HTTP/2 401, sb-error-code: UNAUTHORIZED_MISSING_API_KEY, sb-request-id present (reached PostgREST)
GET /rest/v1/  -H "cf-connecting-ip: 192.0.2.1"  -> HTTP/2 403, body "error code: 1000", server: cloudflare, NO sb-* headers at all
GET /rest/v1/  (repeat baseline)                 -> HTTP/2 401, sb-error-code present again
```

This reproduces the finding exactly, from a different client/network/session than the original probe, with a fresh cf-ray. That is a second, independent data point, not a re-read of the same claim.

I then checked the alternative explanations the task asked me to rule out. Cloudflare's own troubleshooting page for this exact error (`https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1000/`) lists, as a standalone documented cause independent of DNS misconfiguration: *"The request includes a `CF-Connecting-IP` header"* (also: XFF > 100 chars or XFF appearing twice). This is a general, documented Cloudflare edge protection against clients setting Cloudflare's own trust headers — not a WAF rule specific to this Supabase project, not rate limiting (no volume was involved — a single request triggers it), and not a coincidence of this particular request's shape (the mechanism is a header-name check, not a content or timing heuristic). This rules out the alternative explanations item 1 asked me to look for.

Net effect: the resolution's own framing under "Residual risks" #1 — *"this is Cloudflare's current configuration for this project, not a contractual guarantee Supabase publishes... it could change without notice"* — is more conservative than the evidence now supports. It is Cloudflare's documented, general-purpose behavior across any Cloudflare-fronted origin, not a project-specific or undocumented quirk. This doesn't change the verdict, but the resolution under-cites available support for its own conclusion. See "Claims that should be narrowed or reworded."

### 2. G4 (IPv6) open, PASS still justified — sound reasoning, not a rationalization

The forgeability property (can a caller inject an arbitrary value into `cf-connecting-ip`) rests on a header-presence check at the edge — confirmed above to be transport-family-independent in Cloudflare's own documentation (it is a header inspection, not an IP-version-conditioned rule). The unresolved question (G4) is a *different* property: for a genuine IPv6 client, what value lands in `cf-connecting-ip` (native, or collapsed via Pseudo IPv4), and therefore how to bucket it. `F28A_RESOLUTION.md`'s distinction between "trust boundary" (resolved) and "key derivation" (open) is the correct way to separate these two properties and is not merely rhetorical. I did not find a plausible mechanism by which IPv6 transport would change whether the header-injection attempt itself gets refused.

One nuance worth surfacing that the resolution doesn't spell out: if Pseudo IPv4 is active for IPv6 clients (`PHASE_A_GATEWAY_EVIDENCE.json:incidentalObservation` — `::ffff:104.18.38.10` shows the mapped-address representation exists in real client stacks), then many distinct IPv6 subscribers could genuinely collapse onto one shared bucket key — a fairness/bypass problem for a rate limiter, but still not a *forgery* problem (the attacker still can't choose the address). This is consistent with, not contradictory to, the resolution's framing.

### 3. The four disproved v2 assumptions — all confirmed against raw captures, JUSTIFIED

Checked every relevant `probeB-case-*.json` byte-for-byte:

- **x-real-ip ABSENT at the function**: `headerPresent["x-real-ip"]:false`, `valueCount["x-real-ip"]:0` in all 10 successful cases (A,C,E,F,G,H,I,J,K,L). Confirmed.
- **true-client-ip EXACTLY_SENTINEL**: only case E sent it; `probeB-case-E.json` shows `"true-client-ip":"EXACTLY_SENTINEL"`. Confirmed, single case as the plan specified.
- **forwarded CONTAINS_SENTINEL**: only case F sent it; `probeB-case-F.json` shows `"forwarded":"CONTAINS_SENTINEL"`. Confirmed.
- **request.cf unreachable**: `"cfBindingReachable":false, "cfBindingKeys":[]` in every one of the 10 raw files, not just an aggregate claim. Confirmed.
- **x-forwarded-for = 3 elements, caller values stripped**: cases G/H/I (which sent 1, 3, and mixed-case/spaced XFF respectively) all show `"x-forwarded-for":"OTHER_VALUE_NO_SENTINEL"` with `valueCount 3` — the caller's sentinel never appears despite being sent, and baseline cases (A, J, L, with no caller XFF at all) *also* show `valueCount 3`. Confirmed: the 3-element XFF is platform-injected regardless of what the caller sends.

### 4a. Gateway-view vs function-view reconciliation — JUSTIFIED

Phase A (gateway log, REST route) shows caller-supplied XFF passing through verbatim into the log's attribute map (cases G/H/I logged with the sentinel present) and absent when the caller sends none (A/J/L). Phase B (function `req.headers`) shows the *opposite* — XFF is always present with exactly 3 platform-composed elements, and caller values never survive. These are not contradictory: they are different observation points in the request path (edge/log-capture vs. the actual Deno runtime after Supabase's own gateway has rewritten the header), and the resolution says so explicitly rather than picking whichever one is convenient. No error found in this reconciliation.

### 4b. Internal inconsistency found — CONTRADICTED (item 7)

`F28A_RESOLUTION.md` states: *"All four such attempts (B, D, K, B2) produced no Supabase log record whatsoever, across both the REST route and the Edge Function route."*

This is not correct as written. `casesNeverLogged: ["B","B2","D","K"]` in `PHASE_A_GATEWAY_EVIDENCE.json:logView` is a **Phase-A-only (REST/gateway route)** finding — it uses Phase A's own extended case labels (A2/B2/B3/J2 are extra repeat calls that exist only in the Phase A log-view bookkeeping and have no Phase B counterpart at all; there is no `probeB-case-B2` file).

At the function route (Phase B), the raw evidence for case K — `qa-reports/phase03a/2026-09-09-f28a-probe/probeB-case-K.json` — is **not** a rejection. It is a normal, successful response, byte-identical in shape to the plain baseline cases (A, G, H, I, J, L): `cf-connecting-ip` present with `echoedSentinel: "OTHER_VALUE_NO_SENTINEL"` (i.e., the platform's real value, not the sentinel), `totalHeaderCount: 17` (the baseline count; forgery cases that add one header show 18). This means case K, as actually captured at the function route, never demonstrates that a caller-supplied `cf-connecting-ip` was sent at all — let alone over IPv6 transport. `PHASE_B_FUNCTION_EVIDENCE.json:results` confirms independently: the only rejected cases it names are `"B_and_D_caller_supplied_cf_connecting_ip"` — K is not mentioned as rejected anywhere in the Phase B evidence file.

Confirmed via `git show 854d29b -- .../probeB-case-K.json`: case K was banked in the same commit as the other 10 successful captures, with the same baseline shape, at the time evidence was captured — this is not a later corruption.

**Consequence**: the specific combination the probe plan (case K: "over IPv6 transport + case B") was designed to test — whether the edge-rejection of a caller-supplied `cf-connecting-ip` also holds when transport is (attempted) IPv6 — was never actually confirmed at the function route. It was confirmed at the REST/gateway route in Phase A (Phase A's own K did return 403), but Phase A's own incidental note says that "IPv6" attempt itself fell back to an IPv4-mapped address (`::ffff:104.18.38.10`), so even that confirmation doesn't touch genuine IPv6 transport. Net: the IPv6+forgery combination is untested at the function level, which is a slightly larger gap than the resolution's G4 section discloses (G4 is framed purely as a key-derivation/bucketing gap; this specific combination-test gap belongs there too and isn't mentioned).

This does not change the core PASS (cases B and D, tested cleanly at the function route with plain IPv4 transport, are sufficient to establish header-level forgeability rejection independent of transport family, per Finding 2's reasoning about Cloudflare's documented, transport-independent header check). But the specific sentence over-claims what was tested and should be corrected.

### 5. Sample-size honesty — OVER-CLAIMED (narrow)

Counting actual distinct calls: Phase A's named cases are A–L (12) plus four additional repeat/control calls referenced only in `logView` (A2, B2, B3, J2) = at least 16; Phase B made exactly 12 (`callsMade: 12`). Total probe-phase requests: **at least 28**, not the ~22 suggested as a premise for this review — though the qualitative point (one client, one network, one 24-hour window) is accurate regardless of the exact count, and the resolution does disclose this limitation candidly in "Residual risks" #1.

One capability gap not disclosed anywhere: the probe plan's **P8** explicitly required proving the bucket-key is *"stable [for the same client] and, from different clients, distinct."* `PHASE_B_FUNCTION_EVIDENCE.json:sourceStability` reports only `"distinctFingerprints": 1, "acrossCalls": 10, verdict: STABLE"` — every one of the 10 successful Phase B calls, including case L (which the plan specifically designed to run "from a second network" to test distinctness), produced the **identical** fingerprint `"3833"` (verified in every raw `probeB-case-*.json`). This proves same-client stability; it does **not** demonstrate that a different client produces a different fingerprint, because no genuinely different source is evidenced in the raw data — case L's fingerprint matches every other case exactly. The resolution's "sourceStability" framing ("usable as a bucket key") implicitly leans on distinctness as well as stability, but distinctness (the half that actually matters for a rate limiter not conflating two different users) was never empirically shown. This should be flagged as an open item, not folded silently into "STABLE."

Additionally, no probe script or exact curl/fetch invocation was committed to the repo for any case — only the resulting JSON/text outputs are banked. I cannot independently confirm from the repo alone what headers were actually sent for case K (or any case); I can only infer from the *shape of the response*, which is what Finding 4b relies on. This is UNVERIFIED, not confirmed, though the response shape is strong circumstantial evidence.

### 6. Scope and safety audit

Everything checked against `STAGING_DIAGNOSTIC_PROBE_PLAN.md` and `PREPARED_OPERATION.json` matches what was actually done: target was the disposable staging branch (`ctshxbykuemeqnofqcdh` / `441acc38-...`) only, never the parent production project (`kldlwszpfkdmsjrjhjym`) or any other production surface; Phase B made exactly the authorized 12 calls (`callsMade: 12`, matching the plan's 12-case matrix); no database, table, RPC, migration, or credential access is claimed anywhere and nothing in the evidence contradicts that. Cleanup is independently verifiable, and I verified it live rather than trusting the banked claim: `GET https://ctshxbykuemeqnofqcdh.supabase.co/functions/v1/fda028-probe` returned `404` at the time of this review, corroborating `TEMP_PROBE_STATE.json`'s `REMOVED_VERIFIED` / `list_edge_functions` check via a channel independent of both. I grepped every file in the probe evidence directory for IPv4- and IPv6-shaped strings: the only literals present are the three authorized RFC 5737 sentinels (`192.0.2.1`, `198.51.100.2`, `203.0.113.3`), the RFC 3849 documentation prefix (`2001:db8:`), and Cloudflare's own anycast destination address (`104.18.38.10`, the DNS resolution target, not any caller's address) — no real client or reporter IP address appears anywhere in the banked evidence. Scope was respected.

### 7. See Finding 4b (the one internal inconsistency found).

## Claims that should be narrowed or reworded

1. In `F28A_RESOLUTION.md`, under "Evidence": replace
   > "All four such attempts (B, D, K, B2) produced no Supabase log record whatsoever, across both the REST route and the Edge Function route."

   with something like:
   > "At the REST/gateway route (Phase A), all four attempts that supplied `cf-connecting-ip` (B, B2, D, K) produced no log record. At the Edge Function route (Phase B), the two attempts actually tested there (B, D) produced no log record and never reached the function; the IPv6-transport-plus-header combination (case K) was not independently re-verified at the function route — see the open item under G4."

2. In `F28A_RESOLUTION.md`, under "Why G4 does not block PASS," consider strengthening rather than hedging the trust-boundary claim: Cloudflare's own documentation (`developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1000/`) lists a caller-supplied `CF-Connecting-IP` header as a standalone, documented cause of Error 1000 — this is general platform behavior, not a project-specific configuration that "could change without notice" as "Residual risks" #1 currently frames it. Recommend citing this source directly and revising risk #1 to distinguish "documented general behavior" (low risk of silent change) from "Supabase's choice to leave this Cloudflare protection enabled for this project" (a real, if smaller, dependency).

3. In `PHASE_B_FUNCTION_EVIDENCE.json` / resolution text describing `sourceStability`: narrow "usable as a bucket key" to note that only same-source stability (10/10 identical fingerprint) was demonstrated; cross-source distinctness (P8's second half) was not, since case L's fingerprint is identical to every other case rather than distinct.

## Independent re-test performed

Yes — reported in Finding 1. Two live unauthenticated GETs to `https://ctshxbykuemeqnofqcdh.supabase.co/rest/v1/`, one with no forwarding headers and one with `cf-connecting-ip: 192.0.2.1` (RFC 5737), plus a repeat baseline control and a direct check of the deleted probe URL. All four calls created no data (401/403/404 responses only). Results reproduced the original finding exactly (401 → 403 with `error code: 1000`/`server: cloudflare` when and only when the sentinel header was added) and confirmed the probe function is gone (404).
