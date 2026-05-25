import 'leaflet/dist/leaflet.css';
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L, { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import { CATEGORY_LABELS, severityColor } from '@/lib/flags';
import type { FlagRow } from '@/types/database';

export interface PlatformMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface PlatformMapHandle {
  animateTo: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  }) => void;
  showCallout: (flagId: string) => void;
}

export interface PlatformMapProps {
  initialRegion: PlatformMapRegion;
  flags: FlagRow[];
  focusedFlagId: string | null;
  showsUserLocation?: boolean;
  /**
   * Drop-flag intent: native fires this on long-press; web fires it on
   * the map's `contextmenu` event (right-click, or long-press on
   * touchscreens which the browser surfaces as contextmenu). Coordinate
   * is the geographic point under the press.
   */
  onLongPressMap?: (coord: { lat: number; lng: number }) => void;
}

// Cache pin icons by (color + dim). There are only 6 possible combinations
// (5 severity colors + the gray fallback × 2 dim states), so this dictionary
// caps at ~12 entries for the life of the page. Without the cache every
// render builds a brand-new L.DivIcon for every flag, and Leaflet treats a
// new icon as a marker change → unnecessary re-renders at hundreds of pins.
const pinIconCache = new Map<string, L.DivIcon>();
function pinIcon(color: string, dim: boolean): L.DivIcon {
  const key = `${color}|${dim ? 1 : 0}`;
  const cached = pinIconCache.get(key);
  if (cached) return cached;
  const icon = L.divIcon({
    className: 'accessmap-pin',
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:${color};
      border:2px solid white;
      box-shadow:0 1px 4px rgba(0,0,0,0.4);
      opacity:${dim ? 0.55 : 1};
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
  pinIconCache.set(key, icon);
  return icon;
}

function deltaToZoom(latitudeDelta: number): number {
  return Math.max(2, Math.min(18, Math.round(Math.log2(360 / latitudeDelta))));
}

const PlatformMap = forwardRef<PlatformMapHandle, PlatformMapProps>(
  function PlatformMap(
    { initialRegion, flags, focusedFlagId, onLongPressMap },
    ref,
  ) {
    const mapInstance = useRef<LeafletMap | null>(null);
    const markerRefs = useRef<Record<string, LeafletMarker | null>>({});

    // See PlatformMap.tsx for why we prune: ref callbacks leave null entries
    // behind when markers unmount; without pruning, the dict grows forever.
    useEffect(() => {
      const valid = new Set(flags.map((f) => f.id));
      for (const id of Object.keys(markerRefs.current)) {
        if (!valid.has(id)) delete markerRefs.current[id];
      }
    }, [flags]);

    // Wire `contextmenu` to the drop-flag intent on web. Leaflet fires
    // this on right-click on desktop and on a long-touch on mobile
    // browsers (the OS surfaces the press as a context menu request).
    // We re-bind on every change to `onLongPressMap` so the latest
    // closure is used.
    useEffect(() => {
      const map = mapInstance.current;
      if (!map || !onLongPressMap) return;
      const handler = (e: L.LeafletMouseEvent) => {
        // Prevent the browser's default right-click menu from showing
        // over the map.
        const oe = e.originalEvent;
        if (oe && 'preventDefault' in oe) oe.preventDefault();
        onLongPressMap({ lat: e.latlng.lat, lng: e.latlng.lng });
      };
      map.on('contextmenu', handler);
      return () => {
        map.off('contextmenu', handler);
      };
    }, [onLongPressMap]);

    useImperativeHandle(
      ref,
      () => ({
        animateTo: (r) => {
          const zoom = deltaToZoom(r.latitudeDelta ?? 0.005);
          mapInstance.current?.flyTo([r.latitude, r.longitude], zoom, {
            duration: 0.6,
          });
        },
        showCallout: (id) => {
          markerRefs.current[id]?.openPopup();
        },
      }),
      [],
    );

    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapContainer
          center={[initialRegion.latitude, initialRegion.longitude]}
          zoom={deltaToZoom(initialRegion.latitudeDelta)}
          style={{ height: '100%', width: '100%' }}
          ref={(m) => {
            mapInstance.current = m;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {flags.map((f) => (
            <Marker
              key={f.id}
              position={[f.lat, f.lng]}
              icon={pinIcon(
                severityColor(f.severity),
                focusedFlagId !== null && focusedFlagId !== f.id,
              )}
              ref={(m) => {
                markerRefs.current[f.id] = m;
              }}
            >
              <Popup>
                <div style={{ minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {CATEGORY_LABELS[f.category]}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#666',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginTop: 2,
                    }}
                  >
                    Severity {f.severity} · {f.status}
                  </div>
                  {f.photo_url ? (
                    <img
                      src={f.photo_url}
                      alt=""
                      style={{
                        width: '100%',
                        maxHeight: 160,
                        objectFit: 'cover',
                        borderRadius: 8,
                        marginTop: 6,
                      }}
                    />
                  ) : null}
                  {f.description ? (
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      {f.description}
                    </div>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    );
  },
);

export default PlatformMap;
