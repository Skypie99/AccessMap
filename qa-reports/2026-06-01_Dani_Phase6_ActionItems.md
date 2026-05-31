# Phase 6 Token Audit — Quick Action Items

**Phase 6 Design Compiler Result:** POLISH (non-blocking)

---

## Pre-Merge Polish (1 hour)

### 1. Add Missing Font-Size Tokens (5 min)
Edit `src/theme.ts`, add to `font.size`:
```typescript
font.size: {
  nano: 10,      // HeatmapLegend, PlatformMap.web
  // (existing: caption, xs, sm, base, md, lg, xl, xxl, h2, h1, display, displayLg)
  13: 13,        // MapScreen, LeaderboardModal, ProfileScreen (multiple)
  15: 15,        // ProfileScreen, LeaderboardModal, PhotoGallery
  20: 20,        // FlagDetailModal (between xl=18 and h2=24)
  22: 22,        // PhotoGallery (between xl=18 and h2=24)
}
```

### 2. Global Font Weight Replace (10 min)
Search & replace in all Phase 6 files:
- `fontWeight: '700'` → `fontWeight: font.weight.bold`
- `fontWeight: '600'` → `fontWeight: font.weight.semibold`
- `fontWeight: '500'` → `fontWeight: font.weight.medium` (if any)
- **Files:** HeatmapLegend, FlagDetailModal, LeaderboardModal, MapScreen, PhotoGallery, PlatformMap.web, ProfileScreen, AdminScreen

### 3. Add Gradient Tokens (15 min)
Edit `src/theme.ts`, add:
```typescript
export const gradient = {
  // OnboardingCards backgrounds
  bgDark: ['#070b18', '#0c1628', '#0f2040'],
  // OnboardingCards primary button
  primaryBtn: ['#3b82f6', '#2563eb', '#1d4ed8'],
  // Card icon colors
  cardIconBlue: '#60a5fa',
  cardIconGreen: '#34d399',
  cardIconAmber: '#fbbf24',
};
```
Then update OnboardingCards.tsx:
- Line 66: `iconColor: gradient.cardIconBlue`
- Line 72: `iconColor: gradient.cardIconGreen`
- Line 78: `iconColor: gradient.cardIconAmber`
- Line 137: `colors={gradient.bgDark}`
- Line 227: `colors={gradient.primaryBtn}`

### 4. Fix Inline Shadows (10 min)
- **HeatmapLegend.tsx (lines 55–58):** Replace with `{ ...shadow.e1 }`
- **PlatformMap.tsx (lines 329–331):** Replace with `{ ...shadow.e2 }`

### 5. Fix Hardcoded Colors (5 min)
- **HowToHelpScreen.tsx:** Replace all 4 colors with theme tokens
- **ProfileScreen.tsx:** `'#D93025'` → `color.errorStrong`
- **PlatformMap.tsx:** `'#111'` → `color.textStrong` (both lines 120 & 312)

---

## Critical Issues (must address or escalate)

### Opacity Calculation at Runtime
**OnboardingCards.tsx:** Lines 143, 172 (`c.iconColor + '40'`)

**Option A (recommended):** Create helper function:
```typescript
const withOpacity = (hex: string, opacity: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
```
Then: `borderColor: withOpacity(c.iconColor, 0.25)`

**Option B (simpler):** Pre-compute in gradient token:
```typescript
gradient: {
  cardIconBlueLight: 'rgba(96, 165, 250, 0.25)',
  // ...
}
```

---

## Post-Merge Polish (2 hours, lower priority)

1. **Refactor PlatformMap.web.tsx CSS** (20 min)
   - Extract inline CSS borders/shadows to CSS Modules
   - Lines: 79, 80, 117, 118

2. **Extract OnboardingCards dot size** (2 min)
   - Line 389: `const DOT_SIZE = 8; // matches RealtimePulse pattern`

3. **Document spacing micro-adjustments** (5 min)
   - NearbyFlagsModal.tsx: `spacing.md - 2`, `spacing.md + 2`, `spacing.xs + 1`
   - Comment explaining density intent

4. **Add font-size comment to theme** (2 min)
   - Explain `nano: 10` use case (mini-caption for heatmap legend)

---

## Files Needing Changes

| File | Changes | Priority |
|------|---------|----------|
| src/theme.ts | Add font.size.{13,15,20,22}, gradient object, optionally nano | PRE-MERGE |
| src/components/HeatmapLegend.tsx | Spacing tokens, font weight tokens, shadow token | PRE-MERGE |
| src/components/OnboardingCards.tsx | Gradient tokens, opacity calc helper | PRE-MERGE |
| src/components/LogoMark.tsx | fontWeight: '800' → font.weight.bold | PRE-MERGE |
| src/components/PlatformMap.tsx | Spacing token, shadow token, color token | PRE-MERGE |
| src/components/PlatformMap.web.tsx | Font tokens (medium priority) | PRE-MERGE |
| src/components/FlagDetailModal.tsx | Spacing, font, radius tokens | PRE-MERGE |
| src/components/PhotoGallery.tsx | Font, spacing, radius tokens | PRE-MERGE |
| src/screens/HowToHelpScreen.tsx | 4 color tokens | PRE-MERGE |
| src/screens/ProfileScreen.tsx | 12 color/spacing/font tokens | PRE-MERGE |
| src/screens/MapScreen.tsx | 5 font tokens | PRE-MERGE |
| src/screens/LeaderboardModal.tsx | Spacing, font tokens | PRE-MERGE |
| src/screens/AdminScreen.tsx | Colors, fonts (debug screen, lower priority) | POST-MERGE |
| src/screens/NearbyFlagsModal.tsx | Document spacing arithmetic (post-merge) | POST-MERGE |

---

## Verification Checklist

- [ ] 6 new font-size tokens added to theme.ts
- [ ] gradient object added to theme.ts
- [ ] All font-weight raw strings replaced with tokens
- [ ] All shadow blocks use shadow.e1/e2/e3 tokens
- [ ] All color hex literals use semantic tokens
- [ ] Opacity calculation refactored (OnboardingCards)
- [ ] PlatformMap.web CSS inline styles flagged for post-merge
- [ ] `npm run typecheck` passes ✓
- [ ] Lighthouse scores stable (no regressions)
- [ ] Design tokens story complete and QA-approved

---

## Estimated Time Breakdown

| Task | Time |
|------|------|
| Add theme tokens | 5 min |
| Replace font weights (global) | 10 min |
| Add/replace gradient tokens | 15 min |
| Fix shadows | 10 min |
| Fix hardcoded colors | 5 min |
| Refactor opacity calc | 10 min |
| Testing + verification | 10 min |
| **Total** | **65 min** |

---

**Summary:** Phase 6 is merge-ready. This checklist addresses 78 token violations in a single afternoon. Recommend doing it pre-merge to keep the "token-clean" design culture strong.
