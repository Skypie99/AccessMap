/**
 * glassMode — the Deep Field C-lite runtime switch (GLASS.md).
 *
 * 'full' = Candidate C as designed: true blur on rows/banner (i=12) + chrome/
 * bulk (i=24). 'lite' = the pre-authorized C-lite fold: rows/banner/empty/
 * skeletons drop their BlurViews for the engineered *Lite micro-gradients
 * while the chrome + bulk panes KEEP blur (B's architecture wearing C's
 * stage and floors).
 *
 * WHY A RUNTIME SWITCH: C is the max-blur architecture and its real cost is
 * only measurable on-device. A compile-time flag would cost a second
 * TestFlight build to flip; this store lets ONE build carry BOTH modes so Sky
 * A/Bs the scroll feel on the same install (long-press the Tasks header
 * title). The losing mode gets removed in a later cleanup commit.
 *
 * DELIBERATELY NOT __DEV__-GATED — it must work in the release build.
 * Persisted under the standard '@accessmap/<name>_v1' key; storage failures
 * follow the ephemeral-preference tier (warn + ignore — CLAUDE.md).
 */

import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type GlassMode = 'full' | 'lite';

const STORAGE_KEY = '@accessmap/glass_mode_v1';

let mode: GlassMode = 'full';
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

/** Current mode, synchronously (module store — 'full' until hydrated). */
export function getGlassMode(): GlassMode {
  return mode;
}

export function subscribeGlassMode(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * One-shot load of the persisted mode. Safe to call repeatedly (subsequent
 * calls are no-ops); the Tasks screen kicks it off on mount. READ failure →
 * warn + keep the 'full' default.
 */
export async function hydrateGlassMode(): Promise<GlassMode> {
  if (hydrated) return mode;
  hydrated = true;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === 'full' || saved === 'lite') {
      mode = saved;
      notify();
    }
  } catch (e) {
    console.warn('[glass] load mode failed:', e);
  }
  return mode;
}

/** Set + persist + announce. WRITE failure → warn + ignore (preference tier). */
export function setGlassMode(next: GlassMode): void {
  if (next === mode) return;
  mode = next;
  notify();
  AsyncStorage.setItem(STORAGE_KEY, next).catch((e) =>
    console.warn('[glass] save mode failed:', e),
  );
  // The switch is a hidden long-press with no persistent UI — announce the
  // result so screen-reader users get the same confirmation the flash gives
  // sighted users (WCAG 4.1.3).
  AccessibilityInfo.announceForAccessibility(
    next === 'lite' ? 'Glass effects reduced' : 'Glass effects full',
  );
}

export function toggleGlassMode(): GlassMode {
  setGlassMode(mode === 'full' ? 'lite' : 'full');
  return mode;
}

/** Reactive hook — re-renders on flip. */
export function useGlassMode(): GlassMode {
  return useSyncExternalStore(subscribeGlassMode, getGlassMode, getGlassMode);
}

/** Test-only: reset the module store between cases. */
export function __resetGlassModeForTests(): void {
  mode = 'full';
  hydrated = false;
  listeners.clear();
}
