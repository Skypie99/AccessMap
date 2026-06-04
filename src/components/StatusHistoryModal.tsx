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
import { AppText } from '@/components/ui/AppText';
import { STATUS_LABELS } from '@/lib/flags';
import { relativeTime } from '@/lib/relativeTime';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { X } from 'lucide-react-native';
import { useReducedMotion } from '@/lib/accessibility';
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

export default function StatusHistoryModal({ visible, flagId, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
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
      entries.map((e) => ({
        key: e.id,
        line: formatHistoryEntry(e, statusLabel, (iso) => relativeTime(iso)),
      })),
    [entries],
  );

  return (
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
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
                    <View style={styles.entryDot} />
                    <View style={styles.entryTextWrap}>
                      <AppText variant="label" style={styles.entryLine}>{item.line}</AppText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
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
      maxHeight: '80%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    title: { fontSize: 18, fontWeight: '700', flex: 1, color: color.textStrong },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: { fontSize: 16, color: color.text, fontWeight: '700' },
    body: { flexShrink: 1 },
    bodyContent: { gap: 12, paddingBottom: 8, paddingTop: 4 },
    center: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 32,
    },
    loadingText: { fontSize: 14, color: color.textMuted },
    emptyWrap: {
      paddingVertical: 28,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 8,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: color.text,
    },
    emptyBody: {
      fontSize: 14,
      color: color.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    entryList: { gap: 0 },
    entryRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 4,
    },
    // Brand-blue bullet — uses color.brandText (the AA-safe small-text brand
    // hex). Cycle D / d2 cleared the Cycle C carry-forward: was previously
    // a literal '#1c4f99' awaiting CL2 to land in this branch.
    entryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: color.brandText,
      marginTop: 6,
    },
    entryTextWrap: { flex: 1, gap: 2 },
    entryLine: {
      fontSize: 15,
      fontWeight: '600',
      color: color.textStrong,
    },
  });
