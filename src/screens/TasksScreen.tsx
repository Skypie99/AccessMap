import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  CATEGORY_LABELS,
  listFlags,
  updateFlagStatus,
} from '@/lib/flags';
import type { FlagRow, FlagStatus } from '@/types/database';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import { severityColor } from './ReportFlagModal';

export default function TasksScreen() {
  const navigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList, 'Tasks'>>();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

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

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listFlags(['open', 'verified']);
      setFlags(rows);
    } catch (e: any) {
      Alert.alert('Could not load flags', e?.message ?? 'Unknown error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setStatus = async (id: string, status: FlagStatus) => {
    setBusyId(id);
    try {
      await updateFlagStatus(id, status);
      // Drop resolved/rejected from the list locally; keep verified visible.
      setFlags((prev) =>
        status === 'verified'
          ? prev.map((f) => (f.id === id ? { ...f, status } : f))
          : prev.filter((f) => f.id !== id),
      );
      if (status === 'verified') showFlash('Verified! +2 points');
      else if (status === 'resolved') showFlash('Resolved! +5 points');
    } catch (e: any) {
      Alert.alert('Could not update flag', e?.message ?? 'Unknown error.');
    } finally {
      setBusyId(null);
    }
  };

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
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.title}>No flags to triage</Text>
          <Text style={styles.subtitle}>
            New reports will appear here as the community adds them.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const isBusy = busyId === item.id;
        const goToOnMap = () => {
          navigation.navigate('Map', {
            focusFlag: { id: item.id, lat: item.lat, lng: item.lng },
            ts: Date.now(),
          });
        };
        return (
          <Pressable
            onPress={goToOnMap}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            accessibilityLabel={`Show ${CATEGORY_LABELS[item.category]} on the map`}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.sevDot,
                  { backgroundColor: severityColor(item.severity) },
                ]}
              />
              <Text style={styles.cardTitle}>{CATEGORY_LABELS[item.category]}</Text>
              <Text style={styles.statusTag}>{item.status}</Text>
            </View>
            <View style={styles.cardBody}>
              {item.photo_url ? (
                <Image
                  source={{ uri: item.photo_url }}
                  style={styles.cardThumb}
                />
              ) : null}
              <View style={styles.cardBodyText}>
                {item.description ? (
                  <Text style={styles.cardDesc}>{item.description}</Text>
                ) : null}
                <Text style={styles.cardMeta}>
                  Severity {item.severity} • {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                </Text>
                <Text style={styles.cardHint}>tap to view on map</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              {item.status === 'open' && (
                <Pressable
                  disabled={isBusy}
                  onPress={() => setStatus(item.id, 'verified')}
                  style={[styles.actionBtn, styles.verifyBtn]}
                >
                  <Text style={styles.verifyText}>Verify</Text>
                </Pressable>
              )}
              <Pressable
                disabled={isBusy}
                onPress={() => setStatus(item.id, 'resolved')}
                style={[styles.actionBtn, styles.resolveBtn]}
              >
                <Text style={styles.resolveText}>Resolved</Text>
              </Pressable>
              <Pressable
                disabled={isBusy}
                onPress={() => setStatus(item.id, 'rejected')}
                style={[styles.actionBtn, styles.rejectBtn]}
              >
                <Text style={styles.rejectText}>Reject</Text>
              </Pressable>
            </View>
          </Pressable>
        );
      }}
      />
    </View>
  );
}

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
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
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
});
