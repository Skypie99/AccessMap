import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

/**
 * First-launch tutorial — three cards introducing the core loop:
 *  1. Drop pins where accessibility matters (the reporting flow)
 *  2. Verify others' reports (community trust)
 *  3. Earn points for accuracy (gamification)
 *
 * Shown ABOVE the rest of the app on the very first launch, gated by the
 * device-wide flag in src/lib/onboardingState.ts. After completion or
 * skip, it never shows again on this device.
 *
 * Distinct from src/screens/OnboardingModal.tsx, which is a per-user
 * intro that runs AFTER sign-in. This one runs BEFORE the auth gate so
 * a user who hasn't even signed up yet still gets the pitch.
 *
 * Accessibility notes:
 *  - The root surface sets accessibilityViewIsModal so VoiceOver focus
 *    stays contained inside the onboarding overlay and can't escape to
 *    the underlying auth screen.
 *  - The card heading uses accessibilityRole="header" as a STANDALONE
 *    element — the card container does NOT set `accessible`, so children
 *    (heading, body, position text) are individually focusable and the
 *    heading rotor works.
 *  - "Card N of 3" is announced two ways: (a) a small visible position
 *    label above the heading that screen readers pick up, and (b) an
 *    AccessibilityInfo.announceForAccessibility() when the active card
 *    changes via Back/Next/swipe.
 *  - Respects the OS "Reduce Motion" setting: when on, the swipe paging
 *    animation is skipped (cards still navigable via Back/Next).
 *  - Decorative emoji is hidden from assistive tech (text describes the
 *    same thing without it).
 *  - Skip / Back / Next buttons are all ≥44pt high with explicit labels
 *    and hints; the Back button on card 1 is announced as disabled.
 */

interface Props {
  onDone: () => void;
}

interface Card {
  emoji: string;
  title: string;
  body: string;
}

const CARDS: Card[] = [
  {
    emoji: '📍',
    title: 'Drop pins where accessibility matters',
    body: 'See a broken sidewalk, a missing ramp, or a blocked path? Drop a pin so others can plan around it. A few seconds from you saves a real headache for someone else.',
  },
  {
    emoji: '✅',
    title: "Verify others' reports",
    body: "When you pass a flagged spot, you can confirm it's still an issue — or mark it resolved if it's been fixed. That's how the map stays trustworthy over time.",
  },
  {
    emoji: '⭐',
    title: 'Earn points for accuracy',
    body: 'You earn points when your reports get verified or resolved, and when you verify or resolve others. The points reward real, helpful contributions.',
  },
];

export default function OnboardingCards({ onDone }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Track the OS "Reduce Motion" preference so the swipe animation can
  // be skipped when the user has asked the system to minimize motion.
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (!cancelled) setReduceMotion(on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  // When the active card changes (Back/Next/swipe), announce the new
  // position so screen reader users get the "Card N of 3" context even
  // though the card container is no longer a single accessible element.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`Card ${index + 1} of ${CARDS.length}`);
  }, [index]);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(CARDS.length - 1, next));
    scrollRef.current?.scrollTo({
      x: clamped * width,
      animated: !reduceMotion,
    });
    setIndex(clamped);
  };

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (next !== index) setIndex(next);
  };

  const isFirst = index === 0;
  const isLast = index === CARDS.length - 1;

  return (
    <Modal visible animationType="fade" onRequestClose={onDone} presentationStyle="fullScreen">
      <View style={styles.screen} accessibilityViewIsModal importantForAccessibility="yes">
        {/* Top row: Skip always visible top-right. */}
        <View style={styles.topBar}>
          <Pressable
            onPress={onDone}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="Skip the tutorial"
            accessibilityHint="Closes the tutorial and opens the app"
            hitSlop={12}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Card carousel. Swipe is sighted-only; SR users navigate via the
            Back / Next buttons below, which announce position in the label. */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.scroll}
        >
          {CARDS.map((card, i) => (
            // No `accessible` here — keeping each child individually
            // focusable preserves the heading role for the VoiceOver
            // rotor (otherwise the whole card collapses to one label).
            <View key={card.title} style={[styles.card, { width }]}>
              <Text
                style={styles.emoji}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {card.emoji}
              </Text>
              <Text style={styles.position}>{`Card ${i + 1} of ${CARDS.length}`}</Text>
              <Text style={styles.title} accessibilityRole="header">
                {card.title}
              </Text>
              <Text style={styles.body}>{card.body}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Pagination dots — decorative; the buttons + label carry the
            real position information for SR. */}
        <View
          style={styles.dotsRow}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {CARDS.map((card, i) => (
            <View key={card.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        {/* Bottom action row: Back (faded + disabled on card 1) on the left,
            Next / Get Started on the right. */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => goTo(index - 1)}
            disabled={isFirst}
            style={({ pressed }) => [
              styles.backBtn,
              isFirst && styles.backBtnDisabled,
              pressed && !isFirst && styles.btnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              isFirst
                ? 'Back. Disabled on the first card.'
                : `Back to card ${index} of ${CARDS.length}`
            }
            accessibilityState={{ disabled: isFirst }}
            hitSlop={8}
          >
            <Text style={[styles.backBtnText, isFirst && styles.backBtnTextDisabled]}>Back</Text>
          </Pressable>

          {!isLast ? (
            <Pressable
              onPress={() => goTo(index + 1)}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Next. Currently on card ${index + 1} of ${CARDS.length}.`}
              accessibilityHint="Moves to the next tutorial card"
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onDone}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Get Started"
              accessibilityHint="Completes the tutorial and opens the app"
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: color.surface,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.md,
      paddingTop: 48,
      paddingBottom: spacing.sm,
    },
    skipBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // textMuted (#666) is 5.7:1 on white — passes WCAG AA for body text.
    skipText: {
      color: color.textMuted,
      fontWeight: font.weight.semibold,
      fontSize: font.size.base,
    },
    scroll: { flex: 1 },
    card: {
      flex: 1,
      paddingHorizontal: spacing.xxxl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xl,
    },
    emoji: { fontSize: font.size.displayLg, textAlign: 'center' },
    // Small position label above the heading — visible AND screen-reader
    // friendly. textMuted (#666) is 5.7:1 on white, AA pass.
    position: {
      fontSize: font.size.sm,
      color: color.textMuted,
      fontWeight: font.weight.semibold,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    title: {
      fontSize: font.size.h2,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      textAlign: 'center',
    },
    body: {
      fontSize: font.size.lg,
      color: color.text,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: 360,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: radius.xs,
      backgroundColor: color.borderStrong,
    },
    dotActive: { backgroundColor: color.brand, width: 22 },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xxl,
      paddingBottom: 36,
      paddingTop: spacing.sm,
      gap: spacing.md,
    },
    backBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backBtnDisabled: { opacity: 0.4 },
    // textMuted again — 5.7:1 on white, AA pass even when not "disabled".
    backBtnText: {
      color: color.textMuted,
      fontWeight: font.weight.semibold,
      fontSize: font.size.base,
    },
    backBtnTextDisabled: { color: color.textMuted },
    primaryBtn: {
      flex: 1,
      backgroundColor: color.brand,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxl,
      borderRadius: radius.lg,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
      ...shadow.e2,
    },
    btnPressed: { opacity: 0.85 },
    primaryBtnText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.lg,
    },
  });
