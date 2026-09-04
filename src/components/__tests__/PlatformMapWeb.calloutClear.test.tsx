/**
 * T1 (F2-01) — the web callout-occlusion guards.
 *
 * The Leaflet popup pane can never escape the zIndex-0 map container while the
 * app chrome rides the zIndex-10 sibling overlay, so a top-third callout used
 * to composite UNDER the pill/rail — the severity grammar silenced at the S3
 * trust doorway. BP1's fix, pinned here:
 *
 *   • every <Popup> carries autoPanPaddingTopLeft = [12, clamped inset], so
 *     Leaflet's autoPan glide clears the MEASURED chrome band, not just the
 *     container edge (non-RM path);
 *   • the inset is clamped to ≤45% of the live map height (clampChromeInset);
 *   • react-leaflet constructs each L.Popup once and never diffs options, so
 *     a re-measure (pill wrap, rotation) STAMPS the live popup instances'
 *     options — Leaflet reads them at open time (_adjustPan);
 *   • under Reduce Motion autoPan is suppressed (S12 — the glide is motion),
 *     and showCallout instead delivers the SAME clear position as an instant
 *     setView cut (animate: false), in the same frame as the open (F3-06).
 *
 * Same harness idiom as PlatformMapWeb.reduceMotion.test.tsx; this file's
 * react-leaflet mock additionally hands each <Marker> ref a fake L.Marker so
 * the imperative showCallout path is exercisable.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- test-local mock factories
   for react-leaflet / leaflet deliberately use `any`: they stand in for external
   library surfaces we don't want to model. */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import PlatformMap, { clampChromeInset, type PlatformMapHandle } from '../PlatformMap.web';
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

// leaflet — TileLayer as a real class (CachedTileLayer extends it at import),
// divIcon per icon, point for the RM-cut vector math.
jest.mock('leaflet', () => {
  class TileLayer {
    addTo() {
      return this;
    }
    remove() {
      return this;
    }
    on() {}
    off() {}
  }
  const divIcon = jest.fn((opts: unknown) => ({ options: opts }));
  const point = (x: number, y: number) => ({ x, y });
  return {
    __esModule: true,
    default: { TileLayer, divIcon, point },
    TileLayer,
    divIcon,
    point,
  };
});

// supercluster — one lone pin ('lonely') so exactly one real <Marker><Popup>
// renders and registers a marker ref.
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

// react-leaflet — everything inside the factory (jest.mock hoists above the
// module body). Exposed on global.__rlcc. The pin's container point is
// mutable (pinPoint) so tests can place it inside/clear of the chrome band.
jest.mock('react-leaflet', () => {
  const ReactLocal = jest.requireActual('react');
  const mkPt = (x: number, y: number) => ({
    x,
    y,
    add: (p: { x: number; y: number }) => mkPt(x + p.x, y + p.y),
  });
  const state: any = {
    pinPoint: mkPt(195, 120), // top-third by default (occluded)
    centerPoint: mkPt(195, 422),
    mapSize: { x: 390, y: 844 },
  };
  const fakeMap = {
    flyTo: jest.fn(),
    setView: jest.fn(),
    setZoom: jest.fn(),
    getZoom: jest.fn(() => 12),
    getCenter: jest.fn(() => ({ lat: 37.7, lng: -122.2 })),
    getSize: jest.fn(() => state.mapSize),
    // The SUT projects the PIN latlng and the CENTER latlng; route by lat.
    latLngToContainerPoint: jest.fn((ll: any) =>
      ll && ll.lat === 37.6 ? state.pinPoint : state.centerPoint,
    ),
    containerPointToLatLng: jest.fn((pt: any) => ({
      lat: 37.7 + (422 - pt.y) / 10000,
      lng: -122.2,
    })),
    getBounds: jest.fn(() => ({
      getWest: () => -122.45,
      getSouth: () => 37.75,
      getEast: () => -122.35,
      getNorth: () => 37.83,
    })),
    getContainer: jest.fn(() => ({ getBoundingClientRect: () => ({ top: 0 }) })),
    on: jest.fn(),
    off: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
  };
  const recorded: any = { mapContainer: null, popups: [], markers: [] };

  (global as any).__rlcc = { fakeMap, recorded, state };

  return {
    __esModule: true,
    MapContainer: ReactLocal.forwardRef((props: any, ref: any) => {
      const { children, ...rest } = props;
      recorded.mapContainer = rest;
      ReactLocal.useEffect(() => {
        if (typeof ref === 'function') ref(fakeMap);
        else if (ref) ref.current = fakeMap;
      }, []);
      return ReactLocal.createElement(ReactLocal.Fragment, null, children);
    }),
    // Hand the SUT's callback ref a fake L.Marker whose bound popup exposes a
    // STABLE options object — the stamping effect mutates exactly that.
    // forwardRef, same reason as MapContainer above.
    Marker: ReactLocal.forwardRef((props: any, ref: any) => {
      const { children, eventHandlers, ...rest } = props;
      const instRef = ReactLocal.useRef(null);
      if (!instRef.current) {
        const popup = { options: {} as any, getElement: () => undefined };
        instRef.current = {
          openPopup: jest.fn(),
          getLatLng: () => ({ lat: 37.6, lng: -122.1 }),
          getPopup: () => popup,
        };
      }
      recorded.markers.push({ props: rest, eventHandlers, instance: instRef.current });
      ReactLocal.useEffect(() => {
        if (typeof ref === 'function') ref(instRef.current);
        else if (ref) ref.current = instRef.current;
      }, []);
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

const rl = (): any => (global as any).__rlcc;

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

function renderMap(opts: { reducedMotion?: boolean; chromeInsetTop?: number }) {
  const ref = React.createRef<PlatformMapHandle>();
  const utils = render(
    <PlatformMap
      ref={ref}
      initialRegion={{
        latitude: 37.7,
        longitude: -122.2,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      flags={FLAGS}
      focusedFlagId={null}
      reducedMotion={opts.reducedMotion}
      chromeInsetTop={opts.chromeInsetTop}
    />,
  );
  return { ref, utils };
}

beforeEach(() => {
  const { fakeMap, recorded, state } = rl();
  for (const fn of Object.values(fakeMap)) {
    if (jest.isMockFunction(fn)) (fn as jest.Mock).mockClear();
  }
  recorded.mapContainer = null;
  recorded.popups.length = 0;
  recorded.markers.length = 0;
  state.pinPoint = { x: 195, y: 120, add: (p: any) => ({ x: 195 + p.x, y: 120 + p.y }) };
  // The RM cut defers one frame (react-leaflet portals popup content AFTER
  // popupopen) — run it synchronously so the guards stay timer-free.
  jest
    .spyOn(globalThis, 'requestAnimationFrame')
    .mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0 as unknown as number;
    });
});

afterEach(() => {
  (globalThis.requestAnimationFrame as unknown as jest.Mock).mockRestore?.();
});

describe('clampChromeInset — the ≤45% law', () => {
  it('passes a sane inset through untouched', () => {
    expect(clampChromeInset(300, 844)).toBe(300);
  });
  it('clamps a runaway measurement to 45% of the map height', () => {
    expect(clampChromeInset(800, 844)).toBe(Math.round(844 * 0.45)); // 380
  });
  it('degrades safely on zero/absent inputs', () => {
    expect(clampChromeInset(0, 844)).toBe(0);
    expect(clampChromeInset(-5, 844)).toBe(0);
    expect(clampChromeInset(300, 0)).toBe(300); // no height known → trust caller
  });
});

describe('T1 — the Popup carries the measured chrome inset (guard a)', () => {
  it('autoPanPaddingTopLeft = [12, inset] rides every popup at bind time', () => {
    renderMap({ chromeInsetTop: 300 });
    const popups = rl().recorded.popups;
    expect(popups.length).toBeGreaterThan(0);
    expect(popups[0].autoPanPaddingTopLeft).toEqual([12, 300]);
  });

  it('the bind-time value is already clamped to 45% of the map height', () => {
    renderMap({ chromeInsetTop: 800 });
    expect(rl().recorded.popups[0].autoPanPaddingTopLeft).toEqual([12, 380]);
  });

  it('no chromeInsetTop → Leaflet keeps its own defaults (undefined, not [12, 0])', () => {
    renderMap({});
    expect(rl().recorded.popups[0].autoPanPaddingTopLeft).toBeUndefined();
  });

  it('autoPan itself stays RM-gated (S12 — unchanged by T1)', () => {
    renderMap({ reducedMotion: true, chromeInsetTop: 300 });
    expect(rl().recorded.popups[0].autoPan).toBe(false);
  });

  it('uses the explicit opaque reading-card class instead of Leaflet defaults', () => {
    renderMap({ chromeInsetTop: 300 });
    expect(rl().recorded.popups[0].className).toBe('am-map-callout');
  });
});

describe('T1 — re-measure stamps the LIVE popup instances (react-leaflet never diffs)', () => {
  it('a chromeInsetTop change lands on already-bound popups’ options', () => {
    const { utils } = renderMap({ chromeInsetTop: 300 });
    const marker = rl().recorded.markers.find((m: any) => m.instance)?.instance;
    expect(marker).toBeTruthy();
    act(() => {
      utils.rerender(
        <PlatformMap
          initialRegion={{
            latitude: 37.7,
            longitude: -122.2,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          flags={FLAGS}
          focusedFlagId={null}
          chromeInsetTop={340}
        />,
      );
    });
    expect(marker.getPopup().options.autoPanPaddingTopLeft).toEqual([12, 340]);
  });
});

describe('T1 — the Reduce-Motion instant cut rides popupopen (guards b + f)', () => {
  // The cut listens at the MAP level so it covers EVERY open path — a direct
  // pin click (Leaflet's own bound-popup handler) as much as the imperative
  // showCallout flows. popupopen fires synchronously inside openPopup, so the
  // imperative path still pays off in the same frame (F3-06). This shape
  // exists because BP1's evidence probe caught the imperative-only branch
  // leaving a real direct tap occluded under RM.
  const popupOpenHandler = (): ((e: any) => void) | undefined =>
    rl()
      .fakeMap.on.mock.calls.filter((c: any[]) => c[0] === 'popupopen')
      .at(-1)?.[1];

  const fakePopup = (overrides: any = {}) => ({
    getLatLng: () => ({ lat: 37.6, lng: -122.1 }),
    getElement: () => undefined,
    ...overrides,
  });

  it('under RM the popupopen listener is bound; without RM it is not', () => {
    renderMap({ reducedMotion: true, chromeInsetTop: 300 });
    expect(popupOpenHandler()).toBeDefined();
    rl().fakeMap.on.mockClear();
    renderMap({ reducedMotion: false, chromeInsetTop: 300 });
    expect(popupOpenHandler()).toBeUndefined();
  });

  it('an occluded popup open cuts the camera — setView, animate:false, zoom preserved', () => {
    renderMap({ reducedMotion: true, chromeInsetTop: 300 });
    const { fakeMap } = rl();
    act(() => {
      popupOpenHandler()?.({ popup: fakePopup() }); // any open path — incl. a direct tap
    });
    expect(fakeMap.setView).toHaveBeenCalledTimes(1);
    const [, zoom, opts] = fakeMap.setView.mock.calls[0];
    expect(zoom).toBe(12); // zoom preserved — a cut, not a re-zoom
    expect(opts).toEqual({ animate: false });
    expect(opts).not.toHaveProperty('duration'); // the falsy-zero trap stays dead
  });

  it('the cut moves the camera UP by the popup’s chrome deficit (fallback geometry)', () => {
    renderMap({ reducedMotion: true, chromeInsetTop: 300 });
    const { fakeMap } = rl();
    act(() => {
      popupOpenHandler()?.({ popup: fakePopup() }); // getElement → undefined → modeled box
    });
    // pin y=120, fallback popup height 220, tip allowance 40 → popup top =
    // 120 − 260 = −140; deficit vs inset 300 = 440 → new center point y =
    // 422 − 440 = −18 → the mock projects that back to lat 37.7 + 440/10000.
    const [center] = fakeMap.setView.mock.calls[0];
    expect(center.lat).toBeCloseTo(37.744, 3);
  });

  it('with a real DOM box the cut uses the popup’s RENDERED rect (no anchor modeling)', () => {
    renderMap({ reducedMotion: true, chromeInsetTop: 300 });
    const { fakeMap } = rl();
    act(() => {
      popupOpenHandler()?.({
        popup: fakePopup({
          getElement: () => ({ getBoundingClientRect: () => ({ top: -140 }) }),
        }),
      });
    });
    // rect top −140 vs inset 300 → same 440 deficit as the modeled case.
    const [center] = fakeMap.setView.mock.calls[0];
    expect(center.lat).toBeCloseTo(37.744, 3);
  });

  it('a stale early-bind closure cannot under-cut: the inset is read through a ref at fire time', () => {
    const { utils } = renderMap({ reducedMotion: true, chromeInsetTop: 56 });
    const handler = popupOpenHandler(); // bound while the chrome measured tiny
    const { fakeMap } = rl();
    act(() => {
      utils.rerender(
        <PlatformMap
          initialRegion={{
            latitude: 37.7,
            longitude: -122.2,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          flags={FLAGS}
          focusedFlagId={null}
          reducedMotion
          chromeInsetTop={300} // the rows finished measuring
        />,
      );
    });
    act(() => {
      handler?.({ popup: fakePopup() }); // fire the ORIGINAL handler
    });
    // Cut computed against 300, not the stale 56 → same 440-deficit center.
    const [center] = fakeMap.setView.mock.calls.at(-1)!;
    expect(center.lat).toBeCloseTo(37.744, 3);
  });

  it('showCallout still opens the popup (the listener owns the cut, same frame)', () => {
    const { ref } = renderMap({ reducedMotion: true, chromeInsetTop: 300 });
    act(() => {
      ref.current?.showCallout('lonely'); // synchronous — no timers advanced
    });
    const marker = rl().recorded.markers.find((m: any) => m.instance)?.instance;
    expect(marker.openPopup).toHaveBeenCalledTimes(1);
  });

  it('a pin already clear of the chrome gets NO cut (opens in place)', () => {
    renderMap({ reducedMotion: true, chromeInsetTop: 300 });
    const { fakeMap, state } = rl();
    state.pinPoint = { x: 195, y: 700, add: (p: any) => ({ x: 195 + p.x, y: 700 + p.y }) };
    act(() => {
      popupOpenHandler()?.({ popup: fakePopup() });
    });
    expect(fakeMap.setView).not.toHaveBeenCalled();
  });

  it('no chrome inset → no cut, even under RM (e.g. the Home peek)', () => {
    renderMap({ reducedMotion: true });
    const { fakeMap } = rl();
    act(() => {
      popupOpenHandler()?.({ popup: fakePopup() });
    });
    expect(fakeMap.setView).not.toHaveBeenCalled();
  });
});

describe('T1 — web animateTo keeps exact targeting (calloutClear is native-only)', () => {
  it('flyTo receives the EXACT coordinates with or without the opt', () => {
    const { ref } = renderMap({ chromeInsetTop: 300 });
    const { fakeMap } = rl();
    act(() => {
      ref.current?.animateTo({ latitude: 1, longitude: 2 }, { calloutClear: true });
      ref.current?.animateTo({ latitude: 1, longitude: 2 });
    });
    expect(fakeMap.flyTo.mock.calls[0][0]).toEqual([1, 2]);
    expect(fakeMap.flyTo.mock.calls[1][0]).toEqual([1, 2]);
  });
});
