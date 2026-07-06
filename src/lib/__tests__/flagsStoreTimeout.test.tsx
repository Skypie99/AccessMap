/**
 * flagsStoreTimeout.test.tsx — S11 leg (a): a data READ that outruns the
 * threshold surfaces the calm, persistent "still trying — check your signal"
 * escalation (a live region with Retry) BEFORE the OS gives up, and clears it
 * once the read settles. A read that resolves quickly never escalates.
 *
 * We assert against a mocked liveStatus channel (the store's contract with the
 * shared LiveStatusRegion); the region's own render/announce behaviour is
 * covered by LiveStatusRegion.test.tsx.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FlagsProvider, useFlags } from '../flagsStore';
import type { FlagRow } from '@/types/database';

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

jest.mock('../realtimePrefs', () => ({
  __esModule: true,
  loadRealtimeEnabled: jest.fn().mockResolvedValue(false),
  useRealtimeEnabled: jest.fn(() => ({ realtimeEnabled: false, setRealtimeEnabled: jest.fn() })),
}));

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: { channel: jest.fn(() => ({ on: jest.fn().mockReturnThis(), subscribe: jest.fn().mockReturnThis() })), removeChannel: jest.fn() },
}));

jest.mock('../realtimeLog', () => ({ __esModule: true, logRealtimeEvent: jest.fn().mockResolvedValue(undefined) }));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Spy on the shared live-status channel the store drives.
const mockSetLiveStatus = jest.fn();
const mockClearLiveStatus = jest.fn();
jest.mock('../liveStatus', () => ({
  __esModule: true,
  setLiveStatus: (...args: unknown[]) => mockSetLiveStatus(...args),
  clearLiveStatus: (...args: unknown[]) => mockClearLiveStatus(...args),
}));

function Probe() {
  useFlags();
  return null;
}

function makeFlag(id: string): FlagRow {
  return {
    id, user_id: 'user-1', lat: 37.77, lng: -122.41, category: 'no_ramp',
    severity: 3, status: 'open', description: null, photo_url: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('FlagsProvider — S11 read timeout escalation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    void AsyncStorage.clear();
  });

  it('surfaces the "still trying" escalation (with Retry) once a read outruns the threshold, then clears on settle', async () => {
    jest.useFakeTimers();
    try {
      const net = deferred<{ rows: FlagRow[]; nextCursor: string | null }>();
      mockListFlagsPage.mockReturnValue(net.promise);

      render(
        <FlagsProvider>
          <Probe />
        </FlagsProvider>,
      );

      // The mount fetch is in flight; before the threshold, nothing escalates.
      await act(async () => {});
      expect(mockSetLiveStatus).not.toHaveBeenCalled();

      // Cross the threshold — the calm "still trying" escalation appears.
      act(() => {
        jest.advanceTimersByTime(12_000);
      });
      expect(mockSetLiveStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/Still trying/),
          action: expect.objectContaining({ label: 'Retry' }),
        }),
      );

      // The read finally lands — the escalation is dismissed.
      await act(async () => {
        net.resolve({ rows: [], nextCursor: null });
      });
      expect(mockClearLiveStatus).toHaveBeenCalled();
    } finally {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  it('does NOT escalate when the read resolves before the threshold', async () => {
    mockListFlagsPage.mockResolvedValue({ rows: [makeFlag('a')], nextCursor: null });

    render(
      <FlagsProvider>
        <Probe />
      </FlagsProvider>,
    );

    await waitFor(() => expect(mockListFlagsPage).toHaveBeenCalled());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Fast read → no "still trying" was ever shown, and the settle cleared any.
    expect(mockSetLiveStatus).not.toHaveBeenCalled();
    expect(mockClearLiveStatus).toHaveBeenCalled();
  });
});
