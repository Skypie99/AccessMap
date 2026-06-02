import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  getUserLeaderboardRank,
  listLeaderboard,
  type LeaderboardEntry,
} from '@/lib/flags';
import { font, radius, shadow, spacing } from '@/theme';
import { Trophy, X } from 'lucide-react-native';
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
      <RemoteImage
        uri={uri}
        style={styles.img}
        accessibilityElementsHidden
        fallback={
          <AppText variant="label" style={styles.initials} accessibilityElementsHidden>
            {initials}
          </AppText>
        }
      />
    </View>
  );
}

const AVATAR_SIZE = 34;

function SkeletonRow() {
  // Built on the shared Skeleton primitive so it gets the shimmer pulse +
  // reduced-motion handling, while keeping the leaderboard row's shape.
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm + 2,
        gap: spacing.md,
        minHeight: 54,
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Skeleton width={40} height={font.size.sm} />
      <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} borderRadius={AVATAR_SIZE / 2} />
      <Skeleton width={120} height={font.size.sm} style={{ flex: 1 }} />
      <Skeleton width={50} height={font.size.sm} />
    </View>
  );
}

interface UserFooter {
  rank: number;
  points: number;
}

interface LeaderboardRowProps {
  rank: number;
  displayName: string | null;
  avatarUrl: string | null;
  points: number;
  verifiedCount: number;
  isCurrentUser: boolean;
  styles: ReturnType<typeof makeStyles>;
  color: ColorTheme;
}

// Extracted so React.memo can skip re-renders when the same leaderboard data
// comes back from a refresh. listLeaderboard constructs new entry objects each
// call, so without extraction every row re-renders even when data is unchanged.
// Scalar props + stable styles/color refs → default shallow comparison works.
const LeaderboardRow = React.memo(function LeaderboardRow({
  rank,
  displayName,
  avatarUrl,
  points,
  verifiedCount,
  isCurrentUser,
  styles,
  color,
}: LeaderboardRowProps) {
  const name = displayName ?? 'Member';
  const initials = name.slice(0, 2).toUpperCase();
  const a11yLabel = [
    ordinalLabel(rank),
    name,
    `${points.toLocaleString()} points`,
    verifiedCount > 0 ? `${verifiedCount} verified` : null,
    isCurrentUser ? 'you' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      style={[
        styles.row,
        rank === 1 && { backgroundColor: color.tierGoldBg },
        rank === 2 && { backgroundColor: color.tierSilverBg },
        rank === 3 && { backgroundColor: color.tierBronzeBg },
        isCurrentUser && styles.rowHighlight,
      ]}
      accessible
      role="listitem"
      accessibilityLabel={a11yLabel}
    >
      <AppText
        variant="mono"
        style={[styles.rank, rank <= 3 && styles.rankTop]}
        accessibilityElementsHidden
      >
        {ordinalLabel(rank)}
      </AppText>
      <AvatarCircle uri={avatarUrl} initials={initials} size={AVATAR_SIZE} color={color} />
      <View style={styles.nameWrap}>
        <AppText
          variant="body"
          style={[styles.name, isCurrentUser && styles.nameSelf]}
          numberOfLines={1}
        >
          {name}
        </AppText>
        {isCurrentUser ? (
          <AppText variant="label" style={styles.youBadge} accessibilityElementsHidden>
            you
          </AppText>
        ) : null}
        {verifiedCount > 0 ? (
          <AppText variant="label" style={styles.verifiedBadge} accessibilityElementsHidden>
            {verifiedCount} verified
          </AppText>
        ) : null}
      </View>
      <AppText variant="mono" style={styles.points}>{points.toLocaleString()} pts</AppText>
    </View>
  );
});

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
    ({ item, index }: { item: LeaderboardEntry; index: number }) => (
      // W6-1: pass verifiedCount=0 — exposing verifier activity publicly
      // would let users single out moderators. See LeaderboardEntry in flags.ts.
      <LeaderboardRow
        rank={index + 1}
        displayName={item.display_name}
        avatarUrl={item.avatar_url}
        points={item.points}
        verifiedCount={0}
        isCurrentUser={item.id === user?.id}
        styles={styles}
        color={color}
      />
    ),
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
              hitSlop={spacing.sm}
            >
              <X size={18} color={color.textMuted} strokeWidth={2.2} />
            </Pressable>
            <AppText variant="heading" style={styles.title} accessibilityRole="header">
              Leaderboard
            </AppText>
            {/* spacer keeps title centered */}
            <View style={styles.closeBtnSpacer} />
          </View>
          <AppText variant="body" style={styles.subtitle}>Top 20 contributors by points</AppText>

          {loading ? (
            <View accessibilityLabel="Loading leaderboard" accessibilityLiveRegion="polite">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </View>
          ) : loadError ? (
            <View
              style={styles.stateWrap}
              accessibilityLiveRegion="polite"
              accessible
              accessibilityLabel={`Couldn't load the leaderboard. ${loadError}`}
            >
              <AppText variant="body" style={styles.stateText}>Couldn't load the leaderboard.</AppText>
              <AppText variant="body" style={styles.stateHint}>{loadError}</AppText>
              <Pressable
                onPress={() => void load()}
                style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Retry loading leaderboard"
              >
                <AppText variant="label" style={styles.retryText}>Try again</AppText>
              </Pressable>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.stateWrap}>
              <Trophy size={32} color={color.goldAccent} strokeWidth={2} />
              <AppText variant="body" style={styles.stateText}>No contributors yet.</AppText>
              <AppText variant="body" style={styles.stateHint}>Be the first to report and verify flags!</AppText>
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
              <AppText variant="mono" style={styles.footerText} accessibilityElementsHidden>
                Your rank:{' '}
                <AppText variant="monoBold" style={styles.footerRank}>{ordinalLabel(userFooter.rank)}</AppText>
                {'  ·  '}
                {userFooter.points.toLocaleString()} pts
              </AppText>
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
      paddingBottom: spacing.xxl,
      maxHeight: '90%' as unknown as number,
      ...shadow.e2,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.tight,
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
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
      textAlign: 'center',
    },
    closeBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.circle,
      backgroundColor: color.surfaceNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnPressed: { backgroundColor: color.borderPressed },
    closeBtnText: { fontSize: font.size.base, color: color.textMuted },
    closeBtnSpacer: { width: 44 },
    list: { flexGrow: 0 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: 10, // intentional: between sm(8) and md(12) for list density
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: color.divider,
      minHeight: 54,
      gap: 10, // matches paddingVertical — intentional off-grid for density
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
      gap: 5, // compact badge gap — intentional between tight(4) and xs(6)
    },
    name: {
      fontSize: font.size.base,
      color: color.text,
      flexShrink: 1,
    },
    nameSelf: { fontWeight: font.weight.semibold, color: color.brandText },
    youBadge: {
      fontSize: font.size.caption,
      color: color.brandOnSoft,
      backgroundColor: color.brandSoft,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2, // below tight(4) — pill needs less vertical height than text
      borderRadius: radius.full,
      overflow: 'hidden',
    },
    verifiedBadge: {
      fontSize: font.size.caption,
      color: color.textMuted,
      backgroundColor: color.surfaceNeutral,
      paddingHorizontal: spacing.xs,
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
    stateWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: spacing.xl },
    stateIcon: { fontSize: 40, marginBottom: spacing.sm },
    stateText: { fontSize: font.size.sm, color: color.textMuted, textAlign: 'center' },
    stateHint: {
      fontSize: font.size.xs,
      color: color.textSubtle,
      textAlign: 'center',
      marginTop: spacing.tight,
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
    retryBtnPressed: { opacity: 0.8 },
    retryText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: color.textOnBrand,
    },
    footer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: color.divider,
      paddingHorizontal: spacing.xl,
      paddingVertical: 14, // intentional: between md(12) and lg(16) for footer comfort
      backgroundColor: color.brandSofter,
    },
    footerText: {
      fontSize: font.size.sm,
      color: color.text,
      textAlign: 'center',
    },
    footerRank: {
      fontWeight: font.weight.bold,
      color: color.brandText,
    },
  });
}
