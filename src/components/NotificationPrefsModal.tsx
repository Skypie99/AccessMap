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
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
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
import { radius } from '@/theme';

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

const TOGGLES: Array<{
  status: FlagStatus;
  prefKey: keyof NotificationPrefs;
  description: string;
}> = [
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.title} accessibilityRole="header">
                Notifications
              </Text>
              <Text style={styles.subtitle}>
                Choose which flag updates surface on your Profile.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close notifications settings"
              accessibilityHint="Closes the notification preferences panel"
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

          {!user ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>Sign in to save notification preferences.</Text>
            </View>
          ) : loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : (
            <View style={styles.list}>
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
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      <StatusBadge status={status} style={styles.statusBadge} />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>Notify on {STATUS_LABELS[status]}</Text>
                      <Text style={styles.rowDesc}>{description}</Text>
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
                      accessibilityState={{ checked: value }}
                    />
                  </View>
                );
              })}
              <Text style={styles.footer}>
                Changes apply on your next Profile visit. Defaults to all statuses on.
              </Text>
            </View>
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
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: color.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
      gap: 12,
      maxHeight: '85%',
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    titleWrap: { flex: 1, gap: 2 },
    title: { fontSize: 20, fontWeight: '700', color: color.textStrong },
    subtitle: { fontSize: 13, color: color.textMuted },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: 18,
      color: color.text,
      fontWeight: '700',
      lineHeight: 20,
    },
    notice: {
      backgroundColor: color.warningBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderLeftWidth: 3,
      borderLeftColor: color.accentOrange,
    },
    noticeText: { color: color.warningFg, fontSize: 13, lineHeight: 18 },
    center: { alignItems: 'center', paddingVertical: 32 },
    list: { gap: 10 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      backgroundColor: color.surfaceMuted,
      borderRadius: 10,
      minHeight: 56,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.circle,
      minWidth: 76,
      alignItems: 'center',
    },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { fontSize: 14, fontWeight: '600', color: color.textStrong },
    rowDesc: { fontSize: 12, color: color.textMuted, lineHeight: 16 },
    footer: {
      fontSize: 12,
      // color.textMutedAlt (#5b6470) on #fff = 4.6:1 — passes WCAG AA for
      // body text. The previous #888 was 3.5:1, which fails AA. QA Pass-2 #7.
      color: color.textMutedAlt,
      fontStyle: 'italic',
      marginTop: 4,
      paddingHorizontal: 4,
    },
  });
