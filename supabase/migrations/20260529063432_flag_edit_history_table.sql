-- ===========================================================================
-- 2026-05-25 — Flag edit history table (Jordan Rec A — CONDITIONAL)
-- ===========================================================================
--
-- !!! PROPOSE-ONLY — CONDITIONAL. Apply ONLY if Sky answers YES to:
--     "Do you want an edit history table before the flag-editing UI ships?"
--     See sky-decisions-briefing-2026-05-25.md, Decision #1. !!!
--
-- This migration is SEPARATE from the RLS replacement migration
-- (2026-05-25_flag_edit_rls_replacement.sql). You can apply the RLS
-- replacement without applying this one — the edit feature will work
-- but edits will not be logged.
--
-- GATE: Jordan RECOMMENDED (not a hard blocker for Phase-0). See
--   jordan-flag-editing-review-2026-05-24.md — Rec A.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS MIGRATION DOES:
-- ---------------------------------------------------------------------------
--
-- Creates a `public.flag_edit_history` table — an append-only audit trail
-- of content edits to flags. Complements `flag_status_history` (which
-- captures status changes) by capturing content changes: description,
-- category, severity, and context_tags.
--
-- Design decisions:
--
--   1. One row per edit event (not one row per changed field). A single
--      PATCH that changes description + severity = one history row. The
--      before/after state is stored as jsonb `old_values` / `new_values`
--      so the schema doesn't need to change if new editable fields are added.
--
--   2. `user_id` is stored for accountability but is hidden from regular
--      clients — same privacy guard as `flag_status_history`. The public-safe
--      view `flag_edit_history_public` omits `user_id`. Only the maintainer
--      can query the raw table.
--
--   3. `changed_fields text[]` records which fields actually changed in this
--      edit (e.g., ['description', 'category']). Useful for display logic
--      ("description was updated") without having to diff the jsonb columns.
--
--   4. The history is written by the application layer (in updateFlag() in
--      src/lib/flags.ts), not by a database trigger. Reason: a BEFORE/AFTER
--      trigger on column changes would need to name every editable column;
--      the app layer can diff old and new values more flexibly and only write
--      a history row when something actually changed. If this becomes a
--      reliability concern later (client could bypass), migrate to a trigger.
--
--   5. RLS: INSERT is allowed only by the owner of the flag being edited
--      (the app layer enforces this, but RLS is the safety net). No UPDATE
--      or DELETE policy — append-only from the client's perspective.
--
-- ---------------------------------------------------------------------------
-- RETENTION:
-- ---------------------------------------------------------------------------
--
--   ON DELETE CASCADE from `public.flags` — deleting a flag deletes its
--   edit history. No separate time-based pruning. A user deleting their
--   account sets `user_id` to NULL via ON DELETE SET NULL on the FK to
--   `auth.users` — the row remains but is anonymized. (Same pattern as
--   flag_status_history — Jordan privacy condition #2 extended to edits.)
--
-- ---------------------------------------------------------------------------
-- HOW TO APPLY (Sky, after deciding YES on Rec A):
-- ---------------------------------------------------------------------------
--
-- Supabase Dashboard → Project → SQL Editor → New query →
--   paste this whole file → Run.
--   IMPORTANT: Apply 2026-05-25_flag_edit_rls_replacement.sql FIRST.
--   The history table is useless without the edit policy in place.
--
-- AFTER APPLYING:
--   1. Dashboard → Database → Tables → confirm `public.flag_edit_history`
--      with columns: id, flag_id, user_id (nullable), changed_fields,
--      old_values, new_values, created_at.
--   2. Dashboard → Database → Policies → confirm policies on
--      flag_edit_history: INSERT (owner of the flag only), SELECT
--      (maintainer raw, authenticated via view).
--   3. Confirm view `flag_edit_history_public` exists with columns:
--      id, flag_id, changed_fields, old_values, new_values, created_at
--      (NO user_id).
--   4. After Shamus wires updateFlag() to insert history rows, edit a flag
--      in the app and confirm a row appears in Table Editor →
--      flag_edit_history.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK:
-- ---------------------------------------------------------------------------
--
--   drop view if exists public.flag_edit_history_public;
--   drop table if exists public.flag_edit_history;
--   -- Also remove the history-insert call from src/lib/flags.ts →
--   -- updateFlag() (code change, not SQL).
--
-- After rollback, the edit feature continues to function — edits just won't
-- be logged. The edit UI placeholder for "History" will return [].
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. The edit history table.
-- ---------------------------------------------------------------------------

create table if not exists public.flag_edit_history (
  id uuid primary key default gen_random_uuid(),
  -- Cascade: deleting the flag deletes its edit history.
  flag_id uuid not null references public.flags(id) on delete cascade,
  -- Nullable: if the user later deletes their account, we keep the audit row
  -- but lose the attribution (right-to-be-forgotten, same as status history).
  user_id uuid references auth.users on delete set null,
  -- Which fields changed in this edit. Array of field names, e.g.
  -- ['description', 'category']. Written by the app layer.
  changed_fields text[] not null,
  -- Before state — only the editable fields that changed.
  -- e.g., '{"description": "old text", "category": "steep_grade"}'
  old_values jsonb not null default '{}',
  -- After state — the new values for the same fields.
  new_values jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Hot path: "show me the edit history for THIS flag, newest first".
create index if not exists flag_edit_history_flag_idx
  on public.flag_edit_history (flag_id, created_at desc);

comment on table public.flag_edit_history is
  'Append-only audit trail of content edits to public.flags. Captures before/after values of description, category, severity, context_tags. Jordan Rec A (2026-05-24).';


-- ---------------------------------------------------------------------------
-- 2. Row-level security.
-- ---------------------------------------------------------------------------

alter table public.flag_edit_history enable row level security;

-- INSERT: only the owner of the flag being edited can insert a history row.
-- This mirrors the RLS policy on the flags table itself. The app layer does
-- this insert immediately after the flags UPDATE, within the same request.
drop policy if exists "flag_edit_history insert by flag owner" on public.flag_edit_history;
create policy "flag_edit_history insert by flag owner"
  on public.flag_edit_history for insert
  to authenticated
  with check (
    (select auth.uid()) = (
      select user_id from public.flags where id = flag_id
    )
  );

-- SELECT raw table: maintainer only (sees user_id for accountability).
drop policy if exists "flag_edit_history select by maintainer" on public.flag_edit_history;
create policy "flag_edit_history select by maintainer"
  on public.flag_edit_history for select
  to authenticated
  using (
    (select auth.email()) = 'skylerhalisky@gmail.com'
  );

-- SELECT via public view: all authenticated users can read history rows
-- through the view (which hides user_id). This policy allows the view to
-- return rows; the privacy boundary is the view's column list.
drop policy if exists "flag_edit_history select via public view" on public.flag_edit_history;
create policy "flag_edit_history select via public view"
  on public.flag_edit_history for select
  to authenticated
  using (true);

-- No UPDATE or DELETE policies — append-only from the client's perspective.
-- Service role (maintainer dashboard) can clean up if needed.

-- Grant defense: revoke direct SELECT from regular clients.
-- Even with a too-permissive future RLS policy, the grant must be re-issued
-- before user_id data is reachable.
revoke select on public.flag_edit_history from anon, authenticated;


-- ---------------------------------------------------------------------------
-- 3. Public view — same rows, NO user_id. (Jordan privacy pattern)
-- ---------------------------------------------------------------------------
--
-- SECURITY INVOKER: the view runs with the caller's privileges, so RLS on
-- the underlying table is enforced. The column list is the privacy boundary.

drop view if exists public.flag_edit_history_public;
create view public.flag_edit_history_public
  with (security_invoker = true)
  as
  select id, flag_id, changed_fields, old_values, new_values, created_at
    from public.flag_edit_history;

grant select on public.flag_edit_history_public to authenticated;

comment on view public.flag_edit_history_public is
  'Public-safe projection of flag_edit_history — omits user_id. Jordan privacy pattern (Rec A, 2026-05-24).';

-- ===========================================================================
-- End of file.
-- ===========================================================================
