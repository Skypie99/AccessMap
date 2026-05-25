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
  surface: '#fff',              // primary background, button text on brand
  surfaceMuted: '#f7f9fc',      // app-level subtle backgrounds (e.g. screen wash)
  surfaceSoft: '#f7f8fa',       // input fields, card alt
  surfaceNeutral: '#eef1f5',    // pill background, inactive chip
  overlay: 'rgba(255,255,255,0.97)', // floating panels (filter, banner) over map
  overlaySoft: 'rgba(255,255,255,0.95)',
  scrim: 'rgba(0,0,0,0.4)',     // modal backdrop

  // Text — all checked ≥ 4.5:1 on surface
  textStrong: '#222',           // headings (16:1 on white)
  text: '#333',                 // body (12.6:1)
  textMuted: '#666',            // secondary (5.7:1 on #fff, AA pass). Also used as placeholderTextColor on surfaceSoft (#f7f8fa) where contrast is ~5.6:1 — still passes WCAG AA (4.5:1 for normal text).
  textSubtle: '#999',           // disabled / tertiary; only for non-essential text or 18pt+
  textOnBrand: '#fff',          // text drawn on brand-blue or severity colors

  // Brand — primary action color
  // brand:     UI surfaces / button backgrounds / ≥14pt bold text on white
  // brandText: small bold text on white (passes WCAG 1.4.3 AA at any size)
  //
  // Migration note: existing color.brand usages on small text should
  // gradually move to color.brandText. New code should use brandText
  // for text-on-white anywhere it's NOT explicitly ≥14pt bold.
  brand: '#2f80ed',             // 3.3:1 on white → UI/large-text only (AA UI 3:1)
  brandText: '#1c4f99',         // 7.6:1 on white → AA pass at any text size
  brandTextAlt: '#1a4fa3',      // near-identical AA-safe brand text (used by UpdateBanner, SavedPlacesModal, FilterPresetsModal, MapScreen). Kept as a separate token so future dark-mode swap can choose to merge with brandText or keep distinct.
  brandSoft: '#d6e6f9',         // brand-tinted background for verified pill
  brandSofter: '#eaf3ff',       // even lighter brand wash (chip backgrounds, banner backgrounds, "manage" affordances)
  brandOnSoft: '#1c4f99',       // dark brand text for use on brandSoft (7.6:1)

  // Status surfaces (bg + fg pairings) — used by status pills, banners
  // Each fg passes AA on its bg.
  statusOpenBg: '#fdebd0',
  statusOpenFg: '#8a4b00',      // 6.5:1 on statusOpenBg
  statusVerifiedBg: '#d6e6f9',
  statusVerifiedFg: '#1c4f99',  // 7.6:1
  statusResolvedBg: '#d4ecdb',
  statusResolvedFg: '#1b6b34',  // 6.4:1
  statusRejectedBg: '#e5e5e5',
  statusRejectedFg: '#3a3a3a',  // 10.4:1

  // Semantic
  success: '#27ae60',           // resolve action background (text on it must be white-large)
  successSoft: '#d4ecdb',
  warningBg: '#fff7e6',
  warningFg: '#714b00',         // 8.3:1 on warningBg
  warningHint: '#a04040',       // for inline hint text on white (4.6:1)
  error: '#c0392b',             // banner background, destructive when subtle
  errorStrong: '#e74c3c',       // destructive action background (delete)
  errorBg: '#fdecea',
  errorFg: '#8a1f1f',           // 7.4:1 on errorBg

  // Borders / dividers
  border: '#e5e5e5',
  borderStrong: '#d0d4dc',
  borderSubtle: '#dde2ea',
  borderPressed: '#dde3eb',     // pressed-state background on neutral chips/buttons (MyReportsModal, ActivityFeedModal, NearbyFlagsModal, MyWatchedModal)
  divider: '#ddd',

  // Additional muted-text / accent tokens
  textMutedAlt: '#5b6470',      // AA-safe muted text on light surfaces (4.6:1 on #f4f6f8) — used by ReportFlagModal hints, NotificationPrefsModal copy, TasksScreen
  accentOrange: '#f1a520',      // amber accent for "watch / pinned" affordances (NotificationPrefsModal, ProfileScreen, SavedPlacesModal, MyWatchedModal, FlagDetailModal). Distinct from severity[4].color (#e67e22) on purpose.

  // Misc
  shadow: '#000',
  pointsPillText: '#dbe7fb',    // light-blue label on brand-blue background
};

// -------------------------------------------------------------------------
// Spacing — 4pt grid, names match how it's most often used
// -------------------------------------------------------------------------

export const spacing = {
  tight: 4,    // gap between text + adjacent icon, very small offsets
  xs: 6,
  sm: 8,       // most common gap
  md: 12,      // most common padding
  lg: 16,      // section padding
  xl: 20,
  xxl: 24,     // generous screen padding
  xxxl: 32,
};

// -------------------------------------------------------------------------
// Border radius
// -------------------------------------------------------------------------

export const radius = {
  xs: 4,
  sm: 6,
  md: 8,       // default for cards/buttons
  lg: 12,      // panels, modals
  xl: 16,      // sheet headers
  full: 999,   // pills, FABs, round icon buttons
};

// -------------------------------------------------------------------------
// Type scale — sizes only. weights & lineHeights are applied per component.
// Body default is 14. The scale is dense at the small end because dense data
// UIs (filter chips, list cards) live there.
// -------------------------------------------------------------------------

export const font = {
  size: {
    caption: 11,   // tiny meta (status hint)
    xs: 12,        // pill labels, captions
    sm: 13,        // dense body (cards), default banner copy
    base: 14,      // body default — the most common size
    md: 15,        // emphasized body, FAB label
    lg: 16,        // subtitle, input text
    xl: 18,        // section title
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
};

// -------------------------------------------------------------------------
// Shadow — three tiers from subtle to prominent
// -------------------------------------------------------------------------

export const shadow = {
  e1: {
    shadowColor: color.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  e2: {
    shadowColor: color.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  e3: {
    shadowColor: color.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
};

// -------------------------------------------------------------------------
// Accessibility — design baseline values that other tokens must respect
// -------------------------------------------------------------------------

export const a11y = {
  minTargetSize: 44, // iOS 44pt / Android 48dp — use the higher number when in doubt
};

// -------------------------------------------------------------------------
// Severity — single source of truth for the 1→5 color ramp.
// Keep this aligned with severityColor() in src/screens/ReportFlagModal.tsx.
// Each color is ALWAYS paired with a number + a word; never used as the
// only signal (color blind users + WCAG 1.4.1).
// -------------------------------------------------------------------------

export const severity = {
  1: { color: '#27ae60', label: 'Minor' },
  2: { color: '#7fb800', label: 'Low' },
  3: { color: '#f1c40f', label: 'Moderate' },
  4: { color: '#e67e22', label: 'High' },
  5: { color: '#e74c3c', label: 'Severe' },
} as const satisfies Record<FlagSeverity, { color: string; label: string }>;
