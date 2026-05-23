import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// Expo Constants exposes the bundled app.json version at runtime without
// hardcoding it here. Avoids the "we forgot to bump the modal" drift.
import Constants from 'expo-constants';
import { color, font, radius, shadow, spacing } from '@/theme';
import { openFeedbackComposer } from '@/lib/feedback';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Pull the version once at module scope so re-renders don't re-read it.
// Expo lifts manifest fields into Constants.expoConfig in dev and into
// Constants.manifest2 / nativeAppVersion in production; this preference
// order matches what Expo recommends for SDK 54.
const APP_VERSION =
  Constants.expoConfig?.version ??
  Constants.nativeAppVersion ??
  '0.0.0';

/**
 * About AccessMap — a friendly intro that explains what the app does, who
 * built it, and how to reach the maintainer. Designed to be the first
 * "extra page" surface, with room to grow (community guidelines, privacy
 * policy, credits) without a navigation refactor.
 *
 * Accessed from a row near the bottom of Profile. Opens as a slide-up
 * modal — same pattern as MyReportsModal and FlagDetailModal.
 */
export default function AboutModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
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
          >
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeIcon} accessibilityElementsHidden>
                🗺️
              </Text>
              <Text style={styles.heroBadgeText}>v{APP_VERSION}</Text>
            </View>

            <Text style={styles.sectionHeader} accessibilityRole="header">
              What it is
            </Text>
            <Text style={styles.bodyText}>
              AccessMap is a crowdsourced map for accessibility issues.
              Pin a spot when a sidewalk is broken, a ramp is missing, or
              a curb cut is blocked. Other people verify it, mark it
              resolved when it's fixed, and earn points for helping out.
            </Text>

            <Text style={styles.sectionHeader} accessibilityRole="header">
              Built for everyone
            </Text>
            <Text style={styles.bodyText}>
              Every screen is checked against WCAG 2.2 AA — screen-reader
              labels, 44pt touch targets, color paired with text, and an
              accessible list view that opens automatically when a screen
              reader is on. If something's hard to use, tell us via the
              Feedback button.
            </Text>

            <Text style={styles.sectionHeader} accessibilityRole="header">
              Community guidelines
            </Text>
            <Text style={styles.bodyText}>
              Report accurately. Verify what you can see. Be respectful in
              descriptions — these flags are about places, not people.
              Photos help, but don't include anyone's face or identifying
              info.
            </Text>

            <Text style={styles.sectionHeader} accessibilityRole="header">
              Made by
            </Text>
            <Text style={styles.bodyText}>
              A small project by Sky, built to learn by doing. Source on
              GitHub. Questions, ideas, or bug reports? Use the Feedback
              button — it lands directly in the maintainer's inbox.
            </Text>

            <Pressable
              onPress={() => {
                // Jump straight to the OS mail composer — About is a
                // "ground floor" page, and an empty-body feedback compose
                // is a fine starting point (the user types in their mail
                // app). The header's Feedback button is still there if
                // they want the prefilled-form experience.
                openFeedbackComposer();
              }}
              style={({ pressed }) => [
                styles.feedbackBtn,
                pressed && styles.feedbackBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Send feedback to the maintainer"
              accessibilityHint="Opens your email app addressed to the AccessMap maintainer"
            >
              <Text style={styles.feedbackBtnText}>Send feedback</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    color: color.text,
    lineHeight: 21,
  },
  feedbackBtn: {
    marginTop: spacing.md,
    backgroundColor: color.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  feedbackBtnPressed: { opacity: 0.85 },
  feedbackBtnText: {
    color: color.textOnBrand,
    fontWeight: font.weight.bold,
    fontSize: font.size.base,
  },
});
