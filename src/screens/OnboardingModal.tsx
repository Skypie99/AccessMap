import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useReducedMotion } from '@/lib/accessibility';
import { hapticSelection } from '@/lib/haptics';
import { trackEvent } from '@/lib/analytics';
import { AppText } from '@/components/ui/AppText';
import { MapPin, Star, Target } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onDone: () => void;
}

interface Card {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  // Icon-halo tone. 'gold' marks the gamification card (points) — Civic Gold is
  // the design system's gamification accent; the other cards use the brand wash.
  tone: 'brand' | 'gold';
}

const CARDS: Card[] = [
  {
    Icon: MapPin,
    tone: 'brand',
    title: 'Welcome to AccessMap',
    body: 'Drop a pin where you find an accessibility issue — a missing ramp, a broken sidewalk, a blocked path — so others can plan around it, or help fix it.',
  },
  {
    Icon: Target,
    tone: 'brand',
    title: 'Rate the barrier',
    body: 'Rate the issue from 1 (a minor inconvenience) to 5 (completely impassable). The map shows both number and color so the meaning is clear at a glance.',
  },
  {
    Icon: Star,
    tone: 'gold',
    title: 'Earn points together',
    body: 'You earn points when your reports get verified or resolved by others — and when you verify or resolve theirs. Help build the map.',
  },
];

export default function OnboardingModal({ visible, onDone }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  // Announce the new card position to screen readers when the user
  // navigates via Back / Next — mirrors the same pattern in OnboardingCards.
  // WCAG 4.1.3 (Status Messages).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`Step ${index + 1} of ${CARDS.length}`);
  }, [index]);

  // F20: reset to the first card whenever the modal (re)opens. The modal is
  // never unmounted by its parent (only `visible` toggles), so without this a
  // replay would resume at whatever card the user last left off on, with the
  // ScrollView still scrolled there.
  useEffect(() => {
    if (visible) {
      setIndex(0);
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [visible]);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(CARDS.length - 1, next));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: !reducedMotion });
    setIndex(clamped);
    hapticSelection();
  };

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (next !== index) setIndex(next);
  };

  const isLast = index === CARDS.length - 1;

  // Analytics: distinguish finishing the intro from bailing out of it. Both
  // still call onDone(); we just tag which path the user took. platform only —
  // no PII. See src/lib/analytics.ts.
  const handleSkip = () => {
    trackEvent('onboarding_skipped', { platform: Platform.OS });
    onDone();
  };
  const handleComplete = () => {
    trackEvent('onboarding_completed', { platform: Platform.OS });
    onDone();
  };

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={handleSkip}
      presentationStyle="fullScreen"
      aria-label="Welcome to AccessMap"
    >
      {/* accessibilityViewIsModal prevents VoiceOver from focusing elements
          behind this full-screen modal. WCAG 2.4.3 (Focus Order). */}
      <View style={styles.screen} accessibilityViewIsModal>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
          <Pressable
            onPress={handleSkip}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="Skip the introduction"
            hitSlop={12}
          >
            <AppText variant="label" size={font.size.base} color={color.textMuted}>
              Skip
            </AppText>
          </Pressable>
        </View>

        {/* SR-accessible card content — the ScrollView below is hidden from
            AT (swipe is sighted-only), so this View is the ONLY way screen
            reader users hear the card title and body. Updated reactively via
            the `index` state that Back/Next already drive. WCAG 2.5.7. */}
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${CARDS[index]?.title}. ${CARDS[index]?.body}`}
          accessibilityLiveRegion="polite"
          style={styles.srCardContent}
        />

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
          {CARDS.map((card) => {
            const CardIcon = card.Icon;
            const haloBg = card.tone === 'gold' ? color.goldLight : color.brandSofter;
            const iconColor = card.tone === 'gold' ? color.goldDark : color.brand;
            return (
              <View key={card.title} style={[styles.card, { width }]}>
                {/* Vertical scroll so a tall slide (large type / short screen)
                    stays reachable; centered when it fits (G10). The inner
                    vertical scroller reports only contentOffset.y and cannot
                    corrupt the horizontal pager's .x paging math. */}
                <ScrollView
                  style={styles.cardScroll}
                  contentContainerStyle={styles.cardScrollContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  <View style={[styles.iconHalo, { backgroundColor: haloBg }]}>
                    <CardIcon size={56} color={iconColor} strokeWidth={2} />
                  </View>
                  <AppText
                    variant="heading"
                    size={font.size.h2}
                    color={color.textStrong}
                    style={styles.title}
                  >
                    {card.title}
                  </AppText>
                  <AppText variant="body" size={font.size.lg} color={color.text} style={styles.body}>
                    {card.body}
                  </AppText>
                </ScrollView>
              </View>
            );
          })}
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
            <View key={card.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        {/* WCAG 2.5.7 (Dragging Movements): swipe-to-go-back is the only
            backward navigation for sighted users, but the scroll container is
            hidden from AT. When index > 0, render a Back button so VoiceOver,
            TalkBack, and Switch Access users can return to the previous card
            without having to abandon the entire flow via Skip. */}
        <View
          style={[
            styles.actions,
            index > 0 && styles.actionsRow,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          {index > 0 && (
            <Pressable
              onPress={() => goTo(index - 1)}
              style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Back. Step ${index + 1} of ${CARDS.length}.`}
              accessibilityHint="Returns to the previous introduction card"
            >
              <AppText variant="label" size={font.size.lg} color={color.text}>
                Back
              </AppText>
            </Pressable>
          )}
          {!isLast ? (
            <Pressable
              onPress={() => goTo(index + 1)}
              style={({ pressed }) => [
                styles.primaryBtn,
                index > 0 && styles.primaryBtnFlex,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Next. Step ${index + 1} of ${CARDS.length}.`}
              accessibilityHint="Moves to the next introduction card"
            >
              <AppText variant="label" size={font.size.lg} color={color.textOnBrand}>
                Next
              </AppText>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleComplete}
              style={({ pressed }) => [
                styles.primaryBtn,
                styles.primaryBtnLast,
                index > 0 && styles.primaryBtnFlex,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open the map"
              accessibilityHint="Closes the introduction and opens the map"
            >
              <AppText variant="label" size={font.size.lg} color={color.textOnBrand}>
                Open the Map
              </AppText>
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
    scroll: { flex: 1 },
    card: {
      // Each slide fills the pager page; the inner ScrollView owns centering,
      // padding and gap so a tall slide can scroll instead of clipping (G10).
      flex: 1,
    },
    cardScroll: {
      flex: 1,
    },
    cardScrollContent: {
      // flexGrow:1 keeps the content centered when it fits, and lets it grow +
      // scroll when it doesn't (large type / short screen).
      flexGrow: 1,
      paddingHorizontal: spacing.xxxl,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xl,
    },
    // Soft tinted circle behind the card icon — lifts it off the surface and
    // gives each card a focal point. Decorative (the icon is inside, hidden).
    iconHalo: {
      width: 112,
      height: 112,
      borderRadius: radius.circle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      textAlign: 'center',
    },
    body: {
      textAlign: 'center',
      lineHeight: font.lineHeight.relaxed,
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
    // brand is a UI surface color — dot is decorative (hidden from AT).
    dotActive: { backgroundColor: color.brand, width: 22 },
    srCardContent: {
      position: 'absolute',
      width: 1,
      height: 1,
      overflow: 'hidden',
    },
    actions: {
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.sm,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    primaryBtn: {
      backgroundColor: color.brand,
      paddingVertical: spacing.lg,
      borderRadius: radius.lg,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
      ...shadow.e2,
    },
    // Used when Back + Next/Get started share the same row.
    primaryBtnFlex: { flex: 1 },
    // Final "Open the Map" CTA — stronger shadow signals completion.
    primaryBtnLast: {
      shadowOpacity: 0.28,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    btnPressed: { opacity: 0.85 },
    backBtn: {
      flex: 1,
      backgroundColor: color.surfaceNeutral,
      paddingVertical: spacing.lg,
      borderRadius: radius.lg,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
  });
