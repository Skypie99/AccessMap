/**
 * FlagCard — one drawing of a flag, at two densities (rule F1).
 *
 * ─── WHY THIS EXISTS ──────────────────────────────────────────────────────
 * The cold walk counted FIVE grammars for one object: the Home row (disc +
 * census), the Tasks card (amber severity PILL + title + status PILL), the
 * Nearby card (disc + distance), the map callout (stripe) and the FlagDetail
 * sheet (pills again). Same flag, five drawings, and no two of them ordered the
 * facts the same way. The plan's first move is to stop drawing it five ways:
 *
 *   disc · category title · census line · (description) · (actions)
 *
 * and to let DENSITY be the only thing that changes between surfaces.
 *
 *   row   Home and list rows:  disc 24 · title `lg` · census `sm` · chevron
 *   card  Tasks and Nearby:    disc 32 · title `xl` · census `sm` ·
 *                              description `base`/500 · actions
 *
 * (The third density in rule F1 — `sheet`, the FlagDetail header — is NOT here:
 * it is a stripe rather than a disc and it landed in Phase 1b, inside
 * FlagDetailModal. Adding it as a prop would mean a component that renders
 * something none of its two densities share.)
 *
 * ─── THE CENSUS (rule F2) ─────────────────────────────────────────────────
 * One sentence, one order, everywhere:
 *
 *   Severity {n} · {word} · {status}[ · {distance}][ · {extras}]
 *
 * Q7 ruled variation A: the "Severity N" prefix stays, so the digit appears
 * twice (in the disc and in the sentence) on purpose. The disc is the glance
 * and the sentence is the reading; a prior decision (S1, 2026-06) added the
 * prefix deliberately and this component is not the place to reverse it.
 *
 * ─── WHAT THIS COMPONENT DELIBERATELY DOES NOT OWN ────────────────────────
 * Material and press feel. Tasks' card is a pane of row glass with a press
 * sheen, a lightbox and a bulk-select fork; Nearby's is an opaque surface in a
 * pageSheet. Both already have a host Pressable whose contract (S13's
 * `accessible={false}` + reachable actions, PROTECT-1's one-breath label) is
 * pinned by tests. So in CARD density this renders a plain View and the host
 * keeps its own Pressable; in ROW density — where the row IS the button and
 * there is nothing else to own it — the root is a `PressableScale`, exactly as
 * Home's row already was.
 *
 * ─── SW-36 LIVES HERE NOW ─────────────────────────────────────────────────
 * The Tasks card title used to be crushed between two non-shrinking badges and
 * iOS character-broke it into "Broken sidewal / k". The badges are gone, but
 * the geometry that produced the break is not: a title beside a fixed disc and
 * (in Nearby) a non-shrinking distance is the same shape. So the fix travels
 * with the composition rather than staying behind in a screen that no longer
 * draws it — `cardHeader` may wrap, and `cardTitle` floors its own width so the
 * wrap actually fires. `flexBasisUnderLargeType.guard.test.ts` re-pins to this
 * file; the guard's own docblock explains why either half alone is a no-op.
 *
 * Rules F1–F4, T1, C2, C3 — design-reviews/art-direction/2026-08-21.
 */

import React from 'react';
import { StyleSheet, View, useWindowDimensions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { TypeBlock, TYPE_BLOCK } from '@/components/ui/TypeBlock';
import { PressableScale } from '@/components/ui/PressableScale';
import { SeverityDisc } from '@/components/SeverityDisc';
import { severityA11y, statusA11y } from '@/lib/a11yText';
import { formatDistance, speakDistance } from '@/lib/distance';
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '@/lib/flags';
import { a11yToggle, isAxRecompose } from '@/lib/accessibility';
import { a11y, font, spacing } from '@/theme';
import { useColor, type ColorTheme } from '@/theme/ThemeContext';
import type { FlagRow } from '@/types/database';

/** `row` = Home and list rows. `card` = Tasks and Nearby. (F1) */
export type FlagCardDensity = 'row' | 'card';

/**
 * Only the four fields the drawing needs. Narrower than `FlagRow` on purpose:
 * a card that accepted the whole row would invite callers to reach through it
 * for data, and the component would grow a reason to know about photos, owners
 * and timestamps that it renders through slots instead.
 */
export type FlagCardFlag = Pick<FlagRow, 'category' | 'severity' | 'status' | 'description'>;

/**
 * Card density only: makes the HEADER the labeled summary node instead of the
 * card. This is S13's structure (TasksScreen) — the card itself is
 * `accessible={false}` so each action button stays independently reachable, and
 * one child announces the card. Omit it and the header stays inert, which is
 * what Nearby needs: its host Pressable owns the whole card's one-breath
 * PROTECT-1 label, and a nested accessible node would fragment it.
 */
export type FlagCardHeaderA11y = {
  role: 'button' | 'checkbox';
  label: string;
  hint?: string;
  /** The `a11yToggle(...)` bundle — accessibilityState plus its flat aria aliases. */
  state?: ReturnType<typeof a11yToggle>;
};

export type FlagCardProps = {
  flag: FlagCardFlag;
  density: FlagCardDensity;
  /**
   * Distance to the viewer, if a location has resolved. Renders as the census's
   * last built-in segment in MONO (T1), and joins the default spoken label via
   * `speakDistance` — never `formatDistance`, whose "433 m" a screen reader
   * reads as "four hundred thirty three em" (SR-042).
   */
  distanceKm?: number | null;
  /** Row density only: the row is the button. */
  onPress?: () => void;
  /** Row density only. */
  onLongPress?: () => void;
  /** Card density only: the action slot (rule F3 — one filled verb, then siblings). */
  actions?: React.ReactNode;
  /** Card density only. */
  showDescription?: boolean;
  /**
   * The line rule for the description: 3 lines below the recomposition point,
   * uncapped at or above it. NEVER 2 — two lines is what cut two thirds of a
   * reporter's sentence off the one screen a large-type user is steered to.
   * Pass `false` to cap nothing at any size (Nearby, whose accessible list is
   * the map's equal and truncates nothing — Phase 0 item 0.2 / rule T4).
   */
  clampDescription?: boolean;
  /** Extra census segments appended after the distance ("11 min walk", "2d ago"). */
  censusExtra?: (string | null | undefined)[];
  /** Card density only: leading media (Tasks' 80pt photo thumbnail). */
  media?: React.ReactNode;
  /** Title-row trailing slot (Nearby's distance chip). */
  trailing?: React.ReactNode;
  /** Card density only: header trailing accessory (Tasks' selection checkmark). */
  headerAccessory?: React.ReactNode;
  headerA11y?: FlagCardHeaderA11y;
  /** Row density: the chevron. Dropped automatically at the recomposition point. */
  showChevron?: boolean;
  /** Row density: overrides the default composite label. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The composite spoken label for a flag — the census sentence, said the way the
 * app has always said it (Home's exact composition, F4-10 / T8). Exported so a
 * host that must override it can still start from the shared phrasing, and so
 * tests can pin the sentence rather than a screen's copy of it.
 */
export function flagCardA11yLabel(flag: FlagCardFlag, distanceKm?: number | null): string {
  const head = `${CATEGORY_LABELS[flag.category]}, ${severityA11y(flag.severity)}, ${statusA11y(flag.status)}`;
  return distanceKm != null ? `${head}, ${speakDistance(distanceKm)}` : head;
}

/**
 * A distance with its NUMERAL in mono and its UNIT in the surrounding face.
 *
 * ─── WHAT THE DEVICE CAUGHT ───────────────────────────────────────────────
 * Built first with `formatDistance`'s whole output in JetBrains Mono, which is
 * what the board draws. On the 17e it rendered "314   m": `formatDistance`
 * joins value and unit with U+00A0 (a non-breaking space, so the unit can never
 * orphan across a wrap), and in a MONOSPACE face that space takes a full
 * character advance — roughly twice the body face's. The gap read as a typo.
 *
 * T1 asks for mono on "every numeral that is data". A unit is a word, and the
 * separator belongs to the sentence, so both stay in the face around them. The
 * split is on the last U+00A0 rather than on whitespace generally: that
 * character is `formatDistance`'s own deliberate joiner, and "<50 m" has no
 * other space to be confused with it.
 *
 * If the string ever arrives without one, the whole thing renders in mono —
 * the old behaviour, not a crash and not an empty node.
 */
export function MonoDistance({
  value,
  style,
  maxFontSizeMultiplier,
}: {
  value: string;
  style?: StyleProp<TextStyle>;
  /**
   * ─── THE SECOND THING THE DEVICE CAUGHT ──────────────────────────────────
   * `variant="mono"` brings the mono row of AppText's variant table with it,
   * and that row caps at 1.4 while `body` and `bodyMedium` are uncapped by
   * contract. Inside a `content` TypeBlock that never surfaces — the block caps
   * everything beneath it equally, which is exactly what T3 is for. OUTSIDE one
   * it does: at accessibility-extra-large the Home row rendered
   * "Verified · 314 m" with the 314 roughly 40% smaller than the words either
   * side of it. That is SW-36's defect wearing different clothes — one line,
   * two scaling rules — which is the class this whole component exists to end.
   *
   * The fix for the common case is a content block (both densities have one
   * now). This prop is for a host that is NOT content: the Tasks banner is
   * chrome, its text caps at 1.6, and its numeral has to cap there too.
   */
  maxFontSizeMultiplier?: number;
}) {
  const at = value.lastIndexOf('\u00A0');
  const mono = (text: string) => (
    <AppText
      variant="mono"
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[styles_mono.tabular, style]}
    >
      {text}
    </AppText>
  );
  if (at === -1) return mono(value);
  return (
    <>
      {mono(value.slice(0, at))}
      {value.slice(at)}
    </>
  );
}

// Declared apart from makeStyles: this pair is theme-independent, and
// MonoDistance is used by screens that build their own StyleSheet.
const styles_mono = StyleSheet.create({
  // T1: TABULAR figures, so a column of distances stays a column instead of
  // shuffling sideways as 1s and 8s trade places. The face alone would not.
  tabular: { fontVariant: ['tabular-nums'] },
});

export function FlagCard({
  flag,
  density,
  distanceKm,
  onPress,
  onLongPress,
  actions,
  showDescription = false,
  clampDescription = true,
  censusExtra,
  media,
  trailing,
  headerAccessory,
  headerA11y,
  showChevron = true,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: FlagCardProps) {
  const color = useColor();
  const styles = React.useMemo(() => makeStyles(color), [color]);
  const { fontScale } = useWindowDimensions();
  // F4 — one threshold for the whole recomposition, shared with Home, the
  // onboarding cards and the map bar so the app changes shape all at once
  // rather than one screen at a time.
  const axRecompose = isAxRecompose(fontScale);
  const isRow = density === 'row';

  const distanceText = distanceKm != null ? formatDistance(distanceKm) : null;
  // The census in two halves, because F4 breaks it at the "·" BEFORE the status
  // word rather than wherever the line happens to run out.
  const censusHead = `Severity ${flag.severity} · ${SEVERITY_LABELS[flag.severity]}`;
  const censusExtras = (censusExtra ?? []).filter((s): s is string => Boolean(s));

  // The tail is assembled as nodes, not as a string, because exactly one of its
  // segments is a NUMERAL and T1 puts numerals in JetBrains Mono with tabular
  // figures. A nested AppText inherits the parent's size and colour and changes
  // only the face, so the sentence stays one sentence to the eye and one text
  // node family to the layout.
  const censusTail = (
    <>
      {STATUS_LABELS[flag.status]}
      {distanceText ? (
        <>
          {' · '}
          <MonoDistance value={distanceText} />
        </>
      ) : null}
      {censusExtras.map((seg) => (
        <React.Fragment key={seg}>{` · ${seg}`}</React.Fragment>
      ))}
    </>
  );

  const census = axRecompose ? (
    <>
      <AppText variant="body" style={styles.census}>{censusHead}</AppText>
      <AppText variant="body" style={styles.census}>{censusTail}</AppText>
    </>
  ) : (
    <AppText variant="body" style={styles.census}>
      {censusHead}
      {' · '}
      {censusTail}
    </AppText>
  );

  const title = (
    <AppText variant="bodyMedium" style={isRow ? styles.rowTitle : styles.cardTitle}>
      {CATEGORY_LABELS[flag.category]}
    </AppText>
  );

  // ── row ────────────────────────────────────────────────────────────────
  if (isRow) {
    // T3: a row is a card/row block — content, uncapped, bounded by the width
    // rule instead. This was missing at first and the device found it: without
    // the block the census fell through to the variant table, where `body` is
    // uncapped and `mono` caps at 1.4, so at large type the distance shrank
    // away from the sentence it sits in. TypeBlock renders no View and no
    // style, so wrapping the row cannot move a pixel at default size.
    return (
      <TypeBlock cap={TYPE_BLOCK.content}>
      <PressableScale
        style={[styles.row, style]}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? flagCardA11yLabel(flag, distanceKm)}
        accessibilityHint={accessibilityHint}
        testID={testID}
      >
        {/* F4: below the recomposition point this is the shipped row — 24pt
            disc, text, chevron, all on one line. At or above it the row wraps:
            the disc scales with the type and takes the line above a FULL-WIDTH
            text block, because a 24pt disc beside 40pt text reads as a bullet
            rather than as the unit of the system (board 01). The chevron drops
            out at that size — the whole row is still the button, and the
            accessibilityLabel above is untouched, so a screen reader loses
            nothing. */}
        {/* No per-site cap. T3 says a fixed box carries its cap WITH it, and
            SeverityDisc does — DISC_MAX_FONT_SCALE, derived from the box: 12pt
            in a 24pt circle reaches 19.2pt at 1.6 and still fits. Home used to
            pass 1.3 here, which is exactly the per-call-site drift T3 was
            written to end, and it was never load-bearing: above 1.5x
            `scaleWithType` takes over and grows the circle with the digit, so
            the cap only ever governs below that point, where the effective
            multiplier tops out at 1.5 and the digit reaches 18pt. */}
        <SeverityDisc
          severity={flag.severity}
          size={24}
          digitSize={font.size.xs}
          scaleWithType={axRecompose}
        />
        <View style={[styles.rowText, axRecompose && styles.rowTextWide]}>
          {title}
          {census}
        </View>
        {trailing}
        {showChevron && !axRecompose && (
          <ChevronRight size={18} color={color.inkGlassMuted} strokeWidth={2} />
        )}
      </PressableScale>
      </TypeBlock>
    );
  }

  // ── card ───────────────────────────────────────────────────────────────
  // T3: one content block over the whole card, so the title, the census and the
  // description share ONE multiplier and cannot invert. The disc is a fixed box
  // and pins its own cap, so the block does not reach it.
  return (
    <TypeBlock cap={TYPE_BLOCK.content}>
      <View style={[styles.card, style]} testID={testID}>
        <View
          style={axRecompose ? styles.cardHeaderStacked : styles.cardHeader}
          {...(headerA11y
            ? {
                accessible: true,
                accessibilityRole: headerA11y.role,
                accessibilityLabel: headerA11y.label,
                accessibilityHint: headerA11y.hint,
                ...(headerA11y.state ?? {}),
              }
            : null)}
        >
          {/* F4, and it is a real BRANCH rather than a wrap. Below the
              recomposition point the header is one row and the disc leads it.
              At or above it the disc takes a line of its own, above a
              full-width text block, because a 32pt disc beside 40pt text reads
              as a bullet rather than as the unit of the system.

              The row density does this with `flexWrap` plus a 100% flex basis,
              and on the device that wraps exactly as intended. The same styles
              in this header did NOT: the 17e rendered the disc and the title
              side by side at accessibility-extra-large, with the styles
              resolving correctly (asserted, so this is not a guess about which
              rule applied). Rather than ship a composition that depends on a
              line-break I cannot explain, the recomposition is stated: a column
              of two rows, so "the disc is above the text" is structure and not
              an outcome. The trailing slot and the header accessory ride WITH
              the disc, which keeps Nearby's distance and Tasks' selection
              checkmark at the top of the card where a thumb expects them. */}
          {axRecompose ? (
            <>
              <View style={styles.cardHeaderTop}>
                <SeverityDisc
                  severity={flag.severity}
                  size={32}
                  digitSize={font.size.sm}
                  scaleWithType
                />
                {trailing}
                {headerAccessory}
              </View>
              <View style={styles.cardHeaderText}>
                {title}
                {census}
              </View>
            </>
          ) : (
            <>
              <SeverityDisc severity={flag.severity} size={32} digitSize={font.size.sm} />
              <View style={styles.cardHeaderText}>
                {title}
                {census}
              </View>
              {trailing}
              {headerAccessory}
            </>
          )}
        </View>
        {(media || (showDescription && flag.description)) && (
          <View style={styles.cardBody}>
            {media}
            {showDescription && flag.description ? (
              <AppText
                variant="bodyMedium"
                style={styles.description}
                numberOfLines={clampDescription && !axRecompose ? 3 : undefined}
              >
                {flag.description}
              </AppText>
            ) : null}
          </View>
        )}
        {actions}
      </View>
    </TypeBlock>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // ── row density ──────────────────────────────────────────────────────
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      // F4's other half: without the wrap the disc can never take a line of
      // its own, and `rowTextWide`'s 100% basis would simply overflow.
      flexWrap: 'wrap',
      rowGap: spacing.xs,
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      minHeight: 56,
    },
    rowText: { flex: 1, gap: 1 },
    rowTextWide: { flexBasis: '100%', flexGrow: 1 },
    rowTitle: {
      fontSize: font.size.lg,
      color: color.textStrong,
      fontWeight: font.weight.semibold,
    },

    // ── card density ─────────────────────────────────────────────────────
    card: { gap: spacing.sm },
    // SW-36, half one: the header may wrap, so a title that outgrows the room
    // between the disc and whatever trails it can take a line of its own.
    // minHeight is SW-22/SW-43's 44pt frame for the summary node.
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      minHeight: a11y.minTargetSize,
    },
    // F4: at the recomposition point the header becomes a column of two rows.
    // minHeight stays — it is SW-22/SW-43's 44pt accessibility frame and the
    // summary node is this View in both shapes.
    cardHeaderStacked: { flexDirection: 'column', gap: spacing.sm, minHeight: a11y.minTargetSize },
    // The disc's own line, with whatever trails it.
    cardHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardHeaderText: { flexGrow: 1, flexShrink: 1, minWidth: 130, gap: 1 },
    // SW-36, half two — AND NOT OPTIONAL. Freeing the basis is not enough on
    // its own: flexShrink lets a non-shrinking sibling squeeze the title below
    // its own longest word, and iOS then character-breaks it ("Broken sidewal /
    // k") even though the row is free to wrap. The floor is what makes the wrap
    // fire. Same number, same reasoning, as ReportsBreakdownCard's barLabel.
    cardTitle: {
      fontSize: font.size.xl,
      fontWeight: font.weight.semibold,
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 130,
      color: color.textStrong,
    },
    cardBody: { flexDirection: 'row', gap: spacing.md },
    description: {
      fontSize: font.size.base,
      color: color.textStrong,
      flexGrow: 1,
      flexShrink: 1,
      minWidth: 130,
    },

    // ── shared ───────────────────────────────────────────────────────────
    census: {
      fontSize: font.size.sm,
      fontFamily: font.family.bodyMedium,
      color: color.inkGlassMuted,
    },
  });
