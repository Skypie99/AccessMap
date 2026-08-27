import { radius, spacing } from '@/theme';

/**
 * One geometry contract for the floating native tab capsule and the content
 * that scrolls around it. The navigator-reported height already includes the
 * device bottom inset, so callers must never add that inset a second time.
 */
export const FLOATING_TAB_BAR_CAPSULE_HEIGHT = 68;
export const FLOATING_TAB_BAR_CAPSULE_SIDE_INSET = spacing.md;
export const FLOATING_TAB_BAR_CAPSULE_RADIUS = radius.xl;
export const FLOATING_TAB_BAR_CONTROL_BOTTOM_PADDING = 8;
export const FLOATING_TAB_BAR_CONTENT_GAP = spacing.xl;

export type FloatingTabBarCapsuleEdge = 'start' | 'end';

export function getFloatingTabBarContentInset(
  tabBarHeight: number,
  safeAreaBottom: number,
): number {
  return Math.max(tabBarHeight, safeAreaBottom) + FLOATING_TAB_BAR_CONTENT_GAP;
}
