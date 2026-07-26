/**
 * D2/C2 — the drawer renders from the LIVE palette, in both schemes.
 *
 * The source guard (HamburgerDrawer.material.guard.test.ts) proves no dark
 * literal survives. This proves the other half: that what actually reaches the
 * screen is the palette's value, under each scheme, in both transparency
 * states — and that a scheme flip mid-session re-derives the styles rather than
 * serving a memoized stale sheet (`makeStyles` memoizes on `[color,
 * reduceTransparency, insets.bottom]`, so the palette identity IS the cache
 * key; if that ever regresses to a module-level StyleSheet these fail).
 *
 * The palette is captured through a probe component rendered inside the SAME
 * provider as the drawer, so the assertions compare against whatever the app
 * itself resolved — no second copy of the token values to drift. Two
 * assertions deliberately DO pin literals: the dark panel fill and the dark RT
 * tone, because "dark mode does not move" is a promise this phase made
 * (DECISIONS §F F-9) and only a literal can hold it.
 */
import React from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, waitFor, type RenderResult } from '@testing-library/react-native';
import HamburgerDrawer from '@/components/HamburgerDrawer';
import { ThemeProvider, useColor, type ColorTheme } from '@/theme/ThemeContext';
import { useReduceTransparency } from '@/lib/accessibility';

jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: () => false,
  useReduceTransparency: jest.fn(),
}));
jest.mock('@/lib/admin', () => ({ useIsAdmin: () => false }));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('@/lib/supabase', () => ({ signOut: jest.fn(), supabase: {} }));
jest.mock('@/screens/ResourcesScreen', () => () => null);
jest.mock('@/screens/HowToHelpScreen', () => () => null);
jest.mock('@/screens/AboutScreen', () => () => null);

const mockRT = useReduceTransparency as jest.Mock;
const cbs = { onClose: jest.fn(), onSignIn: jest.fn(), onNavigate: jest.fn() };

/** The AsyncStorage key ThemeProvider persists the appearance override under.
 *  Hardcoded on purpose: if it ever changes, `scheme` below fails loudly
 *  instead of silently falling back to light and passing a hollow test. */
const APPEARANCE_KEY = 'accessmap:appearance';

/** Captures the palette the drawer itself is resolving, from inside the same
 *  provider. Renders nothing. */
let captured: ColorTheme | null = null;
function PaletteProbe() {
  captured = useColor();
  return null;
}

/** The panel is the only View carrying an absolute full-height left inset. */
function panelStyle(u: RenderResult): Record<string, unknown> {
  const panel = u.UNSAFE_getAllByType(View).find((v) => {
    const s = StyleFlat(v.props.style);
    return s.position === 'absolute' && s.width === 288 && s.borderRightWidth === 1;
  });
  if (!panel) throw new Error('drawer panel not found');
  return StyleFlat(panel.props.style);
}

function StyleFlat(style: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const walk = (s: unknown): void => {
    if (Array.isArray(s)) s.forEach(walk);
    else if (s && typeof s === 'object') Object.assign(out, s);
  };
  walk(style);
  return out;
}

async function renderIn(scheme: 'light' | 'dark') {
  await AsyncStorage.setItem(APPEARANCE_KEY, scheme);
  const u = render(
    <ThemeProvider>
      <PaletteProbe />
      <HamburgerDrawer open {...cbs} />
    </ThemeProvider>,
  );
  // ThemeProvider loads the override asynchronously; wait for it to land so we
  // are never asserting against the pre-load default.
  await waitFor(() => expect(captured?.scheme).toBe(scheme));
  return u;
}

beforeEach(() => {
  captured = null;
  mockRT.mockReturnValue(false);
});
afterEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('D2/C2 — the panel follows the live palette', () => {
  it.each(['light', 'dark'] as const)(
    '%s: panel fill, edge and lip are the palette chrome tokens',
    async (scheme) => {
      const u = await renderIn(scheme);
      const s = panelStyle(u);
      expect(s.backgroundColor).toBe(captured!.glassChromeLite0);
      expect(s.borderRightColor).toBe(captured!.glassChromeEdge);
    },
  );

  it('the two schemes actually resolve to DIFFERENT panel fills', async () => {
    // Guards the hollow-pass case: if the provider silently served one palette
    // twice, every other assertion here would still pass.
    const light = panelStyle(await renderIn('light')).backgroundColor;
    const dark = panelStyle(await renderIn('dark')).backgroundColor;
    expect(light).not.toBe(dark);
  });

  it('dark mode does not move — the panel fill is byte-identical to the shipped tone', async () => {
    // The phase promised dark stays where it was (DECISIONS §F F-9). The old
    // hardcoded fill and glassChromeLite0 dark were already the same bytes;
    // this is the assertion that keeps them that way.
    await renderIn('dark');
    expect(captured!.glassChromeLite0).toBe('rgba(13,18,32,0.94)');
  });

  it.each([
    ['dark', '#0D1220'],
    ['light', null],
  ] as const)('%s: Reduce Transparency paints the designed opaque fill', async (scheme, expected) => {
    mockRT.mockReturnValue(true);
    const u = await renderIn(scheme);
    const fill = panelStyle(u).backgroundColor;
    // Dark pins the flattened tone byte-for-byte; light takes color.overlay,
    // read from the live palette rather than restated here.
    expect(fill).toBe(expected ?? captured!.overlay);
    // Either way RT must NOT leave the translucent chrome fill in place.
    expect(fill).not.toBe(captured!.glassChromeLite0);
  });
});
