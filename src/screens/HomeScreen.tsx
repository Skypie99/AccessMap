/**
 * HomeScreen — the editorial "Nearby" home (overhaul Phase 7).
 *
 * The clean-editorial + iOS-glass direction Sky picked: a big editorial header,
 * a frosted-glass search, a rounded map peek, then a grouped "Closest barriers"
 * list. Presentation only — reads the existing flag store + distance helpers;
 * it never touches the data/fetch/EXIF/auth engine.
 *
 * This is the FIRST built surface of the new look, wired in behind the Map tab
 * so it can be seen on device / web before the look rolls out to the rest of the
 * app. The full-screen map remains reachable via "Open full map".
 */
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight, Map as MapIcon, Plus, Search } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import PlatformMap from '@/components/PlatformMap';
import { useFlags } from '@/lib/flagsStore';
import { formatDistance, haversineKm } from '@/lib/distance';
import { CATEGORY_LABELS, SEVERITY_LABELS, severityColor } from '@/lib/flags';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

// Map-peek seed region (San Francisco) — matches MapScreen's DEFAULT_REGION.
// Distance sorting is from this center until a live location is wired in (the
// location-permission timing is fenced, so the home doesn't prompt on its own).
const HOME_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function HomeScreen() {
  const color = useColor();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<{ navigate: (screen: string, params?: object) => void }>();
  const { flags } = useFlags();
  const styles = makeStyles(color);

  const center = { lat: HOME_REGION.latitude, lng: HOME_REGION.longitude };
  const closest = useMemo(
    () =>
      flags
        .map((f) => ({ f, km: haversineKm(center, { lat: f.lat, lng: f.lng }) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, 6),
    // center is a constant for now; flags drive the recompute
    [flags], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial header */}
        <View style={styles.header}>
          <AppText variant="label" style={styles.eyebrow}>NEARBY</AppText>
          <AppText variant="display" size={34} style={styles.title}>
            {flags.length} {flags.length === 1 ? 'barrier' : 'barriers'}
          </AppText>
          <AppText variant="body" style={styles.subtitle}>Sorted by distance</AppText>
        </View>

        {/* Frosted-glass search */}
        <GlassSurface style={styles.search} borderRadius={radius.md} intensity={20}>
          <View style={styles.searchInner}>
            <Search size={18} color={color.textMuted} strokeWidth={2} />
            <AppText variant="body" style={styles.searchText}>Search a place</AppText>
          </View>
        </GlassSurface>

        {/* Map peek */}
        <Pressable
          style={styles.mapPeek}
          onPress={() => navigation.navigate('Map')}
          accessibilityRole="button"
          accessibilityLabel="Open the full map"
        >
          <PlatformMap initialRegion={HOME_REGION} flags={flags} focusedFlagId={null} />
          <View style={styles.mapPeekHint} pointerEvents="none">
            <MapIcon size={14} color={color.textOnBrand} strokeWidth={2.4} />
            <AppText variant="label" style={styles.mapPeekHintText}>Open full map</AppText>
          </View>
        </Pressable>

        {/* Closest list */}
        <AppText variant="label" style={styles.sectionLabel}>CLOSEST</AppText>
        {closest.length === 0 ? (
          <View style={styles.listCard}>
            <AppText variant="body" style={styles.emptyText}>No barriers reported nearby yet.</AppText>
          </View>
        ) : (
          <View style={styles.listCard}>
            {closest.map((item, i) => (
              <View key={item.f.id}>
                {i > 0 && <View style={styles.sep} />}
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => navigation.navigate('Map', { focusFlag: item.f.id, ts: Date.now() })}
                  accessibilityRole="button"
                  accessibilityLabel={`${CATEGORY_LABELS[item.f.category]}, ${SEVERITY_LABELS[item.f.severity]}, ${formatDistance(item.km)} away`}
                >
                  <View style={[styles.dot, { backgroundColor: severityColor(item.f.severity) }]} />
                  <View style={styles.rowText}>
                    <AppText variant="bodyMedium" style={styles.rowTitle}>
                      {CATEGORY_LABELS[item.f.category]}
                    </AppText>
                    <AppText variant="body" style={styles.rowMeta}>
                      {SEVERITY_LABELS[item.f.severity]} · {item.f.status} · {formatDistance(item.km)}
                    </AppText>
                  </View>
                  <ChevronRight size={18} color={color.textSubtle} strokeWidth={2} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Report pill — floats over the scroll */}
      <Pressable
        style={[styles.reportPill, { bottom: insets.bottom + spacing.md }]}
        onPress={() => navigation.navigate('Map', { openReport: true, ts: Date.now() })}
        accessibilityRole="button"
        accessibilityLabel="Report a barrier"
      >
        <Plus size={18} color={color.textOnBrand} strokeWidth={2.6} />
        <AppText variant="label" style={styles.reportPillText}>Report</AppText>
      </Pressable>
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: color.surfaceMuted },
    scroll: { flex: 1 },
    header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
    eyebrow: {
      fontSize: font.size.xs,
      letterSpacing: 1.4,
      color: color.textSubtle,
      fontWeight: font.weight.semibold,
    },
    title: { color: color.textStrong, marginTop: 2 },
    subtitle: { fontSize: font.size.md, color: color.textMuted, marginTop: 3 },
    search: {
      marginHorizontal: spacing.lg,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.border,
    },
    searchInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    searchText: { fontSize: font.size.lg, color: color.textMuted },
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
    sectionLabel: {
      fontSize: font.size.xs,
      letterSpacing: 1.2,
      color: color.textSubtle,
      fontWeight: font.weight.semibold,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
    },
    listCard: {
      marginHorizontal: spacing.lg,
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.border,
      overflow: 'hidden',
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 56 },
    rowPressed: { backgroundColor: color.surfaceSoft },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginLeft: 40 },
    dot: { width: 11, height: 11, borderRadius: 999 },
    rowText: { flex: 1, gap: 1 },
    rowTitle: { fontSize: font.size.lg, color: color.textStrong, fontWeight: font.weight.semibold },
    rowMeta: { fontSize: font.size.sm, color: color.textMuted },
    emptyText: { fontSize: font.size.base, color: color.textMuted, padding: spacing.lg, textAlign: 'center' },
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
      ...{ shadowColor: '#1466E0', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
    },
    reportPillText: { fontSize: font.size.md, color: color.textOnBrand, fontWeight: font.weight.bold },
  });
