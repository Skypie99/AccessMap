/**
 * S12 — Reduce-Motion guard test for the WEB map camera (PlatformMap.web.tsx).
 *
 * WHY THIS FILE EXISTS: the falsy-zero trap shipped precisely because nothing
 * asserted the camera's reduce-motion behavior. Under Reduce Motion the web map
 * used to pass `flyTo(…, { duration: 0 })`; Leaflet treats `0` as falsy and
 * falls back to its multi-second distance flight — the LARGEST motion in the app
 * handed to the users who asked for less (WCAG 2.3.3 failure). The fix routes
 * every camera path to the NON-ANIMATED form (`{ animate: false }`) under RM,
 * never a numeric-zero duration. This test locks that in for EVERY path.
 *
 * `reducedMotion` reaches PlatformMap.web.tsx as a PROP (MapScreen calls
 * useReducedMotion() and passes it down), so we drive behavior by passing the
 * prop — no need to mock @/lib/accessibility here.
 *
 * MOCKING NOTES:
 *  - react-leaflet is pure ESM → fully replaced by a jest.mock. A SINGLE shared
 *    fake Leaflet map is handed to BOTH the MapContainer ref and useMap(), so the
 *    main flyTo and the cluster flyTo land on the same spy.
 *  - leaflet: only the runtime surface the SUT touches — L.TileLayer (extended at
 *    module scope by CachedTileLayer) and L.divIcon (render-time icons).
 *  - supercluster: mocked to always yield ONE cluster + ONE lone pin. The
 *    clustering ALGORITHM is irrelevant to S12 — we only need the real
 *    ClusteredMarkers click handler (the edited code) to fire with a real
 *    `reducedMotion`. (supercluster's package.json is `"type":"module"`, so its
 *    dist is not cleanly requireable under jest anyway — a stub is both necessary
 *    and sufficient, and keeps the change test-file-local.)
 *  - @/lib/supabase is mocked because flags.ts / auth.tsx import it at module
 *    scope (same precedent as HeatmapLayer.test.tsx).
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- test-local mock factories
   for react-leaflet / leaflet deliberately use `any`: they stand in for external
   library surfaces we don't want to model, and inline TS function-types trip
   babel-plugin-jest-hoist inside jest.mock factories. */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import PlatformMap, { type PlatformMapHandle } from '../PlatformMap.web';
import type { FlagRow } from '@/types/database';

// Neutralize the SUT's side-effect CSS import (line 1). Virtual: the module has
// no JS to load and jest has no .css transformer configured.
jest.mock('leaflet/dist/leaflet.css', () => ({}), { virtual: true });

// flags.ts + auth.tsx import supabase at module scope.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

// leaflet — TileLayer must be a real class (CachedTileLayer extends it at import),
// divIcon is called for every icon at render.
jest.mock('leaflet', () => {
  // A no-op stand-in for L.TileLayer. CachedTileLayer `extends` this at module
  // scope and calls super(url, opts); the base ignores both. No constructor
  // needed — the implicit one accepts (and drops) the super() args.
  class TileLayer {
    addTo() {
      return this;
    }
    remove() {
      return this;
    }
    dispose() {}
  }
  const divIcon = jest.fn((opts: unknown) => ({ options: opts }));
  return { __esModule: true, default: { TileLayer, divIcon }, TileLayer, divIcon };
});

// supercluster — always one cluster (2 pts) + one lone pin ('lonely'). The lone
// pin renders a <Marker><Popup> so we can record the popup's autoPan.
jest.mock('supercluster', () => {
  return {
    __esModule: true,
    default: class FakeSupercluster {
      load() {
        return this;
      }
      getClusters() {
        return [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-122.4002, 37.7902] },
            properties: { cluster: true, cluster_id: 1, point_count: 2 },
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-122.1, 37.6] },
            properties: { flagId: 'lonely' },
          },
        ];
      }
      getClusterExpansionZoom() {
        return 14;
      }
    },
  };
});

// react-leaflet — everything defined INSIDE the factory (jest hoists jest.mock
// above the module body, so referencing outer consts would hit the TDZ). The
// shared fake map + recorded props are exposed on `global.__rl` for the tests.
jest.mock('react-leaflet', () => {
  const ReactLocal = jest.requireActual('react');
  const flyTo = jest.fn();
  const fakeMap = {
    flyTo,
    setView: jest.fn(),
    setZoom: jest.fn(),
    getZoom: jest.fn(() => 12),
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
  const recorded: any = { mapContainer: null, popups: [], markers: [] };

  (global as any).__rl = { flyTo, fakeMap, recorded };

  return {
    __esModule: true,
    // forwardRef: MapContainer forwards a ref to the Leaflet map (the SUT passes a
    // callback ref, setMapRef). React strips `ref` from function-component props,
    // so we MUST use forwardRef to receive it.
    MapContainer: ReactLocal.forwardRef((props: any, ref: any) => {
      const { children, ...rest } = props;
      recorded.mapContainer = rest;
      ReactLocal.useEffect(() => {
        if (typeof ref === 'function') ref(fakeMap);
        else if (ref) ref.current = fakeMap;
      }, []);
      return ReactLocal.createElement(ReactLocal.Fragment, null, children);
    }),
    Marker: ReactLocal.forwardRef((props: any, _ref: any) => {
      const { children, eventHandlers, ...rest } = props;
      recorded.markers.push({ props: rest, eventHandlers });
      return ReactLocal.createElement(ReactLocal.Fragment, null, children);
    }),
    Popup: (props: any) => {
      const { children, ...rest } = props;
      recorded.popups.push(rest);
      return ReactLocal.createElement(ReactLocal.Fragment, null, children);
    },
    Rectangle: () => null,
    useMap: () => fakeMap,
    useMapEvents: () => fakeMap,
  };
});

// ---------------------------------------------------------------------------

const rl = (): any => (global as any).__rl;

const FLAGS: FlagRow[] = [
  {
    id: 'lonely',
    lat: 37.6,
    lng: -122.1,
    category: 'no_ramp',
    severity: 3,
    description: 'A curb with no ramp.',
    photo_url: null,
    status: 'open',
    user_id: 'user-1',
    created_at: '2026-07-05T00:00:00Z',
  } as FlagRow,
];

const REGION = {
  latitude: 37.79,
  longitude: -122.4,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

function renderMap(reducedMotion: boolean) {
  const r = rl();
  r.recorded.mapContainer = null;
  r.recorded.popups.length = 0;
  r.recorded.markers.length = 0;
  r.flyTo.mockClear();
  const ref = React.createRef<PlatformMapHandle>();
  render(
    <PlatformMap
      ref={ref}
      initialRegion={REGION}
      flags={FLAGS}
      focusedFlagId={null}
      reducedMotion={reducedMotion}
      onOpenDetails={() => {}}
    />,
  );
  return ref;
}

// The camera option object the SUT should produce for a given RM state.
const expectedFlyOpts = (reducedMotion: boolean, nonRmDuration: number) =>
  reducedMotion ? { animate: false } : { duration: nonRmDuration };

describe.each([[true], [false]])(
  'S12 — web map reduce-motion camera (reducedMotion=%s)',
  (reducedMotion: boolean) => {
    it('main camera flyTo resolves to the non-animated form under RM / preserves the 0.6s flight otherwise', () => {
      const ref = renderMap(reducedMotion);
      const { flyTo } = rl();
      flyTo.mockClear();

      act(() => {
        ref.current!.animateTo({ latitude: 37.79, longitude: -122.4, latitudeDelta: 0.005 });
      });

      expect(flyTo).toHaveBeenCalledTimes(1);
      const opts = flyTo.mock.calls.at(-1)![2];
      expect(opts).toEqual(expectedFlyOpts(reducedMotion, 0.6));
      // The un-trap-able form: never a numeric-zero duration under RM.
      if (reducedMotion) {
        expect(opts).not.toHaveProperty('duration');
        expect(opts).toEqual({ animate: false });
      }
      expect(opts).not.toEqual({ duration: 0 });
    });

    it('cluster-expansion flyTo resolves to the non-animated form under RM / preserves the 0.4s flight otherwise', () => {
      renderMap(reducedMotion);
      const { flyTo, recorded } = rl();

      const cluster = recorded.markers.find(
        (m) => typeof m.props.title === 'string' && (m.props.title as string).includes('tap to expand'),
      );
      // Proves a real cluster marker rendered and carries a click handler.
      expect(cluster).toBeTruthy();
      expect(typeof cluster!.eventHandlers?.click).toBe('function');

      flyTo.mockClear();
      act(() => {
        cluster!.eventHandlers!.click();
      });

      expect(flyTo).toHaveBeenCalledTimes(1);
      const opts = flyTo.mock.calls.at(-1)![2];
      expect(opts).toEqual(expectedFlyOpts(reducedMotion, 0.4));
      if (reducedMotion) {
        expect(opts).not.toHaveProperty('duration');
        expect(opts).toEqual({ animate: false });
      }
      expect(opts).not.toEqual({ duration: 0 });
    });

    it('MapContainer disables zoom/fade animations under RM (and keeps them otherwise)', () => {
      renderMap(reducedMotion);
      const mc = rl().recorded.mapContainer;
      expect(mc).toBeTruthy();
      expect(mc!.zoomAnimation).toBe(!reducedMotion);
      expect(mc!.fadeAnimation).toBe(!reducedMotion);
    });

    it('Popup autoPan is suppressed under RM (and enabled otherwise)', () => {
      renderMap(reducedMotion);
      const popup = rl().recorded.popups[0];
      // The lone pin renders exactly one <Popup>.
      expect(popup).toBeTruthy();
      expect(popup.autoPan).toBe(!reducedMotion);
    });

    it('regression sweep: no camera path ever passes duration: 0', () => {
      const ref = renderMap(reducedMotion);
      const { flyTo, recorded } = rl();

      // Exercise both camera triggers, then inspect EVERY flyTo call.
      act(() => {
        ref.current!.animateTo({ latitude: 37.79, longitude: -122.4, latitudeDelta: 0.005 });
      });
      const cluster = recorded.markers.find(
        (m) => typeof m.props.title === 'string' && (m.props.title as string).includes('tap to expand'),
      );
      act(() => {
        cluster!.eventHandlers!.click();
      });

      expect(flyTo.mock.calls.length).toBeGreaterThanOrEqual(2);
      for (const call of flyTo.mock.calls) {
        const o = (call[2] ?? {}) as Record<string, unknown>;
        expect(o).not.toEqual({ duration: 0 });
        if (reducedMotion) expect(o).not.toHaveProperty('duration');
      }
    });
  },
);
