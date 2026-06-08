# PROJECT_STATE — accessmap
_Last updated: 2026-06-07 — deep-audit branch merged, Pre-Build Step A complete_

## Current Status
**Main is green and build-ready.** The 27-fix deep audit (`audit/accessmap-deep-2026-06-07`) has been merged and pushed. Main is now `c6298df`, synced with `origin/main`. typecheck 0 · 97 suites / 1,575 tests · lint 0 errors. Remaining gate is Sky-side: re-confirm EAS env vars, then run the two EAS build + submit commands. (Carry-over: reviewer-password rotation + points-value drift decision.)

## Context Snapshot
Sky directed a whole-app UI/UX elevation of AccessMap (Expo/RN). The audit found the design system was already premium (3 prior passes), so the work was reframed as **elevation + adoption + the bolder direction**, not a rebuild. Sky explicitly chose the **MORE EXPRESSIVE** aesthetic (gradients, soft glows, celebratory gamification beats) and **run-end-to-end** (no mid checkpoint), held to a WCAG AA / reduced-motion / 60fps floor. After the UI pass merged, Sky asked for the flagged brand-font cleanup + build prep; both done. Sky then interrupted with `/new-window` to compress before starting a separate **Prompt Library Tool** UI pass in a fresh window.

## Recent Outcomes
- **Deep-audit merged + pushed (2026-06-07):** `cbf9a3b → c6298df` (no-ff). 27 verified fixes (F1–F27: EXIF/GPS privacy, double-submit guards, broken flows, races, leaks). 97 suites / 1,575 tests / typecheck 0 / lint 0 errors. Orphaned `onboarding.ts` removed. Docs reconciled. schema.sql synced to live. See `qa-reports/summaries/2026-06-07_AccessMap_PreBuild_StepA_Report.md`.
- **Backend security gate — DONE LIVE 2026-06-03:** Duplicate points trigger dropped, flag-photo INSERT guard tightened, RLS `search_path` hardened, webhook secret moved to Vault, `is_admin` bug fixed. Applied to live DB by Sky via Cowork; verified read-only by Morgan/Gary. These are NOT pending — they are done. Cite: `qa-reports/summaries/2026-06-07_AccessMap_PreBuild_Checklist.md §D1`.
- **UI pass merged + pushed (2026-06-03):** `df02ca1 → 7018bd5` (no-ff). Design-system elevation. App now 100% Lucide/SVG.
- **Brand-font cleanup merged + pushed (2026-06-04):** `7018bd5 → f499fc8` (no-ff). ~180 `<Text>`→`<AppText>` across 24 screens/modals.
- **Gates green throughout:** typecheck 0; 97 suites / 1,575 tests; lint 0 errors. `expo export --platform ios` bundles clean.
- **Build readiness verified:** eas.json (`appVersionSource: remote`, testflight `distribution: store` + `environment: production`, submit `ascAppId 6774709116`/team `S78F8ZA8QU`) ✓; app.json (bundle `com.accessmap.app`, version 3.0.0, usage strings, `ITSAppUsesNonExemptEncryption: false`) ✓; privacy-policy URL live ✓.

## Next Actions (Sky-side only — all agent work is done)
1. **Sky** — `npx eas-cli env:list --environment production` → re-confirm `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` present (env can change between sessions; missing = app launches blank).
2. **Sky** — from `~/AccessMap`: `npx eas-cli build --platform ios --profile testflight --non-interactive` (~15–20 min) then `npx eas-cli submit --platform ios --profile production --latest --non-interactive`. Agents CANNOT run EAS/App Store.
3. **Sky** — carry-over: rotate `reviewer@accessmap.com` password before App Store (old value in git history); decide points-value drift (live 10/3/15/7 vs docs 5/2/10/5).

## Open Risks
- **EAS Supabase env unverified this session** — if `EXPO_PUBLIC_SUPABASE_*` are missing from EAS prod, the build launches blank/crashes. Sky must verify before/at build.
- **Live-but-unverified UI** — the expressive UI + brand fonts are LIVE on main/origin but NOT yet device-verified; RN gradients/shadows/haptics only fully render on-device. On-device VoiceOver/TalkBack + visual pass still pending on a TestFlight build. Rollback: `git revert -m 1 f499fc8` (brand fonts) / `git revert -m 1 7018bd5` (UI pass) `&& git push`.
- **POINTS-VALUES-DRIFT** (carry-over) — live `handle_flag_status_change` awards 10/3/15/7; schema.sql/CLAUDE.md say 5/2/10/5. Sky decision pending. Trust live catalog over schema.sql.
- **Reviewer password** (carry-over) — rotate before App Store (old value in public git history).
