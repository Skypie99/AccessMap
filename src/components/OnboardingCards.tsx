import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Bell, Check, type LucideIcon } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { TYPE_BLOCK } from '@/components/ui/TypeBlock';
import LogoMark from '@/components/LogoMark';
import { DISC_MAX_GROWTH, SeverityDisc } from '@/components/SeverityDisc';
import * as Location from 'expo-location';
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '@/lib/pushNotifications';
import { a11yToggle, decorativeProps, isAxRecompose, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { trackEvent } from '@/lib/analytics';
import { SEVERITY_LABELS, SEVERITY_ORDER, severityColor } from '@/lib/flags';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

/**
 * First-launch onboarding — a five-slide standalone carousel:
 *  1. Welcome (value prop + app name)
 *  2. How it works (report → photo → severity)
 *  3. Location permission priming (explains BEFORE the OS prompt fires)
 *  4. Notifications permission priming (soft ask — skippable)
 *  5. You're ready (final "Continue" CTA)
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
 * ─── 2026-08-22 · board 05, "onboarding in the light" ─────────────────────
 * This screen used to be its OWN dark world: a bespoke gradient, a glow orb, a
 * hand-rolled glass card, and a centred composition in which the card cut
 * across the hero, the hero slid whenever the footer gained a row, and TWO
 * indicators (a "N / 5" pill and a dot row) said the same thing. The app's own
 * Settings replay already proved the light version reads as the product.
 *
 * Sky's ruling (Q4): onboarding joins the themed app. The real `ScreenStage`
 * carries both palettes, so the intro and the app are one place. What replaced
 * the template:
 *   - ONE layout for all five cards. Hero + copy sit in a bottom-anchored
 *     flexible zone; the progress row, the decline slot and the CTA row are
 *     pinned chrome below it, and the decline slot is RESERVED on every card
 *     so nothing above it can move card to card. That is the whole fix for the
 *     sliding hero, and it also holds still when a permission flips to granted.
 *   - The severity discs are the hero of card 2 at 48pt, drawn by the
 *     production `SeverityDisc`, and the progress indicator is five stones with
 *     the current one stretched into a bar. One indicator, not two.
 *   - The brand's own pin does the identity work on cards 1, 3 and 5; the
 *     four-point AI sparkle is gone from the finisher.
 *   - At the recomposition point (>=1.5x, rule F4) the hero moves to the top at
 *     0.7 scale, the copy column goes full bleed, the body caps at 2.0 (rule
 *     T5's width rule — "accessibility" must not break mid-word) and the CTA
 *     row stacks full-width. No card, so nothing left to collide with.
 *
 * Accessibility notes:
 *  - The root surface sets accessibilityViewIsModal so VoiceOver focus
 *    stays contained inside the onboarding overlay and can't escape to
 *    the underlying auth screen.
 *  - The card heading uses accessibilityRole="header" as a STANDALONE
 *    element — the card container does NOT set `accessible`, so children
 *    (heading, body) are individually focusable and the heading rotor works.
 *  - "Card N of 5" is announced when the active card CHANGES. It is
 *    deliberately silent on mount: `useFocusOnOpen` already moves the
 *    VoiceOver cursor onto card 1's heading, and announcing over that focus
 *    jump is the D21 double-speak. Same guard shape as OnboardingModal's.
 *  - Respects the OS "Reduce Motion" setting: when on, the swipe paging
 *    animation is skipped (cards still navigable via Back/Next).
 *  - Decorative icons are hidden from assistive tech (text describes the
 *    same thing without them).
 *  - Skip / Back / Next / permission buttons are all >=44pt high with
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
  /** Stock Lucide icon, drawn inside the brand disc. Omitted on mark slides. */
  icon?: LucideIcon;
  title: string;
  body: string;
  /**
   * Board 05: the hero is one of three things, never a glyph-on-a-gradient.
   *   mark  — the Flagstone pin at full size, unframed (cards 1 and 5)
   *   discs — the five production severity discs (card 2, the one moment that
   *           is genuinely this product's)
   *   glyph — a Lucide icon inside a brandSoft disc (cards 3 and 4)
   */
  hero: 'mark' | 'discs' | 'glyph';
  // Slide primes this OS permission and fires the prompt on its primary tap.
  permission?: PermissionKind;
  // The final slide — primary button is "Continue" and finishes onboarding.
  // SW-17: it was "Open the Map", which it never did — onDone runs the auth
  // gate, so the next screen is SignIn. Sky ratified "Continue" 2026-08-21.
  isFinal?: boolean;
}

/**
 * Copy is UNCHANGED from a27864b, deliberately. Board 05 proposes a rewrite of
 * cards 2, 4 and 5 (and turns three em dashes into stops); those are new
 * user-facing words, so they are banked in build/COPY_LEDGER.md for Sky to
 * ratify rather than shipped by a builder. The two things the DECISIONS block
 * DID rule on — one decline word, sentence case on the permission CTAs — are
 * applied below.
 */
const CARDS: Card[] = [
  {
    hero: 'mark',
    title: 'Welcome to Flagstone',
    body: 'See an accessibility barrier — a missing ramp, a broken sidewalk, a blocked path? Put it on the map so others know, and so it gets fixed.',
  },
  {
    hero: 'discs',
    title: "Here's how it works",
    body: 'Find the spot on the map and add the barrier there, then rate how bad it is. Others verify it or mark it resolved once the issue is fixed. (Signed-in users can add a photo, too.)',
  },
  {
    hero: 'glyph',
    title: 'Show flags near you',
    body: "We’ll use your location to show nearby barriers and place your reports accurately. It’s only used while the app is open — never tracked or stored on our servers.",
    permission: 'location',
  },
  {
    hero: 'glyph',
    icon: Bell,
    title: 'Stay in the loop',
    body: 'Get a heads-up when flags near you are verified or resolved. Totally optional — you can turn this on later in Settings.',
    permission: 'notifications',
  },
  {
    hero: 'mark',
    title: "You're all set",
    body: 'Go explore your neighbourhood. Every barrier you flag helps someone navigate the world a little easier.',
    isFinal: true,
  },
];

/**
 * Editorial type, from board 05. Both sizes sit BETWEEN scale steps
 * (`font.size` has h1 28 / display 48, and lg 16 / xl 18), so they are named
 * here rather than dropped in raw. They are the board's drawing of this one
 * screen, not a proposal to grow the scale — if Sky would rather stay on the
 * scale, 28 and 16 are the neighbours, and the body cap below is derived from
 * 17 so it moves with it.
 */
const TITLE_SIZE = 34;
const BODY_SIZE = 17;

/**
 * T3 — the title is header-class: it is the largest thing on the screen and
 * must never end up capped below the body it labels.
 */
export const ONBOARDING_TITLE_MAX_FONT_SCALE = TYPE_BLOCK.header;

/**
 * T5, the width rule — a body multiplier stops at the size where the longest
 * word in the column still fits. The word here is "accessibility" (13
 * characters, card 1); the column at the recomposition point is the full-bleed
 * ~358pt on a 390pt device. At 17pt this lands at 2.0. Above it, iOS
 * character-breaks rather than overflowing, which is the "accessibili / ty"
 * shred captured at 3XL (critic pass X13).
 *
 * The cap is the second half of the fix, not the first: T5 says widen the
 * column BEFORE you shrink the text, and `heroWide` does that first.
 */
export const ONBOARDING_BODY_MAX_FONT_SCALE = 2;

/** Board 05: the five stones, and the brand disc on the permission cards. */
const DISC_BASE = 48;
const DISC_BASE_WIDE = 40;
const DISC_DIGIT_RATIO = 20 / DISC_BASE;
const HERO_DISC = 56;
const HERO_DISC_WIDE = 40;
const HERO_MARK = 56;
const HERO_MARK_WIDE = 39;

/** Progress: a 10pt stone per card, the current one stretched into a bar. */
const DOT = 10;
const DOT_ACTIVE = 26;

export default function OnboardingCards({ onDone }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // A11Y-201 (2.4.3): this surface presents the moment it mounts (bare
  // `visible`), so focus card 1's heading on mount.
  const titleRef = useFocusOnOpen<Text>(true);
  const { width, fontScale } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  // The shared hook, not a second hand-rolled listener. The local copy this
  // replaces was byte-equivalent and would not have inherited a fix to it.
  const reduceMotion = useReducedMotion();
  // Per-permission status. null = not checked yet / unavailable here (web or
  // expo-notifications absent); true/false = granted/denied.
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);

  // Animated values driving each stone's width — a DOT_ACTIVE bar when active,
  // a DOT circle otherwise. useNativeDriver must be false because 'width' is a
  // layout property; spring gives a brief premium settle feel.
  const dotWidths = useRef(
    CARDS.map((_, i) => new Animated.Value(i === 0 ? DOT_ACTIVE : DOT)),
  ).current;

  // Board 05: the current stone stretches into a bar, and the bar grows with
  // the text to the chrome ceiling (it is chrome — there is nowhere for it to
  // go). Declared before the effect that springs toward it.
  const dotActiveWidth = DOT_ACTIVE * Math.min(fontScale, TYPE_BLOCK.chrome);

  useEffect(() => {
    if (reduceMotion) {
      dotWidths.forEach((anim, i) => anim.setValue(i === index ? dotActiveWidth : DOT));
    } else {
      Animated.parallel(
        dotWidths.map((anim, i) =>
          Animated.spring(anim, {
            toValue: i === index ? dotActiveWidth : DOT,
            speed: 18,
            bounciness: 3,
            useNativeDriver: false,
          }),
        ),
      ).start();
    }
  }, [index, dotWidths, dotActiveWidth, reduceMotion]);

  // D21 — announce the new position when the card CHANGES, and stay silent on
  // the mount edge. The effect used to fire unconditionally, including on the
  // first commit, where it collided with the useFocusOnOpen cursor jump onto
  // card 1's heading and VoiceOver spoke twice. Same `wasVisible`/`prevIndex`
  // shape OnboardingModal uses, folded to a surface whose open edge IS its
  // mount. WCAG 4.1.3.
  const announced = useRef(false);
  const prevIndex = useRef(0);
  useEffect(() => {
    if (!announced.current) {
      announced.current = true;
      prevIndex.current = index;
      return;
    }
    if (index === prevIndex.current) return;
    prevIndex.current = index;
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

  // Analytics parity with the replay, which has tracked skip/complete since it
  // shipped while the CONSEQUENTIAL flow — the pre-auth one that primes two OS
  // permissions — reported nothing at all. Platform only, no PII.
  const handleSkip = () => {
    trackEvent('onboarding_skipped', { platform: Platform.OS, card: index + 1 });
    onDone();
  };
  const handleComplete = () => {
    trackEvent('onboarding_completed', { platform: Platform.OS });
    onDone();
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
  // S19 (L1-3): both permission slides show a visible decline until granted.
  // Q12 (2026-08-21): ONE decline word. "Not now" on both, where card 4 used to
  // say "Maybe later" for the same gesture. Native only: on web the primary CTA
  // is already just "Continue" (no OS prompt fires there), so a second decline
  // would be redundant.
  const showDecline =
    permission != null && currentGranted !== true && Platform.OS !== 'web';

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
    check
      .then((granted) => {
        if (cancelled) return;
        if (permission === 'location') setLocationGranted(granted);
        else setNotifGranted(granted);
      })
      .catch(() => {});
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
    let granted = false;
    try {
      if (permission === 'location') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        granted = status === 'granted';
        setLocationGranted(granted);
      } else if (permission === 'notifications') {
        granted = await requestNotificationPermission();
        setNotifGranted(granted);
      }
    } catch {
      // COR-6: a REJECTED permission request (rare OS/entitlement states)
      // counts as not-granted — the contract above stands: denying (or
      // failing) never blocks progress, and the primary button must never
      // read as dead.
      granted = false;
      if (permission === 'location') setLocationGranted(false);
      else setNotifGranted(false);
    }
    if (permission) {
      trackEvent('onboarding_permission', {
        permission,
        outcome: granted ? 'granted' : 'denied',
        platform: Platform.OS,
      });
    }
    goTo(index + 1);
  };

  const handleDecline = () => {
    if (permission) {
      trackEvent('onboarding_permission', {
        permission,
        outcome: 'declined',
        platform: Platform.OS,
      });
    }
    goTo(index + 1);
  };

  // Skip must clear the Dynamic Island — the hardcoded 48pt sat ~3pt into the
  // unsafe zone on insets.top=59 devices (sweep M20). Non-throwing context
  // read (null → zeros) so a provider-less mount still renders; 0 on web.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  // F4 / T5: the recomposition point. Above it the whole screen recomposes —
  // hero to the top and smaller, copy full bleed, CTA stacked — rather than
  // scrolling the default composition, which is what the shipped card did.
  const wide = isAxRecompose(fontScale);

  // The five stones must be visible TOGETHER — that is the whole teaching
  // moment — so the disc is width-bound, not scale-bound. It grows with the
  // text (`SeverityDisc`'s scaleWithType contract: box and digit together, so
  // the disc stays the same OBJECT at every size) up to the point where five of
  // them plus their gaps still fit the column, and stops there. scaleWithType
  // itself is not used because its ceiling is a fixed 2x and five discs across
  // a 390pt screen cannot reach it; the ceiling here is the row.
  const columnWidth = width - 2 * (wide ? spacing.lg : spacing.xxl);
  const discFit = Math.floor((columnWidth - 4 * spacing.sm) / SEVERITY_ORDER.length);
  const discSize = Math.max(
    24,
    Math.min(
      Math.round((wide ? DISC_BASE_WIDE : DISC_BASE) * Math.min(fontScale, DISC_MAX_GROWTH)),
      discFit,
    ),
  );
  const discDigit = Math.round(discSize * DISC_DIGIT_RATIO);

  const heroDisc = wide ? HERO_DISC_WIDE : HERO_DISC;
  const heroMark = wide ? HERO_MARK_WIDE : HERO_MARK;

  return (
    <Modal aria-label="Welcome to Flagstone" visible animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={handleSkip} presentationStyle="fullScreen">
      <View
        style={styles.screen}
        accessibilityViewIsModal
        importantForAccessibility="yes"
        // G1: routes to handleSkip, NOT onDone. It used to be onDone, correctly,
        // because this file had no analytics to preserve — it does now, and an
        // escape that skipped the funnel event would under-count exactly the
        // users who leave. Same call the visible Skip makes.
        onAccessibilityEscape={handleSkip}
      >
        {/* The app's real stage, both palettes. Q4: onboarding stopped being a
            fixed-dark world of its own and joined the themed app. */}
        <ScreenStage />

        {/* Skip — cards 1 to 4. There is nothing left to skip on the finisher,
            and the row keeps its height there so nothing below it moves. */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 48) }]}>
          {!card.isFinal ? (
            <Pressable
              onPress={handleSkip}
              style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Skip the tutorial"
              accessibilityHint="Closes the tutorial and opens the app"
              hitSlop={12}
            >
              <AppText variant="label" style={styles.skipText}>Skip</AppText>
            </Pressable>
          ) : null}
        </View>

        {/* Card carousel */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.scroll}
        >
          {CARDS.map((c, i) => {
            // For a permission slide, the hero and body reflect live status:
            // once granted, the disc becomes a success check and the body
            // confirms it, so the user gets clear feedback in-place.
            const cardGranted =
              (c.permission === 'location' && locationGranted === true) ||
              (c.permission === 'notifications' && notifGranted === true);
            const CardIcon = c.icon;
            const effectiveBody = cardGranted
              ? c.permission === 'location'
                ? "Location is on — you're all set."
                : "Notifications are on — you're all set."
              : c.body;
            return (
              <View key={c.title} style={[styles.page, { width }]}>
                {/* The copy scrolls INSIDE the hero zone when it has to; the
                    progress row and the CTA below stay pinned. flexGrow keeps
                    the block anchored to the bottom of the zone when it fits,
                    which is what stops the hero sliding card to card (G10). */}
                <ScrollView
                  style={styles.copyScroll}
                  contentContainerStyle={[styles.hero, wide && styles.heroWide]}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {c.hero === 'discs' ? (
                    /* The Legend in miniature — the five numbered severity discs
                       as one quiet static row on the stage. ONE accessible group
                       names the scale (label derived from SEVERITY_LABELS); the
                       discs are decorative. The same production disc the Legend
                       and every flag row wear, so a user meets 1–5 before the
                       report form ever asks. No motion, no severity-coloured
                       chrome — a static teaching image that is true. */
                    <View
                      style={[styles.discRow, { gap: spacing.sm }]}
                      accessible
                      accessibilityRole="image"
                      accessibilityLabel={`Severity scale — 1 ${SEVERITY_LABELS[1]} to 5 ${SEVERITY_LABELS[5]}`}
                    >
                      {SEVERITY_ORDER.map((s) => (
                        <SeverityDisc
                          key={s}
                          severity={s}
                          size={discSize}
                          digitSize={discDigit}
                          // The box already carries the growth; capping the
                          // glyph again would leave a small digit rattling
                          // inside a big circle.
                          maxFontSizeMultiplier={1}
                        />
                      ))}
                    </View>
                  ) : c.hero === 'mark' ? (
                    /* The brand's own pin, unframed, at the size it deserves.
                       `mono` tinted with the themed brand rather than `color`:
                       identical in light mode (both #1466E0) and correctly
                       lightened on the dark stage. */
                    <View style={styles.heroRow} {...decorativeProps}>
                      <LogoMark size={heroMark} variant="mono" tint={color.brand} />
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.heroDisc,
                        {
                          width: heroDisc,
                          height: heroDisc,
                          backgroundColor: cardGranted ? color.success : color.brandSoft,
                        },
                      ]} {...decorativeProps}
                    >
                      {cardGranted ? (
                        <Check size={Math.round(heroDisc * 0.5)} color={color.textOnBrand} strokeWidth={2.5} />
                      ) : CardIcon ? (
                        <CardIcon size={Math.round(heroDisc * 0.5)} color={color.brandOnSoft} strokeWidth={2} />
                      ) : (
                        /* Card 3 wears the house pin, not Lucide's MapPin —
                           two pin drawings three screens apart was the drift.
                           On the dark stage the knockout reads better than a
                           light-blue pin holding a white figure. */
                        <LogoMark
                          size={Math.round(heroDisc * 0.62)}
                          variant={color.scheme === 'dark' ? 'white' : 'mono'}
                          tint={color.brandOnSoft}
                        />
                      )}
                    </View>
                  )}

                  <AppText
                    ref={i === 0 ? titleRef : undefined}
                    variant="display"
                    size={TITLE_SIZE}
                    color={color.textStrong}
                    maxFontSizeMultiplier={ONBOARDING_TITLE_MAX_FONT_SCALE}
                    style={styles.title}
                    accessibilityRole="header"
                  >
                    {c.title}
                  </AppText>
                  <AppText
                    variant="bodyMedium"
                    size={BODY_SIZE}
                    color={color.text}
                    maxFontSizeMultiplier={ONBOARDING_BODY_MAX_FONT_SCALE}
                    style={styles.body}
                  >
                    {effectiveBody}
                  </AppText>
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>

        {/* Progress — five stones, the current one stretched into a bar and
            wearing its own severity colour; the finisher's turns Civic Gold.
            Decorative: position is spoken by the announce and the CTA labels,
            so it never rests on colour alone (WCAG 1.4.1). */}
        <View style={styles.progress} {...decorativeProps}>
          {CARDS.map((c, i) => {
            const isActive = i === index;
            return (
              <Animated.View
                key={c.title}
                style={[
                  styles.dot,
                  // One driver for every stone, so the one arriving settles the
                  // same way the one leaving does.
                  { width: dotWidths[i] },
                  isActive && {
                    backgroundColor: c.isFinal
                      ? color.goldAccent
                      : severityColor(SEVERITY_ORDER[i]!),
                  },
                ]}
              />
            );
          })}
        </View>

        {/* The decline slot is RESERVED on every card, not only the two that
            use it. An appearing-and-disappearing row is what slid the whole
            composition ~60pt between cards 2 and 3 on the shipped screen, and
            it moved again the moment a permission flipped to granted. */}
        <View style={styles.declineSlot}>
          {showDecline ? (
            <Pressable
              onPress={handleDecline}
              style={({ pressed }) => [styles.declineBtn, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel="Not now"
              accessibilityHint={
                permission === 'location'
                  ? 'Skips location access and continues to the next step'
                  : 'Skips notifications and continues to the next step'
              }
              hitSlop={8}
            >
              <AppText variant="label" style={styles.declineText}>Not now</AppText>
            </Pressable>
          ) : null}
        </View>

        {/* Actions — a text Back and a FIXED 200pt primary, so the CTA's left
            edge never walks card to card the way it did when the pill sized
            itself to "Next" / "Allow Location" / "Turn on Notifications". */}
        <View
          style={[
            styles.ctaRow,
            wide && styles.ctaRowStacked,
            { paddingBottom: Math.max(spacing.xxl, insets.bottom + spacing.sm) },
          ]}
        >
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
            {...a11yToggle({ disabled: isFirst })}
            hitSlop={8}
          >
            <AppText variant="label" style={styles.backBtnText}>Back</AppText>
          </Pressable>

          {card.isFinal ? (
            // Final slide: finish onboarding and run the auth gate.
            <Pressable
              onPress={handleComplete}
              style={({ pressed }) => [styles.primaryBtn, wide && styles.primaryBtnWide, pressed && styles.primaryBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Continue"
              accessibilityHint="Finishes the introduction"
            >
              <AppText variant="label" style={styles.primaryBtnText}>Continue</AppText>
            </Pressable>
          ) : permission && currentGranted !== true ? (
            // Permission slide, not yet granted: prime + fire the OS prompt.
            // Disabled briefly while we check existing permission (null state).
            <Pressable
              onPress={handlePermissionAction}
              disabled={permissionChecking}
              style={({ pressed }) => [
                styles.primaryBtn,
                wide && styles.primaryBtnWide,
                pressed && styles.primaryBtnPressed,
                permissionChecking && { opacity: 0.5 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                // S19: on web no OS dialog fires — the button just advances, so
                // it announces as "Continue", not a location/notification grant.
                Platform.OS === 'web'
                  ? 'Continue'
                  : permission === 'location'
                    ? 'Allow location access'
                    : 'Turn on notifications'
              }
              accessibilityHint={
                Platform.OS === 'web'
                  ? 'Continues to the next step'
                  : permission === 'location'
                    ? 'Opens the system location permission dialog, then continues'
                    : 'Opens the system notifications permission dialog, then continues'
              }
              {...a11yToggle({ disabled: permissionChecking })}
            >
              <AppText variant="label" style={styles.primaryBtnText}>
                {/* Q12: sentence case. The accessible names above still contain
                    the visible string, which is what 2.5.3 asks. */}
                {Platform.OS === 'web'
                  ? 'Continue'
                  : permission === 'location'
                    ? 'Allow location'
                    : 'Turn on notifications'}
              </AppText>
            </Pressable>
          ) : (
            // Non-permission slide (Next), or a permission already granted
            // (Continue): advance to the next slide.
            <Pressable
              onPress={() => goTo(index + 1)}
              style={({ pressed }) => [styles.primaryBtn, wide && styles.primaryBtnWide, pressed && styles.primaryBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={
                permission ? 'Continue' : `Next. Card ${index + 1} of ${CARDS.length}.`
              }
            >
              <AppText variant="label" style={styles.primaryBtnText}>{permission ? 'Continue' : 'Next'}</AppText>
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
      // Paired with <ScreenStage/> per its own portability note, so any
      // pre-mount frame matches the wash instead of flashing white.
      backgroundColor: color.stage1,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: spacing.md,
      // paddingTop applied inline: Math.max(insets.top, 48) — see render site.
      paddingBottom: spacing.sm,
      // Held even on the finisher, where the button is gone: the row is part of
      // the layout's spine, not decoration around a button.
      minHeight: 44 + spacing.sm,
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
    skipText: {
      color: color.inkGlassMuted,
      fontWeight: font.weight.semibold,
      fontSize: font.size.md,
    },
    scroll: { flex: 1 },
    page: {
      // Each slide fills the pager page; the inner ScrollView owns the layout.
      flex: 1,
    },
    copyScroll: {
      flex: 1,
    },
    // Board 05: hero + copy in ONE bottom-anchored zone. flexGrow keeps it
    // pinned to the bottom of the zone when the content fits and lets it grow
    // and scroll when it does not (large type / short screen).
    hero: {
      flexGrow: 1,
      justifyContent: 'flex-end',
      gap: spacing.lg,
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xl,
    },
    // T5 — widen the column BEFORE capping the text. The generous side pads are
    // what starve the body column; at the recomposition point they give the
    // width back (~358pt on a 390pt screen) and the hero moves to the top so
    // the copy owns the middle of the screen.
    heroWide: {
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxxl,
    },
    heroRow: {
      flexDirection: 'row',
    },
    discRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
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
      height: DOT,
      borderRadius: radius.full,
      backgroundColor: color.borderStrong,
    },
    // Reserved on every card — see the render site.
    declineSlot: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
    },
    declineBtn: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    declineText: {
      color: color.inkSelect,
      fontWeight: font.weight.semibold,
      fontSize: font.size.md,
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.sm,
      // paddingBottom applied inline from insets — see the render site.
    },
    // F4 — at the recomposition point the row stacks and the primary goes full
    // width. column-reverse keeps the primary FIRST on screen while leaving the
    // source order (Back, then primary) alone, so the reading order a screen
    // reader walks is unchanged.
    ctaRowStacked: {
      flexDirection: 'column-reverse',
      alignItems: 'stretch',
      gap: spacing.sm,
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
    backBtnText: {
      color: color.inkGlassMuted,
      fontWeight: font.weight.semibold,
      fontSize: font.size.md,
    },
    primaryBtn: {
      // A FIXED width, not a content width — the whole point. The label wraps
      // inside it if Dynamic Type asks for more than one line; the pill has a
      // floor, not a ceiling, so it grows downward instead of clipping.
      width: 200,
      backgroundColor: color.ctaFill,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    primaryBtnWide: { width: undefined, alignSelf: 'stretch' },
    primaryBtnPressed: { backgroundColor: color.ctaFillPressed },
    primaryBtnText: {
      // Weight comes from the label variant's family (PublicSans SemiBold);
      // a `fontWeight` on a named font face is unreliable in expo-font.
      color: color.textOnBrand,
      fontSize: font.size.md,
      textAlign: 'center',
    },
  });
