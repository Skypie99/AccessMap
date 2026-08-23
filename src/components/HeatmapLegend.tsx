import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { PressableScale } from '@/components/ui/PressableScale';
import { decorativeProps } from '@/lib/accessibility';
import { SEVERITY_ORDER, SEVERITY_LABELS } from '@/lib/flags';
import type { FlagSeverity } from '@/types/database';
import { a11y, font, radius, shadow, heatmapSeverity } from '@/theme';

const LEGEND_LABEL =
  'Heat map legend: 1 Minor yellow, 2 Mild orange, 3 Moderate orange-red, 4 Significant red, 5 Severe deep red';

// The always-light pin shared by BOTH the expanded legend and the collapsed
// "Legend" chip — SINGLE-SOURCED so their transparency can never drift apart
// (Sky's parity requirement: closed and open read at the exact same
// transparency). 0.65 floor + #222 ink = 6.52:1 over any tile (arbiter).
const PIN_TINT = 'rgba(255,255,255,0.65)';
const PIN_SOLID = 'rgba(255,255,255,0.95)';

/**
 * HeatmapLegend — compact severity key shown whenever the heat layer is
 * visible. Satisfies Jordan's pre-approval condition: "the severity scale
 * must be disclosed in the UI". Each swatch shows the colour + numeric
 * label + word so colorblind users have two non-colour signals.
 *
 * Swatch colors mirror the heatmapSeverity tokens (Dani D5 COMMIT) so
 * the legend always matches what the map layer actually renders.
 *
 * Map-chrome compaction (Sky-locked B-refined, 2026-08-12):
 *  - The always-light pin floor drops 0.82 → 0.65 (very transparent) and inks
 *    darken to #222 (arbiter 6.52:1 worst-case over the 0.65 pin).
 *  - A close X collapses the legend to a min-44pt "Legend" chip; tapping the
 *    chip re-expands. The severity-scale disclosure stays ONE tap away in the
 *    collapsed state, so the Jordan condition it exists to satisfy still holds.
 *  - AUTO RE-EXPAND: MapScreen renders <HeatmapLegend/> only while the heat
 *    layer is on, so toggling heat off→on unmounts+remounts this component and
 *    `collapsed` resets to false — the spec's "resets to expanded on heat
 *    re-enable" behaviour falls out of the render condition for free.
 *  - A11Y-213 restructure: the GlassSurface container is NOT an accessible leaf
 *    (that would swallow the X). A summary node carries the image semantics +
 *    label; the close X is its own reachable button; the collapsed chip is a
 *    separate render branch.
 */
export default function HeatmapLegend() {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    // Collapsed "Legend" chip — keeps the disclosure one tap away.
    return (
      <PressableScale
        style={styles.chip}
        onPress={() => setCollapsed(false)}
        accessibilityRole="button"
        accessibilityLabel="Show heat map legend"
      >
        <GlassSurface
          style={StyleSheet.absoluteFill}
          borderRadius={radius.circle}
          tint="light"
          tintColor={PIN_TINT}
          solidColor={PIN_SOLID}
          pointerEvents="none"
        />
        <View style={[styles.chipSwatch, { backgroundColor: heatmapSeverity[3].color }]} {...decorativeProps} />
        <AppText variant="label" style={styles.chipText}>Legend</AppText>
      </PressableScale>
    );
  }

  return (
    <GlassSurface
      style={styles.container}
      borderRadius={radius.md}
      tint="light"
      tintColor={PIN_TINT}
      solidColor={PIN_SOLID}
    >
      {/* Summary node — carries the whole legend as ONE image element with its
          descriptive label (A11Y-213: the container stays a plain View so the
          close X below is reachable). */}
      <View
        style={styles.summary}
        accessible
        accessibilityRole="image"
        accessibilityLabel={LEGEND_LABEL}
      >
        <AppText variant="label" style={styles.title} {...decorativeProps}>
          Heat map
        </AppText>
        <View style={styles.row} {...decorativeProps}>
          {SEVERITY_ORDER.map((s: FlagSeverity) => (
            <View key={s} style={styles.item}>
              <View style={[styles.swatch, { backgroundColor: heatmapSeverity[s].color }]} />
              <AppText variant="label" style={styles.label}>{`${s} ${SEVERITY_LABELS[s]}`}</AppText>
            </View>
          ))}
        </View>
      </View>
      {/* Close X — its own reachable button; collapses to the chip. SW-35: this
          used the house "24pt box + 12 slop" idiom, but the box is pinned to
          top:2/right:2, so 10pt of that slop fell OUTSIDE the GlassSurface —
          the one place the idiom does not hold. The touch box is a real 44 now,
          reaching inward over non-interactive labels instead of outward over
          nothing. The visible glyph has not moved. */}
      <Pressable
        style={styles.close}
        onPress={() => setCollapsed(true)}
        accessibilityRole="button"
        accessibilityLabel="Collapse heat map legend"
      >
        <View style={styles.closeGlyph}>
          <X size={14} color="#414B5A" strokeWidth={2.6} />
        </View>
      </Pressable>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    // Frosted-glass surface via <GlassSurface>, pinned ALWAYS-LIGHT (literal
    // floors + static light inks) regardless of device theme. AA-by-
    // construction: a light 0.65 floor + #222 ink clears contrast over ANY tile
    // (arbiter 6.52:1 worst-case). paddingRight leaves room for the close X.
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingRight: 30,
    paddingVertical: 8,
    gap: 4,
    ...shadow.e1,
  },
  summary: { gap: 4 },
  // Absolute top-right so it doesn't push the swatches; the paddingRight above
  // reserves its lane.
  close: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: a11y.minTargetSize,
    height: a11y.minTargetSize,
    // flex-end/flex-start + 2pt pad lands the glyph box at exactly the old
    // top:2 / right:2, so the legend looks identical.
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 2,
  },
  closeGlyph: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: font.size.caption,
    fontWeight: font.weight.bold,
    // Darkened #414B5A → #222 for the 0.65 crystal pin (6.52:1). Pinned-light.
    color: '#222',
    textTransform: 'uppercase',
    letterSpacing: font.tracking.loose,
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
    // Darkened to #222 for the 0.65 pin (was color.text on the 0.82 floor).
    color: '#222',
    fontWeight: font.weight.semibold,
  },
  // Collapsed chip — min 44pt pill (swatch + "Legend"), the same 0.65 pin.
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: radius.circle,
    ...shadow.e1,
  },
  chipSwatch: {
    width: 10,
    height: 10,
    borderRadius: radius.xs,
  },
  chipText: {
    fontSize: font.size.caption,
    fontWeight: font.weight.bold,
    color: '#222',
  },
});
