-- 2026-06-01_perf_fk_covering_indexes.sql
-- Performance: covering indexes for unindexed foreign keys + drop a duplicate index.
--
-- Source: Peter performance audit (qa-reports/2026-06-01_Performance_QA_Report.md, item P3),
-- grounded in Supabase performance advisors (unindexed_foreign_keys ×7, duplicate_index ×1).
-- These were applied directly to the live project on 2026-06-01; this migration RECORDS
-- them so the repo remains the source of truth (a fresh setup / `db reset` recreates the
-- same indexes and no drift accumulates).
--
-- All statements are idempotent and safe to re-run. At the current table sizes (~7 flags)
-- they are instant. If ever applying to a large live table, prefer
-- `CREATE INDEX CONCURRENTLY` (outside a transaction) to avoid a write lock.
--
-- Rollback: drop the seven *_idx indexes created below. Do NOT recreate
-- idx_flags_status_created_at_desc — it is identical to flags_status_created_at_idx.

-- 1) Drop the duplicate (status, created_at desc) index on flags.
--    The canonical index, flags_status_created_at_idx, is defined in
--    2026-05-23_data_layer_hardening.sql and is KEPT. idx_flags_status_created_at_desc
--    was an identical second copy (added directly to the live DB, never in the repo);
--    maintaining both wasted write throughput.
drop index if exists public.idx_flags_status_created_at_desc;

-- 2) Covering indexes for the foreign keys flagged by the advisor. These accelerate
--    joins on these columns and, importantly, ON DELETE CASCADE: the account_deletion
--    cascade deletes a user's child rows, and without a covering index each cascade does
--    a sequential scan of the child table. Cheap insurance before real data volume.
create index if not exists comment_votes_voter_id_idx         on public.comment_votes(voter_id);
create index if not exists flag_comments_user_id_idx          on public.flag_comments(user_id);
create index if not exists flag_edit_history_user_id_idx      on public.flag_edit_history(user_id);
create index if not exists flag_status_history_user_id_idx    on public.flag_status_history(user_id);
create index if not exists flag_verifications_verifier_id_idx on public.flag_verifications(verifier_id);
create index if not exists point_events_flag_id_idx           on public.point_events(flag_id);
create index if not exists realtime_subscribe_log_user_id_idx on public.realtime_subscribe_log(user_id);
