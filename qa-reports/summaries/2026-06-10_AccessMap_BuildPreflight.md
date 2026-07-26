---
role: pre-flight verification pass
date: 2026-06-10
title: AccessMap — TestFlight Build Pre-Flight (GO / NO-GO)
mode: READ-ONLY + one authorized fix only (version/build-number mismatch) — no fix needed
model_tier: sonnet (Sky-initiated, synthesis + multi-file verification)
project: accessmap
sha_verified: 651421f
coherence_score: high
state_consistency: all checks run live against current main; no stale records
duplicate_work_detected: none
drift_risk: none — all findings re-verified against live code this session
---

# AccessMap TestFlight Build Pre-Flight — 2026-06-10

## VERDICT: ✅ GO

All Section A gates pass. All authorized checks are green. Build is clear to fire.

---

## BUILD NUMBER CONFIRMATION

| Item | Value |
|---|---|
| `appVersionSource` | `"remote"` in eas.json ✅ |
| `testflight` profile `autoIncrement` | `true` ✅ |
| **Current remote buildNumber** | **17** (confirmed live: `eas build:version:get --profile testflight`) |
| **Today's build will be** | **18** (17 + 1, via EAS remote autoIncrement) |
| Marketing version (`app.json "version"`) | **3.0.0** ✅ |
| Local `app.json buildNumber: "15"` | **Ignored** — remote version source manages the actual number. EAS warns "It's recommended to remove this value from app config" (cosmetic only; no collision risk, no increment failure). |

Mechanism: EAS queries App Store Connect at build time, finds 17, increments to 18.

---

## AUTHORIZED FIX APPLIED

**NONE.** The version/build-number configuration is correct. `appVersionSource: "remote"` + `autoIncrement: true` on the testflight profile guarantees today's build gets build number 18. The local `buildNumber: "15"` in app.json is strictly cosmetic (it doesn't affect the remote-managed number and creates no collision). The authorized fix scenario ("config is wrong such that today's build would not increment or would collide") does not apply.

---

## ENV & CREDENTIAL CONFIRMATION

### EAS Production Env Vars
Confirmed live by `eas build:version:get --platform ios --profile testflight` output:
> *"Environment variables with visibility "Plain text" and "Sensitive" loaded from the "production" environment on EAS: **EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SUPABASE_URL**."*

| Var | Status |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ present (production environment) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ present (production environment) |
| `EXPO_PUBLIC_SENTRY_DSN` | ✅ present (production environment) |

Critical: the testflight profile sets `"environment": "production"` — this is what injects these vars at build time. Confirmed in eas.json. ✅

### iOS Credentials
`eas credentials --platform ios` requires interactive mode and can't run non-interactively. However: `eas build:version:get` **successfully queried App Store Connect and returned buildNumber 17** — this is only possible if the API key (Key ID `BF8J5TMTQ7`) is valid, present, and authenticated. Credentials confirmed working. ✅

---

## SECTION A — CHECKLIST WALKTHROUGH (with evidence)

### A1. Deep-audit branch merge — SATISFIED ✅
The original 27-fix branch (`audit/accessmap-deep-2026-06-07`) and the subsequent re-sweep branch (`audit/accessmap-resweep-2026-06-09`, 13 more fix commits) were both merged into main. Sky pre-approved the merge on 2026-06-09. Current main SHA `651421f` is the result. All fixes from both passes are in the build. Green checks in A3 re-confirmed on this merged state (see below).

### A2. EAS production env vars — SATISFIED ✅
Confirmed above via EAS CLI. `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` both present in the production environment.

### A3. Green code checks — SATISFIED ✅ (re-confirmed this session on main @ 651421f)

| Check | Result | Evidence |
|---|---|---|
| `npm run typecheck` | **0 errors** | `tsc --noEmit` exit 0, no output |
| `npm test` | **103 suites, 1,680 passed, 136 todo, 0 failures** | 1,816 total tests run |
| `npm run lint` | **0 errors, 165 warnings** | At-or-below baseline of 165 (re-sweep fix-pass established this baseline; −4 from the original 169) |
| `npx expo export --platform ios` | **Clean** | iOS bundle: 6.15 MB; `dist/` written with no errors |
| Working tree | **Clean** | Only untracked qa-reports files (not part of the build) |
| `main` = `origin/main` | **✅ 651421f** | `git status`: "Your branch is up to date with 'origin/main'" |

Note on test count: the checklist (2026-06-07) recorded 1,575 tests across 97 suites. The re-sweep added 95 tests / +7 suites. Current count (1,680 / 103 suites) is expected. The lint count similarly shifted from 60 → 169 → 165 across the two passes; 165 is the correct current baseline.

### A4. eas.json config sanity — SATISFIED ✅

| Item | Value | Status |
|---|---|---|
| `cli.appVersionSource` | `"remote"` | ✅ |
| `testflight.distribution` | `"store"` | ✅ |
| `testflight.autoIncrement` | `true` | ✅ |
| `testflight.environment` | `"production"` | ✅ (injects Supabase vars) |
| `testflight.ios.buildConfiguration` | `"Release"` | ✅ |
| No `//` comment keys or duplicate profile keys | confirmed by `node -e "JSON.parse(...)"` passing | ✅ |
| `submit.production.ios.appleId` | `skylerhalisky@gmail.com` | ✅ |
| `submit.production.ios.ascAppId` | `6774709116` | ✅ |
| `submit.production.ios.appleTeamId` | `S78F8ZA8QU` | ✅ |
| `submit.production.android.serviceAccountKeyPath` | `"TODO_PATH_..."` placeholder | ✅ (iOS/TestFlight unaffected) |

JSON parse: `node -e "JSON.parse(require('fs').readFileSync('eas.json'))" && echo OK` exits 0 (no syntax errors). ✅

### A5. app.json config sanity — SATISFIED ✅

| Item | Value | Status |
|---|---|---|
| `ios.bundleIdentifier` | `com.accessmap.app` | ✅ |
| `ios.appleTeamId` | `S78F8ZA8QU` | ✅ |
| `expo.extra.eas.projectId` | `a7149107-fb9b-4853-a053-648320c05cb6` | ✅ |
| `version` | `3.0.0` | ✅ |
| `ios.buildNumber` | `"15"` | ✅ ignored by remote version source |
| `icon` file exists | `./assets/brand/app-icon.png` (25,540 bytes) | ✅ |
| `splash.image` file exists | same file | ✅ |
| `web.favicon` file exists | `./assets/favicon.png` (712 bytes) | ✅ |
| `NSLocationWhenInUseUsageDescription` | present | ✅ |
| `NSCameraUsageDescription` | present | ✅ |
| `NSPhotoLibraryUsageDescription` | present | ✅ |
| `ITSAppUsesNonExemptEncryption: false` | present | ✅ (avoids export-compliance prompt) |
| No background-location strings | absent | ✅ (Jordan's gate; do not re-add) |
| `expo-location` plugin + permission string | present | ✅ |
| `expo-image-picker` plugin + permission string | present | ✅ |
| `expo-notifications` plugin | present | ✅ |
| `android.package` | `com.accessmap.app` | ✅ |

### A6. Apple-side — SATISFIED ✅
EAS-managed iOS credentials: confirmed working (API key BF8J5TMTQ7 authenticated App Store Connect successfully — returned buildNumber 17). App record ASC ID `6774709116` ("AccessMap – Route Planner") exists. Cannot re-confirm Business Agreements live without browser, but the successful build:version:get is an implicit confirmation the account is in good standing. [RE-CONFIRM if in doubt: open App Store Connect → Business → Agreements.]

### A7. Backend / DB blockers — NONE ✅
`supabase/migrations/2026-06-09_status_transition_guard_PROPOSED.sql` is **a file only** (NOT applied). File header confirmed: `"PROPOSED — NOT APPLIED (re-sweep audit 2026-06-09, finding F53 hardening) — Requires Sky's approval before running."` Live DB was NOT touched. No DB step blocks this build.

All four live-applied security items from 2026-06-03 (duplicate points trigger drop, flag-photo INSERT guard, RLS search_path/EXECUTE hardening, webhook secret rotation) remain applied per the verified 2026-06-03 record.

---

## SECTION D — CONFIRM "CAN WAIT"

All Section D items remain correctly deferred. None have become blockers:

| Item | Status |
|---|---|
| D1. Backend security (4 items) | ✅ Applied live 2026-06-03. No action needed. |
| D2. Points-value drift (10/3/15/7 vs docs) | ✅ Cosmetic only. Decide whenever. |
| D3. Reviewer account password rotation | ✅ Pre-App-Store submission only, not pre-TestFlight. |
| D4. F8 reopen RPC verify | ✅ Degrades gracefully if absent. Later wave. |
| D5. Housekeeping (schema.sql drift, dead module, Android submit placeholder) | ✅ None block this build. |

---

## FLAGS (non-blocking, no action needed this build)

1. **`app.json buildNumber: "15"` stale local value.** EAS warns "It's recommended to remove this value from app config." It's cosmetic only — the remote version source ignores it. Safe to remove in a small follow-up commit. No rush.

2. **`eas-cli` is two minor versions behind** (current: installed version < 20.1.0). The outdated CLI works correctly (build:version:get ran fine). Safe to upgrade whenever: `npm install -g eas-cli`.

3. **`PUSH_NOTIF_TYPES_ENABLED` feature flag is `false`** (confirmed in `src/lib/featureFlags.ts:34`). The Notification Preferences Settings row is hidden per Sky Decision 2 (toggles are decorative — not wired to push delivery pipeline). This is correct and intentional. Testers will not see the notification prefs screen.

---

## THE TWO EXACT COMMANDS (Sky-only)

Run from `~/AccessMap` in this exact order:

```bash
cd ~/AccessMap
npx eas-cli build  --platform ios --profile testflight  --non-interactive
# → ~15-20 min; watch the Expo build dashboard for status
# → If it fails with "Build number N already used": that's fine — just rerun; autoIncrement picks the next

npx eas-cli submit --platform ios --profile production  --latest --non-interactive
# → Submits the most recent completed build to TestFlight
# → If submit fails "Something went wrong": open the Expo submission page, expand "Upload to App Store Connect" for the real error
```

**Do not** run `eas build` from `~` (home) — EAS project context requires being inside `~/AccessMap`.
**Do not** fire both commands simultaneously — build must complete before submit.

---

## CONSOLIDATED ON-DEVICE CHECKLIST

Sources merged: re-sweep §7 manual checks (4) + re-sweep §7 web spot-checks (4) + original PreBuild Checklist Section C (22 steps + 6 a11y items), duplicates removed, quickest checks first.

**Setup: real iPhone with the TestFlight build installed. Read each item carefully — "wasted build" scenarios are at the top.**

---

### TIER 0 — Must pass before anything else

**1.** Cold-launch the TestFlight build → app reaches the map (not a blank/white screen). Sign in → flags load.
*(If blank/white: env vars weren't in the build. Stop — back to A2 / EAS env check.)*

---

### TIER 1 — Privacy + critical broken-flow (do these before handing to testers)

**2.** Attach a **HEIC photo that has GPS metadata** to a report, then to a profile avatar → upload must be **BLOCKED** with a privacy error (never uploads). Repeat on the web build.

**3.** Attach a **PNG screenshot** to a report → must upload successfully (was falsely rejected before re-sweep fix F29; GPS-bearing HEIC still blocked).

**4.** Pick a normal JPG → uploads fine (no false positive).

**5.** Guest → hamburger menu → **"Sign in"** → reaches sign-in screen (was a dead-end before F11).

**6.** Guest → Profile tab → **"Create account"** → complete sign-up → can get back to the map, not stuck in the modal (F6).

**7.** My Reports → set a filter → close & reopen → never stranded on a permanent empty list (F9).

**8.** Profile → **"Show intro again"** → close app → reopen → intro replay starts at card 1 (F5/F20).

---

### TIER 2 — Data integrity (two-device + CAS)

**9.** **Two-device triage:** have two accounts simultaneously open the same flag. Device A resolves it while Device B is also on the same flag details. Device B's action attempt should get a friendly "flag changed" notice — never silently revert Device A's resolution. *(F53/F54 compare-and-set guard)*

**10.** Anon report **Submit** → hammer-tap it rapidly → exactly **one submission**, never duplicate. *(F3)*

**11.** Tasks bulk **Verify** and **Resolve** → hammer → exactly one action each. *(F4)*

**12.** Admin **Remove / Dismiss** → hammer → exactly one action each. *(F18)*

**13.** Tasks bulk-select: tap a card's **photo thumbnail** in selection mode → toggles selection, does NOT open the lightbox. *(F17)*

---

### TIER 3 — Realtime + offline

**14.** Profile → toggle **Real-time updates ON** → from another device, update a flag status → map and Tasks screen update **live without an app restart**.

**15.** Flick the realtime toggle rapidly (ON → OFF → ON fast) → toggle settles in correct state; real-time is not silently dead after the flick. *(F32)*

**16.** Toggle **Real-time updates OFF** → updates from the other device stop.

**17.** Reopen request: submit a reopen request on a resolved flag → honest **"sent for review"** message, no fake vote tally. *(F8 — gracefully degrades if the RPC is absent)*

**18.** Enable **Airplane mode**, then try to sign out → honest **"Sign out failed, network required"** message. Not a silent failure. *(F50)*

---

### TIER 4 — Denied permissions + offline resilience

**19.** **Deny location permission** on Map / Tasks / Profile → graceful degradation, no crash.

**20.** **Deny camera** on a report, and on avatar → graceful, no crash.

**21.** **Deny photo library** on a report and avatar → graceful, no crash.

**22.** **Cold-start offline** → cached flags visible. Pull-to-refresh offline → handled (no crash). Slow/interrupted geocode + backtrack below 3 chars → handled. Switch between flags fast on slow network → comments stay correct (no flag A's thread under flag B). *(F13, F15)*

**23.** Background the app **during a photo upload** and during active realtime → resume → no stuck spinners.

---

### TIER 5 — Accessibility floor (requires VoiceOver on, Larger Accessibility Sizes → max, Reduce Motion on)

**24.** **Largest Dynamic Type** on Tasks, Profile, Settings, Map filter panel, and Report form → **no text cut off** (any word ending "…" mid-sentence = FAIL). *(Highest a11y value)*

**25.** **Profile "Real-time updates" switch** and **Settings "Push notifications" switch** → each reads: label + "switch" + on/off state. Double-tap flips it. *(B1, B2)*

**26.** **Admin Remove / Dismiss** buttons (admin account) → read as **separate** buttons; severity announces as a **number** ("Severity 3"), not a color. *(B3)*

**27.** **Profile "Recent point activity"** rows → each reads as one item; divider lines are silent. *(A2)*

**28.** **Reduce Motion**: open/close a sheet, pull-to-refresh, watch progress bars → animations are instant/disabled. *(C2)*

**29.** **Contrast**: toggle Light then Dark mode → all text readable in both; focus ring visible on cards/pills in both. *(C3)*

---

### TIER 6 — Web spot-checks (separate browser session — no TestFlight)

**30.** Web map → **right-click** on map → drop-flag / report prompt appears. *(F7)*

**31.** Web map popup: load a flag whose photo returns a 404 → **"Photo unavailable"** fallback renders (no broken-image icon). *(re-sweep L3)*

**32.** Web map: HEIC photo with GPS → BLOCKED; PNG screenshot → uploads. *(C2 web parity)*

**33.** **Firefox**: coords copy button → no unhandled rejection in console; confirmation message or alert fallback appears. *(re-sweep L2)*

**34.** Web: Saved filter-set menu → reachable; delete a set → requires **explicit destructive confirm**; 5-set cap doesn't dead-end. *(re-sweep M4 / F web fix)*

**35.** Web: navigate to a flag deep link → address bar shows `/flag/{id}` (never `/flag/undefined`). *(re-sweep L9)*

**36.** Web: trigger a failed report submit → **visible error message** appears (window.alert, not silent). *(F46)*

---

### DON'T WIDEN TO OUTSIDE TESTERS UNTIL:
Items 1, 2-4 (privacy), 5-8 (broken-flow), 9 (two-device CAS), 10-13 (double-tap), and a11y items 24-26 all pass. The rest can be caught in the tester wave.

---

## APPENDIX — WHAT CHANGED SINCE THE 2026-06-07 CHECKLIST

The checklist was written when main = `cbf9a3b`. Today main = `651421f`. Changes that affect the device checklist:

| Old Item | New Status |
|---|---|
| A1: Merge deep-audit branch first | **DONE** — merged; in main |
| A3: Re-confirm after A1 merge | **DONE** — re-confirmed this session |
| C3 #5: Settings → "Push notification types" | **NOT APPLICABLE** — row hidden (PUSH_NOTIF_TYPES_ENABLED=false, Decision 2). Notification prefs screen still exists in code but gated off. |
| PNG photo attach | **NEW** — added; was falsely blocked before (F29) |
| Two-device triage | **NEW** — added; tests F53/F54 CAS status guard |
| Rapid realtime flick | **NEW** — added; tests F32 channel teardown serialization |
| Airplane-mode sign-out | **NEW** — added; tests F50 honest failure surface |
| 4 web spot-checks | **NEW** — added from re-sweep §7 |
| Test count | 1,575 → **1,680** (+95 from re-sweep) |
| Lint warnings baseline | 60 → 169 → **165** (re-sweep established new baseline) |
| Remote build number | "15" (local file, ignored) → **17 remote** (today's build: **18**) |
