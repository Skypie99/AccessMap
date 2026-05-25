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
  const message =
    'Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.';
  console.warn(message);
  // In dev, fail loudly so the very first screen tells you exactly what's
  // wrong instead of every query silently 401-ing. Production keeps the
  // warn-and-continue behavior so a missing env doesn't crash a shipped app.
  if (__DEV__) {
    throw new Error(message);
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On web, detect OAuth redirects embedded in the URL hash/query.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}
