# Flagstone Release Runbook

**How to ship a new version of Flagstone**

This is your step-by-step guide for releasing a new version. Follow it in order, every time. You're learning by doing — if something isn't clear, the linked docs go deeper.

---

## Before You Start: Pre-Release Checklist

Before you touch anything, confirm these are complete:

- [ ] All features tested on a real device (not just the simulator)
- [ ] All pre-launch blockers resolved (check `~/AccessMap/PROJECT_STATE.md`)
- [ ] Version number bumped in `app.json` and `package.json`
- [ ] CHANGELOG.md updated with user-facing changes ("What's New")
- [ ] Privacy policy draft approved (if changes to data handling)

If any of these aren't done, stop here and finish them first.

---

## Phase 1: Automated CI Check (5 minutes)

The moment you push to `main`, GitHub automatically runs a series of checks. This is your safety net.

**What happens automatically:**
1. **TypeScript check** — Makes sure there are no type errors in the code
2. **Lint check** — Makes sure code style is consistent (formatting, no unused imports)
3. **Unit tests** — Runs 1,120+ automated tests to catch regressions

**To watch it happen:**

```bash
cd ~/AccessMap
git push origin main
```

Then open https://github.com/Skypie99/AccessMap/actions in your browser. You'll see a workflow run appear at the top.

**What to look for:**

- Green checkmarks ✅ → All good, proceed to Phase 2
- Red X ❌ → Something failed. Click the failed job to see the error. Fix it locally, push again, and watch it re-run.

**Typical failures:**
- `TypeScript error: Property 'x' does not exist` → You added code with a type error. Fix it in the editor.
- `ESLint: Unexpected console.log` → You left a debugging log. Remove it.
- `Test failed: Expected true, got false` → A feature broke something else. Review the test.

Don't move forward until CI is green.

---

## Phase 2: Build a Preview (30 minutes, mostly waiting)

Now you're building a real app that can run on actual devices. This is where the magic happens.

### What is a "preview"?

A preview is a test version of your app that you install on your phone to verify everything works before submitting to the App Store. It's built in the cloud using the same code that will go to production.

### Build the preview

```bash
cd ~/AccessMap
eas build --platform all --profile preview --non-interactive
```

This command:
- Builds for **both iOS and Android** (if you have both set up)
- Uses the `preview` profile from `eas.json` (Expo's build configuration)
- Runs in the cloud (you don't need to have Xcode or Android Studio open)

### Watch the build

A link will print to your terminal. Open it, or go here:
https://expo.dev

You'll see a progress bar. The build takes **15–25 minutes** depending on what changed. While you wait:
- Grab a coffee
- Review the CHANGELOG one more time
- Check that all testers know a new build is coming

### What you get

Once the build finishes, EAS gives you two files (one for each platform):
- **iOS:** A `.ipa` file (iPhone app bundle) ready for TestFlight or App Store
- **Android:** An `.apk` file (Android app) ready for Google Play or direct install

You don't need to download these manually — the next step handles it.

---

## Phase 3: Test the Preview Build (30 minutes, hands-on)

Install the preview build on a real device and run smoke tests.

### Get the preview build on your phone

**Option A: Automatic TestFlight link (easiest)**

Expo sends a TestFlight link to your registered testers. Tap the link on your iOS device and install from the TestFlight app.

**Option B: Manual (if TestFlight doesn't work)**

Go to https://expo.dev, find your build, and download the `.ipa`. Then use Xcode to install it on your device (see `docs/EAS_SETUP.md` if you get stuck).

### Run the smoke test

Smoke test = "Does the app open and do the basic things?" Not exhaustive, but catches obvious breaks.

On your device, test these 8 things (should take 10–15 minutes):

1. **App opens** — Tap the icon. Does it start without crashing?
2. **Sign in** — Log in with a test account. Does the auth flow work?
3. **Map loads** — Wait for the map to appear. Do you see your location?
4. **Flags are visible** — Are existing accessibility flags showing up?
5. **Add a flag with photo** — Take a photo and submit a report. **Most important:** Verify the photo upload works AND the photo EXIF data is stripped (no location leaked). See `docs/PRIVACY_CHECKLIST.md` for details.
6. **Notifications work** — Ask a tester to flag a location near you and watch for a push notification on your device.
7. **Dark mode** — In phone settings, toggle Dark Mode on/off. Does the app UI respond? (Colors readable, no bright white on dark background, etc.)
8. **Crash-free session** — Use the app for 5 minutes. No unexpected errors or freezes.

### If anything fails

**Example failures:**
- "App crashes on sign in" → There's a bug. Go back, fix it, bump the version number, and rebuild. Start at Phase 1 again.
- "Dark mode looks weird" → Same process: fix, rebuild, test again.
- "EXIF data is still in the photo" → **BLOCKER.** This is a privacy issue. Fix it and go through the whole process again. Don't skip this.

**If everything passes**, proceed to Phase 4.

---

## Phase 4: Production Build (45 minutes, mostly waiting)

Once the preview passes testing, you're ready to build the real thing that will go to the app stores.

```bash
cd ~/AccessMap
eas build --platform all --profile production --non-interactive
```

This is identical to Phase 2, but uses the `production` profile (which has optimizations and signing keys for the real App Store).

**Timeline:** ~25 minutes to build

**What you get:**
- **iOS:** A `.ipa` signed for the App Store (ready to submit to Apple)
- **Android:** A `.aab` (App Bundle) signed for Google Play

---

## Phase 5: Submit to App Stores

Now you're pushing your app to the world.

### iOS (Apple App Store)

**Option A: Automatic (one command)**

```bash
eas submit --platform ios --profile production --non-interactive
```

This automatically uploads your build to App Store Connect and submits it for review. Apple takes 1–3 business days to review.

**Option B: Manual (if you need to change anything)**

1. Go to https://appstoreconnect.apple.com and sign in
2. Navigate to **My Apps** → **Flagstone**
3. Click the **+** button to create a new version
4. Upload the `.ipa` from Phase 4
5. Copy the user-facing release notes from `RELEASE_NOTES.md` into the "What's New" field
6. Click **Submit for Review**

### Android (Google Play Store)

**Option A: Automatic**

```bash
eas submit --platform android --profile production --non-interactive
```

Google typically approves within a few hours (much faster than Apple).

**Option B: Manual**

1. Go to Google Play Console: https://play.google.com/console
2. Navigate to **Flagstone** → **Releases** → **Create new release**
3. Upload the `.aab` from Phase 4
4. Fill in release notes and version details
5. Click **Review and rollout**

### What happens next

- **iOS:** Apple reviews your submission (1–3 days). You'll get an email when approved or if they have questions.
- **Android:** Google reviews (usually same day). Approval is usually automatic unless there's a policy violation.

Once approved, your app appears in both stores automatically.

---

## Phase 6: After Approval (Monitoring & Wrap-Up)

Your app is live. Now monitor for issues.

### First 24 hours

- **Watch for crashes:** Check your crash reporting tool (if you have Sentry or Bugsnag set up)
- **Read user feedback:** Monitor the app store reviews and ratings
- **Be ready to rollback** (see emergency steps below)

### Wrap-up

1. **Announce** the release in your beta tester Slack/Discord channel
2. **Close the release** in GitHub:
   - Go to https://github.com/Skypie99/AccessMap/releases
   - Create a release tag matching your version (e.g., `v0.2.0`)
   - Copy release notes from `RELEASE_NOTES.md`
   - Publish

That's it. You've shipped.

---

## Emergency: How to Rollback

If something goes very wrong after release (crash on startup, data loss, security issue), you can temporarily pull the app from stores.

### iOS App Store

1. Go to https://appstoreconnect.apple.com → **My Apps** → **Flagstone**
2. Find the version that's causing problems
3. Click **Remove from Sale** (temporary, reversible)

The app disappears from the App Store for new users but stays on devices that already have it installed.

### Android Google Play

1. Go to Google Play Console → **Flagstone** → **Releases**
2. Find the problematic release
3. Click **Halt rollout** (stops pushing to new users)

### Then fix and re-release

Once you've removed the broken version:
1. Fix the bug locally
2. Bump the version again
3. Go through the whole process from Phase 1

---

## Version Numbering

Flagstone uses **semantic versioning** (MAJOR.MINOR.PATCH):

- **0.2.x** (patch) — Bug fixes, small tweaks (e.g., `0.2.1`, `0.2.2`)
- **0.x.0** (minor) — New features, sprint completion (e.g., `0.3.0`, `0.4.0`)
- **1.0.0** (major) — Public launch

**Current version:** Check `app.json` → `expo.version`

To bump version:
```bash
# In app.json and package.json
"version": "0.2.1"  # Increment the last number for bug fixes
"version": "0.3.0"  # Increment the middle number for feature releases
```

---

## One-Time Setup (if you haven't done it yet)

If this is your first release, you need credentials set up:

1. **EAS Account:** See `docs/EAS_SETUP.md` → Step 1
2. **GitHub Secrets:** See `docs/EAS_SETUP.md` → Step 2 (EXPO_TOKEN, APPLE_TEAM_ID, etc.)
3. **Apple/Google accounts:** You need an Apple Developer account ($99/year) and Google Play Developer account ($25 one-time)

Complete these before you try to build anything.

---

## Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| CI fails with type errors | Check the error in GitHub Actions, fix locally, push again |
| Build times out (>30 min) | Usually a network blip. Retry: `eas build --platform all --profile preview` |
| "EXPO_TOKEN not found" | You're missing the GitHub secret. See `docs/EAS_SETUP.md` |
| "App crashes on TestFlight" | Simulator vs. real device bug. Fix it, increment version, rebuild |
| "EXIF data visible in photo" | **Privacy blocker.** Fix in code, rebuild, don't ship without this fixed |
| "Build succeeded but upload failed" | Usually a credentials issue. Check `docs/EAS_SETUP.md` for secrets |

---

## Questions?

- **Setup/credentials:** See `docs/EAS_SETUP.md`
- **App Store review process:** See Apple's [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- **Privacy/EXIF:** See `docs/PRIVACY_CHECKLIST.md`
- **Stuck?** Open a GitHub issue with the error message and which phase failed

---

**Last updated:** 2026-05-30  
**Version:** 1.0 (first release runbook)
