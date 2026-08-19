import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Returns whether the currently authenticated user has is_admin = true.
 * null = still loading, false = not admin or unauthenticated, true = admin.
 *
 * Degrades gracefully when supabase/migrations/2026-05-30_admin_role.sql
 * has not been applied yet (column absent → treats as false, never throws).
 *
 * NOTE: this hook cannot make the Admin tab appear on its own. The read itself
 * is refused unless `authenticated` holds a SELECT grant on users.is_admin —
 * see the comment on the error branch below. Granting a user is_admin = true
 * without that column grant changes nothing visible.
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
        const { data, error } = await supabase
          .from('users')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        // Say something when the read fails. Dropping `error` on the floor is
        // how this gate stayed broken and silent for months: `authenticated`
        // had no SELECT grant on users.is_admin (the 2026-05-27 email-privacy
        // migration listed columns three days before is_admin existed), so this
        // returned 42501 every time and the `?? false` below turned that into a
        // clean-looking "not an admin". The grant went live 2026-08-18, so a
        // 42501 here would now mean a real regression. Degrading to false is
        // still right — a gate that fails open is worse — but it should never
        // again do so without leaving a trace.
        if (error) {
          console.warn('[admin] is_admin read failed, treating as non-admin:', error.message);
        }
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
