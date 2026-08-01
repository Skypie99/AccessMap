/**
 * HiddenCommentsModal — the other end of Hide (HIGH-2, Apple 1.2(c)).
 *
 * WHY THIS EXISTS. Hide shipped in Run 2 as an immediate, irreversible action
 * with no undo anywhere in the app, drawn as the pixel-identical twin of Report
 * 16pt away. `13_B1_VERIFY_LEDGER` raised it as a HIGH: a mis-tap silently
 * removed a comment from that device forever. This is the surface that takes it
 * back.
 *
 * SHAPE — decided by Sky at the mockup gate, DECISIONS §SKY-7: row treatment
 * **A** (pill button), "Unhide all" in the **header** (H), reached from Settings
 * → **Feedback** (S1). Everything else in the gate board's "what is fixed"
 * table is inherited and is NOT re-litigated here.
 *
 * ⚑ STORAGE IS UNTOUCHED. `hiddenContent.ts` keeps storing bare ids — no
 * snapshot, no migration. That is what forces the re-read below, and it is why
 * a row can be in three states rather than one:
 *
 *   loaded    the id came back — show the real author, time, and text
 *   missing   the fetch SUCCEEDED and the id was not in it — genuinely gone
 *   unloaded  the fetch FAILED — we do not know, and must not guess
 *
 * Collapsing `unloaded` into `missing` would report a dropped connection as a
 * deletion. Unhiding works in all three: it is a local AsyncStorage write and
 * needs no network, so the screen's actual job still works offline.
 *
 * ⚑ "UNHIDE ALL" IS COMMENT-SCOPED, NOT `clearHidden()`. `clearHidden` wipes
 * the whole record including the `flag` bucket, and a control labelled about
 * comments must not silently do more than it says. It loops
 * `unhideContent('comment', id)` instead.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import {
  AccessibilityInfo,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  type Text,
  View,
} from 'react-native';
import { EyeOff, X } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { confirm, notify } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import { fetchCommentsByIds } from '@/lib/comments';
import { loadHidden, unhideContent } from '@/lib/hiddenContent';
import { relativeTime } from '@/lib/relativeTime';
import { decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import {
  COMMENT_UNHIDDEN_ANNOUNCEMENT,
  HIDDEN_COMMENTS_EMPTY_BODY,
  HIDDEN_COMMENTS_EMPTY_TITLE,
  HIDDEN_COMMENTS_TITLE,
  HIDDEN_COMMENT_NOT_LOADED,
  HIDDEN_COMMENT_UNAVAILABLE,
  UNHIDE_ALL_CONFIRM_TITLE,
  UNHIDE_ALL_CONTROL_LABEL,
  UNHIDE_ALL_FAILED_TITLE,
  UNHIDE_CONTROL_LABEL,
  UNHIDE_FAILED_TITLE,
  UNHIDE_UNAVAILABLE_A11Y_LABEL,
  commentsUnhiddenAnnouncement,
  unhideAllConfirmBody,
  unhideCommentA11yLabel,
} from '@/lib/copy';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import type { CommentRow } from '@/types/database';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/** One row of the list. See the module header for what the three states mean. */
export type HiddenCommentItem =
  | { id: string; state: 'loaded'; author: string; createdAt: string; content: string }
  | { id: string; state: 'missing' }
  | { id: string; state: 'unloaded' };

/**
 * Shape the stored ids plus whatever the re-read returned into rows.
 *
 * Pure and exported for unit tests — this is where the honesty of the three
 * states is decided, so it is tested directly rather than through a render.
 *
 * ORDER: most-recently-hidden first. `hideContent` appends, so reversing the
 * stored order puts the hide you just regretted at the top. It deliberately
 * does NOT sort by the comment's own timestamp — the list is a record of what
 * YOU did and when, not of when the comments were written, and sorting by the
 * latter would scatter unresolvable rows (which have no timestamp at all).
 *
 * `fetchFailed` is the caller's answer to "did the network step happen", and it
 * is the ONLY thing that distinguishes `unloaded` from `missing`.
 */
export function buildHiddenCommentItems(
  ids: string[],
  rows: CommentRow[],
  fetchFailed: boolean,
): HiddenCommentItem[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return [...ids].reverse().map((id): HiddenCommentItem => {
    const row = byId.get(id);
    if (row) {
      return {
        id,
        state: 'loaded',
        author: row.display_name ?? 'Anonymous',
        createdAt: row.created_at,
        content: row.content,
      };
    }
    return fetchFailed ? { id, state: 'unloaded' } : { id, state: 'missing' };
  });
}

export default function HiddenCommentsModal({ visible, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): move the SR cursor onto the title when this surface opens.
  const titleRef = useFocusOnOpen<Text>(visible);

  const [ids, setIds] = useState<string[]>([]);
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    // The two halves fail independently and that distinction is the whole point
    // of the three row states, so they are NOT wrapped in one try.
    let storedIds: string[] = [];
    try {
      storedIds = (await loadHidden()).comment;
    } catch {
      // loadHidden never rejects by contract (it warns and returns empty), so
      // this is belt-and-braces: an empty list is the safe read, because it
      // hides nothing that the user did not ask to hide.
      storedIds = [];
    }
    if (!mountedRef.current) return;
    setIds(storedIds);

    if (storedIds.length === 0) {
      setRows([]);
      setFetchFailed(false);
      setLoading(false);
      return;
    }

    try {
      const fetched = await fetchCommentsByIds(storedIds);
      if (!mountedRef.current) return;
      setRows(fetched);
      setFetchFailed(false);
    } catch (e) {
      if (!mountedRef.current) return;
      setRows([]);
      setFetchFailed(true);
      setLoadError(errorMessage(e, 'Could not load your hidden comments.'));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const items = useMemo(
    () => buildHiddenCommentItems(ids, rows, fetchFailed),
    [ids, rows, fetchFailed],
  );

  const handleUnhide = useCallback(async (id: string) => {
    // Optimistic removal with rollback at the ORIGINAL index (the MyWatchedModal
    // contract): `unhideContent` throws on a failed write, and a row that
    // vanished on a write that did not stick is a lie about what was saved.
    let removedIdx = -1;
    setIds((prev) => {
      removedIdx = prev.indexOf(id);
      return prev.filter((x) => x !== id);
    });
    try {
      await unhideContent('comment', id);
      AccessibilityInfo.announceForAccessibility(COMMENT_UNHIDDEN_ANNOUNCEMENT);
    } catch (e) {
      if (mountedRef.current && removedIdx >= 0) {
        const idx = removedIdx;
        setIds((prev) => {
          if (prev.includes(id)) return prev;
          const next = prev.slice();
          next.splice(Math.min(idx, next.length), 0, id);
          return next;
        });
      }
      notify(UNHIDE_FAILED_TITLE, errorMessage(e)); // must render on web (F64)
    }
  }, []);

  const handleUnhideAll = useCallback(async () => {
    if (ids.length === 0) return;
    const ok = await confirm(
      UNHIDE_ALL_CONFIRM_TITLE,
      unhideAllConfirmBody(ids.length),
      UNHIDE_ALL_CONTROL_LABEL,
      // Not destructive-styled: this RESTORES content. The confirm exists
      // because it is bulk, not because it is dangerous.
      false,
    );
    if (!ok) return;

    const prevIds = ids;
    setIds([]);
    try {
      // Comment-scoped, deliberately — see the module header. Sequential rather
      // than Promise.all: every call read-modify-writes the same AsyncStorage
      // key, so concurrent writes would race and lose ids.
      for (const id of prevIds) {
        await unhideContent('comment', id);
      }
      AccessibilityInfo.announceForAccessibility(commentsUnhiddenAnnouncement(prevIds.length));
    } catch (e) {
      // Partial failure is real: some ids may already be written. Re-read the
      // truth rather than assuming the whole batch rolled back.
      if (mountedRef.current) {
        try {
          setIds((await loadHidden()).comment);
        } catch {
          setIds(prevIds);
        }
      }
      notify(UNHIDE_ALL_FAILED_TITLE, errorMessage(e)); // must render on web (F64)
    }
  }, [ids]);

  const renderItem = useCallback(
    ({ item }: { item: HiddenCommentItem }) => {
      const isLoaded = item.state === 'loaded';
      const bodyText = isLoaded
        ? item.content
        : item.state === 'missing'
          ? HIDDEN_COMMENT_UNAVAILABLE
          : HIDDEN_COMMENT_NOT_LOADED;

      return (
        <View style={styles.row} role="listitem">
          <View style={styles.rowMain}>
            {isLoaded && (
              <AppText variant="body" style={styles.rowMeta}>
                {`${item.author} · ${relativeTime(item.createdAt)}`}
              </AppText>
            )}
            <AppText variant="body" style={[styles.rowText, !isLoaded && styles.rowTextMuted]}>
              {bodyText}
            </AppText>
          </View>
          {/* Row treatment A — the pill. Ink is brandOnSoft on brandSofter, not
              brand: the Car-4 arbiter measured color.brand as an AA failure as
              text on this material. */}
          <Pressable
            onPress={() => void handleUnhide(item.id)}
            hitSlop={8}
            style={({ pressed }) => [styles.unhideBtn, pressed && styles.unhideBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={
              isLoaded ? unhideCommentA11yLabel(item.author) : UNHIDE_UNAVAILABLE_A11Y_LABEL
            }
            accessibilityHint="Shows this comment again on this device"
          >
            <AppText variant="label" style={styles.unhideBtnText}>
              {UNHIDE_CONTROL_LABEL}
            </AppText>
          </Pressable>
        </View>
      );
    },
    [styles, handleUnhide],
  );

  // Bottom-anchored sheet clears the home indicator (M15 family recipe).
  // Non-throwing context read — render tests mount without a provider.
  const insets = React.useContext(SafeAreaInsetsContext) ?? {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };

  return (
    <Modal
      aria-label={HIDDEN_COMMENTS_TITLE}
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.cardWrap}>
          {/* The escape gesture lands on this containment node, never on
              <Modal> — RN does not forward onAccessibilityEscape to
              RCTModalHostView, so a prop on the Modal tag would typecheck and
              do nothing. Handler is identical to onRequestClose, which is what
              dismissalStandard.guard.test.ts assertion B compares. */}
          <GlassSurface
            variant="bulk"
            borderRadius={0}
            forceEngineered
            style={[styles.sheet, { paddingBottom: Math.max(spacing.xxl + 4, insets.bottom) }]}
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
          >
            <View style={styles.header}>
              <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
                {HIDDEN_COMMENTS_TITLE}
              </AppText>
              {/* Placement H (Sky's pick). Only when there is something to act
                  on — a bulk control over an empty list is a dead affordance. */}
              {items.length > 0 && (
                <Pressable
                  onPress={() => void handleUnhideAll()}
                  hitSlop={10}
                  style={({ pressed }) => [styles.unhideAllBtn, pressed && styles.unhideBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`${UNHIDE_ALL_CONTROL_LABEL}, ${items.length} ${items.length === 1 ? 'comment' : 'comments'}`}
                  accessibilityHint="Asks you to confirm before showing them all again"
                >
                  <AppText variant="label" style={styles.unhideAllBtnText}>
                    {UNHIDE_ALL_CONTROL_LABEL}
                  </AppText>
                </Pressable>
              )}
              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close hidden comments"
              >
                <X size={18} color={color.text} strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* A failed re-read is a banner, never a replacement for the list:
                the rows are still there and still unhideable without a network. */}
            {loadError && items.length > 0 && !loading && (
              <View style={styles.noticeBanner}>
                <AppText variant="body" style={styles.noticeText}>
                  {loadError}
                </AppText>
              </View>
            )}

            {loading ? (
              // Content-shaped loading (BP-3): row placeholders; the bare
              // unthemed spinner told SR users nothing — the label does now.
              <View accessibilityLabel="Loading hidden comments" accessibilityLiveRegion="polite">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </View>
            ) : items.length === 0 ? (
              <View style={styles.center}>
                <EyeOff
                  size={32}
                  color={color.inkGlassMuted}
                  strokeWidth={2.2} {...decorativeProps}
                />
                <AppText variant="heading" style={styles.emptyTitle}>
                  {HIDDEN_COMMENTS_EMPTY_TITLE}
                </AppText>
                <AppText variant="body" style={styles.emptySubtitle}>
                  {HIDDEN_COMMENTS_EMPTY_BODY}
                </AppText>
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                showsVerticalScrollIndicator={false}
                accessibilityRole="list"
                accessibilityLabel={`${HIDDEN_COMMENTS_TITLE}, ${items.length} ${items.length === 1 ? 'item' : 'items'}`}
                initialNumToRender={10}
              />
            )}
          </GlassSurface>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: color.scrim, justifyContent: 'flex-end' },
    sheet: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl + 4,
      maxHeight: '85%',
      gap: spacing.tight,
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
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
    title: {
      fontSize: font.size.xxl,
      fontWeight: font.weight.bold,
      flex: 1,
      color: color.textStrong,
      letterSpacing: -0.3,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unhideAllBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: color.brandSofter,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.xs,
    },
    unhideAllBtnText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      color: color.brandOnSoft,
    },
    noticeBanner: {
      backgroundColor: color.warningBg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
      borderLeftWidth: 3,
      borderLeftColor: color.accentOrange,
    },
    noticeText: { fontSize: font.size.sm, color: color.warningFg, lineHeight: 18 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: spacing.md },
    emptyTitle: { fontSize: font.size.xl, fontWeight: font.weight.bold, color: color.textStrong },
    emptySubtitle: {
      fontSize: font.size.base,
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
      textAlign: 'center',
      lineHeight: 20,
    },
    list: { paddingBottom: spacing.sm },
    separator: { height: 1, backgroundColor: color.borderSubtle },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md + 2,
      gap: spacing.md,
    },
    rowMain: { flex: 1, gap: 2 },
    rowMeta: {
      fontSize: font.size.xs,
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
    },
    rowText: { fontSize: font.size.base, color: color.textStrong, lineHeight: 20 },
    rowTextMuted: { color: color.inkGlassMuted, fontStyle: 'italic' },
    unhideBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: color.brandSofter,
      minHeight: 44,
      minWidth: 44,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    unhideBtnPressed: { opacity: 0.6 },
    unhideBtnText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      color: color.brandOnSoft,
    },
  });
