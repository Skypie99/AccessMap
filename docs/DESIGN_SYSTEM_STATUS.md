# AccessMap Design System — Implementation Status

**Last updated:** 2026-05-31  
**Status:** All 6 phases shipped to `main`. No pending phases.

---

## Token source of truth

All design tokens live in [`src/theme.ts`](../src/theme.ts) (314 lines). Export namespaces:

| Namespace | What it covers |
|-----------|---------------|
| `color`   | Surfaces, text, brand blue, Civic Gold, status, severity, error, success, overlay |
| `spacing` | Uniform spacing scale (xs → xxxl) |
| `radius`  | Corner radii (sm → full) |
| `font`    | Size scale, weight scale, family tokens (Phase 4+) |
| `shadow`  | Elevation levels e1–e3 + pin glow |
| `severity`| Per-severity color + textOnColor (severity 1–5 ramp) |

Dark-mode-aware tokens live in [`src/lib/ThemeContext.tsx`](../src/lib/ThemeContext.tsx) via `useColor()`.

---

## Phase log

### Phase 1 — Brand tokens + SVG assets
**Commit:** `29ca40e`  **Date:** 2026-05-31

**What shipped:**
- Brand color updated to **Wayfinder Blue** (`#1466E0`) — heritage blue of the International Symbol of Access
- **Civic Gold** gamification accent (`#E9A81D` / dark `#E9B84D`) — reserved for points/badges/rewards
- Status token remap: `statusOpen`, `statusVerified`, `statusResolved`, `statusRejected` (bg + fg pairs)
- Shadow tokens: cool-tinted `rgba(15,27,45,…)` + `shadow.pin` (brand-blue glow for map pins)
- Radius upgrades: `md 8→12`, `lg 12→16`, `xl 16→20`, `sheet 22→28`
- Severity ramp: yellow→red with `textOnColor` (sev 1 uses dark ink; sev 2–5 use white)
- Dark palette updated for all new tokens in ThemeContext

**Assets added:**
```
assets/brand/
  app-icon.svg          ← App icon vector source
  favicon.svg           ← Web favicon vector source
  logo-mark.svg         ← Full colour LogoMark
  logo-mark-white.svg   ← White LogoMark (for dark backgrounds)
  logo-mark-mono.svg    ← Monochrome LogoMark
assets/icons/category/
  ramp.svg  curb.svg  pothole.svg  crosswalk.svg  sidewalk.svg  other.svg
```

**Components:**
- [`src/components/CategoryIcon.tsx`](../src/components/CategoryIcon.tsx) — text-initial placeholder; SVG swap is Phase 2 follow-on when `react-native-svg` is added

---

### Phase 2 — UI primitive components
**Commit:** `981e4d1`  **Date:** 2026-05-31

**What shipped:**
```
src/components/ui/
  Button.tsx      ← primary/secondary/ghost variants; sm/md/lg; press scale(0.97) animation
  Card.tsx        ← white surface, slate-200 border, radius.lg, cool shadow
  PointsChip.tsx  ← Civic Gold gamification badge; gold/blue tone variants
  Pill.tsx        ← filter/selection chip; active (brand-fill) / inactive (neutral)
  index.ts        ← barrel export for all primitives
src/components/
  SeverityBadge.tsx  ← severity pill using yellow→red ramp with textOnColor
  StatusBadge.tsx    ← restyled: colored dot indicator per design spec
```

- `STATUS_COLORS` in `src/lib/flags.ts` updated to match token values

---

### Phase 3 — Screen token migration
**Commit:** `a12d0b9`  **Date:** 2026-05-31

Raw hex/size literals swept out of every screen and replaced with design tokens:

| Screen / Component | What changed |
|--------------------|--------------|
| `SignInScreen` | Gradient → Wayfinder Blue, glow shadow, input focus ring, secondary btn |
| `TasksScreen` | `searchClearText '#555'` → `color.textMuted` |
| `ProfileScreen` | Switch track, Android thumb, delete button → tokens |
| `MapScreen` | `heatmapDisclaimerText '#ffffff'` → `color.textOnBrand` |
| `ReportFlagModal` | `borderRadius` literals → `radius.*` tokens |
| `PlatformMap` (native) | Shadow + map tint → tokens |

---

### Phase 4 — Custom typography
**Commit:** `13df977`  **Date:** 2026-05-31

**Fonts installed** (via `@expo-google-fonts/*`, bundled as TTFs):

| Typeface | Weights loaded | Role |
|----------|---------------|------|
| **Plus Jakarta Sans** | 700 Bold, 800 ExtraBold | Display headings, app name |
| **Public Sans** | 400 Regular, 500 Medium, 600 SemiBold | Body text, UI labels |
| **JetBrains Mono** | 400 Regular, 500 Medium, 600 SemiBold | Points, stats, coordinates |

**Token additions to `src/theme.ts`:**
```
font.family.display      → 'PlusJakartaSans_800ExtraBold'
font.family.displayBold  → 'PlusJakartaSans_700Bold'
font.family.body         → 'PublicSans_400Regular'
font.family.bodyMedium   → 'PublicSans_500Medium'
font.family.bodySemibold → 'PublicSans_600SemiBold'
font.family.mono         → 'JetBrainsMono_400Regular'
font.family.monoMedium   → 'JetBrainsMono_500Medium'
font.family.monoBold     → 'JetBrainsMono_600SemiBold'
```

**New files:**
- [`src/lib/fonts.ts`](../src/lib/fonts.ts) — `useAppFonts()` hook; loads 8 weights, non-blocking (font error degrades to system fonts)
- [`src/components/ui/AppText.tsx`](../src/components/ui/AppText.tsx) — typed `<Text>` wrapper with `variant` prop (8 variants); graceful fallback before fonts load

**Wired in:**
- `App.tsx` — `useAppFonts()` called at root; render held until fonts ready (or errored)
- `ProfileScreen` — hero points number → `AppText variant="monoBold"`
- `SignInScreen` — "AccessMap" title → `AppText variant="display"`
- `PointsChip` — values use `AppText mono/monoBold`

---

### Phase 5 — Dani Design Compiler token cleanup + UI polish
**Commits:** `5f34d67`, `1d60279`  **Date:** 2026-05-30–31

Post-merge cleanup pass (Dani's 7-layer compile gate, layers P1–P3 findings):

- `ProfileScreen`: `padding 16→spacing.lg`, `fontSize 12/13→font.size.xs/sm`, `fontWeight '700'→font.weight.bold`, gap literals → `spacing.*`
- `LeaderboardModal`: `tierEmoji` fontSize → `font.size.base`
- `OnboardingCards`: Skip/Back button contrast hardened for dark gradient background; inactive dots `rgba(255,255,255,0.25)`; active dot glow shadow
- `OnboardingModal`: "Open the Map" CTA → stronger shadow (`e3`-level) to signal completion
- `PhotoGallery`: thumbnails `radius.md→radius.lg`, `shadow.e1` lift, lightbox uses `color.overlayBtn/backdropCaption` tokens
- `ReportFlagModal` disability chips: emoji prefix (♿ 👁 🦻 🧠 🚧) for scanability

---

### Phase 6 — Comprehensive token sweep + WCAG color tokens
**Commits:** `c4ddd49`, `0aec7aa`, `58ba6c0`  **Date:** 2026-05-30

**New tokens added:**
- `color.successStrong` `#1e8449` — WCAG AA green for white-on-button (4.6:1); `color.success` alone fails
- `color.accentPurple` `#5b21b6` light / `#7c3aed` dark — bulk-watch action affordance, protanopia/deuteranopia-safe

**Components swept:**

| Component | Changes |
|-----------|---------|
| `LeaderboardModal` | 🏆 trophy header, 🥇🥈🥉 top-3 medals; full `font.*`/`spacing.*`/`shadow.e3` token adoption |
| `HowToHelpScreen` | Step accent colors → `errorStrong/success/brand/accentOrange` (dark-mode responsive) |
| `HeatmapLegend` | `color/font/shadow` tokens; `shadow.e1` |
| `PlatformMap.web` | `'#666'` popup color → `color.textMuted` |
| `ProfileScreen` | Delete btn `#D93025` → `color.error` (WCAG AA 5.4:1) |
| `TasksScreen` | `bulkResolveBtn/bulkWatchBtn` → `successStrong/accentPurple`; `searchClearText` → `color.textMuted` |
| `MapScreen` | All `borderRadius`/`fontSize`/`fontWeight`/`spacing` literals → tokens |
| `FlagDetailModal` | All `borderRadius`/`fontSize`/`fontWeight` literals → tokens |
| `ReportFlagModal` | All `borderRadius`/`fontSize`/`fontWeight`/`spacing` literals → tokens |
| `FlashBanner` | `pillSuccess` → `color.successStrong` |
| `SignInScreen` | `primaryBtnText '#fff'` → `color.textOnBrand` |
| `PhotoGallery` | Overlay texts → `color.textOnBrand` + `fontWeight` tokens |

---

## Asset directory map

```
assets/
  brand/
    logo-mark.svg           ← Primary LogoMark (Wayfinder Blue gradient)
    logo-mark-white.svg     ← White variant (for dark/coloured backgrounds)
    logo-mark-mono.svg      ← Monochrome variant
    app-icon.svg            ← App icon vector source (hand off to Rory for EAS)
    favicon.svg             ← Web favicon source (SVG; use PNG for app.json)
  icons/
    category/
      ramp.svg  curb.svg  pothole.svg  crosswalk.svg  sidewalk.svg  other.svg

src/
  theme.ts                  ← All design tokens (color, spacing, radius, font, shadow, severity)
  lib/
    fonts.ts                ← useAppFonts() — loads 8 custom font weights
    ThemeContext.tsx         ← Dark-mode aware useColor() hook
  components/
    ui/
      AppText.tsx           ← Typed Text wrapper with 8 font variants
      Button.tsx            ← Primary/secondary/ghost, animated press
      Card.tsx              ← White surface card
      Pill.tsx              ← Filter/selection chip
      PointsChip.tsx        ← Civic Gold gamification badge
      index.ts              ← Barrel export
    CategoryIcon.tsx        ← Category icon (text-initial; SVG swap pending react-native-svg)
    SeverityBadge.tsx       ← Severity 1–5 pill
    StatusBadge.tsx         ← Status dot + label badge
```

---

## What is NOT in the design system (yet)

- **`CategoryIcon` SVG swap** — the SVG sources exist in `assets/icons/category/` but `CategoryIcon.tsx` still uses text initials. Blocked on adding `react-native-svg` to the project.
- **`assets/favicon.png`** — `app.json` references this but the file doesn't exist (Phase 1 added `.svg`; `.png` was never committed). Expo web bundler prints a warning but the build still succeeds. Fix: generate a 32×32 PNG from `assets/brand/favicon.svg` and commit it.
- **Dark mode** — tokens are named semantically (`surface`, `textStrong`) and ThemeContext has dark palette stubs, but the dark-mode switch is not wired to a system preference toggle yet.
