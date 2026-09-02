# Flagstone — TestFlight Release Playbook

**Last updated:** 2026-09-02 (reconciled with the Release Source Lock; build/submit mechanics unchanged since 2026-05-31)
**Purpose:** The operational runbook for building and submitting Flagstone to TestFlight. Follow it every time. It tells you HOW to build and submit — it is not the authority on WHICH source is the release. That hierarchy is:

| Authority | File | Answers |
|---|---|---|
| Machine authority for current release identity | `release/current.json` | Which exact commits/trees/build are the current app and web release |
| Human authority for release-source identity and governance | `docs/RELEASE_IDENTITY.md` | How identity is proven, the app ↔ web rules, the deploy/receipt runbook |
| Operational TestFlight build/submission runbook | `docs/RELEASE_PLAYBOOK.md` (this file) | The EAS commands, their pre-conditions, and how to fix them when they break |

Before any release-sensitive operation (an EAS build, a submission, a production web deploy) run the release identity gates in §0. Do not consult `EAS_SETUP.md` or the old `RELEASE_RUNBOOK.md` for build/submit steps — they predate several critical fixes and are partially incorrect.

For a full history of every build failure and how it was resolved, see `docs/MASTER_FIX_LOG.md`.

---

## Quick Reference (Gates, Then Two Commands)

```bash
# 0. Release identity gates — read-only, all three must PASS (see §0)
npm run release:preflight -- --build-sensitive
npm run release:verify
npm run release:status

# 1. Build (takes ~25 min on EAS cloud)
eas build --platform ios --profile testflight --non-interactive

# 2. Submit (run after the build finishes)
eas submit --platform ios --profile production --latest
```

After the build, record what was actually built in the control plane with `npm run release:finalize` (`docs/RELEASE_IDENTITY.md` §8). The rest of this document explains the pre-conditions, what these commands do, and how to fix things when they break.

---

## 0. Release Identity Gates (run before every build)

This playbook tells you how to build. `release/current.json` and `docs/RELEASE_IDENTITY.md` tell you which source IS the release and how that is proven. Never infer the release source from the branch or worktree you happen to be in.

```bash
npm run release:preflight -- --build-sensitive   # real Git identity of THIS checkout; a dirty tracked tree is a FAIL
npm run release:verify                            # control plane vs real Git objects; exits non-zero on any contradiction
npm run release:status                            # one screen: current app, web, live, and main convergence state
```

- All three must PASS. On any FAIL, or `RELEASE SOURCE IDENTITY: UNPROVEN`: STOP and resolve the identity problem first. Do not build.
- Preflight prints `EAS VERSION SOURCE: REMOTE` and `LOCAL BUILD NUMBER AUTHORITATIVE: NO`. §1c explains what that means for the build number.
- The checkout you run `eas build` from is the build source that EAS uploads. Preflight's `HEAD` is therefore the SHA you will later have to prove.
- Full policy (exact vs web-only-descendant modes, the demo update gate, Vercel rules, the happy path): `docs/RELEASE_IDENTITY.md`. This file deliberately does not repeat it.

---

## 1. Pre-Build Checklist

Everything below must be true before you run `eas build`, and the §0 gates must PASS. Most of these are already wired in permanently — you just need to verify they haven't drifted.

### 1a. `eas.json` — `testflight` profile

The `testflight` build profile must look exactly like this:

```json
"testflight": {
  "distribution": "store",
  "autoIncrement": true,
  "environment": "production",
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

Key settings:
- **`distribution: "store"`** — creates an App Store-signed IPA. The `preview` profile uses `"internal"` (ad-hoc), which Apple rejects at submission. This is the most common submission failure if profiles get confused.
- **`autoIncrement: true`** — advances the iOS build number that EAS stores remotely (`cli.appVersionSource` is `"remote"`; see §1c). It does not edit `app.json` and nothing is committed to this repository. You never bump the build number by hand under normal circumstances.
- **`environment: "production"`** — selects the EAS `production` environment for the build's environment variables.
- **`buildConfiguration: "Release"`** — required for App Store submission; omitting this produces a debug IPA.
- **`SENTRY_DISABLE_AUTO_UPLOAD: "true"`** — Sentry is currently removed from the codebase; this env var is a safety guard in case it ever gets partially re-added.

### 1b. `eas.json` — `submit.production` section

The submit block must have real values (not placeholders):

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "skylerhalisky@gmail.com",
      "ascAppId": "6774709116",
      "appleTeamId": "S78F8ZA8QU"
    }
  }
}
```

All three are set and permanent:
- **`appleId`** — Sky's Apple ID
- **`ascAppId`** — App Store Connect Apple ID for Flagstone (`6774709116`). Never changes unless the app is deleted and recreated from scratch.
- **`appleTeamId`** — Apple Developer Team ID (`S78F8ZA8QU`)

### 1c. `app.json` — iOS section

```json
"ios": {
  "bundleIdentifier": "com.accessmap.app",
  "appleTeamId": "S78F8ZA8QU",
  "buildNumber": "15",   ← NOT the submitted build number (see below); leave it alone
  "infoPlist": { ... }
}
```

Also verify at the top level:
- `"version"` — the user-visible version string shown in App Store Connect. It comes from the current app configuration (`app.json` `expo.version`; `package.json` `version` should match). Do not copy a number from this playbook: read the live value with `npm run release:preflight` (`App version`) and compare it with the canonical current release in `release/current.json` via `npm run release:status`. A version bump for a new release is a deliberate commit on the release source, made before the build.
- `"newArchEnabled": false` — React Native new architecture is **off**; do not enable without testing

**Build number: remote, not `app.json`.** `eas.json` sets `cli.appVersionSource = "remote"`, which means:

- EAS stores and manages the iOS build number on its servers. `autoIncrement: true` advances that remote value when a build starts.
- The local `app.json` `ios.buildNumber` is non-authoritative while the version source is remote. It is a diagnostic leftover (it says `15`; Build 33 shipped). Do not "fix" it and do not edit it to influence a build.
- The build number a submission actually carries must be read from EAS Build evidence — the build's page on expo.dev or `eas build:view --json` — and recorded through the release identity workflow (`npm run release:finalize -- --build <n> …`, `docs/RELEASE_IDENTITY.md` §8). Never infer it from `app.json`.
- Inspect the current remote value at any time:
  ```bash
  eas build:version:get -p ios
  ```
  Add `-e testflight` to select the build profile you build with (`-e` defaults to `production`; both profiles build the same bundle ID).
- If the remote value ever has to be resynchronized (for example after an Apple build-number conflict), use `eas build:version:set -p ios` as described in §7 — not a manual `app.json` edit.

### 1d. CNG mode — `ios/` and `android/` must be gitignored

**Critical.** The `ios/` and `android/` directories must NOT be committed to git. Verify:

```bash
cat .gitignore | grep -E "^/ios|^/android"
# Should output:
# /ios
# /android
```

EAS runs `expo prebuild` on every cloud build, generating a clean native project from `app.json` and `package.json`. If you accidentally commit `ios/`, the committed snapshot will conflict with what EAS generates, causing build failures that are very hard to diagnose.

If `ios/` appears in `git status`, remove it:
```bash
git rm -r --cached ios/ android/
git commit -m "chore: remove native dirs from git (CNG mode)"
```

### 1e. EAS secrets must be set

EAS injects these into the build environment. Without them, the app builds but crashes immediately on launch (Supabase fails silently).

```bash
eas secret:list
```

You must see:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

If either is missing, set it:
```bash
eas secret:set EXPO_PUBLIC_SUPABASE_URL --value "https://yourproject.supabase.co"
eas secret:set EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
```

### 1f. TypeScript must pass

```bash
npm run typecheck
```

If this fails locally, EAS will also fail. Fix type errors before submitting a build.

### 1g. EAS credentials (distribution certificate + provisioning profile)

These are managed by EAS and stored in their system — not in the repo. They were generated by running `eas credentials --platform ios` in May 2026.

You do not need to do anything here for a normal build. EAS automatically uses the stored credentials.

**When credentials expire:** Distribution certificates are valid for ~1 year (expires ~May 2027). If a build fails with a signing error, run:
```bash
eas credentials --platform ios
```
Choose to generate a new distribution certificate and provisioning profile.

---

## 2. The Build Command

```bash
eas build --platform ios --profile testflight --non-interactive
```

**What this does:**
1. Uploads the source code of your current checkout to EAS cloud servers — this checkout is the build source, which is why the §0 gates must pass first
2. Runs `npm ci` (clean install — same as CI)
3. Runs `expo prebuild` to generate a fresh `ios/` directory from `app.json`
4. Compiles the iOS app in Release configuration with your Apple distribution certificate
5. Assigns the build number from EAS's remote version store (`cli.appVersionSource = "remote"`; `autoIncrement: true` advances it before the build). Nothing in this repository changes: `app.json` is not edited and no commit is created
6. Produces a signed `.ipa` file stored in EAS (not on your machine)

**Duration:** ~25 minutes.

**Record what was built:** the build's Git commit SHA and its build number are on the build's expo.dev page (or `eas build:view --json`). They are the evidence `npm run release:finalize` needs; its hard gate refuses to record a build whose EAS commit differs from the intended source SHA (`docs/RELEASE_IDENTITY.md` §8).

**Monitoring the build:**
- Watch in your terminal (it streams logs)
- Or visit [expo.dev](https://expo.dev) → your project → Builds

**Important:** `--non-interactive` is required for CI/unattended runs. If you're running manually and want to see prompts, you can omit it, but it should not affect the output.

---

## 3. The Submit Command

```bash
eas submit --platform ios --profile production --latest
```

**What this does:**
1. Looks up the most recent successful `store`-distribution iOS build (the `--latest` flag)
2. Authenticates with App Store Connect using the credentials in `eas.json submit.production`
3. Uploads the `.ipa` to App Store Connect
4. Apple processes it (takes 5–15 min after upload) and makes it available in TestFlight

**Why `--profile production` for submit (not `--profile testflight`):**
The `submit` config in `eas.json` only has credentials under `submit.production`. Passing `--profile production` tells EAS to use that credentials block. The build profile and submit profile are separate concepts — you build with `testflight`, submit with `production`.

**Why `--latest`:**
In non-interactive mode, EAS needs to know which build to submit. `--latest` automatically picks the most recent successful build. Without this flag, EAS would prompt interactively and fail in automated contexts.

**After submitting:**
- Check App Store Connect → TestFlight → Builds
- Apple takes ~5–15 min to process the build
- You'll get an email when it's ready to install
- Open TestFlight on your iPhone → tap Install / Update

---

## 4. What Was Broken and How It Was Fixed

These are all permanently fixed in `main`. You should not need to redo any of them — this section exists to explain why certain things are configured the way they are.

### Sentry crash on iOS 26 → removed entirely

**Problem:** `@sentry/react-native`'s Expo plugin crashed the app on launch when no valid DSN/org/project was configured. It went through three states: version mismatch → duplicate plugin in `app.json` → unrecoverable native crash on iOS 26.

**Fix (commit `8850363`):** Sentry was completely removed. `sentry.ts` and `analytics.ts` were replaced with no-op stubs. The `metro.config.js` was reset to the default Expo config.

**Current state:** Sentry is out. Do not add `@sentry/react-native/expo` back to `app.json` plugins unless a valid DSN is configured first.

### RCTBridge compile error → CNG mode

**Problem:** The committed `ios/AppDelegate.swift` had a `sourceURL(for:)` override referencing `RCTBridge`. In React Native 0.81, `RCTBridge` doesn't exist in Swift's module map in Release builds — EAS builds failed with a compile error.

**Fix (commits `c9b79d7` → `ae38100`):**
1. First wrapped the override in `#if DEBUG`
2. Then removed the entire `ios/` directory from git, switching to CNG

**Current state:** `/ios` is in `.gitignore`. EAS generates a clean `AppDelegate.swift` on every build. The committed native project problem can never recur as long as `ios/` stays out of git.

### Build number conflict → remote version source + `autoIncrement`

**Problem:** Apple rejected a build because the build number had already been used in a previous submission. Each submission to App Store Connect requires a strictly incrementing build number.

**Fix (at the time):** `autoIncrement: true` was enabled in `eas.json`, and when a conflict occurred the build number was manually bumped to 14 in commit `553574b`. That manual edit only worked because the version source was local then.

**Current state:** `eas.json` sets `cli.appVersionSource = "remote"`. EAS now stores the iOS build number on its servers and `autoIncrement: true` advances that remote value; `app.json`'s `buildNumber` is not consulted by builds at all (it still says `15`; Build 33 shipped). If Apple ever reports a conflict again, resynchronize the remote value with the EAS version tooling described in §7 — do not edit `app.json`.

### Provisioning profile → generated via `eas credentials`

**Problem:** EAS needed an App Store distribution certificate and App Store provisioning profile to produce a store-distribution IPA. These didn't exist initially.

**Fix:** Ran `eas credentials --platform ios` interactively. EAS generated and stored:
- An Apple Distribution Certificate (bound to Team `S78F8ZA8QU`)
- An App Store Provisioning Profile for bundle ID `com.accessmap.app`

**Current state:** Credentials are stored in EAS's managed system. Distribution certificate expires ~May 2027.

### TypeScript version conflict → aligned

**Problem:** `package.json` had `typescript` listed under both `dependencies` and `devDependencies` with mismatched version strings. The lockfile had a third version installed. Vercel's `npm ci` was failing on version mismatch.

**Fix (commit `8ce2c41`):** Removed `typescript` from `dependencies` (it's a dev-only tool). Updated `devDependencies` to `~6.0.0` to match the lockfile.

**Current state:** TypeScript is only in `devDependencies`. Lockfile is clean.

### `distribution: "internal"` vs `"store"` confusion

**Problem:** Earlier docs told Sky to use `--profile preview` for TestFlight builds. The `preview` profile has `distribution: "internal"` — it produces an ad-hoc IPA signed for specific registered devices. Apple rejects ad-hoc IPAs at submission.

**Fix:** Added the dedicated `testflight` profile with `distribution: "store"` to `eas.json` (commit `9ff965a`). All docs and CI workflows updated to use `--profile testflight` for builds.

---

## 5. What's Currently in Main

**Read this first (2026-09):** `main` is the governance base, not necessarily the shipped release source. The current release identity lives in `release/current.json` and `npm run release:status` reports `MAIN RELEASE-CODE CONVERGENCE` (DEFERRED at the time of writing). See `docs/RELEASE_IDENTITY.md` §10. The table below is a 2026-05-31 snapshot kept for history.

As of 2026-05-31, `main` contains the following shipped features:

| Feature | Notes |
|---|---|
| Core map + flag pins | Native (react-native-maps) and web (react-leaflet) |
| Flag reporting | Photo capture, category, severity, description |
| Multi-photo gallery | Up to N photos per flag |
| Flag comments | Realtime via Supabase |
| Flag verification + resolution | Points trigger on verify/resolve |
| Anonymous flag reporting | Gray pins, rate-limited, no photo upload |
| Trust score + leaderboard | Tiers 0/100/500/1500 points |
| Push notifications | Warm copy for verified/resolved events |
| Design system | Wayfinder Blue tokens, Plus Jakarta Sans/Public Sans fonts, category icons |
| Seasonal context tags | icy_winter, wet_spring, construction_temporary, etc. |
| Battery/network caching | SWR cache-first, GPS throttling |
| Flag reopen mechanism | Reputation-gated reopen voting |
| Onboarding | FirstLaunchGate with 5-slide OnboardingCards |
| Filter panel | Category chips + minimum severity filter on map |
| Heatmap | MVP built (behind `HEATMAP_ENABLED` feature flag) |
| WCAG 2.2 AA a11y | Deep audit complete across all screens |

Test coverage: 94 suites, 1,530 tests passing, 87%+ statement/line coverage.

---

## 6. What to Do Next Time (Including More Features)

When you want to build a new TestFlight that includes additional feature branches:

1. **Merge feature branches to `main`**
   ```bash
   git checkout main
   git merge feat/your-feature-branch
   ```
   Only merge branches where QA has passed. Check `PROJECT_STATE.md` for branch status. Until `main` release-code convergence is completed (`npm run release:status` → `MAIN RELEASE-CODE CONVERGENCE`), confirm the intended release lineage in `docs/RELEASE_IDENTITY.md` §10 before assuming `main` is the build source.

2. **Run typecheck locally**
   ```bash
   npm run typecheck
   ```
   Fix any errors before proceeding.

3. **Run tests**
   ```bash
   npm test
   ```
   All suites must pass.

4. **Push to `main`** — GitHub Actions CI will run automatically.
   ```bash
   git push origin main
   ```

5. **Run the release identity gates** (§0) from the exact checkout you will build from
   ```bash
   npm run release:preflight -- --build-sensitive
   npm run release:verify
   npm run release:status
   ```
   All three must PASS. Note the `HEAD` SHA preflight prints — that is the source you are about to build.

6. **Build**
   ```bash
   eas build --platform ios --profile testflight --non-interactive
   ```

7. **Verify and record the build** — on the build's expo.dev page (or `eas build:view --json`) confirm the Git commit equals the `HEAD` from step 5 and read the build number EAS assigned. Then record it: `npm run release:finalize -- --version <x.y.z> --build <n> --source-sha <HEAD> --eas-source-sha <EAS commit> …` (dry run first; `--write` with approval). Details: `docs/RELEASE_IDENTITY.md` §8.

8. **Submit** (after build completes)
   ```bash
   eas submit --platform ios --profile production --latest
   ```

9. **Install on device** — Open TestFlight on iPhone → Install / Update.

---

## 7. Troubleshooting

**`eas submit` returns "Something went wrong when submitting":**
1. Log in to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) and [developer.apple.com/account](https://developer.apple.com/account) — look for a yellow "accept agreement" banner. This is the most common cause.
2. Run submit with `--verbose` and look for an `ITMS-XXXXX` error code to Google.
3. Verify `eas.json` still has the correct `ascAppId` (`6774709116`), `appleId`, and `appleTeamId`.
4. Confirm the build used `--profile testflight` (distribution: store), not `--profile preview` (distribution: internal).

**Build fails to compile on EAS:**
- Check `git status` — did someone accidentally commit `ios/`? It must stay gitignored.
- Run `npm run typecheck` locally — type errors on your machine mean type errors on EAS.
- Check `babel-preset-expo` version in `package.json` — it must stay `~54.0.10` until an SDK upgrade.

**App crashes immediately after install:**
1. Run `eas secret:list` — confirm `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present.
2. Check if a new native module was added to `package.json` but not registered in `app.json plugins`.
3. Check if Sentry was partially re-added without a valid DSN.

**Build number conflict from Apple (`ITMS-90062` or similar "build already exists"):**
- The build number is managed remotely by EAS (`cli.appVersionSource = "remote"`). Do NOT edit `app.json` — builds do not read it, so an edit there fixes nothing and creates a misleading commit.
- Inspect the remote value EAS will increment from:
  ```bash
  eas build:version:get -p ios
  ```
  (add `-e testflight` to select the build profile you build with; `-e` defaults to `production`).
- If that value is at or below a build number App Store Connect has already received, resynchronize it explicitly:
  ```bash
  eas build:version:set -p ios
  ```
  The command is interactive and asks for the new value. Choose a number strictly higher than every build App Store Connect has ever received for this app (App Store Connect → TestFlight → Builds). Same `-e` rule as above.
- Verify the result with `eas build:version:get -p ios` again before rebuilding.
- Re-run the §0 gates, then the build command. Nothing in this repository changes.

**Push notifications not working after install:**
- Confirm `expo-notifications` is in `app.json plugins` (it is; just verify it hasn't been accidentally removed).
- Confirm `pg_net` extension is enabled in Supabase: run `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
- Confirm `NOTIFY_WEBHOOK_SECRET` matches in both Edge Function secrets and DB webhook header.

---

## 8. Periodic Actions (Not Code — Outside the Repo)

These are not code changes. They need to happen periodically because they're controlled by Apple or EAS.

| Action | When | How |
|---|---|---|
| Accept Apple Developer agreement | Apple releases updates roughly annually; also required before any new submission | Log in to appstoreconnect.apple.com — yellow banner appears if needed |
| Rotate EAS distribution certificate | ~May 2027 (1 year after creation) | Run `eas credentials --platform ios` and generate a new cert |
| Rotate app-specific password | If the current one is revoked | [appleid.apple.com](https://appleid.apple.com) → App-Specific Passwords → Create new → update GitHub Secret `EXPO_APPLE_PASSWORD` |
| Update EAS Supabase secrets | If Supabase URL or anon key ever changes | `eas secret:set EXPO_PUBLIC_SUPABASE_URL --value "..."` and same for anon key |
| Seed reviewer test account | Once, before App Store submission (not needed for TestFlight) | Run `supabase/migrations/2026-05-31_reviewer_test_account.sql` in the Supabase SQL Editor |
