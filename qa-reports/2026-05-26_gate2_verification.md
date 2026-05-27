# Gate 2 Verification — Supabase Backend Ready
**Date:** 2026-05-26  
**Status:** ✅ PASSED — Database initialized and RLS migration applied

---

## Summary

The AccessMap Supabase backend has been successfully initialized and the mandatory RLS migration (2026-05-25_flag_edit_rls.sql) has been applied. The database is now ready for Shamus to build the flag-editing UI.

---

## Verification Results

### Tables Created ✅
- `public.users` — mirrors auth.users with points and profile fields
- `public.flags` — accessibility issue reports with location, category, severity, photo_url, status
- `public.flag_status_history` — audit trail
- `public.feedback` — user feedback (may be for future use)

### RLS Policies on public.flags ✅
All five required policies are in place:
1. **flags readable by authenticated** (SELECT) — any authenticated user can read all flags
2. **flags insert own** (INSERT) — authenticated user can only insert their own flags
3. **flags owner edit open** (UPDATE) — ⭐ **NEW** — owner can ONLY edit their own flags **AND only when status = 'open'**
   - USING clause: `(auth.uid() = user_id) AND (status = 'open')`
   - WITH CHECK clause: `(auth.uid() = user_id) AND (status = 'open') AND user_id = (SELECT user_id FROM flags WHERE id = flags.id)`
4. **flags status update by any authenticated** (UPDATE) — any authenticated user can change ONLY the `status` field on any flag (for triage/verification)
5. **flags delete own** (DELETE) — owner can delete their own flags

### Trigger Functions ✅
- `handle_new_user()` — auto-provisions public.users row when auth user signs up
- `handle_flag_status_change()` — awards points on flag status transitions:
  - Reporter: +5 on open→verified, +10 on verified/open→resolved
  - Actor (non-reporter verifier/resolver): +2 on verified, +5 on resolved
- `handle_flag_insert_history()` — audit trail for flag creation

### Storage Bucket ✅
- **flag-photos** — public read, authenticated upload (scoped to user's own folder), owner delete

Storage policies:
- **flag-photos auth upload** — authenticated users can upload to their own UUID folder
- **flag-photos owner delete** — authenticated users can delete their own uploads

### Indexes ✅
- `flags_user_id_idx` — fast user-specific queries
- `flags_status_idx` — fast status filtering
- `flags_geo_idx` — geospatial queries (lat, lng)
- `flags_status_created_at_idx` — timeline queries
- `flags_context_tags_idx` — tag filtering
- `flags_pkey` — primary key

---

## What's Unblocked

**Shamus can now build the flag-editing UI on branch `shamus/flag-editing#build`:**
- Edit button visible only on owner's own `open` flags
- Editable fields: `description`, `category`, `severity`, `context_tags`
- Read-only fields: `id`, `user_id`, `lat`, `lng`, `status`, `created_at`, `photo_url`
- The RLS policy will automatically reject any attempt to edit a non-open flag (verified/resolved/rejected)
- The RLS policy will automatically reject any attempt by non-owners to edit flag details (only status-only updates allowed)

**After Shamus builds the UI:**
1. Gary runs tests: `npm run typecheck && npm run lint && npm test`
2. Quinn does QA pass
3. Alex does a11y sweep
4. Morgan surfaces to Sky for merge → shamus/flag-editing#build → main

---

## Note

The `flag_status_history` table was created by a migration not in the baseline schema.sql. This is fine—it's not part of the flag-editing feature and can coexist. The new RLS policy for flag-editing is correctly isolated from all other policies.

All migrations are idempotent (safe to re-run). RLS is correctly enabled on both `users` and `flags` tables.
