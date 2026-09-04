import { spacing } from '@/theme';
import {
  FLOATING_TAB_BAR_CAPSULE_HEIGHT,
  FLOATING_TAB_BAR_CAPSULE_RADIUS,
  FLOATING_TAB_BAR_CAPSULE_SIDE_INSET,
  FLOATING_TAB_BAR_CONTENT_GAP,
  FLOATING_TAB_BAR_SELECTED_FILL_WIDTH,
  getFloatingTabBarContentInset,
} from '../tabBarGeometry';

describe('floating tab-bar geometry', () => {
  it('keeps the existing capsule dimensions on named design tokens', () => {
    expect(FLOATING_TAB_BAR_CAPSULE_HEIGHT).toBe(68);
    expect(FLOATING_TAB_BAR_CAPSULE_SIDE_INSET).toBe(spacing.md);
    expect(FLOATING_TAB_BAR_CAPSULE_RADIUS).toBe(20);
    expect(FLOATING_TAB_BAR_CONTENT_GAP).toBe(spacing.xl);
  });

  // VP1 fix2: 68 was retested, not assumed. Measured on web (label
  // clientHeight vs. its natural scrollHeight) at every value from 62-68 —
  // it's a clean 1:1 relationship with zero slack, so 67 already clips
  // (12/16px) and 68 is the true floor. Guard the value so a future "just
  // shave a couple points" edit fails loudly instead of re-clipping labels.
  it('keeps the capsule height at its measured label-clipping floor', () => {
    expect(FLOATING_TAB_BAR_CAPSULE_HEIGHT).toBe(68);
  });

  it('gives the selected-tab wash a fixed, content-hugging width', () => {
    // Content-hugging means a WIDTH, not the old left/right insets that
    // scaled with the (flex) segment's own width and stretched into a band
    // on wider devices. 68 comfortably fits the widest label ("Profile").
    expect(FLOATING_TAB_BAR_SELECTED_FILL_WIDTH).toBe(68);
  });

  it('clears the measured tab bar plus one intentional breathing margin', () => {
    expect(getFloatingTabBarContentInset(102, 34)).toBe(102 + spacing.xl);
  });

  it('falls back to the device safe area when rendered outside a tab navigator', () => {
    expect(getFloatingTabBarContentInset(0, 34)).toBe(34 + spacing.xl);
  });

  it('does not count a safe area already represented by tabBarHeight twice', () => {
    expect(getFloatingTabBarContentInset(102, 34)).not.toBe(102 + 34 + spacing.xl);
  });
});
