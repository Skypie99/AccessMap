/**
 * SegmentedControl — ONE drawing of "a small row of mutually-related cells".
 *
 * The app had four of them. FlagDetail's sibling verbs, Tasks' card action
 * pair, Settings' appearance picker and the Leaderboard's ranking-period
 * toggle were four independent implementations of the same widget, each with
 * its own 44pt floor (or lack of one), its own container role, its own pressed
 * state and its own answer to what happens at large type. C14 called the
 * Leaderboard's a "family outlier"; it was really the fourth of four.
 *
 * ─── TWO VARIANTS, AND WHY NOT ONE ────────────────────────────────────────
 * `ghost` — a row of ACTIONS. Every cell does something; none is "on". One
 * hairline round the outside, dividers between, `inkSelect` text. This is
 * FlagDetail's control, lifted verbatim (art-direction Phase 1b built it
 * inline and its inks were re-measured on the dense bulk floor there: a cell
 * over the worst backdrop reads 5.22:1 light / 7.80:1 dark).
 *
 * `track` — a row of CHOICES, exactly one selected. A recessed track with a
 * lifted pill on the selected cell.
 *
 * They are not one variant with a flag because they answer different
 * questions: a ghost cell has no selected state to draw, and a track cell has
 * no meaning without one. Collapsing them would mean a control that is
 * sometimes a radiogroup and sometimes not, which is precisely the ambiguity
 * that produced four implementations.
 *
 * ─── ⚠ WHY `track` TAKES A `surface` AND NOT ONE PALETTE ──────────────────
 * The two `track` consumers sit on DIFFERENT backdrops, and their inks were
 * arbitrated separately against those backdrops:
 *
 *   surface="stage"  Settings' appearance picker, on the screen stage.
 *                    glassChipFill / glassChipEdge track, opaque `surface`
 *                    pill, brandText selected / glassChipInk unselected —
 *                    the pairs ratified for the stage (Phase 2c).
 *   surface="sheet"  The Leaderboard, on a bulk-glass sheet.
 *                    surfaceNeutral track, ctaFill pill, textOnBrand
 *                    selected / textMuted unselected — the pair that shipped
 *                    on that sheet.
 *
 * One palette across both would have MOVED an ink onto a backdrop it was
 * never measured against, and the bulk floor is itself an open device row
 * (D8). The defect C14 names is "a fourth implementation", and unifying the
 * structure is what fixes it. Unifying the two palettes is a real question
 * with a real answer, and that answer is an arbiter run, not a guess here —
 * it is banked in the Phase 3 report.
 *
 * Everything that is NOT ink is shared and singular: the 44pt floor, the
 * equal-basis cells, the container role and name, the pressed and disabled
 * states, the busy spinner, and the F4 recomposition below.
 *
 * ─── F4 — LARGE TYPE ──────────────────────────────────────────────────────
 * At ≥1.5x the cells stop sharing a row and stack, rather than squeezing
 * below their 44pt box. The CALLER decides when, because the threshold is a
 * property of the column the control sits in, not of the control (T5).
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useColor, type ColorTheme } from '@/theme/ThemeContext';
import { a11y, font, radius, shadow, spacing } from '@/theme';
import { a11yToggle } from '@/lib/accessibility';
import { AppText } from './AppText';

export interface SegmentedCell {
  key: string;
  label: string;
  /** Spoken label, when the written one is not a sentence on its own. */
  a11yLabel?: string;
  hint?: string;
  onPress: () => void;
  /** `track` only — exactly one cell should carry it. */
  selected?: boolean;
  disabled?: boolean;
  /** Replaces the label with a spinner and marks the cell busy. */
  busy?: boolean;
  /** Optional leading glyph (Settings' appearance picker). Rendered with the
   *  cell's own foreground ink, so it can never drift from the label. */
  renderIcon?: (color: string) => React.ReactNode;
}

export interface SegmentedControlProps {
  cells: SegmentedCell[];
  variant?: 'ghost' | 'track';
  /** Which arbitrated palette the `track` variant draws with. Ignored by
   *  `ghost`, whose inks are backdrop-independent. */
  surface?: 'stage' | 'sheet';
  /** Container role + name. An unlabeled group is a landmark a screen reader
   *  announces as nothing (A11Y-218), so the name is REQUIRED, not optional. */
  groupRole?: 'tablist' | 'radiogroup';
  groupLabel: string;
  /** Cell role. `radio` for a radiogroup; `button` otherwise. */
  cellRole?: 'radio' | 'button';
  /** F4 — stack into a column. The caller owns the threshold. */
  stacked?: boolean;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export function SegmentedControl({
  cells,
  variant = 'ghost',
  surface = 'stage',
  groupRole,
  groupLabel,
  cellRole = 'button',
  stacked = false,
  style,
  testID,
}: SegmentedControlProps) {
  const color = useColor();
  const styles = makeStyles(color);
  const track = variant === 'track';
  const onSheet = surface === 'sheet';

  return (
    <View
      style={[
        track ? (onSheet ? styles.trackSheet : styles.trackStage) : styles.ghost,
        stacked && styles.stacked,
        style,
      ]}
      accessibilityRole={groupRole}
      accessibilityLabel={groupLabel}
      testID={testID}
    >
      {cells.map((cell, i) => {
        // Selected/unselected foreground, resolved ONCE per cell so the label
        // and the icon can never disagree.
        const fg = track
          ? cell.selected
            ? onSheet
              ? color.textOnBrand
              : color.brandText
            : onSheet
              ? color.textMuted
              : color.glassChipInk
          : color.inkSelect;
        return (
          <Pressable
            key={cell.key}
            onPress={cell.onPress}
            disabled={cell.disabled || cell.busy}
            style={({ pressed }) => [
              styles.cell,
              stacked && styles.cellStacked,
              track && (onSheet ? styles.cellTrackSheet : styles.cellTrackStage),
              track && cell.selected && (onSheet ? styles.cellSelectedSheet : styles.cellSelectedStage),
              // Ghost cells are divided from one another; track cells are not
              // (their track already separates them).
              !track && i > 0 && (stacked ? styles.dividerStacked : styles.divider),
              pressed && (track ? styles.cellPressedTrack : styles.cellPressed),
              cell.disabled && styles.cellDisabled,
            ]}
            accessibilityRole={cellRole}
            accessibilityLabel={cell.a11yLabel ?? cell.label}
            accessibilityHint={cell.hint}
            // State rides a11yToggle ONLY — a label with ", selected" baked in
            // makes native VoiceOver speak the state twice (A11Y-220).
            {...a11yToggle({
              ...(track ? (cellRole === 'radio' ? { selected: !!cell.selected } : { pressed: !!cell.selected }) : {}),
              disabled: cell.disabled,
              busy: cell.busy,
            })}
          >
            {cell.busy ? (
              <ActivityIndicator size="small" color={fg} accessibilityLabel={`Loading ${cell.label}`} />
            ) : (
              <>
                {cell.renderIcon?.(fg)}
                <AppText
                  variant="label"
                  size={track ? font.size.sm : font.size.base}
                  color={fg}
                  style={styles.cellText}
                >
                  {cell.label}
                </AppText>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // ── ghost: one hairline outside, dividers between ────────────────────
    ghost: {
      flexDirection: 'row',
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: color.glassGhostEdge,
      overflow: 'hidden',
    },
    // ── track (stage): the ratified chip-tint recessed track ─────────────
    trackStage: {
      flexDirection: 'row',
      backgroundColor: color.glassChipFill,
      borderWidth: 1,
      borderColor: color.glassChipEdge,
      borderRadius: radius.lg,
      padding: spacing.tight,
      gap: spacing.tight,
    },
    // ── track (sheet): the pair that shipped on the bulk-glass sheet ─────
    trackSheet: {
      flexDirection: 'row',
      gap: spacing.xs,
      padding: 3, // hairline inset so the pill reads as a segment, not a button
      backgroundColor: color.surfaceNeutral,
      borderRadius: radius.md,
    },
    stacked: { flexDirection: 'column' },

    cell: {
      flexGrow: 1,
      flexBasis: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      minHeight: a11y.minTargetSize,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    // Stacked, a cell is a full-width ROW: flexBasis:0 in a column would have
    // the cells share whatever height the container happened to have.
    cellStacked: { flexBasis: 'auto', alignSelf: 'stretch' },
    cellTrackStage: { paddingVertical: spacing.sm + 2, borderRadius: radius.md },
    cellTrackSheet: { paddingHorizontal: spacing.md, borderRadius: radius.sm },
    cellSelectedStage: { backgroundColor: color.surface, ...shadow.e1 },
    cellSelectedSheet: { backgroundColor: color.ctaFill, ...shadow.e1 },
    divider: { borderLeftWidth: 1, borderLeftColor: color.glassGhostEdge },
    dividerStacked: { borderTopWidth: 1, borderTopColor: color.glassGhostEdge },
    cellPressed: { backgroundColor: color.borderPressed },
    cellPressedTrack: { opacity: 0.85 },
    cellDisabled: { opacity: 0.55 },
    cellText: { textAlign: 'center', fontWeight: font.weight.semibold },
  });
