# AccessMap Overhaul — Phase 2: Design-System Enforcement & Depth

**Date:** 2026-06-19
**Branch:** `overhaul/phase2-design-system` (off `main` after Phase 1 merged)
**Scope:** PRESENTATION / TOKENS / DOCS only. Zero data/auth/privacy/fence changes.
**Merge:** Sky-only. 6 increments, each its own reviewable commit.

---

## What shipped (6 increments)

| # | Commit | Change | Gate |
|---|---|---|---|
| 1 | `99e8e46` | **Severity-label scale unified.** Badge showed Low/High/Critical; everything else showed Mild/Significant/Severe. Made `theme.severity` the single source; `SEVERITY_LABELS` + `heatmapSeverity` now *derive* from it (drift-proof). Net: SeverityBadge pills now match the app. | typecheck + 146 tests |
| 2 | `f3b0dcb` | **Docs reconciled.** CLAUDE.md/DESIGN.md listed deleted `Pill`/`PointsChip` primitives; fixed the lists + added a dated DESIGN.md decision-log entry. | docs only |
| 3 | `5cfb21e` | **Button 44pt floor.** `sm`/`md` were ~30–40pt; added `minHeight: a11y.minTargetSize` (DESIGN.md §6 / WCAG 2.5.5). | typecheck |
| 4 | `fcf6a0b` | **Dark-mode card elevation fixed (lighter card).** The dark ramp was inverted — cards (`surface #111`) sat darker than their wash (`surfaceMuted #1a1a1a`) and receded. Re-ordered ascending: `wash #121214 < card #1E1E22 < input #28282C < chip #323237`. | typecheck + 61 tests |
| 5 | `cb033a3` | **OnboardingCards harmonized to brand.** Off-brand rainbow (emerald/violet/amber icons, violet permission CTA, raw-blue gradients) → brand-blue accents + a gold "you're all set" finale + `gradient.brandHero` CTAs. | typecheck |
| 6 | `0d0c42c` | **Dark-mode card shadow (light-shadow half).** New theme-aware `shadowTint` token (cool navy in light, soft cool glow `#A8C0E0` in dark); wired the `Card` primitive so cards lift on dark instead of casting an invisible dark-on-dark shadow. | typecheck + 61 tests |

#4 + #6 together deliver Sky's chosen dark-elevation approach: **lighter card + soft light-shadow.**

## 🔒 Fence proof
`git diff --stat main..HEAD` → 8 files: `CLAUDE.md`, `DESIGN.md`, `OnboardingCards.tsx`, `Button.tsx`, `Card.tsx`, `flags.ts` (the `SEVERITY_LABELS` export only — not the engine), `theme.ts`, `ThemeContext.tsx`. **Zero** changes to data/auth/privacy/EXIF/RLS/RPC. The mixed-file `flags.ts` edit stayed in the editable label-dictionary region.

## Gate (full suite runs before merge)
Every commit: `typecheck` PASS. Label-critical + theme/card suites: **207 tests pass** across the runs (146 + 61). lint baseline unchanged (0 errors). The **full** `npm test` should run once before merge as the final gate.

## ⚠ NEEDS-SKY-VISUAL (fold into the EAS / TestFlight build)
1. **Dark-mode surfaces (#4)** — the whole dark palette shifts; confirm cards now lift across Tasks / Profile / Map chrome / modals.
2. **Dark-mode card glow (#6)** — tune the `shadowTint` strength (`#A8C0E0` / opacity) on device; conservative default, not visually verified. iOS shows the glow; Android conveys lift via the surface step.
3. **OnboardingCards (#5)** — first-launch only (behind the onboarding gate); confirm the brand-blue + gold reads well.

## Deferred (with rationale) — not blocking Phase 2
- **SignInScreen token sweep** — DESIGN.md lists the sign-in splash as a *fixed-background exception ("do NOT theme")*, so its hardcoded dark colors are largely intentional; blanket tokenizing would violate the system. Its auth calls are fenced. Optional small brand-accent harmonization could be a later follow-up; not a clear enforcement win.
- **Broad shadow theming (~28 other `shadow.eN` sites)** — the `Card` primitive (the main card surface) is themed; migrating the long tail is a scoped follow-up. The surface lift (#4) already carries those surfaces.
- **`Sheet` primitive adoption** — correctly a no-op: DESIGN.md says existing modals are intentionally full-screen page-sheets/lightboxes and should NOT convert; the primitive awaits a genuine new bottom-sheet.

## Review / merge / rollback
- **Review:** `git diff main..overhaul/phase2-design-system`; pull + check dark mode on device.
- **Merge:** Sky-only (or Rory under your explicit grant, as with Phase 1). Run full `npm test` first.
- **Rollback:** per-commit `git revert`, or reset the branch. All presentation/tokens/docs — fully reversible.
