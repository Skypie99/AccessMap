/**
 * B5 (L4-05) — Reduce-Motion regression net for the shared UI PRIMITIVES.
 *
 * These are the reusable Animated paths that S12 (web camera) and B7 (native
 * cluster spring) do NOT cover. Each assertion proves the primitive resolves to
 * its NON-animated form under reduce motion — the invariant DESIGN.md §8
 * requires and that the falsy-zero trap proved was unenforced. The Animated
 * drivers are spied so we assert on whether an animation is STARTED, without
 * running a real (native-driver) animation in the Node test env.
 *
 * Covered here: Skeleton (looped pulse + the motion.duration.pulse token),
 * Button and PressableScale (press spring). The reduce-motion state is injected
 * via the shared useReducedMotion hook.
 */

import React from 'react';
import { Animated } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { PressableScale } from '@/components/ui/PressableScale';
import { AppText } from '@/components/ui/AppText';
import { useReducedMotion } from '@/lib/accessibility';
import { motion } from '@/theme';

jest.mock('@/lib/accessibility', () => ({
  ...jest.requireActual('@/lib/accessibility'),
  useReducedMotion: jest.fn(),
}));

const mockRM = useReducedMotion as jest.Mock;

describe('B5 — UI primitives resolve to the non-animated form under reduce motion', () => {
  beforeEach(() => {
    // Spy the Animated drivers so we can count "did an animation start?" without
    // a real native-driver animation running under Jest.
    const noop = () => ({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
    jest.spyOn(Animated, 'loop').mockImplementation(noop as never);
    jest.spyOn(Animated, 'spring').mockImplementation(noop as never);
    jest.spyOn(Animated, 'timing').mockImplementation(noop as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockRM.mockReset();
  });

  it('Skeleton: no pulse loop starts under RM (static 0.5), loops otherwise', () => {
    mockRM.mockReturnValue(true);
    const { unmount } = render(<Skeleton width={100} height={20} />);
    expect(Animated.loop).not.toHaveBeenCalled();
    unmount();

    mockRM.mockReturnValue(false);
    render(<Skeleton width={100} height={20} />);
    expect(Animated.loop).toHaveBeenCalledTimes(1);
  });

  it('Skeleton: the pulse half-cycles use the motion.duration.pulse token (B5a), not a literal', () => {
    mockRM.mockReturnValue(false);
    render(<Skeleton width={100} height={20} />);
    expect(Animated.timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: motion.duration.pulse }),
    );
    // Guard the token's value so a future retune of `pulse` is a conscious change.
    expect(motion.duration.pulse).toBe(700);
  });

  it('Button: press does NOT spring under RM, springs otherwise', () => {
    mockRM.mockReturnValue(true);
    const { getByLabelText, unmount } = render(
      <Button onPress={() => {}} accessibilityLabel="Go">
        <AppText>Go</AppText>
      </Button>,
    );
    fireEvent(getByLabelText('Go'), 'pressIn');
    expect(Animated.spring).not.toHaveBeenCalled();
    unmount();

    mockRM.mockReturnValue(false);
    const { getByLabelText: getByLabel2 } = render(
      <Button onPress={() => {}} accessibilityLabel="Go">
        <AppText>Go</AppText>
      </Button>,
    );
    fireEvent(getByLabel2('Go'), 'pressIn');
    expect(Animated.spring).toHaveBeenCalledTimes(1);
  });

  it('PressableScale: press does NOT spring under RM, springs otherwise', () => {
    mockRM.mockReturnValue(true);
    const { getByLabelText, unmount } = render(
      <PressableScale onPress={() => {}} accessibilityLabel="Tap">
        <AppText>Tap</AppText>
      </PressableScale>,
    );
    fireEvent(getByLabelText('Tap'), 'pressIn');
    expect(Animated.spring).not.toHaveBeenCalled();
    unmount();

    mockRM.mockReturnValue(false);
    const { getByLabelText: getByLabel2 } = render(
      <PressableScale onPress={() => {}} accessibilityLabel="Tap">
        <AppText>Tap</AppText>
      </PressableScale>,
    );
    fireEvent(getByLabel2('Tap'), 'pressIn');
    expect(Animated.spring).toHaveBeenCalledTimes(1);
  });
});
