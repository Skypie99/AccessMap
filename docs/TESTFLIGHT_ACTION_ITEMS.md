# AccessMap — TestFlight & App Store Action Items

**Author:** Steve (Security & Robustness Audit)  
**Date:** 2026-06-01  
**Branch audited:** `feat/phase5-trust-score` + main  
**Purpose:** Source of truth for every blocker between now and a successful App Store submission.

---

## TL;DR

There are **2 root causes** for the current submission failure, both in the EAS pipeline config. There are **5 items** that will cause Apple to reject the app if submitted today. There are **5 medium-risk items** that may trigger rejection or degraded user experience. Fix the 🔴 items in order before triggering any submission.

---

## Part 1 — Root Causes of Current Submission Failure

### 🔴 RC-1 — Wrong build profile used for TestFlight submission
**Severity:** 🔴 Blocking — This is the primary root cause.  
**Owner:** Rory (config change) + Sky (update TESTFLIGHT_LAUNCH.md mental model)  
**Time:** Quick (5 min config fix)

`docs/TESTFLIGHT_LAUNCH.md` instructs:
```bash
eas build --profile preview --platform ios
eas submit --platform ios --latest
```

**This is wrong.** The `preview` profile has `distribution: "internal"` in `eas.json`. Internal distribution creates an ad-hoc IPA signed for specific registered devices — it **cannot be uploaded to App Store Connect**. Apple's servers reject any attempt to submit an internal-distribution IPA. This is why you see "Something went wrong when submitting your app to Apple App Store Connect" — it's a signing mismatch rejection at the upload level, not a review rejection.

The `testflight` profile has `distribution: "store"` and is correctly configured for App Store/TestFlight submission. It also has `buildConfiguration: Release` and `autoIncrement: true`.

**Fix:**
1. In `docs/TESTFLIGHT_LAUNCH.md`, change both commands to:
   ```bash
   eas build --profile testflight --platform ios
   eas submit --platform ios --latest
   ```
2. In the GitHub Actions workflow (`.github/workflows/eas-testflight-submit.yml`), change the `options` list so the default is `testflight` instead of `preview` for submission runs:
   ```yaml
   options:
     - testflight    # ← new default for submission
     - preview       # internal only, NOT submittable
     - preview2
     - preview3
     - production
   ```
3. Consider adding a guard in the workflow that fails with a clear error if `preview`, `preview2`, or `preview3` are selected with the submit step (since they're internal distribution and can never be submitted).

---

### 🔴 RC-2 — `eas submit` in GitHub Actions workflow is missing `--latest` flag
**Severity:** 🔴 Blocking  
**Owner:** Rory  
**Time:** Quick (2 min fix)

The workflow submit step is:
```yaml
run: eas submit --platform ios --profile ${{ github.event.inputs.profile }} --non-interactive
```

In non-interactive mode (`--non-interactive`), EAS cannot prompt "which build do you want to submit?" Without `--latest` or a specific build ID, the command either fails or submits the wrong/stale build. The build and submit steps run in the same job so EAS may auto-link via a build ID env var — but this is fragile and not documented behavior.

**Fix:** Add `--latest` flag:
```yaml
run: eas submit --platform ios --latest --profile production --non-interactive
```

Note: Also hard-code `--profile production` here (not `${{ inputs.profile }}`). The submit profile in `eas.json` only has credentials under `submit.production` — passing `--profile preview` or `--profile testflight` would look for `submit.preview` / `submit.testflight` which don't exist.

---

### 🟡 RC-3 — `EXPO_APPLE_PASSWORD` must be an app-specific password
**Severity:** 🟡 Risk — May be correct already, confirming is quick  
**Owner:** Sky  
**Time:** Quick (5 min to verify / regenerate)

Apple's automated submission pipeline does not accept your regular Apple ID password when 2FA is enabled (and 2FA should always be enabled). The `EXPO_APPLE_PASSWORD` GitHub Secret must be an **app-specific password** generated at:

> https://appleid.apple.com → Sign-In and Security → App-Specific Passwords → Generate

The secret should be in the format `xxxx-xxxx-xxxx-xxxx` (4 groups of 4 chars, no spaces or `@`).

**How to verify:** Go to GitHub → Settings → Secrets → `EXPO_APPLE_PASSWORD`. You can't read the value, but if submission fails with "Authentication with the App Store failed" or "Username/password invalid," regenerate it.

---

### 🟡 RC-4 — Missing `release-approval` GitHub Environment
**Severity:** 🟡 Risk — If not set up, the workflow will stall (not fail fast)  
**Owner:** Sky  
**Time:** Quick (5 min)

The GitHub Actions workflow has `environment: release-approval` on the build job. If this environment doesn't exist in GitHub, the job will either stall waiting for a reviewer or fail immediately depending on GitHub's behavior.

**Fix:** GitHub Repo → Settings → Environments → New environment → name it `release-approval` → add Sky as a Required reviewer. Until this exists, the workflow can't proceed even if the other fixes are in place.

---

## Part 2 — Hard Blockers for App Store Review

These will result in Apple **rejecting** the submission if not resolved before submitting.

### 🔴 AR-1 — No App Store screenshots
**Severity:** 🔴 Blocking — Apple will not approve without at least 1 screenshot  
**Owner:** Dani + Rory  
**Time:** Medium (screenshots need the app running; Rory automates with `eas build` + simulator)

Apple requires **at minimum 1 screenshot** at iPhone 6.7" resolution (2796×1290 px). The app's App Store listing currently has no screenshots. Without them, the ASC record is incomplete and Apple will reject the submission before it even reaches review.

Plan is documented in `docs/APP_STORE_LISTING.md` — 6 screenshots planned:
1. Map view with flag clusters
2. Flag detail + status history
3. Report flow (new flag)
4. Tasks list
5. Heatmap density view
6. Profile screen (stats + achievements)

**Recommended approach for Rory:** Use `eas build --profile preview --platform ios --simulator` to get a simulator build, then run the app in a 6.7" iPhone simulator, capture screenshots with `xcrun simctl io booted screenshot`.

---

### 🔴 AR-2 — No test account for Apple reviewer
**Severity:** 🔴 Blocking — Apple requires demo credentials for apps that require login  
**Owner:** Sky  
**Time:** Quick (10 min to create a Supabase test account)

AccessMap requires users to sign in before using any features. Apple's App Review team cannot test apps they can't log in to. Without a test account in the submission notes, Apple will reject with "Guideline 4.0 - Design: Sign-in required without demo account."

**Fix:**
1. Create a test account in your Supabase dashboard: email `reviewer@accessmap.com`, password something memorable (not a real password)
2. Pre-populate the account with 2–3 test flags so the map isn't empty
3. Include these credentials in the App Store Connect review notes field:
   > "Test account: reviewer@accessmap.com / [password]. App requires location permission to show nearby flags — grant when prompted. This app uses location to display accessibility barrier reports."

---

### 🔴 AR-3 — Privacy policy URL not entered in App Store Connect
**Severity:** 🔴 Blocking — Required field; Apple rejects without it  
**Owner:** Sky  
**Time:** Quick (5 min in App Store Connect UI)

The privacy policy is live at `https://skypie99.github.io/AccessMap/privacy/` (confirmed in PROJECT_STATE.md). But it hasn't been entered into the App Store Connect record. This is a mandatory field — Apple will reject the submission if it's missing.

**Fix:**
1. Log into appstoreconnect.apple.com → My Apps → AccessMap
2. App Information → Privacy Policy URL → enter `https://skypie99.github.io/AccessMap/privacy/`
3. While there, also set the Support URL to `https://github.com/skypie99/AccessMap/issues`

---

### 🔴 AR-4 — Production EAS build has not been triggered
**Severity:** 🔴 Blocking — The `testflight` profile works for TestFlight; `production` is needed for App Store submission  
**Owner:** Rory → Sky triggers  
**Time:** Medium (25–30 min build time, mostly waiting)

The last build (`2e91ae9b`) was a `preview` (internal distribution) build. For App Store submission, you need a `testflight` (for TestFlight) or `production` (for App Store) build. Both use `distribution: "store"`.

**Prerequisites before running the production build:**
- All feature branches merged to main (see AR-5)
- The `d8_closed=yes` flag must be passed if using the GitHub workflow for production

**Command:**
```bash
# For TestFlight (first step — verify before going to App Store):
eas build --profile testflight --platform ios --non-interactive

# For App Store submission (after TestFlight passes):
eas build --profile production --platform ios --non-interactive
```

---

### 🔴 AR-5 — `feat/phase5-trust-score` branch not merged to main
**Severity:** 🔴 Blocking — Current branch; production build must be off main  
**Owner:** Rory (merge coordination)  
**Time:** Medium (depends on QA gate status for trust score)

The current working branch is `feat/phase5-trust-score`. Production EAS builds should always be triggered off `main`, not a feature branch. Morgan's Phase 6 strategy lists the remaining merge queue:
- `feat/phase5-anon-reporting` — anon reporting + admin moderation
- `feat/phase5-trust-score` — trust score system (current branch, in progress)

Check `PROJECT_STATE.md` for the current gate status of each branch. Trust score is marked "Shamus building 🔄" — once QA passes, Rory can merge.

---

## Part 3 — Medium-Risk Items (May Cause Rejection or Degraded UX)

### 🟡 MR-1 — `expo-notifications` plugin missing from app.json
**Severity:** 🟡 Risk — Push notifications will silently fail in App Store builds  
**Owner:** Rory (config change; no app logic change needed)  
**Time:** Quick (5 min to add to app.json, then needs a rebuild)

`expo-notifications` is installed in `package.json` (`~0.32.17`) and is used in `src/lib/pushNotifications.ts`, but it is **not listed in `app.json`'s `plugins` array**. This matters because:

1. The Expo build system reads the `plugins` array to know which native modules need iOS entitlements configured.
2. Without the plugin entry, the iOS build will not include the `aps-environment: production` entitlement in the `.entitlements` file.
3. Without `aps-environment: production`, APNs will refuse to deliver push notifications to App Store builds entirely (this is enforced by Apple at the APNs server level, not by EAS or Expo).
4. Push notifications working in development (Expo Go) but silently failing in production is the exact symptom.

**Fix:** Add to `app.json` plugins array:
```json
"plugins": [
  ["expo-location", { "locationWhenInUsePermission": "..." }],
  ["expo-image-picker", { "photosPermission": "...", "cameraPermission": "..." }],
  ["expo-notifications", {
    "icon": "./assets/icon.png",
    "color": "#1a4fa3"
  }]
]
```

After adding, trigger a new `testflight` or `production` build — the existing build `2e91ae9b` will not have the correct entitlements and cannot be patched.

---

### 🟡 MR-2 — Supabase `pg_net` extension not enabled (push notifications inert)
**Severity:** 🟡 Risk — Apple reviewers will test push notifications; they'll appear broken  
**Owner:** Sky (Supabase SQL console, 1-line command)  
**Time:** Quick (2 min)

The `notify-flag-status` Edge Function uses `net.http_post` to call APNs. This requires the `pg_net` extension. On Supabase free tier, it is not enabled by default.

**Fix:** In Supabase SQL Editor, run:
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

Then verify the Edge Function is deployed (Supabase Dashboard → Edge Functions → `notify-flag-status`). Without this, push notifications are completely inert even if MR-1 is fixed and APNs entitlements are correct.

**Caution:** If you list push notifications as a feature in the App Store description (the current listing copy does: "Get notified when flags you reported are resolved"), Apple reviewers will expect them to work. If they don't, expect a rejection.

---

### 🟡 MR-3 — Privacy Policy missing trust tier leaderboard disclosure (Jordan Condition 1)
**Severity:** 🟡 Risk — Technically required for PIPEDA compliance; Apple reviewers check accuracy  
**Owner:** Will (drafts text) → Sky (approves) → Sky (updates hosted policy)  
**Time:** Medium (30 min to draft + review + deploy)

Jordan's Phase 6 audit identified this as a required condition before App Store submission. The privacy policy at `https://skypie99.github.io/AccessMap/privacy/` does not yet disclose that:
- User display name + points are visible to other authenticated users via the leaderboard
- Trust tier (Bronze/Silver/Gold/Platinum) is public to other users
- Users can use a pseudonym to remain anonymous

Jordan's exact proposed text (from `qa-reports/2026-06-01_Jordan_Phase6Audit.md`, Condition 1):
```
### Community Leaderboard & Trust Tiers
- Your display name and points total are visible to other authenticated app users via the Community Leaderboard
- Your trust tier (Bronze, Silver, Gold, Platinum) is derived from the accuracy of your reports and is visible to other users
- Participation in the leaderboard is voluntary — you can use a pseudonym as your display name to remain anonymous
- The leaderboard is not visible to users browsing anonymously without an account
```

Add this to the "How We Use Your Data" section of `docs/PRIVACY_POLICY.md` and `docs/privacy/index.html`, then push to GitHub Pages.

---

### 🟡 MR-4 — EXIF production gate still armed in CI workflow
**Severity:** 🟡 Risk — Will block the production submission workflow run; Sky must know the exact flag to pass  
**Owner:** Rory (document the process clearly)  
**Time:** Quick (no code change; process clarification)

The GitHub Actions workflow has a hard block:
```yaml
if [ "production" ] && [ "${{ d8_closed }}" != "yes" ]; then
  exit 1  # "D8 EXIF GPS privacy leak is a pre-launch blocker"
```

The EXIF stripping code IS fully implemented (`stripExifNative` + `verifyExifStripped` in `src/lib/flags.ts`). The code gate was never removed after implementation. When Sky is ready to trigger a production build via the workflow, pass `d8_closed=yes` at dispatch time.

**Recommendation:** Rory should update the workflow's input description to be clearer:
> "D8 EXIF stripping is implemented and tested. Type 'yes' to confirm you've verified the stripping works on a real device (smoke test step 5 in RELEASE_RUNBOOK.md)."

This turns the gate from a scary blocker into a deliberate confirmation step.

---

### 🟡 MR-5 — Privacy Manifest may be missing app-level declarations
**Severity:** 🟡 Risk — Apple can reject at binary scan if required-reason APIs are undeclared  
**Owner:** Rory  
**Time:** Medium (30 min research + add if needed)

As of iOS 17, apps using certain "required reason" APIs must declare them in a `PrivacyInfo.xcprivacy` file. The relevant APIs for this app:
- **NSPrivacyAccessedAPICategoryUserDefaults** — `@react-native-async-storage/async-storage` uses `NSUserDefaults` on iOS. The package has its own `PrivacyInfo.xcprivacy` in `node_modules/@react-native-async-storage/async-storage/ios/`, but if Expo doesn't aggregate it properly, there's a gap.
- **NSPrivacyAccessedAPICategoryFileTimestamp** — `expo-image-picker`, `expo-file-system` access file timestamps. Both have `PrivacyInfo.xcprivacy` in their `ios/` dirs.

**Expo SDK 54 should aggregate all third-party `PrivacyInfo.xcprivacy` files automatically** during the native build via CocoaPods. The aggregated manifest will appear in the built `.xcarchive`. This is Expo's responsibility, not the app's.

**Verification:** After triggering the testflight build, check the build log for:
```
[CP] Copying PrivacyInfo.xcprivacy files
```
If aggregation runs, you're covered. If not (old EAS CLI or pod issue), you may need to add `expo.ios.privacyManifests` to `app.json` manually. This needs to be confirmed on the actual build; it cannot be verified from the source code alone.

---

## Part 4 — Nice to Have (Green, Non-Blocking)

### 🟢 NH-1 — CHANGELOG.md missing
`RELEASE_RUNBOOK.md` pre-flight checklist requires "CHANGELOG.md updated." No `CHANGELOG.md` exists. Either create one or remove the checklist item from the runbook.

### 🟢 NH-2 — Support URL not set in App Store Connect
`docs/APP_STORE_LISTING.md` has `[Sky fills in]` for the support URL. Recommended value: `https://github.com/skypie99/AccessMap/issues`. Set this in App Store Connect → App Information before going live.

### 🟢 NH-3 — `PROJECT_STATE.md` is stale about ASC App ID
Line 81 says "ASC App ID: still needed in eas.json before automated TestFlight submit." Rory filled it in on 2026-05-30 (`6774709116`). Update PROJECT_STATE.md to reflect this.

### 🟢 NH-4 — Android submit still has TODO placeholder
`eas.json` → `submit.production.android.serviceAccountKeyPath` is still `"TODO_PATH_TO_GOOGLE_SERVICE_ACCOUNT_KEY.json"`. Android submission is not required for Phase 6 iOS launch, but this will cause the workflow to fail for any Android submit attempt.

### 🟢 NH-5 — `production` profile missing `SENTRY_DISABLE_AUTO_UPLOAD`
The `testflight` profile has `"SENTRY_DISABLE_AUTO_UPLOAD": "true"` but the `production` profile does not. Sentry is not currently active (no plugin in app.json), so this is harmless now. But if Sentry is ever re-added, the production build would attempt source map upload and fail silently. Add the env var to `production` as a defensive measure.

### 🟢 NH-6 — `app.json` missing `owner` field
`app.json` doesn't have `expo.owner`. The `extra.eas.projectId` is set, which EAS uses for routing — so this is functionally OK. But running `eas init` (as documented in the EAS setup guide) would fill this in cleanly and remove any ambiguity.

---

## Execution Order (Recommended Sprint Sequence)

| Priority | Item | Owner | Prerequisite |
|---|---|---|---|
| 1 | RC-1 — Fix TESTFLIGHT_LAUNCH.md + workflow to use `testflight` profile | Rory | None |
| 2 | RC-2 — Add `--latest` to workflow submit command | Rory | None |
| 3 | RC-3 — Verify/regenerate `EXPO_APPLE_PASSWORD` secret | Sky | None |
| 4 | RC-4 — Set up `release-approval` GitHub Environment | Sky | None |
| 5 | MR-1 — Add `expo-notifications` to app.json plugins | Rory | None |
| 6 | AR-5 — Merge trust score + anon reporting to main | Rory | QA gates pass |
| 7 | AR-4 — Trigger testflight EAS build | Rory → Sky | Steps 1–6 done |
| 8 | MR-2 — Enable pg_net on Supabase | Sky | None (independent) |
| 9 | AR-2 — Create test reviewer account | Sky | None (independent) |
| 10 | AR-3 — Add privacy policy URL in App Store Connect | Sky | None (independent) |
| 11 | AR-1 — Generate App Store screenshots | Dani + Rory | Testflight build available |
| 12 | MR-3 — Update privacy policy (Jordan Condition 1) | Will → Sky | None (independent) |
| 13 | MR-4 — Confirm d8_closed flag scope for production trigger | Rory | Device smoke test done |
| 14 | MR-5 — Verify PrivacyInfo.xcprivacy aggregation in build log | Rory | Testflight build available |
| 15 | AR-4 (production) — Trigger production EAS build | Sky | Testflight verified on device |
| 16 | Submit to App Store | Sky | All above complete |

---

## Summary of Blockers by Category

| | 🔴 Blocking | 🟡 Risk | 🟢 Nice to have |
|---|---|---|---|
| Submission pipeline | RC-1, RC-2 | RC-3, RC-4 | NH-5, NH-6 |
| Apple review | AR-1, AR-2, AR-3, AR-4, AR-5 | MR-1, MR-2, MR-3, MR-4, MR-5 | NH-1, NH-2, NH-3, NH-4 |

**Fastest path to first successful TestFlight build:**
1. Rory fixes RC-1 + RC-2 + MR-1 (30 min total)
2. Sky fixes RC-3 + RC-4 + MR-2 (20 min total)
3. Rory triggers `eas build --profile testflight --platform ios`
4. Sky runs `eas submit --platform ios --latest` after build completes

**Fastest path to App Store submission:**  
After TestFlight is working → complete AR-1 through AR-5 in the order above.

---

*This document is the source of truth. When each item is resolved, check it off here. Morgan should route this to Sky via the next session update.*
