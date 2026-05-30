# Wave 6 Security Sweep — Steve
**Date:** 2026-05-30 | **Branch:** security/wave6-sweep | **Role:** Steve — Safety & Robustness
**mode:** ACTIVE | **model_tier:** Sonnet | **typecheck:** npx tsc --noEmit EXIT 0

## Scope
Audited all Wave 6 branches (feat/wave6-easy-wins, design/innovation-wave6, design/wave6-components,
qa/wave6-test-infra, content/ux-copy-wave6, docs/wave6-a11y-spec, a11y/innovation-wave6,
a11y/phase3-final-sweep). Key new files: featureFlags.ts, geocode.ts, LeaderboardScreen.tsx,
FlagDetailModal.tsx (major additions), flags.ts (leaderboard+EXIF), pushNotifications.ts,
delete-account edge function, leaderboard_index.sql.

## 🔴 R1 — savePushToken silently swallows Supabase upsert error (FIXED)
**File:** src/lib/pushNotifications.ts
The upsert return value was discarded entirely. If the DB write failed, AsyncStorage was still
updated to 'true', silently lying to the app about push notifications being enabled.
**Fix:** `const { error } = await supabase.from(...).upsert(...); if (error) throw error;`
AsyncStorage is now only updated after a confirmed DB write.

## 🔴 R2 — console.debug in production photo-upload path (FIXED)
**File:** src/lib/flags.ts — stripExifNative, stripExifWeb, verifyExifStripped
Four console.debug calls in the hot photo-upload path. Metro/Hermes does not strip console.debug
in production builds; these fired on every upload, polluting Sentry with debug noise.
**Fix:** All four console.debug calls wrapped in `if (__DEV__)`. console.warn calls untouched.

## 🟡 Y1 — GUEST_SIGNIN_ENABLED defaults to true (FIXED)
**File:** src/lib/featureFlags.ts
Flag is unused (App.tsx gates guest mode independently) but defaulting true would allow any future
isEnabled() check to admit unauthenticated users before guest-auth is RLS-audited.
**Fix:** Changed default to false with explanatory comment.

## 🟡 Y2 — delete-account edge function returns raw DB error to client (PROPOSE)
**File:** supabase/functions/delete-account/index.ts
Raw Postgres error messages can expose table/column/constraint names. Propose sanitizing:
return a generic "Account deletion failed" message to client, log full error server-side.
**Blocked:** Edge function deploy is a production change. Requires Sky approval.

## 🟡 Y3 — Leaderboard exposes auth.users UUIDs for all top-20 users (INTENTIONAL)
users RLS explicitly allows authenticated reads. UUID needed for "is this me" highlight.
No email/PII beyond display_name and avatar_url. Design decision — document and confirm before App Store.

## 🟡 Y4 — getUserLeaderboardRank accepts arbitrary userId (LOW)
RLS allows all authenticated users to read all user rows (leaderboard requirement).
Fetching another user's points doesn't bypass any policy. Document RLS dependency.

## 🟡 Y5 — as any casts in stripExifWeb (TYPE SAFETY)
Six `as any` casts in canvas EXIF stripping due to TypeScript DOM lib limitations.
Non-trivial refactor. Track for Phase 3 hardening sprint.

## 🟢 G1 — context_tags as never cast — temporary, well-documented. Remove when migration lands.
## 🟢 G2 — Nominatim email in User-Agent — deliberate per Nominatim policy.
## 🟢 G3 — Comment stub (no server persistence yet) — maxLength={500} enforced client-side.
## 🟢 G4 — featureFlags.ts setFlag() correctly __DEV__-gated. ✅
## 🟢 G5 — RLS on flags UPDATE correctly layered (UI gate + DB policy). ✅

## Auth / RLS Summary
All new Supabase queries use explicit column lists. No dynamic SQL. No RLS weakened by Wave 6.
savePushToken: fixed (R1). delete-account edge function: verify_jwt:true + getUser() identity check. ✅

## DECISIONS FOR SKY
1. delete-account edge function error sanitization (Y2) — approve supabase functions deploy?
2. Leaderboard UUID exposure (Y3) — confirm intentional before App Store submission?
3. stripExifWeb as any refactor (Y5) — schedule for Phase 3 hardening sprint?

## Cross-Agent Conflict
Background agents (riley, dani, shamus) were switching branches during this run, causing my
commit to initially land on a11y/riley-wave-a-2026-05-29. Fixes were re-applied on
security/wave6-sweep. Riley's work and my security work are non-overlapping files.

## Rollback
src/lib/pushNotifications.ts: 2-line addition (error check)
src/lib/featureFlags.ts: default true → false + comment
src/lib/flags.ts: 4x console.debug wrapped in __DEV__
No schema changes. No migrations. No external side effects.
