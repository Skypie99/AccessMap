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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/lib/auth';
import { signOut, supabase } from '@/lib/supabase';
import type { UserRow } from '@/types/database';

interface Stats {
  reported: number;
  resolved: number;
}

export default function ProfileScreen() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [stats, setStats] = useState<Stats>({ reported: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

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
        style={styles.signOutBtn}
        onPress={() => signOut()}
        accessibilityRole="button"
        accessibilityLabel="Sign out of your account"
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
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
