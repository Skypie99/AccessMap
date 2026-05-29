# Peter — Web Platform Tasks (2026-05-30)

## Task 1: expo-web-vercel branch

- Status: FOUND — `origin/feat/expo-web-vercel-2026-05-25`
- Merge status: **Already merged to main** via PR #4 (`c989142 Merge pull request #4`)
- Files changed (from commit `9bd092a`):
  - `App.tsx` — web guest/demo mode (map loads without auth on web)
  - `src/lib/location.ts` — `navigator.geolocation` fallback on web
  - `src/lib/supabase.ts` — `localStorage` on web, `AsyncStorage` on native; `detectSessionInUrl` enabled on web for OAuth redirects
  - `src/screens/AboutScreen.tsx` — version fallback via `expoConfig.version` on web
  - `src/screens/ReportFlagModal.tsx` — HTML5 file input for photo upload on web
  - `vercel.json` — SPA rewrite rule + `npx expo export --platform web` build command
- Safety assessment:
  - No credentials or secrets in any file
  - Env vars use `EXPO_PUBLIC_*` pattern (already in codebase, no new secrets introduced)
  - Auth change (`detectSessionInUrl: true` on web) is correct and safe — enables OAuth token parsing from URL hash; no RLS impact
  - No RLS migrations or DB schema changes
  - No privacy-sensitive changes (location fallback is read-only, no new data collection)
- **Safety: SAFE**
- Action: **Already merged — no action needed.** Branch can be deleted if desired.

---

## Task 2: Lighthouse CI

- Branch: `ci/lighthouse-2026-05-30`
- Files added:
  - `/Users/skypie/AccessMap/.lighthouserc.js`
  - `/Users/skypie/AccessMap/.github/workflows/lighthouse.yml`
- Assertions configured:
  - `categories:accessibility` ≥ 0.9 — **error** (blocks PR if failed; we care a lot)
  - `categories:performance` ≥ 0.6 — **warn** (acceptable range for a map-heavy app)
  - `categories:best-practices` ≥ 0.9 — **warn**
  - `categories:seo` ≥ 0.7 — **warn** (lower bar; it's an app, not a public site)
- Upload target: `temporary-public-storage` (no token required to see results)
- `LHCI_GITHUB_APP_TOKEN`: optional — adds inline PR annotations when set as a repo secret; workflow runs regardless
- Node version: 22 (matches existing CI)
- PR: [see below]
- Status: READY

---

## Decisions for Sky

None. Both tasks are safe and clean.
