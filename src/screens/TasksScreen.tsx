import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/lib/auth';
import { CATEGORY_LABELS, updateFlagStatus } from '@/lib/flags';
import { useFlags } from '@/lib/flagsStore';
import type { FlagRow, FlagStatus } from '@/types/database';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import { severityColor } from './ReportFlagModal';
import FlagDetailModal, {
  type DetailAction,
} from '@/components/FlagDetailModal';

export default function TasksScreen() {
  const navigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList, 'Tasks'>>();
  const { user } = useAuth();
  const { flags, loading, error: flagsError, refresh, patchFlag, removeFlag } =
    useFlags();
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

  // Show an alert when the shared fetch fails (initial load or pull-to-refresh).
  // Track the last seen error so we don't re-fire the alert on unrelated renders.
  const prevFlagsErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (flagsError && flagsError !== prevFlagsErrorRef.current) {
      Alert.alert('Could not load flags', flagsError);
    }
    prevFlagsErrorRef.current = flagsError;
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
      } catch (e: any) {
        Alert.alert('Could not update flag', e?.message ?? 'Unknown error.');
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

  const userId = user?.id;

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
      <FlatList
        data={flags}
        keyExtractor={(f) => f.id}
        contentContainerStyle={flags.length === 0 ? styles.center : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => { refresh().catch(() => {}); }}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.title}>No flags to triage</Text>
            <Text style={styles.subtitle}>
              New reports will appear here as the community adds them.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <FlagCard
            flag={item}
            isBusy={busyId === item.id}
            isOwn={item.user_id === userId}
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
  onPress: (flag: FlagRow) => void;
  onSetStatus: (id: string, status: FlagStatus, isOwn: boolean) => void;
  onShowDetails: (flag: FlagRow) => void;
}

// React.memo so a single triage action (which flips busyId on the parent)
// only re-renders the card that's actually busy — not every visible card.
// At hundreds of rows this is the difference between snappy and laggy.
const FlagCard = memo(function FlagCard({
  flag,
  isBusy,
  isOwn,
  onPress,
  onSetStatus,
  onShowDetails,
}: FlagCardProps) {
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
            Severity {flag.severity} • {flag.lat.toFixed(4)}, {flag.lng.toFixed(4)}
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
  screen: { flex: 1 },
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
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  list: { padding: 16, gap: 12 },
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
});
