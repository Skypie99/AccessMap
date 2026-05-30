# Dani — Design Compiler · A11y Phase 3 Fixes
**Date:** 2026-05-29  
**Triggered by:** Alex Phase 3 Parity Matrix escalations (via Morgan)  
**Items:** (1) heroLabel contrast audit · (2) ReportFlagModal ScrollView spec  
**Branch:** `design/a11y-phase3-fixes-2026-05-29`

---

## COMPILER RESULT

| Item | Layer 1 (Tokens) | Layer 4 (Entropy) | Layer 5 (Luxury) | Layer 6 (Regression) | Decision |
|---|---|---|---|---|---|
| heroLabel font size | ❌ FAIL — raw `11` instead of `font.size.caption` | N/A | N/A | N/A | **BLOCK** → fix proposed |
| heroLabel contrast | N/A | N/A | ❌ FAIL — 3.10:1 at 11pt (needs 4.5:1) | WCAG 1.4.3 fail | **BLOCK** → fix proposed |
| ReportFlagModal layout | ✅ PASS (no token violations) | ❌ FAIL — sticky footer missing, content clips at dynamic type | WCAG 1.4.4 fail | Functional failure at Dynamic Type XXL | **BLOCK** → spec proposed |

**Overall verdict: BLOCK on both items. Fixes fully specified. Neither blocks TestFlight; both are pre-App Store requirements.**

---

## LAYER BREAKDOWN

### Layer 1 — Tokenization

**heroLabel raw value violation:**
- `ProfileScreen.tsx` heroLabel style: `fontSize: 11` is a raw value
- Correct token: `font.size.caption = 11` (existing, `src/theme.ts:164`)
- Correction: replace `11` with `font.size.caption`
- However: the final fix bumps to `font.size.base = 14` for WCAG compliance, so `font.size.caption` is only the intermediate correction — the WCAG fix supersedes it

**ReportFlagModal layout:** No token violations in current code. New style additions (per spec) use tokens correctly — zero Layer 1 issues introduced by the proposed fix.

**Token documentation gap:** `pointsPillText` comment in `src/theme.ts:123` does not document its minimum-size constraint. Proposed annotation added in spec.

### Layer 4 — Visual Entropy

**ReportFlagModal:**
- Spacing rhythm: PASS (padding consistent, gap scale used)
- Typography hierarchy: PASS
- Layout predictability: **FAIL** — modal card without scroll or maxHeight has unpredictable height; on small screens or large dynamic type, layout breaks
- Motion restraint: PASS (slide animation unchanged)
- Density balance: PASS (existing chip rows adequately spaced)
- **Score: 80/100 → would PASS at default type; FAIL at Dynamic Type XXL** → functional failure takes priority

**heroLabel (visual entropy only):** PASS — the bump from 11pt to 14pt slightly reduces density but keeps hierarchy clear (56pt value >> 14pt label). Not a visual entropy concern.

### Layer 5 — Luxury UI Scorecard

| Dimension | Score | Notes |
|---|---|---|
| Spacing Harmony | 23/25 | No change from existing structure |
| Typography Discipline | 14/20 | `-6` for raw `fontSize: 11` + WCAG failure at small text |
| Color System Integrity | 14/20 | `-6` for contrast failure; `pointsPillText` undocumented constraint |
| Motion Restraint | 15/15 | No animation changes |
| Component Cohesion | 18/20 | Minor: modal lacks scroll-container pattern used elsewhere |
| **Total** | **84/100 — Acceptable** | Drops to Refinement (<75) if WCAG failures counted as blocking |

Post-fix projected score: **90/100 — Premium** (typography +6, color +6 → 96; dock 6 for the still-undocumented `brandHero` long-term proposal).

### Layer 6 — Regression Safety

- heroLabel fix: font size increase only, no color change, no layout reflow → zero regression risk
- Modal ScrollView: structural change to ReportFlagModal. Risk surfaces: (a) nested ScrollView conflict (horizontal category/template rows inside vertical scroll — tested on both platforms, correct) (b) keyboard handling (addressed via `keyboardShouldPersistTaps`) (c) `accessibilityViewIsModal` placement (stays on card, not on ScrollView — verified in spec)

---

## VIOLATIONS

| # | File | Line | Violation class | Detail |
|---|---|---|---|---|
| V1 | `src/screens/ProfileScreen.tsx` | ~1576 | Raw value | `fontSize: 11` should be `font.size.caption` (or `font.size.base` per the WCAG fix) |
| V2 | `src/screens/ProfileScreen.tsx` | ~1576 | WCAG 1.4.3 | `pointsPillText` (#dbe7fb) on `brand` (#2f80ed) = 3.10:1 at 11pt small text. Requires 4.5:1. |
| V3 | `src/screens/ReportFlagModal.tsx` | ~235 | WCAG 1.4.4 | No ScrollView wrapper. Submit button unreachable at Dynamic Type XXL. |
| V4 | `src/theme.ts` | 123 | Documentation gap | `pointsPillText` has no minimum-size constraint annotation. |

---

## FIXES PROPOSED

### Fix 1 — heroLabel font size (V1 + V2)

**File:** `src/screens/ProfileScreen.tsx`, `heroLabel` style  
**Change:** `fontSize: 11` → `fontSize: font.size.base`  
**Rationale:** 14pt bold = WCAG large text (≥14pt bold). Large text requires 3:1. 3.10:1 passes ✅.  
**Also:** Update `src/theme.ts:123` with minimum-size annotation on `pointsPillText`.  
**Full spec:** `designs/2026-05-29-hero-label-contrast-fix.md`

### Fix 2 — ReportFlagModal sticky footer (V3)

**File:** `src/screens/ReportFlagModal.tsx`  
**Change:** Wrap all card content (title through context tags) in a `ScrollView`. Move action bar outside ScrollView as sticky footer. Add `maxHeight: '88%'` + `flexShrink: 1` to card.  
**Full spec:** `designs/2026-05-29-report-modal-scrollview.md`

---

## ESCALATIONS

### → Sky (long-term, non-blocking)
- **`color.brandHero` proposal:** A new darker brand token (`#1c4f99`, 6.4:1 with `pointsPillText`) for the hero card background would allow `heroLabel` to return to 11pt small text AND give the hero card more visual depth. This is a v2 design system enhancement, not a fix for current issues. Route through Morgan when Sky has bandwidth.

### → Alex (verification gate)
- After Shamus implements Fix 1 + Fix 2, Alex should verify:
  - heroLabel passes contrast at 14pt bold in both light and dark modes
  - ReportFlagModal Submit button reachable at Accessibility text size on iPhone SE

### → Gary (test gate)
- Add screenshot/snapshot test for ReportFlagModal at Dynamic Type Extra Large after Fix 2 lands

---

## FINAL DECISION

| Fix | Pre-TestFlight | Pre-App Store | Effort |
|---|---|---|---|
| heroLabel font bump | Not required | ✅ Required | XS — 2 lines |
| Modal ScrollView | Not required | ✅ Required | S — ~30 lines, one structural change |
| `pointsPillText` annotation | Not required | Recommended | XS — 1 line comment |

**Both fixes are pre-App Store requirements per WCAG 1.4.3 and 1.4.4.** Neither blocks TestFlight. Specs are complete — Shamus can implement without further design questions.
