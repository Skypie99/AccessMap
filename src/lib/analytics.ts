// Analytics scaffold — currently a no-op stub.
//
// TODO: Replace the `track` implementation with a real analytics provider.
// Candidates mentioned in the Phase 2 strategy doc: Amplitude, Mixpanel.
// Install the SDK, call its .track() inside `track()` below, and add the
// API key to .env.example as EXPO_PUBLIC_ANALYTICS_KEY.

// ---------------------------------------------------------------------------
// Event catalog — extend here as new events are added.
// ---------------------------------------------------------------------------

export type AnalyticsEvent =
  | { name: 'flag_created'; props: { category: string; severity: number; hasPhoto: boolean } }
  | { name: 'flag_viewed'; props: { flagId: string; source: 'map' | 'tasks' } }
  | { name: 'flag_status_changed'; props: { flagId: string; from: string; to: string } }
  | { name: 'user_signed_in'; props: { method: 'email'; isNewUser: boolean } }
  | { name: 'push_notification_received'; props: { type: string } };

// ---------------------------------------------------------------------------
// Core tracking function
// ---------------------------------------------------------------------------

export function track<E extends AnalyticsEvent>(event: E['name'], props: Extract<AnalyticsEvent, { name: E['name'] }>['props']): void {
  if (__DEV__) {
    // Visible in the Metro console during local dev so you can verify events fire.
    // eslint-disable-next-line no-console
    console.log('[analytics]', event, props);
  }

  // TODO: forward to analytics provider, e.g.:
  // amplitude.track(event, props);
}

// ---------------------------------------------------------------------------
// Optional: identify the logged-in user so events are attributed correctly.
// ---------------------------------------------------------------------------

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics] identify', userId, traits);
  }

  // TODO: amplitude.identify(userId, traits);
}

export function resetUser(): void {
  // TODO: amplitude.reset();
}
