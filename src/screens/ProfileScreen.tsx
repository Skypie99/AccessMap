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

interface Stats {
  reported: number;
  resolved: number;
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

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.email}>{user.email}</Text>

        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>POINTS</Text>
          <Text style={styles.pointsValue}>{profile?.points ?? 0}</Text>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 24, gap: 16, alignItems: 'stretch' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  email: { fontSize: 14, color: '#555', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#555' },
  pointsCard: {
    backgroundColor: '#2f80ed',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  pointsLabel: { color: '#dbe7fb', fontSize: 12, letterSpacing: 1.5 },
  pointsValue: { color: '#fff', fontSize: 48, fontWeight: '800' },
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
