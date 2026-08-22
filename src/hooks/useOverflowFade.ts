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
  return useOverflowFade('x');
}

/**
 * The same contract on the other axis (2026-08-22, board 05).
 *
 * Onboarding's copy zone is a VERTICAL scroller that clips at accessibility text
 * sizes — captured at AXL, where card 1's body ends mid-glyph against the
 * progress row with nothing to say a swipe would reveal the rest. That is the
 * S16 finding word for word, turned ninety degrees, so it gets the same answer
 * from the same source rather than a second fade nobody would keep in sync.
 *
 * `computeOverflowHasMore` is already three numbers and no axis, which is why
 * this costs a parameter instead of a file.
 */
export function useVerticalOverflowFade(): HorizontalOverflowFade {
  return useOverflowFade('y');
}

function useOverflowFade(axis: 'x' | 'y'): HorizontalOverflowFade {
  const viewSize = useRef(0);
  const contentSize = useRef(0);
  const offset = useRef(0);
  const [hasMore, setHasMore] = useState(false);

  const recompute = useCallback(() => {
    setHasMore(computeOverflowHasMore(contentSize.current, viewSize.current, offset.current));
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = axis === 'x' ? e.nativeEvent.contentOffset.x : e.nativeEvent.contentOffset.y;
      recompute();
    },
    [axis, recompute],
  );
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      viewSize.current = axis === 'x' ? e.nativeEvent.layout.width : e.nativeEvent.layout.height;
      recompute();
    },
    [axis, recompute],
  );
  const onContentSizeChange = useCallback(
    (w: number, h: number) => {
      contentSize.current = axis === 'x' ? w : h;
      recompute();
    },
    [axis, recompute],
  );

  return {
    hasMore,
    scrollHandlers: { scrollEventThrottle: 16, onScroll, onLayout, onContentSizeChange },
  };
}
