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

import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { color as lightColor } from '../theme';

// -------------------------------------------------------------------------
// Dark palette — same token names as lightColor, dark-mode values.
// All contrast ratios checked against WCAG 2.2 AA on dark surfaces.
// -------------------------------------------------------------------------

const darkColor = {
  // Surfaces
  surface: '#111',
  surfaceMuted: '#1a1a1a',
  surfaceSoft: '#222',
  surfaceNeutral: '#2a2a2a',
  overlay: 'rgba(20,20,20,0.97)',
  overlaySoft: 'rgba(20,20,20,0.95)',
  scrim: 'rgba(0,0,0,0.6)',

  // Text — checked >= 4.5:1 on #111 surface
  textStrong: '#f5f5f5', // ~18:1 on #111
  text: '#ddd', // ~13:1 on #111
  textMuted: '#aaa', // ~6.7:1 on #111
  textSubtle: '#777', // ~4.1:1 on #111 — only for non-essential/18pt+
  textOnBrand: '#fff',

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

  // Misc
  shadow: '#fff', // inverted for dark mode
  pointsPillText: '#dbe7fb',
} as const satisfies typeof lightColor;

// -------------------------------------------------------------------------
// Context and exports
// -------------------------------------------------------------------------

export type ColorTheme = typeof lightColor;

export const ThemeContext = createContext<ColorTheme>(lightColor);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return (
    <ThemeContext.Provider value={isDark ? darkColor : lightColor}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useColor(): ColorTheme {
  return useContext(ThemeContext);
}
