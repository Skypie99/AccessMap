import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { hasSeenOnboarding, markOnboardingSeen } from '@/lib/onboarding';
import { getDefaultTab, type DefaultTab } from '@/lib/preferences';
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
    </>
  );
}

function Gate() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return session ? <SignedInArea /> : <SignInScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Gate />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
