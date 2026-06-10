import { useCallback, useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// Feature flag definitions
//
// Local implementation only — flags live in this file and are toggled at
// build/deploy time via the overrides map below.
//
// TODO: Replace with a real feature flag service (LaunchDarkly or Firebase
// Remote Config are mentioned in the Phase 2 strategy). The public API
// (useFeatureFlag / isEnabled) would remain the same; swap out the store.
// ---------------------------------------------------------------------------

export type FeatureFlagKey =
  | 'HEATMAP_ENABLED'
  | 'PUSH_NOTIFICATIONS_ENABLED'
  | 'GUEST_SIGNIN_ENABLED'
  | 'PUSH_NOTIF_TYPES_ENABLED';

/** Default values. Change these here or via `setFlag()` at runtime in dev. */
const DEFAULTS: Record<FeatureFlagKey, boolean> = {
  HEATMAP_ENABLED: true,
  PUSH_NOTIFICATIONS_ENABLED: true,
  // Defaults false — guest access is gated at the App.tsx level; setting this
  // true here would allow any future isEnabled() check to admit unauthenticated
  // users before the full guest-auth flow has been audited and RLS-verified.
  GUEST_SIGNIN_ENABLED: false,
  // Defaults false — hides the "Push notification types" row in Settings
  // (NotificationPreferencesScreen). The screen saves per-category prefs to
  // '@accessmap/push_notif_prefs_v1:{userId}', but NOTHING in the push
  // pipeline reads that key yet, so the choices have no effect. Showing the
  // UI would be a lie to the user (Sky Decision 2, Option B: hide, don't
  // wire). Flip to true when the push pipeline wiring lands.
  PUSH_NOTIF_TYPES_ENABLED: false,
};

// ---------------------------------------------------------------------------
// Internal store — a plain object + subscriber list (no external dep needed).
// ---------------------------------------------------------------------------

let state: Record<FeatureFlagKey, boolean> = { ...DEFAULTS };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns `true` if the flag is enabled. Reactive — re-renders on change. */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const flags = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return flags[key];
}

/** Non-hook read — use in non-component contexts (event handlers, utils). */
export function isEnabled(key: FeatureFlagKey): boolean {
  return state[key];
}

/**
 * Override a flag at runtime (dev/test only). Not for production use — the
 * override is in-memory and resets on app reload.
 */
export function setFlag(key: FeatureFlagKey, value: boolean): void {
  if (!__DEV__) return;
  state = { ...state, [key]: value };
  notify();
}

/** Reset all flags to their compiled defaults (useful in tests). */
export function resetFlags(): void {
  state = { ...DEFAULTS };
  notify();
}
