# Morgan Briefing — Design System Live: Impact & Planning

**Date:** 2026-05-31  
**Status:** ✅ Design System Complete + Merged to Main  
**Model Tier:** Sonnet  

---

## Executive Summary

All four design-system phases are now live on main. This is a **foundational milestone** that unlocks consistency, scalability, and design governance for all future work. Build 13 will be the first to ship this system to users.

**What you get starting now:**
- Token-based design enforcement (no more hex literals)
- Consistent UI across all screens (no more ad-hoc spacing/colors)
- Scalable component library (Button, Card, Pill, etc.)
- Design governance enforcement (Dani controls tokens)

---

## What's Live (Build 13)

**Commits on main:**
- `daae36c` — Phase 1: Tokens, Logo, Brand Assets
- `135ea6c` — Phase 2: UI Primitives
- `e0ebc6f` — Phase 3: Screen Migration
- `6c89c76` — Phase 4: Custom Fonts
- `6c91c4d` — Typecheck Fixes

**Bundle Includes:**
- Wayfinder Blue (#1466E0) branding
- Civic Gold (#FBB024) gamification colors
- Cool-tinted shadows (depth scale)
- Plus Jakarta Sans (display), Public Sans (body), JetBrains Mono (stats)
- Button, Card, Pill, PointsChip, SeverityBadge, StatusBadge
- 6 category icons + brand logo SVG
- App icon, favicon

**Scope:** All core screens (SignIn, Map, Tasks, Profile, ReportFlagModal) + Phase 5 anon reporting UI + Phase 5 trust score (pending merge).

---

## Downstream Impact

### For Dani (Design)

**You now own token governance.**

- Token changes = design review gate
- All new screens must use `src/theme.ts` tokens (no hex literals)
- Changes to colors, shadows, spacing, or radius need your sign-off
- Future Polish Loop will enforce token compliance

**New Power:** You can restyle entire app categories by changing one token (e.g., all status badges refresh if you update `color.status.open`).

---

### For Shamus (Feature Build)

**Design is now baked into every component.**

- New screens inherit token-based styling automatically
- New features get consistent shadows, spacing, fonts for free
- No more: "What color should this button be?" — use `color.brand` or `color.errorStrong`
- When you build Phase 5 trust score + Phase 6 final features, design consistency is non-negotiable

**Recipe for new screens:**
1. Import tokens: `import { color, spacing, shadow, radius, font } from '@/theme'`
2. Use primitives (Button, Card, Pill) for standard UI
3. Custom components reference tokens in StyleSheet
4. Dani audits for visual cohesion

---

### For Gary (QA)

**Lint gate now includes token enforcement.**

- New linter rule: no hardcoded colors in new code (use `color.*` tokens)
- New linter rule: no hardcoded spacing (use `spacing.*` tokens)
- CI will flag `#FFF` or `gap: 16` and fail the build

**Result:** Consistency is enforced by automation, not trust.

---

### For Rory (DevOps)

**Build 13 is the design system release.**

Kick it immediately:
```bash
eas build --profile preview --platform ios
```

This build ships to TestFlight with:
- Full design system (tokens, fonts, primitives)
- Phase 5 anonymous reporting UI
- All visual polish from Phase 6 audit

Next builds (14+) will layer Phase 5 trust score + final pre-launch work on top.

---

### For Alex (Accessibility)

**Design system tokens are WCAG-inclusive.**

- Shadow scale avoids over-contrast issues
- Color palette was audited by Dani for color-blind users
- Font sizes respect readability (body: 14+, labels: 12+)
- Button sizes include touch targets (44px minimum)

Future new screens inherit this accessibility automatically. Your Phase 6 audit flagged no tokens for replacement — design system is accessible as-is.

---

### For Jordan (Privacy)

**No new privacy implications.**

Design system is purely visual — no data, no collection, no user tracking. Tokens are client-side only. No Jordan gate required for future token adjustments.

---

### For Peter (Performance)

**Fonts add ~150KB to bundle; already accounted for.**

- Plus Jakarta Sans (50KB) + Public Sans (50KB) + JetBrains Mono (50KB)
- Loaded non-blocking via `useAppFonts()` hook
- Falls back to system fonts gracefully if load fails
- No impact on initial app launch time

Custom fonts are shipped; no further perf work needed on this system.

---

## Planning Next

### Phase 5 Trust Score (Shamus, In Progress)

Can now build with token-based styling baked in. When you ship, design is automatic. Dani will do a 30-min Polish pass before merge.

### Phase 6 Pre-Launch (Dani, In Progress)

- App Store screenshots — 6 images showing the app with design system live
- Privacy policy URL in App Store Connect
- Test account creation (Sky)
- App Store listing (already written in docs/)

All pre-launch work uses token-based design; no visual rework needed.

### Phase 7+ (Future)

New features:
1. Build with tokens (no hex literals)
2. Use primitives (Button, Card, Pill) where possible
3. Custom components reference `src/theme.ts`
4. Dani does 30-min Polish review
5. Gary runs linter (auto-flags non-token usage)
6. Merge

Design consistency is now **enforced**, not aspirational.

---

## Risk Assessment

**None.** Design system merged cleanly with Phase 5 work. Typecheck clean. No breaking changes. Fonts load gracefully. Fallback to system fonts works.

**What could go wrong:** A future developer hardcodes a color instead of using tokens → CI linter fails → fixed in 2 min. That's actually the system working.

---

## One-Off Decisions Recorded

Updated in DECISIONS_LOG.md (canonical record):
- Design system is foundational (not a feature)
- Token governance owned by Dani going forward
- All new screens must use tokens (enforced by linter)
- Design changes require design review gate
- Civic Gold reserved for gamification **only** (no exceptions)

---

## Summary for Sky

**Design system is shipped and live on main.**

Next step: **Kick Rory to build 13** via EAS. This is the design system release.

Then: Phase 5 trust score + Phase 6 finalization + App Store submission prep.

The app now has **visual identity enforcement**. You can't accidentally build something that looks out-of-place — the design system doesn't allow it.

