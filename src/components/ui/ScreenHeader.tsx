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
import React, { useCallback, useEffect, useState } from 'react';
import {
  PixelRatio,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { font, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

// All-caps micro-label tracking for the eyebrow + section labels.
export const EYEBROW_TRACKING = 1.2;

// --- Title auto-fit (M18) ---------------------------------------------------
// react-native-web does NOT implement `adjustsFontSizeToFit`, so we can't lean
// on the native shrink-to-fit for the web build. Instead we ESTIMATE the
// title's rendered width from its character count and deterministically shrink
// the font size when it would overflow its slot. The native
// `adjustsFontSizeToFit` (in the JSX below) stays as a belt-and-braces backstop.

// Average glyph advance as a fraction of the font size, for the display face.
// Calibrated against the live web render: "Review barriers" must fit at 320pt,
// and the same title at 375pt must render at full size (no false shrink).
const CHAR_WIDTH_RATIO = 0.58;

// Never shrink below 60% of the target size — past that, truncation reads
// better than microscopic text. Also used as the native minimumFontScale floor.
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
  /** One-line subtitle below the title. */
  subtitle?: string;
  /** Right-aligned controls on the title row (e.g. menu / Feedback buttons). */
  actions?: React.ReactNode;
  /** Display title size. Default 40 — big, confident editorial display type
   *  (at ≥40 AppText uses the tightest display tracking for a dramatic header). */
  titleSize?: number;
  /** Override/extend the outer container style (e.g. padding tweaks). */
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  actions,
  titleSize = 40,
  style,
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

  return (
    <View style={[styles.header, style]}>
      {eyebrow ? (
        <AppText variant="label" style={styles.eyebrow}>
          {eyebrow}
        </AppText>
      ) : null}
      <View style={styles.titleRow}>
        <AppText
          variant="display"
          size={renderSize}
          style={styles.title}
          numberOfLines={1}
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
        <AppText variant="body" style={styles.subtitle} numberOfLines={1}>
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
