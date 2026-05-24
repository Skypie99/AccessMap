/**
 * Saved Places — per-user, on-device list of named locations the user wants
 * to quickly jump to on the Map (Home, Work, Mom's, etc.). Pure client-side,
 * no server schema: this is a personal-convenience feature, not shared data.
 *
 * Storage key '@accessmap/saved_places_v1:{userId}'. Fail-soft on every
 * read/write — a busted preference shouldn't break the Map. Capped at
 * MAX_PLACES (50) to keep AsyncStorage payloads small and the chip row
 * sane to scroll.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMessage } from './errors';

const STORAGE_KEY_PREFIX = '@accessmap/saved_places_v1:';
const MAX_PLACES = 50;
const MAX_NAME_LENGTH = 60;

export interface SavedPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** ISO timestamp for "added on" display + sort fallback. */
  created_at: string;
}

function storageKey(userId: string): string {
  return STORAGE_KEY_PREFIX + userId;
}

function isFiniteLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Defensive parser: drops anything that isn't a well-formed SavedPlace.
 * Never throws — returns [] on any structural problem. Hard-caps the
 * returned list at MAX_PLACES (QA E3) so a forced over-cap write to
 * AsyncStorage doesn't leak into a misbehaving chip row.
 */
function parsePlaces(raw: unknown): SavedPlace[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedPlace[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    if (
      typeof obj.id !== 'string' ||
      typeof obj.name !== 'string' ||
      typeof obj.created_at !== 'string' ||
      !isFiniteLatLng(obj.lat, obj.lng) ||
      obj.id.length === 0 ||
      obj.name.length === 0
    ) {
      continue;
    }
    out.push({
      id: obj.id,
      name: obj.name,
      lat: obj.lat as number,
      lng: obj.lng as number,
      created_at: obj.created_at,
    });
    if (out.length >= MAX_PLACES) break;
  }
  return out;
}

export async function loadPlaces(userId: string): Promise<SavedPlace[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    return parsePlaces(JSON.parse(raw));
  } catch (e) {
    console.warn(
      '[savedPlaces] load failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
    return [];
  }
}

async function persist(userId: string, places: SavedPlace[]): Promise<void> {
  // QA C1: previously this swallowed errors with console.warn, so
  // addPlace / removePlace / renamePlace would return success even if
  // the disk write failed and the change would silently vanish on next
  // reload. Re-throw so callers can surface a real error to the user.
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(places));
}

// QA E2/C3: serialize compound load-modify-save operations per user so
// rapid double-taps can't read → mutate → clobber each other. Keyed by
// userId — different users don't share a chain.
const writeQueues = new Map<string, Promise<unknown>>();

function withWriteLock<T>(
  userId: string,
  task: () => Promise<T>,
): Promise<T> {
  const prev = writeQueues.get(userId) ?? Promise.resolve();
  // Allow `task` to settle in sequence after the previous chain finishes.
  // We don't care whether `prev` resolved or rejected — its errors are
  // already owned by whoever awaited it.
  const next = prev.catch(() => undefined).then(task);
  writeQueues.set(userId, next);
  // Cleanup branch: must observe BOTH settle outcomes so an unhandled
  // rejection isn't logged just because we attached a side-effect. The
  // caller awaits `next` directly and owns the real error.
  const cleanup = () => {
    if (writeQueues.get(userId) === next) writeQueues.delete(userId);
  };
  next.then(cleanup, cleanup);
  return next;
}

/**
 * Generates a place id that's unique enough for client-side use. Doesn't
 * need to be cryptographically random — just non-colliding across rapid
 * adds. Uses timestamp + random suffix.
 */
function generateId(): string {
  return `p_${Date.now()}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/**
 * Normalizes a user-supplied name: trim, collapse whitespace, cap length.
 * Returns null if the result is empty so the caller can reject.
 */
export function normalizePlaceName(raw: string): string | null {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > MAX_NAME_LENGTH
    ? trimmed.slice(0, MAX_NAME_LENGTH)
    : trimmed;
}

export interface AddPlaceInput {
  name: string;
  lat: number;
  lng: number;
}

export class SavedPlacesError extends Error {
  code: 'invalid_name' | 'invalid_coords' | 'duplicate_name' | 'limit_reached';
  constructor(code: SavedPlacesError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Adds a place. Throws SavedPlacesError with a typed `code` for the UI to
 * map to friendly copy. Duplicate-name check is case-insensitive so
 * "Home" and "home" are considered the same.
 *
 * QA E2: load-mutate-save is serialized per-user via withWriteLock so
 * concurrent calls (e.g. accidental double-tap) can't clobber each
 * other or race past the MAX_PLACES cap.
 */
export async function addPlace(
  userId: string,
  input: AddPlaceInput,
): Promise<SavedPlace> {
  const name = normalizePlaceName(input.name);
  if (!name) {
    throw new SavedPlacesError('invalid_name', 'Place name cannot be empty.');
  }
  if (!isFiniteLatLng(input.lat, input.lng)) {
    throw new SavedPlacesError(
      'invalid_coords',
      'Place coordinates are out of range.',
    );
  }
  return withWriteLock(userId, async () => {
    const current = await loadPlaces(userId);
    if (current.length >= MAX_PLACES) {
      throw new SavedPlacesError(
        'limit_reached',
        `You can save up to ${MAX_PLACES} places. Remove one to add another.`,
      );
    }
    const existsByName = current.some(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    if (existsByName) {
      throw new SavedPlacesError(
        'duplicate_name',
        `A place named "${name}" already exists.`,
      );
    }
    const next: SavedPlace = {
      id: generateId(),
      name,
      lat: input.lat,
      lng: input.lng,
      created_at: new Date().toISOString(),
    };
    await persist(userId, [...current, next]);
    return next;
  });
}

export async function removePlace(
  userId: string,
  placeId: string,
): Promise<void> {
  return withWriteLock(userId, async () => {
    const current = await loadPlaces(userId);
    const next = current.filter((p) => p.id !== placeId);
    if (next.length === current.length) return; // nothing to remove
    await persist(userId, next);
  });
}

/**
 * Renames a place. Returns the updated place, or null if no place with
 * that id was found. Same name-validation + duplicate rules as addPlace
 * (the place's own current name doesn't count as a duplicate).
 */
export async function renamePlace(
  userId: string,
  placeId: string,
  newName: string,
): Promise<SavedPlace | null> {
  const name = normalizePlaceName(newName);
  if (!name) {
    throw new SavedPlacesError('invalid_name', 'Place name cannot be empty.');
  }
  return withWriteLock(userId, async () => {
    const current = await loadPlaces(userId);
    const existing = current.find((p) => p.id === placeId);
    if (!existing) return null;
    const dup = current.some(
      (p) =>
        p.id !== placeId && p.name.toLowerCase() === name.toLowerCase(),
    );
    if (dup) {
      throw new SavedPlacesError(
        'duplicate_name',
        `A place named "${name}" already exists.`,
      );
    }
    const updated: SavedPlace = { ...existing, name };
    await persist(
      userId,
      current.map((p) => (p.id === placeId ? updated : p)),
    );
    return updated;
  });
}

export { MAX_PLACES, MAX_NAME_LENGTH };
