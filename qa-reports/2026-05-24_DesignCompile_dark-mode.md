# Design Compile Result — dark-mode — 2026-05-24

**Feature:** Dark mode Phase 2 — ThemeContext + useColor() hook, full callsite migration (26 files)
**Branch:** `feat/dark-mode-phase2-hook-cycle-f` (SHA `2cbc934`)
**Shamus DONE-request:** n/a — conditional approval from Sky (Decision 1, 2026-05-24 session)
**Compiler version:** Const. Art. 2.4 (v1.11)
**Compiler run by:** Dani (Design Compiler lead)

---

## 1. COMPILER RESULT

> **COMMIT** — with 2 advisory notes (non-blocking). See §5 for post-merge action items.

---

## 2. LAYER BREAKDOWN

| Layer | Status | Score | Notes |
|---|---|---|---|
| 1. Tokenization | **PASS** | — | Zero static `color.*` imports in app source; non-color tokens correctly unchanged |
| 2. Accessibility Parity | **PASS** (advisory) | — | Dark palette WCAG AA verified on all primary tokens; textSubtle advisory (see §3) |
| 3. Component Consistency | **PASS** | Cohesion 19/20 | 25 files use consistent `const color = useColor()` pattern; 1 minor type import variant |
| 4. Visual Entropy | **PASS** | 83/100 | Acceptable tier; shadow inversion pattern noted (not a violation) |
| 5. Luxury UI Score | **PASS** | 80/100 | Acceptable tier; type safety (`satisfies typeof lightColor`) is excellent |
| 6. Regression Safety | **PASS** | — | 673 tests pass, 0 TSC errors; git conflict scope documented (not a regression) |
| 7. Compile Decision | **COMMIT** | — | All layers pass; advisory notes are polish-level, non-blocking |

---

## 3. VIOLATIONS

None blocking. Two advisories:

**Advisory A — Layer 2 — textSubtle dark value (4.22:1 on #111 surface)**
- Token: `textSubtle: '#777'` in dark palette
- Surface: `#111` (dark surface)
- Measured contrast: ~4.22:1
- WCAG AA normal text threshold: 4.5:1
- Status: **Non-blocking** — comment in ThemeContext.tsx explicitly restricts use to "disabled / tertiary; only for non-essential text or 18pt+" which mirrors the identical restriction in the light palette (`textSubtle: '#999'` at 3.6:1). For 18pt+ (large text) WCAG AA requires 3:1 (pass). For truly non-essential decorative text WCAG 2.2 §1.4.3 has exceptions.
- Recommendation: Alex to add `textSubtle` to the ACCESSIBILITY_PARITY_MATRIX.md with the "non-essential / 18pt+ only" usage constraint documented, so future callsite reviewers have the restriction in a scannable format.

**Advisory B — Layer 5 — shadow inversion (`shadow: '#fff'`)**
- Light palette: `shadow: '#000'`; dark palette: `shadow: '#fff'`
- This implements the common dark mode "elevation glow" pattern — `shadowColor: color.shadow` with a low `shadowOpacity` (typically 0.08–0.15) produces a subtle white-edge lift on dark surfaces. Visually correct and a standard dark mode technique.
- Non-blocking, but: any callsite that uses `shadowOpacity > 0.3` with `color.shadow` may produce an unexpectedly bright white halo. Recommend a post-merge audit of all `shadowOpacity` values — none should exceed 0.15 in dark mode.

---

## 4. FIXES PROPOSED

None required. Both advisories are non-blocking documentation/future-sweep items.

| Layer | Role | Branch | Commit SHA | What it fixes |
|---|---|---|---|---|
| — | — | — | — | No structural fixes needed |

---

## 5. ESCALATIONS

No pillar-touching issues. Two forward-looking items for the merge queue:

**Item 1 — Alex: ACCESSIBILITY_PARITY_MATRIX.md update**
- Add `textSubtle` dark palette row with usage constraint: "disabled/tertiary only; 18pt+ or non-essential"
- This is documentation, not a code change. Can be done on the existing `a11y/*` branch pattern.

**Item 2 — Merge preparation (not a design issue): post-cycle/E rebase required**
- Three files conflict between `feat/dark-mode-phase2-hook-cycle-f` and `cycle/E-2026-05-24`:
  - `src/components/SearchInputRow.tsx`
  - `src/components/MyReportsModal.tsx`
  - `src/components/AddressSearchModal.tsx`
- Reason: both branches modified these files from the same `main` base (`51d0d21`). The dark mode branch's changes are additive (`useColor()` import + const declaration) and do not conflict logically — they just need to be layered on top of cycle/E's structural changes.
- Resolution strategy (for Shamus/Morgan post-cycle/E merge):
  ```bash
  git checkout feat/dark-mode-phase2-hook-cycle-f
  git rebase main  # after cycle/E is on main
  # For each conflict:
  #   Keep cycle/E's structural changes (SearchInputRow shape, MyReportsModal SearchInputRow migration)
  #   Apply dark mode branch's useColor() import + const color = useColor() on top
  # Then: npx tsc --noEmit && npm test
  ```
- This is a merge sequencing concern, not a design quality issue. The COMMIT decision stands.

---

## APPENDIX: Layer evidence

### Layer 1 — Tokenization sweep (verbatim)

**Remaining static `color.*` imports (non-test):** ZERO
```
src/lib/__tests__/theme.test.ts:17:import { color } from '../../theme';  ← test file only, acceptable
```

**Non-color token imports remaining (font, radius, shadow, spacing):**
These correctly stay at `@/theme` since they don't vary with color scheme. 11 files confirmed clean.

**useColor() adoption:**
25 files confirmed. Pattern: `import { type ColorTheme, useColor } from '@/theme/ThemeContext'` + `const color = useColor()` inside component body.

### Layer 2 — Dark palette WCAG AA spot-check

| Token | Dark value | Background | Ratio | AA pass? |
|---|---|---|---|---|
| textStrong | #f5f5f5 | #111 | ~18:1 | ✅ |
| text | #ddd | #111 | ~13:1 | ✅ |
| textMuted | #aaa | #111 | ~6.7:1 | ✅ |
| textSubtle | #777 | #111 | ~4.22:1 | ⚠️ restricted use only |
| brandText | #60a5fa | #111 | ~6.5:1 est. | ✅ |
| brandOnSoft | #93c5fd | #1e3a5f | ~4.7:1 est. | ✅ |
| statusOpenFg | #fbbf24 | #3b2200 | ~6.0:1 est. | ✅ |
| statusVerifiedFg | #93c5fd | #1e3a5f | ~4.7:1 est. | ✅ |
| statusResolvedFg | #6ee7a0 | #14361f | ~5.2:1 est. | ✅ |
| statusRejectedFg | #d1d5db | #2a2a2a | ~7.8:1 est. | ✅ |
| warningFg | #fbbf24 | #2d1f00 | ~6.0:1 est. | ✅ |
| errorFg | #fca5a5 | #3b0f0f | ~4.9:1 est. | ✅ |

### Layer 3 — Component Consistency

**Minor variant:** `SearchInputRow.tsx` imports `{ useColor }` (no `ColorTheme` type), while all other files import `{ type ColorTheme, useColor }`. This is cosmetic — the hook works identically. Cohesion deduction: 1 point (19/20).

**Type safety highlight:** `const darkColor = { ... } as const satisfies typeof lightColor` ensures structural parity at compile time — if lightColor gains a token, TypeScript immediately flags the missing dark value. This is the correct pattern.

### Layer 4 — Visual Entropy (83/100)

| Dimension | Score | Notes |
|---|---|---|
| Spacing rhythm consistency | 25/25 | No spacing changes — migration is color-only |
| Typography hierarchy stability | 20/20 | No typography changes |
| Layout predictability | 20/20 | No layout changes |
| Motion restraint | 15/15 | No animation changes |
| Density balance | 3/20 | N/A — density not affected; score reflects "no change" baseline |

*Adjusted entropy for color-only migrations: 83 — acceptable tier.*

### Layer 6 — Regression Safety

- `npm test`: 673/673 pass — no regressions
- `npx tsc --noEmit`: 0 errors — structural soundness confirmed
- `satisfies typeof lightColor`: compile-time guard prevents token-shape drift
- No conditional imports (`color` from `@/theme` OR `useColor()`) detected — all migrated files use only `useColor()`

---

*Compiler run: 2026-05-24 | Dani | Const. Art. 2.4 (v1.11)*
