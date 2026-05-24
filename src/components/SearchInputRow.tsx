import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { color, font, radius, spacing } from '@/theme';

interface SearchInputRowProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

/**
 * Reusable search input row used across search/filter modals.
 *
 * Wraps a TextInput with consistent theme-token styling: a subtle bordered
 * card on color.surfaceSoft, color.text for input text, and color.textMuted
 * for the placeholder. The container View carries accessibilityRole="search"
 * so that assistive technologies announce the region appropriately.
 *
 * Props:
 *  - value / onChangeText  — controlled input
 *  - placeholder           — shown when the field is empty
 *  - accessibilityLabel    — read by VoiceOver / TalkBack for the TextInput
 *  - accessibilityHint     — optional additional context (e.g. "Filters
 *                            results as you type") announced after the label
 */
export default function SearchInputRow({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  accessibilityHint,
}: SearchInputRowProps) {
  return (
    <View style={styles.container} accessibilityRole="search">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.textMuted}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.borderSubtle,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    fontSize: font.size.md,
    color: color.text,
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
});
