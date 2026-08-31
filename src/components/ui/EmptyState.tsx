/**
 * EmptyState — one recipe for every "there is nothing here" moment.
 *
 * ─── WHY THIS EXISTS ──────────────────────────────────────────────────────
 * The app already authors most of its empty states, which is a real strength —
 * they explain rather than shrug. What they did not have was one drawing. Nine
 * surfaces each reached for a different Lucide glyph (Search, Inbox, MapPin,
 * Sparkles, Bell, …), so "nothing here" looked like nine unrelated events, and
 * the icon carried no meaning the heading was not already carrying.
 *
 * ─── THE MARK ─────────────────────────────────────────────────────────────
 * The path: five small discs with the third one missing, drawn as a dashed
 * outline. It is the product's name as geometry — a stone not yet laid —
 * rather than an illustration of absence, and it is the same disc the severity
 * grammar is built from, at its quietest. Purely decorative: it is hidden from
 * assistive tech, because the heading and body say the whole thing.
 *
 * ─── THE RECIPE (rule W5) ─────────────────────────────────────────────────
 *   mark -> heading (`heading` / lg / textStrong) -> body (`body` /
 *   inkGlassMuted) -> optional action.
 * Body and action are both optional: some surfaces have one honest sentence and
 * nothing to offer, and inventing a second line for them would be worse than
 * the gap.
 *
 * Art direction 2026-08-21, board 10.
 */
import React from 'react';
import { StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { TypeBlock, TYPE_BLOCK } from '@/components/ui/TypeBlock';
import { decorativeProps } from '@/lib/accessibility';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

/** Five stones, the third one not yet laid. */
const PATH_STONES = [0, 1, 2, 3, 4] as const;
const PATH_GAP_INDEX = 2;

export interface EmptyStateProps {
  /** The sentence that says what is (not) here. Always present. */
  title: string;
  /**
   * The second sentence, where a surface has one. A node rather than a string
   * because one site emphasises a control's name inside its sentence ("tap
   * **Watch** to track it here"); the recipe's own type still wraps it, so the
   * emphasis is a nested AppText, not a second typography decision.
   */
  body?: React.ReactNode;
  /**
   * A single action — the thing the heading implies. One only: an empty state
   * that offers two choices is not empty, it is a menu.
   */
  action?: React.ReactNode;
  /**
   * Replace the path with something else.
   *
   * ONE documented exception exists and it is Tasks' "All caught up": that
   * state is a CELEBRATION, not an absence, and it wears the gold disc because
   * gold is the gamification colour (C4). Every other site takes the path —
   * the point of the mark is that "nothing here" stops looking like nine
   * unrelated events.
   */
  mark?: React.ReactNode;
  /**
   * Announce the state when it appears. Surfaces that arrive at empty from a
   * fetch pass `polite` so a screen-reader user hears the outcome instead of
   * meeting silence; a state that is simply the starting condition passes
   * nothing.
   */
  live?: boolean;
  style?: ViewStyle;
  /** Optional local line-length override for a constrained adopting viewport. */
  bodyStyle?: TextStyle;
}

/**
 * The path mark. `borderStrong` is the arbitrated hairline ink — dark enough to
 * read on both the stage and the row glass, light enough that five of them do
 * not compete with the sentence they sit above.
 */
function PathMark() {
  const color = useColor();
  const styles = makeStyles(color);
  return (
    <View
      style={styles.path} {...decorativeProps}
    >
      {PATH_STONES.map((i) => (
        <View
          key={i}
          style={[styles.stone, i === PATH_GAP_INDEX && styles.stoneGap]}
        />
      ))}
    </View>
  );
}

export function EmptyState({ title, body, action, mark, live, style, bodyStyle }: EmptyStateProps) {
  const color = useColor();
  const styles = makeStyles(color);
  return (
    <View
      style={[styles.wrap, style]}
      accessibilityLiveRegion={live ? 'polite' : 'none'}
    >
      {mark ?? <PathMark />}
      {/* T3: heading and body share one multiplier, so the heading can never be
          drawn smaller than the sentence beneath it (the inversion X6/X10
          found on four other surfaces). */}
      <TypeBlock cap={TYPE_BLOCK.content}>
        <AppText variant="heading" style={styles.title}>{title}</AppText>
        {body ? <AppText variant="body" style={[styles.body, bodyStyle]}>{body}</AppText> : null}
      </TypeBlock>
      {action}
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xxl,
    },
    path: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.tight,
    },
    stone: {
      width: 14,
      height: 14,
      borderRadius: radius.circle,
      backgroundColor: color.borderStrong,
    },
    stoneGap: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: color.borderStrong,
      borderStyle: 'dashed',
    },
    title: {
      fontSize: font.size.lg,
      color: color.textStrong,
      textAlign: 'center',
    },
    body: {
      fontSize: font.size.base,
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
      lineHeight: font.lineHeight.base,
      textAlign: 'center',
      maxWidth: 280,
    },
  });
