# Steve — Phase 5 Admin Moderation MVP

**Date:** 2026-05-30
**Branch:** `feat/sprint3-admin-moderation`
**Decision:** Option A — flag moderation only (no user account management)

---

## What was built

### 1. Migration — `supabase/migrations/2026-05-30_admin_role.sql`

Three operations, all idempotent:

| # | Operation | Rationale |
|---|-----------|-----------|
| 1 | `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false` | Admin gate column. Defaults false for all existing users. |
| 2 | `CREATE POLICY "admin delete any flag"` on `public.flags FOR DELETE` | Admins bypass the owner-only delete constraint via USING subselect on `is_admin`. |
| 3 | Replace `"users update own row"` WITH CHECK to add `is_admin IS NOT DISTINCT FROM (stored value)` | Prevents any client from flipping `is_admin` in either direction. Only direct DB / service-role access can promote a user. |

### 2. Type system — `src/types/database.ts`

Added `is_admin?: boolean` (optional) to `UserRow`. Marked optional following the project convention for propose-only migration columns — the client degrades gracefully if the column isn't present yet.

### 3. Admin hook — `src/lib/admin.ts`

`useIsAdmin(): boolean | null`
- `null` = loading
- `false` = not admin, unauthenticated, or column missing
- `true` = confirmed admin

Fetches via `public.users` once on mount; cancellation-safe; all errors return `false` (fail-closed).

### 4. Admin screen — `src/screens/AdminScreen.tsx`

- **Data source:** `listRecentFlags(200)` — all flags, all statuses, newest first.
- **Per-card display:** severity dot (color-coded), category label, status badge, lat/lng coordinates, description (2-line truncated), photo thumbnail.
- **Actions:**
  - **Remove flag** — `confirm()` dialog → `deleteFlag(id)` → row removed from list. The admin RLS policy allows this for any flag. Non-admins attempting the same call are blocked by Supabase (the existing "flags delete own" policy requires `user_id = auth.uid()`; the admin policy adds an OR path for `is_admin = true`).
  - **Dismiss** — `confirm()` dialog → `updateFlagStatus(id, 'rejected')` → card status updates in place. Uses the existing triage policy (any authenticated user can update status).
- **Loading state:** spinner overlay while fetching, per-card spinner while action in progress.
- **Unauthorized gate:** if `is_admin` comes back `false`, screen renders "Admin access required." — defense-in-depth in case the tab gate is bypassed.
- **Refresh:** pull-to-refresh via `RefreshControl`.
- **Accessibility:** all action buttons have `accessibilityRole="button"` and descriptive `accessibilityLabel`; touch targets are ≥ 44 px.

### 5. Navigation — `src/navigation/RootNavigator.tsx`

- Added `Admin: undefined` to `RootTabParamList`.
- Imported `useIsAdmin` hook.
- `NavInner` conditionally renders `<Tab.Screen name="Admin" ...>` only when `isAdmin === true` (never during null/loading, never for non-admins).
- Icon: `shield-outline` from Ionicons.

---

## Security analysis

| Surface | Risk | Mitigation |
|---------|------|------------|
| `is_admin` column | Client promotes self | `WITH CHECK` in updated RLS policy compares stored value; any deviation is rejected. Only service-role/direct SQL can set `true`. |
| Admin delete | Non-admin deletes arbitrary flags | `USING (SELECT is_admin ...)` evaluates per-statement (initPlan pattern); returns false for all non-admins. |
| Admin tab visibility | UI leaks admin existence | Tab only renders when `isAdmin === true`. Loading state hides the tab. Screen also independently checks. |
| `listRecentFlags` | Exposes all flag locations | Already RLS-gated to authenticated users; admin screen adds no new data exposure beyond what a normal user could query. Admin-specific columns (is_admin) are not included in the flags select list. |

---

## SQL to apply (Sky applies in Supabase dashboard)

```sql
-- File: supabase/migrations/2026-05-30_admin_role.sql
-- Paste and run in the Supabase SQL editor.
```

**Post-apply steps:**
1. To promote a user to admin: `UPDATE public.users SET is_admin = true WHERE email = 'skylerhalisky@gmail.com';`
2. Reload the app — the Admin tab appears immediately.

---

## TypeScript

```
npm run typecheck — PASS (0 errors)
```

---

## Decisions for Sky

| Item | Decision needed |
|------|----------------|
| SQL application | Apply `supabase/migrations/2026-05-30_admin_role.sql` in the Supabase dashboard when ready. |
| Self-promotion | After applying, run the UPDATE above to make yourself an admin (only way; the app cannot do it). |
| Dismiss vs reject | "Dismiss report" currently sets status to `rejected`. If the app evolves a separate abuse-report table, this can be revisited. No user-facing behavior changes — `rejected` is already a known status. |

---

## Out of scope (Option A)

- User account management (ban, suspend) — deferred.
- Community report-abuse button (tapping a flag to flag it) — deferred.
- Admin audit log — deferred.
- Pagination of the 200-row admin list — acceptable for current scale.
