/**
 * G5 — PressableScale forwards a ref, and forwarding costs the ref-less sites
 * nothing.
 *
 * `useSurfaceTrigger` hands the screen-reader cursor back to the control that
 * opened a surface, which means it needs a node handle for that control. Three
 * facts make the ref the only correct way to get one:
 *
 *   1. PressableScale IS the button — it is built on
 *      Animated.createAnimatedComponent(Pressable) precisely so there is no
 *      wrapper View — so the ref has to land on the real accessibility element.
 *   2. Wrapping each trigger in a <View ref> would not work anyway: Android's
 *      NativeViewHierarchyOptimizer DELETES layout-only Views, so the tag could
 *      resolve to a view that no longer exists. Device-only, silent.
 *   3. Most call sites pass no ref, and this repo has ZERO snapshot tests, so
 *      nothing else would notice if forwarding broke their behaviour. Hence the
 *      second half of this file.
 *      Counted 2026-07-27: 17 <PressableScale> sites in app source (MapScreen 11,
 *      HomeScreen 5, TasksScreen 1), of which the 3 G5 triggers in MapScreen now
 *      carry `ref={…Trigger.ref}` — so 14 are ref-less. Stated as a count with a
 *      date because the earlier "17 ref-less" phrasing was true only before the
 *      adoption commits landed and then travelled as fact.
 *
 * WHAT JEST CAN AND CANNOT SEE. react-test-renderer builds no native view tree,
 * so the REAL `findNodeHandle` returns `undefined` for a perfectly attached ref
 * (probed on this very component, not assumed). A real native tag is device-only.
 * So the reachability proof is made two ways that are both true here: the ref
 * resolves to a host-backed element that carries the native methods a tag is
 * minted from, and — with RendererProxy stubbed the way surfaceTrigger.test.tsx
 * stubs it — a full register/dismiss round-trip through a real PressableScale
 * lands on setAccessibilityFocus. Whether VoiceOver's cursor truly moves is
 * Sky's device pass.
 */
import React, { useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  View,
  findNodeHandle,
} from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { PressableScale } from '../PressableScale';
import { AppText } from '../AppText';
import { useSurfaceTrigger } from '@/lib/accessibility';
import { color } from '@/theme';

jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: jest.fn(jest.requireActual('react-native/Libraries/ReactNative/RendererProxy').findNodeHandle),
}));

// Pin reduce-motion OFF so the spring assertions are about forwarding, not about
// the RM gate (which reduceMotion.primitives.test.tsx already owns). The real
// hook resolves its preference asynchronously, which would settle outside act().
// useSurfaceTrigger below is the REAL one — only this one hook is replaced.
jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: jest.fn(() => false),
}));

/** The native tag react-test-renderer cannot mint. See the docblock. */
const TRIGGER_HANDLE = 7171;

const nodeHandle = findNodeHandle as unknown as jest.Mock;

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('G5 — a forwarded ref reaches the real accessibility element', () => {
  it('resolves to the underlying host View, not the Animated wrapper or null', () => {
    const ref = React.createRef<View>();
    render(
      <PressableScale ref={ref} accessibilityLabel="Tap">
        <AppText>Tap</AppText>
      </PressableScale>,
    );

    expect(ref.current).not.toBeNull();
    // The element the platform would mint a tag from: it carries the native
    // methods, so it is a real view and not an intermediate wrapper object.
    const node = ref.current as unknown as Record<string, unknown>;
    expect(typeof node.measure).toBe('function');
    expect(typeof node.setNativeProps).toBe('function');
    expect(typeof node.focus).toBe('function');
  });

  it('is an acceptable findNodeHandle argument — so register() records a handle', () => {
    nodeHandle.mockReturnValue(TRIGGER_HANDLE);
    const ref = React.createRef<View>();
    render(
      <PressableScale ref={ref} accessibilityLabel="Tap">
        <AppText>Tap</AppText>
      </PressableScale>,
    );

    expect(findNodeHandle(ref.current)).toBe(TRIGGER_HANDLE);
    expect(nodeHandle).toHaveBeenCalledWith(ref.current);
  });

  it('end to end: a PressableScale trigger gets the cursor back on dismissal', () => {
    // The whole point of C1 + C2 together, on the real primitive.
    jest.replaceProperty(Platform, 'OS', 'ios');
    nodeHandle.mockReturnValue(TRIGGER_HANDLE);
    const focusSpy = jest
      .spyOn(AccessibilityInfo, 'setAccessibilityFocus')
      .mockImplementation(() => {});

    let restore: (() => void) | null = null;
    function Pair() {
      const trigger = useSurfaceTrigger<View>();
      const [open, setOpen] = useState(false);
      restore = trigger.restore;
      return (
        <>
          <PressableScale
            ref={trigger.ref}
            accessibilityLabel="Open nearby flags list"
            onPress={() => {
              trigger.register();
              setOpen(true);
            }}
          >
            <AppText>List</AppText>
          </PressableScale>
          {open ? <View testID="surface" /> : null}
        </>
      );
    }
    const u = render(<Pair />);

    fireEvent.press(u.getByLabelText('Open nearby flags list'));
    expect(u.getByTestId('surface')).toBeTruthy();
    act(() => restore!());
    expect(focusSpy).toHaveBeenCalledWith(TRIGGER_HANDLE);
  });
});

describe('G5 — the 14 ref-less call sites are unchanged', () => {
  it('a ref-less PressableScale still presses, springs and dims', () => {
    // Spy the driver so we count "did an animation start?" without running a
    // native-driver animation under jest (the reduceMotion.primitives idiom).
    const spring = jest
      .spyOn(Animated, 'spring')
      .mockImplementation((() => ({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() })) as never);
    const onPress = jest.fn();
    const u = render(
      <PressableScale onPress={onPress} accessibilityLabel="Tap">
        <AppText>Tap</AppText>
      </PressableScale>,
    );
    const node = u.getByLabelText('Tap');

    // No dim at rest.
    expect(StyleSheet.flatten(node.props.style).backgroundColor).toBeUndefined();

    // PRESS IN: the scale spring starts and the fill-swap dim engages.
    fireEvent(node, 'pressIn');
    expect(spring).toHaveBeenCalledTimes(1);
    expect(StyleSheet.flatten(u.getByLabelText('Tap').props.style).backgroundColor).toBe(
      color.borderPressed,
    );

    // PRESS OUT: it springs back and the dim lifts.
    fireEvent(node, 'pressOut');
    expect(spring).toHaveBeenCalledTimes(2);
    expect(StyleSheet.flatten(u.getByLabelText('Tap').props.style).backgroundColor).toBeUndefined();

    // And the press itself still fires.
    fireEvent.press(node);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
