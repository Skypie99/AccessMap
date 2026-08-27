import { spacing } from '@/theme';
import {
  FLOATING_TAB_BAR_CAPSULE_HEIGHT,
  FLOATING_TAB_BAR_CAPSULE_RADIUS,
  FLOATING_TAB_BAR_CAPSULE_SIDE_INSET,
  FLOATING_TAB_BAR_CONTENT_GAP,
  getFloatingTabBarContentInset,
} from '../tabBarGeometry';

describe('floating tab-bar geometry', () => {
  it('keeps the existing capsule dimensions on named design tokens', () => {
    expect(FLOATING_TAB_BAR_CAPSULE_HEIGHT).toBe(68);
    expect(FLOATING_TAB_BAR_CAPSULE_SIDE_INSET).toBe(spacing.md);
    expect(FLOATING_TAB_BAR_CAPSULE_RADIUS).toBe(20);
    expect(FLOATING_TAB_BAR_CONTENT_GAP).toBe(spacing.xl);
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
