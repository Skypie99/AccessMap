import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import {
  fetchCurrentPoints,
  getLastSeenPoints,
  setLastSeenPoints,
} from '@/lib/points';
import FlashBanner from '@/components/FlashBanner';
import RootNavigator from '@/navigation/RootNavigator';
import SignInScreen from '@/screens/SignInScreen';

function SignedInArea() {
  const { user } = useAuth();
  const [flash, setFlash] = useState<string | null>(null);

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

  return (
    <>
      <RootNavigator />
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
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
