/**
 * ResourcesScreen — modal overlay.
 *
 * A curated, evergreen list of accessibility resources that complement the map:
 * where to report barriers, who pushes for fixes, and how to plan around them.
 *
 * Content is intentionally URL-light: each entry is genuinely useful as guidance
 * on its own, and any entry becomes a tappable external link the moment a `url`
 * is supplied (TODO(Sky): drop in the specific links you want to point at — the
 * cards render as plain info cards until then, so nothing ever shows a dead link).
 */
import React, { useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  BookOpen,
  Building2,
  ExternalLink,
  Heart,
  Map as MapIcon,
  Navigation,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { hydrateGlassMode, useGlassMode } from '@/lib/glassMode';
import { useReducedMotion } from '@/lib/accessibility';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface Resource {
  icon: LucideIcon;
  title: string;
  blurb: string;
  /** Optional external link. Add one to make the card tappable. */
  url?: string;
}

// Evergreen, non-controversial categories that complement crowdsourced flagging.
// Add a `url` to any entry to turn its card into a tappable link.
const RESOURCES: Resource[] = [
  {
    icon: Building2,
    title: 'Report it to your city',
    blurb:
      'Most municipalities take sidewalk, curb-ramp, and crossing-signal requests directly — often through a 311 service or a public-works web form.',
  },
  {
    icon: Users,
    title: 'Local advocacy groups',
    blurb:
      'Disability advocacy organizations know your area’s process and help push reported barriers toward real fixes.',
  },
  {
    icon: MapIcon,
    title: 'Accessibility maps',
    blurb:
      'Community apps that rate places by step-free access complement the barriers you flag here.',
  },
  {
    icon: Navigation,
    title: 'Step-free route planners',
    blurb:
      'Transit and mapping tools that plan routes avoiding stairs and steep grades for wheels, strollers, and tired legs.',
  },
  {
    icon: BookOpen,
    title: 'Know your rights',
    blurb:
      'National disability-rights resources explain accessibility laws and how to escalate a barrier that isn’t getting fixed.',
  },
  {
    icon: Heart,
    title: 'Support & community',
    blurb:
      'Peer communities share local, lived-experience knowledge about what’s accessible and what to route around.',
  },
];

// Seeds the top reserve for the single hidden pre-measure pass, before the
// chrome pane's real height lands via onLayout (single header row + padding).
// SafeAreaView owns the device inset, so no insets are baked in here.
const RESOURCES_CHROME_FALLBACK = 72;

export default function ResourcesScreen({ visible, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const reducedMotion = useReducedMotion();
  // C-lite runtime mode (GLASS.md §4): read-only here — the long-press toggle
  // lives on the Tasks header; this modal just respects a flip via the store.
  const glassLite = useGlassMode() === 'lite';
  useEffect(() => {
    void hydrateGlassMode();
  }, []);
  // Measured height of the absolute chrome glass pane; null until the first
  // onLayout — the body hides for that one pass so its top pad never jumps.
  const [chromeHeight, setChromeHeight] = useState<number | null>(null);
  const chromeTopPad = (chromeHeight ?? RESOURCES_CHROME_FALLBACK) + 10;

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root}>
        <ScreenStage />
        {/* The header is now ONE absolute i=24 chrome pane; content scrolls
            beneath it (onLayout feeds the top reserve). SafeAreaView already
            owns the device top inset, so the pane sits at top:0 below it — no
            insets.top here (that would double-count under SafeAreaView). The
            pane's bottom edge/lip replaces the old header hairline. */}
        <GlassSurface
          variant="chrome"
          borderRadius={0}
          style={styles.chromePane}
          onLayout={(e) => setChromeHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.headerRow}>
            <AppText variant="heading" style={styles.title} accessibilityRole="header">Resources</AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close resources"
            >
              {/* inkGlassMuted, not textSubtle (forbidden on chrome ~2.69:1);
                  arbitrated chrome-muted icon ink 4.81:1 light / 5.43:1 dark. */}
              <X size={24} color={color.inkGlassMuted} strokeWidth={2.2} />
            </Pressable>
          </View>
        </GlassSurface>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingTop: chromeTopPad }]}
          style={chromeHeight === null && styles.bodyHidden}
          scrollIndicatorInsets={{ top: chromeTopPad }}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="body" style={styles.intro}>
            Flagging a barrier is the first step. These resources help get it fixed —
            and help you plan around it in the meantime.
          </AppText>

          {RESOURCES.map((r) => {
            const Icon = r.icon;
            const linked = !!r.url;
            const inner = (
              <>
                <View
                  style={styles.cardIcon}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <Icon size={24} color={color.brand} strokeWidth={2} />
                </View>
                <View style={styles.cardText}>
                  <View style={styles.cardTitleRow}>
                    <AppText variant="label" style={styles.cardTitle}>{r.title}</AppText>
                    {linked && (
                      <ExternalLink size={16} color={color.textMuted} strokeWidth={2} />
                    )}
                  </View>
                  {/* bodyMedium (>=500): body text on row glass must carry
                      >=500 weight — the 400 face hazes against blur. */}
                  <AppText variant="bodyMedium" style={styles.cardBlurb}>{r.blurb}</AppText>
                </View>
              </>
            );

            // Each card is a pane of ROW glass (i=12 + floor + hairlines).
            // Linked: the Pressable stays the interactive/a11y root (outer),
            // GlassSurface is material only (inner) — matching the Tasks
            // FlagCard recipe. forceEngineered threads C-lite to rows only.
            return linked ? (
              <Pressable
                key={r.title}
                onPress={() => { void Linking.openURL(r.url as string); }}
                style={({ pressed }) => (pressed ? styles.cardPressed : null)}
                accessibilityRole="link"
                accessibilityLabel={`${r.title}. ${r.blurb}`}
                accessibilityHint="Opens in your browser"
              >
                <GlassSurface variant="row" forceEngineered={glassLite} style={styles.card}>
                  {inner}
                </GlassSurface>
              </Pressable>
            ) : (
              <GlassSurface
                key={r.title}
                variant="row"
                forceEngineered={glassLite}
                style={styles.card}
                accessible
                accessibilityLabel={`${r.title}. ${r.blurb}`}
              >
                {inner}
              </GlassSurface>
            );
          })}

          <AppText variant="body" style={styles.footnote}>
            AccessMap is community-powered — these are starting points, not endorsements.
          </AppText>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // The Deep Field stage's mid stop — any frame before ScreenStage mounts
    // (and the safe-area inset strip above the stage) matches the field.
    root: {
      flex: 1,
      backgroundColor: color.stage1,
    },
    // The absolute chrome glass pane (variant="chrome" supplies i=24 blur +
    // floor + bottom edge/lip — the old header hairline IS that edge now).
    chromePane: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
    },
    // Header content inside the pane — no border/background of its own now
    // (the chrome material supplies both).
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    // Hides the body for the single pre-measure pass so its top pad never jumps.
    bodyHidden: { opacity: 0 },
    title: {
      flex: 1,
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    closeBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    intro: {
      fontSize: font.size.base,
      // On the raw stage — inkOnStage, not textMuted (forbidden there,
      // 4.10:1 over the pool's darkest stop). inkOnStage = 4.83:1 / 6.29:1.
      color: color.inkOnStage,
      lineHeight: 22,
      marginBottom: spacing.xs,
    },
    // Row-glass card: layout + radius + lift live on the GlassSurface OUTER
    // style; the material (floor + edge + specular) comes from variant="row" —
    // never a backgroundColor/border here (the clip layer swallows them).
    card: {
      flexDirection: 'row',
      gap: spacing.md,
      borderRadius: radius.lg,
      padding: spacing.lg,
      minHeight: 44,
      // Light-mode lift only; dark is luminosity-led (edge hairlines carry the
      // lift, drop shadows retire) — matches the Tasks row (GLASS.md §2).
      ...(color.scheme === 'light' ? shadow.e1 : {}),
    },
    cardPressed: {
      opacity: 0.92,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: color.brandSofter,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardText: {
      flex: 1,
      gap: spacing.tight,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    cardTitle: {
      flex: 1,
      fontSize: font.size.lg,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
    },
    cardBlurb: {
      fontSize: font.size.sm,
      color: color.textMuted,
      lineHeight: 20,
    },
    footnote: {
      fontSize: font.size.xs,
      // On the raw stage — inkOnStage (see intro).
      color: color.inkOnStage,
      textAlign: 'center',
      lineHeight: 17,
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
    },
  });
