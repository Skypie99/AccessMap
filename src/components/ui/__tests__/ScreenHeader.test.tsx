/**
 * ScreenHeader ledge-publish tests (BP12 / T6).
 *
 * The header publishes its measured HEIGHT to the status-ledge store while it's
 * focused, so the App-root status pill can dock below it. What this locks in:
 *   1. A focused header publishes its measured height (after layout lands).
 *   2. It clears on blur and republishes on focus — owner-guarded.
 *   3. `publishLedge={false}` (Tasks' opt-out) never publishes.
 *   4. A background (unfocused) tab does not publish until it focuses.
 *   5. Rendered with NO navigator (a bare unit test), it neither throws nor
 *      publishes — the non-throwing useContext(NavigationContext) path.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { act, type ReactTestInstance } from 'react-test-renderer';
import { NavigationContext } from '@react-navigation/native';
import { ScreenHeader } from '../ScreenHeader';
import { __resetLedgeForTests, getHeaderHeight } from '@/lib/statusLedge';

// Minimal fake navigation object exposing only what the ledge publish touches:
// isFocused() + addListener('focus'|'blur'). __emit drives focus/blur in a test.
function makeNav(initiallyFocused: boolean) {
  let focused = initiallyFocused;
  const listeners: Record<string, (() => void)[]> = { focus: [], blur: [] };
  return {
    isFocused: () => focused,
    addListener: (type: string, cb: () => void) => {
      (listeners[type] ||= []).push(cb);
      return () => {
        listeners[type] = listeners[type].filter((f) => f !== cb);
      };
    },
    __emit(type: 'focus' | 'blur') {
      focused = type === 'focus';
      listeners[type].forEach((cb) => cb());
    },
  };
}

// Fire the outer container's onLayout with a real height. The outer header View
// is the first View in the tree (Context.Provider renders no host node).
function fireLayout(views: ReactTestInstance[], height: number) {
  fireEvent(views[0], 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 320, height } } });
}

function renderHeader(nav: ReturnType<typeof makeNav> | null, props: Record<string, unknown> = {}) {
  const tree =
    nav == null ? (
      <ScreenHeader title="Review barriers" {...props} />
    ) : (
      <NavigationContext.Provider value={nav as unknown as React.ContextType<typeof NavigationContext>}>
        <ScreenHeader title="Review barriers" {...props} />
      </NavigationContext.Provider>
    );
  return render(tree);
}

describe('ScreenHeader ledge publish (BP12 / T6)', () => {
  beforeEach(() => __resetLedgeForTests());
  afterEach(() => __resetLedgeForTests());

  it('publishes its measured height while focused (after layout lands)', () => {
    const nav = makeNav(true);
    const { UNSAFE_getAllByType } = renderHeader(nav);
    expect(getHeaderHeight()).toBeNull(); // nothing until the height is measured
    act(() => fireLayout(UNSAFE_getAllByType(View), 140));
    expect(getHeaderHeight()).toBe(140);
  });

  it('clears on blur and republishes on focus (owner-guarded)', () => {
    const nav = makeNav(true);
    const { UNSAFE_getAllByType } = renderHeader(nav);
    act(() => fireLayout(UNSAFE_getAllByType(View), 140));
    expect(getHeaderHeight()).toBe(140);
    act(() => nav.__emit('blur'));
    expect(getHeaderHeight()).toBeNull();
    act(() => nav.__emit('focus'));
    expect(getHeaderHeight()).toBe(140);
  });

  it('does not publish when publishLedge={false} (Tasks opt-out)', () => {
    const nav = makeNav(true);
    const { UNSAFE_getAllByType } = renderHeader(nav, { publishLedge: false });
    act(() => fireLayout(UNSAFE_getAllByType(View), 140));
    expect(getHeaderHeight()).toBeNull();
  });

  it('a background (unfocused) tab does not publish until it focuses', () => {
    const nav = makeNav(false);
    const { UNSAFE_getAllByType } = renderHeader(nav);
    act(() => fireLayout(UNSAFE_getAllByType(View), 140));
    expect(getHeaderHeight()).toBeNull();
    act(() => nav.__emit('focus'));
    expect(getHeaderHeight()).toBe(140);
  });

  it('renders with no navigator without throwing or publishing (bare mount)', () => {
    const { UNSAFE_getAllByType } = renderHeader(null);
    act(() => fireLayout(UNSAFE_getAllByType(View), 140));
    expect(getHeaderHeight()).toBeNull();
  });
});

// Fire the TITLE's own onLayout (not the container's) with a given slot width so
// the M18 auto-fit estimate runs: a tiny width forces the 0.6 floor, a wide one
// leaves the title at its target size. A title-only header renders exactly one
// <Text> (AppText → Text), so texts[0] is the title.
function fireTitleLayout(texts: ReactTestInstance[], width: number) {
  fireEvent(texts[0], 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height: 48 } } });
}

describe('ScreenHeader title auto-fit (M18) — wrap at the floor (T13/wrap)', () => {
  it('at rest: a fitting title keeps its 40pt target size + protected margins (byte-identical rhythm)', () => {
    const { UNSAFE_getAllByType } = render(<ScreenHeader title="Settings" />);
    act(() => fireTitleLayout(UNSAFE_getAllByType(Text), 320)); // width >> estimate => no shrink
    const title = UNSAFE_getAllByType(Text)[0];
    const s = StyleSheet.flatten(title.props.style);
    expect(s.fontSize).toBe(40); // structural pin: at-rest size unchanged by the 1->2 change
    expect(s.marginTop).toBe(2); // protected micro-margin
    expect(s.flex).toBe(1);
    expect(title.props.numberOfLines).toBe(2); // 2-line allowance present, unused at rest
    expect(title.props.ellipsizeMode).toBeUndefined();
    expect(title.props.children).toBe('Settings');
  });

  it('starved width: M18 floors to 0.6 then WRAPS to 2 lines — full string, zero ellipsis', () => {
    const LONG = 'Barrier reports near downtown Seattle';
    const { UNSAFE_getAllByType } = render(<ScreenHeader title={LONG} />);
    act(() => fireTitleLayout(UNSAFE_getAllByType(Text), 40)); // forces the floor
    const title = UNSAFE_getAllByType(Text)[0];
    expect(StyleSheet.flatten(title.props.style).fontSize).toBe(24); // round(40 * MIN_TITLE_SCALE 0.6)
    expect(title.props.numberOfLines).toBe(2); // wraps to a 2nd line, never clamped to 1
    expect(title.props.ellipsizeMode).toBeUndefined(); // no forced tail-ellipsis
    expect(title.props.children).toBe(LONG); // the full datum survives, un-truncated
  });
});
