-- ============================================================================
-- FILE:    2026-08-22_takedown_junk_flags.sql
-- PURPOSE: Close the takedown half of PRODUCT_READ MUST-1 — remove Sky's own
--          development junk from production so the App Store screenshots and
--          any reviewer filter-flip show honest content (Guideline 2.3.3, and
--          1.1.1 for the profanity row).
--
-- ⚠ FILE ONLY — SKY RUNS THIS. No agent applies it (Const. Art. 1: no agent
--   touches a live database). Paste into the Supabase SQL editor for project
--   "Accessable City App" (kldlwszpfkdmsjrjhjym).
--
-- ⚠ RUN THE STEPS IN ORDER. Step 3 refuses to run if Step 2 did not.
--
-- ============================================================================
-- ✅ APPLIED 2026-08-23 by agent, on Sky's explicit waiver of the
--    no-agent-touches-a-live-database rule ("do the whole thing now").
--
--    Preview matched exactly: 15 target rows, 0 visible under the default
--    filter, 0 seeded. Backup verified row-for-row BEFORE the delete --
--    flags 15 · comments 1 · photos 2 · status_history 23 · verifications 0
--    · edit_history 0 · point_links 25 -- every count equal to prediction.
--
--    RESULT, verified after: open 9 · rejected 2 · resolved 2 · verified 4
--    = 17 total. Profanity rows remaining: 0. Seeded rows intact: 12.
--    point_events: 44, all surviving (SET NULL, not CASCADE) -- the
--    leaderboard is untouched.
--
--    29718d8c ("Very steep sidewalk") was KEPT on Sky's instruction 2026-08-23
--    -- "leave it that's a real one i added". §D below is therefore CLOSED as
--    "leave it"; do not revisit it as an open question.
--
--    A third guard was added at run time and is now in Step 3 below: abort if
--    any target is open/verified. Nothing visible in the app could be removed
--    even if the ID list were wrong.
--
--    The bk_2026_08_22_* tables ARE THE UNDO and are still in place. Do not
--    drop them until the app is submitted.
-- ============================================================================
--
-- ─── WHAT CHANGED SINCE THE DOSSIER ────────────────────────────────────────
-- The dossier (2026-08-05) treats MUST-1 as "junk takedown + seeding 5-10 real
-- Kelowna barriers". Read against live data on 2026-08-22, the seeding half is
-- ALREADY CLOSED: 2026-08-18_seed_reviewer_flags.sql was applied and its 12
-- honest rows are live (8 open + 4 verified, all tagged 'seed_2026_08_18').
-- This file therefore does the takedown half ONLY. Do not re-run the seed.
--
-- Live counts at authoring time — 32 flags total:
--   open  9  (8 seeded + 1 of Sky's)   verified  4  (all seeded)
--   rejected 13 (all Sky's)            resolved  6  (all Sky's)
--
-- ─── WHAT IS ACTUALLY VISIBLE, WHICH IS THE WHOLE POINT ────────────────────
-- src/lib/flags.ts:1670 — DEFAULT_STATUSES = ['open','verified']. Map, Tasks
-- and Nearby all use it. So 19 of the 20 junk rows are ALREADY invisible in
-- every default view and in every store shot. They are reachable only by
-- flipping the status filter (FilterPresetsModal, MyReportsModal, Profile).
--
-- That splits the problem in two, and they have different urgency:
--   · SHOTS      — exactly ONE junk row is visible by default: 29718d8c.
--                  See §D. It is the only row that can appear in a screenshot.
--   · REVIEW     — the profanity row af36e3bf ('BUMBAKLOT') is one filter tap
--                  from a reviewer. That is the row with real 1.1.1 exposure.
-- Everything else is housekeeping on Sky's own account history.
--
-- ─── ⚠ THE DANGEROUS PART: DELETING A FLAG IS NOT A ONE-TABLE OPERATION ────
-- public.flags has SIX dependents. Verified against information_schema, not
-- assumed:
--   flag_comments        ON DELETE CASCADE
--   flag_edit_history    ON DELETE CASCADE
--   flag_photos          ON DELETE CASCADE
--   flag_status_history  ON DELETE CASCADE
--   flag_verifications   ON DELETE CASCADE
--   point_events         ON DELETE SET NULL   <-- NOT deleted, UNLINKED
--
-- Deleting all 20 target rows silently takes 2 comments, 2 photo records and
-- 30 status-history rows with them, and NULLs flag_id on 36 point_events.
-- Points themselves survive (SET NULL, not CASCADE), so the leaderboard score
-- is unaffected — but the link from each point event back to its flag is gone
-- and CANNOT be reconstructed from a flags-only backup. That is why Step 2
-- backs up all seven tables and not just flags.
--
-- ─── ROLLBACK ──────────────────────────────────────────────────────────────
-- Exact, and it restores the children too. See §ROLLBACK at the foot of this
-- file. Read its trigger caveat BEFORE you need it.
-- ============================================================================


-- ############################################################################
-- STEP 1 — PREVIEW. Read-only. Changes nothing. Run this first and read it.
-- ############################################################################

with targets as (
  select id from public.flags
  where id in (
    -- TIER A — objectionable or off-topic (2). The review risk.
    'af36e3bf-2423-4c00-9f30-dfe80ac658a2',  -- resolved · other · sev 5 · profanity
    '2033cfcb-d922-44f9-bf0f-1a9dc543e91b',  -- rejected · other · sev 1 · 'Mean dog', not an access barrier

    -- TIER B — empty or one-word placeholder (11). Obvious test rows.
    '2caa663e-c025-47bc-8747-1da486fcaf54',
    'c2249296-6270-4c78-a105-7ca9e68ff5f0',
    '8f848ea4-a65a-4590-901b-142739bc374a',
    'f2091d88-9ac0-44c5-82c6-440923e291ee',
    '6d23c59e-5eb5-48c5-bb9c-7286966e49b2',
    'e10e6530-cf57-4b92-a630-b41392dca564',  -- empty desc AND carries the photo record
    'c7d3de6c-27af-49b8-a3fe-415bbb397b43',
    '076d5875-9799-44a0-a368-4ccf91e88417',
    'e53a8cbb-688f-4804-94f9-46c4ca39414e',
    'd330d710-a810-4355-9ec8-c3701ef9b6a0',  -- description is the single word 'bad', at severity 5
    'eaa3ef27-ebb2-43f1-8494-1c208fff7ae1',  -- 'Curb'

    -- TIER C — malformed or duplicate (2).
    'f798b650-fc5e-480d-979d-8f7e87bf40ce',  -- '...sidewalk.blocked' — visible concatenation artifact
    'f506204c-ea9c-4376-8293-03a40ed8421f'   -- exact duplicate of d6872388; keeping one of the pair
  )
)
select
  f.id, f.status, f.category, f.severity,
  left(coalesce(f.description, '(empty)'), 60) as description,
  f.created_at::date as created,
  (select count(*) from public.flag_comments       c where c.flag_id = f.id) as comments_lost,
  (select count(*) from public.flag_photos         p where p.flag_id = f.id) as photos_lost,
  (select count(*) from public.flag_status_history h where h.flag_id = f.id) as history_lost,
  (select count(*) from public.point_events        e where e.flag_id = f.id) as points_unlinked
from public.flags f
where f.id in (select id from targets)
order by f.status, f.created_at;

-- Expect 15 rows. If you get a different number, STOP — the dataset moved
-- since 2026-08-22 and the ID list needs re-deriving before you delete.


-- ############################################################################
-- STEP 2 — BACKUP. Run this before Step 3. Idempotent: safe to run twice.
-- ############################################################################

do $$
declare
  target_ids uuid[] := array[
    'af36e3bf-2423-4c00-9f30-dfe80ac658a2','2033cfcb-d922-44f9-bf0f-1a9dc543e91b',
    '2caa663e-c025-47bc-8747-1da486fcaf54','c2249296-6270-4c78-a105-7ca9e68ff5f0',
    '8f848ea4-a65a-4590-901b-142739bc374a','f2091d88-9ac0-44c5-82c6-440923e291ee',
    '6d23c59e-5eb5-48c5-bb9c-7286966e49b2','e10e6530-cf57-4b92-a630-b41392dca564',
    'c7d3de6c-27af-49b8-a3fe-415bbb397b43','076d5875-9799-44a0-a368-4ccf91e88417',
    'e53a8cbb-688f-4804-94f9-46c4ca39414e','d330d710-a810-4355-9ec8-c3701ef9b6a0',
    'eaa3ef27-ebb2-43f1-8494-1c208fff7ae1','f798b650-fc5e-480d-979d-8f7e87bf40ce',
    'f506204c-ea9c-4376-8293-03a40ed8421f'
  ]::uuid[];
  n_flags int;
begin
  -- Column shapes are copied from the live tables, so a restore is a plain
  -- `insert into <table> select * from <backup>` with no column mapping.
  create table if not exists public.bk_2026_08_22_flags               as select * from public.flags               where false;
  create table if not exists public.bk_2026_08_22_flag_comments       as select * from public.flag_comments       where false;
  create table if not exists public.bk_2026_08_22_flag_photos         as select * from public.flag_photos         where false;
  create table if not exists public.bk_2026_08_22_flag_status_history as select * from public.flag_status_history where false;
  create table if not exists public.bk_2026_08_22_flag_verifications  as select * from public.flag_verifications  where false;
  create table if not exists public.bk_2026_08_22_flag_edit_history   as select * from public.flag_edit_history   where false;
  -- point_events is SET NULL, not CASCADE: the ROW survives, the LINK does not.
  -- So we save the (id, flag_id) pairs, which is the only thing that is lost.
  -- ⚠ TYPES DERIVED FROM THE LIVE TABLE, NOT HAND-DECLARED. `point_events.id`
  -- is BIGINT, not uuid. The first run of this file hand-declared it as uuid
  -- and died on `operator does not exist: uuid = bigint`. The DO block is one
  -- transaction, so that attempt rolled back whole and wrote nothing -- but
  -- do not re-introduce a hand-written type here.
  create table if not exists public.bk_2026_08_22_point_links as
    select e.id as point_event_id, e.flag_id from public.point_events e where false;


  -- `where not exists` on each: a second run adds nothing rather than doubling.
  insert into public.bk_2026_08_22_flags
    select * from public.flags f where f.id in (select unnest(target_ids))
      and not exists (select 1 from public.bk_2026_08_22_flags b where b.id = f.id);

  insert into public.bk_2026_08_22_flag_comments
    select * from public.flag_comments c where c.flag_id in (select unnest(target_ids))
      and not exists (select 1 from public.bk_2026_08_22_flag_comments b where b.id = c.id);

  insert into public.bk_2026_08_22_flag_photos
    select * from public.flag_photos p where p.flag_id in (select unnest(target_ids))
      and not exists (select 1 from public.bk_2026_08_22_flag_photos b where b.id = p.id);

  insert into public.bk_2026_08_22_flag_status_history
    select * from public.flag_status_history h where h.flag_id in (select unnest(target_ids))
      and not exists (select 1 from public.bk_2026_08_22_flag_status_history b where b.id = h.id);

  insert into public.bk_2026_08_22_flag_verifications
    select * from public.flag_verifications v where v.flag_id in (select unnest(target_ids))
      and not exists (select 1 from public.bk_2026_08_22_flag_verifications b where b.id = v.id);

  insert into public.bk_2026_08_22_flag_edit_history
    select * from public.flag_edit_history e where e.flag_id in (select unnest(target_ids))
      and not exists (select 1 from public.bk_2026_08_22_flag_edit_history b where b.id = e.id);

  insert into public.bk_2026_08_22_point_links
    select e.id, e.flag_id from public.point_events e where e.flag_id in (select unnest(target_ids))
      and not exists (select 1 from public.bk_2026_08_22_point_links b where b.point_event_id = e.id);

  select count(*) into n_flags from public.bk_2026_08_22_flags;
  raise notice 'BACKUP OK: % flag row(s) saved, children and point links alongside.', n_flags;
end $$;

-- Confirm the backup before you delete anything:
--   select count(*) from public.bk_2026_08_22_flags;              -- expect 15
--   select count(*) from public.bk_2026_08_22_flag_comments;      -- expect 2
--   select count(*) from public.bk_2026_08_22_flag_photos;        -- expect 2
--   select count(*) from public.bk_2026_08_22_point_links;        -- expect > 0


-- ############################################################################
-- STEP 3 — DELETE. Guarded: aborts unless the backup holds every target row.
-- ############################################################################

do $$
declare
  target_ids uuid[] := array[
    'af36e3bf-2423-4c00-9f30-dfe80ac658a2','2033cfcb-d922-44f9-bf0f-1a9dc543e91b',
    '2caa663e-c025-47bc-8747-1da486fcaf54','c2249296-6270-4c78-a105-7ca9e68ff5f0',
    '8f848ea4-a65a-4590-901b-142739bc374a','f2091d88-9ac0-44c5-82c6-440923e291ee',
    '6d23c59e-5eb5-48c5-bb9c-7286966e49b2','e10e6530-cf57-4b92-a630-b41392dca564',
    'c7d3de6c-27af-49b8-a3fe-415bbb397b43','076d5875-9799-44a0-a368-4ccf91e88417',
    'e53a8cbb-688f-4804-94f9-46c4ca39414e','d330d710-a810-4355-9ec8-c3701ef9b6a0',
    'eaa3ef27-ebb2-43f1-8494-1c208fff7ae1','f798b650-fc5e-480d-979d-8f7e87bf40ce',
    'f506204c-ea9c-4376-8293-03a40ed8421f'
  ]::uuid[];
  n_live int; n_backed int; n_deleted int;
begin
  select count(*) into n_live   from public.flags             where id = any(target_ids);
  select count(*) into n_backed from public.bk_2026_08_22_flags where id = any(target_ids);

  if n_backed < n_live then
    raise exception 'ABORTED: % target row(s) live but only % backed up. Run STEP 2 first.', n_live, n_backed;
  end if;

  -- Belt and braces: never let this file touch a seeded row.
  if exists (select 1 from public.flags
             where id = any(target_ids)
               and 'seed_2026_08_18' = any(coalesce(context_tags, array[]::text[]))) then
    raise exception 'ABORTED: a target id carries the seed tag. The ID list is wrong.';
  end if;

  -- Added at run time 2026-08-23: nothing visible under DEFAULT_STATUSES may
  -- be removed by this file, even if the ID list above were wrong.
  if exists (select 1 from public.flags where id = any(target_ids) and status in ('open','verified')) then
    raise exception 'ABORTED: a target is open/verified and would change what the app shows.';
  end if;

  delete from public.flags where id = any(target_ids);
  get diagnostics n_deleted = row_count;
  raise notice 'DELETED % flag row(s). Cascades took their children; point_events were unlinked, not removed.', n_deleted;
end $$;


-- ############################################################################
-- STEP 4 — VERIFY
-- ############################################################################
--   select status, count(*) from public.flags group by status order by status;
--
-- Expected after a full run:
--   open      |  9   (8 seeded + 29718d8c — see §D below)
--   rejected  |  2   (d6872388, the surviving half of the dup pair; and cf08ef6c)
--   resolved  |  2   (d61cbcff, eb5df9d0)
--   verified  |  4
--   ---------------
--   total     | 17   (32 - 15)
--
-- And the profanity row is gone at any filter setting:
--   select count(*) from public.flags where description ilike '%bumbaklot%';   -- 0


-- ############################################################################
-- §D — THE ONE ROW THAT ACTUALLY AFFECTS THE SCREENSHOTS. NOT deleted here.
-- ############################################################################
-- 29718d8c-59c4-4fb6-997b-6937b71924fa
--   open · steep_grade · severity 2 · "Very steep sidewalk" · created 2026-08-19
--
-- It is the ONLY non-seeded row visible under DEFAULT_STATUSES, so it is the
-- only junk row that can land in a store shot. It is also a real location with
-- a real (if terse) description, so deleting it is not obviously right.
--
-- Three options — Sky's call, none of them applied by this file:
--
--   (a) IMPROVE IT — keep the pin, give it a description that matches the
--       seeded rows' honesty. One statement, reversible, no delete:
--         update public.flags
--            set description = '<your sentence here>'
--          where id = '29718d8c-59c4-4fb6-997b-6937b71924fa';
--       (Back up the old value first: it is not in the Step 2 backup, because
--        Step 2 only saves rows this file deletes.)
--
--   (b) DELETE IT — add its id to all three ID lists above and re-run. It will
--       then be backed up and removed like the rest.
--
--   (c) LEAVE IT — "Very steep sidewalk" is not embarrassing, just terse. If no
--       shot frames it, it costs nothing.


-- ############################################################################
-- §ROLLBACK — restores flags, children and point links. Read the caveat.
-- ############################################################################
--
-- ⚠ CAVEAT — DISABLE TRIGGERS FOR THE RESTORE. public.flags carries three
--   BEFORE INSERT rate-limit triggers. Every restored row is authored (user_id
--   is not null), so the per-user 20-per-24h cap WILL fire on a 15-row restore
--   and the rollback will fail partway. Wrap it:
--
--   begin;
--     alter table public.flags disable trigger user;
--
--     insert into public.flags               select * from public.bk_2026_08_22_flags;
--     insert into public.flag_comments       select * from public.bk_2026_08_22_flag_comments;
--     insert into public.flag_photos         select * from public.bk_2026_08_22_flag_photos;
--     insert into public.flag_status_history select * from public.bk_2026_08_22_flag_status_history;
--     insert into public.flag_verifications  select * from public.bk_2026_08_22_flag_verifications;
--     insert into public.flag_edit_history   select * from public.bk_2026_08_22_flag_edit_history;
--
--     -- re-link the point events that SET NULL orphaned
--     update public.point_events e
--        set flag_id = b.flag_id
--       from public.bk_2026_08_22_point_links b
--      where e.id = b.point_event_id;
--
--     alter table public.flags enable trigger user;
--   commit;
--
--   Order matters: flags first, children after, or the FKs reject them.
--
-- ─── DROPPING THE BACKUP ───────────────────────────────────────────────────
-- Only once the app is submitted and you are sure. Until then it is the undo.
--
--   drop table if exists public.bk_2026_08_22_flags, public.bk_2026_08_22_flag_comments,
--     public.bk_2026_08_22_flag_photos, public.bk_2026_08_22_flag_status_history,
--     public.bk_2026_08_22_flag_verifications, public.bk_2026_08_22_flag_edit_history,
--     public.bk_2026_08_22_point_links;
--
-- ⚠ These bk_* tables live in the `public` schema, so PostgREST will expose
--   them unless RLS denies. They contain no data a user did not already own,
--   but drop them once submitted rather than leaving them indefinitely.
