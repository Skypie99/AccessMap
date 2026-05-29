/**
 * Shared-modals context (Cycle C, CL1).
 *
 * Before this lived, four full-screen modals were mounted TWICE — once in
 * ProfileScreen, once in SettingsScreen — because both screens have entry
 * points for them:
 *   - HelpModal
 *   - ChangelogModal
 *   - FeedbackModal (mounted in RootNavigator + Settings, not Profile)
 *   - MyFeedbackModal
 *
 * Each duplicate mount cost a separate `useState`, a separate `useEffect`
 * on the modal's `visible` change, and any subscriptions the modal opens.
 * It also creates a subtle state-desync risk: if the modal ever caches
 * something (e.g. last filter) in component state, the two instances
 * would diverge.
 *
 * The fix: a tiny context that holds a single `open` key. The four
 * modals are mounted ONCE at the navigator level (sibling of the tab
 * navigator) and read their `visible` from the context. Any screen can
 * open one with `useSharedModals().setOpen('help')` and close with
 * `setOpen(null)`.
 *
 * NotificationPrefsModal is deliberately NOT in this pool. The Profile
 * instance takes `initialPrefs` (seeded from Profile's already-loaded
 * `notificationPrefs` state) and an `onPrefsChanged` callback that
 * triggers `refreshUpdateCount` to recompute the banner count. That's
 * per-screen coupling — pulling it up to the navigator would either lose
 * the optimization or force the context to carry callback refs, which
 * would just relocate the duplication. So it stays per-screen, with the
 * trade-off documented inline in ProfileScreen.tsx.
 *
 * FlagDetailModal, AboutScreen, ReportFlagModal, AchievementsModal,
 * MyReportsModal, MyWatchedModal, ActivityFeedModal, UpdateBanner, and the
 * inline tier-explainer Modal all stay per-screen too — every one of
 * them takes per-screen state (the selected flag, the achievements
 * derivation, the reports refresh key, etc.).
 */
import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * Identifier for whichever shared modal is currently open, or null when
 * none is. Add a new key here when you lift another modal into the pool;
 * the union doubles as an exhaustiveness check at every callsite.
 */
export type SharedModalKey = 'help' | 'changelog' | 'feedback' | 'myFeedback' | null;

interface SharedModalsContextValue {
  /** The currently-open modal key, or null when nothing is open. */
  open: SharedModalKey;
  /**
   * Open a modal by key, or pass `null` to close the active one.
   * Only one shared modal can be open at a time — this matches the
   * old behavior where Profile/Settings only ever opened one of these
   * modals per tap.
   */
  setOpen: (key: SharedModalKey) => void;
}

const SharedModalsContext = createContext<SharedModalsContextValue | undefined>(undefined);

/**
 * Wrap the navigator (or any subtree that needs shared-modal access) in
 * this provider. RootNavigator does this once at the top, so every
 * screen + tab gets the same `open` slot.
 */
export function SharedModalsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<SharedModalKey>(null);
  // Stable identity for the context value so consumers don't re-render
  // every time the provider re-renders for unrelated reasons. Only
  // changes when `open` actually changes.
  const value = useMemo<SharedModalsContextValue>(() => ({ open, setOpen }), [open]);
  return <SharedModalsContext.Provider value={value}>{children}</SharedModalsContext.Provider>;
}

/**
 * Hook for screens to read/control the shared modal slot. Throws if
 * called outside a `<SharedModalsProvider>` so missing-provider bugs
 * surface immediately instead of silently no-opping.
 */
export function useSharedModals(): SharedModalsContextValue {
  const ctx = useContext(SharedModalsContext);
  if (!ctx) {
    throw new Error('useSharedModals must be used inside <SharedModalsProvider>');
  }
  return ctx;
}
