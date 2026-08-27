/**
 * B5 (L4-05 / L4-02-native) — Reduce-Motion guard for the NATIVE map camera.
 *
 * PlatformMap.tsx's imperative handle jumps the camera instantly under Reduce
 * Motion (WCAG 2.3.3): animateToRegion(region, 0). This is the native analog
 * of the Leaflet falsy-zero trap
 * S12 fixed on web (PlatformMapWeb.reduceMotion.test.tsx) — but the native side
 * had NO automated guard. This file pins the RM branch for both states so a
 * regression that re-animates (or drops the gate) is caught in CI.
 *
 * ⚠️ NEEDS-SKY-DEVICE: whether react-native-maps treats a literal duration `0`
 * as a genuine instant jump or as falsy→its ~500ms default is device-only to
 * confirm. This test pins the VALUE the app passes (0); it does not — and
 * cannot in Jest — prove the native renderer honours 0 as instant. If the
 * device shows a default-length animation under RM, the un-trap fix is to pass
 * a non-falsy sentinel (e.g. `reducedMotion ? 1 : 600`), mirroring S12's spirit.
 *
 * `reducedMotion` reaches PlatformMap.tsx as a PROP (MapScreen calls
 * useReducedMotion() and passes it down), so we drive behaviour by prop and read
 * back the duration handed to the (mocked) underlying map instance.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- test-local mock factories
   stand in for external native-map library surfaces we don't want to model. */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import PlatformMap, { type PlatformMapHandle } from '../PlatformMap';
import type { FlagRow } from '@/types/database';
import { motion } from '@/theme';

// The underlying (fake) react-native-maps instance the imperative handle drives.
const mockMap: { current: any } = {
  current: {
    animateToRegion: jest.fn(),
  },
};

const mockMapProps: {
  current: {
    onTouchStart?: () => void;
    onRegionChangeComplete?: (region: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    }) => void;
  } | null;
} = { current: null };

jest.mock('react-native-map-clustering', () => ({
  __esModule: true,
  // Hand PlatformMap's `mapRef` callback the underlying map instance so the
  // animateTo / zoomBy handle can reach it (the real ClusteredMapView does this).
  default: (props: any) => {
    mockMapProps.current = props;
    props.mapRef?.(mockMap.current);
    return null;
  },
}));

jest.mock('react-native-maps', () => {
  const Passthrough = (props: any) => props.children ?? null;
  return {
    __esModule: true,
    default: Passthrough,
    Callout: Passthrough,
    Marker: Passthrough,
    Polygon: Passthrough,
    PROVIDER_DEFAULT: 'default',
  };
});

// flags.ts (imported by PlatformMap for labels) pulls supabase at module scope.
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

function renderMap(
  reducedMotion: boolean,
  callbacks: {
    onMapInteractionStart?: () => void;
    onRegionSettled?: (region: typeof REGION) => void;
  } = {},
): React.RefObject<PlatformMapHandle | null> {
  const ref = React.createRef<PlatformMapHandle>();
  render(
    <PlatformMap
      ref={ref}
      initialRegion={REGION}
      flags={[] as FlagRow[]}
      focusedFlagId={null}
      reducedMotion={reducedMotion}
      {...callbacks}
    />,
  );
  return ref;
}

describe('B5 — the native map camera is gated by reduce-motion', () => {
  beforeEach(() => {
    mockMap.current.animateToRegion.mockClear();
    mockMapProps.current = null;
  });

  it('animateTo jumps instantly (duration 0) under Reduce Motion', () => {
    const ref = renderMap(true);
    act(() => {
      ref.current?.animateTo({ latitude: 1, longitude: 2 });
    });
    expect(mockMap.current.animateToRegion).toHaveBeenCalledTimes(1);
    const [, duration] = mockMap.current.animateToRegion.mock.calls[0];
    expect(duration).toBe(0);
  });

  it('animateTo animates (duration 600) when Reduce Motion is off', () => {
    const ref = renderMap(false);
    act(() => {
      ref.current?.animateTo({ latitude: 1, longitude: 2 });
    });
    const [, duration] = mockMap.current.animateToRegion.mock.calls[0];
    expect(duration).toBe(600);
  });

  it('zoomBy uses duration 0 and region deltas under Reduce Motion', () => {
    const ref = renderMap(true);
    act(() => {
      ref.current?.zoomBy(1);
    });
    expect(mockMap.current.animateToRegion).toHaveBeenCalledTimes(1);
    const [region, duration] = mockMap.current.animateToRegion.mock.calls[0];
    expect(region).toEqual({ ...REGION, latitudeDelta: 0.025, longitudeDelta: 0.025 });
    expect(duration).toBe(0);
  });

  it('zoomBy uses motion.duration.base when Reduce Motion is off', () => {
    const ref = renderMap(false);
    act(() => {
      ref.current?.zoomBy(1);
    });
    const [, duration] = mockMap.current.animateToRegion.mock.calls[0];
    expect(duration).toBe(motion.duration.base);
  });

  it('compounds rapid +/- zoom taps from the optimistic settled-region ref', () => {
    const ref = renderMap(false);
    act(() => {
      ref.current?.zoomBy(1);
      ref.current?.zoomBy(1);
      ref.current?.zoomBy(-1);
    });
    expect(mockMap.current.animateToRegion.mock.calls.map(([region]: [typeof REGION]) => region)).toEqual([
      { ...REGION, latitudeDelta: 0.025, longitudeDelta: 0.025 },
      { ...REGION, latitudeDelta: 0.0125, longitudeDelta: 0.0125 },
      { ...REGION, latitudeDelta: 0.025, longitudeDelta: 0.025 },
    ]);
  });

  it('forwards direct-map touch and settles its region before the next zoom', () => {
    const onMapInteractionStart = jest.fn();
    const onRegionSettled = jest.fn();
    const ref = renderMap(false, { onMapInteractionStart, onRegionSettled });
    const settled = { latitude: 49.2827, longitude: -123.1207, latitudeDelta: 0.08, longitudeDelta: 0.16 };

    act(() => {
      mockMapProps.current?.onTouchStart?.();
      mockMapProps.current?.onRegionChangeComplete?.(settled);
      ref.current?.zoomBy(1);
    });

    expect(onMapInteractionStart).toHaveBeenCalledTimes(1);
    expect(onRegionSettled).toHaveBeenCalledWith(settled);
    expect(mockMap.current.animateToRegion).toHaveBeenLastCalledWith(
      { ...settled, latitudeDelta: 0.04, longitudeDelta: 0.08 },
      motion.duration.base,
    );
  });
});
