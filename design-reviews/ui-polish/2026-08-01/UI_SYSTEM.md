# UI_SYSTEM — Pre-Ship Polish Recipes — 2026-08-01

The design system's law lives in `DESIGN.md` (tokens, elevation tiers, component patterns) and `GLASS.md` (material). This file is the **operational layer for this pass**: the exact recipes the polish commits apply, so every touched screen converges on one treatment. Nothing here forks the system — where practice and token disagreed, the token was extended to name the practice (never the reverse).

## Tokens added by this pass (theme.ts)

| Addition | Value | Why |
|---|---|---|
| `bulkGlassShadow(color)` | the canonical modal-card up-shadow (dark: `#000`@0.35 / light: `shadowTint`@0.12, r14, {0,-4}, e5) | was hand-copied byte-identical in 16 files |
| `font.lineHeight.sm/md/xl/xxl` | 18 / 21 / 25 / 28 (×1.4 body formula) | 8 of 12 sizes had no lineHeight token |
| `font.lineHeight.h2/h1/display` | 30 / 34 / 58 (×~1.25 display formula) | headings need a tighter ratio than body |
| `font.tracking.eyebrow` | 1.2 | names the shared ScreenHeader eyebrow practice (`EYEBROW_TRACKING`); editorial identity, now a token |
| `icon.inline` / `icon.stroke` | 18 / 2.2 | names the de-facto icon standard (108 call sites) the {sm,md,lg,hero} scale never captured |
| barrel exports | ScreenStage, ScreenHeader, HeaderActions, PressableScale, RemoteImage | were direct-path-only |

## Recipes

### R1 — Loading
- List/sheet bootstrap with row-shaped content → `SkeletonRow` ×4–6 (pattern: HomeScreen/LeaderboardScreen). Keep the surface's existing a11y loading semantics (labels/announcements) untouched.
- Anything that stays a spinner → `<ActivityIndicator color={color.brand} />` + a themed caption (`variant="bodyMedium"`, `color.textMuted`); on brand fills → `color.textOnBrand`; in pinned-light zones → the zone's own literal ink.
- Every `RefreshControl` → `tintColor={color.brand}` (+ `colors={[color.brand]}` for Android parity, matching AdminScreen).

### R2 — Press feedback (the bp11 vocabulary, completed)
- Header/✕ circle buttons → `style={({pressed}) => [...base, pressed && { backgroundColor: color.headerBtnBgPressed }]}` (the HeaderActions treatment).
- Neutral chips/rows → `pressed && { backgroundColor: color.borderPressed }`.
- Brand fills → `pressed && { backgroundColor: color.ctaFillPressed }`; success fills → `successStrong` stays, deepen via opacity is NOT used (keep fills AA); destructive fills → `color.errorPressed`.
- Ghost/text buttons → `pressed && { opacity: 0.7 }` (the Leaderboard retry exemplar).
- Haptics: `hapticSelection()` on navigation-class presses (header buttons, drawer items — the TabBarButton precedent). No haptics added to commit-action buttons that already fire one on completion.
- Never wrap in new `PressableScale` where a bg-swap is the established local language — extend in place.

### R3 — Safe areas
- Sheet/scroll bottom padding → `Math.max(spacing.<current>, insets.bottom)` via `useSafeAreaInsets` (the 11-file house pattern). Keep the current spacing value as the floor — no rhythm changes.
- Full-screen surfaces → explicit `insets.top` padding on the first content block; absolute overlays never hardcode bottom offsets (derive from `insets.bottom`).

### R4 — Empty states
- Structure: hero-size Lucide icon (`size={32..48}`, `color.textSubtle` or contextual, `{...decorativeProps}`) → title `<AppText variant="heading" size={font.size.lg}>` → body `variant="body"` `color.textMuted` with `lineHeight`. Existing copy is kept verbatim; only structure/type/icon are unified.
- Exemplars: MyWatchedModal "No watched flags yet" (Star), AddressSearchModal (Search).

### R5 — Inputs
- Placeholder ink → `color.placeholderText` (never `textMuted`; glass fields keep `glassPlaceholder`).
- Focus cue on compose fields → `borderColor: color.brand` while focused, width unchanged (zero layout shift).
- Min target `minHeight: 44` (`a11y.minTargetSize`).
- Border default for compose fields → `color.borderStrong`.

### R6 — Type & spacing
- Uppercase pill/badge labels → `letterSpacing: font.tracking.loose`; screen/section eyebrows → `font.tracking.eyebrow`.
- No new raw hex/size/radius/shadow literals in themed chrome — tokens only. Pinned-light map zones keep literals by law.
- Off-grid values (5/10/15/…) → nearest spacing token, unless the site carries an explicit "intentional" comment.

### R7 — Shadows & depth
- Modal cards → `...bulkGlassShadow(color)`.
- CTAs/hero glows → `shadow.glowBrand` / `shadow.glowGold` only; never hand-rolled opacities.
- Respect the 4-tier elevation language (DESIGN.md §5): no tier changes in this pass, only recipe unification.

### R8 — What a polish commit may NOT do
No copy rewording · no a11y-wiring changes (roles/labels/states/escape/focus) beyond what a recipe explicitly preserves · no new BlurViews · no GlassSurface.tsx edits · no navigation/host-order changes · no new dependencies · no `windowSize`/virtualization tuning · no changes inside the location privacy gate call sites · nothing in `docs/privacy/`, `src/lib/copy.ts`, or Terms/Privacy content.

## Dark-mode parity rule for this pass

Every touched pairing must exist in both palettes already (the 122/122 key parity is compile-enforced). New pairings introduced by recipes use mode-independent tokens (`ctaFill`/`ctaFillPressed`/`errorPressed`) or per-palette tokens proven by the existing arbiter sets. The one dark-mode BUG found (STATUS_COLORS light-only consumers) is fixed in BP-2.
