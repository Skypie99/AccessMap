import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Returns whether the currently authenticated user has is_admin = true.
 * null = still loading, false = not admin or unauthenticated, true = admin.
 *
 * Degrades gracefully when supabase/migrations/2026-05-30_admin_role.sql
 * has not been applied yet (column absent → treats as false, never throws).
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
        const { data } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        if (!cancelled) {
          setIsAdmin((data as { is_admin?: boolean } | null)?.is_admin ?? false);
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
