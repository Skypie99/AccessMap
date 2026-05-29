# TestFlight Launch Guide

Pre-flight checklist and exact commands to ship the first TestFlight build.

---

## Pre-flight: one-time setup

### 1. Set your Apple Team ID in eas.json

1. Go to [developer.apple.com](https://developer.apple.com) → Account → Membership
2. Copy your **Team ID** (format: `XXXXXXXXXX`, 10 chars, e.g. `S78F8ZA8QU`)
3. Open `eas.json` and replace both occurrences of `ADD_YOUR_APPLE_TEAM_ID_HERE` with your Team ID:
   - `build.preview.ios.appleTeamId`
   - `build.production.ios.appleTeamId`

### 2. Set the App Store Connect App ID in eas.json

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → Apps → AccessMap
   (If the app record doesn't exist yet, create it — Bundle ID: `com.accessmap.app`)
2. Copy the **Apple ID** from the app's App Information page (a 10-digit number)
3. Open `eas.json` → `submit.production.ios.ascAppId` → replace `TODO_ASC_APP_ID` with that number

### 3. Set Supabase Edge Function secret

Go to **Supabase Dashboard → Edge Functions → notify-flag-status → Secrets** and add:

- **Key:** `NOTIFY_WEBHOOK_SECRET`
- **Value:** *(use the value you already have — do not store it in any file)*

### 4. Confirm GitHub Secrets are set

The following secrets must be present in **GitHub → Settings → Secrets → Actions**:

| Secret | Value |
|--------|-------|
| `EXPO_TOKEN` | Your Expo access token |
| `EXPO_APPLE_ID` | `skylerhalisky@gmail.com` |
| `EXPO_APPLE_TEAM_ID` | Your Apple Team ID (same as step 1) |

---

## Build + submit: exact commands

```bash
# 1. Push your branch to main first
git push origin main

# 2. Log in to EAS (if not already)
eas login

# 3. Kick off a preview build (internal distribution → TestFlight-compatible .ipa)
eas build --profile preview --platform ios

# Build takes ~15–25 min. You'll get an email when it's done.
# You can also watch progress at: https://expo.dev/accounts/<your-account>/projects/accessmap/builds

# 4. Submit the completed build to TestFlight
eas submit --platform ios --latest

# This uses the credentials in eas.json (submit.production.ios).
# "latest" picks the most recent successful build automatically.
```

---

## After submission (~30 min processing)

1. Go to [App Store Connect → TestFlight](https://appstoreconnect.apple.com)
2. Find the new build under **iOS → Builds**
3. Add testers:
   - **Internal testers:** Members of your App Store Connect team (instant access)
   - **External testers:** Add a group, invite by email — requires Apple review (~1–3 days first time)

---

## Upgrade EAS CLI (optional but recommended)

v20.0.0 is available (you have v19.1.0):

```bash
npm install -g eas-cli
```

---

## Quick reference: key IDs

| Field | Value |
|-------|-------|
| Bundle Identifier | `com.accessmap.app` |
| App Version | `0.2.0` |
| Build Number | `2` |
| EAS Project ID | `a7149107-fb9b-4853-a053-648320c05cb6` |
| Apple Team ID | *(fill in from Membership page)* |
| ASC App ID | *(fill in from App Store Connect)* |
