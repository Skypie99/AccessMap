import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import RootNavigator from '@/navigation/RootNavigator';
import SignInScreen from '@/screens/SignInScreen';

function Gate() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return session ? <RootNavigator /> : <SignInScreen />;
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
