# Steve — Security Hardening (2026-05-30)

## Task 1: Flag Rate Limit Migration

- **File:** `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql`
- **Limit:** 20 flags per user per 24 hours
- **Enforcement:** BEFORE INSERT trigger (server-side, bypass-proof)
- **Column used:** `user_id` (confirmed from schema — not `created_by`)
- **Sky applies:** Supabase Dashboard → SQL Editor → paste + run
- **Error code:** P0001 (client should show "Too many reports today")
- **Status:** File written — NOT applied. Sky applies manually.

## Task 2: iOS Plist Keys

Added to `app.json` under `expo.ios.infoPlist`:

| Key | Status |
|---|---|
| `NSLocationWhenInUseUsageDescription` | Already present — preserved |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | Added |
| `NSPhotoLibraryUsageDescription` | Added |
| `NSCameraUsageDescription` | Added |

- **Required for:** App Store submission (App Review will reject without these)
- **No duplicates:** Existing `NSLocationWhenInUseUsageDescription` preserved as-is

## Branch: fix/security-hardening-2026-05-30

## TypeScript: 0 errors (app.json changes are config only — no TS impact)

## Remaining security items (post-launch)

- GDPR deletion flow (not yet implemented)
- EXIF GPS leak gate (D8 — pre-launch blocker, tracked in PROJECT_STATE.md)
