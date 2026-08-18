# Flagstone Release Readiness — 2026-05-28

**Status:** Infrastructure built. Awaiting Sky credential setup to go live.

---

## What's Done

✅ **EAS Build profiles** (development/preview/production) — `eas.json`  
✅ **GitHub Actions auto-build workflow** — `eas-build.yml` (runs on every push)  
✅ **GitHub Actions TestFlight submit workflow** — `eas-testflight-submit.yml`  
✅ **npm deploy scripts** — `npm run deploy:testflight` + `npm run deploy:appstore`  
✅ **Comprehensive setup guide** — `docs/EAS_SETUP.md` (step-by-step, 30 min)  
✅ **CHANGELOG** — human-readable feature history  
✅ **Version** — 1.0.0 (app.json + package.json)  

---

## What Sky Needs To Do (Next 30 min)

### **For Daily TestFlight Builds:**

1. **Create EAS account & token** (5 min)
   - Go to https://expo.dev, create account
   - Create EAS Token in Account → Settings → Tokens
   - Copy the token

2. **Add 4 GitHub Secrets** (5 min)
   - Go to Repo → Settings → Secrets and variables → Actions
   - Add: `EAS_TOKEN`, `APPLE_TEAM_ID`, `EXPO_APPLE_ID`, `EXPO_APPLE_PASSWORD`
   - [Full guide](docs/EAS_SETUP.md#step-2-add-github-secrets)

3. **Link Apple Developer Team to EAS** (10 min)
   - Run `eas credentials` in Terminal
   - Follow prompts to set up build certificate

4. **Create App Store Connect app record** (10 min)
   - Go to https://appstoreconnect.apple.com
   - Create **New app** → name: Flagstone, bundle ID: com.accessmap.app
   - Note the App Store Connect Apple ID

5. **Update eas.json** with App Store Connect ID (2 min)
   - Edit `eas.json` → submit section
   - Add your actual `appleId`, `ascAppId`, `appleTeamId`
   - Commit & push

6. **Test first build** (5 min)
   - Push any commit to a branch
   - Watch GitHub Actions → **EAS Build (Development)** workflow
   - Confirm it goes green ✅

---

## Daily Workflow (Once Live)

**For testing on your phone:**

```bash
# Build & submit to TestFlight (15 min)
npm run deploy:testflight

# Or: manually trigger in GitHub Actions → EAS TestFlight Submit
```

→ Build completes → You get TestFlight notification → Install on phone → Test

---

## What's NOT Yet Ready

- ❌ Android builds (Rory will add when needed)
- ❌ GitHub Pages deploy for Prompt Library (other project)
- ❌ Release automation (version bump + changelog on tag) — optional, can add later

---

## Files Changed on This Branch

**release/auto-2026-05-28** (Pipeline only, zero app code changes):

- ✨ `.github/workflows/eas-build.yml` — auto-build on every push
- ✨ `.github/workflows/eas-testflight-submit.yml` — manual + tag trigger
- ✨ `docs/EAS_SETUP.md` — step-by-step setup guide (copy-paste friendly)
- 📝 `RELEASE_READINESS.md` — this file
- 📝 `package.json` — added deploy scripts
- 📝 `eas.json` — already existed; no changes needed (has TODOs)
- 📝 `CHANGELOG.md` — already existed; is current

**Do not merge this branch yet.** Rory will do a final smoke test after Sky completes credentials, then will add a commit marking "credentials verified" before merging.

---

## Next: Smoke Test (After Sky Setup)

1. Sky completes all 6 steps above.
2. Rory runs `npm run deploy:testflight` on this branch.
3. Confirms TestFlight build completes successfully.
4. Adds smoke-test-passed commit to this branch.
5. Branch is ready for merge into main (Sky will do that merge).

**Target:** Friday 2026-05-29 EOD (before Monday merge wave).

---

## References

- **Full EAS setup guide:** [docs/EAS_SETUP.md](docs/EAS_SETUP.md) — step-by-step, no skips
- **EAS documentation:** https://docs.expo.dev/build/introduction/
- **App Store Connect:** https://appstoreconnect.apple.com
- **Expo dashboard:** https://expo.dev
