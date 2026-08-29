# Migration History Map Repair — Evidence Report — 2026-08-28

## ⚠️ 2026-08-28 CORRECTION NOTICE (this repair)

The version of this report shipped on branch
`claude/migration-map-repair-20260828-328d1f` (candidate SHA
`c74fbd682b52a3a496af91ab1d3a3a7c4663e1d4`) was **independently re-audited
and found FAIL**. It undercounted the hosted ledger (stated "66-entry
ledger" / "23 claimed matches" when the true, read-only-confirmed hosted
ledger contains **69 versions**), and two of its 23 claimed "ledger-matched"
files did not truthfully reproduce the hosted-recorded SQL for their
claimed version. This document has been **rewritten in place** to state the
corrected, truthful state. See "What changed in this repair" below for the
itemized diff against the prior (false) version of this report.

## Scope and authority

Repository-only migration-history **truth repair**, correcting the failed
first repair attempt above. No hosted mutation of any kind occurred in
either the original repair or this correction. No `supabase db push`, no
`supabase migration repair`, no hosted SQL write, no SQL Editor write, no
Storage/Auth mutation, no deployment, no merge. All hosted access this
session was read-only: `list_projects`, `list_migrations`, and `execute_sql`
issued exclusively with `SELECT` statements against
`supabase_migrations.schema_migrations`, `pg_proc`, `pg_trigger`,
`pg_policy`, `pg_class`, and `pg_attribute`/`col_description`.

- **Prior (failed) repair branch:** `claude/migration-map-repair-20260828-328d1f`
- **Prior (failed) repair SHA:** `c74fbd682b52a3a496af91ab1d3a3a7c4663e1d4`
- **Base commit (MOD1/MOD1R, unchanged ancestor of both repairs):**
  `f36d359992e248f494dc0c75f141b21f956d667e` (verified full 40-character
  commit; this repair's worktree was likewise auto-created off `origin/main`
  tip `a0bf4d0` with zero unique commits, and was corrected to the required
  base — `claude/migration-map-repair-fix2-20260828` branched exactly from
  `c74fbd682b52a3a496af91ab1d3a3a7c4663e1d4` — before any repair work began)
- **This repair branch:** `claude/migration-map-repair-fix2-20260828`
- **Hosted project (read-only access only):** `kldlwszpfkdmsjrjhjym` ("Accessable
  City App")
- **Hosted migration ledger tip (confirmed via read-only `list_migrations`):**
  `20260819214410` (`photo_alt_text`)
- **Hosted migration ledger size (confirmed via read-only `list_migrations`
  AND a separate read-only `SELECT count(*) ... FROM
  supabase_migrations.schema_migrations` cross-check):** **69 versions**

## What changed in this repair

1. **Recount:** the hosted ledger has **69** versions, not "66" (D1S-A
   section) or the "23 claimed" figure used throughout the prior report.
   Only **21** of those 23 previously-claimed "LEDGER-MATCHED" files
   actually reproduced their claimed hosted version's recorded SQL.
2. **Two false matches corrected** (Blocker 1) — see next section.
3. **46 hosted versions that had no local managed counterpart at all** were
   materialized from the exact hosted-recorded SQL (Blocker 2).
4. **MOD1R FIX1 test harness** (`supabase/tests/mod1r_fix1/00_baseline.sql`)
   referenced a migration path, `supabase/migrations/2026-05-23_feedback_table.sql`,
   that no longer exists under that name. Repointed to the correct current
   canonical managed file, `supabase/migrations/20260524211752_feedback_table.sql`
   (Blocker 3).
5. **D1S-A stale header** — comment-only correction of a now-false "not
   applied" claim (Blocker 4).
6. **This report rewritten** to state the corrected counts, corrected
   classifications, and the full truthful 69-version table (Blocker 4).

Nothing else about the prior repair's work was reopened: its `git mv`
classification of the ambiguous/rollback/destructive/proposed/live-out-of-band
files (the ones NOT part of the 23 originally-claimed ledger matches) was
accepted as-is per this task's explicit "do not reopen unrelated migration
archaeology" instruction, and is unaffected by the corrections above.

## Blocker 1 — the two false "LEDGER-MATCHED" claims, corrected

### `20260530064949` — claimed name `flag_creation_rate_limit`

- **Prior claim:** the repo file previously checked in at
  `supabase/migrations/20260530064949_flag_creation_rate_limit.sql`
  (function `check_flag_rate_limit()` / trigger `enforce_flag_rate_limit`)
  truthfully represented the hosted version `20260530064949`.
- **Ground truth (read-only):** the hosted-recorded SQL for
  `20260530064949` defines a **different** function/trigger pair —
  `check_flag_creation_rate_limit()` / `enforce_flag_creation_rate_limit`.
  No hosted ledger version, at any timestamp, contains the
  `check_flag_rate_limit()` / `enforce_flag_rate_limit` implementation.
- **Live-catalog cross-check:** both function names AND both trigger names
  are simultaneously live in the hosted database right now (`pg_proc`:
  `check_flag_rate_limit` and `check_flag_creation_rate_limit` both present
  with source; `pg_trigger`: `enforce_flag_rate_limit` and
  `enforce_flag_creation_rate_limit` both present). These are two genuinely
  separate historical changes, not one migration under two names.
- **Corrected disposition:**
  - `supabase/migrations/20260530064949_flag_creation_rate_limit.sql` now
    contains the exact hosted-recorded SQL for `20260530064949`
    (`check_flag_creation_rate_limit()` / `enforce_flag_creation_rate_limit`).
  - The prior (wrong-version) artifact was preserved, unmodified except for
    an added classification header comment, at
    `supabase/nonmanaged/live-out-of-band/2026-05-30_flag_rate_limit_check_flag_rate_limit_variant.sql`.
  - **Classification: live-out-of-band** — justified by live-catalog proof
    (function + trigger both confirmed live), not asserted without
    evidence.

### `20260529175840` — claimed name `notification_preferences`

- **Prior claim:** the repo file previously checked in at
  `supabase/migrations/20260529175840_notification_preferences.sql`
  truthfully represented the hosted version `20260529175840`.
- **Ground truth (read-only):** the hosted-recorded SQL for `20260529175840`
  guards every `CREATE POLICY` with a preceding `DROP POLICY IF EXISTS` and
  contains **no** `COMMENT ON COLUMN` statements. The prior repo file
  omitted the three `DROP POLICY IF EXISTS` guards and added **four**
  `COMMENT ON COLUMN` statements (on `flag_status_updates`, `nearby_flags`,
  `watched_flag_updates`, `bulk_watch_alerts`) that do not exist in the
  hosted-recorded SQL for this or any other ledger version.
- **Live-catalog cross-check:** `public.notification_preferences` and its 3
  policies are live (confirmed via `pg_policy`), but `col_description()`
  returns `NULL` for all 4 of the columns the old artifact claims to
  comment — i.e. those 4 `COMMENT ON COLUMN` statements were never actually
  executed against the live database either. The old artifact does not
  match the hosted ledger AND does not match live catalog state.
- **Corrected disposition:**
  - `supabase/migrations/20260529175840_notification_preferences.sql` now
    contains the exact hosted-recorded SQL for `20260529175840`.
  - The prior artifact was preserved, unmodified except for an added
    classification header comment, at
    `supabase/nonmanaged/manual/2026-05-29_notification_preferences_draft.sql`.
  - **Classification: manual/ambiguous** (NOT live-out-of-band — there is
    no live-catalog evidence proving this exact artifact was ever applied
    as written; per the task's explicit rule, live-out-of-band requires
    live-catalog proof, which does not exist here).

## Blocker 2 — 46 hosted versions reconstructed from exact hosted SQL

46 of the 69 hosted ledger versions had **no** local managed migration file
under any name prior to this repair. All 46 were materialized by reading
the exact stored SQL from `supabase_migrations.schema_migrations.statements`
via read-only `execute_sql` and writing it verbatim (statements joined with
newlines, no reformatting, no reordering) into a new file at
`supabase/migrations/<hosted version>_<hosted name>.sql`, prefixed with a
short factual provenance comment (version, hosted name, "reconstructed from
the hosted ledger, no pre-existing local file"). No SQL was inferred,
guessed, or reconstructed from the current live schema — every character of
executable SQL in these 46 files came directly from the hosted ledger's own
`statements` column.

## Full 69-version hosted/local table

Every one of the 69 hosted ledger versions, in order, with its current
local managed file and this repair's disposition:

| Hosted version | Hosted name | Local managed file | Disposition |
|---|---|---|---|
| 20260523020620 | accessmap_schema | 20260523020620_accessmap_schema.sql | RECONSTRUCTED (was missing) |
| 20260523021433 | accessmap_security_hardening | 20260523021433_accessmap_security_hardening.sql | RECONSTRUCTED (was missing) |
| 20260523093244 | rls_initplan_rewrite_and_non_owner_status_update | 20260523093244_rls_initplan_rewrite_and_non_owner_status_update.sql | RECONSTRUCTED (was missing) |
| 20260523202748 | data_layer_hardening | 20260523202748_data_layer_hardening.sql | RECONSTRUCTED (was missing) |
| 20260523203409 | set_flag_updated_at_search_path | 20260523203409_set_flag_updated_at_search_path.sql | RECONSTRUCTED (was missing) |
| 20260524211752 | feedback_table | 20260524211752_feedback_table.sql | pre-existing true match (unchanged) |
| 20260524211803 | flag_context_tags | 20260524211803_flag_context_tags.sql | pre-existing true match (unchanged) |
| 20260524211825 | flag_status_history | 20260524211825_flag_status_history.sql | pre-existing true match (unchanged) |
| 20260527043142 | 2026-05-25_flag_edit_rls | 20260527043142_flag_edit_rls.sql | pre-existing true match (unchanged) |
| 20260528101406 | 2026-05-25_push_tokens | 20260528101406_push_tokens.sql | pre-existing true match (unchanged) |
| 20260528180513 | d1_flags_rls | 20260528180513_d1_flags_rls.sql | RECONSTRUCTED (was missing) |
| 20260528180527 | d3_flag_status_trigger | 20260528180527_d3_flag_status_trigger.sql | RECONSTRUCTED (was missing) |
| 20260528230556 | data_layer_hardening | 20260528230556_data_layer_hardening.sql | RECONSTRUCTED (was missing) |
| 20260528230609 | rls_initplan_and_non_owner_status_update | 20260528230609_rls_initplan_and_non_owner_status_update.sql | RECONSTRUCTED (was missing) |
| 20260528230627 | flag_edit_rls_replacement_idempotent | 20260528230627_flag_edit_rls_replacement_idempotent.sql | RECONSTRUCTED (was missing) |
| 20260528230637 | status_update_trigger | 20260528230637_status_update_trigger.sql | RECONSTRUCTED (was missing) |
| 20260529021624 | 2026_05_27_users_email_privacy | 20260529021624_2026_05_27_users_email_privacy.sql | RECONSTRUCTED (was missing) |
| 20260529021646 | 2026_05_25_push_tokens_complete | 20260529021646_2026_05_25_push_tokens_complete.sql | RECONSTRUCTED (was missing) |
| 20260529043740 | d3_status_trigger_unblocks_marker_clustering | 20260529043740_d3_status_trigger_unblocks_marker_clustering.sql | RECONSTRUCTED (was missing) |
| 20260529043753 | d1_flag_edit_rls_fix | 20260529043753_d1_flag_edit_rls_fix.sql | RECONSTRUCTED (was missing) |
| 20260529043805 | push_tokens_table_fix | 20260529043805_push_tokens_table_fix.sql | RECONSTRUCTED (was missing) |
| 20260529043812 | email_privacy_closes_pii_exposure | 20260529043812_email_privacy_closes_pii_exposure.sql | RECONSTRUCTED (was missing) |
| 20260529050514 | d3_status_update_trigger | 20260529050514_d3_status_update_trigger.sql | RECONSTRUCTED (was missing) |
| 20260529053642 | d4_realtime_flags_filtered_broadcast | 20260529053642_d4_realtime_flags_filtered_broadcast.sql | RECONSTRUCTED (was missing) |
| 20260529060837 | d6_flag_edit_history | 20260529060837_d6_flag_edit_history.sql | RECONSTRUCTED (was missing) |
| 20260529063432 | 2026_05_25_flag_edit_history_table | 20260529063432_flag_edit_history_table.sql | pre-existing true match (unchanged) |
| 20260529084003 | 2026_05_27_users_email_privacy | 20260529084003_2026_05_27_users_email_privacy.sql | RECONSTRUCTED (was missing) |
| 20260529084007 | 2026_05_23_status_update_trigger_proposal | 20260529084007_status_update_trigger_applied.sql | pre-existing true match (unchanged) |
| 20260529084113 | 2026_05_23_rls_initplan_and_non_owner_status_update | 20260529084113_2026_05_23_rls_initplan_and_non_owner_status_update.sql | RECONSTRUCTED (was missing) |
| 20260529084118 | 2026_05_28_d4_realtime_flags_filtered | 20260529084118_d4_realtime_flags_filtered.sql | pre-existing true match (unchanged) |
| 20260529084136 | 2026_05_23_data_layer_hardening_fix | 20260529084136_2026_05_23_data_layer_hardening_fix.sql | RECONSTRUCTED (was missing) |
| 20260529084138 | 2026_05_25_flag_edit_rls_replacement_fix | 20260529084138_2026_05_25_flag_edit_rls_replacement_fix.sql | RECONSTRUCTED (was missing) |
| 20260529175048 | latlong_range_constraint | 20260529175048_latlong_range_constraint.sql | pre-existing true match (unchanged) |
| 20260529175840 | notification_preferences | 20260529175840_notification_preferences.sql | **REPLACED (was false match — see Blocker 1)** |
| 20260529175842 | anon_flags_select | 20260529175842_anon_flags_select.sql | pre-existing true match (unchanged) |
| 20260529181141 | notify_flag_status_webhook_trigger | 20260529181141_notify_flag_status_webhook_trigger.sql | RECONSTRUCTED (was missing) |
| 20260529192005 | function_search_path_hardening | 20260529192005_function_search_path_hardening.sql | pre-existing true match (unchanged) |
| 20260529192027 | status_update_trigger_d3 | 20260529192027_status_update_trigger_d3.sql | RECONSTRUCTED (was missing) |
| 20260529192040 | users_email_privacy | 20260529192040_users_email_privacy.sql | RECONSTRUCTED (was missing) |
| 20260530064949 | flag_creation_rate_limit | 20260530064949_flag_creation_rate_limit.sql | **REPLACED (was false match — see Blocker 1)** |
| 20260530192824 | flag_creation_rate_limit_hardened | 20260530192824_flag_creation_rate_limit_hardened.sql | RECONSTRUCTED (was missing) |
| 20260530192829 | flag_comments_table | 20260530192829_flag_comments.sql | pre-existing true match (unchanged) |
| 20260530193228 | flag_reopen_requests | 20260530193228_flag_reopen_requests.sql | RECONSTRUCTED (was missing) |
| 20260531015433 | fix_flag_comments_default_user_id | 20260531015433_fix_flag_comments_default_user_id.sql | RECONSTRUCTED (was missing) |
| 20260531015456 | flag_reopen_requests | 20260531015456_flag_reopen_requests.sql | RECONSTRUCTED (was missing) |
| 20260531025237 | flag_photos_junction | 20260531025237_flag_photos_junction.sql | pre-existing true match (unchanged) |
| 20260531202835 | trust_score_system | 20260531202835_trust_score_system.sql | pre-existing true match (unchanged) |
| 20260601081834 | account_deletion_cascade | 20260601081834_account_deletion_cascade.sql | pre-existing true match (unchanged) |
| 20260601081846 | anon_flag_reporting_photo_fix | 20260601081846_anon_flag_reporting_photo_fix.sql | pre-existing true match (unchanged) |
| 20260602045352 | drop_duplicate_index_flags | 20260602045352_drop_duplicate_index_flags.sql | RECONSTRUCTED (was missing) |
| 20260602045356 | add_covering_indexes_foreign_keys | 20260602045356_add_covering_indexes_foreign_keys.sql | RECONSTRUCTED (was missing) |
| 20260602053139 | flags_policy_consolidation_20260601 | 20260602053139_flags_policy_consolidation_20260601.sql | RECONSTRUCTED (was missing) |
| 20260602053522 | restore_flags_auth_user_only_triage_unblock_20260601 | 20260602053522_restore_flags_auth_user_only_triage_unblock_20260601.sql | RECONSTRUCTED (was missing) |
| 20260602060359 | flags_close_nonowner_delete_and_fix_triage_20260601 | 20260602060359_flags_close_nonowner_delete_and_fix_triage.sql | pre-existing true match (unchanged) |
| 20260603002810 | admin_role | 20260603002810_admin_role.sql | pre-existing true match (unchanged) |
| 20260727075327 | sr009_flag_verifications_null_safe_20260727 | 20260727075327_sr009_flag_verifications_null_safe_20260727.sql | RECONSTRUCTED (was missing) |
| 20260727075349 | fork2_oa_actor_guard_null_safe_plus_status_history_20260727 | 20260727075349_fork2_oa_actor_guard_null_safe_plus_status_history_20260727.sql | RECONSTRUCTED (was missing) |
| 20260727075512 | a4_3_owner_edit_subquery_alias_fix_20260727 | 20260727075512_a4_3_owner_edit_subquery_alias_fix_20260727.sql | RECONSTRUCTED (was missing) |
| 20260727075530 | sr024_flag_photos_anon_explicit_20260727 | 20260727075530_sr024_flag_photos_anon_explicit_20260727.sql | RECONSTRUCTED (was missing) |
| 20260727075547 | sr018_verify_webhook_secret_revoke_20260727 | 20260727075547_sr018_verify_webhook_secret_revoke.sql | pre-existing true match (unchanged) |
| 20260727075605 | a2_1_nonowner_revert_context_tags_20260727 | 20260727075605_a2_1_nonowner_revert_context_tags_20260727.sql | RECONSTRUCTED (was missing) |
| 20260727075623 | a2_2_feedback_anon_throttle_20260727 | 20260727075623_a2_2_feedback_anon_throttle_20260727.sql | RECONSTRUCTED (was missing) |
| 20260727075638 | sr001_admin_delete_comment_20260727 | 20260727075638_sr001_admin_delete_comment_20260727.sql | RECONSTRUCTED (was missing) |
| 20260727075651 | a4_1_status_history_view_grant_fix_20260727 | 20260727075651_a4_1_status_history_view_grant_fix_20260727.sql | RECONSTRUCTED (was missing) |
| 20260727075749 | rls_initplan_consolidated_20260727 | 20260727075749_rls_initplan_consolidated_20260727.sql | RECONSTRUCTED (was missing) |
| 20260727075821 | fork5_w1_dispute_counter_20260727 | 20260727075821_fork5_w1_dispute_counter_20260727.sql | RECONSTRUCTED (was missing) |
| 20260729053159 | sr050_admin_delete_flag_photo_20260729 | 20260729053159_sr050_admin_delete_flag_photo_20260729.sql | RECONSTRUCTED (was missing) |
| 20260819204409 | flag_status_transition_guard | 20260819204409_flag_status_transition_guard.sql | pre-existing true match (unchanged) |
| 20260819214410 | photo_alt_text | 20260819214410_photo_alt_text.sql | pre-existing true match (unchanged) |

**Totals:** 21 pre-existing true matches + 2 replaced + 46 reconstructed = **69**.

## Accepted pending (MOD1 candidate range — unchanged, byte-for-byte)

| Version | Filename |
|---|---|
| 20260828040000 | mod1_moderation_release_safety.sql |
| 20260828050000 | mod1_admin_report_queue.sql |
| 20260828060000 | mod1r_fix1_report_and_insert_authz.sql |
| 20260828070000 | mod1r_fix1_pending_close_state.sql |
| 20260828080000 | mod1r_fix2_action_intent.sql |

Verified via `git hash-object` against the accepted candidate SHA
`c74fbd682b52a3a496af91ab1d3a3a7c4663e1d4`: all 5 blobs identical
(byte-for-byte). Not touched by this repair's file-generation script (which
explicitly refuses to write to any of these 5 versions).

## Final managed migration directory

**74 files total** in `supabase/migrations/`: 69 exact hosted-ledger
migrations (21 pre-existing + 2 replaced + 46 reconstructed) + 5 unchanged
accepted-pending MOD1/MOD1R migrations. No duplicate 14-digit versions. No
date-only (`2026-MM-DD_*`) versions remain in the managed directory.

## Blocker 3 — MOD1R proof harness repair

`supabase/tests/mod1r_fix1/00_baseline.sql` line 189 referenced
`supabase/migrations/2026-05-23_feedback_table.sql`, a path that has never
existed under this repair or the prior one (the managed file for this
content was always `20260524211752_feedback_table.sql` — a pre-existing
true match, unmodified by either repair). This was a stale reference left
over from before the original migration-map repair, not something either
repair broke.

**Fix:** repointed the `\i` directive to
`supabase/migrations/20260524211752_feedback_table.sql` — confirmed by
inspection to `create table public.feedback`, `enable row level security`,
and define all 4 policies the harness's own sanity check (line ~203,
`relrowsecurity` on `public.feedback`) depends on. No other line in the
harness changed. This is the correct canonical managed migration for the
content the harness needs (public.feedback with RLS) — not a fixture
substitution, since the identity match is exact (same version, same table,
same policies).

The second referenced concern — a test/reference expecting
`2026-06-01_perf_fk_covering_indexes.sql` — was checked: no `.sql` test file
under `supabase/tests/` references that filename (confirmed via repo-wide
grep). It is correctly quarantined at
`supabase/nonmanaged/manual/2026-06-01_perf_fk_covering_indexes.sql` from
the prior repair (unaffected by this repair — it does not correspond to any
single hosted ledger version, since its content spans two distinct ledger
entries, `20260602045352_drop_duplicate_index_flags` and
`20260602045356_add_covering_indexes_foreign_keys`, both now present as
their own reconstructed managed files above). Nothing further to fix here.

**Harness result:** see "MOD1/MOD1R proof harness" below.

## Blocker 4 — D1S-A stale header corrected

`supabase/nonmanaged/live-out-of-band/2026-08-27_d1sa_deployed_security_containment.sql`
line 4 read "LOCAL ARTIFACT ONLY. This migration has not been applied to
Supabase." — accurate when authored (2026-08-27), now contradicted by
read-only catalog evidence: `pg_class.relrowsecurity = true` for all 7
`bk_2026_08_22_*` backup tables this file's SQL targets, confirming its
effects are live. **Corrected with a comment-only addition** (the original
line is preserved below it, unmodified, for provenance) — no executable SQL
statement in this file was touched. The correction explicitly distinguishes
"live in hosted catalog" (true, newly confirmed) from "recorded applied in
the hosted migration ledger" (false — still absent from
`supabase_migrations.schema_migrations` under any version, and still
excluded from managed execution by living in `nonmanaged/`).

## SQL content integrity

- The 21 pre-existing true-match files: **byte-for-byte unchanged** by this
  repair (verified — this repair's file-generation script only ever writes
  to the 46 previously-missing versions and the 2 false-match versions,
  enforced by an explicit exclusion set in the script itself).
- The 2 replaced files: now contain the exact hosted-recorded SQL for their
  version, verified below.
- The 46 reconstructed files: contain the exact hosted-recorded SQL for
  their version, verified below.
- The 5 accepted-pending MOD1/MOD1R files: **byte-for-byte unchanged**,
  verified via `git hash-object` against the accepted source SHA (see
  above).
- The prior repair's `git mv` classification of every other file (rollback,
  destructive-data, proposed, the pre-existing live-out-of-band entries) was
  not reopened or touched.

### Hosted/local SQL parity — 69 / 69

For every one of the 69 hosted ledger versions, the local managed file's
content and the hosted-recorded `statements` array were both normalized
(strip `--` line comments, collapse whitespace) and compared for exact
equality. Comment normalization only strips comment text — it does not, and
cannot, hide a differing executable statement, added/removed clause, or
reordered statement, since those survive normalization unchanged.

**Result: 69 / 69 exact normalized matches. 0 missing. 0 duplicate hosted
versions mapped to more than one local file.**

One byte-level note: the hosted-recorded SQL for `20260531015433`
(`fix_flag_comments_default_user_id`) contains one incidental trailing
space, mid-statement, before the line break between `ALTER TABLE
public.flag_comments` and `ALTER COLUMN user_id SET DEFAULT auth.uid();`.
This trailing space has no effect on SQL parsing or execution (whitespace
before a newline inside a single multi-line statement) and was trimmed in
the local file solely to satisfy `git diff --check` — it is not a
"meaningful SQL difference" under this task's own normalization rule, and
no token, clause, or statement was added, removed, or reordered.

## Static verification

| Check | Result |
|---|---|
| Hosted ledger size (read-only `list_migrations` + `count(*)` cross-check) | 69 — PASS |
| Local hosted-history managed file count (excludes the 5 MOD1 pending) | 69 — PASS |
| Hosted/local version parity (no missing, no invented, no duplicate) | 69 / 69 — PASS |
| Hosted/local SQL parity (normalized exact match) | 69 / 69 — PASS |
| 5 pending MOD1 files byte-for-byte unchanged (`git hash-object` vs `c74fbd682b52a3a496af91ab1d3a3a7c4663e1d4`) | 5 / 5 identical — PASS |
| Final managed file count | 74 (69 + 5) — PASS |
| No duplicate 14-digit versions | `ls supabase/migrations \| cut -c1-14 \| sort \| uniq -d` → empty — PASS |
| Every managed filename matches `^[0-9]{14}_.+\.sql$` | verified — PASS |
| `supabase/nonmanaged/**` excluded from normal execution | confirmed — this tree is not referenced by `supabase/config.toml`'s migration path, only `supabase/migrations/` is | PASS |
| `git diff --check` (whitespace) | PASS, no errors |
| No unrelated application/config file changed | `git status --short` shows only `supabase/migrations/`, `supabase/nonmanaged/`, `supabase/tests/mod1r_fix1/00_baseline.sql`, and this report | PASS |

## MOD1/MOD1R proof harness

`supabase/tests/mod1r_fix1/00_baseline.sql` (repaired, see Blocker 3) and
`supabase/tests/mod1r_fix1/10_proof.sql` (unmodified) run against an
ephemeral `postgres:16` service container via
`.github/workflows/mod1r-fix1-rls-proof.yml`. No local Docker/Postgres was
available in this environment (matching that workflow's own documented
constraint), so the harness was executed via that CI workflow against this
repair's pushed branch rather than locally. Result recorded in the final
response to this task, once the branch is pushed and the workflow run
completes.

## Confirmations

- NO hosted mutation occurred. Every hosted-project tool call this session
  was one of: `list_projects`, `list_migrations`, or `execute_sql` with a
  `SELECT`-only query (`schema_migrations`, `pg_proc`, `pg_trigger`,
  `pg_policy`, `pg_class`, `pg_attribute`/`col_description`).
- NO `supabase db push` was run.
- NO `supabase migration repair` was run.
- NO merge, deploy, or app-behavior change occurred.
- NO `.claude/**` or `~/ClaudeCorp/.claude/**` file was touched.

## Remaining ambiguity (disclosed, not hidden)

- The 6 files the prior repair classified as `manual/` (ambiguous, multiple
  plausible ledger candidates) were not reopened by this repair — they are
  outside the 23-file set the failed audit flagged, and re-litigating them
  is explicitly out of this task's scope ("do not reopen unrelated
  migration archaeology"). A future task could resolve them with deeper
  `pg_proc`/`pg_policy` forensics if desired.
- `20260828040000_mod1_moderation_release_safety.sql`'s header still cites
  `2026-08-19_flag_status_transition_guard_APPLIED.sql` by its pre-repair
  name (now `20260819204409_flag_status_transition_guard.sql`). This is a
  comment inside an accepted-pending MOD1 file; per the durability gate,
  those 5 files must stay byte-for-byte unchanged, so this stale
  cross-reference is disclosed here rather than edited.
