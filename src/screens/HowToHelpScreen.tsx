/**
 * HowToHelpScreen — modal overlay.
 *
 * A step-by-step guide to contributing to Flagstone:
 * report flags, verify flags, and spread the word.
 */
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  type Text,
  View,
} from 'react-native';
import { CheckCircle2, Flag, Heart, Star, Users, X } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { SheetGrabber } from '@/components/ui/Sheet';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Flag,
    number: '1',
    title: 'Report a problem',
    body: "Open the map and add a barrier wherever you see one — a broken sidewalk, missing ramp, blocked path, missing signal, or steep grade. Set how severe it is (signed-in users can add a photo, too) — a few seconds from you could save someone a real headache.",
  },
  {
    icon: CheckCircle2,
    number: '2',
    title: 'Verify flags near you',
    body: "Head to the Tasks tab to see flags waiting to be verified. Confirm the barrier is still there — or mark it resolved if it's been fixed. Verifying earns you points and keeps the map accurate.",
  },
  {
    icon: Users,
    number: '3',
    title: 'Spread the word',
    body: 'Share Flagstone with neighbours, local disability organisations, city councillors, and anyone who wants a more navigable community. The map only works if the community keeps it current.',
  },
  {
    icon: Star,
    number: '4',
    title: 'Earn points',
    body: "Every report and verification earns points on your profile. It's a small token — but it reflects real value your contributions add to the community.",
  },
];

// Seeds the top reserve for the single hidden pre-measure pass, before the
// chrome pane's real height lands via onLayout. SafeAreaView owns the device
// inset, so nothing device-specific is baked in (just the title-row height).
// G3: +12 for the grabber block (SheetGrabber's spacing.sm top + 4pt pill +
// spacing.tight bottom). The real height still arrives via onLayout — this only
// has to keep the ONE hidden pre-measure frame from reserving too little.
const HOWTOHELP_CHROME_FALLBACK = 84;

// Accent colors for each step icon — derived from theme tokens so they
// respond to dark mode. Semantics: report=error, verify=success, spread=brand, earn=amber.
function useStepColors() {
  const color = useColor();
  return [color.errorStrong, color.success, color.brand, color.accentOrange];
}

export default function HowToHelpScreen({ visible, onClose }: Props) {
  const color = useColor();
  const stepColors = useStepColors();
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): move the SR cursor onto the title when this surface opens.
  const titleRef = useFocusOnOpen<Text>(visible);
  const styles = makeStyles(color);
  // Chrome-pane height; null until the first onLayout — scroll hides that pass.
  const [chromeHeight, setChromeHeight] = useState<number | null>(null);
  const chromeTopPad = (chromeHeight ?? HOWTOHELP_CHROME_FALLBACK) + 10;

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      // Native iOS sheet swipe — see NearbyFlagsModal for the full why. One
      // gesture grammar across the pageSheet class; the Close button stays.
      allowSwipeDismissal
      aria-label="How To Help"
    >
      <SafeAreaView
        style={styles.root}
        // G1: pageSheet scene — no AVM by design (see ResourcesScreen).
        onAccessibilityEscape={onClose}
      >
        <ScreenStage />
        {/* Header -> ONE absolute i=24 chrome pane; content scrolls beneath it.
            SafeAreaView owns the device top inset, so the pane sits at top:0
            below it (no insets.top double-count). The pane's bottom edge/lip
            replaces the old header hairline. Rendered before the scroll so
            VoiceOver reads the header first; zIndex keeps it painted on top. */}
        <GlassSurface
          variant="chrome"
          borderRadius={0}
          style={styles.chromePane}
          onLayout={(e) => setChromeHeight(e.nativeEvent.layout.height)}
        >
          {/* G3 (§SKY-6): grabber above the title row, at the sheet's true top
              edge. Byte-identical placement to ResourcesScreen — the two share
              this chrome recipe and must not drift. Inside the measured pane,
              so chromeTopPad absorbs it on the first onLayout. */}
          <SheetGrabber />
          <View style={styles.headerRow}>
            <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">How To Help</AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: color.headerBtnBgPressed }]}
              accessibilityRole="button"
              accessibilityLabel="Close how to help"
            >
              {/* inkGlassMuted, not textSubtle (forbidden on chrome ~2.69:1);
                  arbitrated chrome-muted icon ink @ 1.4.11 min 3.0. */}
              <X size={24} color={color.inkGlassMuted} strokeWidth={2.2} />
            </Pressable>
          </View>
        </GlassSurface>

        <ScrollView
          style={[styles.scroll, chromeHeight === null && styles.scrollHidden]}
          contentContainerStyle={[styles.scrollContent, { paddingTop: chromeTopPad }]}
          scrollIndicatorInsets={{ top: chromeTopPad }}
          showsVerticalScrollIndicator={false}
        >
          {/* Intro sits directly on the stage — inkOnStage + >=500 weight. */}
          <AppText variant="bodyMedium" style={styles.intro}>
            Flagstone is built by people like you, one flag at a time. Here&apos;s how
            to make the biggest impact.
          </AppText>

          {STEPS.map((step, i) => (
            <GlassSurface
              key={step.number}
              variant="row"
              style={styles.stepCard}
              accessible
              accessibilityLabel={`Step ${step.number}: ${step.title}. ${step.body}`}
            >
              {/* Step-icon tints are DECORATIVE (a11y-hidden; each step's meaning
                  is carried by the adjacent title text), so under WCAG 1.4.11
                  they are exempt and NOT arbiter-declared — this preserves the
                  semantic palette (light success/amber would fail 3.0 on row
                  glass if forced to declare). */}
              <View
                style={[styles.stepIcon, { backgroundColor: stepColors[i] + '18' }]} {...decorativeProps}
              >
                <step.icon size={28} color={stepColors[i]} strokeWidth={2} />
              </View>
              <View style={styles.stepText}>
                <AppText variant="label" style={styles.stepTitle}>{step.title}</AppText>
                <AppText variant="bodyMedium" style={styles.stepBody}>{step.body}</AppText>
              </View>
            </GlassSurface>
          ))}

          <GlassSurface
            variant="banner"
            style={styles.callout}
            accessible
            accessibilityLabel="Every contribution — big or small — makes the world more accessible for people with mobility disabilities. Thank you."
          >
            {/* Heart is decorative (a11y-hidden) — same 1.4.11 exemption. */}
            <Heart
              size={18}
              color={color.brand}
              strokeWidth={2} {...decorativeProps}
            />
            <AppText variant="bodyMedium" style={styles.calloutText}>
              Every contribution — big or small — makes the world more accessible
              for people with mobility disabilities. Thank you.
            </AppText>
          </GlassSurface>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // Deep Field stage mid stop — matches the field before ScreenStage mounts
    // and in the safe-area inset strip above the stage.
    root: {
      flex: 1,
      backgroundColor: color.stage1,
    },
    // Absolute chrome glass pane (variant="chrome" supplies i=24 blur + floor +
    // bottom edge/lip — that edge IS the old header hairline now).
    chromePane: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
    },
    // Header content inside the pane — no border/background of its own now.
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    // Hides the scroll for the single pre-measure pass so its top pad never jumps.
    scrollHidden: { opacity: 0 },
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
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      // paddingTop is injected at the JSX site (chromeTopPad) so the top reserve
      // for the absolute chrome pane isn't overridden — keep only the bottom pad.
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    intro: {
      fontSize: font.size.base,
      // On the raw stage — inkOnStage, not textMuted (forbidden there, 4.10:1).
      color: color.inkOnStage,
      lineHeight: 22,
      marginBottom: spacing.sm,
    },
    // Row-glass card: layout + radius + light-mode lift on the OUTER style;
    // variant="row" supplies the floor/edge/specular (never a bg here).
    stepCard: {
      flexDirection: 'row',
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
      alignItems: 'flex-start',
      ...(color.scheme === 'light' ? shadow.e1 : {}),
    },
    stepIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    stepText: {
      flex: 1,
      gap: spacing.xs,
    },
    stepTitle: {
      fontSize: font.size.md,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    stepBody: {
      fontSize: font.size.sm,
      color: color.textMuted,
      lineHeight: 20,
    },
    // Banner-glass callout: variant="banner" supplies the brandSoft floor +
    // edge + specular; only layout + radius + light lift live here.
    callout: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      marginTop: spacing.sm,
      ...(color.scheme === 'light' ? shadow.e1 : {}),
    },
    calloutText: {
      flex: 1,
      fontSize: font.size.sm,
      // Banner ink law -> brandOnSoft (arbiter-legal on banner, both modes).
      color: color.brandOnSoft,
      lineHeight: 20,
    },
  });
