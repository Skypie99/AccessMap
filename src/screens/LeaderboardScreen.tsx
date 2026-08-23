import React, { useCallback, useEffect, useMemo, useState , useRef} from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AppText } from '@/components/ui/AppText';
import { Skeleton } from '@/components/ui/Skeleton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { useAtTop } from '@/components/ui/SheetPull';
import { decorativeProps } from '@/lib/accessibility';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  getUserLeaderboardRank,
  listLeaderboard,
  type LeaderboardEntry,
} from '@/lib/flags';
import { getInitials, listMonthlyLeaderboard } from '@/lib/users';
import { font, radius, spacing } from '@/theme';
import { Trophy, User } from 'lucide-react-native';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function ordinalLabel(rank: number): string {
  // English ordinals follow the last digit (21st, 22nd, 23rd) EXCEPT the
  // teens, which are always -th (11th, 12th, 13th). The old early-returns
  // produced "21th"/"22th"/"23th" for every rank past 20 — visible in the
  // your-rank footer and spoken by its accessibilityLabel.
  const lastTwo = rank % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${rank}th`;
  switch (rank % 10) {
    case 1:
      return `${rank}st`;
    case 2:
      return `${rank}nd`;
    case 3:
      return `${rank}rd`;
    default:
      return `${rank}th`;
  }
}

/**
 * SW-44: `initials` is nullable ON PURPOSE. An anonymized contributor has no
 * name to take initials from, and inventing some from the placeholder word is
 * what produced a wall of "ME" badges. Null means "draw a person, not letters".
 */
function AvatarCircle({
  uri,
  initials,
  size,
  color,
}: {
  uri: string | null;
  initials: string | null;
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
          fontWeight: font.weight.bold,
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
        fallback={
          initials ? (
            <AppText variant="label" style={styles.initials} {...decorativeProps}>
              {initials}
            </AppText>
          ) : (
            // Matches RemoteImage's own icon fallback idiom: a lucide glyph
            // sized against its container and tinted from the theme.
            <User
              size={size * 0.5}
              color={color.brandOnSoft}
              strokeWidth={2.2}
              {...decorativeProps}
            />
          )
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
      }} {...decorativeProps}
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
  // SW-44. This used to be `name.slice(0, 2).toUpperCase()` on the line above,
  // which turns the privacy placeholder 'Member' into the monogram "ME" —
  // so 1st, 3rd and 4th place all wore a badge reading "me" while the row that
  // actually WAS the signed-in user wore "JA". The one monogram meaning "me"
  // appeared everywhere the user wasn't.
  //
  // The 'Member' label itself is correct and privacy-preserving; only the
  // derived letters were wrong. No name, no initials — draw a person instead.
  //
  // Named users go through getInitials(), which ProfileScreen already uses and
  // which is tested: it handles multi-word names, emails, and (F59) emoji,
  // where a raw two-code-unit slice cuts a surrogate pair in half.
  const initials = displayName ? getInitials(displayName) : null;
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
        style={[styles.rank, rank <= 3 && styles.rankTop]} {...decorativeProps}
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
          <AppText variant="label" style={styles.youBadge} {...decorativeProps}>
            you
          </AppText>
        ) : null}
        {verifiedCount > 0 ? (
          <AppText variant="label" style={styles.verifiedBadge} {...decorativeProps}>
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
  // The pull gesture must not fight the body's own scroll: `useAtTop`
  // disables it whenever the content is scrolled away from its top, so a
  // downward drag scrolls back up instead of dismissing (SheetPull's `atTop`).
  const { atTop, onScroll, scrollEventThrottle } = useAtTop();
  const scrollRef = useRef(null);
  // SW-45: this sheet ran flush to the screen bottom while the tab bar sits at
  // 861-914, so scrolled rows painted straight over a ghosted "Home / Tasks /
  // Profile" — the red Tasks badge showed through behind the 4th-place row's
  // text. Its four sibling sheets (Achievements, Activity, My Reports, Watched)
  // all stop above the bar, so this was an inconsistency inside one family
  // rather than a house style. Sky's call, 2026-08-20: every sheet CLEARS the
  // tab bar. Read the height the same non-throwing way this file reads insets —
  // useBottomTabBarHeight() throws with no navigator, and the render tests mount
  // this sheet standalone. The value already includes the bottom safe-area
  // inset, so it subsumes (rather than adds to) the home-indicator pad below.
  const tabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 0;
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
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Leaderboard"
      subtitle={tab === 'month' ? 'Top 20 contributors this month' : 'Top 20 contributors by points'}
      closeLabel="Close leaderboard"
      glass
      engineered
      shrinkStyle={styles.cap}
      cardStyle={styles.card}
      // SW-45: the sheet clears the tab bar. Folded into the primitive's
      // `Math.max(floor, insets.bottom)` rather than replacing it, so the home
      // indicator is still cleared on a device with no tab bar above it.
      minBottomPad={Math.max(spacing.xxl, tabBarHeight)}
      atTop={atTop}
      scrollRef={scrollRef}
      testID="leaderboardScreen-backdrop"
    >
      {/* UX #8: All-time / This Month. WCAG: each cell announces its state
          through a11yToggle ONLY — A11Y-220: the labels used to bake
          ", selected" in as well, so native VoiceOver spoke the state twice.
          A11Y-218: the group carries a name, because an unlabeled group is a
          landmark a screen reader announces as nothing.
          The control itself is now the shared primitive — this sheet's was the
          fourth hand-rolled drawing of one widget (C14). */}
      <SegmentedControl
        variant="track"
        surface="sheet"
        groupRole="tablist"
        groupLabel="Ranking period"
        style={styles.segment}
        cells={[
          {
            key: 'all',
            label: 'All-time',
            a11yLabel: 'All-time ranking',
            selected: tab === 'all',
            onPress: () => setTab('all'),
          },
          {
            key: 'month',
            label: 'This Month',
            a11yLabel: "This month's ranking",
            selected: tab === 'month',
            onPress: () => setTab('month'),
          },
        ]}
      />

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
                accessibilityLabel="Try again, load the leaderboard"
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
              <Trophy size={32} color={color.goldAccent} strokeWidth={2} {...decorativeProps} />
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
              ref={scrollRef}
              onScroll={onScroll}
              scrollEventThrottle={scrollEventThrottle}
              keyExtractor={(e) => e.id}
              renderItem={renderItem}
              style={styles.list}
              accessibilityRole="list"
              removeClippedSubviews
              initialNumToRender={20}
              // Pull-to-refresh: standings previously only reloaded on
              // close/reopen or a tab flip. `refreshing` stays false because
              // load() drives the full-screen skeleton state instead; the
              // spinner would double up with it.
              refreshControl={
                <RefreshControl refreshing={false} onRefresh={() => void load()} />
              }
            />
          )}

          {/* Current user's rank when they're outside the top 20 (all-time only) */}
          {tab === 'all' && userFooter && !loading && !loadError ? (
            <View
              style={styles.footer}
              accessible
              accessibilityLabel={`Your rank: ${ordinalLabel(userFooter.rank)}, ${userFooter.points.toLocaleString()} points`}
            >
              <AppText variant="mono" style={styles.footerText} {...decorativeProps}>
                Your rank:{' '}
                <AppText variant="monoBold" style={styles.footerRank}>{ordinalLabel(userFooter.rank)}</AppText>
                {'  ·  '}
                {userFooter.points.toLocaleString()} pts
              </AppText>
            </View>
          ) : null}
    </Sheet>
  );
}

function makeStyles(color: ColorTheme) {
  return StyleSheet.create({
    // `Sheet`'s own 90% cap is what this sheet always wanted; the difference
    // is that the primitive's RESOLVES. D22: the '90%' here sat on a card
    // whose parent was content-sized, so it never applied and a long list at
    // large type ran off the screen (G6/SR-099, the same shape four sibling
    // sheets had). Declared anyway, so the intent is legible where the sheet
    // is configured rather than only in the primitive's default.
    cap: { maxHeight: '90%' },
    // Not `padded`: this sheet's children carry their own gutters (the list
    // rows are full-bleed with inset content, and the footer spans the card).
    card: { paddingTop: spacing.tight },
    // Placement only — the control's own drawing lives in the primitive.
    segment: { marginHorizontal: spacing.xl, marginBottom: spacing.md },
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
      // On-glass counter → inkGlassMuted (GLASS §7.4 bans textMuted on glass).
      color: color.inkGlassMuted,
    },
    // rankTop: brand → brandText — brand (#1466E0) hit ≈4.45 on the dark
    // podiumGold row (FAIL); brandText is the arbitrated on-glass select ink.
    rankTop: { color: color.brandText, fontWeight: font.weight.bold },
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
      // On-glass body → ≥500 weight (self-row emphasis stays colour-borne via nameSelf).
      fontFamily: font.family.bodyMedium,
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
    stateText: { fontSize: font.size.sm, color: color.inkGlassMuted, fontFamily: font.family.bodyMedium, textAlign: 'center' },
    stateHint: {
      fontSize: font.size.xs,
      color: color.inkGlassMuted,
      textAlign: 'center',
      marginTop: spacing.tight,
    },
    retryBtn: {
      marginTop: spacing.lg,
      paddingHorizontal: spacing.xl,
      paddingVertical: 10,
      // brand → ctaFill: white-on-brand was the recorded 3.42 dark FAIL; ctaFill passes.
      backgroundColor: color.ctaFill,
      borderRadius: radius.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // ctaFillPressed, not errorPressed: the fill above is ctaFill (blue), so the
    // press state must stay in the same color family (errorPressed was a leftover
    // from the red-retry recipe used in the preset/saved-places modals).
    retryBtnPressed: { backgroundColor: color.ctaFillPressed },
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
