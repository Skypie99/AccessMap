# Rory — Pre-Build Runbook: AccessMap TestFlight (overhaul Phases 1–6)

**Date:** 2026-06-19 · **main:** `d1f7eae` (in sync, clean) · **Morgan verdict:** GO (`cycle-2026-06-19-morgan-build-readiness.md`)

Agents can't run EAS — these are the exact commands for **Sky** to run. The 6-phase overhaul is already on `main`; nothing to merge.

## Release gate (Rory, on `main`)
- ✅ `npx tsc --noEmit` → 0 errors
- ✅ `npm run lint` → **0 errors** (91 baseline warnings)
- ✅ full `npx jest --ci --silent` → **107 suites / 1,721 passed / 0 fail**

## Versioning — no manual bump needed
`eas.json` → `cli.appVersionSource: "remote"` + the `testflight` profile has `autoIncrement: true`. **EAS auto-increments the iOS build number server-side**, so app.json's `buildNumber: 15` is only a local floor — leave it. (`version: 3.0.0` stays; bump it only for a user-facing version change, which this overhaul isn't.)

## Build env contract — confirmed
- app.json: bundle `com.accessmap.app` · teamId `S78F8ZA8QU` · `ITSAppUsesNonExemptEncryption: false` · usage strings (Location/Camera/Photos) ✓
- eas.json `testflight`: `distribution: store` · `environment: production` · Release ✓ · `submit.production`: ascAppId `6774709116`, teamId `S78F8ZA8QU` ✓
- ⚠ The `production` Supabase env is on EAS, not in the repo — verify it (step 1) or the app launches blank. Never paste the values anywhere.

## SKY'S 1-CLICK COMMANDS

**1 — REQUIRED first: confirm the EAS prod Supabase env exists** (missing = blank launch):
```bash
cd ~/AccessMap && npx eas-cli env:list --environment production
```
Expect `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the list. If absent, add them in the Expo dashboard (Project → Environment variables, environment = production) before building.

**2 — Build the TestFlight binary** (~15–20 min; auto-increments the build number):
```bash
cd ~/AccessMap && npx eas-cli build --platform ios --profile testflight --non-interactive
```

**3 — Submit it to TestFlight** (after the build finishes):
```bash
cd ~/AccessMap && npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

**Rollback (only if something's wrong):**
```bash
cd ~/AccessMap && git revert -m 1 ae81f15 && git push origin main
```

## While the build bakes — walk the one-build device checklist
`qa-reports/2026-06-19_DesignOverhaul_Phase6_A11yGauntlet.md` — dark mode (card lift/glow), the report-a-flag privacy line + announcement (**sign off the copy**), reward press/animation + correct points, Reduce-Motion modal snapping, VoiceOver pass, max Dynamic Type, then drop in the ResourcesScreen `TODO(Sky)` URLs.

## Notes / minor flags
- `package.json`'s `deploy:testflight` script points at the `preview` profile (internal distribution) — that's an ad-hoc build, NOT TestFlight. Use the `testflight` profile commands above (matches PROJECT_STATE + the purpose-built eas.json profile). Optional cleanup later; not a blocker.
- Reviewer-password rotation = App Store submit concern, **not** TestFlight.
- I changed no config (no bump needed); `main` is untouched by this prep.
