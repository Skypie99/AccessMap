/**
 * M4 / Q10 — the Legend is one tap, and it costs nothing.
 *
 * The legend is the product's TEACHING surface: five colours, five numbers,
 * five human sentences, the clearest writing in the app. It was two taps deep
 * behind ⋯ and a "?" icon, which files it under help rather than under what the
 * map means. Q10 gives it a persistent door.
 *
 * Two things have to hold for that door to be free:
 *
 *   1. MATERIAL — it wears the same engineered crystal as the List pill
 *      opposite it, so it adds ZERO panes to the blur budget. GLASS §12.5 rule:
 *      persistent pan-time chrome is literal `forceEngineered` and never mounts
 *      a BlurView; the Explore command bar's single live pane is the ONE
 *      permanent blur on this screen and it stays the only one.
 *   2. THE LAWS — the box-none overlay law (dismissalStandard G) and the ⋯ row
 *      that people already know survive it.
 *
 * The pane count is proved by RENDERING the pill's exact GlassSurface
 * configuration, not by reading the source: a full MapScreen render pulls the
 * native map (see mapChromeBudget's docblock), and a source scan cannot tell a
 * blurring pane from an engineered one.
 */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react-native';

import { GlassSurface, __getLiveBlurPaneCount } from '@/components/ui/GlassSurface';
import { color as realColor } from '@/theme';

jest.mock('@/lib/accessibility', () => ({
  useReduceTransparency: jest.fn(() => false),
}));
jest.mock('expo-blur', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    BlurView: (props: Record<string, unknown>) =>
      ReactActual.createElement(RNView, { testID: 'glass-blurview', ...props }),
  };
});
jest.mock('expo-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    LinearGradient: (props: Record<string, unknown>) =>
      ReactActual.createElement(RNView, { testID: 'glass-lite-gradient', ...props }),
  };
});
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});
jest.mock('@/theme', () => jest.requireActual('@/theme'));

const MAP = fs.readFileSync(path.resolve(__dirname, '../MapScreen.tsx'), 'utf8');

describe('M4 — the Legend button costs zero blur panes', () => {
  it('the pill mounts NO BlurView, so the budget is the bar + 0', () => {
    const before = __getLiveBlurPaneCount();
    const { queryByTestId, getByTestId, unmount } = render(
      <GlassSurface
        variant="row"
        forceEngineered
        liteColors={[realColor.glassMapCrystal0, realColor.glassMapCrystal1]}
        borderRadius={999}
      />,
    );
    expect(__getLiveBlurPaneCount()).toBe(before);
    expect(queryByTestId('glass-blurview')).toBeNull();
    // ...and it IS a real crystal pane, not an empty one that trivially costs 0.
    expect(getByTestId('glass-lite-gradient').props.colors).toEqual([
      realColor.glassMapCrystal0,
      realColor.glassMapCrystal1,
    ]);
    unmount();
    expect(__getLiveBlurPaneCount()).toBe(before);
  });

  it('the counter WOULD have caught it — drop forceEngineered and the budget moves', () => {
    // Non-vacuity. Without this, a counter that never moves proves nothing.
    const before = __getLiveBlurPaneCount();
    const { unmount } = render(<GlassSurface variant="row" borderRadius={999} />);
    expect(__getLiveBlurPaneCount()).toBe(before + 1);
    unmount();
  });
});

describe('M4 — the source invariants behind that pill', () => {
  it('it is the crystal recipe, forceEngineered, in the bottom-left slot', () => {
    const slot = MAP.slice(MAP.indexOf('styles.legendSlot'), MAP.indexOf('styles.fabColumn'));
    expect(slot).toContain('accessibilityLabel="Map legend"');
    expect(slot).toContain('forceEngineered');
    expect(slot).toContain('liteColors={[color.glassMapCrystal0, color.glassMapCrystal1]}');
    expect(slot).toContain('style={styles.fabCrystalPill}'); // the List pill's own recipe
  });

  it('it wears the discs it explains — 1, 3, 5, decorative by the primitive default', () => {
    const slot = MAP.slice(MAP.indexOf('styles.legendSlot'), MAP.indexOf('styles.fabColumn'));
    for (const sev of [1, 3, 5]) {
      expect(slot).toContain(`<SeverityDisc severity={${sev}} size={12}`);
    }
    // Fixed boxes cap by box (T3). A 12pt disc has no room to grow at all, so
    // the digit is frozen — an uncapped or high-capped digit bursts the circle.
    expect((slot.match(/maxFontSizeMultiplier=\{1\}/g) ?? []).length).toBe(3);
  });

  it('it reuses the ONE legend trigger — register before open, no second contract', () => {
    const slot = MAP.slice(MAP.indexOf('styles.legendSlot'), MAP.indexOf('styles.fabColumn'));
    expect(slot).toContain('ref={legendTrigger.ref}');
    // register() must precede the setState that opens the surface, or the
    // handle is captured after the modal has already taken focus.
    expect(slot.indexOf('legendTrigger.register()')).toBeLessThan(slot.indexOf('setLegendOpen(true)'));
    // Exactly one trigger for this surface, both doors sharing it.
    expect((MAP.match(/useSurfaceTrigger<View>\(\)/g) ?? []).length).toBe(3);
    expect((MAP.match(/ref=\{legendTrigger\.ref\}/g) ?? []).length).toBe(1);
  });

  it('the ⋯ row survives — muscle memory is not a regression to trade away', () => {
    expect(MAP).toContain('<AppText variant="label" style={styles.toolRowText}>Map legend</AppText>');
    expect((MAP.match(/setLegendOpen\(true\)/g) ?? []).length).toBe(2);
  });

  it('the box-none overlay law is not weakened by the new slot', () => {
    // dismissalStandard law G floors this at 6; the slot ADDS one rather than
    // spending the margin, because a flex:1 left half must never become a
    // touch-opaque strip across the bottom of the map.
    expect((MAP.match(/pointerEvents="box-none"/g) ?? []).length).toBeGreaterThanOrEqual(9);
    expect(MAP).toContain('<View style={styles.legendSlot} pointerEvents="box-none">');
  });

  it('VP1 fix2 (Sky): is one content-hugging pill, not a compound pill+dismiss-X pair', () => {
    // The pill used to sit beside its own separate 44pt dismiss button, which
    // read as a wide two-part control. Sky's correction: no separate X on the
    // collapsed shortcut at all — the whole pill opens the legend, and only
    // the expanded LegendModal closes (via its own top-right X).
    const slot = MAP.slice(MAP.indexOf('styles.legendSlot'), MAP.indexOf('styles.fabColumn'));
    expect(slot).not.toContain('legendDismissBtn');
    expect(slot).not.toContain('Dismiss map legend shortcut');
    expect(slot).not.toContain('HeatmapLegend');
    // The session-local "hide the shortcut forever" state went with it — its
    // only trigger was the removed dismiss button, so keeping the state around
    // unreachable would just be dead code.
    expect(MAP).not.toContain('legendDismissed');
  });
});
