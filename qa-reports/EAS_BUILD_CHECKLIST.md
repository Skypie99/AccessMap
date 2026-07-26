# AccessMap — EAS Build → TestFlight Checklist

Everything that had to be fixed to get build 16 to build + submit cleanly (2026-06-03).
Run through this before every TestFlight build so you don't pay for a build that bounces.

---

## ✅ The two commands (run from `~/AccessMap`, one at a time)
```bash
cd ~/AccessMap
npx eas-cli build  --platform ios --profile testflight  --non-interactive   # ~15–20 min
npx eas-cli submit --platform ios --profile production --latest --non-interactive
```
- Run `eas` commands from the **project folder**, never from `~` (home) → else "EAS project not configured."
- You should already be logged in (`npx eas-cli login` if not).

---

## CONFIG — `eas.json` (these were ALL broken and are now fixed)
- [ ] **No `//` comment keys anywhere.** EAS CLI v20 rejects them ("is not allowed") and blocks *every* eas command. *(fixed: `162ee19`)*
- [ ] **No duplicate profile keys** (e.g. `preview2`/`preview3` defined twice). *(fixed: `0908dc5`)*
- [ ] **`cli.appVersionSource: "remote"`** — so EAS reads the build number from App Store Connect and auto-increments. With `"local"` it collided ("build number 15 already used"). *(fixed: `df02ca1`)*
- [ ] **`testflight` profile** has `"distribution": "store"` **and** `"environment": "production"`. The `environment` is what makes EAS inject the Supabase env vars into the build. *(fixed: `5ed3577`)*
- [ ] **`submit.production.ios`** has `appleId`, `ascAppId` (`6774709116`), `appleTeamId` (`S78F8ZA8QU`).
- Quick validity check: `node -e "JSON.parse(require('fs').readFileSync('eas.json'))" && echo OK`

## CONFIG — `app.json`
- [ ] `ios.bundleIdentifier` = `com.accessmap.app`
- [ ] `expo.extra.eas.projectId` present (`a7149107-...`)
- [ ] `version` set (e.g. `3.0.0`). Build number is now managed remotely, so you don't touch it manually.

## EAS ENVIRONMENT — the Supabase vars (the "dead on launch" trap)
- [ ] `EXPO_PUBLIC_SUPABASE_URL` **and** `EXPO_PUBLIC_SUPABASE_ANON_KEY` exist in the EAS **production** environment.
  - Verify: `npx eas-cli env:list --environment production`
  - They are NOT in `eas.json` and `.env` is gitignored (not uploaded), so the build gets them ONLY from EAS env vars + the `environment: production` field above. Missing them = app launches to a blank/crash.

## CODE — before you build
- [ ] `npm run typecheck` → 0 errors
- [ ] `npx expo export --platform ios` → bundles cleanly (this is the same step the cloud build runs)
- [ ] Commit your changes — EAS builds from the committed state.

---

## APPLE-SIDE (already set up, just confirm)
- [ ] App Store Connect **API key** is on EAS servers (Key ID `BF8J5TMTQ7`) → no app-specific password needed.
- [ ] App record exists in App Store Connect (ASC App ID `6774709116`, app "AccessMap - Route Planner").
- [ ] Business → Agreements show **Active** (they did — submit read the app info fine).

---

## GOTCHAS / how to read a failure
- **"Build number N already used"** → the *build is fine*, the number's just taken. `appVersionSource: remote` now prevents this automatically (it picks the next free number). If you ever see it again, the build still succeeded — you just need a higher number (rebuild).
- **Submit says "Something went wrong"** → the CLI hides Apple's real reason. The detail is on the Expo **submission page** → expand the "Upload to App Store Connect" log step. (Or App Store Connect → TestFlight.)
- **A built binary can't change its build number** → fixing the number always means one new build (the number is compiled in).
- **TestFlight builds expire after 90 days.**

## What lives where (so you don't hunt)
- Build profiles + submit creds → `eas.json`
- Supabase keys → EAS env vars (`eas env:list --environment production`), NOT the repo
- Bundle id / version / projectId → `app.json`
- TestFlight build list + status → appstoreconnect.apple.com → your app → TestFlight

---

### Last successful path (build 16, 2026-06-03)
Fixed in order: removed eas.json comments (`162ee19`) → `environment: production` (`5ed3577`) → confirmed Supabase env vars in EAS production → `appVersionSource: remote` (`df02ca1`). After that: build 16 builds + submits with a unique number, Supabase config embedded.
