import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { hasSeenOnboarding, markOnboardingSeen } from '@/lib/onboarding';
import RootNavigator from '@/navigation/RootNavigator';
import SignInScreen from '@/screens/SignInScreen';
import OnboardingModal from '@/screens/OnboardingModal';

function SignedInArea() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // After the user is available, check whether they've seen the intro yet.
  // If not, show the modal — first-run only, gated per-user via AsyncStorage.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    hasSeenOnboarding(user.id).then((seen) => {
      if (!cancelled && !seen) setShowOnboarding(true);
    });
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

  return (
    <>
      <RootNavigator />
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
