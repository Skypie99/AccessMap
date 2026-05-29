import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { font, radius, shadow, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { signInWithEmail, signUpWithEmail } from '@/lib/supabase';

export default function SignInScreen({ onClose }: { onClose?: () => void } = {}) {
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
      Alert.alert('Auth error', error.message);
      return;
    }
    if (mode === 'in') {
      onClose?.();
    }
    if (mode === 'up') {
      Alert.alert(
        'Check your email',
        `We sent a confirmation link to ${cleanEmail}. Open it to finish signing up.`,
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
          <View style={styles.logoBadge} accessibilityElementsHidden importantForAccessibility="no">
            <Text style={styles.logoMark}>A</Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">AccessMap</Text>
          <Text style={styles.tagline}>
            Flag the world. Make it more accessible — together.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Email address</Text>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor={color.placeholderText}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            style={[styles.input, emailFocused && styles.inputFocused]}
            accessibilityLabel="Email address"
            accessibilityHint="Enter the email you signed up with"
          />

          <Text style={[styles.inputLabel, styles.inputLabelStacked]}>Password</Text>
          <TextInput
            placeholder="At least 6 characters"
            placeholderTextColor={color.placeholderText}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            style={[styles.input, passwordFocused && styles.inputFocused]}
            accessibilityLabel="Password"
            accessibilityHint="At least 6 characters"
          />

          {validationError ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {validationError}
            </Text>
          ) : null}

          <View accessibilityState={{ busy }} style={styles.actions}>
            <Pressable
              onPress={() => submit('in')}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
                busy && styles.btnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: busy }}
            >
              {busy ? (
                <ActivityIndicator color={color.textOnBrand} size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign in</Text>
              )}
            </Pressable>

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
              <Text style={styles.secondaryBtnText}>Create account</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footnote}>
          By signing in, you agree to share location data to drop and verify
          flags. Your email is never shown publicly.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (color: ColorTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: color.surfaceMuted },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    gap: spacing.xl,
  },
  brandBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...shadow.e2,
  },
  logoMark: {
    color: color.textOnBrand,
    fontSize: font.size.h1,
    fontWeight: font.weight.bold,
    lineHeight: font.size.h1 + 4,
  },
  title: {
    fontSize: font.size.h1,
    fontWeight: font.weight.bold,
    color: color.textStrong,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: font.size.base,
    color: color.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  formCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadow.e1,
  },
  inputLabel: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    color: color.textStrong,
    marginBottom: spacing.xs,
  },
  inputLabelStacked: { marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.size.lg,
    color: color.text,
    backgroundColor: color.surface,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: color.brand,
    borderWidth: 2,
    paddingHorizontal: spacing.md - 1,
    paddingVertical: spacing.md - 1,
  },
  errorText: {
    color: color.errorFg,
    backgroundColor: color.errorBg,
    fontSize: font.size.sm,
    fontWeight: font.weight.medium,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  primaryBtn: {
    backgroundColor: color.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...shadow.e1,
  },
  primaryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  primaryBtnText: {
    color: color.textOnBrand,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: color.brand,
    paddingVertical: spacing.md - 1.5,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryBtnPressed: {
    opacity: 0.9,
    backgroundColor: color.brandSofter,
  },
  btnDisabled: { opacity: 0.5 },
  secondaryBtnText: {
    color: color.brandText,
    fontSize: font.size.md,
    fontWeight: font.weight.semibold,
  },
  footnote: {
    fontSize: font.size.xs,
    color: color.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
  },
});
