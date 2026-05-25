import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo } from 'react-native';
import { errorMessage } from './errors';
import {
  DEFAULT_STATUSES,
  INITIAL_PAGE_SIZE,
  NEXT_PAGE_SIZE,
  listFlags,
  listFlagsPage,
} from './flags';
import {
  type FlagRealtimePayload,
  mergeFlagRealtimePayload,
} from './flagsRealtime';
import { supabase } from './supabase';
import type { FlagRow, FlagStatus } from '@/types/database';

type FlagsContextValue = {
  flags: FlagRow[];
  loading: boolean;
  // Set when the last refresh failed. Cleared on a successful refresh.
  error: string | null;
  // Fetch a fresh first page using the current `statuses`. Resets the
  // cursor so loadMore starts from the top. Re-throws so callers can show
  // their own error UI in addition to the context error state.
  refresh: () => Promise<void>;
  // Append the next cursor page. No-op when !hasMore or already loading.
  // Re-throws on error so callers can surface failures.
  loadMore: () => Promise<void>;
  // True while a load-more fetch is in flight. Distinct from `loading`
  // (which is the first-page indicator).
  loadingMore: boolean;
  // True when the server might have more rows beyond what's loaded.
  // Flips to false once a page returns fewer rows than the limit.
  hasMore: boolean;
  // The statuses the provider is currently fetching. Map's filter drives
  // this; Tasks reads `flags` and filters locally to its triage subset.
  statuses: FlagStatus[];
  // Widen or narrow the server-side fetch. Triggers a refresh + resets pagination.
  setStatuses: (statuses: FlagStatus[]) => void;
  // Optimistic update helpers. Call refresh() after the server action
  // settles to reconcile with actual DB state.
  patchFlag: (id: string, patch: Partial<FlagRow>) => void;
  removeFlag: (id: string) => void;
};

const FlagsContext = createContext<FlagsContextValue | null>(null);

export function FlagsProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [statuses, setStatusesState] = useState<FlagStatus[]>(DEFAULT_STATUSES);

  // Latest statuses in a ref so refresh() has a stable identity but always
  // reads the freshest value at fetch time.
  const statusesRef = useRef<FlagStatus[]>(statuses);
  useEffect(() => {
    statusesRef.current = statuses;
  }, [statuses]);

  // Cursor lives in a ref because effects that depend on it (loadMore) would
  // otherwise re-create on every page boundary. State drives only what the
  // UI actually needs to re-render: hasMore + loadingMore.
  const cursorRef = useRef<string | null>(null);

  // Sequence tag — discards stale fetch responses if a newer one started
  // while the previous was in flight (rapid Map filter toggles).
  const fetchSeqRef = useRef(0);

  const refresh = useCallback(async () => {
    const current = statusesRef.current;
    // Empty status set → nothing to fetch.
    if (current.length === 0) {
      setFlags([]);
      cursorRef.current = null;
      setHasMore(false);
      setLoading(false);
      setError(null);
      return;
    }
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    try {
      // Use paginated fetch for the default open+verified set so we get a
      // fast first page and can load more on demand. For non-default status
      // sets (e.g. when Map filter includes Resolved) fall back to listFlags
      // which is simpler for one-shot queries.
      const isDefaultStatuses =
        current.length === DEFAULT_STATUSES.length &&
        current.every((s) => DEFAULT_STATUSES.includes(s));
      if (isDefaultStatuses) {
        const { rows, nextCursor } = await listFlagsPage(current, {
          limit: INITIAL_PAGE_SIZE,
        });
        if (seq !== fetchSeqRef.current) return;
        setFlags(rows);
        cursorRef.current = nextCursor;
        setHasMore(nextCursor !== null);
      } else {
        const rows = await listFlags(current);
        if (seq !== fetchSeqRef.current) return;
        setFlags(rows);
        cursorRef.current = null;
        setHasMore(false);
      }
      setError(null);
    } catch (e) {
      if (seq !== fetchSeqRef.current) return;
      setError(errorMessage(e, 'Unknown error'));
      throw e;
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    // Guard: nothing to fetch, or a fetch is already in flight.
    if (cursorRef.current === null) return;
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const { rows, nextCursor } = await listFlagsPage(statusesRef.current, {
        limit: NEXT_PAGE_SIZE,
        before: cursorRef.current,
      });
      // Defensive: skip rows we already have (in case a page-boundary tie
      // sneaks one through). Cheap O(n+m) merge for small page sizes.
      setFlags((prev) => {
        const seen = new Set(prev.map((f) => f.id));
        const additions = rows.filter((r) => !seen.has(r.id));
        return additions.length === 0 ? prev : [...prev, ...additions];
      });
      cursorRef.current = nextCursor;
      setHasMore(nextCursor !== null);
    } catch (e) {
      setError(errorMessage(e, 'Unknown error'));
      throw e;
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore]);

  const setStatuses = useCallback((next: FlagStatus[]) => {
    setStatusesState(next);
    // Resetting the cursor here is important: the new status set produces a
    // different result set, so any saved cursor would point into stale data.
    // refresh() will re-establish it after the first page arrives.
    cursorRef.current = null;
    setHasMore(false);
  }, []);

  // Re-fetch whenever the statuses change (including initial mount).
  useEffect(() => {
    refresh().catch(() => {});
  }, [statuses, refresh]);

  // iOS screen readers don't auto-announce React Native live-region banners,
  // so an explicit announce fires once per *new* error string. Both the Map
  // and Tasks error banners benefit without duplicating the effect.
  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  // Realtime: stays quiet until `supabase/realtime.sql` is applied (adds
  // public.flags to the supabase_realtime publication). Subscribing ahead
  // of time is safe — no events fire, no errors. Merges deltas through
  // the pure helper so it stays in lockstep with the active statuses
  // filter (a row whose status moves out of the filter is removed).
  useEffect(() => {
    const channel = supabase
      .channel('public-flags')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flags' },
        (raw) => {
          const evt = {
            eventType: raw.eventType,
            new: raw.new,
            old: raw.old,
          } as FlagRealtimePayload;
          setFlags((prev) =>
            mergeFlagRealtimePayload(prev, evt, statusesRef.current),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const patchFlag = useCallback((id: string, patch: Partial<FlagRow>) => {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const removeFlag = useCallback((id: string) => {
    setFlags((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const value = useMemo<FlagsContextValue>(
    () => ({
      flags,
      loading,
      error,
      refresh,
      loadMore,
      loadingMore,
      hasMore,
      statuses,
      setStatuses,
      patchFlag,
      removeFlag,
    }),
    [flags, loading, error, refresh, loadMore, loadingMore, hasMore, statuses, setStatuses, patchFlag, removeFlag],
  );

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
}

export function useFlags(): FlagsContextValue {
  const ctx = useContext(FlagsContext);
  if (!ctx) throw new Error('useFlags must be used inside <FlagsProvider>');
  return ctx;
}
