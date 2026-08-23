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
import { ChevronRight, Moon, Smartphone, Sun } from 'lucide-react-native';
import { androidSwitchThumbOff, font, radius, shadow, size, spacing } from '@/theme';
import { type ColorTheme, type ThemeMode, useColor, useThemeMode } from '@/theme/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@/components/ui/AppText';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TypeBlock, TYPE_BLOCK } from '@/components/ui/TypeBlock';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { HeaderActions } from '@/components/ui/HeaderActions';
import { useDrawer } from '@/lib/drawerContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticSelection } from '@/lib/haptics';
import { signOut, supabase } from '@/lib/supabase';
import { confirm, notify } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import { a11yToggle, decorativeProps } from '@/lib/accessibility';
import { useAuth } from '@/lib/auth';
import { useFeatureFlag } from '@/lib/featureFlags';
import { useSharedModals } from '@/lib/sharedModalsContext';
import { useBottomTabBarHeight, type BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import { CATEGORY_LABELS, listFlagsByUser } from '@/lib/flags';
import { listFeedbackByUser } from '@/lib/feedbackStore';
import { formatDataExport } from '@/lib/dataExport';
import {
  BLOCKED_PEOPLE_EMPTY,
  BLOCKED_PEOPLE_ROW_SUBTITLE,
  BLOCKED_PEOPLE_ROW_TITLE,
  HIDDEN_COMMENTS_LINK_HINT,
  HIDDEN_COMMENTS_ROW_SUBTITLE,
  HIDDEN_COMMENTS_TITLE,
  PRIVACY_POLICY_LINK_HINT,
  PRIVACY_POLICY_LINK_LABEL,
  PUSH_SIGNED_OUT_SUBTITLE,
  TERMS_LINK_HINT,
  TERMS_LINK_LABEL,
  UNBLOCK_ALL_CONFIRM_BODY,
  UNBLOCK_ALL_LABEL,
} from '@/lib/copy';
import { loadHidden, unhideContent } from '@/lib/hiddenContent';
import type { UserRow } from '@/types/database';
import {
  deletePushToken,
  enablePushNotifications,
  getNotificationPermission,
  getPushEnabled,
} from '@/lib/pushNotifications';
// NotificationPrefsModal stays mounted locally — Settings's instance is
// bare (no initialPrefs / onPrefsChanged), but ProfileScreen's instance
// is per-screen-stateful (carries `initialPrefs={notificationPrefs}` and
// an `onPrefsChanged` that fires Profile's `refreshUpdateCount`). Lifting
// it would either drop the Profile optimization or force callbacks
// through the context. See src/lib/sharedModalsContext.tsx for the full
// rationale.
import NotificationPrefsModal from '@/components/NotificationPrefsModal';
import HiddenCommentsModal from '@/components/HiddenCommentsModal';
import AboutScreen from '@/screens/AboutScreen';
import OnboardingModal from '@/screens/OnboardingModal';
import NotificationPreferencesScreen from '@/screens/NotificationPreferencesScreen';

/**
 * One grouped card per SECTION (board 07).
 *
 * Every row used to be its own glass card, so a screen of eleven rows was
 * eleven floating panes with eleven shadows — the Home list's own grammar,
 * which stacks rows INSIDE one card with hairline separators, said the
 * opposite thing one tab away. The card is the section now; the rows are rows.
 *
 * `overflow: 'hidden'` is what lets a row's press wash reach the card's
 * rounded corner without escaping it.
 */
function SettingsGroup({ children }: { children: React.ReactNode }) {
  const color = useColor();
  const styles = makeStyles(color);
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <GlassSurface variant="row" style={styles.group}>
      {rows.map((row, i) => (
        <View key={i}>
          {i > 0 && (
            <View
              style={styles.groupSep} {...decorativeProps}
            />
          )}
          {row}
        </View>
      ))}
    </GlassSurface>
  );
}

// One row in the settings list. We declare it locally instead of factoring
// into its own file because it's only used here and the rest of the app
// inlines small components the same way (see ProfileScreen's Stat helper).
function SettingsRow({
  title,
  subtitle,
  onPress,
  accessibilityHint,
  destructive,
  control,
  disabled,
  busy,
  role = 'button',
}: {
  title: string;
  // Optional so a row can ship without inventing a second line of copy — the
  // privacy-policy link is title-only pending Sky's wording (honesty fence).
  subtitle?: string;
  onPress: () => void;
  accessibilityHint: string;
  destructive?: boolean;
  // Rows that leave the app announce as links, not buttons — the shipped
  // convention on ResourcesScreen's link cards. Defaults to 'button' so every
  // existing row is byte-unchanged.
  role?: 'button' | 'link';
  /**
   * I4: Settings rows carry NO leading icons — the drawer carries icons,
   * Settings carries explanations. Two of eleven rows used to have one, which
   * meant the glyph could not be signal (it marked nothing in common) and read
   * as decoration nobody had decided on.
   *
   * What replaced the `icon` prop is this TRAILING slot: the control a row
   * operates, when it is not a chevron. The push-notification row is the only
   * caller — it hand-rolled its own pane, its own text wrap and its own busy
   * treatment for exactly this reason, and drifted from the house row on all
   * three (SW-20 / SW-49 had to re-apply them by hand). Passing the Switch in
   * here is that fix made structural.
   */
  control?: React.ReactNode;
  // When the row is busy running its handler we soften the press affordance
  // and block re-entrancy (the handler also no-ops if it's busy, but the
  // visual cue helps sighted users).
  disabled?: boolean;
  // When true, swap the trailing affordance — chevron or control — for an
  // ActivityIndicator so sighted users see that the row's handler is mid-flight
  // (the 2-5s data-export fetch otherwise looks frozen). Also bumps
  // accessibilityState.busy so screen readers announce the activity rather than
  // a silent dead row. ONE busy idiom for the whole screen: the push row used
  // to swap its Switch for a spinner through its own hand-written branch.
  busy?: boolean;
}) {
  const color = useColor();
  const styles = makeStyles(color);
  return (
    <Pressable
      // Pressable stays the interactive/a11y root; GlassSurface (below) is
      // material only. Press feedback is an opacity dim (a bg swap is invisible
      // over glass) — matches the Tasks FlagCard recipe.
      style={({ pressed }) => [
        pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      {...a11yToggle({ disabled: !!disabled, busy: !!busy })}
    >
      {/* The material moved up to SettingsGroup — this is a row inside a card
          now, not a card of its own. */}
      <View style={styles.row}>
        {/* T3 (X10): 16pt title on `label` capped at 1.6 -> 25.6pt, while the
            13pt subtitle on `bodyMedium` scaled uncapped past it. Every Settings
            row read title-under-subtitle above ~1.6x. One content block, one
            multiplier, order preserved. */}
        <TypeBlock cap={TYPE_BLOCK.content}>
        <View style={styles.rowTextWrap}>
          <AppText variant="label" style={[styles.rowTitle, destructive && styles.rowTitleDestructive]}>
            {title}
          </AppText>
          {/* bodyMedium (>=500): secondary row text keeps textMuted but must
              carry >=500 weight on glass (the 400 face hazes). */}
          {subtitle ? (
            <AppText variant="bodyMedium" style={styles.rowSubtitle}>{subtitle}</AppText>
          ) : null}
        </View>
        </TypeBlock>
        {/* Trailing affordance, in one place for every row: a spinner while the
            handler runs, otherwise the row's own control if it has one, else the
            decorative chevron. The spinner and the chevron are hidden from AT
            (the row's accessibilityLabel + busy state carry the meaning); a
            control carries its own. */}
        {busy ? (
          <ActivityIndicator
            // + importantForAccessibility hide the
            // spinner from VoiceOver/TalkBack — the busy state on the parent
            // Pressable already announces "in progress".
            style={styles.rowSpinner}
            // The push row's own spinner was already color.text, with a comment
            // saying why: textSubtle (#999 light / #777 dark) is for
            // non-essential text or 18pt+, which a thin spinner stroke is not.
            // Merging the two busy idioms takes the measured value, not the
            // one that happened to be on the component.
            color={color.text} {...decorativeProps}
          />
        ) : control ? (
          control
        ) : (
          <ChevronRight
            size={18}
            color={color.textSubtle}
            strokeWidth={2.2} {...decorativeProps}
          />
        )}
      </View>
    </Pressable>
  );
}

// Light / Dark / System appearance picker — a 3-segment control writing through
// useThemeMode() (persisted in ThemeContext). 'System' follows the OS setting.
function AppearanceControl() {
  const { mode, setMode } = useThemeMode();
  const options: { key: ThemeMode; label: string; Icon: typeof Sun }[] = [
    { key: 'light', label: 'Light', Icon: Sun },
    { key: 'dark', label: 'Dark', Icon: Moon },
    { key: 'system', label: 'System', Icon: Smartphone },
  ];
  return (
    // The control itself is the shared primitive (2026-08-22): this was one of
    // four hand-rolled drawings of one widget. `surface="stage"` is the
    // arbitrated stage palette this screen was built against in Phase 2c —
    // glassChipFill/glassChipEdge track, opaque `surface` selected pill,
    // brandText selected / glassChipInk unselected (textMuted is forbidden on
    // the tint/stage). Nothing about the ink moved; it moved FILES.
    <SegmentedControl
      variant="track"
      surface="stage"
      groupRole="radiogroup"
      groupLabel="Appearance"
      cellRole="radio"
      cells={options.map(({ key, label, Icon }) => ({
        key,
        label,
        hint: `Use ${label.toLowerCase()} appearance`,
        selected: mode === key,
        onPress: () => {
          setMode(key);
          hapticSelection();
        },
        renderIcon: (fg: string) => <Icon size={18} color={fg} strokeWidth={2.2} />,
      }))}
    />
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
  const tabBarHeight = useBottomTabBarHeight();
  // Help, Changelog, Feedback, and MyFeedback are all mounted ONCE at
  // the navigator level via <SharedModalsHost /> (see RootNavigator.tsx +
  // src/lib/sharedModalsContext.tsx). Settings just sets the shared
  // "which modal is open" key here.
  const { setOpen } = useSharedModals();
  const drawer = useDrawer();
  const insets = useSafeAreaInsets();
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
  // HIGH-2 — the Unhide surface. Local visible-state modal, like the two above:
  // it is reachable only from here, so it needs no shared-modal key and no
  // navigator change.
  const [hiddenOpen, setHiddenOpen] = useState(false);
  // Apple 1.2(c). Count only — the list holds account ids and no names, so
  // there is nothing else worth lifting into this screen. See the row below.
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const blockedCount = blockedIds.length;
  // Sky Decision 2 (Option B): the push-notification-types screen saves prefs
  // nothing reads yet, so the row + screen stay hidden until the flag flips.
  const pushNotifTypesEnabled = useFeatureFlag('PUSH_NOTIF_TYPES_ENABLED');

  // SW-49: `loading` matters here, not just `user`. AuthProvider starts at
  // { user: null, loading: true } and resolves getSession() async, so a
  // SIGNED-IN user's Settings screen renders for a frame or two in a state
  // indistinguishable from a guest's. That is the window the walk tapped into:
  // two taps on the push switch, no state change, no alert, and no
  // `handlePushToggle error` anywhere in the console — because the handler's
  // `if (!user || pushBusy) return;` took the silent branch while the Switch
  // still rendered as a live control.
  const { user, loading: authLoading } = useAuth();
  // Q15: the guest ACCOUNT row's destination. Same route the drawer's "Sign in"
  // takes (RootNavigator's onSignIn) — the Profile tab hosts the sign-in modal.
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, 'Settings'>>();
  const [exporting, setExporting] = useState(false);

  // Push notifications toggle state.
  // Reads the AsyncStorage preference on mount so the toggle reflects the
  // user's last choice without a round-trip to the DB.
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  // The push row cannot act yet — either auth has not resolved or there is no
  // account to attach a token to. Distinct from `pushBusy`, which swaps the
  // whole Switch for a spinner and is therefore already self-explaining.
  const pushLocked = authLoading || !user;
  // ...and this is the half we can EXPLAIN. While auth is still resolving we do
  // not yet know whether there is an account, so the row dims and waits rather
  // than telling a signed-in user to sign in.
  const pushNeedsAccount = !authLoading && !user;

  // Apple 1.2(c) — read the block count for the row below.
  //
  // NOT gated on `user`: the block list is device-local AsyncStorage and a
  // signed-out reader can both block and unblock, so gating this on an account
  // would leave a guest with no way back out of a block they just made.
  //
  // `hiddenOpen` is in the deps so the count refreshes when the neighbouring
  // Hidden-comments sheet closes — that sheet writes the same storage key, and
  // a stale count under a sheet the user just used reads as a bug.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // loadHidden never rejects by contract — it warns and answers
      // "nothing hidden" — so there is nothing to catch here.
      const hidden = await loadHidden();
      if (!cancelled) setBlockedIds(hidden.author);
    })();
    return () => {
      cancelled = true;
    };
  }, [hiddenOpen]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const enabled = await getPushEnabled(user.id);
        if (cancelled) return;
        if (!enabled) {
          setPushEnabled(false);
          return;
        }
        // F52 (re-sweep): the stored preference can outlive the OS permission
        // (user revokes it in system Settings) — without this check the toggle
        // showed ON while no push could ever be delivered. null = "can't tell
        // here" (web / module absent), in which case trust the stored pref.
        const osPermission = await getNotificationPermission();
        if (cancelled) return;
        setPushEnabled(osPermission !== false);
      } catch {
        if (!cancelled) setPushEnabled(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
        // F49: deletePushToken now throws when the server-side delete fails,
        // so the toggle only flips OFF when the opt-out actually stuck.
        await deletePushToken(user.id);
        setPushEnabled(false);
      }
    } catch (e) {
      notify(
        'Could not update notifications',
        value
          ? 'Please try again.'
          : "Your opt-out didn't reach the server, so notifications are still on. Please check your connection and try again.",
      );
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
      //
      // ⚑ NO `excludeBodyPrefix` HERE, AND IT IS NOT AN OVERSIGHT TO "FIX".
      // My Feedback hides `[REPORT]` rows because it is a reading surface and
      // the envelope is unreadable internal encoding. This is a PIPEDA
      // subject-access export, where completeness is the entire product. Sky's
      // stance, §SKY-6: exports must be complete; raw data in a data export is
      // honest. A user asking for everything you hold about them is owed the
      // rows they wrote, envelope and all — tidying the output by dropping them
      // would make the export prettier and untrue. If you are here to "make the
      // export match My Feedback", the two are supposed to differ.
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

  /**
   * Apple 1.2(c) — the way back out. Clears every blocked author on this
   * device.
   *
   * `unhideContent('author', id)` per id rather than `clearHidden()`, which is
   * the same discipline HiddenCommentsModal records for its own bulk action:
   * `clearHidden` wipes the WHOLE key, so it would silently un-hide every
   * individually hidden COMMENT as a side effect of unblocking people. Two
   * different decisions by the reader, and one must not undo the other.
   *
   * Sequential, not Promise.all: each call is a load-modify-save on one
   * AsyncStorage key, and racing them would let a later write clobber an
   * earlier one's result. The list is realistically single digits.
   *
   * Failure is surfaced, not swallowed — `unhideContent` throws on a failed
   * write, and the state only advances for ids that actually landed, so a
   * partial failure leaves an honest count rather than a lie.
   */
  const handleUnblockAllPress = async () => {
    if (blockedIds.length === 0) return;
    const ok = await confirm(UNBLOCK_ALL_LABEL, UNBLOCK_ALL_CONFIRM_BODY, UNBLOCK_ALL_LABEL, true);
    if (!ok) return;
    const cleared: string[] = [];
    try {
      for (const id of blockedIds) {
        await unhideContent('author', id);
        cleared.push(id);
      }
    } catch (e) {
      setBlockedIds((prev) => prev.filter((id) => !cleared.includes(id)));
      notify(UNBLOCK_ALL_LABEL, errorMessage(e));
      return;
    }
    setBlockedIds([]);
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
      {/* The screen body is the Deep Field stage. ScreenStage is absolute-fill
          + a11y-hidden, so it sits behind the transparent scroll. (S8 removed
          the shared dark nav-header chrome that used to sit above this — there
          is no chrome pane here.) */}
      <View style={styles.stageRoot}>
        <ScreenStage />
        <LinearGradient
          colors={[color.stage0, `${color.stage0}00`]}
          style={styles.statusLedge}
          pointerEvents="none"
          {...decorativeProps}
        />
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[
            styles.container,
            // S8: headerShown:false now — clear the status bar ourselves, uniform
            // with the headerless Home/Tasks/Profile (automatic is a web no-op).
            { paddingTop: insets.top + spacing.lg, paddingBottom: tabBarHeight + 16 },
          ]}
        >
        {/* S8: Settings gains the editorial header (was nav-header-only) — the
            menu + Feedback circles and the display title now match every tab. */}
        <ScreenHeader
          style={styles.settingsHeader}
          // Board 07: the eyebrow says whose settings these are instead of
          // repeating the title one line below it — the one screen in the app
          // where the eyebrow/title pair had nothing to add.
          // PLACEHOLDER COPY (SKY-WORDS-REQUIRED).
          eyebrow="FLAGSTONE"
          title="Settings"
          eyebrowColor={color.inkOnStage}
          subtitleColor={color.inkOnStage}
          actions={
            <HeaderActions
              onMenu={() => drawer.setOpen(true)}
              onFeedback={() => setOpen('feedback')}
              iconColor={color.textStrong}
            />
          }
        />
        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Notifications
        </AppText>

        <SettingsGroup>
        <SettingsRow
          title="Update preferences"
          subtitle="Choose which flag changes appear in your updates."
          accessibilityHint="Opens update preferences"
          onPress={() => setNotifOpen(true)}
        />

        {/* F10: this row exposes NotificationPreferencesScreen (push-alert
            categories), which was mounted below but had no entry point in
            Settings — setNotifPrefsOpen(true) was never called anywhere here,
            so the screen was permanently unreachable from this tab.
            Re-sweep FIX A: gated behind PUSH_NOTIF_TYPES_ENABLED (default
            false) — the screen's saved prefs aren't read by the push pipeline
            yet, so the row hides until the wiring lands. */}
        {pushNotifTypesEnabled ? (
          <SettingsRow
              title="Push notification types"
            subtitle="Pick which push alerts you get: status changes, nearby flags, watched flags, and digests."
            accessibilityHint="Opens push notification category preferences"
            onPress={() => setNotifPrefsOpen(true)}
          />
        ) : null}

        {/* Push notifications toggle — Jordan condition 4.
            Uses a Switch so the current state is always visible without
            tapping into a sub-screen. On/off mirrors the push_tokens row
            presence: row exists = enabled, absent = disabled. */}
        {/* WCAG 4.1.2/2.1.1: the Switch carries the accessible identity and
            stays in the a11y tree so it can actually be toggled by a screen
            reader. Previously role="switch" sat on the wrapper View (no press
            handler) with the Switch hidden, so VoiceOver/TalkBack could read
            but not flip it. Mirrors NotificationPrefsModal. */}
        {/* SW-20/SW-49 closed structurally. This was the one row in the file
            that did not go through SettingsRow, which is exactly why it missed
            both halves of the house treatment (`rowDisabled` and a subtitle
            that says why) and had them re-applied by hand afterwards. It is a
            SettingsRow now: the disabled dim, the subtitle, the row height, the
            text wrap and the busy spinner all come from the component, and the
            Switch rides in the trailing control slot. The row's own press
            toggles the switch too, so the whole 64pt row is the target.

            The Switch keeps its OWN accessible identity (role, label, hint,
            checked state): a screen reader must land on a switch it can flip,
            not on a button that says "Push notifications". */}
        <SettingsRow
          title="Push notifications"
          subtitle={
            pushNeedsAccount
              ? PUSH_SIGNED_OUT_SUBTITLE
              : 'Get notified when your flag is verified or resolved.'
          }
          accessibilityHint={
            pushNeedsAccount
              ? PUSH_SIGNED_OUT_SUBTITLE
              : 'Receive a push notification when your flag is verified or resolved'
          }
          onPress={() => handlePushToggle(!pushEnabled)}
          disabled={pushBusy || pushLocked}
          busy={pushBusy}
          control={
            <Switch
              value={pushEnabled}
              onValueChange={handlePushToggle}
              disabled={pushBusy || pushLocked}
              accessibilityRole="switch"
              accessibilityLabel="Push notifications"
              accessibilityHint={
                pushNeedsAccount
                  ? PUSH_SIGNED_OUT_SUBTITLE
                  : 'Receive a push notification when your flag is verified or resolved'
              }
              {...a11yToggle({ checked: pushEnabled, disabled: pushBusy || pushLocked })}
              // BP-6: brand track (was the OS default green) — the estate
              // Switch recipe; false-track is themed so dark mode stays dark.
              trackColor={{ false: color.borderStrong, true: color.brand }}
              thumbColor={
                Platform.OS === 'android' ? (pushEnabled ? color.brand : androidSwitchThumbOff) : undefined
              }
            />
          }
        />
        </SettingsGroup>

        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Appearance
        </AppText>

        <AppearanceControl />

        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Help & info
        </AppText>

        <SettingsGroup>
        <SettingsRow
          title="Help & FAQ"
          subtitle="Common questions about reports, points, and accessibility."
          accessibilityHint="Opens collapsible answers to common questions"
          onPress={() => setOpen('help')}
        />

        <SettingsRow
          title="What's New"
          subtitle="Recent features added to Flagstone."
          accessibilityHint="Opens a dated list of recent shipped features"
          onPress={() => setOpen('changelog')}
        />

        <SettingsRow
          title="About Flagstone"
          subtitle="Version, credits, and a short privacy summary."
          accessibilityHint="Opens the about page with version and privacy info"
          onPress={() => setAboutOpen(true)}
        />

        {/* B-2 (SR-002): Apple 5.1.1(i) requires the privacy policy to be
            reachable from INSIDE the app, not only from App Store Connect
            metadata. Title-only — no subtitle is invented here; the wording
            is Sky's (PROPOSED, routed to BP16).
            B-3 (§SKY-8): it now opens the ratified policy IN the app rather
            than a browser, so role is "button" and the hint no longer says
            browser. The hosted URL still exists for App Store Connect — see
            PRIVACY_POLICY_URL — it is just no longer what this row opens. */}
        <SettingsRow
          title={PRIVACY_POLICY_LINK_LABEL}
          accessibilityHint={PRIVACY_POLICY_LINK_HINT}
          onPress={() => setOpen('privacy')}
        />

        {/* §SKY-6: the terms take the B-2 privacy-link grammar — same section,
            same title-only shape, beside its sibling. TWO deliberate departures:
            role stays the default "button" and the hint is NOT
            OPENS_IN_BROWSER_HINT, because this destination is in-app. Announcing
            "link … opens in your browser" for a sheet that never leaves the app
            would be a small lie told to screen-reader users only. */}
        <SettingsRow
          title={TERMS_LINK_LABEL}
          accessibilityHint={TERMS_LINK_HINT}
          onPress={() => setOpen('terms')}
        />

        {/* I4: the leading PlayCircle is gone. Two of eleven rows carried a
            glyph, which meant it marked nothing in common. The Replay tutorial
            row's TITLE, SUBTITLE and HINT are guard-pinned (onboardingCoherence)
            and are byte-unchanged. */}
        <SettingsRow
          title="Replay tutorial"
          subtitle="Re-show the welcome intro."
          accessibilityHint="Opens the welcome intro"
          onPress={() => setTutorialOpen(true)}
        />
        </SettingsGroup>

        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Feedback
        </AppText>

        <SettingsGroup>
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

        </SettingsGroup>

        {/* Board 07 — MODERATION.
            Hidden comments and Blocked people were filed under FEEDBACK
            (HIGH-2, §SKY-7 section pick S1: "records of things you did", which
            is true of all four). The critic's objection is about FINDING them:
            a user looking for "who did I block" does not look under Feedback.
            These two are the only rows on the screen that control what other
            people's content can reach this device, which is a different KIND of
            thing from telling the maintainer something.
            ⚠ S1 was Sky's own section pick — this reverses it, on the board's
            instruction. Flagged in the build report and the COPY_LEDGER.
            SECTION NAME IS A PLACEHOLDER (SKY-WORDS-REQUIRED). The two rows'
            own titles, subtitles and hints are untouched. */}
        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Moderation
        </AppText>

        <SettingsGroup>
        <SettingsRow
          title={HIDDEN_COMMENTS_TITLE}
          subtitle={HIDDEN_COMMENTS_ROW_SUBTITLE}
          accessibilityHint={HIDDEN_COMMENTS_LINK_HINT}
          onPress={() => setHiddenOpen(true)}
        />

        {/* APPLE 1.2(c) — the way back out of a block.
            Sits directly under Hidden comments because the two are the same
            kind of thing: a record of what this reader chose not to see, on
            this device. The subtitle carries the device-local fence in the
            same breath as the count, exactly as its neighbour does.

            WHY A COUNT AND A BULK UNDO RATHER THAN A LIST. The block list
            stores account ids and nothing else — deliberately, see
            UNBLOCK_ALL_LABEL in copy.ts. Caching display names locally so a
            per-person list could render them would persist a record of who
            you blocked BY NAME on your device, which is more identifying than
            the block itself and is not needed for the feature to work. With no
            names, a per-row list is a column of bare uuids. A count plus one
            honest undo is the version that does not trade privacy for polish.
            A named list is Sky's call (Phase-0 gate, escalation 3). */}
        <SettingsRow
          title={BLOCKED_PEOPLE_ROW_TITLE}
          subtitle={
            blockedCount === 0
              ? BLOCKED_PEOPLE_EMPTY
              : `${BLOCKED_PEOPLE_ROW_SUBTITLE} ${blockedCount} blocked.`
          }
          accessibilityHint="Unblocks everyone you have blocked on this device"
          onPress={handleUnblockAllPress}
          disabled={blockedCount === 0}
        />
        </SettingsGroup>

        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Your data
        </AppText>

        <SettingsGroup>
        {/* I4: the ClipboardCopy glyph is gone with the PlayCircle. §SKY-6's
            export rule — the title, the subtitle, the hint and handleExportPress
            itself — is untouched. */}
        <SettingsRow
          title="Export my data"
          subtitle="Copy your flags and feedback to your clipboard as plain text."
          accessibilityHint="Copies your flags and feedback to your clipboard as plain text"
          onPress={handleExportPress}
          disabled={exporting}
          busy={exporting}
        />
        </SettingsGroup>

        <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
          Account
        </AppText>

        <SettingsGroup>
        {/* Q15 — the one state this screen never addressed.
            A guest was offered "Sign out". The drawer, one tap earlier, offered
            "Sign in"; the same person met both in the same minute (dossier
            COULD-9). Same row, same slot, the answer that matches who is
            actually here. The red stays reserved for a member's real sign-out.
            The guest route is the drawer's own: the Profile tab hosts the
            sign-in modal, so this navigates there exactly as
            RootNavigator's `onSignIn` does. */}
        {user ? (
          <SettingsRow
            title="Sign out"
            subtitle="End your session on this device."
            // Signal destructive intent via the hint as well as the red color —
            // screen-reader users don't see the color cue.
            accessibilityHint="Destructive. Confirms before signing out."
            onPress={handleSignOutPress}
            destructive
          />
        ) : (
          <SettingsRow
            title="Sign in"
            subtitle="Report with a photo, verify other reports, and earn points."
            accessibilityHint="Opens the sign-in screen"
            onPress={() => navigation.navigate('Profile')}
          />
        )}
        </SettingsGroup>
        </ScrollView>
      </View>

      {/* Only NotificationPrefs + About render here; the other four
          modals (Help, Changelog, Feedback, MyFeedback) live in a single
          <SharedModalsHost /> mount inside RootNavigator. */}
      <NotificationPrefsModal visible={notifOpen} onClose={() => setNotifOpen(false)} />
      <AboutScreen visible={aboutOpen} onClose={() => setAboutOpen(false)} />
      <HiddenCommentsModal visible={hiddenOpen} onClose={() => setHiddenOpen(false)} />
      {/* Replay tutorial — OnboardingModal, which this file is the ONLY mount
          point for.

          SW-19 — this comment used to say App.tsx mounted this very component
          at first launch, and that reusing it therefore kept both surfaces
          showing identical content. Neither was ever true: App.tsx mounts
          OnboardingCards (App.tsx:208), a different component with FIVE cards,
          while this one has THREE steps and says "Step N of 3". Two onboarding
          surfaces have been drifting apart behind a comment asserting they
          could not. (Phrased without quoting the old text: a guard asserts
          those exact phrases are absent, and quoting them here would defeat it
          — the same trap the string-aware stripComments helper exists for.)

          Sky's call, 2026-08-21: keep both — they do different jobs, the
          first-launch flow carries live permission priming that a replay
          should not re-run — and make the copy honest instead. So the row's
          subtitle no longer claims a card count that belonged to neither
          surface, and this comment no longer claims a lockstep that does not
          exist. If the two are ever converged, converge them deliberately.

          The modal's onDone closes it; we deliberately do
          NOT call markOnboardingSeen here — the per-user "seen" flag is
          already set (otherwise the auto-show in App.tsx would've fired
          before the user could reach Settings), so there's nothing to
          mutate. */}
      <OnboardingModal visible={tutorialOpen} onDone={() => setTutorialOpen(false)} />
      {pushNotifTypesEnabled && (
        <NotificationPreferencesScreen
          visible={notifPrefsOpen}
          onClose={() => setNotifPrefsOpen(false)}
        />
      )}
    </>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // Transparent so the ScreenStage (behind, in stageRoot) shows through.
    screen: { flex: 1, backgroundColor: 'transparent' },
    // Flex root hosting the absolute-fill ScreenStage behind the scroll; bg =
    // stage1 so any pre-mount frame (and over-scroll) matches the field.
    stageRoot: { flex: 1, backgroundColor: color.stage1 },
    container: {
      padding: spacing.xxl,
      gap: spacing.md,
      alignItems: 'stretch',
    },
    // T13 (F2-06): zero the header's OWN horizontal padding so its eyebrow aligns
    // with the section rows at the single container inset (spacing.xxl) instead of
    // double-insetting (container xxl + ScreenHeader's default xl = 44). Mirrors
    // Profile's profileHeader convention. Horizontal only — vertical rhythm intact.
    settingsHeader: { paddingHorizontal: 0 },
    // F4: the status-bar ledge. Home and Settings scroll their content under a
    // transparent status bar, so a scrolled row could sit directly behind the
    // clock. A 47pt wash from stage0 down to the SAME COLOUR at zero alpha keeps
    // the bar legible without painting an opaque header over the stage.
    //
    // The second stop is `${color.stage0}00`, never the string 'transparent'.
    // 'transparent' is rgba(0,0,0,0), so the gradient interpolates through BLACK
    // and lays a grey veil over the stage — measured on the 17e, the stage's
    // #A6C8FB read #89A0C1 under the first draft of this ledge. Fading a colour
    // to its own zero-alpha twin is the only version that is actually invisible.
    // Decorative and pointer-inert — it must never intercept a tap meant for the
    // content beneath it.
    statusLedge: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 47,
      zIndex: 2,
    },
    sectionLabel: {
      fontSize: font.size.xs,
      // On the raw stage — inkOnStage, not textMuted (forbidden there, 4.10:1).
      // variant="label" already renders >=500, so only the color changes.
      color: color.inkOnStage,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.loose,
      fontWeight: font.weight.bold,
      marginTop: spacing.md,
      marginBottom: spacing.tight,
      marginLeft: spacing.tight,
    },
    // Row-glass pane, now per SECTION rather than per row: variant="row"
    // supplies the floor/edge/specular; only layout + radius + light-mode lift
    // live here — NEVER a backgroundColor (the clip layer swallows it). Dark is
    // luminosity-led (no drop shadow). overflow:hidden so a row's press wash
    // reaches the corner without escaping it.
    group: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      ...(color.scheme === 'light' ? shadow.e1 : {}),
    },
    // The Home list's separator, indented past the text column's left edge so
    // the rows read as one card rather than as stacked slabs.
    groupSep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: color.border,
      marginLeft: spacing.lg,
    },
    // A row inside the card — no material of its own any more.
    row: {
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      // S6: the shared list-row height, above WCAG 2.5.5's 44pt floor and
      // pinned here so future copy changes can't shrink it under.
      minHeight: size.row,
    },
    // Opacity dim only — a bg swap is invisible/illegal over the glass material.
    rowPressed: { opacity: 0.85 },
    // Visual cue while the export handler is running. The handler also
    // guards re-entrancy in code, so this is purely a "don't tap me twice"
    // affordance.
    rowDisabled: { opacity: 0.6 },
    rowTextWrap: { flex: 1, gap: 2 },
    rowTitle: {
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    // The "Sign out" row uses a slightly more cautious color so the destructive
    // intent is visually distinct before the confirm Alert fires. Subtitle stays
    // neutral — we don't want the whole row screaming danger, just hinting.
    // Light keeps color.error (4.93:1 on the light row glass); dark forks to
    // errorFg — color.error #C0392B measures 2.86:1 on dark row glass (FAIL).
    rowTitleDestructive: { color: color.scheme === 'dark' ? color.errorFg : color.error },
    rowSubtitle: {
      fontSize: font.size.sm,
      color: color.textMuted,
    },
    // Spinner sits where the chevron usually does so the row width doesn't
    // jump when toggling busy/idle. Width roughly matches the chevron's
    // glyph width — keeps the layout calm.
    rowSpinner: {
      width: 28,
    },
  });
