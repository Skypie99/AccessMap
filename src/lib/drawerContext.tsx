/**
 * Drawer-open context (Phase 7a).
 *
 * The hamburger drawer used to be rendered inline by `renderHamburger` in
 * RootNavigator — button + <HamburgerDrawer> together — and wired only to the
 * Map screen's header. Phase 7a moves to a 3-tab editorial layout where the
 * menu button needs to live in MULTIPLE places: the new Home screen's own
 * editorial header (no nav-bar header there) AND the Tasks/Profile headers.
 *
 * Reusing `renderHamburger` on several headers would mount several
 * <HamburgerDrawer> instances bound to the same boolean — wasteful and a
 * state-desync footgun. The fix mirrors the existing SharedModalsContext
 * pattern (src/lib/sharedModalsContext.tsx): a tiny context holds one `open`
 * flag, the drawer is mounted ONCE at the navigator level, and any header /
 * screen opens it with `useDrawer().setOpen(true)`.
 */
import React, { createContext, useContext, useMemo, useState } from 'react';

interface DrawerContextValue {
  /** Whether the hamburger drawer is currently open. */
  open: boolean;
  /** Open (`true`) or close (`false`) the single shared drawer. */
  setOpen: (open: boolean) => void;
}

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

/**
 * Wrap the navigator subtree once. RootNavigator does this alongside
 * SharedModalsProvider so every screen + header shares the same drawer slot.
 */
export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // Stable identity so consumers don't re-render on unrelated provider
  // re-renders — only when `open` actually changes.
  const value = useMemo<DrawerContextValue>(() => ({ open, setOpen }), [open]);
  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}

/**
 * Read/control the shared drawer. Throws outside a <DrawerProvider> so a
 * missing-provider bug surfaces immediately instead of silently no-opping.
 */
export function useDrawer(): DrawerContextValue {
  const ctx = useContext(DrawerContext);
  if (!ctx) {
    throw new Error('useDrawer must be used inside <DrawerProvider>');
  }
  return ctx;
}
