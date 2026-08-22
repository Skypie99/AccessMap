/**
 * Flagstone design tokens — the single source of truth for color, spacing,
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

// -------------------------------------------------------------------------
// Bulk-sheet material candidate (GSP-02, art-direction Phase 1b)
// -------------------------------------------------------------------------
//
// THE DEFECT (D8 / critic §9b, §15, D2): saturated UI beneath a bulk-glass
// sheet reads through it as UI. An amber severity pill ghosts behind the
// FlagDetail coordinates; the callout's blue button ghosts behind the Legend;
// in dark mode whole rows of the Tasks list are legible under the sheet.
//
// Two answers were proposed and only a device can pick between them, so both
// ship behind one flag and the loser is deleted in a cleanup commit (the
// C-lite precedent). Flip this constant, rebuild, compare on the phone:
//
//   'dense'    the floors below, arbitrated 2026-08-21 (DEFAULT).
//   'blur40'   the SHIPPED floors with the bulk blur raised 24 -> 40, and
//              FlagDetail dropping forceEngineered so it actually blurs.
//   'shipped'  byte-identical to `main` — the control arm.
//
// ⚠ TWO CORRECTED PREMISES, both measured (build/02/BUILD_REPORT.md):
//   1. Most bulk sheets in this app render the ENGINEERED *Lite gradient, not
//      the blur-mode floor (FlagDetail passes forceEngineered; Android always
//      does). So the dense candidate has to move BOTH pairs, not just the floor
//      the defect row named.
//   2. In dark, the plan's candidate floor 0.90 is LESS dense than the shipped
//      engineered stop 0.92 — applying it there would have made the app's worst
//      ghosting moment worse. The dark engineered stop lands at 0.95 instead.
//      Light text under a dark floor bleeds more than dark text under a light
//      one; the ghost table in the build report has the numbers.
//
// Arbiter: build/02/gsp-bulk-stacks.json -> exit 0, every ink PASS.
export type BulkFloorCandidate = 'dense' | 'blur40' | 'shipped';
// `as BulkFloorCandidate`, not a plain annotation: TypeScript narrows a const to
// its initializer, and the narrowed type makes every comparison below "no
// overlap" errors. The assertion keeps the union so flipping the word is the
// only edit the A/B needs.
export const BULK_FLOOR_CANDIDATE = 'dense' as BulkFloorCandidate;
const DENSE = BULK_FLOOR_CANDIDATE === 'dense';

export const color = {
  // Surfaces
  surface: '#fff', // primary background, button text on brand
  surfaceMuted: '#f7f9fc', // app-level subtle backgrounds (e.g. screen wash)
  surfaceSoft: '#f7f8fa', // input fields, card alt
  surfaceNeutral: '#eef1f5', // pill background, inactive chip
  overlay: 'rgba(255,255,255,0.97)', // floating panels (filter, banner) over map
  overlaySoft: 'rgba(255,255,255,0.95)',
  // Frosted-glass tint floor for GlassSurface — translucent enough to let the
  // blur/map texture show through, opaque enough to keep AA contrast for dark
  // text on ANY basemap (0.82 white over black ≈ #333 at >8:1). 2026-06-17.
  overlayGlass: 'rgba(255,255,255,0.82)',
  scrim: 'rgba(0,0,0,0.4)', // modal backdrop

  // Text — all checked ≥ 4.5:1 on surface
  textStrong: '#222', // headings (16:1 on white)
  text: '#333', // body (12.6:1)
  textMuted: '#666', // secondary (5.7:1 on #fff, AA pass). Also used as placeholderTextColor on surfaceSoft (#f7f8fa) where contrast is ~5.6:1 — still passes WCAG AA (4.5:1 for normal text).
  textSubtle: '#707070', // tertiary/faint — now AA: ~4.95:1 on surface, ~4.6:1 on surfaceMuted (was #999 / 2.85:1, which failed). Still lighter than textMuted, so the hierarchy holds.
  placeholderText: '#5b6470', // TextInput placeholder — AA pass: ~4.7:1 on white, ~4.5:1 on #f7f9fc
  textOnBrand: '#fff', // text drawn on brand-blue or severity colors
  // Fixed-dark text for use on amber/orange accents (accentOrange = #f1a520 in both palettes).
  // accentOrange does NOT change between light and dark mode, so this token is also fixed.
  // Contrast: #222 on #f1a520 = 6.3:1 — AA pass at any text size.
  textOnAccent: '#222',

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
  // Info / tip — calm blue pairing for *helpful* (non-warning) nudges, e.g. the
  // "add a photo" tip. Distinct from status-"open" semantics so a tip never
  // reads as an alert. (design system 2026-06-03 — more-expressive pass)
  infoBg: '#E7F0FD', // light blue wash
  infoFg: '#0E4499', // 7.9:1 on infoBg — AAA at any size
  error: '#c0392b', // banner background, destructive when subtle
  errorStrong: '#e74c3c', // destructive action background (delete)
  // Pressed deepen for the error-red CTAs (error-load banners + comment Retry).
  // error (#c0392b) is already the darkest red token, so its pressed state needs
  // one darker still; white on it ≈ 7:1. Mode-independent, the red-family sibling
  // to ctaFillPressed / successStrong.
  errorPressed: '#9e2a1e',
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
  accentOrange: '#f1a520', // amber accent for "watch / pinned" affordances (NotificationPrefsModal, ProfileScreen, SavedPlacesModal, MyWatchedModal, FlagDetailModal). Shares the amber band with severity[2].color (#F0A030, "Mild") — accepted, not a collision: severity is ALWAYS carried by a numbered disc + word (WCAG 1.4.1 + the BP10 disc grammar), never hue alone, so the shared amber never disambiguates meaning. accentOrange's own contrast duty is dark text on the fill (textOnAccent #222, ≥4.5:1). [R2 / T19 — comment-only resolution; hue unchanged]
  successStrong: '#1e8449', // WCAG AA green for white text on button background (4.6:1 vs color.success 2.8:1 fails). Used by bulk-resolve + FlashBanner success pill.
  accentPurple: '#5b21b6', // Purple accent for bulk-watch action buttons (8.8:1 on white — strong AA).

  // Backdrop / overlay layers — used by full-screen modals and photo UI
  backdropStrong: 'rgba(0,0,0,0.75)', // full-screen modal overlays (replaces raw rgba in PhotoLightboxModal)
  backdropCaption: 'rgba(0,0,0,0.65)', // caption bars on photos — contrast gain over scrim (Alex #3)
  overlayBtn: 'rgba(0,0,0,0.45)', // overlay action buttons (close button bg in lightbox)
  overlayBtnPressed: 'rgba(0,0,0,0.60)', // pressed state for overlay action buttons

  // Progress bar tracks on brand-colored surfaces (hero card, tinted cards).
  // Tokenizes the raw rgba literal used by milestone + tier progress bars
  // drawn on the blue hero background. Same semi-transparent white works for
  // both light and dark mode since the hero surface is always brand blue.
  surfaceVariant: 'rgba(255,255,255,0.25)',

  // Leaderboard podium row tints — rank 1/2/3.
  // Each is a very light wash; color.text (#333) on all three gives ≥ 12:1 contrast.
  tierGoldBg: '#fffbe6',   // warm gold wash — rank 1
  tierSilverBg: '#f3f4f6', // cool silver wash — rank 2
  tierBronzeBg: '#fef3ec', // warm bronze wash — rank 3

  // Podium medal tints — the rank 1/2/3 medal-icon colors (distinct from the row
  // washes above). Rank 1 reuses goldAccent. Decorative only (icon tint, always
  // paired with the numeric rank), so contrast is secondary to the metal feel.
  medalSilver: '#9AA7B5',
  medalBronze: '#C0884F',

  // Anonymous-contributor chip background (FlagCard). Neutral mid-gray;
  // white label text on it is ~4.7:1 — AA at any size.
  anonNeutral: '#6b7280',

  // Navigation chrome. Tokenizes the literals previously hardcoded in
  // RootNavigator (header #0d1829, tint #60a5fa, etc.).
  // NOTE: these were once identical in light + dark ("always-dark nav chrome").
  // They are NOT any more — Phase 8 flipped the header and Phase 12 the tab bar
  // to light-mode surfaces, and the 2026-07-25 device-tune D2 pass took the
  // hamburger drawer off the fixed-background list entirely (GLASS.md §8).
  // Read each token's own comment; do not assume the pair matches.
  // Phase 8: the app HEADER is now a clean light editorial bar in LIGHT mode
  // (deep-navy title on white) and stays dark in the dark palette. The TAB BAR
  // tokens below stay always-dark — the frosted glass bar reads dark in both.
  headerBg: '#ffffff', // light editorial header background (light mode)
  headerFg: '#16213a', // deep-navy header title + icon tint (~13:1 on #fff)
  headerBtnBg: 'rgba(22,33,58,0.06)', // hamburger/Feedback button wash on the light header
  headerBtnBgPressed: 'rgba(22,33,58,0.12)',
  headerBorder: 'rgba(22,33,58,0.10)', // hairline under the light header
  // Phase 12: the tab bar is now a LIGHT frosted bar in light mode (dark in the
  // dark palette) — completes the all-light editorial identity.
  tabBarBg: 'rgba(255,255,255,0.92)', // light tab bar surface (light mode)
  tabBarGlassFloor: 'rgba(255,255,255,0.82)', // AA contrast floor over the blur
  tabBarBlurTint: 'light', // expo-blur tint for the frosted bar (light mode)
  tabBarActiveTint: '#0F53BE', // active tab — brandText, ~7.6:1 on the light bar
  tabBarInactiveTint: '#515964', // inactive tab — muted slate. R2/T15: darkened from #6B7280, which FAILED AA (3.17:1) on the 0.82 glass floor over #000 (dark photos / always-dark web tiles under the frosted bar; the old "~4.8:1 on white" comment ignored the translucent states the bar actually reaches). #515964 is the lightest slate clearing 4.5:1 with margin on that worst composite (4.65:1; 5.92:1 on the 0.92 RT/web surface), luminance ~matched to the active tint #0F53BE so active/inactive separate by hue not weight. Dark mode is a separate token (untouched). Arbiter: r2-tabbar-ink-stacks.json.
  navBorder: 'rgba(22,33,58,0.10)', // hairline divider on the light tab bar

  // Achievement earned-state wash — light amber behind unlocked badges.
  achievementEarnedBg: '#fff3d1',

  // -----------------------------------------------------------------------
  // Liquid glass — "Deep Field" material system (Tasks glass pass, 2026-07-03).
  // Values are the Material Lab's script-arbitrated spec (contrast-check.mjs,
  // 66 pairs, exit 0) — the mock's passing floors ARE these tokens. Do not
  // tune by eye; re-run the arbiter if any value changes. Full law: GLASS.md.
  // -----------------------------------------------------------------------
  // Which palette this is — lets ScreenStage/GlassSurface pick per-mode
  // recipes (dark = luminosity-led, shadows retired) without re-deriving the
  // effective scheme. Same cast-at-declaration pattern as tabBarBlurTint.
  scheme: 'light' as 'light' | 'dark',
  // The stage — the designed screen background the glass floats over.
  stage0: '#E7F0FD',
  stage1: '#F6F9FE',
  stage2: '#F1F5FB',
  stagePoolA: 'rgba(46,124,246,0.12)', // brand light pool, top-left
  stagePoolB: 'rgba(15,83,190,0.06)', // counter-pool, bottom-right (dark: none)
  // Row glass (FlagCards / empty card / skeletons) — true blur i=12.
  glassRowFloor: 'rgba(255,255,255,0.70)',
  glassRowEdge: 'rgba(255,255,255,0.62)',
  glassRowSpecular: 'rgba(255,255,255,0.90)',
  // Chrome glass (the header pane) — true blur i=24, the most see-through tier.
  glassChromeFloor: 'rgba(255,255,255,0.75)',
  glassChromeEdge: 'rgba(15,40,90,0.10)',
  glassChromeLip: 'rgba(255,255,255,0.70)',
  // Banner glass ("Nearest open barrier") — a scrolling i=12 pane.
  glassBannerFloor: 'rgba(217,231,253,0.70)',
  glassBannerEdge: 'rgba(20,102,224,0.35)',
  glassBannerSpecular: 'rgba(255,255,255,0.65)',
  // Bulk-action bar — the second, conditional i=24 pane (select mode only) —
  // and the blur-mode floor of every bulk SHEET that does not force the
  // engineered path (Legend, Nearby, About, Help, Feedback, the Sheet primitive).
  glassBulkFloor: DENSE ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.85)',
  // The dense candidate's floor as a named token, so it is readable even when
  // the flag is off. GSP-02 §2.2; arbitrated in build/02/gsp-bulk-stacks.json.
  glassBulkFloorDense: 'rgba(255,255,255,0.97)',
  glassBulkSpecular: 'rgba(255,255,255,0.80)',
  // Engineered chip tint — pills/chips/search ON the chrome pane carry no blur
  // of their own; the pane blurs, the chip tints.
  glassChipFill: 'rgba(255,255,255,0.60)',
  glassChipEdge: 'rgba(22,33,58,0.10)',
  glassChipInk: '#333',
  glassGhostEdge: 'rgba(22,33,58,0.18)', // ghost action-pill hairline on row glass
  glassNeutralBtn: 'rgba(22,33,58,0.06)', // "Resolved" neutral fill on row glass
  glassCancelFill: 'rgba(255,255,255,0.62)', // bulk-bar Cancel fill
  glassSelectedTint: 'rgba(217,231,253,0.35)', // selected-card wash over the row floor
  // Map pass: an extra wash painted (as overlayTint) on the filter panel so its
  // muted / link inks clear AA over LIVE map tiles, where the row floor alone is
  // too thin. Renders in blur + engineered modes; the RT path never paints it
  // (the 0.97 opaque fill out-contrasts it anyway).
  glassMapWash: 'rgba(255,255,255,0.30)',
  glassSkeletonBar: 'rgba(15,27,45,0.08)',
  glassSheen: 'rgba(255,255,255,0.35)', // press-sheen wash top stop
  // Inks on glass — every fork below was script-decided over worst-case
  // scrolling content, both modes (see GLASS.md for the failed candidates).
  inkGlassMuted: '#414B5A', // eyebrow / subtitle / sort-label on chrome glass
  inkOnStage: '#525C6B', // section headers + footer text on the raw stage
  inkSelect: '#0F53BE', // "Select multiple" entry ink
  inkDetailsGhost: '#1466E0', // Details ghost-button ink on row glass
  // CTA fill is MODE-INDEPENDENT: dark brand #4E89EF + white = 3.4:1 (fails);
  // #1466E0 + white = 5.24:1 both modes. Verify / active chips / bulk Verify.
  ctaFill: '#1466E0',
  // Pressed companion to ctaFill — a MODE-INDEPENDENT deepen (#0F53BE = the
  // brand deep-end). white + #0F53BE = 7.00:1 in BOTH modes (measured; the
  // docs used to say 7.5 at both sites — SR-077), so a brand-filled
  // control darkens on press without breaking its white label in dark mode
  // (where brandText is a LIGHTER blue). Mirrors borderPressed (neutral) +
  // successStrong (resolve) — the AA-safe pressed fill for its family.
  ctaFillPressed: '#0F53BE',
  glassPlaceholder: '#5B6470', // search placeholder on the chip tint
  // C-lite engineered equivalents (B's opaline architecture wearing C's tint):
  // vertical micro-gradients replacing BlurView+floor when blur is off
  // (Android always; C-lite runtime mode; per-surface opt-out).
  glassRowLite0: 'rgba(255,255,255,0.92)',
  glassRowLite1: 'rgba(255,255,255,0.84)',
  // Map command-bar CRYSTAL tier (map-chrome compaction, Sky-locked B-refined
  // 2026-08-12). The thinnest engineered floors the arbiter allows for the ONE
  // persistent map pane — ~40% more map luminance through the worst edge than
  // glassRowLite. The bottom stop (glassMapCrystal1) doubles as the blur-mode
  // floorColor (mode-independent floor math). Inks pay the transparency price:
  // bar text = textStrong #222, tool icons = brandTextAlt #0E4499 (muted grays
  // + plain inkSelect fail here — arbiter map-chrome-crystal-stacks.json).
  glassMapCrystal0: 'rgba(255,255,255,0.70)',
  glassMapCrystal1: 'rgba(255,255,255,0.60)',
  glassBannerLite0: 'rgba(217,231,253,0.92)',
  glassBannerLite1: 'rgba(217,231,253,0.84)',
  glassChromeLite0: 'rgba(255,255,255,0.93)',
  glassChromeLite1: 'rgba(255,255,255,0.88)',
  // The stops FlagDetail actually renders (it passes forceEngineered). The
  // bottom stop is the one directly under the sheet's foot, where the Tasks
  // card ghosts through.
  //
  // ⚠ 0.97, NOT the plan's 0.92 — and the difference is the simulator, not an
  // opinion. Built at 0.92 first, because that is the ratified target; the 17e
  // then showed "Very steep sidewalk", "9.9 km · 2d ago" and a whole
  // Verify/Resolved/Reject/Details row still legible under the sheet. Measured
  // against the Tasks card's #222 text over the light stage:
  //     0.90 = 1.199:1 · 0.92 = 1.155:1 · 0.95 = 1.093:1 · 0.97 = 1.054:1
  // Rule S2 asks for the value that stops ANY saturated token beneath from
  // reading through, and names 0.92 as a TARGET "whichever the arbiter and the
  // device prefer". The device preferred 0.97. The cost is honest and is
  // Sky's to weigh on the phone: at 0.97 this tier is nearly opaque, which is
  // exactly what the 'blur40' arm of the A/B exists to argue against.
  glassBulkLite0: DENSE ? 'rgba(255,255,255,0.99)' : 'rgba(255,255,255,0.95)',
  glassBulkLite1: DENSE ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.90)',

  // Misc
  shadow: '#000',
  // Elevation shadow tint — the cool navy used by shadow.e1/e2/e3. In dark mode
  // (ThemeContext) this flips to a soft cool glow, since a dark shadow is
  // invisible on dark surfaces. Consumed by the Card primitive via useColor().
  shadowTint: '#0F1B2D',
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
    // Family completed (pre-ship polish 2026-08-01) so every size has a token.
    // Body sizes keep the ×1.4 formula; display sizes use ×1.25 — headline
    // leading at 1.4 reads gappy past 20pt.
    sm: Math.round(13 * 1.4), // 18 → font.size.sm
    md: Math.round(15 * 1.4), // 21 → font.size.md
    xl: Math.round(18 * 1.4), // 25 → font.size.xl
    xxl: Math.round(20 * 1.4), // 28 → font.size.xxl
    h2: Math.round(24 * 1.25), // 30 → font.size.h2
    h1: Math.round(28 * 1.25), // 35 → font.size.h1
    display: Math.round(48 * 1.25), // 60 → font.size.display
  },
  // Letter-spacing (tracking) for display/heading variants — tight, premium feel.
  // Values are absolute pt (RN letterSpacing is pt, not em). Rule of thumb:
  // tracking ≈ fontSize × -0.02. AppText derives the right one from its size.
  // Replaces the old hardcoded -0.3 (only correct near 15pt) — fixes the
  // JSDoc/code "-0.02em vs -0.3" mismatch.
  tracking: {
    display: -1.0, // font.size.display (48pt) — hero headlines
    h1: -0.55, // font.size.h1 (28pt) — screen titles
    xl: -0.35, // font.size.xl (18pt) — section headings
    heading: -0.3, // font.size.lg (16pt) default — heading variant at base size
    none: 0, // body / mono — no tracking
    loose: 0.4, // all-caps labels / uppercase pill text (badge/pill scale)
    // Uppercase SECTION labels (xs/caption size, inkGlassMuted) — the app's
    // dominant practice was 0.8 across Legend/Profile; About (0.6) and
    // FlagDetail (0.5) drifted. Named + converged in the pre-ship polish.
    section: 0.8,
    // Wide editorial eyebrow — the ScreenHeader all-caps micro-label practice,
    // tokenized (pre-ship polish 2026-08-01). Eyebrows are ROOMY (1.2);
    // dense pill caps stay on `loose`. ScreenHeader.EYEBROW_TRACKING derives
    // from this token.
    eyebrow: 1.2,
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
  // Expressive colored glows (more-expressive pass 2026-06-03). Purely
  // decorative depth for primary CTAs and celebratory gamification surfaces —
  // never the only signal, and they sit under AA-contrast content. Tuned softer
  // than `pin` so a button feels lifted, not neon.
  glowBrand: {
    shadowColor: '#1466E0',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  glowGold: {
    shadowColor: '#FBB024',
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
};

// -------------------------------------------------------------------------
// Bulk-glass card up-shadow — the canonical bottom-sheet / modal-card shadow
// (pre-ship polish 2026-08-01: hoisted from 16 byte-identical hand-copies).
// Dark mode keeps the ONE deliberate dark drop-shadow (GLASS.md §2 — the bulk
// exception); light rides shadowTint. Spread on the OUTER wrapper — an
// overflow:hidden card clips its own shadow:
//   ...bulkGlassShadow(color)
// TasksScreen's 8/{0,-2}/8 variant is a deliberate different recipe — not this.
// -------------------------------------------------------------------------

export function bulkGlassShadow(c: { scheme: 'light' | 'dark'; shadowTint: string }) {
  return {
    ...(c.scheme === 'dark'
      ? { shadowColor: '#000', shadowOpacity: 0.35 }
      : { shadowColor: c.shadowTint, shadowOpacity: 0.12 }),
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 5,
  };
}

// -------------------------------------------------------------------------
// Gradient — the more-expressive pass (2026-06-03). Bold, *mode-independent*
// brand/gamification gradients for always-colored surfaces (primary CTAs, the
// FAB, the Profile hero, points/achievement accents). They are NOT themed:
// like the sign-in hero and map overlays, a brand-blue gradient is brand-blue
// in light and dark alike (DESIGN.md "fixed-background exceptions").
//
// Feed to expo-linear-gradient: <LinearGradient colors={gradient.brand} .../>.
// Default direction is top-left → bottom-right (set start/end at the call site).
// Contrast rule: white label text on `brand`/`brandHero` must stay ≥16pt bold
// (the lightest stop is ~3.4:1 on white — same AA-large/UI posture as the solid
// brand token it replaces). `gold` carries INK text only (never white).
// -------------------------------------------------------------------------

export const gradient = {
  brand: ['#2E7CF6', '#0F53BE'] as const, // primary button / FAB — blue deepening
  brandHero: ['#2E7CF6', '#1466E0', '#0B3D8F'] as const, // Profile / feature hero
  gold: ['#FFC64D', '#F2A60C'] as const, // gamification (points / achievements) — ink text only
} as const;

// -------------------------------------------------------------------------
// Glass — the "Deep Field" material spec (GLASS.md is the law; these are its
// machine-readable numbers). Intensities are expo-blur values per surface
// tier. maxLivePanes is the blur BUDGET: the ceiling on concurrently VISIBLE
// BlurViews (~9–10 rows + chrome + banner; select mode adds the bulk bar).
// The list's own virtualization is what keeps the row count bounded — never
// defeat it (windowSize stays default; no removeClippedSubviews tricks).
// -------------------------------------------------------------------------

export const glass = {
  maxLivePanes: 12,
  // bulk rises to 40 ONLY under the 'blur40' candidate (GSP-02) — the other arm
  // of the sheet-ghosting A/B. The budget is unchanged either way: blur STRENGTH
  // costs nothing extra against maxLivePanes, which counts panes, not intensity.
  intensity: { row: 12, chrome: 24, banner: 12, bulk: BULK_FLOOR_CANDIDATE === 'blur40' ? 40 : 24 },
} as const;

// -------------------------------------------------------------------------
// Motion — durations, easing curves, and spring presets. DESIGN.md §8 ("≤ 200ms").
// Kept as pure data so this file stays runtime-free: easing values are
// cubic-bezier control points — build them with Easing.bezier(...) at the call
// site, e.g. `Easing.bezier(...motion.easing.standard)`. Spring presets spread
// into Animated.spring(); set useNativeDriver per call. ALWAYS gate non-trivial
// motion behind useReducedMotion() from src/lib/accessibility.
// -------------------------------------------------------------------------

export const motion = {
  // Named durations in ms. Never exceed `base` for micro-interactions.
  duration: {
    instant: 0, // reduced-motion fallback — snap with no perceived delay
    fast: 120, // icon swaps, small fades, press ripples
    base: 180, // most micro-interactions (satisfies DESIGN.md §8 ≤ 200ms)
    slow: 320, // sheet reveals, progress fills — use sparingly
    pulse: 700, // looped skeleton-shimmer half-cycle — a slow ambient loop,
    // deliberately OFF the ≤320 micro-interaction scale (documented, not a stray
    // literal). B5/L4-10.
  },
  // Cubic-bezier control points. Usage: Easing.bezier(...motion.easing.standard)
  easing: {
    standard: [0.4, 0, 0.2, 1] as const, // general value transitions
    decelerate: [0.0, 0.0, 0.2, 1] as const, // things that "arrive" (sheet in)
    accelerate: [0.4, 0.0, 1.0, 1] as const, // things that "leave" (sheet out)
  },
  // Animated.spring presets — spread into the config; add useNativeDriver per call.
  spring: {
    press: { speed: 50, bounciness: 0 }, // button press-in (matches current Button)
    pressOut: { speed: 50, bounciness: 2 }, // button release
    sheet: { speed: 18, bounciness: 4 }, // sheet / card entrance
    drawer: { tension: 70, friction: 12 }, // drawer slide-in
  },
} as const;

// -------------------------------------------------------------------------
// Accessibility — design baseline values that other tokens must respect
// -------------------------------------------------------------------------

export const a11y = {
  minTargetSize: 44, // iOS 44pt / Android 48dp — use the higher number when in doubt
  // Visible focus indicator (WCAG 2.4.7 / 2.4.11). Draw a ring in color.brand
  // (≥3:1 as a UI component on surface in both palettes) at this width, inset
  // by the offset so it reads as a halo, not a border. Consume color via
  // useColor() at the call site. (more-expressive pass 2026-06-03)
  focusRingWidth: 2,
  focusRingOffset: 2,
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
// Icon — named sizes for Lucide / SVG icons so call sites stop using ad-hoc
// numbers (size={18}, size={16}, …). Pair with the matching component scale:
// sm → controls/affordances, md → nav/section, lg → category/map chrome,
// hero → empty-state + hero illustrations. (Design system 2026-06-17.)
// -------------------------------------------------------------------------

export const icon = {
  sm: 16, // close buttons, inline affordances, form helpers
  md: 20, // navigation, section headers, list-row leading icons
  lg: 24, // category icons, map-chrome buttons, drawer items
  hero: 48, // empty-state + hero illustrations
  // The estate's de-facto standard, named (pre-ship polish 2026-08-01): the
  // dominant Lucide pairing app-wide is size 18 / strokeWidth 2.2 (~108 call
  // sites). New inline icons use these two; the sm/md/lg/hero scale remains
  // for deliberately scaled contexts.
  inline: 18,
  stroke: 2.2, // strokeWidth, not a px size — the house Lucide line weight
};

// Android Switch OFF-state thumb — RN/Material's default gray, made explicit
// so all Switches match. Mode-independent on purpose: the thumb sits on the
// OS-drawn track, not on our themed surfaces.
export const androidSwitchThumbOff = '#f4f3f4';

// -------------------------------------------------------------------------
// Severity — single source of truth for the 1→5 color ramp.
// Keep this aligned with severityColor() in src/lib/flags.ts.
// Each color is ALWAYS paired with a number + a word; never used as the
// only signal (color blind users + WCAG 1.4.1).
// -------------------------------------------------------------------------

export const severity = {
  // Design system 2026-05-30 — yellow→red ramp. The `label` here is the SINGLE
  // SOURCE OF TRUTH for the severity scale — a human, graduated set (Minor →
  // Severe) that matches DESIGN.md's "Severe (5)" example and the
  // SEVERITY_DESCRIPTIONS in flags.ts. SeverityBadge reads these labels, and
  // both SEVERITY_LABELS (flags.ts) and heatmapSeverity (below) DERIVE from
  // them, so every surface names a given severity identically.
  //
  // textOnColor (2026-07-02 Material Lab AA audit): white text FAILS WCAG AA
  // on the mid-ramp fills — ~2.1:1 on sev-2, ~2.5:1 on sev-3, ~3.4:1 on sev-4
  // (floor 4.5:1 at badge text sizes). Ink #0F1B2D measures 8.05 / 6.21 / 4.79
  // on those same fills, so severities 1–4 all carry ink; only sev-5 red keeps
  // white (4.83:1 — ink would fail there).
  1: { color: '#F7C948', label: 'Minor',       textOnColor: '#0F1B2D' },
  2: { color: '#F0A030', label: 'Mild',        textOnColor: '#0F1B2D' },
  3: { color: '#F2792B', label: 'Moderate',    textOnColor: '#0F1B2D' },
  4: { color: '#E85638', label: 'Significant', textOnColor: '#0F1B2D' },
  5: { color: '#D92D20', label: 'Severe',      textOnColor: '#ffffff' },
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
  // Colors are the distinct D5 heat ramp (asserted by HeatmapLayer.test); the
  // LABELS derive from `severity` above so the heat legend never drifts from the
  // pin/badge scale. One source of truth for the wording, two ramps for color.
  1: { color: '#fde047', label: severity[1].label },
  2: { color: '#fb923c', label: severity[2].label },
  3: { color: '#f97316', label: severity[3].label },
  4: { color: '#ef4444', label: severity[4].label },
  5: { color: '#dc2626', label: severity[5].label },
} as const satisfies Record<FlagSeverity, { color: string; label: string }>;
