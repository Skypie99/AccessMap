import React, { type RefObject } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  type Text,
  View,
} from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { useFocusOnOpen } from '@/lib/accessibility';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import type {
  ModerationReasonCode,
  RejectReasonCode,
  RestoreReasonCode,
} from '@/types/database';

export type ModerationAction = 'reject' | 'restore';

type ReasonOption<T extends ModerationReasonCode> = {
  code: T;
  label: string;
};

export const REJECT_REASON_OPTIONS: readonly ReasonOption<RejectReasonCode>[] = [
  { code: 'duplicate', label: 'Duplicate' },
  { code: 'not_accessibility_barrier', label: 'Not an accessibility barrier' },
  { code: 'inaccurate', label: 'Inaccurate' },
  { code: 'abusive_or_spam', label: 'Abusive or spam' },
  { code: 'other', label: 'Other' },
];

export const RESTORE_REASON_OPTIONS: readonly ReasonOption<RestoreReasonCode>[] = [
  { code: 'moderator_error', label: 'Moderator error' },
  { code: 'new_evidence', label: 'New evidence' },
  { code: 'corrected_report', label: 'Corrected report' },
  { code: 'other', label: 'Other' },
];

type Props = {
  visible: boolean;
  action: ModerationAction;
  onCancel: () => void;
  onSelect: (reason: ModerationReasonCode) => void;
};

/**
 * An inline modal layer so it works both on ordinary screens and inside the
 * already-presented flag-detail Modal on iOS. No reason is preselected: an
 * admin must make an explicit choice before the confirmation can appear.
 */
export function ModerationReasonPicker({ visible, action, onCancel, onSelect }: Props) {
  const color = useColor();
  const styles = React.useMemo(() => makeStyles(color), [color]);
  const titleRef = useFocusOnOpen<Text>(visible) as RefObject<Text>;

  if (!visible) return null;

  const options = action === 'reject' ? REJECT_REASON_OPTIONS : RESTORE_REASON_OPTIONS;
  const title = action === 'reject' ? 'Why reject this report?' : 'Why restore this report?';

  return (
    <View
      style={styles.layer}
      accessibilityViewIsModal
      onAccessibilityEscape={onCancel}
      role="dialog"
      aria-label={title}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onCancel}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
      />
      <View style={styles.cardWrap}>
        <GlassSurface
          variant="bulk"
          borderRadius={radius.xl}
          forceEngineered
          style={styles.card}
        >
          <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
            {title}
          </AppText>
          <AppText variant="body" style={styles.intro}>
            Choose one reason. No option is selected automatically.
          </AppText>
          <ScrollView contentContainerStyle={styles.options} keyboardShouldPersistTaps="handled">
            {options.map((option) => (
              <Pressable
                key={option.code}
                onPress={() => onSelect(option.code)}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityHint={`Selects ${option.label.toLowerCase()} as the ${action} reason`}
              >
                <AppText variant="bodyMedium" style={styles.optionText}>
                  {option.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}
            accessibilityRole="button"
            accessibilityLabel="Cancel reason selection"
          >
            <AppText variant="label" style={styles.cancelText}>Cancel</AppText>
          </Pressable>
        </GlassSurface>
      </View>
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    layer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1000,
      elevation: 1000,
      backgroundColor: color.scrim,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    cardWrap: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '90%',
    },
    card: {
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.md,
      overflow: 'hidden',
    },
    title: {
      color: color.textStrong,
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
    },
    intro: {
      color: color.inkGlassMuted,
      fontSize: font.size.sm,
    },
    options: {
      gap: spacing.sm,
    },
    option: {
      minHeight: 48,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: color.borderStrong,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: color.surfaceNeutral,
    },
    optionPressed: {
      backgroundColor: color.borderPressed,
    },
    optionText: {
      color: color.textStrong,
      fontSize: font.size.md,
    },
    cancel: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
    },
    cancelPressed: {
      backgroundColor: color.borderPressed,
    },
    cancelText: {
      color: color.text,
      fontSize: font.size.sm,
    },
  });
