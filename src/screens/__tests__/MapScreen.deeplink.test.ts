/**
 * M3 (re-sweep 2026-06-09) — deep-linked flag outside page 1 renders a marker.
 *
 * Unit tests for the exported pure helper `withFocusFlag(flags, extra)` in
 * MapScreen.tsx. The helper merges the deep-link-fetched flag into the marker
 * list AFTER the filter pass: append if absent, de-dupe by id, identity when
 * there's nothing to merge. The screen-level wiring (deepLinkFlag state set in
 * the deep-link effect, mapFlags memo passed to <PlatformMap>) is exercised
 * here only via the helper — full render coverage stays out of scope, same as
 * the other MapScreen suites.
 *
 * MapScreen's import graph pulls in native-bridge modules; everything that
 * would explode at module-eval time in Node is mocked below, following the
 * patterns in MapScreen.heatmap.test.tsx / ReportFlagModal.test.tsx.
 */

// jest.mock calls are hoisted above all imports by babel-jest, so these
// imports resolve against the mocked module graph. Kept at the top (not
// mid-file) to keep import/first happy — same note as ReportFlagModal.test.
import { withFocusFlag } from '../MapScreen';
import type { FlagRow } from '@/types/database';

// ---------------------------------------------------------------------------
// Mock: @/lib/supabase — MapScreen imports flags.ts / flagsStore / auth
// transitively; createClient would spin up async work at import time.
// ---------------------------------------------------------------------------
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock: native map modules (via @/components/PlatformMap)
// ---------------------------------------------------------------------------
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: () => null,
  Marker: () => null,
  Callout: () => null,
  Polygon: () => null,
  PROVIDER_DEFAULT: 'default',
}));
jest.mock('react-native-map-clustering', () => ({
  __esModule: true,
  default: () => null,
}));

// ---------------------------------------------------------------------------
// Mock: expo device modules (no native bridge in the Node test env)
// ---------------------------------------------------------------------------
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

function makeFlag(id: string): FlagRow {
  return {
    id,
    user_id: 'u1',
    lat: 37.78,
    lng: -122.42,
    category: 'no_ramp',
    severity: 3,
    description: null,
    photo_url: null,
    status: 'open',
    created_at: '2026-06-09T08:00:00Z',
  };
}

describe('withFocusFlag', () => {
  it('returns the list unchanged (same reference) when extra is null', () => {
    const flags = [makeFlag('a'), makeFlag('b')];
    expect(withFocusFlag(flags, null)).toBe(flags);
  });

  it('appends the deep-linked flag when it is not in the list', () => {
    const flags = [makeFlag('a'), makeFlag('b')];
    const extra = makeFlag('deep-1');
    const result = withFocusFlag(flags, extra);
    expect(result).toHaveLength(3);
    expect(result[2]).toBe(extra);
    // Non-mutating: the input list is untouched.
    expect(flags).toHaveLength(2);
  });

  it('does not duplicate a flag that is already in the list (de-dupe by id)', () => {
    const existing = makeFlag('a');
    const flags = [existing, makeFlag('b')];
    // Same id, different object — the loaded row wins, no second marker.
    const refetched = makeFlag('a');
    const result = withFocusFlag(flags, refetched);
    expect(result).toBe(flags);
    expect(result.filter((f) => f.id === 'a')).toHaveLength(1);
  });

  it('appends to an empty list (flag outside page 1 with zero loaded flags)', () => {
    const extra = makeFlag('deep-1');
    const result = withFocusFlag([], extra);
    expect(result).toEqual([extra]);
  });

  it('returns the empty list as-is when there is nothing to merge', () => {
    const flags: FlagRow[] = [];
    expect(withFocusFlag(flags, null)).toBe(flags);
  });
});
