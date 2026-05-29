import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { font, radius, spacing } from '@/theme';
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
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  body: string;
}

const CARDS: Card[] = [
  {
    icon: 'location-outline',
    iconColor: '#60a5fa',
    title: 'Drop pins where accessibility matters',
    body: 'See a broken sidewalk, a missing ramp, or a blocked path? Drop a pin so others can plan around it. A few seconds from you saves a real headache for someone else.',
  },
  {
    icon: 'checkmark-circle-outline',
    iconColor: '#34d399',
    title: "Verify others' reports",
    body: "When you pass a flagged spot, confirm it's still an issue — or mark it resolved if it's been fixed. That's how the map stays trustworthy over time.",
  },
  {
    icon: 'star-outline',
    iconColor: '#fbbf24',
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

  const card = CARDS[index]!;

  return (
    <Modal visible animationType="fade" onRequestClose={onDone} presentationStyle="fullScreen">
      <View style={styles.screen} accessibilityViewIsModal importantForAccessibility="yes">
        {/* Full-screen gradient */}
        <LinearGradient
          colors={['#070b18', '#0c1628', '#0f2040']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Ambient glow behind icon */}
        <View style={[styles.glowOrb, { backgroundColor: card.iconColor + '22' }]} pointerEvents="none" />

        {/* Skip */}
        <View style={styles.topBar}>
          <Pressable
            onPress={onDone}
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Skip the tutorial"
            accessibilityHint="Closes the tutorial and opens the app"
            hitSlop={12}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Card carousel */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.scroll}
          scrollEnabled={!reduceMotion}
        >
          {CARDS.map((c, i) => (
            <View key={c.title} style={[styles.cardOuter, { width }]}>
              {/* Icon circle */}
              <View style={[styles.iconCircle, { borderColor: c.iconColor + '40', shadowColor: c.iconColor }]}>
                <Ionicons name={c.icon} size={52} color={c.iconColor} />
              </View>

              {/* Position pill */}
              <View style={styles.positionPill}>
                <Text style={styles.positionText}>{`${i + 1} / ${CARDS.length}`}</Text>
              </View>

              {/* Text content — glass card */}
              <View style={styles.cardContent}>
                <Text style={styles.title} accessibilityRole="header">{c.title}</Text>
                <Text style={styles.body}>{c.body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Dots */}
        <View
          style={styles.dotsRow}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {CARDS.map((c, i) => (
            <View key={c.title} style={[styles.dot, i === index && styles.dotActive, i === index && { shadowColor: card.iconColor }]} />
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => goTo(index - 1)}
            disabled={isFirst}
            style={({ pressed }) => [
              styles.backBtn,
              isFirst && styles.backBtnDisabled,
              pressed && !isFirst && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isFirst ? 'Back. Disabled on first card.' : `Back to card ${index} of ${CARDS.length}`}
            accessibilityState={{ disabled: isFirst }}
            hitSlop={8}
          >
            <Text style={[styles.backBtnText, isFirst && styles.backBtnTextDisabled]}>Back</Text>
          </Pressable>

          {!isLast ? (
            <Pressable
              onPress={() => goTo(index + 1)}
              style={({ pressed }) => [pressed && { opacity: 0.88 }]}
              accessibilityRole="button"
              accessibilityLabel={`Next. Card ${index + 1} of ${CARDS.length}.`}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Next</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              onPress={onDone}
              style={({ pressed }) => [pressed && { opacity: 0.88 }]}
              accessibilityRole="button"
              accessibilityLabel="Get Started"
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Get Started</Text>
              </LinearGradient>
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
    glowOrb: {
      position: 'absolute',
      top: '20%',
      alignSelf: 'center',
      width: 280,
      height: 280,
      borderRadius: 140,
      // backgroundColor injected inline — color varies per card
    },
    // New liquid-glass card outer wrapper
    cardOuter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxxl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.md,
      gap: spacing.xl,
    },
    // Circular icon container with subtle glass border + glow
    iconCircle: {
      width: 112,
      height: 112,
      borderRadius: 56,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1.5,
      // borderColor and shadowColor injected inline per card
      alignItems: 'center',
      justifyContent: 'center',
      shadowOpacity: 0.35,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    // "1 / 3" pill indicator
    positionPill: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: radius.circle,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    positionText: {
      fontSize: font.size.sm,
      color: 'rgba(255,255,255,0.55)',
      fontWeight: font.weight.semibold,
      letterSpacing: 0.8,
    },
    // Glass content card holding the title + body
    cardContent: {
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      gap: spacing.sm,
      alignItems: 'center',
      ...(Platform.OS === 'web'
        ? { backdropFilter: 'blur(20px) saturate(140%)' } as object
        : {}),
    },
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
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxl,
      borderRadius: radius.lg,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
      shadowColor: '#2563eb',
      shadowOpacity: 0.45,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    btnPressed: { opacity: 0.85 },
    primaryBtnText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.lg,
    },
  });
