/**
 * useNotificationPreferences — React hook for the push/alert notification
 * preference settings screen.
 *
 * Manages four distinct preference toggles that control WHICH kinds of
 * notifications the user wants to receive (push notifications, nearby-flag
 * alerts, watched-flag updates, bulk watch alerts). This is distinct from the
 * banner-prefs in src/lib/notificationPrefs.ts, which control WHICH flag
 * status transitions surface in the "Since your last visit" in-app banner.
 *
 * Persisted to AsyncStorage under a per-user key so preferences survive app
 * restarts. Fail-soft on read/write — missing or corrupt data defaults to
 * all-on (opt-out model, preserving prior behavior).
 *
 * Storage key: '@accessmap/push_notif_prefs_v1:{userId}'
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = '@accessmap/push_notif_prefs_v1:';

export interface NotificationPreferences {
  /** Notify when a flag the user reported changes status (open → verified, etc.) */
  flagStatusUpdates: boolean;
  /** Notify when a new accessibility flag is reported near the user's location */
  nearbyFlags: boolean;
  /** Notify when a flag on the user's watch list changes status */
  watchedFlagUpdates: boolean;
  /** Notify with a digest when many watched flags update at once */
  bulkWatchAlerts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Readonly<NotificationPreferences> = Object.freeze({
  flagStatusUpdates: true,
  nearbyFlags: true,
  watchedFlagUpdates: true,
  bulkWatchAlerts: true,
});

function storageKey(userId: string): string {
  return STORAGE_KEY_PREFIX + userId;
}

function parsePreferences(raw: unknown): NotificationPreferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
  const obj = raw as Record<string, unknown>;
  return {
    flagStatusUpdates: typeof obj.flagStatusUpdates === 'boolean' ? obj.flagStatusUpdates : true,
    nearbyFlags: typeof obj.nearbyFlags === 'boolean' ? obj.nearbyFlags : true,
    watchedFlagUpdates: typeof obj.watchedFlagUpdates === 'boolean' ? obj.watchedFlagUpdates : true,
    bulkWatchAlerts: typeof obj.bulkWatchAlerts === 'boolean' ? obj.bulkWatchAlerts : true,
  };
}

interface UseNotificationPreferencesResult {
  preferences: NotificationPreferences;
  setPreference: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => void;
  loading: boolean;
}

/**
 * Hook that loads notification preferences for the given userId from
 * AsyncStorage and returns helpers to read and update individual keys.
 *
 * If userId is null/undefined the hook still returns DEFAULT values and
 * setPreference is a no-op (user must be signed in to persist changes).
 */
export function useNotificationPreferences(
  userId: string | null | undefined,
): UseNotificationPreferencesResult {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => ({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  }));
  const [loading, setLoading] = useState(true);

  // Guard against state updates after the component that owns this hook
  // has unmounted (avoids the React "can't perform a state update on an
  // unmounted component" warning in tests and edge-case navigations).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Load from AsyncStorage on mount and whenever userId changes.
  useEffect(() => {
    if (!userId) {
      if (mountedRef.current) {
        setPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES });
        setLoading(false);
      }
      return;
    }

    let cancelled = false;

    const load = async () => {
      if (mountedRef.current) setLoading(true);
      try {
        const raw = await AsyncStorage.getItem(storageKey(userId));
        if (cancelled || !mountedRef.current) return;
        if (!raw) {
          setPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES });
        } else {
          setPreferences(parsePreferences(JSON.parse(raw)));
        }
      } catch {
        // Fail-soft: bad JSON or AsyncStorage failure → fall back to defaults.
        // Console.warn is intentional — callers should not see this under
        // normal operation, so a visible trace helps debugging without breaking UX.
        if (!cancelled && mountedRef.current) {
          setPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES });
        }
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setPreference = useCallback(
    <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
      if (!userId) return;

      // Functional update to avoid stale-closure bugs when multiple toggles
      // are changed in rapid succession (same pattern as NotificationPrefsModal).
      setPreferences((prev) => {
        const next: NotificationPreferences = { ...prev, [key]: value };
        // Fire-and-forget persist — optimistic UI already shows `next`.
        // Fail-soft on error (AsyncStorage write failures are ephemeral;
        // the next mount will re-read the on-disk state).
        AsyncStorage.setItem(storageKey(userId), JSON.stringify(next)).catch((e) => {
          // Fail-soft: the optimistic UI already shows `next` and the next mount
          // re-reads disk. Still warn so a persistent write failure is visible
          // (per CLAUDE.md error-handling tiers: ephemera write -> console.warn).
          console.warn('Failed to persist notification preferences', e);
        });
        return next;
      });
    },
    [userId],
  );

  return { preferences, setPreference, loading };
}
