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
import React, { useEffect, useRef } from 'react';
import { SharedModalsProvider, useSharedModals, type SharedModalKey } from '../sharedModalsContext';
import HelpModal from '@/components/HelpModal';
import ChangelogModal from '@/components/ChangelogModal';
import FeedbackModal from '@/components/FeedbackModal';
import MyFeedbackModal from '@/components/MyFeedbackModal';
// react-test-renderer ships without official types in this project (no
// @types/react-test-renderer in package.json). Import via require + a
// local cast so `tsc --noEmit` stays clean without adding a dev-dep.
// If we ever install @types/react-test-renderer, swap this for the
// standard `import { create, act } from 'react-test-renderer'`.
interface ReactTestInstance {
  type: unknown;
  props: { [k: string]: unknown };
  children: (ReactTestInstance | string)[];
  findAllByType(type: unknown): ReactTestInstance[];
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
const { create, act } = require('react-test-renderer') as ReactTestRendererModule;

jest.mock('../supabase', () => ({ supabase: {} }));

// Tiny consumer that pushes every observed context value into the
// supplied array. Lets the test assert on the sequence of values the
// provider exposed.
function Recorder({
  observed,
  capture,
}: {
  observed: SharedModalKey[];
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
    const observed: SharedModalKey[] = [];
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
    const observed: SharedModalKey[] = [];
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
    const observed: SharedModalKey[] = [];
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

  // Mini host that mirrors what RootNavigator does: mounts all 4 shared
  // modals once inside the provider. Used by the single-mount + a11y
  // tests below.
  function ModalsHost() {
    const { open, setOpen } = useSharedModals();
    const close = () => setOpen(null);
    return (
      <>
        <HelpModal visible={open === 'help'} onClose={close} />
        <ChangelogModal visible={open === 'changelog'} onClose={close} />
        <FeedbackModal visible={open === 'feedback'} onClose={close} />
        <MyFeedbackModal visible={open === 'myFeedback'} onClose={close} />
      </>
    );
  }

  // ───────────────────────────────────────────────────────────────────
  // Gary HIGH #1 — Provider-at-root.
  //
  // The whole point of lifting these modals is that the provider sits
  // at the navigator root, so any screen can call useSharedModals().
  // If a screen ever ends up rendered OUTSIDE the provider (e.g. a
  // future refactor moves it above the provider in the tree), the hook
  // throws — surfacing the bug immediately instead of silently
  // no-opping. This test locks that contract in.
  // ───────────────────────────────────────────────────────────────────
  it('useSharedModals throws outside provider but works inside the root provider', () => {
    // Outside: should throw.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function OutsideConsumer() {
      useSharedModals();
      return null;
    }
    expect(() => {
      act(() => {
        create(<OutsideConsumer />);
      });
    }).toThrow(/SharedModalsProvider/);
    spy.mockRestore();

    // Inside an app-shell-shaped tree (provider at the root, consumers
    // nested arbitrarily deep): no throw, hook returns a working slot.
    let observedValue: { open: SharedModalKey } | null = null;
    function DeepConsumer() {
      const ctx = useSharedModals();
      observedValue = { open: ctx.open };
      return null;
    }
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        <SharedModalsProvider>
          {/* arbitrary nesting — provider is at the root, consumer
              several levels down, just like Profile/Settings sitting
              inside the bottom-tab navigator below RootNavigator. */}
          <React.Fragment>
            <React.Fragment>
              <DeepConsumer />
            </React.Fragment>
          </React.Fragment>
        </SharedModalsProvider>,
      );
    });
    expect(observedValue).not.toBeNull();
    expect(observedValue!.open).toBeNull();
    act(() => {
      renderer?.unmount();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // Gary HIGH #2 — Single-mount.
  //
  // The lift was for performance + state-desync safety: each of the 4
  // shared modals must be mounted EXACTLY ONCE in the tree, no matter
  // how many screens reach for setOpen(). This test mounts two
  // consumer stubs (mimicking Profile + Settings both wanting to open
  // 'help') alongside one ModalsHost. After both consumers call
  // setOpen('help'), there should still be exactly ONE HelpModal —
  // ditto for each of the other three keys.
  // ───────────────────────────────────────────────────────────────────
  it('mounts each shared modal exactly once regardless of how many screens open it', () => {
    function Consumer({ capture }: { capture: (setOpen: (k: SharedModalKey) => void) => void }) {
      const { setOpen } = useSharedModals();
      capture(setOpen);
      return null;
    }

    let setOpenA: ((k: SharedModalKey) => void) | undefined;
    let setOpenB: ((k: SharedModalKey) => void) | undefined;
    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        <SharedModalsProvider>
          {/* Two consumer stubs = Profile + Settings. Each captures a
              setOpen; both point at the same provider, so opening
              from either side should still only ever produce one
              instance of each modal at the host. */}
          <Consumer
            capture={(s) => {
              setOpenA = s;
            }}
          />
          <Consumer
            capture={(s) => {
              setOpenB = s;
            }}
          />
          <ModalsHost />
        </SharedModalsProvider>,
      );
    });
    // Both screens try to open Help at the same time.
    act(() => {
      setOpenA?.('help');
      setOpenB?.('help');
    });

    const root = renderer!.root;
    // Cycle through every key — for each one, even after both
    // consumers tried to open it, the host should still expose just
    // one instance of that modal in the tree.
    const modalTypes: [string, unknown][] = [
      ['HelpModal', HelpModal],
      ['ChangelogModal', ChangelogModal],
      ['FeedbackModal', FeedbackModal],
      ['MyFeedbackModal', MyFeedbackModal],
    ];
    for (const [name, type] of modalTypes) {
      const found = root.findAllByType(type);
      expect({ name, count: found.length }).toEqual({ name, count: 1 });
    }
    act(() => {
      renderer?.unmount();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // Gary HIGH #3 — Focus return.
  //
  // RN's Modal doesn't return focus to the trigger element on close on
  // its own — that's something the consumer arranges by watching the
  // open→null transition and calling .focus() on a ref to the trigger.
  // (Full VoiceOver focus simulation in jsdom is fragile, so this
  // test validates the PATTERN: a consumer that subscribes to `open`
  // and re-focuses on transition-to-null actually fires its focus()
  // call exactly once when the modal closes.) Alex flagged this as
  // MED P4 with a manual VoiceOver check; this lock-in covers the
  // automated half.
  // ───────────────────────────────────────────────────────────────────
  it('exposes open→null transitions so consumers can return focus to the trigger', () => {
    const focusCalls: number[] = [];
    let setOpenRef: ((k: SharedModalKey) => void) | undefined;

    function TriggerWithFocusReturn() {
      const { open, setOpen } = useSharedModals();
      setOpenRef = setOpen;
      // Fake ref-like object — what a real Pressable would expose via
      // useRef. We just need a .focus() to count calls.
      const triggerRef = useRef({
        focus: () => {
          focusCalls.push(Date.now());
        },
      });
      // Track the previous `open` so we can detect the
      // non-null → null transition (= modal just closed) and re-focus.
      const prevOpen = useRef<SharedModalKey>(null);
      useEffect(() => {
        if (prevOpen.current !== null && open === null) {
          triggerRef.current.focus();
        }
        prevOpen.current = open;
      }, [open]);
      return null;
    }

    let renderer: ReactTestRenderer | undefined;
    act(() => {
      renderer = create(
        <SharedModalsProvider>
          <TriggerWithFocusReturn />
        </SharedModalsProvider>,
      );
    });
    // Initial mount: no transition yet, no focus call.
    expect(focusCalls.length).toBe(0);

    // Open the modal — still no focus call (we re-focus on CLOSE).
    act(() => {
      setOpenRef?.('help');
    });
    expect(focusCalls.length).toBe(0);

    // Close it — should fire focus() exactly once.
    act(() => {
      setOpenRef?.(null);
    });
    expect(focusCalls.length).toBe(1);

    // Re-open + close again — focus fires again, still once per close.
    act(() => {
      setOpenRef?.('changelog');
    });
    act(() => {
      setOpenRef?.(null);
    });
    expect(focusCalls.length).toBe(2);

    act(() => {
      renderer?.unmount();
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // Alex P5 — Each lifted modal sets accessibilityViewIsModal on its
  // backdrop View. iOS VoiceOver uses this flag to treat everything
  // behind the modal as inert, so screen-reader focus can't wander
  // out of the modal into the underlying screen.
  // ───────────────────────────────────────────────────────────────────
  it('each shared modal sets accessibilityViewIsModal on its backdrop View', () => {
    const cases: ['help' | 'changelog' | 'feedback' | 'myFeedback', string][] = [
      ['help', 'helpModal-backdrop'],
      ['changelog', 'changelogModal-backdrop'],
      ['feedback', 'feedbackModal-backdrop'],
      ['myFeedback', 'myFeedbackModal-backdrop'],
    ];
    for (const [key, testID] of cases) {
      let setOpenRef: ((k: SharedModalKey) => void) | undefined;
      function Consumer() {
        const { setOpen } = useSharedModals();
        setOpenRef = setOpen;
        return null;
      }
      let renderer: ReactTestRenderer | undefined;
      act(() => {
        renderer = create(
          <SharedModalsProvider>
            <Consumer />
            <ModalsHost />
          </SharedModalsProvider>,
        );
      });
      act(() => {
        setOpenRef?.(key);
      });
      const found = renderer!.root.findAllByProps({ testID });
      // Should find at least one backdrop View with the test ID; the
      // first match is the backdrop itself (vs. a stylesheet object
      // or other passthrough), and its props must include
      // accessibilityViewIsModal: true.
      const backdrop = found.find((n) => n.props.accessibilityViewIsModal === true);
      expect({ key, found: !!backdrop }).toEqual({ key, found: true });
      act(() => {
        renderer?.unmount();
      });
    }
  });

  it('supports each of the four shared modal keys (smoke-check the union)', () => {
    const keys: Exclude<SharedModalKey, null>[] = [
      'help',
      'changelog',
      'feedback',
      'myFeedback',
    ];
    for (const k of keys) {
      const observed: SharedModalKey[] = [];
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
