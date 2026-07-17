/**
 * T1 (F3-05) — the theme-flip tile-continuity guards (jest half; the browser
 * half is BP1's capture t-series).
 *
 * The map was the only surface that visibly REBUILT instead of transforming
 * during the theme moment: CachedTileLayerWrapper's effect cleanup removed the
 * outgoing tile layer BEFORE the next effect created its replacement (React
 * runs cleanups first), so the pane sat empty while the incoming family
 * fetched. BP1's swap mechanics, pinned here:
 *
 *   • the incoming layer is ADDED before the outgoing one is removed;
 *   • the outgoing layer retires on the incoming layer's 'load' event, with a
 *     hard 2s idempotent fallback (offline must never leak a layer);
 *   • dispose() still fires IMMEDIATELY on the outgoing layer (F31 — stop
 *     in-flight cache writes the moment it is superseded);
 *   • a true unmount tears down whichever layer is still live.
 *
 * Swap MECHANICS only — the tile family (CARTO light/dark) is Sky's open
 * eye-candidate and is asserted unchanged, not re-chosen.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- test-local mock factories
   for react-leaflet / leaflet deliberately use `any`: they stand in for external
   library surfaces we don't want to model. */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import PlatformMap from '../PlatformMap.web';
import type { FlagRow } from '@/types/database';

jest.mock('leaflet/dist/leaflet.css', () => ({}), { virtual: true });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

// leaflet — TileLayer records construction order, add/remove sequence, and
// 'load' handlers so the tests can drive the retirement handshake by hand.
// CachedTileLayer extends this class and overrides dispose() by setting its
// own private _disposed flag (readable from JS), so dispose is asserted via
// that flag, not the base class.
jest.mock('leaflet', () => {
  const instances: any[] = [];
  const sequence: string[] = [];
  class TileLayer {
    url: string;
    handlers: Record<string, any[]> = {};
    constructor(url: string) {
      this.url = url;
      instances.push(this);
    }
    label() {
      return this.url.includes('dark_all') ? 'dark' : 'light';
    }
    addTo() {
      sequence.push(`add:${this.label()}`);
      return this;
    }
    remove() {
      sequence.push(`remove:${this.label()}`);
      return this;
    }
    on(ev: string, fn: any) {
      (this.handlers[ev] ??= []).push(fn);
    }
    off(ev: string, fn: any) {
      this.handlers[ev] = (this.handlers[ev] ?? []).filter((f) => f !== fn);
    }
    fire(ev: string) {
      (this.handlers[ev] ?? []).slice().forEach((f) => f());
    }
  }
  const divIcon = jest.fn((opts: unknown) => ({ options: opts }));
  const point = (x: number, y: number) => ({ x, y });
  (global as any).__tiles = { instances, sequence };
  return {
    __esModule: true,
    default: { TileLayer, divIcon, point },
    TileLayer,
    divIcon,
    point,
  };
});

// supercluster — empty viewport: this file is about tiles, not markers.
jest.mock('supercluster', () => ({
  __esModule: true,
  default: class FakeSupercluster {
    load() {
      return this;
    }
    getClusters() {
      return [];
    }
    getClusterExpansionZoom() {
      return 14;
    }
  },
}));

jest.mock('react-leaflet', () => {
  const ReactLocal = jest.requireActual('react');
  const fakeMap = {
    flyTo: jest.fn(),
    setView: jest.fn(),
    setZoom: jest.fn(),
    getZoom: jest.fn(() => 12),
    getSize: jest.fn(() => ({ x: 390, y: 844 })),
    getBounds: jest.fn(() => ({
      getWest: () => -122.45,
      getSouth: () => 37.75,
      getEast: () => -122.35,
      getNorth: () => 37.83,
    })),
    on: jest.fn(),
    off: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
  };
  return {
    __esModule: true,
    MapContainer: ReactLocal.forwardRef((props: any, ref: any) => {
      const { children } = props;
      ReactLocal.useEffect(() => {
        if (typeof ref === 'function') ref(fakeMap);
        else if (ref) ref.current = fakeMap;
      }, []);
      return ReactLocal.createElement(ReactLocal.Fragment, null, children);
    }),
    Marker: () => null,
    Popup: () => null,
    Rectangle: () => null,
    useMap: () => fakeMap,
    useMapEvents: () => fakeMap,
  };
});

// The theme hook — scheme is mutable so a test can flip light↔dark and
// rerender. Every other color token resolves to a stable hex via Proxy.
jest.mock('@/theme/ThemeContext', () => {
  const state = { scheme: 'light' };
  (global as any).__scheme = state;
  const theme = new Proxy(
    {},
    {
      get: (_t, key) => (key === 'scheme' ? state.scheme : '#123456'),
    },
  );
  return { useColor: () => theme };
});

// ---------------------------------------------------------------------------

const tiles = (): any => (global as any).__tiles;
const schemeState = (): any => (global as any).__scheme;

const REGION = {
  latitude: 37.7,
  longitude: -122.2,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

function mapEl() {
  return (
    <PlatformMap
      initialRegion={REGION}
      flags={[] as FlagRow[]}
      focusedFlagId={null}
    />
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  schemeState().scheme = 'light';
  tiles().instances.length = 0;
  tiles().sequence.length = 0;
});
afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe('T1 — theme-flip tile continuity (F3-05, swap mechanics only)', () => {
  it('mounts exactly one layer, per the scheme’s CARTO family (family unchanged)', () => {
    render(mapEl());
    expect(tiles().sequence).toEqual(['add:light']);
    expect(tiles().instances[0].url).toContain('light_all'); // Positron — Sky’s standing pick
  });

  it('on flip, the incoming layer is ADDED while the outgoing one is still on the map', () => {
    const { rerender } = render(mapEl());
    act(() => {
      schemeState().scheme = 'dark';
      rerender(mapEl());
    });
    // add:dark happened; remove:light has NOT — the floor never blanks.
    expect(tiles().sequence).toEqual(['add:light', 'add:dark']);
    expect(tiles().instances[1].url).toContain('dark_all');
  });

  it('the outgoing layer retires when the incoming one fires load — and its dispose ran immediately (F31)', () => {
    const { rerender } = render(mapEl());
    act(() => {
      schemeState().scheme = 'dark';
      rerender(mapEl());
    });
    const [light, dark] = tiles().instances;
    expect(light._disposed).toBe(true); // cache writes stopped at supersede time
    expect(tiles().sequence).not.toContain('remove:light');
    act(() => {
      dark.fire('load');
    });
    expect(tiles().sequence).toEqual(['add:light', 'add:dark', 'remove:light']);
    // Retirement is once-only: a second load (Leaflet refires on pan) is a no-op.
    act(() => {
      dark.fire('load');
    });
    expect(tiles().sequence.filter((s: string) => s === 'remove:light')).toHaveLength(1);
  });

  it('offline fallback: if the incoming layer never loads, the outgoing one still retires at 2s', () => {
    const { rerender } = render(mapEl());
    act(() => {
      schemeState().scheme = 'dark';
      rerender(mapEl());
    });
    expect(tiles().sequence).not.toContain('remove:light');
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(tiles().sequence).toContain('remove:light');
    // And the load handler was detached — a late 'load' cannot double-remove.
    act(() => {
      tiles().instances[1].fire('load');
    });
    expect(tiles().sequence.filter((s: string) => s === 'remove:light')).toHaveLength(1);
  });

  it('a rapid double flip chains: each incoming layer retires exactly its predecessor', () => {
    const { rerender } = render(mapEl());
    act(() => {
      schemeState().scheme = 'dark';
      rerender(mapEl());
    });
    act(() => {
      schemeState().scheme = 'light';
      rerender(mapEl());
    });
    const [lightA, dark, lightB] = tiles().instances;
    expect(tiles().sequence).toEqual(['add:light', 'add:dark', 'add:light']);
    act(() => {
      dark.fire('load'); // dark painted → lightA retires
      lightB.fire('load'); // lightB painted → dark retires
    });
    expect(tiles().sequence.slice(3)).toEqual(['remove:light', 'remove:dark']);
    expect(lightA._disposed).toBe(true);
    expect(dark._disposed).toBe(true);
    expect(lightB._disposed).toBeFalsy();
  });

  it('true unmount disposes + removes the still-live layer', () => {
    const { unmount } = render(mapEl());
    const [light] = tiles().instances;
    unmount();
    expect(light._disposed).toBe(true);
    expect(tiles().sequence).toContain('remove:light');
  });
});
