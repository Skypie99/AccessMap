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
import { LinearGradient } from 'expo-linear-gradient';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';
import { signInWithEmail, signUpWithEmail } from '@/lib/supabase';
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
      <LinearGradient
        colors={['#070b18', '#0d1829', '#0f2042']}
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
          <LogoMark variant="badge" size={80} />
          <Text style={styles.title} accessibilityRole="header">AccessMap</Text>
          <Text style={styles.tagline}>
            Flag the world.{'\n'}Make it more accessible — together.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Email address</Text>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.35)"
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
            placeholderTextColor="rgba(255,255,255,0.35)"
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
              style={busy && styles.btnDisabled}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              accessibilityState={{ disabled: busy }}
            >
              <LinearGradient
                colors={['#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtn}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>Sign in</Text>
                )}
              </LinearGradient>
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

        {onGuest ? (
          <View style={styles.guestBlock}>
            <Pressable
              onPress={onGuest}
              style={({ pressed }) => [styles.guestBtn, pressed && styles.guestBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Continue as guest"
              accessibilityHint="Browse the map without signing in. Reporting flags requires an account."
            >
              <Text style={styles.guestBtnText}>Continue as guest →</Text>
            </Pressable>
            <Text style={styles.guestNote}>Read-only · can't report or verify flags</Text>
          </View>
        ) : null}

        <Text style={styles.footnote}>
          Location is only used when reporting a flag.{'\n'}Your email is never shown publicly.
        </Text>
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
      backgroundColor: 'rgba(37,99,235,0.18)',
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
      fontSize: font.size.h1,
      fontWeight: font.weight.bold,
      color: '#f0f6ff',
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
      borderColor: '#60a5fa',
      borderWidth: 2,
      paddingHorizontal: spacing.md - 1,
      paddingVertical: spacing.md - 1,
      backgroundColor: 'rgba(37,99,235,0.12)',
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
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    primaryBtn: {
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      shadowColor: '#2563eb',
      shadowOpacity: 0.5,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: font.size.md,
      fontWeight: font.weight.bold,
      letterSpacing: 0.3,
    },
    secondaryBtn: {
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: 'rgba(96,165,250,0.5)',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
      backgroundColor: 'rgba(37,99,235,0.08)',
    },
    secondaryBtnPressed: {
      backgroundColor: 'rgba(37,99,235,0.18)',
      borderColor: 'rgba(96,165,250,0.8)',
    },
    btnDisabled: { opacity: 0.45 },
    secondaryBtnText: {
      color: '#93c5fd',
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
      minHeight: 40,
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
      color: 'rgba(255,255,255,0.3)',
      textAlign: 'center',
    },
    footnote: {
      fontSize: font.size.xs,
      color: 'rgba(255,255,255,0.28)',
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: spacing.lg,
    },
  });
