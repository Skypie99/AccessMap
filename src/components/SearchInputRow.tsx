/**
 * SearchInputRow — reusable "🔎 [text input] [✕ clear]" row.
 *
 * Consolidates the duplicated inline search-bar pattern from HelpModal,
 * MyReportsModal, NearbyFlagsModal, and AddressSearchModal. The magnifier
 * glyph is decorative and suppressed from the accessibility tree via
 * decorativeProps. The clear button is only rendered when there is text,
 * meets the 44pt touch target requirement (WCAG 2.5.5 / Apple HIG), and
 * carries an explicit accessibilityLabel + accessibilityRole.
 *
 * Visual style is extracted from HelpModal (the most design-system-aligned
 * variant) and parameterised so callers can control the wrapper style if
 * they need a different container appearance.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { decorativeProps } from '@/lib/accessibility';
import { color, font, radius, spacing } from '@/theme';

export interface SearchInputRowProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  /** Override styles on the outer wrapper (e.g. margin, width). */
  wrapStyle?: ViewStyle;
}

export default function SearchInputRow({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search…',
  autoFocus = false,
  accessibilityLabel = 'Search',
  wrapStyle,
}: SearchInputRowProps) {
  return (
    <View style={[styles.searchWrap, wrapStyle]}>
      {/* Decorative magnifier — hidden from screen readers */}
      <Text style={styles.searchGlyph} {...decorativeProps}>
        🔎
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.placeholderText}
        style={styles.searchInput}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        maxLength={200}
        accessibilityLabel={accessibilityLabel}
      />

      {value.length > 0 && (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          style={({ pressed }) => [
            styles.searchClear,
            pressed && styles.searchClearPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          {/* Decorative ✕ — the Pressable's accessibilityLabel already describes the action */}
          <Text style={styles.searchClearText} {...decorativeProps}>
            ✕
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    // No outer horizontal margin here — callers supply via wrapStyle.
    // HelpModal needs spacing.xl; NearbyFlagsModal wants 0 (full-bleed row).
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: color.surfaceSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderSubtle,
  },
  searchGlyph: {
    fontSize: font.size.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: font.size.md,
    color: color.textStrong,
    paddingVertical: spacing.sm,
    // 44pt minimum touch / tap target (WCAG 2.5.5, Apple HIG).
    minHeight: 44,
  },
  searchClear: {
    // 44pt square touch target so the clear (✕) button never falls
    // below the WCAG 2.5.5 / Apple HIG recommendation.
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearPressed: { opacity: 0.6 },
  searchClearText: {
    fontSize: font.size.sm,
    color: color.textMuted,
    fontWeight: font.weight.bold,
  },
});
