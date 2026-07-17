/**
 * StatusHistoryModal — shows the audit trail for a single flag:
 * "who changed the status, when, and from what to what".
 *
 * Foundational for trust. Lets users see how recent the last verification
 * was, who has been touching the flag, and the full lifecycle (Reported →
 * Verified → Resolved).
 *
 * Defensive UX: if the migration hasn't been applied yet (or the table is
 * empty for a brand-new flag whose creation-trigger row hasn't shown up
 * yet), `listStatusHistory` returns []. We render a friendly placeholder
 * instead of an error — "History not yet enabled…".
 *
 * Sibling-Modal pattern, like PhotoLightboxModal: the parent
 * (FlagDetailModal) opens this on top of its own Modal. Both render with
 * `accessibilityViewIsModal` so VoiceOver doesn't leak focus between
 * them.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type AccessibilityRole,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { STATUS_LABELS } from '@/lib/flags';
import { relativeTime } from '@/lib/relativeTime';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, spacing } from '@/theme';
import { X } from 'lucide-react-native';
import { decorativeProps, useReducedMotion } from '@/lib/accessibility';
import {
  formatHistoryEntry,
  listStatusHistory,
  type StatusHistoryEntry,
} from '@/lib/statusHistory';
import type { FlagStatus } from '@/types/database';

interface Props {
  visible: boolean;
  flagId: string | null;
  onClose: () => void;
}

// statusLabel callback for formatHistoryEntry. Maps the DB's text column
// through STATUS_LABELS when known, falls back to the raw string for
// any future status the client doesn't recognize.
function statusLabel(s: string): string {
  if (s in STATUS_LABELS) {
    return STATUS_LABELS[s as FlagStatus];
  }
  // Capitalize the unknown string so it still reads pleasantly.
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Timeline-dot color for a status string. Reuses the themed status*Fg
// tokens (the same AA-safe foregrounds StatusBadge paints its dot with),
// so the rail dot matches the status pills elsewhere and adapts to dark
// mode. Any unrecognized status (a future value the client doesn't know
// yet) falls back to the brand-blue used by the previous flat-list dot,
// so the rail never renders an undefined color.
function statusDotColor(color: ColorTheme, s: string): string {
  switch (s) {
    case 'open':
      return color.statusOpenFg;
    case 'verified':
      return color.statusVerifiedFg;
    case 'resolved':
      return color.statusResolvedFg;
    case 'rejected':
      return color.statusRejectedFg;
    default:
      return color.brandText;
  }
}

export default function StatusHistoryModal({ visible, flagId, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  // Read the inset context directly (zero fallback) instead of
  // useSafeAreaInsets(), which throws when there's no SafeAreaProvider — the
  // modal render-tests mount these sheets without one. Same value in the app.
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const reducedMotion = useReducedMotion();
  const [entries, setEntries] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!visible || !flagId) {
      setEntries([]);
      return;
    }
    setLoading(true);
    (async () => {
      const data = await listStatusHistory(flagId);
      if (cancelled) return;
      setEntries(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, flagId]);

  // Pre-format each entry once so the render is just a Text per row.
  // useMemo so we don't redo the work on every re-render of the parent.
  //
  // Privacy (Jordan condition #1, 2026-05-24): the client reads through
  // `flag_status_history_public`, which does NOT include user_id. So we
  // can't show "who" — only "what changed, when". Each entry is rendered
  // as a single line; no attribution suffix.
  const formatted = useMemo(
    () =>
      entries.map((e, i) => ({
        key: e.id,
        line: formatHistoryEntry(e, statusLabel, (iso) => relativeTime(iso)),
        // Dot color comes from the status the flag entered at this point
        // (`to_status`), reusing the themed status foreground tokens.
        dotColor: statusDotColor(color, e.to_status),
        // Last entry gets no trailing connector line.
        isLast: i === entries.length - 1,
      })),
    [entries, color],
  );

  return (
    <Modal aria-label="Status history" visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <GlassSurface
          variant="bulk"
          borderRadius={0}
          forceEngineered
          style={[styles.card, { paddingBottom: Math.max(spacing.xxl, insets.bottom) }]}
          accessibilityViewIsModal
        >
          <View style={styles.headerRow}>
            <AppText variant="heading" style={styles.title} accessibilityRole="header">
              Status history
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close status history"
              accessibilityHint="Returns to the flag details"
            >
              <X size={18} color={color.text} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.center} accessibilityLiveRegion="polite">
                <ActivityIndicator color={color.brandText} />
                <AppText variant="body" style={styles.loadingText}>Loading history…</AppText>
              </View>
            ) : formatted.length === 0 ? (
              // Empty / not-yet-enabled state. Same copy regardless of
              // whether the table is missing OR the flag genuinely has no
              // history — the user only cares that there's nothing to show.
              // The "not yet enabled" framing is honest about the most
              // likely cause (migration pending) without scaring users.
              <View style={styles.emptyWrap}>
                <AppText variant="heading" style={styles.emptyTitle}>No history yet</AppText>
                <AppText variant="body" style={styles.emptyBody}>
                  History not yet enabled — when this feature is fully set up, you{'’'}ll see who
                  changed the status of this flag here.
                </AppText>
              </View>
            ) : (
              <View
                style={styles.entryList}
                accessibilityRole={
                  Platform.OS === 'web' ? ('list' as AccessibilityRole) : undefined
                }
              >
                {formatted.map((item) => (
                  <View
                    key={item.key}
                    style={styles.entryRow}
                    accessible
                    accessibilityLabel={item.line}
                    accessibilityRole={
                      Platform.OS === 'web' ? ('listitem' as AccessibilityRole) : 'text'
                    }
                  >
                    {/* Left rail: status-colored dot + connecting line to the
                        next entry. Purely decorative — the row's
                        accessibilityLabel already conveys status + time, so
                        the rail is hidden from screen readers. */}
                    <View style={styles.entryRail} {...decorativeProps}>
                      <View style={[styles.entryDot, { backgroundColor: item.dotColor }]} />
                      {!item.isLast && <View style={styles.entryLineConnector} />}
                    </View>
                    <View style={styles.entryTextWrap}>
                      <AppText variant="label" style={styles.entryLine}>{item.line}</AppText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </GlassSurface>
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
      // Bulk-glass sheet (MP4): <GlassSurface variant="bulk" forceEngineered> supplies
      // the material fill; no backgroundColor here (the variant owns it). overflow:hidden
      // clips the square material to the rounded top. No up-shadow at HEAD -> no cardWrap.
      overflow: 'hidden',
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
      maxHeight: '80%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    title: { fontSize: font.size.xl, fontWeight: '700', flex: 1, color: color.textStrong },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: { fontSize: font.size.lg, color: color.text, fontWeight: '700' },
    body: { flexShrink: 1 },
    bodyContent: { gap: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.tight },
    center: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xxxl,
    },
    loadingText: { fontSize: font.size.base, color: color.inkGlassMuted, fontFamily: font.family.bodyMedium },
    emptyWrap: {
      paddingVertical: 28, // no exact spacing token for 28 — left raw
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      gap: spacing.sm,
    },
    emptyTitle: {
      fontSize: font.size.md,
      fontWeight: '700',
      color: color.text,
    },
    emptyBody: {
      fontSize: font.size.base,
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
      textAlign: 'center',
      lineHeight: font.lineHeight.base,
    },
    // gap:0 keeps rows flush so the rail connector reaches the next dot with
    // no break; per-row breathing room comes from entryTextWrap's paddingBottom.
    entryList: { gap: 0 },
    entryRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: spacing.md,
    },
    // Left timeline rail: a fixed-width column holding the status dot and the
    // thin connector that runs down to the next entry's dot. Centered so the
    // connector sits directly under the dot.
    entryRail: {
      width: 10,
      alignItems: 'center',
    },
    // Status-colored node. Color is applied inline from statusDotColor() (the
    // themed status*Fg token for this entry's to_status), reusing the same
    // AA-safe foregrounds as StatusBadge. marginTop nudges it to line up with
    // the cap height of the first text line.
    entryDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 5,
    },
    // Thin connecting line between consecutive dots. flex:1 stretches it to
    // fill the rest of the row height (rows are alignItems:'stretch'), so it
    // always meets the next dot regardless of how tall the text wraps.
    entryLineConnector: {
      flex: 1,
      width: 2,
      backgroundColor: color.divider,
      marginTop: 2,
    },
    entryTextWrap: { flex: 1, gap: 2, paddingBottom: 14 },
    entryLine: {
      fontSize: font.size.md,
      fontWeight: '600',
      color: color.textStrong,
    },
  });
