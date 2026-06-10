import { useCallback, useEffect, useRef, useState } from 'react';
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

export function useComments(flagId: string | null | undefined): UseCommentsResult {
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
  useEffect(() => {
    if (!flagId || tableNotReady) return;

    const channel = supabase
      .channel(`flag_comments:${flagId}`)
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [flagId, tableNotReady, fetch]);

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
