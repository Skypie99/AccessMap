# Shamus — Flag-Editing Build Brief
**Date:** 2026-05-25 · **Gate:** Jordan APPROVED WITH CONDITIONS (2026-05-24)
**Status:** UNBLOCKED for UI build · Ships after Sky applies RLS migration

---

## What to build

Allow a verified user to edit their own flag's `description`, `category`, and `severity` — **restricted to flags still in `open` status**.

### Editable fields
- `description`
- `category`
- `severity`
- `context_tags` (if `flag_context_tags` migration has been applied)

### Hard read-only (never editable in this flow)
- `id`, `user_id`, `lat`, `lng`, `status`, `created_at`, `photo_url`

Photo editing is deferred to a later sprint (requires paired upload/delete + storage RLS changes).

---

## RLS requirement (Jordan mandatory condition)

The current `flags update own` policy does NOT enforce `status = 'open'`. The replacement must be:

```sql
-- Drop the old policy first
drop policy if exists "flags update own" on public.flags;

-- New policy: owner can edit description/category/severity on open flags only
create policy "flags owner edit open"
  on public.flags
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'open'
  )
  with check (
    (select auth.uid()) = user_id
    and status = 'open'
    -- Prevent self-escalation or reassignment via WITH CHECK
    and user_id = (select user_id from flags where id = flags.id)
  );
```

> **This migration is required before the feature ships.** Sky applies it via Supabase dashboard. The migration file should go in `supabase/migrations/` as `<next-number>_flag_edit_rls.sql` (check existing numbers for the next available). Branch: `shamus/flag-editing#build`.

---

## UI guidance (Quinn pre-audit expectations)

- Edit button visible only to the owner on their own `open` flags (hide for `verified`, `resolved`, `rejected`)
- Simple bottom-sheet or inline edit form — same visual pattern as ReportFlagModal
- Validation: `description` max 500 chars (matches the create-flag constraint), `severity` 1–5, `category` from the existing enum
- Show a subtle "edited" indicator after a successful save (no timestamp — just a dot or "(edited)" label) to maintain community accountability

---

## After build

1. Commit to branch `shamus/flag-editing#build`
2. Gary runs tests: `npm run typecheck && npm run lint && npm test`
3. Quinn does a QA pass
4. Alex does a11y sweep
5. Push branch → Morgan surfaces to Sky for RLS migration + merge
