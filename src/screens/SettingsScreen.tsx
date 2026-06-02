import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { ChevronRight, ClipboardCopy, Moon, PlayCircle, Smartphone, Sun } from 'lucide-react-native';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, type ThemeMode, useColor, useThemeMode } from '@/theme/ThemeContext';
import { AppText } from '@/components/ui/AppText';
import { hapticSelection } from '@/lib/haptics';
import { signOut, supabase } from '@/lib/supabase';
import { confirm } from '@/lib/confirm';
import { useAuth } from '@/lib/auth';
import { useSharedModals } from '@/lib/sharedModalsContext';
import { CATEGORY_LABELS, listFlagsByUser } from '@/lib/flags';
import { listFeedbackByUser } from '@/lib/feedbackStore';
import { formatDataExport } from '@/lib/dataExport';
import type { UserRow } from '@/types/database';
import { deletePushToken, enablePushNotifications, getPushEnabled } from '@/lib/pushNotifications';
// NotificationPrefsModal stays mounted locally — Settings's instance is
// bare (no initialPrefs / onPrefsChanged), but ProfileScreen's instance
// is per-screen-stateful (carries `initialPrefs={notificationPrefs}` and
// an `onPrefsChanged` that fires Profile's `refreshUpdateCount`). Lifting
// it would either drop the Profile optimization or force callbacks
// through the context. See src/lib/sharedModalsContext.tsx for the full
// rationale.
import NotificationPrefsModal from '@/components/NotificationPrefsModal';
import AboutScreen from '@/screens/AboutScreen';
import OnboardingModal from '@/screens/OnboardingModal';
import NotificationPreferencesScreen from '@/screens/NotificationPreferencesScreen';

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
  busy,
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
  icon?: React.ReactNode;
  // When the row is busy running its handler we soften the press affordance
  // and block re-entrancy (the handler also no-ops if it's busy, but the
  // visual cue helps sighted users).
  disabled?: boolean;
  // When true, swap the trailing chevron for an ActivityIndicator so sighted
  // users see that the row's handler is mid-flight (the 2-5s data-export
  // fetch otherwise looks frozen). Also bumps accessibilityState.busy so
  // screen readers announce the activity rather than a silent dead row.
  busy?: boolean;
}) {
  const color = useColor();
  const styles = makeStyles(color);
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
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
    >
      {icon ? (
        <View
          style={styles.rowIcon}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {icon}
        </View>
      ) : null}
      <View style={styles.rowTextWrap}>
        <AppText variant="label" style={[styles.rowTitle, destructive && styles.rowTitleDestructive]}>
          {title}
        </AppText>
        <AppText variant="body" style={styles.rowSubtitle}>{subtitle}</AppText>
      </View>
      {/* Trailing affordance: a spinner while the row's handler runs, a
          decorative chevron otherwise. Both are hidden from AT (the row's
          accessibilityLabel + busy state carry the meaning). */}
      {busy ? (
        <ActivityIndicator
          // accessibilityElementsHidden + importantForAccessibility hide the
          // spinner from VoiceOver/TalkBack — the busy state on the parent
          // Pressable already announces "in progress".
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.rowSpinner}
          color={color.textSubtle}
        />
      ) : (
        <ChevronRight
          size={18}
          color={color.textSubtle}
          strokeWidth={2.2}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      )}
    </Pressable>
  );
}

// Light / Dark / System appearance picker — a 3-segment control writing through
// useThemeMode() (persisted in ThemeContext). 'System' follows the OS setting.
function AppearanceControl() {
  const color = useColor();
  const styles = makeStyles(color);
  const { mode, setMode } = useThemeMode();
  const options: { key: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { key: 'light', label: 'Light', Icon: Sun },
    { key: 'dark', label: 'Dark', Icon: Moon },
    { key: 'system', label: 'System', Icon: Smartphone },
  ];
  return (
    <View style={styles.segmentRow} accessibilityRole="radiogroup" accessibilityLabel="Appearance">
      {options.map(({ key, label, Icon }) => {
        const selected = mode === key;
        const fg = selected ? color.brandText : color.textMuted;
        return (
          <Pressable
            key={key}
            onPress={() => {
              setMode(key);
              hapticSelection();
            }}
            style={[styles.segment, selected && { backgroundColor: color.brandSofter }]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            accessibilityHint={`Use ${label.toLowerCase()} appearance`}
          >
            <Icon size={16} color={fg} strokeWidth={2.2} />
            <AppText variant="label" size={font.size.sm} color={fg}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
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
  const color = useColor();
  const styles = makeStyles(color);
  // Keep a stable reference for the push ActivityIndicator color — we can't
  // call useColor() inside conditional JSX, so we capture it here at the
  // top of the component. Use color.text (#333 light, #ddd dark) for ≥4.5:1
  // contrast on spinner strokes. color.textSubtle (#999 light, #777 dark) is
  // only for non-essential text or 18pt+, which thin spinners are not.
  const pushSpinnerColor = color.text;
  // Help, Changelog, Feedback, and MyFeedback are all mounted ONCE at
  // the navigator level via <SharedModalsHost /> (see RootNavigator.tsx +
  // src/lib/sharedModalsContext.tsx). Settings just sets the shared
  // "which modal is open" key here.
  const { setOpen } = useSharedModals();
  // NotificationPrefs and About stay per-screen — see the import-block
  // comment for why NotificationPrefs is excluded from the shared pool,
  // and AboutScreen is mounted per-screen everywhere it appears (also
  // present on ProfileScreen with its own state) because its parent
  // styles differ slightly per host. Both keep their own visible flag.
  const [notifOpen, setNotifOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // "Replay tutorial" — opens the 3-card OnboardingModal inline so the
  // user actually SEES the tutorial right now, rather than the Profile
  // tab's existing button which only resets the per-user flag (forcing
  // a sign-out / sign-in to actually see the cards). This is the
  // immediate-replay version most users expect from a "Replay" control.
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [notifPrefsOpen, setNotifPrefsOpen] = useState(false);

  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  // Push notifications toggle state.
  // Reads the AsyncStorage preference on mount so the toggle reflects the
  // user's last choice without a round-trip to the DB.
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    getPushEnabled(user.id)
      .then(setPushEnabled)
      .catch(() => setPushEnabled(false));
  }, [user]);

  const handlePushToggle = async (value: boolean) => {
    if (!user || pushBusy) return;
    setPushBusy(true);
    try {
      if (value) {
        const success = await enablePushNotifications(user.id);
        // Only update local state if the full flow succeeded (user confirmed +
        // token obtained). If they tapped "Not now" or permission was denied,
        // the toggle stays off.
        if (success) setPushEnabled(true);
      } else {
        await deletePushToken(user.id);
        setPushEnabled(false);
      }
    } catch (e) {
      Alert.alert('Could not update notifications', 'Please try again.');
      console.warn('[SettingsScreen] handlePushToggle error:', e);
    } finally {
      setPushBusy(false);
    }
  };

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
        // PRIVACY: Explicit columns — never select('*') on users; future schema
        // columns must not leak automatically to data-export payloads.
        supabase.from('users').select('id, display_name, avatar_url, points, created_at').eq('id', user.id).maybeSingle(),
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
          email: user.email ?? null,
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
      } + ${feedbackCount} feedback item${feedbackCount === 1 ? '' : 's'} to your clipboard.`;

      if (Platform.OS === 'web') {
        const nav = typeof navigator !== 'undefined' ? navigator : undefined;
        if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(text);
          if (typeof window !== 'undefined' && typeof window.alert === 'function') {
            window.alert(successMsg);
          }
        } else if (typeof window !== 'undefined' && typeof window.alert === 'function') {
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
        const result = await Share.share({ message: text });
        // On iOS, dismissing the sheet (tapping outside / Cancel) resolves
        // the promise with `{ action: Share.dismissedAction }` — it does
        // NOT throw. Without this guard the user would see a misleading
        // "Data exported" Alert even though they cancelled. Short-circuit
        // here so the success Alert only fires when they actually picked
        // an activity (Copy / Mail / Notes / etc.).
        if (result.action === Share.dismissedAction) {
          return;
        }
        // Confirm after the sheet closes so the screen-reader announcement
        // includes the count info.
        Alert.alert('Data exported', successMsg);
      }
    } catch {
      // Real failures only — the iOS dismiss path is handled above and
      // never reaches this catch. Keep the message generic; PIPEDA-style
      // retries are fine, we don't want to leak Supabase/network internals
      // to the user.
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
    const ok = await confirm('Sign out?', 'Are you sure you want to sign out?', 'Sign out', true);
    if (!ok) return;

    // Fire-and-forget — signOut (with userId) handles best-effort offline
    // cache clear (Jordan Condition 1) + push token deletion centrally,
    // then calls supabase.auth.signOut(). The AuthProvider listener takes
    // care of routing back to SignInScreen.
    void signOut(user?.id);
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
      >
        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Notifications
        </AppText>

        <SettingsRow
          title="Notification preferences"
          subtitle="Choose which flag status changes surface as updates."
          accessibilityHint="Opens notification preferences"
          onPress={() => setNotifOpen(true)}
        />

        {/* Push notifications toggle — Jordan condition 4.
            Uses a Switch so the current state is always visible without
            tapping into a sub-screen. On/off mirrors the push_tokens row
            presence: row exists = enabled, absent = disabled. */}
        <View
          style={styles.pushRow}
          accessible
          accessibilityRole="switch"
          accessibilityLabel={`Push notifications, currently ${pushEnabled ? 'on' : 'off'}`}
          accessibilityHint="Receive a push notification when your flag is verified or resolved"
          accessibilityState={{ checked: pushEnabled, busy: pushBusy }}
        >
          <View style={styles.pushTextWrap}>
            <AppText variant="label" style={styles.rowTitle}>Push notifications</AppText>
            <AppText variant="body" style={styles.rowSubtitle}>
              Get notified when your flag is verified or resolved.
            </AppText>
          </View>
          {pushBusy ? (
            <ActivityIndicator
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              color={pushSpinnerColor}
            />
          ) : (
            <Switch
              value={pushEnabled}
              onValueChange={handlePushToggle}
              disabled={pushBusy || !user}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          )}
        </View>

        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Appearance
        </AppText>

        <AppearanceControl />

        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Help & info
        </AppText>

        <SettingsRow
          title="Help & FAQ"
          subtitle="Common questions about reports, points, and accessibility."
          accessibilityHint="Opens collapsible answers to common questions"
          onPress={() => setOpen('help')}
        />

        <SettingsRow
          title="What's new"
          subtitle="Recent features added to AccessMap."
          accessibilityHint="Opens a dated list of recent shipped features"
          onPress={() => setOpen('changelog')}
        />

        <SettingsRow
          title="About AccessMap"
          subtitle="Version, credits, and a short privacy summary."
          accessibilityHint="Opens the about page with version and privacy info"
          onPress={() => setAboutOpen(true)}
        />

        <SettingsRow
          title="Replay tutorial"
          subtitle="Re-show the 3-card welcome intro."
          icon={<PlayCircle size={18} color={color.textMuted} strokeWidth={2.2} />}
          accessibilityHint="Opens the welcome intro you saw the first time you signed in"
          onPress={() => setTutorialOpen(true)}
        />

        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Feedback
        </AppText>

        <SettingsRow
          title="Send feedback"
          subtitle="Tell the maintainer what's working or what's broken."
          accessibilityHint="Opens the feedback form"
          onPress={() => setOpen('feedback')}
        />

        <SettingsRow
          title="My feedback history"
          subtitle="View the feedback messages you've sent."
          accessibilityHint="Opens the list of feedback you've sent"
          onPress={() => setOpen('myFeedback')}
        />

        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Your data
        </AppText>

        <SettingsRow
          title="Export my data"
          subtitle="Copy your flags and feedback to your clipboard as plain text."
          icon={<ClipboardCopy size={18} color={color.textMuted} strokeWidth={2.2} />}
          accessibilityHint="Copies your flags and feedback to your clipboard as plain text"
          onPress={handleExportPress}
          disabled={exporting}
          busy={exporting}
        />

        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Account
        </AppText>

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

      {/* Only NotificationPrefs + About render here; the other four
          modals (Help, Changelog, Feedback, MyFeedback) live in a single
          <SharedModalsHost /> mount inside RootNavigator. */}
      <NotificationPrefsModal visible={notifOpen} onClose={() => setNotifOpen(false)} />
      <AboutScreen visible={aboutOpen} onClose={() => setAboutOpen(false)} />
      {/* Replay tutorial — same OnboardingModal App.tsx mounts on first
          launch. Reusing it (rather than a sibling "tutorial-light"
          surface) means the content stays in lockstep with the original
          experience. The modal's onDone closes it; we deliberately do
          NOT call markOnboardingSeen here — the per-user "seen" flag is
          already set (otherwise the auto-show in App.tsx would've fired
          before the user could reach Settings), so there's nothing to
          mutate. */}
      <OnboardingModal visible={tutorialOpen} onDone={() => setTutorialOpen(false)} />
      <NotificationPreferencesScreen
        visible={notifPrefsOpen}
        onClose={() => setNotifPrefsOpen(false)}
      />
    </>
  );
}

// Named constant for the large touch-target row height used by SettingsRow and
// pushRow. 64pt exceeds WCAG 2.5.5's 44pt minimum, giving comfortable tap area
// for a two-line (title + subtitle) row. Replace with a spacing token when one
// is added to src/theme.ts (e.g. spacing.touchTargetLg).
const SETTINGS_ROW_HEIGHT = 64;

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
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
      minHeight: SETTINGS_ROW_HEIGHT,
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
    // Spinner sits where the chevron usually does so the row width doesn't
    // jump when toggling busy/idle. Width roughly matches the chevron's
    // glyph width — keeps the layout calm.
    rowSpinner: {
      width: 28,
    },
    // Push notifications toggle row — same visual weight as SettingsRow but
    // with a Switch in place of a chevron. Matches the row padding and
    // shadow so the two control types look like siblings in the section.
    pushRow: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: SETTINGS_ROW_HEIGHT,
      ...shadow.e1,
    },
    pushTextWrap: { flex: 1, gap: 2 },
    // Appearance segmented control (Light / Dark / System).
    segmentRow: {
      flexDirection: 'row',
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: spacing.tight,
      gap: spacing.tight,
      ...shadow.e1,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
      minHeight: 44,
    },
  });
