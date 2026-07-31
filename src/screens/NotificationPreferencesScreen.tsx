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
 * Accessibility: in each toggle row the Switch itself carries the accessible
 * identity (role + label + state) and stays in the a11y tree, so VoiceOver /
 * TalkBack can actually operate it — the corrected pattern from
 * SettingsScreen's push-notifications row and ProfileScreen's real-time row.
 * (An earlier version put role="switch" on the wrapper View — which has no
 * press handler — and hid the Switch, so the rows announced as switches but
 * double-tap did nothing: A11Y-212, the Alex-1 defect class.)
 */
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  type Text,
  View,
} from 'react-native';
import { font, radius, shadow, spacing } from '@/theme';
import { X } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useAuth } from '@/lib/auth';
import { a11yToggle, decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
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
 * The Switch carries the accessible identity (role + label + hint + state) and
 * stays in the a11y tree so the control screen readers announce is the control
 * they can operate (WCAG 4.1.2 / 2.1.1). The label/subtitle render as plain
 * text alongside it — same shape as SettingsScreen's pushRow and
 * ProfileScreen's real-time toggle, the QA-validated Alex-1 fix pattern.
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
    <View style={styles.toggleRow}>
      <View style={styles.toggleTextWrap}>
        <AppText variant="label" style={styles.toggleLabel}>{label}</AppText>
        <AppText variant="body" style={styles.toggleSubtitle}>{subtitle}</AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityHint={subtitle}
        {...a11yToggle({ checked: value })}
      />
    </View>
  );
}

export default function NotificationPreferencesScreen({ visible, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { user } = useAuth();
  const { preferences, setPreference, loading } = useNotificationPreferences(user?.id);
  // WCAG 2.3.3: snap (no slide) when the user prefers reduced motion.
  const reducedMotion = useReducedMotion();
  // WCAG 2.4.3: move the screen-reader cursor onto the title when the modal opens.
  const titleRef = useFocusOnOpen<Text>(visible);

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      transparent
      onRequestClose={onClose}
      aria-label="Notification Preferences"
    >
      <View style={styles.backdrop}>
        {/* accessibilityViewIsModal traps VoiceOver focus inside the sheet
            so it can't escape back to the underlying Settings screen. */}
        <View style={styles.cardWrap}>
        <GlassSurface
          variant="bulk"
          borderRadius={0}
          forceEngineered
          style={styles.card}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          {/* Header row */}
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
                Notification Preferences
              </AppText>
              <AppText variant="body" style={styles.titleSubtitle}>Choose which kinds of alerts you receive.</AppText>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close notification preferences"
            >
              <X
                size={18}
                color={color.text}
                strokeWidth={2.2} {...decorativeProps}
              />
            </Pressable>
          </View>

          {/* Body */}
          {!user ? (
            <View style={styles.notice}>
              <AppText variant="body" style={styles.noticeText}>Sign in to save notification preferences.</AppText>
            </View>
          ) : loading ? (
            <View style={styles.center}>
              <ActivityIndicator
                color={color.text}
                // Use color.text for ≥4.5:1 contrast on spinner strokes.
                // color.brand (#1466E0) is only 3.3:1 on white — AA-safe for UI
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
              <AppText variant="body" style={styles.footer}>
                Changes take effect immediately. All notifications are on by default.
              </AppText>
            </ScrollView>
          )}
        </GlassSurface>
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
      // Bulk-glass sheet: GlassSurface variant="bulk" (forceEngineered) supplies
      // the surface + top edge/specular + designed Reduce-Transparency state — no
      // backgroundColor here (the variant owns it). overflow:hidden clips the square
      // material to the rounded top; the up-shadow (was shadow.e3) moves to cardWrap.
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
      maxHeight: '85%',
      overflow: 'hidden',
    },
    cardWrap: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      ...(color.scheme === 'dark'
        ? { shadowColor: '#000', shadowOpacity: 0.35 }
        : { shadowColor: color.shadowTint, shadowOpacity: 0.12 }),
      shadowRadius: 14,
      shadowOffset: { width: 0, height: -4 },
      elevation: 5,
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
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
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
      // On-glass footnote → inkGlassMuted (GLASS §7.4 bans textMutedAlt on glass);
      // 6.24:1 over the bulk material, comfortably AA.
      color: color.inkGlassMuted,
      fontStyle: 'italic',
      marginTop: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
  });
