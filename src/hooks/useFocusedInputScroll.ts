import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { LayoutChangeEvent } from 'react-native';

interface ScrollTarget {
  scrollTo(options: { y: number; animated?: boolean }): void;
}

/**
 * Keeps a focused field near the top of its owning form scroller.
 *
 * The first scroll handles focus changes while the keyboard is already open;
 * the keyboard-visible pass repeats it after KeyboardAvoidingView has reduced
 * the available viewport. Callers retain their existing blur/dismiss behavior.
 */
export function useFocusedInputScroll<T extends ScrollTarget>(
  scrollRef: RefObject<T | null>,
  keyboardVisible: boolean,
  contextOffset = 0,
) {
  const fieldYRef = useRef(0);
  const focusedRef = useRef(false);

  const reveal = useCallback(() => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, fieldYRef.current - contextOffset),
      animated: true,
    });
  }, [contextOffset, scrollRef]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    fieldYRef.current = event.nativeEvent.layout.y;
  }, []);

  const onFocus = useCallback(() => {
    focusedRef.current = true;
    reveal();
  }, [reveal]);

  const onBlur = useCallback(() => {
    focusedRef.current = false;
  }, []);

  useEffect(() => {
    if (keyboardVisible && focusedRef.current) reveal();
  }, [keyboardVisible, reveal]);

  return { onLayout, onFocus, onBlur };
}
