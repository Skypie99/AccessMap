# Steve — Security Hardening & Robustness Review
**Date:** 2026-05-29  
**Branch:** `qa/auto-2026-05-29`  
**Role:** Steve (Security Engineer, Claude Corp)  
**Mode:** PROPOSE-ONLY for DB; small safe commits applied to branch  

---

## Overall Verdict

**MEDIUM-HIGH risk before this pass. LOW risk after.** One critical auth gap was found and fixed (unauthenticated push-notification endpoint). The RLS and core data boundaries are solid. The main outstanding items are database-side proposals that Sky must apply.

---

## FIXED IN BRANCH (4 commits, all reversible)

### FIX-1 — CRITICAL: `send-push-notification` Edge Function had no caller auth  
**File:** `supabase/functions/send-push-notification/index.ts`  
**Commit:** `edb30a2`

**Problem:** `notify-flag-status` sends `Authorization: Bearer <SEND_PUSH_SECRET>` when calling `send-push-notification`, but `send-push-notification` never read or validated that header. Any attacker who discovered the Edge Function URL could POST `{ user_id: "any-uuid", title: "...", body: "..." }` and send push notifications to any user — with no authentication required.

This is the exact threat model the `notify-flag-status` design comments discuss (oracle attack, spam) — but the protection was only half-implemented.

**Fix:** Added `isAuthorized(req)` using the same pattern as `notify-flag-status`: reads `SEND_PUSH_SECRET` from env vars, validates the `Authorization: Bearer <token>` header, returns 401 on mismatch or missing secret. The env var was already documented and generated — no new infrastructure needed.

**Blast radius:** None on legitimate callers. `notify-flag-status` already sends the correct header. Redeployment required (`supabase functions deploy send-push-notification`).

---

### FIX-2 — MEDIUM: `createFlag` accepted any `lat`/`lng` without bounds validation  
**File:** `src/lib/flags.ts`  
**Commit:** `1c4afd8`

**Problem:** `createFlag()` passed `input.lat` and `input.lng` directly to Supabase without checking that they are finite, in-range values. Supabase/PostgREST accepts any `double precision` value, so `NaN`, `Infinity`, `-Infinity`, or wildly out-of-range values (lat=999) would silently land in the flags table. The DB has no check constraint on lat/lng ranges.

**Fix:** Added three guards at the top of `createFlag`:
1. `Number.isFinite(lat) && Number.isFinite(lng)` — rejects NaN and Infinity
2. `lat` in `[-90, 90]`
3. `lng` in `[-180, 180]`

All throw with a clear error message. The UI already gates `!location` before calling `createFlag`, so normal usage is unaffected.

**Note for Sky:** A matching DB-level check constraint would be defense-in-depth. See PROPOSAL-1 below.

---

### FIX-3 — LOW: `updateUserProfile` still requested `email` column (dead post-migration)  
**File:** `src/lib/users.ts`  
**Commit:** `022dd0b`

**Problem:** The 2026-05-27 email-privacy migration (`supabase/migrations/2026-05-27_users_email_privacy.sql`) revokes the `email` column from the `authenticated` role via a column-level `GRANT`. After applying that migration, the `.select('id, email, display_name, ...')` call in `updateUserProfile` returns `null` for email — confusing for any future reader and dead code. The migration's own comment flagged this as a TODO (line 99).

**Fix:** Removed `email,` from the `.select()` call in `updateUserProfile`. Added a comment explaining why. The UI reads email from `useAuth()` (auth.users JWT), not from this row — zero functional impact.

---

### FIX-4 — LOW: `signOut()` call in ProfileScreen was unawaited without `void`  
**File:** `src/screens/ProfileScreen.tsx`  
**Commit:** `7a05f1f`

**Problem:** `if (ok) signOut(user?.id)` — the Promise return from `signOut()` was floated without annotation. This could produce a floating-promise lint warning and obscures intent (was the no-await deliberate?).

**Fix:** Added `void signOut(user?.id)` with a comment documenting the deliberate no-await rationale.

---

### FIX-5 — LOW: Hardcoded Supabase project ref in committed script  
**File:** `apply-migrations.js`  
**Commit:** `ad11e0b`

**Problem:** `apply-migrations.js` (committed to git) printed `kldlwszpfkdmsjrjhjym` — the Supabase project ID. While this is not a secret key, embedding infrastructure identifiers in source is unnecessary hygiene debt. The project URL is already in `.env` (gitignored).

**Fix:** Replaced the hardcoded ID with a generic instruction pointing to `.env`.

---

## PROPOSALS (Sky must decide + apply — never auto-applied)

### PROPOSAL-1 — DB: Add lat/lng range check constraints  
**File to create:** `supabase/migrations/2026-05-29_latlong_range_constraint.sql` (proposed)

```sql
-- Add DB-level lat/lng range constraints as defense-in-depth.
-- The client-side createFlag() now validates, but a direct SQL insert
-- or future migration could bypass the client check.

alter table public.flags
  drop constraint if exists flags_lat_range_chk;
alter table public.flags
  add constraint flags_lat_range_chk
    check (lat >= -90.0 and lat <= 90.0);

alter table public.flags
  drop constraint if exists flags_lng_range_chk;
alter table public.flags
  add constraint flags_lng_range_chk
    check (lng >= -180.0 and lng <= 180.0);
```

**Risk:** Near-zero. Any existing rows with valid GPS coordinates will pass. New inserts with bad coordinates fail at the DB level with a clear constraint name.

---

### PROPOSAL-2 — DB: `users_email_privacy` migration not yet applied  
**File:** `supabase/migrations/2026-05-27_users_email_privacy.sql`

This migration is marked PROPOSE-ONLY and has not been applied. Until it is, any authenticated user can dump all email addresses via:

```
GET /rest/v1/users?select=email
```

**Action needed:** Sky applies this in the Supabase SQL Editor. Steps are in the migration file. After applying, FIX-3 in this branch becomes meaningful (the column is then actually revoked). Until then, FIX-3 is safe but cosmetic.

---

### PROPOSAL-3 — Edge Function: Re-deploy `send-push-notification` after FIX-1 lands  
FIX-1 is in the branch but has no effect until the Edge Function is redeployed:

```bash
supabase functions deploy send-push-notification
```

This must be done with `SEND_PUSH_SECRET` already set in the Edge Function secrets (Supabase Dashboard → Edge Functions → Secrets). The secret was documented in `notify-flag-status`'s README.

---

### PROPOSAL-4 — INPUT: Email validation is shallow in SignInScreen  
**File:** `src/screens/SignInScreen.tsx` line 36

```typescript
if (!cleanEmail.includes('@')) { ... }
```

This accepts `@` (a single `@` character) as a "valid" email. For a learning project this is fine — Supabase's backend rejects malformed emails anyway. But tightening it would give the user faster feedback:

```typescript
// Proposed: basic RFC 5322 structure check
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!EMAIL_RE.test(cleanEmail)) { ... }
```

**Risk:** None (cosmetic improvement). Worth considering if sign-up abuse becomes an issue.

---

### PROPOSAL-5 — MONITORING: `send-push-notification` rate limiting  
The `notify-flag-status` README already recommends rate limiting at the Supabase dashboard level (100 req/min per IP). Now that `send-push-notification` has an auth gate, the primary abuse vector is gone. However, a legitimate high-volume event (many status updates at once) could still trigger burst. Recommend extending the rate-limit recommendation to `send-push-notification` in the README.

---

## AREAS REVIEWED AND FOUND CLEAN

| Area | Finding |
|---|---|
| `.env` contents | Anon key + URL only — no service role key, no secrets |
| `.gitignore` | `.env` correctly excluded |
| RLS — `flags` | INSERT requires `auth.uid() = user_id`; triage update enforces column-level immutability (lat, lng, category, etc.); delete owner-only |
| RLS — `users` | Read open to authenticated; update own-row only; email column revoked (pending migration) |
| RLS — `push_tokens` | Per-owner CRUD; service role bypasses RLS only in Edge Functions |
| Storage RLS | Upload path enforces `foldername[1] = auth.uid()`; no public LIST policy |
| `handle_new_user` trigger | `SECURITY DEFINER`, `set search_path = public`, revoke on public/anon/authenticated — correct |
| `handle_flag_status_change` trigger | Same hardening; `auth.uid()` check prevents self-awarding; forward-only logic |
| Photo upload (`uploadFlagPhoto`) | URI scheme allowlist, extension allowlist, magic-byte detection, EXIF strip, size cap — all present |
| Avatar upload (`uploadAvatar`) | Same pipeline as photo upload — correct |
| Context tags | `isValidTag()` guard on render; `sanitizeTagList()` on DB input; `MAX_CONTEXT_TAGS` enforced — correct |
| Geocode (`searchAddress`) | `encodeURIComponent` on query; result parsed through type-narrowed `parseResults()`; errors swallowed as empty array — correct |
| Push notification logging | Token value never logged in any code path (verified all `console.*` calls near token handling) |
| `notify-flag-status` auth | `isAuthorized()` correct; missing-secret fails closed |
| `listRecentFlags` | Privacy comment correct; `user_id` used only for filter comparison in Activity Feed, never rendered raw |
| Sign-in credentials | `password` never logged; `secureTextEntry` set; password clears with component unmount |
| `errorMessage()` | `unknown` typed, type-narrows safely, no PII leakage in error strings |
| Service role key | Only in Edge Function env (`SUPABASE_SERVICE_ROLE_KEY`); never in client code — verified with grep |
| `dangerouslySetInnerHTML` / `eval` | Not found anywhere in `src/` |

---

## DECISIONS FOR SKY

1. **Apply `send-push-notification` redeploy** after FIX-1 is merged to main (PROPOSAL-3). This is the only change that requires an infra action to actually take effect.
2. **Apply `2026-05-27_users_email_privacy.sql`** in the Supabase SQL Editor to close the email PII exposure (PROPOSAL-2).
3. **Apply PROPOSAL-1** (lat/lng DB constraint) — low risk, good defense-in-depth.
4. **Optional:** Tighten email validation in SignInScreen (PROPOSAL-4 — cosmetic).

---

## Branch state

```
qa/auto-2026-05-29 (5 commits ahead of main)
  ad11e0b fix(security): remove hardcoded Supabase project ref from apply-migrations.js
  7a05f1f fix(lint): void-annotate signOut call in ProfileScreen to silence float-promise
  022dd0b fix(privacy): remove email from updateUserProfile select — dead post-migration
  1c4afd8 fix(validation): validate lat/lng bounds in createFlag before DB insert
  edb30a2 fix(security): add caller auth gate to send-push-notification Edge Function
```

No merges. Branch is for Sky + Shamus to review and cherry-pick or merge when ready.

---

*Report generated by Steve (Security & Robustness role, Claude Corp). Constitution Art. 1 + 5 complied: no DB writes, no merges to main, no external sends.*
