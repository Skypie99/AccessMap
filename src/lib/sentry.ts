import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initSentry() {
  if (!dsn) {
    // No DSN configured — skip in local dev. Set EXPO_PUBLIC_SENTRY_DSN in .env to enable.
    return;
  }

  Sentry.init({
    dsn,
    environment: Constants.expoConfig?.extra?.environment ?? 'development',
    // Capture 100% of transactions in dev; tune in production.
    tracesSampleRate: __DEV__ ? 0 : 0.1,
    debug: __DEV__,
  });
}

export { Sentry };
