# Phase 03A MF-05 and production limiter policy proposal

## MF-05 owner recommendation

```text
MF05_OWNER_DECISION: ACCEPT_S3_LIMITER_PRESENT_BYPASS_OPEN_FOR_STAGE_A
CONFIDENCE: HIGH
```

Accept `S3_LIMITER_PRESENT_BYPASS_OPEN` as a **temporary Stage A rollout posture**. This preserves Build 33 and pinned-web compatibility while the accepted limiter infrastructure is introduced. It does not claim that every guest request is rate-limited: legacy direct guest inserts remain possible until a separately authorized coordinated cutover.

This recommendation includes no Stage B migration, forced client upgrade, app release, pinned-web cutover, or legacy-path removal. Stage B remains excluded. Closing the bypass requires a later native and pinned-web cutover with separate evidence and owner authorization.

## Proposed production policy

| Field | Proposed value | Confidence | Reason and tradeoff |
|---|---:|---|---|
| `normal_allowance` | **5** | High | The shipped client already tells an anonymous reporter that the limit is five reports per 24 hours. Retaining five avoids a stricter surprise for legitimate accessibility reporting. One grant can submit five reports; an abusive client can also consume all five, while reset amplification is bounded by the prefix bucket. This value does not depend on shared-network size. |
| `bucket_allowance` | **50** | Provisional | This funds ten full five-report grants behind one public network prefix. Production's largest observed aggregate guest burst is 12 flags in one hour/day across the whole app, so 50 does not undercut the only observed burst even in the worst unproven case that it came from one prefix. It caps reset amplification at 10 times the normal budget. A lower value increases false positives for shelters, campuses, events, carrier NAT, and other shared networks; a higher value permits more abuse from one public prefix. The smallest tuning input is privacy-safe per-bucket saturation/denial counts after limiter-backed traffic exists, with no bucket identifiers retained in receipts. |
| `window_seconds` | **86400** | High | A 24-hour window matches the existing client contract and the accepted FDA-028 architecture. It makes the user-facing limit predictable and keeps budget exhausted across app/session resets for the rest of the window. A shorter window admits more repeated abuse; a longer window increases legitimate lockout duration, especially on shared networks. |
| `ipv4_prefix` | **32** | High | `/32` uses one public IPv4 address per authority bucket, the least-coalescing IPv4 choice. It still groups devices behind the same NAT address, which is why the bucket allows ten full grants. A shorter prefix would merge unrelated public addresses and increase accessibility false positives. A changed public address can obtain a fresh bucket; the architecture does not claim to prevent network switching. |
| `ipv6_prefix` | **64** | Provisional | `/64` resists trivial IPv6 privacy-address rotation within the usual subscriber prefix while avoiding broader aggregation. `/128` reduces shared-network collisions but lets one device rotate addresses to reset budget; a prefix shorter than `/64` risks combining unrelated subscribers. The accepted normalization unwraps recognized IPv4-embedded/NAT64 forms before this mask. The smallest tuning input is privacy-safe aggregate denial/saturation evidence by address family, without raw addresses or stable bucket identifiers. |
| `retention_windows` | **1** | Provisional | Retaining the live window plus the immediately preceding window provides a small reconciliation margin while avoiding durable tracking data. Bucket keys are truncated HMAC outputs and no raw IP is stored. Depending on purge timing, this can retain a prior-window row for under roughly 48 hours. Zero would minimize retention further; more than one increases privacy exposure without current operational evidence. Tune only after purge operations are measured. |
| `reseed_interval` | **7** | Provisional | A fresh random epoch key every seven daily windows bounds forward derivation from an older compromised key while avoiding an indefinite ratchet chain. More frequent reseeding improves compromise containment; less frequent reseeding extends it. Seven is the accepted reviewed architecture value, but production incident and key-rotation evidence does not yet exist. |
| `catchup_cap` | **32** | High | At most 32 missed daily epochs are ratcheted serially; a larger gap generates a new random key at the current epoch. This bounds recovery work and prevents an unbounded loop after a long pause. Lower values cause earlier discontinuous reseeding; higher values add avoidable work without preserving a meaningful live budget after more than a month. |

## Why these are production proposals rather than copied staging values

The eight values equal the migration defaults and the accepted hosted configuration, but the proposal is independently grounded in current production and shipped behavior:

- Production has 12 lifetime guest flags, all within the last 30 days, with an observed maximum burst of 12 in one hour/day; there were no guest flags in the last seven days. The sample is too small and lacks privacy-safe prefix distribution, so it supports a generous initial bucket and a provisional label rather than aggressive tightening.
- The shipped guest flow already enforces and communicates five submissions per 24 hours. `5` and `86400` preserve that user contract.
- `50` gives ten full grants behind a shared public prefix and exceeds the observed aggregate burst, reducing the risk of blocking legitimate accessibility reports.
- `/32` and `/64` are the accepted balance between reset resistance and network sharing; the grant tier absorbs some NAT contention.
- `1`, `7`, and `32` preserve the independently reviewed retention, one-way ratchet, reseed, and bounded-catchup behavior.

## Approval boundary

```text
PRODUCTION_POLICY: READY_FOR_OWNER_APPROVAL
PRODUCTION_POLICY_APPROVED: NO
MF05_RECOMMENDATION_RECORDED: YES
MF05_OWNER_APPROVED: NO
PRODUCTION_MUTATIONS: NONE
```

The migration creates these values by default. This proposal adds no separate production configuration mutation. Later tuning requires new aggregate operational evidence and separate authorization.
