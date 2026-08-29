import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Ban, Check, EyeOff, Inbox, Lock, MessageSquare, RotateCcw, Trash2 } from 'lucide-react-native';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { HeaderActions } from '@/components/ui/HeaderActions';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import CategoryIcon from '@/components/CategoryIcon';
import { StatusBadge } from '@/components/StatusBadge';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColor, type ColorTheme } from '@/theme/ThemeContext';
import { useDrawer } from '@/lib/drawerContext';
import { useSharedModals } from '@/lib/sharedModalsContext';
import { font, radius, severity as severityRamp, spacing } from '@/theme';
import { hapticImpact, hapticSelection } from '@/lib/haptics';
import { useIsAdmin } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import { relativeTime } from '@/lib/relativeTime';
import { a11yToggle } from '@/lib/accessibility';
import { REPORT_CATEGORIES } from '@/lib/copy';
import {
  CATEGORY_LABELS,
  deleteFlag,
  FlagStatusConflictError,
  listRecentFlags,
  updateFlagStatus,
} from '@/lib/flags';
import {
  closeReport,
  listOpenReports,
  rejectFlagReport,
  removeCommentReport,
  removeFlagReport,
  type AdminReport,
  type ContentActionResult,
} from '@/lib/adminReports';
import type { FlagRow } from '@/types/database';

const REPORT_CATEGORY_TEXT: Record<string, string> = Object.fromEntries(
  REPORT_CATEGORIES.map((c) => [c.id, c.label]),
);

export default function AdminScreen() {
  const color = useColor();
  const styles = useMemo(() => makeStyles(color), [color]);
  const isAdmin = useIsAdmin();
  const { user } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const drawer = useDrawer();
  const { setOpen } = useSharedModals();
  const insets = useSafeAreaInsets();
  // MOD1: Flags and Reports are two independent queues sharing this one
  // screen (see the SegmentedControl toggle below) rather than two navigator
  // routes — this screen already has no nested stack, and FlagDetailModal's
  // own precedent for "drill in" is a same-screen overlay, not a push.
  const [viewMode, setViewMode] = useState<'flags' | 'reports'>('flags');
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  // BP-9: persistent, retryable load-failure state. The old Alert vanished on
  // dismiss leaving no signal — every sibling list surface shows an inline
  // banner + Retry (MyWatched is the exemplar).
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  // F18: synchronous per-flag guard. The action buttons use only
  // accessibilityState.disabled (a screen-reader hint that does NOT block
  // touches) and setActioningId is set only AFTER the confirm dialog resolves,
  // so a rapid double-tap (or Remove+Dismiss) on the same row would otherwise
  // start two concurrent mutations. This tracks in-flight flag ids.
  const actioningRef = useRef<Set<string>>(new Set());
  // F27: sequence tag so a stale load() (rapid tab focus/blur fires two) can't
  // overwrite a newer response.
  const loadSeqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    try {
      const rows = await listRecentFlags(200);
      if (seq !== loadSeqRef.current) return; // superseded by a newer load
      setFlags(rows);
      setLoadError(null);
    } catch (e) {
      if (seq !== loadSeqRef.current) return;
      // Inline banner instead of a dismiss-and-gone Alert (BP-9) — also fixes
      // the web, where Alert.alert is a silent no-op.
      setLoadError(errorMessage(e));
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, []);

  // MOD1 — same load/error/sequence-guard shape as `load` above, over the
  // report queue instead of the flag queue.
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsLoadError, setReportsLoadError] = useState<string | null>(null);
  const [reportsActioningId, setReportsActioningId] = useState<string | null>(null);
  const reportsActioningRef = useRef<Set<string>>(new Set());
  const reportsLoadSeqRef = useRef(0);

  const loadReports = useCallback(async () => {
    const seq = ++reportsLoadSeqRef.current;
    setReportsLoading(true);
    try {
      const rows = await listOpenReports(200);
      if (seq !== reportsLoadSeqRef.current) return;
      setReports(rows);
      setReportsLoadError(null);
    } catch (e) {
      if (seq !== reportsLoadSeqRef.current) return;
      setReportsLoadError(errorMessage(e));
    } finally {
      if (seq === reportsLoadSeqRef.current) setReportsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      void loadReports();
    }, [load, loadReports]),
  );

  /**
   * MOD1 partial-failure UX: `action` has already performed its content
   * mutation (or there wasn't one) by the time it settles — closeReport()
   * itself retries a few times internally, so `{closed: false}` here means
   * even those retries were exhausted. Rather than treat that like a normal
   * error, this leaves the report visibly IN the open queue (truthful: it
   * genuinely isn't closed) and says plainly that the content action already
   * happened, so an admin is never tempted to press the same destructive
   * button again.
   */
  const runReportAction = useCallback(
    async (
      report: AdminReport,
      confirmTitle: string,
      confirmMessage: string,
      action: () => Promise<ContentActionResult>,
    ) => {
      if (reportsActioningRef.current.has(report.id)) return;
      reportsActioningRef.current.add(report.id);
      try {
        const ok = await confirm(confirmTitle, confirmMessage);
        if (!ok) return;
        hapticSelection();
        setReportsActioningId(report.id);
        try {
          const result = await action();
          if (result.closed) {
            setReports((prev) => prev.filter((r) => r.id !== report.id));
          } else {
            Alert.alert(
              'Not marked reviewed yet',
              `The action was applied, but this report could not be closed: ${result.closeError}. It stays in the queue — try again in a moment.`,
            );
          }
        } catch (e) {
          if (e instanceof FlagStatusConflictError) {
            // The flag moved since this queue was loaded (someone else
            // acted on it, or a prior partial-failure retry already
            // succeeded here). Nothing was mutated by THIS press — refresh
            // so the report's stale snapshot (and any retry) reflects
            // reality, instead of a generic error and an unwinnable retry
            // loop against the old status.
            Alert.alert('This flag changed', 'It was updated since this queue loaded — refreshing.');
            void loadReports();
          } else {
            Alert.alert('Error', errorMessage(e));
          }
        } finally {
          setReportsActioningId(null);
        }
      } finally {
        reportsActioningRef.current.delete(report.id);
      }
    },
    [loadReports],
  );

  const closeDirectly = (resolution: 'no_action' | 'target_unavailable', reviewedBy: string, reportId: string) =>
    closeReport(reportId, resolution, reviewedBy).then(
      (o): ContentActionResult => (o.ok ? { closed: true } : { closed: false, closeError: o.error }),
    );

  const handleRejectFlagReport = (report: AdminReport) => {
    if (!report.flag || !user) return;
    const flag = report.flag;
    void runReportAction(
      report,
      'Reject this flag?',
      'This marks the report as invalid or spam and removes it from the community queue.',
      () => rejectFlagReport({ reportId: report.id, flagId: flag.id, previousFlagStatus: flag.status, reviewedBy: user.id }),
    );
  };

  const handleRemoveFlagReport = (report: AdminReport) => {
    if (!report.flag || !user) return;
    const flag = report.flag;
    void runReportAction(
      report,
      'Remove flag?',
      'This permanently deletes the flag and cannot be undone.',
      () => removeFlagReport({ reportId: report.id, flagId: flag.id, reviewedBy: user.id }),
    );
  };

  const handleRemoveCommentReport = (report: AdminReport) => {
    if (!report.comment || !user) return;
    const comment = report.comment;
    void runReportAction(
      report,
      'Delete this comment?',
      'This permanently deletes the comment and cannot be undone.',
      () => removeCommentReport({ reportId: report.id, commentId: comment.id, reviewedBy: user.id }),
    );
  };

  const handleReportNoAction = (report: AdminReport) => {
    if (!user) return;
    void runReportAction(
      report,
      'Close with no action?',
      'This marks the report reviewed without changing any content.',
      () => closeDirectly('no_action', user.id, report.id),
    );
  };

  const handleReportTargetUnavailable = (report: AdminReport) => {
    if (!user) return;
    void runReportAction(
      report,
      'Close as target unavailable?',
      'This marks the report reviewed — the flag or comment it refers to is already gone.',
      () => closeDirectly('target_unavailable', user.id, report.id),
    );
  };

  // S8 editorial header (menu + Feedback), rendered in all three states so the
  // drawer stays reachable — Admin now owns its header (M-49 retired the shared
  // nav-header). Same HeaderActions cluster as Settings/Home.
  const header = (
    <ScreenHeader
      eyebrow="ADMIN"
      title="Admin"
      eyebrowColor={color.inkOnStage}
      actions={
        <HeaderActions
          onMenu={() => drawer.setOpen(true)}
          onFeedback={() => setOpen('feedback')}
          iconColor={color.textStrong}
        />
      }
    />
  );

  // MOD1 — the one control shared by both queues: which one is on screen.
  const queueToggle = (
    <SegmentedControl
      variant="track"
      surface="stage"
      groupRole="tablist"
      groupLabel="Moderation queue"
      style={styles.queueToggle}
      cells={[
        {
          key: 'flags',
          label: 'Flags',
          selected: viewMode === 'flags',
          onPress: () => setViewMode('flags'),
        },
        {
          key: 'reports',
          label: `Reports${reports.length > 0 ? ` (${reports.length})` : ''}`,
          selected: viewMode === 'reports',
          onPress: () => setViewMode('reports'),
        },
      ]}
    />
  );

  if (isAdmin === null) {
    return (
      <View style={styles.root}>
        <ScreenStage />
        <View style={[styles.frame, { paddingTop: insets.top }]}>
          {header}
          <View style={styles.center}>
            <ActivityIndicator size="large" color={color.brand} />
          </View>
        </View>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.root}>
        <ScreenStage />
        <View style={[styles.frame, { paddingTop: insets.top }]}>
          {header}
          <View style={styles.center} accessible accessibilityRole="alert">
            <Lock size={32} color={color.inkOnStage} strokeWidth={2} />
            <AppText variant="bodyMedium" size={font.size.lg} color={color.text} style={styles.stateTitle}>
              Admin access required
            </AppText>
            <AppText variant="body" size={font.size.sm} color={color.inkOnStage} style={styles.stateBody}>
              This area is limited to moderators.
            </AppText>
          </View>
        </View>
      </View>
    );
  }

  const handleRemove = async (flag: FlagRow) => {
    if (actioningRef.current.has(flag.id)) return; // F18: already actioning this flag
    actioningRef.current.add(flag.id);
    try {
      const ok = await confirm(
        'Remove flag?',
        'This permanently deletes the flag and cannot be undone.',
      );
      if (!ok) return;
      hapticImpact('medium');
      setActioningId(flag.id);
      try {
        await deleteFlag(flag.id);
        setFlags((prev) => prev.filter((f) => f.id !== flag.id));
      } catch (e) {
        Alert.alert('Error', errorMessage(e));
      } finally {
        setActioningId(null);
      }
    } finally {
      actioningRef.current.delete(flag.id);
    }
  };

  const handleDismiss = async (flag: FlagRow) => {
    if (actioningRef.current.has(flag.id)) return; // F18: already actioning this flag
    actioningRef.current.add(flag.id);
    try {
      const ok = await confirm('Dismiss report?', 'This marks the flag as rejected.');
      if (!ok) return;
      hapticSelection();
      setActioningId(flag.id);
      try {
        await updateFlagStatus(flag.id, 'rejected', flag.status); // F53: CAS
        setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, status: 'rejected' } : f)));
      } catch (e) {
        Alert.alert('Error', errorMessage(e));
      } finally {
        setActioningId(null);
      }
    } finally {
      actioningRef.current.delete(flag.id);
    }
  };

  // MOD1 — moderator-error recovery. Only ever offered on an already-rejected
  // row (see renderItem's Dismiss/Restore swap), so this never competes with
  // Dismiss for the same flag.
  const handleRestore = async (flag: FlagRow) => {
    if (actioningRef.current.has(flag.id)) return; // F18: already actioning this flag
    actioningRef.current.add(flag.id);
    try {
      const ok = await confirm(
        'Restore this flag?',
        'This reopens the report so the community can review it again.',
      );
      if (!ok) return;
      hapticSelection();
      setActioningId(flag.id);
      try {
        await updateFlagStatus(flag.id, 'open', flag.status); // F53: CAS
        setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, status: 'open' } : f)));
      } catch (e) {
        Alert.alert('Error', errorMessage(e));
      } finally {
        setActioningId(null);
      }
    } finally {
      actioningRef.current.delete(flag.id);
    }
  };

  const renderItem = ({ item }: { item: FlagRow }) => {
    const isBusy = actioningId === item.id;
    const sev = severityRamp[item.severity];
    return (
      // WCAG 4.1.2 / 2.1.1: this card must NOT be `accessible` — it contains the
      // Remove / Dismiss action buttons, and collapsing the subtree into a single
      // element makes those buttons unreachable for VoiceOver. Each child (text +
      // buttons) exposes itself instead. GlassSurface renders a plain View (no
      // `accessible`), so it does not collapse the subtree.
      <GlassSurface variant="row" forceEngineered style={styles.card}>
        <View style={styles.cardHeader}>
          <CategoryIcon category={item.category} size={20} color={color.textStrong} decorative />
          <AppText
            variant="bodyMedium"
            size={font.size.md}
            color={color.textStrong}
            style={styles.categoryText}
          >
            {CATEGORY_LABELS[item.category]}
          </AppText>
          <StatusBadge status={item.status} size="sm" />
        </View>

        <View style={styles.metaRow}>
          {/* WCAG 1.4.1: severity carried by label + number, not the colour alone. */}
          <View style={[styles.sevPill, { backgroundColor: sev.color }]}>
            <AppText variant="label" size={font.size.xs} color={sev.textOnColor}>
              {sev.label} · {item.severity}
            </AppText>
          </View>
          <AppText variant="mono" size={font.size.xs} color={color.inkGlassMuted} style={styles.coordText}>
            {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
          </AppText>
        </View>

        {item.description ? (
          <AppText variant="body" size={font.size.sm} color={color.text} numberOfLines={2} style={styles.cardBody}>
            {item.description}
          </AppText>
        ) : null}

        {item.photo_url ? (
          <RemoteImage
            uri={item.photo_url}
            style={styles.thumb}
            resizeMode="cover"
            accessibilityLabel={`Photo of ${CATEGORY_LABELS[item.category]} accessibility issue`}
            accessibilityRole="image"
          />
        ) : null}

        {isBusy ? (
          <ActivityIndicator
            style={styles.busyIndicator}
            color={color.brand}
            accessibilityLabel="Processing"
          />
        ) : (
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnRemove, pressed && styles.btnPressed]}
              onPress={() => void handleRemove(item)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${CATEGORY_LABELS[item.category]} flag`}
              {...a11yToggle({ disabled: isBusy })}
            >
              <Trash2 size={16} color={color.textOnBrand} strokeWidth={2} />
              <AppText variant="label" size={font.size.sm} color={color.textOnBrand}>
                Remove flag
              </AppText>
            </Pressable>
            {item.status === 'rejected' ? (
              <Pressable
                style={({ pressed }) => [styles.btn, styles.btnDismiss, pressed && styles.btnPressed]}
                onPress={() => void handleRestore(item)}
                accessibilityRole="button"
                accessibilityLabel={`Restore ${CATEGORY_LABELS[item.category]} flag`}
                {...a11yToggle({ disabled: isBusy })}
              >
                <RotateCcw size={16} color={color.text} strokeWidth={2} />
                <AppText variant="label" size={font.size.sm} color={color.text}>
                  Restore
                </AppText>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.btn, styles.btnDismiss, pressed && styles.btnPressed]}
                onPress={() => void handleDismiss(item)}
                accessibilityRole="button"
                accessibilityLabel={`Dismiss ${CATEGORY_LABELS[item.category]} report`}
                {...a11yToggle({ disabled: isBusy })}
              >
                <Ban size={16} color={color.text} strokeWidth={2} />
                <AppText variant="label" size={font.size.sm} color={color.text}>
                  Dismiss
                </AppText>
              </Pressable>
            )}
          </View>
        )}
      </GlassSurface>
    );
  };

  // MOD1 — one row per open report. Deliberately does NOT read or render
  // reporter identity: AdminReport (src/lib/adminReports.ts) never fetches
  // user_id in the first place, so there is nothing here to accidentally
  // show — the privacy boundary is structural, not a UI omission that a
  // future edit could quietly undo.
  const renderReportItem = ({ item }: { item: AdminReport }) => {
    const isBusy = reportsActioningId === item.id;
    const categoryText = item.category ? REPORT_CATEGORY_TEXT[item.category] : null;
    return (
      <GlassSurface variant="row" forceEngineered style={styles.card}>
        <View style={styles.cardHeader}>
          {item.targetKind === 'comment' ? (
            <MessageSquare size={20} color={color.textStrong} />
          ) : (
            <Ban size={20} color={color.textStrong} />
          )}
          <AppText variant="bodyMedium" size={font.size.md} color={color.textStrong} style={styles.categoryText}>
            {item.malformed
              ? 'Unreadable report'
              : item.targetKind === 'comment'
                ? 'Comment report'
                : 'Flag report'}
          </AppText>
          <AppText variant="label" size={font.size.xs} color={color.inkGlassMuted}>
            {relativeTime(item.createdAt)}
          </AppText>
        </View>

        {categoryText ? (
          <AppText variant="label" size={font.size.xs} color={color.inkOnStage}>
            {categoryText}
          </AppText>
        ) : null}

        {item.malformed ? (
          <AppText variant="body" size={font.size.sm} color={color.text} style={styles.cardBody}>
            This report&apos;s body could not be read — its content is shown below as received.
          </AppText>
        ) : (
          <AppText variant="body" size={font.size.sm} color={color.text} numberOfLines={3} style={styles.cardBody}>
            {item.reason || '(no reason given)'}
          </AppText>
        )}

        {/* Live target content/context — never the reporter, always the
            reported thing, so a moderator can judge the report on its merits. */}
        {!item.malformed && item.targetKind === 'flag' ? (
          item.flag ? (
            <View style={styles.reportTargetBox}>
              <View style={styles.metaRow}>
                <CategoryIcon category={item.flag.category} size={16} color={color.textStrong} decorative />
                <AppText variant="label" size={font.size.xs} color={color.textStrong} style={styles.categoryText}>
                  {CATEGORY_LABELS[item.flag.category]}
                </AppText>
                <StatusBadge status={item.flag.status} size="sm" />
              </View>
              {item.flag.description ? (
                <AppText variant="body" size={font.size.xs} color={color.inkGlassMuted} numberOfLines={2}>
                  {item.flag.description}
                </AppText>
              ) : null}
            </View>
          ) : (
            <AppText variant="label" size={font.size.xs} color={color.inkGlassMuted} style={styles.reportTargetGone}>
              This flag no longer exists.
            </AppText>
          )
        ) : null}

        {!item.malformed && item.targetKind === 'comment' ? (
          item.comment ? (
            <View style={styles.reportTargetBox}>
              <AppText variant="label" size={font.size.xs} color={color.textStrong}>
                {item.comment.display_name ?? 'Someone'}
              </AppText>
              <AppText variant="body" size={font.size.xs} color={color.inkGlassMuted} numberOfLines={3}>
                {item.comment.content}
              </AppText>
              {item.flag ? (
                <AppText variant="label" size={font.size.xs} color={color.inkGlassMuted}>
                  On: {CATEGORY_LABELS[item.flag.category]}
                </AppText>
              ) : null}
            </View>
          ) : (
            <AppText variant="label" size={font.size.xs} color={color.inkGlassMuted} style={styles.reportTargetGone}>
              This comment no longer exists.
            </AppText>
          )
        ) : null}

        {isBusy ? (
          <ActivityIndicator style={styles.busyIndicator} color={color.brand} accessibilityLabel="Processing" />
        ) : (
          <View style={styles.reportActions}>
            {!item.malformed && item.targetKind === 'flag' && item.targetAvailable ? (
              <>
                <Pressable
                  style={({ pressed }) => [styles.btn, styles.btnRemove, pressed && styles.btnPressed]}
                  onPress={() => handleRejectFlagReport(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Reject flag — the reported flag"
                  {...a11yToggle({ disabled: isBusy })}
                >
                  <Ban size={16} color={color.textOnBrand} strokeWidth={2} />
                  <AppText variant="label" size={font.size.sm} color={color.textOnBrand}>
                    Reject flag
                  </AppText>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.btn, styles.btnDismiss, pressed && styles.btnPressed]}
                  onPress={() => handleRemoveFlagReport(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove flag — the reported flag"
                  {...a11yToggle({ disabled: isBusy })}
                >
                  <Trash2 size={16} color={color.text} strokeWidth={2} />
                  <AppText variant="label" size={font.size.sm} color={color.text}>
                    Remove flag
                  </AppText>
                </Pressable>
              </>
            ) : null}
            {!item.malformed && item.targetKind === 'comment' && item.targetAvailable ? (
              <Pressable
                style={({ pressed }) => [styles.btn, styles.btnRemove, pressed && styles.btnPressed]}
                onPress={() => handleRemoveCommentReport(item)}
                accessibilityRole="button"
                accessibilityLabel="Delete comment — the reported comment"
                {...a11yToggle({ disabled: isBusy })}
              >
                <Trash2 size={16} color={color.textOnBrand} strokeWidth={2} />
                <AppText variant="label" size={font.size.sm} color={color.textOnBrand}>
                  Delete comment
                </AppText>
              </Pressable>
            ) : null}
            {!item.malformed && !item.targetAvailable ? (
              <Pressable
                style={({ pressed }) => [styles.btn, styles.btnDismiss, pressed && styles.btnPressed]}
                onPress={() => handleReportTargetUnavailable(item)}
                accessibilityRole="button"
                accessibilityLabel="Close report: target unavailable"
                {...a11yToggle({ disabled: isBusy })}
              >
                <EyeOff size={16} color={color.text} strokeWidth={2} />
                <AppText variant="label" size={font.size.sm} color={color.text}>
                  Target unavailable
                </AppText>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [styles.btn, styles.btnDismiss, pressed && styles.btnPressed]}
              onPress={() => handleReportNoAction(item)}
              accessibilityRole="button"
              accessibilityLabel="Close report: no action needed"
              {...a11yToggle({ disabled: isBusy })}
            >
              <Check size={16} color={color.text} strokeWidth={2} />
              <AppText variant="label" size={font.size.sm} color={color.text}>
                No action
              </AppText>
            </Pressable>
          </View>
        )}
      </GlassSurface>
    );
  };

  if (viewMode === 'reports') {
    return (
      <View style={styles.root}>
        <ScreenStage />
        <FlatList
          style={styles.list}
          data={reports}
          keyExtractor={(r) => r.id}
          renderItem={renderReportItem}
          accessibilityRole="list"
          contentContainerStyle={[
            reports.length === 0 ? styles.emptyContainer : styles.listContent,
            { paddingTop: insets.top, paddingBottom: tabBarHeight + 16 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={reportsLoading}
              onRefresh={loadReports}
              tintColor={color.brand}
              colors={[color.brand]}
            />
          }
          ListHeaderComponent={
            <>
              {header}
              {queueToggle}
              {reportsLoadError ? (
                <View style={styles.errorBanner} accessibilityLiveRegion="polite">
                  <AppText variant="body" style={styles.errorText}>{reportsLoadError}</AppText>
                  <Pressable
                    onPress={() => void loadReports()}
                    style={({ pressed }) => [styles.retryBtn, pressed && { backgroundColor: color.errorPressed }]}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading the report queue"
                  >
                    <AppText variant="label" style={styles.retryText}>Retry</AppText>
                  </Pressable>
                </View>
              ) : null}
              {reports.length > 0 ? (
                <AppText variant="label" size={font.size.xs} color={color.inkOnStage} style={styles.listHeader}>
                  {reports.length} open {reports.length === 1 ? 'report' : 'reports'} · pull to refresh
                </AppText>
              ) : null}
            </>
          }
          ListEmptyComponent={
            reportsLoading ? null : (
              <View style={styles.emptyInner}>
                <Inbox size={40} color={color.inkOnStage} strokeWidth={1.75} />
                <AppText variant="bodyMedium" size={font.size.lg} color={color.text} style={styles.stateTitle}>
                  No open reports
                </AppText>
                <AppText variant="body" size={font.size.sm} color={color.inkOnStage} style={styles.stateBody}>
                  You&apos;re all caught up. New abuse reports will appear here.
                </AppText>
              </View>
            )
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenStage />
      <FlatList
        style={styles.list}
        data={flags}
        keyExtractor={(f) => f.id}
        renderItem={renderItem}
        accessibilityRole="list"
        contentContainerStyle={[
          flags.length === 0 ? styles.emptyContainer : styles.listContent,
          { paddingTop: insets.top, paddingBottom: tabBarHeight + 16 },
        ]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={color.brand} colors={[color.brand]} />
        }
        ListHeaderComponent={
          <>
            {header}
            {queueToggle}
            {loadError ? (
              <View style={styles.errorBanner} accessibilityLiveRegion="polite">
                <AppText variant="body" style={styles.errorText}>{loadError}</AppText>
                <Pressable
                  onPress={() => void load()}
                  style={({ pressed }) => [styles.retryBtn, pressed && { backgroundColor: color.errorPressed }]}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading the moderation queue"
                >
                  <AppText variant="label" style={styles.retryText}>Retry</AppText>
                </Pressable>
              </View>
            ) : null}
            {flags.length > 0 ? (
              <AppText variant="label" size={font.size.xs} color={color.inkOnStage} style={styles.listHeader}>
                {flags.length} recent {flags.length === 1 ? 'flag' : 'flags'} · pull to refresh
              </AppText>
            ) : null}
          </>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyInner}>
              <Inbox size={40} color={color.inkOnStage} strokeWidth={1.75} />
              <AppText variant="bodyMedium" size={font.size.lg} color={color.text} style={styles.stateTitle}>
                No flags to moderate
              </AppText>
              <AppText variant="body" size={font.size.sm} color={color.inkOnStage} style={styles.stateBody}>
                You&apos;re all caught up. New reports will appear here.
              </AppText>
            </View>
          )
        }
      />
    </View>
  );
}

function makeStyles(color: ColorTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: color.stage1,
    },
    frame: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.xl,
    },
    listContent: {
      gap: spacing.md,
    },
    listHeader: {
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.xl,
    },
    // BP-9 — the sibling error-banner recipe (MyWatched/MyReports), solid
    // errorBg so the red family never sits on glass.
    errorBanner: {
      backgroundColor: color.errorBg,
      borderRadius: radius.md,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.sm,
    },
    errorText: { color: color.errorFg, flex: 1, fontSize: font.size.sm, lineHeight: font.lineHeight.sm },
    retryBtn: {
      paddingHorizontal: spacing.md + 2,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
      backgroundColor: color.error,
      minHeight: 44,
      justifyContent: 'center',
    },
    retryText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.sm },
    emptyContainer: {
      flexGrow: 1,
    },
    emptyInner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.xl,
    },
    stateTitle: {
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    stateBody: {
      textAlign: 'center',
      maxWidth: 280,
    },
    card: {
      gap: spacing.sm,
      padding: spacing.lg,
      marginHorizontal: spacing.xl,
    },
    cardBody: {
      fontFamily: font.family.bodyMedium,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    categoryText: {
      flex: 1,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sevPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.full,
    },
    coordText: {
      flex: 1,
    },
    thumb: {
      width: '100%',
      height: 140,
      borderRadius: radius.md,
      marginTop: spacing.tight,
      borderWidth: 1,
      borderColor: color.borderSubtle,
    },
    busyIndicator: {
      marginTop: spacing.sm,
      alignSelf: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.tight,
    },
    // MOD1
    queueToggle: {
      marginHorizontal: spacing.xl,
      marginBottom: spacing.sm,
    },
    reportTargetBox: {
      gap: spacing.tight,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: color.surfaceNeutral,
    },
    reportTargetGone: {
      fontStyle: 'italic',
    },
    reportActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.tight,
    },
    btn: {
      flex: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    btnPressed: {
      opacity: 0.85,
    },
    // A8 — `errorStrong` is the token for a DESTRUCTIVE ACTION's fill;
    // `error` is the subtle one, for banner backgrounds and quiet destructive
    // text. Remove is the most irreversible control on this screen and was
    // wearing the quieter of the two.
    btnRemove: {
      backgroundColor: color.errorStrong,
    },
    btnDismiss: {
      backgroundColor: color.surfaceNeutral,
      borderWidth: 1,
      borderColor: color.border,
    },
  });
}
