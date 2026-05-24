import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { color, font, radius, shadow, spacing } from '@/theme';
import { searchAddress, type GeocodeResult } from '@/lib/geocode';
import {
  addRecent,
  type AddressRecent,
  clearRecents,
  loadRecents,
  saveRecents,
} from '@/lib/addressRecents';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called when the user taps a result. Caller animates the map. */
  onSelect: (result: GeocodeResult) => void;
}

// Debounce window for typing → search. Nominatim's policy asks for at
// most 1 req/sec; 350ms means even a fast typist generates one request
// per pause, well inside the cap.
const DEBOUNCE_MS = 350;

/**
 * Slide-up address search sheet. Opened from a 🔍 button in the Map's
 * top action bar. Lets the user type an address, see up to 5 geocoded
 * results from Nominatim, and tap one to animate the map there.
 *
 * Why a modal instead of an always-visible bar:
 *  - Keyboard handling is simpler — the modal owns its own input scope.
 *  - The Map's overlay doesn't compete with the search input for vertical
 *    real estate when the user isn't searching.
 *  - Mirrors the existing modal patterns (ReportFlagModal, FeedbackModal,
 *    AboutModal) so the app feels consistent.
 */
export default function AddressSearchModal({
  visible,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  // Last few addresses the user picked, newest first. Hydrated from
  // AsyncStorage on every modal open so other tabs/devices that wrote
  // recents in the meantime don't show stale state.
  const [recents, setRecents] = useState<AddressRecent[]>([]);

  // AbortController for the in-flight Nominatim request, so a fast
  // typist's stale fetch is cancelled the moment they keep typing. The
  // ref survives re-renders without scheduling them.
  const abortRef = useRef<AbortController | null>(null);

  // Debounced search effect. Cancels any pending request when the
  // query changes; cancels the timer when the modal closes.
  useEffect(() => {
    if (!visible) return;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(false);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const found = await searchAddress(trimmed, controller.signal);
      // Bail if a newer search has superseded this one.
      if (controller.signal.aborted) return;
      setResults(found);
      setLoading(false);
      setSearched(true);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [query, visible]);

  // Reset state whenever the modal opens. Doesn't clear `query` until
  // close so a quick "open → see last results → tap one" still works.
  useEffect(() => {
    if (!visible) {
      abortRef.current?.abort();
      setQuery('');
      setResults([]);
      setLoading(false);
      setSearched(false);
    }
  }, [visible]);

  // Hydrate recents every time the modal opens. Cheap (AsyncStorage
  // read on a 5-entry list) and ensures the Recent section reflects
  // anything written by an earlier session.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      const loaded = await loadRecents();
      if (!cancelled) setRecents(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handlePick = (result: GeocodeResult) => {
    // Persist the pick into recents. Fire-and-forget — saveRecents
    // swallows write errors internally, so a disk hiccup doesn't break
    // the map-jump flow.
    const next = addRecent(recents, {
      id: result.id,
      displayName: result.displayName,
      lat: result.lat,
      lng: result.lng,
    });
    setRecents(next);
    void saveRecents(next);
    onSelect(result);
    onClose();
  };

  // Tapping a recent re-applies the same shape onSelect expects from a
  // live result. id is required by GeocodeResult; if a legacy recent
  // somehow has no id we synthesize one from coords (same fallback the
  // Nominatim parser uses).
  const handlePickRecent = (entry: AddressRecent) => {
    const id = entry.id ?? `${entry.lat},${entry.lng}`;
    // Re-save to bump this entry to the front (move-to-front semantics
    // mean the most-recently-used stays nearest the top).
    const next = addRecent(recents, entry);
    setRecents(next);
    void saveRecents(next);
    onSelect({
      id,
      displayName: entry.displayName,
      lat: entry.lat,
      lng: entry.lng,
    });
    onClose();
  };

  const handleClearRecents = async () => {
    setRecents([]);
    await clearRecents();
  };

  // The "Recent" section only shows when the user hasn't started typing
  // yet — once they type, the live results (or loading spinner) take
  // over the area below the input.
  const showRecents = visible && query.trim().length === 0 && recents.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              Search by address
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close address search"
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Type at least 3 characters. Results come from OpenStreetMap.
          </Text>

          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="e.g. 1 Infinite Loop, Cupertino"
            placeholderTextColor={color.textSubtle}
            style={styles.input}
            returnKeyType="search"
            accessibilityLabel="Address search"
            accessibilityHint="Type a street address, place name, or landmark to find it on the map."
          />

          {showRecents && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeaderRow}>
                <Text
                  style={styles.recentHeader}
                  accessibilityRole="header"
                >
                  Recent
                </Text>
                <Pressable
                  onPress={handleClearRecents}
                  hitSlop={12}
                  style={styles.clearRecentBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Clear recent searches"
                >
                  <Text style={styles.clearRecentText}>Clear</Text>
                </Pressable>
              </View>
              {recents.map((entry, idx) => (
                <Pressable
                  // displayName + index is stable enough for a list capped
                  // at 5 entries; id may be absent on legacy payloads.
                  key={`${entry.displayName}-${idx}`}
                  onPress={() => handlePickRecent(entry)}
                  style={({ pressed }) => [
                    styles.recentRow,
                    pressed && styles.recentRowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Recent search: ${entry.displayName}`}
                  accessibilityHint="Centers the map on this location and closes search"
                >
                  <Text
                    style={styles.recentGlyph}
                    accessibilityElementsHidden
                  >
                    🕘
                  </Text>
                  <Text
                    style={styles.recentText}
                    numberOfLines={2}
                  >
                    {entry.displayName}
                  </Text>
                  <Text
                    style={styles.recentChevron}
                    accessibilityElementsHidden
                  >
                    ›
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {loading && (
            <View style={styles.loadingRow} accessible accessibilityLabel="Searching">
              <ActivityIndicator color={color.brand} />
              <Text style={styles.loadingText}>Searching…</Text>
            </View>
          )}

          {!loading && searched && results.length === 0 && (
            <View
              style={styles.emptyCard}
              accessible
              accessibilityRole="text"
              accessibilityLabel="No matches"
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.emptyIcon} accessibilityElementsHidden>
                🔍
              </Text>
              <Text style={styles.emptyTitle}>No matches</Text>
              <Text style={styles.emptyBody}>
                Try a different spelling, add a city, or drop the
                street number to widen the search.
              </Text>
            </View>
          )}

          {!loading && results.length > 0 && (
            <FlatList
              data={results}
              keyExtractor={(r) => r.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.resultsList}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handlePick(item)}
                  style={({ pressed }) => [
                    styles.resultRow,
                    pressed && styles.resultRowPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${item.displayName}`}
                  accessibilityHint="Centers the map on this location and closes search"
                >
                  <Text
                    style={styles.resultGlyph}
                    accessibilityElementsHidden
                  >
                    📍
                  </Text>
                  <View style={styles.resultTextWrap}>
                    <Text
                      style={styles.resultText}
                      numberOfLines={2}
                    >
                      {item.displayName}
                    </Text>
                    <Text style={styles.resultCoords}>
                      {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </Text>
                  </View>
                  <Text
                    style={styles.resultChevron}
                    accessibilityElementsHidden
                  >
                    ›
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.scrim,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: color.surfaceMuted,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    maxHeight: '85%',
    ...shadow.e3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    color: color.textStrong,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: color.surfaceNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: font.size.lg,
    color: color.text,
    fontWeight: font.weight.bold,
  },
  subtitle: {
    fontSize: font.size.sm,
    color: color.textMuted,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: color.borderSubtle,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.size.md,
    color: color.text,
    minHeight: 44,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: font.size.sm,
    color: color.textMuted,
  },
  emptyCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadow.e1,
  },
  emptyIcon: { fontSize: 28 },
  emptyTitle: {
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    color: color.textStrong,
  },
  emptyBody: {
    fontSize: font.size.sm,
    color: color.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  resultsList: {
    gap: spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: color.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    minHeight: 56,
    ...shadow.e1,
  },
  resultRowPressed: { opacity: 0.85, backgroundColor: color.surfaceSoft },
  resultGlyph: { fontSize: font.size.xl },
  resultTextWrap: { flex: 1, gap: 2 },
  resultText: {
    fontSize: font.size.sm,
    color: color.textStrong,
    fontWeight: font.weight.semibold,
    lineHeight: 18,
  },
  resultCoords: {
    fontSize: font.size.xs,
    color: color.textMuted,
  },
  resultChevron: {
    fontSize: font.size.xl,
    color: color.textSubtle,
    fontWeight: font.weight.regular,
  },
  // Recent section — mirrors the live-results visual rhythm (same card
  // shadow, same row height/padding) so the modal feels of-a-piece. The
  // 🕘 glyph differentiates "history" from the 📍 "live pin" glyph.
  recentSection: {
    gap: spacing.sm,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  recentHeader: {
    // textMuted (#666) is 5.7:1 on white — clears AA at body size and
    // beats the "≥ #5b6470" minimum from the spec.
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    color: color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearRecentBtn: {
    // Tap target ≥ 44pt — hitSlop on the Pressable bumps the
    // effective touch area beyond this rendered box.
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  clearRecentText: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    color: color.brand,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: color.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    minHeight: 56, // ≥ 44pt with breathing room
    ...shadow.e1,
  },
  recentRowPressed: { opacity: 0.85, backgroundColor: color.surfaceSoft },
  recentGlyph: { fontSize: font.size.lg },
  recentText: {
    flex: 1,
    fontSize: font.size.sm,
    color: color.textStrong,
    fontWeight: font.weight.semibold,
    lineHeight: 18,
  },
  recentChevron: {
    fontSize: font.size.xl,
    color: color.textSubtle,
    fontWeight: font.weight.regular,
  },
});
