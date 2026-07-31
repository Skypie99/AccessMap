import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { X } from 'lucide-react-native';
import { useColor } from '@/theme/ThemeContext';
import { radius, font, spacing } from '@/theme';
import { relativeTime } from '@/lib/relativeTime';
import {
  HIDE_CONTROL_LABEL,
  hideCommentA11yLabel,
  REPORT_CONTROL_LABEL,
  reportCommentA11yLabel,
} from '@/lib/copy';

interface CommentBubbleProps {
  author: string;
  text: string;
  createdAt: Date;
  isOwn: boolean;
  // When provided, a delete affordance is shown on own-message bubbles.
  onDelete?: () => void;
  /**
   * When provided, an Apple 1.2(b) Report affordance is shown on OTHER
   * people's bubbles. Never on your own — Delete is your affordance there, and
   * reporting yourself is not a thing. The call site decides ownership (the
   * comment id and the viewer both live there, not here); this component
   * enforces the same rule a second time so the two can never disagree.
   */
  onReport?: () => void;
  /**
   * When provided, an Apple 1.2(c) Hide affordance is shown on OTHER people's
   * bubbles — the same rows as Report, and for the same reason: hiding your own
   * comment is not a thing you would want (Delete is your affordance there),
   * and 1.2(c) exists so a reader can stop seeing somebody ELSE's content.
   *
   * It is a PERSONAL, device-local filter, not a takedown: the caller writes to
   * `hiddenContent.ts` (AsyncStorage) and nothing about this control may imply
   * the comment went away for anyone else.
   */
  onHide?: () => void;
}

export function CommentBubble({
  author,
  text,
  createdAt,
  isOwn,
  onDelete,
  onReport,
  onHide,
}: CommentBubbleProps) {
  const color = useColor();
  const timeLabel = relativeTime(createdAt);

  const bubbleStyle = isOwn
    ? {
        // A11Y-229 (M-52 grammar): the bubble's body text AND timestamp are
        // small white type on this fill — dark brand measures 3.42:1 (large-
        // text-only). ctaFill is the mode-independent Wayfinder Blue, 5.24
        // both themes; light mode is byte-identical (light brand == ctaFill).
        backgroundColor: color.ctaFill,
        borderBottomRightRadius: radius.xs,
      }
    : {
        backgroundColor: color.surfaceNeutral,
        borderBottomLeftRadius: radius.xs,
      };

  // ── THE COMPOSITE-LABEL LAW (WCAG 4.1.2), re-derived for a THIRD action ──
  //
  // `accessible={true}` on the row collapses every descendant into ONE
  // VoiceOver node — including any child Pressable, which then cannot be
  // reached or activated at all. So the row may be composite ONLY when it
  // renders no child Pressable. For a bubble with no actions the composite
  // label is still the right pattern: one clean read, no orphan nodes.
  //
  // This was once spelled `!onDelete`, which was correct only while delete was
  // the only action AND the only reason a Pressable existed; the Report work
  // replaced it with a derivation over the two gates. That derivation is why
  // adding Hide is a one-line change instead of a re-audit: the flag is not a
  // restatement of the rule, it IS the rule — composite ⇔ no child Pressable
  // rendered — so a new action extends it by construction and cannot drift out
  // of sync with the buttons it is supposed to describe.
  //
  // Get this wrong in either direction and the failure is silent: a hideable
  // bubble left composite draws a perfect Hide button that VoiceOver cannot
  // reach, and a bubble that goes non-composite with no button to show for it
  // loses its one clean read for nothing.
  const showDelete = isOwn && !!onDelete;
  const showReport = !isOwn && !!onReport;
  const showHide = !isOwn && !!onHide;
  const useCompositeLabel = !showDelete && !showReport && !showHide;

  // The footer exists for EITHER action, so the timestamp's layout branch is
  // keyed on the footer, never on one of its occupants. Spelling this
  // `showReport` (as it was when Report was alone down there) would drop the
  // timestamp below a Hide-only bubble.
  const showFooter = showReport || showHide;

  // The non-composite text label. It must branch on `isOwn`, NOT on which
  // action is present: Report ships on OTHER people's comments, where "Your
  // comment" would be a lie about authorship spoken only to screen-reader
  // users. The non-own branch is byte-identical to the composite label above
  // it, so both reading paths say the same sentence.
  const textNodeLabel = isOwn
    ? `Your comment: ${text}. ${timeLabel}`
    : `Comment by ${author}: ${text}, ${timeLabel}`;

  // Always hidden from the a11y tree: the timestamp is already spoken as the
  // tail of whichever label is in force above, so exposing it again would make
  // every comment read its own age twice.
  const timeNode = (
    <AppText
      variant="mono"
      style={[
        styles.time,
        showFooter && styles.timeInFooter,
        // A11Y-230: textSubtle on the other-bubble's surfaceNeutral fill
        // measured 4.37:1 light / 3.69:1 dark — the ship-ready proof set's
        // "SHIPPED timestamp (THE FINDING)" rows, finally disposed. textMuted
        // clears 4.5 in both themes (arbitrated:
        // a11yqa-timestamp-ink-stacks.json). Visual-only 1.4.3 — the
        // timestamp is AT-hidden; the composite label speaks it.
        { color: isOwn ? color.textOnBrand : color.textMuted },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {timeLabel}
    </AppText>
  );

  return (
    <View
      style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}
      accessible={useCompositeLabel}
      accessibilityRole={useCompositeLabel ? 'text' : undefined}
      accessibilityLabel={
        useCompositeLabel ? `Comment by ${author}: ${text}, ${timeLabel}` : undefined
      }
    >
      <View style={[styles.bubble, bubbleStyle]}>
        {isOwn && onDelete && (
          <Pressable
            onPress={onDelete}
            hitSlop={8}
            style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${author}'s comment`}
            accessibilityHint="Permanently removes your comment"
          >
            <X
              size={18}
              color="rgba(255,255,255,0.75)"
              strokeWidth={2.2}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </Pressable>
        )}
        {!isOwn && (
          <AppText
            variant="label"
            style={[styles.author, { color: color.brandText }]}
            numberOfLines={1}
            // The byline is part of the sentence, never a node of its own. In
            // the composite path `accessible` on the row already absorbs it;
            // in the non-composite path it would otherwise be read as a bare
            // orphan ("Alice") immediately before the text node repeats it
            // ("Comment by Alice: …"). Hidden there, so both paths read once.
            // Own bubbles never reach this branch — they render no byline.
            accessibilityElementsHidden={!useCompositeLabel}
            importantForAccessibility={useCompositeLabel ? 'auto' : 'no-hide-descendants'}
          >
            {author}
          </AppText>
        )}
        {/*
          WCAG 1.4.3 — own-message text uses fontWeight bold (700) so it
          qualifies as "large text" (14pt bold per WCAG 2.2 definition).
          Large text only requires a 3:1 ratio; color.brand (#1466E0) on
          color.textOnBrand (#fff) is ~3.5:1 — AA pass.

          Without bold, 14pt regular text needs 4.5:1 and brand blue only
          gives ~3.5:1 — a WCAG 1.4.3 AA failure.

          Whenever the row renders an action (delete on your own bubble, report
          on somebody else's), the outer row is NOT a composite node, so the
          text carries its own label and VoiceOver can read the message content
          individually. Which sentence it carries is decided by `isOwn`, not by
          which action is present — see `textNodeLabel` above.
        */}
        <AppText
          variant="body"
          style={[
            styles.text,
            {
              color: isOwn ? color.textOnBrand : color.text,
              fontWeight: isOwn ? font.weight.bold : font.weight.regular,
            },
          ]}
          accessible={!useCompositeLabel}
          accessibilityLabel={useCompositeLabel ? undefined : textNodeLabel}
        >
          {text}
        </AppText>
        {/*
          The timestamp is the same node in both layouts — extracted to a
          variable only so the Report footer can wrap it without a second copy
          drifting from this one. With `showReport` false the style array
          resolves to exactly what it resolved to before this change, which is
          why every own bubble (showReport can never be true on one) renders
          byte-identically.
        */}
        {showFooter ? (
          <View style={styles.footerRow}>
            {/*
              THE TWO MODERATION CONTROLS, per comment. They are grouped so the
              timestamp keeps the bubble's right edge it has always had rather
              than being spread apart from them by the row's space-between.

              DELIBERATELY NO accessibilityHint on either. Every hint that would
              actually help here ("we'll take this down", "a moderator will
              review it", "this removes it for everyone") is a moderation
              promise, and authoring one is not this file's to write. A missing
              hint is not a WCAG failure — the accessible NAME carries the
              meaning, and because a thread shows many buttons whose visible
              text is the same word, each name is author-qualified via copy.ts
              rather than left as a bare, ambiguous verb.

              TOUCH TARGET: the deleteBtn recipe, verbatim — padding 6/8 plus
              hitSlop 8, and explicitly NO minHeight:44 (this file records that
              minHeight inflated every bubble with a phantom header). Effective
              target ≈ 12pt label + 16 padding + 16 slop ≈ 44+ tall, and wider
              than 44 across either word (WCAG 2.5.8). The group's `gap` is what
              keeps the two slop regions from overlapping — see footerActions.
            */}
            <View style={styles.footerActions}>
              {showReport && (
                <Pressable
                  onPress={onReport}
                  hitSlop={8}
                  style={({ pressed }) => [styles.footerBtn, pressed && styles.footerBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={reportCommentA11yLabel(author)}
                >
                  <AppText
                    variant="label"
                    style={[styles.footerBtnText, { color: color.textMuted }]}
                  >
                    {REPORT_CONTROL_LABEL}
                  </AppText>
                </Pressable>
              )}
              {/*
                THE APPLE 1.2(c) HIDE CONTROL. Treated as Report's exact peer —
                same ink, same size, same target recipe — because they ARE peers
                on this row and inventing a visual difference between them would
                be tuning by eye, which this programme forbids. What separates
                them is the word, which is Sky's (§SKY-3c: the controls are
                distinct and must not be collapsed), not the styling.
              */}
              {showHide && (
                <Pressable
                  onPress={onHide}
                  hitSlop={8}
                  style={({ pressed }) => [styles.footerBtn, pressed && styles.footerBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={hideCommentA11yLabel(author)}
                >
                  <AppText
                    variant="label"
                    style={[styles.footerBtnText, { color: color.textMuted }]}
                  >
                    {HIDE_CONTROL_LABEL}
                  </AppText>
                </Pressable>
              )}
            </View>
            {timeNode}
          </View>
        ) : (
          timeNode
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: spacing.tight,
    paddingHorizontal: spacing.md,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.tight,
  },
  author: {
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
  },
  text: {
    fontSize: font.size.base,
    lineHeight: font.lineHeight.base,
  },
  time: {
    fontSize: font.size.caption,
    alignSelf: 'flex-end',
  },
  // The moderation footer. The actions sit at the bubble's left edge and the
  // timestamp keeps the right edge it has always had, so adding controls moves
  // no existing pixel sideways — the bubble only grows downward by the row's
  // own height. `flexWrap` is the large-dynamic-type escape: at 3x the items
  // stack instead of crushing the 44pt target.
  //
  // TREATMENT AWAITS SKY (mockup gate). Whether per-comment moderation should
  // be quiet text buttons in a footer, icons, or something else is a taste
  // call, and so is which side they sit on and in which order. This is the
  // recessive, most conventional reading of it — not a final answer.
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // The action group, so the row's space-between separates ACTIONS from the
  // timestamp rather than spreading Report, Hide and the timestamp evenly
  // across the bubble.
  //
  // `gap: spacing.lg` (16) is a correctness constraint, not a taste one. Each
  // button carries hitSlop 8 on every side, so any gap below 16 makes the two
  // slop regions OVERLAP and the boundary between "report this" and "hide
  // this" becomes ambiguous to a shaky or imprecise tap. 16 is the exact width
  // at which they meet and stop. (WCAG 2.5.8 would be satisfied by less; the
  // consequence of a mis-tap here is what sets the floor.)
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  // `styles.time` pins itself to the bubble's right edge with alignSelf
  // 'flex-end'. Inside a ROW that same property means "bottom", which would
  // drop the timestamp below the Report label. The row's justifyContent keeps
  // the right-edge position, so the cross-axis alignment is handed back.
  timeInFooter: {
    alignSelf: 'center',
  },
  // ONE dialect for BOTH footer controls — shared rather than duplicated, so
  // Report and Hide cannot drift into two treatments through a later edit to
  // only one of them.
  //
  // Copies deleteBtn's target recipe exactly (padding 6/8 + hitSlop 8, no
  // minHeight). No fill and no border: these are text buttons, and the pressed
  // state is the same opacity dim their deleteBtn sibling uses rather than a
  // new fill. (BP11's fill-swap conversion enumerated four FlagDetailModal
  // styles and did not reach this file; matching the sibling three lines below
  // keeps one dialect per file, and diverging here would create two.)
  footerBtn: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnPressed: {
    opacity: 0.5,
  },
  // color.textMuted on color.surfaceNeutral — 5.07:1 light / 5.49:1 dark,
  // measured by the arbiter, not by eye (design-reviews/ship-ready/tools/
  // shipready-comment-report-stacks.json). Chosen over inkGlassMuted, which
  // also passes but is the CHROME-GLASS muted ink; this bubble is an opaque
  // neutral fill, and textMuted is the token that already means "secondary ink
  // on a solid surface". Sized with the byline (xs) so it reads as bubble
  // chrome rather than as a second voice competing with the comment.
  //
  // Hide introduces NO new ink/fill pair — it reuses this already-banked one,
  // which is why 1.2(c) needed no second arbiter run.
  footerBtnText: {
    fontSize: font.size.xs,
    fontWeight: font.weight.semibold,
  },
  deleteBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 6,
    paddingVertical: 8,
    marginBottom: 2,
    // No minHeight:44 — it inflated every own-bubble with a ~26pt phantom
    // header. hitSlop={8} on the Pressable keeps the effective target ≥44
    // (glyph 18 + padding 16 + slop 16), the PhotoGallery removeBtn recipe.
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnPressed: {
    opacity: 0.5,
  },
  // The ✕ delete glyph is decorative (translucent white on the brand bubble) and
  // sits below the 4.5:1 normal-text threshold ON PURPOSE — the Pressable's
  // accessibilityLabel carries the full meaning for screen readers, so the glyph
  // itself need not pass WCAG 1.4.3. (The visible *timestamp* above now uses solid
  // textOnBrand = #fff on brand #1466E0 ≈ 5.2:1, which does pass.)
  deleteBtnText: {
    fontSize: font.size.caption,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: font.weight.bold,
  },
});
