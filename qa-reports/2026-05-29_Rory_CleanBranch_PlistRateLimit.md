# Rory — Clean Branch: iOS Plist + Rate Limit Migration
**Date:** 2026-05-29
**Branch:** `fix/ios-plist-ratelimit-clean-2026-05-29`
**Author:** Rory (DevOps)
**Status:** READY FOR SKY REVIEW — not merged, not pushed

---

## What This Branch Does

Two launch-blocking items lifted from `fix/security-hardening-2026-05-30`
onto a clean branch off current `main`. The source branch would delete ~4664
lines if merged — this branch carries only the two safe, reviewable changes.

---

## Changes Included

### 1. `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql`
- **What:** A SQL migration that adds a Postgres trigger enforcing a rate limit
  of 20 flags per user per 24 hours.
- **How it works:** `BEFORE INSERT` trigger on the `flags` table calls a
  `SECURITY DEFINER` function that counts recent inserts for the current user
  and raises a `P0001` exception if the limit is exceeded.
- **Status:** FILE ONLY — not applied to any database. Sky must paste the
  contents into the Supabase SQL Editor manually.
- **Why it matters for launch:** Without rate limiting, a single bad actor
  can flood the map with spam flags and degrade everyone's experience on day 1.

### 2. `app.json` — iOS `infoPlist` additions
- **Added:** `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription`
- **Unchanged:** `NSLocationWhenInUseUsageDescription` (left exactly as-is)
- **Deliberately excluded:** `NSLocationAlwaysAndWhenInUseUsageDescription`
  — AccessMap uses when-in-use location only; adding the Always key is an
  unnecessary privacy over-ask and invites App Store scrutiny.
- **Why it matters for launch:** iOS crashes immediately when a permission
  dialog is triggered without a usage string in `infoPlist`. The camera and
  photo picker in `ReportFlagModal` would crash on first use for every new user.
  App Store review would also reject the binary without these strings present.

---

## Typecheck Result

`npm run typecheck` — **PASSED** (zero errors, zero warnings)

The JSON-only `app.json` change has no TypeScript surface. Verified clean.

---

## Commits on This Branch

```
359dfa8  fix(ios): add NSCameraUsageDescription + NSPhotoLibraryUsageDescription to infoPlist
4de52a4  fix(security): add flag creation rate limit migration (20 flags/user/24h)
```

Both commits are on `fix/ios-plist-ratelimit-clean-2026-05-29`.
Neither is on `main`. Not pushed to remote.

---

## Next Action for Sky

1. **Review this branch** — `git log fix/ios-plist-ratelimit-clean-2026-05-29`
   or open a PR against `main` to see the diff clearly.
2. **Merge to main** via the normal Shamus gate (Gary audit → Shamus merge).
3. **Apply the rate limit migration** in the Supabase SQL Editor:
   - Go to your Supabase project → SQL Editor
   - Open `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql`
   - Paste the entire file contents and click Run
   - Confirm the trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'enforce_flag_rate_limit';`
   - Include this in the **pre-launch migration batch** alongside the other
     pending migrations listed in `PROJECT_STATE.md`.

---

## What This Branch Does NOT Include

- No changes from `fix/security-hardening-2026-05-30` beyond the two items above
- No app business logic changes
- No schema changes beyond the SQL file (which Sky applies manually)
- No push, no merge, no live database interaction

---

## Decisions for Sky

None required — these are two clear-cut launch necessities with no privacy or
safety ambiguity. Both changes are additive and reversible.
