/**
 * GlassSurface component tests — hardens the frosted-glass primitive added in
 * the 2026-06-17 expressive overhaul (src/components/ui/GlassSurface.tsx).
 *
 * What this locks in:
 *   1. Children always render (both the blur path and the opaque fallback).
 *   2. By DEFAULT (useReduceTransparency() === false) it renders the BlurView
 *      path — the frosted-glass look.
 *   3. Under useReduceTransparency() === true it renders the OPAQUE fallback:
 *      no BlurView at all (the accessibility contract — decorative blur is
 *      dropped for a solid surface so contrast is never compromised).
 *   4. Extra ViewProps (e.g. testID, accessibilityLabel) are forwarded.
 *
 * Strategy:
 *   - Mock '@/lib/accessibility' so useReduceTransparency() is a jest.fn we
 *     flip per-test. (Mirrors how ReportFlagModal.test mocks useReducedMotion.)
 *   - Mock 'expo-blur' to a tagged stub View with a known testID so we can
 *     assert the BlurView is present (blur path) or absent (fallback) without
 *     a native blur module. jest-expo can render the real BlurView, but a
 *     tagged stub makes the present/absent assertion unambiguous.
 *   - Mock '@/theme/ThemeContext' useColor() to the real light palette so the
 *     overlayGlass / overlay tokens resolve without a provider.
 */

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { useReduceTransparency } from '@/lib/accessibility';

// ---------------------------------------------------------------------------
// Import after mocks are registered.
// ---------------------------------------------------------------------------
import { GlassSurface, __getLiveBlurPaneCount } from '../GlassSurface';
import { color as realColor, glass as realGlass } from '@/theme';

// ---------------------------------------------------------------------------
// Mock: '@/lib/accessibility' — only useReduceTransparency is consumed by
// GlassSurface. Make it a jest.fn so each test sets the return value.
// ---------------------------------------------------------------------------
jest.mock('@/lib/accessibility', () => ({
  useReduceTransparency: jest.fn(() => false),
}));
const mockUseReduceTransparency = useReduceTransparency as jest.MockedFunction<
  typeof useReduceTransparency
>;

// ---------------------------------------------------------------------------
// Mock: 'expo-blur' — tagged stub so presence/absence of the blur layer is
// unambiguous in the rendered tree. Captures the intensity/tint props so we
// can also assert they're forwarded.
// ---------------------------------------------------------------------------
jest.mock('expo-blur', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    BlurView: (props: Record<string, unknown>) =>
      ReactActual.createElement(RNView, { testID: 'glass-blurview', ...props }),
  };
});

// ---------------------------------------------------------------------------
// Mock: 'expo-linear-gradient' — tagged stub so the engineered (no-blur)
// material's presence is unambiguous (Deep Field variants, 2026-07-03).
// ---------------------------------------------------------------------------
jest.mock('expo-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    LinearGradient: (props: Record<string, unknown>) =>
      ReactActual.createElement(RNView, { testID: 'glass-lite-gradient', ...props }),
  };
});

// ---------------------------------------------------------------------------
// Mock: '@/theme/ThemeContext' — real light palette so overlayGlass / overlay
// resolve without wrapping every render in a provider.
// ---------------------------------------------------------------------------
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});

// theme.ts is pure data — use the real radius tokens (no drift).
jest.mock('@/theme', () => jest.requireActual('@/theme'));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseReduceTransparency.mockReturnValue(false);
});

describe('GlassSurface — blur path (default, Reduce Transparency OFF)', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <GlassSurface>
        <Text>panel content</Text>
      </GlassSurface>,
    );
    expect(getByText('panel content')).toBeTruthy();
  });

  it('renders the BlurView when Reduce Transparency is off', () => {
    const { queryByTestId } = render(
      <GlassSurface>
        <Text>x</Text>
      </GlassSurface>,
    );
    expect(queryByTestId('glass-blurview')).toBeTruthy();
  });

  it('forwards the intensity + tint props to the BlurView', () => {
    const { getByTestId } = render(
      <GlassSurface intensity={40} tint="dark">
        <Text>x</Text>
      </GlassSurface>,
    );
    const blur = getByTestId('glass-blurview');
    expect(blur.props.intensity).toBe(40);
    expect(blur.props.tint).toBe('dark');
  });

  it('defaults intensity to 24 and tint to "light"', () => {
    const { getByTestId } = render(
      <GlassSurface>
        <Text>x</Text>
      </GlassSurface>,
    );
    const blur = getByTestId('glass-blurview');
    expect(blur.props.intensity).toBe(24);
    expect(blur.props.tint).toBe('light');
  });
});

describe('GlassSurface — opaque fallback (Reduce Transparency ON)', () => {
  beforeEach(() => {
    mockUseReduceTransparency.mockReturnValue(true);
  });

  it('still renders its children', () => {
    const { getByText } = render(
      <GlassSurface>
        <Text>panel content</Text>
      </GlassSurface>,
    );
    expect(getByText('panel content')).toBeTruthy();
  });

  it('does NOT render any BlurView (decorative blur is dropped for contrast)', () => {
    const { queryByTestId } = render(
      <GlassSurface>
        <Text>x</Text>
      </GlassSurface>,
    );
    expect(queryByTestId('glass-blurview')).toBeNull();
  });

  it('fills the surface with the opaque color.overlay token by default', () => {
    const { getByTestId } = render(
      <GlassSurface testID="surface">
        <Text>x</Text>
      </GlassSurface>,
    );
    // The fallback path applies { backgroundColor: solid } where solid defaults
    // to color.overlay. Flatten the style array to inspect the resolved value.
    const node = getByTestId('surface');
    const flat = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.filter(Boolean))
      : node.props.style;
    expect(flat.backgroundColor).toBe(realColor.overlay);
  });

  it('honors a solidColor override for the opaque fallback', () => {
    const { getByTestId } = render(
      <GlassSurface testID="surface" solidColor="#abcdef">
        <Text>x</Text>
      </GlassSurface>,
    );
    const node = getByTestId('surface');
    const flat = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.filter(Boolean))
      : node.props.style;
    expect(flat.backgroundColor).toBe('#abcdef');
  });
});

describe('GlassSurface — ViewProps forwarding', () => {
  it('forwards a testID to the wrapper in the blur path', () => {
    const { getByTestId } = render(
      <GlassSurface testID="my-surface">
        <Text>x</Text>
      </GlassSurface>,
    );
    expect(getByTestId('my-surface')).toBeTruthy();
  });

  it('forwards an accessibilityLabel to the wrapper in the fallback path', () => {
    mockUseReduceTransparency.mockReturnValue(true);
    const { getByLabelText } = render(
      <GlassSurface accessibilityLabel="frosted panel">
        <Text>x</Text>
      </GlassSurface>,
    );
    expect(getByLabelText('frosted panel')).toBeTruthy();
  });

  it('renders without children (children is optional)', () => {
    const { toJSON } = render(<GlassSurface testID="empty" />);
    expect(toJSON()).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Deep Field variants (Tasks glass pass, 2026-07-03) — ADDITIVE coverage.
// Everything above is the legacy contract and stays byte-identical.
// ---------------------------------------------------------------------------

/** Flatten a react-test-renderer JSON tree into a list of resolved styles. */
function collectStyles(node: unknown, out: Record<string, unknown>[] = []) {
  if (!node || typeof node !== 'object') return out;
  const n = node as { props?: { style?: unknown }; children?: unknown[] };
  if (n.props?.style) {
    const raw = n.props.style;
    const flat = Array.isArray(raw)
      ? Object.assign({}, ...(raw.flat(Infinity).filter(Boolean) as object[]))
      : raw;
    out.push(flat as Record<string, unknown>);
  }
  (n.children ?? []).forEach((c) => collectStyles(c, out));
  return out;
}

describe('GlassSurface — Deep Field variants (blur material)', () => {
  it('variant="row" mounts a BlurView at the row intensity with the scheme tint and row floor', () => {
    const { getByTestId, toJSON } = render(
      <GlassSurface variant="row">
        <Text>x</Text>
      </GlassSurface>,
    );
    const blur = getByTestId('glass-blurview');
    expect(blur.props.intensity).toBe(realGlass.intensity.row); // 12
    expect(blur.props.tint).toBe(realColor.scheme); // 'light'
    const styles = collectStyles(toJSON());
    expect(styles.some((s) => s.backgroundColor === realColor.glassRowFloor)).toBe(true);
    expect(styles.some((s) => s.borderColor === realColor.glassRowEdge)).toBe(true);
  });

  it('variant="chrome" mounts i=24 with the chrome floor and bottom edge', () => {
    const { getByTestId, toJSON } = render(<GlassSurface variant="chrome" />);
    expect(getByTestId('glass-blurview').props.intensity).toBe(realGlass.intensity.chrome); // 24
    const styles = collectStyles(toJSON());
    expect(styles.some((s) => s.backgroundColor === realColor.glassChromeFloor)).toBe(true);
    expect(styles.some((s) => s.backgroundColor === realColor.glassChromeEdge)).toBe(true);
    expect(styles.some((s) => s.backgroundColor === realColor.glassChromeLip)).toBe(true);
  });

  it('edgeColor/edgeWidth/overlayTint overrides land (the selected-card contract)', () => {
    const { toJSON } = render(
      <GlassSurface variant="row" edgeColor={realColor.brand} edgeWidth={2} overlayTint={realColor.glassSelectedTint} />,
    );
    const styles = collectStyles(toJSON());
    expect(styles.some((s) => s.borderColor === realColor.brand && s.borderWidth === 2)).toBe(true);
    expect(styles.some((s) => s.backgroundColor === realColor.glassSelectedTint)).toBe(true);
  });

  it('tracks the live blur-pane count (mount + unmount are symmetric)', () => {
    const before = __getLiveBlurPaneCount();
    const { unmount } = render(<GlassSurface variant="row" />);
    expect(__getLiveBlurPaneCount()).toBe(before + 1);
    unmount();
    expect(__getLiveBlurPaneCount()).toBe(before);
  });
});

describe('GlassSurface — Deep Field variants (engineered material)', () => {
  it('forceEngineered swaps BlurView+floor for the *Lite micro-gradient (C-lite)', () => {
    const { queryByTestId, getByTestId } = render(
      <GlassSurface variant="row" forceEngineered>
        <Text>x</Text>
      </GlassSurface>,
    );
    expect(queryByTestId('glass-blurview')).toBeNull();
    const lite = getByTestId('glass-lite-gradient');
    expect(lite.props.colors).toEqual([realColor.glassRowLite0, realColor.glassRowLite1]);
  });

  it('engineered panes do not count against the blur budget', () => {
    const before = __getLiveBlurPaneCount();
    const { unmount } = render(<GlassSurface variant="banner" forceEngineered />);
    expect(__getLiveBlurPaneCount()).toBe(before);
    unmount();
  });
});

describe('GlassSurface — Deep Field variants (designed Reduce-Transparency states)', () => {
  beforeEach(() => {
    mockUseReduceTransparency.mockReturnValue(true);
  });

  it('variant="row" renders the opaque overlay fill with a borderStrong hairline, no blur', () => {
    const { queryByTestId, getByTestId } = render(
      <GlassSurface variant="row" testID="rt-row">
        <Text>x</Text>
      </GlassSurface>,
    );
    expect(queryByTestId('glass-blurview')).toBeNull();
    expect(queryByTestId('glass-lite-gradient')).toBeNull();
    const styles = collectStyles({ props: getByTestId('rt-row').props, children: [] });
    expect(styles.some((s) => s.backgroundColor === realColor.overlay)).toBe(true);
    expect(styles.some((s) => s.borderColor === realColor.borderStrong)).toBe(true);
  });

  it('variant="banner" renders the brandSofter fill with a brand border (the designed state)', () => {
    const { getByTestId } = render(<GlassSurface variant="banner" testID="rt-banner" />);
    const styles = collectStyles({ props: getByTestId('rt-banner').props, children: [] });
    expect(styles.some((s) => s.backgroundColor === realColor.brandSofter)).toBe(true);
    expect(styles.some((s) => s.borderColor === realColor.brand)).toBe(true);
  });

  it('children still render in the RT designed state', () => {
    const { getByText } = render(
      <GlassSurface variant="chrome">
        <Text>chrome content</Text>
      </GlassSurface>,
    );
    expect(getByText('chrome content')).toBeTruthy();
  });
});
