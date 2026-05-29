import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { type FlagRealtimePayload, mergeFlagRealtimePayload } from './flagsRealtime';
import { supabase } from './supabase';
import type { FlagRow, FlagStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Offline cache helpers (Jordan-approved: Conditions 1–4 implemented)
// ---------------------------------------------------------------------------

/** Jordan Condition 2 — user-scoped key so no cross-user data leakage. */
export const offlineCacheKey = (userId: string): string => `@accessmap/offline_flags_v1:${userId}`;

/** Jordan Condition 3 — 24-hour TTL. */
export const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

/** The on-disk shape stored by the cache. */
interface OfflineCacheEntry {
  cachedAt: string; // ISO timestamp
  rows: FlagRow[]; // max INITIAL_PAGE_SIZE (Jordan Condition 4)
}

/**
 * Write the first INITIAL_PAGE_SIZE rows to AsyncStorage under the
 * user-scoped key. Failure is non-fatal (cache is ephemeral) — log + ignore.
 * Exported with a `__` prefix for unit tests only — not part of the public API.
 */
export async function __writeFlagsCache(userId: string, rows: FlagRow[]): Promise<void> {
  return writeFlagsCache(userId, rows);
}
async function writeFlagsCache(userId: string, rows: FlagRow[]): Promise<void> {
  const entry: OfflineCacheEntry = {
    cachedAt: new Date().toISOString(),
    // Jordan Condition 4 — cap at INITIAL_PAGE_SIZE.
    rows: rows.slice(0, INITIAL_PAGE_SIZE),
  };
  try {
    await AsyncStorage.setItem(offlineCacheKey(userId), JSON.stringify(entry));
  } catch (e) {
    console.warn('[flagsStore] cache write failed:', e);
  }
}

/**
 * Read the offline cache for a user. Returns null when:
 *   - no entry exists
 *   - the entry is older than MAX_CACHE_AGE_MS (Jordan Condition 3)
 *   - the entry can't be parsed (defensive read)
 * Failure is non-fatal — log + return null so the caller falls through
 * to the normal network path (CLAUDE.md AsyncStorage READ tier).
 * Exported with a `__` prefix for unit tests only — not part of the public API.
 */
export async function __readFlagsCache(userId: string): Promise<FlagRow[] | null> {
  return readFlagsCache(userId);
}
async function readFlagsCache(userId: string): Promise<FlagRow[] | null> {
  try {
    const raw = await AsyncStorage.getItem(offlineCacheKey(userId));
    if (!raw) return null;
    const entry = JSON.parse(raw) as OfflineCacheEntry;
    if (!entry || typeof entry.cachedAt !== 'string' || !Array.isArray(entry.rows)) {
      return null;
    }
    // Jordan Condition 3 — reject stale entries.
    if (Date.now() - Date.parse(entry.cachedAt) > MAX_CACHE_AGE_MS) {
      return null;
    }
    return entry.rows;
  } catch (e) {
    console.warn('[flagsStore] cache read failed:', e);
    return null;
  }
}

type FlagsContextValue = {
  flags: FlagRow[];
  /** O(1) lookup by flag id. Derived from `flags` via useMemo — use instead
   *  of `flags.find(f => f.id === id)` in hot paths or large flag sets. */
  flagsMap: Map<string, FlagRow>;
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
  // True when flags are served from the offline cache (network unavailable).
  // Screens use this to show an "Offline data" notice to the user.
  isOfflineCache: boolean;
};

const FlagsContext = createContext<FlagsContextValue | null>(null);

export function FlagsProvider({
  children,
  userId,
}: {
  children: React.ReactNode;
  /** The currently signed-in user's id, or null when unauthenticated.
   *  Used to scope the offline cache to the right user. */
  userId?: string | null;
}) {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [statuses, setStatusesState] = useState<FlagStatus[]>(DEFAULT_STATUSES);
  const [isOfflineCache, setIsOfflineCache] = useState(false);

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

  // Keep userId in a ref so refresh() can read the current user without
  // becoming a dependency (which would cause infinite re-refresh loops).
  const userIdRef = useRef<string | null | undefined>(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

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

    const currentUserId = userIdRef.current;
    // Use paginated fetch for the default open+verified set so we get a
    // fast first page and can load more on demand. For non-default status
    // sets (e.g. when Map filter includes Resolved) fall back to listFlags
    // which is simpler for one-shot queries.
    const isDefaultStatuses =
      current.length === DEFAULT_STATUSES.length &&
      current.every((s) => DEFAULT_STATUSES.includes(s));

    // Stale-while-revalidate: fire network + cache read in parallel so offline
    // users see cached data immediately rather than waiting for (timeout + read).
    // Only worth racing on the default-status path where we maintain a cache.
    const networkPromise: Promise<{ rows: FlagRow[]; nextCursor: string | null }> =
      isDefaultStatuses
        ? listFlagsPage(current, { limit: INITIAL_PAGE_SIZE })
        : listFlags(current).then((rows) => ({ rows, nextCursor: null }));

    const cachePromise: Promise<FlagRow[] | null> =
      isDefaultStatuses && currentUserId ? readFlagsCache(currentUserId) : Promise.resolve(null);

    try {
      const [networkResult, cachedResult] = await Promise.allSettled([
        networkPromise,
        cachePromise,
      ]);

      if (seq !== fetchSeqRef.current) return;

      if (networkResult.status === 'fulfilled') {
        const { rows: fetchedRows, nextCursor } = networkResult.value;
        cursorRef.current = nextCursor;
        setHasMore(nextCursor !== null);
        setFlags(fetchedRows);
        setIsOfflineCache(false);
        setError(null);
        // Write the fresh first page to the offline cache so it's available
        // on the next offline launch. Only cache when we have a user id
        // (Jordan Condition 2) and we fetched the default paginated set
        // (non-default queries are one-shot filtered views, not the main feed).
        if (currentUserId && isDefaultStatuses) {
          // Fire-and-forget — write failure is ephemeral, per CLAUDE.md tier.
          void writeFlagsCache(currentUserId, fetchedRows);
        }
      } else {
        // Network failed — try the cache that was already fetched in parallel.
        const cached = cachedResult.status === 'fulfilled' ? cachedResult.value : null;
        if (cached !== null && seq === fetchSeqRef.current) {
          setFlags(cached);
          setIsOfflineCache(true);
          setError(null);
          // Don't re-throw: the cached data satisfies the UI's need.
          // loading will be set false in finally.
        } else {
          if (seq !== fetchSeqRef.current) return;
          setError(errorMessage(networkResult.reason, 'Unknown error'));
          throw networkResult.reason;
        }
      }
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, []);

  // Ref-based in-flight guard for loadMore — avoids the race condition where a
  // second tap arrives between the first tap and React's state flush (at which
  // point the closure-captured `loadingMore` state value is still `false`).
  const loadingMoreRef = useRef(false);

  const loadMore = useCallback(async () => {
    // Guard: nothing to fetch, or a fetch is already in flight.
    if (cursorRef.current === null) return;
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
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
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flags' }, (raw) => {
        const evt = {
          eventType: raw.eventType,
          new: raw.new,
          old: raw.old,
        } as FlagRealtimePayload;
        setFlags((prev) => mergeFlagRealtimePayload(prev, evt, statusesRef.current));
      })
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

  // O(1) id → FlagRow lookup. Built once per `flags` change so consumers
  // avoid repeated O(n) `.find()` calls — especially valuable when
  // flags > 200 rows (e.g. bulk-select operations over large datasets).
  const flagsMap = useMemo(() => {
    const m = new Map<string, FlagRow>();
    flags.forEach((f) => m.set(f.id, f));
    return m;
  }, [flags]);

  const value = useMemo<FlagsContextValue>(
    () => ({
      flags,
      flagsMap,
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
      isOfflineCache,
    }),
    [
      flags,
      flagsMap,
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
      isOfflineCache,
    ],
  );

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
}

export function useFlags(): FlagsContextValue {
  const ctx = useContext(FlagsContext);
  if (!ctx) throw new Error('useFlags must be used inside <FlagsProvider>');
  return ctx;
}
