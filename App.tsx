import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/theme/ThemeContext';
import { AuthProvider, useAuth } from '@/lib/auth';
import { hasSeenOnboarding, markOnboardingSeen } from '@/lib/onboarding';
import { loadOnboarded, setOnboarded } from '@/lib/onboardingState';
import { getDefaultTab, type DefaultTab } from '@/lib/preferences';
import {
  fetchCurrentPoints,
  getLastSeenPoints,
  setLastSeenPoints,
} from '@/lib/points';
import ErrorBoundary from '@/components/ErrorBoundary';
import FlashBanner from '@/components/FlashBanner';
import OnboardingCards from '@/components/OnboardingCards';
import RootNavigator from '@/navigation/RootNavigator';
import SignInScreen from '@/screens/SignInScreen';
import OnboardingModal from '@/screens/OnboardingModal';

function SignedInArea() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  // We need the default tab BEFORE rendering RootNavigator, because the
  // tab navigator uses initialRouteName once. Hold render until we've read
  // the user's preference (or fallen back to 'Map').
  const [defaultTab, setDefaultTabState] = useState<DefaultTab | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // Read onboarding + preferred-tab in parallel; both gate first render.
    Promise.all([hasSeenOnboarding(user.id), getDefaultTab(user.id)]).then(
      ([seen, tab]) => {
        if (cancelled) return;
        if (!seen) setShowOnboarding(true);
        setDefaultTabState(tab);
      },
    );
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
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [current, lastSeen] = await Promise.all([
        fetchCurrentPoints(user.id),
        getLastSeenPoints(user.id),
      ]);
      if (cancelled || current === null) return;
      // First-ever observation: silently record so we don't celebrate
      // points the user already had. Subsequent positive deltas show.
      if (lastSeen === null) {
        await setLastSeenPoints(user.id, current);
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
      await setLastSeenPoints(user.id, current);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleDone = useCallback(() => {
    if (user) {
      // Fire-and-forget: storage error just means they see the intro once
      // more next session, which is fine.
      markOnboardingSeen(user.id);
    }
    setShowOnboarding(false);
  }, [user]);

  if (defaultTab === null) return null;

  return (
    <>
      <RootNavigator initialRouteName={defaultTab} />
      <OnboardingModal visible={showOnboarding} onDone={handleDone} />
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
    </>
  );
}

function Gate() {
  const { session, loading } = useAuth();
  // Guest mode: user dismissed sign-in to browse without an account.
  // Mirrors the web behaviour — read-only map, no points/onboarding.
  const [guestMode, setGuestMode] = useState(false);

  if (loading) return null;

  if (session) return <SignedInArea />;

  // Web or native guest — read-only map, no auth-gated features.
  if (Platform.OS === 'web' || guestMode) {
    return <RootNavigator initialRouteName="Map" />;
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
 * Distinct from per-user `OnboardingModal` inside `SignedInArea`, which
 * stays exactly as it was.
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

export default function App() {
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
