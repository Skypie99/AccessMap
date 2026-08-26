/**
 * BP11 / T3 — TabBarButton a11y + press-vocabulary regression net.
 *
 * The custom bottom-tab button adds a selection haptic and disables the visual
 * press feedback (haptic-only — the near-floor tab labels can't take a dim).
 * This locks the LOAD-BEARING invariant: the wrapping must NOT drop the tab's
 * semantics. React Navigation v7 passes the current-tab signal as `aria-selected`
 * (NOT accessibilityState — BottomTabItem.js), so this guard feeds that exact
 * injected shape and proves it survives. An earlier build destructured a fixed
 * prop set with no {...rest} and silently dropped aria-selected — screen readers
 * stopped announcing which tab was active. This test would have caught it.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { TabBarButton } from '../TabBarButton';

jest.mock('@/lib/haptics', () => ({
  hapticSelection: jest.fn(),
  hapticImpact: jest.fn(),
  hapticNotify: jest.fn(),
}));

// eslint-disable-next-line import/first
import { hapticSelection } from '@/lib/haptics';

// The exact prop shape @react-navigation/bottom-tabs v7 injects into tabBarButton.
const v7Props = (over: Record<string, unknown> = {}) => ({
  testID: 'tab-Home',
  'aria-label': 'Home, tab, 1 of 3',
  'aria-selected': true,
  role: 'tab',
  onPress: jest.fn(),
  ...over,
});

const renderTab = (props: Record<string, unknown> = {}) =>
  render(
    // PlatformPressable reads the React Navigation theme (present in production
    // inside NavigationContainer); provide it for the isolated unit test.
    <ThemeProvider value={DefaultTheme}>
      <TabBarButton {...(v7Props(props) as never)}>
        <Text>Home</Text>
      </TabBarButton>
    </ThemeProvider>,
  );

// RN normalises aria-selected → accessibilityState.selected; accept either surface.
const selectedSignal = (node: { props: Record<string, unknown> }): unknown =>
  node.props['aria-selected'] ??
  (node.props.accessibilityState as { selected?: unknown } | undefined)?.selected;

describe('TabBarButton — a11y + press vocabulary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forwards the v7 aria-selected signal so the active tab stays announced (the load-bearing FIX)', () => {
    const { getByTestId } = renderTab({ 'aria-selected': true });
    expect(selectedSignal(getByTestId('tab-Home'))).toBe(true);
  });

  it('reflects the unselected state too (forwarded, not hard-coded)', () => {
    const { getByTestId } = renderTab({ 'aria-selected': false });
    expect(selectedSignal(getByTestId('tab-Home'))).toBe(false);
  });

  it('forwards the aria-label (the tab name for screen readers)', () => {
    const { getByTestId } = renderTab({ 'aria-label': 'Home, tab, 1 of 3' });
    const node = getByTestId('tab-Home');
    expect(node.props['aria-label'] ?? node.props.accessibilityLabel).toBe('Home, tab, 1 of 3');
  });

  it('fires the selection haptic and forwards the injected onPress', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderTab({ onPress });
    fireEvent.press(getByTestId('tab-Home'));
    expect(hapticSelection).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('forwards the injected onLongPress', () => {
    const onLongPress = jest.fn();
    const { getByTestId } = renderTab({ onLongPress });
    fireEvent(getByTestId('tab-Home'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('renders a decorative crystal divider without putting it in the tab order', () => {
    const { UNSAFE_getByProps } = renderTab({ showDivider: true, dividerInk: '#123456' });
    // Hidden decorative elements are deliberately invisible to the normal
    // a11y-aware query path, so inspect the host prop directly.
    const divider = UNSAFE_getByProps({ testID: 'tab-segment-divider' });
    expect(divider.props.accessibilityElementsHidden).toBe(true);
    expect(divider.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(StyleSheet.flatten(divider.props.style)).toMatchObject({
      top: 12,
      bottom: 12,
      right: 0,
      borderRightColor: '#123456',
    });
  });

  it('draws a 2pt underline across the selected segment only', () => {
    const { UNSAFE_getByProps } = renderTab({ 'aria-selected': true, activeInk: '#abcdef' });
    const underline = UNSAFE_getByProps({ testID: 'tab-segment-underline' });
    expect(underline.props.accessibilityElementsHidden).toBe(true);
    expect(StyleSheet.flatten(underline.props.style)).toMatchObject({
      left: 0,
      right: 0,
      bottom: 0,
      height: 2,
      borderTopColor: '#abcdef',
    });
  });

  it('does not render the selected underline for an unselected tab', () => {
    const { queryByTestId } = renderTab({ 'aria-selected': false });
    expect(queryByTestId('tab-segment-underline')).toBeNull();
  });
});
