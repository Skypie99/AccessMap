/**
 * LiveStatusRegion — the shared persistent-mounted VISIBLE + live status region
 * for S10 (submit success) and S11 ("still trying"). This is also S10's DOM
 * guard: the region is present (empty) before a status, GAINS text when one is
 * set (text mutation, not node insertion), fires the native announce even under
 * Reduce Motion, exposes the optional action, and auto-dismisses when asked.
 *
 * Reduce Motion is mocked ON so the entrance/exit is synchronous (deterministic
 * tree), which ALSO verifies PROTECT-7: the announce fires regardless of motion.
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import LiveStatusRegion from '../LiveStatusRegion';
import { __resetLiveStatus, clearLiveStatus, setLiveStatus } from '@/lib/liveStatus';
import { __resetLedgeForTests, computeLedgeTop, publishHeaderHeight } from '@/lib/statusLedge';

jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: () => true,
}));

// Flatten a rendered node's style array the same way GlassSurface.test does.
function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.filter(Boolean));
  return (style ?? {}) as Record<string, unknown>;
}

// The top offset of a rendered wrapper node (its outermost View's style.top).
function wrapperTop(json: unknown): unknown {
  const style = (json as { props?: { style?: unknown } } | null)?.props?.style;
  return flattenStyle(style).top;
}

// Count host nodes flagged pointerEvents="box-none" in a toJSON() tree. Proves
// the pill text-carrier is box-none (BP12): idle = 1 (the always-mounted
// wrapper), active = 2 (wrapper + pill).
function countBoxNone(node: unknown): number {
  if (!node || typeof node !== 'object') return 0;
  if (Array.isArray(node)) return node.reduce((n: number, c) => n + countBoxNone(c), 0);
  const el = node as { props?: Record<string, unknown>; children?: unknown };
  const self = el.props?.pointerEvents === 'box-none' ? 1 : 0;
  return self + countBoxNone(el.children);
}

describe('LiveStatusRegion', () => {
  let announceSpy: jest.SpyInstance;

  beforeEach(() => {
    announceSpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => clearLiveStatus());
    __resetLiveStatus();
    __resetLedgeForTests();
    announceSpy.mockRestore();
    jest.useRealTimers();
  });

  it('renders present-but-empty before any status is set', () => {
    const { toJSON, queryByText } = render(<LiveStatusRegion />);
    // The aria-live wrapper is mounted (tree is not null)…
    expect(toJSON()).not.toBeNull();
    // …but carries no message text yet.
    expect(queryByText(/Report filed/)).toBeNull();
  });

  it('gains text on a new status (text mutation) and announces it', () => {
    const { getByText } = render(<LiveStatusRegion />);
    act(() => setLiveStatus({ message: 'Report filed — thanks for flagging this barrier', tone: 'success' }));
    expect(getByText(/Report filed — thanks for flagging this barrier/)).toBeTruthy();
    // Native announce fired even though Reduce Motion is on (PROTECT-7).
    expect(announceSpy).toHaveBeenCalledWith('Report filed — thanks for flagging this barrier');
  });

  it('re-announces an identical message (monotonic key change)', () => {
    render(<LiveStatusRegion />);
    act(() => setLiveStatus({ message: 'Still trying — check your signal', tone: 'info' }));
    act(() => setLiveStatus({ message: 'Still trying — check your signal', tone: 'info' }));
    expect(announceSpy).toHaveBeenCalledTimes(2);
  });

  it('renders an optional action button and fires its onPress', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<LiveStatusRegion />);
    act(() =>
      setLiveStatus({ message: 'Still trying — check your signal', tone: 'info', action: { label: 'Retry', onPress } }),
    );
    const retry = getByLabelText('Retry');
    fireEvent.press(retry);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after autoDismissMs', () => {
    jest.useFakeTimers();
    const { queryByText } = render(<LiveStatusRegion />);
    act(() => setLiveStatus({ message: 'Report filed', tone: 'success', autoDismissMs: 4000 }));
    expect(queryByText(/Report filed/)).toBeTruthy();
    act(() => jest.advanceTimersByTime(4000));
    expect(queryByText(/Report filed/)).toBeNull();
  });

  it('persists (no auto-dismiss) until cleared when autoDismissMs is omitted', () => {
    jest.useFakeTimers();
    const { queryByText } = render(<LiveStatusRegion />);
    act(() => setLiveStatus({ message: 'Still trying — check your signal', tone: 'info' }));
    act(() => jest.advanceTimersByTime(60000));
    expect(queryByText(/Still trying/)).toBeTruthy();
    act(() => clearLiveStatus());
    expect(queryByText(/Still trying/)).toBeNull();
  });

  // --- BP12 (T6): the status ledge ------------------------------------------

  it('the pill text-carrier is box-none so it does not eat taps beneath it (BP12)', () => {
    const { toJSON } = render(<LiveStatusRegion />);
    // Idle: only the always-mounted aria-live wrapper is box-none.
    expect(countBoxNone(toJSON())).toBe(1);
    act(() => setLiveStatus({ message: 'Report filed', tone: 'success' }));
    // Active: wrapper + pill are both box-none (the Retry Pressable still
    // receives touches — box-none passes through to children).
    expect(countBoxNone(toJSON())).toBe(2);
  });

  it('docks below a published header height (BP12)', () => {
    const { toJSON } = render(<LiveStatusRegion />);
    act(() => publishHeaderHeight('test-header', 120));
    act(() => setLiveStatus({ message: 'Report filed', tone: 'success' }));
    const top = wrapperTop(toJSON());
    // insetTop 0 (no SafeAreaProvider under test) + 120 + LEDGE_GAP.
    expect(top).toBe(computeLedgeTop(0, 120, 0));
    expect(top as number).toBeGreaterThan(56); // docked lower than the old fixed top:56
  });

  it("keeps today's placement (top 56) when no header is published (BP12 fallback)", () => {
    const { toJSON } = render(<LiveStatusRegion />);
    act(() => setLiveStatus({ message: 'Report filed', tone: 'success' }));
    expect(wrapperTop(toJSON())).toBe(56);
  });
});
