# FDA-028 — architecture constants vs staging thresholds vs production policy

**PRODUCTION_THRESHOLD_DECISION: DEFERRED.** Nothing below locks a production rate, window, `K`, `NORMAL` or bucket allowance. The purpose of this document is to stop deterministic test values from silently becoming policy — which is exactly how the current global caps (100/h, 30/h) came to be load-bearing without ever being decided.

## Tier 1 — architecture constants

Structural properties. Changing one changes whether the design is *correct*, not how strict it is. These are **not** tuning knobs and should not appear in any threshold conversation.

| Constant | Value | Why it is structural |
|---|---|---|
| Tier count | 2 — network-window bucket, plus a grant bound to it | One tier alone cannot give both reset persistence and same-NAT independence. |
| Authority location | The bucket, never the grant | The grant is client-held and therefore discardable; only the bucket survives a reset. |
| Opening-balance rule | `LEAST(NORMAL, BUCKET_ALLOWANCE − bucket.units_consumed)` | This single expression *is* the reset-persistence property. |
| Grant binding | `(bucket_key, window_id)` must match on every spend | Without it a grant can spend against other networks' buckets. |
| Key derivation | `HMAC(K_epoch, prefix ‖ window_id)`, secret rotated per window | Rotation is what stops the ledger becoming longitudinal. |
| Trusted-value shape rule | Reject any candidate that is multi-valued or caller-echoed | The anti-forgery property. **Its exact form is currently unsettled — see the note below.** |
| Ledger contents | Counters and a window id only; no timestamps, no addresses | Removes row-granularity correlation against world-readable `flags.created_at`. |
| Lock order | bucket → grant, always | Deadlock avoidance. |
| Failure posture | Fail-closed, with a config kill switch | Free only because the ledger shares a database with the target table. |
| Client-visible state | An opaque grant id and an expiry, nothing else | No limiter identity may reach a client. |

> **Open against Tier 1.** [F28A_EVIDENCE.json](F28A_EVIDENCE.json) shows the trusted input is almost certainly `cf-connecting-ip` (present on 100% of real requests, single-valued, twinned with `x-real-ip`) rather than the rightmost `x-forwarded-for` element under a pinned hop count that v2 specifies. The **shape rule is an architecture constant and it is currently mis-specified.** It must be re-settled before implementation — it is not a threshold question.

## Tier 2 — staging test thresholds

Chosen to make behaviour observable in the fewest possible calls and to make every boundary unambiguous. **Deliberately absurd as policy.** They exist so a test can prove a transition, not so anyone can infer a production value.

| Parameter | Staging test value | Why this value, for testing only |
|---|---|---|
| `NORMAL` | **2** | Exhaustion in two calls; the third call proves refusal. |
| `K` (grants per bucket-window) | **3** | Three distinct clients provable with three grants. |
| `BUCKET_ALLOWANCE` | **6** (`NORMAL × K`) | Whole reset-amplification ladder walkable in six calls, so the ceiling is *observed*, not asserted. |
| `WINDOW` | **60 seconds** | Window rollover becomes testable inside one run. A 24 h window makes rollover untestable. |
| Grant lifetime | **= window** | Proves a grant cannot straddle a boundary. |
| Purge delay | **window + 60 s** | Retention and unlinkability observable in ~2 minutes. |
| Untrusted-shape path | **unchanged from the trusted path except for its own counter** | Keeps the fallback's behaviour separately observable. |
| Concurrency fan-out | **30 simultaneous callers against `BUCKET_ALLOWANCE = 10`** | Already exercised locally; overshoot would be obvious. |

Every one of these must be **parameterised, not compiled in** — read from `limiter.config` — so that staging values can never leak into a production deployment by omission.

## Tier 3 — proposed production policy

**DEFERRED. No value is recommended.**

`NORMAL`, `K`, `BUCKET_ALLOWANCE`, `WINDOW`, the IPv4 and IPv6 prefix widths, and the untrusted-path allowance are all **undecided** and remain Sky's to set.

### Why deferral is the correct answer rather than a dodge

The observed production traffic is **85 requests from 8 distinct source addresses across 2 Cloudflare colos in 24 hours**. That is far too little to calibrate anything. Specifically it cannot tell us:

- how many genuine guests share one public address (the number `K` exists to protect);
- whether guest reporting clusters — a group home, a services centre, an organised mapping session — which is the case that decides whether `K` causes real harm;
- what the IPv6 share is (**0 of 85 observed requests were IPv6**, so the IPv6 prefix width has no empirical basis at all);
- whether `Pseudo IPv4` is in effect, which would collapse distinct IPv6 subscribers onto shared addresses and make any IPv6 prefix choice meaningless.

Picking production numbers now would mean picking them from **zero** relevant evidence and then defending them because they were written down. The values in v2 (`NORMAL = 5`, `K = 10`, 24 h) were illustrative — `NORMAL = 5` was chosen only to match today's client-side `MAX_PER_WINDOW`, and `K = 10` was chosen only to have a number. **Neither should be treated as a recommendation, and they are hereby withdrawn as such.**

### What would need to exist before production thresholds can be set

1. F28-A resolved, so the bucket key means something.
2. A determination on Pseudo IPv4, before any IPv6 prefix is fixed.
3. Observation from stage **S3** ([rollout constraint](OLD_CLIENT_ROLLOUT_CONSTRAINT.md)) — the limiter deployed in a non-binding or generously-set mode, recording what real guest distribution actually looks like per bucket. **Measure first, then set the cap.**
4. An explicit owner decision on the asymmetry: refusing a genuine disabled reporter is a different kind of harm from admitting an extra abusive report, and the two are not interchangeable. That is a values judgement, not a calculation.

Setting a production cap before (3) would repeat the original mistake: a number nobody chose, quietly becoming policy.
