# AccessMap — Master Fix Log: TestFlight Build & Submission

**Author:** Morgan (compiled from git history, qa-reports, and investigation docs)
**Last updated:** 2026-05-31
**Purpose:** Reference document for Sky. If a build breaks in Phase 5 or Phase 6, start here before debugging blindly. Every fix is cross-referenced to the commit that applied it.

---

## How to use this document

- **"Permanently fixed in main"** = the code change is committed and will never need redoing (Phase 5 and 6 automatically inherit it).
- **"Periodic manual action"** = something Apple/EAS/Supabase controls outside the codebase that may need repeating (credentials expiry, agreement renewals, etc.).
- If a build fails and you don't know why, skim the category headers. The symptom descriptions should point you to the right section.

---

## 1. iOS Build Fixes

These prevented the app from compiling at all on EAS.

### 1a. `ios/` folder removed — switched to CNG (Continuous Native Generation)

**Problem:** The committed `ios/` directory was a snapshot from an earlier SDK version. As the project evolved, the committed native folder drifted out of sync with what `expo prebuild` would regenerate. EAS builds failed because the native project was in an inconsistent state.

**Fix:** Removed the entire `ios/` directory from git and added it to `.gitignore`. EAS now runs `expo prebuild` fresh on every build, generating a clean native project from `app.json` + installed packages. Same applied to `android/`.

**Commit:** `ae38100` — "fix: remove committed ios/android — switch to full CNG for EAS builds"

**Permanently fixed in main.** EAS will always run a clean prebuild. You never need to commit the `ios/` folder again.

---

### 1b. `AppDelegate.swift` stale RCTBridge override removed

**Problem:** The committed `ios/AccessMap/AppDelegate.swift` had a `sourceURL(for:)` override that referenced `RCTBridge`. In React Native 0.81, `RCTBridge` is absent from Swift's module map in Release builds — this caused compile errors on EAS `testflight` and `production` profiles.

**Fix applied in two stages:**
1. `55c167b` — wrapped the override in `#if DEBUG ... #endif` so it only ran in debug builds
2. `ae38100` — the entire `ios/` directory was removed (see 1a above), so this is now a non-issue; EAS generates a clean `AppDelegate.swift` on every build

**Commit:** `55c167b`, then resolved completely by `ae38100`

**Permanently fixed in main.**

---

### 1c. TypeScript in both `dependencies` and `devDependencies`

**Problem:** `package.json` had `typescript` listed under `dependencies` (~5.9.2) AND `devDependencies` (~5.6.0). Meanwhile the lockfile had 6.0.3 installed — none of the three matched. Vercel's build pipeline runs `npm ci`, which validates the lockfile strictly and exits with code 1 on mismatches. Web deploys were broken.

**Fix:** Removed `typescript` from `dependencies` (it's a dev-only tool). Updated `devDependencies` to `~6.0.0` to match the installed version. Regenerated the lockfile.

**Commit:** `8ce2c41` — "fix(vercel): remove duplicate typescript from dependencies; align lockfile"

**Permanently fixed in main.**

---

### 1d. `babel-preset-expo` version mismatch

**Problem:** Dependabot bumped `babel-preset-expo` to `^56`. Expo SDK 54 ships an older Hermes engine that needs `hermes-v0` transform profile (which includes `@babel/plugin-transform-class-properties` and `@babel/plugin-transform-private-methods`). Version 56 switched the default to `hermes-v1`, which assumes Hermes handles private class fields natively — but SDK 54's Hermes doesn't. Build failed.

A related issue: `babel-preset-expo@56` introduced an ESLint v10 peer dependency conflict. EAS's npm install treats peer dep conflicts as fatal without `--legacy-peer-deps`.

**Fix:** Downgraded `babel-preset-expo` to `~54.0.10` (the correct version for SDK 54). Added `.npmrc` with `legacy-peer-deps=true` for EAS npm install.

**Commit:** `f97e242` — "fix(build): SDK 54 babel preset, .npmrc peer-deps, tsconfig excludes, push token projectId"
Also: `55c167b` — "fix(build): testflight build fixes for EAS"

**Permanently fixed in main.** If you ever upgrade to Expo SDK 55+, this will need re-checking against the new preset version.

---

### 1e. `testflight` profile added to `eas.json` with `distribution: "store"`

**Problem:** The `preview` profile has `distribution: "internal"` — it creates an ad-hoc IPA signed for specific registered devices. An internal-distribution IPA **cannot be uploaded to App Store Connect**. Apple's servers reject it. The old `TESTFLIGHT_LAUNCH.md` incorrectly told Sky to use `--profile preview` for submission — that was the primary cause of the "Something went wrong when submitting your app to Apple App Store Connect" error.

**Fix:** Added a `testflight` profile to `eas.json` with `distribution: "store"`, `buildConfiguration: Release`, and `autoIncrement: true`. The CI GitHub Actions workflow was also corrected to use `--profile testflight` for builds and `--profile production --latest` for submission.

**Commit:** Added in the Rory EAS setup work; CI workflow fixed in `f41b6b6`

**Permanently fixed in main.**

---

## 2. App Launch / Crash Fixes

These prevented the app from running after install.

### 2a. Sentry removed entirely

**Problem:** Sentry went through three breaking states:
1. Version mismatch (8.x vs 7.x expected by SDK 54) → build crash
2. Duplicate plugin entry in `app.json` (registered as both `@sentry/react-native/expo` and `@sentry/react-native`) → double-patching during prebuild
3. Native plugin crash on iOS 26 — the `@sentry/react-native/expo` plugin crashes on launch when no org/project config is supplied, which was the case after the plugin config was partially cleaned up

**Fix:** Full removal of Sentry. `sentry.ts` and `analytics.ts` were replaced with no-op stubs. The Sentry wrap in `App.tsx` was removed. `metro.config.js` was reset to the default Expo config.

**Commit:** `8850363` — "fix: remove Sentry — native plugin crashing on iOS 26, re-add in Phase 6"

**Status:** Permanently fixed in main (Sentry is out). **Re-integration is a Phase 6 task** — when Rory adds it back, they'll need the org/project DSN configured before the plugin is registered.

---

### 2b. `expo-notifications` added to `app.json` plugins

**Problem:** `expo-notifications` was installed in `package.json` and used in `src/lib/pushNotifications.ts`, but was **not listed in `app.json`'s `plugins` array**. The iOS build system reads `plugins` to know which native modules need entitlements configured. Without the plugin entry, the iOS build did not include the `aps-environment: production` entitlement in the `.entitlements` file. APNs silently refuses to deliver push notifications to production builds without this entitlement — push worked in development (Expo Go) but would fail silently after App Store install.

**Fix:** Added `"expo-notifications"` to the `plugins` array in `app.json`, along with `notification.color` and `notification.androidMode` config.

**Commit:** `f41b6b6` — "fix: add expo-notifications plugin to app.json + fix CI submit workflow"

**Permanently fixed in main.** Every future build will include the correct APNs entitlement.

---

### 2c. Supabase env vars confirmed in EAS secrets

**Problem:** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` were set in the local `.env` file but never uploaded to EAS. Metro baked empty strings into the bundle. The app launched but Supabase immediately failed — sign-in, map loading, and all API calls were broken. Additionally, `supabase.ts` only threw on missing env vars when `__DEV__` was true, so release builds silently continued with a broken client.

**Fix:** Both secrets were uploaded to EAS via `eas secret:set`. The `__DEV__` guard was removed from `supabase.ts` so missing vars cause a loud failure in any build configuration.

**Commit:** `19d7738` — "fix(eas): push Supabase env vars to EAS + remove duplicate Sentry plugin"

**Status:** Currently set in EAS. This is **permanent until the Supabase project is rotated** — if the Supabase project URL or anon key ever changes, the EAS secrets must be updated. Verify with `eas secret:list` if builds start failing on Supabase calls.

---

## 3. TestFlight Submission Fixes

These prevented the IPA from being accepted by App Store Connect.

### 3a. `ascAppId` hardcoded in `eas.json`

**Problem:** `eas.json` had `"ascAppId": "TODO_ASC_APP_ID"` — the app record in App Store Connect hadn't been created yet, and no real ID existed.

**Fix:** Sky created the app record in App Store Connect (Bundle ID: `com.accessmap.app`). The 10-digit Apple App ID `6774709116` was retrieved from App Information → Apple ID and hardcoded into `eas.json` under `submit.production.ios`.

**Commit:** `158f38a` — "chore(eas): set ASC App ID 6774709116 for App Store Connect submit"

**Permanently fixed in main.** `6774709116` is the permanent App Store Connect ID for AccessMap. Will never change unless the app is deleted and recreated.

---

### 3b. `appleId` and `appleTeamId` set in `eas.json`

**Problem:** EAS submit needed authenticated Apple credentials. The submit config initially used env var references that weren't consistently set.

**Fix:** `appleId: "skylerhalisky@gmail.com"` and `appleTeamId: "S78F8ZA8QU"` hardcoded in `eas.json` under `submit.production.ios`. Team ID also added to `app.json` under `ios.appleTeamId`.

**Commit:** `f97e242`, `158f38a`

**Permanently fixed in main.** These values don't change.

---

### 3c. Distribution certificate and provisioning profile

**Problem:** EAS needed an App Store distribution certificate and App Store provisioning profile to sign the IPA for submission. These had to be created against the Apple Developer account.

**Fix:** Sky ran `eas credentials --platform ios` interactively. EAS generated and stored a distribution certificate (bound to Team `S78F8ZA8QU`) and an App Store provisioning profile for `com.accessmap.app`. These are stored in EAS's managed credentials system — not in the repo.

**Permanently set in EAS.** Distribution certificates are valid for 1 year. **Periodic action:** When the certificate expires (~May 2027), Sky will need to run `eas credentials --platform ios` again to rotate it.

---

### 3d. CI submit workflow fixed to use `--profile production --latest`

**Problem:** The GitHub Actions `eas-testflight-submit.yml` workflow used `eas submit --platform ios --non-interactive` without `--latest`. In non-interactive mode, EAS can't prompt which build to submit — it would fail or submit a stale build. The workflow also used `--profile ${{ inputs.profile }}` for the submit step, but `eas.json` only has credentials under `submit.production`, not `submit.preview` or `submit.testflight` — passing wrong profile names would result in missing credential lookup errors.

**Fix:** Changed the submit step to always use `--profile production --latest`. The `--latest` flag makes EAS automatically select the most recent successful `store`-distribution build for the chosen platform.

**Commit:** `f41b6b6` — "fix: add expo-notifications plugin to app.json + fix CI submit workflow"

**Permanently fixed in main.**

---

## 4. Database / Backend Fixes

These were Supabase-side changes, not committed to the repo code. **All applied to the live Supabase project.**

### 4a. `pg_net` extension enabled

**Problem:** The `notify-flag-status` Edge Function uses `net.http_post` to call APNs webhooks. The `pg_net` extension is required for HTTP calls from Postgres. On Supabase free tier it is not enabled by default — push notification webhooks were silently failing.

**Fix:** Run in Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**Status:** Applied to live Supabase project. **Persistent** — extensions survive project restarts. No periodic action needed.

---

### 4b. `NOTIFY_WEBHOOK_SECRET` aligned between Edge Function and DB webhook

**Problem:** The Edge Function had the webhook secret set under a different name/value than the DB webhook header was sending. The function was rejecting all incoming webhook calls, so no push notification triggers fired.

**Fix:** Set the same secret value in both:
1. Supabase Dashboard → Edge Functions → `notify-flag-status` → Secrets → `NOTIFY_WEBHOOK_SECRET`
2. Supabase Dashboard → Database → Webhooks → `notify_flag_status` → HTTP Headers → `x-webhook-secret`

**Status:** Applied. **Periodic action:** If the secret is ever rotated, both locations must be updated together.

---

### 4c. `flag_comments.user_id` SET DEFAULT `auth.uid()`

**Problem:** The `flag_comments` table was missing `DEFAULT auth.uid()` on the `user_id` column. Comment inserts from the app (which relied on the DB populating `user_id` automatically) were failing with constraint violations.

**Fix:** Migration applied in Supabase SQL Editor:
```sql
ALTER TABLE flag_comments
  ALTER COLUMN user_id SET DEFAULT auth.uid();
```

**Status:** Applied. **Permanently fixed** in the live schema — also included in `supabase/schema.sql` for any future rebuilds.

---

### 4d. Anon reporting photo injection fix

**Problem:** The anonymous flag INSERT RLS policy allowed `photo_url` to be set on insert, which opened a vector for anonymous users to inject arbitrary image URLs into the map.

**Fix:** RLS policy updated to block `photo_url` on anon inserts. Committed as a migration file.

**Commit:** `0208eec` — "fix(security): anon INSERT policy must block photo_url injection"

**Permanently fixed in main** (migration file) and in the live schema (applied).

---

### 4e. Trust score migration applied

**Problem:** The trust score system (`user_trust_tiers`, `point_events`, leaderboard views) requires DB tables that don't exist until the migration is applied. App would crash on trust score screens without them.

**Fix:** Trust score migration applied to the live Supabase project. Migration file is in `supabase/migrations/`.

**Status:** Applied. **Permanently fixed** in the live schema.

---

### 4f. Anon reporting migration applied

**Problem:** Anonymous flag reporting requires a `anon_report_daily_count` or equivalent rate-limiting table, plus the gray-pin `status` variant support in the schema.

**Fix:** Anon reporting migration applied to the live Supabase project.

**Status:** Applied. **Permanently fixed** in the live schema.

---

### 4g. App Store reviewer test account

**Problem:** Apple requires demo credentials for apps with mandatory sign-in. Without them, Apple Review rejects with "Guideline 4.0 - Sign-in required without demo account."

**Fix:** `supabase/migrations/2026-05-31_reviewer_test_account.sql` seeds `reviewer@accessmap.app` with 5 sample flags in downtown Vancouver. The migration is **propose-only** — Sky must run it in the Supabase SQL editor before App Store submission (not before TestFlight, which uses Sky's own account).

**Reviewer credentials for App Store Connect review notes:**
- Email: `reviewer@accessmap.app`
- Password: set by Sky at migration time (see `docs/APP_STORE_REVIEWER_NOTES.md`)

**Commit:** `9fd1cd9` — "feat: add App Store reviewer test account migration + notes"

**Status:** Migration file committed. **Sky runs it once before App Store submission.**

---

## 5. Web / Vercel Fixes

### 5a. TypeScript version conflict fixed

Covered in **1c** above — removing `typescript` from `dependencies` also fixed Vercel's `npm ci` failure.

**Commit:** `8ce2c41`

---

### 5b. `favicon.png` created for Expo web

**Problem:** Expo web bundler expected `assets/favicon.png` as configured in `app.json`. The file was missing, causing a bundler warning on every web build and a missing browser tab icon.

**Fix:** Created a 32×32 Wayfinder Blue favicon matching the app's brand color (`#1466E0`).

**Commit:** `41b38c2` — "fix: add favicon.png for Expo web (32x32, Wayfinder Blue)"

**Permanently fixed in main.**

---

## 6. Configuration Fixes

### 6a. `eas.json` `testflight` profile added

Covered in **1e** above. Key config for reference:

```json
"testflight": {
  "distribution": "store",
  "autoIncrement": true,
  "ios": {
    "buildConfiguration": "Release",
    "simulator": false
  },
  "env": {
    "APP_ENV": "production",
    "SENTRY_DISABLE_AUTO_UPLOAD": "true"
  }
}
```

---

### 6b. GitHub Actions CI submit workflow fixed

**File:** `.github/workflows/eas-testflight-submit.yml`

Key correction: submit step now uses `--profile production --latest` (not `--profile ${{ inputs.profile }}`).

**Commit:** `f41b6b6`

---

### 6c. `GOOGLE_SERVICES_JSON` added as EAS secret

**Problem:** Android push notifications require a Google Services JSON file (FCM credentials). Without it, Android builds would fail to set up push notification infrastructure.

**Fix:** `GOOGLE_SERVICES_JSON` set as an EAS secret. The actual JSON content is stored in EAS, not committed to the repo.

**Status:** Set in EAS. **Periodic action:** If the Firebase project is rotated or the service account is regenerated, this secret needs updating.

---

### 6d. `RELEASING.md` written (plain-language release guide)

The existing `RELEASE_RUNBOOK.md` predates several configuration changes and still incorrectly referenced `--profile preview` for TestFlight. `docs/RELEASE_RUNBOOK.md` has been updated.

**The correct two-command TestFlight release sequence:**
```bash
# 1. Build (triggers EAS cloud build, takes ~25 min)
eas build --platform ios --profile testflight --non-interactive

# 2. Submit (after build completes)
eas submit --platform ios --profile production --latest
```

---

## 7. What's Permanent vs. What Needs Periodic Action

### Permanently fixed in `main` (never needs redoing)

These are code changes. Every Phase 5 and Phase 6 build automatically inherits all of them.

| Fix | Commit | What it solved |
|---|---|---|
| `ios/` removed → CNG | `ae38100` | Native project drift / build failures |
| AppDelegate.swift stale override | `ae38100` | RCTBridge compile error in Release |
| TypeScript version conflict | `8ce2c41` | Vercel `npm ci` failure |
| `babel-preset-expo` pinned to ~54.0.10 | `f97e242` | Hermes transform errors on SDK 54 |
| `.npmrc` `legacy-peer-deps=true` | `55c167b` | ESLint v10 peer dep conflict in EAS |
| Sentry removed | `8850363` | iOS 26 native plugin crash on launch |
| `expo-notifications` in `app.json` plugins | `f41b6b6` | APNs entitlement missing from production builds |
| `__DEV__` guard removed from Supabase init | `19d7738` | Silent Supabase failure in production builds |
| `ascAppId: "6774709116"` hardcoded | `158f38a` | Submit blocked by placeholder App ID |
| `appleTeamId` / `appleId` hardcoded | `f97e242` | Missing submit credentials |
| CI workflow `--profile production --latest` | `f41b6b6` | Wrong build profile submitted to Apple |
| Anon photo injection RLS fix | `0208eec` | Security: arbitrary photo URL injection |
| `favicon.png` created | `41b38c2` | Web bundler warning / missing tab icon |

### Periodic manual actions (may need repeating)

These live outside the codebase — in Apple's systems, EAS credentials store, or Supabase.

| Action | When needed | How to do it |
|---|---|---|
| **Accept Apple Developer Program agreement** | Apple releases agreement updates roughly annually. If you see "Something went wrong when submitting" with no ITMS code, this is the most likely cause. | Log in to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) — yellow banner will appear. Also check [developer.apple.com/account](https://developer.apple.com/account). |
| **Rotate EAS Apple credentials** | Distribution certificate expires ~1 year after creation (~May 2027). Also if app-specific password is revoked. | Run `eas credentials --platform ios` interactively. Generate a fresh app-specific password at [appleid.apple.com](https://appleid.apple.com) → App-Specific Passwords. |
| **Verify EAS secrets still set** | If the Supabase project URL or anon key ever changes. | Run `eas secret:list` and confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present under the `production` environment. |
| **Accept updated GDPR/privacy framework** | Apple occasionally introduces new privacy manifest requirements for new API categories. | Check build logs for `PrivacyInfo.xcprivacy` aggregation warnings. Expo SDK handles most of this automatically. |
| **Create reviewer test account** (for App Store, not TestFlight) | Once, before App Store submission | Run `supabase/migrations/2026-05-31_reviewer_test_account.sql` in the Supabase SQL Editor. Credentials go in App Store Connect review notes. |

---

## Quick diagnostic: if a build breaks

**Build fails to compile on EAS:**
- Check if someone committed `ios/` back into the repo (it should stay gitignored)
- Run `npm run typecheck` locally — if there are type errors, EAS will fail too
- Check `babel-preset-expo` version in `package.json` — it should stay `~54.0.10` until an SDK upgrade

**App crashes immediately after install:**
- First suspect: EAS secrets. Run `eas secret:list` — are `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` present?
- Second suspect: a new native module was added to `package.json` but not registered in `app.json` plugins
- Third suspect: Sentry was re-added without a valid DSN configured

**`eas submit` returns "Something went wrong when submitting":**
1. Check App Store Connect for a yellow "accept agreement" banner (most common cause)
2. Run submit with `--verbose` and look for an `ITMS-XXXXX` error code
3. Verify `eas.json` still has the correct `ascAppId`, `appleId`, and `appleTeamId`
4. Confirm the build you're submitting used `--profile testflight` (not `preview`)

**Push notifications not firing:**
- Confirm `pg_net` extension is enabled in Supabase: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
- Confirm `NOTIFY_WEBHOOK_SECRET` matches in both Edge Function secrets and DB webhook header
- Confirm the app was built with `expo-notifications` in `app.json` plugins (see fix 2b)

---

*This document should be updated whenever a new class of build/submission failure is discovered and fixed. It is a living reference, not a snapshot.*
