import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '@/lib/auth';
import { signOut, supabase } from '@/lib/supabase';
import type { FlagRow, UserRow } from '@/types/database';
import type { RootTabParamList } from '@/navigation/RootNavigator';
import MyReportsModal from '@/components/MyReportsModal';
import FlagDetailModal, {
  type DetailAction,
} from '@/components/FlagDetailModal';

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
      setProfile((profileRow as UserRow | null) ?? null);
      setStats({
        reported: reported.count ?? 0,
        resolved: resolved.count ?? 0,
      });
    } catch (e: any) {
      if (mountedRef.current) {
        Alert.alert('Could not load profile', e?.message ?? 'Unknown error.');
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
          <Text style={styles.pointsLabel}>Points</Text>
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
  signOutBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#eef1f5',
  },
  signOutText: { color: '#333', fontWeight: '600' },
});
