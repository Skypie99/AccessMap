import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { AppText } from '@/components/ui';
import { signInWithEmail, signUpWithEmail } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import LogoMark from '@/components/LogoMark';

export default function SignInScreen({
  onClose,
  onGuest,
}: { onClose?: () => void; onGuest?: () => void } = {}) {
  // color kept for error tokens
  const color = useColor();
  const styles = makeStyles(color);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const submit = async (mode: 'in' | 'up') => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
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
      Alert.alert(
        mode === 'in' ? "Couldn't sign you in" : "Couldn't create your account",
        error.message,
      );
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
      Alert.alert(
        'Check your email',
        `We sent a confirmation link to ${cleanEmail}. Open it to finish signing up.`,
        [{ text: 'OK', onPress: () => onClose?.() }],
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBlock}>
          <LogoMark variant="white" size={84} />
          <AppText
            variant="display"
            size={font.size.h1}
            color="#f0f6ff"
            style={styles.title}
            accessibilityRole="header"
          >
            AccessMap
          </AppText>
          <AppText variant="body" style={styles.tagline}>
            Spot barriers. Share them.{'\n'}Make your community more accessible.
          </AppText>
        </View>

        <View style={styles.formCard}>
          <AppText variant="label" style={styles.inputLabel}>Email address</AppText>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.5)"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            style={[styles.input, emailFocused && styles.inputFocused]}
            maxFontSizeMultiplier={1.4}
            accessibilityLabel="Email address"
            accessibilityHint="Enter the email you signed up with"
          />

          <AppText variant="label" style={[styles.inputLabel, styles.inputLabelStacked]}>Password</AppText>
          <TextInput
            placeholder="At least 6 characters"
            placeholderTextColor="rgba(255,255,255,0.5)"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            style={[styles.input, passwordFocused && styles.inputFocused]}
            maxFontSizeMultiplier={1.4}
            accessibilityLabel="Password"
            accessibilityHint="At least 6 characters"
          />

          {validationError ? (
            <AppText
              variant="body"
              style={styles.errorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {validationError}
            </AppText>
          ) : null}

          <View accessibilityState={{ busy }} style={styles.actions}>
            <Pressable
              onPress={() => submit('in')}
              disabled={busy}
              style={({ pressed }) => [pressed && { opacity: 0.88 }, busy && styles.btnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: busy }}
            >
              <LinearGradient
                colors={['#4E89EF', '#1466E0', '#0F53BE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
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
              accessibilityState={{ disabled: busy }}
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
              accessibilityLabel="Continue as guest"
              accessibilityHint="Browse the map without signing in. Reporting flags requires an account."
            >
              <AppText variant="label" style={styles.guestBtnText}>Browse without an account →</AppText>
            </Pressable>
            <AppText variant="body" style={styles.guestNote}>You can look around, but you'll need an account to report or verify</AppText>
          </View>
        ) : null}

        <AppText variant="body" style={styles.footnote}>
          Your location is only used when you place a flag.{'\n'}Your email is never shown publicly.
        </AppText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    title: {
      // fontSize, fontFamily, color applied via AppText variant="display"
      textAlign: 'center',
      letterSpacing: -0.8,
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
    inputLabel: {
      fontSize: font.size.sm,
      fontWeight: font.weight.semibold,
      color: 'rgba(220,235,255,0.85)',
      marginBottom: spacing.xs,
    },
    inputLabelStacked: { marginTop: spacing.md },
    input: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: font.size.lg,
      color: '#f0f6ff',
      backgroundColor: 'rgba(255,255,255,0.06)',
      minHeight: 50,
    },
    inputFocused: {
      borderColor: '#84AEF6', // blue-300 — Wayfinder Blue at legible opacity on dark bg
      borderWidth: 2,
      paddingHorizontal: spacing.md - 1,
      paddingVertical: spacing.md - 1,
      backgroundColor: 'rgba(20,102,224,0.12)',
    },
    errorText: {
      color: '#fca5a5',
      backgroundColor: 'rgba(239,68,68,0.15)',
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.3)',
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
      paddingVertical: 15,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 56,
      // Wayfinder Blue glow under sign-in button
      shadowColor: '#1466E0',
      shadowOpacity: 0.55,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    primaryBtnText: {
      color: _color.textOnBrand,
      fontSize: font.size.lg,
      fontWeight: font.weight.bold,
      letterSpacing: 0.4,
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
      letterSpacing: 0.5,
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
    footnote: {
      fontSize: font.size.xs,
      // WCAG 1.4.3: was 0.28 (~2.7:1). 0.55 blends to ≈#8F9197 on #070b18 → 5.5:1, AA pass.
      color: 'rgba(255,255,255,0.55)',
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: spacing.lg,
    },
  });
