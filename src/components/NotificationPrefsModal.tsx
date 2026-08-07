/**
 * NotificationPrefsModal — settings pane for the "Since your last visit"
 * update banner. Four toggles, one per status, controlling which
 * transitions surface as banner updates. Default-all-on preserves the
 * original behavior; users opt OUT of noise.
 *
 * Persists to AsyncStorage via savePrefs on every toggle change so the
 * setting takes effect on the next Profile focus (which calls
 * refreshUpdateCount with the now-saved prefs).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, type Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { STATUS_LABELS } from '@/lib/flags';
import { StatusBadge } from './StatusBadge';
import {
  DEFAULT_PREFS,
  loadPrefs,
  savePrefs,
  type NotificationPrefs,
} from '@/lib/notificationPrefs';
import type { FlagStatus } from '@/types/database';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { androidSwitchThumbOff, bulkGlassShadow, font, radius, spacing } from '@/theme';
import { a11yToggle, decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * Optional initial-paint prefs from the parent. If provided, the modal
   * uses these as the starting state and still kicks off its own load()
   * (which reconciles when AsyncStorage resolves). Without this, the
   * first paint after opening the modal would flash DEFAULT_PREFS for
   * a few frames before the load completed.
   */
  initialPrefs?: NotificationPrefs;
  /** Fired after a toggle persists so the parent can refresh the banner count. */
  onPrefsChanged?: () => void;
}

const TOGGLES: {
  status: FlagStatus;
  prefKey: keyof NotificationPrefs;
  description: string;
}[] = [
  {
    status: 'open',
    prefKey: 'notifyOnOpen',
    // Reworded for plainness — the prior copy was technically correct
    // (diffUpdates skips first-time-seen flags so this only fires on a
    // status REVERSION), but the phrasing required context to parse.
    description: 'A flag returns to Open status — e.g., a previous resolve was rolled back.',
  },
  {
    status: 'verified',
    prefKey: 'notifyOnVerified',
    description: 'Someone confirmed a flag you reported or are watching.',
  },
  {
    status: 'resolved',
    prefKey: 'notifyOnResolved',
    description: 'A flag you care about was marked Resolved — celebrate!',
  },
  {
    status: 'rejected',
    prefKey: 'notifyOnRejected',
    description: 'A flag you reported or are watching was marked Rejected.',
  },
];

export default function NotificationPrefsModal({
  visible,
  onClose,
  initialPrefs,
  onPrefsChanged,
}: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { user } = useAuth();
  // Use the parent-provided initialPrefs if any — they're already up to
  // date from the screen's most recent refreshUpdateCount. Otherwise
  // start at DEFAULT_PREFS (cloned because DEFAULT_PREFS is frozen).
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => initialPrefs ?? { ...DEFAULT_PREFS });
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!user) {
      setPrefs({ ...DEFAULT_PREFS });
      return;
    }
    if (mountedRef.current) setLoading(true);
    try {
      const loaded = await loadPrefs(user.id);
      if (mountedRef.current) setPrefs(loaded);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const handleToggle = useCallback(
    (prefKey: keyof NotificationPrefs, value: boolean) => {
      if (!user) return;
      // Functional update — read `prev` from React's queue, not the
      // closure's `prefs` snapshot. Without this, two Switch taps fired
      // sub-frame both see the same stale `prefs`, and the second write
      // silently clobbers the first key on disk. QA Pass-1 #1 / Pass-3 #2.
      setPrefs((prev) => {
        const next: NotificationPrefs = { ...prev, [prefKey]: value };
        // Fire-and-forget persist. Optimistic UI already shows `next`.
        // On error the helper logs a warn; next focus reconciles.
        void savePrefs(user.id, next).then(
          () => onPrefsChanged?.(),
          () => {
            /* swallowed — savePrefs already warned */
          },
        );
        return next;
      });
    },
    [user, onPrefsChanged],
  );

  // WCAG 2.3.3: snap (no slide) when the user prefers reduced motion.
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): move the SR cursor onto the title when this surface opens.
  const titleRef = useFocusOnOpen<Text>(visible);
  // Bottom-anchored sheet clears the home indicator (M15 family recipe).
  // Non-throwing context read — render tests mount without a provider.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  return (
    <Modal
      aria-label="Notifications"
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.cardWrap}>
        <GlassSurface
          variant="bulk"
          borderRadius={0}
          forceEngineered
          style={[styles.card, { paddingBottom: Math.max(spacing.xxl, insets.bottom) }]}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
                Notifications
              </AppText>
              <AppText variant="body" style={styles.subtitle}>
                Choose which flag updates surface on your Profile.
              </AppText>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: color.borderPressed }]}
              accessibilityRole="button"
              accessibilityLabel="Close notifications settings"
              accessibilityHint="Closes the notification preferences panel"
            >
              <X
                size={18}
                color={color.text}
                strokeWidth={2.2} {...decorativeProps}
              />
            </Pressable>
          </View>

          {!user ? (
            <View style={styles.notice}>
              <AppText variant="body" style={styles.noticeText}>Sign in to save notification preferences.</AppText>
            </View>
          ) : loading ? (
            <View style={styles.center}>
              {/* color.text (not brand): brand #1466E0 is only 3.3:1 on the sheet;
                  matches the inked spinner in NotificationPreferencesScreen (M-24). */}
              <ActivityIndicator color={color.text} />
            </View>
          ) : (
            // Toggles scroll inside the 85% card bound — at large type the
            // "Rejected" Switch + footer used to fall past the card edge with
            // no way to reach them (sweep M8). Header stays pinned above.
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {TOGGLES.map(({ status, prefKey, description }) => {
                const value = prefs[prefKey];
                return (
                  // NOTE: do NOT add `accessible={true}` here. The row
                  // contains an interactive <Switch>; collapsing children
                  // with a parent label would steal focus from the Switch
                  // and make it unreachable to screen readers. QA Pass-2 #4.
                  // Instead, the Switch carries its own rich label + state,
                  // and the two Text rows above remain individually
                  // discoverable for users who scan the row.
                  <View key={prefKey} style={styles.row}>
                    {/* Badge is decorative here — the Switch already carries
                        the full accessible label+state. Hidden from the a11y
                        tree to avoid redundant "Flag status: X" announcements. */}
                    <View {...decorativeProps}
                    >
                      <StatusBadge status={status} style={styles.statusBadge} />
                    </View>
                    <View style={styles.rowText}>
                      <AppText variant="label" style={styles.rowTitle}>Notify on {STATUS_LABELS[status]}</AppText>
                      <AppText variant="body" style={styles.rowDesc}>{description}</AppText>
                    </View>
                    <Switch
                      value={value}
                      onValueChange={(v) => handleToggle(prefKey, v)}
                      accessibilityRole="switch"
                      accessibilityLabel={`Notify on ${STATUS_LABELS[status]}`}
                      accessibilityHint={description}
                      // Explicit state — RN's Switch usually reports its
                      // own value, but pairing it with accessibilityState
                      // is the documented contract (QA Pass-2 #5).
                      {...a11yToggle({ checked: value })}
                      // BP-6: the estate Switch recipe — brand track, themed false-track.
                      trackColor={{ false: color.borderStrong, true: color.brand }}
                      thumbColor={Platform.OS === 'android' ? (value ? color.brand : androidSwitchThumbOff) : undefined}
                    />
                  </View>
                );
              })}
              <AppText variant="body" style={styles.footer}>
                Changes apply on your next Profile visit. Defaults to all statuses on.
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
      // material to the rounded top; the up-shadow moves to cardWrap.
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
      maxHeight: '85%',
      overflow: 'hidden',
    },
    cardWrap: {
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      ...bulkGlassShadow(color),
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    titleWrap: { flex: 1, gap: 2 },
    title: { fontSize: font.size.xxl, fontWeight: '700', color: color.textStrong },
    subtitle: { fontSize: font.size.sm, color: color.inkGlassMuted, fontFamily: font.family.bodyMedium },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    notice: {
      backgroundColor: color.warningBg,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: color.accentOrange,
    },
    noticeText: { color: color.warningFg, fontSize: font.size.sm, lineHeight: 18 },
    center: { alignItems: 'center', paddingVertical: spacing.xxxl },
    // gap lives on contentContainerStyle — a ScrollView ignores gap on `style`.
    list: {},
    listContent: { gap: spacing.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: color.surfaceMuted,
      borderRadius: radius.md,
      minHeight: 56,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.tight,
      borderRadius: radius.circle,
      minWidth: 76,
      alignItems: 'center',
    },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { fontSize: font.size.base, fontWeight: '600', color: color.textStrong },
    rowDesc: { fontSize: font.size.xs, color: color.textMuted, lineHeight: font.lineHeight.tight },
    footer: {
      fontSize: font.size.xs,
      // On-glass footnote → inkGlassMuted (GLASS §7.4 bans textMutedAlt on glass);
      // #414B5A over the bulk material = 6.24:1, comfortably AA (was textMutedAlt
      // 4.6:1 on the old opaque surface). QA Pass-2 #7 intent preserved.
      color: color.inkGlassMuted,
      fontStyle: 'italic',
      marginTop: spacing.tight,
      paddingHorizontal: spacing.tight,
    },
  });
