import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import {
  getPushEnabled,
  requestExpoPushToken,
  savePushToken,
  showPushExplanation,
} from './pushNotifications';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** A first-time push explanation is waiting for a safe signed-in interaction. */
  pushEducationPending: boolean;
  /** Atomically consumes the pending explanation for the current sign-in cycle. */
  consumePendingPushEducation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  pushEducationPending: false,
  consumePendingPushEducation: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushEducationPending, setPushEducationPending] = useState(false);
  // Refs are the authority for async auth work. State alone can lag one render,
  // which is enough for rapid tab presses or a sign-out during a permission
  // surface to duplicate or misattribute token work.
  const activeUserIdRef = useRef<string | null>(null);
  const providerGenerationRef = useRef(0);
  const handledCycleUserIdRef = useRef<string | null>(null);
  const pendingPushUserIdRef = useRef<string | null>(null);

  const clearPendingPushEducation = useCallback(() => {
    pendingPushUserIdRef.current = null;
    setPushEducationPending(false);
  }, []);

  const isCurrentForGeneration = useCallback(
    (userId: string, operationGeneration: number) => {
      return (
        providerGenerationRef.current === operationGeneration &&
        activeUserIdRef.current === userId
      );
    },
    [],
  );

  const refreshPushToken = useCallback(async (userId: string, operationGeneration: number) => {
    try {
      const token = await requestExpoPushToken();
      if (!token || !isCurrentForGeneration(userId, operationGeneration)) return;
      await savePushToken(userId, token);
    } catch {
      // Push registration is best-effort — never surface errors to the user.
    }
  }, [isCurrentForGeneration]);

  const refreshEnabledPushForCurrentUser = useCallback(async (userId: string) => {
    const operationGeneration = providerGenerationRef.current;
    try {
      const enabled = await getPushEnabled(userId);
      if (!enabled || !isCurrentForGeneration(userId, operationGeneration)) return;
      await refreshPushToken(userId, operationGeneration);
    } catch {
      // Push registration is best-effort — never surface errors to the user.
    }
  }, [isCurrentForGeneration, refreshPushToken]);

  const preparePushForSignedInCycle = useCallback(async (userId: string) => {
    const operationGeneration = providerGenerationRef.current;
    try {
      const enabled = await getPushEnabled(userId);
      if (!isCurrentForGeneration(userId, operationGeneration)) return;
      if (enabled) {
        await refreshPushToken(userId, operationGeneration);
        return;
      }

      if (!isCurrentForGeneration(userId, operationGeneration)) return;
      pendingPushUserIdRef.current = userId;
      setPushEducationPending(true);
    } catch {
      // A failed preference read must not turn into an unexpected OS prompt.
    }
  }, [isCurrentForGeneration, refreshPushToken]);

  const consumePendingPushEducation = useCallback(async () => {
    const operationGeneration = providerGenerationRef.current;
    const userId = pendingPushUserIdRef.current;
    if (!userId || !isCurrentForGeneration(userId, operationGeneration)) return;

    // Spend the opportunity before any async work. A second tab press, queued
    // interaction callback, or foreground transition now observes no pending
    // user and is an idempotent no-op.
    pendingPushUserIdRef.current = null;
    setPushEducationPending(false);

    try {
      // Settings may have completed enablement while this opportunity waited.
      // In that case its token path already ran, so education has nothing to do.
      if (await getPushEnabled(userId)) return;
      if (!isCurrentForGeneration(userId, operationGeneration)) return;
      const confirmed = await showPushExplanation();
      if (!confirmed || !isCurrentForGeneration(userId, operationGeneration)) return;
      await refreshPushToken(userId, operationGeneration);
    } catch {
      // Education and registration are best-effort; Settings remains available.
    }
  }, [isCurrentForGeneration, refreshPushToken]);

  useEffect(() => {
    // Always flip `loading` off — even if getSession rejects (offline at
    // launch, Supabase unreachable, JWT decode error). Otherwise the auth
    // gate sits on a blank screen forever. Session stays null on failure,
    // so the gate falls through to SignInScreen.
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } catch (err) {
        console.warn('[auth] getSession failed:', err);
      } finally {
        setLoading(false);
      }
    })();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      const userId = next?.user.id ?? null;
      activeUserIdRef.current = userId;

      if (!userId) {
        handledCycleUserIdRef.current = null;
        clearPendingPushEducation();
      } else if (event === 'INITIAL_SESSION') {
        // A persisted session owns the current cycle and is always silent. Mark
        // it handled so a duplicate SIGNED_IN event cannot create education.
        handledCycleUserIdRef.current = userId;
        clearPendingPushEducation();
        void refreshEnabledPushForCurrentUser(userId);
      } else if (event === 'SIGNED_IN' && handledCycleUserIdRef.current !== userId) {
        // Record the cycle before starting async work so duplicate auth events
        // for the same user cannot race into two prompts or token refreshes.
        handledCycleUserIdRef.current = userId;
        clearPendingPushEducation();
        void preparePushForSignedInCycle(userId);
      }
    });

    return () => {
      providerGenerationRef.current += 1;
      subscription.subscription.unsubscribe();
    };
  }, [
    clearPendingPushEducation,
    preparePushForSignedInCycle,
    refreshEnabledPushForCurrentUser,
  ]);

  // Memoize the context value so consumers re-render only for auth/loading or
  // pending-education changes (user derives from session; consume is stable).
  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      pushEducationPending,
      consumePendingPushEducation,
    }),
    [session, loading, pushEducationPending, consumePendingPushEducation],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
