import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
}

// Best-effort push token registration. Never throws — all failures are silent.
// promptIfNew: true on active sign-in (may show PIPEDA explanation);
//              false on session restore (never prompts, re-registers silently if previously enabled).
async function registerPushToken(userId: string, promptIfNew: boolean): Promise<void> {
  try {
    const alreadyEnabled = await getPushEnabled(userId);
    if (!alreadyEnabled) {
      if (!promptIfNew) return;
      const confirmed = await showPushExplanation();
      if (!confirmed) return;
    }
    const token = await requestExpoPushToken();
    if (!token) return;
    await savePushToken(userId, token);
  } catch {
    // Push registration is best-effort — never surface errors to the user.
  }
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (next?.user) {
        if (event === 'SIGNED_IN') {
          // Active sign-in: show PIPEDA explanation if first time, then register.
          void registerPushToken(next.user.id, true);
        } else if (event === 'INITIAL_SESSION') {
          // App restart with persisted session: re-register silently if previously enabled.
          void registerPushToken(next.user.id, false);
        }
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Memoize the context value so consumers don't re-render on every AuthProvider
  // render — only when session or loading actually changes (user derives from session).
  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading }),
    [session, loading],
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
