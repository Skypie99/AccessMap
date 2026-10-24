// Native: React Native's own URL / URLSearchParams are incomplete and supabase-js
// builds every request URL with them, so the polyfill has to be installed before
// the client exists. supabase.ts imports this module first for exactly that.
// Web resolves urlPolyfill.web.ts instead; it explains why web skips it.
import 'react-native-url-polyfill/auto';
