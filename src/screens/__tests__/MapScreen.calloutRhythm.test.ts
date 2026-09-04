/**
 * T1 (F3-04 / F3-06) — the callout rhythm guards.
 *
 * BP1 gave the callout pipeline one designed rhythm:
 *   • rung 0 — retryShowCallout now makes an immediate SAME-TICK attempt
 *     before the 250/400/550/700 ladder, so the common case (marker already
 *     mounted) pays off in the same frame as the camera move, and Reduce
 *     Motion's instant jump no longer carries a ≥250ms dead beat (F3-06);
 *   • one shared scheduler — createCalloutScheduler is last-tap-wins across
 *     ALL FOUR callout flows (Tasks focus, deep link, View-on-map, Nearby
 *     select), so rapid A→B can never answer with A's callout on a map
 *     centered on B (F3-04), and leaving the Map mid-ladder cancels cleanly.
 *
 * Behavioural tests run on the EXPORTED helpers with jest fake timers (full
 * MapScreen renders stay out of scope, per the other MapScreen suites); the
 * wiring itself is pinned by source invariants below, same idiom as
 * MapScreen.detail.test.ts.
 */

// jest.mock calls are hoisted above imports; the mocks below keep MapScreen's
// native-bridge import graph loadable in Node (same set as deeplink test).
import * as fs from 'fs';
import * as path from 'path';
import { createCalloutScheduler, retryShowCallout } from '../MapScreen';
import type { PlatformMapHandle } from '@/components/PlatformMap';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: () => null,
  Marker: () => null,
  Callout: () => null,
  Polygon: () => null,
  PROVIDER_DEFAULT: 'default',
}));
jest.mock('react-native-map-clustering', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

type MockHandle = PlatformMapHandle & { showCallout: jest.Mock };

function makeMap(results: boolean[] = [true]): MockHandle {
  return {
    animateTo: jest.fn(),
    showCallout: jest.fn(() => results.shift() ?? results.at(-1) ?? true),
    zoomBy: jest.fn(),
  } as unknown as MockHandle;
}

const callsFor = (map: MockHandle, id: string): number =>
  map.showCallout.mock.calls.filter((c) => c[0] === id).length;

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('T1 rung 0 — the same-tick attempt (F3-06)', () => {
  it('fires showCallout synchronously, before any timer runs', () => {
    const map = makeMap();
    retryShowCallout(() => map, 'f1', () => false);
    // No timer advance: the first attempt already landed, same tick.
    expect(map.showCallout).toHaveBeenCalledTimes(1);
    expect(map.showCallout).toHaveBeenCalledWith('f1');
  });

  it('skips every attempt — including rung 0 — when already cancelled', () => {
    const map = makeMap();
    retryShowCallout(() => map, 'f1', () => true);
    expect(map.showCallout).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(map.showCallout).not.toHaveBeenCalled();
  });

  it('tolerates a null map on every rung (marker path not mounted yet)', () => {
    expect(() => {
      retryShowCallout(() => null, 'f1', () => false);
      jest.runAllTimers();
    }).not.toThrow();
  });
});

describe('T1 ladder — retries readiness and stops after the first presentation', () => {
  it('retries missing markers, then stops permanently after the first success', () => {
    const map = makeMap([false, false, true]);
    retryShowCallout(() => map, 'f1', () => false);
    expect(map.showCallout).toHaveBeenCalledTimes(1); // rung 0
    jest.advanceTimersByTime(250);
    expect(map.showCallout).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(150); // t=400
    expect(map.showCallout).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(150); // t=550 — already settled at t=400
    expect(map.showCallout).toHaveBeenCalledTimes(3);
    jest.advanceTimersByTime(150); // t=700
    expect(map.showCallout).toHaveBeenCalledTimes(3);
    jest.runAllTimers(); // nothing left
    expect(map.showCallout).toHaveBeenCalledTimes(3);
  });

  it('the returned canceller clears all pending rungs; double-cancel is a no-op', () => {
    const map = makeMap([false, false, false, false, false]);
    const cancel = retryShowCallout(() => map, 'f1', () => false);
    jest.advanceTimersByTime(250); // rung 0 + 250 landed
    cancel();
    cancel(); // idempotent — the effect sites may double-cancel via cleanup
    jest.runAllTimers();
    expect(map.showCallout).toHaveBeenCalledTimes(2);
  });

  it('a caller isCancelled predicate silences later rungs mid-ladder', () => {
    const map = makeMap([false, false, false, false, false]);
    let cancelled = false;
    retryShowCallout(() => map, 'f1', () => cancelled);
    jest.advanceTimersByTime(250);
    cancelled = true; // e.g. the deep-link effect cleanup flipped its flag
    jest.runAllTimers();
    expect(map.showCallout).toHaveBeenCalledTimes(2);
  });
});

describe('T1 shared scheduler — last-tap-wins across every path (F3-04)', () => {
  it('rapid Nearby A→B yields exactly one presentation for each mounted marker', () => {
    const map = makeMap();
    const scheduler = createCalloutScheduler(() => map);
    scheduler.schedule('A'); // t=0: A rung 0
    jest.advanceTimersByTime(450);
    expect(callsFor(map, 'A')).toBe(1);
    scheduler.schedule('B');
    jest.runAllTimers();
    expect(callsFor(map, 'A')).toBe(1);
    expect(callsFor(map, 'B')).toBe(1);
    // The last word on screen is B — the flag the user actually asked for.
    expect(map.showCallout.mock.calls.at(-1)?.[0]).toBe('B');
  });

  it('wins across DIFFERENT paths too (deep link A, then View-on-map B)', () => {
    const map = makeMap();
    const scheduler = createCalloutScheduler(() => map);
    let deepLinkCancelled = false;
    scheduler.schedule('A', () => deepLinkCancelled); // effect-style caller
    jest.advanceTimersByTime(300);
    scheduler.schedule('B'); // handler-style caller
    jest.runAllTimers();
    expect(callsFor(map, 'A')).toBe(1);
    expect(callsFor(map, 'B')).toBe(1);
  });

  it('cancelPending() kills a mid-flight ladder (leaving the Map tab)', () => {
    const map = makeMap([false, false, false, false, false]);
    const scheduler = createCalloutScheduler(() => map);
    scheduler.schedule('A');
    jest.advanceTimersByTime(250);
    scheduler.cancelPending();
    jest.runAllTimers();
    expect(callsFor(map, 'A')).toBe(2);
    // And it is safe to call with nothing pending.
    expect(() => scheduler.cancelPending()).not.toThrow();
  });

  it('the per-call canceller returned to effect sites still works alongside the shared one', () => {
    const map = makeMap();
    const scheduler = createCalloutScheduler(() => map);
    const cancelA = scheduler.schedule('A');
    cancelA(); // effect cleanup fired first
    scheduler.schedule('B'); // shared cancel of A is now a harmless double-cancel
    jest.runAllTimers();
    expect(callsFor(map, 'A')).toBe(1); // rung 0 only (fired before cancel)
    expect(callsFor(map, 'B')).toBe(1);
  });

  it('reads the live map handle on every readiness rung', () => {
    const map = makeMap();
    let current: PlatformMapHandle | null = null;
    const scheduler = createCalloutScheduler(() => current);
    scheduler.schedule('early'); // rung 0 sees no mounted map
    current = map;
    jest.advanceTimersByTime(250); // next rung sees the newly mounted handle
    jest.runAllTimers();
    expect(callsFor(map, 'early')).toBe(1);
  });
});

describe('T1 wiring — source invariants (the four flows ride the ONE scheduler)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'MapScreen.tsx'), 'utf8');

  it('exactly four schedule sites; no raw retryShowCallout call sites remain', () => {
    expect(src.match(/calloutScheduler\.schedule\(/g)).toHaveLength(4);
    expect(src).not.toContain('retryShowCallout(mapRef');
  });

  it('one scheduler instance, built over the live map ref', () => {
    expect(src).toContain(
      'const calloutScheduler = useMemo(() => createCalloutScheduler(() => mapRef.current), []);',
    );
  });

  it('unmount cancels any in-flight ladder (leaving the Map tab mid-ladder)', () => {
    expect(src).toContain(
      'useEffect(() => () => calloutScheduler.cancelPending(), [calloutScheduler]);',
    );
  });

  it('the effect sites keep their own cancelled-flag predicates', () => {
    expect(src).toContain("calloutScheduler.schedule(focus.id, () => cancelled)");
    expect(src).toContain("calloutScheduler.schedule(flag.id, () => cancelled)");
  });

  it('the deep link’s 800ms param-clear still trails the last (700ms) rung', () => {
    expect(src).toContain('clearParamTimer = setTimeout(');
    expect(src).toContain('}, 800);');
  });

  it('the Tasks focus intent is also cleared after its final readiness rung', () => {
    expect(src).toContain('navigation.setParams({ focusFlag: undefined, ts: undefined });');
  });
});
