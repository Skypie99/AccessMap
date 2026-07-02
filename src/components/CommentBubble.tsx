import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { X } from 'lucide-react-native';
import { useColor } from '@/theme/ThemeContext';
import { radius, font, spacing } from '@/theme';
import { relativeTime } from '@/lib/relativeTime';

interface CommentBubbleProps {
  author: string;
  text: string;
  createdAt: Date;
  isOwn: boolean;
  // When provided, a delete affordance is shown on own-message bubbles.
  onDelete?: () => void;
}

export function CommentBubble({ author, text, createdAt, isOwn, onDelete }: CommentBubbleProps) {
  const color = useColor();
  const timeLabel = relativeTime(createdAt);

  const bubbleStyle = isOwn
    ? {
        backgroundColor: color.brand,
        borderBottomRightRadius: radius.xs,
      }
    : {
        backgroundColor: color.surfaceNeutral,
        borderBottomLeftRadius: radius.xs,
      };

  // WCAG 4.1.2 fix: when onDelete is present the delete Pressable must be a
  // separate a11y node. accessible={true} on the row collapses all children
  // (including the Pressable) into one VoiceOver node, making the delete
  // button unreachable. For non-deletable bubbles the composite label is the
  // correct pattern (one clean read, no orphan timestamp node).
  const useCompositeLabel = !onDelete;

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
          <AppText variant="label" style={[styles.author, { color: color.brandText }]} numberOfLines={1}>
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

          When onDelete is present (own message with delete button), the outer
          row is NOT a composite node, so the text carries its own label so
          VoiceOver can read the message content individually.
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
          accessible={!!onDelete}
          accessibilityLabel={onDelete ? `Your comment: ${text}. ${timeLabel}` : undefined}
        >
          {text}
        </AppText>
        <AppText
          variant="mono"
          style={[styles.time, { color: isOwn ? color.textOnBrand : color.textSubtle }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {timeLabel}
        </AppText>
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
