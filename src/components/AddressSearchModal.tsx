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

  const handlePick = (result: GeocodeResult) => {
    onSelect(result);
    onClose();
  };

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
});
