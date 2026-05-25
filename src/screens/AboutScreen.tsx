import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// Expo Constants gives us the bundled app.json version at runtime so we
// don't have to hard-code (and forget to bump) a string here.
import Constants from 'expo-constants';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Read version once at module scope so re-renders don't re-read it. The
// fall-through order matches what Expo SDK 54 recommends.
const APP_VERSION =
  Constants.expoConfig?.version ??
  Constants.nativeAppVersion ??
  '0.0.0';

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
  const styles = makeStyles(color);
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* accessibilityViewIsModal traps VoiceOver focus inside this card so
            it can't escape back to the underlying Settings screen while the
            sheet is open. Belt-and-suspenders with the Modal itself, which
            on iOS sometimes leaks focus to the parent. */}
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">
              About AccessMap
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close about"
            >
              <Text style={styles.closeBtnText}>✕</Text>
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
              <Text
                style={styles.heroBadgeIcon}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                🗺️
              </Text>
              <Text style={styles.heroBadgeText}>v{APP_VERSION}</Text>
            </View>

            <Text style={styles.tagline}>
              A crowdsourced map for accessibility issues.
            </Text>

            <Text style={styles.sectionHeader} accessibilityRole="header">
              Built for accessibility
            </Text>
            <Text style={styles.bodyText}>
              Every screen is designed against WCAG 2.2 AA. Screen-reader
              labels, 44pt touch targets, color paired with text, and an
              accessible list view that opens automatically when a screen
              reader is on. If something is hard to use, the Feedback row
              in Settings goes straight to the maintainer.
            </Text>

            <Text style={styles.sectionHeader} accessibilityRole="header">
              Credits
            </Text>
            <Text style={styles.bodyText}>
              A small project by Sky, built to learn by doing. The maps,
              icons, and database schema are open and the data belongs to
              the people who report it.
            </Text>

            <Text style={styles.sectionHeader} accessibilityRole="header">
              Source code
            </Text>
            <Text style={styles.bodyText}>
              AccessMap is built with Expo and React Native on the front
              end, and Supabase (Postgres + Auth + Storage) on the back
              end. The web build uses react-leaflet over OpenStreetMap
              tiles.
            </Text>

            <Text style={styles.sectionHeader} accessibilityRole="header">
              Your privacy
            </Text>
            <Text style={styles.bodyText}>
              We store flag reports and your profile. Location is requested
              only when you use the map. No tracking, no ads.
            </Text>
            <Text style={styles.bodyText}>
              Status changes (open → verified → resolved) are logged so the
              community can see the history of a flag. The log is visible to
              other users without identifying who made each change.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (color: ColorTheme) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.scrim,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    maxHeight: '90%',
    ...shadow.e3,
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
    width: 32,
    height: 32,
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
    color: color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: font.weight.bold,
    marginTop: spacing.sm,
  },
  bodyText: {
    fontSize: font.size.base,
    // textMuted (#666) is 5.7:1 on white — passes WCAG AA for body text,
    // matches the per-spec floor of #5b6470 (the brief asked for AA body
    // contrast on white, and #666 is already in the design tokens).
    color: color.textMuted,
    lineHeight: 21,
  },
});
