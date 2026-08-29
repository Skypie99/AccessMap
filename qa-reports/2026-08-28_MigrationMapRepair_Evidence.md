# Migration History Map Repair — Evidence Report — 2026-08-28

## Scope and authority

Repository-only migration-map repair per the prior independent read-only
migration-history reconciliation, which returned **FAIL — MIGRATION HISTORY
NOT SAFE TO ADVANCE** and prescribed exactly this as the smallest safe next
step. No hosted mutation of any kind occurred. No `supabase db push`, no
`supabase migration repair`, no hosted SQL write, no SQL Editor write, no
Storage/Auth mutation, no deployment, no merge.

- **Base branch:** `claude/mod1r-fix2-retry-durability-20260828`
- **Required base SHA:** `f36d359992e248f494dc0c75f141b21f956d667e` (verified
  full 40-character commit; worktree branch was reset to this exact SHA after
  discovering it had been auto-created from `origin/main` tip `a0bf4d0`
  instead — corrected before any repair work began, since the branch had zero
  unique commits and nothing pushed yet)
- **Repair branch:** `claude/migration-map-repair-20260828-328d1f`
- **Hosted project (read-only access only):** `kldlwszpfkdmsjrjhjym` ("Accessable
  City App")
- **Hosted migration ledger tip (confirmed via read-only `list_migrations`):**
  `20260819214410` (`photo_alt_text`)

## Method

1. Fetched the full, real hosted migration ledger via the read-only Supabase
   MCP `list_migrations` tool (permitted example under the task's Phase 2 —
   no write call was made). This is the authoritative source for every
   "LEDGER-MATCHED" classification below; nothing was inferred or guessed.
2. Read the header comment of every SQL file in `supabase/migrations/` (all
   self-annotate their intended application mechanism and status — e.g.
   "PROPOSE-ONLY", "APPLIED TO PROD", "LOCAL ARTIFACT ONLY, do not apply").
3. Cross-referenced file names/topics against the ledger's `name` field.
   Ledger names frequently reproduce a file's own filename verbatim (dashes
   converted to underscores by the apply tool), which gave several exact,
   unambiguous matches; the ledger also contains genuine duplicate/ad-hoc
   entries not traceable to one specific file, which is exactly finding #3
   from the prior audit.
4. Where a repository file's *own header* self-cites its real applied
   migration name (e.g. `2026-06-01_flags_policy_consolidation.sql` cites
   `flags_close_nonowner_delete_and_fix_triage_20260601`;
   `2026-07-27_sr018_verify_webhook_secret_revoke.sql` cites
   `sr018_verify_webhook_secret_revoke_20260727`), that citation was treated
   as authoritative once corroborated against the ledger dump.
5. **Where the ledger match was ambiguous (duplicate name occurrences, or one
   file mapping to more than one ledger entry), the file was NOT forced into
   a fabricated single version.** It was moved to a non-managed archive
   instead — this is the safe resolution: it removes any replay risk without
   inventing a historical timestamp.

No file's SQL content was rewritten. Every move/rename was a pure filesystem
`git mv`; a full SHA-256 sweep of all 59 affected files, before and after,
confirms byte-for-byte identity (see **SQL content integrity**, below).

## New non-managed structure

`supabase/migrations/` had no pre-existing archive/manual convention, so one
small, flat structure was created (per the task's "keep it simple"
instruction — no framework, just five clearly-named buckets):

```
supabase/nonmanaged/
  manual/              — ambiguous historical multi-generation content
  proposed/            — unaccepted/not-yet-applied work, including all
                          unaccepted D1/D1F4 account-deletion migrations
  rollback-recovery/   — rollback scripts and pre-state "drift capture" snapshots
  destructive-data/    — data-only purge/seed/test-account scripts
  live-out-of-band/    — confirmed-live SQL absent from the hosted ledger
```

`supabase/tests/` and the pre-existing stray
`supabase/realtime.sql.deprecated-option1-do-not-apply` (already outside any
managed path) were left untouched — out of scope.

## D1S-A — explicit treatment (special rule)

- **Original path:** `supabase/migrations/2026-08-27_d1sa_deployed_security_containment.sql`
- **New path:** `supabase/nonmanaged/live-out-of-band/2026-08-27_d1sa_deployed_security_containment.sql`
- **SQL hash (unchanged):** `d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d`
- **Evidence the effect is live:** established by the prior independent
  audit as authoritative input for this task (D1S-A is LIVE in hosted state
  but absent from the hosted migration ledger). The file's own authoring-time
  QA report (`qa-reports/2026-08-27_Codex_D1SADeployedSecurityContainment.md`)
  states "NO DEPLOYMENT / NO SUPABASE APPLY" as of 2026-08-27 — meaning the
  live application happened by a separate, out-of-band path after that local
  commit, consistent with never being recorded in the CLI-tracked ledger.
- **No corresponding hosted ledger entry exists** for this content — confirmed
  by the full read-only `list_migrations` dump above; no entry named or dated
  around this content appears anywhere in the 66-entry ledger.
- **No ledger entry was fabricated for it.** It cannot be replayed by normal
  migration tooling: it no longer sits in `supabase/migrations/` at all.
- The next auditor should read this file's presence in
  `supabase/nonmanaged/live-out-of-band/` as **"believed live in hosted
  state"**, explicitly NOT as **"recorded applied in the migration ledger"**
  — those are different claims and must stay distinguishable.

The second file in the same bucket, `2026-06-03_verify_webhook_secret.sql`,
is analogous: it has no hosted ledger entry of its own, but a later, properly
ledgered migration (`sr018_verify_webhook_secret_revoke_20260727`,
`20260727075547`, kept in the managed directory) explicitly revokes what it
created — which is only possible if it was live at some point. Same
treatment, same reasoning, called out separately from D1S-A only because it
predates it and isn't the specific finding named by the prior audit.

## Unaccepted D1 work — explicit treatment

Every file in the D1 / D1F4 account-deletion lineage self-declares as **"LOCAL
ARTIFACT ONLY" / "LOCAL SOURCE ONLY — do not apply"**, and the two most recent
files in the chain (FIX2, FIX3) literally describe their own predecessor as
the **"rejected D1 predecessor migrations"**. None of these six files carry any
"independent acceptance" language, unlike every MOD1/MOD1R file. All six were
moved to `supabase/nonmanaged/proposed/` and are no longer inside
`supabase/migrations/` — a normal `supabase db push` or `migration up` cannot
see them, so they cannot execute before or inside the MOD1 candidate range
regardless of filename ordering:

- `2026-08-27_d1_option_a_account_deletion.sql`
- `2026-08-27_d1f4_async_account_deletion.sql`
- `20260828000000_d1f4r2_source_repair.sql`
- `20260828010000_d1f4r3_source_closure.sql`
- `20260828020000_d1f4r3_fix2_review_replay_and_flag_delete.sql`
- `20260828030000_d1f4r3_fix3_review_audit.sql`

(Filenames were kept exactly as authored — only their directory changed —
since renaming was not required to remove replay risk and doing so would
have been gratuitous.)

## Final managed migration list (execution order)

All 28 remaining files in `supabase/migrations/` use a unique 14-digit
version. No duplicates, no date-only versions, no `2026-08-27_*`-style
versions remain in the managed directory.

### Ledger-matched (historical, already live — exact hosted version)

| Version | Filename | Original filename | Hosted ledger name |
|---|---|---|---|
| 20260524211752 | feedback_table.sql | 2026-05-23_feedback_table.sql | feedback_table |
| 20260524211803 | flag_context_tags.sql | 2026-05-24_flag_context_tags.sql | flag_context_tags |
| 20260524211825 | flag_status_history.sql | 2026-05-24_status_history_table.sql | flag_status_history |
| 20260527043142 | flag_edit_rls.sql | 2026-05-25_flag_edit_rls.sql | 2026-05-25_flag_edit_rls |
| 20260528101406 | push_tokens.sql | 2026-05-25_push_tokens.sql | 2026-05-25_push_tokens |
| 20260529063432 | flag_edit_history_table.sql | 2026-05-25_flag_edit_history_table.sql | 2026_05_25_flag_edit_history_table |
| 20260529084007 | status_update_trigger_applied.sql | 2026-05-23_status_update_trigger_proposal.sql | 2026_05_23_status_update_trigger_proposal |
| 20260529084118 | d4_realtime_flags_filtered.sql | 2026-05-28_d4_realtime_flags_filtered.sql | 2026_05_28_d4_realtime_flags_filtered |
| 20260529175048 | latlong_range_constraint.sql | 2026-05-29_latlong_range_constraint.sql | latlong_range_constraint |
| 20260529175840 | notification_preferences.sql | 2026-05-25_notification_preferences_proposal.sql | notification_preferences |
| 20260529175842 | anon_flags_select.sql | 2026-05-29_anon_flags_select.sql | anon_flags_select |
| 20260529192005 | function_search_path_hardening.sql | 2026-05-29_function_search_path_hardening.sql | function_search_path_hardening |
| 20260530064949 | flag_creation_rate_limit.sql | 2026-05-30_flag_creation_rate_limit.sql | flag_creation_rate_limit |
| 20260530192829 | flag_comments.sql | 2026-05-30_flag_comments.sql | flag_comments_table |
| 20260531025237 | flag_photos_junction.sql | 2026-05-30_flag_photos_junction.sql | flag_photos_junction |
| 20260531202835 | trust_score_system.sql | 2026-05-30_trust_score_system.sql | trust_score_system |
| 20260601081834 | account_deletion_cascade.sql | 2026-05-29_account_deletion_cascade.sql | account_deletion_cascade |
| 20260601081846 | anon_flag_reporting_photo_fix.sql | 2026-05-30_anon_flag_reporting_photo_fix.sql | anon_flag_reporting_photo_fix |
| 20260602060359 | flags_close_nonowner_delete_and_fix_triage.sql | 2026-06-01_flags_policy_consolidation.sql | flags_close_nonowner_delete_and_fix_triage_20260601 (self-cited in file) |
| 20260603002810 | admin_role.sql | 2026-05-30_admin_role.sql | admin_role |
| 20260727075547 | sr018_verify_webhook_secret_revoke.sql | 2026-07-27_sr018_verify_webhook_secret_revoke.sql | sr018_verify_webhook_secret_revoke_20260727 (self-cited in file) |
| 20260819204409 | flag_status_transition_guard.sql | 2026-08-19_flag_status_transition_guard_APPLIED.sql | flag_status_transition_guard |
| 20260819214410 | photo_alt_text.sql | 2026-08-19_photo_alt_text_APPLIED.sql | photo_alt_text |

### Accepted pending (MOD1 candidate range — unchanged, deterministic order)

| Version | Filename |
|---|---|
| 20260828040000 | mod1_moderation_release_safety.sql |
| 20260828050000 | mod1_admin_report_queue.sql |
| 20260828060000 | mod1r_fix1_report_and_insert_authz.sql |
| 20260828070000 | mod1r_fix1_pending_close_state.sql |
| 20260828080000 | mod1r_fix2_action_intent.sql |

These five were **not renamed or moved** — they already used the correct
14-digit format, already sit inside the prior audit's intended candidate
range (`20260828040000`–`20260828080000`), and their relative order encodes a
real dependency chain (each file's own header states which prior file it
does/doesn't edit). No file that could execute ahead of or inside this range
remains in the managed directory.

## Full classification table

| Original file | Category | Disposition |
|---|---|---|
| 2026-05-23_data_layer_hardening.sql | MANUAL (ambiguous — ledger has 2 identical-name entries, `data_layer_hardening` at 20260523202748 and 20260528230556, plus a later `_fix` variant) | → nonmanaged/manual/ |
| 2026-05-23_feedback_table.sql | LEDGER-MATCHED | → 20260524211752_feedback_table.sql |
| 2026-05-23_rls_initplan_and_non_owner_status_update.sql | MANUAL (ambiguous — 3 distinct ledger candidates) | → nonmanaged/manual/ |
| 2026-05-23_status_update_trigger_proposal.sql | LEDGER-MATCHED (exact filename match in ledger) | → 20260529084007_status_update_trigger_applied.sql |
| 2026-05-24_flag_context_tags.sql | LEDGER-MATCHED | → 20260524211803_flag_context_tags.sql |
| 2026-05-24_realtime_flags.sql.deprecated-option1-do-not-apply | UNACCEPTED/PROPOSED (deprecated, superseded by Option 2 / d4) | → nonmanaged/proposed/ |
| 2026-05-24_status_history_table.sql | LEDGER-MATCHED | → 20260524211825_flag_status_history.sql |
| 2026-05-25_flag_edit_history_table.sql | LEDGER-MATCHED (exact filename match) | → 20260529063432_flag_edit_history_table.sql |
| 2026-05-25_flag_edit_rls.sql | LEDGER-MATCHED (exact filename match) | → 20260527043142_flag_edit_rls.sql |
| 2026-05-25_flag_edit_rls_replacement.sql | MANUAL (ambiguous — 2 distinct later ledger candidates) | → nonmanaged/manual/ |
| 2026-05-25_notification_preferences_proposal.sql | LEDGER-MATCHED (ledger proves it was in fact approved+applied despite stale "PROPOSAL ONLY" header) | → 20260529175840_notification_preferences.sql |
| 2026-05-25_push_tokens.sql | LEDGER-MATCHED (exact filename match) | → 20260528101406_push_tokens.sql |
| 2026-05-27_users_email_privacy.sql | MANUAL (ambiguous — 4 ledger generations, including a literal duplicate) | → nonmanaged/manual/ |
| 2026-05-28_d4_realtime_flags_filtered.sql | LEDGER-MATCHED (exact filename match) | → 20260529084118_d4_realtime_flags_filtered.sql |
| 2026-05-28_d4_realtime_flags_filtered_rollback.sql | ROLLBACK/RECOVERY | → nonmanaged/rollback-recovery/ |
| 2026-05-29_account_deletion_cascade.sql | LEDGER-MATCHED (ledger proves applied despite stale "PROPOSE ONLY" header) | → 20260601081834_account_deletion_cascade.sql |
| 2026-05-29_anon_flags_select.sql | LEDGER-MATCHED | → 20260529175842_anon_flags_select.sql |
| 2026-05-29_function_search_path_hardening.sql | LEDGER-MATCHED | → 20260529192005_function_search_path_hardening.sql |
| 2026-05-29_latlong_range_constraint.sql | LEDGER-MATCHED | → 20260529175048_latlong_range_constraint.sql |
| 2026-05-30_admin_role.sql | LEDGER-MATCHED | → 20260603002810_admin_role.sql |
| 2026-05-30_anon_flag_reporting_photo_fix.sql | LEDGER-MATCHED | → 20260601081846_anon_flag_reporting_photo_fix.sql |
| 2026-05-30_flag_comments.sql | LEDGER-MATCHED (topic match to `flag_comments_table`) | → 20260530192829_flag_comments.sql |
| 2026-05-30_flag_creation_rate_limit.sql | LEDGER-MATCHED (base version; a later `_hardened` ledger generation has no repo file) | → 20260530064949_flag_creation_rate_limit.sql |
| 2026-05-30_flag_photos_junction.sql | LEDGER-MATCHED | → 20260531025237_flag_photos_junction.sql |
| 2026-05-30_flag_reopen_requests.sql | MANUAL (ambiguous — literal duplicate ledger entry) | → nonmanaged/manual/ |
| 2026-05-30_trust_score_system.sql | LEDGER-MATCHED | → 20260531202835_trust_score_system.sql |
| 2026-05-31_reviewer_test_account.sql | DESTRUCTIVE/DATA-ONLY (App Store reviewer account seed) | → nonmanaged/destructive-data/ |
| 2026-06-01_flag_photos_insert_guard.sql | UNACCEPTED/PROPOSED (no ledger entry found; June 3 → July 27 ledger gap) | → nonmanaged/proposed/ |
| 2026-06-01_flags_policy_consolidation.sql | LEDGER-MATCHED (self-cited exact ledger name) | → 20260602060359_flags_close_nonowner_delete_and_fix_triage.sql |
| 2026-06-01_function_exec_and_search_path_hardening.sql | UNACCEPTED/PROPOSED (no ledger entry found) | → nonmanaged/proposed/ |
| 2026-06-01_perf_fk_covering_indexes.sql | MANUAL (one file covers TWO distinct ledger entries — cannot hold a single unique version) | → nonmanaged/manual/ |
| 2026-06-03_verify_webhook_secret.sql | LIVE OUT-OF-BAND (no own ledger entry; provably live because a later ledgered migration revokes it) | → nonmanaged/live-out-of-band/ |
| 2026-06-09_status_transition_guard_PROPOSED.sql | UNACCEPTED/PROPOSED (self-declared superseded) | → nonmanaged/proposed/ |
| 2026-06-18_monthly_leaderboard_rpc_PROPOSED.sql | UNACCEPTED/PROPOSED (self-declared not yet applied) | → nonmanaged/proposed/ |
| 2026-07-16_fork5_dispute_counter_PROPOSED.sql | UNACCEPTED/PROPOSED (self-declared banked, not applied) | → nonmanaged/proposed/ |
| 2026-07-27_drift_capture_check_flag_rate_limit.sql | ROLLBACK/RECOVERY (self-declared pre-state capture, no-op) | → nonmanaged/rollback-recovery/ |
| 2026-07-27_drift_capture_flag_comments_user_id.sql | ROLLBACK/RECOVERY | → nonmanaged/rollback-recovery/ |
| 2026-07-27_drift_capture_flag_verifications_insert_policy.sql | ROLLBACK/RECOVERY | → nonmanaged/rollback-recovery/ |
| 2026-07-27_drift_capture_flags_owner_edit_open_policy.sql | ROLLBACK/RECOVERY | → nonmanaged/rollback-recovery/ |
| 2026-07-27_drift_capture_handle_flag_status_change.sql | ROLLBACK/RECOVERY | → nonmanaged/rollback-recovery/ |
| 2026-07-27_drift_capture_live_flag_insert_throttles.sql | ROLLBACK/RECOVERY | → nonmanaged/rollback-recovery/ |
| 2026-07-27_sr018_verify_webhook_secret_revoke.sql | LEDGER-MATCHED (self-cited exact ledger name+version) | → 20260727075547_sr018_verify_webhook_secret_revoke.sql |
| 2026-08-18_purge_test_flags.sql | DESTRUCTIVE/DATA-ONLY | → nonmanaged/destructive-data/ |
| 2026-08-18_seed_reviewer_flags.sql | DESTRUCTIVE/DATA-ONLY | → nonmanaged/destructive-data/ |
| 2026-08-19_flag_status_transition_guard_APPLIED.sql | LEDGER-MATCHED | → 20260819204409_flag_status_transition_guard.sql |
| 2026-08-19_photo_alt_text_APPLIED.sql | LEDGER-MATCHED (hosted ledger tip) | → 20260819214410_photo_alt_text.sql |
| 2026-08-22_takedown_junk_flags_APPLIED.sql | DESTRUCTIVE/DATA-ONLY (data-only; confirmed applied per commit 833d87f, but DML is categorically outside the DDL ledger) | → nonmanaged/destructive-data/ |
| 2026-08-27_d1_option_a_account_deletion.sql | UNACCEPTED/PROPOSED (D1) | → nonmanaged/proposed/ |
| 2026-08-27_d1f4_async_account_deletion.sql | UNACCEPTED/PROPOSED (D1) | → nonmanaged/proposed/ |
| 2026-08-27_d1sa_deployed_security_containment.sql | LIVE OUT-OF-BAND (D1S-A, special rule) | → nonmanaged/live-out-of-band/ |
| 20260828000000_d1f4r2_source_repair.sql | UNACCEPTED/PROPOSED (D1) | → nonmanaged/proposed/ |
| 20260828010000_d1f4r3_source_closure.sql | UNACCEPTED/PROPOSED (D1) | → nonmanaged/proposed/ |
| 20260828020000_d1f4r3_fix2_review_replay_and_flag_delete.sql | UNACCEPTED/PROPOSED (D1, self-described as superseding a "rejected" predecessor) | → nonmanaged/proposed/ |
| 20260828030000_d1f4r3_fix3_review_audit.sql | UNACCEPTED/PROPOSED (D1) | → nonmanaged/proposed/ |
| 20260828040000_mod1_moderation_release_safety.sql | ACCEPTED PENDING | unchanged |
| 20260828050000_mod1_admin_report_queue.sql | ACCEPTED PENDING | unchanged |
| 20260828060000_mod1r_fix1_report_and_insert_authz.sql | ACCEPTED PENDING | unchanged |
| 20260828070000_mod1r_fix1_pending_close_state.sql | ACCEPTED PENDING | unchanged |
| 20260828080000_mod1r_fix2_action_intent.sql | ACCEPTED PENDING | unchanged |

No file landed in UNKNOWN/BLOCKED.

## SQL content integrity

Full SHA-256 sweep of all 59 affected files, before every move, and again
after every move/rename: **identical hash sets, zero drift, zero omissions.**
Every move was a pure `git mv` (rename), so per-file git history/blame is
preserved. No SQL statement was added, removed, or edited by this repair.

One pre-existing, out-of-scope inconsistency is noted rather than fixed: the
header comment inside `20260828040000_mod1_moderation_release_safety.sql`
references `2026-08-19_flag_status_transition_guard_APPLIED.sql` by its old
name (now `20260819204409_flag_status_transition_guard.sql`). Editing that
comment would be a content change to an accepted-pending migration, which is
out of scope for a map repair — flagged here instead of silently fixed.

## Static verification (all commands run from `supabase/migrations/`, or repo root as noted)

| Check | Command | Result |
|---|---|---|
| No duplicate 14-digit versions | `ls \| sed -E 's/^([0-9]{14})_.*/\1/' \| sort \| uniq -d` | empty — PASS |
| Every filename matches `^[0-9]{14}_[a-zA-Z0-9_]+\.sql$` | loop + regex check | no failures — PASS |
| Non-managed scripts removed from managed dir | `ls \| grep -i "d1f4\|d1_option\|d1sa"` | empty — PASS |
| File count | `ls \| wc -l` | 28 — matches 23 ledger-matched + 5 accepted-pending |
| `git diff --check` (whitespace) | run at repo root on staged changes | PASS, no errors |
| Working-tree scope | `git status --short \| awk '{print $1}' \| sort \| uniq -c` | 54 renames (`R`), zero of any other type |
| SHA-256 content integrity | full before/after sweep, `comm -23`/`comm -13` on hash sets | empty both directions — PASS |

**No hosted push, no `migration repair`, no pending-range apply was run to
prove any of this** — every check above is static/local.

## Confirmations

- NO hosted mutation occurred (only read-only `list_migrations` was called
  against the hosted project, matching the task's permitted read-only
  examples).
- NO `supabase db push` was run.
- NO `supabase migration repair` was run.
- NO merge, deploy, or app-behavior change occurred. `git status` shows only
  file renames — no application/source/config file outside
  `supabase/migrations/` and the new `supabase/nonmanaged/` tree was touched.

## Remaining ambiguity (disclosed, not hidden)

Six files were moved to `manual/` rather than force-fit into a fabricated
ledger version, because the hosted ledger genuinely contains more than one
plausible candidate entry for each (see the classification table). This is a
deliberate, safety-first resolution: it removes all replay risk without
guessing which specific historical timestamp is "the" real one. A future
auditor with deeper hosted forensics (e.g. diffing `pg_proc`/`pg_policy`
definitions against each file) could potentially resolve these further; that
work was not attempted here because it would require broader read access
than this task's Phase 2 permits and is not required to make the repository
safe to push.
