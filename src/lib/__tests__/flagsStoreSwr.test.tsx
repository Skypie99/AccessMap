/**
 * flagsStoreSwr.test.tsx — provider behaviour tests for the stale-while-
 * revalidate cache paint and the `refreshIfStale` freshness gate added in the
 * Wave 6 battery/caching pass.
 *
 * SWR: on a cold start the cached first page should be painted before the
 * network resolves, then reconciled with the network result.
 * Freshness gate: refreshIfStale should NOT hit the network while the last
 * successful fetch is within FLAGS_FRESH_MS.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- mocks ---------------------------------------------------------------

const mockListFlagsPage = jest.fn();
const mockListFlags = jest.fn();
const mockFetchFlagById = jest.fn();

jest.mock('../flags', () => ({
  __esModule: true,
  DEFAULT_STATUSES: ['open', 'verified'],
  INITIAL_PAGE_SIZE: 50,
  NEXT_PAGE_SIZE: 20,
  listFlags: (...args: unknown[]) => mockListFlags(...args),
  listFlagsPage: (...args: unknown[]) => mockListFlagsPage(...args),
  fetchFlagById: (...args: unknown[]) => mockFetchFlagById(...args),
}));

// realtime OFF — keep these tests focused on the fetch/cache path.
jest.mock('../realtimePrefs', () => ({
  __esModule: true,
  loadRealtimeEnabled: jest.fn().mockResolvedValue(false),
  // FlagsProvider now reads the opt-in reactively via this hook (was a
  // one-shot loadRealtimeEnabled() before). SWR tests don't use realtime —
  // keep it disabled so no channel is created.
  useRealtimeEnabled: jest.fn(() => ({ realtimeEnabled: false, setRealtimeEnabled: jest.fn() })),
}));

const mockChannelObj = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnThis(),
  unsubscribe: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    channel: jest.fn(() => mockChannelObj),
    removeChannel: jest.fn(),
  },
}));

jest.mock('../realtimeLog', () => ({
  __esModule: true,
  logRealtimeEvent: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// --- probe ---------------------------------------------------------------

import { FlagsProvider, useFlags, __writeFlagsCache } from '../flagsStore';
import type { FlagRow } from '@/types/database';

let lastCtx: ReturnType<typeof useFlags> | null = null;

function Probe() {
  const ctx = useFlags();
  lastCtx = ctx;
  return (
    <>
      <probe-flags data-count={ctx.flags.length} />
      <probe-loading data-loading={ctx.loading ? '1' : '0'} />
    </>
  );
}

function makeFlag(id: string): FlagRow {
  return {
    id,
    user_id: 'user-1',
    lat: 37.7749,
    lng: -122.4194,
    category: 'no_ramp',
    severity: 3,
    status: 'open',
    description: null,
    photo_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

/** A promise with externally-controllable resolve, for deterministic timing. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('FlagsProvider SWR + freshness gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastCtx = null;
    void AsyncStorage.clear();
  });

  it('paints cached flags before the network resolves, then reconciles', async () => {
    // Pre-seed the offline cache with two rows.
    await __writeFlagsCache('user-1', [makeFlag('cached-1'), makeFlag('cached-2')]);

    // Hold the network open so the cache paint is observable on its own.
    const net = deferred<{ rows: FlagRow[]; nextCursor: string | null }>();
    mockListFlagsPage.mockReturnValue(net.promise);

    const { UNSAFE_getByType } = render(
      <FlagsProvider userId="user-1">
        <Probe />
      </FlagsProvider>,
    );

    // SWR: cached rows appear while the network is still pending.
    await waitFor(() => {
      expect(UNSAFE_getByType('probe-flags' as never).props['data-count']).toBe(2);
    });

    // Now let the network return a different (fresh) result and reconcile.
    await act(async () => {
      net.resolve({ rows: [makeFlag('net-1'), makeFlag('net-2'), makeFlag('net-3')], nextCursor: null });
    });
    await waitFor(() => {
      expect(UNSAFE_getByType('probe-flags' as never).props['data-count']).toBe(3);
    });
  });

  it('refreshIfStale skips the network while data is fresh', async () => {
    mockListFlagsPage.mockResolvedValue({ rows: [makeFlag('a')], nextCursor: null });

    render(
      <FlagsProvider userId="user-1">
        <Probe />
      </FlagsProvider>,
    );

    // Wait for the initial mount fetch to land.
    await waitFor(() => {
      expect(mockListFlagsPage).toHaveBeenCalledTimes(1);
    });

    // A stale-gated refresh right after a successful fetch is a no-op.
    await act(async () => {
      await lastCtx!.refreshIfStale();
    });
    expect(mockListFlagsPage).toHaveBeenCalledTimes(1);

    // Passing maxAgeMs=0 forces it through (everything is "stale").
    await act(async () => {
      await lastCtx!.refreshIfStale(0);
    });
    expect(mockListFlagsPage).toHaveBeenCalledTimes(2);
  });
});
