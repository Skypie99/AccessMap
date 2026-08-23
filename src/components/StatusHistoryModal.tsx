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
 * MOUNTED INSIDE FlagDetailModal'S Modal, NOT AFTER IT. iOS will not present
 * a second modal from a view controller that is already presenting one. This
 * file shipped mounted as a SIBLING after the parent's `</Modal>`, which
 * resolved to the SCREEN's view controller — the one FlagDetail itself
 * occupies — so the History button was enabled, tappable, and did nothing at
 * all, for every user, from the day it shipped until 2026-08-20 (SW-46).
 *
 * ⚑ The note that used to sit here called that "the Sibling-Modal pattern,
 * like PhotoLightboxModal". Both halves were wrong. It was not a pattern, it
 * was a bug; and PhotoLightboxModal is not a precedent for it — that one is
 * mounted on TasksScreen, a tab screen, where the root VC is free and a
 * sibling mount is correct. The rule is not "siblings work", it is "a sheet
 * presents from its host's VC, so it must be mounted inside whatever is
 * already presenting". See LegalSheets.tsx for the full write-up, and
 * PhotoGallery's own lightbox for the in-modal arrangement that does work.
 *
 * Both still render with `accessibilityViewIsModal` so VoiceOver doesn't leak
 * focus between them.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type AccessibilityRole,
} from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Sheet } from '@/components/ui/Sheet';
import { STATUS_LABELS } from '@/lib/flags';
import { relativeTime } from '@/lib/relativeTime';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, spacing } from '@/theme';
import { History } from 'lucide-react-native';
import { decorativeProps } from '@/lib/accessibility';
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
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Status history"
      closeLabel="Close status history"
      closeHint="Returns to the flag details"
      glass
      engineered
      padded
      shrinkStyle={styles.cap}
      minBottomPad={spacing.xxl}
      testID="statusHistoryModal-backdrop"
    >
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
              // R-2 / SR-095. This said "History not yet enabled — when this
              // feature is fully set up…", which told every reviewer walking a
              // brand-new flag that the app was half-built. In production the
              // migration IS applied, so the overwhelmingly likely cause is the
              // ordinary one: nothing has happened to this flag yet. The old
              // copy explained the RARE cause and let the COMMON one read as a
              // defect — the reverse of what an empty state is for.
              //
              // It says less now, and everything it says is true in both cases.
              // AGENT-PROPOSED wording; final phrasing is Sky's, via BP16.
              <View style={styles.emptyWrap}>
                <History size={32} color={color.inkGlassMuted} strokeWidth={2.2} {...decorativeProps} />
                <AppText variant="heading" style={styles.emptyTitle}>No history yet</AppText>
                <AppText variant="body" style={styles.emptyBody}>
                  Status changes will appear here once this flag has been verified or resolved.
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
    </Sheet>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // The sheet's own cap. `Sheet` defaults to 90%; this surface shipped at
    // 80% and it is a short audit trail, so the tighter cap is content.
    cap: { maxHeight: '80%' },
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
