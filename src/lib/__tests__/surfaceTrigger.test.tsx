/**
 * G5 — `useSurfaceTrigger` can never break opening the surface.
 *
 * This is the drawer's `useDrawerTrigger` contract (sibling suite
 * drawerTrigger.test.tsx) minus the provider: MapScreen owns both the button and
 * the <Modal>, so trigger and surface are a LOCAL pair and the handle never has
 * to travel through a context.
 *
 * The regression the web case pins actually shipped on the drawer branch and was
 * caught by a browser capture, not by jest: `register()` runs inside the
 * trigger's onPress, immediately before `setOpen(true)`. On react-native-web
 * `findNodeHandle` THROWS ("findNodeHandle is not supported on web"), so the
 * press handler aborted and the drawer never opened — the whole menu was inert
 * on the web build. react-test-renderer implements findNodeHandle, so every
 * existing suite stayed green through it.
 *
 * The rule these tests encode: focus return is an ENHANCEMENT. It may fail, on
 * any platform, for any reason — and the surface must still open.
 *
 * WHY THE HANDLE IS A SENTINEL. react-test-renderer builds no native view tree,
 * so the real `findNodeHandle` returns `undefined` for a perfectly attached ref
 * (probed, not assumed — and the reason the sibling suite's "a working handle IS
 * recorded" assertion passes vacuously on `expect(undefined).not.toBeNull()`).
 * Real native tags are device-only. So the already-mocked RendererProxy returns
 * a fixed TRIGGER_HANDLE, exactly as HamburgerDrawer.focus.test.tsx feeds its
 * drawer context one. What that lets us prove is the plumbing: findNodeHandle is
 * asked about the TRIGGER's own resolved node, and whatever it answers is what
 * reaches setAccessibilityFocus, at the right moment, exactly once.
 *
 * WHAT JEST CANNOT PROVE HERE AT ALL. react-native-web stubs
 * `AccessibilityInfo.setAccessibilityFocus` to an EMPTY BODY and drops
 * `accessibilityViewIsModal`, so this hook has zero web-observable delta. Green
 * here is not green on a device: whether the VoiceOver / TalkBack cursor
 * actually lands on the button is Sky's device pass.
 */
import React, { useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, View, findNodeHandle } from 'react-native';
import { render, renderHook, fireEvent, act } from '@testing-library/react-native';
import { useSurfaceTrigger } from '@/lib/accessibility';

jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: jest.fn(jest.requireActual('react-native/Libraries/ReactNative/RendererProxy').findNodeHandle),
}));

/** The native tag react-test-renderer cannot mint. See the docblock. */
const TRIGGER_HANDLE = 4242;

const nodeHandle = findNodeHandle as unknown as jest.Mock;

type Trigger = ReturnType<typeof useSurfaceTrigger>;

/** The captured hook value, so a test can fire the surface's own dismissal. */
let api: Trigger | null = null;

/**
 * A minimal stand-in for a real local pair — MapScreen's "List" button plus the
 * sheet it owns. The adopted trigger registers then opens, exactly the order
 * every call site uses. The second button models an opener that never adopted
 * the hook (a deep link, an unadopted surface): it opens the same surface
 * WITHOUT registering, so a leftover handle must not be reused.
 */
function Pair({ onOpened = () => {} }: { onOpened?: () => void }) {
  const trigger = useSurfaceTrigger<View>();
  const [open, setOpen] = useState(false);
  api = trigger;
  return (
    <>
      <Pressable
        ref={trigger.ref}
        accessibilityRole="button"
        accessibilityLabel="Open nearby flags list"
        onPress={() => {
          trigger.register();
          setOpen(true);
          onOpened();
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open without registering"
        onPress={() => setOpen(true)}
      />
      {open ? <View testID="surface" /> : null}
    </>
  );
}

let focusSpy: jest.SpyInstance;

beforeEach(() => {
  api = null;
  nodeHandle.mockReset();
  nodeHandle.mockReturnValue(TRIGGER_HANDLE);
  focusSpy = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

/** Press the adopted trigger. */
const openIt = (u: ReturnType<typeof render>) =>
  fireEvent.press(u.getByLabelText('Open nearby flags list'));

/** What the <Modal>'s own onDismiss does: the surface has left the screen. */
const dismiss = () => act(() => api!.restore());

describe('G5 — the trigger opens the surface even when focus registration cannot work', () => {
  it('web: registration is skipped, the surface still opens, and restore stays silent', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const onOpened = jest.fn();
    const u = render(<Pair onOpened={onOpened} />);

    expect(() => openIt(u)).not.toThrow();
    expect(onOpened).toHaveBeenCalledTimes(1);
    expect(u.getByTestId('surface')).toBeTruthy();
    // Skipped by design, not merely survived: the throwing call is never made.
    expect(nodeHandle).not.toHaveBeenCalled();
    // Nothing recorded, so nothing to hand focus back to — and rn-web's
    // setAccessibilityFocus is an empty stub anyway.
    dismiss();
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('a throwing findNodeHandle is swallowed — the surface still opens', () => {
    // The exact RNW failure mode, forced on the native path so the try/catch is
    // proved rather than assumed.
    jest.replaceProperty(Platform, 'OS', 'ios');
    nodeHandle.mockImplementationOnce(() => {
      throw new Error('findNodeHandle is not supported on web. Use the ref property instead.');
    });
    const onOpened = jest.fn();
    const u = render(<Pair onOpened={onOpened} />);

    expect(() => openIt(u)).not.toThrow();
    expect(onOpened).toHaveBeenCalledTimes(1);
    expect(u.getByTestId('surface')).toBeTruthy();
    dismiss();
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('a trigger whose ref never attached records nothing and stays silent', () => {
    // The guard must survive a hook that is wired up but whose ref was never put
    // on a control — no node, so no question asked and no guess made.
    jest.replaceProperty(Platform, 'OS', 'ios');
    const { result } = renderHook(() => useSurfaceTrigger<View>());

    act(() => result.current.register());
    expect(nodeHandle).not.toHaveBeenCalled();
    act(() => result.current.restore());
    expect(focusSpy).not.toHaveBeenCalled();
  });
});

describe('G5 — the enhancement actually does its job', () => {
  it('native: the TRIGGER\'s handle is recorded and the dismissal returns focus to it', () => {
    // The guard must not be so defensive that it quietly disables the feature.
    jest.replaceProperty(Platform, 'OS', 'ios');
    const u = render(<Pair />);
    openIt(u);

    // The ref resolved to a real node, and that node is what was measured.
    expect(api!.ref.current).not.toBeNull();
    expect(nodeHandle).toHaveBeenCalledWith(api!.ref.current);
    dismiss();
    expect(focusSpy).toHaveBeenCalledWith(TRIGGER_HANDLE);
  });

  it('restore() before any register() is silent — it never guesses a target', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    render(<Pair />);

    dismiss();
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('two dismissals fire focus exactly once (the armed latch)', () => {
    // rn-web's Modal fires onDismiss while RN core's is iOS-only, so both
    // release() and onDismiss can land on the same close.
    jest.replaceProperty(Platform, 'OS', 'ios');
    const u = render(<Pair />);
    openIt(u);

    dismiss();
    dismiss();
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });
});

describe('G5 — a handoff opts out, and only for that one close', () => {
  it('markHandoff() suppresses exactly ONE restore and does not poison the next open', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const u = render(<Pair />);

    openIt(u);
    act(() => api!.markHandoff());
    dismiss();
    // This close handed focus onward — to the map callout, or to a confirmation
    // announcement that must not be cut off mid-utterance.
    expect(focusSpy).not.toHaveBeenCalled();

    // The NEXT open is a plain session again.
    openIt(u);
    dismiss();
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('a surface opened WITHOUT register() never lets a stale handle steal focus', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const u = render(<Pair />);

    openIt(u);
    dismiss();
    expect(focusSpy).toHaveBeenCalledTimes(1);

    // Reopened by an unadopted opener: last session's handle is still in the
    // ref, but this session was never armed, so nothing is yanked.
    fireEvent.press(u.getByLabelText('Open without registering'));
    dismiss();
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });
});

describe('G5 — release() is the ANDROID-ONLY stand-in, and it waits', () => {
  // The close intent is NOT the dismissal on Android: RN renders a native
  // Dialog whose window animation JS cannot observe, so release() has to wait
  // the exit out. Firing at close intent aims the cursor at a view in a
  // non-active window, Android drops the request, and the cursor is stranded —
  // with this very spy green, because a spy only proves the call happened.
  it('android: release() does NOT return focus at close intent', () => {
    jest.useFakeTimers();
    jest.replaceProperty(Platform, 'OS', 'android');
    const u = render(<Pair />);
    openIt(u);

    act(() => api!.release());
    expect(focusSpy).not.toHaveBeenCalled(); // still occluded

    act(() => void jest.advanceTimersByTime(319));
    expect(focusSpy).not.toHaveBeenCalled(); // the wait is real, not cosmetic

    act(() => void jest.advanceTimersByTime(1));
    expect(focusSpy).toHaveBeenCalledWith(TRIGGER_HANDLE);
    jest.useRealTimers();
  });

  it('android: a second close-intent supersedes the first rather than stacking', () => {
    jest.useFakeTimers();
    jest.replaceProperty(Platform, 'OS', 'android');
    const u = render(<Pair />);
    openIt(u);

    act(() => api!.release());
    act(() => void jest.advanceTimersByTime(200));
    act(() => api!.release());
    act(() => void jest.runAllTimers());

    // One wait, one focus call — the armed latch and the timer reset agree.
    expect(focusSpy).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it('android: a pending wait never fires into an unmounted tree', () => {
    jest.useFakeTimers();
    jest.replaceProperty(Platform, 'OS', 'android');
    const u = render(<Pair />);
    openIt(u);

    act(() => api!.release());
    u.unmount();
    act(() => void jest.runAllTimers());

    expect(focusSpy).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('ios: release() no-ops — the real onDismiss does the work', () => {
    // UIKit is still presenting the sheet at close time, and it fires a real
    // dismissal-complete event, so release() must not consume the armed latch
    // with the earlier, wrong one.
    jest.replaceProperty(Platform, 'OS', 'ios');
    const u = render(<Pair />);
    openIt(u);

    act(() => api!.release());
    expect(focusSpy).not.toHaveBeenCalled();

    dismiss();
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('web: release() no-ops — rn-web fires its own post-animation onDismiss', () => {
    // rn-web's Modal DOES fire onDismiss, after its exit animation, so web has
    // a correctly-timed real event too. (setAccessibilityFocus is a web stub, so
    // none of this is observable there — this pins the CONTRACT, not an effect.)
    jest.replaceProperty(Platform, 'OS', 'web');
    const u = render(<Pair />);
    openIt(u);

    act(() => api!.release());
    expect(focusSpy).not.toHaveBeenCalled();
  });
});
