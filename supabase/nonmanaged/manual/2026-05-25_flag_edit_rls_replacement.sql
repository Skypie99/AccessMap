-- ===========================================================================
-- 2026-05-25 — Flag-editing RLS replacement (Jordan mandatory condition #1)
-- ===========================================================================
--
-- !!! PROPOSE-ONLY — DO NOT APPLY YET. Sky applies this in the Supabase
--     dashboard after reviewing. The agent system NEVER writes to the
--     live DB (Const. Art. 5.3). !!!
--
-- GATE: Jordan APPROVED WITH CONDITIONS (2026-05-24).
--   jordan-flag-editing-review-2026-05-24.md — Condition 1.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS MIGRATION DOES:
-- ---------------------------------------------------------------------------
--
-- REPLACES the existing "flags update own" policy with a tighter policy named
-- "flags owner edit open". The new policy:
--
--   1. Adds `status = 'open'` to the USING clause — owners can ONLY target
--      their own flags that are still in the `open` state. Verified, resolved,
--      and rejected flags are invisible to this policy (0 rows returned on
--      attempt). This prevents retroactive editing after community verification.
--
--   2. Freezes immutable columns (lat, lng, user_id, created_at, status) in
--      the WITH CHECK clause using correlated subselects (same initPlan-safe
--      pattern as the non-owner status policy). An attempt to change any of
--      these columns will fail WITH CHECK and the UPDATE is rejected.
--
--   3. Editable columns (description, category, severity, context_tags,
--      photo_url [see note]) are NOT listed in WITH CHECK — they can be
--      freely changed by the owner on open flags.
--
-- NOTE on photo_url: Jordan Condition 2 (code-level, not RLS-level) says the
-- edit UI must NOT expose photo_url. This policy technically allows the owner
-- to update photo_url on their own open flags (since it's not frozen in
-- WITH CHECK). That is intentional: the database enforces what it can, but
-- the storage RLS invariant for photo_url is enforced via the storage bucket
-- policies (upload scoped to <auth.uid>/<file>). The code-level omission of
-- photo_url from the edit payload is enforced by Shamus during the UI build
-- (see 2026-05-25-shamus-flag-editing-brief.md, Condition 2). If you want an
-- extra DB-layer guard, add `photo_url is not distinct from (select photo_url
-- from public.flags where id = flags.id)` to WITH CHECK.
--
-- ---------------------------------------------------------------------------
-- INTERACTION WITH OTHER POLICIES:
-- ---------------------------------------------------------------------------
--
-- Postgres ORs all UPDATE policies on the same table. After this migration:
--
--   "flags owner edit open"  →  owner, open flags only, any editable column
--   "flags status update by any authenticated"  →  non-owner, all flags,
--                                                    status column only
--
-- These two policies coexist without conflict because:
--   - An owner trying to edit a non-open flag fails BOTH policies (the first
--     requires status=open; the second pins status to its old value, so a
--     status change fails WITH CHECK anyway — and there's no editable column
--     path for a non-open flag via either policy).
--   - A non-owner trying to flip status still passes via the second policy.
--   - An owner trying to self-escalate status on an open flag fails: the
--     first policy's WITH CHECK pins `status` to its old value.
--
-- ---------------------------------------------------------------------------
-- SMOKE TESTS (Sky, after applying):
-- ---------------------------------------------------------------------------
--
-- 1. Reporter (Account A) edits description/category/severity on their own
--    `open` flag — should succeed; `updated_at` refreshes.
-- 2. Reporter attempts to change lat/lng/user_id/created_at/status via direct
--    REST PATCH — should fail (WITH CHECK rejects).
-- 3. Reporter attempts to edit a `verified` flag they own — should return 0
--    rows (USING: status = 'open' excludes verified rows).
-- 4. Non-owner (Account B) attempts to edit Account A's open flag's
--    description via REST PATCH — should fail (USING: auth.uid() = user_id).
-- 5. Non-owner STILL able to flip status on any flag via the triage policy
--    ("flags status update by any authenticated") — must remain working.
-- 6. `on_flag_updated_at` trigger fires on edit — updated_at changes.
-- 7. `handle_flag_status_change` trigger does NOT fire for edit-only UPDATEs
--    (it's AFTER UPDATE OF status, so description/category/severity changes
--    don't trigger points or history writes).
--
-- ---------------------------------------------------------------------------
-- ROLLBACK:
-- ---------------------------------------------------------------------------
--
--   drop policy if exists "flags owner edit open" on public.flags;
--   -- Re-create the original "flags update own" policy (no status guard):
--   create policy "flags update own"
--     on public.flags for update
--     to authenticated
--     using ((select auth.uid()) = user_id)
--     with check ((select auth.uid()) = user_id);
--
-- After rollback, owners can again edit any column on any of their flags
-- regardless of status. The edit UI (when built) should be removed or hidden
-- until the new policy is re-applied.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Drop the old permissive owner UPDATE policy.
-- The new policy has the same ownership check PLUS the open-only guard
-- and immutable-column protection. Dropping the old one first avoids the
-- "policy with this name already exists" error on re-run.
-- ---------------------------------------------------------------------------

drop policy if exists "flags update own" on public.flags;


-- ---------------------------------------------------------------------------
-- New policy: owner can edit editable fields on their own OPEN flags only.
-- ---------------------------------------------------------------------------

create policy "flags owner edit open"
  on public.flags for update
  to authenticated
  using (
    -- Ownership check (initPlan-safe).
    (select auth.uid()) = user_id
    -- Open-only guard: owners can only target flags still awaiting triage.
    -- Verified/resolved/rejected flags return 0 rows — the UPDATE is a no-op
    -- from the caller's perspective, not an error.
    and status = 'open'
  )
  with check (
    -- Must still be the same owner after the update.
    (select auth.uid()) = user_id
    -- Immutable columns: freeze their values using correlated subselects
    -- (READ COMMITTED: subselects see the OLD row, so equality check passes
    -- only if the column was not changed in the NEW row).
    and lat        = (select lat        from public.flags where id = flags.id)
    and lng        = (select lng        from public.flags where id = flags.id)
    and user_id    = (select user_id    from public.flags where id = flags.id)
    and created_at = (select created_at from public.flags where id = flags.id)
    and status     = (select status     from public.flags where id = flags.id)
  );

-- ===========================================================================
-- End of file.
-- ===========================================================================
