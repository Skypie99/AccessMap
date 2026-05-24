/**
 * Tests for src/lib/sharedModalsContext.tsx — the shared "which modal
 * is open" slot used by ProfileScreen + SettingsScreen so we don't have
 * to mount the same modal twice.
 *
 * The behavior we lock in:
 *  - The provider yields `open === null` on first render.
 *  - `setOpen('help')` flips the value to 'help'.
 *  - `setOpen(null)` clears the value back to null.
 *  - Calling `useSharedModals()` outside the provider throws (so the
 *    bug surfaces immediately instead of silently no-opping).
 *
 * We use react-test-renderer (already in the deps via the RN preset) to
 * mount a tiny consumer component that records the context value each
 * render. No native modules touched, no AsyncStorage, no Supabase.
 */
import React from 'react';
// react-test-renderer ships without official types in this project (no
// @types/react-test-renderer in package.json). Import via require + a
// local cast so `tsc --noEmit` stays clean without adding a dev-dep.
// If we ever install @types/react-test-renderer, swap this for the
// standard `import { create, act } from 'react-test-renderer'`.
interface ReactTestRenderer {
  unmount(): void;
}
interface ReactTestRendererModule {
  create(element: React.ReactElement): ReactTestRenderer;
  act(callback: () => void): void;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { create, act } = require('react-test-renderer') as ReactTestRendererModule;
import {
  SharedModalsProvider,
  useSharedModals,
  type SharedModalKey,
} from '../sharedModalsContext';

// Tiny consumer that pushes every observed context value into the
// supplied array. Lets the test assert on the sequence of values the
// provider exposed.
function Recorder({
  observed,
  capture,
}: {
  observed: Array<SharedModalKey>;
  // Stash the setter so the test can call it from outside the tree.
  capture: (setOpen: (k: SharedModalKey) => void) => void;
}) {
  const { open, setOpen } = useSharedModals();
  observed.push(open);
  capture(setOpen);
  // Return null — react-test-renderer needs a renderable result but we
  // don't need any actual UI for these assertions.
  return null;
}

describe('sharedModalsContext', () => {
  it('yields initial open=null', () => {
    const observed: Array<SharedModalKey> = [];
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        <SharedModalsProvider>
          <Recorder observed={observed} capture={() => {}} />
        </SharedModalsProvider>,
      );
    });
    expect(observed[0]).toBeNull();
    act(() => {
      renderer?.unmount();
    });
  });

  it("setOpen('help') updates the value to 'help'", () => {
    const observed: Array<SharedModalKey> = [];
    let setOpenRef: ((k: SharedModalKey) => void) | undefined;
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        <SharedModalsProvider>
          <Recorder
            observed={observed}
            capture={(s) => {
              setOpenRef = s;
            }}
          />
        </SharedModalsProvider>,
      );
    });
    act(() => {
      setOpenRef?.('help');
    });
    // Last observation should be 'help'; first was null.
    expect(observed[0]).toBeNull();
    expect(observed[observed.length - 1]).toBe('help');
    act(() => {
      renderer?.unmount();
    });
  });

  it('setOpen(null) clears an open key', () => {
    const observed: Array<SharedModalKey> = [];
    let setOpenRef: ((k: SharedModalKey) => void) | undefined;
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        <SharedModalsProvider>
          <Recorder
            observed={observed}
            capture={(s) => {
              setOpenRef = s;
            }}
          />
        </SharedModalsProvider>,
      );
    });
    act(() => {
      setOpenRef?.('changelog');
    });
    act(() => {
      setOpenRef?.(null);
    });
    expect(observed[observed.length - 1]).toBeNull();
    // Spot-check that the intermediate 'changelog' value was observed
    // — guards against React batching the two state updates so we never
    // saw the in-between paint (we'd still pass without this, but it
    // documents the expected sequence).
    expect(observed).toContain('changelog');
    act(() => {
      renderer?.unmount();
    });
  });

  it('throws when useSharedModals is used outside the provider', () => {
    // Suppress the React error-boundary console.error so the test
    // output stays clean. The throw itself is what we're asserting.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function Bad() {
      useSharedModals();
      return null;
    }
    expect(() => {
      act(() => {
        create(<Bad />);
      });
    }).toThrow(/SharedModalsProvider/);
    spy.mockRestore();
  });

  it('supports each of the four shared modal keys (smoke-check the union)', () => {
    const keys: Array<Exclude<SharedModalKey, null>> = [
      'help',
      'changelog',
      'feedback',
      'myFeedback',
    ];
    for (const k of keys) {
      const observed: Array<SharedModalKey> = [];
      let setOpenRef: ((next: SharedModalKey) => void) | undefined;
      let renderer: ReactTestRenderer | undefined;
      act(() => {
        renderer = create(
          <SharedModalsProvider>
            <Recorder
              observed={observed}
              capture={(s) => {
                setOpenRef = s;
              }}
            />
          </SharedModalsProvider>,
        );
      });
      act(() => {
        setOpenRef?.(k);
      });
      expect(observed[observed.length - 1]).toBe(k);
      act(() => {
        renderer?.unmount();
      });
    }
  });
});
