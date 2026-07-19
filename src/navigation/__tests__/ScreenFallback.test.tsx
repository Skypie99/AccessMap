/**
 * ScreenFallback — the dressed lazy-load fallback (T12 / F3-01).
 *
 * Guards that the drawer→Settings interstitial renders the destination stage
 * (ScreenStage wash + a header-shaped Skeleton pair) and NEVER a bare spinner,
 * and that the frame is reduce-motion-invariant in structure (the Skeleton owns
 * RM stillness internally — no spinner ever appears, under RM or not).
 */
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ScreenFallback } from '@/navigation/ScreenFallback';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { Skeleton } from '@/components/ui/Skeleton';
import { useReducedMotion } from '@/lib/accessibility';

jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: jest.fn(() => false),
}));
const mockRM = useReducedMotion as jest.Mock;

// Fixed metrics so useSafeAreaInsets() resolves synchronously in the test.
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};
const renderFallback = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ScreenFallback />
    </SafeAreaProvider>,
  );

afterEach(() => mockRM.mockReset());

describe('ScreenFallback dressed lazy fallback (T12 / F3-01)', () => {
  it('renders the destination stage + a header-shaped skeleton, never a spinner', () => {
    mockRM.mockReturnValue(false);
    const u = renderFallback();
    expect(u.UNSAFE_queryByType(ActivityIndicator)).toBeNull(); // the bare spinner is retired
    expect(u.UNSAFE_getAllByType(ScreenStage)).toHaveLength(1); // Deep Field wash
    expect(u.UNSAFE_getAllByType(Skeleton)).toHaveLength(2); // eyebrow bar + title bar
  });

  it('is reduce-motion-invariant: the same dressed frame (no spinner) under RM on and off', () => {
    mockRM.mockReturnValue(false);
    const motion = renderFallback();
    mockRM.mockReturnValue(true);
    const still = renderFallback();
    expect(motion.UNSAFE_getAllByType(Skeleton)).toHaveLength(2);
    expect(still.UNSAFE_getAllByType(Skeleton)).toHaveLength(2);
    expect(motion.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    expect(still.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  });
});
