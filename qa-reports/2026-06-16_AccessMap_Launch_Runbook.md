# AccessMap — Launch Runbook (TestFlight → App Store)

_Prepared by Morgan · 2026-06-16 · Pre-flight verified green this session_

## Why this exists
All engineering work on AccessMap is done and on `main`. The only remaining step is the actual EAS build + App Store submit — and **agents are constitutionally prohibited from running app-store submits, so this is Sky's hands.** This runbook is everything verified up to your keystroke, so the one run works first try.

## Pre-flight — verified this session (2026-06-16)
| Check | Result |
|---|---|
| `main` HEAD | `651421f` (re-sweep `9f0a792` merged) |
| `main` vs `origin/main` | **synced** (not ahead/behind) |
| `npm run typecheck` (`tsc --noEmit`) | ✅ **0 errors** |
| `eas.json` → `testflight` profile | ✅ `distribution: store`, `environment: production`, `autoIncrement: true`, Release config |
| `eas.json` → `submit.production.ios` | ✅ appleId `skylerhalisky@gmail.com`, ascAppId `6774709116`, teamId `S78F8ZA8QU` |
| Tests (per PROJECT_STATE) | 103 suites / ~1,680 tests green |

The only thing I could **not** verify (requires your EAS login) is whether the production Supabase env vars are still set in EAS. That's Step 1 below — do not skip it; missing vars = the app launches blank.

## The launch — copy/paste, run from `~/AccessMap`

**Step 1 — Confirm the EAS production env vars exist** (takes 10s):
```
cd ~/AccessMap
npx eas-cli env:list --environment production
```
You must see both `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. If either is missing, set it before building:
```
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://<your-project>.supabase.co"
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<your-anon-key>"
```
(The anon key is the *publishable* key — safe to use here. Do not use the service-role key.)

**Step 2 — Build for TestFlight** (~15–20 min, runs on EAS servers):
```
npx eas-cli build --platform ios --profile testflight --non-interactive
```

**Step 3 — Submit the finished build to App Store Connect / TestFlight:**
```
npx eas-cli submit --platform ios --profile production --latest --non-interactive
```
`--latest` grabs the build you just made. It uploads to the app with ascAppId `6774709116`.

That's it — after Step 3, the build appears in TestFlight (App Store Connect → TestFlight) for internal testing.

## Two carry-over decisions to settle before public App Store review
1. **Rotate the reviewer password** for `reviewer@accessmap.com` — the old value is in public git history. Set a new one in Supabase Auth, and put the new credentials in the App Store Connect "App Review → Sign-In Information" field (reviewers need a working login).
2. **Points-value drift** — the live DB trigger awards `10/3/15/7`; `schema.sql`/`CLAUDE.md` say `5/2/10/5`. The live catalog is the source of truth; once you confirm the values you want, I'll reconcile `schema.sql` + docs to match (file-only change, no live DB touch).

## Right after the build lands — on-device verification (the real residual risk)
The expressive UI, gradients, shadows, and haptics only fully render on a real device, and VoiceOver/TalkBack behavior can't be confirmed in a simulator. Once the TestFlight build is installable, run the manual checklist already written at:
`qa-reports/2026-06-09_AccessMap_ReSweep_Fixes.md §7`
(VoiceOver pass, color-not-sole-means spot-checks, reduced-motion, 60fps scroll, photo/EXIF privacy gate, deep-link markers). Tell me what fails and I'll route fixes.

## If something goes wrong — rollback
Each major merge is independently revertable on `main`:
- Re-sweep: `git revert -m 1 9f0a792 && git push`
- Brand fonts: `git revert -m 1 f499fc8 && git push`
- UI pass: `git revert -m 1 7018bd5 && git push`
