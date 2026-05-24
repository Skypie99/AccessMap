import React, { useMemo } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CATEGORY_LABELS, severityColor } from '@/lib/flags';
import { relativeTime } from '@/lib/relativeTime';
import {
  formatDistance,
  haversineKm,
  speakDistance,
  type LatLng,
} from '@/lib/distance';
import type { FlagRow } from '@/types/database';

interface Props {
  visible: boolean;
  location: LatLng | null;
  flags: FlagRow[];
  onClose: () => void;
  onSelectFlag: (flag: FlagRow) => void;
}

export default function NearbyFlagsModal({
  visible,
  location,
  flags,
  onClose,
  onSelectFlag,
}: Props) {
  // Sort by distance ascending when we have a location; otherwise keep the
  // existing order (which is most-recent-first from listFlags).
  const sortedFlags = useMemo(() => {
    if (!location) return flags;
    return [...flags]
      .map((f) => ({
        f,
        d: haversineKm(location, { lat: f.lat, lng: f.lng }),
      }))
      .sort((a, b) => a.d - b.d)
      .map(({ f }) => f);
  }, [flags, location]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.screen}>
        <View style={styles.header} accessibilityRole="header">
          <Text style={styles.title}>Nearby flags</Text>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close nearby flags list"
            hitSlop={10}
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>

        {!location && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Allow location access to sort flags by distance. Showing the
              most recent first.
            </Text>
          </View>
        )}

        <FlatList
          data={sortedFlags}
          keyExtractor={(f) => f.id}
          contentContainerStyle={
            sortedFlags.length === 0 ? styles.emptyWrap : styles.list
          }
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyTitle}>No flags to show</Text>
              <Text style={styles.emptySub}>
                When community members report accessibility issues, they'll
                appear here sorted by distance.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const distance = location
              ? haversineKm(location, { lat: item.lat, lng: item.lng })
              : null;
            const distanceText =
              distance != null ? formatDistance(distance) : null;
            const a11yDistance =
              distance != null ? `, ${speakDistance(distance)}` : '';
            const a11yLabel =
              `${CATEGORY_LABELS[item.category]}, severity ${item.severity}` +
              `${a11yDistance}. Status ${item.status}.` +
              (item.description ? ` ${item.description}` : '');
            return (
              <Pressable
                onPress={() => onSelectFlag(item)}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={a11yLabel}
                accessibilityHint="Closes the list and centers the map on this flag"
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.sevDot,
                      { backgroundColor: severityColor(item.severity) },
                    ]}
                    importantForAccessibility="no"
                    accessibilityElementsHidden
                  >
                    <Text style={styles.sevDotText}>{item.severity}</Text>
                  </View>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {CATEGORY_LABELS[item.category]}
                  </Text>
                  {distanceText && (
                    <Text style={styles.distance}>{distanceText}</Text>
                  )}
                </View>
                <View style={styles.cardBody}>
                  {item.photo_url ? (
                    <Image
                      source={{ uri: item.photo_url }}
                      style={styles.thumb}
                      accessible
                      accessibilityLabel={`Photo of the reported ${CATEGORY_LABELS[item.category]}`}
                    />
                  ) : null}
                  <View style={styles.cardBodyText}>
                    {item.description ? (
                      <Text style={styles.cardDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    <Text style={styles.cardMeta}>
                      Severity {item.severity} · {item.status} · {relativeTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f8fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f5',
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: '#222' },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#eef1f5',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#333', fontWeight: '700', fontSize: 14 },
  notice: {
    backgroundColor: '#fff7e6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e4cf',
  },
  noticeText: { fontSize: 13, color: '#714b00' },
  list: { padding: 16, paddingBottom: 32 },
  emptyWrap: { flexGrow: 1 },
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  emptySub: { fontSize: 13, color: '#666', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    minHeight: 44,
  },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sevDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevDotText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#222', flex: 1 },
  distance: { fontSize: 13, color: '#2f80ed', fontWeight: '700' },
  cardBody: { flexDirection: 'row', gap: 12 },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#eef1f5',
  },
  cardBodyText: { flex: 1, gap: 4, justifyContent: 'center' },
  cardDesc: { fontSize: 14, color: '#222' },
  cardMeta: { fontSize: 12, color: '#666' },
});
