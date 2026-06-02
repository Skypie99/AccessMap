/**
 * haptics — thin, crash-proof wrapper over expo-haptics.
 *
 * Three guarantees so call sites never need a guard of their own:
 *   1. No-ops on web (Platform.OS === 'web').
 *   2. No-ops if expo-haptics can't be loaded (require throws).
 *   3. No-ops if the device doesn't support haptics (the call throws).
 *
 * Note on accessibility: we deliberately do NOT gate haptics on the
 * reduce-motion flag — haptic feedback is a separate concern from visual
 * motion, and iOS/Android already expose a dedicated system-haptics setting
 * that expo-haptics honors at the OS level. Gating on reduce-motion would
 * wrongly suppress feedback for users who want it.
 *
 * Fire-and-forget: every function returns void; callers never await.
 *
 * Design system 2026-06-01.
 */

import { Platform } from 'react-native';

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotifyType = 'success' | 'warning' | 'error';

type HapticsModule = typeof import('expo-haptics');

// Resolved once: the module, or null on web / when unavailable.
let cached: HapticsModule | null | undefined;

function getHaptics(): HapticsModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === 'web') {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-haptics') as HapticsModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** Light selection tick — chip taps, filter changes, segmented controls. */
export function hapticSelection(): void {
  const h = getHaptics();
  if (!h) return;
  try {
    void h.selectionAsync();
  } catch {
    /* unsupported — ignore */
  }
}

/** Physical impact — button presses; 'heavy' for destructive confirmations. */
export function hapticImpact(style: ImpactStyle = 'light'): void {
  const h = getHaptics();
  if (!h) return;
  const map: Record<ImpactStyle, import('expo-haptics').ImpactFeedbackStyle> = {
    light: h.ImpactFeedbackStyle.Light,
    medium: h.ImpactFeedbackStyle.Medium,
    heavy: h.ImpactFeedbackStyle.Heavy,
  };
  try {
    void h.impactAsync(map[style]);
  } catch {
    /* unsupported — ignore */
  }
}

/** System notification feedback — on a submit/action result. */
export function hapticNotify(type: NotifyType = 'success'): void {
  const h = getHaptics();
  if (!h) return;
  const map: Record<NotifyType, import('expo-haptics').NotificationFeedbackType> = {
    success: h.NotificationFeedbackType.Success,
    warning: h.NotificationFeedbackType.Warning,
    error: h.NotificationFeedbackType.Error,
  };
  try {
    void h.notificationAsync(map[type]);
  } catch {
    /* unsupported — ignore */
  }
}
