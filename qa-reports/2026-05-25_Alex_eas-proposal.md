# Alex — EAS Build Configuration Proposal
**Date:** 2026-05-25
**Branch:** `docs/auto-2026-05-25-alex-wave6-eas-proposal`
**Role:** Alex (Accessibility / DevOps assist)
**Trigger:** Rory flagged missing `eas.json` as TestFlight blocker in prior qa-report

---

## Summary

`eas.json` was missing from the AccessMap repo, completely blocking EAS Build runs
for TestFlight or internal distribution. This proposal adds `eas.json` at the repo
root with three build profiles (development, preview, production) and iOS/Android
submit configuration. All credential fields that require Sky's Apple/Google account
are marked `TODO_*` — they must be filled in before the first build.

---

## What each build profile is for

### `development`
Local feature development on a physical iOS device. Uses the Expo Development
Client (the "dev launcher" app) so you get fast refresh and debugging tools.
Requires your device's UDID to be registered in App Store Connect.

**Command:** `eas build --profile development --platform ios`
**When to use:** While writing and testing new features locally.
**Note:** `simulator: false` means this targets a real device, not the iOS
Simulator. Change to `simulator: true` if you want to run on the Sim.

### `preview` (TestFlight)
Internal distribution build uploaded to TestFlight automatically. This is what
testers and stakeholders install. Does NOT go to the App Store public listing.

**Command:** `eas build --profile preview --platform ios`
**When to use:** Ready to share a build for review/QA.
**Note:** `distribution: internal` + TestFlight is the standard path for
pre-release iOS sharing without a full App Store review.

### `production`
App Store submission build. After a successful production build, run:
`eas submit --profile production --platform ios`

**Command:** `eas build --profile production --platform ios`
**When to use:** Ready for public App Store release.

---

## Credentials Sky must supply (before first build)

The following placeholders in `eas.json` must be replaced with real values.
Do NOT commit real credentials — use EAS Secrets for sensitive values.

| Placeholder | What it is | Where to find it | How to set |
|---|---|---|---|
| `TODO_APPLE_ID@example.com` | Your Apple ID email | The email you use for developer.apple.com | Replace inline in `eas.json` submit block, OR set env var `EXPO_APPLE_ID` |
| `TODO_ASC_APP_ID` | App Store Connect numeric app ID | App Store Connect → Apps → AccessMap → App Information → "Apple ID" field | Replace inline after creating the app record in ASC |
| `TODO_APPLE_TEAM_ID` | 10-character Apple Developer Team ID | developer.apple.com/account → Membership → Team ID | Set via: `eas secret:create --name APPLE_TEAM_ID --value <your-id>` |
| `TODO_PATH_TO_GOOGLE_SERVICE_ACCOUNT_KEY.json` | Google Play service account JSON | Google Play Console → Setup → API access (not needed until Android launch) | Set via: `eas secret:create --name GOOGLE_SERVICE_ACCOUNT_KEY --type file --value <path>` |

**Recommended: use EAS Secrets for Apple Team ID and Apple ID** so they are never
stored in the repo file. Inline values in `eas.json` are acceptable for
`ascAppId` (non-sensitive, app-specific numeric ID).

---

## Step-by-step: run the first build

1. Install EAS CLI (if not already installed):
   ```
   npm install -g eas-cli
   ```

2. Log in to your Expo account:
   ```
   eas login
   ```

3. Link the project to your Expo account (one-time):
   ```
   eas init
   ```
   This sets `extra.eas.projectId` in `app.json`. Commit that change.

4. Set your Apple Team ID as an EAS Secret:
   ```
   eas secret:create --name APPLE_TEAM_ID --value <your-10-char-id>
   ```

5. Run the first TestFlight (preview) build:
   ```
   eas build --profile preview --platform ios
   ```
   EAS will prompt you to log in to your Apple account and handle provisioning
   profiles automatically on the first run.

6. After the build succeeds, it auto-uploads to TestFlight. Go to App Store
   Connect → TestFlight to invite testers.

---

## App details (from app.json)

| Field | Value |
|---|---|
| App name | AccessMap |
| Slug | accessmap |
| iOS bundle ID | com.accessmap.app |
| Android package | com.accessmap.app |
| Version | 1.0.0 |

---

## File added

- `eas.json` — root of repo. Proposal only; **Sky must fill in credential placeholders before running any build.**

---

## Rollback

```
git revert HEAD
```

or simply: `rm eas.json` — the file is additive, no existing files were modified.

---

## DECISIONS FOR SKY

1. **Fill in Apple Team ID** (`TODO_APPLE_TEAM_ID`) before the first EAS build.
   Recommended via `eas secret:create` to avoid committing it to the repo.
2. **Create the app record in App Store Connect** to get the `ASC_APP_ID`.
   Go to: App Store Connect → + → New App → Fill in details including bundle ID
   `com.accessmap.app`. The numeric Apple ID shown after creation goes in `ascAppId`.
3. **Run `eas init`** to link the Expo project — this adds `projectId` to `app.json`.
   Commit that change to main after merging this PR.
4. Android Google Play credentials are placeholders — not needed until Android launch.
