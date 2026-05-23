import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { listFlags } from './flags';
import type { FlagRow } from '@/types/database';

type FlagsContextValue = {
  flags: FlagRow[];
  loading: boolean;
  // Set when the last refresh failed. Cleared on a successful refresh.
  error: string | null;
  // Fetch a fresh open+verified list. Re-throws so callers can show their
  // own error UI in addition to the context error state.
  refresh: () => Promise<void>;
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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listFlags(['open', 'verified']);
      setFlags(rows);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const patchFlag = useCallback((id: string, patch: Partial<FlagRow>) => {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const removeFlag = useCallback((id: string) => {
    setFlags((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return (
    <FlagsContext.Provider value={{ flags, loading, error, refresh, patchFlag, removeFlag }}>
      {children}
    </FlagsContext.Provider>
  );
}

export function useFlags(): FlagsContextValue {
  const ctx = useContext(FlagsContext);
  if (!ctx) throw new Error('useFlags must be used inside <FlagsProvider>');
  return ctx;
}
