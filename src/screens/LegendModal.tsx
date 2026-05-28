import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { color, font, radius, spacing } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function LegendModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
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
          <View
            style={styles.headerRow}
            accessible
            accessibilityRole="header"
          >
            <Text style={styles.title}>Map legend</Text>
          </View>
          <Text style={styles.subtitle}>
            What the colors and categories on the map mean.
          </Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            <Text
              style={styles.sectionLabel}
              accessibilityRole="header"
            >
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
              Reporters earn points when their flag is verified or resolved.
              Verifiers and resolvers earn points too.
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
    backgroundColor: color.scrim,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: color.surface,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.sm,
    maxHeight: '85%',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: {
    fontSize: font.size.xxl,
    fontWeight: font.weight.bold,
    color: color.textStrong,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: font.size.sm,
    color: color.textMuted,
    lineHeight: 18,
  },
  scroll: { marginTop: spacing.tight },
  scrollContent: { paddingBottom: spacing.sm, gap: spacing.sm + 2 },
  sectionLabel: {
    fontSize: font.size.caption,
    color: color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.tight,
    marginBottom: 2,
    fontWeight: font.weight.bold,
  },
  sectionLabelSpaced: { marginTop: spacing.lg - 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  sevDot: {
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevDotText: {
    color: color.textOnBrand,
    fontWeight: font.weight.bold,
    fontSize: font.size.base,
  },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.circle,
    backgroundColor: color.surfaceNeutral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconText: { fontSize: font.size.lg },
  rowText: { flex: 1 },
  rowTitle: {
    fontSize: font.size.base,
    fontWeight: font.weight.semibold,
    color: color.textStrong,
  },
  rowDesc: {
    fontSize: font.size.xs,
    color: color.text,
    marginTop: 1,
    lineHeight: 16,
  },
  footnote: {
    fontSize: font.size.xs,
    color: color.textMuted,
    marginTop: spacing.lg - 2,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  closeBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
    backgroundColor: color.surfaceNeutral,
    alignItems: 'center',
  },
  closeText: {
    color: color.text,
    fontWeight: font.weight.bold,
    fontSize: font.size.md,
  },
});
