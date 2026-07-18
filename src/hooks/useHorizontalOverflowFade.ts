/**
 * useHorizontalOverflowFade — the S16 overflow-scent measurement contract, shared.
 *
 * A horizontal ScrollView that clips its last chips with no affordance leaves the
 * user unaware of controls they have. The shipped S16 fade edge (MapScreen's
 * 7-tool action bar) cues "there's more past this edge" — this hook extracts that
 * exact contract so every silent chip rail (T14 / F2-07) speaks the same dialect
 * from ONE source, never a fork.
 *
 * Wire the returned `scrollHandlers` onto a `ScrollView horizontal`; render the
 * shared <OverflowFade visible={hasMore} /> as an absolute sibling over its right
 * edge inside a `position: relative` wrapper. `hasMore` is true iff the content
 * overflows the viewport AND it isn't scrolled to the end, so the fade HIDES at
 * end-of-scroll (no false "more" cue).
 */
import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/**
 * The pure fade-mount decision, extracted so it can be unit-tested headlessly on
 * three numbers (byte-identical to the shipped S16 rule at MapScreen's action bar).
 * Fade shows when the content overflows by more than 1px and we are not at the end
 * (a 1px tolerance absorbs sub-pixel / rubber-band offsets).
 */
export function computeOverflowHasMore(contentW: number, viewW: number, offsetX: number): boolean {
  const overflow = contentW - viewW;
  const atEnd = offsetX >= overflow - 1;
  return overflow > 1 && !atEnd;
}

export interface HorizontalOverflowFade {
  /** True iff the rail overflows and is not scrolled to the end — drive the fade. */
  hasMore: boolean;
  /** Spread onto the `ScrollView horizontal` whose overflow you are cueing. */
  scrollHandlers: {
    scrollEventThrottle: number;
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onLayout: (e: LayoutChangeEvent) => void;
    onContentSizeChange: (w: number, h: number) => void;
  };
}

export function useHorizontalOverflowFade(): HorizontalOverflowFade {
  const viewW = useRef(0);
  const contentW = useRef(0);
  const offsetX = useRef(0);
  const [hasMore, setHasMore] = useState(false);

  const recompute = useCallback(() => {
    setHasMore(computeOverflowHasMore(contentW.current, viewW.current, offsetX.current));
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetX.current = e.nativeEvent.contentOffset.x;
      recompute();
    },
    [recompute],
  );
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      viewW.current = e.nativeEvent.layout.width;
      recompute();
    },
    [recompute],
  );
  const onContentSizeChange = useCallback(
    (w: number) => {
      contentW.current = w;
      recompute();
    },
    [recompute],
  );

  return {
    hasMore,
    scrollHandlers: { scrollEventThrottle: 16, onScroll, onLayout, onContentSizeChange },
  };
}
