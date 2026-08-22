import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { decorativeProps, isAxRecompose, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { hapticSelection } from '@/lib/haptics';
import { trackEvent } from '@/lib/analytics';
import { AppText } from '@/components/ui/AppText';
import { OverflowFade } from '@/components/ui/OverflowFade';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { useVerticalOverflowFade } from '@/hooks/useOverflowFade';
import { severityColor } from '@/lib/flags';
import {
  ONBOARDING_BODY_MAX_FONT_SCALE,
  ONBOARDING_TITLE_MAX_FONT_SCALE,
} from '@/components/OnboardingCards';
import { Star, Target } from 'lucide-react-native';
import LogoMark from '@/components/LogoMark';

/**
 * The Settings "Replay tutorial" — three steps, and the surface that was RIGHT
 * about the look before the first-launch flow was.
 *
 * 2026-08-22 (board 05): this screen already lived in the light and already
 * read as the product, which is the observation the whole phase turned on. What
 * it did not have was the composition — its hero sat dead-centre with ~300pt of
 * white above it, centred-by-default in the other direction. It now wears the
 * same template as `OnboardingCards`: the real ScreenStage, one bottom-anchored
 * hero-and-copy zone, left-aligned editorial type, stones for progress, and a
 * fixed CTA column that stacks at the recomposition point. Two surfaces, one
 * drawing.
 *
 * What deliberately did NOT converge (see onboardingCoherence.guard.test.ts):
 * the step count, the "Step N of 3" vocabulary, the "Done" finisher, and the
 * card scripts. Those are the differences Sky ratified; only the drawing was
 * ever accidental.
 */
interface Props {
  visible: boolean;
  onDone: () => void;
}

interface Card {
  // Stock Lucide icon for the slide. Omitted on the brand-mark slide.
  Icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  // Slide 1 wears the ownable Wayfinder mark (LogoMark) instead of a stock
  // Lucide glyph — PROTECT-16, wear the house mark more.
  brandMark?: boolean;
  title: string;
  body: string;
  // Hero-disc tone. 'gold' marks the gamification card (points) — Civic Gold is
  // the design system's gamification accent; the other cards use the brand wash.
  tone: 'brand' | 'gold';
}

const CARDS: Card[] = [
  {
    brandMark: true,
    tone: 'brand',
    title: 'Welcome to Flagstone',
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

/**
 * Board 05's editorial type, shared verbatim with the first-launch flow. Both
 * sizes sit between scale steps and are named here for the same reason they are
 * named there; see OnboardingCards for the note.
 */
const TITLE_SIZE = 34;
const BODY_SIZE = 17;

/** Progress: a 10pt stone per step, the current one stretched into a bar. */
const DOT = 10;
const DOT_ACTIVE = 26;

/**
 * Which stone each step lights. The path runs 1, 3, 5 across three steps rather
 * than 1, 2, 3 — the same ramp the five-card flow walks, sampled — so the two
 * surfaces read as one drawing at different lengths. The last is overridden to
 * Civic Gold, matching the gold tone this step already wore.
 */
const SEVERITIES = [1, 3, 5] as const;

export default function OnboardingModal({ visible, onDone }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { width, fontScale } = useWindowDimensions();
  // F4 — the same recomposition point the first-launch flow uses.
  const wide = isAxRecompose(fontScale);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): move the SR cursor onto the announced card content when
  // this surface opens (the pager is AT-hidden; this View is the SR surface).
  const srCardRef = useFocusOnOpen<View>(visible);
  // Track visibility across commits so the position announce fires only on the
  // true open edge (false→true) — never on the initial closed mount, nor on an
  // incidental re-render while already open. `prevIndex` (open-resets folded to
  // 0) distinguishes a genuine card change from the reset's index settle, so
  // the reset never double-announces.
  const wasVisible = useRef(false);
  const prevIndex = useRef(0);

  // Announce the current card position to screen readers. This ONE effect owns
  // every position announce — navigation (index changes while open) AND the
  // open edge — gated on `visible` so the always-mounted modal stays silent
  // while closed (no phantom "Step 1 of 3" leaking to VoiceOver on the Settings
  // screen, which keeps this modal permanently mounted). Motion-decoupled by
  // design. WCAG 4.1.3 (Status Messages).
  useEffect(() => {
    const opening = visible && !wasVisible.current;
    const movedWhileOpen = visible && wasVisible.current && index !== prevIndex.current;
    wasVisible.current = visible;
    if (opening) {
      // On the open commit `index` may still hold the stale pre-reset value, so
      // hard-code position 1 (the reset target) — this is exactly how we avoid
      // speaking "Step 3 of 3" before "Step 1 of 3". Baseline prevIndex to 0 so
      // the reset's follow-up index settle isn't read as a move.
      prevIndex.current = 0;
      AccessibilityInfo.announceForAccessibility(`Step 1 of ${CARDS.length}`);
    } else if (movedWhileOpen) {
      prevIndex.current = index;
      AccessibilityInfo.announceForAccessibility(`Step ${index + 1} of ${CARDS.length}`);
    } else {
      // Closing edge, closed mount, or the reset's index settle → silent.
      prevIndex.current = index;
    }
  }, [index, visible]);

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
      aria-label="Welcome to Flagstone"
    >
      {/* accessibilityViewIsModal prevents VoiceOver from focusing elements
          behind this full-screen modal. WCAG 2.4.3 (Focus Order). */}
      <View
        style={styles.screen}
        accessibilityViewIsModal
        // G1: routes to handleSkip, NOT a raw close. handleSkip fires
        // trackEvent('onboarding_skipped') before onDone, so a raw close would
        // silently under-count skips and corrupt the funnel — the one place in
        // this pass where the obvious handler is the wrong one.
        onAccessibilityEscape={handleSkip}
      >
        {/* The app's real stage, both palettes — the same one the first-launch
            flow now mounts. This screen used to be a flat `color.surface`, which
            was already the right WORLD but not the right ground. */}
        <ScreenStage />

        {/* Skip — steps 1 and 2. There is nothing left to skip on the finisher,
            and the row keeps its height there so nothing below it moves. */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
          {!isLast ? (
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Skip the introduction"
              hitSlop={12}
            >
              <AppText variant="label" size={font.size.md} color={color.inkGlassMuted}>
                Skip
              </AppText>
            </Pressable>
          ) : null}
        </View>

        {/* SR-accessible card content — the ScrollView below is hidden from
            AT (swipe is sighted-only), so this View is the ONLY way screen
            reader users hear the card title and body. Updated reactively via
            the `index` state that Back/Next already drive. WCAG 2.5.7. */}
        <View
          ref={srCardRef}
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
          style={styles.scroll} {...decorativeProps}
        >
          {CARDS.map((card) => {
            const CardIcon = card.Icon;
            const discBg = card.tone === 'gold' ? color.goldLight : color.brandSoft;
            const iconColor = card.tone === 'gold' ? color.goldDark : color.brandOnSoft;
            return (
              <View key={card.title} style={[styles.card, { width }]}>
                {/* The copy scrolls INSIDE the hero zone when it has to; the
                    progress row and the CTA below stay pinned. flexGrow keeps
                    the block anchored to the bottom of the zone when it fits
                    (G10) — the shipped version centred it, which left ~300pt of
                    empty screen above the mark with Skip floating alone in it. */}
                <CopyZone contentStyle={[styles.hero, wide && styles.heroWide]} styles={styles}>
                  {card.brandMark ? (
                    /* The house pin, unframed, at the size it deserves — the
                       same hero card 1 of the first-launch flow wears. */
                    <View style={styles.heroRow}>
                      <LogoMark size={wide ? 39 : 56} variant="mono" tint={color.brand} />
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.heroDisc,
                        {
                          width: wide ? 40 : 56,
                          height: wide ? 40 : 56,
                          backgroundColor: discBg,
                        },
                      ]}
                    >
                      {CardIcon ? (
                        <CardIcon size={wide ? 20 : 28} color={iconColor} strokeWidth={2} />
                      ) : null}
                    </View>
                  )}
                  <AppText
                    variant="display"
                    size={TITLE_SIZE}
                    color={color.textStrong}
                    maxFontSizeMultiplier={ONBOARDING_TITLE_MAX_FONT_SCALE}
                    style={styles.title}
                  >
                    {card.title}
                  </AppText>
                  <AppText
                    variant="bodyMedium"
                    size={BODY_SIZE}
                    color={color.text}
                    maxFontSizeMultiplier={ONBOARDING_BODY_MAX_FONT_SCALE}
                    style={styles.body}
                  >
                    {card.body}
                  </AppText>
                </CopyZone>
              </View>
            );
          })}
        </ScrollView>

        {/* Stones, not dots — the same progress drawing the first-launch flow
            uses: the current one stretches into a bar and wears its own severity
            colour, and the finisher's turns Civic Gold. Purely decorative;
            position is announced by announceForAccessibility and repeated in the
            button labels, so it never rests on colour alone (WCAG 1.4.1). */}
        <View style={styles.progress} {...decorativeProps}>
          {CARDS.map((card, i) => {
            const isActive = i === index;
            const isLastStone = i === CARDS.length - 1;
            return (
              <View
                key={card.title}
                style={[
                  styles.dot,
                  isActive && { width: DOT_ACTIVE * Math.min(fontScale, 1.3) },
                  isActive && {
                    backgroundColor: isLastStone ? color.goldAccent : severityColor(SEVERITIES[i]!),
                  },
                ]}
              />
            );
          })}
        </View>

        {/* WCAG 2.5.7 (Dragging Movements): swipe-to-go-back is the only
            backward navigation for sighted users, but the scroll container is
            hidden from AT. When index > 0, render a Back button so VoiceOver,
            TalkBack, and Switch Access users can return to the previous card
            without having to abandon the entire flow via Skip. */}
        {/* Actions — a text Back and a FIXED 200pt primary, the same column the
            first-launch flow uses, so the CTA's left edge never walks step to
            step. Back is CONDITIONALLY RENDERED rather than disabled here (it
            always has been, and that is the better a11y answer on a surface a
            user opened deliberately); the row's justification is what holds the
            primary still on step 1. */}
        <View
          style={[
            styles.ctaRow,
            wide && styles.ctaRowStacked,
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
              <AppText variant="label" size={font.size.md} color={color.inkGlassMuted}>
                Back
              </AppText>
            </Pressable>
          )}
          {!isLast ? (
            <Pressable
              onPress={() => goTo(index + 1)}
              style={({ pressed }) => [
                styles.primaryBtn,
                wide && styles.primaryBtnWide,
                pressed && styles.primaryBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Next. Step ${index + 1} of ${CARDS.length}.`}
              accessibilityHint="Moves to the next introduction card"
            >
              <AppText variant="label" size={font.size.md} color={color.textOnBrand} style={styles.primaryBtnText}>
                Next
              </AppText>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleComplete}
              style={({ pressed }) => [
                styles.primaryBtn,
                wide && styles.primaryBtnWide,
                pressed && styles.primaryBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Done"
              accessibilityHint="Closes the introduction"
            >
              <AppText variant="label" size={font.size.md} color={color.textOnBrand} style={styles.primaryBtnText}>
                Done
              </AppText>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

/**
 * The scrolling copy zone plus the scent its clipped edge needs — the same
 * shape (and the same shared fade) the first-launch flow uses. See
 * OnboardingCards for the finding this closes.
 */
function CopyZone({
  contentStyle,
  styles,
  children,
}: {
  contentStyle: StyleProp<ViewStyle>;
  styles: ReturnType<typeof makeStyles>;
  children: React.ReactNode;
}) {
  const fade = useVerticalOverflowFade();
  return (
    <View style={styles.copyZone}>
      <ScrollView
        style={styles.cardScroll}
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        {...fade.scrollHandlers}
      >
        {children}
      </ScrollView>
      <OverflowFade visible={fade.hasMore} orientation="vertical" />
    </View>
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
      // Paired with <ScreenStage/> per its own portability note, so any
      // pre-mount frame matches the wash instead of flashing a flat surface.
      backgroundColor: color.stage1,
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
    // The positioned parent the bottom fade paints over.
    copyZone: {
      flex: 1,
      position: 'relative',
    },
    cardScroll: {
      flex: 1,
    },
    // Board 05: hero + copy in ONE bottom-anchored zone. flexGrow keeps it
    // pinned to the bottom of the zone when the content fits and lets it grow
    // and scroll when it does not (G10).
    hero: {
      flexGrow: 1,
      justifyContent: 'flex-end',
      gap: spacing.lg,
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xl,
    },
    // T5 — widen the column BEFORE capping the text, and move the hero to the
    // top so the copy owns the middle of the screen.
    heroWide: {
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxxl,
    },
    heroRow: {
      flexDirection: 'row',
    },
    // Soft tinted circle behind the step's glyph. Decorative; the title says
    // the same thing.
    heroDisc: {
      borderRadius: radius.circle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      textAlign: 'left',
      lineHeight: Math.round(TITLE_SIZE * 1.08),
    },
    body: {
      textAlign: 'left',
      lineHeight: Math.round(BODY_SIZE * 1.4),
    },
    progress: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    dot: {
      width: DOT,
      height: DOT,
      borderRadius: radius.full,
      backgroundColor: color.borderStrong,
    },
    srCardContent: {
      position: 'absolute',
      width: 1,
      height: 1,
      overflow: 'hidden',
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      // flex-end on step 1 (no Back) keeps the primary in the same place it
      // sits on steps 2 and 3, which is the whole point of a fixed column.
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.sm,
    },
    // F4 — the row stacks and the primary goes full width at the recomposition
    // point. column-reverse puts the primary first on screen while leaving the
    // source order (Back, then primary) alone, so reading order is unchanged.
    ctaRowStacked: {
      flexDirection: 'column-reverse',
      alignItems: 'stretch',
      gap: spacing.sm,
    },
    primaryBtn: {
      // A FIXED width, not a content width. SW-17: this button read "Open the
      // Map" and returned to Settings, which is the correct destination for a
      // replay opened from there — so the label moved, not the behaviour. Sky
      // ratified "Done" 2026-08-21.
      // brand → ctaFill: white-on-brand is the recorded 3.4:1 dark-mode FAIL
      // (see TasksScreen ctaFill note); ctaFill passes in both modes.
      width: 200,
      marginLeft: 'auto',
      backgroundColor: color.ctaFill,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    primaryBtnWide: { width: undefined, marginLeft: 0, alignSelf: 'stretch' },
    primaryBtnPressed: { backgroundColor: color.ctaFillPressed },
    primaryBtnText: { textAlign: 'center' },
    btnPressed: { opacity: 0.85 },
    backBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      minHeight: 44,
      minWidth: 44,
      justifyContent: 'center',
    },
  });
