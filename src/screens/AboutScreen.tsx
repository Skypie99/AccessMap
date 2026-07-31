import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, type Text, View } from 'react-native';
// Expo Constants gives us the bundled app.json version at runtime so we
// don't have to hard-code (and forget to bump) a string here.
import Constants from 'expo-constants';
import { font, radius, spacing } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import LogoMark from '@/components/LogoMark';
import { Map as MapIcon, X } from 'lucide-react-native';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { decorativeProps, useFocusOnOpen, useReducedMotion } from '@/lib/accessibility';
import {
  PRIVACY_POLICY_LINK_HINT,
  PRIVACY_POLICY_LINK_LABEL,
  TERMS_LINK_HINT,
  TERMS_LINK_LABEL,
} from '@/lib/copy';
import { useSharedModals } from '@/lib/sharedModalsContext';

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
  // A11Y-201 (2.4.3): move the SR cursor onto the title when this surface opens.
  const titleRef = useFocusOnOpen<Text>(visible);
  const styles = makeStyles(color);
  // §SKY-6: the terms are a SHARED modal, so About only raises the flag — the
  // sheet itself is mounted at the navigator and presents over this card rather
  // than under it. About stays open beneath, so closing the terms returns here.
  const { setOpen } = useSharedModals();
  return (
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose} aria-label="About AccessMap">
      <View style={styles.backdrop}>
        {/* accessibilityViewIsModal traps VoiceOver focus inside this card so
            it can't escape back to the underlying Settings screen while the
            sheet is open. Belt-and-suspenders with the Modal itself, which
            on iOS sometimes leaks focus to the parent. */}
        <View style={styles.cardShadow}>
        <GlassSurface variant="bulk" borderRadius={0} style={styles.card} accessibilityViewIsModal onAccessibilityEscape={onClose}>
          <View style={styles.headerRow}>
            {/* T19 (F6-08): a small brand mark beside the title. Hidden from
                screen readers — LogoMark bakes an "AccessMap" label and the
                title already says "About AccessMap", so exposing it would
                double-speak. Theme-aware so it holds contrast on the bulk sheet
                in both modes. */}
            <View {...decorativeProps}>
              <LogoMark size={22} variant={color.scheme === 'dark' ? 'white' : 'color'} />
            </View>
            <AppText ref={titleRef} variant="heading" style={styles.title} accessibilityRole="header">
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

            {/* B-2 (SR-002): the section above is a summary, not the policy.
                5.1.1(i) wants the published policy reachable in-app. Appended
                after the prose so none of it moves (PROTECT-11: the
                privacy-forward trust voice is insertion-only here). */}
            <Pressable
              onPress={() => setOpen('privacy')}
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
              onPress={() => setOpen('terms')}
              style={({ pressed }) => (pressed ? styles.linkPressed : null)}
              accessibilityRole="button"
              accessibilityLabel={TERMS_LINK_LABEL}
              accessibilityHint={TERMS_LINK_HINT}
            >
              <AppText variant="bodyMedium" style={styles.link}>
                {TERMS_LINK_LABEL}
              </AppText>
            </Pressable>
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
      // G6/SR-099: shrink into cardShadow's cap (see that block).
      flexShrink: 1,
    },
    // Bottom-sheet up-shadow on the OUTER wrapper (the one sanctioned do/don't #2
    // deviation — the card's overflow:'hidden' would clip it). Negative height
    // casts the shadow UP off the sheet's top edge. Dark keeps the single
    // sanctioned Deep Field dark shadow (#000@0.35); light uses shadowTint@0.12.
    cardShadow: {
      // G6/SR-099 — THE CAP LIVES HERE, not on the card. A percentage
      // maxHeight resolves against the parent's *definite* height; this
      // wrapper is content-sized, so the card's own `maxHeight:'90%'` never
      // resolved. The card grew unbounded, `justifyContent:'flex-end'` pinned
      // its bottom, and the 44pt close X ended up above the viewport
      // (measured: About y=-65). The backdrop is `flex:1`, so it resolves here.
      maxHeight: '90%',
      flexShrink: 1,
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
