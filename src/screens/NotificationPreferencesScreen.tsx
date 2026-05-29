/**
 * NotificationPreferencesScreen — a dedicated screen for managing push /
 * alert notification preferences (separate from the in-app banner prefs in
 * NotificationPrefsModal, which control which flag status transitions surface
 * in the "Since your last visit" banner).
 *
 * Presents four toggle rows:
 *  - Flag status updates   — my reported flags change status
 *  - Nearby flags          — new flags near my location
 *  - Watched flag updates  — any flag I'm watching changes
 *  - Bulk watch alerts     — digest when many watched flags update at once
 *
 * Renders as a slide-up Modal from SettingsScreen (same pattern as
 * AboutScreen) so navigation stays tab-only. The hook handles all
 * AsyncStorage reads/writes; the screen is pure presentation.
 *
 * Accessibility: each toggle row uses accessibilityRole="switch" +
 * accessibilityState on the wrapping View (trapping the full semantic unit),
 * and the Switch is hidden from AT to avoid double-announcement — the same
 * pattern already in SettingsScreen's push-notifications row (QA-validated).
 */
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useAuth } from '@/lib/auth';
import {
  useNotificationPreferences,
  type NotificationPreferences,
} from '@/hooks/useNotificationPreferences';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface ToggleRowDef {
  key: keyof NotificationPreferences;
  label: string;
  subtitle: string;
}

const TOGGLE_ROWS: ToggleRowDef[] = [
  {
    key: 'flagStatusUpdates',
    label: 'Flag status updates',
    subtitle: 'Notify me when a flag I reported is verified, resolved, or rejected.',
  },
  {
    key: 'nearbyFlags',
    label: 'Nearby flags',
    subtitle: 'Notify me when a new accessibility flag is reported near my location.',
  },
  {
    key: 'watchedFlagUpdates',
    label: 'Watched flag updates',
    subtitle: 'Notify me when any flag on my watch list changes status.',
  },
  {
    key: 'bulkWatchAlerts',
    label: 'Bulk watch alerts',
    subtitle: 'Send a digest notification when many watched flags update at once.',
  },
];

const TOGGLE_ROW_HEIGHT = 64;

/**
 * A single preference toggle row — label, subtitle, and a Switch.
 * The outer View carries the switch role so VoiceOver/TalkBack reads the full
 * label+state as a single unit; the Switch itself is hidden from AT so the
 * control isn't announced twice (same rationale as SettingsScreen pushRow).
 */
function ToggleRow({
  label,
  subtitle,
  value,
  onToggle,
  color,
}: {
  label: string;
  subtitle: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  color: ColorTheme;
}) {
  const styles = makeStyles(color);
  return (
    <View
      style={styles.toggleRow}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={subtitle}
      accessibilityState={{ checked: value }}
    >
      <View style={styles.toggleTextWrap}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
}

export default function NotificationPreferencesScreen({ visible, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { user } = useAuth();
  const { preferences, setPreference, loading } = useNotificationPreferences(user?.id);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* accessibilityViewIsModal traps VoiceOver focus inside the sheet
            so it can't escape back to the underlying Settings screen. */}
        <View style={styles.card} accessibilityViewIsModal>
          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.title} accessibilityRole="header">
                Notification Preferences
              </Text>
              <Text style={styles.titleSubtitle}>Choose which kinds of alerts you receive.</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close notification preferences"
            >
              <Text
                style={styles.closeBtnText}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                ✕
              </Text>
            </Pressable>
          </View>

          {/* Body */}
          {!user ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>Sign in to save notification preferences.</Text>
            </View>
          ) : loading ? (
            <View style={styles.center}>
              <ActivityIndicator
                color={color.text}
                // Use color.text for ≥4.5:1 contrast on spinner strokes.
                // color.brand (#2f80ed) is only 3.3:1 on white — AA-safe for UI
                // buttons but not ideal for thin animated spinner strokes.
              />
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {TOGGLE_ROWS.map((row) => (
                <ToggleRow
                  key={row.key}
                  label={row.label}
                  subtitle={row.subtitle}
                  value={preferences[row.key]}
                  onToggle={(v) => setPreference(row.key, v)}
                  color={color}
                />
              ))}
              <Text style={styles.footer}>
                Changes take effect immediately. All notifications are on by default.
              </Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: color.scrim,
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: color.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
      maxHeight: '85%',
      ...shadow.e3,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    titleWrap: { flex: 1, gap: 2 },
    title: {
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    titleSubtitle: {
      fontSize: font.size.sm,
      color: color.textMuted,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: font.size.lg,
      color: color.text,
      fontWeight: font.weight.bold,
    },
    notice: {
      backgroundColor: color.warningBg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: color.accentOrange,
    },
    noticeText: {
      color: color.warningFg,
      fontSize: font.size.sm,
    },
    center: {
      alignItems: 'center',
      paddingVertical: spacing.xxxl,
    },
    list: { flexShrink: 1 },
    listContent: { gap: spacing.sm },
    toggleRow: {
      backgroundColor: color.surfaceMuted,
      borderRadius: radius.lg,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: TOGGLE_ROW_HEIGHT,
      ...shadow.e1,
    },
    toggleTextWrap: { flex: 1, gap: 2 },
    toggleLabel: {
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    toggleSubtitle: {
      fontSize: font.size.sm,
      color: color.textMuted,
    },
    footer: {
      fontSize: font.size.xs,
      color: color.textMutedAlt,
      fontStyle: 'italic',
      marginTop: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
  });
