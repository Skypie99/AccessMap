import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/lib/auth';
import {
  formatDistance,
  formatWalkingEta,
  haversineKm,
  type LatLng,
} from '@/lib/distance';
import { errorMessage } from '@/lib/errors';
import { CATEGORY_LABELS, severityColor, updateFlagStatus } from '@/lib/flags';
import { relativeTime } from '@/lib/relativeTime';
import { useFlags } from '@/lib/flagsStore';
import { useUserLocation } from '@/lib/location';
import type { FlagRow, FlagStatus } from '@/types/database';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import FlagDetailModal, {
  type DetailAction,
} from '@/components/FlagDetailModal';

// Statuses Tasks shows. Even if the provider's `statuses` is widened by the
// Map's filter, Tasks restricts the visible set to the actionable lifecycle
// states (open → verified).
const TRIAGE_STATUSES: FlagStatus[] = ['open', 'verified'];

export default function TasksScreen() {
  const navigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList, 'Tasks'>>();
  const { user } = useAuth();
  const {
    flags: providerFlags,
    loading,
    error: flagsError,
    refresh,
    patchFlag,
    removeFlag,
  } = useFlags();
  // Extract userId early so it's available for derived values below.
  const userId = user?.id;

  // Triage view = only open + verified, no matter what the provider holds.
  const flags = useMemo(
    () => providerFlags.filter((f) => TRIAGE_STATUSES.includes(f.status)),
    [providerFlags],
  );

  // "Mine only" toggle — when true, shows only the current user's submitted
  // flags. Local session state — not persisted. Hidden when not signed in.
  const [mineOnly, setMineOnly] = useState(false);

  // Apply the mine-only filter on top of the triage filter so sections
  // always reflect exactly what the list renders.
  const displayFlags = useMemo(
    () => (mineOnly && userId ? flags.filter((f) => f.user_id === userId) : flags),
    [flags, mineOnly, userId],
  );

  // Group the visible flags by status so the SectionList can show "Open"
  // and "Verified" as distinct sections. Sections with zero rows are
  // omitted entirely (no orphaned headers). Order: Open first because
  // it's the higher-attention triage state.
  const sections = useMemo(() => {
    const open = displayFlags.filter((f) => f.status === 'open');
    const verified = displayFlags.filter((f) => f.status === 'verified');
    const out: Array<{ title: string; data: FlagRow[] }> = [];
    if (open.length > 0) out.push({ title: 'Open', data: open });
    if (verified.length > 0) out.push({ title: 'Verified', data: verified });
    return out;
  }, [displayFlags]);

  // One-shot location fetch so each card can show "0.3 km · 4 min walk".
  // Graceful degrade: if the user denies permission (or we error) we just
  // render the card without distance — see FlagCard below.
  const { location: userLocation } = useUserLocation();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<FlagRow | null>(null);

  // Track the flash-banner timer in a ref so we can cancel it on unmount or
  // when a new flash arrives — otherwise leaving the tab mid-flash triggers
  // a "setState on unmounted component" warning.
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showFlash = useCallback((msg: string) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(msg);
    flashTimer.current = setTimeout(() => setFlash(null), 2200);
  }, []);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  // Keep the Tasks tab badge in sync with the count of open/verified flags so
  // the user sees at a glance how many items need attention without switching
  // to this tab. A count of zero clears the badge (undefined removes it).
  // Uses navigation.setOptions so the badge lives on the screen that owns the
  // data — no need to thread state through RootNavigator.
  useEffect(() => {
    const count = flags.length; // `flags` is already filtered to open+verified
    navigation.setOptions({
      tabBarBadge: count > 0 ? count : undefined,
    });
  }, [flags, navigation]);

  // Build the tap-to-retry banner copy from the provider's error string.
  // The provider already includes the leading "Couldn't load flags:" prefix
  // when relevant; we just append the retry hint if it isn't there.
  const errorBannerText = useMemo(() => {
    if (!flagsError) return null;
    return flagsError.toLowerCase().includes('tap to retry')
      ? flagsError
      : `${flagsError}. Tap to retry.`;
  }, [flagsError]);

  // Trigger lives in supabase/schema.sql (handle_flag_status_change, ~line 75).
  // Reporter ALWAYS gets the reporter bonus (5 verify / 10 resolve).
  // Actor gets the actor bonus (2 verify / 5 resolve) ONLY when actor != reporter.
  // So if you triage your own flag, you earn the reporter bonus only — keep this
  // mapping in sync with the trigger if the values ever change.
  const applyStatusChange = useCallback(
    (updated: FlagRow, action: DetailAction, isOwn: boolean) => {
      // Optimistic update via the shared store: replace the row in-place for
      // verify (status changes but flag stays visible), remove it for
      // resolve/reject (it leaves the triage queue).
      if (action === 'verify') {
        patchFlag(updated.id, { ...updated });
      } else {
        removeFlag(updated.id);
      }
      if (action === 'verify') {
        showFlash(isOwn ? 'Verified! +5 points' : 'Verified! +2 points');
      } else if (action === 'resolve') {
        showFlash(isOwn ? 'Resolved! +10 points' : 'Resolved! +5 points');
      }
      // Re-fetch via the shared store to reconcile with what the server
      // actually committed. Fire-and-forget — the optimistic update already
      // handled instant feedback. The refresh also updates the Map tab's pin
      // count through the shared context.
      refresh().catch(() => {});
    },
    [refresh, patchFlag, removeFlag, showFlash],
  );

  const setStatus = useCallback(
    async (id: string, status: FlagStatus, isOwn: boolean) => {
      setBusyId(id);
      try {
        const updated = await updateFlagStatus(id, status);
        const action: DetailAction =
          status === 'verified'
            ? 'verify'
            : status === 'resolved'
              ? 'resolve'
              : 'reject';
        applyStatusChange(updated, action, isOwn);
      } catch (e) {
        Alert.alert('Could not update flag', errorMessage(e));
      } finally {
        setBusyId(null);
      }
    },
    [applyStatusChange],
  );

  const handleViewOnMap = useCallback(
    (target: FlagRow) => {
      navigation.navigate('Map', {
        focusFlag: { id: target.id, lat: target.lat, lng: target.lng },
        ts: Date.now(),
      });
    },
    [navigation],
  );

  const handleDeleted = useCallback(
    (deletedId: string) => {
      removeFlag(deletedId);
      showFlash('Flag deleted');
    },
    [removeFlag, showFlash],
  );

  const showDetails = useCallback((flag: FlagRow) => {
    setSelectedFlag(flag);
  }, []);

  if (loading && flags.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.subtitle}>Loading flags…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {flash && (
        <View style={styles.flashWrap} pointerEvents="none">
          <View style={styles.flashPill}>
            <Text style={styles.flashText}>{flash}</Text>
          </View>
        </View>
      )}
      {errorBannerText && (
        <Pressable
          onPress={() => { refresh().catch(() => {}); }}
          disabled={loading}
          style={({ pressed }) => [
            styles.errorBanner,
            loading && styles.errorBannerBusy,
            pressed && styles.errorBannerPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={errorBannerText}
          accessibilityHint="Tries to load flags again"
          accessibilityState={{ busy: loading }}
          accessibilityLiveRegion="polite"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.errorBannerIcon}>⚠</Text>
          )}
          <Text style={styles.errorBannerText} numberOfLines={2}>
            {loading ? 'Retrying…' : errorBannerText}
          </Text>
        </Pressable>
      )}
      {/* Mine-only toggle — shown only when signed in. A chip row that
          switches between "All flags" and "My flags" without opening the
          full filter panel. Resets to All when the tab loses focus? No —
          we keep it until the user taps again; it's a deliberate choice. */}
      {userId && (
        <View style={styles.mineToggleRow}>
          <Pressable
            onPress={() => setMineOnly(false)}
            style={[styles.mineChip, !mineOnly && styles.mineChipActive]}
            accessibilityRole="button"
            accessibilityLabel="Show all flags"
            accessibilityState={{ selected: !mineOnly }}
          >
            <Text style={[styles.mineChipText, !mineOnly && styles.mineChipTextActive]}>
              All
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMineOnly(true)}
            style={[styles.mineChip, mineOnly && styles.mineChipActive]}
            accessibilityRole="button"
            accessibilityLabel="Show only my flags"
            accessibilityState={{ selected: mineOnly }}
          >
            <Text style={[styles.mineChipText, mineOnly && styles.mineChipTextActive]}>
              Mine
            </Text>
          </Pressable>
        </View>
      )}
      <SectionList
        sections={sections}
        keyExtractor={(f) => f.id}
        contentContainerStyle={
          sections.length === 0 ? styles.emptyContainer : styles.list
        }
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => { refresh().catch(() => {}); }}
          />
        }
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={styles.sectionHeader} accessible accessibilityRole="header">
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountText}>{data.length}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard} accessible accessibilityRole="text">
            <Text style={styles.emptyIcon} accessibilityElementsHidden>
              ✨
            </Text>
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyBody}>
              No flags to triage right now. New community reports will
              land here as they're added — pull to refresh anytime.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <FlagCard
            flag={item}
            isBusy={busyId === item.id}
            isOwn={item.user_id === userId}
            userLocation={userLocation}
            onPress={handleViewOnMap}
            onSetStatus={setStatus}
            onShowDetails={showDetails}
          />
        )}
      />
      <FlagDetailModal
        visible={selectedFlag !== null}
        flag={selectedFlag}
        onClose={() => setSelectedFlag(null)}
        onChanged={applyStatusChange}
        onDeleted={handleDeleted}
        onViewOnMap={handleViewOnMap}
      />
    </View>
  );
}

interface FlagCardProps {
  flag: FlagRow;
  isBusy: boolean;
  isOwn: boolean;
  /** Current user position, or null when unknown / permission denied. */
  userLocation: LatLng | null;
  onPress: (flag: FlagRow) => void;
  onSetStatus: (id: string, status: FlagStatus, isOwn: boolean) => void;
  onShowDetails: (flag: FlagRow) => void;
}

// React.memo so a single triage action (which flips busyId on the parent)
// only re-renders the card that's actually busy — not every visible card.
// At hundreds of rows this is the difference between snappy and laggy.
// The userLocation prop is stable across renders (one-shot fetch), so it
// doesn't disturb memoization in practice.
const FlagCard = memo(function FlagCard({
  flag,
  isBusy,
  isOwn,
  userLocation,
  onPress,
  onSetStatus,
  onShowDetails,
}: FlagCardProps) {
  // Compute distance + ETA once per card per location change. Without the
  // memo this would recompute on every parent state flip (busyId, flash).
  const distanceInfo = useMemo(() => {
    if (!userLocation) return null;
    const km = haversineKm(userLocation, { lat: flag.lat, lng: flag.lng });
    return {
      label: formatDistance(km),
      eta: formatWalkingEta(km),
    };
  }, [userLocation, flag.lat, flag.lng]);
  return (
    <Pressable
      onPress={() => onPress(flag)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Show ${CATEGORY_LABELS[flag.category]} on the map`}
      accessibilityHint="Opens the Map tab focused on this flag"
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.sevDot,
            { backgroundColor: severityColor(flag.severity) },
          ]}
        />
        <Text style={styles.cardTitle}>{CATEGORY_LABELS[flag.category]}</Text>
        <Text style={styles.statusTag}>{flag.status}</Text>
      </View>
      <View style={styles.cardBody}>
        {flag.photo_url ? (
          <Image
            source={{ uri: flag.photo_url }}
            style={styles.cardThumb}
            accessible
            accessibilityLabel={`Photo of the reported ${CATEGORY_LABELS[flag.category]}`}
          />
        ) : null}
        <View style={styles.cardBodyText}>
          {flag.description ? (
            <Text style={styles.cardDesc}>{flag.description}</Text>
          ) : null}
          <Text style={styles.cardMeta}>
            {`Severity ${flag.severity}` +
              (distanceInfo
                ? ` • ${distanceInfo.label} · ${distanceInfo.eta}`
                : '') +
              ` • ${flag.lat.toFixed(4)}, ${flag.lng.toFixed(4)}` +
              ` • ${relativeTime(flag.created_at)}`}
          </Text>
          <Text style={styles.cardHint}>tap to view on map</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        {flag.status === 'open' && (
          <Pressable
            disabled={isBusy}
            onPress={() => onSetStatus(flag.id, 'verified', isOwn)}
            style={[styles.actionBtn, styles.verifyBtn]}
            accessibilityRole="button"
            accessibilityLabel="Verify this flag"
            accessibilityState={{ disabled: isBusy }}
          >
            <Text style={styles.verifyText}>Verify</Text>
          </Pressable>
        )}
        <Pressable
          disabled={isBusy}
          onPress={() => onSetStatus(flag.id, 'resolved', isOwn)}
          style={[styles.actionBtn, styles.resolveBtn]}
          accessibilityRole="button"
          accessibilityLabel="Mark this flag resolved"
          accessibilityState={{ disabled: isBusy }}
        >
          <Text style={styles.resolveText}>Resolved</Text>
        </Pressable>
        <Pressable
          disabled={isBusy}
          onPress={() => onSetStatus(flag.id, 'rejected', isOwn)}
          style={[styles.actionBtn, styles.rejectBtn]}
          accessibilityRole="button"
          accessibilityLabel="Reject this flag"
          accessibilityState={{ disabled: isBusy }}
        >
          <Text style={styles.rejectText}>Reject</Text>
        </Pressable>
        <Pressable
          disabled={isBusy}
          onPress={() => onShowDetails(flag)}
          style={[styles.actionBtn, styles.detailsBtn]}
          accessibilityRole="button"
          accessibilityLabel="View flag details"
          accessibilityHint="Opens a screen with the full report, photo, and more actions"
          accessibilityState={{ disabled: isBusy }}
        >
          <Text style={styles.detailsText}>Details</Text>
        </Pressable>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // Screen wash — same #f7f9fc the Profile screen uses, so the white
  // cards inside read as cards instead of blending into a white page.
  screen: { flex: 1, backgroundColor: '#f7f9fc' },
  flashWrap: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  flashPill: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  flashText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#c0392b',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    minHeight: 44,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  errorBannerBusy: { opacity: 0.85 },
  errorBannerPressed: { opacity: 0.7 },
  errorBannerIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  errorBannerText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  list: { padding: 16 },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  emptyBody: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCountPill: {
    backgroundColor: '#d6e6f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    minWidth: 22,
    alignItems: 'center',
  },
  sectionCountText: {
    color: '#1c4f99',
    fontSize: 11,
    fontWeight: '700',
  },
  title: { fontSize: 18, fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    marginBottom: 12,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sevDot: { width: 12, height: 12, borderRadius: 6 },
  cardTitle: { fontSize: 16, fontWeight: '600', flex: 1 },
  statusTag: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: { flexDirection: 'row', gap: 12 },
  cardThumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#eef1f5',
  },
  cardBodyText: { flex: 1, gap: 4 },
  cardDesc: { fontSize: 14, color: '#222' },
  cardMeta: { fontSize: 12, color: '#666' },
  cardHint: { fontSize: 11, color: '#999', fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifyBtn: { backgroundColor: '#2f80ed' },
  verifyText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  resolveBtn: { backgroundColor: '#27ae60' },
  resolveText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  rejectBtn: { backgroundColor: '#eef1f5' },
  rejectText: { color: '#333', fontWeight: '600', fontSize: 13 },
  detailsBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2f80ed',
  },
  detailsText: { color: '#2f80ed', fontWeight: '600', fontSize: 13 },
  mineToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: '#f7f9fc',
  },
  mineChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#eef1f5',
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mineChipActive: { backgroundColor: '#2f80ed' },
  mineChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  mineChipTextActive: { color: '#fff' },
});
