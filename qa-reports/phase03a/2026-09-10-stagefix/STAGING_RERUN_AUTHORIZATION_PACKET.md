# Phase 03A — STAGING RERUN authorization packet

**Supersedes the artifact hashes in `2026-09-10-stage/PRODUCTION_AUTHORIZATION_PACKET.md`.
That packet is `SUPERSEDED_BY_STAGE_MANDATORY_FIXES` and is not authorizable.
The first staging run itself is PRESERVED as evidence and is reused below.**

> **GENERATING THIS PACKET IS NOT AUTHORIZATION.** It authorizes nothing. No staging
> or production mutation was made in the run that produced it.
> `STAGING_MUTATIONS: NONE` · `PRODUCTION_MUTATIONS: NONE`.

---

## 1. Why there is a rerun at all

Independent staging acceptance returned **ACCEPT WITH MANDATORY CHANGES**. The staged
candidate is therefore not production eligible. Two of the findings were the kind that
only show up when someone checks the thing nobody thought to check:

- the apply set **silently breaks every shipped Build 33 client**, independently of the
  limiter — found by the acceptor, not by me;
- the migration ledger **cannot say what is applied** — wall-clock versions for six
  candidates, no row at all for two.

Neither is visible in a green test run written against the intended posture. Both are
now closed, with tests that would have caught them.

## 2. The eight-fix disposition

| ID | Title | Disposition |
|---|---|---|
| STAGE-MF-01 | Apply mechanism destroys canonical identity | **CLOSED** — tooling + 19 tests |
| STAGE-MF-02 | Round-trip identity unlocalisable; JSON discarded | **CLOSED** — capture recipe published + 11 tests |
| STAGE-MF-03 | Production Vault secret | **OPEN by design** — owner action, §6 |
| STAGE-MF-04 | Apply-set candidate hardcodes the production webhook URL | **OPEN by design** — coupling asserted, decision at §6 |
| STAGE-MF-05 | Applying with the guest bypass open | **OPEN by design** — owner decision, §6 |
| STAGE-MF-06 | Silently breaks shipped Build 33 reads | **CLOSED** — Stage A/B split + 25-assertion contract |
| STAGE-MF-07 | Tracked link artifact names production | **CLOSED** — untracked, ignored, guarded |
| STAGE-MF-08 | Rollback never unwinds the ledger | **CLOSED** — forward-only model |

Full evidence: `EIGHT_FIX_DISPOSITION.json`. Count reconciliation (the acceptor issued
five MUST-FIX, not eight): `MUST_FIX_INVENTORY.json`.

## 3. The one supported apply mechanism

```
supabase db push --linked --project-ref <ref> --dry-run     # verify first
supabase db push --linked --project-ref <ref>               # then apply
```

`supabase db push` reads `supabase/migrations/` and records each file under its own
canonical version. It is the only mechanism authorized by this packet.

**PROHIBITED for production**, both measured on the first staging run:

| Mechanism | What it actually did |
|---|---|
| Management API `apply_migration` | recorded the wall-clock apply time (`20260910161947`) instead of the canonical version (`20260904000000`) |
| `supabase db query --file` | recorded **no ledger row at all**; two candidates are invisible to `migration list` |

Runnable commands (independent review found the first draft named a function with no
command behind it):

```bash
npm run db:apply:plan                                  # must exit 0 before any apply
npm run db:apply:command -- --project-ref <ref>        # prints the exact push command
npm run db:apply:verify -- --ledger <ledger.json>      # must exit 0 after any apply
npm run db:apply:restore -- --candidate <f> --reason "…"   # forward-only rollback
```

Obtain `<ledger.json>` read-only: `select version,name from
supabase_migrations.schema_migrations order by version`. The tool never connects to a
database. Run against the first run's actual ledger, `verify` exits **1** with the
ledgerless and wall-clock problems named, so it demonstrably detects the defect rather
than merely asserting it cannot happen.

## 4. Forward-only ledger semantics (STAGE-MF-08)

A restoration is a **new forward migration with a later canonical version**. No ledger
row is ever deleted or rewritten. The ledger then reads:

```
20260905055633_phase03a_contextual_profiles      applied
20260910130000_restore_phase03a_contextual_...   deliberately undone
20260911xxxxxx_reapply_phase03a_contextual_...   re-applied
```

`forwardRestorationName()` refuses to name a restoration that would sort before the
migration it undoes. Staging-only ledger deletion is **not** production rollback
authority and is not proposed here.

## 5. Build 33 compatibility matrix

Stage A must leave every shipped call site working. Proven by
`supabase/tests/build33-compat.test.sql` (37 assertions), which exercises the shipped
shapes as BOTH `authenticated` and `anon`, then applies Stage B in-transaction as a
negative control for each half.

**Stage B has TWO halves.** An earlier draft of this packet described only the first,
which would have put a decision to the owner at about half its real scope.

*Authenticated half* — `public.users`:

| Shipped call site | After Stage A | After Stage B |
|---|---|---|
| `src/lib/admin.ts:31` `select('is_admin')` | works | 42501 → shipped catch degrades to `isAdmin=false` |
| `src/lib/flags.ts:1682` `listLeaderboard()` | all users | silently 1 row |
| `src/lib/flags.ts:1702/1717` rank | true rank | silently always 1 |
| the four replacement RPCs | present, granted, unused | **still work** |

*Guest (`anon`) half* — five relations. `anon` is the default role for every web
session and native guest:

| Relation | After Stage A | After Stage B | Shipped reader |
|---|---|---|---|
| `flag_comments` | readable | 42501 | `listComments()` base columns |
| `flag_photos` | readable | 42501 | `listFlagPhotos()` |
| `point_events` | readable | 42501 | none — retained for production fidelity only |
| `flag_status_history_public` | grant kept | revoked | none reachable — see below |
| `flag_edit_history_public` | grant kept | revoked | none reachable — see below |

Two things an owner should know before deciding, both found by independent review:

- The two `_public` relations are `security_invoker` views and `anon` has **never**
  had privileges on their base tables. The view grant confers nothing on its own, so
  these were never a working guest path. Stage A keeps the grants only because
  production has them.
- The shipped `listComments()` selects `COMMENT_SELECT`, which embeds
  `users!flag_comments_user_id_fkey(display_name)`. `anon` has no SELECT on
  `public.users` — not before Phase 03A, not after, and **not in production**. So the
  guest comment list is **already broken today**, independently of anything here.
  Phase 03A neither causes nor fixes it. Recorded because a reader of the row above
  would otherwise assume Stage A restored a working guest comment list.

**FDA-026 is OPEN, not closed.** Stage B is withheld from the apply set and needs a
separate owner authorization carrying release-capability proof.

## 6. What the owner must decide

1. **STAGE-MF-03** — provision the production Vault secret for the FDA-028 limiter epoch key
   yourself (the exact name is the one read by the limiter migration). Never copy the staging secret. Without it `limiter.current_epoch_key`
   cannot derive a key. No agent should create it.
2. **STAGE-MF-05** — whether to apply at all while `ROLLOUT_STAGE` is
   `S3_LIMITER_PRESENT_BYPASS_OPEN`, i.e. shipping a correct limiter that nothing yet
   calls. A legitimate choice; it must be *chosen*.
3. **Stage B timing** — what counts as proof that no client is still in the field
   reading `public.users` directly **or** reading `flag_comments` / `flag_photos` as a
   guest. Both halves gate on the same evidence. "We shipped an update" is not proof.
4. **STAGE-MF-04** — accept the hardcoded production webhook URL in
   `20260904000400` together with the operational rule below, or require it to become
   environment-derived, which makes that adoption candidate diverge from the function
   production actually has and needs an explicit contract-truth exception.
5. **Production thresholds** — still `DEFERRED`. Staging values (5 / 50 / 86400 / 32 /
   64 / 1) are test values and must not become production policy by default.

These are placed together, deliberately: the acceptor's point was that the Build 33
sequencing decision must sit *alongside* the bypass decision, not after it.

## 7. First-run evidence reusable without rerun

| Evidence | Status |
|---|---|
| Staging identity, Phase 02 baseline reconciliation | reuse |
| Hosted concurrency 25→8/17, 0 orphans | reuse — `OP_HOSTED_CONCURRENCY.json` |
| R6-1 / R6-2 / R6-3 | reuse — no limiter byte changed |
| Hosted IPv6 normalization (24 assertions) | reuse |
| DNS finding: no AAAA on either ingest hostname | reuse |

## 8. What MUST be repeated on the rerun

| Test | Why |
|---|---|
| Hosted pgTAP, now **254** assertions | the suite set changed (+37 Build 33, authenticated *and* guest) and two suites were edited |
| Role/authorization matrix | `public.users` grants changed (Stage A `is_admin` retention) |
| FDA-028 hosted acceptance (38) | unchanged bytes, but re-run after any apply as a regression check |
| Restoration + reapply | rollback semantics changed in two files |
| Structural capture ×3 | now retained as artifacts, per STAGE-MF-02 |
| Ledger identity verification | new gate; must pass before the run is called good |

**Invalidated by these fixes:** any claim resting on the old
`phase03a-foundation.test.sql` FDA-026 assertions (five were realigned to the Stage A
posture), and the previous 217-assertion count.

## 9. Structural catalog capture plan (STAGE-MF-02)

Capture with `scripts/structural-catalog.mjs` at three points — `FIRST_APPLY`,
`RESTORED`, `REAPPLY` — writing `CATALOG_<label>.json` **before** any checksum is
reported. Each artifact carries schema version, capture-tool identity, capture-query
hash, source/integration SHA, target, normalization rules, justified volatile-field
exclusions and its checksum. Then diff first↔restored and first↔reapply and classify
every residual. Nothing structural may be excluded to make checksums agree.

Known and relevant: the local round trip is **exact** (`restorationExact` and
`reapplyDeterministic` both true). The hosted `09c42928` vs `c70e119a` divergence does
**not** reproduce locally, which narrows it to the hosted environment or the hosted
apply mechanism rather than the SQL. That is a narrowing, not a diagnosis.

## 10. Vault and webhook preconditions

- Staging keeps exactly one Vault secret: the FDA-028 limiter epoch key. Its exact
  name is the one the limiter migration reads; no value appears in any receipt.
- **`webhook_secret` must never exist on a non-production target.** `20260904000400` is
  in the apply set and recreates `notify_flag_status_webhook()` with a hardcoded
  production URL; the absent secret is the only thing keeping a non-production database
  from calling production's Edge Function. Asserted by
  `src/__tests__/webhookTargetCoupling.guard.test.ts`.

## 11. Standing status

```
STAGING_MUTATIONS:            NONE
PRODUCTION_MUTATIONS:         NONE
PREVIOUS_PRODUCTION_PACKET:   SUPERSEDED_BY_STAGE_MANDATORY_FIXES
STAGING_CLEANUP_SAFE:         NO
STAGING_CLEANUP_REQUIRED:     YES
FDA_026:                      OPEN until the Stage B cutover
FDA_028:                      NOT production-closed; bypass still open (S3)
IPV6_TRANSPORT:               OPEN
PRODUCTION_THRESHOLDS:        DEFERRED
```

The next staging run must begin with **fresh current-state reconciliation**. The branch
has been sitting since the first run and now holds the *diverged* catalog `c70e119a`,
not the first-apply catalog. Do not assume its state.
