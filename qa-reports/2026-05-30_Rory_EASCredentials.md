# Rory — EAS Credentials Wire-Up
**Date:** 2026-05-30
**Branch:** fix/offline-cache-ttl-test-2026-05-30 (edited in-place, no pipeline branch needed — config-only change)
**model_tier:** sonnet

```yaml
coherence_score: 1.00
state_consistency: pass
duplicate_work_detected: no
drift_risk: low
```

---

## What Was Done

Wired confirmed Apple credentials into `eas.json` submit profile.

### Changes to `eas.json`

| Field | Before | After |
|---|---|---|
| `submit.production.ios.appleId` | `TODO_APPLE_ID@example.com` | `skylerhalisky@gmail.com` |
| `submit.production.ios.appleTeamId` | `TODO_APPLE_TEAM_ID` | `S78F8ZA8QU` |
| `submit.production.ios.ascAppId` | `TODO_ASC_APP_ID` | unchanged (still pending) |
| Header comment block | "CREDENTIALS REQUIRED BEFORE FIRST BUILD" | Updated with ✅/⏳ status indicators |

Removed stale TODO comment lines for `appleId` and `appleTeamId` since they're no longer placeholders.

---

## Still Pending

**`ascAppId`** — the numeric App Store Connect app ID. This is obtained by:
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps → +** to create a new app record
3. Fill in: Platform = iOS, Name = AccessMap, Bundle ID = `com.accessmap.app`, SKU = anything (e.g. `accessmap`)
4. After creation, go to **App Information → General** — the **Apple ID** field there is your `ascAppId` (a ~10-digit number, e.g. `6743210987`)
5. Paste it into `eas.json` at `submit.production.ios.ascAppId`

---

## Verification

- `npm run typecheck` → **clean** (0 errors)
- `eas.json` is valid JSON (no TS involved)

---

## Decisions for Sky

None. This was a straightforward fill-in. One item still needed from Sky's side: create the App Store Connect app record and drop the numeric `ascAppId` back so Rory can fill the last placeholder.
