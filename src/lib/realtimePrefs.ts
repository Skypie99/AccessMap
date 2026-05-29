/**
 * D4: Realtime opt-in preference (Safeguard #2).
 *
 * Stores a per-device boolean under AsyncStorage key `realtime_enabled`.
 * Default is `false` — users must opt in before any Supabase Realtime
 * subscription is established.
 *
 * `useRealtimeEnabled()` is a React hook that returns the current value
 * reactively: when one call site writes, all mounted consumers re-render.
 * This works because we maintain a module-level Set of listener callbacks
 * that each hook instance registers and deregisters.
 *
 * Design note: we intentionally keep this out of the FlagsProvider/Context
 * so it can be read by MapScreen without taking on the full flags context
 * dependency, and written by ProfileScreen without reaching into the store.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'realtime_enabled';

// Module-level listener registry — updated by the single writer
// (ProfileScreen toggle), consumed by all mounted hook instances.
const listeners = new Set<(enabled: boolean) => void>();

function notifyListeners(value: boolean): void {
  for (const cb of listeners) {
    cb(value);
  }
}

/** Load from AsyncStorage. Returns `false` if no stored value. */
export async function loadRealtimeEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

/**
 * Persist the user's preference and broadcast to all hook instances.
 * Call this from ProfileScreen when the toggle changes.
 * Throws on AsyncStorage write failure (user-facing — data loss if we
 * silently ignore a persist failure here).
 */
export async function saveRealtimeEnabled(value: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  notifyListeners(value);
}

/**
 * React hook that returns the current `realtime_enabled` preference and
 * a setter. Reactive: updates whenever `saveRealtimeEnabled` is called
 * from anywhere in the tree.
 */
export function useRealtimeEnabled(): {
  realtimeEnabled: boolean;
  setRealtimeEnabled: (value: boolean) => Promise<void>;
} {
  const [realtimeEnabled, setLocalValue] = useState(false);

  // Hydrate from disk on mount.
  useEffect(() => {
    let cancelled = false;
    void loadRealtimeEnabled().then((v) => {
      if (!cancelled) setLocalValue(v);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to cross-component updates (e.g. ProfileScreen toggle while
  // MapScreen is mounted in the background tab).
  useEffect(() => {
    listeners.add(setLocalValue);
    return () => {
      listeners.delete(setLocalValue);
    };
  }, []);

  const setRealtimeEnabled = useCallback(async (value: boolean) => {
    await saveRealtimeEnabled(value);
  }, []);

  return { realtimeEnabled, setRealtimeEnabled };
}
