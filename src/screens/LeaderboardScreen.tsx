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
import { a11yToggle, useReducedMotion } from '@/lib/accessibility';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  getUserLeaderboardRank,
  listLeaderboard,
  type LeaderboardEntry,
} from '@/lib/flags';
import { listMonthlyLeaderboard } from '@/lib/users';
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

// UX #8: which ranking the user is viewing. 'all' = existing all-time board
// (data source UNCHANGED); 'month' = this calendar month via the monthly RPC.
type LeaderboardTab = 'all' | 'month';

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
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();

  const [tab, setTab] = useState<LeaderboardTab>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // When the current user is outside the top 20, show their rank in a footer.
  // All-time only — the monthly RPC doesn't expose an out-of-top-20 rank lookup.
  const [userFooter, setUserFooter] = useState<UserFooter | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setUserFooter(null);
    try {
      // UX #8: monthly tab pulls from the RPC (which degrades to [] before the
      // migration is applied → friendly empty state); all-time tab is unchanged.
      if (tab === 'month') {
        const data = await listMonthlyLeaderboard(20);
        setEntries(data);
        return;
      }

      const data = await listLeaderboard(20);
      setEntries(data);

      // Check if current user is in the list. F26: the rank lookup is a
      // SEPARATE query that can fail on its own; wrap it so its failure only
      // drops the footer rather than clobbering loadError and hiding the
      // leaderboard we already loaded successfully.
      if (user && !data.some((e) => e.id === user.id)) {
        try {
          const myRank = await getUserLeaderboardRank(user.id);
          setUserFooter(myRank);
        } catch {
          setUserFooter(null);
        }
      }
    } catch (e) {
      setLoadError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user, tab]);

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
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.headerRow}>
            <AppText
              variant="heading"
              style={styles.title}
              accessibilityRole="header"
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.8}
            >
              Leaderboard
            </AppText>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close leaderboard"
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              hitSlop={spacing.sm}
            >
              <X size={18} color={color.textMuted} strokeWidth={2.2} />
            </Pressable>
          </View>
          <AppText variant="body" style={styles.subtitle}>
            {tab === 'month'
              ? "Top 20 contributors this month"
              : 'Top 20 contributors by points'}
          </AppText>

          {/* UX #8: All-time / This Month segmented toggle. WCAG: each button is
              a button with selected state announced; the selected label carries
              weight + an underline so colour is never the sole signal. */}
          <View style={styles.segment} accessibilityRole="tablist">
            <Pressable
              onPress={() => setTab('all')}
              accessibilityRole="button"
              {...a11yToggle({ selected: tab === 'all' })}
              accessibilityLabel={`All-time ranking${tab === 'all' ? ', selected' : ''}`}
              style={({ pressed }) => [
                styles.segBtn,
                tab === 'all' && styles.segBtnActive,
                pressed && styles.segBtnPressed,
              ]}
            >
              <AppText
                variant="label"
                style={[styles.segLabel, tab === 'all' && styles.segLabelActive]}
              >
                All-time
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => setTab('month')}
              accessibilityRole="button"
              {...a11yToggle({ selected: tab === 'month' })}
              accessibilityLabel={`This month's ranking${tab === 'month' ? ', selected' : ''}`}
              style={({ pressed }) => [
                styles.segBtn,
                tab === 'month' && styles.segBtnActive,
                pressed && styles.segBtnPressed,
              ]}
            >
              <AppText
                variant="label"
                style={[styles.segLabel, tab === 'month' && styles.segLabelActive]}
              >
                This Month
              </AppText>
            </Pressable>
          </View>

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
              <AppText variant="body" style={styles.stateText}>Couldn&apos;t load the leaderboard.</AppText>
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
            // UX #8: monthly empty state also covers the "RPC not applied yet"
            // case — listMonthlyLeaderboard returns [] both when there's no
            // activity AND when the migration is pending, so one friendly
            // message serves both.
            <View style={styles.stateWrap}>
              <Trophy size={32} color={color.goldAccent} strokeWidth={2} />
              {tab === 'month' ? (
                <AppText variant="body" style={styles.stateText}>
                  No monthly ranking yet — points appear as people verify each other&apos;s reports.
                </AppText>
              ) : (
                <>
                  <AppText variant="body" style={styles.stateText}>No contributors yet.</AppText>
                  <AppText variant="body" style={styles.stateHint}>Be the first to report and verify flags!</AppText>
                </>
              )}
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

          {/* Current user's rank when they're outside the top 20 (all-time only) */}
          {tab === 'all' && userFooter && !loading && !loadError ? (
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
      // Editorial left-aligned big title (Phase 11 — was centered modal style).
      fontSize: font.size.h1,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      letterSpacing: font.tracking.h1,
    },
    subtitle: {
      fontSize: font.size.sm,
      color: color.textMuted,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
      textAlign: 'left',
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
    // UX #8: segmented All-time / This Month toggle.
    segment: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginHorizontal: spacing.xl,
      marginBottom: spacing.md,
      padding: 3, // hairline inset so active fill reads as a segment, not a button
      backgroundColor: color.surfaceNeutral,
      borderRadius: radius.md,
    },
    segBtn: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
    },
    segBtnActive: { backgroundColor: color.brand, ...shadow.e1 },
    segBtnPressed: { opacity: 0.85 },
    segLabel: {
      fontSize: font.size.sm,
      fontWeight: font.weight.medium,
      color: color.textMuted,
    },
    // Selected: brand fill + bolder weight + underline so the selection is
    // legible without relying on colour alone (WCAG 1.4.1).
    segLabelActive: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      textDecorationLine: 'underline',
    },
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
      // minWidth (not width) — mono "20th" at ×1.4 wraps in a hard 40pt box.
      minWidth: 40,
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
      // ≥ the pill's effective corner radius — 4pt let end glyphs shave
      // inside the radius.full curvature.
      paddingHorizontal: spacing.sm,
      paddingVertical: 2, // below tight(4) — pill needs less vertical height than text
      borderRadius: radius.full,
      overflow: 'hidden',
    },
    verifiedBadge: {
      fontSize: font.size.caption,
      color: color.textMuted,
      backgroundColor: color.surfaceNeutral,
      paddingHorizontal: spacing.sm,
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
