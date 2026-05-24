/**
 * AchievementsModal — full catalog of achievements with earned + unearned
 * states. Earned badges render in full color; unearned ones are dimmed
 * with a "X / N" progress chip so the user can see how close they are.
 *
 * Pure presentation: the parent passes the computed Achievement[] list
 * (from `computeAchievements(stats)`) so the modal never re-runs
 * derivation on its own. That keeps the heavy lifting in Profile, which
 * already has the data.
 */
import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  Achievement,
  AchievementCategory,
} from '@/lib/achievements';

interface Props {
  visible: boolean;
  onClose: () => void;
  achievements: Achievement[];
}

const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  reporting: 'Reporting',
  resolution: 'Resolution',
  points: 'Points',
  streak: 'Streak',
};

const CATEGORY_ORDER: AchievementCategory[] = [
  'reporting',
  'resolution',
  'points',
  'streak',
];

export default function AchievementsModal({
  visible,
  onClose,
  achievements,
}: Props) {
  // Group by category preserving catalog order within each group.
  const grouped = useMemo(() => {
    const map = new Map<AchievementCategory, Achievement[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const a of achievements) {
      map.get(a.category)?.push(a);
    }
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      items: map.get(cat) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [achievements]);

  const totalEarned = achievements.filter((a) => a.earned).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.title} accessibilityRole="header">
                Achievements
              </Text>
              <Text
                style={styles.subtitle}
                accessibilityLabel={`${totalEarned} of ${achievements.length} achievements earned`}
              >
                {totalEarned} of {achievements.length} earned
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close achievements"
            >
              <Text
                style={styles.closeBtnText}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                ✕
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {grouped.map(({ cat, items }) => (
              <View key={cat} style={styles.section}>
                <Text style={styles.sectionHeader}>
                  {CATEGORY_LABEL[cat]}
                </Text>
                <View style={styles.list}>
                  {items.map((a) => (
                    <AchievementRow key={a.id} achievement={a} />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function AchievementRow({ achievement: a }: { achievement: Achievement }) {
  const stateText = a.earned ? 'Earned' : `${a.progress} of ${a.threshold}`;
  const a11yLabel =
    `${a.title}, ${a.description} ` +
    (a.earned
      ? 'Earned.'
      : `Progress: ${a.progress} of ${a.threshold}.`);

  return (
    <View
      style={[styles.row, !a.earned && styles.rowDimmed]}
      // QA A2: accessibilityLabel alone on a non-touchable View doesn't
      // collapse children into one node — VoiceOver reads each Text
      // separately and the carefully-composed label is dropped. Setting
      // accessible={true} groups them into a single announcement.
      accessible={true}
      accessibilityLabel={a11yLabel}
    >
      <View style={[styles.iconCircle, a.earned ? styles.iconCircleEarned : styles.iconCircleLocked]}>
        <Text
          style={[styles.icon, !a.earned && styles.iconDimmed]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {a.icon}
        </Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{a.title}</Text>
        <Text style={styles.rowDesc}>{a.description}</Text>
      </View>
      <View style={[styles.statePill, a.earned ? styles.statePillEarned : styles.statePillLocked]}>
        <Text style={[styles.stateText, a.earned ? styles.stateTextEarned : styles.stateTextLocked]}>
          {stateText}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#f7f8fa',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
    height: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleWrap: { flex: 1, gap: 2 },
  title: { fontSize: 20, fontWeight: '700', color: '#222' },
  subtitle: { fontSize: 13, color: '#666' },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef1f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 18, color: '#333', fontWeight: '700' },
  scroll: { paddingBottom: 12, gap: 16 },
  section: { gap: 8 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eef1f5',
    minHeight: 56,
  },
  rowDimmed: { opacity: 0.7 },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleEarned: { backgroundColor: '#fff3d1' },
  iconCircleLocked: { backgroundColor: '#eef1f5' },
  icon: { fontSize: 22 },
  iconDimmed: { opacity: 0.55 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  rowDesc: { fontSize: 13, color: '#666' },
  statePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 64,
    alignItems: 'center',
  },
  statePillEarned: { backgroundColor: '#d4edda' },
  statePillLocked: { backgroundColor: '#eef1f5' },
  stateText: { fontSize: 11, fontWeight: '700' },
  stateTextEarned: { color: '#155724' },
  stateTextLocked: { color: '#555' },
});
