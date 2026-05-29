# Jordan — AccessMap Privacy Audit v2
**Date:** 2026-05-29
**Branch:** jordan/accessmap-privacy-v2-2026-05-29
**Role:** Jordan (Privacy Specialist)
**Verdict:** PASS (with fixes applied)

---

## Summary

Full privacy pass on AccessMap. This app maps disability-related barrier locations — every query that combines `lat+lng+category+user_id` links a real person to a specific place they personally reported a disability barrier. Treated as highest-sensitivity data throughout.

**6 issues found, 6 fixed in this commit.**

---

## Issues Found and Fixed

### FIX 1 — `fetchFlagById`: wildcard select leaks future schema columns
**File:** `src/lib/flags.ts` line 581
**Before:** `.select('*')` on flags table — any future column (internal moderation status, admin notes) would land in every deep-link resolution silently.
**Fix:** Changed to explicit column list `id, user_id, lat, lng, category, description, severity, photo_url, status, created_at` matching FlagRow. Added privacy rationale comment.

### FIX 2 — `fetchFlagsByIds`: wildcard select leaks future schema columns
**File:** `src/lib/flags.ts` line 598
**Before:** `.select('*')` on flags table — same risk as FIX 1, affects Watched Flags re-reads.
**Fix:** Explicit column list + privacy rationale comment.

### FIX 3 — `listRecentFlags`: highest-sensitivity query had no privacy rationale
**File:** `src/lib/flags.ts` line 612
**Issue:** This query fetches `user_id+lat+lng+category` across ALL statuses (open, verified, resolved, rejected) with no cap on which flags are exposed. This is the most privacy-sensitive query in the file — it creates a community-wide feed that links each user's identity to disability-barrier locations they reported, across the full lifecycle of their reports including rejected ones.
**Fix:** Added a detailed PRIVACY comment block explaining: (a) the sensitivity level, (b) the existing RLS safeguard (authenticated read required), (c) a note to the Activity Feed renderer not to display raw user_id, (d) a note about rejected-flag suppression as a future consideration if reporter privacy demands it.

### FIX 4 — `listFlags`: sensitive combo with no rationale comment
**File:** `src/lib/flags.ts` line 329
**Issue:** `user_id+lat+lng+category` combination with no comment explaining why `user_id` is required.
**Fix:** Added privacy rationale noting user_id is needed for Map callout ownership context (edit/delete affordances) and that RLS enforces authenticated-only access.

### FIX 5 — `ProfileScreen`: `select('*')` on users table
**File:** `src/screens/ProfileScreen.tsx` line 268
**Before:** `supabase.from('users').select('*')` — any future column added to `public.users` (phone number, internal flags, admin notes) would leak to the profile screen.
**Fix:** Explicit column list `id, email, display_name, avatar_url, points, created_at` with privacy comment.

### FIX 6 — `SettingsScreen`: `select('*')` on users table for data export
**File:** `src/screens/SettingsScreen.tsx` line 246
**Before:** `supabase.from('users').select('*')` used to power the data export — any future user column would silently appear in exported files sent to the user's clipboard.
**Fix:** Same explicit column list as ProfileScreen. Added note that this feeds the export; leak here would end up in clipboard payloads.

---

## Already-Good Items (No Changes Required)

- **EXIF stripping** (`uploadFlagPhoto`): GPS/timestamps stripped before upload on both platforms. Post-strip verification with heuristic marker check. Well-commented. No issues.
- **Photo path scheme**: `<userId>/<timestamp>.<ext>` — matches CLAUDE.md gotcha #4. Storage RLS enforces path prefix = auth.uid(). No issues.
- **Sign-out cleanup** (`signOut`): clears offline cache, tile cache, and push token — all three silently fail-safe. No issues.
- **Push token handling** (`pushNotifications.ts`): DO NOT LOG token comments present; PIPEDA explanation dialog shown before OS prompt; token deleted on sign-out. No issues.
- **Offline cache** (`flagsStore.tsx`): user-scoped key (no cross-user leakage), 24h TTL, INITIAL_PAGE_SIZE cap. Jordan Conditions 1–4 documented. No issues.
- **Heatmap k-anonymity** (`heatmap.ts`): k≥3 floor hard-coded, comment warns against lowering. No issues.
- **Location hook** (`location.ts`): `requireExistingPermission` gate prevents silent OS prompt on Profile tab focus (Art. 9.6 compliance). No issues.
- **leaderboard query** (`listLeaderboard`): only `id, display_name, points` — no location, no email. No issues.
- **feedbackStore select('*')**: feedback table only has id/user_id/category/body/contact_email/platform — no location data. Low sensitivity; acceptable.
- **dataExport.ts**: pure formatter, no DB access. Privacy-respecting text output. No issues.
- **listFlagStatusHistory**: only reads `old_status, new_status, changed_by, changed_at` — no location. No issues.

---

## DECISIONS FOR SKY

None — all fixes are additive (privacy rationale comments + explicit column lists). No behavior changes. No SQL migrations required.

**Proposal (not a blocker):** Consider filtering out `status = 'rejected'` from `listRecentFlags` in the Activity Feed. A rejected flag means the community disagreed with the report, but the reporter's location+disability-context data remains permanently visible to all authenticated users in the feed. If reporter privacy for rejected reports is a concern, add `.not('status', 'eq', 'rejected')` to `listRecentFlags`. Flagged here — not applying without Sky approval since it changes UI behavior.

---

## QA Results

| Check | Result |
|---|---|
| `npm run typecheck` | PASS (0 errors) |
| `eslint` (changed files) | PASS (0 warnings) |
| Tests | N/A (worktree excluded from jest glob) |
| No credentials touched | YES |
| No external sends | YES |
| Branch: jordan/accessmap-privacy-v2-2026-05-29 | Created from main @ 758a790 |

**Fixed count:** 6
