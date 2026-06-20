# AccessMap Overhaul — Phase 4: Verify/Resolve Payoff

**Date:** 2026-06-19
**Branch:** `overhaul/phase4-verify-resolve-payoff` (stacked on Phase 3)
**Scope:** PRESENTATION / a11y / motion / copy. Zero data/auth/points-trigger changes.
**Merge:** Sky-only. Core wave = 3 commits.

---

## Shipped (3 commits)

| Commit | Change | Gate |
|---|---|---|
| `eeec6a8` | **Points correctness (the marquee — Sky decision #1).** The flash/SR-announced points were stale: UI showed the original +5/+2 (verify) and +10/+5 (resolve), but the live trigger awards reporter +10/+15 and actor +3/+7. Corrected the displayed values (own flag +10/+15, others' +3/+7) + the stale inline comment + the CLAUDE.md reference. | typecheck; no test pinned the strings |
| `c64d7f0` | **Reward FlashBanner animation.** The App-level "earned points while away" toast hard-popped; now a spring slide-down + fade entrance and an accelerate-eased fade-out, **gated behind `useReducedMotion()`** (snaps to rest under Reduce Motion). All a11y (announce, polite live region, tap-to-dismiss) preserved. | typecheck |
| `c203b26` | **Triage reward pill AA-legible.** TasksScreen's "+N points" pill used `color.success` (#27ae60 → white text 2.8:1, AA-large only); switched to `color.successStrong` (#1e8449, 4.6:1), matching FlashBanner. | typecheck |

## 🔒 Fence proof
Phase 4 touched `TasksScreen.tsx` (display strings + pill color), `FlashBanner.tsx` (animation), `CLAUDE.md` (doc). **Zero changes to the points trigger (`schema.sql`), `updateFlagStatus`, `points.ts`, or `pointEvents.ts`** — the displayed numbers now simply tell the truth about what the (unchanged) trigger awards.

## Already in place (verified, no work needed)
- The verify/resolve **status change is already announced to screen readers** (`TasksScreen` `applyStatusChange` → `AccessibilityInfo.announceForAccessibility`, L547/L551) + a polite live region. WCAG 4.1.3 met for the reward.
- Severity already carries number + word (never color-alone).

## Remaining Phase 4 / re-homed
- **Triage pill entrance animation** → moved to **Phase 5 (motion)** — same crafted slide+fade as FlashBanner, on the TasksScreen `flashPill` + the triage buttons' press feel (scale + haptic, `Button` primitive). Belongs with the motion pass.
- **Before/after "this got fixed" payoff** (FlagDetailModal) — the resolution before/after is visually thin (two flat squares + a text arrow); thicken to a captioned, AA-legible, clearly-labeled payoff. Presentation-only; FlagDetailModal is dense (~1,957 L) so it's a focused follow-up. Recommend pairing with Sky's eye.

## ⚠ NEEDS-SKY-DEVICE
- The FlashBanner animation feel + 60fps — verify on the TestFlight build.
- The corrected points values — confirm the numbers read right after a real verify/resolve.

## Review / merge / rollback
- **Review:** `git diff overhaul/phase3-map-report-ux..overhaul/phase4-verify-resolve-payoff`.
- **Merge:** Sky-only, after Phase 3. Full `npm test` first.
- **Rollback:** per-commit revert; presentation/copy/motion only — fully reversible.
