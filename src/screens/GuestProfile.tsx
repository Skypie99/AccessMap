import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import LogoMark from '@/components/LogoMark';
import { HeaderActions } from '@/components/ui/HeaderActions';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useDrawer } from '@/lib/drawerContext';
import { useSharedModals } from '@/lib/sharedModalsContext';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

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
  const drawer = useDrawer();
  const { setOpen: setSharedModal } = useSharedModals();
  const styles = makeStyles(color);
  return (
    <View style={[styles.guestBody, { paddingTop: insets.top + spacing.lg }]}>
      {/* T19 (F6-08): the brand mark at the account doorway — the signed-out
          Profile's one furnished brand moment. Theme-aware: the colour pin holds
          >=3:1 on the light stage; the white knockout is used on the dark stage
          (the colour pin dips to ~2.7:1 there). Keeps LogoMark's own "AccessMap"
          label — meaningful here (the header reads "Your profile"), unlike the
          About mark which hides it to avoid double-speak. */}
      <LogoMark size={56} variant={color.scheme === 'dark' ? 'white' : 'color'} />
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
    </View>
  );
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    // Top-anchored editorial column. paddingHorizontal spacing.xxl mirrors the
    // signed-in container's indent so the header aligns with the family; the
    // header stretches full width (so HeaderActions reach the right edge), while
    // the CTA hugs the left in guestPrompt (a stretched pill would look wrong).
    guestBody: { flex: 1, paddingHorizontal: spacing.xxl, gap: spacing.xl },
    guestPrompt: { alignItems: 'flex-start' },
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
