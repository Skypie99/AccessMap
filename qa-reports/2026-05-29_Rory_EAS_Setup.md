# Rory — EAS Build Setup for AccessMap iOS

**Date:** 2026-05-29
**Role:** Rory (DevOps / Release Engineer)
**Branch:** `rory/eas-setup` (commit `78cb6b0`)
**Mode:** CONFIGURE ONLY — no build/submit triggered. Foreground, Sky-initiated.
**Scope:** Pipeline files only (`eas.json`, two GitHub Actions workflows). No app logic touched.

---

## TL;DR

EAS Build is configured and the release pipeline is now **safe**. I also found and fixed two pre-existing workflows that were set to **build/submit unattended** — those were the real blockers to a safe release, not missing config. Nothing was built or submitted. A preview test build is **prepared but gated** — it needs your explicit go (see "Gated next step").

---

## What I did

### 1. `eas.json` — completed the profiles
- Added **`preview2`** and **`preview3`** — parallel internal TestFlight channels that `extends` `preview` (only `APP_ENV` differs). You now have the requested 4 profiles **preview / preview2 / preview3 / production**, plus the existing `development` profile (kept — removing it would be a regression).
- Filled **`ascAppId: 6774709116`** (was a TODO; you supplied it in the handoff).
- Added **`appVersionSource: "local"`** — `app.json`'s `version` is the source of truth for the marketing version.
- Added **`autoIncrement: true`** to `preview` and `production` — iOS `buildNumber` bumps automatically so successive TestFlight uploads don't collide.
- Added a **PRIVACY GATE comment** on the `production` profile pointing at the D8 EXIF blocker.
- JSON validated; all 5 profiles resolve; `extends` chains verified.

### 2. `eas-build.yml` — fixed an unattended-build risk ⚠️
- **Before:** triggered a cloud EAS build on **every push to every branch** (`branches: ['**']`). That spends build minutes on every commit and ships builds nobody approved — a direct violation of "no unattended builds."
- **After:** `workflow_dispatch` only (a human picks the profile and clicks Run). Added a guard that rejects `production` from this workflow. Typecheck + test still gate the build.

### 3. `eas-testflight-submit.yml` — fixed an unattended **App Store submit** risk ⚠️⚠️
- **Before:** auto-built **and submitted to the App Store** on any `v*` tag push (`push: tags: ['v*']`). A single tag could have shipped to production **while the D8 EXIF GPS leak is open.**
- **After:**
  - `workflow_dispatch` only — no tag/push trigger.
  - Runs in a `release-approval` GitHub **Environment** so a required reviewer (you) must approve the run before anything builds/submits.
  - **Privacy guard:** `production` is hard-blocked unless you pass `d8_closed=yes` at dispatch time. The step fails with an explanatory error otherwise.

### Safety checks
- `npm run typecheck` → **passes clean.**
- All three workflow YAMLs parse.
- Committed **only** my 3 files. The working tree also showed edits to `docs/PRIVACY_POLICY.md`, `docs/SECURITY_INCIDENT_RESPONSE.md`, `PROJECT_STATE.md`, `DECISIONS_LOG.md` and ~23 untracked qa-reports — **none of those are mine**; I left them untouched (see Decision #2).

---

## Gated next step — preview test build (NOT run)

The handoff asked for a preview test build to verify setup, but guardrail #3 says pause before any build. **Resolution: prepared, not triggered.** Before this can run, you need to do the login/init steps (they require your Apple/Expo credentials, which I must not handle):

**One-time setup (you run these — they prompt for your logins):**
```bash
cd /Users/skypie/AccessMap
eas login                       # Expo account
eas init                        # writes owner + extra.eas.projectId into app.json
eas credentials                 # iOS signing; pick "let EAS manage" when prompted
```
> `eas init` is what fills `app.json`'s missing `owner` / `extra.eas.projectId`. I deliberately did **not** fabricate a projectId.

**Then, the test build command — run only when you're ready:**
```bash
eas build --platform ios --profile preview
```
This produces an internal/TestFlight build. It does **not** submit to the App Store. Safe to run once setup above is done — preview is internal distribution and is not gated by D8 (only `production` is).

---

## DECISIONS FOR SKY

1. **App Store / production build stays blocked.** The D8 EXIF GPS leak is still open (`shamus/d8-exif-fix` is NEEDS-REVIEW by Jordan per PROJECT_STATE.md). Do not run the `production` profile or the submit workflow's production path until D8 is confirmed closed. The config now enforces this (privacy guard), but the call is yours.

2. **The working tree was being modified by another process while I worked.** `eas.json` flip-flopped between two versions mid-task, and files I never touched (`docs/PRIVACY_POLICY.md`, `docs/SECURITY_INCIDENT_RESPONSE.md`) showed as modified. Looks like another agent/cycle is live in `~/AccessMap` right now. I committed only my 3 files to avoid entangling their work, but **you may have a concurrent-writer collision to untangle.** Worth checking before merging anything.

3. **Identifiers in `eas.json` (committed to git).** The file inlines your `appleId` (skylerhalisky@gmail.com), `appleTeamId` (S78F8ZA8QU), and now `ascAppId` (6774709116). These are identifiers, not secrets, and were already inlined by the existing file — I matched that convention. One transient version of the file during my run had them scrubbed to placeholders + env-var instructions. **If you'd rather keep your Apple ID email out of git, say so** and I'll switch the submit block to `EXPO_APPLE_ID` / `EXPO_APPLE_TEAM_ID` env vars + EAS secrets. No real secret (token/password/key) is in the file either way.

4. **CI secrets you'll need to add (GitHub → Settings → Secrets → Actions)** for the workflows to actually run — I did **not** add or handle any of these:
   - `EAS_TOKEN` — from `eas.dev` → Account → Access Tokens.
   - `APPLE_TEAM_ID` — `S78F8ZA8QU`.
   - `EXPO_APPLE_ID`, `EXPO_APPLE_PASSWORD` (app-specific password) — only needed for the submit workflow.
   - Create the **`release-approval` Environment** (Settings → Environments → New) and add yourself as a Required reviewer, or the submit workflow won't be armed.

---

## Status

- [x] `eas.json` — 4 profiles (preview/preview2/preview3/production) + development
- [x] `app.json` — iOS bundleId verified (`com.accessmap.app`); owner/projectId left for `eas init`
- [x] Workflows hardened to manual-only + privacy gate
- [x] Typecheck passes; branch committed
- [ ] **Preview test build — PREPARED, awaiting your explicit go** (command above)
- [ ] PR review + merge — your call (Rory does not merge)

**Check back with:** Sky.
