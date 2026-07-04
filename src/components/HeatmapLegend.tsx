import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { SEVERITY_ORDER, SEVERITY_LABELS } from '@/lib/flags';
import type { FlagSeverity } from '@/types/database';
import { color, font, radius, shadow, heatmapSeverity } from '@/theme';

/**
 * HeatmapLegend — compact severity key shown whenever the heat layer is
 * visible. Satisfies Jordan's pre-approval condition: "the severity scale
 * must be disclosed in the UI". Each swatch shows the colour + numeric
 * label + word so colorblind users have two non-colour signals.
 *
 * Swatch colors mirror the heatmapSeverity tokens (Dani D5 COMMIT) so
 * the legend always matches what the map layer actually renders.
 */
export default function HeatmapLegend() {
  return (
    <GlassSurface
      style={styles.container}
      borderRadius={radius.md}
      tint="light"
      tintColor="rgba(255,255,255,0.82)"
      solidColor="rgba(255,255,255,0.95)"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Heat map legend: 1 Minor yellow, 2 Mild orange, 3 Moderate orange-red, 4 Significant red, 5 Severe deep red"
    >
      <AppText
        variant="label"
        style={styles.title}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        Heat map
      </AppText>
      <View
        style={styles.row}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {SEVERITY_ORDER.map((s: FlagSeverity) => (
          <View key={s} style={styles.item}>
            <View style={[styles.swatch, { backgroundColor: heatmapSeverity[s].color }]} />
            <AppText variant="label" style={styles.label}>{`${s} ${SEVERITY_LABELS[s]}`}</AppText>
          </View>
        ))}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    // Frosted-glass surface via <GlassSurface>, pinned ALWAYS-LIGHT (literal
    // floors + static light inks) regardless of device theme. AA-by-
    // construction: a light floor + dark ink clears contrast over ANY tile —
    // including the web CartoDB dark_all basemap, which the old "basemap is
    // always light" note wrongly assumed (DESIGN.md fixed exception).
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    ...shadow.e1,
  },
  title: {
    fontSize: font.size.caption,
    fontWeight: font.weight.bold,
    // Literal #414B5A (not color.textMuted #666, which was 3.76:1 over dark
    // tiles seen through the 0.82 legend) — 5.79:1, pinned-light like the rest.
    color: '#414B5A',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: radius.xs,
  },
  label: {
    fontSize: font.size.caption,
    color: color.text,
    fontWeight: font.weight.semibold,
  },
});
