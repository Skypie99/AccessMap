/**
 * ScreenHeader — the editorial header shared across screens (overhaul Phase 7b).
 *
 * The clean-editorial pattern Sky picked: a small all-caps eyebrow, a big
 * confident display title, an optional subtitle, and an optional slot of
 * right-aligned controls on the title row (menu / Feedback on Home, etc.).
 *
 * Lifted verbatim from HomeScreen's inline header so the look is identical;
 * Profile / Leaderboard / future screens consume it for one consistent type
 * rhythm. Presentation only — no data, no app logic.
 */
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  PixelRatio,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { AppText } from '@/components/ui/AppText';
import { font, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { clearHeaderHeight, publishHeaderHeight } from '@/lib/statusLedge';

// All-caps micro-label tracking for the eyebrow + section labels.
// Sourced from the token (pre-ship polish 2026-08-01) — same 1.2 value the
// header always used; the export stays so existing consumers keep working.
export const EYEBROW_TRACKING = font.tracking.eyebrow;

// --- Title auto-fit (M18) ---------------------------------------------------
// react-native-web does NOT implement `adjustsFontSizeToFit`, so we can't lean
// on the native shrink-to-fit for the web build. Instead we ESTIMATE the
// title's rendered width from its character count and deterministically shrink
// the font size when it would overflow its slot. The native
// `adjustsFontSizeToFit` (in the JSX below) stays as a belt-and-braces backstop.

// Average glyph advance as a fraction of the font size, for the display face.
// CALIBRATED against the live web render (2026-07-01): "Review barriers" (30pt)
// measures 219px, and its title slot is 241px at 375pt but ~186px at 320pt. So
// the estimate must land BELOW 241 (no false shrink at 375) yet ABOVE 186
// (shrink to fit at 320). 15 chars x 30 x 0.50 = 225px sits in that window.
const CHAR_WIDTH_RATIO = 0.5;

// Never shrink below 60% of the target size — past that, wrapping to a second
// line reads better than microscopic text. Also the native minimumFontScale floor.
const MIN_TITLE_SCALE = 0.6;

// The display variant's Dynamic Type cap (mirrors AppText). The title can't
// scale past this, so we estimate with the CAPPED scale — using a hard 1.3
// would falsely shrink titles that fit fine at today's default font size.
const DISPLAY_MAX_FONT_SCALE = 1.3;

interface ScreenHeaderProps {
  /** Big display title. */
  title: string;
  /** Small all-caps eyebrow above the title. */
  eyebrow?: string;
  /**
   * Subtitle below the title. Wraps to two lines (T4 / defect D3) — at large
   * Dynamic Type a one-line cap ate the end of every one of these
   * ("Sign in to see yo…", "Near <long place name>").
   */
  subtitle?: string;
  /** Right-aligned controls on the title row (e.g. menu / Feedback buttons). */
  actions?: React.ReactNode;
  /** Display title size. Default 40 — big, confident editorial display type
   *  (at ≥40 AppText uses the tightest display tracking for a dramatic header). */
  titleSize?: number;
  /** Override/extend the outer container style (e.g. padding tweaks). */
  style?: StyleProp<ViewStyle>;
  /** Override the eyebrow ink (default color.textSubtle). Screens whose header
   *  sits on glass pass their arbitrated on-glass ink (e.g. inkGlassMuted —
   *  Tasks glass pass 2026-07-03); everyone else is untouched. */
  eyebrowColor?: string;
  /** Override the subtitle ink (default color.textMuted) — same contract. */
  subtitleColor?: string;
  /** Publish this header's HEIGHT to the status-ledge store while focused, so
   *  the App-root status pill docks BELOW the header instead of on top of it
   *  (BP12 / T6). Default true. Screens whose top chrome is NOT a plain
   *  ScreenHeader (e.g. Tasks, where it's nested inside a composite glass pane)
   *  pass `false` so the pill keeps its default placement there. */
  publishLedge?: boolean;
}

export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  actions,
  titleSize = 40,
  style,
  eyebrowColor,
  subtitleColor,
  publishLedge = true,
}: ScreenHeaderProps) {
  const color = useColor();
  const styles = makeStyles(color);

  // Deterministic title auto-fit — see the notes by CHAR_WIDTH_RATIO above.
  // Start at the target size (no small-text flash); shrink only if it overflows.
  const [renderSize, setRenderSize] = useState(titleSize);

  // Reset to the target size whenever the title text or its size changes
  // (e.g. switching tabs, or Home's count ticking 9 -> 10 barriers).
  useEffect(() => {
    setRenderSize(titleSize);
  }, [title, titleSize]);

  const handleTitleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      // `available` is the width of the title's flex:1 slot (it already excludes
      // the actions). It's invariant to the title's own fontSize, so shrinking
      // the text doesn't move it — the estimate converges in one step and can't
      // oscillate.
      const available = e.nativeEvent.layout.width;
      if (available <= 0) return;
      const fontScale = Math.min(PixelRatio.getFontScale(), DISPLAY_MAX_FONT_SCALE);
      const estimated = title.length * titleSize * CHAR_WIDTH_RATIO * fontScale;
      let next = titleSize;
      if (estimated > available) {
        const floorSize = Math.round(titleSize * MIN_TITLE_SCALE);
        next = Math.max(Math.floor((available / estimated) * titleSize), floorSize);
      }
      setRenderSize((prev) => (prev !== next ? next : prev));
    },
    [title, titleSize],
  );

  // --- status-ledge height publish (BP12 / T6) ------------------------------
  // Publish this header's HEIGHT to the status-ledge store while it's focused,
  // so the App-root status pill docks BELOW the header instead of decapitating
  // it. A non-throwing `useContext(NavigationContext)` (NOT `useIsFocused`,
  // which throws without a navigator) means a bare ScreenHeader unit test just
  // no-ops. We publish a HEIGHT (never a live screen-Y), so the ledge is
  // scroll-invariant — the pill stays put as the header scrolls away.
  const navigation = React.useContext(NavigationContext);
  const ledgeId = useId();
  const ledgeHeight = useRef<number | null>(null);
  const ledgeFocused = useRef(false);

  useEffect(() => {
    if (!publishLedge || !navigation) return;
    const publishIfFocused = () => {
      if (ledgeFocused.current && ledgeHeight.current != null) {
        publishHeaderHeight(ledgeId, ledgeHeight.current);
      }
    };
    // Seed: the initially-focused screen never fires a 'focus' event.
    ledgeFocused.current = navigation.isFocused();
    publishIfFocused();
    const unsubFocus = navigation.addListener('focus', () => {
      ledgeFocused.current = true;
      publishIfFocused();
    });
    const unsubBlur = navigation.addListener('blur', () => {
      ledgeFocused.current = false;
      clearHeaderHeight(ledgeId);
    });
    return () => {
      unsubFocus();
      unsubBlur();
      clearHeaderHeight(ledgeId); // release the slot on unmount if we own it
    };
  }, [navigation, publishLedge, ledgeId]);

  // The outer container's HEIGHT — stash it, and publish if we're focused.
  // Guarded against the 0-height intermediate pass, same as the title guard.
  const handleContainerLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h <= 0) return;
      ledgeHeight.current = h;
      if (publishLedge && ledgeFocused.current) publishHeaderHeight(ledgeId, h);
    },
    [publishLedge, ledgeId],
  );

  return (
    <View style={[styles.header, style]} onLayout={handleContainerLayout}>
      {eyebrow ? (
        <AppText variant="label" style={[styles.eyebrow, eyebrowColor ? { color: eyebrowColor } : null]}>
          {eyebrow}
        </AppText>
      ) : null}
      <View style={styles.titleRow}>
        <AppText
          variant="display"
          size={renderSize}
          style={styles.title}
          // WCAG 1.4.4 (T13): at the M18 floor a still-overflowing title wraps to a
          // 2nd line instead of tail-ellipsizing, so the datum survives 200% zoom.
          numberOfLines={2}
          accessibilityRole="header"
          onLayout={handleTitleLayout}
          // Native backstop (no-op on web): shrink to fit within the box, never
          // below MIN_TITLE_SCALE. The JS estimate above is the primary path and
          // the only one that works on the web export.
          adjustsFontSizeToFit
          minimumFontScale={MIN_TITLE_SCALE}
        >
          {title}
        </AppText>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {subtitle ? (
        <AppText
          variant="body"
          style={[styles.subtitle, subtitleColor ? { color: subtitleColor } : null]}
          /* D3 / T4: was 1. Every editorial header in the app shares this node,
             so a one-line cap truncated the guest Profile's whole invitation and
             any "Near <place>" Home subtitle at large type. Two lines is the
             rule; the title above already wraps to two (M18). */
          numberOfLines={2}
        >
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
    eyebrow: {
      fontSize: font.size.xs,
      letterSpacing: EYEBROW_TRACKING,
      color: color.textSubtle,
      fontWeight: font.weight.semibold,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { flex: 1, color: color.textStrong, marginTop: 2 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    subtitle: { fontSize: font.size.md, color: color.textMuted, marginTop: 3 },
  });
