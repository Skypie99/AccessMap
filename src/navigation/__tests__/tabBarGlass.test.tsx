import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { render } from '@testing-library/react-native';

import { spacing } from '@/theme';
import { TabBarGlass, liquidTabInk } from '../TabBarGlass';

const mockUseColor = jest.fn();
const mockUseReduceTransparency = jest.fn();

jest.mock('@/theme/ThemeContext', () => ({
  useColor: () => mockUseColor(),
}));

jest.mock('@/lib/accessibility', () => ({
  useReduceTransparency: () => mockUseReduceTransparency(),
}));

const color = {
  scheme: 'light',
  tabBarBg: '#102030',
  navBorder: '#304050',
  tabBarBlurTint: 'light',
  tabBarGlassFloor: 'rgba(1, 2, 3, 0.8)',
  glassMapCrystal0: 'rgba(255, 255, 255, 0.7)',
  glassMapCrystal1: 'rgba(255, 255, 255, 0.6)',
  glassRowSpecular: 'rgba(255, 255, 255, 0.3)',
  brandTextAlt: '#0044aa',
  inkSelect: '#ddeeff',
  textStrong: '#112233',
  tabBarActiveTint: '#445566',
  tabBarInactiveTint: '#778899',
};

const platformDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');

function setPlatform(os: 'ios' | 'android') {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
}

function capsuleStyle(utils: ReturnType<typeof render>) {
  const capsule = utils.UNSAFE_getAllByType(View).find((node) => {
    const style = StyleSheet.flatten(node.props.style);
    return style?.height === 68 && style?.overflow === 'hidden';
  });
  return StyleSheet.flatten(capsule?.props.style);
}

describe('TabBarGlass liquid material', () => {
  beforeEach(() => {
    mockUseColor.mockReturnValue(color);
    mockUseReduceTransparency.mockReturnValue(false);
    setPlatform('ios');
  });

  afterAll(() => {
    if (platformDescriptor) Object.defineProperty(Platform, 'OS', platformDescriptor);
  });

  it('uses a clipped, inset crystal material on iOS instead of the opaque legacy floor', () => {
    const utils = render(<TabBarGlass />);
    expect(capsuleStyle(utils)).toMatchObject({
      top: 0,
      left: spacing.md,
      right: spacing.md,
      height: 68,
      overflow: 'hidden',
    });
    expect(utils.UNSAFE_getAllByType(BlurView)).toHaveLength(1);
    expect(utils.UNSAFE_getByType(LinearGradient).props.colors).toEqual([
      color.glassMapCrystal0,
      color.glassMapCrystal1,
    ]);
  });

  it('keeps Reduce Transparency on its opaque, no-blur fallback', () => {
    mockUseReduceTransparency.mockReturnValue(true);
    const utils = render(<TabBarGlass />);
    expect(utils.UNSAFE_queryByType(BlurView)).toBeNull();
    expect(utils.UNSAFE_queryByType(LinearGradient)).toBeNull();
    const fallback = utils.UNSAFE_getAllByType(View).find((node) =>
      StyleSheet.flatten(node.props.style)?.backgroundColor === color.tabBarBg,
    );
    expect(StyleSheet.flatten(fallback?.props.style)).toMatchObject({
      ...StyleSheet.absoluteFillObject,
      backgroundColor: color.tabBarBg,
    });
  });

  it('keeps Android on the existing opaque-floor material path', () => {
    setPlatform('android');
    const utils = render(<TabBarGlass />);
    expect(utils.UNSAFE_getAllByType(BlurView)).toHaveLength(1);
    expect(utils.UNSAFE_queryByType(LinearGradient)).toBeNull();
    const opaqueFloor = utils.UNSAFE_getAllByType(View).find((node) =>
      StyleSheet.flatten(node.props.style)?.backgroundColor === color.tabBarGlassFloor,
    );
    expect(opaqueFloor).toBeDefined();
  });

  it('uses contrast-safe ink roles for light/dark crystal paths and established fallback inks', () => {
    setPlatform('ios');
    expect(liquidTabInk(color as never, false)).toEqual({ active: color.brandTextAlt, inactive: color.textStrong });
    expect(liquidTabInk({ ...color, scheme: 'dark' } as never, false)).toEqual({
      active: color.inkSelect,
      inactive: color.textStrong,
    });
    expect(liquidTabInk(color as never, true)).toEqual({
      active: color.tabBarActiveTint,
      inactive: color.tabBarInactiveTint,
    });
  });
});
