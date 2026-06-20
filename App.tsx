import 'react-native-gesture-handler';
import { initSentry } from '@/lib/sentry';
initSentry();
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeContext';
import { AuthProvider, useAuth } from '@/lib/auth';
import { trackEvent } from '@/lib/analytics';
import { loadOnboarded, setOnboarded } from '@/lib/onboardingState';
import { getDefaultTab, type DefaultTab } from '@/lib/preferences';
import { fetchCurrentPoints, getLastSeenPoints, setLastSeenPoints } from '@/lib/points';
import { useAppFonts } from '@/lib/fonts';
import ErrorBoundary from '@/components/ErrorBoundary';
import FlashBanner from '@/components/FlashBanner';
import OnboardingCards from '@/components/OnboardingCards';
import RootNavigator from '@/navigation/RootNavigator';
import type { TakePendingUrl } from '@/navigation/linking';
import SignInScreen from '@/screens/SignInScreen';

function SignedInArea({ takePendingUrl }: { takePendingUrl?: TakePendingUrl }) {
  const { user } = useAuth();
  // We need the default tab BEFORE rendering RootNavigator, because the
  // tab navigator uses initialRouteName once. Hold render until we've read
  // the user's preference (or fallen back to 'Home').
  const [defaultTab, setDefaultTabState] = useState<DefaultTab | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDefaultTab(user.id).then((tab) => {
      if (cancelled) return;
      setDefaultTabState(tab);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // On sign-in (or initial app launch with an existing session), check
  // whether the reporter has earned points since we last looked. If so,
  // raise a single celebratory banner. This closes the feedback loop for
  // the case where someone ELSE acted on this user's flag while they
  // weren't in the app — without that, the points trigger silently
  // updates `public.users.points` and the reporter has no signal until
  // they happen to visit the Profile tab. See src/lib/points.ts for
  // the design rationale (no DB change needed, no Supabase Realtime).
  // F55 (re-sweep): key on the user ID, not the user OBJECT — supabase-js
  // emits TOKEN_REFRESHED ~hourly, auth.tsx setSession() produces a new user
  // identity each time, and this effect re-ran mid-session. Combined with the
  // watermark only advancing here, an hour of in-session triage produced a
  // false "+N points while you were away!" toast for points the user earned
  // (and was already congratulated for) IN the session. ProfileScreen now
  // also advances the watermark whenever it displays fresh points.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [current, lastSeen] = await Promise.all([
        fetchCurrentPoints(userId),
        getLastSeenPoints(userId),
      ]);
      if (cancelled || current === null) return;
      // First-ever observation: silently record so we don't celebrate
      // points the user already had. Subsequent positive deltas show.
      if (lastSeen === null) {
        await setLastSeenPoints(userId, current);
        return;
      }
      if (current > lastSeen) {
        const delta = current - lastSeen;
        setFlash(
          delta === 1
            ? 'You earned +1 point while you were away!'
            : `You earned +${delta} points while you were away!`,
        );
      }
      // Always advance the watermark — even if delta is zero or
      // (defensively) negative — so we don't re-fire on every launch.
      await setLastSeenPoints(userId, current);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Stable identity (F21): FlashBanner's auto-dismiss timer effect depends on
  // onDismiss; an inline arrow would change every render of SignedInArea (e.g.
  // a TOKEN_REFRESHED auth event), restarting the countdown and leaving the
  // banner up past its nominal duration.
  const handleFlashDismiss = useCallback(() => setFlash(null), []);

  if (defaultTab === null) return null;

  return (
    <>
      <RootNavigator initialRouteName={defaultTab} takePendingUrl={takePendingUrl} />
      <FlashBanner message={flash} onDismiss={handleFlashDismiss} />
    </>
  );
}

function Gate() {
  const { session, loading } = useAuth();
  // Guest mode: user dismissed sign-in to browse without an account.
  // Mirrors the web behaviour — read-only map, no points/onboarding.
  const [guestMode, setGuestMode] = useState(false);

  // L8: warm deep link while signed out. A share link tapped while the app
  // is ALREADY running on the native sign-in screen fires RN's 'url' event
  // with nobody listening — React Navigation only subscribes once a
  // NavigationContainer mounts, and Linking.getInitialURL() replays
  // cold-start URLs only — so the link used to vanish. Capture it here
  // (native + signed-out + non-guest is exactly the window where no
  // container is mounted) and let RootNavigator consume it on mount via
  // createLinking(takePendingUrl). Last link wins if several arrive.
  const pendingUrlRef = useRef<string | null>(null);
  const capturePending = Platform.OS !== 'web' && !session && !guestMode;
  useEffect(() => {
    if (!capturePending) return;
    const sub = Linking.addEventListener('url', ({ url }) => {
      pendingUrlRef.current = url;
    });
    return () => sub.remove();
  }, [capturePending]);

  // Consume-once getter: clearing on read keeps a stale link from re-firing
  // on a later sign-out → sign-in cycle. Stable identity so RootNavigator's
  // once-per-mount linking object never sees a dead closure.
  const takePendingUrl = useCallback(() => {
    const url = pendingUrlRef.current;
    pendingUrlRef.current = null;
    return url;
  }, []);

  if (loading) return null;

  if (session) return <SignedInArea takePendingUrl={takePendingUrl} />;

  // Web or native guest — read-only experience, no auth-gated features.
  if (Platform.OS === 'web' || guestMode) {
    return <RootNavigator initialRouteName="Home" takePendingUrl={takePendingUrl} />;
  }

  return <SignInScreen onGuest={() => setGuestMode(true)} />;
}

/**
 * Device-wide first-launch gate. Runs OUTSIDE the auth flow so a user
 * who hasn't signed up yet still gets a quick pitch for what the app
 * does. Uses src/lib/onboardingState.ts (key `@accessmap/onboarded_v1`).
 *
 * While we're reading AsyncStorage we render an empty surface — typical
 * read time is ~50ms, so this almost always flashes by. If onboarded is
 * `null` we render nothing rather than blink the real app for one frame.
 *
 * Once past the gate, the app continues to `Gate` for auth routing.
 */
function FirstLaunchGate({ children }: { children: React.ReactNode }) {
  // null = still loading, true = onboarded, false = needs the intro
  const [onboarded, setOnboardedState] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadOnboarded().then((seen) => {
      if (!cancelled) setOnboardedState(seen);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDone = useCallback(() => {
    // Fire-and-forget; the worst case on storage error is one extra showing.
    setOnboarded();
    setOnboardedState(true);
  }, []);

  if (onboarded === null) {
    // Loading — neutral surface so we don't flash the sign-in screen.
    return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
  }

  if (!onboarded) {
    return <OnboardingCards onDone={handleDone} />;
  }

  return <>{children}</>;
}

function App() {
  // Load design-system custom fonts. Non-blocking: if fontError is set we
  // continue with system fonts rather than blocking the app forever.
  // Fonts are bundled (~150KB) so they load quickly on first paint.
  const [fontsLoaded, fontError] = useAppFonts();

  // Analytics: one event per app launch. platform only — no PII. Runs once
  // on mount (App is wrapped by Sentry.wrap below, so Sentry is initialized).
  useEffect(() => {
    trackEvent('app_session_started', { platform: Platform.OS });
  }, []);

  // Hold render until fonts are ready (or failed). Typical delay: ~50-100ms
  // on device since TTFs are bundled. On font error, render immediately with
  // system fonts as fallback — never block the user indefinitely.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <FirstLaunchGate>
              <Gate />
            </FirstLaunchGate>
            <StatusBar style="auto" />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default App;
