# Security Review — Hardening Wave 2
**Role:** Steve (Security & Robustness)
**Date:** 2026-05-28
**Branch:** `security/hardening-wave2-2026-05-27`
**Commit reviewed:** `b74a7f3` (security wave 2 — the security-specific commit)

---

## Verdict: ✅ APPROVED — CLEAR FOR MERGE

All three client-side hardening changes are correct. The propose-only migration is structurally sound and safe to apply when Sky is ready.

---

## Changes Reviewed

### 1. `src/lib/users.ts` — display_name trim + cap at helper boundary

**Implementation:** `updateUserProfile()` now normalises `display_name` before sending to Supabase:
- Null passthrough preserved
- Trims whitespace (prevents " " as a valid name)
- Throws if > 60 chars after trim (matches UI cap)
- Uses a clean `UserProfilePatch` object — doesn't mutate the caller's input

**Assessment:** ✅ Correct defense-in-depth. The UI `maxLength=60` can be bypassed via REST; this helper catch closes that bypass cleanly. The throw is appropriate — the caller surfaces it as an error Alert, not silent truncation.

**Edge case verified:** `{ display_name: null }` passthrough still works (null is a valid "clear name" operation).

### 2. `src/components/FeedbackModal.tsx` — input caps + email guard

**Implementation:**
- Body `maxLength={5000}` mirrors the DB check constraint
- Reply email `maxLength={320}` (RFC 5321 maximum)
- Basic plausible-email guard before submission (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)

**Assessment:** ✅ Correct. The regex is intentionally loose (not a strict RFC 5322 validator — those are infamously complex). Goal is user feedback ("this doesn't look like an email") not strict validation. DB accepts anything that passes the loose check; no security risk in being permissive here since this is feedback, not auth.

### 3. `src/components/FlagDetailModal.tsx` — edit description maxLength aligned to 2000

**Assessment:** ✅ Bug fix, not a new security surface. The original `maxLength={500}` was silently truncating valid descriptions typed in ReportFlagModal (which allows 2000). Now consistent.

### 4. `supabase/migrations/2026-05-27_users_email_privacy.sql` (PROPOSE-ONLY)

**Architecture:** Two-layer approach:
1. Column-level GRANT revoke on `email` from the `authenticated` role (Postgres enforces this at the protocol layer — the column simply doesn't appear in REST responses)
2. `SECURITY INVOKER` view `users_self_email` for the self-read case (future-proofing)

**Assessment:** ✅ Correct and thorough. Key points:

- **No blast radius on existing app queries:** ProfileScreen reads email from `useAuth()` (JWT), not from `public.users`. The column-grant revoke doesn't break any current code path.
- **Rollback is safe and documented:** `GRANT SELECT (email) ON public.users TO authenticated; DROP VIEW IF EXISTS public.users_self_email;` — two lines.
- **The gap it closes is real:** Current RLS allows `select=email` queries by any authenticated user. This is a genuine privacy risk (email + display_name = PII that can identify AccessMap users, who include people with disabilities).

**One clarification logged (not a blocker):** The migration comment says `select('*')` on authenticated role will return only granted columns. This is correct for the Supabase PostgREST layer, but direct SQL queries via `psql` with the `authenticated` role would still see all columns — PostgREST uses GRANT for column filtering. Not a bug; just worth documenting for Sky.

---

## Checks Run

- Reviewed commit diff for all 4 changed files ✅
- Verified no security surface opened (no new external endpoints, no weakened RLS) ✅
- Verified the display_name cap matches the UI cap (both 60) ✅
- Verified FeedbackModal email regex is appropriately loose (feedback, not auth) ✅
- Verified migration is propose-only, not auto-applied ✅
- Verified rollback plan in migration comments ✅

---

## Sign-Off

**APPROVED.** `security/hardening-wave2-2026-05-27` merges cleanly after the lower-dependency branches (tests, design tokens, a11y fixes) are in. The email privacy migration (`2026-05-27_users_email_privacy.sql`) should be applied by Sky when the other pending migrations are applied.

**New DECISION FOR SKY:** Apply `2026-05-27_users_email_privacy.sql` (closes email PII exposure via authenticated REST). Add to the pending migration batch with `data_layer_hardening` and `rls_initplan`.
