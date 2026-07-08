import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { RemoteImage } from '@/components/ui/RemoteImage';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { HeaderActions } from '@/components/ui/HeaderActions';
import { useDrawer } from '@/lib/drawerContext';
import { useAuth } from '@/lib/auth';
import { AccountDeletedSignOutPendingError, deleteAccount } from '@/lib/account';
import { confirm, notify } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import { signOut, supabase } from '@/lib/supabase';
import { useSharedModals } from '@/lib/sharedModalsContext';
import { getInitials, updateUserProfile, uploadAvatar } from '@/lib/users';
import { DEFAULT_TABS, getDefaultTab, setDefaultTab, type DefaultTab } from '@/lib/preferences';
import { useRealtimeEnabled } from '@/lib/realtimePrefs';
import { clearOnboarded } from '@/lib/onboardingState';
import {
  CATEGORY_LABELS,
  fetchFlagsByIds,
  listFlagsByUser,
  STATUS_COLORS,
  STATUS_LABELS,
} from '@/lib/flags';
import { useFlags } from '@/lib/flagsStore';
import { useUserLocation } from '@/lib/location';
import { formatDistance } from '@/lib/distance';
import { findNearestUnresolved } from '@/lib/nearestFlag';
import type { FlagRow, FlagStatus, UserRow } from '@/types/database';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import MyReportsModal from '@/components/MyReportsModal';
import MyWatchedModal from '@/components/MyWatchedModal';
import type { DetailAction } from '@/components/FlagDetailModal';
// they now live in a single <SharedModalsHost /> at the navigator level
// (see RootNavigator.tsx + src/lib/sharedModalsContext.tsx). Profile
// just calls setOpen('help' | 'changelog' | 'myFeedback') via the
// context.
import ActivityFeedModal from '@/components/ActivityFeedModal';
import UpdateBanner from '@/components/UpdateBanner';
import { diffUpdates, loadLastSeen, markAllSeen } from '@/lib/flagUpdates';
import { loadWatched } from '@/lib/watchedFlags';
// NotificationPrefsModal stays mounted PER-SCREEN on Profile (not in
// the shared pool). The Profile instance carries per-screen state:
// `initialPrefs` is seeded from this screen's already-loaded
// `notificationPrefs` so the first paint matches reality, and
// `onPrefsChanged` re-runs `refreshUpdateCount` so the banner count
// reflects newly-muted statuses immediately. Lifting it would either
// drop those optimizations or force callbacks through the shared
// context — both costlier than the second mount it saves.
import NotificationPrefsModal from '@/components/NotificationPrefsModal';
import { DEFAULT_PREFS, loadPrefs, type NotificationPrefs } from '@/lib/notificationPrefs';
import { EMPTY_STREAK, loadStreak, tickVisit, type StreakState } from '@/lib/streak';
import {
  computeAchievements,
  countEarned,
  pointsMilestones,
  type AchievementStats,
} from '@/lib/achievements';
import AchievementsModal from '@/components/AchievementsModal';
import RecentlyViewedRow from '@/components/RecentlyViewedRow';
import ReportsBreakdownCard from '@/components/ReportsBreakdownCard';
import LeaderboardScreen from '@/screens/LeaderboardScreen';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, shadow, spacing } from '@/theme';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { hydrateGlassMode, useGlassMode } from '@/lib/glassMode';
import { ArrowDown, ArrowUp, ChevronRight, Flame, MapPin, Pencil, X } from 'lucide-react-native';
import TierIcon from '@/components/TierIcon';
import { getTier, pointsToNextTier, REPUTATION_TIERS } from '@/lib/reputationTier';
import { setLastSeenPoints } from '@/lib/points';
import { a11yToggle, useReducedMotion } from '@/lib/accessibility';
import {
  getPointEventHistory,
  pointEventLabel,
  type PointEventRow,
} from '@/lib/pointEvents';
import SignInScreen from '@/screens/SignInScreen';
import AboutScreen from '@/screens/AboutScreen';

// Code-split: shares the same lazy FlagDetailModal async web chunk as TasksScreen
// (Metro dedups by module path), so the sheet's code lives outside the main
// bundle and loads on demand. Always-mounted below (visible-prop controlled).
// Declared after the imports so eslint's import/first stays satisfied.
const FlagDetailModal = React.lazy(() => import('@/components/FlagDetailModal'));

// Converts an ISO timestamp to a human-readable relative string.
// Falls back to a short date once the event is more than a week old.
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface Stats {
  reported: number;
  resolved: number;
  // Per-status breakdown of the user's own reports. Lets the Profile hero
  // show "5 open · 3 verified · 2 resolved" so people can see what's still
  // pending vs. what's been triaged.
  byStatus: Record<FlagStatus, number>;
}

const EMPTY_BY_STATUS: Record<FlagStatus, number> = {
  open: 0,
  verified: 0,
  resolved: 0,
  rejected: 0,
};

// Point milestones for the hero progress bar — derived from the points-
// category achievement badges so the bar and the badge catalog can never
// drift apart (this used to be a separate hand-written list that did).
const MILESTONES: { at: number; label: string }[] = pointsMilestones();
// Label of the highest milestone, shown once the user passes it.
const TOP_MILESTONE_LABEL = MILESTONES[MILESTONES.length - 1]?.label ?? 'top badge';

function milestoneProgress(points: number): {
  next: number | null;
  label: string;
  progress: number;
} {
  // Find the lowest milestone strictly above the user's current points.
  // Once they pass the top milestone we return null and let the hero
  // card show a "you've reached the top" line instead of a bar.
  const next = MILESTONES.find((m) => m.at > points);
  if (!next) return { next: null, label: '', progress: 1 };
  // Previous milestone defines the start of the current bar segment so
  // a user at 60 sees the 50→100 bar half-full, not a tiny sliver.
  const prevAt = [...MILESTONES].reverse().find((m) => m.at <= points)?.at ?? 0;
  const span = next.at - prevAt;
  const progress = span === 0 ? 0 : (points - prevAt) / span;
  return { next: next.at, label: next.label, progress };
}

export default function ProfileScreen() {
  const color = useColor();
  const styles = useMemo(() => makeStyles(color), [color]);
  const reduceMotion = useReducedMotion();
  // C-lite runtime mode (GLASS.md §4): read-only here — the long-press flip
  // lives on the Tasks header; Profile just respects the store. Full → the
  // hero + stat + point-history cards and the nearest banner carry true blur;
  // 'lite' → those same surfaces render the engineered *Lite gradient. Every
  // other row is always engineered (budget-free), so it takes no flag.
  const glassLite = useGlassMode() === 'lite';
  useEffect(() => {
    void hydrateGlassMode();
  }, []);
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, 'Profile'>>();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [stats, setStats] = useState<Stats>({
    reported: 0,
    resolved: 0,
    byStatus: EMPTY_BY_STATUS,
  });
  const [loading, setLoading] = useState(true);
  // Inline load error (web-safe + retryable). Alert.alert is a no-op on
  // react-native-web, so a failed profile load used to vanish on web with no
  // way to retry. Mirrors LeaderboardScreen's loadError + Try again pattern.
  const [loadError, setLoadError] = useState<string | null>(null);

  // My Reports modal lives at this level so its FlagDetailModal sibling can
  // render on top without nesting Modals — nested transparent Modals are
  // platform-flaky (mostly on Android). When a row is tapped we hide the
  // list modal, open the detail modal, and re-show the list on close.
  const [signInOpen, setSignInOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
  // Seeds MyReportsModal's internal status filter when it opens. Set when
  // the user taps a status pill in the breakdown row (e.g. "4 open" →
  // 'open'); undefined when opened from the plain "My Reports" button so
  // the list shows every status. Reset to undefined on modal close so the
  // next plain open isn't accidentally pre-filtered.
  const [reportsInitialStatus, setReportsInitialStatus] = useState<FlagStatus | undefined>(
    undefined,
  );
  // Independent refresh key for the Recently Viewed row — bumped on
  // every Profile focus so flags opened on other tabs since the last
  // focus are reflected in the chip row immediately.
  const [recentRefreshKey, setRecentRefreshKey] = useState(0);
  // Independent refresh key for the breakdown card so it refetches on
  // every tab focus AND when the parent already-known triggers fire
  // (detail-modal close, new report). Bumped from the focus effect
  // below — distinct from `reportsRefreshKey` to keep the two consumers
  // from accidentally re-fetching each other.
  const [breakdownRefreshKey, setBreakdownRefreshKey] = useState(0);
  const [watchedOpen, setWatchedOpen] = useState(false);
  const [watchedRefreshKey, setWatchedRefreshKey] = useState(0);
  const [activityOpen, setActivityOpen] = useState(false);
  // "Since your last visit" — count of tracked flags whose status changed
  // since the user last saw them. Tracked set = own reports + watched.
  // Recomputed on Profile focus; cleared when the user views or dismisses.
  const [updateCount, setUpdateCount] = useState(0);
  // Holds the flag list used for the most recent diff so dismiss/view
  // can mark them as seen without re-fetching.
  const trackedFlagsRef = useRef<FlagRow[]>([]);
  // Notification prefs — refreshed whenever Profile focuses, AND right
  // after the user toggles one in NotificationPrefsModal. Drives the
  // diffUpdates filter so the banner respects opt-outs.
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [notifPrefsOpen, setNotifPrefsOpen] = useState(false);
  // Visit streak — ticked once per focus per local day. Display in the
  // hero next to points. Gracefully shows nothing until the first tick
  // resolves so we don't briefly flash a "0 day streak" on launch.
  //
  // QA E6: seeded from disk via a separate loadStreak() effect BEFORE
  // tickVisit completes, so the achievements derivation has a real
  // longestStreak on first paint instead of EMPTY_STREAK's 0. Without
  // this, the Achievements count would flash "3/13" then pop to "5/13"
  // once tickVisit's longer await chain resolved.
  const [streak, setStreak] = useState<StreakState>(EMPTY_STREAK);

  // R9: Nearest-unresolved jump button. Reads the shared FlagsProvider
  // and the user's current location (one-shot fetch via useUserLocation,
  // gracefully null if permission denied). Pure derivation — no AsyncStorage,
  // no separate fetch. Hidden when nearest === null OR no location, so the
  // button never appears as a no-op.
  //
  // Why hooks-here vs. a sub-component: the button shares the same nav
  // handle Profile already uses, and rendering inline keeps the streak
  // hero card → jump button → status breakdown stack readable in one place.
  const { flags: providerFlags } = useFlags();
  // R9 polish (Const. Art. 9.6 — privacy gate): only use location if
  // the user has ALREADY granted foreground permission elsewhere (Map
  // tab / Tasks tab). Never triggers an OS prompt on Profile tab focus
  // — that would surface a privacy-sensitive permission ask in an
  // unexpected place. When ungranted, the card hides itself (nearest
  // → null), same as if no flags match.
  const { location: userLocation } = useUserLocation({
    requireExistingPermission: true,
  });
  const nearestUnresolved = useMemo(
    () => findNearestUnresolved(providerFlags, userLocation),
    [providerFlags, userLocation],
  );
  // Tracks which list modal was the "parent" of the currently-open
  // FlagDetailModal so handleDetailClose can reopen the right one.
  const [flagDetailSource, setFlagDetailSource] = useState<
    'reports' | 'watched' | 'activity' | null
  >(null);
  const [selectedFlag, setSelectedFlag] = useState<FlagRow | null>(null);

  // About modal — opened from the "About AccessMap" row near the bottom.
  // Self-contained: it links straight to the mail composer for the
  // "Send feedback" CTA so we don't have to coordinate two open modals.
  const [aboutOpen, setAboutOpen] = useState(false);

  // My Feedback, Help, and Changelog modals are mounted ONCE at the
  // navigator level via <SharedModalsHost />. Profile triggers them by
  // calling setOpen('myFeedback' | 'help' | 'changelog'). Before this,
  // each modal had a duplicate mount here AND in SettingsScreen — same
  // state shape twice, same useEffect on visible-change twice.
  const { setOpen: setSharedModal } = useSharedModals();
  const drawer = useDrawer();
  const insets = useSafeAreaInsets();

  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  // Trust score point event history. Loaded alongside the profile on every
  // focus. Empty array = no events yet or 42P01 (migration not applied) —
  // both cases hide the section. Only shown to the profile owner (this
  // screen is always the signed-in user's own profile).
  const [pointEvents, setPointEvents] = useState<PointEventRow[]>([]);

  // T4: Reputation-tier explainer sheet. Opens when the user taps the
  // tier pill in the hero card. Inline (not a separate component file)
  // since it's <40 LOC of JSX and reads cleanly here next to the pill.
  const [tierExplainerOpen, setTierExplainerOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Edit-name state. nameDraft is what the user is typing; profile?.display_name
  // is the persisted value. A Save button fires only when they actually differ.
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Avatar upload state.
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Default-tab state. null until we've read the preference, so the segmented
  // control doesn't paint a wrong "selected" pill momentarily.
  const [defaultTab, setDefaultTabValue] = useState<DefaultTab | null>(null);
  const [savingTab, setSavingTab] = useState(false);

  // D4: realtime opt-in toggle (Safeguard #2).
  // Backed by AsyncStorage `realtime_enabled` (default false). When the user
  // flips the toggle, saveRealtimeEnabled persists the value and notifies all
  // mounted hook instances (including MapScreen's indirect consumer in
  // FlagsProvider) so the subscription is established or torn down reactively.
  const { realtimeEnabled, setRealtimeEnabled } = useRealtimeEnabled();
  const [savingRealtime, setSavingRealtime] = useState(false);

  // True while this screen is on screen — checked before any setState that
  // runs after an `await` so a slow request can't update a torn-down screen.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    if (mountedRef.current) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      // One query for all status counts (and the total). Cheaper than
      // running a separate count(*) per status; row count caps at the
      // user's own report count so payload stays tiny.
      const [{ data: profileRow, error: profileErr }, statusRowsRes, eventsResult] = await Promise.all([
        // PRIVACY: Explicit columns — never select('*') on users; future schema
        // columns (e.g. internal flags, phone number) must not leak automatically.
        supabase.from('users').select('id, display_name, avatar_url, points, created_at').eq('id', user.id).maybeSingle(),
        supabase.from('flags').select('status').eq('user_id', user.id),
        // 42P01 guard: migration not yet applied → returns [] silently.
        getPointEventHistory(user.id).catch(() => [] as PointEventRow[]),
      ]);

      if (profileErr) throw profileErr;
      if (statusRowsRes.error) throw statusRowsRes.error;
      if (!mountedRef.current) return;
      const row = (profileRow as UserRow | null) ?? null;
      setProfile(row);
      // F55: the user has now SEEN their current total — advance the
      // "points while you were away" watermark so in-session earnings are
      // never re-announced as away-earnings on the next launch.
      if (row) void setLastSeenPoints(user.id, row.points).catch(() => {});
      setNameDraft(row?.display_name ?? '');
      setPointEvents(eventsResult);

      const byStatus: Record<FlagStatus, number> = { ...EMPTY_BY_STATUS };
      const statusRows = (statusRowsRes.data ?? []) as {
        status: FlagStatus;
      }[];
      for (const r of statusRows) {
        if (r.status in byStatus) byStatus[r.status]++;
      }
      // QA E9: clamp reported >= sum(byStatus) to defend against the
      // (impossible-in-theory but defensible) case where a backend bug
      // or trigger race produces inconsistent counts. Without the
      // clamp, the breakdown chips could show "5 resolved" while
      // "3 reported" sits above them — confusing.
      const statusSum = byStatus.open + byStatus.verified + byStatus.resolved + byStatus.rejected;
      setStats({
        reported: Math.max(statusRows.length, statusSum),
        resolved: byStatus.resolved,
        byStatus,
      });
    } catch (e) {
      // Inline error instead of Alert.alert (web no-op) so web users see it
      // and can retry. The render shows a "Try again" card when loadError set.
      if (mountedRef.current) {
        setLoadError(errorMessage(e));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  // Compute "since your last visit" updates on focus. Tracked set = own
  // reports + watched flags. Diff against the baseline stored from the
  // previous markAllSeen call. First-time-seen flags don't count (the
  // baseline absorbs them silently).
  //
  // Request-id gating (QA #2): rapid focus → blur → focus could fire two
  // refreshUpdateCount calls concurrently. We tag each call with an
  // incrementing seq; only the most-recent call is allowed to mutate
  // state. Otherwise an older response could clobber a fresher one.
  const updateSeqRef = useRef(0);
  const refreshUpdateCount = useCallback(async () => {
    const mySeq = ++updateSeqRef.current;
    const isCurrent = () => mountedRef.current && updateSeqRef.current === mySeq;

    if (!user) {
      trackedFlagsRef.current = [];
      if (isCurrent()) setUpdateCount(0);
      return;
    }
    try {
      const [ownFlags, watchedIds, lastSeen, prefs] = await Promise.all([
        listFlagsByUser(user.id),
        loadWatched(user.id),
        loadLastSeen(user.id),
        loadPrefs(user.id),
      ]);
      const ownIds = new Set(ownFlags.map((f) => f.id));
      const watchedOnly = watchedIds.filter((id) => !ownIds.has(id));
      const watchedFlags = watchedOnly.length ? await fetchFlagsByIds(watchedOnly) : [];
      const tracked = [...ownFlags, ...watchedFlags];
      if (!isCurrent()) return;
      trackedFlagsRef.current = tracked;
      // Stash the fresh prefs so the next NotificationPrefsModal open
      // doesn't have to wait for its own load.
      setNotificationPrefs(prefs);
      const updates = diffUpdates(tracked, lastSeen, prefs);
      // If lastSeen is empty (brand-new user / first run after upgrade),
      // silently seed the baseline so we don't fire a banner for every
      // existing flag on the next visit.
      if (Object.keys(lastSeen).length === 0 && tracked.length > 0) {
        await markAllSeen(user.id, tracked);
        if (isCurrent()) setUpdateCount(0);
        return;
      }
      if (isCurrent()) setUpdateCount(updates.length);
    } catch {
      // Updates are non-critical — silently skip on error. Profile load
      // itself surfaces its own errors via Alert.
      if (isCurrent()) setUpdateCount(0);
    }
  }, [user]);

  // Seed the streak from disk as soon as the user is known. Runs once
  // per user-id change. Cheap (single AsyncStorage read), and the result
  // becomes the baseline for the achievements derivation so we don't
  // flash "0 day streak" on first render.
  useEffect(() => {
    if (!user) {
      setStreak(EMPTY_STREAK);
      return;
    }
    let cancelled = false;
    void loadStreak(user.id).then((seed) => {
      if (!cancelled && mountedRef.current) setStreak(seed);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const refreshStreak = useCallback(async () => {
    if (!user) {
      setStreak(EMPTY_STREAK);
      return;
    }
    try {
      const next = await tickVisit(user.id);
      if (mountedRef.current) setStreak(next);
    } catch {
      // Best-effort. Streak is decorative — silently fall through to
      // the last seeded value (or EMPTY_STREAK if we never loaded).
    }
  }, [user]);

  // Single focus effect for stats + updates + streak so we don't fire
  // three concurrent fetch chains on every tab change. All run in
  // parallel via Promise.all to keep the focus-to-paint latency low.
  useFocusEffect(
    useCallback(() => {
      void Promise.all([load(), refreshUpdateCount(), refreshStreak()]);
      // RecentlyViewedRow owns its own fetch; bump its key on focus so
      // it picks up flags the user opened on other tabs since the last
      // focus event.
      setRecentRefreshKey((k) => k + 1);
      // Tell the breakdown card to refetch — its own counts are not in
      // the Promise.all above (it owns its data fetch) so we drive it
      // via the refresh-key bump.
      setBreakdownRefreshKey((k) => k + 1);
    }, [load, refreshUpdateCount, refreshStreak]),
  );

  const acknowledgeUpdates = useCallback(async () => {
    if (!user) return;
    // Snapshot the tracked flags into a local const BEFORE awaiting
    // anything. If refreshUpdateCount fires while we're awaiting
    // markAllSeen and overwrites trackedFlagsRef.current with a newer
    // (or empty) array, we'd otherwise be persisting stale data. (QA #2)
    const trackedSnapshot = [...trackedFlagsRef.current];
    setUpdateCount(0);
    try {
      await markAllSeen(user.id, trackedSnapshot);
    } catch {
      // Best-effort. UI already cleared the banner; a transient
      // AsyncStorage failure means the banner might reappear next focus,
      // which is acceptable degradation.
    }
  }, [user]);

  const handleViewUpdates = useCallback(() => {
    setActivityOpen(true);
    void acknowledgeUpdates();
  }, [acknowledgeUpdates]);

  const handleDismissUpdates = useCallback(() => {
    void acknowledgeUpdates();
  }, [acknowledgeUpdates]);

  // Load the default-tab preference once when the user is known.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDefaultTab(user.id).then((tab) => {
      if (!cancelled) setDefaultTabValue(tab);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const trimmedDraft = nameDraft.trim();
  const nameChanged = trimmedDraft !== (profile?.display_name ?? '').trim() && !savingName;

  const handleSaveName = useCallback(async () => {
    if (!user) return;
    setSavingName(true);
    try {
      const next = trimmedDraft.length > 0 ? trimmedDraft : null;
      const updated = await updateUserProfile(user.id, { display_name: next });
      if (mountedRef.current) {
        setProfile(updated);
        setNameDraft(updated.display_name ?? '');
        AccessibilityInfo.announceForAccessibility('Display name saved.');
      }
    } catch (e) {
      notify("Couldn't save your name", errorMessage(e));
    } finally {
      if (mountedRef.current) setSavingName(false);
    }
  }, [user, trimmedDraft]);

  const doUploadAvatar = useCallback(
    async (localUri: string, srcWidth?: number, srcHeight?: number) => {
      if (!user) return;
      setUploadingAvatar(true);
      try {
        const avatarUrl = await uploadAvatar(user.id, localUri, srcWidth, srcHeight);
        const updated = await updateUserProfile(user.id, { avatar_url: avatarUrl });
        if (mountedRef.current) {
          setProfile(updated);
          AccessibilityInfo.announceForAccessibility('Profile photo updated.');
        }
      } catch (e) {
        notify("Couldn't update your photo", errorMessage(e));
      } finally {
        if (mountedRef.current) setUploadingAvatar(false);
      }
    },
    [user],
  );

  const handlePickAvatar = useCallback(async () => {
    if (!user) return;
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        // L7 (F25 pattern): hoist the object URL so it can be revoked once
        // the upload settles — success or failure — instead of pinning the
        // File bytes in memory for the rest of the page session.
        // doUploadAvatar never rejects (it catches internally), so .finally
        // is the only cleanup hook needed.
        const url = URL.createObjectURL(file);
        void doUploadAvatar(url).finally(() => URL.revokeObjectURL(url));
      };
      input.click();
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notify('Permission needed', 'Allow photo access so you can choose a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]?.uri) {
        void doUploadAvatar(
          result.assets[0].uri,
          result.assets[0].width,
          result.assets[0].height,
        );
      }
    } catch (e) {
      notify("Couldn't pick a photo", errorMessage(e));
    }
  }, [user, doUploadAvatar]);

  const handlePickTab = useCallback(
    async (tab: DefaultTab) => {
      if (!user || tab === defaultTab) return;
      setSavingTab(true);
      // Optimistic — show the new selection immediately, write to storage,
      // and rollback only if the write throws (it shouldn't, but defensive).
      setDefaultTabValue(tab);
      try {
        await setDefaultTab(user.id, tab);
        AccessibilityInfo.announceForAccessibility(`Default tab set to ${tab}.`);
      } catch {
        if (mountedRef.current) {
          setDefaultTabValue(defaultTab);
          Alert.alert("Couldn't save that preference");
        }
      } finally {
        if (mountedRef.current) setSavingTab(false);
      }
    },
    [user, defaultTab],
  );

  const handleRealtimeToggle = useCallback(
    async (value: boolean) => {
      if (savingRealtime) return;
      setSavingRealtime(true);
      try {
        await setRealtimeEnabled(value);
        AccessibilityInfo.announceForAccessibility(
          value ? 'Real-time flag updates enabled.' : 'Real-time flag updates disabled.',
        );
      } catch {
        Alert.alert("Couldn't save preference");
      } finally {
        if (mountedRef.current) setSavingRealtime(false);
      }
    },
    [savingRealtime, setRealtimeEnabled],
  );

  const handleShowIntroAgain = useCallback(async () => {
    if (!user) return;
    // confirm() works on web (Alert.alert is a no-op there). Not strictly
    // destructive — no data loss — but it IS a confirm flow and would
    // silently do nothing on web without the helper.
    const ok = await confirm(
      'Show intro again?',
      'The 3-card introduction will appear the next time you open the app on this device.',
      'Reset',
    );
    if (!ok) return;
    // F5: clear the DEVICE-WIDE onboarding key that App.tsx's FirstLaunchGate
    // actually reads. The previous call cleared an orphaned per-user key
    // (src/lib/onboarding.ts) that nothing in production consults, so the
    // control silently did nothing.
    await clearOnboarded();
    AccessibilityInfo.announceForAccessibility(
      'Intro reset. You will see it again the next time you open the app.',
    );
  }, [user]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    setDeletingAccount(true);
    try {
      await deleteAccount(user.id);
      // Auth state change (SIGNED_OUT) fires automatically; screen unmounts.
    } catch (e) {
      if (mountedRef.current) {
        // F63: distinguish "delete failed" from "deleted, but local sign-out
        // didn't finish" — the old copy claimed the account was not deleted
        // even when it was.
        if (e instanceof AccountDeletedSignOutPendingError) {
          notify('Account deleted', e.message);
        } else {
          notify(
            'Could not delete account',
            errorMessage(e, 'Something went wrong. Your account was not deleted.'),
          );
        }
        setDeletingAccount(false);
      }
    }
  }, [user]);

  // Opens My Reports pre-filtered to a single status — wired to the
  // tappable status pills in the breakdown row. Presentation/navigation
  // only: seeds the modal's existing internal status filter, no data change.
  const handleOpenReportsForStatus = (status: FlagStatus) => {
    setReportsInitialStatus(status);
    setReportsOpen(true);
  };

  // Opens My Reports with no status pre-filter (the plain "My Reports"
  // button). Clears any seed left over from a status-pill tap.
  const handleOpenAllReports = () => {
    setReportsInitialStatus(undefined);
    setReportsOpen(true);
  };

  // Opens the detail modal from the My Reports list.
  const handleReportsSelectFlag = (flag: FlagRow) => {
    setReportsOpen(false);
    setFlagDetailSource('reports');
    setSelectedFlag(flag);
  };

  // Opens the detail modal from the Watched Flags list.
  const handleWatchedSelectFlag = (flag: FlagRow) => {
    setWatchedOpen(false);
    setFlagDetailSource('watched');
    setSelectedFlag(flag);
  };

  // Opens the detail modal from the Activity Feed list.
  const handleActivitySelectFlag = (flag: FlagRow) => {
    setActivityOpen(false);
    setFlagDetailSource('activity');
    setSelectedFlag(flag);
  };

  const handleDetailClose = () => {
    const src = flagDetailSource;
    setSelectedFlag(null);
    setFlagDetailSource(null);
    // Re-open the originating list and bump its refresh key so it re-fetches.
    if (src === 'watched') {
      setWatchedRefreshKey((k) => k + 1);
      setWatchedOpen(true);
    } else if (src === 'activity') {
      // Activity feed doesn't need a refreshKey — it reloads on next open.
      setActivityOpen(true);
    } else {
      // Default back to reports if source is unknown.
      setReportsRefreshKey((k) => k + 1);
      setReportsOpen(true);
    }
  };

  const handleDetailChanged = (_updated: FlagRow, _action: DetailAction, _isOwn: boolean) => {
    // Triage from My Reports/Watched might bump the user's own points (reporter
    // bonus on verify/resolve). Refresh the profile stats too.
    load();
    handleDetailClose();
  };

  const handleDetailDeleted = (_deletedId: string) => {
    load();
    handleDetailClose();
  };

  const handleViewOnMap = (flag: FlagRow) => {
    setSelectedFlag(null);
    setReportsOpen(false);
    setWatchedOpen(false);
    setActivityOpen(false);
    navigation.navigate('FullMap', {
      focusFlag: { id: flag.id, lat: flag.lat, lng: flag.lng },
      ts: Date.now(),
    });
  };

  // R9: Jump to the nearest unresolved flag on the Map. Reuses the
  // existing Map { focusFlag, ts } route — same path My Reports + Watched
  // use — so the marker is centered and its callout opens.
  const handleJumpToNearest = useCallback(() => {
    if (!nearestUnresolved) return;
    const { flag } = nearestUnresolved;
    navigation.navigate('FullMap', {
      focusFlag: { id: flag.id, lat: flag.lat, lng: flag.lng },
      ts: Date.now(),
    });
  }, [nearestUnresolved, navigation]);

  // Tier progress bar animation — drives the fill width from 0 → progress
  // whenever the user's points change (e.g. after a focus-refresh). Placed
  // before the conditional returns so the hook call order is always stable.
  const tierProgressAnim = useRef(new Animated.Value(0)).current;
  const tierProgressValue = useMemo(() => {
    const pts = profile?.points ?? 0;
    const t = getTier(pts);
    if (t.nextThreshold === null) return 1;
    return Math.min(1, (pts - t.threshold) / (t.nextThreshold - t.threshold));
  }, [profile?.points]);
  useEffect(() => {
    if (reduceMotion) {
      tierProgressAnim.setValue(tierProgressValue);
    } else {
      Animated.timing(tierProgressAnim, {
        toValue: tierProgressValue,
        duration: 600,
        useNativeDriver: false, // width interpolation cannot use the native driver
      }).start();
    }
  }, [tierProgressValue, tierProgressAnim, reduceMotion]);

  if (authLoading) {
    return (
      <View style={styles.stageRoot}>
        <ScreenStage />
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.stageRoot}>
        <ScreenStage />
        <View style={styles.center}>
        <AppText variant="body" style={styles.subtitle}>Sign in to see your stats, badges, and reports.</AppText>
        <Pressable
          onPress={() => setSignInOpen(true)}
          style={({ pressed }) => [styles.signInBtn, pressed && styles.signInBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Sign in to your account"
        >
          <AppText variant="label" style={styles.signInBtnText}>Sign in</AppText>
        </Pressable>
        <Modal
          visible={signInOpen}
          animationType={reduceMotion ? 'none' : 'slide'}
          aria-label="Sign in"
          onRequestClose={() => setSignInOpen(false)}
        >
          <SignInScreen onClose={() => setSignInOpen(false)} />
        </Modal>
        </View>
      </View>
    );
  }

  const points = profile?.points ?? 0;
  const { next: nextMilestone, label: milestoneLabel, progress } = milestoneProgress(points);
  // T4: Reputation tier — pure derivation from `points`. Drives the
  // small pill beside the points number AND the explainer sheet.
  // `gap` is 0 at Platinum; UI uses that to swap the copy.
  const tier = getTier(points);
  const tierGap = pointsToNextTier(points);
  // Find the next tier (one above current) for the explainer copy. Null
  // at Platinum — same signal as tier.nextThreshold === null.
  const nextTierIdx = REPUTATION_TIERS.findIndex((t) => t.name === tier.name) + 1;
  const nextTier = nextTierIdx < REPUTATION_TIERS.length ? REPUTATION_TIERS[nextTierIdx] : null;

  // Derive achievements from the four sources of truth already loaded
  // for the rest of the hero. Pure computation, so re-deriving on every
  // render is cheap (under 20 entries in the catalog).
  const achievementStats: AchievementStats = {
    reported: stats.reported,
    resolved: stats.resolved,
    points,
    longestStreak: streak.longest,
  };
  const achievements = computeAchievements(achievementStats);
  const achievementCount = countEarned(achievementStats);
  // Width-style for the progress bar. Use a fixed numeric (not %) string so
  // the StyleSheet types stay happy on web's CSS engine.
  const progressBarWidth = `${Math.round(progress * 100)}%` as `${number}%`;

  return (
    <>
      {/* The screen body is the Deep Field stage (GLASS.md). ScreenStage is
          absolute-fill + a11y-hidden behind the transparent scroll; the root
          bg is stage1 so any pre-mount frame matches. No chrome pane — the
          in-flow ScreenHeader scrolls (mirrors Wave-1 Settings). */}
      <View style={styles.stageRoot}>
        <ScreenStage />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.container,
          // S8: headerShown:false now, so clear the status bar / notch ourselves
          // (mirrors the headerless Home/Tasks). Overrides the container's top pad.
          { paddingTop: insets.top + spacing.lg, paddingBottom: tabBarHeight + 16 },
        ]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <ScreenHeader
          eyebrow="PROFILE"
          title={profile?.display_name?.trim() || 'Your profile'}
          subtitle={`Signed in as ${user.email}`}
          style={styles.profileHeader}
          // Header sits directly on the stage — eyebrow/subtitle take the
          // arbitrated on-stage ink (textSubtle/textMuted are below AA there).
          eyebrowColor={color.inkOnStage}
          subtitleColor={color.inkOnStage}
          // S8: the unified menu + Feedback circles (one shape, one treatment)
          // now live in the editorial header instead of the removed nav bar.
          actions={
            <HeaderActions
              onMenu={() => drawer.setOpen(true)}
              onFeedback={() => setSharedModal('feedback')}
              iconColor={color.textStrong}
            />
          }
        />

        <UpdateBanner
          count={updateCount}
          onView={handleViewUpdates}
          onDismiss={handleDismissUpdates}
        />

        {loadError && (
          <GlassSurface
            variant="row"
            forceEngineered
            style={styles.errorCard}
            borderRadius={radius.lg}
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Couldn't load your profile. ${loadError}`}
          >
            <AppText variant="bodyMedium" style={styles.errorCardText}>Couldn&apos;t load your profile.</AppText>
            <AppText variant="bodyMedium" style={styles.errorCardHint}>{loadError}</AppText>
            <Pressable
              onPress={() => void load()}
              style={({ pressed }) => [styles.errorRetryBtn, pressed && styles.errorRetryBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Try loading your profile again"
            >
              <AppText variant="label" style={styles.errorRetryText}>Try again</AppText>
            </Pressable>
          </GlassSurface>
        )}

        <GlassSurface
          variant="row"
          forceEngineered={glassLite}
          style={styles.heroCard}
          borderRadius={radius.sheet}
        >
          {/* Phase 9: clean light editorial stat card (was a dark brand
              gradient wash — the last "old app" holdover under the new light
              chrome). Big brand points number carries the hero now. */}
          {/* T4: previously this View was `accessible={true}` with a
              combined summary label. Removed so the new tier pill can be
              its own independently-focusable Pressable — children of an
              `accessible` View aren't focusable by SR on its own. The
              Texts below provide the same info in announcement order. */}
          {/* Avatar — tappable to change. Shows photo if set, else initials. */}
          <Pressable
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
            style={({ pressed }) => [styles.avatarBtn, pressed && styles.avatarBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={profile?.avatar_url ? 'Change profile photo' : 'Add profile photo'}
            accessibilityHint="Opens photo picker to update your profile photo"
            {...a11yToggle({ busy: uploadingAvatar })}
          >
            <RemoteImage
              uri={profile?.avatar_url}
              style={styles.avatarImg}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              fallback={
                <View style={styles.avatarPlaceholder}>
                  <AppText
                    variant="label"
                    style={styles.avatarInitials}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    {getInitials(profile?.display_name ?? user.email ?? '')}
                  </AppText>
                </View>
              }
            />
            {uploadingAvatar ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={color.textOnBrand} size="small" />
              </View>
            ) : (
              <View
                style={styles.avatarEditBadge}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Pencil size={14} color={color.textOnBrand} strokeWidth={2.2} />
              </View>
            )}
          </Pressable>
          <AppText variant="label" style={styles.heroLabel}>POINTS</AppText>
          {/* Value + tier pill on the same row so the pill sits BESIDE
              the points number (per T4 spec). The pill is a Pressable
              with its own a11y label, focusable independently. */}
          <View style={styles.heroValueRow}>
            <AppText variant="monoBold" style={styles.heroValue} accessibilityLabel={`${points} points`}>
              {points}
            </AppText>
            <Pressable
              onPress={() => setTierExplainerOpen(true)}
              style={({ pressed }) => [styles.tierPill, pressed && styles.tierPillPressed]}
              accessibilityRole="button"
              accessibilityLabel={
                // QA polish: omit the points number here — the hero's
                // own `heroValue` Text already announces `${points} points`
                // immediately before this pill, and including it again
                // caused SR to read the number twice in a row.
                `${tier.label} tier. Tap to see all tiers.`
              }
              accessibilityHint={
                nextTier
                  ? `Opens a sheet with the full tier ladder and how many points to ${nextTier.label}.`
                  : 'Opens a sheet with the full tier ladder.'
              }
              hitSlop={8}
            >
              <TierIcon tier={tier} size={font.size.lg} />
              <AppText variant="label" style={styles.tierPillLabel}>{tier.label}</AppText>
            </Pressable>
          </View>
          {/* Tier progress bar — thin animated fill below the tier pill.
              Hidden at Platinum (nextThreshold null) since there's no
              next tier to progress toward. WCAG 4.1.2: announced as a
              progressbar with label "Silver tier, 150 of 500 points to Gold";
              the visual text label below is hidden from AT (duplicate). */}
          {tier.nextThreshold !== null && (
            <>
              <View
                style={styles.tierProgressTrack}
                accessibilityRole="progressbar"
                accessibilityLabel={`${tier.label} tier, ${points} of ${tier.nextThreshold} points to ${nextTier?.label ?? 'next tier'}`}
                accessibilityValue={{ min: tier.threshold, max: tier.nextThreshold, now: points }}
              >
                <Animated.View
                  style={[
                    styles.tierProgressFill,
                    {
                      width: tierProgressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </View>
              <AppText
                variant="label"
                style={styles.tierProgressLabel}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {tierGap} pts to {nextTier?.label ?? 'next tier'}
              </AppText>
            </>
          )}
          {nextMilestone !== null ? (
            <>
              <View
                style={styles.progressTrack}
                accessibilityRole="progressbar"
                accessibilityLabel={`Progress toward ${milestoneLabel}, ${points} of ${nextMilestone} points`}
                accessibilityValue={{ min: 0, max: nextMilestone, now: points }}
              >
                <View
                  style={[styles.progressFill, { width: progressBarWidth }]}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </View>
              <AppText
                variant="label"
                style={styles.heroSubtitle}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {nextMilestone - points} points to {milestoneLabel}
              </AppText>
            </>
          ) : (
            <AppText variant="label" style={styles.heroSubtitle}>
              You&apos;ve reached the top milestone — {TOP_MILESTONE_LABEL} earned.
            </AppText>
          )}
        </GlassSurface>

        {/* Point history — always rendered. Shows an encouraging empty state
            when no events exist yet (or migration not applied). flag_id is
            NOT shown — see TRUST_SCORE_SPEC §3.2 Jordan constraint. */}
        <GlassSurface
          variant="row"
          forceEngineered={glassLite}
          style={styles.pointHistoryCard}
          borderRadius={radius.lg}
        >
          <AppText variant="heading" style={styles.pointHistoryTitle} accessibilityRole="header">
            Recent point activity
          </AppText>
          {pointEvents.length === 0 ? (
            <AppText variant="bodyMedium" style={styles.pointHistoryEmpty}>
              Start reporting barriers to earn points!
            </AppText>
          ) : (
            <View accessibilityRole="list">
              {pointEvents.slice(0, 5).map((ev, i, arr) => {
                const isGain = ev.delta >= 0;
                const absPoints = Math.abs(ev.delta);
                const action = isGain ? 'Earned' : 'Lost';
                const sign = isGain ? '+' : '';
                const dateStr = formatRelativeTime(ev.created_at);
                return (
                  <View
                    key={ev.id}
                    style={[styles.pointHistoryRow, i < arr.length - 1 && styles.pointHistoryRowDivider]}
                    accessible
                    role="listitem"
                    accessibilityLabel={`${action} ${absPoints} ${absPoints === 1 ? 'point' : 'points'}: ${pointEventLabel(ev.event_type)}, ${dateStr}`}
                  >
                    <AppText
                      variant="label"
                      style={[styles.pointHistoryIcon, !isGain && styles.pointHistoryIconNeg]}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      {isGain ? (
                        <ArrowUp
                          size={14}
                          // Dark row glass needs a brighter green/red than the
                          // light-optimized successStrong/error (they go dim on
                          // the dark floor). Direction is also carried by the
                          // arrow shape + the +/- sign, never color alone.
                          color={color.scheme === 'dark' ? color.success : color.successStrong}
                          strokeWidth={2.4}
                        />
                      ) : (
                        <ArrowDown
                          size={14}
                          color={color.scheme === 'dark' ? color.errorFg : color.error}
                          strokeWidth={2.4}
                        />
                      )}
                    </AppText>
                    <AppText variant="bodyMedium" style={styles.pointHistoryLabel} numberOfLines={2}>
                      {pointEventLabel(ev.event_type)}
                    </AppText>
                    <AppText variant="body" style={styles.pointHistoryDate}>{dateStr}</AppText>
                    <AppText
                      variant="monoBold"
                      style={styles.pointHistoryDelta}
                    >
                      {sign}{ev.delta} pts
                    </AppText>
                  </View>
                );
              })}
            </View>
          )}
        </GlassSurface>

        <View
          style={styles.statsRow}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={
            `Your stats: ${stats.reported} reported, ` +
            `${stats.byStatus.verified} verified, ` +
            `${stats.resolved} resolved`
          }
        >
          <Stat label="Reported" value={stats.reported} glassLite={glassLite} />
          <Stat label="Verified" value={stats.byStatus.verified} glassLite={glassLite} />
          <Stat label="Resolved" value={stats.resolved} glassLite={glassLite} />
        </View>

        {/* Streak card — only renders once we have a real value (≥1)
            so we don't briefly flash a "0 day" card on first launch. */}
        {streak.current > 0 && (
          <View
            style={styles.streakCard}
            // QA A3: accessible={true} groups the icon + value + subtitle
            // into a single SR announcement. Role 'summary' alone wasn't
            // enough — RN needs the explicit accessible flag for Views.
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={
              streak.current === 1
                ? `1 day streak — welcome${streak.longest > 1 ? `. Best ever: ${streak.longest} days.` : ''}`
                : `${streak.current} day streak${streak.longest > streak.current ? `. Best ever: ${streak.longest} days.` : '. New personal best!'}`
            }
          >
            <Flame size={22} color={color.accentOrange} strokeWidth={2} />
            <View style={styles.streakTextWrap}>
              <AppText variant="label" style={styles.streakValue}>
                {streak.current} day{streak.current === 1 ? '' : 's'} in a row
              </AppText>
              <AppText variant="body" style={styles.streakSubtitle}>
                {streak.longest > streak.current
                  ? `Best ever: ${streak.longest} days`
                  : 'New personal best!'}
              </AppText>
            </View>
          </View>
        )}

        {/* R9: Nearest-unresolved jump. Shown only when we have a
            location AND there's an open/verified flag nearby — otherwise
            the button is a no-op so we hide it. Reuses the same Map
            `focusFlag` route the lists already use, so the marker is
            centered + its callout opens. */}
        {nearestUnresolved && (
          <Pressable
            onPress={handleJumpToNearest}
            // Pressable is the interactive/a11y root; GlassSurface (banner) is
            // material only. Press feedback is opacity (a bg swap is invisible
            // under glass) — matches the Tasks/Settings recipe.
            style={({ pressed }) => pressed && styles.nearestBtnPressed}
            accessibilityRole="button"
            accessibilityLabel={
              `Jump to the nearest unresolved flag: ` +
              `${CATEGORY_LABELS[nearestUnresolved.flag.category]}, ` +
              `severity ${nearestUnresolved.flag.severity}, ` +
              `${formatDistance(nearestUnresolved.km)} away.`
            }
            accessibilityHint="Opens the Map tab centered on this flag"
          >
            <GlassSurface
              variant="banner"
              forceEngineered={glassLite}
              style={styles.nearestBtn}
              borderRadius={12}
            >
              <MapPin size={20} color={color.brandOnSoft} strokeWidth={2.2} />
              <View style={styles.nearestBtnTextWrap}>
                <AppText variant="label" style={styles.nearestBtnTitle}>
                  Nearest unresolved · {formatDistance(nearestUnresolved.km)}
                </AppText>
                <AppText variant="bodyMedium" style={styles.nearestBtnSubtitle} numberOfLines={2}>
                  {CATEGORY_LABELS[nearestUnresolved.flag.category]} · severity{' '}
                  {nearestUnresolved.flag.severity}
                </AppText>
              </View>
              <ChevronRight
                size={18}
                color={color.brandOnSoft}
                strokeWidth={2.2}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            </GlassSurface>
          </Pressable>
        )}

        {/* Per-status breakdown — small palette-tinted chips. Only shown
            when the user has at least one report so first-launch profiles
            stay uncluttered. Pills with at least one report are tappable:
            they open My Reports pre-filtered to that status. Zero-count
            pills stay non-interactive (nothing to view) and dimmed.

            Note: the wrapper used to be `accessible={true}` with a single
            combined summary label, which made the whole row one SR element.
            That's removed here so each tappable pill is its own focusable
            button (children of an `accessible` View aren't independently
            focusable) — same reasoning as the T4 hero-card change above.
            Each pill now carries its own count + status in its label. */}
        {stats.reported > 0 && (
          <View style={styles.statusBreakdownRow} accessibilityLabel="Your reports by status">
            {(['open', 'verified', 'resolved', 'rejected'] as FlagStatus[]).map((status) => {
              const palette = STATUS_COLORS[status];
              const count = stats.byStatus[status];
              const statusWord = STATUS_LABELS[status].toLowerCase();
              const pillInner = (
                <>
                  <AppText
                    variant="monoBold"
                    style={[styles.statusPillCount, { color: palette.fg }]}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  >
                    {count}
                  </AppText>
                  <AppText
                    variant="label"
                    style={[styles.statusPillLabel, { color: palette.fg }]}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    adjustsFontSizeToFit
                    numberOfLines={1}
                  >
                    {STATUS_LABELS[status]}
                  </AppText>
                </>
              );
              // Zero-count: nothing to view, so keep it as a plain dimmed
              // chip. Still announces its count so SR users get the full
              // picture, but it isn't a button.
              if (count === 0) {
                return (
                  <View
                    key={status}
                    style={[styles.statusPill, { backgroundColor: palette.bg }, styles.statusPillDimmed]}
                    // Focusable text (not a button — there's nothing to view) so
                    // screen-reader users still hear the zero count instead of a
                    // silently-skipped, dead accessibilityLabel. (review HIGH-1)
                    accessible
                    accessibilityRole="text"
                    accessibilityLabel={`No ${statusWord} reports`}
                  >
                    {pillInner}
                  </View>
                );
              }
              return (
                <Pressable
                  key={status}
                  onPress={() => handleOpenReportsForStatus(status)}
                  style={({ pressed }) => [
                    styles.statusPill,
                    { backgroundColor: palette.bg },
                    pressed && styles.statusPillPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`View your ${count} ${statusWord} ${count === 1 ? 'report' : 'reports'}`}
                  accessibilityHint="Opens My Reports filtered to this status"
                >
                  {pillInner}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Recently viewed — appears above My Reports because the user
            generally wants to jump back to the flag they just looked at,
            not browse their full history. Hidden when empty. */}
        <RecentlyViewedRow
          userId={user?.id ?? null}
          refreshKey={recentRefreshKey}
          onSelect={(flag) => {
            // Reuse the existing focusFlag navigation pattern Tasks→Map
            // and the Nearest-Unresolved card already use.
            navigation.navigate('FullMap', {
              focusFlag: { id: flag.id, lat: flag.lat, lng: flag.lng },
              ts: Date.now(),
            });
          }}
        />

        {/* Category + severity breakdown of the user's own reports.
            Refresh key bumps on every Profile focus via the
            useFocusEffect above, and the parent doesn't need to call
            into the card's internals — it owns its own fetch. */}
        <ReportsBreakdownCard userId={user?.id ?? null} refreshKey={breakdownRefreshKey} />

        <Pressable
          style={({ pressed }) => pressed && styles.myReportsBtnPressed}
          onPress={handleOpenAllReports}
          accessibilityRole="button"
          accessibilityLabel={
            stats.reported === 0
              ? 'My Reports, no reports yet'
              : `My Reports, ${stats.reported} ${stats.reported === 1 ? 'report' : 'reports'}`
          }
          accessibilityHint="Opens a list of every flag you've submitted"
        >
          <GlassSurface variant="row" forceEngineered style={styles.myReportsBtn}>
          <View style={styles.myReportsTextWrap}>
            <AppText variant="label" style={styles.myReportsTitle}>My Reports</AppText>
            <AppText variant="bodyMedium" style={styles.myReportsSubtitle}>
              {stats.reported === 0
                ? "You haven't reported any barriers yet — your first one will show up here."
                : "Every barrier you've reported, in one place."}
            </AppText>
          </View>
          <ChevronRight
            size={18}
            color={color.textSubtle}
            strokeWidth={2.2}
            accessibilityElementsHidden
          />
          </GlassSurface>
        </Pressable>

        <Pressable
          style={({ pressed }) => pressed && styles.myReportsBtnPressed}
          onPress={() => setWatchedOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Watched Flags"
          accessibilityHint="Opens the list of flags you are tracking for status changes"
        >
          <GlassSurface variant="row" forceEngineered style={styles.myReportsBtn}>
          <View style={styles.myReportsTextWrap}>
            <AppText variant="label" style={styles.myReportsTitle}>Watched Flags</AppText>
            <AppText variant="bodyMedium" style={styles.myReportsSubtitle}>
              Keep an eye on barriers you care about and get notified when something changes.
            </AppText>
          </View>
          <ChevronRight
            size={18}
            color={color.textSubtle}
            strokeWidth={2.2}
            accessibilityElementsHidden
          />
          </GlassSurface>
        </Pressable>

        <Pressable
          style={({ pressed }) => pressed && styles.myReportsBtnPressed}
          onPress={() => setActivityOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Recent Activity"
          accessibilityHint="Opens a chronological feed of recent flag activity, grouped by day"
        >
          <GlassSurface variant="row" forceEngineered style={styles.myReportsBtn}>
          <View style={styles.myReportsTextWrap}>
            <AppText variant="label" style={styles.myReportsTitle}>Recent Activity</AppText>
            <AppText variant="bodyMedium" style={styles.myReportsSubtitle}>
              What the community has been up to — newest first.
            </AppText>
          </View>
          <ChevronRight
            size={18}
            color={color.textSubtle}
            strokeWidth={2.2}
            accessibilityElementsHidden
          />
          </GlassSurface>
        </Pressable>

        <Pressable
          style={({ pressed }) => pressed && styles.myReportsBtnPressed}
          onPress={() => setAchievementsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Achievements, ${achievementCount.earned} of ${achievementCount.total} earned`}
          accessibilityHint="Opens the full achievement catalog with your progress on each badge"
        >
          <GlassSurface variant="row" forceEngineered style={styles.myReportsBtn}>
          <View style={styles.myReportsTextWrap}>
            <AppText variant="label" style={styles.myReportsTitle}>
              Achievements{' '}
              <AppText variant="label" style={styles.achievementsCount}>
                · {achievementCount.earned} / {achievementCount.total}
              </AppText>
            </AppText>
            <AppText variant="bodyMedium" style={styles.myReportsSubtitle}>
              {achievementCount.earned === 0
                ? 'Start reporting and verifying to earn your first badge.'
                : achievementCount.earned === achievementCount.total
                  ? "You've earned every single badge. Legend."
                  : `${achievementCount.total - achievementCount.earned} more to go. Tap to see what's next.`}
            </AppText>
          </View>
          <ChevronRight
            size={18}
            color={color.textSubtle}
            strokeWidth={2.2}
            accessibilityElementsHidden
          />
          </GlassSurface>
        </Pressable>

        <Pressable
          style={({ pressed }) => pressed && styles.myReportsBtnPressed}
          onPress={() => setLeaderboardOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="See leaderboard"
          accessibilityHint="Opens the top 20 contributors ranked by points"
        >
          <GlassSurface variant="row" forceEngineered style={styles.myReportsBtn}>
          <View style={styles.myReportsTextWrap}>
            <AppText variant="label" style={styles.myReportsTitle}>See leaderboard</AppText>
            <AppText variant="bodyMedium" style={styles.myReportsSubtitle}>
              See who&apos;s making the biggest impact in the community.
            </AppText>
          </View>
          <ChevronRight
            size={18}
            color={color.textSubtle}
            strokeWidth={2.2}
            accessibilityElementsHidden
          />
          </GlassSurface>
        </Pressable>

        <Pressable
          style={({ pressed }) => pressed && styles.myReportsBtnPressed}
          onPress={() => setNotifPrefsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Notification settings"
          accessibilityHint="Opens settings for which flag status updates surface in your update banner"
        >
          <GlassSurface variant="row" forceEngineered style={styles.myReportsBtn}>
          <View style={styles.myReportsTextWrap}>
            <AppText variant="label" style={styles.myReportsTitle}>Notifications</AppText>
            <AppText variant="bodyMedium" style={styles.myReportsSubtitle}>
              Pick which changes you want to hear about.
            </AppText>
          </View>
          <ChevronRight
            size={18}
            color={color.textSubtle}
            strokeWidth={2.2}
            accessibilityElementsHidden
          />
          </GlassSurface>
        </Pressable>

        <Pressable
          style={({ pressed }) => pressed && styles.myReportsBtnPressed}
          onPress={() => setSharedModal('myFeedback')}
          accessibilityRole="button"
          accessibilityLabel="My Feedback"
          accessibilityHint="Opens the list of feedback you've sent to the maintainer"
        >
          <GlassSurface variant="row" forceEngineered style={styles.myReportsBtn}>
          <View style={styles.myReportsTextWrap}>
            <AppText variant="label" style={styles.myReportsTitle}>My Feedback</AppText>
            <AppText variant="bodyMedium" style={styles.myReportsSubtitle}>See the messages you&apos;ve sent to the team.</AppText>
          </View>
          <ChevronRight
            size={18}
            color={color.textSubtle}
            strokeWidth={2.2}
            accessibilityElementsHidden
          />
          </GlassSurface>
        </Pressable>

        <View style={styles.section}>
          <AppText variant="heading" style={styles.sectionLabel} accessibilityRole="header">
            Display name
          </AppText>
          <View style={styles.nameRow}>
            <Input
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Add a display name"
              disabled={savingName}
              containerStyle={styles.nameInputWrap}
              accessibilityLabel="Display name"
              accessibilityHint="The name shown next to your flags. Leave empty to use your email."
              maxLength={60}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <Pressable
              onPress={handleSaveName}
              disabled={!nameChanged}
              style={[styles.saveBtn, !nameChanged && styles.saveBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Save display name"
              {...a11yToggle({ disabled: !nameChanged, busy: savingName })}
            >
              {savingName ? (
                <ActivityIndicator color={color.textOnBrand} />
              ) : (
                <AppText variant="label" style={styles.saveBtnText}>Save</AppText>
              )}
            </Pressable>
          </View>
          <AppText variant="body" style={styles.hint}>
            This shows next to your reports. Leave it blank and we&apos;ll use your email instead.
          </AppText>
        </View>

        <View style={styles.section}>
          <AppText variant="heading" style={styles.sectionLabel} accessibilityRole="header">
            Default landing tab
          </AppText>
          <View style={styles.tabRow}>
            {DEFAULT_TABS.map((tab) => {
              const selected = tab === defaultTab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => handlePickTab(tab)}
                  disabled={savingTab || defaultTab === null}
                  style={[styles.tabPill, selected && styles.tabPillSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set default tab to ${tab}`}
                  {...a11yToggle({
                    selected,
                    disabled: savingTab || defaultTab === null,
                  })}
                >
                  <AppText variant="label" style={[styles.tabPillText, selected && styles.tabPillTextSelected]}>
                    {tab}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <AppText variant="body" style={styles.hint}>AccessMap will open to this tab each time you launch the app.</AppText>
        </View>

        {/* D4: Realtime opt-in toggle (Safeguard #2).
            Default off — users must explicitly enable to subscribe.
            The underlying AsyncStorage write is surfaced as an error if
            it fails (not silently swallowed) because the user just told
            us their preference and we must honour it. */}
        <View style={styles.section}>
          <AppText variant="heading" style={styles.sectionLabel} accessibilityRole="header">
            Real-time updates
          </AppText>
          {/* WCAG 4.1.2/2.1.1: the Switch itself carries the accessible
              identity (role + label + state) and stays in the a11y tree, so
              VoiceOver/TalkBack can operate it. The previous version put
              role="switch" on the wrapper View (which has no press handler)
              and hid the Switch — so the control announced correctly but
              could not actually be toggled. Mirrors NotificationPrefsModal. */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextWrap}>
              <AppText variant="label" style={styles.toggleLabel}>Show new flags in real-time</AppText>
              <AppText variant="body" style={styles.toggleHint}>The map refreshes on its own as flags are added or triaged — no pulling to refresh.</AppText>
            </View>
            <Switch
              value={realtimeEnabled}
              onValueChange={handleRealtimeToggle}
              disabled={savingRealtime}
              accessibilityRole="switch"
              accessibilityLabel="Show new flags in real-time"
              accessibilityHint="When on, the map updates automatically as new flags are reported or triaged — no need to refresh manually"
              {...a11yToggle({ checked: realtimeEnabled, busy: savingRealtime, disabled: savingRealtime })}
              trackColor={{ false: '#ccc', true: color.brand }}
              thumbColor={
                Platform.OS === 'android' ? (realtimeEnabled ? color.brand : '#f4f3f4') : undefined
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="heading" style={styles.sectionLabel} accessibilityRole="header">
            Onboarding
          </AppText>
          <Pressable
            onPress={handleShowIntroAgain}
            style={styles.linkBtn}
            accessibilityRole="button"
            accessibilityLabel="Show me the intro again"
            accessibilityHint="Resets the first-run cards so they appear at the next sign in"
          >
            <AppText variant="label" style={styles.linkBtnText}>Show me the intro again</AppText>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => pressed && styles.aboutRowPressed}
          onPress={() => setSharedModal('help')}
          accessibilityRole="button"
          accessibilityLabel="Help and frequently asked questions"
          accessibilityHint="Opens collapsible answers to common questions about the app"
        >
          <GlassSurface variant="row" forceEngineered style={styles.aboutRow}>
          <View style={styles.aboutTextWrap}>
            <AppText variant="label" style={styles.aboutTitle}>Help & FAQ</AppText>
            <AppText variant="bodyMedium" style={styles.aboutSubtitle}>
              Answers to the questions people ask most.
            </AppText>
          </View>
          <ChevronRight
            size={18}
            color={color.textSubtle}
            strokeWidth={2.2}
            accessibilityElementsHidden
          />
          </GlassSurface>
        </Pressable>

        <Pressable
          style={({ pressed }) => pressed && styles.aboutRowPressed}
          onPress={() => setSharedModal('changelog')}
          accessibilityRole="button"
          accessibilityLabel="What's New"
          accessibilityHint="Opens a dated list of recent shipped features"
        >
          <GlassSurface variant="row" forceEngineered style={styles.aboutRow}>
          <View style={styles.aboutTextWrap}>
            <AppText variant="label" style={styles.aboutTitle}>What&apos;s New</AppText>
            <AppText variant="bodyMedium" style={styles.aboutSubtitle}>See what we shipped recently.</AppText>
          </View>
          <ChevronRight
            size={18}
            color={color.textSubtle}
            strokeWidth={2.2}
            accessibilityElementsHidden
          />
          </GlassSurface>
        </Pressable>

        <Pressable
          style={({ pressed }) => pressed && styles.aboutRowPressed}
          onPress={() => setAboutOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="About AccessMap"
          accessibilityHint="Opens information about the app, version, and how to send feedback"
        >
          <GlassSurface variant="row" forceEngineered style={styles.aboutRow}>
          <View style={styles.aboutTextWrap}>
            <AppText variant="label" style={styles.aboutTitle}>About AccessMap</AppText>
            <AppText variant="bodyMedium" style={styles.aboutSubtitle}>
              The story behind AccessMap and how to reach us.
            </AppText>
          </View>
          <ChevronRight
            size={18}
            color={color.textSubtle}
            strokeWidth={2.2}
            accessibilityElementsHidden
          />
          </GlassSurface>
        </Pressable>

        <Pressable
          style={styles.signOutBtn}
          onPress={async () => {
            const ok = await confirm(
              'Sign out',
              'Are you sure you want to sign out?',
              'Sign out',
              true,
            );
            // void: signOut is best-effort; errors are already logged inside
            // the helper. We don't await here to avoid blocking the sign-out
            // UI — the auth state change fires synchronously on the Supabase
            // side, so the screen unmounts even if the cleanup tasks (cache
            // clear, push token delete) are still in flight.
            if (ok) void signOut(user?.id);
          }}
          accessibilityRole="button"
          accessibilityLabel="Sign out of your account"
        >
          <AppText variant="label" style={styles.signOutText}>Sign out</AppText>
        </Pressable>

        <Pressable
          style={styles.deleteAccountBtn}
          onPress={() => setDeleteAccountOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Delete your account"
          accessibilityHint="Opens a confirmation dialog before permanently deleting your account and data"
        >
          <AppText variant="label" style={styles.deleteAccountText}>Delete Account</AppText>
        </Pressable>
      </ScrollView>
      </View>

      {/* Account-deletion confirmation. Two-button destructive pattern:
          Cancel (neutral) + Delete Account (red). The Delete button shows a
          spinner while the Edge Function is in-flight and is disabled to prevent
          double-taps. accessibilityViewIsModal hides the underlying screen from
          screen readers while the dialog is open. */}
      <Modal
        visible={deleteAccountOpen}
        animationType={reduceMotion ? 'none' : 'slide'}
        transparent
        aria-label="Delete your account?"
        onRequestClose={() => {
          if (!deletingAccount) setDeleteAccountOpen(false);
        }}
      >
        <View style={styles.deleteBackdrop}>
          <View style={styles.deleteSheet} accessibilityViewIsModal>
            {/* Copy scrolls at large type; the destructive Cancel/Delete pair
                stays OUTSIDE the scroll so it can never slide off (sweep M7). */}
            <ScrollView contentContainerStyle={styles.deleteScrollContent}>
              <AppText variant="heading" style={styles.deleteTitle} accessibilityRole="header">
                Delete your account?
              </AppText>
              <AppText variant="body" style={styles.deleteBody}>
                This will permanently delete your account and personal information.
                Your accessibility reports will remain on the map anonymously to
                help the community. This cannot be undone.
              </AppText>
              <AppText variant="body" style={styles.deleteBodySecondary}>
                If you also want your reports removed, get in touch with support and we&apos;ll take care of it.
              </AppText>
            </ScrollView>
            <View style={styles.deleteActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.deleteCancelBtn,
                  pressed && styles.deleteCancelBtnPressed,
                ]}
                onPress={() => setDeleteAccountOpen(false)}
                disabled={deletingAccount}
                accessibilityRole="button"
                accessibilityLabel="Cancel account deletion"
              >
                <AppText variant="label" style={styles.deleteCancelText}>Cancel</AppText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.deleteConfirmBtn,
                  pressed && styles.deleteConfirmBtnPressed,
                  deletingAccount && styles.deleteConfirmBtnDisabled,
                ]}
                onPress={handleDeleteAccount}
                disabled={deletingAccount}
                accessibilityRole="button"
                accessibilityLabel="Confirm account deletion"
                {...a11yToggle({ busy: deletingAccount, disabled: deletingAccount })}
              >
                {deletingAccount ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <AppText variant="label" style={styles.deleteConfirmText}>Delete Account</AppText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <MyReportsModal
        visible={reportsOpen}
        onClose={() => {
          setReportsOpen(false);
          // Clear the status seed so a later plain "My Reports" open
          // doesn't reopen pre-filtered to the last-tapped status.
          setReportsInitialStatus(undefined);
        }}
        onSelectFlag={handleReportsSelectFlag}
        onViewOnMap={handleViewOnMap}
        refreshKey={reportsRefreshKey}
        initialStatus={reportsInitialStatus}
      />

      <MyWatchedModal
        visible={watchedOpen}
        onClose={() => setWatchedOpen(false)}
        onSelectFlag={handleWatchedSelectFlag}
        onViewOnMap={handleViewOnMap}
        refreshKey={watchedRefreshKey}
      />

      <ActivityFeedModal
        visible={activityOpen}
        onClose={() => setActivityOpen(false)}
        onSelectFlag={handleActivitySelectFlag}
        onViewOnMap={handleViewOnMap}
      />

      <Suspense fallback={null}>
        <FlagDetailModal
          visible={selectedFlag !== null}
          flag={selectedFlag}
          onClose={handleDetailClose}
          onChanged={handleDetailChanged}
          onDeleted={handleDetailDeleted}
          onViewOnMap={handleViewOnMap}
        />
      </Suspense>

      <AboutScreen visible={aboutOpen} onClose={() => setAboutOpen(false)} />

      {/* MyFeedbackModal, HelpModal, and ChangelogModal mounts used to
          sit here. They now live in <SharedModalsHost /> at the
          navigator root (see RootNavigator.tsx + sharedModalsContext.tsx).
          Profile triggers them via setSharedModal(...) higher up. */}

      <AchievementsModal
        visible={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
        achievements={achievements}
      />

      <LeaderboardScreen visible={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />

      <NotificationPrefsModal
        visible={notifPrefsOpen}
        onClose={() => setNotifPrefsOpen(false)}
        // The screen's `notificationPrefs` state is kept fresh by
        // refreshUpdateCount on every Profile focus — passing it here
        // lets the modal render the right toggle values on first paint
        // instead of momentarily flashing DEFAULT_PREFS while its own
        // AsyncStorage read resolves. (QA Pass-3 #4 — was previously
        // dead state.) The modal still does its own load() as a safety
        // net, but the initial paint matches reality.
        initialPrefs={notificationPrefs}
        onPrefsChanged={() => {
          // After a toggle persists, recompute the banner count using
          // the fresh prefs so muted statuses disappear immediately.
          void refreshUpdateCount();
        }}
      />

      {/* T4: Reputation-tier explainer. Inline (not a separate file)
          because it's tiny — header + 4 tier rows + a one-line "X to
          next tier" copy. Matches the visual pattern of AboutScreen:
          full-screen Modal with translucent backdrop and a rounded
          card. `accessibilityViewIsModal` on iOS hides the underlying
          screen from SR while open. */}
      <Modal
        visible={tierExplainerOpen}
        animationType={reduceMotion ? 'none' : 'slide'}
        transparent
        aria-label="Reputation tiers"
        onRequestClose={() => setTierExplainerOpen(false)}
      >
        <View style={styles.tierBackdrop}>
          <View style={styles.tierSheet} accessibilityViewIsModal>
            <View style={styles.tierHeaderRow}>
              <AppText variant="heading" style={styles.tierHeaderTitle} accessibilityRole="header">
                Reputation tiers
              </AppText>
              <Pressable
                onPress={() => setTierExplainerOpen(false)}
                hitSlop={12}
                style={styles.tierCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close reputation tiers"
              >
                <X size={18} color={color.text} strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Intro + tier list + footer scroll at large type; the header row
                (title + ✕) stays OUTSIDE so close never leaves the screen
                (sweep M7). */}
            <ScrollView contentContainerStyle={styles.tierScrollContent}>
            <AppText variant="body" style={styles.tierIntro}>
              Earn points every time you report a barrier or help verify and resolve one. Each tier shows
              how much you&apos;ve given back to the community.
            </AppText>

            <View style={styles.tierList}>
              {REPUTATION_TIERS.map((t) => {
                const isCurrent = t.name === tier.name;
                return (
                  <View
                    key={t.name}
                    style={[styles.tierRow, isCurrent && styles.tierRowCurrent]}
                    // accessible + selected: VoiceOver announces "selected" on the
                    // current tier row so AT users know which tier they're in.
                    accessible
                    accessibilityRole="text"
                    {...a11yToggle({ selected: isCurrent })}
                    accessibilityLabel={
                      `${t.label} tier, ${t.threshold}${
                        t.nextThreshold === null ? '+' : ` to ${t.nextThreshold - 1}`
                      } points` + (isCurrent ? '. Your current tier.' : '')
                    }
                  >
                    <TierIcon tier={t} size={font.size.lg} />
                    <View style={styles.tierRowTextWrap}>
                      <AppText variant="label" style={[styles.tierRowLabel, isCurrent && styles.tierRowLabelCurrent]}>
                        {t.label}
                        {isCurrent && <AppText variant="label" style={styles.tierRowCurrentTag}> · you are here</AppText>}
                      </AppText>
                      <AppText variant="body" style={styles.tierRowRange}>
                        {t.nextThreshold === null
                          ? `${t.threshold}+ points`
                          : `${t.threshold} – ${t.nextThreshold - 1} points`}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>

            <AppText variant="body" style={styles.tierFooter}>
              {nextTier
                ? `You're ${tierGap} ${tierGap === 1 ? 'point' : 'points'} away from ${nextTier.label}`
                : `You've reached the top tier — keep contributing!`}
            </AppText>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Stat({ label, value, glassLite }: { label: string; value: number; glassLite: boolean }) {
  const color = useColor();
  const styles = makeStyles(color);
  return (
    <GlassSurface
      variant="row"
      forceEngineered={glassLite}
      style={styles.statCard}
      borderRadius={radius.lg}
    >
      <AppText variant="monoBold" style={styles.statValue}>{value}</AppText>
      <AppText variant="label" style={styles.statLabel} adjustsFontSizeToFit numberOfLines={1}>
        {label}
      </AppText>
    </GlassSurface>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // Deep Field stage root — bg stage1 so any pre-mount frame matches the
    // ScreenStage gradient behind the transparent scroll (GLASS.md rollout §1).
    stageRoot: { flex: 1, backgroundColor: color.stage1 },
    // Transparent so the stage shows through; the cards float on it as glass.
    screen: { flex: 1, backgroundColor: 'transparent' },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.lg,
      paddingHorizontal: spacing.xl,
      backgroundColor: 'transparent',
    },
    // Inline load-error card (mirrors LeaderboardScreen's stateWrap/retryBtn).
    errorCard: {
      // Material via <GlassSurface variant="row" forceEngineered>; no bg here.
      borderRadius: radius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.tight,
      ...shadow.e1,
    },
    errorCardText: { fontSize: font.size.sm, color: color.inkGlassMuted, textAlign: 'center' },
    errorCardHint: { fontSize: font.size.xs, color: color.inkGlassMuted, textAlign: 'center' },
    errorRetryBtn: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: 10,
      backgroundColor: color.ctaFill, // mode-independent brand fill
      borderRadius: radius.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorRetryBtnPressed: { opacity: 0.8 },
    errorRetryText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.textOnBrand,
    },
    signInBtn: {
      backgroundColor: color.ctaFill, // mode-independent brand fill on the stage
      paddingHorizontal: spacing.xxxl,
      paddingVertical: spacing.md + 2,
      borderRadius: radius.circle,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    signInBtnPressed: { opacity: 0.8 },
    signInBtnText: { color: color.textOnBrand, fontSize: font.size.lg, fontWeight: font.weight.semibold },
    container: { padding: spacing.xxl, gap: spacing.lg, alignItems: 'stretch' },
    // ScreenHeader supplies its own type rhythm; the container already pads
    // spacing.xxl, so zero the header's own padding to keep it aligned with the
    // hero/stat cards below (no double indent).
    profileHeader: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
    subtitle: { fontSize: font.size.base, color: color.text },
    heroCard: {
      // Material supplied by <GlassSurface variant="row"> — no bg/border here
      // (the variant paints the floor + edge + specular hairline). Radius +
      // padding + elevation shadow stay on this outer style (GLASS.md do/don't
      // #2: an overflow:hidden material layer would clip its own shadow).
      borderRadius: radius.sheet,
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.xl + 2,
      paddingBottom: spacing.xxl,
      alignItems: 'center',
      gap: spacing.tight,
      ...shadow.e2,
    },
    heroIcon: { fontSize: 32, marginBottom: 4 },

    // Avatar styles — circular tappable photo/initials element in heroCard
    avatarBtn: {
      width: 72,
      height: 72,
      borderRadius: radius.circle,
      marginBottom: 10,
      alignSelf: 'center',
      // No overflow:'hidden' here — the round photo/initials self-clip via their
      // own borderRadius, and clipping the parent would cut off the edit badge
      // that sits at the avatar's bottom-right corner (M4).
    },
    avatarBtnPressed: { opacity: 0.75 },
    avatarImg: {
      width: 72,
      height: 72,
      borderRadius: radius.circle,
    },
    avatarPlaceholder: {
      width: 72,
      height: 72,
      borderRadius: radius.circle,
      backgroundColor: color.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      fontSize: 26,
      fontWeight: '700',
      color: color.brandText,
      letterSpacing: 0.5,
    },
    avatarOverlay: {
      ...StyleSheet.absoluteFillObject,
      // Round the uploading scrim itself — it used to inherit the parent's
      // overflow:'hidden' clip (removed above), so without this it would render
      // as a square over the circular avatar during upload.
      borderRadius: radius.circle,
      backgroundColor: color.overlayBtn,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarEditBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 22,
      height: 22,
      borderRadius: radius.circle,
      backgroundColor: color.brand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroLabel: {
      // Eyebrow on the hero glass — arbitrated on-glass muted ink (textMuted is
      // below AA over the row floor on worst-case backdrops).
      color: color.inkGlassMuted,
      fontSize: font.size.base,
      letterSpacing: 2.4,
      fontWeight: font.weight.bold,
      textTransform: 'uppercase',
    },
    heroValue: {
      // The signature 56pt data-display number on the hero glass. inkDetailsGhost
      // is the arbitrated brand-blue for row glass (light #1466E0 — visually the
      // same Wayfinder blue, 4.75:1; dark #84AEF6 — raw brand fails on dark glass).
      color: color.inkDetailsGhost,
      fontSize: 56,
      fontWeight: '800',
      // 74 = JetBrains Mono's real line box (56 × 1.32) — 60 shaved the
      // ascenders, worst on Android (sweep M5).
      lineHeight: 74,
      letterSpacing: -1.2,
    },
    heroSubtitle: {
      color: color.inkGlassMuted,
      fontSize: font.size.base,
      fontWeight: font.weight.bold,
      textAlign: 'center',
      marginTop: 4,
    },
    progressTrack: {
      width: '100%',
      height: 10,
      backgroundColor: color.surfaceVariant,
      borderRadius: radius.circle,
      marginTop: 10,
      overflow: 'hidden',
    },
    // Civic Gold fill — progress toward a badge is gamification, so it carries
    // the gold language and pops against the blue hero (decorative; the
    // progressbar a11y value conveys the real number).
    progressFill: {
      height: '100%',
      backgroundColor: color.goldAccent,
      borderRadius: radius.circle,
    },
    // Tier progress bar — sits directly below the tier pill row. Fill animates
    // from 0 → progress.
    tierProgressTrack: {
      width: '100%',
      height: 8,
      backgroundColor: color.surfaceVariant,
      borderRadius: radius.circle,
      marginTop: spacing.sm,
      overflow: 'hidden',
    },
    tierProgressFill: {
      height: '100%',
      backgroundColor: color.goldAccent,
      borderRadius: radius.circle,
    },
    tierProgressLabel: {
      color: color.inkGlassMuted, // arbitrated muted ink on the hero glass
      fontSize: font.size.base,
      fontWeight: font.weight.bold,
      textAlign: 'center',
      marginTop: spacing.tight,
    },
    // T4: Hero value row — wraps the large points number + the small
    // tier pill side-by-side. centerY keeps the pill optically aligned
    // with the digit baseline; gap gives the pill breathing room.
    heroValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      // Neither the 56pt number nor the tier pill can shrink — wrap instead of
      // spilling past the card edge at 5-digit points / large type (sweep M6).
      flexWrap: 'wrap',
    },
    // T4: Tier pill. White background on the blue hero gives a high
    // contrast surface for the label (#1b4373 ≈ 10:1 on #fff, well
    // above WCAG AA). 44pt min height keeps the tap target compliant
    // even though the visual pill is shorter — the hitSlop on the
    // Pressable closes the rest of the gap.
    tierPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: radius.circle,
      // brand-soft tint (was white) so the pill reads on the now-white hero card
      backgroundColor: color.brandSofter,
      minHeight: 32,
      minWidth: 44,
      justifyContent: 'center',
      ...shadow.e1,
    },
    tierPillPressed: {
      backgroundColor: color.brandSoft,
      opacity: 0.95,
    },
    tierPillEmoji: { fontSize: 14 },
    tierPillLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: color.brandText,
      letterSpacing: 0.2,
    },
    // T4: Tier-explainer modal. Mirrors AboutScreen's translucent backdrop
    // and rounded card; lives inline here because it's small and
    // tightly coupled to the pill above.
    tierBackdrop: {
      flex: 1,
      backgroundColor: color.scrim,
      justifyContent: 'center',
      padding: 24,
    },
    tierSheet: {
      backgroundColor: color.surface,
      borderRadius: radius.xl,
      padding: 20,
      gap: 12,
      maxHeight: '85%',
      ...shadow.e3,
    },
    // Spacing for the scrollable middle (intro + list + footer) — mirrors the
    // sheet's own gap now that those children live inside the ScrollView.
    tierScrollContent: { gap: 12 },
    tierHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tierHeaderTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: color.textStrong,
      letterSpacing: -0.2,
    },
    tierCloseBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },    tierIntro: { fontSize: 13, color: color.text, lineHeight: 19 },
    tierList: { gap: 8, marginTop: 4 },
    tierRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: color.surfaceMuted,
      minHeight: 48,
    },
    // Highlights the user's current tier — pale blue tint + left accent
    // bar so it's recognizable at a glance.
    tierRowCurrent: {
      backgroundColor: color.brandSofter,
      borderLeftWidth: 3,
      borderLeftColor: color.brand,
    },
    tierRowEmoji: { fontSize: 22 },
    tierRowTextWrap: { flex: 1, gap: 2 },
    tierRowLabel: { fontSize: 15, fontWeight: '700', color: color.text },
    tierRowLabelCurrent: { color: color.brandText },
    tierRowCurrentTag: { fontSize: 12, fontWeight: '600', color: color.brandText },
    tierRowRange: { fontSize: 12, color: color.textMuted },
    tierFooter: {
      fontSize: 13,
      fontWeight: '600',
      color: color.brandText,
      textAlign: 'center',
      marginTop: 4,
    },
    // Point history card — owner-only section below the hero card.
    // Shows the last 5 point events; hidden when empty (migration not applied
    // or no events yet). Matches the overall card-surface pattern.
    pointHistoryCard: {
      // Material via <GlassSurface variant="row">; no bg here.
      borderRadius: radius.lg,
      padding: 16,
      gap: spacing.sm,  // or spacing.md — Dani design decision P2
      ...shadow.e1,
    },
    pointHistoryTitle: {
      fontSize: font.size.xs,
      fontWeight: font.weight.bold,
      color: color.inkGlassMuted, // arbitrated muted ink on the row glass
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    pointHistoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 44, // WCAG 2.5.5 — these are VoiceOver-focusable rows; meet the 44pt target
    },
    // Hairline divider between point-history rows (all but the last) so the list
    // scans cleanly instead of running together. A neutral hairline (not text),
    // so no added contrast obligation; reuses the existing border token.
    pointHistoryRowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.border,
    },
    // Directional icon (↑/↓). successStrong (#1e8449) at 4.66:1 on white
    // passes WCAG AA; the ↑ shape also conveys direction without color alone.
    pointHistoryIcon: {
      fontSize: font.size.base,
      color: color.successStrong,
      width: spacing.xl,
      textAlign: 'center',
      fontWeight: font.weight.bold,
    },
    pointHistoryIconNeg: {
      color: color.error,
    },
    pointHistoryLabel: {
      flex: 1,
      fontSize: font.size.sm,
      color: color.text,
    },
    pointHistoryDate: {
      fontSize: font.size.xs,
      color: color.inkGlassMuted, // arbitrated muted ink on the row glass
      textAlign: 'right',
    },
    // Neutral high-contrast delta number. On the light row-over-stage worst case
    // the semantic green (successStrong) measures 4.28:1 (<4.5), so the NUMBER
    // takes textStrong (arbiter-forced) and the gain/loss color lives on the
    // decorative arrow (1.4.11 graphic, min 3); the +/- sign carries direction
    // too, so color is never the sole signal.
    pointHistoryDelta: {
      fontSize: font.size.sm,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      minWidth: 52,
      textAlign: 'right',
    },
    // Empty state — encouraging copy when no events exist yet.
    pointHistoryEmpty: {
      fontSize: font.size.sm,
      color: color.inkGlassMuted, // on the row glass
      textAlign: 'center',
      paddingVertical: spacing.lg,
    },
    // Visit-streak card — amber-tinted pill row between the stat tiles and
    // the status breakdown. Reads as a "you're on a roll" pat-on-the-back
    // without competing with the headline points/milestones above.
    streakCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: color.warningBg,
      borderRadius: radius.lg,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderLeftWidth: 3,
      borderLeftColor: color.accentOrange,
    },
    streakIcon: { fontSize: 24 },
    streakTextWrap: { flex: 1, gap: 2 },
    streakValue: { fontSize: 15, fontWeight: '700', color: color.warningFg },
    streakSubtitle: { fontSize: 12, color: color.warningFg, opacity: 0.85 },
    // R9: Nearest-unresolved jump button. Pale-blue card to set it apart
    // from the orange streak card directly above; chevron hints at the
    // navigation action.
    nearestBtn: {
      // Banner material via <GlassSurface variant="banner">; the variant's brand
      // edge replaces the old left-accent bar. No bg/border here.
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 56,
    },
    nearestBtnPressed: {
      // opacity only — a bg swap is invisible under the banner glass.
      opacity: 0.9,
    },
    nearestBtnIcon: { fontSize: 22 },
    nearestBtnTextWrap: { flex: 1, gap: 2 },
    // brandOnSoft is the arbitrated ink for the brand-tinted banner floor.
    // (No opacity on the subtitle — a translucent ink over glass hazes below AA.)
    nearestBtnTitle: { fontSize: font.size.md, fontWeight: font.weight.bold, color: color.brandOnSoft },
    nearestBtnSubtitle: { fontSize: font.size.xs, color: color.brandOnSoft },
    nearestBtnChevron: {
      fontSize: 22,
      color: color.brand,
      paddingHorizontal: spacing.tight,
      fontWeight: font.weight.bold,
    },
    statsRow: { flexDirection: 'row', gap: spacing.md },
    statCard: {
      // Material via <GlassSurface variant="row">; no bg here. flex/radius/
      // padding/shadow stay on the outer style.
      flex: 1,
      borderRadius: radius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      ...shadow.e2,
    },
    statValue: {
      // textStrong (near-black / near-white) reads high-contrast on the row
      // glass in both themes — arbiter-declared, not a muted ink.
      fontSize: 28,
      fontWeight: '700',
      color: color.textStrong,
      letterSpacing: -0.5,
    },
    statLabel: {
      fontSize: 11,
      color: color.inkGlassMuted, // arbitrated muted ink on the row glass
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: '600',
    },
    // Per-status pill row (open / verified / resolved / rejected). Uses
    // STATUS_COLORS for visual continuity with the badges in detail modals.
    statusBreakdownRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    statusPill: {
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 70,
      // A pill that wraps to its own line grows toward 100% — cap it so the
      // 3+1 wrap at 320pt doesn't stretch the orphan edge-to-edge. At 375 all
      // four pills sit near 25%, so the default row is untouched.
      maxWidth: '48%',
      // minHeight guarantees the now-tappable pills meet the 44pt target
      // even before content; the count + label already push past it.
      minHeight: 44,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    // Pressed feedback for the tappable (non-zero) status pills.
    statusPillPressed: { opacity: 0.7 },
    // Zero-count pills fade so the eye lands on what's actually there.
    statusPillDimmed: { opacity: 0.55 },
    statusPillCount: { fontSize: 18, fontWeight: '700' },
    statusPillLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    myReportsBtn: {
      // Material via <GlassSurface variant="row" forceEngineered> (engineered —
      // outside the blur cluster, budget-free). No bg here; layout + shadow stay.
      borderRadius: radius.lg,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      ...shadow.e1,
      minHeight: 64,
    },
    // Press feedback is opacity only — a bg swap is invisible under glass.
    myReportsBtnPressed: { opacity: 0.85 },
    myReportsTextWrap: { flex: 1, gap: 2 },
    myReportsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: color.textStrong,
      letterSpacing: -0.1,
    },
    // Inline "· X / N" count next to the Achievements title — muted so the
    // main title still reads as the link affordance.
    achievementsCount: { fontWeight: '600', color: color.inkGlassMuted, fontSize: 14 },
    myReportsSubtitle: { fontSize: 13, color: color.inkGlassMuted },
    section: { gap: 8, marginTop: 8 },
    sectionLabel: {
      fontSize: 12,
      // Section headers sit on the raw stage — inkOnStage (textMuted is below AA there).
      color: color.inkOnStage,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: '700',
    },
    nameRow: { flexDirection: 'row', gap: 8 },
    nameInputWrap: { flex: 1 },
    saveBtn: {
      backgroundColor: color.ctaFill, // mode-independent brand fill (white on it is AA both themes)
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 72,
      minHeight: 44,
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { color: color.textOnBrand, fontWeight: '700', fontSize: 14 },
    hint: { fontSize: 12, color: color.inkOnStage, lineHeight: 16 },
    tabRow: { flexDirection: 'row', gap: 8 },
    tabPill: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      // Engineered chip tint on the stage (a control smaller than a row tints,
      // never blurs); the edge hairline gives it definition.
      backgroundColor: color.glassChipFill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.glassChipEdge,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    // Selected: mode-independent ctaFill + white — the one AA brand fill in both
    // themes (dark brand + white = 3.4:1 fails). borderColor matches so the chip
    // edge disappears under the fill.
    tabPillSelected: { backgroundColor: color.ctaFill, borderColor: color.ctaFill },
    tabPillText: { color: color.glassChipInk, fontWeight: '600', fontSize: 14 },
    tabPillTextSelected: { color: color.textOnBrand },
    linkBtn: {
      // Engineered chip tint on the stage.
      backgroundColor: color.glassChipFill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: color.glassChipEdge,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    linkBtnText: { color: color.inkSelect, fontWeight: '600', fontSize: 14 },
    // D4: realtime toggle row — label + hint on the left, Switch on the right.
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
      gap: 12,
      minHeight: 44,
    },
    toggleTextWrap: { flex: 1, gap: 2 },
    toggleLabel: { fontSize: 14, fontWeight: '600', color: color.textStrong },
    toggleHint: { fontSize: 12, color: color.inkOnStage },
    aboutRow: {
      // Material via <GlassSurface variant="row" forceEngineered>; no bg here.
      // marginTop stays on this outer style (the GlassSurface wrapper).
      marginTop: spacing.lg,
      borderRadius: radius.lg,
      padding: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      ...shadow.e1,
      minHeight: 64,
    },
    aboutRowPressed: { opacity: 0.85 }, // opacity only — bg swap invisible on glass
    aboutTextWrap: { flex: 1, gap: 2 },
    aboutTitle: {
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      letterSpacing: -0.1,
    },
    aboutSubtitle: { fontSize: font.size.sm, color: color.inkGlassMuted },
    signOutBtn: {
      marginTop: spacing.lg,
      alignSelf: 'center',
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      minHeight: 44,
      justifyContent: 'center',
    },
    signOutText: { color: color.text, fontWeight: '600' },
    // Destructive button — text-only red, not a filled button, so it reads as
    // a secondary action well below the sign-out affordance.
    deleteAccountBtn: {
      marginTop: 8,
      marginBottom: 32,
      alignSelf: 'center',
      paddingHorizontal: 24,
      paddingVertical: 12,
      minHeight: 44,
      justifyContent: 'center',
    },
    // On the stage BOTH color.error tones fail (light #c0392b = 3.88:1 on the
    // stage's darkest stop, dark fails too), so this destructive text takes
    // errorFg in both themes — the AA-guaranteed red (light #8a1f1f ~8:1, dark
    // #fca5a5 7.7:1), still unmistakably red.
    deleteAccountText: {
      color: color.errorFg,
      fontWeight: font.weight.semibold,
      fontSize: font.size.md,
    },
    // Deletion confirmation modal — translucent backdrop + centred card.
    deleteBackdrop: {
      flex: 1,
      backgroundColor: color.scrim,
      justifyContent: 'center',
      padding: 24,
    },
    deleteSheet: {
      backgroundColor: color.surface,
      borderRadius: radius.xl,
      padding: 24,
      gap: 16,
      maxHeight: '85%',
      ...shadow.e3,
    },
    // Spacing for the scrollable copy — mirrors the sheet gap inside the ScrollView.
    deleteScrollContent: { gap: 16 },
    deleteTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: color.textStrong,
      letterSpacing: -0.3,
    },
    deleteBody: {
      fontSize: 15,
      color: color.text,
      lineHeight: 22,
    },
    deleteBodySecondary: {
      fontSize: 13,
      color: color.textMuted,
      lineHeight: 18,
      marginTop: -4,
    },
    deleteActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    deleteCancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: radius.md,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    deleteCancelBtnPressed: { opacity: 0.75 },
    deleteCancelText: { color: color.text, fontWeight: '600', fontSize: 15 },
    deleteConfirmBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: radius.md,
      backgroundColor: color.error,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    deleteConfirmBtnPressed: { opacity: 0.85 },
    deleteConfirmBtnDisabled: { opacity: 0.55 },
    deleteConfirmText: { color: color.textOnBrand, fontWeight: font.weight.bold, fontSize: font.size.md },
  });
