# Rory — Phase 1 Final Merge Wave Report

**Date:** 2026-05-29  
**Branch merged into:** `main`  
**Executed by:** Rory (merge manager)  
**Authorization:** Sky (direct session instruction)

---

## Merge Summary

All 3 branches merged into `main` in the prescribed order. Typecheck and tests green after each wave.

| # | Branch | Result | Notes |
|---|--------|--------|-------|
| 1 | `qa/auto-2026-05-29` | ✅ MERGED (`723e23f`) | Security fixes, CI coverage gate, Sentry scaffold, analytics stub, husky hook, PR template, all QA/recon reports. Conflict in `send-push-notification/index.ts` resolved by taking main's version (oracle fix + input length limits already present). |
| 2 | `ci/lighthouse-2026-05-30` | ✅ MERGED (`543bd10`) | Lighthouse CI workflow + `.lighthouserc.js` + Peter's QA report. Per reconciliation report: `HeatmapLayer.tsx` and `MapScreen.tsx` conflicts both resolved to main's side (branch had older, regressive versions). |
| 3 | `release/0.2.0-version-bump` | ✅ MERGED (`543bd10`) | `app.json` version `1.0.0 → 0.2.0`, `ios.buildNumber=2`, `android.versionCode=2`. Merged in the same commit as the Lighthouse CI per automation sequencing. |

---

## Typecheck & Tests (post-all-merges)

- **TypeScript:** `npx tsc --noEmit` — **0 errors** ✅
- **Tests:** `npx jest --passWithNoTests` — **73 suites, 1161 tests, 0 failures** ✅

---

## Conflict Resolution Log

### Conflict 1 — `supabase/functions/send-push-notification/index.ts` (Merge 1)

- **Conflict source:** `qa/auto-2026-05-29` added the caller auth gate earlier in the QA cycle. Main subsequently landed the same gate PLUS an oracle fix (returns `200 {"status":"queued"}` instead of `404` on missing token, preventing push-token enumeration) AND input length limits (title ≤150, body ≤300, data ≤1KB). The branch version predated both improvements.
- **Resolution:** Took `main`'s version (strictly superior — more security mitigations).

### Conflict 2 — `src/components/HeatmapLayer.tsx` (Merge 2)

- **Conflict source:** Branch created the file fresh from an older scaffold; main created the same file via the D5 heatmap merge wave with identical logic but design-token-referenced styles.
- **Resolution:** Took `main`'s version (design tokens; the branch's hardcoded rgba values would break dark mode).

### Conflict 3 — `src/screens/MapScreen.tsx` (Merge 2)

- **Conflict source:** Branch reverted the ghost-FAB (guest UX) and `statusHint` color added by the `fix/guest-ux-2026-05-30` merge on main. Also used hardcoded `rgba()` instead of `color.overlayBtn`/`color.textOnBrand` tokens.
- **Resolution:** Took `main`'s version (preserves ghost-FAB + a11y labels; preserves design token usage; correct `statusHint` color).

---

## Design Decision Recorded

Per Sky's explicit instruction:

> **2026-05-29: Heat-map display style DECIDED → gradient layer (not density dots). Sky's explicit choice.**

Recorded in `DECISIONS_LOG.md` (new entry prepended above the existing D5 Heatmap Gradient entry).

---

## Main HEAD After Merge Wave

```
723e23f  Merge branch 'qa/auto-2026-05-29'      ← Merge 1
455c11f  fix(test): expo-image-manipulator mock  ← CI fix (automation)
543bd10  chore(release): Lighthouse CI + v0.2.0  ← Merges 2+3
8333aa4  ci(coverage): refine scope + mock fix   ← CI fix (automation)
d771339  Merge remote-tracking branch 'origin/main' (previous HEAD)
```

---

## Status: NOT PUSHED

Per instruction: do NOT push to remote. Sky to push when ready.

```bash
# Sky: when ready to push
git push origin main
```

---

## What Sky Should Do Before Pushing

1. **Supabase migrations (propose-only):** The following SQL files are in the repo but NOT applied to any database:
   - `supabase/migrations/2026-05-29_latlong_range_constraint.sql` — propose-only lat/lng CHECK constraints
   - `supabase/migrations/2026-05-29_function_search_path_hardening.sql` — search path hardening (uncommitted, in working tree)
   - `supabase/migrations/2026-05-29_fix_points_trigger.sql` — fix points trigger table ref (uncommitted, in working tree)
   Apply these via Supabase Dashboard → SQL Editor after reviewing Dana's runbook (`qa-reports/2026-05-29_Dana_SQL_Runbook.md`).

2. **Sentry DSN:** `src/lib/sentry.ts` reads `EXPO_PUBLIC_SENTRY_DSN`. Set this env var in `.env` (and EAS secrets) before production build to activate error tracking. Local dev no-ops without it.

3. **SEND_PUSH_SECRET:** `supabase/functions/send-push-notification` requires `SEND_PUSH_SECRET` env var in Supabase Edge Function secrets (see setup steps in the function's top comment).

4. **git push:** `git push origin main` when ready. No force-push needed — main is strictly ahead of origin/main.
