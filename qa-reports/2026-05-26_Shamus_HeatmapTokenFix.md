# Shamus — Heatmap Token Fix
**Date:** 2026-05-26  
**Branch:** feat/heatmap-severity-gradient-2026-05-25  
**Commit:** c55c0a5  
**Triggered by:** Dani Design Compiler BLOCK (9 token violations)

---

## Violations Fixed

### Fix 1 — `src/screens/MapScreen.tsx`: `heatDisclaimer` style block

| Line | Old (raw value) | New (token) |
|------|-----------------|-------------|
| `gap:` | `8` | `spacing.sm` |
| `marginTop:` | `8` | `spacing.sm` |
| `paddingHorizontal:` | `12` | `spacing.md` |
| `paddingVertical:` | `8` | `spacing.sm` |
| `backgroundColor:` | `'rgba(255,255,255,0.97)'` | `color.overlay` |
| `borderRadius:` | `10` | `radius.md` |
| `shadowColor/shadowOpacity/shadowRadius/shadowOffset/elevation` | raw shadow props | `...shadow.e1` (spread) |
| `heatDisclaimerIcon.fontWeight:` | `'700'` | `font.weight.bold` |
| `heatDisclaimerText.fontSize:` | `11` | `font.size.caption` |
| `heatDisclaimerText.lineHeight:` | `15` | `font.lineHeight.caption` |

Import updated from `import { radius } from '@/theme'` to `import { font, radius, shadow, spacing } from '@/theme'`.

### Fix 2 — `src/lib/heatmap.ts`: `heatColorForSeverity()`

Replaced all 5 hardcoded RGB triples (duplicated from the severity color ramp) with runtime reads from `severity[n].color` imported from `@/theme`. Added a `hexToRgb()` helper to parse the theme's `#rrggbb` strings into the `[r, g, b]` triples the piecewise interpolation needs.

| Anchor | Old | New |
|--------|-----|-----|
| severity 1 | `[0x27, 0xae, 0x60]` (hardcoded) | `hexToRgb(severityTokens[1].color)` |
| severity 2 | `[0x7f, 0xb8, 0x00]` (hardcoded) | `hexToRgb(severityTokens[2].color)` |
| severity 3 | `[0xf1, 0xc4, 0x0f]` (hardcoded) | `hexToRgb(severityTokens[3].color)` |
| severity 4 | `[0xe6, 0x7e, 0x22]` (hardcoded) | `hexToRgb(severityTokens[4].color)` |
| severity 5 | `[0xe7, 0x4c, 0x3c]` (hardcoded) | `hexToRgb(severityTokens[5].color)` |

The piecewise linear interpolation logic is unchanged — only the anchor source is tokenized.

### Fix 3 — `src/theme.ts`: `font.lineHeight.caption` token (new)

Added `lineHeight` sub-object to the `font` export using Dani's approved formula:

```ts
lineHeight: {
  caption: Math.round(11 * 1.4), // 15
},
```

This satisfies the `font.lineHeight.caption` reference in the `heatDisclaimerText` style above without introducing a raw literal.

---

## Typecheck Result

```
npm run typecheck → tsc --noEmit → PASS (no errors)
```

---

## Push Status

```
git push origin feat/heatmap-severity-gradient-2026-05-25
→ c55c0a5 pushed successfully
```

---

## Status: READY FOR DANI RE-COMPILE
