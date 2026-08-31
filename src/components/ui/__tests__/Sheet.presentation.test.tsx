import React from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { fireEvent, render } from '@testing-library/react-native';

import { spacing } from '@/theme';
import { TYPE_BLOCK } from '@/components/ui/TypeBlock';
import { Sheet } from '../Sheet';
import { SheetPull } from '../SheetPull';

jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: jest.fn(() => false),
  useReduceTransparency: () => false,
}));

const insets = { top: 47, bottom: 34, left: 0, right: 0 };

function mount(props: Partial<React.ComponentProps<typeof Sheet>> = {}) {
  const onClose = jest.fn();
  const utils = render(
    <SafeAreaInsetsContext.Provider value={insets}>
      <Sheet visible onClose={onClose} title="Expanded sheet" testID="sheet-backdrop" {...props}>
        <View testID="sheet-body" />
      </Sheet>
    </SafeAreaInsetsContext.Provider>,
  );
  return { utils, onClose };
}

const bodyCardStyle = (utils: ReturnType<typeof render>) => {
  const card = utils.UNSAFE_getAllByType(View).find((node) => {
    const style = StyleSheet.flatten(node.props.style);
    return style?.borderTopLeftRadius && (style.maxHeight === '90%' || style.maxHeight === '100%');
  });
  return StyleSheet.flatten(card?.props.style);
};

describe('ui/Sheet presentation', () => {
  it('defaults to the unchanged standard geometry', () => {
    const { utils } = mount();
    expect(bodyCardStyle(utils)).toMatchObject({ maxHeight: '90%', paddingBottom: insets.bottom });
    expect(bodyCardStyle(utils).marginTop).toBeUndefined();
    expect(StyleSheet.flatten(utils.UNSAFE_getByType(SheetPull).props.style)).toMatchObject({ width: '100%' });
  });

  it('expanded fills from insets.top + spacing.sm to the existing bottom-safe-area pad', () => {
    const { utils } = mount({ presentation: 'expanded' });
    expect(bodyCardStyle(utils)).toMatchObject({
      maxHeight: '100%',
      flexGrow: 1,
      marginTop: insets.top + spacing.sm,
      paddingBottom: insets.bottom,
    });
    expect(StyleSheet.flatten(utils.UNSAFE_getByType(SheetPull).props.style)).toMatchObject({
      width: '100%',
      flexGrow: 1,
    });
  });

  it('uses the same expanded geometry through KeyboardAvoidingView', () => {
    const { utils } = mount({ presentation: 'expanded', keyboardAvoiding: true });
    expect(StyleSheet.flatten(utils.UNSAFE_getByType(KeyboardAvoidingView).props.style)).toMatchObject({
      maxHeight: '100%',
      flexGrow: 1,
    });
    expect(bodyCardStyle(utils)).toMatchObject({
      maxHeight: '100%',
      marginTop: insets.top + spacing.sm,
    });
  });

  it('carries expanded geometry through the bulk-glass wrapper too', () => {
    const { utils } = mount({ presentation: 'expanded', glass: true });
    const glassWrapper = utils.UNSAFE_getAllByType(View).find((node) => {
      const style = StyleSheet.flatten(node.props.style);
      return style?.marginTop === insets.top + spacing.sm && style.maxHeight === '100%';
    });
    expect(StyleSheet.flatten(glassWrapper?.props.style)).toMatchObject({
      flexGrow: 1,
      flexShrink: 1,
      marginTop: insets.top + spacing.sm,
      maxHeight: '100%',
    });
  });

  it('preserves the close and SheetPull paths in expanded mode', () => {
    const { utils, onClose } = mount({ presentation: 'expanded', pullEnabled: false });
    fireEvent.press(utils.getByLabelText('Close Expanded sheet'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(utils.UNSAFE_getByType(SheetPull).props).toMatchObject({ enabled: false, atTop: true });
  });

  it('caps a subtitle only when a bounded consumer explicitly opts in', () => {
    const { utils } = mount({
      subtitle: 'A text-heavy sheet subtitle',
      subtitleMaxFontSizeMultiplier: TYPE_BLOCK.header,
    });

    expect(utils.getByText('A text-heavy sheet subtitle').props.maxFontSizeMultiplier).toBe(
      TYPE_BLOCK.header,
    );
  });

  it('gives a title natural vertical height only when a bounded consumer opts in', () => {
    const standard = mount({ subtitle: 'Supporting line' });
    expect(StyleSheet.flatten(standard.utils.getByText('Expanded sheet').props.style)).toMatchObject({
      flex: 1,
    });

    const reflowed = mount({ subtitle: 'Supporting line', reflowHeaderTitle: true });
    expect(StyleSheet.flatten(reflowed.utils.getByText('Expanded sheet').props.style)).toMatchObject({
      flexGrow: 0,
      flexShrink: 0,
      flexBasis: 'auto',
    });
  });
});
