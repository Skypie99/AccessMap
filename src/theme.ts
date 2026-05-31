/**
 * AccessMap design tokens — the single source of truth for color, spacing,
 * radius, type, shadow, and severity. See ../DESIGN.md for usage rules and
 * the why behind each value.
 *
 * Add new tokens here before sprinkling new literals through screens. If a
 * value doesn't have a name yet, add it (or use an existing one) — never
 * branch off with a one-off hex/size that the next screen will copy wrong.
 *
 * Every color in this file has been spot-checked against WCAG 2.2 AA at
 * the pairings the app actually uses (see DESIGN.md → "Color pairings").
 *
 * ---------------------------------------------------------------------------
 * DARK-MODE FOUNDATION (Cycle D / d2 — 2026-05-24)
 * ---------------------------------------------------------------------------
 * These tokens exist so that a future dark-mode swap is a one-file change.
 * Today every value is the light palette; Phase 2 will introduce a theme
 * context that picks light vs dark per token at runtime. The names below
 * are intentionally semantic (surface / textPrimary / brand) rather than
 * literal (white / black / blue) so the same names work in either palette.
 *
 * Phase 1 migration status (this branch):
 *   - DONE: StatusHistoryModal entryDot (the Cycle C carry-forward)
 *   - DONE: ~40 callsites migrated across UpdateBanner, FilterPresetsModal,
 *           SavedPlacesModal, MyReportsModal, ActivityFeedModal,
 *           NearbyFlagsModal, MyWatchedModal, ProfileScreen, TasksScreen,
 *           MapScreen, NotificationPrefsModal, FlagDetailModal, and
 *           ReportFlagModal for brand / brandSofter / borderPressed /
 *           textMutedAlt / accentOrange / brandTextAlt.
 *   - OUTSTANDING (not blocking dark mode, but worth a future polish pass):
 *     * single-use literals scattered across modal headers (#fff, #222, #333)
 *       — these are already covered by surface / textStrong / text and can
 *       be swept in a follow-on cycle.
 *     * severity colors stay literal in `severity[1..5]` below; they are
 *       a distinct concern (color-blind ramp) handled by severityColor().
 *
 * Phase 2 plan (NOT this branch): introduce a ThemeProvider that returns a
 * `color` object whose values switch on light/dark. Because every consumer
 * already imports the same named token, no callsite changes will be needed
 * beyond `import { color } from '@/theme'` → `const color = useColor()`.
 * ---------------------------------------------------------------------------
 */

import type { FlagSeverity } from './types/database';

// -------------------------------------------------------------------------
// Color
// -------------------------------------------------------------------------

export const color = {
  // Surfaces
  surface: '#fff', // primary background, button text on brand
  surfaceMuted: '#f7f9fc', // app-level subtle backgrounds (e.g. screen wash)
  surfaceSoft: '#f7f8fa', // input fields, card alt
  surfaceNeutral: '#eef1f5', // pill background, inactive chip
  overlay: 'rgba(255,255,255,0.97)', // floating panels (filter, banner) over map
  overlaySoft: 'rgba(255,255,255,0.95)',
  scrim: 'rgba(0,0,0,0.4)', // modal backdrop

  // Text — all checked ≥ 4.5:1 on surface
  textStrong: '#222', // headings (16:1 on white)
  text: '#333', // body (12.6:1)
  textMuted: '#666', // secondary (5.7:1 on #fff, AA pass). Also used as placeholderTextColor on surfaceSoft (#f7f8fa) where contrast is ~5.6:1 — still passes WCAG AA (4.5:1 for normal text).
  textSubtle: '#999', // disabled / tertiary; only for non-essential text or 18pt+
  placeholderText: '#5b6470', // TextInput placeholder — AA pass: ~4.7:1 on white, ~4.5:1 on #f7f9fc
  textOnBrand: '#fff', // text drawn on brand-blue or severity colors

  // Brand — primary action color ("Wayfinder Blue" — design system 2026-05-30)
  // Rooted in the heritage blue of the International Symbol of Access.
  // brand:     CTAs, buttons, map pins, links, focus rings (≥14pt bold on white)
  // brandText: small text on white — darker shade passes AA at any size
  brand: '#1466E0', // "Wayfinder Blue" — design system primary; ~3:1 on white (AA non-text)
  brandText: '#0F53BE', // 5.5:1 on white → AA pass at any text size
  brandTextAlt: '#0E4499', // extra-dark brand text (7.2:1 on white), used for max-contrast contexts
  brandSoft: '#D9E7FD', // brand-tinted background (blue-100)
  brandSofter: '#EEF4FE', // lightest brand wash (blue-50)
  brandOnSoft: '#0F53BE', // dark brand text on brandSoft backgrounds

  // Gamification accent — "Civic Gold" (design system 2026-05-30)
  // Reserved EXCLUSIVELY for points, streaks, badges, rewards. Never for status.
  // Always pair with dark ink text — gold is too light for white text (AA fail).
  goldAccent: '#FBB024', // Civic Gold — the accent
  goldLight: '#FFF8EB',  // gold-50 — chip/badge background
  goldMid: '#FEEFC7',    // gold-100 — slightly richer background
  goldDark: '#B45F09',   // gold-700 — text on gold backgrounds (AA pass)

  // Status surfaces (bg + fg pairings) — used by status pills, banners
  // Aligned with design system 2026-05-30. Each fg passes AA on its bg.
  statusOpenBg: '#E7F0FD',
  statusOpenFg: '#1A5FB4', // ~6:1 on statusOpenBg
  statusVerifiedBg: '#DCF6EC',
  statusVerifiedFg: '#067A56', // ~7:1 on statusVerifiedBg
  statusResolvedBg: '#D6F1E6',
  statusResolvedFg: '#047054', // ~6.5:1 on statusResolvedBg
  statusRejectedBg: '#EEF0F3',
  statusRejectedFg: '#4B5563', // ~7:1 on statusRejectedBg

  // Semantic
  success: '#27ae60', // resolve action background (text on it must be white-large)
  successSoft: '#d4ecdb',
  warningBg: '#fff7e6',
  warningFg: '#714b00', // 8.3:1 on warningBg
  warningHint: '#a04040', // for inline hint text on white (4.6:1)
  error: '#c0392b', // banner background, destructive when subtle
  errorStrong: '#e74c3c', // destructive action background (delete)
  errorBg: '#fdecea',
  errorFg: '#8a1f1f', // 7.4:1 on errorBg

  // Borders / dividers
  border: '#e5e5e5',
  borderStrong: '#d0d4dc',
  borderSubtle: '#dde2ea',
  borderPressed: '#dde3eb', // pressed-state background on neutral chips/buttons (MyReportsModal, ActivityFeedModal, NearbyFlagsModal, MyWatchedModal)
  divider: '#ddd',

  // Additional muted-text / accent tokens
  textMutedAlt: '#5b6470', // AA-safe muted text on light surfaces (4.6:1 on #f4f6f8) — used by ReportFlagModal hints, NotificationPrefsModal copy, TasksScreen
  accentOrange: '#f1a520', // amber accent for "watch / pinned" affordances (NotificationPrefsModal, ProfileScreen, SavedPlacesModal, MyWatchedModal, FlagDetailModal). Distinct from severity[4].color (#e67e22) on purpose.
  successStrong: '#1e8449', // WCAG AA green for white text on button background (4.6:1 vs color.success 2.8:1 fails). Used by bulk-resolve + FlashBanner success pill.
  accentPurple: '#5b21b6', // Purple accent for bulk-watch action buttons (8.8:1 on white — strong AA).

  // Backdrop / overlay layers — used by full-screen modals and photo UI
  backdropStrong: 'rgba(0,0,0,0.75)', // full-screen modal overlays (replaces raw rgba in PhotoLightboxModal)
  backdropCaption: 'rgba(0,0,0,0.65)', // caption bars on photos — contrast gain over scrim (Alex #3)
  overlayBtn: 'rgba(0,0,0,0.45)', // overlay action buttons (close button bg in lightbox)
  overlayBtnPressed: 'rgba(0,0,0,0.60)', // pressed state for overlay action buttons

  // Misc
  shadow: '#000',
  pointsPillText: '#dbe7fb', // light-blue label on brand-blue background
};

// -------------------------------------------------------------------------
// Spacing — 4pt grid, names match how it's most often used
// -------------------------------------------------------------------------

export const spacing = {
  tight: 4, // gap between text + adjacent icon, very small offsets
  xs: 6,
  sm: 8, // most common gap
  md: 12, // most common padding
  lg: 16, // section padding
  xl: 20,
  xxl: 24, // generous screen padding
  xxxl: 32,
};

// -------------------------------------------------------------------------
// Border radius
// -------------------------------------------------------------------------

export const radius = {
  // Updated to design system 2026-05-30. Friendly but not bubbly.
  xs: 4,
  sm: 6,
  md: 12,   // buttons, inputs (was 8)
  lg: 16,   // cards, floating panels (was 12)
  xl: 20,   // sheet headers (was 16)
  sheet: 28, // bottom-sheet top corners (was 22)
  full: 999, // pills, chips, FABs
  circle: 9999, // perfectly circular (avatar, round icon buttons)
};

// -------------------------------------------------------------------------
// Type scale — sizes only. weights & lineHeights are applied per component.
// Body default is 14. The scale is dense at the small end because dense data
// UIs (filter chips, list cards) live there.
// -------------------------------------------------------------------------

export const font = {
  // ── Custom font families (design system 2026-05-31) ───────────────────────
  // Load with useFonts() from src/lib/fonts.ts before using.
  // Falls back to system UI font automatically if not yet loaded.
  //
  //   display/displayBold — Plus Jakarta Sans  — headings, large titles
  //   body*               — Public Sans        — body text, UI labels
  //   mono*               — JetBrains Mono     — points, stats, coordinates
  family: {
    display:      'PlusJakartaSans_800ExtraBold',
    displayBold:  'PlusJakartaSans_700Bold',
    body:         'PublicSans_400Regular',
    bodyMedium:   'PublicSans_500Medium',
    bodySemibold: 'PublicSans_600SemiBold',
    mono:         'JetBrainsMono_400Regular',
    monoMedium:   'JetBrainsMono_500Medium',
    monoBold:     'JetBrainsMono_600SemiBold',
  },
  size: {
    caption: 11, // tiny meta (status hint)
    xs: 12, // pill labels, captions
    sm: 13, // dense body (cards), default banner copy
    base: 14, // body default — the most common size
    md: 15, // emphasized body, FAB label
    lg: 16, // subtitle, input text
    xl: 18, // section title
    xxl: 20,
    h2: 24,
    h1: 28,
    display: 48,
    displayLg: 72,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    // Sizes computed as font.size × 1.4, rounded up — Dani Design Compiler approved formula.
    // Use wherever text needs explicit lineHeight control.
    caption: Math.round(11 * 1.4), // 15 → font.size.caption
    tight: Math.round(12 * 1.4), // 16 → font.size.xs
    base: Math.round(14 * 1.4), // 20 → font.size.base (most common)
    relaxed: Math.round(16 * 1.4), // 24 → font.size.lg
  },
};

// -------------------------------------------------------------------------
// Shadow — three tiers from subtle to prominent
// -------------------------------------------------------------------------

export const shadow = {
  // Cool-tinted shadows (design system 2026-05-30) — use `#0F1B2D` not pure black.
  // Matches the design spec: soft and cool-tinted, never harsh black.
  e1: {
    shadowColor: '#0F1B2D',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  e2: {
    shadowColor: '#0F1B2D',
    shadowOpacity: 0.09,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  e3: {
    shadowColor: '#0F1B2D',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  // Colored glow for map pins — lifts them off the basemap.
  pin: {
    shadowColor: '#1466E0',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
};

// -------------------------------------------------------------------------
// Accessibility — design baseline values that other tokens must respect
// -------------------------------------------------------------------------

export const a11y = {
  minTargetSize: 44, // iOS 44pt / Android 48dp — use the higher number when in doubt
};

// -------------------------------------------------------------------------
// Size — named values for component dimensions that recur across screens.
// Prefer these over inline literals so a resize is one-file change.
// -------------------------------------------------------------------------

export const size = {
  thumb: 80, // square photo thumbnail in FlagCard (TasksScreen)
  cardMin: 96, // minimum card height for no-photo FlagCards (density parity)
};

// -------------------------------------------------------------------------
// Severity — single source of truth for the 1→5 color ramp.
// Keep this aligned with severityColor() in src/lib/flags.ts.
// Each color is ALWAYS paired with a number + a word; never used as the
// only signal (color blind users + WCAG 1.4.1).
// -------------------------------------------------------------------------

export const severity = {
  // Design system 2026-05-30 — yellow→red ramp. Sev 1 uses dark text (yellow too light for white).
  1: { color: '#F7C948', label: 'Minor',    textOnColor: '#0F1B2D' }, // yellow — use dark ink text
  2: { color: '#F0A030', label: 'Low',      textOnColor: '#ffffff' },
  3: { color: '#F2792B', label: 'Moderate', textOnColor: '#ffffff' },
  4: { color: '#E85638', label: 'High',     textOnColor: '#ffffff' },
  5: { color: '#D92D20', label: 'Critical', textOnColor: '#ffffff' },
} as const satisfies Record<FlagSeverity, { color: string; label: string; textOnColor: string }>;

// -------------------------------------------------------------------------
// Heatmap severity — Dani Design Compiler COMMIT (2026-05-29, D5).
// Distinct from the pin-marker severity ramp above. These tokens encode
// the heatmap fill color so the heat layer reads as a continuous
// yellow→orange→red gradient, optimised for readability over the map
// tiles rather than discrete pin identification.
//
// Approved palette (from qa-reports/2026-05-29_Dani_HeatmapColorDecision.md):
//   sev1 = #fde047 (yellow-300)   → low-severity clusters
//   sev2 = #fb923c (orange-400)   → mild clusters
//   sev3 = #f97316 (orange-500)   → moderate clusters
//   sev4 = #ef4444 (red-500)      → high-severity clusters
//   sev5 = #dc2626 (red-600)      → severe clusters
//
// Usage: import into PlatformMap (native + web) and feed to colorForCell()
// instead of the `severity` token map above.
// -------------------------------------------------------------------------

export const heatmapSeverity = {
  1: { color: '#fde047', label: 'Minor' },
  2: { color: '#fb923c', label: 'Low' },
  3: { color: '#f97316', label: 'Moderate' },
  4: { color: '#ef4444', label: 'High' },
  5: { color: '#dc2626', label: 'Severe' },
} as const satisfies Record<FlagSeverity, { color: string; label: string }>;
