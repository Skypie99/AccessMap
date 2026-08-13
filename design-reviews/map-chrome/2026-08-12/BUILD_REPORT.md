# BUILD REPORT — Map-chrome compaction (Direction B-refined)

**Run:** RUN — MAP CHROME COMPACTION BUILD [Opus 4.8 max effort · build from locked spec · ONE branch · NO merge/push] · Sky-initiated (model gate satisfied).
**Contract:** `SPEC.md` (§0 pick, §0.5 refinements, §11 B-deltas) + governing visual `mockups/B2_command-bar-refined.html` + `01_CHROME_INVENTORY.md`.

## Branch discipline
- **Base SHA (then-current `main` tip): `242c3d6edbd72c8c5d8149e7310ae070a9b15fac`** (`242c3d6` — "docs(code-qa): the handoff says MERGED, because it is").
- **Branch: `design/map-chrome-b`** (cut from that tip). `main` never touched. No push, no EAS build, no deploy, no external send.
- Sibling map-gestures run stacks on THIS branch's tip (see §Sibling-run warning).

## Baseline (on branch, before any change)
- `npx jest --ci -w 3` → **199 suites, 2939 passed, 32 todo (0 fail)**.
- `npm run typecheck` → **0 errors**. `npm run lint` → **0 errors, 74 warnings** (all pre-existing).

---

## Phase 1 — Crystal tokens + additive GlassSurface props + arbiter ✅ (commit 1)
**What changed**
- `src/theme.ts` (light) + `src/theme/ThemeContext.tsx` (dark): NEW tokens
  - `glassMapCrystal0` = light `rgba(255,255,255,0.70)` / dark `rgba(30,34,46,0.80)` (bar gradient top; also the count-pill fill).
  - `glassMapCrystal1` = light `rgba(255,255,255,0.60)` / dark `rgba(30,34,46,0.70)` (bar gradient bottom; **also the blur-mode floorColor** — mode-independent floor math).
  - These are the **four new floor literals** the `mapChromeBudget` guard will pin. No shared token edited (`glassChromeLite0` dark byte-frozen — untouched).
- `src/components/ui/GlassSurface.tsx`: two **additive** props — `liteColors?: readonly [string,string]` (overrides the engineered `*Lite` gradient stops) and `floorColor?: string` (overrides the blur-mode floor). Both default to the recipe's own values, so every existing `GlassSurface.test` assertion passes verbatim.
- NEW arbiter declaration `tools/map-chrome-crystal-stacks.json` (crystalBar / countChip / pin065 surfaces × light+dark).

**Gate results (pasted)**
- Arbiter: `node ~/AccessMap-material-lab/2026-07-02/shared/contrast-check.mjs …/map-chrome-crystal-stacks.json` → **RESULT: ALL PASS, exit 0**. Worst ratios: bar title #222/#F5F5F5 **5.58 / 5.40**; tool icons #0E4499/#B4CFFA **3.20 / 3.71** (≥3); count pill **9.61 / 12.21**; pin-0.65 legend #222 **6.52**; close-X #414B5A **3.62** (≥3); locating #333 **5.17**. (Matches SPEC §0.5 minimums.)
- `npm run typecheck` → 0. Full `jest --ci -w 3` → **2939 passed, 32 todo, 0 fail**. `npm run lint` → 0 errors, no new warnings.

---
*(Phases 2–6 appended as they bank.)*
