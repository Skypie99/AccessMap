/**
 * ThemeContext — Dark-mode Phase 2
 *
 * Provides a `ColorTheme` object whose values switch between the light and
 * dark palettes based on the device's color scheme. Every screen and
 * component that used `import { color } from '@/theme'` should instead call
 * `const color = useColor()` so they respond to system appearance changes.
 *
 * Usage:
 *   import { useColor } from '@/theme/ThemeContext';
 *   // inside component:
 *   const color = useColor();
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { color as lightColor } from '../theme';

// -------------------------------------------------------------------------
// Dark palette — same token names as lightColor, dark-mode values.
// All contrast ratios checked against WCAG 2.2 AA on dark surfaces.
// -------------------------------------------------------------------------

const darkColor = {
  // Surfaces — dark-mode elevation (overhaul Phase 2). Surfaces ASCEND in
  // lightness so a raised card reads ABOVE its screen wash, mirroring the light
  // palette's "raised = lighter" lift. This was inverted: `surface` (#111, the
  // CARD tone) sat darker than `surfaceMuted` (#1a1a1a, the SCREEN wash), so
  // every card receded into the page like a hole instead of lifting off it.
  // New order, deepest → highest: wash < card < input/alt < chip.
  surface: '#1E1E22',        // cards / raised base — now lighter than the wash
  surfaceMuted: '#121214',   // screen wash — the deepest plane
  surfaceSoft: '#28282C',    // inputs / alt cards — a step above the card
  surfaceNeutral: '#323237', // inactive chips — highest neutral
  overlay: 'rgba(20,20,20,0.97)',
  overlaySoft: 'rgba(20,20,20,0.95)',
  overlayGlass: 'rgba(20,20,20,0.82)', // frosted-glass tint floor (dark) — AA for light text
  scrim: 'rgba(0,0,0,0.6)',

  // Text — checked >= 4.5:1 on #111 surface
  textStrong: '#f5f5f5', // ~18:1 on #111
  text: '#ddd', // ~13:1 on #111
  textMuted: '#aaa', // ~6.7:1 on #111
  textSubtle: '#8a8a8a', // tertiary/faint — now AA (~4.8:1 on the dark surface). Lightened from #777 (which dipped below AA once the surface lifted).
  textOnBrand: '#fff',
  // accentOrange is the same in both palettes; dark text remains correct (6.3:1 on #f1a520)
  textOnAccent: '#222',

  // Brand — Wayfinder Blue on dark; lightened for legibility on dark surfaces
  brand: '#4E89EF',     // blue-400 — readable on dark, keeps brand feel
  brandText: '#84AEF6', // blue-300 — AA on #111 dark surface
  brandTextAlt: '#84AEF6',
  brandSoft: '#0E4499',  // blue-700 — dark brand tinted background
  brandSofter: '#0F2D5E', // even darker wash
  brandOnSoft: '#B4CFFA', // blue-200 — text on dark brandSoft

  // Gamification gold — stays readable on dark
  goldAccent: '#FBB024',
  goldLight: '#3D2A00',
  goldMid: '#4D3500',
  goldDark: '#FCC44D',

  // Status surfaces — dark-mode equivalents for design-system status tokens
  statusOpenBg: '#0E2A5C',
  statusOpenFg: '#84AEF6',
  statusVerifiedBg: '#083928',
  statusVerifiedFg: '#6EE7B7',
  statusResolvedBg: '#063520',
  statusResolvedFg: '#6EE7B7',
  statusRejectedBg: '#2a2a2a',
  statusRejectedFg: '#d1d5db',

  // Semantic — same colors, still readable on dark surfaces
  success: '#27ae60',
  successSoft: '#14361f',
  warningBg: '#2d1f00',
  warningFg: '#fbbf24',
  warningHint: '#f87171',
  // Info / tip — dark calm-blue pairing (mirrors the dark "open" status blue).
  infoBg: '#0E2A5C',
  infoFg: '#84AEF6', // 6.2:1 on infoBg — AA at any size
  error: '#c0392b',
  errorStrong: '#e74c3c',
  errorBg: '#3b0f0f',
  errorFg: '#fca5a5',

  // Borders / dividers
  border: '#333',
  borderStrong: '#444',
  borderSubtle: '#2d2d2d',
  borderPressed: '#3a3a3a',
  divider: '#2d2d2d',

  // Additional tokens
  textMutedAlt: '#9ca3af', // muted text on dark surfaces
  accentOrange: '#f1a520', // same amber accent
  // successStrong: dark mode keeps the same deep green — white text at 4.6:1 holds on dark bg.
  successStrong: '#1e8449',
  // accentPurple: lighter violet so the button is legible on dark surfaces.
  accentPurple: '#7c3aed', // violet-600, white text 5.5:1 on it
  placeholderText: '#9ca3af', // TextInput placeholder on dark surfaces (~6:1 on #222)

  // Backdrop / overlay layers — same values as light palette (dark-on-dark is still appropriate)
  backdropStrong: 'rgba(0,0,0,0.85)', // full-screen modal overlay on dark bg
  backdropCaption: 'rgba(0,0,0,0.75)', // caption bar on photos
  overlayBtn: 'rgba(255,255,255,0.2)', // overlay button on dark bg (brighter for visibility)
  overlayBtnPressed: 'rgba(255,255,255,0.30)', // pressed state for overlay button on dark bg

  // Progress bar track on brand-colored surfaces — same semi-transparent white
  // works on dark mode since the hero card is always brand blue.
  surfaceVariant: 'rgba(255,255,255,0.25)',

  // Leaderboard podium row tints — dark-mode equivalents.
  // color.text (#ddd) on each gives ≥ 10:1 contrast.
  tierGoldBg: '#2d2509',   // dark warm gold wash — rank 1
  tierSilverBg: '#1d1d1f', // very slightly elevated from surface — rank 2
  tierBronzeBg: '#2d1a0d', // dark warm bronze wash — rank 3

  // Podium medal tints — lightened slightly for legibility on dark surfaces.
  medalSilver: '#B0BEC8',
  medalBronze: '#D4986A',

  // Anonymous-contributor chip — same neutral; white label text stays readable.
  anonNeutral: '#6b7280',

  // Navigation chrome — always-dark, so IDENTICAL to the light palette.
  headerBg: '#0d1829',
  headerFg: '#f0f6ff',
  headerBtnBg: 'rgba(255,255,255,0.12)',
  headerBtnBgPressed: 'rgba(255,255,255,0.22)',
  headerBorder: 'rgba(255,255,255,0.1)',
  tabBarBg: 'rgba(7,11,24,0.92)',
  tabBarGlassFloor: 'rgba(7,11,24,0.85)',
  tabBarBlurTint: 'dark',
  tabBarActiveTint: '#60a5fa',
  tabBarInactiveTint: 'rgba(255,255,255,0.55)',
  navBorder: 'rgba(255,255,255,0.1)',

  // Achievement earned-state wash — dark amber so unlocked badges read on dark.
  achievementEarnedBg: '#3D2A00',

  // -----------------------------------------------------------------------
  // Liquid glass — "Deep Field" dark palette (luminosity-led: floors LIFT
  // above the stage, edges become cool #A8C0E0-family hairlines, drop
  // shadows retire). Script-arbitrated like the light set — see GLASS.md.
  // -----------------------------------------------------------------------
  scheme: 'dark',
  // The stage — dark field IS the light source: one glowing pool, 2-stop base.
  stage0: '#0E1220',
  stage1: '#14151A',
  stage2: '#14151A',
  stagePoolA: 'rgba(20,102,224,0.16)',
  stagePoolB: 'transparent', // no counter-pool in dark — ScreenStage skips it
  // Row glass — i=12.
  glassRowFloor: 'rgba(30,34,46,0.72)',
  glassRowEdge: 'rgba(168,192,224,0.16)',
  glassRowSpecular: 'rgba(168,192,224,0.25)',
  // Chrome glass — i=24.
  glassChromeFloor: 'rgba(13,18,32,0.80)',
  glassChromeEdge: 'rgba(168,192,224,0.18)',
  glassChromeLip: 'rgba(168,192,224,0.14)',
  // Banner glass — scrolling i=12 over the dark brandSoft family.
  glassBannerFloor: 'rgba(14,68,153,0.70)',
  glassBannerEdge: 'rgba(78,137,239,0.45)',
  glassBannerSpecular: 'rgba(168,192,224,0.22)',
  // Bulk bar — conditional i=24.
  glassBulkFloor: 'rgba(13,18,32,0.85)',
  glassBulkSpecular: 'rgba(168,192,224,0.18)',
  // Engineered chip tint — dark chips are a luminosity lift, not a shade.
  glassChipFill: 'rgba(255,255,255,0.10)',
  glassChipEdge: 'rgba(168,192,224,0.16)',
  glassChipInk: '#F5F5F5', // fork: #ddd measures 4.10:1 worst-case on the chip stack
  glassGhostEdge: 'rgba(168,192,224,0.28)',
  glassNeutralBtn: 'rgba(255,255,255,0.10)',
  glassCancelFill: 'rgba(255,255,255,0.14)',
  glassSelectedTint: 'rgba(15,45,94,0.45)',
  glassSkeletonBar: 'rgba(168,192,224,0.10)',
  glassSheen: 'rgba(255,255,255,0.35)',
  // Inks on glass — dark forks, all script-decided.
  inkGlassMuted: '#B8BEC9',
  inkOnStage: '#AAAAAA',
  inkSelect: '#B4CFFA',
  inkDetailsGhost: '#84AEF6',
  ctaFill: '#1466E0', // MODE-INDEPENDENT — see the light palette note
  glassPlaceholder: '#C9CFD9', // fork from #9ca3af on the dark chip stack
  // C-lite engineered equivalents.
  glassRowLite0: 'rgba(30,34,46,0.94)',
  glassRowLite1: 'rgba(30,34,46,0.88)',
  glassBannerLite0: 'rgba(14,68,153,0.92)',
  glassBannerLite1: 'rgba(14,68,153,0.84)',
  glassChromeLite0: 'rgba(13,18,32,0.94)',
  glassChromeLite1: 'rgba(13,18,32,0.90)',
  glassBulkLite0: 'rgba(13,18,32,0.95)',
  glassBulkLite1: 'rgba(13,18,32,0.92)',

  // Misc
  shadow: '#fff', // inverted for dark mode
  // Soft cool glow so a raised card reads as lifted on dark — a dark shadow is
  // invisible here. Conservative default; tune the strength on device. The Card
  // primitive consumes this. (overhaul Phase 2)
  shadowTint: '#A8C0E0',
  pointsPillText: '#dbe7fb',
} as const satisfies typeof lightColor;

// -------------------------------------------------------------------------
// Context and exports
// -------------------------------------------------------------------------

export type ColorTheme = typeof lightColor;

/** Appearance preference. 'system' follows the OS setting (the default). */
export type ThemeMode = 'light' | 'dark' | 'system';

const APPEARANCE_KEY = 'accessmap:appearance';

export const ThemeContext = createContext<ColorTheme>(lightColor);

interface ThemeModeValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeValue>({ mode: 'system', setMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Load the saved appearance once. READ failure → keep the 'system' fallback
  // (it's a preference, not user data — see CLAUDE.md error-handling tiers).
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(APPEARANCE_KEY)
      .then((saved) => {
        if (active && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setModeState(saved);
        }
      })
      .catch((e) => console.warn('[theme] load appearance failed:', e));
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    // WRITE failure → warn + ignore (ephemeral preference, never blocks the UI).
    AsyncStorage.setItem(APPEARANCE_KEY, next).catch((e) =>
      console.warn('[theme] save appearance failed:', e),
    );
  }, []);

  const effective = mode === 'system' ? systemScheme : mode;
  const value = effective === 'dark' ? darkColor : lightColor;

  return (
    <ThemeModeContext.Provider value={{ mode, setMode }}>
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </ThemeModeContext.Provider>
  );
}

export function useColor(): ColorTheme {
  return useContext(ThemeContext);
}

/** Read + set the appearance preference (light / dark / system). */
export function useThemeMode(): ThemeModeValue {
  return useContext(ThemeModeContext);
}
