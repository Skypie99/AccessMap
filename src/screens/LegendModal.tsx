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
import { font, radius, severity, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import CategoryIcon from '@/components/CategoryIcon';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { Check } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function LegendModal({ visible, onClose }: Props) {
  const color = useColor();
  const reducedMotion = useReducedMotion();
  const styles = makeStyles(color);
  // WCAG 2.4.3: move the screen-reader cursor onto the header when the modal opens.
  const titleRef = useFocusOnOpen<View>(visible);
  return (
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose} aria-label="Map legend">
      <View style={styles.backdrop}>
        {/* S9 (L6-21): the scrim is an absolute SIBLING of the card, not its
            ancestor — a screen reader never lands on a giant "Close" button that
            wraps the whole dialog. Hidden from the a11y tree on web; SR users
            close via the in-card "Close" button below. Native VoiceOver is
            trapped in the card (accessibilityViewIsModal) so tap-to-dismiss on
            the scrim stays a sighted-only affordance. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close legend"
          accessibilityRole="button"
          aria-hidden={true}
        />
        <Pressable
          style={styles.cardShell}
          // Swallow taps on the card so they don't dismiss via the backdrop.
          // (The tap-swallow + accessibilityViewIsModal stay on this Pressable;
          //  the bulk-glass material is the child so the guard is preserved.)
          onPress={() => {}}
          accessibilityViewIsModal
        >
        <GlassSurface variant="bulk" borderRadius={0} style={styles.card}>
          <View ref={titleRef} style={styles.headerRow} accessible accessibilityRole="header">
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
                    <AppText variant="label" style={[styles.sevDotText, { color: severity[s].textOnColor }]}>{s}</AppText>
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
              Status
            </AppText>
            {/* S1: define the trust word "Verified" in one line — the first place
                any decision surface says what it means (reuses the FAQ sentence). */}
            <AppText variant="body" style={styles.rowDesc}>
              Open — reported, not yet checked. Verified — another person checked the spot and
              confirmed the issue is real. Resolved — the issue has been fixed.
            </AppText>
            {/* The two visual channels a sighted user decodes on the map itself. */}
            <View
              style={styles.row}
              accessible
              accessibilityLabel="Anonymous report. Shown with a double ring and keeps its severity colour."
            >
              <View style={styles.statusSwatch} importantForAccessibility="no" accessibilityElementsHidden>
                <View style={styles.anonRingOuter}>
                  <View style={[styles.statusDot, { backgroundColor: severityColor(3) }]} />
                </View>
              </View>
              <View style={styles.rowText}>
                <AppText variant="label" style={styles.rowTitle}>Anonymous report</AppText>
                <AppText variant="body" style={styles.rowDesc}>
                  Reported without an account. Shown with a double ring; still carries its severity colour.
                </AppText>
              </View>
            </View>
            <View
              style={styles.row}
              accessible
              accessibilityLabel="Resolved. Marked with a checkmark and keeps its severity colour."
            >
              <View style={styles.statusSwatch} importantForAccessibility="no" accessibilityElementsHidden>
                <View style={styles.hairlineRing}>
                  <View style={[styles.statusDot, { backgroundColor: severityColor(3) }]}>
                    <Check size={14} color="#fff" strokeWidth={3} />
                  </View>
                </View>
              </View>
              <View style={styles.rowText}>
                <AppText variant="label" style={styles.rowTitle}>Resolved</AppText>
                <AppText variant="body" style={styles.rowDesc}>
                  The issue has been fixed. Marked with a checkmark; keeps its severity colour.
                </AppText>
              </View>
            </View>

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
        </GlassSurface>
        </Pressable>
      </View>
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
  // Tap-swallow shell (the Pressable) — bounds the sheet height; the bulk-glass
  // material is its child, so the backdrop-dismiss guard is preserved. No fill.
  cardShell: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
  },
  card: {
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    gap: spacing.sm,
    flexShrink: 1,
    // The bulk variant owns the surface; clip it to the rounded top.
    overflow: 'hidden',
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
    color: color.inkGlassMuted,
    fontFamily: font.family.bodyMedium,
    lineHeight: 18,
  },
  scroll: { marginTop: spacing.tight, flexShrink: 1 },
  scrollContent: { paddingBottom: spacing.sm, gap: spacing.sm + 2 },
  sectionLabel: {
    fontSize: font.size.caption,
    color: color.inkGlassMuted,
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
  // Status legend swatches — miniature pin representations (decorative; the
  // meaning is carried by the row text). The double ring = anonymous provenance;
  // the checkmark = resolved. Both keep the severity fill (S1 / L8-7).
  statusSwatch: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: radius.circle,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hairlineRing: {
    borderRadius: radius.circle,
    borderWidth: 1.5,
    borderColor: '#0F1B2D',
  },
  anonRingOuter: {
    borderRadius: radius.circle,
    borderWidth: 1.5,
    borderColor: '#0F1B2D',
    padding: 2,
  },
  rowText: { flex: 1 },
  rowTitle: {
    fontSize: font.size.base,
    fontWeight: font.weight.semibold,
    color: color.textStrong,
  },
  rowDesc: {
    fontSize: font.size.xs,
    color: color.text,
    // On-glass body carries the ≥500 weight (GLASS §2); color.text clears AA on
    // the bulk floor over the worst-case map backdrop (arbiter-declared).
    fontFamily: font.family.bodyMedium,
    marginTop: 1,
    lineHeight: 16,
  },
  footnote: {
    fontSize: font.size.xs,
    color: color.inkGlassMuted,
    fontFamily: font.family.bodyMedium,
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
    justifyContent: 'center',
    minHeight: 44, // WCAG 2.5.5 / Apple HIG touch target (matches sibling modal close buttons)
  },
  closeText: {
    color: color.text,
    fontWeight: font.weight.bold,
    fontSize: font.size.md,
  },
});
