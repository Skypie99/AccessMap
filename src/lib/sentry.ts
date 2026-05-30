import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

// APP_ENV is injected by EAS build profiles (development / preview / production).
const environment = process.env.APP_ENV ?? 'development';

export function initSentry() {
  if (!dsn) {
    // No DSN configured — skip in local dev. Set EXPO_PUBLIC_SENTRY_DSN in .env to enable.
    return;
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    debug: __DEV__,
  });
}

export { Sentry };
