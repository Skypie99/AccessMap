// Jest global setup — runs once before any test file.
//
// Stub Supabase env vars BEFORE any module that imports src/lib/supabase.ts
// is evaluated. The supabase module throws in __DEV__ if these are missing
// (so a fresh checkout fails loudly on the first screen) — in tests we just
// need it to load without exploding.
process.env.EXPO_PUBLIC_SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

// The AsyncStorage mock here is the official one shipped by the
// async-storage package; without it, tests that touch storage hit a
// "NativeModule null" error because there's no RN bridge in Node.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-image-manipulator is used by flags.ts (stripExifNative). Tests that
// import flags.ts indirectly need a stub so the module resolves in Node.
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({ uri: 'mocked-uri' }),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));
