import React, { useCallback, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useIsAdmin } from '@/lib/admin';
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import {
  CATEGORY_LABELS,
  deleteFlag,
  listRecentFlags,
  severityColor,
  updateFlagStatus,
} from '@/lib/flags';
import type { FlagRow } from '@/types/database';

export default function AdminScreen() {
  const isAdmin = useIsAdmin();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listRecentFlags(200);
      setFlags(rows);
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (isAdmin === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.unauthorizedText}>Admin access required.</Text>
      </View>
    );
  }

  const handleRemove = async (flag: FlagRow) => {
    const ok = await confirm(
      'Remove flag?',
      'This permanently deletes the flag and cannot be undone.',
    );
    if (!ok) return;
    setActioningId(flag.id);
    try {
      await deleteFlag(flag.id);
      setFlags((prev) => prev.filter((f) => f.id !== flag.id));
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setActioningId(null);
    }
  };

  const handleDismiss = async (flag: FlagRow) => {
    const ok = await confirm('Dismiss report?', 'This marks the flag as rejected.');
    if (!ok) return;
    setActioningId(flag.id);
    try {
      await updateFlagStatus(flag.id, 'rejected');
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? { ...f, status: 'rejected' } : f)));
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setActioningId(null);
    }
  };

  const renderItem = ({ item }: { item: FlagRow }) => {
    const isBusy = actioningId === item.id;
    const dot = { backgroundColor: severityColor(item.severity) };
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.severityDot, dot]} />
          <Text style={styles.categoryText}>{CATEGORY_LABELS[item.category]}</Text>
          <Text style={styles.statusBadge}>{item.status}</Text>
        </View>
        <Text style={styles.coordText}>
          {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
        </Text>
        {item.description ? (
          <Text style={styles.descText} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.thumb} resizeMode="cover" />
        ) : null}
        {isBusy ? (
          <ActivityIndicator style={styles.busyIndicator} color="#60a5fa" />
        ) : (
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnRemove]}
              onPress={() => void handleRemove(item)}
              accessibilityRole="button"
              accessibilityLabel={`Remove flag at ${item.lat.toFixed(3)}, ${item.lng.toFixed(3)}`}
            >
              <Text style={styles.btnRemoveText}>Remove flag</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnDismiss]}
              onPress={() => void handleDismiss(item)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss report"
            >
              <Text style={styles.btnDismissText}>Dismiss</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <FlatList
      data={flags}
      keyExtractor={(f) => f.id}
      renderItem={renderItem}
      contentContainerStyle={flags.length === 0 ? styles.emptyContainer : styles.listContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListEmptyComponent={
        loading ? null : <Text style={styles.emptyText}>No flags to moderate.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1829',
  },
  unauthorizedText: {
    color: '#aaa',
    fontSize: 16,
  },
  listContent: {
    padding: 12,
    gap: 10,
    backgroundColor: '#0d1829',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1829',
  },
  emptyText: {
    color: '#aaa',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#1a2540',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryText: {
    color: '#f0f6ff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    color: '#aab',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coordText: {
    color: '#7a8ba8',
    fontSize: 12,
    fontFamily: 'Courier',
  },
  descText: {
    color: '#cdd',
    fontSize: 13,
  },
  thumb: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    marginTop: 2,
  },
  busyIndicator: {
    marginTop: 8,
    alignSelf: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  btnRemove: {
    backgroundColor: '#7f1d1d',
  },
  btnRemoveText: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '600',
  },
  btnDismiss: {
    backgroundColor: '#1e3a5f',
  },
  btnDismissText: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '600',
  },
});
