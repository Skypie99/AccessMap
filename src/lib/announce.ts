import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Web announce-shim for the accessibility engine (S9, facet b).
 *
 * `react-native-web@0.21.2` ships `AccessibilityInfo.announceForAccessibility`
 * as an empty no-op (dist/exports/AccessibilityInfo/index.js) — so the ~50
 * existing `announceForAccessibility(...)` call sites are silent on web, the
 * only surface a guest has. There is no DOM API to speak a one-off string; the
 * only mechanism a browser screen reader honours is a **rendered, persistently
 * mounted `aria-live` region whose text mutates**.
 *
 * This module is that region's data half: a tiny pub-sub plus a one-time
 * override that routes the web no-op into it. The rendered half is
 * `<A11yLiveRegion/>` (src/components/A11yLiveRegion.tsx), mounted once at the
 * app root. Native is untouched — iOS VoiceOver / Android keep the real API,
 * so the 50 call sites stay exactly as they are (call sites unchanged).
 *
 * It is also the persistent-mounted live region that S10/S11 will reuse for the
 * submit-success + "still trying" announcements (text mutation, not node insert).
 */

type Listener = (message: string) => void;

const listeners = new Set<Listener>();
let installed = false;

/** Fan a message out to every mounted A11yLiveRegion (web only in practice). */
function publish(message: string): void {
  const text = String(message ?? '');
  listeners.forEach((l) => l(text));
}

/** Subscribe a live-region node; returns an unsubscribe fn. */
export function subscribeAnnounce(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Announce a string to assistive tech on any platform. Native → the real
 * `AccessibilityInfo.announceForAccessibility`; web → the rendered live region.
 * New code (S10/S11) can call this directly; the existing 50 call sites keep
 * calling `AccessibilityInfo.announceForAccessibility` and are shimmed below.
 */
export function announce(message: string): void {
  if (Platform.OS === 'web') {
    publish(message);
  } else {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

/**
 * Override rn-web's no-op `announceForAccessibility` (and its options variant)
 * so the existing call sites route into the live region. Idempotent; web-only;
 * a no-op on native. If the platform object is frozen the override is skipped
 * and web stays silent (no regression from today) — the fallback is to adopt
 * `announce()` at the call sites.
 */
export function installWebAnnounceShim(): void {
  if (installed || Platform.OS !== 'web') return;
  try {
    const info = AccessibilityInfo as unknown as {
      announceForAccessibility?: (message: string) => void;
      announceForAccessibilityWithOptions?: (message: string, options?: unknown) => void;
    };
    info.announceForAccessibility = (message: string) => publish(message);
    if (typeof info.announceForAccessibilityWithOptions === 'function') {
      info.announceForAccessibilityWithOptions = (message: string) => publish(message);
    }
    installed = true;
  } catch {
    // Frozen platform object — leave the web no-op in place (no regression).
    installed = false;
  }
}
