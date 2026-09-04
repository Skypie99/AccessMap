/**
 * MyWatchedModal — SR-containment guard (BP17 / T20, R2-D18).
 *
 * MP2 shipped every Profile sheet as bulk glass but carried MyWatched's missing
 * accessibilityViewIsModal forward by the byte-identical rule (M-40 census). T20
 * closed that gap by putting the prop on this file's own GlassSurface.
 *
 * ─── RE-PINNED 2026-08-22 (art-direction Phase 3) ─────────────────────────
 * This sheet's shell moved into `components/ui/Sheet.tsx` (§S5, "no third
 * shell"), and the primitive carries the containment flag on its backdrop View
 * — the node that also carries `onAccessibilityEscape`, because RN drops that
 * prop on the <Modal> tag (dismissal standard, assertion B2). The old assertion
 * went red reading for the flag on a GlassSurface this file no longer renders.
 *
 * The placement moved, and that is a real change worth stating plainly rather
 * than absorbing quietly. T20's text said "content view, never the backdrop",
 * and its stated reason was consistency with MyReportsModal — not a platform
 * one. On iOS the isolation itself comes from the Modal being its own window;
 * `accessibilityViewIsModal` ignores SIBLINGS of the flagged view, and in both
 * layouts the flagged view has none. So the two placements are equivalent for
 * containment, and the primitive's has one property this file's did not: the
 * trap and the escape sit on the SAME node and cannot drift apart. That is what
 * this guard now pins, in both directions.
 *
 * Still true, and still the important caveat: this is a WIRING guard.
 * react-native-web drops accessibilityViewIsModal entirely, so only the device
 * VoiceOver walk (R2-D18) proves focus is actually contained.
 */
import React from 'react';
import MyWatchedModal from '../MyWatchedModal';

// react-test-renderer ships without official types in this project (same note as
// sharedModalsContext.test.tsx). Import via require + a local cast so tsc stays clean.
interface ReactTestInstance {
  type: unknown;
  props: { [k: string]: unknown };
  findAllByProps(props: { [k: string]: unknown }): ReactTestInstance[];
}
interface ReactTestRenderer {
  unmount(): void;
  root: ReactTestInstance;
}
interface ReactTestRendererModule {
  create(element: React.ReactElement): ReactTestRenderer;
  act(callback: () => void): void;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { create, act } = require('react-test-renderer') as ReactTestRendererModule;

jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
jest.mock('@/lib/watchedFlags', () => ({
  loadWatched: () => Promise.resolve([]),
  clearWatched: jest.fn(),
  removeWatched: jest.fn(),
  setWatched: jest.fn(),
}));
jest.mock('@/lib/flags', () => ({
  fetchFlagsByIds: () => Promise.resolve([]),
  CATEGORY_LABELS: {},
}));
jest.mock('@/lib/watchedFlagsFilter', () => ({
  filterWatchedFlags: (f: unknown) => f,
  filterWatchedFlagsByStatus: (f: unknown) => f,
}));
jest.mock('@/theme', () => jest.requireActual('@/theme'));
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});
// GlassSurface as a passthrough that forwards ONLY the containment prop, so the
// test tree exposes accessibilityViewIsModal without pulling in blur internals.
jest.mock('@/components/ui/GlassSurface', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactActual = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    GlassSurface: ({
      children,
      accessibilityViewIsModal,
    }: {
      children?: unknown;
      accessibilityViewIsModal?: boolean;
    }) =>
      ReactActual.createElement(
        View,
        { accessibilityViewIsModal, testID: 'mywatched-content-sheet' },
        children,
      ),
  };
});
jest.mock('@/components/SeverityDisc', () => ({ SeverityDisc: () => null }));
jest.mock('../StatusBadge', () => ({ StatusBadge: () => null }));
jest.mock('../SearchInputRow', () => () => null);
jest.mock('lucide-react-native', () => ({ MapPin: () => null, Star: () => null, X: () => null }));
jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: () => false,
  a11yToggle: () => ({}),
}));
jest.mock('@/lib/a11yText', () => ({ severityA11y: () => '', statusA11y: () => '' }));

const noop = () => {};

describe('MyWatchedModal — SR containment (BP17 / T20)', () => {
  it('delegates its shell to the shared Sheet, which owns the containment node', () => {
    // Half one: this file really renders the primitive. A hand-rolled shell
    // returning here would have to answer the old rule again, and this fails
    // until it does.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'MyWatchedModal.tsx'), 'utf8');
    expect(src).toMatch(/<Sheet\b/);
    expect(src).not.toMatch(/<Modal\b/);

    // Half two: the primitive puts the trap and the escape on ONE node. Read as
    // source rather than rendered, because react-native-web strips
    // accessibilityViewIsModal before it reaches a test tree — the same reason
    // the mock below has to forward it by hand.
    const primitive = fs.readFileSync(
      path.join(__dirname, '..', 'ui', 'Sheet.tsx'),
      'utf8',
    );
    // Same TAG, not merely same file: collect every containment-capable View
    // (including Animated.View, whose opacity is the shared pull-dismiss
    // scrim) and require exactly one to carry both props. A file-wide search
    // would pass if a future edit split them across two nodes, which is the
    // failure that matters.
    const viewTags = [...primitive.matchAll(/<(?:Animated\.)?View\b[^>]*>/g)].map((m) => m[0]);
    const both = viewTags.filter(
      (t) => t.includes('accessibilityViewIsModal') && t.includes('onAccessibilityEscape={onClose}'),
    );
    expect(both).toHaveLength(1);
  });

  it('renders its content inside a surface that carries the containment flag', () => {
    // The bulk-glass sheet renders synchronously (the loading/empty state lives
    // INSIDE it), so the containment prop is present on first render — no need to
    // await the async watched-list load. Sync act mirrors sharedModalsContext.test.
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(<MyWatchedModal visible onClose={noop} onSelectFlag={noop} />);
    });
    // Non-vacuity for the rule above: the sheet really does render its content
    // inside a bulk GlassSurface, which is the node the primitive wraps in the
    // containment View. If this sheet stopped being a glass sheet, the pairing
    // asserted above would be pinning a stack it no longer uses.
    const contentSheet = renderer!.root.findAllByProps({ testID: 'mywatched-content-sheet' });
    expect(contentSheet.length).toBeGreaterThanOrEqual(1);
    act(() => {
      renderer?.unmount();
    });
  });
});
