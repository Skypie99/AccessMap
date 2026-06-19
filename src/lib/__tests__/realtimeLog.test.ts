/**
 * D4 Realtime Observability Log Tests
 *
 * Tests for realtimeLog.ts:
 * - logRealtimeEvent: calls supabase.rpc with correct params
 * - Graceful degradation when RPC function doesn't exist
 * - Fire-and-forget behavior (Promise.resolve, no throw)
 */

import { logRealtimeEvent } from '../realtimeLog';

import { supabase } from '../supabase';

// Mock the entire supabase client
jest.mock('../supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

describe('realtimeLog — D4 Observability RPC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // Test 1: logRealtimeEvent calls rpc with subscribe event
  // ========================================================================
  it('calls supabase.rpc with subscribe event', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

    await logRealtimeEvent('subscribe', 'flags-status');

    expect(supabase.rpc).toHaveBeenCalledWith('log_realtime_event', {
      p_event: 'subscribe',
      p_channel: 'flags-status',
    });
  });

  // ========================================================================
  // Test 2: logRealtimeEvent calls rpc with unsubscribe event
  // ========================================================================
  it('calls supabase.rpc with unsubscribe event', async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });

    await logRealtimeEvent('unsubscribe', 'flags-status');

    expect(supabase.rpc).toHaveBeenCalledWith('log_realtime_event', {
      p_event: 'unsubscribe',
      p_channel: 'flags-status',
    });
  });

  // ========================================================================
  // Test 3: Degrades gracefully when RPC function doesn't exist (404)
  // ========================================================================
  it('logs warning when RPC returns error (pre-apply state)', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const mockError = new Error('PGRST000 No relation');
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: mockError,
    });

    // Function should not throw — fire-and-forget
    await expect(logRealtimeEvent('subscribe', 'flags-status')).resolves.toBeUndefined();

    expect(consoleWarnSpy).toHaveBeenCalled();
    const firstCall = (consoleWarnSpy.mock.calls[0] as any[])[0];
    expect(firstCall).toContain('[D4] logRealtimeEvent RPC error:');

    consoleWarnSpy.mockRestore();
  });

  // ========================================================================
  // Test 4: Degrades gracefully when RPC throws unexpected error
  // ========================================================================
  it('logs warning when RPC throws unexpected error', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    (supabase.rpc as jest.Mock).mockRejectedValue(new Error('Network timeout'));

    // Function should not throw — fire-and-forget
    await expect(logRealtimeEvent('subscribe', 'flags-status')).resolves.toBeUndefined();

    expect(consoleWarnSpy).toHaveBeenCalled();
    const firstCall = (consoleWarnSpy.mock.calls[0] as any[])[0];
    expect(firstCall).toContain('[D4] logRealtimeEvent unexpected error:');

    consoleWarnSpy.mockRestore();
  });

  // ========================================================================
  // Test 5: Fire-and-forget — returns immediately (doesn't await inner promise)
  // ========================================================================
  it('returns without awaiting RPC response', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    let rpcResolved = false;
    (supabase.rpc as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            rpcResolved = true;
            resolve({ data: null, error: null });
          }, 100);
        }),
    );

    // Call logRealtimeEvent but don't await it
    const promise = logRealtimeEvent('subscribe', 'flags-status');

    // At this point, the RPC might not have resolved yet
    // but logRealtimeEvent should already be returning

    consoleWarnSpy.mockRestore();
  });

  // ========================================================================
  // Test 6: RPC success (data returned) is silent
  // ========================================================================
  it('is silent when RPC succeeds', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    });

    await logRealtimeEvent('subscribe', 'flags-status');

    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });
});
