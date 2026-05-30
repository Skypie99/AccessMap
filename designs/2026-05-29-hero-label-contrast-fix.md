# Design Spec — Hero Label Contrast Fix
**Date:** 2026-05-29  
**Author:** Dani (Design Compiler — Layer 1 token audit + Layer 5 WCAG gate)  
**Triggered by:** Alex Phase 3 A11y Parity Matrix · WCAG 1.4.3 fail  
**File:** `src/screens/ProfileScreen.tsx` · `heroLabel` style  
**Branch for implementation:** `a11y/phase3-polish` (or the security merge branch that carries Phase 3 fixes)

---

## 1. The Problem

### Contrast calculation (verified)

| Token | Value | WCAG luminance |
|---|---|---|
| `color.pointsPillText` | `#dbe7fb` | L = 0.792 |
| `color.brand` (hero background) | `#2f80ed` | L = 0.222 |

**Contrast ratio: 3.10:1**

WCAG 1.4.3 requirement:
- Small text (< 14pt bold, < 18pt regular): **4.5:1 minimum**
- Large text (≥ 14pt bold OR ≥ 18pt regular): **3.0:1 minimum**

`heroLabel` is currently `fontSize: 11, fontWeight: '700'` → **small text** → needs 4.5:1 → **FAILS** (3.10:1).

### Token drift violation (secondary)
`fontSize: 11` is a raw value. The correct token is `font.size.caption = 11` from `src/theme.ts:164`. This is a Layer 1 token violation — exists independently of the contrast failure.

---

## 2. Why the easy fixes don't work

### Can we just swap to white (#fff)?
`#fff` on `#2f80ed` = 3.87:1 → still fails 4.5:1 for small text.

### Can we darken `pointsPillText`?
No light color achieves 4.5:1 against `#2f80ed`. The math ceiling: for ANY lighter-than-background text, max achievable ratio ≈ 3.87:1 (pure white). You'd need a dark text color (L < 0.010, close to black) to hit 4.5:1 — completely wrong for the white-on-blue hero card.

### Can we change `color.brand` to something darker?
`color.brand = #2f80ed` is used in 40+ places — buttons, FABs, chip fills, filter pills. Changing the root token would require a full re-test. Appropriate for a future v2 brand audit, not a targeted a11y fix.

---

## 3. The fix: promote to large text

The minimum-change solution that resolves WCAG 1.4.3 without touching any other token:

**Bump `fontSize` from 11 → `font.size.base` (14pt)**

At 14pt bold:
- WCAG definition: "large-scale text" = ≥ 14pt **bold** ✅ (fontWeight '700' is bold)
- Required ratio: 3.0:1
- Actual ratio: 3.10:1 → **PASSES** ✅

### Why 14pt bold (not 12pt or 13pt)
- 12pt bold: not large text → needs 4.5:1 → still fails
- 13pt bold: not large text → needs 4.5:1 → still fails  
- 14pt bold: large text threshold → needs 3.0:1 → 3.10:1 passes ✅

The jump from 11 to 14 is the smallest possible token-aligned size that achieves compliance.

---

## 4. Visual assessment

The "POINTS" eyebrow label at 14pt + uppercase + `letterSpacing: 2.4` will read as a comfortably legible micro-header. The wide tracking and all-caps treatment create enough visual distinction from the 56pt points value that there's no hierarchy confusion. If anything, 11pt on a 375pt-wide phone screen at arm's length is borderline unreadable — 14pt is the better UX choice regardless of WCAG.

Before and after, visually:
- **Before:** `11pt BOLD UPPERCASE POINTS` (tracked wide) — small, feels fine at normal DPI, becomes muddy at 2x+ or on older screens
- **After:** `14pt BOLD UPPERCASE POINTS` (same tracking) — legible, still clearly secondary to the 56pt number

**Verdict: improve as well as fix — not a tradeoff.**

---

## 5. Token documentation update (required alongside code change)

Add minimum-size annotation to `pointsPillText` in `src/theme.ts`:

```ts
// BEFORE
pointsPillText: '#dbe7fb', // light-blue label on brand-blue background

// AFTER
pointsPillText: '#dbe7fb', // light-blue label on brand-blue bg
                           // 3.10:1 on color.brand — large text (≥14pt bold) only
                           // Do NOT use at fontSize < 14pt bold — will fail WCAG 1.4.3
```

---

## 6. Implementation instructions for Shamus

**File:** `src/screens/ProfileScreen.tsx`  
**Style:** `heroLabel` (approximately line 1576)

Change exactly this:
```ts
// BEFORE (two violations: raw value + WCAG fail)
heroLabel: {
  color: color.pointsPillText,
  fontSize: 11,                    // ← raw value (use font.size token) + too small for brand bg
  letterSpacing: 2.4,
  fontWeight: font.weight.bold,
  textTransform: 'uppercase',
},

// AFTER
heroLabel: {
  color: color.pointsPillText,
  fontSize: font.size.base,        // 14pt — large text threshold, 3.10:1 WCAG AA pass
  letterSpacing: 2.4,
  fontWeight: font.weight.bold,
  textTransform: 'uppercase',
},
```

Also update `src/theme.ts` line 123 with the comment annotation above.

**Import addition needed:** `font` must be imported in ProfileScreen.tsx if not already present.  
Check: `import { ..., font, ... } from '@/theme';`

**Verification:** `npm run typecheck` → must pass. No visual regression test needed (additive size change only).

---

## 7. Long-term proposal (not blocking, Sky decision)

For v2: introduce `color.brandHero: '#1c4f99'` as a dedicated hero-surface token. `#1c4f99` on `#dbe7fb` = 6.4:1 — passes 4.5:1 even at 11pt small text. This would:
- Allow the "POINTS" eyebrow to stay at the classic 11pt eyebrow size
- Give the hero card more visual depth (richer, less washed-out blue)
- Keep `color.brand` (#2f80ed) for interactive elements where the lighter blue is preferred

This is a design system enhancement proposal, not a bug fix. Route through Sky/Morgan when appetite exists.
