import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { color, font, radius, shadow, spacing } from '@/theme';
import { signOut } from '@/lib/supabase';
import { confirm } from '@/lib/confirm';
import NotificationPrefsModal from '@/components/NotificationPrefsModal';
import HelpModal from '@/components/HelpModal';
import ChangelogModal from '@/components/ChangelogModal';
import FeedbackModal from '@/components/FeedbackModal';
import MyFeedbackModal from '@/components/MyFeedbackModal';
import AboutScreen from '@/screens/AboutScreen';

// One row in the settings list. We declare it locally instead of factoring
// into its own file because it's only used here and the rest of the app
// inlines small components the same way (see ProfileScreen's Stat helper).
function SettingsRow({
  title,
  subtitle,
  onPress,
  accessibilityHint,
  destructive,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  accessibilityHint: string;
  destructive?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
    >
      <View style={styles.rowTextWrap}>
        <Text style={[styles.rowTitle, destructive && styles.rowTitleDestructive]}>
          {title}
        </Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {/* Chevron is decorative — the row's accessibilityLabel already
          communicates the action. Hiding it from AT avoids "greater than"
          announcements after every row title. */}
      <Text
        style={styles.rowChevron}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        ›
      </Text>
    </Pressable>
  );
}

/**
 * Settings hub — the 4th bottom tab. Consolidates app-level meta and
 * preferences that used to be scattered as rows on the Profile screen:
 * notifications, help, changelog, feedback, about, and sign out.
 *
 * Profile still works as before (we don't remove its rows in this slice —
 * a later pass can dedupe). Adding the dedicated tab is the lower-risk
 * step: people who already know where things are still find them, and
 * the new tab gives a single discoverable home.
 *
 * Design: matches the row pattern already used on ProfileScreen
 * (`myReportsBtn` / `aboutRow`), reusing the design tokens from
 * `src/theme.ts` so future style edits propagate.
 */
export default function SettingsScreen() {
  // Each modal opens from a Settings row. Keeping their visible-state
  // flags here (rather than inside SettingsRow) lets a single press both
  // open the modal and any future logic that needs to fire alongside it
  // (e.g. analytics — we don't have any yet, but the shape is ready).
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [myFeedbackOpen, setMyFeedbackOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleSignOutPress = async () => {
    // Use the platform-aware confirm helper (src/lib/confirm.ts) — Alert.alert
    // is a no-op on react-native-web, so going straight to Alert.alert here
    // would silently break sign-out on the web build. The helper routes to
    // window.confirm on web and Alert.alert everywhere else.
    const ok = await confirm(
      'Sign out?',
      'Are you sure you want to sign out?',
      'Sign out',
      true,
    );
    if (!ok) return;
    // Fire-and-forget — signOut returns an AuthResponse but the
    // AuthProvider listener takes care of routing back to the
    // SignInScreen, so we don't need to await or surface errors
    // here. (If sign-out fails, the user simply stays signed in.)
    void signOut();
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.sectionLabel} accessibilityRole="header">
          Notifications
        </Text>

        <SettingsRow
          title="Notification preferences"
          subtitle="Choose which flag status changes surface as updates."
          accessibilityHint="Opens notification preferences"
          onPress={() => setNotifOpen(true)}
        />

        <Text style={styles.sectionLabel} accessibilityRole="header">
          Help & info
        </Text>

        <SettingsRow
          title="Help & FAQ"
          subtitle="Common questions about reports, points, and accessibility."
          accessibilityHint="Opens collapsible answers to common questions"
          onPress={() => setHelpOpen(true)}
        />

        <SettingsRow
          title="What's new"
          subtitle="Recent features added to AccessMap."
          accessibilityHint="Opens a dated list of recent shipped features"
          onPress={() => setChangelogOpen(true)}
        />

        <SettingsRow
          title="About AccessMap"
          subtitle="Version, credits, and a short privacy summary."
          accessibilityHint="Opens the about page with version and privacy info"
          onPress={() => setAboutOpen(true)}
        />

        <Text style={styles.sectionLabel} accessibilityRole="header">
          Feedback
        </Text>

        <SettingsRow
          title="Send feedback"
          subtitle="Tell the maintainer what's working or what's broken."
          accessibilityHint="Opens the feedback form"
          onPress={() => setFeedbackOpen(true)}
        />

        <SettingsRow
          title="My feedback history"
          subtitle="View the feedback messages you've sent."
          accessibilityHint="Opens the list of feedback you've sent"
          onPress={() => setMyFeedbackOpen(true)}
        />

        <Text style={styles.sectionLabel} accessibilityRole="header">
          Account
        </Text>

        <SettingsRow
          title="Sign out"
          subtitle="End your session on this device."
          // Signal destructive intent via the hint as well as the red color —
          // screen-reader users don't see the color cue.
          accessibilityHint="Destructive. Confirms before signing out."
          onPress={handleSignOutPress}
          destructive
        />
      </ScrollView>

      <NotificationPrefsModal
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
      <HelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} />
      <ChangelogModal
        visible={changelogOpen}
        onClose={() => setChangelogOpen(false)}
      />
      <FeedbackModal
        visible={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
      <MyFeedbackModal
        visible={myFeedbackOpen}
        onClose={() => setMyFeedbackOpen(false)}
      />
      <AboutScreen visible={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surfaceMuted },
  container: {
    padding: spacing.xxl,
    gap: spacing.md,
    alignItems: 'stretch',
  },
  sectionLabel: {
    fontSize: font.size.xs,
    color: color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: font.weight.bold,
    marginTop: spacing.sm,
  },
  row: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    // Minimum 44pt touch target — already easily satisfied by the
    // padding+text height, but pinned here so future copy changes can't
    // accidentally shrink it under the WCAG floor.
    minHeight: 64,
    ...shadow.e1,
  },
  rowPressed: { opacity: 0.85, backgroundColor: color.surfaceMuted },
  rowTextWrap: { flex: 1, gap: 2 },
  rowTitle: {
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    color: color.textStrong,
  },
  // The "Sign out" row uses a slightly more cautious color so the destructive
  // intent is visually distinct before the confirm Alert fires. Subtitle stays
  // neutral — we don't want the whole row screaming danger, just hinting.
  rowTitleDestructive: { color: color.error },
  rowSubtitle: {
    fontSize: font.size.sm,
    color: color.textMuted,
  },
  rowChevron: {
    fontSize: 28,
    color: color.textSubtle,
    fontWeight: font.weight.regular,
  },
});
