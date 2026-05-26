import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  severityColor,
  SEVERITY_COLOR_NAMES,
  SEVERITY_DESCRIPTIONS,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
} from '@/lib/flags';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function LegendModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close legend"
        accessibilityRole="button"
      >
        <Pressable
          style={styles.card}
          // Swallow taps on the card so they don't dismiss via the backdrop.
          onPress={() => {}}
          accessibilityViewIsModal
        >
          <View style={styles.headerRow} accessible accessibilityRole="header">
            <Text style={styles.title}>Map legend</Text>
          </View>
          <Text style={styles.subtitle}>What the colors and categories on the map mean.</Text>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionLabel} accessibilityRole="header">
              Severity
            </Text>
            {SEVERITY_ORDER.map((s) => {
              const color = severityColor(s);
              const label = SEVERITY_LABELS[s];
              const colorName = SEVERITY_COLOR_NAMES[s];
              const desc = SEVERITY_DESCRIPTIONS[s];
              return (
                <View
                  key={s}
                  style={styles.row}
                  accessible
                  accessibilityLabel={`Severity ${s}, ${label}. ${colorName}. ${desc}`}
                >
                  <View
                    style={[styles.sevDot, { backgroundColor: color }]}
                    importantForAccessibility="no"
                    accessibilityElementsHidden
                  >
                    <Text style={styles.sevDotText}>{s}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>
                      {s} — {label}
                    </Text>
                    <Text style={styles.rowDesc}>{desc}</Text>
                  </View>
                </View>
              );
            })}

            <Text
              style={[styles.sectionLabel, styles.sectionLabelSpaced]}
              accessibilityRole="header"
            >
              Categories
            </Text>
            {CATEGORY_ORDER.map((c) => {
              const label = CATEGORY_LABELS[c];
              const desc = CATEGORY_DESCRIPTIONS[c];
              return (
                <View
                  key={c}
                  style={styles.row}
                  accessible
                  accessibilityLabel={`${label}. ${desc}`}
                >
                  <View
                    style={styles.catIconWrap}
                    importantForAccessibility="no"
                    accessibilityElementsHidden
                  >
                    <Text style={styles.catIconText}>{CATEGORY_ICONS[c]}</Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{label}</Text>
                    <Text style={styles.rowDesc}>{desc}</Text>
                  </View>
                </View>
              );
            })}

            <Text style={styles.footnote}>
              Reporters earn points when their flag is verified or resolved. Verifiers and resolvers
              earn points too.
            </Text>
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close legend"
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 8,
    maxHeight: '85%',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: '#222' },
  subtitle: { fontSize: 13, color: '#666' },
  scroll: { marginTop: 4 },
  scrollContent: { paddingBottom: 8, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 2,
    fontWeight: '700',
  },
  sectionLabelSpaced: { marginTop: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  sevDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevDotText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eef1f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconText: { fontSize: 16 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#222' },
  rowDesc: { fontSize: 12, color: '#555', marginTop: 1 },
  footnote: {
    fontSize: 12,
    color: '#666',
    marginTop: 14,
    fontStyle: 'italic',
  },
  closeBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#eef1f5',
    alignItems: 'center',
  },
  closeText: { color: '#333', fontWeight: '700', fontSize: 15 },
});
