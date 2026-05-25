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
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useReducedMotion } from '@/lib/accessibility';

interface Props {
  visible: boolean;
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
    title: 'Welcome to AccessMap',
    body:
      "Drop a pin where you find an accessibility issue — a missing ramp, a broken sidewalk, a blocked path — so others can plan around it, or help fix it.",
  },
  {
    emoji: '🎯',
    title: 'Severity 1 to 5',
    body:
      "When you report a flag, pick how bad it is. 1 is a minor inconvenience, 5 is impassable. The map shows both the number and a color so the meaning is clear even without color vision.",
  },
  {
    emoji: '⭐',
    title: 'Earn points together',
    body:
      "You earn points when your reports get verified or resolved by others — and when you verify or resolve theirs. Help build the map.",
  },
];

export default function OnboardingModal({ visible, onDone }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  // Announce the new card position to screen readers when the user
  // navigates via Back / Next — mirrors the same pattern in OnboardingCards.
  // WCAG 4.1.3 (Status Messages).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      `Step ${index + 1} of ${CARDS.length}`,
    );
  }, [index]);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(CARDS.length - 1, next));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: !reducedMotion });
    setIndex(clamped);
  };

  const handleScroll = (e: {
    nativeEvent: { contentOffset: { x: number } };
  }) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (next !== index) setIndex(next);
  };

  const isLast = index === CARDS.length - 1;

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onDone}
      presentationStyle="fullScreen"
    >
      {/* accessibilityViewIsModal prevents VoiceOver from focusing elements
          behind this full-screen modal. WCAG 2.4.3 (Focus Order). */}
      <View style={styles.screen} accessibilityViewIsModal>
        <View style={styles.topBar}>
          <Pressable
            onPress={onDone}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="Skip the introduction"
            hitSlop={12}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Swipe is a sighted-only affordance. AT users navigate via the
            Next / Skip buttons below; the scroll container and its children
            are removed from the AT tree (accessibilityElementsHidden +
            importantForAccessibility) so VoiceOver/TalkBack can't wander
            into off-screen cards. WCAG 2.5.7 (Dragging Movements). */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.scroll}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {CARDS.map((card, i) => (
            <View
              key={card.title}
              style={[styles.card, { width }]}
            >
              <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
                {card.emoji}
              </Text>
              <Text style={styles.title}>{card.title}</Text>
              <Text style={styles.body}>{card.body}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Dots are purely decorative — position announced by announceForAccessibility
            + button labels. WCAG 1.4.1 (Use of Color): position is not conveyed
            by color alone (labels + counter carry the meaning). */}
        <View
          style={styles.dotsRow}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {CARDS.map((card, i) => (
            <View
              key={card.title}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          {!isLast ? (
            <Pressable
              onPress={() => goTo(index + 1)}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Next. Step ${index + 1} of ${CARDS.length}.`}
              accessibilityHint="Moves to the next introduction card"
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onDone}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Get started using AccessMap"
              accessibilityHint="Closes the introduction and opens the app"
            >
              <Text style={styles.primaryBtnText}>Get started</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

/**
 * Themed style factory — migrated from static StyleSheet (wave 6 a11y pass).
 * Using theme tokens ensures this modal adapts to dark mode correctly and
 * all color/spacing values stay in sync with the design system.
 * WCAG 1.4.3 (Contrast) — all text/bg pairings delegated to ThemeContext
 * which has been contrast-checked for both light and dark palettes.
 */
const makeStyles = (color: ColorTheme) => StyleSheet.create({
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
  // textMuted: #666 on #fff = 5.7:1 (light) / #aaa on #111 = 6.7:1 (dark) — AA pass.
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
  title: {
    fontSize: font.size.h2,
    fontWeight: font.weight.bold,
    // textStrong: #222 on #fff = 16:1 (light) / #f5f5f5 on #111 = 18:1 (dark) — AA pass.
    color: color.textStrong,
    textAlign: 'center',
  },
  body: {
    fontSize: font.size.lg,
    // text: #333 on #fff = 12.6:1 (light) / #ddd on #111 = 13:1 (dark) — AA pass.
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
  // brand (#2f80ed) is a UI surface color — dot is decorative (hidden from AT).
  dotActive: { backgroundColor: color.brand, width: 22 },
  actions: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 36,
    paddingTop: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: color.brand,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  btnPressed: { opacity: 0.85 },
  // textOnBrand: #fff on brand = 3.3:1 — passes WCAG 1.4.3 for large bold text
  // (16pt bold = "large text" threshold per WCAG 2.2, 3:1 minimum).
  primaryBtnText: {
    color: color.textOnBrand,
    fontWeight: font.weight.bold,
    fontSize: font.size.lg,
  },
});
