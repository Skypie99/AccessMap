# EXPO WEB + VERCEL CONFIG MERGE READINESS REVIEW

**Delegated to:** Rory (DevOps & Infrastructure)  
**Branch:** `feat/expo-web-vercel-2026-05-25`  
**Authority:** Morgan autonomous dispatch (merge prep gate)  
**Timeline:** 20 min  
**Gate:** Rory thumbs-up → report to Morgan → Morgan signals Sky for main merge

---

## THE WORK

Expo Web build + Vercel config ready for validation. No database migrations or RLS dependencies. Final validation before Sky merges to main.

---

## EXECUTION SCOPE

1. **Vercel config validation:**
   - `vercel.json` present and correct (build command, output directory, env vars)
   - Environment variables wired to `.env` format (EXPO_PUBLIC_* prefixes)
   - No hardcoded secrets in config files

2. **Expo Web build check:**
   - `expo build:web` runs cleanly (or equivalent Vercel build step)
   - Output bundles are sized reasonably (no bloat)
   - Source maps present for error tracking

3. **Deployment workflow:**
   - GitHub Actions deploy workflow (if present) is configured correctly
   - Deploy artifacts match Vercel expectations (dist/, build/, etc.)
   - No circular dependencies or build race conditions

4. **Web-specific functionality:**
   - PlatformMap.web.tsx uses react-leaflet correctly (no native-only APIs leaking)
   - OSM tiles + interactivity work in web context
   - Responsive layout on desktop/tablet breakpoints

5. **Regression check:**
   - Native build (iOS/Android) still compiles without conflicts from web changes
   - No new dependencies introduced that break `--legacy-peer-deps` constraint
   - TypeScript clean (tsc --noEmit)

6. **Report:** qa-report to `~/AccessMap/qa-reports/2026-05-28_Rory_ExpoWebMergeReview.md`
   - **Go/NoGo:** READY TO MERGE or HOLD with blockers
   - Any issues: list with fix step
   - Confidence level: READY / NEEDS-POLISH / HOLD

---

## SCOPE NOTES

No database migration blocking this merge. Expo Web is a new platform target; validation is infrastructure-only (build, deploy, config).

---

## NEXT STEP

Validate Vercel config, Expo Web build, deployment workflow, and platform separation. Report by EOD.

---

**Morgan standing by. Expo Web merge gate. ✓**
