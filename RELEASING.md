# How to release to TestFlight

## Prerequisites (one-time setup, already done)

- `eas.json` has Apple credentials hardcoded (`appleId`, `appleTeamId`, `ascAppId`)
- `ios/` and `android/` are gitignored (CNG mode — Expo generates them at build time)
- Sentry DSN is set as an EAS secret (`SENTRY_DSN`)
- Supabase env vars are set as EAS secrets (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- Apple Developer account enrolled (Team ID: S78F8ZA8QU)

## One-time: update eas-cli (if prompted about a new version)

```bash
sudo npm install -g eas-cli
```

## Release (every time — 2 commands)

```bash
# Step 1: Build for the App Store
eas build --platform ios --profile testflight --non-interactive

# Step 2: Submit the latest build to TestFlight
eas submit --platform ios --profile production --latest
```

**That's it.** Both commands are non-interactive — no prompts.

## What happens next

- Build takes **10–20 minutes** on EAS servers
- After Step 2, Apple processes the binary for **15–30 minutes**
- You'll receive a **TestFlight email** when the build is ready to test
- Testers can then install via the TestFlight app on their iPhone

## Notes

- `buildNumber` in `app.json` auto-increments via `autoIncrement: true` in eas.json — you don't need to bump it manually
- Build credits: plan to build **once per phase** (not per feature branch) to conserve EAS free-tier credits
- The `testflight` profile uses `distribution: store` + `buildConfiguration: Release` — this is correct for App Store / TestFlight
- Submit profile is `production` (not `testflight`) — this is intentional; the submit profile points at the App Store Connect credentials
- To run a quick internal test *before* TestFlight, use `--profile preview` (builds faster, uses internal distribution)

## Apple credentials in eas.json (for reference)

| Field | Value |
|---|---|
| `appleId` | skylerhalisky@gmail.com |
| `appleTeamId` | S78F8ZA8QU |
| `ascAppId` | 6774709116 |

These are safe to hardcode — they are not secrets, just identifiers.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Invalid ASC App ID" | Double-check `ascAppId` in `eas.json` submit.production.ios matches App Store Connect |
| Build fails with "missing env var" | Run `eas secret:list` and verify all secrets are set |
| "eas-cli update available" banner | Run `sudo npm install -g eas-cli` |
| Submission stuck / rejected by Apple | Check App Store Connect → Activity for rejection reason |
| `net.http_post` function missing | Apply the `supabase/migrations/` SQL files in Supabase SQL editor first |
