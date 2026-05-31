# AccessMap — TestFlight Fix Plan
**Author:** Morgan (investigation + strategic planning)
**Date:** 2026-06-01
**Status:** CURRENT BLOCKER — submit failing with "Something went wrong when submitting your app to Apple App Store Connect"
**Current branch:** feat/phase5-trust-score
**Last working TestFlight build:** 2e91ae9b (Phase 1-2 era, ~2026-05-29)

---

## Section 1 — What Worked for Phase 1-2 (Historical Record)

The first successful TestFlight install happened around 2026-05-29. Getting there required fixing five independent blockers in sequence.

### Blocker 1: App crashed on launch after install
**Cause:** Three co-occurring bugs.
1. Supabase env vars (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) were in local `.env` but never uploaded to EAS. Metro baked empty strings into the IPA.
2. Sentry plugin was registered twice in `app.json` → double-patching during prebuild.
3. `supabase.ts` had an `if (__DEV__)` guard around the "throw on missing env vars" check. Preview/Release builds have `__DEV__ = false`, so the client silently continued with empty credentials.

**Fix:** Commit `19d7738` — uploaded Supabase secrets to EAS, removed duplicate Sentry plugin, removed `__DEV__` guard.

### Blocker 2: EAS build itself failed to compile
**Cause:** Four root causes discovered during build.
1. `.npmrc` missing `legacy-peer-deps=true` → EAS npm install failed on babel-preset-expo@56 ESLint v10 peer dep conflict.
2. `babel.config.js` defaulted to hermes-v1 profile. Expo SDK 54 ships an older Hermes that needs `hermes-v0` to get the class property transforms.
3. `ios/AppDelegate.swift` had `sourceURL(for:)` override with no `#if DEBUG` guard. RCTBridge is absent from Swift's module map in Release builds (RN 0.81).
4. `eas.json` had `appleTeamId` inside the `build.<profile>.ios` sub-object. EAS CLI v10 no longer allows it there — Team ID is auto-detected from project credentials.

**Fix:** Commits `55c167b` + `f97e242` — four surgical changes, plus babel-preset-expo downgraded from `^56` to `~54.0.10` to pin to SDK 54's expected version.

### Blocker 3: ASC App ID was a placeholder
**Cause:** `eas.json` had `"ascAppId": "TODO_ASC_APP_ID"` — the app record in App Store Connect hadn't been created yet, so no real ID existed.

**Fix:** Sky created the app record in App Store Connect (Bundle ID: `com.accessmap.app`), retrieved the 10-digit Apple ID from App Information, then commit `158f38a` hardcoded `6774709116` into `eas.json`.

### Blocker 4: Submit credentials not stored in EAS
**Cause:** `eas submit` needs an Apple ID + app-specific password to authenticate with App Store Connect. These weren't stored in EAS initially.

**Fix:** Sky ran `eas credentials` in an interactive terminal session to authenticate and store credentials against the EAS project. Also required that `$EXPO_APPLE_ID` and `$EXPO_APPLE_TEAM_ID` were set as EAS secrets (the submit config at that time used env var references).

### Blocker 5: Sentry kept crashing builds / installs
**Cause:** Sentry went through three breaking states — version mismatch (8.x vs 7.x expected by SDK 54), duplicate plugin entry, then outright native plugin crash on iOS 26.

**Fix:** Progressive fixes: version pin to 7.2 (`5222843`), remove empty DSN entries (`b5c7cda`), eventually full removal (`8850363`). Sentry is now out entirely pending Phase 6 re-integration.

### What the working build looked like (2e91ae9b)
- Installed on iPhone via TestFlight link
- Sign-in: ✅ | Map loads: ✅
- ReportFlagModal layout collapsed (discovered post-install, fixed in `dfb9af7`)
- Tasks tab UI appeared busy (deferred)
- Push notifications blocked: `net.http_post` function missing on Supabase free tier

---

## Section 2 — What Changed That May Have Broken Submit

Between the working `2e91ae9b` build and the current submit failure, six things changed that could affect submission:

| # | Change | Commit | Submission Impact |
|---|---|---|---|
| 1 | Removed committed `ios/` dir → full CNG mode | `ae38100` | Build-time only (Expo regenerates ios/). Should not affect submit. |
| 2 | Sentry removed entirely | `8850363` | Positive change — reduces signing complexity. Not the cause. |
| 3 | Submit config changed from env vars to hardcoded credentials | `ef0a1bc` | **Could affect submit.** EAS now reads credentials from JSON, not EAS secrets. The old app-specific password may still be cached in EAS's credential store under the old project key. |
| 4 | Added `testflight`, `preview2`, `preview3` build profiles | `9ff965a` | No submit impact. Build profiles don't affect `eas submit`. |
| 5 | `autoIncrement: true` added to multiple profiles | Rory setup | No submit impact. |
| 6 | **Apple Developer Program agreement** may have been updated by Apple between 2026-05-29 and now | (external) | **Almost certainly the cause.** Apple periodically releases agreement updates that block ALL submission until accepted. Error message is deliberately vague. |

---

## Section 3 — Ordered Action Items to Fix Submission

Work through these in order. Each check takes 2–5 minutes. Most submissions fail at #1.

### Action 1 — Accept Apple Developer Program Agreement (5 min, Sky)
**Most likely cause of the vague "Something went wrong" error.**

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Sign in as `skylerhalisky@gmail.com`
3. Look for a yellow/orange banner at the top: "You must accept the Apple Developer Program License Agreement." It may also appear at [developer.apple.com/account](https://developer.apple.com/account)
4. Click through, accept the new terms

If there was a banner: this was the cause. Retry `eas submit` after accepting.

### Action 2 — Verify the app record is fully configured in App Store Connect (5 min, Sky)
Even for TestFlight (internal testing), the app record needs:

1. Go to [App Store Connect → My Apps → AccessMap](https://appstoreconnect.apple.com)
2. Confirm the app exists under Bundle ID `com.accessmap.app`
3. Click into the app → **App Information** tab → confirm:
   - **Primary Language** is set
   - **Primary Category** is set (e.g., "Utilities" or "Navigation")
   - **Privacy Policy URL** is set to `https://skypie99.github.io/AccessMap/privacy/`
4. Confirm the app is NOT in "Removed from Sale" or "Developer Rejected" state

If the app record is missing required fields, Apple rejects the upload before processing.

### Action 3 — Refresh EAS Apple credentials (10 min, Sky)
The app-specific password stored in EAS may have expired or been revoked (Apple allows you to revoke individual app-specific passwords at [appleid.apple.com](https://appleid.apple.com)).

```bash
# From ~/AccessMap in a terminal
eas credentials --platform ios
```

This walks through interactive credential setup. Choose:
- "Use existing distribution certificate" (EAS manages it) or generate a new one
- When prompted for Apple ID authentication: generate a fresh app-specific password at appleid.apple.com → Account → App-Specific Passwords → Generate

### Action 4 — Run submit with verbose output to get the ITMS error code (2 min, Sky)
```bash
cd ~/AccessMap
eas submit --platform ios --profile production --latest --verbose 2>&1 | tee /tmp/eas-submit-log.txt
```

Look for `ITMS-XXXX` codes in the output. Common ones:
| Code | Meaning |
|---|---|
| ITMS-90064 | App record not fully set up in App Store Connect |
| ITMS-90176 | Missing required metadata |
| ITMS-90189 | Duplicate binary version — bump buildNumber |
| ITMS-90480 | Developer Agreement not accepted |
| ITMS-90682 | Invalid build (architecture / signing issue) |

If you get an ITMS code, paste it to Morgan/Rory for the precise fix.

### Action 5 — Confirm correct submit command (2 min, Sky)
Per `RELEASING.md`, the correct two-command sequence is:

```bash
# Step 1: Build (if you need a fresh binary)
eas build --platform ios --profile testflight --non-interactive

# Step 2: Submit the most recent successful build
eas submit --platform ios --profile production --latest
```

**Note:** The submit profile (`production`) is separate from the build profile (`testflight`). The submit profile reads credentials from `eas.json` → `submit.production.ios`. Confirm no typo in the profile name.

---

## Section 4 — What to Do BEFORE the Next EAS Submit Attempt

Don't just retry the submit cold. Do these first:

**4a. Confirm the build to submit.** Run `eas build:list --platform ios` and note the most recent successful build's ID. Make sure it's the `testflight` profile build, not an old `preview` build.

**4b. Apply the pending SQL migrations.** The current branch (feat/phase5-trust-score) adds new trust score tables. If you're submitting a build from this branch without the migrations applied, the app will crash on trust score screens.

Required migrations (apply in Supabase SQL editor in this order):
```
supabase/migrations/  ← check which files exist on this branch
```
Specifically, confirm the `user_trust_tiers` or equivalent table exists. If Dana wrote a migration file for trust score, apply it before the TestFlight build goes to testers.

**4c. Merge feat/phase5-trust-score to main first (or build from main).** As of 2026-06-01, trust score is built and polished (Dani Phase 6 visual pass complete). Before submitting, Rory should merge this branch to main so the submitted build reflects the actual codebase state.

**4d. Apply phase5-anon-reporting branch first.** This is listed in PROJECT_STATE.md as pending merge. If trust score is being submitted alongside anon reporting, that branch should also be in main or cherry-picked into the submission build.

**4e. Verify EAS secrets are still set.** Run:
```bash
eas secret:list
```
Confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are listed for the `production` environment. These are the Phase 1-2 root cause — if they're missing, the app crashes on launch after install.

---

## Section 5 — Phase 5-6 Readiness Checklist

Before triggering the next TestFlight submit, confirm:

### Build readiness
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm test` — all passing
- [ ] feat/phase5-trust-score merged to main (or build triggered from this branch explicitly)
- [ ] feat/phase5-anon-reporting merged to main
- [ ] EAS secrets set: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (verify via `eas secret:list`)
- [ ] `eas.json` submit credentials present: `appleId: "skylerhalisky@gmail.com"`, `ascAppId: "6774709116"`, `appleTeamId: "S78F8ZA8QU"`

### Apple / App Store Connect
- [ ] Apple Developer Program agreement accepted (check appstoreconnect.apple.com for banners)
- [ ] App record exists and is in valid state (not Removed from Sale)
- [ ] Primary category set in App Store Connect
- [ ] Privacy policy URL set: `https://skypie99.github.io/AccessMap/privacy/`
- [ ] EAS Apple credentials fresh (run `eas credentials` if uncertain)

### Database
- [ ] Trust score migration applied in Supabase (tables for `user_trust_tiers`, `point_events`, leaderboard)
- [ ] Anon reporting migration applied (global cap, gray pin logic)
- [ ] `net.http_post` / push notification SQL function — **still blocked on Supabase free tier**; do NOT include push notifications in TestFlight testing expectations until resolved

### Phase 6 pending (App Store review, not TestFlight)
- [ ] App Store screenshots (6 required — plan in `docs/APP_STORE_SCREENSHOTS.md`)
- [ ] Test/reviewer demo account created (Sky action)
- [ ] App Store listing copy finalized (`docs/APP_STORE_LISTING.md` exists — verify content)
- [ ] CHANGELOG.md updated with v0.2.x release notes

---

## Decisions for Sky

1. **TestFlight submit now vs. after trust score merges?**
   Current state: trust score is on `feat/phase5-trust-score` (not merged). You can submit a build from this branch directly (EAS doesn't require main), but that's unusual. Recommend: merge to main first, then submit. Rory can execute the merge wave once QA gates are satisfied.

2. **Push notification disclaimer to TestFlight testers?**
   `net.http_post` is still missing on Supabase free tier, which means push notifications don't fire. Internal testers will see the notification permission screen but get no notifications. Either inform testers upfront, or unblock `net.http_post` first (requires Supabase upgrade or a workaround — ping Dana).

3. **Sentry re-integration timing?**
   Sentry was removed (`8850363`) due to iOS 26 native crash. PROJECT_STATE.md notes "re-add in Phase 6." Before any App Store submission (not just TestFlight), crash reporting should be live. This needs a Phase 6 task — assign to Rory + Gary.

---

**Prepared by:** Morgan
**Investigation basis:** Full git log reconstruction from 2026-05-29 to 2026-06-01, cross-referenced with qa-reports/, RELEASING.md, PROJECT_STATE.md, eas.json, app.json, and five key fix commits (19d7738, 55c167b, f97e242, 158f38a, ae38100).
