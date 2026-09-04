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
// VP1 fix2: a fixed, content-hugging width for the selected-tab wash instead
// of insetting the full flex segment (which stretched into a highlight BAND
// on wider devices). The widest label, "Profile" (7 chars, font.size.xs
// semibold), renders at ~52pt; 68 leaves ~8pt of breathing room per side
// without reading as cramped, and stays constant regardless of segment width.
export const FLOATING_TAB_BAR_SELECTED_FILL_WIDTH = 68;

export type FloatingTabBarCapsuleEdge = 'start' | 'end';

export function getFloatingTabBarContentInset(
  tabBarHeight: number,
  safeAreaBottom: number,
): number {
  return Math.max(tabBarHeight, safeAreaBottom) + FLOATING_TAB_BAR_CONTENT_GAP;
}
