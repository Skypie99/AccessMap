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

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetch = useCallback(async () => {
    if (!flagId) return;
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await listComments(flagId);
      if (!mountedRef.current) return;
      setComments(data);
      setTableNotReady(false);
    } catch (e) {
      if (!mountedRef.current) return;
      if (e instanceof CommentsTableNotReadyError) {
        setTableNotReady(true);
      } else {
        setError(errorMessage(e));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [flagId]);

  // Initial load + reload when flagId changes.
  useEffect(() => {
    setComments([]);
    setError(null);
    setTableNotReady(false);
    void fetch();
  }, [fetch]);

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
