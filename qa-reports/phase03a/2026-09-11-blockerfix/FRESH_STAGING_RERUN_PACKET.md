# Phase 03A — FRESH STAGING RERUN authorization packet

> **GENERATING THIS PACKET IS NOT AUTHORIZATION.** No migration has been applied to
> the fresh branch. `FRESH_STAGING_MIGRATIONS_APPLIED: NONE`.
> Supersedes `2026-09-10-stagefix/STAGING_RERUN_AUTHORIZATION_PACKET.md`, whose
> target is the contaminated branch and is not usable.

## 1. Identities

| | |
|---|---|
| CODE (reviewed) | `3ac416e2cd19c7322061efb689abc5bebcef3a83` |
| CODE (integrated, +1 receipt) | `6d5beb0d653a059642783f81db1454f4c007b0bd` |
| CODE tree (reviewed) | `99ee18fbeb72e0f31d501f749df920d30ea907de` |
| INT merge | `f2c2fbef36e88289c9c2a0663e6f26fc974e0a2a` |
| INT tree | `96d8e38b37e881fa1f4d6e39cf5e276e1f51b833` |
| `STAGING_BLOCKER_CODE_REVIEW` | **PASS** (2 rounds) |
| `PHASE_03A_INT_GATE` | **PASS**, no mandatory changes |

## 2. Target

```
FRESH_STAGING_PROJECT_REF   cepayqmsoqxshsiyqnvz
FRESH_STAGING_BRANCH_ID     4a37413a-01c2-4ab2-8bf8-a17a42a549b8
NAME                        flagstone-p03a-rerun-clean-20260911
PARENT                      kldlwszpfkdmsjrjhjym   (production — NEVER a target)
with_data false · persistent false · is_default false · us-west-2 · ACTIVE_HEALTHY
```

**Starting ledger: 71 rows, exactly the local baseline, zero phantoms.** No Phase
03A objects, no limiter schema, empty Vault, and `users readable by authenticated`
still present — the correct pre-Stage-A posture.

**The old branch `ctshxbykuemeqnofqcdh` is EVIDENCE ONLY.** 82 rows, unmutated.
Never apply to it, never repair its ledger, never delete it under this program.

## 3. The exact apply set — 14 files

Five Phase 02 adoption artifacts, hashes byte-identical to accepted predecessor
`c2e36800`:

| version | file |
|---|---|
| 20260904000000 | adopt_private_admin_helper |
| 20260904000100 | drop_duplicate_status_triggers |
| 20260904000200 | adopt_d1sa_containment |
| 20260904000300 | adopt_live_insert_throttles |
| 20260904000400 | adopt_execute_revokes |

Nine Phase 03A Stage A candidates:

| version | file |
|---|---|
| 20260905055629 | phase03a_flag_policies |
| 20260905055630 | phase03a_open_inserts |
| 20260905055632 | phase03a_profile_updates |
| 20260905055633 | phase03a_contextual_profiles |
| 20260905055635 | phase03a_trigger_execute |
| 20260905055636 | phase03a_client_privileges |
| 20260905073925 | phase03a_effective_privileges |
| 20260909120000 | fda028_v4_limiter |
| 20260911120000 | phase03a_webhook_target_env_scoped |

**WITHHELD:** `20260911130000_phase03a_fda026_stage_b_cutover.sql`. FDA-026 stays
OPEN. Applying it silently breaks shipped Build 33 reads; it needs a separate
owner authorization carrying release-capability proof. Renumbered from
`20260910120000` so it still sorts after the Stage A correction; never applied
anywhere, so no history was rewritten.

Every hash is pinned in `supabase/migrations-next/phase03a/candidate-contract.json`
and re-verified against disk by the independent reviewer.

## 4. The supported workflow — already proven read-only against this branch

```bash
# 1. capture the ledger READ-ONLY
supabase db query --linked --project-ref cepayqmsoqxshsiyqnvz \
  "select version,name from supabase_migrations.schema_migrations order by version"

# 2. plan  (must return ok:true, refusals [])
node scripts/canonical-migration-identity.mjs plan --stage A --ledger <ledger.json>

# 3. build the isolated workspace
node scripts/canonical-apply-workspace.mjs build --ledger <ledger.json> --stage A
```

> **Read the `workspace` path out of that command's JSON and use THAT.** Do not pass
> `--out`: the CLI still accepts the flag but `buildWorkspace` deliberately ignores
> it, so a workspace you name is never created and `--workdir` then reports all 71
> baseline versions as missing-locally. Found the hard way while proving this
> packet. The next CODE round should make the CLI reject `--out` outright.

```bash
# 4. dry run, then apply — ONE target authority, never --linked
supabase db push --workdir <workspace> --project-ref cepayqmsoqxshsiyqnvz --dry-run
supabase db push --workdir <workspace> --project-ref cepayqmsoqxshsiyqnvz

# 5. verify the ledger told the truth (must return passed:true)
node scripts/canonical-migration-identity.mjs verify --stage A --ledger <ledger-after.json>

# 6. destroy the workspace
node scripts/canonical-apply-workspace.mjs destroy --workspace <workspace>
```

**Measured dry-run result on this branch:** "Would push these migrations" listing
exactly the 14 above, in canonical order. Ledger still 71 afterwards.

**PROHIBITED, both measured on the first run:** Management API `apply_migration`
(recorded the wall-clock apply time instead of the canonical version) and
`supabase db query --file` (recorded no ledger row at all).

## 5. Preconditions before applying

1. **Provision the staging limiter secret** `fda028_limiter_epoch_key` on
   `cepayqmsoqxshsiyqnvz`. Its Vault is empty. **Never copy the production secret.**
2. **`webhook_secret` must NEVER exist on this branch.** With `20260911120000`
   applied the endpoint is also required, so the coupling is doubly closed — but the
   rule stands regardless.
3. Do not create `webhook_endpoint` here either, unless the rerun deliberately
   tests webhook delivery against a staging-scoped endpoint. Absent = fails closed.

## 6. What the rerun must prove

| Test | Why |
|---|---|
| Ledger identity after apply | `verify` must return `passed:true` — every candidate exactly once under its canonical version. This is the check the first run had no way to make. |
| Build 33 **authenticated** compatibility | the breakage that made the first candidate unshippable |
| Build 33 **anon/guest** compatibility | the second breakage, found only because a reviewer assumed the `anon` role |
| Hosted pgTAP | report the ACTUAL count. Local composed is 254; do not assume hosted matches. |
| Role/authorization matrix | `public.users` grants changed |
| FDA-028 hosted acceptance | bytes unchanged, but re-run as a regression check |
| MF-04 reachability | endpoint now absent → must fail closed; `net.http_request_queue` must stay empty |
| MF-05 rollout | expect `S3_LIMITER_PRESENT_BYPASS_OPEN` |
| Round-trip capture ×3 | FIRST_APPLY / RESTORED / REAPPLY, retained as artifacts before hashing |
| Forward recovery | restoration is a NEW forward version; no ledger row is ever deleted |
| `db:snapshot:check` | was missing from my own gate list once already |

`IPV6_TRANSPORT` stays **OPEN** — no genuine IPv6 path exists; never simulate it.

## 7. Owner decisions still open

1. **MF-03** — provision the **production** limiter Vault secret yourself. No agent
   should create it. Separate production authorization.
2. **MF-04** — the production webhook URL is no longer hardcoded, but applying
   `20260911120000` to **production** before creating a `webhook_endpoint` Vault row
   would fail closed and **silently stop status notifications**. Safe, not harmless.
   The production packet must require creating it first.
3. **MF-05** — the legacy guest bypass stays open for Build 33 / pinned-web
   compatibility. Closing it is a coordinated native + web cutover.
4. **Stage B timing** — what counts as proof no client reads `public.users`
   directly. "We shipped an update" is not proof.
5. **Production thresholds** — still `DEFERRED`. The staging values are test values.

## 8. Known limits carried forward, not hidden

- A candidate applied with **no ledger row at all** is invisible to `auditLedger` —
  a ledger cannot detect silence. The defence is to apply only through the supported
  mechanism onto a target whose history is fully accounted for, which is exactly why
  this branch is fresh.
- `tmpRoot()` throws a raw `ENOENT` rather than a framed refusal when `TMPDIR` points
  nowhere. Fails safe; cosmetic; deliberately not taken after a review PASS.
- The `--out` trap in §4.
- `noCredentialsInTree.guard C` is **permanently red** on the integration lineage.
  It is a false positive — the "credentials" are `STAGE-MF-03/04/05`, finding IDs
  that happen to be 11 chars with uppercase, a digit and a hyphen. It predates this
  work. **It still needs fixing:** a red credential guard cannot distinguish a real
  credential from this noise.
- `listComments()`'s `users` embed raises for `anon`. Pre-existing, asserted as such.

## 9. Standing status

```
FRESH_STAGING_MIGRATIONS_APPLIED   NONE
OLD_STAGING_BRANCH                 RETAINED_AS_EVIDENCE, 82 rows, unmutated
PRODUCTION_MUTATIONS               NONE
PUSHES / MAIN_MERGES               NONE
FDA_026                            OPEN until the Stage B cutover
FDA_028                            not production-closed; bypass open (S3)
IPV6_TRANSPORT                     OPEN
PRODUCTION_THRESHOLDS              DEFERRED
PRODUCTION_AUTHORIZED              NO
```
