# EAS Build + TestFlight Setup Guide

This guide walks through setting up automated builds for AccessMap on your iOS device via EAS Build and TestFlight.

**Timeline:** ~30 min setup, then builds happen automatically.

---

## Overview

- **What:** Every push to any branch automatically builds the iOS app (development profile).
- **Where builds go:** EAS Build dashboard (logs only; builds are stored internally).
- **For testing:** Manual one-liner or GitHub Actions trigger submits to TestFlight.
- **Daily workflow:** Team pushes → build completes → you install TestFlight update on your phone.

---

## Prerequisites

✅ You have:
- An Apple Developer account ($99/year)
- An iOS device with TestFlight installed
- GitHub admin access to the AccessMap repo

❌ You do NOT yet have:
- EAS Token (we'll create)
- GitHub Secrets (we'll add)
- App Store Connect app record (we'll create if needed)

---

## Step 1: Create an EAS Account & Project (5 min)

1. Go to **[expo.dev](https://expo.dev)** and sign in (or create account).
2. Click **Create project** (or use an existing one if you have Expo projects).
3. Select **AccessMap** as the project name.
4. Copy your **EAS Token** (you'll need it in Step 5).
   - Go to **Account → Settings → Tokens**.
   - Click **Create Token** (or copy an existing one).
   - Save it somewhere safe (you can't see it again).

---

## Step 2: Add GitHub Secrets

These secrets let the GitHub Actions workflows authenticate with EAS and Apple.

**Go to:** GitHub Repo → Settings → Secrets and variables → Actions → New repository secret

Add these four secrets (copy the exact names):

| Secret Name | Value | Where to find |
|---|---|---|
| `EAS_TOKEN` | Your EAS token from Step 1 | Expo dashboard |
| `APPLE_TEAM_ID` | Your 10-char Apple Team ID | [developer.apple.com](https://developer.apple.com/account) → Membership details |
| `EXPO_APPLE_ID` | Your Apple ID email | Your Apple account email |
| `EXPO_APPLE_PASSWORD` | Your Apple ID password OR app-specific password | If you use 2FA on your Apple account (recommended), create an app-specific password: [appleid.apple.com](https://appleid.apple.com) → App passwords |

**⚠️ Security note:** Never commit these values. Never post them in Slack. The GitHub Secrets UI is the only place they live.

---

## Step 3: Link Apple Developer Team to EAS (10 min)

EAS needs permission to create builds signed with your Apple Team ID.

1. **In Terminal, run:**
   ```bash
   eas credentials
   ```

2. **Follow the prompts:**
   - Choose platform: **iOS**
   - Choose action: **Set up a build certificate** (or **Manage existing credentials** if you already have one)
   - Follow EAS's flow to either:
     - Create a new certificate (EAS walks you through), OR
     - Upload an existing one from Xcode

3. **Check the result:** When done, EAS will confirm credentials are stored.

---

## Step 4: Create App Store Connect Record (10 min)

TestFlight needs an app record in Apple's portal.

1. Go to **[appstoreconnect.apple.com](https://appstoreconnect.apple.com)**.
2. Click **Apps** → **New app**.
3. Fill in:
   - **Platform:** iOS
   - **Name:** AccessMap
   - **Bundle ID:** com.accessmap.app (must match app.json)
   - **SKU:** accessmap (just a unique identifier for you)
   - **User Access:** Your Apple ID
4. **Save.**
5. In the **General** tab, note the **App Store Connect Apple ID** (a number like `1234567890`). You'll need this soon.

---

## Step 5: Update eas.json with App Store Connect ID

Now that the app record exists, update the submit configuration.

**Edit:** `eas.json` in the repo root.

Find this section:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "TODO_APPLE_ID@example.com",
      "ascAppId": "TODO_ASC_APP_ID",
      "appleTeamId": "TODO_APPLE_TEAM_ID"
    }
  }
}
```

Replace with your actual values:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-email@apple.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABC12D3E4F"
    }
  }
}
```

**Commit & push** this change to main or a branch — it's just configuration, no secrets.

---

## Step 6: Test the First Build (5 min)

Push a commit to any branch and watch GitHub Actions.

1. **Make a tiny change** (e.g., update a comment in App.tsx).
2. **Commit & push:**
   ```bash
   git add src/App.tsx
   git commit -m "test: trigger eas build"
   git push origin your-branch
   ```
3. **Go to GitHub** → **Actions** tab → watch the **EAS Build (Development)** workflow.
4. **When it completes:**
   - If **green ✅**, the build succeeded. Find the build link in the logs (it will say "Build finished").
   - If **red ❌**, check the error logs (usually a credentials issue; re-run `eas credentials`).

---

## Step 7: Submit to TestFlight (Ongoing)

### Option A: One-liner (Manual)
```bash
npm run deploy:testflight
```

This builds (preview profile) and submits to TestFlight in one command. Takes ~15 min.

### Option B: GitHub Actions (Manual Trigger)
1. Go to **Actions** → **EAS TestFlight Submit** workflow.
2. Click **Run workflow**.
3. Choose profile: **preview** (for testing) or **production** (for release).
4. Wait for the build + submit to complete.

### Option C: Automatic on Release Tags
Push a tag like `v1.0.0`:
```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

The workflow automatically builds (production profile) and submits to TestFlight.

---

## Step 8: Install on Your Phone

Once a build is submitted to TestFlight:

1. **On your iOS device,** open the **TestFlight** app.
2. **Go to the "Apps" tab** and find **AccessMap**.
3. **Tap "Install"** or **"Update"** (it will say "Update" if you already have a previous build).
4. **TestFlight will download and install** the build.
5. **Open AccessMap** and test.

---

## Daily Workflow (Once Set Up)

1. **Team pushes code** to a feature branch.
2. **GitHub Actions auto-builds** (eas-build.yml runs on every push).
3. **When you're ready to test:**
   - Run `npm run deploy:testflight` (or click "Run workflow" in Actions), OR
   - Wait for a manual trigger from the team.
4. **You get a TestFlight notification** on your phone when the build is ready (~15 min later).
5. **Tap "Install"** on TestFlight → test the new version.

---

## Troubleshooting

### Build fails with "APPLE_TEAM_ID not found"
- Run `eas credentials` again to ensure credentials are cached.
- Check that `APPLE_TEAM_ID` is set in GitHub Secrets.

### TestFlight submission fails with "Invalid Apple ID"
- Verify `EXPO_APPLE_ID` is your actual Apple ID email (e.g., `skyler@apple.com`).
- If you use 2FA (recommended), use an **app-specific password**, not your Apple ID password.
- Double-check `EXPO_APPLE_PASSWORD` in GitHub Secrets.

### "Could not create development certificate"
- You may already have a certificate. Run `eas credentials` and choose **Manage existing credentials** → **View credentials**.
- If there's a mismatch, delete the old one in your Apple Developer account and let EAS create a fresh one.

### Build hangs or times out
- Check the EAS Build logs: **[eas.dev](https://eas.dev)** → Project → Builds.
- Network issues are rare; usually it's a credential refresh needed.

---

## Next Steps

1. **Invite team to TestFlight** (optional):
   - App Store Connect → **AccessMap** → **TestFlight** → **Testers**.
   - Add team members by email. They'll see builds and can install directly.

2. **Set up notifications** (optional):
   - EAS Build dashboard → **Notifications** → enable Slack or email for build status.

3. **Automate release notes**:
   - Each TestFlight build can include release notes from the CHANGELOG.
   - Configure in the GitHub Actions workflow (docs/EAS_SETUP.md § "Release Notes").

---

## References

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/ios/)
- [Apple App Store Connect](https://appstoreconnect.apple.com)
- [Expo.dev Dashboard](https://expo.dev)
