/**
 * D2/C3 — `useDrawerTrigger` can never break opening the drawer.
 *
 * The regression this pins actually shipped to the branch and was caught by a
 * browser capture, not by jest: `register()` runs inside the hamburger's
 * onPress, immediately before `setOpen(true)`. On react-native-web
 * `findNodeHandle` THROWS ("findNodeHandle is not supported on web"), so the
 * press handler aborted and the drawer never opened — the whole menu was inert
 * on the web build. react-test-renderer implements findNodeHandle, so every
 * existing suite stayed green through it.
 *
 * The rule these tests encode: focus return is an ENHANCEMENT. It may fail, on
 * any platform, for any reason — and the drawer must still open.
 */
import React from 'react';
import { Platform, Pressable, findNodeHandle } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { DrawerProvider, useDrawer, useDrawerTrigger } from '@/lib/drawerContext';

jest.mock('react-native/Libraries/ReactNative/RendererProxy', () => ({
  ...jest.requireActual('react-native/Libraries/ReactNative/RendererProxy'),
  findNodeHandle: jest.fn(jest.requireActual('react-native/Libraries/ReactNative/RendererProxy').findNodeHandle),
}));

/** A minimal stand-in for a real hamburger: register, then open. Exactly the
 *  order every trigger site uses. */
function Trigger({ onOpened }: { onOpened: () => void }) {
  const drawer = useDrawer();
  const trigger = useDrawerTrigger();
  return (
    <Pressable
      ref={trigger.ref}
      accessibilityRole="button"
      accessibilityLabel="Open navigation menu"
      onPress={() => {
        trigger.register();
        drawer.setOpen(true);
        onOpened();
      }}
    />
  );
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('D2/C3 — the trigger opens the drawer even when focus registration cannot work', () => {
  it('web: registration is skipped and the drawer still opens', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const onOpened = jest.fn();
    const u = render(
      <DrawerProvider>
        <Trigger onOpened={onOpened} />
      </DrawerProvider>,
    );
    expect(() => fireEvent.press(u.getByLabelText('Open navigation menu'))).not.toThrow();
    expect(onOpened).toHaveBeenCalledTimes(1);
  });

  it('a throwing findNodeHandle is swallowed — the drawer still opens', () => {
    // The exact RNW failure mode, forced on the native path so the try/catch
    // is proved rather than assumed.
    const mocked = findNodeHandle as unknown as jest.Mock;
    mocked.mockImplementationOnce(() => {
      throw new Error('findNodeHandle is not supported on web. Use the ref property instead.');
    });
    const onOpened = jest.fn();
    const u = render(
      <DrawerProvider>
        <Trigger onOpened={onOpened} />
      </DrawerProvider>,
    );
    expect(() => fireEvent.press(u.getByLabelText('Open navigation menu'))).not.toThrow();
    expect(onOpened).toHaveBeenCalledTimes(1);
  });

  it('native: a working handle IS recorded, so the enhancement still does its job', () => {
    // The guard must not be so defensive that it quietly disables the feature.
    let api: ReturnType<typeof useDrawer> | null = null;
    function Grab() {
      api = useDrawer();
      return null;
    }
    const u = render(
      <DrawerProvider>
        <Grab />
        <Trigger onOpened={jest.fn()} />
      </DrawerProvider>,
    );
    fireEvent.press(u.getByLabelText('Open navigation menu'));
    expect(api!.triggerRef.current).not.toBeNull();
  });
});
