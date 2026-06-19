# Rory — Release Record: Overhaul Phase 1 (demo cold open)

**Date:** 2026-06-19
**Engineer:** Rory (DevOps/Release)
**Authorization:** Sky, explicit in-chat — "rory can merge please." One-time, attended override of the default **AccessMap = Sky-only-merge** rule (authority order: Sky's spoken intent > Constitution > role files). AccessMap is NOT under Rory's standing Art. 17 grant (that covers the Prompt Library Tool only); this merge is valid solely on Sky's direct authorization for this specific branch.

## What shipped
Branch `overhaul/phase1-demo-firstimpression` (`764a174`) → `main` via `--no-ff` merge `d8365c8`.
PRESENTATION ONLY — the live web demo's cold open:
- AccessMap brand pin SVG in the first painted frame
- `prefers-color-scheme` harmonized splash (kills the white→dark-map flash)
- reduced-motion-safe loading dots (WCAG 2.3.3)
- installable PWA: `manifest.json` + 192/512 icons + dual `theme-color` + apple-touch-icon

Files: `public/index.html` (+62/−2), new `public/{manifest.json,icon-192.png,icon-512.png}`, + Phase 0/1 qa-reports. **Zero `src/` or `supabase/` changes** (fence-clean; web guest gate `App.tsx` untouched).

## Release gate (held)
- ✅ `npx tsc --noEmit` — PASS
- ✅ `npm run lint` — **0 errors**, 93 warnings (pre-existing baseline; Phase 1 changed zero TS; ≤169 ceiling)
- ✅ Test suite — **not run, justified**: fence-diff proved `public/`-only; the Jest suite runs against `src/` and is unaffected by static asset changes.
- ✅ Built-output proof — clean `npx expo export --platform web` (exit 0); `dist/index.html` retains byline/OG/canonical, tokens substituted (`lang="en"`, `<title>AccessMap`), `manifest.json` + icons copied through.
- ✅ Scope confined to presentation; fence intact.

## Deploy
`git push origin main` → Vercel rebuilds from `public/` (`vercel.json` buildCommand `npx expo export --platform web`) → live at https://accessmap.skypistudio.com/. `dist/` is gitignored (Vercel builds it).

## Rollback (recorded)
- Pre-merge `main` SHA: **`4ebd824`**
- Revert the merge: `git revert -m 1 d8365c8 && git push origin main`
- Or hard reset (if not built on yet): `git reset --hard 4ebd824 && git push --force-with-lease origin main`
- Fully reversible; presentation-only; no DB/migration/state involved.

## Post-deploy verification (Sky — folds into the device pass, decision #3)
On https://accessmap.skypistudio.com/ once Vercel finishes:
1. Dark mode → no white flash before the dark map.
2. Pin + wordmark + loading dots paint immediately.
3. Reduce Motion on → dots freeze.
4. Share unfurls OG card; Add-to-Home-Screen shows AccessMap icon + name.

## Not touched
Data/auth/privacy/EXIF/RLS/RPC fence; any other branch or project. Phases 2–6 remain queued (Phase 2 on hold per Sky pending this merge).
