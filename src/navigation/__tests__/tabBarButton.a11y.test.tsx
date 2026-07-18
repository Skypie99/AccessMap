/**
 * BP11 / T3 — TabBarButton a11y + press-vocabulary regression net.
 *
 * The custom bottom-tab button (the tab bar joining the "one press vocabulary")
 * wraps React Navigation's injected props in a Pressable that adds a selection
 * haptic + a fill-swap pressed dim. This locks the LOAD-BEARING invariant (the
 * absorbed skeptic FIX): the wrapping must NOT drop the tab's semantics —
 * accessibilityState.selected has to survive so a screen reader still announces
 * which tab is active. Also guards: the tab haptic fires on press, the injected
 * onPress/onLongPress are forwarded, and the acknowledgment is a background
 * FILL-SWAP (never a group opacity, which would dim the label too).
 */
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { TabBarButton } from '../TabBarButton';

jest.mock('@/lib/haptics', () => ({
  hapticSelection: jest.fn(),
  hapticImpact: jest.fn(),
  hapticNotify: jest.fn(),
}));

// eslint-disable-next-line import/first
import { hapticSelection } from '@/lib/haptics';

type Overrides = Partial<React.ComponentProps<typeof TabBarButton>>;

const renderTab = (props: Overrides = {}) =>
  render(
    <TabBarButton
      accessibilityRole="tab"
      accessibilityState={{ selected: true }}
      accessibilityLabel="Home"
      testID="tab-Home"
      style={{ flex: 1 }}
      {...props}
    >
      <Text>Home</Text>
    </TabBarButton>,
  );

describe('TabBarButton — a11y + press vocabulary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps accessibilityState.selected after wrapping (the load-bearing FIX)', () => {
    const { getByRole } = renderTab();
    const tab = getByRole('tab', { name: 'Home' });
    expect(tab.props.accessibilityState.selected).toBe(true);
  });

  it('reflects the unselected state too (state is forwarded, not hard-coded)', () => {
    const { getByRole } = renderTab({ accessibilityState: { selected: false } });
    const tab = getByRole('tab', { name: 'Home' });
    expect(tab.props.accessibilityState.selected).toBe(false);
  });

  it('fires the selection haptic and forwards the injected onPress', () => {
    const onPress = jest.fn();
    const { getByRole } = renderTab({ onPress });
    fireEvent.press(getByRole('tab', { name: 'Home' }));
    expect(hapticSelection).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('forwards the injected onLongPress', () => {
    const onLongPress = jest.fn();
    const { getByRole } = renderTab({ onLongPress });
    fireEvent(getByRole('tab', { name: 'Home' }), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('answers the press with a background FILL-SWAP dim, never a group opacity', () => {
    const { getByRole } = renderTab();
    // At rest: no dim from the button itself.
    expect(StyleSheet.flatten(getByRole('tab', { name: 'Home' }).props.style).backgroundColor).toBeUndefined();
    // Pressed: the nav-chrome pressed fill appears; opacity is never touched.
    fireEvent(getByRole('tab', { name: 'Home' }), 'pressIn');
    const pressed = StyleSheet.flatten(getByRole('tab', { name: 'Home' }).props.style);
    expect(pressed.backgroundColor).toBe('rgba(22,33,58,0.12)'); // color.headerBtnBgPressed (light default)
    expect(pressed.opacity).toBeUndefined();
  });
});
