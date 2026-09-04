-- Reconstructed 2026-06-02 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260602045356, hosted name "add_covering_indexes_foreign_keys".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

create index if not exists comment_votes_voter_id_idx         on public.comment_votes(voter_id);
create index if not exists flag_comments_user_id_idx          on public.flag_comments(user_id);
create index if not exists flag_edit_history_user_id_idx      on public.flag_edit_history(user_id);
create index if not exists flag_status_history_user_id_idx    on public.flag_status_history(user_id);
create index if not exists flag_verifications_verifier_id_idx on public.flag_verifications(verifier_id);
create index if not exists point_events_flag_id_idx           on public.point_events(flag_id);
create index if not exists realtime_subscribe_log_user_id_idx on public.realtime_subscribe_log(user_id);
