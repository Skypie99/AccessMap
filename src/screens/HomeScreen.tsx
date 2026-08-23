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
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { decorativeProps, isAxRecompose } from '@/lib/accessibility';
import { LinearGradient } from 'expo-linear-gradient';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ScreenHeader, EYEBROW_TRACKING } from '@/components/ui/ScreenHeader';
import { PressableScale } from '@/components/ui/PressableScale';
import { FlagCard } from '@/components/ui/FlagCard';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { ScreenStage } from '@/components/ui/ScreenStage';
import PlatformMap from '@/components/PlatformMap';
import AddressSearchModal from '@/components/AddressSearchModal';
import { useFlags } from '@/lib/flagsStore';
import { peekLocationState, useUserLocation, type PeekLocationState } from '@/lib/location';
import { offlineBannerText } from '@/lib/copy';
import {
  haversineKm,
  regionContainsPoint,
  regionFittingPoints,
  type LatLng,
} from '@/lib/distance';
import type { GeocodeResult } from '@/lib/geocode';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import { a11y, font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useDrawer, useDrawerTrigger } from '@/lib/drawerContext';
import { useSharedModals } from '@/lib/sharedModalsContext';

// Last-resort visual fallback for the map peek ONLY, used when we have neither
// a location/search center NOR a single report to point at.
// NEVER a distance origin — distances are shown only when a real center
// exists, so they're never fabricated.
//
// SW-08: this used to be the ONLY fallback, and it is San Francisco while the
// data is in Kelowna — so an unlocated user got an empty map of a city with no
// reports in it, under a caption about there being no reports. The caption was
// telling the truth about a place the app had picked at random. `peekRegion`
// below now fits the loaded flags first and only lands here when there is
// nothing at all to fit, which is the one case where no viewport can be honest.
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
// barrier-absence. Flagstone cannot know that a place has no barriers — only
// that nobody has reported one. "No barriers here" would be a promise the data
// can't keep, and the people who rely on this app are exactly the people such a
// promise would strand.
//   1. 'No barriers reported here yet — be the first.'
//   2. 'Nobody has reported a barrier around here yet.'
//   3. 'No reports here yet. You could add the first.'   <- RATIFIED by Sky
const EMPTY_LOCAL_INVITE = 'No reports here yet. You could add the first.';
// Board 10 — the same ratified sentence, in the two halves the empty-state
// recipe asks for (heading, then body). Derived from the const above rather
// than retyped, so the peek chip and the list card can never drift apart and
// a future rewording is still the one-line swap the A-5 note promises.
const [EMPTY_INVITE_TITLE, EMPTY_INVITE_BODY] = ((): [string, string] => {
  const cut = EMPTY_LOCAL_INVITE.indexOf('. ') + 1;
  return [EMPTY_LOCAL_INVITE.slice(0, cut), EMPTY_LOCAL_INVITE.slice(cut).trim()];
})();

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
  const insets = useSafeAreaInsets();
  // F4 / board 01: at or above the recomposition point Home restacks rather than
  // scrolling its default composition — the disc climbs, the census breaks, the
  // search bar and the Report pill lose their labels to their icons.
  const { fontScale } = useWindowDimensions();
  const axRecompose = isAxRecompose(fontScale);
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
  // R-2 / SR-041: `askedForLocation` alone made this control a ONE-SHOT. After
  // a denial it stays true, so a second tap sets the same value, React bails
  // out of the re-render, the probe never remounts — and the button sits there
  // looking live while doing nothing, forever. A user who denied by reflex (or
  // who has since granted permission in Settings) had no way back.
  //
  // The nonce is what makes the tap mean "try again": it changes on every
  // press, so `key` below forces a fresh LocationProbe and a real new attempt.
  const [locateNonce, setLocateNonce] = useState(0);
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
        : // SW-08: no centre — show where the reports ARE rather than a
          // hardcoded city. This claims nothing about the user's position, and
          // `hasCenter` still gates every line that would.
          (regionFittingPoints(flags.map((f) => ({ lat: f.lat, lng: f.lng }))) ??
          FALLBACK_PEEK_REGION),
    [center, flags],
  );
  // 5 decimal places ≈ 1 m — finer than the peek's 0.05° (~5 km) window can
  // show, so this cannot remount for a jitter the user could never see.
  const peekMapKey = center
    ? `peek:${center.lat.toFixed(5)},${center.lng.toFixed(5)}`
    : // SW-08: the no-centre view now depends on the data, so its key has to as
      // well — otherwise the map keeps the first region it ever mounted with and
      // the fit never appears. Rounded to the same ~1 m the centred key uses.
      `peek:fit:${peekRegion.latitude.toFixed(5)},${peekRegion.longitude.toFixed(5)}`;

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
      <LinearGradient
        colors={[color.stage0, `${color.stage0}00`]}
        style={styles.statusLedge}
        pointerEvents="none"
        {...decorativeProps}
      />
      {probeEnabled && (
        <LocationProbe
          // R-2 / SR-041: remount per tap so a retry is a real retry.
          key={locateNonce}
          requireExistingPermission={!askedForLocation}
          onResult={setUserLocation}
          onState={setProbeState}
        />
      )}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: bottomInset + 108 }}
        showsVerticalScrollIndicator={false}
        // Pull-to-refresh parity with Tasks/Profile. `refreshing` stays false:
        // the SWR store renders its own inline banners for stale/failed
        // reloads, so a pinned spinner would double-report.
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refresh()} />}
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
                accessibilityHint="Opens a form to email feedback to the Flagstone owner"
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
          // A11Y-214 / SR-040 (S13 pattern): the bar is NOT one accessible
          // leaf — that swallowed the Clear-search ✕ on iOS, so VoiceOver
          // users could never clear an active search. The text below is the
          // labeled summary; activation falls through to this Pressable;
          // Clear stays an independent element.
          accessible={false}
          style={({ pressed }) => [
            styles.searchPressable,
            pressed && { backgroundColor: color.borderPressed, borderRadius: radius.md },
          ]}
        >
          <GlassSurface style={styles.search} borderRadius={radius.md} variant="row" forceEngineered>
            <View style={styles.searchInner}>
              <Search size={18} color={color.inkGlassMuted} strokeWidth={2} {...decorativeProps} />
              <AppText
                variant="body"
                style={[styles.searchText, searchLabel ? styles.searchTextActive : null]}
                // T4 / X8b: this carries the searched PLACE NAME once a search is
                // active, so it is content, not a static placeholder. Was 1.
                numberOfLines={2}
                accessible
                accessibilityRole="button"
                accessibilityLabel={searchLabel ? `Search: ${searchLabel}` : 'Search a place'}
                accessibilityHint="Find an address to recenter the map and list"
              >
                {/* F4 / board 01: at the recomposition point the search label
                    grows to ~40pt and eats the header row, so the control goes
                    icon-only. The AppText itself stays MOUNTED and unchanged —
                    it is the element that carries `accessible`, the button role,
                    the 44pt frame and the accessible name (SW-10 / A11Y-214,
                    pinned by hitTargetFrame.guard). Moving those onto the icon
                    to save a node would trade a real a11y contract for tidiness.
                    Only the visible characters go. */}
                {axRecompose ? null : (searchLabel ?? 'Search a place')}
              </AppText>
              {searchLabel && (
                <Pressable
                  onPress={clearSearch}
                  // A11Y-223: 16pt glyph + 14pt slop = 44×44 effective — the
                  // house floor, via slop math (a real 44 box would eat 28px of
                  // the bar's text width; the slop's only neighbours here are
                  // non-interactive, so nothing collides). Was hitSlop 10 = 36.
                  hitSlop={14}
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
            onPress={() => {
              setAskedForLocation(true);
              setLocateNonce((n) => n + 1);
            }}
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
              {/* D4/C5 — the empty-local chip (Sky's A-5 placement pick, B).
                  An ENGINEERED tint, never a live blur: GLASS.md is explicit
                  that the pane blurs and the chip tints, and true blur may live
                  only in a GlassSurface variant acting as a pane. So this costs
                  nothing against the blur budget.

                  a11y-hidden on purpose, and that is a fix rather than an
                  omission: the peek's own accessibilityLabel already composes
                  this exact sentence, so exposing the chip too would announce it
                  twice (DECISIONS §F F-19). Visual channel here, spoken channel
                  on the button, one voice each. */}
              {emptyLocal && (
                <View style={styles.peekChipWrap} pointerEvents="none">
                  <GlassSurface
                    variant="banner"
                    forceEngineered
                    borderRadius={radius.full}
                    style={styles.peekChip}
                  >
                    <AppText
                      variant="label"
                      style={styles.peekChipText}
                      maxFontSizeMultiplier={1.4}
                      // `aria-hidden` is the one that works EVERYWHERE. RN-web
                      // ignores the two legacy props — proved by the shipped
                      // "Sort:" label, which carried both and still showed up
                      // in the web ARIA tree (DECISIONS §F F-22). A11Y-234:
                      // `decorativeProps` is now the single spelling of this
                      // whole idea (accessible:false + both legacy props +
                      // aria-hidden), so the standalone aria-hidden that used
                      // to sit here would just duplicate what the spread sets.
                      {...decorativeProps}
                    >
                      {EMPTY_LOCAL_INVITE}
                    </AppText>
                  </GlassSurface>
                </View>
              )}
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
        {showLocating ? (
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
          <GlassSurface variant="row" style={styles.listCard}>
            {/* W5: the house empty/error recipe, with the path mark. Copy is
                the shipped sentence, verbatim; the retry is the shipped
                control, moved into the block's action slot. */}
            <EmptyState
              live
              title="Couldn’t load barriers."
              action={
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
              }
            />
          </GlassSurface>
        ) : showFirstLoad ? (
          <GlassSurface variant="row" style={styles.listCard}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i}>
                {i > 0 && <View style={styles.sep} />}
                <SkeletonRow />
              </View>
            ))}
          </GlassSurface>
        ) : items.length === 0 ? (
          <GlassSurface variant="row" style={styles.listCard}>
            {/* Board 10. The card used to say "No barriers reported yet." while
                the map peek two inches above said the RATIFIED sentence
                (A-5, `EMPTY_LOCAL_INVITE`) for the same condition. One screen,
                two sentences about the same nothing. The ratified one wins and
                splits into the recipe's heading + body — no new words, and the
                invitation Sky picked is now on the surface a first-time user
                actually reads. */}
            <EmptyState
              title={EMPTY_INVITE_TITLE}
              body={EMPTY_INVITE_BODY}
              action={
                <PressableScale
                  onPress={() => navigation.navigate('FullMap', { openReport: true, ts: Date.now() })}
                  style={styles.retryBtn}
                  pressedTint={color.ctaFillPressed}
                  accessibilityRole="button"
                  accessibilityLabel="Report a barrier"
                >
                  <Plus size={15} color={color.textOnBrand} strokeWidth={2.4} />
                  <AppText variant="label" style={styles.retryText}>Report a barrier</AppText>
                </PressableScale>
              }
            />
          </GlassSurface>
        ) : (
          <GlassSurface variant="row" style={styles.listCard}>
            {items.map((item, i) => (
              <View key={item.f.id}>
                {i > 0 && <View style={styles.sep} />}
                {/* F1: the row is no longer drawn here. Home, the Nearby list
                    and Tasks all render `FlagCard` now, so a flag looks the same
                    object wherever it appears and the recomposition rule (F4),
                    the census order (F2) and the mono distance (T1) are decided
                    once instead of three times. What was in this block moved
                    verbatim into the component: the same disc, the same two
                    census branches, the same chevron, and the same composite
                    label built from severityA11y / statusA11y / speakDistance —
                    which is the label FlagCard now builds by default, so nothing
                    is passed here to keep it. */}
                <FlagCard flag={item.f} density="row" distanceKm={item.km} onPress={() => handleRowPress(item.f)} />
              </View>
            ))}
            {/* Board 01: the list ends in a way out. Without it the CLOSEST card
                just stops, and the full map — the thing the count is counting —
                is only reachable from the peek above or the tab bar.
                PLACEHOLDER COPY: logged in build/COPY_LEDGER.md as
                SKY-WORDS-REQUIRED (W-02). Sky ratifies the wording before merge. */}
            <View style={styles.sep} />
            <PressableScale
              style={styles.seeAllRow}
              onPress={() => navigation.navigate('FullMap', { ts: Date.now() })}
              accessibilityRole="button"
              accessibilityLabel={`See all ${flags.length} on the map`}
              accessibilityHint="Opens the full map"
            >
              <AppText variant="label" style={styles.seeAllText}>
                {`See all ${flags.length} on the map`}
              </AppText>
              <ChevronRight size={18} color={color.brandText} strokeWidth={2.4} {...decorativeProps} />
            </PressableScale>
          </GlassSurface>
        )}
      </ScrollView>

      {/* Report pill — floats over the scroll. */}
      <PressableScale
        style={[styles.reportPill, axRecompose && styles.reportFab, { bottom: bottomInset + spacing.md }]}
        onPress={() => navigation.navigate('FullMap', { openReport: true, ts: Date.now() })}
        pressedTint={color.ctaFillPressed}
        haptic="medium"
        accessibilityRole="button"
        accessibilityLabel="Report a barrier"
      >
        <Plus size={axRecompose ? 24 : 18} color={color.textOnBrand} strokeWidth={2.6} />
        {/* F4: the label rides the accessibilityLabel above at large type, where
            a text pill would otherwise span most of the screen. The fill stays
            color.brand — brandInkAA pins that as a deliberate large-text
            exception, and an icon-only button has no small text at all. */}
        {!axRecompose && <AppText variant="label" style={styles.reportPillText}>Report</AppText>}
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
      // SW-10: the pad moved onto `searchText` below. The bar is unchanged at
      // 48 (44 + 2 + 2); what changed is WHICH box is 44 tall — see there.
      paddingVertical: 2,
      minHeight: 48,
    },
    // SW-10: this Text — not the bar — is the labelled, role="button" element
    // (A11Y-214/SR-040 put it here on purpose). It measured 358x20 inside a 48pt
    // bar, so VoiceOver's focus rect was 20pt tall on the screen's main control.
    // The height belongs on the element that carries the label.
    searchText: {
      flex: 1,
      fontSize: font.size.lg,
      fontFamily: font.family.bodyMedium,
      color: color.glassPlaceholder,
      // Padding rather than lineHeight so the glyphs stay optically centred,
      // and a minHeight floor so the box still clears 44 at the smallest type.
      // 44 + 2 + 2 of searchInner pad = the same 48pt bar as before.
      paddingVertical: spacing.md,
      minHeight: a11y.minTargetSize,
    },
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
    // D4/C5 — the empty-local chip. Pinned to the TOP of the peek so it can
    // never collide with the "Open full map" pill in the bottom-right corner.
    peekChipWrap: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      right: spacing.md,
      alignItems: 'center',
    },
    peekChip: {
      borderRadius: radius.full,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    // brandOnSoft is the ink already paired with the banner tint elsewhere in
    // the app; no new ink value is introduced. Arbitrated over map tiles in
    // design-reviews/device-tune/tools/devicetune-empty-local-chip-stacks.json,
    // because glass over LIVE MAP TILES is a composite this estate has not
    // measured before.
    peekChipText: {
      fontSize: font.size.sm,
      lineHeight: 19,
      color: color.brandOnSoft,
      fontWeight: font.weight.semibold,
      textAlign: 'center',
    },
    mapPeekHint: {
      position: 'absolute',
      right: spacing.sm,
      bottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.tight,
      // A11Y-229 (M-52 grammar): small white hint text — ctaFill, 5.24 both
      // themes (dark brand is 3.42, large-text-only). Light is byte-identical.
      backgroundColor: color.ctaFill,
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
    // F4: the status-bar ledge. Home and Settings scroll their content under a
    // transparent status bar, so a scrolled row could sit directly behind the
    // clock. A 47pt wash from stage0 down to the SAME COLOUR at zero alpha keeps
    // the bar legible without painting an opaque header over the stage.
    //
    // The second stop is `${color.stage0}00`, never the string 'transparent'.
    // 'transparent' is rgba(0,0,0,0), so the gradient interpolates through BLACK
    // and lays a grey veil over the stage — measured on the 17e, the stage's
    // #A6C8FB read #89A0C1 under the first draft of this ledge. Fading a colour
    // to its own zero-alpha twin is the only version that is actually invisible.
    // Decorative and pointer-inert — it must never intercept a tap meant for the
    // content beneath it.
    statusLedge: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 47,
      zIndex: 2,
    },
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
    retryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      // A11Y-229 (M-52 grammar): 13pt bold retry label is small text — ctaFill.
      backgroundColor: color.ctaFill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      minHeight: 44,
      justifyContent: 'center',
    },
    retryText: { fontSize: font.size.sm, color: color.textOnBrand, fontWeight: font.weight.bold },
    // Indented to sit under the row text: paddingHorizontal(12) + disc(24) +
    // gap(12) = 48 (was 40 for the old 11px dot; the mini-disc pushed the text
    // right). QA 2026-08-18: value was 52, a 4px drift from its own math.
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginLeft: 48 },
    reportPill: {
      position: 'absolute',
      right: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      // Stays color.brand ON PURPOSE — ratified judgment N-13 (brandInkAA
      // guard): 15/700 is WCAG large text, so 3.4:1 on dark brand is a pass.
      // Do not "fix" this to ctaFill; the guard test pins it.
      backgroundColor: color.brand,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: radius.full,
      // SW-12: 12 + 12 + ~18pt of ink resolved to 42 — the primary CTA sat 2pt
      // under the floor. minHeight is the only tool that moves the ACCESSIBILITY
      // frame (hitSlop does not); MapScreen's own `fab` already carries 48.
      minHeight: 48,
      justifyContent: 'center',
      ...shadow.glowBrand,
    },
    // Board 01: the CLOSEST card's way out. 44pt floor like every other row.
    seeAllRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      minHeight: 44,
    },
    seeAllText: { fontSize: font.size.md, color: color.brandText, fontWeight: font.weight.semibold },
    reportPillText: { fontSize: font.size.md, color: color.textOnBrand, fontWeight: font.weight.bold },
    // F4: the icon-only form. 56 is the house FAB size and clears the 44pt floor
    // with room; paddingHorizontal is zeroed so the circle is a circle.
    reportFab: { width: 56, height: 56, paddingHorizontal: 0, borderRadius: radius.circle, justifyContent: 'center' },
  });
