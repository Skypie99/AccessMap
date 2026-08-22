import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CheckCircle2, Star } from 'lucide-react-native';
import { AppText } from '@/components/ui/AppText';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { HeaderActions } from '@/components/ui/HeaderActions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TypeBlock, TYPE_BLOCK } from '@/components/ui/TypeBlock';
import { useDrawer } from '@/lib/drawerContext';
import { useSharedModals } from '@/lib/sharedModalsContext';
import { MISSION_STATEMENT } from '@/lib/copy';
import { decorativeProps } from '@/lib/accessibility';
import { font, icon as iconSize, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

/**
 * Q11 — what an account adds, in three plain lines.
 *
 * Not a feature list and not a sales pitch: the three things a guest actually
 * cannot do, which is also the honest answer to "why would I sign in". Each is
 * a statement, not a control — the one control on this screen is Sign in.
 *
 * PLACEHOLDER COPY: logged in build/COPY_LEDGER.md as SKY-WORDS-REQUIRED.
 */
type AccountBenefit = {
  key: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  text: string;
  /** C4: gold is gamification only. Exactly one of these three is. */
  gold?: boolean;
};

const ACCOUNT_BENEFITS: readonly AccountBenefit[] = [
  { key: 'photos', Icon: Camera, text: 'Add photos to your reports' },
  { key: 'verify', Icon: CheckCircle2, text: 'Verify and resolve barriers near you' },
  { key: 'points', Icon: Star, text: 'Earn points and badges', gold: true },
];

/**
 * GuestProfile — the signed-out Profile's editorial guest state (T10 / F2-04).
 *
 * The default state of every web session and native guest. It wears the same S8
 * editorial family as the other four tabs: ScreenHeader (eyebrow PROFILE / title
 * "Your profile" / subtitle) + the HeaderActions menu + feedback pair, above the
 * sign-in CTA — a top-anchored editorial column on the caller's ScreenStage.
 *
 * TRUE render-parity with the signed-in header (ProfileScreen :927): eyebrow and
 * subtitle take the arbitrated on-stage ink (color.inkOnStage — textSubtle /
 * textMuted are below AA on the raw stage), the title keeps ScreenHeader's default
 * textStrong, and the column clears the notch itself (insets.top) since Profile
 * runs headerShown:false. No new copy: eyebrow/title are the signed-in header's
 * own strings and the subtitle promotes the pre-existing guest sentence. Fork 3
 * (the auth wall) is untouched — this designs the guest STATE render only; the
 * drawer + feedback are already guest-reachable. The sign-in CTA is delegated to
 * the caller (onSignInPress) so the SignInScreen modal stays owned by the screen.
 *
 * Extracted from ProfileScreen so the guest header is unit-testable without
 * ProfileScreen's focus-load / realtime effects. (T19 stacks more here in BP17.)
 */
export function GuestProfile({ onSignInPress }: { onSignInPress: () => void }) {
  const color = useColor();
  const insets = useSafeAreaInsets();
  // The device caught this: the column scrolls, and its last row was cut by the
  // tab bar with nothing below it to scroll clear (worst at accessibility
  // sizes, where "Earn points and badges" is three lines tall). The scroll owes
  // the bar its own height.
  //
  // The CONTEXT, not the hook, with a `?? 0` fallback — LeaderboardScreen's
  // idiom. `useBottomTabBarHeight()` throws outside a tab navigator, and this
  // component was extracted precisely so its render test can mount it without
  // ProfileScreen's whole provider stack.
  const tabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 0;
  const drawer = useDrawer();
  const { setOpen: setSharedModal } = useSharedModals();
  const styles = makeStyles(color);
  return (
    <ScrollView
      style={styles.guestScroll}
      contentContainerStyle={[
        styles.guestBody,
        { paddingTop: insets.top + spacing.lg, paddingBottom: tabBarHeight + spacing.xl },
      ]}
    >
      {/* T19 (F6-08) is retired here. The brand mark was the ONLY place the
          logo appeared at this scale in the light app, it led nowhere, and it
          sat outside the header's grid with its own margin — decoration on the
          screen the critic named the app's weakest frame. Board 08 gives that
          frame something to say instead, and the mark keeps its home on About,
          where it introduces the product rather than standing in for it. */}
      <ScreenHeader
        eyebrow="PROFILE"
        title="Your profile"
        subtitle="Sign in to see your stats, badges, and reports."
        style={styles.profileHeader}
        eyebrowColor={color.inkOnStage}
        subtitleColor={color.inkOnStage}
        actions={
          <HeaderActions
            onMenu={() => drawer.setOpen(true)}
            onFeedback={() => setSharedModal('feedback')}
            iconColor={color.textStrong}
          />
        }
      />
      <View style={styles.guestPrompt}>
        <Pressable
          onPress={onSignInPress}
          style={({ pressed }) => [styles.signInBtn, pressed && styles.signInBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Sign in to your account"
        >
          <AppText variant="label" style={styles.signInBtnText}>Sign in</AppText>
        </Pressable>
      </View>

      {/* Q11 — the mission, on the one tab a first-time guest is most likely to
          open looking for "what is this". Below the door, not instead of it:
          the sign-in CTA stays the first thing after the header.

          The sentence is `MISSION_STATEMENT` from copy.ts, the same exported
          constant About reads, pinned character-for-character by
          `mission.guard.test.ts`. Never paraphrased, never re-wrapped —
          including the name inside it, which still says AccessMap. That is
          Sky's ratified text and Sky's call (COPY_LEDGER, W-11). */}
      <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
        Why Flagstone
      </AppText>
      <GlassSurface variant="row" style={styles.guestCard}>
        <TypeBlock cap={TYPE_BLOCK.content}>
          <AppText variant="body" style={styles.missionText}>
            {MISSION_STATEMENT}
          </AppText>
        </TypeBlock>
      </GlassSurface>

      <AppText variant="label" style={styles.sectionLabel} accessibilityRole="header">
        With an account
      </AppText>
      <GlassSurface variant="row" style={styles.guestCard}>
        {ACCOUNT_BENEFITS.map(({ key, Icon, text, gold }, i) => (
          <View key={key}>
            {i > 0 && (
              <View
                style={styles.benefitSep} {...decorativeProps}
              />
            )}
            {/* Statements, not controls: one a11y node per line, no role, so a
                screen reader reads three sentences rather than offering three
                buttons that do nothing. */}
            <View style={styles.benefitRow} accessible accessibilityLabel={text}>
              <View
                style={[styles.benefitMark, gold ? styles.benefitMarkGold : null]} {...decorativeProps}
              >
                <Icon
                  size={iconSize.inline}
                  color={gold ? color.goldDark : color.brandOnSoft}
                  strokeWidth={iconSize.stroke}
                />
              </View>
              <TypeBlock cap={TYPE_BLOCK.content}>
                <AppText variant="label" style={styles.benefitText}>{text}</AppText>
              </TypeBlock>
            </View>
          </View>
        ))}
      </GlassSurface>
    </ScrollView>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // Transparent so the caller's ScreenStage shows through.
    guestScroll: { flex: 1, backgroundColor: 'transparent' },
    // Top-anchored editorial column. paddingHorizontal spacing.xxl mirrors the
    // signed-in container's indent so the header aligns with the family; the
    // header stretches full width (so HeaderActions reach the right edge), while
    // the CTA hugs the left in guestPrompt (a stretched pill would look wrong).
    // Scrolls now: at large type the mission runs past a phone screen (X11),
    // and a wall of copy that cannot move is worse than the void it replaced.
    guestBody: { paddingHorizontal: spacing.xxl, gap: spacing.lg },
    guestPrompt: { alignItems: 'flex-start' },
    // The section label grammar the rest of the estate uses: uppercase, tracked,
    // inkOnStage (textMuted is below AA on the raw stage).
    sectionLabel: {
      fontSize: font.size.xs,
      color: color.inkOnStage,
      textTransform: 'uppercase',
      letterSpacing: font.tracking.section,
      fontWeight: font.weight.bold,
      marginBottom: -spacing.sm,
    },
    guestCard: { borderRadius: radius.lg, overflow: 'hidden' },
    missionText: {
      padding: spacing.lg,
      color: color.text,
      fontFamily: font.family.bodyMedium,
      fontSize: font.size.base,
      lineHeight: font.lineHeight.base,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minHeight: 56,
    },
    benefitSep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: color.border,
      marginLeft: spacing.lg,
    },
    // A 28pt disc, the family's mark shape at row scale — brand-soft for the
    // two capability lines, gold for the one that is gamification (C4).
    benefitMark: {
      width: 28,
      height: 28,
      borderRadius: radius.circle,
      backgroundColor: color.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    benefitMarkGold: { backgroundColor: color.goldLight },
    benefitText: { flex: 1, fontSize: font.size.base, color: color.textStrong },
    // ScreenHeader supplies its own type rhythm; guestBody already pads
    // spacing.xxl, so zero the header's own padding (no double indent) — mirrors
    // the signed-in header's profileHeader override.
    profileHeader: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
    signInBtn: {
      backgroundColor: color.ctaFill, // mode-independent brand fill on the stage
      paddingHorizontal: spacing.xxxl,
      paddingVertical: spacing.md + 2,
      borderRadius: radius.circle,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    signInBtnPressed: { opacity: 0.8 },
    signInBtnText: { color: color.textOnBrand, fontSize: font.size.lg, fontWeight: font.weight.semibold },
  });
