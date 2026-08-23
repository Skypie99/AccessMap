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
  type Text,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { bulkGlassShadow, font, radius, spacing } from '@/theme';
import { X } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { PrefsRow } from '@/components/ui/PrefsRow';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useAuth } from '@/lib/auth';
import { decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
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


/**
 * A single preference toggle row — label, subtitle, and a Switch.
 * The Switch carries the accessible identity (role + label + hint + state) and
 * stays in the a11y tree so the control screen readers announce is the control
 * they can operate (WCAG 4.1.2 / 2.1.1). The label/subtitle render as plain
 * text alongside it — same shape as SettingsScreen's pushRow and
 * ProfileScreen's real-time toggle, the QA-validated Alex-1 fix pattern.
 */
export default function NotificationPreferencesScreen({ visible, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // Read the inset context directly (zero fallback) instead of
  // useSafeAreaInsets(), which throws when there's no SafeAreaProvider — the
  // modal render-tests mount these sheets without one. Same value in the app.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
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
          style={[styles.card, { paddingBottom: Math.max(spacing.xl, insets.bottom) }]}
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
              style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: color.borderPressed }]}
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
              <AppText variant="body" style={styles.noticeText}>Sign in to change notification preferences.</AppText>
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
                <PrefsRow
                  key={row.key}
                  title={row.label}
                  subtitle={row.subtitle}
                  value={preferences[row.key]}
                  onValueChange={(v) => setPreference(row.key, v)}
                />
              ))}
              <AppText variant="body" style={styles.footer}>
                Changes take effect immediately on this device. All notifications are on by default.
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
      ...bulkGlassShadow(color),
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
