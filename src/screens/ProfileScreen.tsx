import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { signOut, supabase } from '@/lib/supabase';
import { updateUserProfile } from '@/lib/users';
import {
  DEFAULT_TABS,
  getDefaultTab,
  setDefaultTab,
  type DefaultTab,
} from '@/lib/preferences';
import { clearOnboardingSeen } from '@/lib/onboarding';
import type { FlagRow, UserRow } from '@/types/database';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import MyReportsModal from '@/components/MyReportsModal';
import FlagDetailModal, {
  type DetailAction,
} from '@/components/FlagDetailModal';
import AboutModal from '@/components/AboutModal';
import MyFeedbackModal from '@/components/MyFeedbackModal';

interface Stats {
  reported: number;
  resolved: number;
}

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
  const prevAt =
    [...MILESTONES].reverse().find((m) => m.at <= points)?.at ?? 0;
  const span = next.at - prevAt;
  const progress = span === 0 ? 0 : (points - prevAt) / span;
  return { next: next.at, label: next.label, progress };
}

export default function ProfileScreen() {
  const navigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList, 'Profile'>>();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [stats, setStats] = useState<Stats>({ reported: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  // My Reports modal lives at this level so its FlagDetailModal sibling can
  // render on top without nesting Modals — nested transparent Modals are
  // platform-flaky (mostly on Android). When a row is tapped we hide the
  // list modal, open the detail modal, and re-show the list on close.
  const [reportsOpen, setReportsOpen] = useState(false);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
  const [selectedFlag, setSelectedFlag] = useState<FlagRow | null>(null);

  // About modal — opened from the "About AccessMap" row near the bottom.
  // Self-contained: it links straight to the mail composer for the
  // "Send feedback" CTA so we don't have to coordinate two open modals.
  const [aboutOpen, setAboutOpen] = useState(false);

  // My Feedback modal — opened from the "My Feedback" row. Renders an
  // empty state when the migration hasn't been applied or the user
  // hasn't sent anything yet, so it's safe to open in any state.
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Edit-name state. nameDraft is what the user is typing; profile?.display_name
  // is the persisted value. A Save button fires only when they actually differ.
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Default-tab state. null until we've read the preference, so the segmented
  // control doesn't paint a wrong "selected" pill momentarily.
  const [defaultTab, setDefaultTabValue] = useState<DefaultTab | null>(null);
  const [savingTab, setSavingTab] = useState(false);

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
      const [{ data: profileRow, error: profileErr }, reported, resolved] =
        await Promise.all([
          supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
          supabase
            .from('flags')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('flags')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'resolved'),
        ]);

      if (profileErr) throw profileErr;
      if (!mountedRef.current) return;
      const row = (profileRow as UserRow | null) ?? null;
      setProfile(row);
      setNameDraft(row?.display_name ?? '');
      setStats({
        reported: reported.count ?? 0,
        resolved: resolved.count ?? 0,
      });
    } catch (e) {
      if (mountedRef.current) {
        Alert.alert('Could not load profile', errorMessage(e));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user]);

  // Refresh whenever Profile tab gains focus so freshly-earned points show up.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
  const nameChanged =
    trimmedDraft !== (profile?.display_name ?? '').trim() && !savingName;

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

  const handlePickTab = useCallback(
    async (tab: DefaultTab) => {
      if (!user || tab === defaultTab) return;
      setSavingTab(true);
      // Optimistic — show the new selection immediately, write to storage,
      // and rollback only if the write throws (it shouldn't, but defensive).
      setDefaultTabValue(tab);
      try {
        await setDefaultTab(user.id, tab);
        AccessibilityInfo.announceForAccessibility(
          `Default tab set to ${tab}.`,
        );
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

  const handleShowIntroAgain = useCallback(() => {
    if (!user) return;
    Alert.alert(
      'Show intro again?',
      'The 3-card introduction will appear the next time you sign in on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            await clearOnboardingSeen(user.id);
            AccessibilityInfo.announceForAccessibility(
              'Intro reset. You will see it again on next sign in.',
            );
          },
        },
      ],
    );
  }, [user]);

  const handleSelectFlag = (flag: FlagRow) => {
    // Hide the list modal first, then open the detail modal as a sibling.
    setReportsOpen(false);
    setSelectedFlag(flag);
  };

  const handleDetailClose = () => {
    setSelectedFlag(null);
    // Re-open the list and bump its refresh key so it refetches — the
    // user may have changed status or deleted the flag.
    setReportsRefreshKey((k) => k + 1);
    setReportsOpen(true);
  };

  const handleDetailChanged = (
    _updated: FlagRow,
    _action: DetailAction,
    _isOwn: boolean,
  ) => {
    // Triage from My Reports might bump the user's own points (reporter
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
    navigation.navigate('Map', {
      focusFlag: { id: flag.id, lat: flag.lat, lng: flag.lng },
      ts: Date.now(),
    });
  };

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
      </View>
    );
  }

  const points = profile?.points ?? 0;
  const { next: nextMilestone, label: milestoneLabel, progress } =
    milestoneProgress(points);
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

        <View
          style={styles.heroCard}
          accessible
          accessibilityLabel={`${points} points. ${
            nextMilestone === null
              ? 'You have reached the top milestone.'
              : `${nextMilestone - points} points to ${milestoneLabel}.`
          }`}
        >
          <Text style={styles.heroIcon} accessibilityElementsHidden>
            🏅
          </Text>
          <Text style={styles.heroLabel}>POINTS</Text>
          <Text style={styles.heroValue}>{points}</Text>
          {nextMilestone !== null ? (
            <>
              <View
                style={styles.progressTrack}
                accessibilityElementsHidden
              >
                <View
                  style={[styles.progressFill, { width: progressBarWidth }]}
                />
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

        <Pressable
          style={({ pressed }) => [
            styles.myReportsBtn,
            pressed && styles.myReportsBtnPressed,
          ]}
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
          style={({ pressed }) => [
            styles.myReportsBtn,
            pressed && styles.myReportsBtnPressed,
          ]}
          onPress={() => setFeedbackOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="My Feedback"
          accessibilityHint="Opens the list of feedback you've sent to the maintainer"
        >
          <View style={styles.myReportsTextWrap}>
            <Text style={styles.myReportsTitle}>My Feedback</Text>
            <Text style={styles.myReportsSubtitle}>
              View the feedback messages you've sent.
            </Text>
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
              style={[
                styles.saveBtn,
                !nameChanged && styles.saveBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Save display name"
              accessibilityState={{ disabled: !nameChanged, busy: savingName }}
            >
              {savingName ? (
                <ActivityIndicator color="#fff" />
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
                  style={[
                    styles.tabPill,
                    selected && styles.tabPillSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set default tab to ${tab}`}
                  accessibilityState={{
                    selected,
                    disabled: savingTab || defaultTab === null,
                  }}
                >
                  <Text
                    style={[
                      styles.tabPillText,
                      selected && styles.tabPillTextSelected,
                    ]}
                  >
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>
            The app opens to this tab when you sign in.
          </Text>
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
          style={({ pressed }) => [
            styles.aboutRow,
            pressed && styles.aboutRowPressed,
          ]}
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
          onPress={() => signOut()}
          accessibilityRole="button"
          accessibilityLabel="Sign out of your account"
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>

      <MyReportsModal
        visible={reportsOpen}
        onClose={() => setReportsOpen(false)}
        onSelectFlag={handleSelectFlag}
        refreshKey={reportsRefreshKey}
      />

      <FlagDetailModal
        visible={selectedFlag !== null}
        flag={selectedFlag}
        onClose={handleDetailClose}
        onChanged={handleDetailChanged}
        onDeleted={handleDetailDeleted}
        onViewOnMap={handleViewOnMap}
      />

      <AboutModal
        visible={aboutOpen}
        onClose={() => setAboutOpen(false)}
      />

      <MyFeedbackModal
        visible={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Screen wash — replaces the default white background so the white
  // cards inside (stats, My Reports, About row) actually read as cards
  // rather than blending into the surface they sit on.
  screen: { flex: 1, backgroundColor: '#f7f9fc' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f9fc',
  },
  container: { padding: 24, gap: 16, alignItems: 'stretch' },
  email: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, color: '#555' },
  heroCard: {
    backgroundColor: '#2f80ed',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 4,
    // Heavier drop shadow than the surrounding cards so the hero sits
    // forward and reads as the page's anchor.
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  heroIcon: { fontSize: 32, marginBottom: 4 },
  heroLabel: {
    color: '#dbe7fb',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
  },
  heroValue: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 60,
  },
  heroSubtitle: {
    color: '#dbe7fb',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 999,
  },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  statValue: { fontSize: 28, fontWeight: '700', color: '#222' },
  statLabel: { fontSize: 12, color: '#666', textTransform: 'uppercase' },
  myReportsBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    minHeight: 64,
  },
  myReportsBtnPressed: { opacity: 0.85, backgroundColor: '#f7f9fc' },
  myReportsTextWrap: { flex: 1, gap: 2 },
  myReportsTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  myReportsSubtitle: { fontSize: 13, color: '#666' },
  myReportsChevron: { fontSize: 28, color: '#999', fontWeight: '300' },
  section: { gap: 8, marginTop: 8 },
  sectionLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  nameRow: { flexDirection: 'row', gap: 8 },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dde2ea',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 44,
  },
  saveBtn: {
    backgroundColor: '#2f80ed',
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    minHeight: 44,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hint: { fontSize: 12, color: '#666' },
  tabRow: { flexDirection: 'row', gap: 8 },
  tabPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#eef1f5',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  tabPillSelected: { backgroundColor: '#2f80ed' },
  tabPillText: { color: '#333', fontWeight: '600', fontSize: 14 },
  tabPillTextSelected: { color: '#fff' },
  linkBtn: {
    backgroundColor: '#eef1f5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  linkBtnText: { color: '#2f80ed', fontWeight: '600', fontSize: 14 },
  aboutRow: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    minHeight: 64,
  },
  aboutRowPressed: { opacity: 0.85, backgroundColor: '#f7f9fc' },
  aboutTextWrap: { flex: 1, gap: 2 },
  aboutTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  aboutSubtitle: { fontSize: 13, color: '#666' },
  aboutChevron: { fontSize: 28, color: '#999', fontWeight: '300' },
  signOutBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#eef1f5',
    minHeight: 44,
    justifyContent: 'center',
  },
  signOutText: { color: '#333', fontWeight: '600' },
});
