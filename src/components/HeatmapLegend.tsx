import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SEVERITY_ORDER, SEVERITY_LABELS, severityColor } from '@/lib/flags';
import type { FlagSeverity } from '@/types/database';
import { radius } from '@/theme';

/**
 * HeatmapLegend — compact severity key shown whenever the heat layer is
 * visible. Satisfies Jordan's pre-approval condition: "the severity scale
 * must be disclosed in the UI". Each swatch shows the colour + numeric
 * label + word so colorblind users have two non-colour signals.
 */
export default function HeatmapLegend() {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Heat map legend: 1 Minor green, 2 Mild light green, 3 Moderate yellow, 4 Significant orange, 5 Severe red"
    >
      <Text style={styles.title} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        Heat map
      </Text>
      <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {SEVERITY_ORDER.map((s: FlagSeverity) => (
          <View key={s} style={styles.item}>
            <View style={[styles.swatch, { backgroundColor: severityColor(s) }]} />
            <Text style={styles.label}>{`${s} ${SEVERITY_LABELS[s]}`}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555',
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
    borderRadius: 2,
  },
  label: {
    fontSize: 10,
    color: '#333',
    fontWeight: '600',
  },
});
