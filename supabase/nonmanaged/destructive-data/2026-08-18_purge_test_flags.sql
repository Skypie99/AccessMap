-- =============================================================================
-- PURGE THE PRE-LAUNCH TEST FLAGS
-- Authored 2026-08-18 · FILE ONLY — Sky runs this. No agent applies it.
-- Target: project "Accessable City App" (kldlwszpfkdmsjrjhjym) — PRODUCTION.
--
-- WHY: every flag currently in production is pre-launch test data. Verified
-- read-only on 2026-08-18: 20 rows, 14 rejected + 6 resolved, ZERO open, all
-- around Kelowna (~49.87, -119.48), created 2026-05-27 → 2026-08-03. Sky is
-- replacing them with real reports.
--
-- ⚠ THIS IS IRREVERSIBLE ONCE STEP 2 RUNS. Step 1 makes it recoverable.
--    Run step 1 and step 2 together, in one go, in the SQL editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1 — BACKUP FIRST. Snapshot tables, inside the same database.
-- Cheap (60-odd rows total) and it is what makes step 2 reversible.
-- -----------------------------------------------------------------------------
create table if not exists public.zz_backup_flags_20260818            as select * from public.flags;
create table if not exists public.zz_backup_flag_status_hist_20260818 as select * from public.flag_status_history;
create table if not exists public.zz_backup_flag_comments_20260818    as select * from public.flag_comments;
create table if not exists public.zz_backup_flag_photos_20260818      as select * from public.flag_photos;
create table if not exists public.zz_backup_flag_verif_20260818       as select * from public.flag_verifications;
create table if not exists public.zz_backup_flag_edits_20260818       as select * from public.flag_edit_history;
create table if not exists public.zz_backup_point_events_20260818     as select * from public.point_events;

-- Confirm the snapshot took before deleting anything.
select 'backup taken' as step,
       (select count(*) from public.zz_backup_flags_20260818) as flags_backed_up;   -- expect 20

-- -----------------------------------------------------------------------------
-- STEP 2 — DELETE. One statement; the cascades do the rest.
--
-- Cascades automatically (verified against the live FK constraints):
--   flag_status_history   32 rows  ON DELETE CASCADE
--   flag_comments          2 rows  ON DELETE CASCADE
--   flag_photos            2 rows  ON DELETE CASCADE
--   flag_edit_history      0 rows  ON DELETE CASCADE
--   flag_verifications     0 rows  ON DELETE CASCADE
--
-- Does NOT cascade:
--   point_events          37 rows  ON DELETE SET NULL
--     → the rows SURVIVE with flag_id = null, so users keep points earned from
--       flags that no longer exist. See STEP 3 if you want a true clean slate.
-- -----------------------------------------------------------------------------
delete from public.flags;

select 'deleted' as step,
       (select count(*) from public.flags) as flags_remaining,               -- expect 0
       (select count(*) from public.flag_status_history) as history_left,    -- expect 0
       (select count(*) from public.point_events where flag_id is null) as orphaned_points; -- expect 37

-- -----------------------------------------------------------------------------
-- STEP 3 — OPTIONAL, YOUR CALL: also reset the points earned from test flags.
-- Leave this commented out unless you want profiles back at zero. The reviewer
-- notes used to promise "a contributor profile with 25 points"; if that line is
-- being removed (it is), there is no reason to keep fake points.
-- -----------------------------------------------------------------------------
-- delete from public.point_events where flag_id is null;

-- =============================================================================
-- ROLLBACK — only valid while the zz_backup_* tables still exist.
-- Order matters: parents before children.
-- =============================================================================
-- insert into public.flags               select * from public.zz_backup_flags_20260818;
-- insert into public.flag_status_history select * from public.zz_backup_flag_status_hist_20260818;
-- insert into public.flag_comments       select * from public.zz_backup_flag_comments_20260818;
-- insert into public.flag_photos         select * from public.zz_backup_flag_photos_20260818;
-- insert into public.flag_verifications  select * from public.zz_backup_flag_verif_20260818;
-- insert into public.flag_edit_history   select * from public.zz_backup_flag_edits_20260818;
-- -- point_events survived the delete; only their flag_id was nulled. To restore it:
-- update public.point_events pe set flag_id = b.flag_id
--   from public.zz_backup_point_events_20260818 b where b.id = pe.id;

-- =============================================================================
-- STEP 4 — NOT SQL. Two storage photos are orphaned by this purge.
-- flag_photos rows cascade away, but the FILES in Storage do not. Delete them by
-- hand: Supabase → Storage → bucket `flag-photos` → the folder under user
-- 7fe628a7-… → remove the two .jpg objects (1785473090689.jpg, 1785795514540.jpg).
-- Leaving them costs nothing but they are orphaned bytes of test data.
--
-- STEP 5 — once the real flags are in and everything looks right, drop the
-- snapshots so they cannot be mistaken for live tables:
--   drop table if exists public.zz_backup_flags_20260818,
--     public.zz_backup_flag_status_hist_20260818, public.zz_backup_flag_comments_20260818,
--     public.zz_backup_flag_photos_20260818, public.zz_backup_flag_verif_20260818,
--     public.zz_backup_flag_edits_20260818, public.zz_backup_point_events_20260818;
-- =============================================================================
