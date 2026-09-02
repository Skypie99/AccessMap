/**
 * The OpenFreeMap basemap must preserve the no-blank theme transition. The
 * incoming MapLibre layer mounts first; its predecessor retires only after the
 * new style loads, or after the bounded offline fallback.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- focused module mocks */
import React from 'react';
import { act, render } from '@testing-library/react-native';
import PlatformMap from '../PlatformMap.web';
import type { FlagRow } from '@/types/database';

jest.mock('leaflet/dist/leaflet.css', () => ({}), { virtual: true });
jest.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}), { virtual: true });

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })) } },
}));

jest.mock('leaflet', () => {
  const divIcon = jest.fn((opts: unknown) => ({ options: opts }));
  const point = (x: number, y: number) => ({ x, y });
  return { __esModule: true, default: { divIcon, point }, divIcon, point };
});

jest.mock('@maplibre/maplibre-gl-leaflet', () => {
  const instances: any[] = [];
  const sequence: string[] = [];
  const maplibreGL = jest.fn((options: any) => {
    const handlers: Record<string, ((...args: any[]) => void)[]> = {};
    const glMap = {
      once: (event: string, handler: (...args: any[]) => void) => {
        (handlers[event] ??= []).push(handler);
      },
      off: (event: string, handler: (...args: any[]) => void) => {
        handlers[event] = (handlers[event] ?? []).filter((candidate) => candidate !== handler);
      },
      fire: (event: string) => (handlers[event] ?? []).slice().forEach((handler) => handler()),
    };
    const label = options.style.includes('/dark') ? 'dark' : 'light';
    const layer = {
      options,
      label,
      addTo: () => {
        sequence.push(`add:${label}`);
        return layer;
      },
      remove: () => sequence.push(`remove:${label}`),
      getMaplibreMap: () => glMap,
    };
    instances.push(layer);
    return layer;
  });
  (global as any).__openFreeMap = { instances, sequence };
  return { __esModule: true, maplibreGL };
});

jest.mock('supercluster', () => ({
  __esModule: true,
  default: class FakeSupercluster {
    load() { return this; }
    getClusters() { return []; }
    getClusterExpansionZoom() { return 14; }
  },
}));

jest.mock('react-leaflet', () => {
  const ReactLocal = jest.requireActual('react');
  const attributionControl = { addAttribution: jest.fn(), removeAttribution: jest.fn() };
  const fakeMap = {
    flyTo: jest.fn(), setView: jest.fn(), setZoom: jest.fn(), getZoom: jest.fn(() => 12),
    getSize: jest.fn(() => ({ x: 390, y: 844 })),
    getBounds: jest.fn(() => ({ getWest: () => -122.45, getSouth: () => 37.75, getEast: () => -122.35, getNorth: () => 37.83 })),
    on: jest.fn(), off: jest.fn(), attributionControl,
  };
  (global as any).__leafletMap = fakeMap;
  return {
    __esModule: true,
    MapContainer: ReactLocal.forwardRef((props: any, ref: any) => {
      ReactLocal.useEffect(() => { if (typeof ref === 'function') ref(fakeMap); }, []);
      return ReactLocal.createElement(ReactLocal.Fragment, null, props.children);
    }),
    Marker: () => null, Popup: () => null, Rectangle: () => null,
    useMap: () => fakeMap, useMapEvents: () => fakeMap,
  };
});

jest.mock('@/theme/ThemeContext', () => {
  const state = { scheme: 'light' };
  (global as any).__scheme = state;
  const theme = new Proxy({}, { get: (_target, key) => (key === 'scheme' ? state.scheme : '#123456') });
  return { useColor: () => theme };
});

const state = (): any => (global as any).__openFreeMap;
const scheme = (): any => (global as any).__scheme;
const leafletMap = (): any => (global as any).__leafletMap;
const REGION = { latitude: 37.7, longitude: -122.2, latitudeDelta: 0.05, longitudeDelta: 0.05 };
const mapEl = () => <PlatformMap initialRegion={REGION} flags={[] as FlagRow[]} focusedFlagId={null} />;

beforeEach(() => {
  jest.useFakeTimers();
  scheme().scheme = 'light';
  state().instances.length = 0;
  state().sequence.length = 0;
  leafletMap().attributionControl.addAttribution.mockClear();
  leafletMap().attributionControl.removeAttribution.mockClear();
});
afterEach(() => {
  act(() => { jest.runOnlyPendingTimers(); });
  jest.useRealTimers();
});

describe('OpenFreeMap theme-flip continuity', () => {
  it('mounts Positron with Leaflet retaining interaction and attribution', () => {
    render(mapEl());
    const [light] = state().instances;
    expect(light.options).toMatchObject({
      style: 'https://tiles.openfreemap.org/styles/positron',
      interactive: false,
      attributionControl: false,
    });
    expect(leafletMap().attributionControl.addAttribution).toHaveBeenCalledWith(
      expect.stringContaining('OpenFreeMap'),
    );
  });

  it('adds Dark before removing Positron once the new style loads', () => {
    const { rerender } = render(mapEl());
    act(() => { scheme().scheme = 'dark'; rerender(mapEl()); });
    const [, dark] = state().instances;
    expect(dark.options.style).toBe('https://tiles.openfreemap.org/styles/dark');
    expect(state().sequence).toEqual(['add:light', 'add:dark']);
    act(() => { dark.getMaplibreMap().fire('load'); });
    expect(state().sequence).toEqual(['add:light', 'add:dark', 'remove:light']);
    expect(leafletMap().attributionControl.removeAttribution).toHaveBeenCalledWith(
      expect.stringContaining('OpenFreeMap'),
    );
  });

  it('retires the outgoing layer after two seconds when the incoming style is offline', () => {
    const { rerender } = render(mapEl());
    act(() => { scheme().scheme = 'dark'; rerender(mapEl()); });
    act(() => { jest.advanceTimersByTime(2000); });
    expect(state().sequence).toContain('remove:light');
  });

  it('chains rapid theme flips without removing a replacement before it loads', () => {
    const { rerender } = render(mapEl());
    act(() => { scheme().scheme = 'dark'; rerender(mapEl()); });
    act(() => { scheme().scheme = 'light'; rerender(mapEl()); });
    const [lightA, dark, lightB] = state().instances;
    act(() => { dark.getMaplibreMap().fire('load'); });
    act(() => { lightB.getMaplibreMap().fire('load'); });
    expect(state().sequence).toEqual([
      'add:light',
      'add:dark',
      'add:light',
      `remove:${lightA.label}`,
      `remove:${dark.label}`,
    ]);
  });

  it('removes the live MapLibre layer on unmount', () => {
    const { unmount } = render(mapEl());
    unmount();
    expect(state().sequence).toContain('remove:light');
  });
});
