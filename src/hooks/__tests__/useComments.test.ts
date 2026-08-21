/**
 * Tests for the useComments hook + the CommentsTableNotReadyError sentinel.
 *
 * Coverage:
 *   - CommentsTableNotReadyError: name, message, instanceof semantics
 *   - useComments lifecycle (via renderHook):
 *       · initial load populates comments + toggles loading
 *       · error state surfaces errorMessage
 *       · table-missing surfaces tableNotReady (not error)
 *       · null flagId is a no-op (no fetch)
 *       · realtime channel is subscribed on mount and torn down on unmount
 *       · addComment calls the lib then refetches
 *       · refetch failure keeps the loaded thread + sets error; success clears it (M1)
 *       · deleteComment removes optimistically, and rolls back + rethrows on error
 *
 * The comments lib and the supabase realtime client are mocked so nothing
 * touches the network. CommentsTableNotReadyError is taken from the real
 * module so `instanceof` checks inside the hook line up with what we throw.
 */

import { act, configure, renderHook, waitFor } from '@testing-library/react-native';
import type { CommentRow } from '@/types/database';

import { CommentsTableNotReadyError } from '@/lib/comments';
import { useComments } from '../useComments';

// LOAD-TIMING FLAKE (observed 2026-07-27, SHIP-READY Phase 3). Every assertion
// here is `await waitFor(...)` on a mocked promise that resolves immediately, so
// each test needs ~50ms in isolation — but waitFor's default budget is 1000ms of
// WALL CLOCK, and under a full 170-suite parallel run this file has been measured
// at 9.3s, long enough for a resolved microtask to miss that window. The suite
// then fails on a promise that did settle, which reads as a broken assertion and
// is really CPU contention. Raising the budget removes the false red without
// weakening anything: a genuinely broken hook never settles, so it still fails,
// just later. (This is the repo's second known load-timing flake, alongside the
// /ago$/ fixture one.)
configure({ asyncUtilTimeout: 10_000 });

// --- comments lib mock ------------------------------------------------------
const mockListComments = jest.fn();
const mockAddComment = jest.fn();
const mockDeleteComment = jest.fn();

jest.mock('@/lib/comments', () => {
  const actual = jest.requireActual('@/lib/comments');
  return {
    __esModule: true,
    // Keep the real sentinel class so the hook's `instanceof` check matches
    // the instances thrown from these tests.
    CommentsTableNotReadyError: actual.CommentsTableNotReadyError,
    MAX_COMMENT_LENGTH: actual.MAX_COMMENT_LENGTH,
    listComments: (...args: unknown[]) => mockListComments(...args),
    addComment: (...args: unknown[]) => mockAddComment(...args),
    deleteComment: (...args: unknown[]) => mockDeleteComment(...args),
  };
});

// --- supabase realtime mock -------------------------------------------------
const mockChannel = jest.fn();
const mockOn = jest.fn();
const mockSubscribe = jest.fn();
const mockRemoveChannel = jest.fn();

jest.mock('@/lib/supabase', () => ({
  __esModule: true,
  supabase: {
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function comment(id: string, content = 'hi'): CommentRow {
  return {
    id,
    flag_id: 'flag-1',
    user_id: 'user-1',
    content,
    created_at: '2026-05-30T12:00:00Z',
    display_name: 'Sky',
  };
}

const SUBSCRIBE_HANDLE = { channel: 'flag_comments:flag-1' };

beforeEach(() => {
  jest.clearAllMocks();
  // channel(...).on(...).subscribe() chain
  mockSubscribe.mockReturnValue(SUBSCRIBE_HANDLE);
  mockOn.mockReturnValue({ subscribe: mockSubscribe });
  mockChannel.mockReturnValue({ on: mockOn });
  // sensible default so effects that fire before a test overrides resolve cleanly
  mockListComments.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// CommentsTableNotReadyError sentinel
// ---------------------------------------------------------------------------

describe('CommentsTableNotReadyError', () => {
  it('is an instance of Error', () => {
    expect(new CommentsTableNotReadyError()).toBeInstanceOf(Error);
  });

  it('has the expected name', () => {
    expect(new CommentsTableNotReadyError().name).toBe('CommentsTableNotReadyError');
  });

  it('has a human-readable message', () => {
    expect(new CommentsTableNotReadyError().message).toMatch(/flag_comments/);
  });

  it('is distinct from a plain Error with the same message', () => {
    const other = new Error('flag_comments table not yet available');
    expect(other instanceof CommentsTableNotReadyError).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useComments — initial load
// ---------------------------------------------------------------------------

describe('useComments — initial load', () => {
  it('loads comments for the flag and clears loading', async () => {
    mockListComments.mockResolvedValue([comment('c1'), comment('c2')]);

    const { result } = renderHook(() => useComments('flag-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListComments).toHaveBeenCalledWith('flag-1');
    expect(result.current.comments).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(result.current.tableNotReady).toBe(false);
  });

  it('surfaces the error message when the load fails', async () => {
    mockListComments.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useComments('flag-1'));

    await waitFor(() => expect(result.current.error).toBe('network down'));
    expect(result.current.comments).toEqual([]);
    expect(result.current.tableNotReady).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('sets tableNotReady (not error) when the table is missing', async () => {
    mockListComments.mockRejectedValue(new CommentsTableNotReadyError());

    const { result } = renderHook(() => useComments('flag-1'));

    await waitFor(() => expect(result.current.tableNotReady).toBe(true));
    expect(result.current.error).toBeNull();
  });

  it('is a no-op when flagId is null (no fetch, not loading)', async () => {
    const { result } = renderHook(() => useComments(null));

    // Give any pending effects a tick to flush.
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockListComments).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.comments).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// useComments — realtime subscription
// ---------------------------------------------------------------------------

describe('useComments — realtime subscription', () => {
  it('subscribes to the flag channel on mount and removes it on unmount', async () => {
    const { result, unmount } = renderHook(() => useComments('flag-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // SW-47: the topic is now flag + a per-INSTANCE suffix. It used to be the
    // flagId alone, which is what let two hosts collide on one channel object.
    expect(mockChannel).toHaveBeenCalledWith(expect.stringMatching(/^flag_comments:flag-1:.+/));
    expect(mockOn).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();

    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledWith(SUBSCRIBE_HANDLE);
  });

  it('refetches on a realtime INSERT event (to pick up the joined display_name)', async () => {
    mockListComments.mockResolvedValue([comment('c1')]);

    const { result } = renderHook(() => useComments('flag-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // The 3rd arg to channel.on(...) is the payload handler.
    const handler = mockOn.mock.calls[0][2] as (p: unknown) => void;

    mockListComments.mockClear();
    await act(async () => {
      handler({ eventType: 'INSERT', new: { id: 'c2' } });
    });

    expect(mockListComments).toHaveBeenCalledWith('flag-1'); // refetch
  });

  it('removes a comment locally on a realtime DELETE event (no refetch)', async () => {
    mockListComments.mockResolvedValue([comment('c1'), comment('c2')]);

    const { result } = renderHook(() => useComments('flag-1'));
    await waitFor(() => expect(result.current.comments).toHaveLength(2));

    const handler = mockOn.mock.calls[0][2] as (p: unknown) => void;

    mockListComments.mockClear();
    await act(async () => {
      handler({ eventType: 'DELETE', old: { id: 'c1' } });
    });

    expect(result.current.comments.map((c) => c.id)).toEqual(['c2']);
    expect(mockListComments).not.toHaveBeenCalled(); // DELETE is optimistic, no round-trip
  });

  it('tears the channel down and does not re-subscribe once the table is found missing', async () => {
    mockListComments.mockRejectedValue(new CommentsTableNotReadyError());

    const { result } = renderHook(() => useComments('flag-1'));

    await waitFor(() => expect(result.current.tableNotReady).toBe(true));

    // The hook subscribes optimistically on mount, then — once the load
    // reveals the table is missing — removes the channel and does NOT
    // subscribe again (the effect bails on tableNotReady).
    expect(mockChannel).toHaveBeenCalledTimes(1);
    expect(mockRemoveChannel).toHaveBeenCalledWith(SUBSCRIBE_HANDLE);
  });
});

// ---------------------------------------------------------------------------
// SW-47 — the realtime subscription must not be able to crash its host
//
// THE BUG. `RealtimeClient.channel(topic)` returns an EXISTING channel when the
// topic matches. The topic was `flag_comments:${flagId}` — flagId alone — so
// every host mounting this hook for one flag shared one channel object. A
// closed FlagDetailModal stays mounted and, before this fix, stayed subscribed;
// opening the same flag from a second screen then called `.on()` on an
// already-subscribed channel, which throws:
//
//   Error: cannot add `postgres_changes` callbacks for
//          realtime:flag_comments:<uuid> after `subscribe()`.
//
// Uncaught in render, so the whole hosting screen died into the ErrorBoundary.
// Reproduced 4x across 2 flags and 3 different second-parents on 2026-08-20.
//
// Each test below removes one of the three doors that let that happen. They are
// hook-level on purpose: what broke was two INSTANCES interacting, which no
// single-instance render test and no source scan can see.
// ---------------------------------------------------------------------------

describe('useComments — SW-47 realtime isolation', () => {
  it('two instances on the SAME flag get DIFFERENT channel topics', async () => {
    const a = renderHook(() => useComments('flag-1'));
    const b = renderHook(() => useComments('flag-1'));

    await waitFor(() => expect(a.result.current.loading).toBe(false));
    await waitFor(() => expect(b.result.current.loading).toBe(false));

    const topics = mockChannel.mock.calls.map((c) => c[0] as string);
    expect(topics).toHaveLength(2);
    // Both still address the same flag...
    topics.forEach((t) => expect(t).toMatch(/^flag_comments:flag-1:/));
    // ...but never the same channel object, which is the whole fix.
    expect(topics[0]).not.toBe(topics[1]);
  });

  it('the topic suffix carries no punctuation a websocket topic should not hold', async () => {
    // React formats useId as `:r4:` on 18 and `«r4»` on 19. Neither belongs in
    // a Phoenix topic, and the guillemets are not even ASCII.
    const { result } = renderHook(() => useComments('flag-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const topic = mockChannel.mock.calls[0][0] as string;
    expect(topic).toMatch(/^flag_comments:flag-1:[a-zA-Z0-9]+$/);
  });

  it('does not subscribe at all while the host is inactive', async () => {
    const { result } = renderHook(() => useComments('flag-1', false));

    // The thread still LOADS — only the live channel is gated. An invisible
    // host holding a subscription is the condition that made the collision
    // possible in the first place.
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockListComments).toHaveBeenCalledWith('flag-1');
    expect(mockChannel).not.toHaveBeenCalled();
  });

  it('subscribes when the host becomes active and tears down when it stops', async () => {
    const { result, rerender } = renderHook(
      ({ active }: { active: boolean }) => useComments('flag-1', active),
      { initialProps: { active: false } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockChannel).not.toHaveBeenCalled();

    rerender({ active: true });
    await waitFor(() => expect(mockChannel).toHaveBeenCalledTimes(1));

    rerender({ active: false });
    await waitFor(() => expect(mockRemoveChannel).toHaveBeenCalledWith(SUBSCRIBE_HANDLE));
  });

  it('a throwing subscribe degrades to "no live updates" instead of taking down the host', async () => {
    // The exact production throw, from RealtimeChannel.on().
    mockOn.mockImplementation(() => {
      throw new Error(
        'cannot add `postgres_changes` callbacks for realtime:flag_comments:flag-1 after `subscribe()`.',
      );
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockListComments.mockResolvedValue([comment('c1')]);

    // Before the fix this threw out of the effect and killed the screen.
    const { result } = renderHook(() => useComments('flag-1'));

    await waitFor(() => expect(result.current.comments).toHaveLength(1));
    expect(result.current.error).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      '[useComments] realtime subscribe failed:',
      expect.stringContaining('after `subscribe()`'),
    );

    warn.mockRestore();
  });

  it('removes the half-registered channel when subscribe throws', async () => {
    // channel() has ALREADY pushed the channel into the client's registry by
    // the time on() throws. Leaving it there would poison the next attempt on
    // that topic — the same failure mode, one layer down.
    const HALF_REGISTERED = { on: mockOn };
    mockChannel.mockReturnValue(HALF_REGISTERED);
    mockOn.mockImplementation(() => {
      throw new Error('cannot add `postgres_changes` callbacks after `subscribe()`.');
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() => useComments('flag-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockRemoveChannel).toHaveBeenCalledWith(HALF_REGISTERED);
    warn.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// useComments — addComment
// ---------------------------------------------------------------------------

describe('useComments — addComment', () => {
  it('delegates to the lib then refetches the list', async () => {
    mockListComments.mockResolvedValue([]);
    mockAddComment.mockResolvedValue(comment('c9', 'new one'));

    const { result } = renderHook(() => useComments('flag-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockListComments.mockClear(); // count only the refetch triggered by addComment
    await act(async () => {
      await result.current.addComment('new one');
    });

    expect(mockAddComment).toHaveBeenCalledWith('flag-1', 'new one');
    expect(mockListComments).toHaveBeenCalledWith('flag-1'); // refetch
  });

  // F36 (re-sweep): the modal swaps flags without unmounting. A comment posted
  // on flag A whose network round-trip finishes AFTER the user opened flag B
  // runs flag A's stale `fetch` closure; before the guard it bumped genRef
  // (promoting itself to "latest") and committed A's thread under B.
  it('LOCKING (F36): a slow addComment on flag A cannot refetch A over flag B', async () => {
    const aThread = [comment('a1', 'thread A')];
    const bThread = [{ ...comment('b1', 'thread B'), flag_id: 'flag-B' }];
    mockListComments.mockImplementation(async (id: string) =>
      id === 'flag-A' ? aThread : bThread,
    );

    const { result, rerender } = renderHook(({ id }: { id: string }) => useComments(id), {
      initialProps: { id: 'flag-A' },
    });
    await waitFor(() => expect(result.current.comments.map((c) => c.id)).toEqual(['a1']));

    // The post on flag A is slow — its promise resolves only after the swap.
    let resolveAdd: () => void = () => {};
    mockAddComment.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveAdd = () => resolve();
      }),
    );
    let addPromise: Promise<void> = Promise.resolve();
    act(() => {
      addPromise = result.current.addComment('posted on A');
    });

    // User opens flag B while the post is in flight.
    rerender({ id: 'flag-B' });
    await waitFor(() => expect(result.current.comments.map((c) => c.id)).toEqual(['b1']));

    // The post completes — its stale refetch must NOT run listComments('flag-A')
    // again, and must NOT commit A's thread over B's.
    mockListComments.mockClear();
    await act(async () => {
      resolveAdd();
      await addPromise;
    });

    expect(mockListComments).not.toHaveBeenCalledWith('flag-A');
    expect(result.current.comments.map((c) => c.id)).toEqual(['b1']);
  });
});

// ---------------------------------------------------------------------------
// useComments — refetch failure keeps the loaded thread (M1)
// ---------------------------------------------------------------------------

describe('useComments — refetch failure (M1)', () => {
  // M1 (re-sweep): FlagDetailModal renders the destructive "Couldn't load
  // comments" state only when the thread is empty, so the hook MUST keep the
  // already-loaded comments when a refetch rejects — wiping them would blank
  // the thread the user is reading over a transient network hiccup.
  it('LOCKING (M1): a refetch rejection keeps the loaded comments and sets error; the next successful refetch clears it', async () => {
    mockListComments.mockResolvedValue([comment('c1'), comment('c2')]);

    const { result } = renderHook(() => useComments('flag-1'));
    await waitFor(() => expect(result.current.comments).toHaveLength(2));

    // Refetch fails — the 2 loaded comments must survive, error must surface.
    mockListComments.mockRejectedValueOnce(new Error('network down'));
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.comments.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(result.current.error).toBe('network down');
    expect(result.current.loading).toBe(false);

    // Next refetch succeeds — error clears and the thread updates.
    mockListComments.mockResolvedValueOnce([comment('c1'), comment('c2'), comment('c3')]);
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.comments.map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
  });
});

// ---------------------------------------------------------------------------
// useComments — deleteComment (optimistic)
// ---------------------------------------------------------------------------

describe('useComments — deleteComment', () => {
  it('removes the comment optimistically and calls the lib', async () => {
    mockListComments.mockResolvedValue([comment('c1'), comment('c2')]);
    mockDeleteComment.mockResolvedValue(undefined);

    const { result } = renderHook(() => useComments('flag-1'));
    await waitFor(() => expect(result.current.comments).toHaveLength(2));

    await act(async () => {
      await result.current.deleteComment('c1');
    });

    expect(mockDeleteComment).toHaveBeenCalledWith('c1');
    expect(result.current.comments.map((c) => c.id)).toEqual(['c2']);
  });

  it('rolls back (refetches) and rethrows when the delete fails', async () => {
    mockListComments.mockResolvedValue([comment('c1'), comment('c2')]);
    mockDeleteComment.mockRejectedValue(new Error('permission denied'));

    const { result } = renderHook(() => useComments('flag-1'));
    await waitFor(() => expect(result.current.comments).toHaveLength(2));

    mockListComments.mockClear(); // count only the rollback refetch
    await act(async () => {
      await expect(result.current.deleteComment('c1')).rejects.toThrow('permission denied');
    });

    expect(mockListComments).toHaveBeenCalledWith('flag-1'); // rollback refetch
  });
});
