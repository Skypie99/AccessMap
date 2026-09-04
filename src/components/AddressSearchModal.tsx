import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { bulkGlassShadow, font, radius, shadow, spacing } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { TYPE_BLOCK } from '@/components/ui/TypeBlock';
import { Sheet } from '@/components/ui/Sheet';
import { useAtTop } from '@/components/ui/SheetPull';
import { AlertTriangle, ChevronRight, Clock, MapPin, Search } from 'lucide-react-native';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { decorativeProps } from '@/lib/accessibility';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { useFocusedInputScroll } from '@/hooks/useFocusedInputScroll';
import { searchAddressStrict, type GeocodeResult } from '@/lib/geocode';
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
 *    AboutScreen) so the app feels consistent.
 */
export default function AddressSearchModal({ visible, onClose, onSelect }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const { atTop, onScroll, scrollEventThrottle } = useAtTop();
  // Keyboard-up bottom-inset reclaim (Recipe F step 3): with the keyboard up the
  // home-indicator inset is covered, so paying for it twice just steals rows.
  const keyboardVisible = useKeyboardVisible();
  const bodyScrollRef = useRef<ScrollView>(null);
  const searchReveal = useFocusedInputScroll(bodyScrollRef, keyboardVisible, spacing.lg);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  // Distinct from the "No matches" empty state: set when the geocoder request
  // actually FAILS (network/timeout/HTTP) so we show a retryable error card
  // instead of pretending there were zero matches.
  const [searchError, setSearchError] = useState(false);
  // Bumped by the error card's Retry button; included in the search effect's
  // deps so a retry re-runs the fetch for the current query.
  const [retryKey, setRetryKey] = useState(0);
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
      // F13: cancel any in-flight 3+ char fetch when the user backtracks below
      // the threshold. Without this, the prior fetch resolves with
      // signal.aborted === false and overwrites this reset with stale results
      // (e.g. typing "mus" then deleting to "mu" still shows "mus" matches).
      abortRef.current?.abort();
      setResults([]);
      setLoading(false);
      setSearched(false);
      setSearchError(false);
      return;
    }
    setLoading(true);
    setSearched(false);
    setSearchError(false);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const found = await searchAddressStrict(trimmed, controller.signal);
        // Bail if a newer search has superseded this one.
        if (controller.signal.aborted) return;
        setResults(found);
        setSearched(true);
        setLoading(false);
      } catch {
        // An abort isn't a real error — a newer keystroke (or a modal close)
        // superseded this fetch, so just bail and let that run own the UI.
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchError(true);
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [query, visible, retryKey]);

  // Reset state whenever the modal opens. Doesn't clear `query` until
  // close so a quick "open → see last results → tap one" still works.
  useEffect(() => {
    if (!visible) {
      abortRef.current?.abort();
      setQuery('');
      setResults([]);
      setLoading(false);
      setSearched(false);
      setSearchError(false);
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
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Search by address"
      closeLabel="Close address search"
      glass
      padded
      presentation="expanded"
      keyboardAvoiding
      pullEnabled={!keyboardVisible}
      minBottomPad={spacing.xl}
      atTop={atTop}
      scrollRef={bodyScrollRef}
      testID="addressSearchModal-backdrop"
    >
          <GestureScrollView
            ref={bodyScrollRef}
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            onLayout={searchReveal.onViewportLayout}
            onScroll={onScroll}
            scrollEventThrottle={scrollEventThrottle}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            showsVerticalScrollIndicator={false}
          >
          <AppText
            variant="body"
            style={styles.subtitle}
            maxFontSizeMultiplier={TYPE_BLOCK.header}
          >
            Type at least 3 characters. Results come from OpenStreetMap.
          </AppText>

          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="e.g. 1 Infinite Loop, Cupertino"
            placeholderTextColor={color.placeholderText}
            style={styles.input}
            maxFontSizeMultiplier={TYPE_BLOCK.header}
            returnKeyType="search"
            onLayout={searchReveal.onLayout}
            onFocus={searchReveal.onFocus}
            onBlur={searchReveal.onBlur}
            accessibilityLabel="Address search"
            accessibilityHint="Type a street address, place name, or landmark to find it on the map."
          />

          {showRecents && (
            <View style={styles.recentSection}>
              <View style={styles.recentHeaderRow}>
                <AppText variant="label" style={styles.recentHeader} accessibilityRole="header">
                  Recent
                </AppText>
                <Pressable
                  onPress={handleClearRecents}
                  hitSlop={12}
                  style={({ pressed }) => [styles.clearRecentBtn, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button"
                  accessibilityLabel="Clear recent searches"
                >
                  <AppText variant="label" style={styles.clearRecentText}>Clear</AppText>
                </Pressable>
              </View>
              <View style={styles.recentListContent}>
              {recents.map((entry, idx) => (
                <Pressable
                  // displayName + index is stable enough for a list capped
                  // at 5 entries; id may be absent on legacy payloads.
                  key={`${entry.displayName}-${idx}`}
                  onPress={() => handlePickRecent(entry)}
                  style={({ pressed }) => [styles.recentRow, pressed && styles.recentRowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Recent search: ${entry.displayName}`}
                  accessibilityHint="Centers the map on this location and closes search"
                >
                  <Clock size={18} color={color.textSubtle} strokeWidth={2.2} {...decorativeProps} />
                  <AppText variant="label" style={styles.recentText} numberOfLines={2}>
                    {entry.displayName}
                  </AppText>
                  <ChevronRight
                    size={18}
                    color={color.textSubtle}
                    strokeWidth={2.2} {...decorativeProps}
                  />
                </Pressable>
              ))}
              </View>
            </View>
          )}

          {loading && (
            <View style={styles.loadingRow} accessible accessibilityLabel="Searching">
              <ActivityIndicator color={color.brand} />
              <AppText variant="body" style={styles.loadingText}>Searching…</AppText>
            </View>
          )}

          {/* Search FAILED (network/timeout/HTTP) — distinct from "No matches"
              so the user knows it's worth retrying, not rephrasing. */}
          {!loading && searchError && (
            <View style={styles.errorCard}>
              {/* A11Y-213: the card container must NOT be an accessible leaf —
                  on iOS that flattened it into one VoiceOver element and made
                  the "Try again" button unreachable (and role="text" on a
                  container holding a button compounded it). The summary node
                  below announces; the button stays independent. */}
              <AlertTriangle size={28} color={color.error} strokeWidth={2} {...decorativeProps} />
              <View style={styles.errorSummary} accessible accessibilityLiveRegion="polite">
                <AppText variant="heading" style={styles.errorTitle}>Couldn&apos;t search</AppText>
                <AppText variant="body" style={styles.errorBody}>
                  Something went wrong reaching the address service. Check your connection and try again.
                </AppText>
              </View>
              <Pressable
                onPress={() => {
                  setSearchError(false);
                  setLoading(true);
                  setRetryKey((k) => k + 1);
                }}
                style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Try again, search this address"
              >
                <AppText variant="label" style={styles.retryText}>Try again</AppText>
              </Pressable>
            </View>
          )}

          {!loading && !searchError && searched && results.length === 0 && (
            <View
              style={styles.emptyCard}
              accessible
              accessibilityRole="text"
              accessibilityLabel="No matches"
              accessibilityLiveRegion="polite"
            >
              <Search size={28} color={color.textSubtle} strokeWidth={2} {...decorativeProps} />
              <AppText variant="heading" style={styles.emptyTitle}>No matches</AppText>
              <AppText variant="body" style={styles.emptyBody}>
                Try a different spelling, add a city, or drop the street number to widen the search.
              </AppText>
            </View>
          )}

          {!loading && results.length > 0 && (
            <View style={styles.resultsList}>
              {results.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => handlePick(item)}
                  style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Jump to ${item.displayName}`}
                  accessibilityHint="Centers the map on this location and closes search"
                >
                  <MapPin size={18} color={color.brand} strokeWidth={2.2} />
                  <View style={styles.resultTextWrap}>
                    <AppText variant="label" style={styles.resultText} numberOfLines={2}>
                      {item.displayName}
                    </AppText>
                    <AppText variant="body" style={styles.resultCoords}>
                      {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </AppText>
                  </View>
                  <ChevronRight
                    size={18}
                    color={color.textSubtle}
                    strokeWidth={2.2} {...decorativeProps}
                  />
                </Pressable>
              ))}
            </View>
          )}
          </GestureScrollView>
    </Sheet>
  );
}

function makeStyles(color: ColorTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: color.scrim,
      justifyContent: 'flex-end',
    },
    // Address Search is a keyboard workspace, not a compact content-hugging
    // sheet. Every node in this chain must spend the definite backdrop height:
    // otherwise the KAV reserves keyboard space but the card stops at its
    // intrinsic height, leaving the focused input clipped in a tiny viewport.
    // The card's safe-area margin is applied at render time above.
    kav: {
      width: '100%',
      maxHeight: '100%',
      flexGrow: 1,
      flexShrink: 1,
    },
    card: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
      maxHeight: '100%',
      flexGrow: 1,
      flexShrink: 1,
      // The bulk variant owns the surface; overflow:hidden clips it to the
      // rounded top (the up-shadow moves to cardWrap — GlassSurface contract).
      overflow: 'hidden',
    },
    // Bulk-glass up-shadow on the outer wrapper (an overflow:hidden view clips
    // its own shadow). Mode tint identical to FeedbackModal/AboutScreen.
    cardWrap: {
      maxHeight: '100%',
      flexGrow: 1,
      flexShrink: 1,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      ...bulkGlassShadow(color),
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    body: {
      flexGrow: 1,
      flexShrink: 1,
      minHeight: 0,
    },
    bodyContent: {
      gap: spacing.sm,
      paddingBottom: spacing.tight,
    },
    title: {
      flex: 1,
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subtitle: {
      fontSize: font.size.sm,
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
      lineHeight: font.lineHeight.sm,
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
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
    },
    emptyCard: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.xs,
      ...shadow.e1,
    },
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
    // Search-failed card — same card shape as emptyCard but with a Retry CTA.
    errorCard: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.xs,
      ...shadow.e1,
    },
    // A11Y-213: summary node inherits the card's internal rhythm so the
    // de-flattened structure renders identically to the old flat one.
    errorSummary: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    errorTitle: {
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    errorBody: {
      fontSize: font.size.sm,
      color: color.textMuted,
      textAlign: 'center',
      lineHeight: 19,
    },
    retryBtn: {
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: 10,
      backgroundColor: color.brand,
      borderRadius: radius.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryBtnPressed: { opacity: 0.8 },
    retryText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.textOnBrand,
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
    // Recent section — mirrors the live-results visual rhythm (same card
    // shadow, same row height/padding) so the modal feels of-a-piece. The
    // Clock icon differentiates "history" rows from the live-pin results.
    recentSection: {
      gap: spacing.sm,
      // Must be able to yield inside the card's 85% bound so the inner
      // ScrollView actually gets squeezed (RN Views default to flexShrink 0).
      flexShrink: 1,
    },
    recentListContent: { gap: spacing.sm },
    recentHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: spacing.xs,
    },
    recentHeader: {
      // On the bulk-glass sheet the worst-case backdrop is darker than white,
      // so textMuted (#666) no longer clears AA — use the arbitrated on-glass
      // muted ink (inkGlassMuted).
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.inkGlassMuted,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
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
      // Uses color.brandText (#1c4f99 ≈ 7.6:1) instead of color.brand
      // (#1466E0 ≈ 3.3:1) so it's AA-safe at any size — robust if the
      // font size ever drops below the 14pt-bold large-text threshold.
      fontSize: font.size.base,
      fontWeight: font.weight.semibold,
      color: color.brandText,
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
    recentText: {
      flex: 1,
      fontSize: font.size.sm,
      color: color.textStrong,
      fontWeight: font.weight.semibold,
      lineHeight: 18,
    },
  });
}
