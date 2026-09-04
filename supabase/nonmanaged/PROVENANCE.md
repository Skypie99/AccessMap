# `supabase/nonmanaged/` — provenance record

**Established:** Phase 02A, 2026-09-03 · **Verified against:** read-only catalog capture of
project `kldlwszpfkdmsjrjhjym`, 2026-09-04T06:01:12Z, fingerprint `2ac50a3fe61c949c2b5e66ef9daa7952`.

Nothing in this directory is part of the managed migration lineage. `supabase/migrations/` is the
only directory the CLI applies. Files here are evidence, drafts, or records of history that happened
outside the ledger. **No file in this tree may be moved into `supabase/migrations/` under a version
at or before the ledger head `20260830130000`** — see `supabase/contract/migration-crosswalk.v1.json`.

Two claims are kept strictly apart throughout:

| Claim | Means | Evidence |
|---|---|---|
| **live in hosted catalog** | the object exists in production right now | read-only `pg_catalog` query |
| **recorded applied** | the version is in `supabase_migrations.schema_migrations` | `list_migrations` |

An object can be the first without being the second. That is what `live-out-of-band/` records.

---

## `live-out-of-band/` — applied to production, never recorded in the ledger

| File | Live? | Ledger? | Phase 02A verification |
|---|---|---|---|
| `2026-08-27_d1sa_deployed_security_containment.sql` | **YES** | no | All 6 claimed object groups independently reconfirmed — see below |
| `2026-06-03_verify_webhook_secret.sql` | **YES** | no (superseded) | `verify_webhook_secret(incoming text)` live, `search_path=public, vault`, EXECUTE **not** granted to anon/PUBLIC. Ledger records the reconciliation versions `20260603002420` and `20260727075547` instead. |
| `2026-05-30_flag_rate_limit_check_flag_rate_limit_variant.sql` | **YES** | no | `check_flag_rate_limit()` live as a trigger function alongside `check_flag_creation_rate_limit()`; both bound to `flags` BEFORE INSERT |

### D1S-A object-by-object reconfirmation (2026-09-04)

| Claimed effect | Live catalog says | Verdict |
|---|---|---|
| RLS enabled on all 7 `bk_2026_08_22_*` tables | `relrowsecurity = true` on all 7 | CONFIRMED |
| all privileges revoked from `public`, `anon`, `authenticated` on those 7 | zero grants to anon/authenticated/public on all 7 | CONFIRMED |
| `flag-photos auth upload` requires uid folder | policy live, `(storage.foldername(name))[1] = auth.uid()::text` | CONFIRMED |
| `flag-photos owner delete` requires uid folder | policy live, same predicate | CONFIRMED |
| `flag_photos: authenticated insert` ownership check | policy live, url-prefix + account + flag-owner checks | CONFIRMED |
| `flags status update by any authenticated` replacement | policy live with account-existence predicate | CONFIRMED |
| `increment_reopen_request` / `increment_dispute_request` EXECUTE revoked from public/anon | grantees are `authenticated, service_role, postgres` only | CONFIRMED |
| `enforce_flag_status_transition()` EXECUTE revoked | absent from the public/anon EXECUTE set | CONFIRMED |

**6 of 6 object groups confirmed live.** The file remains unrecorded in the ledger and stays here.

### Backup tables — open item carried to Phase 05

The 7 `bk_2026_08_22_*` tables are **contained but not erasable by any current code path**:

- zero foreign keys to `public.users`, `auth.users` or `public.flags` — so `ON DELETE CASCADE`
  never reaches them;
- `delete-account` v4 does not name them;
- they hold **66 rows covering 3 distinct `user_id` values** (of 5 live accounts) as of capture.

Account deletion therefore leaves identifiable reporter rows, comment text and photo URLs behind.
This extends **FDA-024** with a concrete mechanism the audit did not record. Owner: Jordan + Phase 05.
No Phase 02 change is proposed — reading this out is the deliverable; the disposition is a privacy
decision, not a lineage decision.

---

## `proposed/` — drafts, never applied anywhere

Twelve files. None is live; none is in the ledger. Phase 02A reconfirmed absence for the ones the
shipped client depends on:

| File | Objects | Client depends on it? |
|---|---|---|
| `2026-08-27_d1_option_a_account_deletion.sql` | account-deletion path | indirectly (FDA-003) |
| `2026-08-27_d1f4_async_account_deletion.sql` | async erasure | indirectly (FDA-003/024) |
| `20260828000000_d1f4r2_source_repair.sql` | D1F4 repair | no |
| `20260828010000_d1f4r3_source_closure.sql` | D1F4 closure | no |
| `20260828020000_d1f4r3_fix2_review_replay_and_flag_delete.sql` | `delete-flag` support | **yes — FDA-002** |
| `20260828030000_d1f4r3_fix3_review_audit.sql` | review audit | no |
| `2026-06-18_monthly_leaderboard_rpc_PROPOSED.sql` | `list_monthly_leaderboard` | yes, but **gracefully degraded** |
| `2026-06-01_flag_photos_insert_guard.sql` | photo insert guard | superseded by live policy |
| `2026-06-01_function_exec_and_search_path_hardening.sql` | grants hardening | superseded in part (FDA-010 residual) |
| `2026-06-09_status_transition_guard_PROPOSED.sql` | transition guard | superseded by applied `20260819204409` |
| `2026-07-16_fork5_dispute_counter_PROPOSED.sql` | dispute counter | superseded by applied `20260727075821` |
| `2026-05-24_realtime_flags.sql.deprecated-option1-do-not-apply` | realtime | no — deprecated |

`to_regprocedure` confirms **zero** photo-upload-intent functions and **zero** deletion-operation
functions exist at any signature, so none of these has been quietly applied under another name.

---

## `manual/`, `destructive-data/`, `rollback-recovery/`

- **`manual/`** — seven historical hand-run scripts. Their *effects* are represented by recorded
  ledger versions; the files are kept as authoring provenance, not as replay sources.
- **`destructive-data/`** — four data scripts. **Never replayable.** `2026-08-22_takedown_junk_flags_APPLIED.sql`
  is what created the `bk_2026_08_22_*` snapshots. A replay harness must exclude this directory
  entirely.
- **`rollback-recovery/`** — one rollback and six 2026-07-27 drift captures. Restoration inputs only.

---

## Rules this directory is under

1. Applied versions in `supabase/migrations/` are immutable — never renamed, edited or replayed.
2. Every future change is a **new** migration strictly after `20260830130000`.
3. A file here is never promoted by renaming it into an applied-looking version.
4. `destructive-data/` is excluded from every automated replay.
5. A receipt is not proof of deployment. Only a fresh catalog capture is.
