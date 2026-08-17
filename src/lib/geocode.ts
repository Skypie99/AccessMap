import { errorMessage } from './errors';

/**
 * Address geocoding via Nominatim (OpenStreetMap's free geocoder).
 *
 * Why Nominatim:
 *  - Free, no API key, no signup.
 *  - Already underpins our web map (we render OSM tiles via react-leaflet).
 *  - Per Nominatim's usage policy
 *    (https://operations.osmfoundation.org/policies/nominatim/), we MUST:
 *      - send a meaningful User-Agent (or Referer on the browser);
 *      - keep requests under 1/sec;
 *      - cache results client-side where reasonable.
 *  - Caller responsibility: debounce input before calling here (the
 *    AddressSearchModal does this at 350ms).
 *
 * Returns an empty array on any failure — network, parse error, non-OK
 * status — so the calling UI just renders "no results" instead of
 * surfacing an alarming error.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

// Identifies the app for Nominatim's logs per their policy. Includes the
// maintainer's email as a contact in case usage gets flagged. Bump the
// version when changing geocoding behavior so logs can be correlated.
const USER_AGENT = 'Flagstone/1.0 (skylerhalisky@gmail.com)';

/**
 * fetch() against Nominatim with an 8s hard timeout, combined with the caller's
 * optional AbortSignal. Without this, a stalled request hangs the address search
 * forever (Nominatim is a free public service with no SLA).
 *
 * We use a manual AbortController + setTimeout rather than AbortSignal.timeout()
 * /AbortSignal.any() because those aren't reliably present in Hermes (RN 0.81).
 * The timer is cleared and the caller listener removed once the request settles.
 */
function fetchWithTimeout(url: string, callerSignal?: AbortSignal, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', onAbort);
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', onAbort);
  });
}

export interface GeocodeResult {
  // Unique-ish id from Nominatim ('place_id'). Used as React keys.
  id: string;
  // The full human-readable address Nominatim returns (e.g. "1 Infinite
  // Loop, Cupertino, California, 95014, United States"). We trust the
  // upstream string verbatim — no client-side trimming so the user sees
  // exactly what the geocoder matched.
  displayName: string;
  lat: number;
  lng: number;
}

interface NominatimRow {
  place_id?: number | string;
  display_name?: string;
  lat?: string;
  lon?: string;
}

/**
 * Convert a Nominatim API row into our internal GeocodeResult, or null
 * if it's missing required fields. Exported for unit tests; the
 * `parseResults` helper in this file is what production code uses.
 */
export function parseGeocodeRow(row: NominatimRow): GeocodeResult | null {
  if (!row) return null;
  if (typeof row.display_name !== 'string') return null;
  if (typeof row.lat !== 'string' || typeof row.lon !== 'string') return null;
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // place_id may come as number or string — coerce to string for stable
  // React keys. Fall back to lat,lng concat if it's missing.
  const id = row.place_id !== undefined ? String(row.place_id) : `${lat},${lng}`;
  return { id, displayName: row.display_name, lat, lng };
}

export function parseResults(payload: unknown): GeocodeResult[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((row) => parseGeocodeRow(row as NominatimRow))
    .filter((r): r is GeocodeResult => r !== null);
}

/**
 * Reverse geocode a coordinate to a human-readable address string.
 * Returns null on any failure — callers degrade gracefully to showing
 * raw lat/lng.
 *
 * Uses Nominatim's `/reverse` endpoint (zoom=18 = street-level detail).
 * Same User-Agent and rate-limit rules as `searchAddress`.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const url = `${NOMINATIM_REVERSE}?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=0`;
    const response = await fetchWithTimeout(url, signal);
    if (!response.ok) return null;
    const data = (await response.json()) as { display_name?: string };
    return typeof data.display_name === 'string' ? data.display_name : null;
  } catch {
    return null;
  }
}

/**
 * Search Nominatim for an address, SURFACING real failures (non-OK HTTP
 * status, network/timeout, JSON parse) by throwing — so a caller can show a
 * retryable error instead of a misleading "no matches". Still returns [] for
 * queries under 3 chars.
 *
 * Aborts throw an `AbortError` as usual; callers that race fetches should
 * check `signal.aborted` and treat that as a cancellation, not an error.
 *
 * `signal` lets callers abort the fetch when the user types more characters
 * before this one settles. The modal wires AbortController to its debounce
 * timer. Returns up to 5 results — enough for a dropdown without scrolling.
 */
export async function searchAddressStrict(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  const url = `${NOMINATIM_BASE}?format=json&q=${encodeURIComponent(trimmed)}&limit=5&addressdetails=0`;
  const response = await fetchWithTimeout(url, signal);
  if (!response.ok) throw new Error(`Address search failed (${response.status})`);
  const payload = await response.json();
  return parseResults(payload);
}

/**
 * Swallowing variant of {@link searchAddressStrict}: returns [] on ANY
 * failure (network, parse, non-OK status). This is the long-standing
 * contract the geocode tests cover. Callers that need to tell "search
 * failed" apart from "no matches" should use `searchAddressStrict` + catch.
 */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  try {
    return await searchAddressStrict(query, signal);
  } catch (e) {
    // Aborts throw — treat as "no results" since the caller doesn't
    // want to render anything from a cancelled request.
    if (e instanceof Error && e.name === 'AbortError') return [];
    console.warn('[geocode] searchAddress failed:', errorMessage(e));
    return [];
  }
}
