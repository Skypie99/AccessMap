/**
 * TermsScreen — the Terms & Community Guidelines, readable inside the app.
 *
 * WHY THIS EXISTS. Apple Guideline 1.2 expects the terms a user agrees to — and
 * the guidelines their content is judged against — to be readable *in the app*,
 * not only in store metadata. Sky ratified the text on 2026-07-27; for a day it
 * lived only as a markdown file in the repo, so the app cited community
 * guidelines in three places while containing none. `§SKY-6` closes that.
 *
 * ⚑ THIS SCREEN RENDERS, IT DOES NOT AUTHOR. Every visible string comes from
 * `TERMS_*` in `@/lib/copy`, which is a verbatim transcription of
 * `14_MODERATION_TEXTS_v1.md` §1 guarded by `terms.guard.test.ts`. If a word
 * here looks wrong, it is wrong in Sky's document and only she may change it.
 *
 * SHAPE. A pageSheet, modelled on ResourcesScreen — the house grammar for long
 * scrolling prose. The app's navigation is tab-only (no Stacks), so, like every
 * other informational surface here, it is a Modal that presents as a sheet.
 * It is mounted ONCE in <SharedModalsHost />, which is what lets About and the
 * report sheet each open it over themselves.
 */
import React, { useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, type Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { SheetGrabber } from '@/components/ui/Sheet';
import { TERMS_EFFECTIVE, TERMS_LINK_LABEL, TERMS_SECTIONS, TERMS_TITLE } from '@/lib/copy';
import { useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import { font, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Seeds the top reserve for the single hidden pre-measure pass, before the
// chrome pane's real height lands via onLayout. Sized like ResourcesScreen's —
// grabber block + one header row + padding; SafeAreaView owns the device inset.
const TERMS_CHROME_FALLBACK = 84;

export default function TermsScreen({ visible, onClose }: Props) {
  const color = useColor();
  const styles = makeStyles(color);
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): move the SR cursor onto the title when this surface opens.
  const titleRef = useFocusOnOpen<Text>(visible);
  // No C-lite wiring here, unlike ResourcesScreen: `forceEngineered` threads the
  // lite mode to ROW-tier panes only, and this screen's single pane is chrome.
  // Reading the store would be a hook that changes nothing.
  const [chromeHeight, setChromeHeight] = useState<number | null>(null);
  const chromeTopPad = (chromeHeight ?? TERMS_CHROME_FALLBACK) + 10;

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      aria-label={TERMS_LINK_LABEL}
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
        <ScreenStage />
        <GlassSurface
          variant="chrome"
          borderRadius={0}
          style={styles.chromePane}
          onLayout={(e) => setChromeHeight(e.nativeEvent.layout.height)}
        >
          {/* G3 (§SKY-6). This screen did not exist when the arbiter ran — it is
              a FOURTH pageSheet, created one car earlier — so it was not in G3's
              list of three. It wears the same chrome recipe as Resources and
              How to help, and a sheet without the grabber beside two that have
              one is the inconsistency G3 set out to remove. Same shared
              component, same arbitrated ink, same placement above the header. */}
          <SheetGrabber />
          <View style={styles.headerRow}>
            {/* The chrome says where you are; the document below says what it
                is. Splitting them keeps the header short enough to stay one or
                two lines at AX5, where the full title would eat the sheet. */}
            <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
              {TERMS_LINK_LABEL}
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close terms"
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
          <AppText variant="heading" style={styles.docTitle} accessibilityRole="header">
            {TERMS_TITLE}
          </AppText>
          <AppText variant="body" style={styles.effective}>
            {TERMS_EFFECTIVE}
          </AppText>

          {TERMS_SECTIONS.map((s) => (
            // Heading and body are separate elements rather than one run of
            // rich text: a screen reader can then jump the document by heading,
            // which is the only practical way to navigate terms non-visually.
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
