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
import { DEFAULT_STATUSES, listFlags } from './flags';
import type { FlagRow, FlagStatus } from '@/types/database';

type FlagsContextValue = {
  flags: FlagRow[];
  loading: boolean;
  // Set when the last refresh failed. Cleared on a successful refresh.
  error: string | null;
  // Fetch a fresh list using the current `statuses`. Re-throws so callers
  // can show their own error UI in addition to the context error state.
  refresh: () => Promise<void>;
  // The statuses the provider is currently fetching. Map's filter drives
  // this; Tasks reads `flags` and filters locally to its triage subset.
  statuses: FlagStatus[];
  // Widen or narrow the server-side fetch. Triggers a refresh.
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
  const [statuses, setStatusesState] = useState<FlagStatus[]>(DEFAULT_STATUSES);

  // Latest statuses in a ref so refresh() has a stable identity but always
  // reads the freshest value at fetch time.
  const statusesRef = useRef<FlagStatus[]>(statuses);
  useEffect(() => {
    statusesRef.current = statuses;
  }, [statuses]);

  // Sequence tag — discards stale fetch responses if a newer one started
  // while the previous was in flight (rapid Map filter toggles).
  const fetchSeqRef = useRef(0);

  const refresh = useCallback(async () => {
    const current = statusesRef.current;
    // Empty status set → nothing to fetch.
    if (current.length === 0) {
      setFlags([]);
      setLoading(false);
      setError(null);
      return;
    }
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    try {
      const rows = await listFlags(current);
      if (seq !== fetchSeqRef.current) return;
      setFlags(rows);
      setError(null);
    } catch (e) {
      if (seq !== fetchSeqRef.current) return;
      setError(errorMessage(e, 'Unknown error'));
      throw e;
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, []);

  const setStatuses = useCallback((next: FlagStatus[]) => {
    setStatusesState(next);
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
      statuses,
      setStatuses,
      patchFlag,
      removeFlag,
    }),
    [flags, loading, error, refresh, statuses, setStatuses, patchFlag, removeFlag],
  );

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
}

export function useFlags(): FlagsContextValue {
  const ctx = useContext(FlagsContext);
  if (!ctx) throw new Error('useFlags must be used inside <FlagsProvider>');
  return ctx;
}
