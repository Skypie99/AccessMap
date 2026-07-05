import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
// Expo Constants gives us the bundled app.json version at runtime so we
// don't have to hard-code (and forget to bump) a string here.
import Constants from 'expo-constants';
import { font, radius, spacing } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { Map as MapIcon, X } from 'lucide-react-native';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { useReducedMotion } from '@/lib/accessibility';

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

/**
 * About AccessMap — meta page for the Settings tab. Shows version, the
 * "what is this thing" intro, credits, a stack note, and a plain-English
 * privacy summary so people can verify what data the app touches without
 * digging through a privacy policy.
 *
 * Rendered as a slide-up Modal from SettingsScreen. The app's navigation
 * is tab-only (no Stacks), so a Modal keeps the existing pattern. The
 * filename is *Screen* per the F3 spec, but at runtime it presents as a
 * sheet.
 */
export default function AboutScreen({ visible, onClose }: Props) {
  const color = useColor();
  const reducedMotion = useReducedMotion();
  const styles = makeStyles(color);
  return (
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose} aria-label="About AccessMap">
      <View style={styles.backdrop}>
        {/* accessibilityViewIsModal traps VoiceOver focus inside this card so
            it can't escape back to the underlying Settings screen while the
            sheet is open. Belt-and-suspenders with the Modal itself, which
            on iOS sometimes leaks focus to the parent. */}
        <View style={styles.cardShadow}>
        <GlassSurface variant="bulk" borderRadius={0} style={styles.card} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <AppText variant="heading" style={styles.title} accessibilityRole="header">
              About AccessMap
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close about"
            >
              <X size={18} color={color.text} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
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
              AccessMap is built with Expo and React Native on the front end, and Supabase (Postgres
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
          </ScrollView>
        </GlassSurface>
        </View>
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
    // The sheet body is now BULK glass (GlassSurface variant="bulk" supplies the
    // i=24 floor + top edge/specular + designed Reduce-Transparency state). No
    // backgroundColor here (do/don't #2 — the variant owns the surface);
    // overflow:'hidden' clips the square bottom and rounds the top to radius.xl.
    // The elevation shadow can't live here (overflow swallows it) — see cardShadow.
    card: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      overflow: 'hidden',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
      maxHeight: '90%',
    },
    // Bottom-sheet up-shadow on the OUTER wrapper (the one sanctioned do/don't #2
    // deviation — the card's overflow:'hidden' would clip it). Negative height
    // casts the shadow UP off the sheet's top edge. Dark keeps the single
    // sanctioned Deep Field dark shadow (#000@0.35); light uses shadowTint@0.12.
    cardShadow: {
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      ...(color.scheme === 'dark'
        ? { shadowColor: '#000', shadowOpacity: 0.35 }
        : { shadowColor: color.shadowTint, shadowOpacity: 0.12 }),
      shadowRadius: 14,
      shadowOffset: { width: 0, height: -4 },
      elevation: 5,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    title: {
      flex: 1,
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnText: {
      fontSize: font.size.lg,
      color: color.text,
      fontWeight: font.weight.bold,
    },
    body: { flexShrink: 1 },
    bodyContent: { gap: spacing.md, paddingBottom: spacing.sm },
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
    heroBadgeIcon: { fontSize: font.size.lg },
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
    sectionHeader: {
      fontSize: font.size.xs,
      // inkGlassMuted, not textMuted: #666 = 4.06:1 FAILs on the light bulk
      // sheet's worst-case backdrop; inkGlassMuted = 6.24:1 light / 6.51:1 dark.
      color: color.inkGlassMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
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
      lineHeight: 21,
    },
  });
