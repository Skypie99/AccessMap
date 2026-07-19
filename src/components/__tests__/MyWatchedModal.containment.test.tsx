/**
 * MyWatchedModal — SR-containment guard (BP17 / T20, R2-D18).
 *
 * MP2 shipped every Profile sheet as bulk glass but carried MyWatched's missing
 * accessibilityViewIsModal forward by the byte-identical rule (M-40 census). T20
 * closes that last gap: the prop goes on the sheet CONTENT view (the GlassSurface),
 * never the backdrop, mirroring MyReportsModal. This locks the prop's PRESENCE so a
 * future edit can't silently drop it; the device VoiceOver walk (R2-D18) proves the
 * actual focus containment.
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
    }) => ReactActual.createElement(View, { accessibilityViewIsModal }, children),
  };
});
jest.mock('@/components/SeverityDisc', () => ({ SeverityDisc: () => null }));
jest.mock('../StatusBadge', () => ({ StatusBadge: () => null }));
jest.mock('../SearchInputRow', () => () => null);
jest.mock('lucide-react-native', () => ({ MapPin: () => null, Star: () => null, X: () => null }));
jest.mock('@/lib/accessibility', () => ({ useReducedMotion: () => false, a11yToggle: () => ({}) }));
jest.mock('@/lib/a11yText', () => ({ severityA11y: () => '', statusA11y: () => '' }));

const noop = () => {};

describe('MyWatchedModal — SR containment (BP17 / T20)', () => {
  it('sets accessibilityViewIsModal on the sheet content view (not the backdrop)', () => {
    // The bulk-glass sheet renders synchronously (the loading/empty state lives
    // INSIDE it), so the containment prop is present on first render — no need to
    // await the async watched-list load. Sync act mirrors sharedModalsContext.test.
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(<MyWatchedModal visible onClose={noop} onSelectFlag={noop} />);
    });
    // The only node carrying the containment flag is the GlassSurface content
    // sheet — the backdrop View is a plain <View> that never sets it. Finding it
    // proves the prop landed on the content, closing the M-40 gap.
    const contained = renderer!.root.findAllByProps({ accessibilityViewIsModal: true });
    expect(contained.length).toBeGreaterThanOrEqual(1);
    act(() => {
      renderer?.unmount();
    });
  });
});
