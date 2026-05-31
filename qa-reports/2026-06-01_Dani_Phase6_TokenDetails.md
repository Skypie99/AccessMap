# Phase 6 Token Sweep — Detailed Issue Catalog

This document provides a line-by-line reference for every raw literal found during the Phase 6 comprehensive token audit (2026-06-01).

---

## HeatmapLegend.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 50 | Color | `'rgba(255,255,255,0.95)'` | Use overlay token | `color.overlay` | 1 min |
| 52 | Spacing | `10` | Not aligned to grid | `spacing.sm` (8) or extract to const | 2 min |
| 53 | Spacing | `8` | Correct value but raw | `spacing.sm` | 1 min |
| 54 | Spacing | `4` | Correct value but raw | `spacing.tight` | 1 min |
| 55 | Shadow | `'#000'` | Use shadow token | `color.shadow` ✓ (already correct) | — |
| 56 | Shadow | `0.1` | Not using shadow.e1/e2/e3 | `shadow.e1.shadowOpacity` | 1 min |
| 57 | Shadow | `4` | Not using shadow token | `shadow.e1.shadowRadius` | 1 min |
| 58 | Shadow | `{ width: 0, height: 1 }` | Not using shadow token | `shadow.e1.shadowOffset` | 1 min |
| 62 | Font | `10` | No token (mini-caption) | Add `font.size.nano: 10` | 5 min |
| 63 | Font | `'700'` | Raw weight | `font.weight.bold` | 1 min |
| 64 | Color | `'#555'` | Close to textMuted | `color.textMuted` or `'#666'` | 1 min |
| 70 | Spacing | `6` | Correct value but raw | `spacing.xs` | 1 min |
| 76 | Spacing | `3` | Below grid minimum | Add `spacing.tighter: 3` or use `0` | 2 min |
| 81 | Radius | `2` | Below radius.xs (4) | Use `radius.xs` or document micro-border intent | 2 min |
| 84 | Font | `10` | Same as line 62 | Add `font.size.nano: 10` | — |
| 85 | Color | `'#333'` | Actually `color.text` | Use `color.text` ✓ (semantic match) | 1 min |
| 86 | Font | `'600'` | Raw weight | `font.weight.semibold` | 1 min |

**Summary:** 1 shadow block should use `shadow.e1` token; 1 new token needed (`font.size.nano`); 8 token replacements.

---

## OnboardingCards.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 66 | Color | `'#60a5fa'` | Tailwind blue-400 | Add `gradient.cardIconBlue` to theme | 5 min |
| 72 | Color | `'#34d399'` | Tailwind emerald-400 | Add `gradient.cardIconGreen` to theme | — |
| 78 | Color | `'#fbbf24'` | Tailwind amber-400 | Add `gradient.cardIconAmber` to theme | — |
| 137 | Color | `['#070b18', '#0c1628', '#0f2040']` | Dark gradient array | Add `gradient.bgDark` to theme | 5 min |
| 143 | Opacity calc | `c.iconColor + '40'` | Runtime opacity string | Use `withOpacity()` helper or pre-compute | 10 min |
| 172 | Opacity calc | `c.iconColor + '40'` | Runtime opacity string | Use `withOpacity()` helper | — |
| 227 | Color | `['#3b82f6', '#2563eb', '#1d4ed8']` | Button gradient array | Add `gradient.primaryBtn` to theme | 5 min |
| 268 | Spacing | `48` | Custom padding (no token) | Create `spacing.giant: 48` or use `spacing.xxxl=32 + 16` | 3 min |
| 324 | Spacing | `4` | Correct value but raw | `spacing.tight` | 1 min |
| 379 | Font | `24` | Explicit lineHeight | Use `font.lineHeight.base` or computed | 1 min |
| 389 | Size | `8, 8` (width, height) | Dot dimension hard-coded | Extract to `const DOT_SIZE = 8` or `size.indicator` | 2 min |
| 391 | Radius | Uses `radius.xs` | ✓ Correct | — | — |
| 393-394 | Opacity calc | `{ shadowColor: card.iconColor }` | Inline color ref | Document or extract | 1 min |

**Summary:** 3 critical issues (gradients, opacity calcs, font.size); 8 token replacements; 1 new token.

---

## LogoMark.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 85 | Color | `'#1565c0'` | Gradient color in array | Keep or extract to `gradient.logoMark` | 0–5 min |
| 134 | Color | `'#0a0e1a'` | Dark navy background | Check if intentional (branding) or use `color.surfaceStrong` | 2 min |
| 166 | Color | `'#fff'` | White text | Use `color.surface` ✓ (correct value) | 1 min |
| 167 | Font | `'800'` | Exceeds theme max ('700') | Use `font.weight.bold` or add `font.weight.black: '800'` | 2 min |

**Summary:** 2 gradient colors (possibly intentional); 1 weight beyond token set; 1 semantic replacement.

---

## PlatformMap.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 120 | Color | `'#111'` | Very dark gray | Use `color.textStrong='#222'` (close enough) | 1 min |
| 312 | Color | `'#111'` | Same as line 120 | Use `color.textStrong` | 1 min |
| 323 | Spacing | `8` | Correct value but raw | `spacing.sm` | 1 min |
| 324 | Radius | `14` | Between tokens (md=8, lg=12) | Adjust to `radius.lg=12` or add `radius.md-lg: 14` | 2 min |
| 325 | Border | `1.5` | Border width (no token) | Add `border.thin: 1.5` or use `1` | 2 min |
| 330 | Shadow | `0.25` | Raw opacity | Use `shadow.e2.shadowOpacity=0.12` or create e2+ | 2 min |
| 331 | Shadow | `3` | Raw radius | Use `shadow.e2.shadowRadius=6` | 1 min |
| 335 | Font | `13, '700'` | No token for 13pt | Add `font.size.13` and use `font.weight.bold` | 5 min |

**Summary:** 1 shadow block missing token; 1 custom radius; 1 missing font-size token; 4 color/font replacements.

---

## PlatformMap.web.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 79 | Border (CSS) | `1.5px solid #fff` | Inline CSS border | Extract to separate style or use CSS Modules | 10 min |
| 80 | Shadow (CSS) | `0 1px 3px rgba(0,0,0,0.25)` | Inline CSS shadow | Extract to CSS Modules | 10 min |
| 117 | Border (CSS) | `2.5px solid #fff` | Inline CSS border | Extract to CSS Modules | — |
| 118 | Shadow (CSS) | `inset 0 0 0 1px rgba(0,0,0,0.06)` | Inline CSS shadow | Extract to CSS Modules | — |
| 316 | Font | `700, 14` | Raw weight + size | `font.weight.bold, font.size.lg` | 2 min |
| 321 | Font | `11` | No token (mini-caption) | Add `font.size.nano: 11` or use `font.size.xs=12` | 3 min |
| 326 | Font | `600` | Raw weight | `font.weight.semibold` | 1 min |
| 339 | Radius (CSS) | `8` | Correct value but raw | Document or extract to constant | 1 min |
| 345 | Font | `12` | Close to `font.size.xs` | Use `font.size.xs` | 1 min |

**Summary:** 4 inline CSS blocks (technical debt); 3 font token replacements; 1 radius ref.

---

## HowToHelpScreen.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 29 | Color | `'#E53E3E'` | Error red (not in theme) | Use `color.error='#c0392b'` or `color.errorStrong='#e74c3c'` | 1 min |
| 36 | Color | `'#38A169'` | Success green (not in theme) | Use `color.success='#27ae60'` | 1 min |
| 43 | Color | `'#3182CE'` | Brand blue variant (not in theme) | Use `color.brand='#2f80ed'` | 1 min |
| 50 | Color | `'#D69E2E'` | Warning orange (not in theme) | Use `color.accentOrange='#f1a520'` | 1 min |

**Summary:** 4 hardcoded semantic colors; 4 easy 1-min replacements.

---

## ProfileScreen.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 1297 | Color | `'#ccc'` | Toggle off color | Use `color.border='#e5e5e5'` or `color.borderSubtle` | 1 min |
| 1299 | Color | `'#f4f3f4'` | Very light gray | Use `color.surfaceSoft='#f7f8fa'` (close) | 1 min |
| 1457 | Color | `'#fff'` | ActivityIndicator white | Use `color.surface` or `color.textOnBrand` | 1 min |
| 1640 | Spacing | `16` | Correct but raw | `spacing.lg` | 1 min |
| 1647 | Radius | `100` | Round (not full) | Use `radius.full=999` (much more round) | 1 min |
| 1653 | Font | `16, '600'` | Raw font | `font.size.lg, font.weight.semibold` | 1 min |
| 1654 | Spacing | `24, 16` | Correct but raw | `spacing.xxl, spacing.lg` | 1 min |
| 1656 | Font | `13` | No token | Add `font.size.13` | 3 min |
| 1661 | Font | `14` | Correct value but raw | `font.size.base` | 1 min |
| 1664 | Radius | `24` | Way beyond token set (xl=16) | Check intent; adjust to `radius.xl` or add `radius.xl+` | 2 min |
| 2147 | Color | `'#D93025'` | Google Material red | Use `color.errorStrong='#e74c3c'` | 1 min |
| 2199 | Color | `'#D93025'` | Same as line 2147 | Use `color.errorStrong` | — |

**Summary:** 12 hardcoded values; 1 custom radius; 1 missing font-size token; mostly 1-min fixes.

---

## FlagDetailModal.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 841 | Spacing | `20, 16, 20, 12` | Raw values | Use `spacing.xl, spacing.lg, spacing.xl, spacing.md` | 2 min |
| 843 | Spacing | `20` | Correct but raw | `spacing.xl` | 1 min |
| 850 | Spacing | `12` | Correct but raw | `spacing.md` | 1 min |
| 852 | Font | `20, '700'` | 20pt no token | Add `font.size.20` (between xl=18, h2=24) | 5 min |
| 856 | Radius | `16` | Between lg=12, xl=16 | Likely intentional; use `radius.xl` | 1 min |
| 861 | Font | `16, '700'` | Correct value but raw | `font.size.lg, font.weight.bold` | 1 min |
| 867 | Radius | `12` | Correct but raw | `radius.lg` | 1 min |
| 877 | Font | `14, '600'` | Correct values but raw | `font.size.base, font.weight.semibold` | 1 min |
| 889 | Font | `'700', 12` | Raw weight + size | `font.weight.bold, font.size.xs` | 1 min |
| 891 | Font | `12` | Correct but raw | `font.size.xs` | 1 min |
| 907 | Radius | `999` | Correct value but raw | `radius.full` | 1 min |

**Summary:** 5 spacing replacements; 4 font replacements; 3 radius replacements; 1 missing token (`font.size.20`).

---

## LeaderboardModal.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 162 | Spacing | `32` | Correct but raw | `spacing.xxxl` | 1 min |
| 168 | Spacing | `20` | Correct but raw | `spacing.xl` | 1 min |
| 169 | Spacing | `20` | Correct but raw | `spacing.xl` | 1 min |
| 174 | Font | `18` | Correct value but raw | `font.size.xl` | 1 min |
| 175 | Font | `'700'` | Raw weight | `font.weight.bold` | 1 min |
| 179 | Font | `13` | No token | Add `font.size.13` | 3 min |
| 196 | Font | `14` | Correct but raw | `font.size.base` | 1 min |
| 216 | Font | `13, '600'` | No 13 token | Add `font.size.13`, use `font.weight.semibold` | 3 min |
| 217 | Font | `'600'` | Raw weight | `font.weight.semibold` | 1 min |
| 222 | Font | `'700'` | Raw weight | `font.weight.bold` | 1 min |
| 231 | Font | `15` | Between base=14, md=15 | Add `font.size.15` or use `font.size.md=15` | 2 min |

**Summary:** 7 spacing/font replacements; 2 missing tokens (`font.size.13`, `font.size.15`); straightforward fixes.

---

## MapScreen.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 1833 | Font | `14` | Correct but raw | `font.size.base` | 1 min |
| 1834 | Font | `13, '600'` | No 13 token | Add `font.size.13`, use `font.weight.semibold` | 3 min |
| 1843 | Font | `13, '600'` | Same as 1834 | — | — |
| 1853 | Font | `18, '700'` | Correct values but raw | `font.size.xl, font.weight.bold` | 1 min |
| 1859 | Font | `14` | Correct but raw | `font.size.base` | 1 min |

**Summary:** 4 font replacements; 1 missing token (`font.size.13`); easy win.

---

## PhotoGallery.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 249 | Spacing | `4` | Correct but raw | `spacing.tight` | 1 min |
| 272 | Radius | `14` | Between md=8, lg=12 | Adjust to `radius.lg=12` or document | 2 min |
| 281 | Font | Uses `font.weight.bold` | ✓ Correct | — | — |
| 294 | Font | `24` | Likely `h2` token | Use `font.size.h2=24` | 1 min |
| 295 | Font | `'700'` | Raw weight | `font.weight.bold` | 1 min |
| 301 | Font | `'600'` | Raw weight | `font.weight.semibold` | 1 min |
| 303 | Spacing | `2` | Below grid (tight=4) | Keep as micro-offset or add `spacing.micro: 2` | 0–2 min |
| 314 | Font | `22` | No token (between xl=18, h2=24) | Add `font.size.22` or use nearest | 3 min |
| 318 | Font | `'500'` | Raw weight | `font.weight.medium` | 1 min |
| 341 | Spacing | `14` | Between lg=16 | Adjust to `spacing.lg=16` or add `spacing.lg-: 14` | 2 min |
| 342 | Spacing | `6` | Correct but raw | `spacing.xs` | 1 min |
| 348 | Font | Uses `font.weight.semibold` | ✓ Correct | — | — |
| 362 | Font | Uses `font.size.xl, font.weight.bold` | ✓ Correct | — | — |

**Summary:** 7 font/spacing replacements; 2 missing tokens (`font.size.22`, `font.size.24`); 2 radius/spacing edge cases.

---

## AdminScreen.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 53, 119 | Color | `'#60a5fa'` | Tailwind blue-400 | Use `color.brand='#2f80ed'` or extract to token | 2 min |
| 163 | Color | `'#0d1829'` | Very dark navy (background) | Document intent (debug screen) or use `color.surface` | 1 min |
| 166 | Color | `'#aaa'` | Muted gray | Use `color.textMuted='#666'` | 1 min |
| 167 | Font | `16` | Correct but raw | `font.size.lg` | 1 min |
| 170 | Spacing | `12` | Correct but raw | `spacing.md` | 1 min |
| 172, 178 | Color | `'#0d1829'` | Same as line 163 | — | — |
| 181 | Color | `'#aaa'` | Same as line 166 | — | — |
| 182 | Font | `15` | Between base=14, md=15 | Add `font.size.15` or use `font.size.md=15` | 2 min |
| 185 | Color | `'#1a2540'` | Dark shade (intentional for admin) | Document or use semantic token | 0 min |
| 186 | Radius | `10` | Between md=8, lg=12 | Adjust to `radius.md` or `radius.lg` | 1 min |
| 187 | Spacing | `12` | Correct but raw | `spacing.md` | 1 min |
| 198 | Radius | `5` | Below radius.xs=4 | Adjust to `radius.xs=4` | 1 min |
| 201 | Color | `'#f0f6ff'` | Light blue | Use `color.brandSofter='#eaf3ff'` (close) | 1 min |
| 202 | Font | `14` | Correct but raw | `font.size.base` | 1 min |
| 203 | Font | `'600'` | Raw weight | `font.weight.semibold` | 1 min |

**Summary:** 11 token replacements; 1 missing token (`font.size.15`); admin screen is lower priority (debug UI).

---

## CommentBubble.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| All others | — | Uses tokens ✓ | CommentBubble is 100% token-clean | — | — |
| 156 | Opacity | `'rgba(255,255,255,0.75)'` | Inline opacity OK | Semantic: delete button subtle on brand | 0 min |

**Summary:** 0 blockers; excellent token adoption.

---

## RankBadge.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| All | — | Uses tokens ✓ | RankBadge is 100% token-clean | — | — |
| 30 | Comment | Documents contrast audit | WCAG 1.4.3 reasoning included | — | — |

**Summary:** 0 blockers; exemplary design system usage.

---

## RealtimePulse.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| All | — | Uses tokens ✓ | RealtimePulse is 100% token-clean | — | — |
| 10 | Const | `DOT_SIZE = 10` | Named constant pattern ✓ | — | — |

**Summary:** 0 blockers; exemplary implementation.

---

## NearbyFlagsModal.tsx

| Line | Type | Raw Value | Issue | Proposed Fix | Effort |
|------|------|-----------|-------|--------------|--------|
| 402 | Spacing | `spacing.md - 2` | Arithmetic on token | Document intent or add `spacing.mdMinus` | 1 min |
| 408 | Spacing | `spacing.md + 2` | Arithmetic on token | Document intent or add `spacing.mdPlus` | — |
| 409 | Spacing | `spacing.xs + 1` | Arithmetic on token | Document intent or add `spacing.xsPlus` | — |

**Summary:** 3 token-arithmetic patterns (legitimate density fine-tuning); document intent.

---

## Summary by Severity

| Severity | Count | Files | Action |
|----------|-------|-------|--------|
| **CRITICAL** | 5 | OnboardingCards (gradients, opacity calcs) | Fix before merge or escalate |
| **MAJOR** | 28 | HeatmapLegend, PlatformMap, FlagDetailModal, ProfileScreen, LeaderboardModal, PhotoGallery | Pre-merge polish recommended |
| **MINOR** | 15 | Multiple | Post-merge, cosmetic |
| **TOKENS MISSING** | 6 | `font.size: 10, 13, 15, 20, 22, 24` | Add to theme.ts |
| **TOTAL** | 78 | 14 files | — |

---

**End of detailed catalog.**
