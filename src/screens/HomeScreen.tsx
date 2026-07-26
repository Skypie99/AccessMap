/**
 * HomeScreen — the editorial "Nearby" home (overhaul Phase 7a).
 *
 * The clean-editorial + iOS-glass direction Sky picked: a big editorial header
 * (with the menu + Feedback folded in), a frosted-glass search, a rounded map
 * peek, then a grouped "Closest / Recent" list. Presentation only — it reads
 * the existing flag store + distance helpers and an already-granted location;
 * it never touches the data/fetch/EXIF/auth/location engine.
 *
 * Location is fence-safe: on native we read an ALREADY-GRANTED location with no
 * prompt; we only ever surface the OS prompt from the explicit "Use my
 * location" tap. With no location we show an honest "Recent" list (no
 * distances) rather than fake distances from a fixed point.
 *
 * This is the FIRST surface of the new look — the Home tab renders it; the full
 * interactive map is the hidden `FullMap` route, reached via "Open full map".
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  ChevronRight,
  LocateFixed,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  WifiOff,
  X,
} from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ScreenHeader, EYEBROW_TRACKING } from '@/components/ui/ScreenHeader';
import { PressableScale } from '@/components/ui/PressableScale';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { ScreenStage } from '@/components/ui/ScreenStage';
import PlatformMap from '@/components/PlatformMap';
import AddressSearchModal from '@/components/AddressSearchModal';
import { SeverityDisc } from '@/components/SeverityDisc';
import { useFlags } from '@/lib/flagsStore';
import { useGlassMode } from '@/lib/glassMode';
import { peekLocationState, useUserLocation, type PeekLocationState } from '@/lib/location';
import { offlineBannerText } from '@/lib/copy';
import { formatDistance, haversineKm, regionContainsPoint, type LatLng } from '@/lib/distance';
import { CATEGORY_LABELS, SEVERITY_LABELS, STATUS_LABELS } from '@/lib/flags';
import { severityA11y, statusA11y } from '@/lib/a11yText';
import type { GeocodeResult } from '@/lib/geocode';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useDrawer, useDrawerTrigger } from '@/lib/drawerContext';
import { useSharedModals } from '@/lib/sharedModalsContext';

// Visual fallback for the map peek ONLY (San Francisco) when we have no
// location/search center yet. NEVER a distance origin — distances are shown
// only when a real center exists, so they're never fabricated.
const FALLBACK_PEEK_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

// D4/C3 — the empty-local invite. RATIFIED by Sky at the Phase 3 gate
// (DECISIONS §A A-5, 2026-07-26): option 3. One const feeds BOTH the visible
// caption and the peek's spoken label, so the two channels cannot drift and a
// future change stays a one-line swap in one place.
//
// The register rule every option obeys: claim REPORT-absence, never
// barrier-absence. AccessMap cannot know that a place has no barriers — only
// that nobody has reported one. "No barriers here" would be a promise the data
// can't keep, and the people who rely on this app are exactly the people such a
// promise would strand.
//   1. 'No barriers reported here yet — be the first.'
//   2. 'Nobody has reported a barrier around here yet.'
//   3. 'No reports here yet. You could add the first.'   <- RATIFIED by Sky
const EMPTY_LOCAL_INVITE = 'No reports here yet. You could add the first.';

type HomeNav = BottomTabNavigationProp<RootTabParamList, 'Home'>;

/**
 * Mounts the location hook only when location is actually wanted, so the screen
 * never prompts on first paint (esp. on web, where the hook's geolocation path
 * always prompts). `requireExistingPermission` is true for the silent native
 * mount-probe and false once the user explicitly asks (a user-initiated prompt).
 */
function LocationProbe({
  requireExistingPermission,
  onResult,
  onState,
}: {
  requireExistingPermission: boolean;
  onResult: (loc: LatLng | null) => void;
  onState: (state: PeekLocationState) => void;
}) {
  const { location, loading, error, permissionDenied } = useUserLocation({
    requireExistingPermission,
  });
  useEffect(() => {
    onResult(location);
  }, [location, onResult]);
  // D4/C2: the probe now reports WHICH of the three honest states it's in, not
  // just its result, so the peek can say "looking" without ever claiming to be
  // looking when it isn't. Collapsed by a pure helper so the rule is testable.
  const state = peekLocationState({ location, loading, error, permissionDenied });
  useEffect(() => {
    onState(state);
  }, [state, onState]);
  return null;
}

export default function HomeScreen() {
  const color = useColor();
  const glassLite = useGlassMode() === 'lite';
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<HomeNav>();
  const tabBarHeight = useBottomTabBarHeight();
  const drawer = useDrawer();
  const menuTrigger = useDrawerTrigger<View>();
  const { setOpen: setSharedModal } = useSharedModals();
  const { flags, loading, error, isOfflineCache, offlineCachedAt, refresh } = useFlags();
  const styles = makeStyles(color);

  // The tab bar is absolute (frosted) on native, so float the Report pill +
  // scroll padding above it. On web the bar stays in normal flow (reserves its
  // own space), so the safe-area inset is the right offset there.
  const bottomInset = Platform.OS === 'web' ? insets.bottom : tabBarHeight;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchCenter, setSearchCenter] = useState<LatLng | null>(null);
  const [searchLabel, setSearchLabel] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  // false until the user taps "Use my location" — gates the OS prompt to a
  // user-initiated action (fence: never prompt on mount/focus).
  const [askedForLocation, setAskedForLocation] = useState(false);
  // D4/C2: which of the three honest states the probe is in. Stays 'default'
  // while the probe isn't mounted at all, which is the truth then.
  const [probeState, setProbeState] = useState<PeekLocationState>('default');
  // The reveal delay is load-bearing honesty, not polish. A DENIED permission
  // check returns in milliseconds, and the hook is `loading` for that whole
  // window — so without the delay every denied user would see a one-frame
  // "Finding your location…" flash for a search that never happened. Only a
  // read still in flight after 300 ms has earned the words.
  const [locatingRevealed, setLocatingRevealed] = useState(false);
  useEffect(() => {
    if (probeState !== 'locating') {
      setLocatingRevealed(false);
      return;
    }
    const timer = setTimeout(() => setLocatingRevealed(true), 300);
    return () => clearTimeout(timer);
  }, [probeState]);

  // Native: silently probe an already-granted location on mount (no prompt).
  // Web: only probe after the user opts in (the web geolocation path always
  // prompts, so we must not mount it on first paint).
  const probeEnabled = Platform.OS !== 'web' || askedForLocation;

  // A search wins over the device location; otherwise the device location;
  // otherwise null → honest "Recent" mode (no distances).
  const center: LatLng | null = searchCenter ?? userLocation;
  const hasCenter = center != null;

  // D4/C1 — the peek camera honors a center that arrives AFTER mount.
  //
  // `initialRegion` is exactly what it says: both map halves read it once, at
  // construction, and never again (native passes it straight to the MapView —
  // PlatformMap.tsx:288; web maps it to react-leaflet's `center`/`zoom` on
  // MapContainer — PlatformMap.web.tsx:1017-1018, which likewise ignores later
  // prop changes). The location probe resolves a frame or more AFTER mount, so
  // a peek that mounted on the fallback stayed on the fallback FOREVER — while
  // the list beside it had already re-sorted by real distance. That is the
  // whole of D4: the screen knew where you were and the map didn't.
  //
  // The fix is a keyed remount rather than an imperative snap. `snapToRegion`
  // exists on both halves but silently no-ops before the map is ready and
  // neither half exposes a ready signal, so using it would mean editing
  // PlatformMap; a remount honors the new region at construction instead —
  // race-free, identical on both platforms, and free of state loss because the
  // peek's interior is inert (`pointerEvents="none"`, S17/L5-06). The key only
  // changes on a DISCRETE center change (probe resolve, search select, search
  // clear), never per frame.
  //
  // The memo is not decoration: PlatformMap is `memo()` and its own contract
  // (PlatformMap.tsx:509-511) requires callers to memoize `initialRegion`. The
  // old object literal was rebuilt every render and defeated that memo, so
  // this restores a contract Home was quietly violating.
  const peekRegion = useMemo(
    () =>
      center
        ? { latitude: center.lat, longitude: center.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        : FALLBACK_PEEK_REGION,
    [center],
  );
  // 5 decimal places ≈ 1 m — finer than the peek's 0.05° (~5 km) window can
  // show, so this cannot remount for a jitter the user could never see.
  const peekMapKey = center
    ? `peek:${center.lat.toFixed(5)},${center.lng.toFixed(5)}`
    : 'peek:default';

  // D4/C2: the peek's caption slot. `hasCenter` makes this mutually exclusive
  // with anything that describes a KNOWN place, so the slot only ever carries
  // one line.
  const showLocating = !hasCenter && probeState === 'locating' && locatingRevealed;

  // D4/C3 — the empty-local moment. Centering the peek correctly exposes a case
  // the SF fallback used to hide: a user standing somewhere nobody has reported
  // yet now gets a correctly-centered, completely empty map. That blankness
  // should read as an invitation, not as a broken screen.
  //
  // Every clause is an honesty gate, and none of them is optional:
  //   hasCenter        — we must know where "here" is before naming it
  //   !loading         — never claim absence while the answer is still arriving
  //   !error           — never claim absence over a failure (T9/F5-02)
  //   !isOfflineCache  — never claim absence over data we know is stale
  //   flags.length > 0 — a globally empty database keeps its OWN designed line
  //                      in the list card below; two voices for one silence
  //                      would be worse than none
  const emptyLocal = useMemo(
    () =>
      hasCenter &&
      !loading &&
      !error &&
      !isOfflineCache &&
      flags.length > 0 &&
      !flags.some((f) => regionContainsPoint(peekRegion, { lat: f.lat, lng: f.lng })),
    [hasCenter, loading, error, isOfflineCache, flags, peekRegion],
  );

  const items = useMemo(() => {
    if (center) {
      const c = center;
      return flags
        .map((f) => ({ f, km: haversineKm(c, { lat: f.lat, lng: f.lng }) as number | null }))
        .sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
        .slice(0, 6);
    }
    // No center → most-recent first (matches the store's own ordering), no
    // distance shown so we never imply a distance we can't compute.
    return [...flags]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6)
      .map((f) => ({ f, km: null as number | null }));
  }, [flags, center]);

  const handleRowPress = useCallback(
    (f: { id: string; lat: number; lng: number }) => {
      navigation.navigate('FullMap', {
        focusFlag: { id: f.id, lat: f.lat, lng: f.lng },
        ts: Date.now(),
      });
    },
    [navigation],
  );

  const handleSearchSelect = useCallback((result: GeocodeResult) => {
    setSearchCenter({ lat: result.lat, lng: result.lng });
    setSearchLabel(result.displayName);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchCenter(null);
    setSearchLabel(null);
  }, []);

  const showFirstLoad = loading && flags.length === 0;

  // Header copy reflects the honest mode.
  const eyebrow = hasCenter ? 'NEARBY' : 'LATEST';
  const subtitle = searchLabel
    ? `Near ${searchLabel}`
    : hasCenter
      ? 'Sorted by distance'
      : 'Most recent barriers';
  const sectionLabel = hasCenter ? 'CLOSEST' : 'RECENT';

  return (
    <View style={styles.screen}>
      <ScreenStage />
      {probeEnabled && (
        <LocationProbe
          requireExistingPermission={!askedForLocation}
          onResult={setUserLocation}
          onState={setProbeState}
        />
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: bottomInset + 108 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial header — menu + Feedback fold in (no dark nav bar here). */}
        <ScreenHeader
          eyebrow={eyebrow}
          title={
            // T9 (F5-02): never compute "0 barriers" on a settled failure — the
            // error card below carries the words; the headline stays a neutral
            // placeholder, never a false census. (F5-01) word the first-load wait.
            error && flags.length === 0
              ? '—'
              : showFirstLoad
                ? 'Loading…'
                : `${flags.length} ${flags.length === 1 ? 'barrier' : 'barriers'}`
          }
          subtitle={subtitle}
          eyebrowColor={color.inkOnStage}
          subtitleColor={color.inkOnStage}
          actions={
            <>
              <Pressable
                // D2/C3: this header keeps its own inline hamburger (it predates
                // the shared HeaderActions cluster), so it registers itself as
                // the drawer's focus-return target.
                ref={menuTrigger.ref}
                onPress={() => {
                  menuTrigger.register();
                  drawer.setOpen(true);
                }}
                style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Open navigation menu"
                hitSlop={8}
              >
                <Menu size={22} color={color.textStrong} strokeWidth={2.2} />
              </Pressable>
              <Pressable
                onPress={() => setSharedModal('feedback')}
                style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Send feedback"
                accessibilityHint="Opens a form to email feedback to the AccessMap owner"
                hitSlop={8}
              >
                <MessageSquare size={20} color={color.textStrong} strokeWidth={2.2} />
              </Pressable>
            </>
          }
        />

        {/* Frosted-glass search — a real control that opens the address search. */}
        <Pressable
          onPress={() => setSearchOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={searchLabel ? `Search: ${searchLabel}` : 'Search a place'}
          accessibilityHint="Find an address to recenter the map and list"
          style={({ pressed }) => [
            styles.searchPressable,
            pressed && { backgroundColor: color.borderPressed, borderRadius: radius.md },
          ]}
        >
          <GlassSurface style={styles.search} borderRadius={radius.md} variant="row" forceEngineered>
            <View style={styles.searchInner}>
              <Search size={18} color={color.inkGlassMuted} strokeWidth={2} />
              <AppText
                variant="body"
                style={[styles.searchText, searchLabel ? styles.searchTextActive : null]}
                numberOfLines={1}
              >
                {searchLabel ?? 'Search a place'}
              </AppText>
              {searchLabel && (
                <Pressable
                  onPress={clearSearch}
                  hitSlop={10}
                  style={({ pressed }) => pressed && { backgroundColor: color.borderPressed, borderRadius: radius.sm }}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <X size={16} color={color.inkGlassMuted} strokeWidth={2.2} />
                </Pressable>
              )}
            </View>
          </GlassSurface>
        </Pressable>

        {/* "Use my location" — only when we have no center; opt-in (prompts). */}
        {!hasCenter && (
          <PressableScale
            onPress={() => setAskedForLocation(true)}
            style={styles.locateBtn}
            accessibilityRole="button"
            accessibilityLabel="Use my location"
            accessibilityHint="Sorts the list by distance from where you are"
          >
            <LocateFixed size={16} color={color.brandText} strokeWidth={2.2} />
            <AppText variant="label" style={styles.locateText}>Use my location</AppText>
          </PressableScale>
        )}

        {/* Map peek (plain Pressable — we don't scale a live map view). */}
        <Pressable
          style={styles.mapPeek}
          onPress={() => navigation.navigate('FullMap')}
          accessibilityRole="button"
          // D4/C3: a screen reader user can't see that the map came up empty,
          // so the state rides on the button's own name — same const as the
          // visible caption, so the two channels can never drift apart.
          accessibilityLabel={
            emptyLocal ? `Open the full map. ${EMPTY_LOCAL_INVITE}` : 'Open the full map'
          }
        >
          {({ pressed }) => (
            <>
              {/* S17 (L5-06): the peek is announced as ONE button — make its live
                  map interior inert so only the parent Pressable receives the tap.
                  This kills scroll/wheel theft AND (with suppressAttribution below)
                  the live Leaflet attribution links that could exit the app from
                  inside a button. PROTECT-10: the peek still SHOWS the map. BP11:
                  the press dim lands on the hint CHIP, never the live tiles. */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <PlatformMap
                  key={peekMapKey}
                  initialRegion={peekRegion}
                  flags={flags}
                  focusedFlagId={null}
                  suppressAttribution
                />
              </View>
              <View
                style={[styles.mapPeekHint, pressed && { backgroundColor: color.ctaFillPressed }]}
                pointerEvents="none"
              >
                <MapIcon size={14} color={color.textOnBrand} strokeWidth={2.4} />
                <AppText variant="label" style={styles.mapPeekHintText}>Open full map</AppText>
              </View>
            </>
          )}
        </Pressable>

        {/* D4/C2 — the peek's caption slot. One line, one voice: a quiet piece
            of stage text under the map, never a card, never a pane, never an
            icon. It carries at most ONE message, and only when that message is
            true. `Finding your location…` is the app's already-shipped wording
            for this exact state (MapScreen.tsx:2436) reused byte-for-byte, so
            the two surfaces don't invent two vocabularies for one idea.

            D4/C3 adds the second message to the same slot. It stays ONE line:
            `emptyLocal` requires a known center and `showLocating` requires the
            absence of one, so the two can never both be true — the ordering
            here just makes that mutual exclusion explicit on the page. */}
        {emptyLocal ? (
          <AppText
            variant="body"
            style={styles.peekCaption}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={1.4}
          >
            {EMPTY_LOCAL_INVITE}
          </AppText>
        ) : showLocating ? (
          <AppText
            variant="body"
            style={styles.peekCaption}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={1.4}
          >
            Finding your location…
          </AppText>
        ) : null}

        {/* Offline banner (serving the saved cache). B9: now states the age. */}
        {isOfflineCache && (
          <View style={styles.offlineBanner} accessibilityRole="text">
            <WifiOff size={15} color={color.warningFg} strokeWidth={2.2} />
            <AppText variant="body" style={styles.offlineText}>
              {offlineBannerText(offlineCachedAt)}
            </AppText>
          </View>
        )}

        {/* B9b (L7-02): surface a refresh that FAILED while data is still on
            screen — otherwise Home's error card (which only shows when the list
            is empty) swallows it and the stale data reads as current. Ceded to
            the offline banner above when we actually fell back to the cache. */}
        {error && flags.length > 0 && !isOfflineCache && (
          <PressableScale
            onPress={() => void refresh()}
            style={styles.offlineBanner}
            // Warning-tinted banner: a neutral grey dim would fight the warning
            // colour and there's no darker-warning token. Spring + haptic answer it.
            dimOnPress={false}
            accessibilityRole="button"
            accessibilityLiveRegion="polite"
            accessibilityLabel="Couldn’t refresh — showing older data. Tap to try again."
          >
            <RefreshCw size={15} color={color.warningFg} strokeWidth={2.2} />
            <AppText variant="body" style={styles.offlineText}>
              Couldn’t refresh — showing older data. Tap to try again.
            </AppText>
          </PressableScale>
        )}

        <AppText variant="label" style={styles.sectionLabel}>{sectionLabel}</AppText>

        {error && flags.length === 0 ? (
          <GlassSurface variant="row" forceEngineered={glassLite} style={styles.listCard}>
            <View style={styles.stateInner} accessibilityLiveRegion="polite">
              <AppText variant="body" style={styles.errorText}>Couldn’t load barriers.</AppText>
              <PressableScale
                onPress={() => void refresh()}
                style={styles.retryBtn}
                pressedTint={color.ctaFillPressed}
                accessibilityRole="button"
                accessibilityLabel="Try again"
              >
                <RefreshCw size={15} color={color.textOnBrand} strokeWidth={2.4} />
                <AppText variant="label" style={styles.retryText}>Try again</AppText>
              </PressableScale>
            </View>
          </GlassSurface>
        ) : showFirstLoad ? (
          <GlassSurface variant="row" forceEngineered={glassLite} style={styles.listCard}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i}>
                {i > 0 && <View style={styles.sep} />}
                <SkeletonRow />
              </View>
            ))}
          </GlassSurface>
        ) : items.length === 0 ? (
          <GlassSurface variant="row" forceEngineered={glassLite} style={styles.listCard}>
            <AppText variant="body" style={styles.emptyText}>No barriers reported yet.</AppText>
          </GlassSurface>
        ) : (
          <GlassSurface variant="row" forceEngineered={glassLite} style={styles.listCard}>
            {items.map((item, i) => (
              <View key={item.f.id}>
                {i > 0 && <View style={styles.sep} />}
                <PressableScale
                  style={styles.row}
                  onPress={() => handleRowPress(item.f)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    item.km != null
                      ? // T8 (F4-10): keep the status word when distance renders — the
                        // visible meta already shows it in both branches; the SR label
                        // shouldn't drop it just because a distance is present.
                        `${CATEGORY_LABELS[item.f.category]}, ${severityA11y(item.f.severity)}, ${statusA11y(item.f.status)}, ${formatDistance(item.km)} away`
                      : `${CATEGORY_LABELS[item.f.category]}, ${severityA11y(item.f.severity)}, ${statusA11y(item.f.status)}`
                  }
                >
                  {/* S1 + T5: the Recent row's severity is now a numbered mini-disc
                      (the RecentlyViewedRow recipe). Decorative — the row label and
                      the visible meta below already speak number · word · status. */}
                  <SeverityDisc severity={item.f.severity} size={24} digitSize={font.size.xs} maxFontSizeMultiplier={1.3} />
                  <View style={styles.rowText}>
                    <AppText variant="bodyMedium" style={styles.rowTitle}>
                      {CATEGORY_LABELS[item.f.category]}
                    </AppText>
                    {/* S1: Home Recent rows gain the severity NUMBER and route the
                        raw lowercase DB enum through STATUS_LABELS ("open" → "Open",
                        which a screen reader/first-timer no longer hears as a verb). */}
                    <AppText variant="body" style={styles.rowMeta}>
                      {item.km != null
                        ? `Severity ${item.f.severity} · ${SEVERITY_LABELS[item.f.severity]} · ${STATUS_LABELS[item.f.status]} · ${formatDistance(item.km)}`
                        : `Severity ${item.f.severity} · ${SEVERITY_LABELS[item.f.severity]} · ${STATUS_LABELS[item.f.status]}`}
                    </AppText>
                  </View>
                  <ChevronRight size={18} color={color.inkGlassMuted} strokeWidth={2} />
                </PressableScale>
              </View>
            ))}
          </GlassSurface>
        )}
      </ScrollView>

      {/* Report pill — floats over the scroll. */}
      <PressableScale
        style={[styles.reportPill, { bottom: bottomInset + spacing.md }]}
        onPress={() => navigation.navigate('FullMap', { openReport: true, ts: Date.now() })}
        pressedTint={color.ctaFillPressed}
        haptic="medium"
        accessibilityRole="button"
        accessibilityLabel="Report a barrier"
      >
        <Plus size={18} color={color.textOnBrand} strokeWidth={2.6} />
        <AppText variant="label" style={styles.reportPillText}>Report</AppText>
      </PressableScale>

      <AddressSearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={handleSearchSelect}
      />
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: color.stage1 },
    scroll: { flex: 1 },
    headerBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: color.surface,
    },
    headerBtnPressed: { backgroundColor: color.surfaceNeutral },
    searchPressable: { marginHorizontal: spacing.lg, marginTop: spacing.xs },
    search: {
      borderRadius: radius.md,
    },
    searchInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      minHeight: 48,
    },
    searchText: { flex: 1, fontSize: font.size.lg, fontFamily: font.family.bodyMedium, color: color.glassPlaceholder },
    searchTextActive: { color: color.textStrong },
    locateBtn: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      alignItems: 'center',
      gap: spacing.xs,
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: color.brandSofter,
      minHeight: 44,
    },
    locateText: { fontSize: font.size.sm, color: color.brandText, fontWeight: font.weight.semibold },
    mapPeek: {
      height: 168,
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
      borderRadius: radius.xl,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.border,
      backgroundColor: color.surfaceSoft,
    },
    mapPeekHint: {
      position: 'absolute',
      right: spacing.sm,
      bottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.tight,
      backgroundColor: color.brand,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    mapPeekHintText: { fontSize: font.size.xs, color: color.textOnBrand, fontWeight: font.weight.semibold },
    // D4/C2 — the peek caption. Stage ink (this sits on the screen's gradient,
    // not on glass), sm/19 so the line has air without becoming a heading, and
    // no fixed height so Dynamic Type can grow it freely.
    peekCaption: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      fontSize: font.size.sm,
      lineHeight: 19,
      color: color.inkOnStage,
    },
    offlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: color.warningBg,
    },
    offlineText: { flex: 1, fontSize: font.size.sm, color: color.warningFg },
    sectionLabel: {
      fontSize: font.size.xs,
      letterSpacing: EYEBROW_TRACKING,
      color: color.inkOnStage,
      fontWeight: font.weight.semibold,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
    },
    listCard: {
      marginHorizontal: spacing.lg,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    stateInner: { padding: spacing.lg, alignItems: 'center', gap: spacing.md },
    errorText: { fontSize: font.size.base, color: color.inkGlassMuted, textAlign: 'center' },
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: color.brand,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      minHeight: 44,
      justifyContent: 'center',
    },
    retryText: { fontSize: font.size.sm, color: color.textOnBrand, fontWeight: font.weight.bold },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 56 },
    // Indented to sit under the row text: paddingHorizontal(12) + disc(24) +
    // gap(12) = 48 (was 40 for the old 11px dot; the mini-disc pushed the text right).
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginLeft: 52 },
    rowText: { flex: 1, gap: 1 },
    rowTitle: { fontSize: font.size.lg, color: color.textStrong, fontWeight: font.weight.semibold },
    rowMeta: { fontSize: font.size.sm, fontFamily: font.family.bodyMedium, color: color.inkGlassMuted },
    emptyText: { fontSize: font.size.base, color: color.inkGlassMuted, padding: spacing.lg, textAlign: 'center' },
    reportPill: {
      position: 'absolute',
      right: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: color.brand,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.full,
      ...shadow.glowBrand,
    },
    reportPillText: { fontSize: font.size.md, color: color.textOnBrand, fontWeight: font.weight.bold },
  });
