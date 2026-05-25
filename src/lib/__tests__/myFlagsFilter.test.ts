/**
 * Tests for the "Mine" toggle filter logic used in TasksScreen.
 *
 * TasksScreen derives `displayFlags` from the raw `flags` array by applying:
 *   if (mineOnly && userId) out = out.filter((f) => f.user_id === userId)
 *
 * These tests exercise that pure filter expression directly (no React rendering
 * needed), plus the AsyncStorage restore path via tasksScope.loadScope().
 *
 * Coverage goals (per spec):
 *   1. Filter correctly shows only the current user's flags when active.
 *   2. Filter correctly shows all flags when inactive.
 *   3. AsyncStorage restore on mount — loadScope() returns the persisted value.
 */

import { loadScope, saveScope } from '../tasksScope';
import type { FlagRow, FlagCategory, FlagStatus } from '@/types/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── AsyncStorage mock ──────────────────────────────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const mockGet = AsyncStorage.getItem as jest.MockedFunction<
  typeof AsyncStorage.getItem
>;
const mockSet = AsyncStorage.setItem as jest.MockedFunction<
  typeof AsyncStorage.setItem
>;

// ─── Helpers ────────────────────────────────────────────────────────────────
function makeFlag(id: string, partial: Partial<FlagRow> = {}): FlagRow {
  return {
    id,
    user_id: 'user-alice',
    lat: 47.6,
    lng: -122.3,
    category: 'no_ramp' as FlagCategory,
    severity: 3,
    description: null,
    photo_url: null,
    status: 'open' as FlagStatus,
    created_at: new Date(2026, 4, 25).toISOString(),
    ...partial,
  };
}

/** Replicates the displayFlags filter expression from TasksScreen. */
function applyMineFilter(
  flags: FlagRow[],
  mineOnly: boolean,
  userId: string | undefined,
): FlagRow[] {
  let out = flags;
  if (mineOnly && userId) out = out.filter((f) => f.user_id === userId);
  return out;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore();
});

// ── 1. Filter active: shows only the current user's flags ──────────────────
describe('mine-only filter (mineOnly = true)', () => {
  const userId = 'user-alice';

  const mixedFlags = [
    makeFlag('a', { user_id: 'user-alice', status: 'open' }),
    makeFlag('b', { user_id: 'user-bob', status: 'open' }),
    makeFlag('c', { user_id: 'user-alice', status: 'verified' }),
    makeFlag('d', { user_id: 'user-carol', status: 'open' }),
  ];

  it('returns only flags whose user_id matches the current user', () => {
    const result = applyMineFilter(mixedFlags, true, userId);
    expect(result.map((f) => f.id)).toEqual(['a', 'c']);
  });

  it('returns an empty list when the user has no flags', () => {
    const otherFlags = [
      makeFlag('x', { user_id: 'user-bob' }),
      makeFlag('y', { user_id: 'user-carol' }),
    ];
    const result = applyMineFilter(otherFlags, true, userId);
    expect(result).toHaveLength(0);
  });

  it('is a no-op when userId is undefined (unauthenticated)', () => {
    // If userId is unknown we should never filter — show everything.
    const result = applyMineFilter(mixedFlags, true, undefined);
    expect(result).toBe(mixedFlags);
  });
});

// ── 2. Filter inactive: shows all flags ────────────────────────────────────
describe('mine-only filter (mineOnly = false)', () => {
  const flags = [
    makeFlag('a', { user_id: 'user-alice' }),
    makeFlag('b', { user_id: 'user-bob' }),
    makeFlag('c', { user_id: 'user-alice' }),
  ];

  it('returns the same array reference when mineOnly is false', () => {
    const result = applyMineFilter(flags, false, 'user-alice');
    // Same reference ⟹ no unnecessary re-renders (React.memo / SectionList).
    expect(result).toBe(flags);
  });

  it('shows flags from all users regardless of userId', () => {
    const result = applyMineFilter(flags, false, 'user-alice');
    expect(result.map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });
});

// ── 3. AsyncStorage restore on mount ───────────────────────────────────────
describe('AsyncStorage restore (tasksScope.loadScope)', () => {
  it('restores mineOnly=true when "true" was previously saved', async () => {
    mockGet.mockResolvedValueOnce('true');
    const restored = await loadScope();
    expect(restored).toBe(true);
    expect(mockGet).toHaveBeenCalledWith('@accessmap/tasks_scope_v1');
  });

  it('restores mineOnly=false when "false" was previously saved', async () => {
    mockGet.mockResolvedValueOnce('false');
    const restored = await loadScope();
    expect(restored).toBe(false);
  });

  it('defaults to false (show-all) when nothing is stored (first launch)', async () => {
    mockGet.mockResolvedValueOnce(null);
    const restored = await loadScope();
    expect(restored).toBe(false);
  });

  it('persists mineOnly=true via saveScope then restores it', async () => {
    mockSet.mockResolvedValueOnce(undefined);
    await saveScope(true);
    expect(mockSet).toHaveBeenCalledWith('@accessmap/tasks_scope_v1', 'true');

    mockGet.mockResolvedValueOnce('true');
    const restored = await loadScope();
    expect(restored).toBe(true);
  });
});
