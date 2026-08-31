/**
 * T1 (F2-01) — the NATIVE callout-clear guards.
 *
 * Native has no Leaflet autoPan: react-native-maps opens the callout wherever
 * the pin sits, so a top-third pin's callout opens straight into the chrome
 * band (same collision class as web — code-inferred; R2-D12 device-verifies).
 * BP1's native leg, pinned here:
 *
 *   • biasRegionForCallout (pure): callout-bound camera targets aim the pin
 *     at the screen fraction where chrome + callout headroom end. Headroom
 *     follows the callout's bounded Dynamic Type scale; the pin stays fully
 *     visible and chrome remains clamped ≤45% of map height. Un-occluded
 *     geometry is the identity.
 *   • animateTo(region, { calloutClear: true }) applies the bias; every
 *     non-callout move keeps EXACT targeting.
 *   • a direct pin tap (Marker onPress) nudges the camera only when the pin
 *     actually sits inside the chrome+headroom band, at the CURRENT zoom
 *     (deltas = the live visible span), and never breaks the tap if the map
 *     APIs are missing or reject.
 *
 * Harness mirrors PlatformMapNative.reduceMotion.test.tsx; the Marker mock
 * additionally records props so the tests can fire onPress by hand.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- test-local mock factories
   stand in for external native-map library surfaces we don't want to model. */
import React from 'react';
import { Dimensions } from 'react-native';
import { render, act } from '@testing-library/react-native';
import PlatformMap, {
  biasRegionForCallout,
  calloutHeadroomPx,
  type PlatformMapHandle,
} from '../PlatformMap';
import type { FlagRow } from '@/types/database';

// The underlying (fake) react-native-maps instance the imperative handle drives.
const mockMap: { current: any } = {
  current: {
    animateToRegion: jest.fn(),
    animateCamera: jest.fn(),
    getCamera: jest.fn(),
    pointForCoordinate: jest.fn(),
    getMapBoundaries: jest.fn(),
  },
};

jest.mock('react-native-map-clustering', () => ({
  __esModule: true,
  default: (props: any) => {
    props.mapRef?.(mockMap.current);
    return props.children ?? null;
  },
}));

jest.mock('react-native-maps', () => {
  const Passthrough = (props: any) => props.children ?? null;
  const markerProps: any[] = [];
  (global as any).__nmMarkers = markerProps;
  return {
    __esModule: true,
    default: Passthrough,
    Callout: Passthrough,
    Marker: (props: any) => {
      markerProps.push(props);
      return props.children ?? null;
    },
    Polygon: Passthrough,
    PROVIDER_DEFAULT: 'default',
  };
});

// flags.ts (imported by PlatformMap for labels) pulls supabase at module scope.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const markers = (): any[] => (global as any).__nmMarkers;

const REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const FLAG: FlagRow = {
  id: 'f-top',
  lat: 37.79,
  lng: -122.41,
  category: 'no_ramp',
  severity: 4,
  description: null,
  photo_url: null,
  status: 'open',
  user_id: 'u1',
  created_at: '2026-07-05T00:00:00Z',
} as FlagRow;

const WIN_H = Dimensions.get('window').height;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function renderMap(opts: { reducedMotion?: boolean; chromeInsetTop?: number; flags?: FlagRow[] }) {
  const ref = React.createRef<PlatformMapHandle>();
  render(
    <PlatformMap
      ref={ref}
      initialRegion={REGION}
      flags={opts.flags ?? ([] as FlagRow[])}
      focusedFlagId={null}
      reducedMotion={opts.reducedMotion}
      chromeInsetTop={opts.chromeInsetTop}
    />,
  );
  return ref;
}

beforeEach(() => {
  markers().length = 0;
  mockMap.current.animateToRegion.mockClear();
  mockMap.current.animateCamera.mockClear();
  mockMap.current.getCamera.mockReset().mockResolvedValue({ zoom: 12, center: {} });
  mockMap.current.pointForCoordinate = jest.fn();
  mockMap.current.getMapBoundaries = jest.fn();
});

describe('biasRegionForCallout — the pure math', () => {
  const region = { latitude: 49.88, longitude: -119.49, latitudeDelta: 0.01, longitudeDelta: 0.01 };

  it('identity when there is no chrome or no height', () => {
    expect(biasRegionForCallout(region, 0, 844)).toEqual(region);
    expect(biasRegionForCallout(region, 200, 0)).toEqual(region);
  });

  it('identity when chrome + headroom still end above screen center (f clamps at 0.5)', () => {
    // (200 + 220) / 844 = 0.498 < 0.5 → a centered pin already clears.
    expect(biasRegionForCallout(region, 200, 844)).toEqual(region);
  });

  it('biases the pin below center when chrome + headroom cross the midline', () => {
    // clamp(300, 45% of 800 = 360) = 300; f = (300 + 220) / 800 = 0.65.
    const out = biasRegionForCallout(region, 300, 800);
    expect(out.latitude).toBeCloseTo(region.latitude + 0.15 * 0.01, 10);
    expect(out.longitude).toBe(region.longitude);
    expect(out.latitudeDelta).toBe(0.01);
  });

  it('uses the required clearance while keeping the full pin on-screen', () => {
    // Runaway chrome 800 → clamped to 360; f = (360 + 220) / 800 = 0.725.
    const out = biasRegionForCallout(region, 800, 800);
    expect(out.latitude).toBeCloseTo(region.latitude + 0.225 * 0.01, 10);
  });

  it('scales headroom with the same bounded multiplier as callout text', () => {
    expect(calloutHeadroomPx(1)).toBe(220);
    expect(calloutHeadroomPx(2.3)).toBe(286);
    const out = biasRegionForCallout(region, 300, 800, 2.3);
    expect(out.latitude).toBeCloseTo(region.latitude + 0.2325 * 0.01, 10);
  });

  it('defaults absent deltas to 0.005 (the app’s standard focus zoom)', () => {
    const out = biasRegionForCallout({ latitude: 1, longitude: 2 }, 300, 800);
    expect(out.latitudeDelta).toBe(0.005);
    expect(out.longitudeDelta).toBe(0.005);
    expect(out.latitude).toBeCloseTo(1 + 0.15 * 0.005, 10);
  });
});

describe('T1 — animateTo: calloutClear opts in, everything else keeps exact targeting', () => {
  it('without opts, the region passes through byte-exact (GPS/search/saved flows)', () => {
    const ref = renderMap({ chromeInsetTop: 300 });
    act(() => {
      ref.current?.animateTo({ latitude: 1, longitude: 2 });
    });
    const [region, duration] = mockMap.current.animateToRegion.mock.calls[0];
    expect(region).toEqual({ latitude: 1, longitude: 2, latitudeDelta: 0.005, longitudeDelta: 0.005 });
    expect(duration).toBe(600);
  });

  it('with { calloutClear: true }, the target is the biased region', () => {
    const ref = renderMap({ chromeInsetTop: 300 });
    act(() => {
      ref.current?.animateTo({ latitude: 1, longitude: 2 }, { calloutClear: true });
    });
    const [region] = mockMap.current.animateToRegion.mock.calls[0];
    expect(region).toEqual(
      biasRegionForCallout(
        { latitude: 1, longitude: 2, latitudeDelta: 0.005, longitudeDelta: 0.005 },
        300,
        WIN_H,
      ),
    );
  });

  it('calloutClear without a measured chrome is the identity (prop absent)', () => {
    const ref = renderMap({});
    act(() => {
      ref.current?.animateTo({ latitude: 1, longitude: 2 }, { calloutClear: true });
    });
    const [region] = mockMap.current.animateToRegion.mock.calls[0];
    expect(region).toEqual({ latitude: 1, longitude: 2, latitudeDelta: 0.005, longitudeDelta: 0.005 });
  });

  it('Reduce Motion keeps the instant jump (duration 0) on a biased move', () => {
    const ref = renderMap({ reducedMotion: true, chromeInsetTop: 300 });
    act(() => {
      ref.current?.animateTo({ latitude: 1, longitude: 2 }, { calloutClear: true });
    });
    const [, duration] = mockMap.current.animateToRegion.mock.calls[0];
    expect(duration).toBe(0);
  });
});

describe('T1 — direct pin tap: the chrome-band nudge (code-inferred; R2-D12)', () => {
  function pressFlagMarker() {
    const flagMarker = markers().find((m) => typeof m.onPress === 'function');
    expect(flagMarker).toBeTruthy();
    return flagMarker.onPress();
  }

  it('a pin inside the chrome band nudges the camera at the CURRENT zoom', async () => {
    mockMap.current.pointForCoordinate.mockResolvedValue({ x: 40, y: 60 }); // occluded
    mockMap.current.getMapBoundaries.mockResolvedValue({
      northEast: { latitude: 37.85, longitude: -122.35 },
      southWest: { latitude: 37.73, longitude: -122.47 },
    });
    renderMap({ chromeInsetTop: 300, flags: [FLAG] });
    await act(async () => {
      pressFlagMarker();
      await flush();
    });
    expect(mockMap.current.animateToRegion).toHaveBeenCalledTimes(1);
    const [region, duration] = mockMap.current.animateToRegion.mock.calls[0];
    // Deltas = the live visible span (NE − SW, computed the same way the SUT
    // does so float precision matches) — zoom preserved.
    const latSpan = 37.85 - 37.73;
    const lngSpan = -122.35 - -122.47;
    expect(region).toEqual(
      biasRegionForCallout(
        { latitude: FLAG.lat, longitude: FLAG.lng, latitudeDelta: latSpan, longitudeDelta: lngSpan },
        300,
        WIN_H,
      ),
    );
    expect(duration).toBe(600);
  });

  it('the nudge applies a NON-ZERO downward bias when the chrome crosses the midline (not vacuous)', async () => {
    // At the default jest window height biasRegionForCallout clamps f to 0.5
    // (zero shift), so the assertion above cannot fail on magnitude. Force a
    // SHORT map so the chrome + headroom crosses the midline and the bias is
    // real — then a wiring bug that dropped the shift (or passed the wrong
    // height) WOULD fail here. windowHeight is read from Dimensions inside
    // PlatformMap, so mock it before render.
    const spy = jest.spyOn(Dimensions, 'get').mockReturnValue({
      width: 390,
      height: 700,
      scale: 2,
      fontScale: 1,
    } as any);
    try {
      mockMap.current.pointForCoordinate.mockResolvedValue({ x: 40, y: 60 });
      mockMap.current.getMapBoundaries.mockResolvedValue({
        northEast: { latitude: 37.85, longitude: -122.35 },
        southWest: { latitude: 37.73, longitude: -122.47 },
      });
      renderMap({ chromeInsetTop: 300, flags: [FLAG] });
      await act(async () => {
        pressFlagMarker();
        await flush();
      });
      const [region] = mockMap.current.animateToRegion.mock.calls[0];
      // f = (300 + 220) / 700 = 0.743; the 44pt pin remains fully on-screen.
      const latSpan = 37.85 - 37.73;
      expect(region.latitude).toBeGreaterThan(FLAG.lat); // biased SOUTH of the pin
      expect(region.latitude).toBeCloseTo(FLAG.lat + ((520 / 700) - 0.5) * latSpan, 10);
    } finally {
      spy.mockRestore();
    }
  });

  it('an antimeridian / bad boundary span cannot corrupt the nudge (falls back to 0.005 deltas)', async () => {
    mockMap.current.pointForCoordinate.mockResolvedValue({ x: 40, y: 60 });
    // Viewport straddling the date line: NE lng < SW lng → negative span.
    mockMap.current.getMapBoundaries.mockResolvedValue({
      northEast: { latitude: 37.85, longitude: -179.9 },
      southWest: { latitude: 37.73, longitude: 179.8 },
    });
    renderMap({ chromeInsetTop: 300, flags: [FLAG] });
    await act(async () => {
      pressFlagMarker();
      await flush();
    });
    const [region] = mockMap.current.animateToRegion.mock.calls[0];
    // The negative longitude span is rejected — never handed to MapKit as a
    // delta — and the latitude span (still positive) is preserved.
    expect(region.longitudeDelta).toBe(0.005);
    expect(region.latitudeDelta).toBeCloseTo(37.85 - 37.73, 10);
  });

  it('a pin already clear of the band gets NO camera move', async () => {
    mockMap.current.pointForCoordinate.mockResolvedValue({ x: 40, y: 700 });
    mockMap.current.getMapBoundaries.mockResolvedValue({
      northEast: { latitude: 37.85, longitude: -122.35 },
      southWest: { latitude: 37.73, longitude: -122.47 },
    });
    renderMap({ chromeInsetTop: 300, flags: [FLAG] });
    await act(async () => {
      pressFlagMarker();
      await flush();
    });
    expect(mockMap.current.animateToRegion).not.toHaveBeenCalled();
  });

  it('no measured chrome → no nudge (the tap still opens the callout natively)', async () => {
    renderMap({ flags: [FLAG] });
    await act(async () => {
      pressFlagMarker();
      await flush();
    });
    expect(mockMap.current.pointForCoordinate).not.toHaveBeenCalled();
    expect(mockMap.current.animateToRegion).not.toHaveBeenCalled();
  });

  it('missing map APIs (older providers) → silent no-op, never a throw', async () => {
    mockMap.current.pointForCoordinate = undefined;
    renderMap({ chromeInsetTop: 300, flags: [FLAG] });
    await act(async () => {
      expect(() => pressFlagMarker()).not.toThrow();
      await flush();
    });
    expect(mockMap.current.animateToRegion).not.toHaveBeenCalled();
  });

  it('a rejecting map API is swallowed (a convenience nudge must never break the tap)', async () => {
    mockMap.current.pointForCoordinate.mockRejectedValue(new Error('no projection'));
    mockMap.current.getMapBoundaries.mockResolvedValue({
      northEast: { latitude: 37.85, longitude: -122.35 },
      southWest: { latitude: 37.73, longitude: -122.47 },
    });
    renderMap({ chromeInsetTop: 300, flags: [FLAG] });
    await act(async () => {
      pressFlagMarker();
      await flush();
    });
    expect(mockMap.current.animateToRegion).not.toHaveBeenCalled();
  });

  it('Reduce Motion: the nudge is an instant jump (duration 0)', async () => {
    mockMap.current.pointForCoordinate.mockResolvedValue({ x: 40, y: 60 });
    mockMap.current.getMapBoundaries.mockResolvedValue({
      northEast: { latitude: 37.85, longitude: -122.35 },
      southWest: { latitude: 37.73, longitude: -122.47 },
    });
    renderMap({ reducedMotion: true, chromeInsetTop: 300, flags: [FLAG] });
    await act(async () => {
      pressFlagMarker();
      await flush();
    });
    const [, duration] = mockMap.current.animateToRegion.mock.calls[0];
    expect(duration).toBe(0);
  });
});
