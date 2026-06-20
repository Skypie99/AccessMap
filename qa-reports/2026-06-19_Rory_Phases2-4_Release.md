# Rory — Release Record: Overhaul Phases 2–4 + Housekeeping

**Date:** 2026-06-19
**Engineer:** Rory (DevOps/Release)
**Authorization:** Sky, explicit in-chat — "rory can merge the other phases please and do any housekeeping also." One-time, attended override of the default **AccessMap = Sky-only-merge** rule (authority order: Sky's spoken intent > Constitution > role files). AccessMap is NOT under Rory's standing Art. 17 grant; valid solely on Sky's direct authorization. Mirrors the Phase 1 merge earlier today.

## What shipped
Three stacked branches merged into `main` (`--no-ff`, in order) and pushed:
- `overhaul/phase2-design-system` → merge `9bfff30`
- `overhaul/phase3-map-report-ux` → merge `a1e5d71`
- `overhaul/phase4-verify-resolve-payoff` → merge `173602d`

`main`: `186c471` → **`173602d`**, pushed (`186c471..173602d`). 16 phase commits + 3 merge commits.

Scope (per-phase reports under `qa-reports/2026-06-19_DesignOverhaul_Phase{2,3,4}_*.md`):
- **P2** dark-mode elevation (lighter card + glow), OnboardingCards→brand, severity unify, Button 44pt, doc reconcile.
- **P3** Hero 2 privacy trust signal, dead-label/pronoun fixes, native callout fonts, ResourcesScreen seed.
- **P4** points-display correctness (10/3/15/7), reward animation (RM-gated), reward AA fix.

## Release gate (held)
- ✅ `npx tsc --noEmit` PASS · ✅ `npm run lint` **0 errors** (92 baseline warnings) · ✅ full `npx jest --ci` = **107 suites, 1,721 passed, 0 fail** (run on the phase4 tip, which contained all of 2+3+4).
- ✅ **Fence proof (cumulative `186c471..173602d`):** 18 files, all presentation/tokens/docs/tests. **No `supabase/`, `auth.tsx`, schema, migrations, or `.env`.** `flags.ts` engine (strip/upload/`createFlag`/`createAnonFlag`) confirmed **untouched** — only the editable `SEVERITY_LABELS` export changed.

## Deploy
`git push origin main` → Vercel rebuilds the **web** demo from `public/` with all P2–P4 presentation. Typecheck+test verified, Chromium-fine.

## ⚠ Post-merge device checklist (Sky — NOT yet verified; the EAS/TestFlight build is the gate)
1. **Dark mode** across screens — cards lift (P2); tune the `shadowTint` glow if needed.
2. **Report-a-flag privacy moment** (P3) — the "Location is removed…" line + the success announcement; **sign off on the copy**.
3. **Reward animation** (P4) — FlashBanner entrance/exit feel + 60fps; corrected points read right after a real verify/resolve.
4. **VoiceOver / TalkBack** + iOS Safari + Android elevation.
5. **ResourcesScreen** ships as info-cards — supply the real URLs (`TODO(Sky)`); no dead links in the meantime.

## Rollback (recorded)
- Pre-merge `main`: **`186c471`**
- Revert the merges: `git revert -m 1 173602d a1e5d71 9bfff30 && git push origin main`
- Or hard reset: `git reset --hard 186c471 && git push --force-with-lease origin main`
- Fully reversible; presentation/tokens/docs only; no DB/migration/state involved.

## Housekeeping done
- Deleted 6 **fully-merged** local branches (safe, no unique commits): the 4 `overhaul/phase*` + `docs/phase6-strategy` + `feat/phase5-a11y-audit`.
- Updated `PROJECT_STATE.md` (Phases 1–4 merged + pending device pass; resolves the points-drift carry-over).

## Housekeeping NOT done — needs Sky's confirmation (un-merged work, conservative)
~30 stale local branches (all ~3 weeks old) carry **un-merged commits** — left in place per "don't bulk-delete un-merged work." They are the known stale-branch hazard (each carries an old pre-attribution `index.html`; never branch off / merge any). To prune them, Sky should confirm — then `git branch -D <name>` each (recoverable via reflog for ~90 days). Remote/origin branches + dependabot were not touched. Examples: `a11y/*`, `design/wave6-*`, `feat/sprint3-*`, `perf/auto-*`, `qa/*`, `research/auto-*`, `test/sprint3-coverage`, `claude/*`.

## Not touched
Data/auth/privacy/EXIF/RLS/RPC fence; other projects; app-store submission. Phases 5 (motion) + 6 (a11y gauntlet) remain unbuilt — recommend after the device pass.
