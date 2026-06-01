import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { listLeaderboard, type LeaderboardEntry } from '@/lib/flags';
import { getTier } from '@/lib/reputationTier';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { font, radius, shadow, spacing } from '@/theme';

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

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardModal({ visible, onClose }: Props) {
  const color = useColor();
  const styles = useMemo(() => makeStyles(color), [color]);
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listLeaderboard(10);
      setEntries(data);
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  const renderItem = useCallback(
    ({ item, index }: { item: LeaderboardEntry; index: number }) => {
      const rank = index + 1;
      const isCurrentUser = item.id === user?.id;
      const name = item.display_name ?? 'Member';
      const tier = getTier(item.points);
      // WCAG 1.3.1: rank 1-3 receive a visually distinct treatment (colour
      // highlight) that implies Gold / Silver / Bronze. Include the medal
      // name in the accessible label so AT users who can't see the colour
      // treatment still understand that top-3 positions are special.
      const medalPrefix =
        rank === 1 ? 'Gold medal, 1st place' :
        rank === 2 ? 'Silver medal, 2nd place' :
        rank === 3 ? 'Bronze medal, 3rd place' :
        ordinalLabel(rank);
      return (
        <View
          style={[
            styles.row,
            rank === 1 && styles.rowTop1,
            rank === 2 && styles.rowTop2,
            rank === 3 && styles.rowTop3,
            isCurrentUser && styles.rowHighlight,
          ]}
          accessible
          role="listitem"
          accessibilityLabel={`${medalPrefix}, ${tier.label} tier, ${name}, ${item.points} points${isCurrentUser ? ', you' : ''}`}
        >
          <Text style={[styles.rank, rank <= 3 && styles.rankTop]} accessibilityElementsHidden>
            {MEDAL[rank] ?? ordinalLabel(rank)}
          </Text>
          <View style={styles.nameWrap}>
            <Text
              style={styles.tierEmoji}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {tier.emoji}
            </Text>
            <Text style={[styles.name, isCurrentUser && styles.nameSelf]} numberOfLines={1}>
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
    [user?.id, styles],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <Text style={styles.titleIcon} accessibilityElementsHidden>🏆</Text>
            <Text style={styles.title} accessibilityRole="header">
              Community Leaderboard
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close leaderboard"
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              hitSlop={8}
            >
              <Text style={styles.closeBtnText} accessibilityElementsHidden>
                ✕
              </Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Top 10 contributors by points</Text>

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
              <Text style={styles.stateText} accessibilityRole="text">No contributors yet — be the first to report a barrier!</Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(e) => e.id}
              renderItem={renderItem}
              style={styles.list}
              accessibilityRole="list"
              removeClippedSubviews
              initialNumToRender={10}
            />
          )}
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
      paddingBottom: spacing.xxxl,
      maxHeight: '80%' as unknown as number,
      ...shadow.e3,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.tight,
    },
    titleIcon: {
      fontSize: font.size.xl,
    },
    title: {
      flex: 1,
      fontSize: font.size.xl,
      fontWeight: font.weight.bold,
      color: color.textStrong,
    },
    subtitle: {
      fontSize: font.size.sm,
      color: color.textMuted,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnPressed: {
      backgroundColor: color.borderPressed,
    },
    closeBtnText: {
      fontSize: font.size.base,
      color: color.textMuted,
    },
    list: {
      flexGrow: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.divider,
      minHeight: 48,
    },
    rowHighlight: {
      backgroundColor: color.brandSofter,
    },
    // Podium tints — subtle background + shadow.e2 elevation for ranks 1–3.
    // isCurrentUser rowHighlight sits after these in the style array and wins
    // on background when the viewer IS the top-ranked user.
    rowTop1: { backgroundColor: color.tierGoldBg, ...shadow.e2 },
    rowTop2: { backgroundColor: color.tierSilverBg, ...shadow.e2 },
    rowTop3: { backgroundColor: color.tierBronzeBg, ...shadow.e2 },
    rank: {
      width: 44,
      fontSize: font.size.md,
      fontWeight: font.weight.semibold,
      color: color.textMuted,
    },
    rankTop: {
      // WCAG 1.4.3: brand (#2f80ed) = 3.3:1 on white, fails AA at 13pt; brandText (#1c4f99) = 7.6:1 ✓
      color: color.brandText,
      fontWeight: font.weight.bold,
      fontSize: font.size.xl, // 18 vs base md (15) — premium scale for top-3 medals
    },
    nameWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    tierEmoji: {
      fontSize: font.size.base,
    },
    name: {
      fontSize: font.size.md,
      color: color.text,
      flexShrink: 1,
    },
    nameSelf: {
      fontWeight: font.weight.semibold,
      color: color.brandText,
    },
    youBadge: {
      fontSize: font.size.caption,
      color: color.brandOnSoft,
      backgroundColor: color.brandSoft,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radius.full,
      overflow: 'hidden',
    },
    points: {
      fontSize: font.size.base,
      fontWeight: font.weight.semibold,
      color: color.textStrong,
      minWidth: 64,
      textAlign: 'right',
    },
    spinner: {
      marginVertical: spacing.xxxl,
    },
    stateWrap: {
      alignItems: 'center',
      paddingVertical: spacing.xxxl,
      paddingHorizontal: spacing.xl,
    },
    stateText: {
      fontSize: font.size.base,
      color: color.textMuted,
      textAlign: 'center',
    },
    retryBtn: {
      marginTop: spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingVertical: 10,
      backgroundColor: color.brand,
      borderRadius: radius.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryBtnPressed: {
      opacity: 0.8,
    },
    retryText: {
      fontSize: font.size.base,
      fontWeight: font.weight.semibold,
      color: color.textOnBrand,
    },
  });
}
