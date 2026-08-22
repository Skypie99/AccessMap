/**
 * PrivacyScreen — the Privacy Policy, readable inside the app.
 *
 * WHY THIS EXISTS. Apple 5.1.1(i) requires the policy to be reachable "within
 * the app in an easily accessible manner", not only from App Store Connect
 * metadata — and B-3 required more than reachability: the LIVE policy had
 * drifted six ways from the shipped app (`04 §A-14`), which is a 5.1.1
 * accuracy problem reviewers cross-read against the nutrition labels. Sky
 * ratified a rewrite (§SKY-8) and corrected two more claims the build run's
 * verification caught (§SKY-9). This is where it lands.
 *
 * ⚑ THIS SCREEN RENDERS, IT DOES NOT AUTHOR. Every visible string comes from
 * `PRIVACY_*` in `@/lib/copy`, a verbatim transcription of
 * `15_PRIVACY_POLICY_v1.md` guarded in both directions by
 * `privacy.guard.test.ts`. If a word here looks wrong, it is wrong in Sky's
 * document and only she may change it.
 *
 * SHAPE. Identical to `TermsScreen` — a pageSheet on the ResourcesScreen
 * grammar, the house pattern for long scrolling prose. Navigation is tab-only
 * (no Stacks), so like every other informational surface it is a Modal that
 * presents as a sheet, mounted ONCE in <SharedModalsHost /> so About and the
 * sign-in cover can each open it over themselves.
 *
 * THE URL DID NOT GO AWAY. `PRIVACY_POLICY_URL` still exists and still matches
 * `app.json`'s `privacyPolicyUrl`, because App Store Connect requires a
 * reachable URL and hosting it is Sky-physical (§SKY-8 P-3). What changed is
 * that the three in-app entry points now open THIS instead of a browser.
 */
import React, { useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, type Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { SheetGrabber } from '@/components/ui/Sheet';
import {
  PRIVACY_EFFECTIVE,
  PRIVACY_POLICY_LINK_LABEL,
  PRIVACY_SECTIONS,
  PRIVACY_TITLE,
} from '@/lib/copy';
import { useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { font, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Seeds the top reserve for the single hidden pre-measure pass, before the
// chrome pane's real height lands via onLayout. Same sizing as TermsScreen's —
// grabber block + one header row + padding; SafeAreaView owns the device inset.
const PRIVACY_CHROME_FALLBACK = 84;

export default function PrivacyScreen({ visible, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): move the SR cursor onto the title when this surface opens.
  const titleRef = useFocusOnOpen<Text>(visible);
  // No C-lite wiring, as in TermsScreen: `forceEngineered` threads lite mode to
  // ROW-tier panes only, and this screen's single pane is chrome.
  const [chromeHeight, setChromeHeight] = useState<number | null>(null);
  const chromeTopPad = (chromeHeight ?? PRIVACY_CHROME_FALLBACK) + 10;

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      // Native iOS sheet swipe — see NearbyFlagsModal for the full why. One
      // gesture grammar across the pageSheet class; the Close button stays.
      allowSwipeDismissal
      aria-label={PRIVACY_POLICY_LINK_LABEL}
    >
      <SafeAreaView
        style={styles.root}
        // G1: a pageSheet is its own UIKit scene, so it correctly carries NO
        // accessibilityViewIsModal — the scene boundary already provides
        // containment. The escape gesture still needs a real View to land on,
        // and this root is it. Handler is identical to onRequestClose, which is
        // what dismissalStandard.guard.test.ts assertion B checks.
        onAccessibilityEscape={onClose}
      >
        {/* S3: no pools behind a legal document — the body below renders on
            flat `color.surface`. The stage stays mounted so the safe-area strip
            and any pre-layout frame still match the field. */}
        <ScreenStage strength={0} />
        <GlassSurface
          variant="chrome"
          borderRadius={0}
          style={styles.chromePane}
          onLayout={(e) => setChromeHeight(e.nativeEvent.layout.height)}
        >
          <SheetGrabber />
          <View style={styles.headerRow}>
            {/* The chrome says where you are; the document below says what it
                is. Splitting them keeps the header short enough to stay one or
                two lines at AX5, where the full title would eat the sheet. */}
            <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
              {PRIVACY_POLICY_LINK_LABEL}
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: color.headerBtnBgPressed }]}
              accessibilityRole="button"
              accessibilityLabel="Close privacy policy"
            >
              {/* inkGlassMuted, not textSubtle (forbidden on chrome ~2.69:1);
                  arbitrated chrome-muted icon ink 4.81:1 light / 5.43:1 dark. */}
              <X size={24} color={color.inkGlassMuted} strokeWidth={2.2} />
            </Pressable>
          </View>
        </GlassSurface>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingTop: chromeTopPad }]}
          style={[styles.bodySurface, chromeHeight === null && styles.bodyHidden]}
          scrollIndicatorInsets={{ top: chromeTopPad }}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="heading" style={styles.docTitle} accessibilityRole="header">
            {PRIVACY_TITLE}
          </AppText>
          <AppText variant="body" style={styles.effective}>
            {PRIVACY_EFFECTIVE}
          </AppText>

          {PRIVACY_SECTIONS.map((s) => (
            // Heading and body are separate elements rather than one run of
            // rich text: a screen reader can then jump the document by heading,
            // which is the only practical way to navigate a policy non-visually.
            <View key={s.heading} style={styles.section}>
              <AppText variant="label" style={styles.sectionHeading} accessibilityRole="header">
                {s.heading}
              </AppText>
              {/* On the raw stage — inkOnStage, not textMuted (forbidden there,
                  4.10:1 over the pool's darkest stop). inkOnStage = 4.83:1
                  light / 6.29:1 dark. */}
              <AppText variant="body" style={styles.sectionBody}>
                {s.body}
              </AppText>
            </View>
          ))}
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
    chromePane: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    // S3: a long read sits on flat surface, not on the stage. The pools are
    // already off (strength 0); this is the other half of the rule — the body
    // itself is an opaque page. The chrome pane still floats above it and
    // blurs it, which only lightens the worst case its floor was measured
    // against, so no ink here needs re-arbitrating.
    bodySurface: { backgroundColor: color.surface },
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
      paddingBottom: spacing.xxxl,
    },
    docTitle: {
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      lineHeight: 24,
    },
    effective: {
      fontSize: font.size.sm,
      color: color.inkOnStage,
      lineHeight: 20,
      marginTop: spacing.tight,
      marginBottom: spacing.lg,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionHeading: {
      fontSize: font.size.lg,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
      lineHeight: 22,
      marginBottom: spacing.xs,
    },
    sectionBody: {
      fontSize: font.size.base,
      color: color.inkOnStage,
      lineHeight: 22,
    },
  });
