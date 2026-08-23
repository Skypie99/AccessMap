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
import { AccessibilityInfo, ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import {
  NOTIFICATION_PREFS_LOADED_ANNOUNCEMENT,
  NOTIFICATION_PREFS_LOADING_ANNOUNCEMENT,
} from '@/lib/copy';
import { AppText } from '@/components/ui/AppText';
import { PrefsRow } from '@/components/ui/PrefsRow';
import { Sheet } from '@/components/ui/Sheet';
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
import { font, radius, spacing } from '@/theme';
import { decorativeProps } from '@/lib/accessibility';

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
    // A3/D18 — the spinner below sits in a live region, and RN implements that
    // on ANDROID ONLY. On iOS VoiceOver this sheet fetched and filled itself in
    // silence. iOS-only announce, because firing both where the region works is
    // the double-announce ReportFlagModal retired at S10.
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(NOTIFICATION_PREFS_LOADING_ANNOUNCEMENT);
    }
    try {
      const loaded = await loadPrefs(user.id);
      if (mountedRef.current) setPrefs(loaded);
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(NOTIFICATION_PREFS_LOADED_ANNOUNCEMENT);
      }
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
  // Bottom-anchored sheet clears the home indicator (M15 family recipe).
  // Non-throwing context read — render tests mount without a provider.
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Updates"
      subtitle="Choose which flag updates surface on your Profile."
      closeLabel="Close updates settings"
      closeHint="Closes the update preferences panel"
      glass
      engineered
      padded
      shrinkStyle={styles.cap}
      minBottomPad={spacing.xxl}
      testID="notificationPrefsModal-backdrop"
    >
          {!user ? (
            <View style={styles.notice}>
              <AppText variant="body" style={styles.noticeText}>Sign in to save update preferences.</AppText>
            </View>
          ) : loading ? (
            <View style={styles.center} accessibilityLiveRegion="polite">
              {/* color.text (not brand): brand #1466E0 is only 3.3:1 on the sheet;
                  matches the inked spinner in NotificationPreferencesScreen (M-24).
                  A4: the label is what stops this being a nameless animating
                  element a screen reader lands on and says nothing about. */}
              <ActivityIndicator color={color.text} accessibilityLabel="Loading your preferences" />
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
              {TOGGLES.map(({ status, prefKey, description }) => (
                <PrefsRow
                  key={prefKey}
                  title={`Notify on ${STATUS_LABELS[status]}`}
                  subtitle={description}
                  value={prefs[prefKey]}
                  onValueChange={(v) => handleToggle(prefKey, v)}
                  leading={
                    /* Decorative — the Switch already carries the full
                       accessible label + state, so announcing the badge would
                       repeat "Flag status: X" on every row. */
                    <View {...decorativeProps}>
                      <StatusBadge status={status} style={styles.statusBadge} />
                    </View>
                  }
                />
              ))}
              <AppText variant="body" style={styles.footer}>
                Changes apply on your next Profile visit. Defaults to all statuses on.
              </AppText>
            </ScrollView>
          )}
    </Sheet>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // The sheet's own cap. `Sheet` defaults to 90%; this surface shipped at 85%.
    // C13: the corner radius came with the primitive — this sheet was the one
    // at `lg` while the whole family sat at `xl`.
    cap: { maxHeight: '85%' },
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
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.tight,
      borderRadius: radius.circle,
      minWidth: 76,
      alignItems: 'center',
    },
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
