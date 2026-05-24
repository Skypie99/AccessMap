import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CATEGORY_LABELS, CATEGORY_ORDER, severityColor } from '@/lib/flags';
import { relativeTime } from '@/lib/relativeTime';
import {
  formatDistance,
  haversineKm,
  speakDistance,
  type LatLng,
} from '@/lib/distance';
import { searchFlags } from '@/lib/flagSearch';
import type { FlagCategory, FlagRow } from '@/types/database';
import { color } from '@/theme';

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
  // null = show all categories; set to a FlagCategory to narrow the list.
  const [filterCat, setFilterCat] = useState<FlagCategory | null>(null);
  // Free-text search across description / category label / status label.
  // Empty = pass-through. Applied after the category filter so the chip
  // counts still reflect category totals (not search-narrowed counts).
  const [searchQuery, setSearchQuery] = useState('');

  // Reset filter + search whenever the modal closes — re-opening shows
  // a clean list. Without this, the previous filter sticks around
  // invisibly until the user thinks to clear it. QA Pass-1 #4.
  useEffect(() => {
    if (!visible) {
      setFilterCat(null);
      setSearchQuery('');
    }
  }, [visible]);

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

  // Categories that actually appear in this list (preserves CATEGORY_ORDER
  // ordering rather than insertion order).
  const presentCategories = useMemo<FlagCategory[]>(() => {
    const seen = new Set(flags.map((f) => f.category));
    return CATEGORY_ORDER.filter((c) => seen.has(c));
  }, [flags]);

  // Apply the active category filter on top of the distance-sorted list.
  const categoryFiltered = useMemo(() => {
    if (filterCat === null) return sortedFlags;
    return sortedFlags.filter((f) => f.category === filterCat);
  }, [sortedFlags, filterCat]);

  // Apply the search query on top of the category-filtered list. Pure
  // function — no extra fetch.
  const displayFlags = useMemo(
    () => searchFlags(categoryFiltered, searchQuery),
    [categoryFiltered, searchQuery],
  );

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

        {/* Search bar — shown only when the list has at least two flags
            (one-flag lists don't benefit from search). Pure client-side
            filter via searchFlags(). */}
        {flags.length >= 2 && (
          <View style={styles.searchWrap}>
            <Text
              style={styles.searchGlyph}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              🔎
            </Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search descriptions, categories, status…"
              placeholderTextColor="#999"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              // 200 is plenty for any natural-language query; caps a
              // paste of an enormous string that would re-scan the
              // whole flag list on every keystroke. QA Pass-3 #7.
              maxLength={200}
              accessibilityLabel="Search flags"
              accessibilityHint="Filters the list to flags whose description, category, or status contains your search words"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.searchClear,
                  pressed && styles.searchClearPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Text
                  style={styles.searchClearText}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  ✕
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Category filter chips — only shown when the list has flags in
            more than one category, so there's something to filter. */}
        {presentCategories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipBar}
            accessibilityLabel="Filter by category"
            accessibilityRole="tablist"
          >
            {/* "All" chip */}
            <Pressable
              onPress={() => setFilterCat(null)}
              style={[styles.chip, filterCat === null && styles.chipActive]}
              accessibilityRole="tab"
              accessibilityLabel="Show all categories"
              accessibilityState={{ selected: filterCat === null }}
            >
              <Text style={[styles.chipText, filterCat === null && styles.chipTextActive]}>
                All ({flags.length})
              </Text>
            </Pressable>
            {presentCategories.map((cat) => {
              const active = filterCat === cat;
              const count = flags.filter((f) => f.category === cat).length;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setFilterCat(active ? null : cat)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="tab"
                  accessibilityLabel={`Filter by ${CATEGORY_LABELS[cat]}, ${count} ${count === 1 ? 'flag' : 'flags'}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {CATEGORY_LABELS[cat]} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <FlatList
          data={displayFlags}
          keyExtractor={(f) => f.id}
          contentContainerStyle={
            displayFlags.length === 0 ? styles.emptyWrap : styles.list
          }
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyTitle}>
                {searchQuery.trim().length > 0
                  ? 'No matches'
                  : filterCat !== null
                    ? 'No matching flags'
                    : 'No flags to show'}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery.trim().length > 0
                  ? `No flags match "${searchQuery.trim()}". Try a shorter or different query.`
                  : filterCat !== null
                    ? `No ${CATEGORY_LABELS[filterCat]} reports in this area. Try a different category.`
                    : "When community members report accessibility issues, they'll appear here sorted by distance."}
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
  // Search bar — sits between the location notice and the category
  // chip row. Magnifier glyph + free-text input + optional clear ✕.
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f5',
  },
  searchGlyph: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    paddingVertical: 8,
    minHeight: 44,
  },
  searchClear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eef1f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearPressed: { backgroundColor: color.borderPressed, opacity: 0.85 },
  searchClearText: { fontSize: 13, color: '#555', fontWeight: '700' },
  chipBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f5',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#eef1f5',
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: '#2f80ed' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
});
