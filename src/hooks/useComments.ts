import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  addComment as addCommentLib,
  CommentsTableNotReadyError,
  deleteComment as deleteCommentLib,
  listComments,
} from '@/lib/comments';
import { errorMessage } from '@/lib/errors';
import type { CommentRow } from '@/types/database';

export interface UseCommentsResult {
  comments: CommentRow[];
  loading: boolean;
  error: string | null;
  // false until the first successful load; true once the table is confirmed missing
  tableNotReady: boolean;
  addComment: (content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useComments(
  flagId: string | null | undefined,
  /**
   * Whether the caller is actually on screen. Gates the REALTIME SUBSCRIPTION
   * only — the initial load is one cheap query and stays unconditional.
   *
   * Defaults to true so a caller that does not care keeps the old behaviour;
   * FlagDetailModal passes its own `visible`. See the subscription effect for
   * why an invisible host holding a live channel was a crash, not just waste.
   */
  active: boolean = true,
): UseCommentsResult {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableNotReady, setTableNotReady] = useState(false);
  const mountedRef = useRef(true);
  // Generation counter (F15): incremented on every fetch. A fetch only commits
  // its result if it is still the latest. Without this, switching from flag A
  // to flag B while A's listComments is in flight lets A resolve last and
  // overwrite B's comments (mountedRef stays true across a flag swap).
  const genRef = useRef(0);
  // Latest flagId (F36 re-sweep): the modal swaps flags WITHOUT unmounting, so
  // async work started under flag A (addComment's post-write refetch, a
  // deleteComment rollback, a late realtime callback) can resolve while the
  // hook already shows flag B. Those calls run flag-A CLOSURES of `fetch`,
  // which would bump genRef — promoting themselves to "latest" — and commit
  // A's thread under B. Every fetch checks its closure flagId against this
  // ref and bails if the hook has moved on.
  const flagIdRef = useRef(flagId);
  // SW-47: one channel per HOOK INSTANCE, not one per flag. `useId` is stable
  // for the life of this component and unique across mounted instances.
  // Stripped to alphanumerics because React wraps the id in punctuation that
  // has changed shape between versions (`:r4:` on 18, `«r4»` on this repo's
  // 19.1) and a websocket topic should not carry either — least of all a
  // non-ASCII guillemet. What survives is the counter, which is the unique part.
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, '');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetch = useCallback(async () => {
    const id = flagId;
    // F36: stale-closure guard — this closure belongs to `id`. If the hook
    // has since moved to a different flag, bail BEFORE bumping the generation
    // (a stale closure that bumps genRef would make itself "latest" and win).
    if (id !== flagIdRef.current) return;
    // Bump the generation BEFORE the early return so that a flagId
    // truthy -> null/undefined transition also invalidates any in-flight
    // fetch (otherwise that fetch would still match genRef and could commit
    // stale comments over the cleared state). Found in the second sweep.
    const gen = ++genRef.current;
    if (!id) return;
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await listComments(id);
      if (!mountedRef.current || gen !== genRef.current || id !== flagIdRef.current) return;
      setComments(data);
      setTableNotReady(false);
    } catch (e) {
      if (!mountedRef.current || gen !== genRef.current || id !== flagIdRef.current) return;
      if (e instanceof CommentsTableNotReadyError) {
        setTableNotReady(true);
      } else {
        setError(errorMessage(e));
      }
    } finally {
      if (mountedRef.current && gen === genRef.current) setLoading(false);
    }
  }, [flagId]);

  // Initial load + reload when flagId changes.
  useEffect(() => {
    // F36: record the new flagId BEFORE kicking off its fetch so stale
    // closures from the previous flag fail the flagIdRef check from here on.
    flagIdRef.current = flagId;
    setComments([]);
    setError(null);
    setTableNotReady(false);
    void fetch();
  }, [flagId, fetch]);

  // Realtime subscription: INSERT events trigger a refetch (to get the joined
  // display_name); DELETE events are applied optimistically to local state so
  // the comment disappears immediately without a round-trip.
  //
  // ─── SW-47: THIS EFFECT USED TO CRASH THE HOSTING SCREEN ──────────────────
  // Reproduced 4× across 2 flags and 3 different second-parents, 2026-08-20,
  // signed in and out alike:
  //
  //   Error: cannot add `postgres_changes` callbacks for
  //          realtime:flag_comments:<uuid> after `subscribe()`.
  //   '[ErrorBoundary] uncaught render error:'
  //
  // The chain: `RealtimeClient.channel(topic)` RETURNS AN EXISTING CHANNEL when
  // the topic matches rather than creating a second one. The topic was
  // `flag_comments:${flagId}` — flagId alone — so every host mounting this hook
  // for one flag collided on a single channel object. FlagDetailModal syncs its
  // `shownFlag` only when `flag` is truthy (deliberately: it is what stops the
  // sheet blanking mid-exit-animation), so closing it leaves the modal
  // invisible but still subscribed, indefinitely. Opening the same flag from a
  // SECOND screen then called `.on()` on the already-subscribed channel, which
  // throws, uncaught, in render — taking out the whole screen. Same-parent
  // re-open never crashed; it needed a second live host for one flagId.
  //
  // Three changes, and each closes a different door:
  //   1. `active` — an invisible host does not hold a subscription at all. This
  //      is the correctness fix: it also stops three screens keeping channels
  //      open for flags nobody is looking at.
  //   2. per-instance topic — makes the collision structurally impossible even
  //      if two VISIBLE hosts ever coexist, and closes a teardown race that is
  //      live in the code but was not reproducible in the walk: `removeChannel`
  //      is async, so a fast close→reopen could still find the old channel
  //      registered under a flag-only topic.
  //   3. try/catch — comments-realtime is a NICETY. Its failure must degrade to
  //      "no live updates", never to a dead screen. Even with 1 and 2 correct, a
  //      future regression here should cost a feature, not the app.
  //
  // NOT fixed by clearing `shownFlag` on close. That retention is deliberate
  // (see above), and removing it trades this crash for a blanking sheet.
  useEffect(() => {
    if (!active || !flagId || tableNotReady) return;

    // Assigned in two steps on purpose. If `.on()` throws, the assignment below
    // never completes, so this still holds the channel `supabase.channel()` just
    // REGISTERED — and an un-removed registration would poison the next attempt
    // under the same topic. On the happy path it ends up as the subscribe()
    // handle, which is what removeChannel wants.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase.channel(`flag_comments:${flagId}:${instanceId}`);
      channel = channel
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'flag_comments',
            filter: `flag_id=eq.${flagId}`,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            if (!mountedRef.current) return;
            if (payload.eventType === 'INSERT') {
              // Refetch to get the users(display_name) join — the realtime
              // payload only carries the raw row without joined columns.
              void fetch();
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id as string | undefined;
              if (deletedId) {
                setComments((prev) => prev.filter((c) => c.id !== deletedId));
              }
            }
          },
        )
        .subscribe();
    } catch (e) {
      // Deliberately swallowed. The thread itself is already loaded by `fetch`;
      // what is lost is live updates, and the user can still pull a refetch by
      // posting or reopening. Logged, not surfaced: there is no honest in-app
      // string for "live updates are off" that Sky has ratified.
      console.warn('[useComments] realtime subscribe failed:', errorMessage(e));
      if (channel) supabase.removeChannel(channel);
      channel = null;
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [active, flagId, instanceId, tableNotReady, fetch]);

  const addComment = useCallback(
    async (content: string) => {
      if (!flagId) return;
      // addCommentLib validates length and trims — let it throw; the caller
      // (FlagDetailModal) catches and shows an Alert.
      await addCommentLib(flagId, content);
      // Realtime INSERT event will trigger a refetch, but call it directly
      // here too so the comment appears immediately if realtime is slow.
      await fetch();
    },
    [flagId, fetch],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      // Optimistic local removal first so the UI feels instant.
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      try {
        await deleteCommentLib(commentId);
      } catch (e) {
        // Roll back the optimistic remove and surface the error.
        await fetch();
        throw e;
      }
    },
    [fetch],
  );

  return {
    comments,
    loading,
    error,
    tableNotReady,
    addComment,
    deleteComment,
    refetch: fetch,
  };
}
