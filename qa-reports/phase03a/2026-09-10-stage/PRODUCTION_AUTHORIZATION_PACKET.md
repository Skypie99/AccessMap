# Phase 03A — production authorization packet

**Generated 2026-09-10 from staging run FLAGSTONE-P03A-STAGE-AUTHORIZED-20260910-R1.**

> **Revised 2026-09-10 after independent staging acceptance returned ACCEPT WITH
> MANDATORY CHANGES.** The acceptor declined to sign off the first draft of this packet.
> Sections 4, 5e and 6 changed as a result; see `INDEPENDENT_STAGING_ACCEPTANCE.md`.
>
> **GENERATING THIS PACKET IS NOT AUTHORIZATION.** Nothing here permits a production
> change. `PRODUCTION_AUTHORITY: NONE`. Every item below is a *proposal* that needs an
> explicit, separate owner token naming the exact production project ref. No production
> migration, Vault secret, Edge Function, deployment, build or store submission was made
> or is being requested implicitly by this document.

---

## 1. What is being proposed

Apply the accepted Phase 02 adoption set and the accepted Phase 03A candidate set to
production `kldlwszpfkdmsjrjhjym`, in the exact order and with the exact file contents
proven on staging `ctshxbykuemeqnofqcdh` / branch `441acc38-d71c-4a87-883e-61ff87e0c52e`.

Frozen source identity:

| Identity | Value |
|---|---|
| `PHASE03A_CODE_SHA` | `21b2bd7a96cd69a8d8fc3ff8756b88a5fe28d912` |
| `PHASE03A_CODE_TREE` | `b47f1221e8be9c57d147a80ee328359b32f66436` |
| `ACCEPTED_INTEGRATION_SHA` | `7c43c07e69f74db4d65aa4ea329f419b6c715fb4` |
| `ACCEPTED_INTEGRATION_TREE` | `11de0eb4cf0cbf718fe17fa8a8cab8defef21af8` |
| `FDA028_V4_SOURCE_SHA` | `eec51b6723d04105a7ba31bf2efd2573b95e8902` |

Non-`qa-reports/` files changed between `PHASE03A_CODE_SHA` and current HEAD: **0**.
The source is frozen; only receipts have been added since acceptance.

---

## 2. Exact apply order and hashes

Apply **in this order**. Verify each sha256 before applying; a mismatch is a STOP.

### 2a. Phase 02 adoption set (`supabase/migrations-next/`)

| # | File | sha256 |
|---|---|---|
| 1 | `20260904000000_adopt_private_admin_helper.sql` | `1d504c3ad05c0b31052715406059071301a51f4359ef35ce85c92cb61202fbf7` |
| 2 | `20260904000100_drop_duplicate_status_triggers.sql` | `9771e7c5df363b139e8bcd9e9f9e58b15e6c2f59eebb4523a330a774fc18db49` |
| 3 | `20260904000200_adopt_d1sa_containment.sql` | `fbc986296aee71109639ad833d4c75422c28bbefa4fddfefe51f29eeaf03dfb6` |
| 4 | `20260904000300_adopt_live_insert_throttles.sql` | `b346b2c7775543c9a268098c0956812b7ad9a9ddf49680202fe846073d4ef776` |
| 5 | `20260904000400_adopt_execute_revokes.sql` | `e8a3d880d361e5d6be96c8b30709a9b1b3d8a8d94e6d23175342db41bb20cf13` |

> Each of these five was independently re-proved **required** against staging before
> applying — the precondition was probed, not inherited from history.

### 2b. Phase 03A candidate set (`supabase/migrations-next/phase03a/`)

| # | File | sha256 |
|---|---|---|
| 1 | `20260905055629_phase03a_flag_policies.sql` | `c8f4d419b01a624905c46bd168974d494d82af3a6960049c212d24e8fa07fcaa` |
| 2 | `20260905055630_phase03a_open_inserts.sql` | `c6410a61cb195b6d6d70f0d33139064dd191a9cb193534b7f36dc33e25e90071` |
| 3 | `20260905055632_phase03a_profile_updates.sql` | `ef24f6b44bcb7cdc7a2e89fe4a886a0d6a0688cf0a416564bde74b5d4c217187` |
| 4 | `20260905055633_phase03a_contextual_profiles.sql` | `714cee56dac78d84505898d18cddd2c24345d2b86e43434c5899f466de22d81b` |
| 5 | `20260905055635_phase03a_trigger_execute.sql` | `ca95d25a3219e541db555d5d8693e7240c7a927617c7a5969ee55cffa68074f9` |
| 6 | `20260905055636_phase03a_client_privileges.sql` | `44e405bd9bc7b8c2cccb816825f57d43d617a83bdf38d7f0b4d58205cf997063` |
| 7 | `20260905073925_phase03a_effective_privileges.sql` | `64afe7aaff43f21ecb189bea648dbfa22335a5aca46061310dacf86e73cc9928` |
| 8 | `20260909120000_fda028_v4_limiter.sql` | `8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771` |

---

## 3. Exact rollback order and hashes

Roll back in **reverse** of the apply order. Phase 03A rollbacks first, then Phase 02.

| Order | File | sha256 |
|---|---|---|
| 1 | `phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql` | `eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302` |
| 2 | `phase03a/rollback/20260905073925_phase03a_effective_privileges.rollback.sql` | `cc71d52cddd86a81f0db4375bd20e81a53b8cffee32e3e1a4ea6f83261e0271f` |
| 3 | `phase03a/rollback/20260905055636_phase03a_client_privileges.rollback.sql` | `8a1257a0d355b27aa563cf7cd0c676748a66dab8cd33017a9e1e25712fab42e9` |
| 4 | `phase03a/rollback/20260905055635_phase03a_trigger_execute.rollback.sql` | `71f6027f023b95b1900eaa9f546b487603cc2ca76ae2f2a2595d11c05ee6dcce` |
| 5 | `phase03a/rollback/20260905055633_phase03a_contextual_profiles.rollback.sql` | `c894f5bb3e337e29c09b379db2d1e2fcebc6f76ec2a331e8a891f90398b00f21` |
| 6 | `phase03a/rollback/20260905055632_phase03a_profile_updates.rollback.sql` | `694d1012b068e8834fb02f5c65257e7a37016c955e4760847fc5d749ce99dda1` |
| 7 | `phase03a/rollback/20260905055630_phase03a_open_inserts.rollback.sql` | `febc6fd4f7c16ec90949189d32507bbd870ce53512aea793b564ae92965be9c9` |
| 8 | `phase03a/rollback/20260905055629_phase03a_flag_policies.rollback.sql` | `a10de3760e986bd7a7047de4b8dd88344ee5ed3fa5327cf17f7b7a9b3a18f381` |
| 9 | `rollback/20260904000400_adopt_execute_revokes.rollback.sql` | `f9a9faee565cdf3454e143c3a2f4c28cf8c3071c8ba7a78552c6be5607683839` |
| 10 | `rollback/20260904000300_adopt_live_insert_throttles.rollback.sql` | `3c67f9b3545a62cd45fca0688a117b2597a8cdc71486105b9349e281a493392d` |
| 11 | `rollback/20260904000200_adopt_d1sa_containment.rollback.sql` | `8ff49d968a82cdfe4f45f564b7ab61101b9bc35c429fafec09b51a9f69b8bd1b` |
| 12 | `rollback/20260904000100_drop_duplicate_status_triggers.rollback.sql` | `47a087094b5978b27977c598d0b8454a489138178327758d42fdb57a9c80b906` |
| 13 | `rollback/20260904000000_adopt_private_admin_helper.rollback.sql` | `aea2f69cf9319718acc80de8af9ddd4354b52735a0b49dd00189c5df8565d16c` |

**Rollback semantics — read before relying on this.** These are *forward-restoration*
scripts to the pre-change posture, **not exact inverse DDL**. They deliberately restore
known weaknesses; in particular rolling back FDA-028 returns guest ingestion to having
no per-client limiter, governed only by the global anonymous emergency caps.

---

## 4. What staging actually proved

| Claim | Result |
|---|---|
| Staging identity is a disposable non-default branch, no production data | PASS |
| Phase 02 baseline reconciled | PASS (ledger 71 → 76) |
| All 8 Phase 03A candidates applied | PASS (ledger 82) |
| Hosted pgTAP | **217/217**, 0 failures, validated by 2 negative controls |
| Hosted role/authorization matrix | **31/31**, 0 failures |
| FDA-028 hosted acceptance | **38/38**, 0 failures, deterministic |
| Hosted concurrency | 25 parallel admissions, allowance 8 → **exactly 8** admitted / 17 refused, 8 real rows, 8 ledger units, 0 orphans, **no overshoot** — re-run and banked in `OP_HOSTED_CONCURRENCY.json` after the independent acceptor found the original claim had no receipt |
| R6-1 advisory coordination | PASS — a 6s held domain change blocked an admission for 7s, which then succeeded |
| R6-2 advisory reachability | PASS — not reachable from anon, authenticated, PostgREST, GraphQL or any deployed Edge Function |
| R6-3 admission ↔ domain-change race | PASS in **both** directions |
| Hosted IPv6 **normalization** | PASS — 24 assertions, 0 failures, negative control fired |
| Restoration rehearsal | PASS, deterministic, and does **not** break Build 33 clients |
| Reapply rehearsal | PASS, deterministic |

The single sharpest result: in R6-3 Direction A the domain-change transaction had
already deleted every bucket row visible in its own snapshot, so a detection-only
guard would have passed. It blocked 6.8 s on the exclusive advisory lock, re-read after
acquiring it, saw the concurrently-committed row, and refused. That is the exact
interleaving that defeated the earlier detection-only design at a measured 30/30.

---

## 5. What staging did NOT prove — read this before authorizing

### 5a. `HOSTED_IPV6_TRANSPORT: OPEN`
The ingest hostname publishes **no AAAA record** — on staging *or* production — and there
is **no guest-ingest Edge Function in the accepted artifact set**. End-to-end hosted
ingestion of any address family therefore could not be exercised. This was deliberately
**not simulated**. The IPv6 normalization is proven correct but currently **dormant**: if
an AAAA is ever published for the API hostname, `cf-connecting-ip` starts carrying IPv6
with no code change and the /64 grouping becomes load-bearing overnight.

### 5b. `ROLLOUT_STAGE: S3_LIMITER_PRESENT_BYPASS_OPEN`
Measured, not assumed: two guest writes were accepted while `limiter.bucket` and
`limiter.grant` both stayed at **0**. Applying this set to production installs a correct,
well-tested limiter that **nothing calls**. It does not reduce guest abuse on day one.
What it *does* deliver immediately is FDA-012 payload narrowing (a guest cannot forge
`user_id` or pre-set `status`), FDA-026 profile-read narrowing, and grant reduction
(table grants 543 → 266, column grants 2309 → 1386).

### 5c. `ROUND_TRIP_STRUCTURAL_IDENTITY: FAIL`
Rollback → reapply is deterministic (3 cycles, byte-identical 349,583-byte structural
JSON) and lands on a catalog that passes **286/286** hosted assertions — but its digest
`c70e119a…` differs from the first-apply digest `09c42928…`. The original structural JSON
was hashed but not retained, so the delta could not be localised. **This is my error in
checkpoint discipline and is stated as such.**

### 5d. Production thresholds remain DEFERRED
`normal_allowance`, `bucket_allowance`, `window_seconds`, `ipv4_prefix`, `ipv6_prefix`,
`retention_windows` are **configuration**, not architecture. The staging values
(5 / 50 / 86400 / 32 / 64 / 1) are test values. No production threshold is proposed here.

### 5e. Applying this set BREAKS shipped Build 33 clients — two separate problems

**This section was rewritten after the independent staging acceptor found a breakage no
receipt in this run had raised. The original text framed the Build 33 constraint as being
about the limiter cutover alone. That was incomplete.**

**(i) The limiter cutover (known).** Build 33 clients depend on the direct pre-limiter
INSERT. Revoking it closes the bypass and breaks every shipped client; retaining it keeps
the bypass open. This packet does not resolve that by forcing an app update or a
minimum-version gate, both of which the owner excluded.

**(ii) FDA-026 breaks admin and the leaderboard on day one (newly found, verified).**
`20260905055633_phase03a_contextual_profiles.sql` drops the
`users readable by authenticated` policy and revokes `SELECT (is_admin)`. After it,
`public.users` has exactly one SELECT policy — own row only — and `is_admin` has no
column grant. Verified against the actual shipped trees (`f5594171` iOS, `ebf091c2` web):

| Shipped call site | Mechanism | Effect |
|---|---|---|
| `src/lib/admin.ts:31` `select('is_admin')` | no column grant → 42501 | shipped code degrades to `false`: **every admin silently loses the admin UI** |
| `src/lib/flags.ts:1682` `listLeaderboard()` | RLS own-row-only | no error; leaderboard **silently collapses to one row** |
| `src/lib/flags.ts:1702/1717` `getUserLeaderboardRank()` | RLS own-row-only | count 0 → **every user is silently rank 1** |
| comment author hydration | RLS own-row-only | authors degrade to the anonymous fallback |

The four replacement RPCs Phase 03A adds (`current_user_can_admin`,
`get_comment_author_profiles`, `get_my_leaderboard_rank`, `list_public_leaderboard`) are
referenced **zero** times in either shipped tree. The migration half of this change exists;
the client half does not.

The shipped `admin.ts` carries a comment recording that this exact 42501 already
"stayed broken and silent for months", that the grant went live 2026-08-18, and that a
42501 there "would now mean a real regression". This set reintroduces it.

Full detail and the owner's options: `OP_BUILD33_COMPATIBILITY.json`.

## 6. MUST-FIX before any production apply

1. **The apply mechanism used on staging is not fit for production.** Measured on the
   staging ledger: candidates applied through the Management API were recorded under
   *wall-clock apply time* (`20260910161947`, `20260910162019`, …) instead of their own
   canonical versions (`20260904000000`, `20260905055629`, …), and the last two Phase 03A
   candidates have **no ledger row at all** because they were applied with
   `db query --file`. In production this destroys migration identity: a later
   `migration list` / `db push` cannot tell what is applied, and two candidates would
   look un-applied and could be re-run. **Choose and prove a mechanism that records the
   canonical version before touching production.**
2. **Retain full structural JSON, not just hashes,** immediately before and after the
   production apply, and rehearse the production rollback with both retained, so the
   §5c delta can be localised before the rollback is ever needed in an incident.
3. **Provision the production Vault secret separately and by the owner.** The staging
   secret is staging-only and must never be copied. I did not create, read, or copy any
   production secret, and this packet does not request that I do.
4. **`notify_flag_status_webhook` hardcodes the PRODUCTION webhook URL.** It is inert on
   staging only because staging has no `webhook_secret` — which must never be created
   there. Confirm the production wiring is intended before applying anything that could
   change status-change behaviour.
5. **Decide §5b explicitly.** Applying this set with the bypass open is a legitimate
   choice, but it must be a *chosen* one, not an accident of sequencing.
6. **Resolve §5e(ii) before applying.** Either ship a client update that uses the four new
   RPCs first, or split `20260905055633_phase03a_contextual_profiles` out of the apply set,
   or knowingly accept a window of silently-broken admin and leaderboard. There is an
   ordering constraint here that the first draft of this packet did not state.
7. **`supabase/.temp/linked-project.json` is tracked in git and names PRODUCTION**
   (`ref: kldlwszpfkdmsjrjhjym`). Only the untracked `.temp/project-ref` points at staging.
   A fresh clone of this branch has the production ref committed and no staging override.
   Untrack and gitignore `supabase/.temp/`. This was **not** fixed here because that file
   is a tracked non-`qa-reports/` file and changing it would break the frozen
   `PHASE03A_CODE_TREE` identity — so it needs the owner.
8. **The ledger is not unwound by rollback.** The six `phase03a_*` rows survived all three
   rollback cycles. A rolled-back production database would still claim those migrations
   are applied, so a later `db push` would skip them. Together with MUST-FIX 1 this means
   the migration ledger cannot currently be trusted as a record of what is applied.

## 7. SHOULD-FIX

- `service_role` can read `vault.decrypted_secrets`. Expected for the platform role, but
  worth an explicit decision now that a limiter key lives there.
- Tighten the rollback scripts into exact inverses, or record acceptance that a
  stable-but-different restored state is fine given 286/286 behavioural equivalence.

---

## 8. What the owner is being asked to decide

1. Whether to apply Phase 02 + Phase 03A to production at all, given §5b (a correct
   limiter that nothing yet calls).
2. Which migration-apply mechanism is authorized, after MUST-FIX 1 is resolved.
3. Production thresholds (§5d) — still deferred, still not proposed here.
4. How the Build 33 rollout constraint (§5e) is to be resolved.
5. Whether the §5c structural divergence must be localised before, or may be localised
   after, a production apply.

---

## 9. Standing status

```
PRODUCTION_AUTHORITY:            NONE
PRODUCTION_MUTATIONS:            NONE
PRODUCTION_VAULT_CHANGES:        NONE
PRODUCTION_EDGE_DEPLOYS:         NONE
PUSHES:                          NONE
MAIN_MERGES:                     NONE
APP_BUILDS / TESTFLIGHT / STORE: NONE
VERCEL_PRODUCTION_PROMOTION:     NONE
PHASE_03B:                       NOT_STARTED
STAGING_CLEANUP_REQUIRED:        YES  (staging retained, NOT deleted)
```
