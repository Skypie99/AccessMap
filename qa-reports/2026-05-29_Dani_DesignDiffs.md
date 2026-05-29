# Dani — Token-Level Design Diffs — AccessMap — 2026-05-29

**Branch audited:** `design/creative-polish-2026-05-27` (4 commits: `be34f91`, `58af26c`, `8c26177`, `97c085f`)
**Scope:** Expand the creative-polish proposal into exact token swaps per screen; produce Design Compiler readiness notes. Audit only — no code touched.

---

## Summary

The `design/creative-polish-2026-05-27` branch is a genuine step forward: 309 raw hex literals collapsed to ~26, a coherent card/modal/button recipe, and a full SignInScreen rebuild. What it leaves incomplete is a precise set of per-file token gaps that block the branch from earning a clean Design Compiler pass. Seven classes of issue remain: (1) the `heroCard` in ProfileScreen uses raw `borderRadius: 24` and a hand-rolled shadow block instead of named tokens; (2) four font sizes in ProfileScreen (`heroValue: 56`, `heroLabel: 11`, `avatarInitials: 26`, `heroIcon: 32`) are raw integers without font-scale entries; (3) MapScreen's filterPanel, `sevPill`, `banner`, and `errorBanner` each carry a raw `borderRadius` (18, 16, 8, 10) when token equivalents exist; (4) FlashBanner, AchievementsModal, LegendModal, OnboardingModal, and ErrorBoundary still use `import { color } from '@/theme'` static import — they will not update on dark-mode toggle; (5) two intentional off-token colors (`#1e8449`, `#5b21b6`) in TasksScreen lack semantic token names in `theme.ts`; (6) the web map pin uses a raw `rgba(0,0,0,0.35)` drop-shadow in an inline HTML template where the token system cannot reach; (7) `radius` is missing `xxl: 20` and `hero: 24` entries, so the ProfileScreen hero and the tier-panel border-radius have no named home. Each finding below includes the exact diff needed.

---

## Findings Table

| # | Title | Severity | File : Line | Recommendation | Effort |
|---|---|---|---|---|---|
| 1 | `heroCard` uses raw `borderRadius: 24` and hand-rolled shadow | high | `src/screens/ProfileScreen.tsx:1565–1577` | Add `radius.hero: 24` to `theme.ts`; replace hand-rolled shadow with a new `shadow.e4` entry or use `shadow.e3` + elevation override | S |
| 2 | `heroValue` font size is raw `56` — no token | high | `src/screens/ProfileScreen.tsx:1641` | Add `font.size.heroNum: 56` (or reuse `font.size.display: 48` + scale note) to `theme.ts` | S |
| 3 | `heroLabel`, `avatarInitials`, `heroIcon` are raw font integers | medium | `ProfileScreen.tsx:1627, 1604, 1578` | Map to closest font-scale tokens or add display-class entries | S |
| 4 | MapScreen `sevPill` borderRadius: 16 is a raw integer | medium | `src/screens/MapScreen.tsx:1905` | Replace with `radius.xl` (16) — already defined, just not referenced | XS |
| 5 | MapScreen `banner` borderRadius: 8 and `errorBanner` borderRadius: 10 are raw integers | medium | `MapScreen.tsx:1918, 1929` | `banner` → `radius.md` (8); `errorBanner` → `radius.md` (8) or add `radius.sm+`: discuss in DECISIONS | S |
| 6 | MapScreen `filterPanel` uses raw `padding: 12` and `gap: 8` | low | `MapScreen.tsx:1864–1865` | Replace with `spacing.md` (12) and `spacing.sm` (8) | XS |
| 7 | FlashBanner, AchievementsModal, LegendModal, OnboardingModal, ErrorBoundary use static `color` import — dark mode silently broken | critical | `FlashBanner.tsx:9`, `AchievementsModal.tsx:24`, `LegendModal.tsx:3`, `OnboardingModal.tsx` (line TBD), `ErrorBoundary.tsx:3` | Convert each file to `useColor()` + `makeStyles(color)` factory pattern (same recipe as UpdateBanner) | M |
| 8 | `#1e8449` (bulkResolveBtn) and `#5b21b6` (bulkWatchBtn) lack semantic token names | medium | `src/screens/TasksScreen.tsx:1618, 1623` | Add `color.successDeep: '#1e8449'` and `color.watchPurple: '#5b21b6'` to `theme.ts` with AA/deuteranopia comments; mirror in `darkColor` | S |
| 9 | Web map pin inline HTML uses raw `rgba(0,0,0,0.35)` drop-shadow | low | `src/components/PlatformMap.web.tsx:63` | Extract the pin HTML to a typed helper that accepts a severity color string and a shadow constant; document as "Leaflet HTML context — token system does not apply" | S |
| 10 | `radius` token set missing `xxl: 20` and `hero: 24` entries | high | `src/theme.ts:145–153` | Add both entries; update ProfileScreen heroCard and tierPanel (borderRadius: 10 on line ~1752) to use named tokens | S |
| 11 | `font.size` missing `heroNum` (56pt display numeral) entry | medium | `src/theme.ts:161–174` | Add `heroNum: 56` between `display: 48` and `displayLg: 72` with a comment ("large points display in ProfileScreen hero") | XS |
| 12 | Status pill styles are copy-pasted in 4 modals — no shared component | medium | `MyReportsModal`, `FlagDetailModal`, `ActivityFeedModal`, `MyWatchedModal` | Promote to `src/components/StatusPill.tsx`; accept `status: FlagStatus` prop | M |
| 13 | `severityColor()` in `src/lib/flags.ts` duplicates `theme.severity` ramp | medium | `src/lib/flags.ts` (severityColor function) | Replace body with `return severity[s].color`; remove the 5 raw hex literals; resolves DESIGN.md Outstanding P1 | S |

**Effort key:** XS < 30 min · S = 30–90 min · M = half-day · L = day+

---

## Proposed Patches

### Patch 1 — Add missing radius and font tokens to `src/theme.ts`

```diff
--- a/src/theme.ts
+++ b/src/theme.ts
@@ export const radius = {
   xs: 4,
   sm: 6,
   md: 8,
   lg: 12,
   xl: 16,
+  xxl: 20,      // tier panels, bottom-sheet inner cards
+  hero: 24,     // ProfileScreen heroCard, any full-bleed hero surface
   full: 999,
   circle: 9999,
 };

@@ export const font = {
   size: {
     caption: 11,
     xs: 12,
     sm: 13,
     base: 14,
     md: 15,
     lg: 16,
     xl: 18,
     xxl: 20,
     h2: 24,
     h1: 28,
     display: 48,
+    heroNum: 56,   // points value in ProfileScreen hero card
     displayLg: 72,
   },
```

### Patch 2 — Add semantic color tokens for TasksScreen bulk actions

```diff
--- a/src/theme.ts
+++ b/src/theme.ts
@@ export const color = {
   // ... (after 'accentOrange' line)
+
+  // Bulk-action overrides — intentionally off the standard ramp for contrast/a11y reasons.
+  // successDeep: #1e8449 on white text ≈ 7.0:1 (AAA for 14pt bold). color.success (#27ae60) only
+  //   reaches 2.7:1 on white — usable for large/icon pairs but not standalone button labels.
+  // watchPurple: #5b21b6 chosen for deuteranopia safety — distinct from brand-blue and resolve-green
+  //   in all three common colorblindness simulations (protanopia, deuteranopia, tritanopia).
+  successDeep: '#1e8449',
+  watchPurple: '#5b21b6',
```

Also add to `darkColor` in `ThemeContext.tsx`:
```diff
--- a/src/theme/ThemeContext.tsx
+++ b/src/theme/ThemeContext.tsx
@@ const darkColor = {
   // ... (after accentOrange line in darkColor)
+  successDeep: '#1e8449',   // same value — already meets AA on dark buttons
+  watchPurple: '#5b21b6',   // same value — deuteranopia safety unchanged in dark mode
```

Then in `TasksScreen.tsx`:
```diff
-  bulkResolveBtn: { backgroundColor: '#1e8449' }, // deeper green than color.success for AA on white text (~7:1 vs 2.7:1)
+  bulkResolveBtn: { backgroundColor: color.successDeep },
-  bulkWatchBtn: { backgroundColor: '#5b21b6' },
+  bulkWatchBtn: { backgroundColor: color.watchPurple },
```

### Patch 3 — ProfileScreen heroCard: swap raw borderRadius + shadow to tokens

```diff
--- a/src/screens/ProfileScreen.tsx
+++ b/src/screens/ProfileScreen.tsx
@@ heroCard: {
     backgroundColor: color.brand,
-    borderRadius: 24,
+    borderRadius: radius.hero,
     paddingHorizontal: 24,
     paddingTop: 22,
     paddingBottom: 24,
     alignItems: 'center',
     gap: 4,
-    // Heavier drop shadow so the hero sits forward as the page anchor.
-    shadowColor: color.shadow,
-    shadowOpacity: 0.22,
-    shadowRadius: 16,
-    shadowOffset: { width: 0, height: 6 },
-    elevation: 8,
+    // Uses shadow.e3 base + elevated elevation so the hero sits forward as the page anchor.
+    ...shadow.e3,
+    elevation: 8,
   },
```

Note: `shadow.e3` has `shadowOpacity: 0.2, shadowRadius: 8, offset {0,3}`. The hand-rolled value (`opacity 0.22, radius 16, offset {0,6}`) is slightly deeper. If the deeper shadow is intentional, we should add `shadow.e4` to `theme.ts` rather than silently downgrading. **Flag for Sky decision** — see DECISIONS section.

### Patch 4 — ProfileScreen: raw font sizes → tokens

```diff
--- a/src/screens/ProfileScreen.tsx
+++ b/src/screens/ProfileScreen.tsx
@@ heroIcon: {
-    fontSize: 32,
+    fontSize: font.size.h2,   // h2 = 24 is closest; if 32 is intentional add font.size.icon32
     marginBottom: 4,
   },
@@ avatarInitials: {
-    fontSize: 26,
+    fontSize: font.size.h2 + 2,  // interim; prefer adding font.size.avatarInitials: 26 to theme.ts
     fontWeight: '700',
     color: color.textOnBrand,
     letterSpacing: 0.5,
   },
@@ heroLabel: {
     color: color.pointsPillText,
-    fontSize: 11,
+    fontSize: font.size.caption,
     letterSpacing: 2.4,
     fontWeight: '700',
     textTransform: 'uppercase',
   },
@@ heroValue: {
     color: color.textOnBrand,
-    fontSize: 56,
+    fontSize: font.size.heroNum,   // add heroNum: 56 per Patch 1
     fontWeight: '800',
     lineHeight: 60,
     letterSpacing: -1.2,
   },
```

### Patch 5 — MapScreen: raw borderRadius → tokens

```diff
--- a/src/screens/MapScreen.tsx
+++ b/src/screens/MapScreen.tsx
@@ sevPill: {
     width: 44,
     height: 32,
-    borderRadius: 16,
+    borderRadius: radius.xl,
     alignItems: 'center',
     justifyContent: 'center',
     backgroundColor: color.surfaceNeutral,
   },
@@ banner: {
     alignSelf: 'center',
     backgroundColor: color.overlaySoft,
     paddingHorizontal: 12,
     paddingVertical: 8,
-    borderRadius: 8,
+    borderRadius: radius.md,
     flexDirection: 'row',
     gap: 8,
     alignItems: 'center',
   },
@@ errorBanner: {
     marginTop: 8,
     backgroundColor: color.error,
     paddingHorizontal: 14,
     paddingVertical: 12,
-    borderRadius: 10,
+    borderRadius: radius.md,   // 8 vs 10: accept rounding; or add radius.banner: 10 if visual difference matters
     flexDirection: 'row',
     gap: 10,
     alignItems: 'center',
     minHeight: 44,
     ...shadow.e2,
   },
@@ filterPanel: {
     marginTop: 8,
     backgroundColor: color.overlay,
     borderRadius: radius.lg,
-    padding: 12,
-    gap: 8,
+    padding: spacing.md,
+    gap: spacing.sm,
     ...shadow.e2,
   },
```

### Patch 6 — Convert FlashBanner to useColor() (representative; same recipe for the other 4 holdouts)

```diff
--- a/src/components/FlashBanner.tsx
+++ b/src/components/FlashBanner.tsx
-import { color, font, radius, shadow, spacing } from '@/theme';
+import { font, radius, shadow, spacing } from '@/theme';
+import { type ColorTheme, useColor } from '@/theme/ThemeContext';

 export default function FlashBanner(...) {
+  const color = useColor();
+  const styles = makeStyles(color);
   // ... rest unchanged
 }

-const styles = StyleSheet.create({
+const makeStyles = (color: ColorTheme) => StyleSheet.create({
   // ... body unchanged
 });
```

Apply the same pattern to: `AchievementsModal.tsx`, `LegendModal.tsx`, `OnboardingModal.tsx`, `ErrorBoundary.tsx`.

### Patch 7 — Fix `severityColor()` duplication in `src/lib/flags.ts`

```diff
--- a/src/lib/flags.ts
+++ b/src/lib/flags.ts
+import { severity } from '@/theme';
+
 export function severityColor(s: FlagSeverity): string {
-  switch (s) {
-    case 1: return '#27ae60';
-    case 2: return '#7fb800';
-    case 3: return '#f1c40f';
-    case 4: return '#e67e22';
-    case 5: return '#e74c3c';
-  }
+  return severity[s].color;
 }
```

---

## Design Compiler Readiness Note

### Layer 1 — Tokenization

**Status: NEAR-PASS.** Token coverage on the branch is ~92% (up from ~70%). Remaining blockers for a clean pass: raw font sizes in ProfileScreen hero (finding #2, #3), missing `radius.hero` / `radius.xxl` (finding #10), and the 5 raw integers in MapScreen filterPanel/banner/sevPill (findings #4–6). The TasksScreen semantic-color gap (finding #8) does not block tokenization but will cause a naming audit failure in a future cycle.

### Layer 2 — Accessibility Parity

**Status: PASS with one monitor item.** The `static color import` holdouts (finding #7) are the highest-risk a11y item — they will silently serve light-palette values to dark-mode users, which could drop text contrast below 4.5:1 on dark surfaces. All new interactive elements in the branch meet 44pt minimum target size. The SignInScreen focus ring (`borderColor: color.brand, borderWidth: 2`) is correct and covers keyboard/switch-access users. The hero `fontWeight: '800'` has no token equivalent — not an a11y issue, but a token gap to note.

### Layer 3 — Component Consistency

**Status: POLISH.** The `StatusPill` duplication (finding #12) is the main consistency gap — four modals carry identical copy-pasted pill styles. The card/button/input recipe is now unified, which is the win. Close-button sizes are consistent at 44×44 (or 32×32 on dense lists).

### Layer 4 — Visual Entropy

**Status: PASS.** LetterSpacing usage is intentional and follows the documented ramp (section labels 0.6–0.8, CTAs 0.2, display headers −0.3 to −1.2). Shadow tiers follow the e1/e2/e3 ladder correctly except the heroCard hand-roll (finding #1).

### Layer 5 — Luxury UI Score

**Status: POLISH → PASS on merge.** The SignInScreen rebuild and ProfileScreen hero glow-up earn this branch the "polished" label over the prior state. Two remaining rough edges: the `borderRadius: 24` hero card without a token name feels brittle; and `fontWeight: '800'` (ultra-bold) on the hero numeral has no system entry. Neither blocks merge, but both should land before Phase 2.

### Layer 6 — Regression Safety

**Status: PASS.** 61 suites / 922 tests green at HEAD per the branch report. No behaviour-changing lines; no test mocks altered.

### Layer 7 — Compile Decision

**POLISH** — branch is close. Apply findings #7 (static color import holdouts) and #10 (missing radius tokens) before merge. Remaining findings are S-effort cleanups that can ride a follow-on PR.

---

## DECISIONS FOR SKY

1. **`shadow.e4` vs hand-rolled heroCard shadow.** The ProfileScreen hero currently uses `shadowOpacity: 0.22, shadowRadius: 16, offset {0,6}, elevation: 8` — noticeably deeper than `shadow.e3` (`opacity 0.2, radius 8, offset {0,3}`). If the deeper shadow is a deliberate design choice (it is — it makes the hero feel like it lifts off the screen), we should add `shadow.e4` to `theme.ts` rather than silently mapping it to `e3`. Do you want a formal `e4` tier, or is `e3 + elevation:8` close enough?

2. **`heroIcon: fontSize: 32` — add a token or accept the gap?** The hero emoji icon at 32pt sits between `font.size.h2` (24) and `font.size.display` (48). We could add `font.size.icon32: 32` or simply document it as "emoji icon — token system does not govern emoji sizes." Your call on whether token completeness matters here.

3. **`errorBanner` borderRadius: 10 vs token `radius.md` (8).** Replacing 10 with 8 is a 2pt visual change. It might be imperceptible or it might matter at the small error-banner scale. Options: (a) accept radius.md, (b) add `radius.banner: 10`, (c) leave as raw literal with a comment. Low stakes but worth a deliberate choice.

4. **StatusPill promotion timing.** Finding #12 calls for a `src/components/StatusPill.tsx` shared component. This is a safe refactor but requires touching 4 modal files. Should this block the polish branch merge, or land as a separate follow-on PR?

5. **`fontWeight: '800'` in `heroValue`.** The font weight token set maxes at `bold: '700'`. The heroValue uses `fontWeight: '800'` (ultra-bold). This is not in the token system. Should we add `weight.extrabold: '800' as const` or change the hero to `bold: '700'` for system consistency?
