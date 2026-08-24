import React, { useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, type Text, View } from 'react-native';
// Expo Constants gives us the bundled app.json version at runtime so we
// don't have to hard-code (and forget to bump) a string here.
import Constants from 'expo-constants';
import { font, radius, spacing } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { SheetGrabber } from '@/components/ui/Sheet';
import LogoMark from '@/components/LogoMark';
import { Map as MapIcon, X } from 'lucide-react-native';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import {
  MISSION_STATEMENT,
  OPENS_IN_BROWSER_HINT,
  PRIVACY_POLICY_LINK_HINT,
  PRIVACY_POLICY_LINK_LABEL,
  TERMS_LINK_HINT,
  TERMS_LINK_LABEL,
} from '@/lib/copy';
import { useLegalSheets } from '@/components/LegalSheets';
import { ACCESSIBILITY_STATEMENT_URL, openExternalUrl, SUPPORT_URL } from '@/lib/links';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Read version once at module scope so re-renders don't re-read it. The
// fall-through order matches what Expo SDK 54 recommends. On web,
// nativeAppVersion is undefined, so we fall through to the expoConfig
// value (present in the metro web bundle) or a hard-coded fallback.
const APP_VERSION =
  Constants.expoConfig?.version ??
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Constants as any).nativeAppVersion ??
  '1.0.0';

// Pre-measure fallback for the absolute chrome pane's height, in the one frame
// before onLayout fires. Same device as its siblings; About's pane carries the
// brand mark, so it runs a little taller than Resources' 84.
const ABOUT_CHROME_FALLBACK = 88;

/**
 * About Flagstone — meta page for the Settings tab. Shows version, the
 * "what is this thing" intro, credits, a stack note, and a plain-English
 * privacy summary so people can verify what data the app touches without
 * digging through a privacy policy.
 *
 * Rendered as a Modal from SettingsScreen. The app's navigation is tab-only
 * (no Stacks), so a Modal keeps the existing pattern. The filename is *Screen*
 * per the F3 spec, but at runtime it presents as a sheet.
 *
 * ─── C15 / §S5: it is a PAGE SHEET, like its four siblings ────────────────
 * About shipped as a transparent half-sheet while Nearby, Resources, How to
 * help, Terms and Privacy were all UIKit pageSheets. That was the one
 * inconsistency a user could feel rather than see: the other five swipe down
 * to dismiss and this one did not, so the gesture that worked everywhere else
 * silently failed here. §S5 names About in the pageSheet class; this is that
 * move, using the same chrome-pane recipe the other four already share
 * (SafeAreaView root, 60% stage, one absolute chrome pane carrying the grabber
 * and the header, body scrolling beneath it on a measured top pad).
 *
 * The legal sheets still mount INSIDE this Modal, and still must — see the
 * note at `useLegalSheets()` below. A pageSheet is still a presenting VC.
 */
export default function AboutScreen({ visible, onClose }: Props) {
  const color = useColor();
  const reducedMotion = useReducedMotion();
  // A11Y-201 (2.4.3): move the SR cursor onto the title when this surface opens.
  const titleRef = useFocusOnOpen<Text>(visible);
  const styles = makeStyles(color);
  // §SKY-6 wanted these to present OVER this card with About still open
  // beneath, so closing one returns here. They were routed through the shared
  // navigator-level host to get that — and on iOS it bought the opposite:
  // nothing at all. About is itself a modal, so the root VC is already
  // presenting, and UIKit refuses a second presentation from it ("Attempt to
  // present … which is already presenting"). Both links were dead on device.
  // Mounting them HERE presents from About's own VC, which is legal, and
  // delivers the over-not-under behaviour §SKY-6 actually asked for.
  // See src/components/LegalSheets.tsx for the capture and the full why.
  const legal = useLegalSheets();
  // Measured height of the absolute chrome glass pane; null until the first
  // onLayout — the body hides for that one pass so its top pad never jumps.
  const [chromeHeight, setChromeHeight] = useState<number | null>(null);
  const chromeTopPad = (chromeHeight ?? ABOUT_CHROME_FALLBACK) + 10;
  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      // Native iOS sheet swipe — see NearbyFlagsModal for the full why. One
      // gesture grammar across the pageSheet class; the Close button stays.
      allowSwipeDismissal
      aria-label="About Flagstone"
    >
      <SafeAreaView
        style={styles.root}
        // G1: a pageSheet is its own UIKit scene, so it correctly carries NO
        // accessibilityViewIsModal — the scene boundary already provides
        // containment. The escape gesture still needs a real View to land on,
        // and this root is it.
        onAccessibilityEscape={onClose}
      >
        {/* S3: a sheet plays the stage at 60%. */}
        <ScreenStage strength={0.6} />
        {/* ONE absolute i=24 chrome pane; content scrolls beneath it (onLayout
            feeds the top reserve). SafeAreaView already owns the device top
            inset, so the pane sits at top:0 below it. The pane's bottom
            edge/lip replaces the old header hairline. */}
        <GlassSurface
          variant="chrome"
          borderRadius={0}
          style={styles.chromePane}
          onLayout={(e) => setChromeHeight(e.nativeEvent.layout.height)}
        >
          {/* G3 (§SKY-6): the grabber sits ABOVE the title row, at the sheet's
              actual top edge, which is where the platform puts it — and where
              the other pageSheets put it too. */}
          <SheetGrabber />
          <View style={styles.headerRow}>
            {/* T19 (F6-08): a small brand mark beside the title. Hidden from
                screen readers — LogoMark bakes a "Flagstone" label and the
                title already says "About Flagstone", so exposing it would
                double-speak. Theme-aware so it holds contrast on the chrome
                material in both modes. */}
            <View {...decorativeProps}>
              <LogoMark size={22} variant={color.scheme === 'dark' ? 'white' : 'color'} />
            </View>
            <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
              About Flagstone
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, pressed && { backgroundColor: color.headerBtnBgPressed }]}
              accessibilityRole="button"
              accessibilityLabel="Close about"
            >
              {/* inkGlassMuted, not textSubtle (forbidden on chrome ~2.69:1);
                  arbitrated chrome-muted icon ink 4.81:1 light / 5.43:1 dark.
                  Same size as the sibling pageSheets' X. */}
              <X size={24} color={color.inkGlassMuted} strokeWidth={2.2} />
            </Pressable>
          </View>
        </GlassSurface>

        <ScrollView
          style={chromeHeight === null && styles.bodyHidden}
          contentContainerStyle={[styles.bodyContent, { paddingTop: chromeTopPad }]}
          scrollIndicatorInsets={{ top: chromeTopPad }}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
            <View style={styles.heroBadge}>
              {/* Decorative emoji — accessibilityElementsHidden hides it from
                  VoiceOver (iOS) and importantForAccessibility hides it from
                  TalkBack (Android). Both are needed; one alone leaks the
                  glyph on the other platform. */}
              <MapIcon size={15} color={color.brandOnSoft} strokeWidth={2.2} />
              <AppText variant="label" style={styles.heroBadgeText}>v{APP_VERSION}</AppText>
            </View>

            <AppText variant="label" style={styles.tagline}>A crowdsourced map for accessibility issues.</AppText>

            {/* Q11 — the mission statement, in the product.
                It lived in the documents ABOUT this app and nowhere inside it.
                First section on About, before the how, because it is the why.
                One exported constant, read here and by the guest Profile
                (Prompt 06), pinned character-for-character by
                `mission.guard.test.ts`. Never paraphrased, never re-wrapped —
                including the name inside it. */}
            <AppText variant="heading" style={styles.sectionHeader} accessibilityRole="header">
              Why Flagstone
            </AppText>
            <AppText variant="body" style={styles.bodyText}>
              {MISSION_STATEMENT}
            </AppText>

            <AppText variant="heading" style={styles.sectionHeader} accessibilityRole="header">
              Built for accessibility
            </AppText>
            <AppText variant="body" style={styles.bodyText}>
              Every screen is designed against WCAG 2.2 AA. Screen-reader labels, 44pt touch
              targets, color paired with text, and an accessible list view that opens automatically
              when a screen reader is on. If something is hard to use, the Feedback row in Settings
              goes straight to the maintainer.
            </AppText>

            <AppText variant="heading" style={styles.sectionHeader} accessibilityRole="header">
              Credits
            </AppText>
            <AppText variant="body" style={styles.bodyText}>
              A small project by Sky, built to learn by doing on open tools — OpenStreetMap maps,
              open icon sets, Expo, React Native, and Supabase. The barrier data belongs to the
              people who report it.
            </AppText>

            <AppText variant="heading" style={styles.sectionHeader} accessibilityRole="header">
              Source code
            </AppText>
            <AppText variant="body" style={styles.bodyText}>
              Flagstone is built with Expo and React Native on the front end, and Supabase (Postgres
              + Auth + Storage) on the back end. The web build uses react-leaflet over OpenStreetMap
              tiles.
            </AppText>

            <AppText variant="heading" style={styles.sectionHeader} accessibilityRole="header">
              Your privacy
            </AppText>
            <AppText variant="body" style={styles.bodyText}>
              We store flag reports and your profile. Location is requested only when you use the
              map. No tracking, no ads.
            </AppText>
            <AppText variant="body" style={styles.bodyText}>
              Status changes (open → verified → resolved) are logged so the community can see the
              history of a flag — open any flag&apos;s details to view it. The log doesn&apos;t
              identify who made each change.
            </AppText>
            <AppText variant="body" style={styles.bodyText}>
              Map tile images are cached locally on your device for up to 7 days to improve
              performance. This data is not shared with anyone and is cleared when you sign out.
            </AppText>

            {/* B-2 (SR-002): the section above is a summary, not the policy.
                5.1.1(i) wants the published policy reachable in-app. Appended
                after the prose so none of it moves (PROTECT-11: the
                privacy-forward trust voice is insertion-only here). */}
            <Pressable
              onPress={legal.openPrivacy}
              style={({ pressed }) => (pressed ? styles.linkPressed : null)}
              accessibilityRole="button"
              accessibilityLabel={PRIVACY_POLICY_LINK_LABEL}
              accessibilityHint={PRIVACY_POLICY_LINK_HINT}
            >
              <AppText variant="bodyMedium" style={styles.link}>
                {PRIVACY_POLICY_LINK_LABEL}
              </AppText>
            </Pressable>

            {/* §SKY-6: the terms take the same B-2 grammar, appended after the
                privacy link so PROTECT-11 still holds — nothing above moves.
                Both rows announce as "button" since B-3: they now do the same
                thing (open a sheet), so they should announce identically. Until
                then the privacy row left for a browser and was a "link" — the
                distinction was real and is simply gone. */}
            <Pressable
              onPress={legal.openTerms}
              style={({ pressed }) => (pressed ? styles.linkPressed : null)}
              accessibilityRole="button"
              accessibilityLabel={TERMS_LINK_LABEL}
              accessibilityHint={TERMS_LINK_HINT}
            >
              <AppText variant="bodyMedium" style={styles.link}>
                {TERMS_LINK_LABEL}
              </AppText>
            </Pressable>

            {/* Accessibility Statement and Support have no in-app equivalent
                (unlike Privacy/Terms just above, which render natively), so
                these two genuinely leave the app — role="link" and
                OPENS_IN_BROWSER_HINT are honest here, unlike on the two rows
                above them. */}
            <Pressable
              onPress={() => openExternalUrl(ACCESSIBILITY_STATEMENT_URL)}
              style={({ pressed }) => (pressed ? styles.linkPressed : null)}
              accessibilityRole="link"
              accessibilityLabel="Accessibility Statement"
              accessibilityHint={OPENS_IN_BROWSER_HINT}
            >
              <AppText variant="bodyMedium" style={styles.link}>
                Accessibility Statement
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => openExternalUrl(SUPPORT_URL)}
              style={({ pressed }) => (pressed ? styles.linkPressed : null)}
              accessibilityRole="link"
              accessibilityLabel="Support"
              accessibilityHint={OPENS_IN_BROWSER_HINT}
            >
              <AppText variant="bodyMedium" style={styles.link}>
                Support
              </AppText>
            </Pressable>
        </ScrollView>
      </SafeAreaView>
      {/* Last child, and INSIDE this Modal on purpose: that is what makes the
          sheets present from About's view controller instead of the occupied
          root. Moving this outside <Modal> reinstates the dead-link bug. */}
      {legal.sheets}
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
    // Hides the body for the single pre-measure pass so its top pad never jumps.
    bodyHidden: { opacity: 0 },
    // Header content inside the pane — no border/background of its own
    // (the chrome material supplies both).
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    title: {
      flex: 1,
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    // Same shape as the sibling pageSheets': no fill, the chrome pane is the
    // surface behind it.
    closeBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bodyContent: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
    heroBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: color.brandSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.full,
    },
    heroBadgeText: {
      color: color.brandOnSoft,
      fontWeight: font.weight.bold,
      fontSize: font.size.sm,
      letterSpacing: 0.3,
    },
    tagline: {
      fontSize: font.size.md,
      color: color.text,
      fontWeight: font.weight.semibold,
    },
    // B-2: the in-app policy link. `brand` is the app's shipped link ink on a
    // bulk sheet (same token the Home/Report CTAs use); minHeight keeps the
    // 44pt floor without a numeric `height` (which dynamicTypeGuard bans on
    // text-bearing styles).
    link: {
      // G3 arbiter, Run 2: color.brand measures 3.70:1 light / 3.56:1 dark as
      // body text on this BULK sheet — an AA FAIL, and it was shipped. It was
      // never measured, only inherited. brandOnSoft is the arbitrated brand ink
      // for glass (4.95/5.58 light, 7.66/9.65 dark) and stays recognisably a
      // link colour, so linkness survives the fix.
      // Declared in tools/shipready-grabber-shipped-stacks.json.
      color: color.brandOnSoft,
      minHeight: 44,
      paddingTop: spacing.md,
      textDecorationLine: 'underline',
    },
    linkPressed: {
      opacity: 0.7,
    },
    sectionHeader: {
      fontSize: font.size.xs,
      // inkGlassMuted, not textMuted: #666 = 4.06:1 FAILs on the light bulk
      // sheet's worst-case backdrop; inkGlassMuted = 6.24:1 light / 6.51:1 dark.
      color: color.inkGlassMuted,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
      fontWeight: font.weight.bold,
      marginTop: spacing.sm,
    },
    bodyText: {
      fontSize: font.size.base,
      // On the BULK sheet the worst-case backdrop is ~#D9D9D9, not #fff —
      // textMuted #666 measures 4.06:1 there (FAIL). inkGlassMuted is the
      // arbitrated muted-on-bulk ink: 6.24:1 light / 6.51:1 dark. Body text on
      // glass also carries >=500 weight (the 400 face hazes) — bodyMedium.
      color: color.inkGlassMuted,
      fontFamily: font.family.bodyMedium,
      // Was 21 (a hand-tuned x1.5). The token is the system's x1.4 formula at
      // this size: 20. One point tighter, and now it tracks the size.
      lineHeight: font.lineHeight.base,
    },
  });
