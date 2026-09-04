import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent } from 'react-native';

import { useFocusedInputScroll } from '../useFocusedInputScroll';

function layoutEvent(y: number): LayoutChangeEvent {
  return {
    nativeEvent: {
      layout: { x: 0, y, width: 200, height: 44 },
    },
  } as LayoutChangeEvent;
}

describe('useFocusedInputScroll', () => {
  it('reveals on focus and repeats after the keyboard changes the viewport', () => {
    const scrollTo = jest.fn();
    const scrollRef = { current: { scrollTo } };
    const { result, rerender } = renderHook(
      ({ keyboardVisible }) => useFocusedInputScroll(scrollRef, keyboardVisible, 24),
      { initialProps: { keyboardVisible: false } },
    );

    act(() => {
      result.current.onLayout(layoutEvent(180));
      result.current.onFocus();
    });
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 156, animated: true });

    rerender({ keyboardVisible: true });
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 156, animated: true });

    act(() => result.current.onBlur());
    rerender({ keyboardVisible: false });
    rerender({ keyboardVisible: true });
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it('never requests a negative scroll position', () => {
    const scrollTo = jest.fn();
    const scrollRef = { current: { scrollTo } };
    const { result } = renderHook(() => useFocusedInputScroll(scrollRef, false, 24));

    act(() => {
      result.current.onLayout(layoutEvent(10));
      result.current.onFocus();
    });

    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('repeats when an opted-in viewport finishes resizing for the visible keyboard', () => {
    const scrollTo = jest.fn();
    const scrollRef = { current: { scrollTo } };
    const { result, rerender } = renderHook(
      ({ keyboardVisible }) => useFocusedInputScroll(scrollRef, keyboardVisible, 24),
      { initialProps: { keyboardVisible: false } },
    );

    act(() => {
      result.current.onLayout(layoutEvent(180));
      result.current.onFocus();
    });
    rerender({ keyboardVisible: true });

    act(() => result.current.onViewportLayout());
    expect(scrollTo).toHaveBeenCalledTimes(3);
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 156, animated: true });

    act(() => result.current.onBlur());
    act(() => result.current.onViewportLayout());
    expect(scrollTo).toHaveBeenCalledTimes(3);
  });
});
