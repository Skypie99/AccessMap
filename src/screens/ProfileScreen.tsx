import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import { signOut, supabase } from '@/lib/supabase';
import { useSharedModals } from '@/lib/sharedModalsContext';
import { getInitials, updateUserProfile, uploadAvatar } from '@/lib/users';
import { DEFAULT_TABS, getDefaultTab, setDefaultTab, type DefaultTab } from '@/lib/preferences';
import { useRealtimeEnabled } from '@/lib/realtimePrefs';
import { clearOnboardingSeen } from '@/lib/onboarding';
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
import FlagDetailModal, { type DetailAction } from '@/components/FlagDetailModal';
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
import { computeAchievements, countEarned, type AchievementStats } from '@/lib/achievements';
import AchievementsModal from '@/components/AchievementsModal';
import RecentlyViewedRow from '@/components/RecentlyViewedRow';
import ReportsBreakdownCard from '@/components/ReportsBreakdownCard';
import LeaderboardModal from '@/components/LeaderboardModal';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, shadow } from '@/theme';
import { getTier, pointsToNextTier, REPUTATION_TIERS } from '@/lib/reputationTier';
import SignInScreen from '@/screens/SignInScreen';
import AboutScreen from '@/screens/AboutScreen';

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

// Notional point milestones — each one is a small "you reached X" badge
// inline in the hero card. Tuned to feel rewarding early (25, 50) and
// then pace out at typical engagement levels. If we ever ship real
// badges/achievements these labels become their names.
const MILESTONES: Array<{ at: number; label: string }> = [
  { at: 25, label: 'First Mile badge' },
  { at: 50, label: 'Bronze Reviewer badge' },
  { at: 100, label: 'Silver Reviewer badge' },
  { at: 250, label: 'Gold Reviewer badge' },
  { at: 500, label: 'Community Hero badge' },
  { at: 1000, label: 'Legend status' },
];

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
  const styles = makeStyles(color);
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, 'Profile'>>();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [stats, setStats] = useState<Stats>({
    reported: 0,
    resolved: 0,
    byStatus: EMPTY_BY_STATUS,
  });
  const [loading, setLoading] = useState(true);

  // My Reports modal lives at this level so its FlagDetailModal sibling can
  // render on top without nesting Modals — nested transparent Modals are
  // platform-flaky (mostly on Android). When a row is tapped we hide the
  // list modal, open the detail modal, and re-show the list on close.
  const [signInOpen, setSignInOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
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

  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  // T4: Reputation-tier explainer sheet. Opens when the user taps the
  // tier pill in the hero card. Inline (not a separate component file)
  // since it's <40 LOC of JSX and reads cleanly here next to the pill.
  const [tierExplainerOpen, setTierExplainerOpen] = useState(false);

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
    if (mountedRef.current) setLoading(true);
    try {
      // One query for all status counts (and the total). Cheaper than
      // running a separate count(*) per status; row count caps at the
      // user's own report count so payload stays tiny.
      const [{ data: profileRow, error: profileErr }, statusRowsRes] = await Promise.all([
        // PRIVACY: Explicit columns — never select('*') on users; future schema
        // columns (e.g. internal flags, phone number) must not leak automatically.
        supabase.from('users').select('id, display_name, avatar_url, points, created_at').eq('id', user.id).maybeSingle(),
        supabase.from('flags').select('status').eq('user_id', user.id),
      ]);

      if (profileErr) throw profileErr;
      if (statusRowsRes.error) throw statusRowsRes.error;
      if (!mountedRef.current) return;
      const row = (profileRow as UserRow | null) ?? null;
      setProfile(row);
      setNameDraft(row?.display_name ?? '');

      const byStatus: Record<FlagStatus, number> = { ...EMPTY_BY_STATUS };
      const statusRows = (statusRowsRes.data ?? []) as Array<{
        status: FlagStatus;
      }>;
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
      if (mountedRef.current) {
        Alert.alert('Could not load profile', errorMessage(e));
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
      Alert.alert('Could not save name', errorMessage(e));
    } finally {
      if (mountedRef.current) setSavingName(false);
    }
  }, [user, trimmedDraft]);

  const doUploadAvatar = useCallback(
    async (localUri: string) => {
      if (!user) return;
      setUploadingAvatar(true);
      try {
        const avatarUrl = await uploadAvatar(user.id, localUri);
        const updated = await updateUserProfile(user.id, { avatar_url: avatarUrl });
        if (mountedRef.current) {
          setProfile(updated);
          AccessibilityInfo.announceForAccessibility('Profile photo updated.');
        }
      } catch (e) {
        Alert.alert('Could not update photo', errorMessage(e));
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
        if (file) void doUploadAvatar(URL.createObjectURL(file));
      };
      input.click();
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Allow photo library access to set a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]?.uri) {
        void doUploadAvatar(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Could not pick photo', errorMessage(e));
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
          Alert.alert('Could not save preference');
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
      'The 3-card introduction will appear the next time you sign in on this device.',
      'Reset',
    );
    if (!ok) return;
    await clearOnboardingSeen(user.id);
    AccessibilityInfo.announceForAccessibility(
      'Intro reset. You will see it again on next sign in.',
    );
  }, [user]);

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
    navigation.navigate('Map', {
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
    navigation.navigate('Map', {
      focusFlag: { id: flag.id, lat: flag.lat, lng: flag.lng },
      ts: Date.now(),
    });
  }, [nearestUnresolved, navigation]);

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.subtitle}>Not signed in.</Text>
        <Pressable
          onPress={() => setSignInOpen(true)}
          style={({ pressed }) => [styles.signInBtn, pressed && styles.signInBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Sign in to your account"
        >
          <Text style={styles.signInBtnText}>Sign in</Text>
        </Pressable>
        <Modal
          visible={signInOpen}
          animationType="slide"
          onRequestClose={() => setSignInOpen(false)}
        >
          <SignInScreen onClose={() => setSignInOpen(false)} />
        </Modal>
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
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <Text style={styles.email}>Signed in as {user.email}</Text>

        <UpdateBanner
          count={updateCount}
          onView={handleViewUpdates}
          onDismiss={handleDismissUpdates}
        />

        <View style={styles.heroCard}>
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
            accessibilityState={{ busy: uploadingAvatar }}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImg}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text
                  style={styles.avatarInitials}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  {getInitials(profile?.display_name ?? user.email ?? '')}
                </Text>
              </View>
            )}
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
                <Text style={styles.avatarEditBadgeText}>✎</Text>
              </View>
            )}
          </Pressable>
          <Text style={styles.heroLabel}>POINTS</Text>
          {/* Value + tier pill on the same row so the pill sits BESIDE
              the points number (per T4 spec). The pill is a Pressable
              with its own a11y label, focusable independently. */}
          <View style={styles.heroValueRow}>
            <Text style={styles.heroValue} accessibilityLabel={`${points} points`}>
              {points}
            </Text>
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
              <Text
                style={styles.tierPillEmoji}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {tier.emoji}
              </Text>
              <Text style={styles.tierPillLabel}>{tier.label}</Text>
            </Pressable>
          </View>
          {nextMilestone !== null ? (
            <>
              <View
                style={styles.progressTrack}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <View style={[styles.progressFill, { width: progressBarWidth }]} />
              </View>
              <Text style={styles.heroSubtitle}>
                {nextMilestone - points} points to {milestoneLabel}
              </Text>
            </>
          ) : (
            <Text style={styles.heroSubtitle}>
              ⭐ You've reached the top milestone — legend status.
            </Text>
          )}
        </View>

        <View style={styles.statsRow}>
          <Stat label="Reported" value={stats.reported} />
          <Stat label="Resolved" value={stats.resolved} />
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
            <Text
              style={styles.streakIcon}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              🔥
            </Text>
            <View style={styles.streakTextWrap}>
              <Text style={styles.streakValue}>
                {streak.current} day{streak.current === 1 ? '' : 's'} in a row
              </Text>
              <Text style={styles.streakSubtitle}>
                {streak.longest > streak.current
                  ? `Best ever: ${streak.longest} days`
                  : 'New personal best!'}
              </Text>
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
            style={({ pressed }) => [styles.nearestBtn, pressed && styles.nearestBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={
              `Jump to the nearest unresolved flag: ` +
              `${CATEGORY_LABELS[nearestUnresolved.flag.category]}, ` +
              `severity ${nearestUnresolved.flag.severity}, ` +
              `${formatDistance(nearestUnresolved.km)} away.`
            }
            accessibilityHint="Opens the Map tab centered on this flag"
          >
            <Text
              style={styles.nearestBtnIcon}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              📍
            </Text>
            <View style={styles.nearestBtnTextWrap}>
              <Text style={styles.nearestBtnTitle}>
                Nearest unresolved · {formatDistance(nearestUnresolved.km)}
              </Text>
              <Text style={styles.nearestBtnSubtitle} numberOfLines={1}>
                {CATEGORY_LABELS[nearestUnresolved.flag.category]} · severity{' '}
                {nearestUnresolved.flag.severity}
              </Text>
            </View>
            <Text
              style={styles.nearestBtnChevron}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              ›
            </Text>
          </Pressable>
        )}

        {/* Per-status breakdown — small palette-tinted chips. Only shown
            when the user has at least one report so first-launch profiles
            stay uncluttered. */}
        {stats.reported > 0 && (
          <View
            style={styles.statusBreakdownRow}
            // QA A3: same root cause as the streak card — without
            // accessible={true}, the per-status pills are read as four
            // separate elements ("5 OPEN", "3 VERIFIED", …) instead of
            // the combined summary label.
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={
              `Your reports by status: ` +
              (['open', 'verified', 'resolved', 'rejected'] as FlagStatus[])
                .map((s) => `${stats.byStatus[s]} ${STATUS_LABELS[s].toLowerCase()}`)
                .join(', ')
            }
          >
            {(['open', 'verified', 'resolved', 'rejected'] as FlagStatus[]).map((status) => {
              const palette = STATUS_COLORS[status];
              const count = stats.byStatus[status];
              return (
                <View
                  key={status}
                  style={[
                    styles.statusPill,
                    { backgroundColor: palette.bg },
                    count === 0 && styles.statusPillDimmed,
                  ]}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                >
                  <Text style={[styles.statusPillCount, { color: palette.fg }]}>{count}</Text>
                  <Text style={[styles.statusPillLabel, { color: palette.fg }]}>
                    {STATUS_LABELS[status]}
                  </Text>
                </View>
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
            navigation.navigate('Map', {
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
          style={({ pressed }) => [styles.myReportsBtn, pressed && styles.myReportsBtnPressed]}
          onPress={() => setReportsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={
            stats.reported === 0
              ? 'My Reports, no reports yet'
              : `My Reports, ${stats.reported} ${stats.reported === 1 ? 'report' : 'reports'}`
          }
          accessibilityHint="Opens a list of every flag you've submitted"
        >
          <View style={styles.myReportsTextWrap}>
            <Text style={styles.myReportsTitle}>My Reports</Text>
            <Text style={styles.myReportsSubtitle}>
              {stats.reported === 0
                ? 'See your reports here once you submit one.'
                : 'View every flag you’ve submitted.'}
            </Text>
          </View>
          <Text style={styles.myReportsChevron} accessibilityElementsHidden>
            ›
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.myReportsBtn, pressed && styles.myReportsBtnPressed]}
          onPress={() => setWatchedOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Watched Flags"
          accessibilityHint="Opens the list of flags you are tracking for status changes"
        >
          <View style={styles.myReportsTextWrap}>
            <Text style={styles.myReportsTitle}>Watched Flags</Text>
            <Text style={styles.myReportsSubtitle}>
              Track flags you care about and see when their status changes.
            </Text>
          </View>
          <Text style={styles.myReportsChevron} accessibilityElementsHidden>
            ›
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.myReportsBtn, pressed && styles.myReportsBtnPressed]}
          onPress={() => setActivityOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Recent Activity"
          accessibilityHint="Opens a chronological feed of recent flag activity, grouped by day"
        >
          <View style={styles.myReportsTextWrap}>
            <Text style={styles.myReportsTitle}>Recent Activity</Text>
            <Text style={styles.myReportsSubtitle}>
              See what's been reported and triaged across the community, newest first.
            </Text>
          </View>
          <Text style={styles.myReportsChevron} accessibilityElementsHidden>
            ›
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.myReportsBtn, pressed && styles.myReportsBtnPressed]}
          onPress={() => setAchievementsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Achievements, ${achievementCount.earned} of ${achievementCount.total} earned`}
          accessibilityHint="Opens the full achievement catalog with your progress on each badge"
        >
          <View style={styles.myReportsTextWrap}>
            <Text style={styles.myReportsTitle}>
              Achievements{' '}
              <Text style={styles.achievementsCount}>
                · {achievementCount.earned} / {achievementCount.total}
              </Text>
            </Text>
            <Text style={styles.myReportsSubtitle}>
              {achievementCount.earned === 0
                ? 'Earn badges by reporting, triaging, and showing up.'
                : achievementCount.earned === achievementCount.total
                  ? "You've earned every badge — legend status."
                  : `${achievementCount.total - achievementCount.earned} more to go. Tap to see what's next.`}
            </Text>
          </View>
          <Text style={styles.myReportsChevron} accessibilityElementsHidden>
            ›
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.myReportsBtn, pressed && styles.myReportsBtnPressed]}
          onPress={() => setLeaderboardOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Community Leaderboard"
          accessibilityHint="Opens the top 10 contributors ranked by points"
        >
          <View style={styles.myReportsTextWrap}>
            <Text style={styles.myReportsTitle}>Community Leaderboard</Text>
            <Text style={styles.myReportsSubtitle}>
              See the top contributors in your area ranked by points.
            </Text>
          </View>
          <Text style={styles.myReportsChevron} accessibilityElementsHidden>
            ›
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.myReportsBtn, pressed && styles.myReportsBtnPressed]}
          onPress={() => setNotifPrefsOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Notification settings"
          accessibilityHint="Opens settings for which flag status updates surface in your update banner"
        >
          <View style={styles.myReportsTextWrap}>
            <Text style={styles.myReportsTitle}>Notifications</Text>
            <Text style={styles.myReportsSubtitle}>
              Choose which flag status changes surface as updates.
            </Text>
          </View>
          <Text style={styles.myReportsChevron} accessibilityElementsHidden>
            ›
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.myReportsBtn, pressed && styles.myReportsBtnPressed]}
          onPress={() => setSharedModal('myFeedback')}
          accessibilityRole="button"
          accessibilityLabel="My Feedback"
          accessibilityHint="Opens the list of feedback you've sent to the maintainer"
        >
          <View style={styles.myReportsTextWrap}>
            <Text style={styles.myReportsTitle}>My Feedback</Text>
            <Text style={styles.myReportsSubtitle}>View the feedback messages you've sent.</Text>
          </View>
          <Text style={styles.myReportsChevron} accessibilityElementsHidden>
            ›
          </Text>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            Display name
          </Text>
          <View style={styles.nameRow}>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Add a display name"
              placeholderTextColor={color.textMuted}
              style={styles.nameInput}
              editable={!savingName}
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
              accessibilityState={{ disabled: !nameChanged, busy: savingName }}
            >
              {savingName ? (
                <ActivityIndicator color={color.textOnBrand} />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </Pressable>
          </View>
          <Text style={styles.hint}>
            The name shown next to your reports. Leave empty to use your email.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            Default landing tab
          </Text>
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
                  accessibilityState={{
                    selected,
                    disabled: savingTab || defaultTab === null,
                  }}
                >
                  <Text style={[styles.tabPillText, selected && styles.tabPillTextSelected]}>
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>The app opens to this tab when you sign in.</Text>
        </View>

        {/* D4: Realtime opt-in toggle (Safeguard #2).
            Default off — users must explicitly enable to subscribe.
            The underlying AsyncStorage write is surfaced as an error if
            it fails (not silently swallowed) because the user just told
            us their preference and we must honour it. */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            Real-time updates
          </Text>
          <View
            style={styles.toggleRow}
            accessible
            accessibilityRole="switch"
            accessibilityLabel="Show new flags in real-time"
            accessibilityHint="When on, the map updates automatically as new flags are reported or triaged — no need to refresh manually"
            accessibilityState={{ checked: realtimeEnabled, busy: savingRealtime }}
          >
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleLabel}>Show new flags in real-time</Text>
              <Text style={styles.toggleHint}>Map updates automatically when flags change.</Text>
            </View>
            <Switch
              value={realtimeEnabled}
              onValueChange={handleRealtimeToggle}
              disabled={savingRealtime}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              trackColor={{ false: '#ccc', true: color.brand }}
              thumbColor={
                Platform.OS === 'android' ? (realtimeEnabled ? color.brand : '#f4f3f4') : undefined
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel} accessibilityRole="header">
            Onboarding
          </Text>
          <Pressable
            onPress={handleShowIntroAgain}
            style={styles.linkBtn}
            accessibilityRole="button"
            accessibilityLabel="Show me the intro again"
            accessibilityHint="Resets the first-run cards so they appear at the next sign in"
          >
            <Text style={styles.linkBtnText}>Show me the intro again</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.aboutRow, pressed && styles.aboutRowPressed]}
          onPress={() => setSharedModal('help')}
          accessibilityRole="button"
          accessibilityLabel="Help and frequently asked questions"
          accessibilityHint="Opens collapsible answers to common questions about the app"
        >
          <View style={styles.aboutTextWrap}>
            <Text style={styles.aboutTitle}>Help & FAQ</Text>
            <Text style={styles.aboutSubtitle}>
              Common questions about reports, points, and accessibility.
            </Text>
          </View>
          <Text style={styles.aboutChevron} accessibilityElementsHidden>
            ›
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.aboutRow, pressed && styles.aboutRowPressed]}
          onPress={() => setSharedModal('changelog')}
          accessibilityRole="button"
          accessibilityLabel="What's New"
          accessibilityHint="Opens a dated list of recent shipped features"
        >
          <View style={styles.aboutTextWrap}>
            <Text style={styles.aboutTitle}>What's New</Text>
            <Text style={styles.aboutSubtitle}>Recent features added to AccessMap.</Text>
          </View>
          <Text style={styles.aboutChevron} accessibilityElementsHidden>
            ›
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.aboutRow, pressed && styles.aboutRowPressed]}
          onPress={() => setAboutOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="About AccessMap"
          accessibilityHint="Opens information about the app, version, and how to send feedback"
        >
          <View style={styles.aboutTextWrap}>
            <Text style={styles.aboutTitle}>About AccessMap</Text>
            <Text style={styles.aboutSubtitle}>
              What it is, who built it, and how to get in touch.
            </Text>
          </View>
          <Text style={styles.aboutChevron} accessibilityElementsHidden>
            ›
          </Text>
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
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>

      <MyReportsModal
        visible={reportsOpen}
        onClose={() => setReportsOpen(false)}
        onSelectFlag={handleReportsSelectFlag}
        onViewOnMap={handleViewOnMap}
        refreshKey={reportsRefreshKey}
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

      <FlagDetailModal
        visible={selectedFlag !== null}
        flag={selectedFlag}
        onClose={handleDetailClose}
        onChanged={handleDetailChanged}
        onDeleted={handleDetailDeleted}
        onViewOnMap={handleViewOnMap}
      />

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

      <LeaderboardModal visible={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />

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
        animationType="slide"
        transparent
        onRequestClose={() => setTierExplainerOpen(false)}
      >
        <View style={styles.tierBackdrop}>
          <View style={styles.tierSheet} accessibilityViewIsModal>
            <View style={styles.tierHeaderRow}>
              <Text style={styles.tierHeaderTitle} accessibilityRole="header">
                Reputation tiers
              </Text>
              <Pressable
                onPress={() => setTierExplainerOpen(false)}
                hitSlop={12}
                style={styles.tierCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close reputation tiers"
              >
                <Text style={styles.tierCloseBtnText}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.tierIntro}>
              Earn points by reporting flags and helping verify or resolve them. Each tier reflects
              how much you've contributed.
            </Text>

            <View style={styles.tierList}>
              {REPUTATION_TIERS.map((t) => {
                const isCurrent = t.name === tier.name;
                return (
                  <View
                    key={t.name}
                    style={[styles.tierRow, isCurrent && styles.tierRowCurrent]}
                    // selected={true} on the current row lets SR
                    // announce "selected" so users know which tier
                    // they're in without scanning visually.
                    accessibilityRole="text"
                    accessibilityState={{ selected: isCurrent }}
                    accessibilityLabel={
                      `${t.label} tier, ${t.threshold}${
                        t.nextThreshold === null ? '+' : ` to ${t.nextThreshold - 1}`
                      } points` + (isCurrent ? '. Your current tier.' : '')
                    }
                  >
                    <Text
                      style={styles.tierRowEmoji}
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      {t.emoji}
                    </Text>
                    <View style={styles.tierRowTextWrap}>
                      <Text style={[styles.tierRowLabel, isCurrent && styles.tierRowLabelCurrent]}>
                        {t.label}
                        {isCurrent && <Text style={styles.tierRowCurrentTag}> · you are here</Text>}
                      </Text>
                      <Text style={styles.tierRowRange}>
                        {t.nextThreshold === null
                          ? `${t.threshold}+ points`
                          : `${t.threshold} – ${t.nextThreshold - 1} points`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <Text style={styles.tierFooter}>
              {nextTier
                ? `You're ${tierGap} ${tierGap === 1 ? 'point' : 'points'} away from ${nextTier.label} ${nextTier.emoji}`
                : `You've reached the top tier — keep contributing!`}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  const color = useColor();
  const styles = makeStyles(color);
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // Screen wash — replaces the default white background so the white
    // cards inside (stats, My Reports, About row) actually read as cards
    // rather than blending into the surface they sit on.
    screen: { flex: 1, backgroundColor: color.surfaceMuted },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      backgroundColor: color.surfaceMuted,
    },
    signInBtn: {
      backgroundColor: color.brand,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 100,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    signInBtnPressed: { opacity: 0.8 },
    signInBtnText: { color: color.textOnBrand, fontSize: 16, fontWeight: '600' },
    container: { padding: 24, gap: 16, alignItems: 'stretch' },
    email: {
      fontSize: 13,
      color: color.textMuted,
      textAlign: 'center',
      marginBottom: 4,
    },
    subtitle: { fontSize: 14, color: color.text },
    heroCard: {
      backgroundColor: color.brand,
      borderRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 22,
      paddingBottom: 24,
      alignItems: 'center',
      gap: 4,
      // Heavier drop shadow so the hero sits forward as the page anchor.
      shadowColor: color.shadow,
      shadowOpacity: 0.22,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    heroIcon: { fontSize: 32, marginBottom: 4 },

    // Avatar styles — circular tappable photo/initials element in heroCard
    avatarBtn: {
      width: 72,
      height: 72,
      borderRadius: radius.circle,
      marginBottom: 10,
      alignSelf: 'center',
      overflow: 'hidden',
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
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarInitials: {
      fontSize: 26,
      fontWeight: '700',
      color: color.textOnBrand,
      letterSpacing: 0.5,
    },
    avatarOverlay: {
      ...StyleSheet.absoluteFillObject,
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
    avatarEditBadgeText: {
      fontSize: 11,
      color: color.textOnBrand,
      fontWeight: '700',
    },

    heroLabel: {
      color: color.pointsPillText,
      // WCAG 1.4.3: pointsPillText (#dbe7fb) on brand (#2f80ed) = 3.10:1.
      // At ≥14pt bold this qualifies as "large text" → 3:1 threshold → passes.
      // (11pt bold = small text → needed 4.5:1 → failed.)
      fontSize: font.size.base,
      letterSpacing: 2.4,
      fontWeight: font.weight.bold,
      textTransform: 'uppercase',
    },
    heroValue: {
      color: color.textOnBrand,
      fontSize: 56,
      fontWeight: '800',
      lineHeight: 60,
      letterSpacing: -1.2,
    },
    heroSubtitle: {
      color: color.pointsPillText,
      // WCAG 1.4.3: same 3.10:1 contrast as heroLabel — bumped to 14pt bold
      // so it qualifies as "large text" and clears the 3:1 threshold.
      // (13pt semibold = small text → needed 4.5:1 → failed.)
      fontSize: font.size.base,
      fontWeight: font.weight.bold,
      textAlign: 'center',
      marginTop: 4,
    },
    progressTrack: {
      width: '100%',
      height: 8,
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: radius.circle,
      marginTop: 10,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: color.textOnBrand,
      borderRadius: radius.circle,
    },
    // T4: Hero value row — wraps the large points number + the small
    // tier pill side-by-side. centerY keeps the pill optically aligned
    // with the digit baseline; gap gives the pill breathing room.
    heroValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
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
      backgroundColor: color.surface,
      minHeight: 32,
      minWidth: 44,
      justifyContent: 'center',
      ...shadow.e1,
    },
    tierPillPressed: {
      backgroundColor: color.brandSofter,
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
      ...shadow.e3,
    },
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
      width: 32,
      height: 32,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tierCloseBtnText: {
      fontSize: 16,
      color: color.text,
      fontWeight: '600',
      lineHeight: 18,
    },
    tierIntro: { fontSize: 13, color: color.text, lineHeight: 19 },
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: color.brandSofter,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 56,
      borderLeftWidth: 3,
      borderLeftColor: color.brand,
    },
    nearestBtnPressed: {
      backgroundColor: color.brandSoft,
      opacity: 0.9,
    },
    nearestBtnIcon: { fontSize: 22 },
    nearestBtnTextWrap: { flex: 1, gap: 2 },
    nearestBtnTitle: { fontSize: 15, fontWeight: '700', color: color.brandText },
    nearestBtnSubtitle: { fontSize: 12, color: color.brandText, opacity: 0.85 },
    nearestBtnChevron: {
      fontSize: 22,
      color: color.brand,
      paddingHorizontal: 4,
      fontWeight: '700',
    },
    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: {
      flex: 1,
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: 16,
      alignItems: 'center',
      ...shadow.e1,
    },
    statValue: {
      fontSize: 28,
      fontWeight: '700',
      color: color.textStrong,
      letterSpacing: -0.5,
    },
    statLabel: {
      fontSize: 11,
      color: color.textMuted,
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
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      alignItems: 'center',
      gap: 2,
    },
    // Zero-count pills fade so the eye lands on what's actually there.
    statusPillDimmed: { opacity: 0.55 },
    statusPillCount: { fontSize: 18, fontWeight: '700' },
    statusPillLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    myReportsBtn: {
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      ...shadow.e1,
      minHeight: 64,
    },
    myReportsBtnPressed: { opacity: 0.85, backgroundColor: color.surfaceMuted },
    myReportsTextWrap: { flex: 1, gap: 2 },
    myReportsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: color.textStrong,
      letterSpacing: -0.1,
    },
    // Inline "· X / N" count next to the Achievements title — muted so the
    // main title still reads as the link affordance.
    achievementsCount: { fontWeight: '600', color: color.textSubtle, fontSize: 14 },
    myReportsSubtitle: { fontSize: 13, color: color.textMuted },
    myReportsChevron: { fontSize: 28, color: color.textSubtle, fontWeight: '300' },
    section: { gap: 8, marginTop: 8 },
    sectionLabel: {
      fontSize: 12,
      color: color.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: '700',
    },
    nameRow: { flexDirection: 'row', gap: 8 },
    nameInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: color.borderSubtle,
      backgroundColor: color.surface,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      minHeight: 44,
      color: color.text,
    },
    saveBtn: {
      backgroundColor: color.brand,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 72,
      minHeight: 44,
    },
    saveBtnDisabled: { opacity: 0.4 },
    saveBtnText: { color: color.textOnBrand, fontWeight: '700', fontSize: 14 },
    hint: { fontSize: 12, color: color.textMuted, lineHeight: 16 },
    tabRow: { flexDirection: 'row', gap: 8 },
    tabPill: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    tabPillSelected: { backgroundColor: color.brand },
    tabPillText: { color: color.text, fontWeight: '600', fontSize: 14 },
    tabPillTextSelected: { color: color.textOnBrand },
    linkBtn: {
      backgroundColor: color.surfaceNeutral,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      minHeight: 44,
      justifyContent: 'center',
    },
    linkBtnText: { color: color.brand, fontWeight: '600', fontSize: 14 },
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
    toggleHint: { fontSize: 12, color: color.textMuted },
    aboutRow: {
      marginTop: 16,
      backgroundColor: color.surface,
      borderRadius: radius.lg,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      ...shadow.e1,
      minHeight: 64,
    },
    aboutRowPressed: { opacity: 0.85, backgroundColor: color.surfaceMuted },
    aboutTextWrap: { flex: 1, gap: 2 },
    aboutTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: color.textStrong,
      letterSpacing: -0.1,
    },
    aboutSubtitle: { fontSize: 13, color: color.textMuted },
    aboutChevron: { fontSize: 28, color: color.textSubtle, fontWeight: '300' },
    signOutBtn: {
      marginTop: 16,
      alignSelf: 'center',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      minHeight: 44,
      justifyContent: 'center',
    },
    signOutText: { color: color.text, fontWeight: '600' },
  });
