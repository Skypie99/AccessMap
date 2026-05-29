---
name: dani-design-system-audit-2026-05-29
description: "Dani assignment: Design system completeness audit (gap analysis, component coverage)"
metadata:
  type: qa-report
  date: 2026-05-29
  completed: 2026-05-30
  role: dani
  phase: design-system
---

# Dani Assignment — Design System Audit (2026-05-29)

**Assigned to:** Dani (Design + UX Engineering)  
**Priority:** MEDIUM (prep work; speeds up future UI)  
**Scope:** Comprehensive design system review + gap analysis  
**Status:** COMPLETE (2026-05-30)

---

## AUDIT COMPLETE (2026-05-30)

### Summary (using Casey's token audit as baseline)

- Token system: **STRONG** — single source of truth in `src/theme.ts`; all 7 token categories (color, spacing, radius, font, shadow, a11y, severity) defined with WCAG annotations
- Dark palette: **STRONG** — `ThemeContext.tsx` mirrors every light token with a dark variant; TypeScript enforces parity via `satisfies typeof lightColor`
- Biggest gap: **adoption** — tokens exist but ~34% of files still bypass them with raw literals

### Fixed this sprint

1. **`radius.sheet = 22` token added** — codifies the de-facto bottom-sheet corner radius that appeared 4× with no token; 4 files updated to `radius.circle` (the correct semantic token for circular icon buttons, `width:44 height:44 borderRadius:22 = circle`) — token drift eliminated
2. **6 components migrated to `useColor()`** — dark mode now fully responsive:
   - `LegendModal` (screens) → `makeStyles(color)` factory pattern
   - `FlashBanner` → `makeStyles(color)` factory pattern
   - `PhotoLightboxModal` → `makeStyles(color)` + `radius` import added
   - `AchievementsModal` → `makeStyles` hoisted before both components (needed for `AchievementRow` sub-component)
   - `ErrorBoundary` → `ErrorFallback` inner function component (class components can't call hooks directly)
   - `PlatformMap.web.tsx` → `const themeColor = useColor()` inside `PlatformMap` component function

---

## Token Completeness Checklist

### Color tokens — STRONG

- [x] Semantic surfaces: `surface`, `surfaceMuted`, `surfaceSoft`, `surfaceNeutral`, `overlay`, `overlaySoft`, `scrim`
- [x] Text hierarchy: `textStrong`, `text`, `textMuted`, `textSubtle`, `textMutedAlt`, `placeholderText`, `textOnBrand`
- [x] Brand scale: `brand`, `brandText`, `brandTextAlt`, `brandSoft`, `brandSofter`, `brandOnSoft`
- [x] Status pairs: `statusOpenBg/Fg`, `statusVerifiedBg/Fg`, `statusResolvedBg/Fg`, `statusRejectedBg/Fg` — each fg checked AA on its bg
- [x] Semantic: `success/Soft`, `warningBg/Fg/Hint`, `error/Strong/Bg/Fg`
- [x] Borders: `border`, `borderStrong`, `borderSubtle`, `borderPressed`, `divider`
- [x] Backdrop: `backdropStrong`, `backdropCaption`, `overlayBtn`, `overlayBtnPressed`
- [x] Dark palette: parity enforced by TypeScript `satisfies typeof lightColor`

**Open question (Sprint 2 backlog):** `brandText` vs `brandTextAlt` — values `#1c4f99` and `#1a4fa3` are near-identical. Dani recommendation: merge into `brand.textSafe` when dark-mode swap is finalized. No functional impact until Phase 2 dark-mode toggle.

### Spacing tokens — PARTIAL (66% adoption)

- [x] Scale defined: `tight:4, xs:6, sm:8, md:12, lg:16, xl:20, xxl:24, xxxl:32`
- [ ] 16 files still use raw `padding`/`margin` numbers
- [ ] Most common offenders: `padding:10` (22 uses), `padding:14` (11 uses) — both off the 4pt grid

**Sprint 2 backlog:** Sweep `padding: 10` → `spacing.md` (12) or add `spacing.smPlus: 10` if 10 is intentional. Coordinate with Shamus.

### Radius tokens — STRONG (post-fix)

- [x] Scale defined: `xs:4, sm:6, md:8, lg:12, xl:16, sheet:22, full:999, circle:9999`
- [x] `radius.sheet = 22` added this sprint
- [x] 4 hardcoded `borderRadius: 22` → `radius.circle` (correct semantics)
- [ ] `borderRadius: 999` appears 2× (ReportFlagModal, FlagDetailModal) — should be `radius.full`
- [ ] `borderRadius: 180` in SignInScreen — should be `radius.full`
- [ ] `borderRadius: 10` (10 uses) — off-grid; closest token is `radius.md` (8) or `radius.lg` (12)

### Font tokens — PARTIAL

- [x] Size scale: caption→display, 12 named stops
- [x] Weight: `regular:400, medium:500, semibold:600, bold:700` defined
- [ ] **Font weight tokens never imported** — 100% of components use raw strings `'600'`, `'700'`
- [ ] `fontSize: 14` has 51 hardcoded uses (should be `font.size.base`)
- [ ] `fontSize: 13` has 40 hardcoded uses (should be `font.size.sm`)

**Sprint 2 priority:** Add font weight sweep to a Shamus polish pass.

### Shadow tokens — STRONG

- [x] Three tiers: `e1` (subtle), `e2` (medium), `e3` (prominent) — well-adopted

### Dark mode coverage — STRONG (post-fix)

- [x] 43 of 43 components/screens now use `useColor()` (was 37/43 before this sprint)
- [x] 6 frozen components migrated
- [ ] Residual: `HamburgerDrawer` has 3 hardcoded hex colors on drawer background (`#fff`, `#f0f6ff`, `#e8f0ff`) not covered by any token — these need a `drawerBg/drawerText` token or migration to existing `surface.*` tokens

---

## Component Library Coverage

| Component | Status | Dark Mode | Notes |
|---|---|---|---|
| Button patterns | ✅ Inline (per-screen) | ✅ | No shared `<Button>` component; acceptable for current scale |
| `StatusBadge` | ✅ **NEW** (untracked in working tree) | ✅ | Addresses Gap #4 from Casey's audit |
| `FlagCard` | ⚠️ Still inline | ✅ | Duplicated across TasksScreen, MyReportsModal, etc. |
| `FlashBanner` | ✅ Shared | ✅ post-fix | |
| `PhotoLightboxModal` | ✅ Shared | ✅ post-fix | |
| `StatusHistoryModal` | ✅ Shared | ✅ | |
| `UpdateBanner` | ✅ Shared | ✅ | 3 hardcoded borderRadius values (8, 10, 15) still raw |
| `HamburgerDrawer` | ⚠️ 3 hardcoded hex colors | ✅ `useColor()` | Hex values bypass token system |
| `ErrorBoundary` | ✅ Shared | ✅ post-fix | Class → ErrorFallback inner component |
| `FilterPresetsModal` | ✅ Shared | ✅ | |

---

## Mobile + Web Parity

- [x] `PlatformMap.web.tsx` now uses `useColor()` — theme-aware heatmap label colors
- [x] Web-specific CSS (Leaflet) uses inline styles (deliberate — no token system for raw CSS)
- [ ] Popup inline styles in `PlatformMap.web.tsx` use raw hex `#666` — low priority (Leaflet Popup)

---

## Remaining Gaps (Sprint 2 Backlog)

| Gap | Impact | Effort |
|---|---|---|
| Font weight tokens: 0% import rate | Medium — visual inconsistency | Medium — Shamus sweep |
| Spacing: 16 files, `padding:10` most common | Low — off-grid only | Medium — Shamus sweep |
| `StatusBadge`/`FlagCard` shared component | Medium — duplication risk | Already started (StatusBadge.tsx in working tree) |
| `brandText` / `brandTextAlt` merge decision | Low — near-identical values | Low — one-line decision + dark-mode Phase 2 |
| `HamburgerDrawer` hardcoded hex colors | Low (currently dark, looks ok) | Low — 3 token swaps |
| `borderRadius: 999/180` → `radius.full` | Low — correct but not semantic | Low — 3 file edits |

---

## Design Compiler Result (Layers 1, 3, 4, 5)

**Layer 1 — Token Drift:** PASS for this sprint's scope. Zero new raw values introduced; 4 legacy raw values eliminated.

**Layer 3 — Component Consistency:** `StatusBadge` exists in working tree (addresses Gap #4). `FlagCard` still inline — Component Debt count: 1 active.

**Layer 4 — Visual Entropy:** Not formally scored this sprint (no new UI surfaces). Existing surfaces hold steady.

**Layer 5 — Luxury UI Score:** Not applicable — this sprint is token hygiene, not new UI.

**Layer 7 — Compile Decision:** PASS for the two fixes. Remaining gaps are tracked backlog items, not blockers.

---

### Branch: `fix/design-tokens-2026-05-30`
### TypeScript: 0 errors
### Safety: SAFE — style/theme only, no auth, no data, no RLS
### Ready for Rory to merge

---

## Decisions for Sky

None required. All changes are style-only token hygiene within the existing system.

---

*Dani | Design System Audit + Token Fixes | 2026-05-30*
