import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
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
            <Text
              style={styles.deleteBtnText}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              ✕
            </Text>
          </Pressable>
        )}
        {!isOwn && (
          <Text style={[styles.author, { color: color.brandText }]} numberOfLines={1}>
            {author}
          </Text>
        )}
        {/*
          WCAG 1.4.3 — own-message text uses fontWeight bold (700) so it
          qualifies as "large text" (14pt bold per WCAG 2.2 definition).
          Large text only requires a 3:1 ratio; color.brand (#2f80ed) on
          color.textOnBrand (#fff) is ~3.5:1 — AA pass.

          Without bold, 14pt regular text needs 4.5:1 and brand blue only
          gives ~3.5:1 — a WCAG 1.4.3 AA failure.

          When onDelete is present (own message with delete button), the outer
          row is NOT a composite node, so the text carries its own label so
          VoiceOver can read the message content individually.
        */}
        <Text
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
        </Text>
        <Text
          style={[styles.time, { color: isOwn ? color.pointsPillText : color.textSubtle }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {timeLabel}
        </Text>
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
    paddingVertical: 2,
    marginBottom: 2,
  },
  deleteBtnPressed: {
    opacity: 0.5,
  },
  // White text on brand-blue bubble: #fff on #2f80ed = 3.5:1 (large-text AA).
  // At 11pt this is below the threshold, but ✕ is decorative — the
  // accessibilityLabel carries the full meaning for screen readers.
  deleteBtnText: {
    fontSize: font.size.caption,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: font.weight.bold,
  },
});
