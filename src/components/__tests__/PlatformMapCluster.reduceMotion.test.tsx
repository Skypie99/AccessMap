/**
 * B7-B — Reduce-Motion guard test for the NATIVE marker-cluster spring.
 *
 * WHY THIS FILE EXISTS: react-native-map-clustering fires a global
 * `LayoutAnimation.spring` on every pan-settle, guarded ONLY by
 * `animationEnabled && Platform.OS === 'ios'` — with no reduce-motion check
 * (that is how L4-03 shipped). PlatformMap now passes
 * `animationEnabled={!reducedMotion}`, so under Reduce Motion the library
 * short-circuits that one call. Nothing else asserted this, so this test locks
 * the prop in for both RM states.
 *
 * `reducedMotion` reaches PlatformMap.tsx as a PROP (MapScreen calls
 * useReducedMotion() and passes it down), so we drive behaviour by passing the
 * prop and read back the value handed to the (mocked) clustering component.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- test-local mock factories
   stand in for external native-map library surfaces we don't want to model. */
import React from 'react';
import { render } from '@testing-library/react-native';
import PlatformMap from '../PlatformMap';
import type { FlagRow } from '@/types/database';

// Capture the props the clustering component is rendered with (mock-prefixed so
// babel-plugin-jest-hoist allows the reference inside the factory).
const mockClusterProps: { current: any } = { current: {} };

jest.mock('react-native-map-clustering', () => ({
  __esModule: true,
  // Capture the props, render nothing (we only assert on animationEnabled).
  default: (props: any) => {
    mockClusterProps.current = props;
    return null;
  },
}));

jest.mock('react-native-maps', () => {
  // Function components returning their children (or null) — valid React with
  // no need to require('react') inside the hoisted factory.
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

describe('B7-B — the iOS cluster spring is gated by reduce-motion', () => {
  it('passes animationEnabled={false} to the clustering map when RM is on', () => {
    render(
      <PlatformMap
        initialRegion={REGION}
        flags={[] as FlagRow[]}
        focusedFlagId={null}
        reducedMotion
      />,
    );
    expect(mockClusterProps.current.animationEnabled).toBe(false);
  });

  it('leaves animationEnabled={true} (the library spring) when RM is off', () => {
    render(
      <PlatformMap
        initialRegion={REGION}
        flags={[] as FlagRow[]}
        focusedFlagId={null}
        reducedMotion={false}
      />,
    );
    expect(mockClusterProps.current.animationEnabled).toBe(true);
  });
});
