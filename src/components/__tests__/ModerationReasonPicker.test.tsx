import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ModerationReasonPicker } from '../ModerationReasonPicker';

jest.mock('expo-blur', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { BlurView: (props: Record<string, unknown>) => ReactActual.createElement(View, props) };
});
jest.mock('expo-linear-gradient', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { LinearGradient: (props: Record<string, unknown>) => ReactActual.createElement(View, props) };
});

describe('ModerationReasonPicker', () => {
  it('shows every approved reject reason with no preselected/default action', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <ModerationReasonPicker
        visible
        action="reject"
        onCancel={jest.fn()}
        onSelect={onSelect}
      />,
    );

    expect(getByText('Duplicate')).toBeTruthy();
    expect(getByText('Not an accessibility barrier')).toBeTruthy();
    expect(getByText('Inaccurate')).toBeTruthy();
    expect(getByText('Abusive or spam')).toBeTruthy();
    expect(getByText('Other')).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('puts modal focus containment and escape on the overlay boundary', () => {
    const onCancel = jest.fn();
    const { UNSAFE_getByProps } = render(
      <ModerationReasonPicker
        visible
        action="reject"
        onCancel={onCancel}
        onSelect={jest.fn()}
      />,
    );

    const dialog = UNSAFE_getByProps({ role: 'dialog' });
    expect(dialog.props.accessibilityViewIsModal).toBe(true);
    fireEvent(dialog, 'accessibilityEscape');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('returns exactly the selected restore reason', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <ModerationReasonPicker
        visible
        action="restore"
        onCancel={jest.fn()}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(getByText('New evidence'));
    expect(onSelect).toHaveBeenCalledWith('new_evidence');
  });

  it('cancels without selecting a reason', () => {
    const onCancel = jest.fn();
    const onSelect = jest.fn();
    const { getByText } = render(
      <ModerationReasonPicker
        visible
        action="reject"
        onCancel={onCancel}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
