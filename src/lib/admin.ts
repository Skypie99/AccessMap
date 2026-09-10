import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Returns whether the current caller can use admin actions.
 * null = still loading, false = not admin or unauthenticated, true = admin.
 * A missing or refused authorization RPC fails closed and leaves a warning.
 */
export function useIsAdmin(): boolean | null {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setIsAdmin(false);
          return;
        }
        const { data, error } = await supabase.rpc('current_user_can_admin');
        if (error) {
          console.warn('[admin] authorization check failed, treating as non-admin.');
        }
        if (!cancelled) {
          setIsAdmin(!error && data === true);
        }
      } catch {
        console.warn('[admin] authorization check failed, treating as non-admin.');
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
