import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import type { Database } from '@/types/database';

// On web, supabase-js defaults to localStorage when no storage adapter is
// provided, which is exactly what we want. On native, we hand it AsyncStorage
// so sessions survive app restarts. Using a single conditional keeps the client
// initialisation in one place and avoids a separate *.web.ts file.
const authStorage =
  Platform.OS === 'web'
    ? undefined // supabase-js uses localStorage automatically
    : AsyncStorage;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY — locally in .env, and in EAS via `eas env:create`.',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On web, detect OAuth redirects embedded in the URL hash/query.
    detectSessionInUrl: Platform.OS === 'web',
    // IO-2 (security audit 2026-07-31) — WEB SESSION INJECTION.
    //
    // auth-js defaults `flowType` to 'implicit'. With `detectSessionInUrl` on,
    // the web build accepts an access token straight out of the URL hash: it
    // verifies the token is valid for THIS project, but not that this browser
    // ever asked for it. So a crafted link silently signs the victim into the
    // ATTACKER'S account, and every report the victim then files — with their
    // GPS location — lands in the attacker's account.
    //
    // PKCE closes it: the link carries `?code=…` and redemption needs a
    // `code_verifier` that only the browser which started sign-up holds, so an
    // attacker-supplied link is unredeemable.
    //
    // ★ WEB ONLY, deliberately. This client is shared with native, and native
    // has no path to complete a PKCE flow: the verifier would sit in the app's
    // AsyncStorage while the confirmation email opens in the phone's system
    // browser, and there is no auth deep-link route to hand the code back
    // (the linking config declares only `FullMap: 'flag/:flagId?'`). Setting
    // this globally would leave native sign-up confirmation unredeemable
    // anywhere. Web is also the only surface where the hole is reachable at
    // all — there is no URL hash to inject on native.
    //
    // The cost on web is real and is Sky's to accept: the confirmation email
    // must be opened in the same browser that started sign-up.
    //
    // Not `detectSessionInUrl: false` — that would close the hole by breaking
    // "click the link → land signed in", which the sign-up flow depends on
    // (SignInScreen tells the user to go open that link).
    flowType: Platform.OS === 'web' ? 'pkce' : 'implicit',
  },
});

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut(userId?: string) {
  // Centralising here means every sign-out path (Profile, Settings, future
  // screens) automatically clears both the offline flag cache AND the push
  // token without needing to remember either call separately.
  if (userId) {
    // Clear offline cache (Jordan offline-cache Condition 1).
    // Key mirrors offlineCacheKey() in flagsStore — kept inline here to avoid
    // a circular dep (flagsStore imports supabase). If the key scheme ever
    // changes, update both places.
    try {
      await AsyncStorage.removeItem(`@accessmap/offline_flags_v1:${userId}`);
    } catch (e) {
      console.warn('[signOut] offline cache clear failed (silent):', e);
    }
    // Clear tile cache (Jordan offline-tiles Condition 1).
    try {
      const { clearTileCache } = await import('./tileCache');
      await clearTileCache(userId);
    } catch (e) {
      console.warn('[signOut] tile cache clear failed (silent):', e);
    }
    // Clear push token (Jordan push-notifs Condition 5)
    try {
      const { deletePushToken } = await import('./pushNotifications');
      await deletePushToken(userId);
    } catch (e) {
      console.warn('[signOut] push token clear failed (silent):', e);
    }
  }
  // PL-2 / IO-5 (security audit 2026-07-31) — CACHE STORAGE SURVIVES SIGN-OUT.
  //
  // On web the service worker caches every successful GET to Supabase, which
  // includes PostgREST rows: the flags this user reported, with lat/lng and
  // description. `signOut` cleared AsyncStorage, the tile cache and the push
  // token — a deliberate teardown that simply never learned about Cache
  // Storage, because nothing in src/ has ever touched it. So a signed-out
  // browser still holds the previous user's reported locations, and the
  // offline fallback can serve them to whoever signs in next (the Cache API
  // keys on URL; the Authorization header is not part of the key).
  //
  // ★ Outside the `if (userId)` block on purpose. Cache Storage is
  // origin-scoped, not user-scoped, so there is nothing to key on — and every
  // caller that does `void signOut()` with no argument would otherwise skip
  // the purge entirely, which is most of them.
  //
  // ★ Swept by prefix, not by name. The names are computed
  // (`'accessmap-' + CACHE_VERSION`), so a hardcoded delete would silently
  // stop working the next time anyone bumps the version — the failure mode
  // being a purge that looks like it ran and did nothing.
  if (typeof caches !== 'undefined') {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('accessmap-')).map((k) => caches.delete(k)),
      );
    } catch (e) {
      console.warn('[signOut] cache storage clear failed (silent):', e);
    }
  }

  // F50 (re-sweep): supabase.auth.signOut() errors were ignored by every
  // caller (`void signOut(...)`) — an offline tap on Sign out cleared the
  // caches above, then SILENTLY left the session alive. Surface the failure.
  //
  // Second-sweep correction (F63): in the installed @supabase/auth-js,
  // signOut({ scope: 'local' }) ALSO posts to /logout and returns the error
  // BEFORE removing the local session (only 401/403/404 API errors are
  // ignored) — so a fully offline device cannot complete ANY sign-out
  // variant. The retry below helps transient/server-error cases only; the
  // honest offline UX is the failure message. A true offline local sign-out
  // requires auth-machinery surgery (manual session-storage removal +
  // synthesizing SIGNED_OUT) and is proposed in DECISIONS FOR SKY instead.
  const result = await supabase.auth.signOut();
  if (result.error) {
    console.warn('[signOut] sign-out failed; retrying with local scope:', result.error.message);
    const local = await supabase.auth.signOut({ scope: 'local' });
    const { notify } = await import('./confirm');
    if (local.error) {
      notify(
        "Couldn't sign you out",
        'Please check your connection and try again. (Your cached map data on this device has already been cleared.)',
      );
      return result;
    }
    notify(
      'Signed out on this device',
      'Note: the server session could not be revoked from here; it remains valid until it expires.',
    );
    return local;
  }
  return result;
}
