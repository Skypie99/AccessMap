import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  getUserLeaderboardRank,
  listLeaderboard,
  type LeaderboardEntry,
} from '@/lib/flags';
import { font, radius, shadow } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function ordinalLabel(rank: number): string {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

function AvatarCircle({
  uri,
  initials,
  size,
  color,
}: {
  uri: string | null;
  initials: string;
  size: number;
  color: ColorTheme;
}) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        circle: {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color.brandSoft,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        img: { width: size, height: size },
        initials: {
          fontSize: size * 0.38,
          fontWeight: '700',
          color: color.brandOnSoft,
        },
      }),
    [size, color],
  );

  return (
    <View style={styles.circle}>
      {uri ? (
        <Image source={{ uri }} style={styles.img} accessibilityElementsHidden />
      ) : (
        <Text style={styles.initials} accessibilityElementsHidden>
          {initials}
        </Text>
      )}
    </View>
  );
}

interface UserFooter {
  rank: number;
  points: number;
}

export default function LeaderboardScreen({ visible, onClose }: Props) {
  const color = useColor();
  const styles = useMemo(() => makeStyles(color), [color]);
  const { user } = useAuth();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // When the current user is outside the top 20, show their rank in a footer.
  const [userFooter, setUserFooter] = useState<UserFooter | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setUserFooter(null);
    try {
      const data = await listLeaderboard(20);
      setEntries(data);

      // Check if current user is in the list.
      if (user && !data.some((e) => e.id === user.id)) {
        const myRank = await getUserLeaderboardRank(user.id);
        setUserFooter(myRank);
      }
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const renderItem = useCallback(
    ({ item, index }: { item: LeaderboardEntry; index: number }) => {
      const rank = index + 1;
      const isCurrentUser = item.id === user?.id;
      const name = item.display_name ?? 'Member';
      const initials = name.slice(0, 2).toUpperCase();
      // W6-1: no verified-flag count here — exposing verifier activity publicly
      // would let users single out moderators. See LeaderboardEntry in flags.ts.
      const a11yLabel = [
        ordinalLabel(rank),
        name,
        `${item.points.toLocaleString()} points`,
        isCurrentUser ? 'you' : null,
      ]
        .filter(Boolean)
        .join(', ');

      return (
        <View
          style={[styles.row, isCurrentUser && styles.rowHighlight]}
          role="listitem"
          accessibilityLabel={a11yLabel}
        >
          <Text
            style={[styles.rank, rank <= 3 && styles.rankTop]}
            accessibilityElementsHidden
          >
            {ordinalLabel(rank)}
          </Text>
          <AvatarCircle uri={item.avatar_url} initials={initials} size={34} color={color} />
          <View style={styles.nameWrap}>
            <Text
              style={[styles.name, isCurrentUser && styles.nameSelf]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {isCurrentUser ? (
              <Text style={styles.youBadge} accessibilityElementsHidden>
                you
              </Text>
            ) : null}
          </View>
          <Text style={styles.points}>{item.points.toLocaleString()} pts</Text>
        </View>
      );
    },
    [user?.id, styles, color],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close leaderboard"
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              hitSlop={8}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
            <Text style={styles.title} accessibilityRole="header">
              Leaderboard
            </Text>
            {/* spacer keeps title centered */}
            <View style={styles.closeBtnSpacer} />
          </View>
          <Text style={styles.subtitle}>Top 20 contributors by points</Text>

          {loading ? (
            <ActivityIndicator
              style={styles.spinner}
              accessibilityLabel="Loading leaderboard"
              accessibilityLiveRegion="polite"
            />
          ) : loadError ? (
            <View
              style={styles.stateWrap}
              accessibilityLiveRegion="polite"
              accessible
              accessibilityLabel={`Could not load leaderboard. ${loadError}`}
            >
              <Text style={styles.stateText}>{loadError}</Text>
              <Pressable
                onPress={() => void load()}
                style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Retry loading leaderboard"
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.stateWrap}>
              <Text style={styles.stateText}>No contributors yet. Be the first!</Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(e) => e.id}
              renderItem={renderItem}
              style={styles.list}
              accessibilityRole="list"
              removeClippedSubviews
              initialNumToRender={20}
            />
          )}

          {/* Current user's rank when they're outside the top 20 */}
          {userFooter && !loading && !loadError ? (
            <View
              style={styles.footer}
              accessible
              accessibilityLabel={`Your rank: ${ordinalLabel(userFooter.rank)}, ${userFooter.points.toLocaleString()} points`}
            >
              <Text style={styles.footerText} accessibilityElementsHidden>
                Your rank:{' '}
                <Text style={styles.footerRank}>{ordinalLabel(userFooter.rank)}</Text>
                {'  ·  '}
                {userFooter.points.toLocaleString()} pts
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(color: ColorTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: color.scrim,
      justifyContent: 'flex-end',
    },
    card: {
      backgroundColor: color.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingBottom: 24,
      maxHeight: '90%' as unknown as number,
      ...shadow.e2,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 4,
    },
    title: {
      flex: 1,
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: font.size.sm,
      color: color.textMuted,
      paddingHorizontal: 20,
      paddingBottom: 12,
      textAlign: 'center',
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnPressed: { backgroundColor: color.borderPressed },
    closeBtnText: { fontSize: 14, color: color.textMuted },
    closeBtnSpacer: { width: 36 },
    list: { flexGrow: 0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.divider,
      minHeight: 54,
      gap: 10,
    },
    rowHighlight: { backgroundColor: color.brandSofter },
    rank: {
      width: 40,
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.textMuted,
    },
    rankTop: { color: color.brand, fontWeight: font.weight.bold },
    nameWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 5,
    },
    name: {
      fontSize: font.size.base,
      color: color.text,
      flexShrink: 1,
    },
    nameSelf: { fontWeight: font.weight.semibold, color: color.brandText },
    youBadge: {
      fontSize: 11,
      color: color.brandOnSoft,
      backgroundColor: color.brandSoft,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.full,
      overflow: 'hidden',
    },
    points: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
      minWidth: 60,
      textAlign: 'right',
    },
    spinner: { marginVertical: 40 },
    stateWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
    stateText: { fontSize: font.size.sm, color: color.textMuted, textAlign: 'center' },
    retryBtn: {
      marginTop: 16,
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: color.brand,
      borderRadius: radius.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryBtnPressed: { opacity: 0.8 },
    retryText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.textOnBrand,
    },
    footer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color.divider,
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: color.brandSofter,
    },
    footerText: {
      fontSize: font.size.sm,
      color: color.text,
      textAlign: 'center',
    },
    footerRank: {
      fontWeight: font.weight.bold,
      color: color.brand,
    },
  });
}
