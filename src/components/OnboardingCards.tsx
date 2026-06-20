import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, CheckCircle2, Compass, Map as MapIcon, MapPin, Sparkles, type LucideIcon } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import * as Location from 'expo-location';
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '@/lib/pushNotifications';
import { font, radius, spacing, gradient } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

/**
 * First-launch onboarding — a five-slide standalone carousel:
 *  1. Welcome (value prop + app name)
 *  2. How it works (report → photo → severity)
 *  3. Location permission priming (explains BEFORE the OS prompt fires)
 *  4. Notifications permission priming (soft ask — skippable)
 *  5. You're ready (final "Open the Map" CTA)
 *
 * Shown ABOVE the rest of the app on the very first launch, gated by the
 * device-wide flag in src/lib/onboardingState.ts. After completion or
 * skip, it never shows again on this device.
 *
 * Permission slides PRIME, then fire the real OS prompt on tap — this is the
 * accessibility-respectful pattern (the user understands why before the
 * dialog appears) and it raises grant rates. Onboarding runs BEFORE sign-in,
 * so the notifications slide only requests OS permission; the push token is
 * registered later by the post-sign-in Settings toggle. Denying or skipping
 * either permission never blocks the user from reaching the map.
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
 *  - "Card N of 5" is announced two ways: (a) a small visible position
 *    label above the heading that screen readers pick up, and (b) an
 *    AccessibilityInfo.announceForAccessibility() when the active card
 *    changes via Back/Next/swipe.
 *  - Respects the OS "Reduce Motion" setting: when on, the swipe paging
 *    animation is skipped (cards still navigable via Back/Next).
 *  - Decorative icons are hidden from assistive tech (text describes the
 *    same thing without them).
 *  - Skip / Back / Next / permission buttons are all ≥44pt high with
 *    explicit labels and hints; the Back button on card 1 is announced
 *    as disabled.
 */

interface Props {
  onDone: () => void;
}

// Which OS permission a slide primes, if any. Drives the action button copy,
// the "already granted" check, and the success (green check) state.
type PermissionKind = 'location' | 'notifications';

interface Card {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  body: string;
  // Slide primes this OS permission and fires the prompt on its primary tap.
  permission?: PermissionKind;
  // The final slide — primary button is "Open the Map" and finishes onboarding.
  isFinal?: boolean;
}

// Icon accents are brand-anchored (not a rainbow): brand blue on dark for the
// informational/permission slides, with the gold reward accent saved for the
// final "you're all set" celebration. The granted state stays semantic green.
const CARDS: Card[] = [
  {
    icon: Compass,
    iconColor: '#60a5fa',
    title: 'Welcome to AccessMap',
    body: 'See an accessibility barrier — a missing ramp, a broken sidewalk, a blocked path? Put it on the map so others know, and so it gets fixed.',
  },
  {
    icon: MapIcon,
    iconColor: '#60a5fa',
    title: "Here's how it works",
    body: 'Tap where the barrier is, snap a photo if you can, and rate how bad it is. Other people verify your report or mark it resolved once the issue is fixed.',
  },
  {
    icon: MapPin,
    iconColor: '#60a5fa',
    title: 'Show flags near you',
    body: "We’ll use your location to show nearby barriers and place your reports accurately. It’s only used while the app is open — never tracked or stored on our servers.",
    permission: 'location',
  },
  {
    icon: Bell,
    iconColor: '#60a5fa',
    title: 'Stay in the loop',
    body: 'Get a heads-up when flags near you are verified or resolved. Totally optional — you can turn this on later in Settings.',
    permission: 'notifications',
  },
  {
    icon: Sparkles,
    iconColor: '#FBB024',
    title: "You're all set",
    body: 'Go explore your neighbourhood. Every barrier you flag helps someone navigate the world a little easier.',
    isFinal: true,
  },
];

export default function OnboardingCards({ onDone }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  // Per-permission status. null = not checked yet / unavailable here (web or
  // expo-notifications absent); true/false = granted/denied.
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);

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

  // Animated values driving each dot's width — 22pt pill when active, 8pt
  // circle otherwise. useNativeDriver must be false because 'width' is a
  // layout property; spring gives a brief premium settle feel.
  const dotWidths = useRef(
    CARDS.map((_, i) => new Animated.Value(i === 0 ? 22 : 8)),
  ).current;

  useEffect(() => {
    if (reduceMotion) {
      dotWidths.forEach((anim, i) => anim.setValue(i === index ? 22 : 8));
    } else {
      Animated.parallel(
        dotWidths.map((anim, i) =>
          Animated.spring(anim, {
            toValue: i === index ? 22 : 8,
            speed: 18,
            bounciness: 3,
            useNativeDriver: false,
          }),
        ),
      ).start();
    }
  }, [index, dotWidths, reduceMotion]);

  // When the active card changes (Back/Next/swipe), announce the new
  // position so screen reader users get the "Card N of 4" context even
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

  const card = CARDS[index]!;
  const permission = card.permission;
  // Granted state for the ACTIVE card's permission (null for non-permission
  // slides, or while we're still checking / it's unavailable here).
  const currentGranted =
    permission === 'location'
      ? locationGranted
      : permission === 'notifications'
        ? notifGranted
        : null;
  // On native, a permission slide is "checking" until its no-prompt lookup
  // resolves; we disable its primary button during that brief window so the
  // label doesn't flip from "Continue" to "Allow…" under the user's finger.
  const permissionChecking =
    permission != null && Platform.OS !== 'web' && currentGranted === null;
  // The notifications slide shows a "Maybe later" escape hatch until granted.
  const showMaybeLater = permission === 'notifications' && currentGranted !== true;

  // When the user reaches a permission slide, read the current status WITHOUT
  // prompting. A returning user who already granted sees a "you're set"
  // Continue button instead of a redundant OS dialog.
  useEffect(() => {
    if (!permission || Platform.OS === 'web') return;
    let cancelled = false;
    const check =
      permission === 'location'
        ? Location.getForegroundPermissionsAsync().then(({ status }) => status === 'granted')
        : getNotificationPermission();
    check.then((granted) => {
      if (cancelled) return;
      if (permission === 'location') setLocationGranted(granted);
      else setNotifGranted(granted);
    });
    return () => {
      cancelled = true;
    };
  }, [permission]);

  // Tapping a permission slide's primary button: fire the OS prompt (unless
  // already granted or on web), record the result, then advance to the next
  // slide. Denying never blocks progress — the user still reaches the map.
  const handlePermissionAction = async () => {
    if (Platform.OS === 'web' || currentGranted === true) {
      goTo(index + 1);
      return;
    }
    if (permission === 'location') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
    } else if (permission === 'notifications') {
      setNotifGranted(await requestNotificationPermission());
    }
    goTo(index + 1);
  };

  return (
    <Modal visible animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onDone} presentationStyle="fullScreen">
      <View style={styles.screen} accessibilityViewIsModal importantForAccessibility="yes">
        {/* Full-screen gradient */}
        <LinearGradient
          colors={['#070b18', '#0c1628', '#0f2040']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Ambient glow behind icon — color tracks the active card */}
        <View
          style={[
            styles.glowOrb,
            {
              backgroundColor:
                currentGranted === true ? '#34d39922' : card.iconColor + '22',
            },
          ]}
          pointerEvents="none"
        />

        {/* Skip — visible on every card including the permission card */}
        <View style={styles.topBar}>
          <Pressable
            onPress={onDone}
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Skip the tutorial"
            accessibilityHint="Closes the tutorial and opens the app"
            hitSlop={12}
          >
            <AppText variant="label" style={styles.skipText}>Skip</AppText>
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
          {CARDS.map((c, i) => {
            // For a permission slide, the icon and body reflect live status:
            // once granted, the icon becomes a green check and the body
            // confirms it, so the user gets clear feedback in-place.
            const cardGranted =
              (c.permission === 'location' && locationGranted === true) ||
              (c.permission === 'notifications' && notifGranted === true);
            const EffectiveIcon: LucideIcon = cardGranted ? CheckCircle2 : c.icon;
            const effectiveColor = cardGranted ? '#34d399' : c.iconColor;
            const effectiveBody = cardGranted
              ? c.permission === 'location'
                ? "Location is on — you're all set."
                : "Notifications are on — you're all set."
              : c.body;
            return (
              <View key={c.title} style={[styles.cardOuter, { width }]}>
                {/* Icon circle — decorative; card heading conveys the same meaning */}
                <View
                  style={[
                    styles.iconCircle,
                    { borderColor: effectiveColor + '40', shadowColor: effectiveColor },
                  ]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <EffectiveIcon size={52} color={effectiveColor} strokeWidth={2} />
                </View>

                {/* Position pill */}
                <View style={styles.positionPill}>
                  <AppText variant="label" style={styles.positionText}>{`${i + 1} / ${CARDS.length}`}</AppText>
                </View>

                {/* Text content — glass card */}
                <View style={styles.cardContent}>
                  <AppText variant="heading" style={styles.title} accessibilityRole="header">
                    {c.title}
                  </AppText>
                  <AppText variant="body" style={styles.body}>{effectiveBody}</AppText>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Dots — decorative, hidden from assistive tech */}
        <View
          style={styles.dotsRow}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {CARDS.map((c, i) => {
            const dotColor = currentGranted === true ? '#34d399' : card.iconColor;
            const isActive = i === index;
            return (
              <Animated.View
                key={c.title}
                style={[
                  styles.dot,
                  { width: dotWidths[i] },
                  isActive && {
                    backgroundColor: dotColor,
                    shadowColor: dotColor,
                    shadowOpacity: 0.55,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 3,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Actions */}
        <View style={[styles.actions, showMaybeLater && styles.actionsTight]}>
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
            <AppText variant="label" style={[styles.backBtnText, isFirst && styles.backBtnTextDisabled]}>Back</AppText>
          </Pressable>

          {card.isFinal ? (
            // Final slide: finish onboarding and drop the user on the map.
            <Pressable
              onPress={onDone}
              style={({ pressed }) => [pressed && { opacity: 0.88 }]}
              accessibilityRole="button"
              accessibilityLabel="Open the map"
              accessibilityHint="Closes the introduction and opens AccessMap"
            >
              <LinearGradient
                colors={gradient.brandHero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                <AppText variant="label" style={styles.primaryBtnText}>Open the Map</AppText>
              </LinearGradient>
            </Pressable>
          ) : permission && currentGranted !== true ? (
            // Permission slide, not yet granted: prime + fire the OS prompt.
            // Disabled briefly while we check existing permission (null state).
            <Pressable
              onPress={handlePermissionAction}
              disabled={permissionChecking}
              style={({ pressed }) => [
                pressed && { opacity: 0.88 },
                permissionChecking && { opacity: 0.5 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                permission === 'location' ? 'Allow location access' : 'Turn on notifications'
              }
              accessibilityHint={
                permission === 'location'
                  ? 'Opens the system location permission dialog, then continues'
                  : 'Opens the system notifications permission dialog, then continues'
              }
              accessibilityState={{ disabled: permissionChecking }}
            >
              <LinearGradient
                colors={gradient.brandHero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                <AppText variant="label" style={styles.primaryBtnText}>
                  {permission === 'location' ? 'Allow Location' : 'Turn on Notifications'}
                </AppText>
              </LinearGradient>
            </Pressable>
          ) : (
            // Non-permission slide (Next), or a permission already granted
            // (Continue): advance to the next slide.
            <Pressable
              onPress={() => goTo(index + 1)}
              style={({ pressed }) => [pressed && { opacity: 0.88 }]}
              accessibilityRole="button"
              accessibilityLabel={
                permission ? 'Continue' : `Next. Card ${index + 1} of ${CARDS.length}.`
              }
            >
              <LinearGradient
                colors={gradient.brandHero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                <AppText variant="label" style={styles.primaryBtnText}>{permission ? 'Continue' : 'Next'}</AppText>
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Soft-ask escape hatch on the notifications slide: skip the prompt
            and continue without granting. The top-right "Skip" exits all of
            onboarding; this only skips notifications. */}
        {showMaybeLater && (
          <Pressable
            onPress={() => goTo(index + 1)}
            style={({ pressed }) => [styles.maybeLaterBtn, pressed && { opacity: 0.6 }]}
            accessibilityRole="button"
            accessibilityLabel="Maybe later"
            accessibilityHint="Skips notifications and continues to the next step"
            hitSlop={8}
          >
            <AppText variant="label" style={styles.maybeLaterText}>Maybe later</AppText>
          </Pressable>
        )}
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
    // Always on a dark gradient — hardcoded semi-transparent white so the
    // contrast holds regardless of system light/dark mode.
    skipText: {
      color: 'rgba(255,255,255,0.65)',
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
    // "1 / 4" pill indicator
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
        ? ({ backdropFilter: 'blur(20px) saturate(140%)' } as object)
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
      fontSize: font.size.h1,
      fontWeight: font.weight.bold,
      letterSpacing: font.tracking.h1,
      // WCAG 1.4.3: hardcoded white-blue (not theme token) because this screen
      // forces a dark gradient background regardless of the OS light/dark mode.
      // Using color.textStrong in light mode would render dark text on dark bg.
      color: '#f0f6ff',
      textAlign: 'center',
    },
    body: {
      fontSize: font.size.lg,
      // WCAG 1.4.3: same reasoning as title — forced dark background needs
      // hardcoded light text. rgba(220,235,255,0.9) on #070b18 ≈ 12:1, AA pass.
      color: 'rgba(220,235,255,0.9)',
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
    // Always on dark gradient — white with low opacity for inactive.
    dot: {
      width: 8,
      height: 8,
      borderRadius: radius.xs,
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    // dotActive intentionally left empty — width is driven by Animated.Value,
    // backgroundColor/shadow are injected inline with the card's iconColor so
    // the glow tracks the active card's accent. Nothing to declare statically.
    dotActive: {},
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xxl,
      paddingBottom: 36,
      paddingTop: spacing.sm,
      gap: spacing.md,
    },
    // When the "Maybe later" link follows, the action row gives up its big
    // bottom inset so the two sit together and the link carries it instead.
    actionsTight: {
      paddingBottom: spacing.sm,
    },
    maybeLaterBtn: {
      alignSelf: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      marginBottom: 28,
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // On the dark gradient — semi-transparent white, ~7:1 on #070b18, AA pass.
    maybeLaterText: {
      color: 'rgba(255,255,255,0.65)',
      fontWeight: font.weight.semibold,
      fontSize: font.size.base,
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
    // Always on dark gradient — hardcoded semi-transparent white.
    backBtnText: {
      color: 'rgba(255,255,255,0.65)',
      fontWeight: font.weight.semibold,
      fontSize: font.size.base,
    },
    backBtnTextDisabled: { color: 'rgba(255,255,255,0.25)' },
    primaryBtn: {
      flex: 1,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xxl,
      borderRadius: radius.lg,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
      shadowColor: '#1466E0',
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
