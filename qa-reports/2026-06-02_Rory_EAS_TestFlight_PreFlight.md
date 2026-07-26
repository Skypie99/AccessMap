# EAS / TestFlight Pre-Flight Audit
**Auditor:** Rory (DevOps Engineer)
**Date:** 2026-06-02
**Commit audited:** `c51c46a` (HEAD = origin/main — confirmed synced)
**Verdict:** BLOCKED — 3 issues require resolution before triggering a build

---

## Per-Item Results

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | EAS env vars (Supabase) | WARN* | Configured as EAS secrets; no `eas secret:list` verification possible read-only |
| 2 | ASC App ID / Apple creds | PASS | eas.json:115–117 |
| 3 | app.json consistency | PASS | Internally consistent |
| 4 | iOS native-dir drift | PASS | `ios/` is gitignored (CNG mode) |
| 5 | Sentry / crash guards | PASS | Sentry fully removed; stub no-ops in place |
| 6 | Workflows (dispatch-only, approval env) | BLOCK | Submit step hardcodes wrong profile |
| 7 | Typecheck | PASS | Exit 0, 0 errors |
| 8 | eas.json validity — duplicate profile keys | BLOCK | Lines 55+82 / 62+90 |
| 9 | main pushed to origin | PASS | `c51c46a` = `origin/main` (PROJECT_STATE stale note; git confirms synced) |

---

## Item Detail

### 1. EAS Env Vars (Supabase) — WARN*

**Architecture:** `src/lib/supabase.ts` reads `process.env.EXPO_PUBLIC_SUPABASE_URL` and `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY` (lines 16–17). On missing values it emits a `console.warn` and continues with empty strings (which will crash at sign-in). The vars are **not** in any `eas.json` `env` block; they must be in EAS secrets.

**What RELEASING.md says (line 8):** "Supabase env vars are set as EAS secrets (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)" — documented as done.

**Risk:** Cannot verify EAS secrets remotely without running `eas secret:list` (requires interactive session). The previous crash was caused by exactly this gap. **Sky must verify before triggering the build:**

```bash
eas secret:list
# Must show EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```

**Classified as WARN, not BLOCK** — RELEASING.md records it as done, and the fix pattern is well-understood. If `eas secret:list` shows them missing, treat as BLOCK.

---

### 2. ASC App ID / Apple Credentials — PASS

`eas.json` submit.production.ios (lines 113–118):

```json
"appleId": "skylerhalisky@gmail.com",
"ascAppId": "6774709116",
"appleTeamId": "S78F8ZA8QU"
```

- `appleTeamId` S78F8ZA8QU matches `app.json` ios.appleTeamId (line 20) and the expected Team ID.
- `ascAppId` 6774709116 is hardcoded — the known blocker from memory is resolved.
- The comments block at the top of eas.json (lines 18–22) also confirms: "APPLE_TEAM_ID ✅ Set / APPLE_ID ✅ Set / ASC_APP_ID ✅ Set: 6774709116".

---

### 3. app.json Consistency — PASS

| Field | Value | Status |
|---|---|---|
| `ios.bundleIdentifier` | `com.accessmap.app` | Present |
| `version` | `3.0.0` | Present |
| `ios.buildNumber` | `"14"` | Present (will auto-increment via eas.json `autoIncrement: true`) |
| `extra.eas.projectId` | `a7149107-fb9b-4853-a053-648320c05cb6` | Present |
| `ios.appleTeamId` | `S78F8ZA8QU` | Matches eas.json |
| `owner` | not set (not required for CNG Expo builds) | No issue |

No `owner` field is needed unless using an org account — this is an individual account.

---

### 4. iOS Native-Dir Drift — PASS

`.gitignore` line 37: `/ios` — the `ios/` directory is gitignored. EAS uses **Continuous Native Generation (CNG)** mode: Expo generates native projects at build time from `app.json`. The local `ios/` on disk is a developer artifact (from `npx expo run:ios`) and is not shipped. No drift risk.

RELEASING.md line 6 confirms: "`ios/` and `android/` are gitignored (CNG mode — Expo generates them at build time)"

---

### 5. Sentry / Crash Guards — PASS

- `app.json` plugins array contains: `expo-notifications`, `expo-location`, `expo-image-picker`, `expo-font` — **no Sentry plugin at all** (no duplicate, no single entry).
- `src/lib/sentry.ts` is a no-op stub (lines 1–4): `export const initSentry = () => {};` — the real SDK was removed in Phase 5 (iOS 26 crash fix). The comment says "re-add in Phase 6 with proper org/project config."
- `src/lib/analytics.ts` line 3 confirms: "Sentry was removed in Phase 5."
- `__DEV__` guard is moot since the SDK is not initialized.

No duplicate Sentry plugin risk; no crash from Sentry init.

---

### 6. Workflows — BLOCK (medium severity)

**eas-build.yml:** `workflow_dispatch`-only ✅. Production profile is blocked with an explicit error step (lines 47–50). `release-approval` environment: not used here (correct for dev/preview builds). PASS on this file.

**eas-testflight-submit.yml:** `workflow_dispatch`-only ✅. Uses `environment: release-approval` (line 37) for required-reviewer gate ✅.

**BLOCK:** Line 77 of `eas-testflight-submit.yml` hardcodes `--profile production` on the submit step regardless of the user-selected build profile:

```yaml
run: eas submit --platform ios --profile production --latest --non-interactive
```

The `eas.json` submit block only has a `production` profile, which is correct — the submit profile is separate from the build profile and always uses `production` creds. **However**, this means if the workflow is triggered with a `preview` or `preview2` build profile, the submit step will unconditionally run `eas submit --profile production` against the latest build (which was a `preview`/internal-distribution build). `eas submit` with `--profile production` + `--latest` when the latest build is an `internal` distribution will fail at Apple's gate ("not an App Store build").

**Required fix:** Add a conditional to skip the submit step unless the build profile is `testflight` or `production`, OR document that this workflow should only be dispatched with a store-distribution build profile. The simplest safe fix:

```yaml
      - name: Submit to App Store Connect
        if: >
          github.event.inputs.profile == 'production' ||
          github.event.inputs.profile == 'preview'
        ...
```

Or remove `preview`/`preview2`/`preview3` from the submit workflow's profile choices (they're internal-distribution and don't need ASC submit).

**Note:** The `release-approval` environment setup is documented as requiring one-time GitHub UI setup (Settings → Environments). Audit cannot confirm this is live, but the YAML is correctly wired — flag for Sky to verify.

---

### 7. Build Sanity (Typecheck) — PASS

```
npm run typecheck → tsc --noEmit → Exit code: 0
```

Zero type errors on current `main` (c51c46a). Gary's pre-merge gate (`npm test`) had 1553 tests green. Independent confirmation of typecheck clean on this tree.

---

### 8. eas.json Duplicate Build Profile Keys — BLOCK (high severity)

`eas.json` contains duplicate JSON object keys in the `build` section:

| Key | First definition | Duplicate at |
|---|---|---|
| `"preview2"` | line 55 | line 82 |
| `"preview3"` | line 62 | line 90 |

In JSON, duplicate object keys are undefined behavior. Most JSON parsers (including `eas-cli`'s underlying `@expo/json-file`) will silently take **the last value** and discard the first. The duplication is a copy-paste artifact — the first `preview2`/`preview3` block at lines 55–66 was the correct placement (inside the `preview` + `testflight` sequence); the second block at lines 82–94 is the duplicate.

The practical impact:
- `eas build --profile preview2` resolves to the *second* definition (line 82–89), which `extends: preview` and sets `APP_ENV: preview2` — same as the first, so functionally equivalent in this specific case.
- But some EAS CLI versions will reject duplicate keys entirely with a parse error.
- The file is not valid JSON-with-comments (JSONC/JSON5) — it uses `"// key": "value"` for comments, not `// ...` line comments.

**Required fix:** Remove lines 82–96 (the second `preview2` and `preview3` block). The canonical definitions at lines 55–66 are correct.

```
eas.json lines 82–96 — DELETE:
    "preview2": {
      "// description": "Parallel internal TestFlight channel...",
      "extends": "preview",
      "env": {
        "APP_ENV": "preview2"
      }
    },
    "preview3": {
      "// description": "Third parallel internal TestFlight channel...",
      "extends": "preview",
      "env": {
        "APP_ENV": "preview3"
      }
    },
```

---

### 9. main Pushed to Origin — PASS

PROJECT_STATE.md had a stale note ("~41 commits ahead, not pushed"). Current verification:

```
git rev-parse HEAD            → c51c46a
git rev-parse origin/main     → c51c46a
```

They match. Main is current with origin.

---

## Additional Observations

### D8 EXIF Privacy Gate — STATUS GREEN for TestFlight / BLOCKED for production

- The D8 EXIF GPS privacy blocker is **implemented**: `src/lib/flags.ts` lines 46–165 strip EXIF/GPS/IPTC/XMP metadata via ImageManipulator (native) and canvas re-encoding (web).
- `eas.json` production profile has a comment warning (line 100): "Do NOT run this profile until the D8 EXIF GPS leak is closed."
- `eas-testflight-submit.yml` has a privacy gate step that blocks production unless `d8_closed=yes`.
- For **TestFlight via `testflight` or `preview` profiles**, D8 is not a blocker (the stripping code is live).
- For **App Store production submission**, D8 must be explicitly re-confirmed closed.

### net.http_post Missing (Push Notifications)
`net.http_post` SQL function is missing on the Supabase free tier — push notification webhooks are blocked. This does not affect EAS builds but is a known runtime limitation.

### Android `serviceAccountKeyPath` Placeholder
`eas.json` submit.production.android (line 120) has `"serviceAccountKeyPath": "TODO_PATH_TO_GOOGLE_SERVICE_ACCOUNT_KEY.json"`. This is a placeholder. Android builds are not being submitted — iOS only. This is not a blocker for iOS TestFlight but will fail if anyone tries `eas submit --platform android`.

---

## Overall Verdict: BLOCKED

Two hard blockers must be resolved before triggering an EAS build:

| Priority | Blocker | File | Fix |
|---|---|---|---|
| 1 | Duplicate `preview2`/`preview3` keys in eas.json | `eas.json:82–96` | Delete the duplicate block |
| 2 | Submit step hardcodes `--profile production` for any build profile | `.github/workflows/eas-testflight-submit.yml:77` | Add conditional or restrict profile choices to store-distribution only |
| — | WARN: Verify EAS secrets are set (`eas secret:list`) | EAS dashboard | Confirm before build |

Once blockers are resolved:

```bash
# Preview TestFlight build (recommended for next tester push):
eas build --platform ios --profile testflight --non-interactive

# Then submit:
eas submit --platform ios --profile production --latest --non-interactive
```

Or via GitHub Actions (after approving the `release-approval` environment review):
Navigate to **Actions → EAS TestFlight Submit → Run workflow** → select profile `production` (or use `testflight` build + manual submit CLI).
