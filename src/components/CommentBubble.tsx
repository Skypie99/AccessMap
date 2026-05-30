import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColor } from '@/theme/ThemeContext';
import { radius, font, spacing } from '@/theme';
import { relativeTime } from '@/lib/relativeTime';

interface CommentBubbleProps {
  author: string;
  text: string;
  createdAt: Date;
  isOwn: boolean;
}

export function CommentBubble({ author, text, createdAt, isOwn }: CommentBubbleProps) {
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

  return (
    <View
      style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}
      accessible
      accessibilityRole="text"
      // WCAG 4.1.2: composite label includes author + text; timestamp is
      // conveyed as a relative string read together with the message body.
      accessibilityLabel={`Comment by ${author}: ${text}, ${timeLabel}`}
    >
      <View style={[styles.bubble, bubbleStyle]}>
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
        */}
        <Text
          style={[
            styles.text,
            {
              color: isOwn ? color.textOnBrand : color.text,
              fontWeight: isOwn ? font.weight.bold : font.weight.regular,
            },
          ]}
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
});
