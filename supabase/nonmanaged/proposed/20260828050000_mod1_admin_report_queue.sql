-- ============================================================================
-- MOD1 CHECKPOINT B — durable admin report-moderation queue.
-- SOURCE FILE ONLY — not applied to any hosted project by this migration.
--
-- Adds the smallest durable review model to the EXISTING public.feedback
-- table — the [REPORT] envelope already lands there via submitContentReport()
-- / parseReportBody() (src/lib/reports.ts). No new table, no new enum.
--
-- A report is OPEN when moderation_reviewed_at IS NULL. It closes only after
-- an explicit moderator decision writes BOTH moderation_reviewed_at and a
-- moderation_resolution from the fixed vocabulary below — the CHECK
-- constraint below makes a half-reviewed row (one set, not the other)
-- impossible to store, so a crash between the two writes can never be
-- silently read back as "resolved" or leave an orphaned resolution.
-- ============================================================================

alter table public.feedback
  add column if not exists moderation_reviewed_at timestamptz,
  add column if not exists moderation_reviewed_by uuid references public.users(id) on delete set null,
  add column if not exists moderation_resolution text;

alter table public.feedback
  drop constraint if exists feedback_moderation_resolution_vocabulary;
alter table public.feedback
  add constraint feedback_moderation_resolution_vocabulary
  check (
    moderation_resolution is null
    or moderation_resolution in (
      'no_action', 'flag_rejected', 'flag_removed', 'comment_removed', 'target_unavailable'
    )
  );

-- reviewed_at and resolution are set together or not at all. reviewed_by is
-- deliberately NOT part of this pair — a report reviewed before this column
-- existed, or reviewed via the dashboard with the actor unrecorded, is a
-- real (if imperfect) closed state, not a half-reviewed one.
alter table public.feedback
  drop constraint if exists feedback_moderation_review_pairing;
alter table public.feedback
  add constraint feedback_moderation_review_pairing
  check (
    (moderation_reviewed_at is null) = (moderation_resolution is null)
  );

-- The queue's default view is "open reports, oldest first" — a partial index
-- on exactly that predicate so it never has to scan closed history.
create index if not exists feedback_moderation_open_idx
  on public.feedback (created_at)
  where moderation_reviewed_at is null;

-- ── Least-privilege admin access ────────────────────────────────────────────
--
-- WHY COLUMN-LEVEL GRANTS, NOT A "pin every other column" RLS check: an
-- earlier attempt at this wrote a WITH CHECK on public.feedback's UPDATE
-- policy that subqueried public.feedback itself (to assert body/category/
-- contact_email/etc. were unchanged) and hit Postgres's "infinite recursion
-- detected in policy for relation feedback" — evaluating that subquery
-- re-triggers RLS on the same relation it's defined on. The fix used here:
-- a feedback policy may query public.users (a different relation, already
-- the proven pattern used by the flags status-transition guard) but must
-- NEVER query public.feedback from within its own policy. Row-level access
-- (which rows) stays in RLS below; WHICH COLUMNS an admin may write is
-- enforced by a plain column-level GRANT, which Postgres checks
-- independently of RLS and cannot recurse.
-- Scoped to REPORT rows only (the '[REPORT]' envelope), not every feedback
-- row — an admin's moderation authority is over abuse reports, not over
-- ordinary bug/idea/love feedback, which stays visible only to the
-- maintainer-email policy above. LIKE's '[' and ']' are plain literal
-- characters in Postgres (unlike some other dialects' pattern languages),
-- so this needs no escaping.
drop policy if exists "feedback_select_moderation" on public.feedback;
create policy "feedback_select_moderation"
  on public.feedback for select
  to authenticated
  using (
    body like '[REPORT]%'
    and exists (
      select 1 from public.users as account
      where account.id = (select auth.uid()) and account.is_admin = true
    )
  );

revoke update on public.feedback from authenticated;
grant update (moderation_reviewed_at, moderation_reviewed_by, moderation_resolution)
  on public.feedback to authenticated;

drop policy if exists "feedback_update_moderation" on public.feedback;
create policy "feedback_update_moderation"
  on public.feedback for update
  to authenticated
  using (
    body like '[REPORT]%'
    and exists (
      select 1 from public.users as account
      where account.id = (select auth.uid()) and account.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.users as account
      where account.id = (select auth.uid()) and account.is_admin = true
    )
    -- An admin may only record THEMSELVES as the reviewer, never backdate a
    -- decision to a different admin.
    and (moderation_reviewed_by is null or moderation_reviewed_by = (select auth.uid()))
  );

-- ROLLBACK:
--   revoke update (moderation_reviewed_at, moderation_reviewed_by, moderation_resolution)
--     on public.feedback from authenticated;
--   drop policy if exists "feedback_update_moderation" on public.feedback;
--   drop policy if exists "feedback_select_moderation" on public.feedback;
--   drop index if exists feedback_moderation_open_idx;
--   alter table public.feedback drop constraint if exists feedback_moderation_review_pairing;
--   alter table public.feedback drop constraint if exists feedback_moderation_resolution_vocabulary;
--   alter table public.feedback drop column if exists moderation_resolution;
--   alter table public.feedback drop column if exists moderation_reviewed_by;
--   alter table public.feedback drop column if exists moderation_reviewed_at;
-- ============================================================================
