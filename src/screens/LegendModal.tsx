import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  severityColor,
  SEVERITY_COLOR_NAMES,
  SEVERITY_DESCRIPTIONS,
  SEVERITY_LABELS,
  SEVERITY_ORDER,
} from '@/lib/flags';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import CategoryIcon from '@/components/CategoryIcon';
import { AppText } from '@/components/ui/AppText';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function LegendModal({ visible, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
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
            <AppText variant="heading" style={styles.title}>Map legend</AppText>
          </View>
          <AppText variant="body" style={styles.subtitle}>What the colors and categories on the map mean.</AppText>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <AppText variant="heading" style={styles.sectionLabel} accessibilityRole="header">
              Severity
            </AppText>
            {SEVERITY_ORDER.map((s) => {
              const sevColor = severityColor(s);
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
                    style={[styles.sevDot, { backgroundColor: sevColor }]}
                    importantForAccessibility="no"
                    accessibilityElementsHidden
                  >
                    <AppText variant="label" style={styles.sevDotText}>{s}</AppText>
                  </View>
                  <View style={styles.rowText}>
                    <AppText variant="label" style={styles.rowTitle}>
                      {s} — {label}
                    </AppText>
                    <AppText variant="body" style={styles.rowDesc}>{desc}</AppText>
                  </View>
                </View>
              );
            })}

            <AppText
              variant="heading"
              style={[styles.sectionLabel, styles.sectionLabelSpaced]}
              accessibilityRole="header"
            >
              Categories
            </AppText>
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
                    <CategoryIcon category={c} size={20} color={color.brand} decorative />
                  </View>
                  <View style={styles.rowText}>
                    <AppText variant="label" style={styles.rowTitle}>{label}</AppText>
                    <AppText variant="body" style={styles.rowDesc}>{desc}</AppText>
                  </View>
                </View>
              );
            })}

            <AppText
              variant="heading"
              style={[styles.sectionLabel, styles.sectionLabelSpaced]}
              accessibilityRole="header"
            >
              Heat map
            </AppText>
            <AppText variant="body" style={styles.rowDesc}>
              When the heat map is on, neighbourhoods are tinted by their MEAN severity (using the
              1–5 scale above) and labelled with the rounded value. To protect reporters, heat zones
              only appear where at least 3 flags have been submitted.
            </AppText>

            <AppText variant="body" style={styles.footnote}>
              Reporters earn points when their flag is verified or resolved. Verifiers and resolvers
              earn points too.
            </AppText>
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close legend"
          >
            <AppText variant="label" style={styles.closeText}>Close</AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
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
