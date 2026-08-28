import React, { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { font, gradient, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { AppText, Input, TypeBlock, TYPE_BLOCK } from '@/components/ui';
import { signInWithEmail, signUpWithEmail } from '@/lib/supabase';
import { a11yToggle, decorativeProps, isAxRecompose, useFocusOnOpen } from '@/lib/accessibility';
import { notify } from '@/lib/confirm';
import {
  PRIVACY_POLICY_LINK_HINT,
  PRIVACY_POLICY_LINK_LABEL,
  TERMS_LINK_HINT,
  TERMS_LINK_LABEL,
} from '@/lib/copy';
import PrivacyScreen from '@/screens/PrivacyScreen';
import TermsScreen from '@/screens/TermsScreen';
import { track } from '@/lib/analytics';
import LogoMark from '@/components/LogoMark';
import {
  clearAccountDeletionReceipt,
  getAccountDeletionStatus,
  loadAccountDeletionReceipt,
  type AccountDeletionStatus,
} from '@/lib/accountDeletionReceipt';

export default function SignInScreen({
  onClose,
  onGuest,
}: { onClose?: () => void; onGuest?: () => void } = {}) {
  // color kept for error tokens
  const color = useColor();
  const styles = makeStyles(color);
  // A11Y-201 (2.4.3): this screen presents when it mounts — as the root auth
  // wall AND as ProfileScreen's sign-in Modal (which is exempted in the
  // focus-in guard because this hook covers it). Land the cursor on the title.
  const titleRef = useFocusOnOpen<Text>(true);
  // BP-5: the only full-screen surface with zero safe-area handling — the
  // ← Back button could sit under the status bar and the policy link under
  // the home indicator on notched devices. Non-throwing context read (the
  // M15 family recipe; render tests mount without a provider).
  const insets = React.useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  // X1 / board 11: at accessibility sizes the pinned footer plus a full-height
  // hero left roughly 370pt of scroll window, so the FIRST viewport of the
  // signed-out app had no field, no button and no guest link in it. At the
  // recomposition point the hero compacts to one row and the tagline stands
  // down (onboarding still carries it), which puts the form back above the fold.
  const { fontScale } = useWindowDimensions();
  const axRecompose = isAxRecompose(fontScale);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  /**
   * Errors now know which field they belong to. A mistyped email is the email
   * field's problem — the `Input` primitive draws it there, on the field, with
   * the message in the field's own accessibilityHint — while a server refusal
   * belongs to the form and keeps the standalone row. Same message either way,
   * shown once, in the place that can act on it.
   */
  const [validationError, setValidationError] = useState<
    { field: 'email' | 'password' | null; message: string } | null
  >(null);
  // B-3: local, because this screen sits outside SharedModalsProvider. See the
  // mount at the bottom of the render for why that is forced, not chosen.
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<AccountDeletionStatus | null>(null);
  const [deletionStatusUnavailable, setDeletionStatusUnavailable] = useState(false);
  const [checkingDeletionStatus, setCheckingDeletionStatus] = useState(false);

  const refreshDeletionStatus = useCallback(async () => {
    setCheckingDeletionStatus(true);
    try {
      const receipt = await loadAccountDeletionReceipt();
      if (!receipt) {
        setDeletionStatus(null);
        setDeletionStatusUnavailable(false);
        return;
      }
      const status = await getAccountDeletionStatus(receipt);
      setDeletionStatus(status);
      setDeletionStatusUnavailable(false);
      if (status.status === 'COMPLETE') AccessibilityInfo.announceForAccessibility('Account deletion is complete.');
    } catch {
      // Keep the receipt after a lost first response or a status outage.
      setDeletionStatusUnavailable(true);
    } finally {
      setCheckingDeletionStatus(false);
    }
  }, []);

  useEffect(() => { void refreshDeletionStatus(); }, [refreshDeletionStatus]);

  const dismissCompletedDeletion = useCallback(async () => {
    await clearAccountDeletionReceipt();
    setDeletionStatus(null);
    setDeletionStatusUnavailable(false);
  }, []);

  // A11Y-203: every error shown in the inline row must ALSO be announced.
  // The row's accessibilityLiveRegion="assertive" is Android-only in RN, and
  // on web the row node-inserts (browser SRs don't reliably speak inserts) —
  // so setting state alone leaves iOS VoiceOver and web SR users in silence.
  // F65 established the explicit-announce rule for the server branch; this
  // helper extends it to the client validation branches, which used to be the
  // only silent ones (3.3.1 + 4.1.3).
  const showError = (msg: string, field: 'email' | 'password' | null = null) => {
    setValidationError({ field, message: msg });
    AccessibilityInfo.announceForAccessibility(msg);
  };

  const submit = async (mode: 'in' | 'up') => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      showError('Please enter a valid email address.', 'email');
      return;
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters.', 'password');
      return;
    }
    setValidationError(null);
    setBusy(true);
    const { error } =
      mode === 'in'
        ? await signInWithEmail(cleanEmail, password)
        : await signUpWithEmail(cleanEmail, password);
    setBusy(false);
    if (error) {
      // F48 (re-sweep): Alert.alert is a no-op on react-native-web, so a
      // failed sign-in/sign-up showed NOTHING there. The inline error row
      // (same one used for validation) works on every platform. Announced
      // via showError per F65 — iOS VoiceOver doesn't reliably auto-announce
      // RN live regions (the old system Alert announced itself).
      showError(`${mode === 'in' ? "Couldn't sign you in" : "Couldn't create your account"}: ${error.message}`);
      return;
    }
    if (mode === 'in') {
      track('user_signed_in', { method: 'email', isNewUser: false });
      onClose?.();
    }
    if (mode === 'up') {
      // F6: close the modal after the user acknowledges. When SignInScreen is
      // presented as a modal (e.g. a guest opening it from Profile), the
      // sign-up branch previously never called onClose, and the iOS fullscreen
      // Modal has no swipe-to-dismiss — so the user was trapped with no way
      // back to the map. onClose is undefined when this is the root auth gate,
      // where no dismiss is needed.
      const title = 'Check your email';
      const msg = `We sent a confirmation link to ${cleanEmail}. Open it to finish signing up.`;
      if (Platform.OS === 'web') {
        // F48: the button-Alert below never renders on web — sign-up looked
        // like a silent no-op and the modal never closed.
        notify(title, msg);
        onClose?.();
      } else {
        Alert.alert(title, msg, [{ text: 'OK', onPress: () => onClose?.() }]);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      accessibilityViewIsModal
      // G1: `onClose` is undefined when this screen IS the root auth wall, so
      // the gesture correctly does nothing there — a wall is not a dismissible
      // surface. It only becomes escapable when presented as a modal, which is
      // exactly when the visible "← Back" renders too.
      onAccessibilityEscape={onClose}
    >
      <LinearGradient
        colors={['#070b18', '#0a1428', '#0c1d3a']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Glow orb behind logo */}
      <View style={styles.glowOrb} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(spacing.xxxl, insets.top + spacing.md),
            // SW-01: the pinned policy footer below now carries the bottom
            // inset; this is just breathing room above it.
            paddingBottom: spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* F48: when presented as a modal (guest browsing -> sign-in), give a
            way OUT without authenticating — the iOS fullscreen Modal has no
            swipe-to-dismiss, so a guest who changed their mind was trapped
            (the F6 fix only closed the modal AFTER a successful sign-up). */}
        {onClose ? (
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.backBtn, pressed && styles.guestBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back without signing in"
          >
            <AppText variant="label" style={styles.backBtnText}>← Back</AppText>
          </Pressable>
        ) : null}
        <View style={[styles.brandBlock, axRecompose && styles.brandBlockCompact]}>
          <LogoMark variant="white" size={axRecompose ? 32 : 84} />
          <AppText
            ref={titleRef}
            variant="display"
            size={font.size.h1}
            color="#f0f6ff"
            style={styles.title}
            accessibilityRole="header"
          >
            Flagstone
          </AppText>
          {/* The tagline stands down at the recomposition point. It is the one
              element here that is pure atmosphere — onboarding says the same
              thing at length, and it costs three lines of the first viewport
              exactly where the email field needs to be. The mark, the name and
              the header role all stay. */}
          {!axRecompose && (
            <AppText variant="body" style={styles.tagline}>
              Spot barriers. Share them.{'\n'}Make your community more accessible.
            </AppText>
          )}
        </View>

        <View style={styles.formCard}>
          {deletionStatus || deletionStatusUnavailable ? (
            <View style={styles.deletionStatusCard} accessibilityLiveRegion="polite">
              <AppText variant="label" style={styles.deletionStatusTitle}>
                {deletionStatus?.status === 'COMPLETE' ? 'Account deletion complete' : 'Account deletion status'}
              </AppText>
              <AppText variant="body" style={styles.deletionStatusBody}>
                {deletionStatus?.status === 'REQUESTED'
                  ? 'Your deletion request was received and is waiting to begin.'
                  : deletionStatus?.status === 'DELETING'
                    ? 'Your account remains unavailable while deletion is in progress.'
                    : deletionStatus?.status === 'REVIEWING'
                      ? 'Your account remains unavailable while we complete a deletion review.'
                      : deletionStatus?.status === 'COMPLETE'
                        ? 'Your account and associated content have been deleted.'
                        : 'This device has a deletion receipt, but status is temporarily unavailable.'}
              </AppText>
              {deletionStatus?.status === 'COMPLETE' ? (
                <Pressable onPress={() => void dismissCompletedDeletion()} style={styles.deletionStatusAction}
                  accessibilityRole="button" accessibilityLabel="Dismiss confirmation" accessibilityHint="Removes the completed account-deletion receipt from this device.">
                  <AppText variant="label" style={styles.deletionStatusActionText}>Dismiss confirmation</AppText>
                </Pressable>
              ) : (
                <Pressable onPress={() => void refreshDeletionStatus()} disabled={checkingDeletionStatus}
                  style={styles.deletionStatusAction} accessibilityRole="button" accessibilityLabel="Check account deletion status"
                  {...a11yToggle({ busy: checkingDeletionStatus, disabled: checkingDeletionStatus })}>
                  <AppText variant="label" style={styles.deletionStatusActionText}>
                    {checkingDeletionStatus ? 'Checking…' : 'Check status'}
                  </AppText>
                </Pressable>
              )}
            </View>
          ) : null}
          {/* The design system's field, at last. This screen hand-rolled a twin
              of `Input` — its own label, focus ring, 44pt floor and error row —
              because the primitive is themed and would have drawn a white field
              on this navy cover in light mode. `onDark` is what closed that
              gap; the values it uses are this screen's own, lifted verbatim, so
              the field looks the same and stops being a second implementation
              to keep in sync on the one form that creates an account. */}
          <Input
            onDark
            label="Email address"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            // 1.4, not the primitive's 1.5. A field's own text is chrome-class:
            // it sits in a box with a fixed floor and the label above it carries
            // the meaning, so the tighter of the two caps is the right one and
            // it is what this screen already shipped.
            maxFontSizeMultiplier={1.4}
            accessibilityLabel="Email address"
            accessibilityHint="Enter the email you signed up with"
            errorText={validationError?.field === 'email' ? validationError.message : undefined}
            containerStyle={styles.field}
          />

          {/* Show/hide toggle: typing a password blind is a real barrier for
              motor- and cognition-impaired users (and everyone on a phone
              keyboard). The eye is the primitive's right slot now, so it is
              inside the field's own row rather than absolutely positioned over
              it — same 44pt target, one less overlap to maintain. */}
          <Input
            onDark
            label="Password"
            placeholder="At least 6 characters"
            secureTextEntry={!passwordVisible}
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            maxFontSizeMultiplier={1.4}
            accessibilityLabel="Password"
            accessibilityHint="At least 6 characters"
            errorText={validationError?.field === 'password' ? validationError.message : undefined}
            containerStyle={styles.field}
            rightSlot={
              <Pressable
                onPress={() => setPasswordVisible((v) => !v)}
                style={({ pressed }) => [styles.passwordToggle, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
                accessibilityHint="Toggles whether your password is readable on screen"
              >
                {passwordVisible ? (
                  <EyeOff size={20} color="rgba(255,255,255,0.55)" strokeWidth={2} />
                ) : (
                  <Eye size={20} color="rgba(255,255,255,0.55)" strokeWidth={2} />
                )}
              </Pressable>
            }
          />

          {/* A server refusal belongs to the FORM, not to a field — nothing the
              user typed in either box is identifiably at fault — so it keeps the
              standalone row. A11Y-203 stands: the row is assertive AND
              showError() announces explicitly, because the live region alone is
              Android-only-reliable in RN and web SRs do not speak node inserts.
              The red is `errorOnDark` now rather than three inline literals. */}
          {validationError && validationError.field === null ? (
            <AppText
              variant="body"
              style={styles.errorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {validationError.message}
            </AppText>
          ) : null}

          <View {...a11yToggle({ busy })} style={styles.actions}>
            <Pressable
              onPress={() => submit('in')}
              disabled={busy}
              style={({ pressed }) => [pressed && { opacity: 0.88 }, busy && styles.btnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              {...a11yToggle({ disabled: busy })}
            >
              <LinearGradient
                // The token, not a third bespoke ramp — same primary-CTA
                // gradient as the FAB and Report submit (BP-8/C5). White label
                // is 16pt bold, the AA-large posture the token documents.
                colors={gradient.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                {busy ? (
                  <ActivityIndicator color={color.textOnBrand} size="small" />
                ) : (
                  <AppText variant="label" style={styles.primaryBtnText}>Sign in</AppText>
                )}
              </LinearGradient>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <AppText variant="label" style={styles.dividerText}>or</AppText>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              onPress={() => submit('up')}
              disabled={busy}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.secondaryBtnPressed,
                busy && styles.btnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              {...a11yToggle({ disabled: busy })}
            >
              <AppText variant="label" style={styles.secondaryBtnText}>Create account</AppText>
            </Pressable>
          </View>
        </View>

        {onGuest ? (
          <View style={styles.guestBlock}>
            <Pressable
              onPress={onGuest}
              style={({ pressed }) => [styles.guestBtn, pressed && styles.guestBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Browse without an account"
              accessibilityHint="Browse the map without signing in. You can report barriers anonymously; verifying and resolving flags requires an account."
            >
              <AppText variant="label" style={styles.guestBtnText}>Browse without an account →</AppText>
            </Pressable>
            <AppText variant="body" style={styles.guestNote}>You can browse and report barriers without an account. Verifying and resolving others&apos; flags needs a free one.</AppText>
          </View>
        ) : null}

        <AppText variant="body" style={styles.footnote}>
          Your location is used to centre the map, work out how far away barriers are, and place a flag.{'\n'}Your email is never shown publicly.
        </AppText>

      </ScrollView>

      {/* SW-01 (Apple 1.2) — PINNED, not scrolled. These two lines used to be
          the last children of the ScrollView, so on a 956pt screen the consent
          line rendered at y948-993 (below the fold) and on the 390x844 17e both
          it AND the privacy link were entirely off-screen. The screen's own
          intent, three lines down, is that consent "must be visible where the
          account is created" — scrolling to reach it does not satisfy that, and
          App Review walks this signed out on a small device. Pinning them below
          the scroller makes them visible at rest on EVERY screen size and at any
          Dynamic Type size, and the footer (not the scroll content) now carries
          the home-indicator inset, which is the SW-02 half of the same defect.
          Reading order is unchanged: still the last two elements on the screen,
          still below the two trust lines (PROTECT-11). */}
      {/* T3: the pinned footer is chrome — it has nowhere to grow, and every
          point it takes is a point the scroll window above it loses. The chrome
          cap (1.3) is what keeps Apple 1.2's consent lines visible at rest on
          every text size, which is the whole reason SW-01 pinned them here. */}
      {/* Board 11: ONE footer run rather than two stacked rows. The links sit
          side by side with a dot between them and the row may WRAP, so at
          default size the consent reads as a single sentence beside the policy
          link (giving the scroll window above it back roughly 40pt, which is
          board 11's whole argument), and at large type it falls back to the
          two-line stack it always was. Both halves of T5: the consent may
          shrink, and it carries a floor so it wraps to its own line instead of
          being squeezed below its longest word.

          NOT collapsed into one sentence with two inline links, which is what
          the board draws. A nested <Text onPress> can carry neither padding nor
          hitSlop (the W-01 finding from Phase 0), so that composition would put
          both legal links on this screen under the 44pt floor. The floor wins;
          each link is still its own padded target. */}
      <TypeBlock cap={TYPE_BLOCK.chrome}>
      <View style={[styles.policyFooter, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
        {/* B-2 (SR-002): 5.1.1(i) wants the policy reachable near account
            creation, not only in ASC metadata. Appended BELOW the footnote so
            both trust lines above keep their position in reading order
            (PROTECT-11). Ink is the footnote's own arbitrated
            rgba(255,255,255,0.55) (≈5.5:1 on #070b18) — no new ink on this
            hardcoded-dark cover — and the underline carries the affordance so
            it never rests on colour alone (WCAG 1.4.1). */}
        <Pressable
          onPress={() => setPrivacyOpen(true)}
          style={({ pressed }) => [styles.policyLinkWrap, pressed && styles.policyLinkPressed]}
          accessibilityRole="button"
          accessibilityLabel={PRIVACY_POLICY_LINK_LABEL}
          accessibilityHint={PRIVACY_POLICY_LINK_HINT}
        >
          <AppText variant="body" style={styles.policyLink}>
            {PRIVACY_POLICY_LINK_LABEL}
          </AppText>
        </Pressable>

        <AppText variant="body" style={styles.policySeparator} {...decorativeProps}>
          ·
        </AppText>

        {/* Apple 1.2 (UGC): agreement to the terms must be visible where the
            account is created, not only discoverable post-signup in Settings.
            Same arbitrated ink + underline affordance as the privacy link
            above; the whole 44pt row is the target. */}
        <Pressable
          onPress={() => setTermsOpen(true)}
          style={({ pressed }) => [styles.policyLinkWrap, styles.consentWrap, pressed && styles.policyLinkPressed]}
          accessibilityRole="button"
          accessibilityLabel={`By creating an account you agree to the ${TERMS_LINK_LABEL}.`}
          accessibilityHint={TERMS_LINK_HINT}
        >
          <AppText variant="body" style={styles.footnote}>
            By creating an account you agree to the{' '}
            <AppText variant="body" style={styles.policyLink}>
              {TERMS_LINK_LABEL}
            </AppText>
            .
          </AppText>
        </Pressable>
      </View>
      </TypeBlock>

      {/* B-3: mounted LOCALLY, not in SharedModalsHost, and that is forced
          rather than chosen. App.tsx renders SignInScreen as a SIBLING of
          RootNavigator (the auth gate returns one or the other), so this screen
          is outside SharedModalsProvider entirely — `setOpen` would throw, and
          the host's PrivacyScreen is not even mounted while signed out.
          PrivacyScreen takes plain visible/onClose props, so a local instance
          costs nothing. The two mounts can never be alive at once: the auth
          gate makes them mutually exclusive. */}
      <PrivacyScreen visible={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      {/* Same local-mount reasoning as PrivacyScreen above: SignInScreen sits
          outside SharedModalsProvider, so setOpen('terms') is unreachable. */}
      <TermsScreen visible={termsOpen} onClose={() => setTermsOpen(false)} />
    </KeyboardAvoidingView>
  );
}

 
const makeStyles = (_color: ColorTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070b18' },
    glowOrb: {
      position: 'absolute',
      top: -80,
      left: '50%',
      marginLeft: -180,
      width: 360,
      height: 360,
      borderRadius: 180,
      // Wayfinder Blue glow — matches new brand primary
      backgroundColor: 'rgba(20,102,224,0.18)',
      ...(Platform.OS === 'web' ? { filter: 'blur(80px)' } as object : {}),
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.xxxl,
      gap: spacing.xl,
    },
    brandBlock: {
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    // Board 11: mark + wordmark on ONE row at large type, so the hero costs a
    // line instead of a screen.
    brandBlockCompact: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    title: {
      // fontSize, fontFamily, color applied via AppText variant="display".
      // The raw `letterSpacing: -0.8` is gone: it matched neither tracking
      // token (h1 -0.55, display -1.0) and overrode the size-derived value
      // AppText computes from the `size` prop — a magic number sitting on top
      // of the one mechanism whose whole job is to not need one.
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    tagline: {
      fontSize: font.size.base,
      color: 'rgba(200,218,255,0.7)',
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: spacing.md,
    },
    formCard: {
      borderRadius: radius.xl,
      padding: spacing.xl,
      gap: spacing.sm,
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.13)',
      ...(Platform.OS === 'web'
        ? { backdropFilter: 'blur(24px) saturate(160%)' } as object
        : {}),
    },
    deletionStatusCard: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'rgba(132,174,246,0.45)',
      backgroundColor: 'rgba(20,102,224,0.14)',
      padding: spacing.md,
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    deletionStatusTitle: { color: '#dceaff', fontSize: font.size.sm, fontWeight: font.weight.semibold },
    deletionStatusBody: { color: 'rgba(235,243,255,0.9)', fontSize: font.size.sm, lineHeight: font.lineHeight.sm },
    deletionStatusAction: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
    deletionStatusActionText: { color: '#b4cffa', fontSize: font.size.sm, fontWeight: font.weight.semibold },
    // The label / fill / focus-ring / 44pt-floor styles that used to live here
    // are the `Input` primitive's now, drawn from `fixedDark` in theme.ts —
    // the same values, in one place, reachable by the next cover that needs a
    // field. All that is left is this screen's spacing between the two.
    field: { marginBottom: spacing.md },
    passwordToggle: {
      width: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      // Tokens, not a third undocumented red. `errorOnDark*` is the fixed-dark
      // family (DESIGN.md §1) and carries the same values this screen picked by
      // hand, with their contrast measured: 7.0:1 on the composite.
      color: _color.errorOnDark,
      backgroundColor: _color.errorOnDarkBg,
      borderWidth: 1,
      borderColor: _color.errorOnDarkBorder,
      fontSize: font.size.sm,
      fontWeight: font.weight.medium,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      marginTop: spacing.xs,
    },
    actions: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    primaryBtn: {
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
      // The tokenized brand glow (0.30) — this was a hand-rolled 0.55, the
      // heaviest shadow in the app; every other CTA glow rides the token.
      ...shadow.glowBrand,
    },
    primaryBtnText: {
      color: _color.textOnBrand,
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      letterSpacing: font.tracking.loose,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    dividerText: {
      fontSize: font.size.xs,
      color: 'rgba(255,255,255,0.35)',
      fontWeight: font.weight.medium,
      letterSpacing: font.tracking.loose,
    },
    secondaryBtn: {
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: 'rgba(132,174,246,0.4)', // blue-300 at low opacity on dark
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
      backgroundColor: 'rgba(20,102,224,0.06)',
    },
    secondaryBtnPressed: {
      backgroundColor: 'rgba(20,102,224,0.16)',
      borderColor: 'rgba(132,174,246,0.75)',
    },
    btnDisabled: { opacity: 0.45 },
    secondaryBtnText: {
      color: '#B4CFFA', // blue-200 — legible Wayfinder Blue on dark background
      fontSize: font.size.md,
      fontWeight: font.weight.semibold,
    },
    guestBlock: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    guestBtn: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.full,
      minHeight: 44, // WCAG 2.5.5: was 40pt (below 44pt project standard)
      alignItems: 'center',
      justifyContent: 'center',
    },
    guestBtnPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
    backBtn: {
      alignSelf: 'flex-start',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      minHeight: 44,
      justifyContent: 'center',
    },
    backBtnText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.medium,
      color: 'rgba(148,196,255,0.85)',
      letterSpacing: 0.2,
    },
    guestBtnText: {
      fontSize: font.size.sm,
      fontWeight: font.weight.medium,
      color: 'rgba(148,196,255,0.75)',
      letterSpacing: 0.2,
    },
    guestNote: {
      fontSize: font.size.xs,
      // WCAG 1.4.3: was 0.3 (~2.8:1). 0.55 blends to ≈#8F9197 on #070b18 → 5.5:1, AA pass.
      color: 'rgba(255,255,255,0.55)',
      textAlign: 'center',
    },
    // SW-01: the pinned Apple-1.2 footer. Horizontal padding matches the
    // scroll content so the links stay optically aligned with the form above.
    policyFooter: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      columnGap: spacing.xs,
      paddingHorizontal: spacing.xxl,
    },
    policyLinkWrap: {
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // BOTH halves of the width rule, and the device is why. `flexShrink: 1`
    // alone did not keep the two on one line: Yoga runs its line-break test on
    // the flex BASE size, and the consent's intrinsic ~408pt plus the policy
    // link overflowed the row, so it wrapped and left the separator dangling
    // after the policy link — a worse footer than the two-row stack it
    // replaced. `flexBasis: 0` takes the sentence out of that test; `minWidth`
    // is what then stops it being squeezed below its own longest word, and is
    // also what makes it wrap honestly if a future label ever eats the row.
    consentWrap: {
      flexBasis: 0,
      flexGrow: 1,
      minWidth: 200,
    },
    policySeparator: {
      fontSize: font.size.xs,
      color: 'rgba(255,255,255,0.55)',
    },
    policyLinkPressed: { opacity: 0.7 },
    policyLink: {
      fontSize: font.size.xs,
      // Same arbitrated ink as `footnote` below — reused verbatim, not a new
      // value on this hardcoded-dark cover.
      color: 'rgba(255,255,255,0.55)',
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    footnote: {
      fontSize: font.size.xs,
      // WCAG 1.4.3: was 0.28 (~2.7:1). 0.55 blends to ≈#8F9197 on #070b18 → 5.5:1, AA pass.
      color: 'rgba(255,255,255,0.55)',
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: spacing.lg,
    },
  });
