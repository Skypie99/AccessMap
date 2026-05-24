import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { color, font, radius, shadow, spacing } from '@/theme';
import { signOut, supabase } from '@/lib/supabase';
import { confirm } from '@/lib/confirm';
import { useAuth } from '@/lib/auth';
import { CATEGORY_LABELS, listFlagsByUser } from '@/lib/flags';
import { listFeedbackByUser } from '@/lib/feedbackStore';
import { formatDataExport } from '@/lib/dataExport';
import { errorMessage } from '@/lib/errors';
import type { UserRow } from '@/types/database';
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
  icon,
  disabled,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  accessibilityHint: string;
  destructive?: boolean;
  // Optional text glyph rendered at the leading edge of the row. Pure
  // decoration — hidden from AT so a screen reader doesn't read out
  // "clipboard emoji, Export my data". The row's accessibilityLabel
  // already carries the meaning.
  icon?: string;
  // When the row is busy running its handler we soften the press affordance
  // and block re-entrancy (the handler also no-ops if it's busy, but the
  // visual cue helps sighted users).
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled }}
    >
      {icon ? (
        <Text
          style={styles.rowIcon}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {icon}
        </Text>
      ) : null}
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

  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  /**
   * "Export my data" handler. PIPEDA-aware right-of-access flow:
   *
   *  1. Fetch the user's profile (display_name, points).
   *  2. Fetch the user's flags via the existing listFlagsByUser helper.
   *  3. Fetch the user's feedback IF the feedback table is available —
   *     listFeedbackByUser already handles a missing table by returning
   *     []; we tell those two cases apart by also checking whether the
   *     migration has been applied at all. To keep the surface tiny, we
   *     just call it and pass the result through. The formatter renders
   *     "FEEDBACK: not enabled" when we pass `undefined` (vs `[]` for
   *     "enabled but empty"). For now we always pass an array; if/when
   *     we want the "not enabled" branch, a future commit can add a
   *     table-existence probe.
   *  4. Format with the pure formatDataExport helper.
   *  5. Push the text to the OS:
   *     - Web → navigator.clipboard.writeText (Alert.alert is a no-op on
   *       web, so we use window.alert for confirmation).
   *     - Native → Share.share so the user can save via the OS share
   *       sheet (Copy / Mail / Notes / Files / etc.). This is friendlier
   *       than a raw clipboard write because the share sheet shows the
   *       data first, so users know exactly what they're about to paste.
   *
   * No new npm dependency — `Share` is from `react-native` (the same one
   * FlagDetailModal uses to share a flag), and `navigator.clipboard` is a
   * standard browser API. Matches the house style.
   */
  const handleExportPress = async () => {
    if (exporting) return;
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to export your data.');
      return;
    }
    setExporting(true);
    try {
      // Pull profile + flags in parallel. We avoid Promise.all([flags, fb])
      // because we want the feedback call's failure to be silent (it's
      // already swallowed by listFeedbackByUser, but separating keeps the
      // intent obvious to future readers).
      const [profileRes, flags] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
        listFlagsByUser(user.id),
      ]);
      if (profileRes.error) throw profileRes.error;
      const profileRow = (profileRes.data as UserRow | null) ?? null;

      // listFeedbackByUser already returns [] when the table is absent.
      // Treat the result as "enabled, possibly empty" — the most truthful
      // statement from the client's point of view. A future probe could
      // distinguish "missing table" vs "empty table"; not worth the round
      // trip today.
      const feedbackRows = await listFeedbackByUser(user.id);

      const text = formatDataExport({
        user: {
          email: user.email ?? profileRow?.email ?? null,
          display_name: profileRow?.display_name ?? null,
          points: profileRow?.points ?? null,
        },
        flags,
        feedback: feedbackRows,
        categoryLabel: (cat) => CATEGORY_LABELS[cat],
      });

      const flagCount = flags.length;
      const feedbackCount = feedbackRows.length;
      const successMsg = `Exported ${flagCount} flag${
        flagCount === 1 ? '' : 's'
      } + ${feedbackCount} feedback item${
        feedbackCount === 1 ? '' : 's'
      } to your clipboard.`;

      if (Platform.OS === 'web') {
        const nav = typeof navigator !== 'undefined' ? navigator : undefined;
        if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(text);
          if (
            typeof window !== 'undefined' &&
            typeof window.alert === 'function'
          ) {
            window.alert(successMsg);
          }
        } else if (
          typeof window !== 'undefined' &&
          typeof window.alert === 'function'
        ) {
          // No clipboard API available — fall back to dumping the text
          // into the alert so the user can copy it manually. Not pretty,
          // but PIPEDA right-of-access requires the user can actually get
          // their data, not just a "sorry" message.
          window.alert(`${successMsg}\n\n${text}`);
        }
      } else {
        // Native: hand the text to the OS share sheet. The share sheet
        // has a "Copy" action on iOS and Android — that's the clipboard
        // path the spec calls for, plus Mail / Notes / Files / etc.
        await Share.share({ message: text });
        // Confirm after the sheet closes so the screen-reader announcement
        // includes the count info.
        Alert.alert('Data exported', successMsg);
      }
    } catch (e) {
      const msg = errorMessage(e);
      // User-cancel on iOS Share throws — swallow it so it doesn't look
      // like a real failure.
      if (/cancel|dismiss/i.test(msg)) {
        setExporting(false);
        return;
      }
      Alert.alert('Could not export data', 'Try again.');
    } finally {
      setExporting(false);
    }
  };

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
          Your data
        </Text>

        <SettingsRow
          title="Export my data"
          subtitle="Copy your flags and feedback to your clipboard as plain text."
          icon="📋"
          accessibilityHint="Copies your flags and feedback to your clipboard as plain text"
          onPress={handleExportPress}
          disabled={exporting}
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
  // Visual cue while the export handler is running. The handler also
  // guards re-entrancy in code, so this is purely a "don't tap me twice"
  // affordance.
  rowDisabled: { opacity: 0.6 },
  // Decorative leading glyph. font.size.xl matches the chevron's visual
  // weight so the row balances left-to-right.
  rowIcon: {
    fontSize: font.size.xl,
    width: 28,
    textAlign: 'center',
    color: color.textMuted,
  },
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
