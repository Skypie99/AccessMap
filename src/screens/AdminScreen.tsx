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
import { Ban, Inbox, Lock, Trash2 } from 'lucide-react-native';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { HeaderActions } from '@/components/ui/HeaderActions';
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
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import { a11yToggle } from '@/lib/accessibility';
import {
  CATEGORY_LABELS,
  deleteFlag,
  listRecentFlags,
  updateFlagStatus,
} from '@/lib/flags';
import type { FlagRow } from '@/types/database';

export default function AdminScreen() {
  const color = useColor();
  const styles = useMemo(() => makeStyles(color), [color]);
  const isAdmin = useIsAdmin();
  const tabBarHeight = useBottomTabBarHeight();
  const drawer = useDrawer();
  const { setOpen } = useSharedModals();
  const insets = useSafeAreaInsets();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
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
    } catch (e) {
      if (seq !== loadSeqRef.current) return;
      Alert.alert('Error', errorMessage(e));
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
          </View>
        )}
      </GlassSurface>
    );
  };

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
    btnRemove: {
      backgroundColor: color.error,
    },
    btnDismiss: {
      backgroundColor: color.surfaceNeutral,
      borderWidth: 1,
      borderColor: color.border,
    },
  });
}
