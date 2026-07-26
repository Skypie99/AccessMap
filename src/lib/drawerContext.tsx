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
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { findNodeHandle, Platform, type NativeMethods } from 'react-native';

interface DrawerContextValue {
  /** Whether the hamburger drawer is currently open. */
  open: boolean;
  /** Open (`true`) or close (`false`) the single shared drawer. */
  setOpen: (open: boolean) => void;
  /**
   * D2/C3: record the node that is opening the drawer, so a screen reader can
   * be sent back to it when the drawer plainly closes (WCAG 2.4.3). Ref-backed
   * on purpose — noting which hamburger was pressed must never re-render the
   * header that owns it.
   */
  registerTrigger: (node: number | null) => void;
  /** The registered trigger's node handle, read at dismissal time. */
  triggerRef: React.RefObject<number | null>;
}

const DrawerContext = createContext<DrawerContextValue | undefined>(undefined);

/**
 * Wrap the navigator subtree once. RootNavigator does this alongside
 * SharedModalsProvider so every screen + header shares the same drawer slot.
 */
export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<number | null>(null);
  const registerTrigger = useCallback((node: number | null) => {
    triggerRef.current = node;
  }, []);
  // Stable identity so consumers don't re-render on unrelated provider
  // re-renders — only when `open` actually changes. `registerTrigger` and
  // `triggerRef` are both stable, so they never churn this.
  const value = useMemo<DrawerContextValue>(
    () => ({ open, setOpen, registerTrigger, triggerRef }),
    [open, registerTrigger],
  );
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

/**
 * D2/C3 — wire a hamburger button up for screen-reader focus return.
 *
 * Attach `ref` to the trigger and call `register()` in its `onPress`, before
 * opening the drawer. When the drawer later closes WITHOUT handing off to
 * another surface, it sends VoiceOver/TalkBack focus back here — otherwise
 * focus is stranded wherever the drawer used to be (WCAG 2.4.3 Focus Order).
 *
 * Unlike `useDrawer()` this NEVER throws outside a `<DrawerProvider>`: focus
 * return is an enhancement, and several headers are rendered bare in tests.
 * A missing provider simply means no return target.
 */
export function useDrawerTrigger<T extends React.Component<unknown> & NativeMethods>() {
  const ctx = useContext(DrawerContext);
  const ref = useRef<T>(null);
  const register = useCallback(() => {
    // `register()` runs INSIDE the trigger's onPress, immediately before
    // setOpen(true) — so anything that throws here stops the drawer from
    // opening at all. That is exactly what happened on the web build: RNW's
    // findNodeHandle THROWS ("findNodeHandle is not supported on web"), the
    // press handler aborted, and the hamburger became inert. Jest could not
    // see it (react-test-renderer implements findNodeHandle just fine) — a
    // browser capture caught it.
    //
    // Web is skipped by design, not merely defended: the whole point of the
    // handle is AccessibilityInfo.setAccessibilityFocus, which has no web
    // backend. The try/catch is the standing rule behind that — an
    // accessibility enhancement must never be able to break the primary
    // action, on any platform, ever.
    if (Platform.OS === 'web') return;
    try {
      ctx?.registerTrigger(ref.current ? findNodeHandle(ref.current) : null);
    } catch {
      // No return target this time; opening the drawer still matters more.
    }
  }, [ctx]);
  return { ref, register };
}

/**
 * The drawer's side of the same contract: read the registered trigger handle at
 * dismissal time. Also non-throwing — the drawer's own suites render it bare.
 */
export function useTriggerHandle(): React.RefObject<number | null> {
  const ctx = useContext(DrawerContext);
  const fallback = useRef<number | null>(null);
  return ctx?.triggerRef ?? fallback;
}
