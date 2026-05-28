/**
 * Address recents — device-wide list of the last few places the user
 * picked from the AddressSearchModal. When the modal reopens with an
 * empty query, we show this list above the (empty) results area so the
 * user can re-jump to a previously-searched address with one tap.
 *
 * Storage scope: device-wide (no per-user key). Searched addresses
 * aren't personally identifying — they're public OSM data and a Cupertino
 * office isn't sensitive — so we don't need to wall them per Supabase
 * user. Mirrors the simpler-key style used by mapFilters.ts.
 *
 * Cap: ADDRESS_RECENTS_MAX (5). Enough to be useful, small enough that
 * a quick scan of the section fits without scrolling.
 *
 * Shape: matches GeocodeResult from src/lib/geocode.ts so a tapped
 * recent can flow straight back into the modal's onSelect callback with
 * the same payload the live results use — no transformation needed.
 *
 * Fail-soft on every read/write — a busted preference shouldn't break
 * the search modal.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMessage } from './errors';

export type AddressRecent = {
  /** Nominatim place_id (when known); used as a stable React key. */
  id?: string;
  /** Human-readable address Nominatim returned. */
  displayName: string;
  lat: number;
  lng: number;
};

export const ADDRESS_RECENTS_KEY = '@accessmap/address_recents_v1';
export const ADDRESS_RECENTS_MAX = 5;

/**
 * Pure helper: add `entry` to the front of `list`, deduping by
 * displayName (case-insensitive) and capping at ADDRESS_RECENTS_MAX.
 *
 * - If `entry.displayName` already exists (any casing), the old copy is
 *   removed first so the new one ends up at index 0 (move-to-front).
 *   The new entry's coords/id win — same address text but with possibly
 *   fresher coordinates.
 * - Order: newest first. Older entries shift down. The oldest falls off
 *   if we'd exceed the cap.
 * - Pure — no AsyncStorage, no Date.now(). Safe to call in render.
 */
export function addRecent(list: AddressRecent[], entry: AddressRecent): AddressRecent[] {
  const lowered = entry.displayName.toLowerCase();
  const filtered = list.filter((r) => r.displayName.toLowerCase() !== lowered);
  return [entry, ...filtered].slice(0, ADDRESS_RECENTS_MAX);
}

/**
 * Defensive parser: drops anything that isn't a well-formed
 * AddressRecent. Hard-caps at ADDRESS_RECENTS_MAX in case the persisted
 * payload was tampered with or written by a future/buggy version.
 */
function parseRecents(raw: unknown): AddressRecent[] {
  if (!Array.isArray(raw)) return [];
  const out: AddressRecent[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    if (
      typeof obj.displayName !== 'string' ||
      obj.displayName.length === 0 ||
      typeof obj.lat !== 'number' ||
      typeof obj.lng !== 'number' ||
      !Number.isFinite(obj.lat) ||
      !Number.isFinite(obj.lng)
    ) {
      continue;
    }
    const entry: AddressRecent = {
      displayName: obj.displayName,
      lat: obj.lat,
      lng: obj.lng,
    };
    if (typeof obj.id === 'string' && obj.id.length > 0) {
      entry.id = obj.id;
    }
    out.push(entry);
    if (out.length >= ADDRESS_RECENTS_MAX) break;
  }
  return out;
}

export async function loadRecents(): Promise<AddressRecent[]> {
  try {
    const raw = await AsyncStorage.getItem(ADDRESS_RECENTS_KEY);
    if (!raw) return [];
    return parseRecents(JSON.parse(raw));
  } catch (e) {
    console.warn('[addressRecents] load failed:', errorMessage(e, 'AsyncStorage error.'));
    return [];
  }
}

export async function saveRecents(list: AddressRecent[]): Promise<void> {
  try {
    // Trim defensively in case a caller passes an over-cap list.
    const trimmed = list.slice(0, ADDRESS_RECENTS_MAX);
    await AsyncStorage.setItem(ADDRESS_RECENTS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // Persisted recents are a convenience — don't escalate a write
    // failure into a search-flow crash. Log + continue.
    console.warn('[addressRecents] save failed:', errorMessage(e, 'AsyncStorage error.'));
  }
}

export async function clearRecents(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ADDRESS_RECENTS_KEY);
  } catch (e) {
    console.warn('[addressRecents] clear failed:', errorMessage(e, 'AsyncStorage error.'));
  }
}
