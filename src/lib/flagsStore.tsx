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
  fetchFlagById,
  listFlags,
  listFlagsPage,
} from './flags';
import { useRealtimeEnabled } from './realtimePrefs';
import { logRealtimeEvent } from './realtimeLog';
import { supabase } from './supabase';
import type { FlagRow, FlagStatus } from '@/types/database';

// ---------------------------------------------------------------------------
// Offline cache helpers (Jordan-approved: Conditions 1–4 implemented)
// ---------------------------------------------------------------------------

/** Jordan Condition 2 — user-scoped key so no cross-user data leakage. */
export const offlineCacheKey = (userId: string): string => `@accessmap/offline_flags_v1:${userId}`;

/** Jordan Condition 3 — 24-hour TTL. */
export const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Freshness window for `refreshIfStale`. A non-user-initiated refresh (e.g.
 * tapping a Tasks card to focus a flag on the Map) is skipped when the last
 * successful network fetch was under this old — the data on screen is already
 * good enough, so we avoid a redundant round-trip and the battery/radio cost
 * that comes with it. User-initiated refreshes (pull-to-refresh, the ⟳ button)
 * always go through `refresh()` and ignore this window.
 */
export const FLAGS_FRESH_MS = 30 * 1000;

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
  // Refresh only when the cached data is older than `maxAgeMs` (defaults to
  // FLAGS_FRESH_MS). For non-user-initiated entry points that shouldn't pay
  // for a network round-trip when the data on screen is already fresh.
  refreshIfStale: (maxAgeMs?: number) => Promise<void>;
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
  // D4 Safeguard #1 — viewport geofence registration.
  // MapScreen registers a callback here so the D4 realtime payload handler
  // can discard flags outside the current map viewport without the store
  // needing to know about map regions. Pass `null` to deregister (on unmount).
  setViewportGate: (gate: ((flag: FlagRow) => boolean) | null) => void;
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

  // D4 realtime opt-in, read reactively. When the user flips the toggle in
  // Profile, this value updates here too (shared listener registry), so the
  // subscription effect below re-runs — enabling subscribes immediately and
  // disabling tears the channel down, with no app restart required.
  const { realtimeEnabled } = useRealtimeEnabled();

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

  // Wall-clock of the last *successful network* fetch (0 = never). Drives
  // refreshIfStale so we can skip redundant round-trips while data is fresh.
  const lastFetchAtRef = useRef(0);

  // True once the provider has painted flags at least once (from the network
  // OR the offline cache). Gates the stale-while-revalidate cache paint to the
  // cold-start window only — on later refreshes we already have rows on screen
  // and revalidate silently in the background, with no cache-flicker.
  const hasHydratedRef = useRef(false);

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

    const startedAt = Date.now();
    const currentUserId = userIdRef.current;
    // Use paginated fetch for the default open+verified set so we get a
    // fast first page and can load more on demand. For non-default status
    // sets (e.g. when Map filter includes Resolved) fall back to listFlags
    // which is simpler for one-shot queries.
    const isDefaultStatuses =
      current.length === DEFAULT_STATUSES.length &&
      current.every((s) => DEFAULT_STATUSES.includes(s));

    // Kick off the network fetch immediately — we do NOT await it before
    // showing something to the user.
    const networkPromise: Promise<{ rows: FlagRow[]; nextCursor: string | null }> =
      isDefaultStatuses
        ? listFlagsPage(current, { limit: INITIAL_PAGE_SIZE })
        : listFlags(current).then((rows) => ({ rows, nextCursor: null }));

    // True stale-while-revalidate: on a COLD start, paint the cached first
    // page the instant the (fast, local) AsyncStorage read resolves — usually
    // well before the network does — so the map/list show data immediately
    // instead of a spinner. The network result below then reconciles. We gate
    // this to the cold-start window (hasHydratedRef) because once rows are on
    // screen, swapping in a possibly-staler cache would just be a flicker.
    let networkDone = false;
    const doSwrPaint = isDefaultStatuses && !!currentUserId && !hasHydratedRef.current;
    const cachePaint: Promise<void> = doSwrPaint
      ? readFlagsCache(currentUserId as string)
          .then((cached) => {
            if (seq !== fetchSeqRef.current || networkDone) return;
            if (cached && cached.length > 0) {
              // prev is [] on cold start, so this never clobbers live data.
              setFlags((prev) => (prev.length === 0 ? cached : prev));
              setIsOfflineCache(false); // optimistic — network is in flight
              setLoading(false);
              hasHydratedRef.current = true;
              if (__DEV__) {
                console.log(
                  `[flagsStore] SWR cache paint: ${cached.length} rows in ${Date.now() - startedAt}ms (cache hit)`,
                );
              }
            }
          })
          .catch(() => {})
      : Promise.resolve();

    try {
      const networkResult = await networkPromise.then(
        (value) => ({ ok: true as const, value }),
        (reason) => ({ ok: false as const, reason }),
      );
      networkDone = true;
      await cachePaint; // let the cache paint settle (it bows out on networkDone)

      if (seq !== fetchSeqRef.current) return;

      if (networkResult.ok) {
        const { rows: fetchedRows, nextCursor } = networkResult.value;
        cursorRef.current = nextCursor;
        setHasMore(nextCursor !== null);
        setFlags(fetchedRows);
        setIsOfflineCache(false);
        setError(null);
        lastFetchAtRef.current = Date.now();
        hasHydratedRef.current = true;
        if (__DEV__) {
          console.log(
            `[flagsStore] network refresh: ${fetchedRows.length} rows in ${Date.now() - startedAt}ms (cache miss / revalidate)`,
          );
        }
        // Write the fresh first page to the offline cache so it's available
        // on the next offline launch. Only cache when we have a user id
        // (Jordan Condition 2) and we fetched the default paginated set
        // (non-default queries are one-shot filtered views, not the main feed).
        if (currentUserId && isDefaultStatuses) {
          // Fire-and-forget — write failure is ephemeral, per CLAUDE.md tier.
          void writeFlagsCache(currentUserId, fetchedRows);
        }
      } else {
        // Network failed — fall back to the offline cache.
        const cached =
          isDefaultStatuses && currentUserId ? await readFlagsCache(currentUserId) : null;
        if (seq !== fetchSeqRef.current) return;
        if (cached !== null) {
          setFlags(cached);
          setIsOfflineCache(true);
          setError(null);
          hasHydratedRef.current = true;
          // Don't re-throw: the cached data satisfies the UI's need.
          // loading will be set false in finally.
        } else {
          setError(errorMessage(networkResult.reason, 'Unknown error'));
          throw networkResult.reason;
        }
      }
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, []);

  // Refresh only if the data is stale (older than `maxAgeMs`). Used by
  // non-user-initiated entry points — e.g. focusing a flag on the Map from a
  // Tasks card — so rapid navigation doesn't trigger a fresh network fetch of
  // data we already have. An explicit user refresh should call `refresh()`.
  const refreshIfStale = useCallback(
    async (maxAgeMs: number = FLAGS_FRESH_MS) => {
      const age = Date.now() - lastFetchAtRef.current;
      if (lastFetchAtRef.current !== 0 && age < maxAgeMs) {
        if (__DEV__) {
          console.log(`[flagsStore] refreshIfStale: skipped — data ${age}ms old (< ${maxAgeMs}ms)`);
        }
        return;
      }
      return refresh();
    },
    [refresh],
  );

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
    // Snapshot the fetch sequence (F12). If a refresh() starts while this page
    // is in flight — e.g. setStatuses() from a filter toggle, which resets the
    // cursor and re-fetches the first page of a DIFFERENT status set — it bumps
    // fetchSeqRef. We must then discard this stale page so we don't write an
    // old-status-set cursor over the fresh one (which would skip/duplicate rows
    // on the next loadMore).
    const seq = fetchSeqRef.current;
    try {
      const { rows, nextCursor } = await listFlagsPage(statusesRef.current, {
        limit: NEXT_PAGE_SIZE,
        before: cursorRef.current,
      });
      if (seq !== fetchSeqRef.current) return; // superseded by a refresh()
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
      // A stale failure (a refresh superseded us) shouldn't surface an error
      // banner over the fresh data.
      if (seq !== fetchSeqRef.current) return;
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

  // D4 Realtime (Option 2 — filtered broadcast, Safeguard #2 opt-in).
  //
  // Only subscribes when `realtime_enabled === true` (user opt-in stored in
  // AsyncStorage via realtimePrefs). When disabled the channel is torn down
  // immediately and an `unsubscribe` event is logged.
  //
  // Payload shape from the filtered publication: { new: {id, status}, old: {id} }.
  // We receive ONLY these two columns — lat/lng and other sensitive fields
  // are intentionally absent (Option 2 privacy posture, Dana spec).
  // After receiving a payload we re-fetch the full row via the existing
  // RLS-gated REST endpoint and merge it into local state.
  //
  // The viewport geofence (Safeguard #1) is enforced in MapScreen's own
  // `onRealtimeFlag` callback, which is passed down through context and
  // applied before any UI state update. This keeps the geographic
  // filtering co-located with the map region state that owns the bounds.
  //
  // Observability (Safeguard #3): logRealtimeEvent is called on SUBSCRIBED
  // and on channel teardown. It is fire-and-forget; a missing DB function
  // degrades gracefully to console.warn without breaking the subscribe flow.
  const D4_CHANNEL = 'flags-status';

  // Expose a ref so MapScreen can register a viewport-gate callback without
  // causing this effect to re-run. The callback returns `true` if the flag
  // should be accepted into local state, `false` to discard (outside viewport).
  // When no callback is registered (MapScreen not mounted), all flags pass.
  const viewportGateRef = useRef<((flag: FlagRow) => boolean) | null>(null);

  useEffect(() => {
    // Safeguard #2 — only subscribe when the user has opted in. Keyed on
    // `realtimeEnabled` (not []), so flipping the Profile toggle re-runs this
    // effect: enabling subscribes now; disabling runs the cleanup below and
    // returns early. No remount / app restart required (this was a dead toggle
    // before — the effect read the value once on mount and never re-ran).
    if (!realtimeEnabled) return;

    let mounted = true;
    const channel = supabase
      .channel(D4_CHANNEL)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flags' }, async (raw) => {
        // D4 Option 2: payload only carries {id, status}.
        // For DELETE events `new` is empty; identify by `old.id`.
        const flagId =
          (raw.new as { id?: string } | undefined)?.id ??
          (raw.old as { id?: string } | undefined)?.id;
        if (!flagId) return;

        if (raw.eventType === 'DELETE') {
          setFlags((prev) => prev.filter((f) => f.id !== flagId));
          return;
        }

        // Re-fetch the full row via RLS-gated REST endpoint.
        // Failure (deleted, permission denied, network) is non-fatal —
        // the next manual refresh will reconcile state.
        try {
          const freshFlag = await fetchFlagById(flagId);
          if (!freshFlag || !mounted) return;

          // Safeguard #1 — viewport geofence (delegated to MapScreen).
          const gate = viewportGateRef.current;
          if (gate && !gate(freshFlag)) return;

          // Merge into local state respecting the active status filter.
          setFlags((prev) => {
            const exists = prev.some((f) => f.id === freshFlag.id);
            if (!statusesRef.current.includes(freshFlag.status)) {
              return exists ? prev.filter((f) => f.id !== freshFlag.id) : prev;
            }
            if (exists) {
              return prev.map((f) => (f.id === freshFlag.id ? freshFlag : f));
            }
            const next = [freshFlag, ...prev];
            next.sort((a, b) => b.created_at.localeCompare(a.created_at));
            return next;
          });
        } catch {
          // Non-fatal: re-fetch silently failed. State stays as-is.
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void logRealtimeEvent('subscribe', D4_CHANNEL);
        }
      });

    return () => {
      mounted = false;
      // Single teardown (F22): removeChannel() calls unsubscribe() internally
      // then teardown(). Calling unsubscribe() separately too would send a
      // duplicate phx_leave. Log once removeChannel settles.
      void supabase.removeChannel(channel).then(() => {
        void logRealtimeEvent('unsubscribe', D4_CHANNEL);
      });
    };
  }, [realtimeEnabled]);

  const patchFlag = useCallback((id: string, patch: Partial<FlagRow>) => {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const removeFlag = useCallback((id: string) => {
    setFlags((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // D4 Safeguard #1 — stable setter so MapScreen's useEffect dep array stays clean.
  const setViewportGate = useCallback((gate: ((flag: FlagRow) => boolean) | null) => {
    viewportGateRef.current = gate;
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
      refreshIfStale,
      loadMore,
      loadingMore,
      hasMore,
      statuses,
      setStatuses,
      patchFlag,
      removeFlag,
      isOfflineCache,
      setViewportGate,
    }),
    [
      flags,
      flagsMap,
      loading,
      error,
      refresh,
      refreshIfStale,
      loadMore,
      loadingMore,
      hasMore,
      statuses,
      setStatuses,
      patchFlag,
      removeFlag,
      isOfflineCache,
      setViewportGate,
    ],
  );

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
}

export function useFlags(): FlagsContextValue {
  const ctx = useContext(FlagsContext);
  if (!ctx) throw new Error('useFlags must be used inside <FlagsProvider>');
  return ctx;
}
