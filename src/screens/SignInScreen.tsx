import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { color } from '@/theme';
import { signInWithEmail, signUpWithEmail } from '@/lib/supabase';

export default function SignInScreen({ onClose }: { onClose?: () => void } = {}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const submit = async (mode: 'in' | 'up') => {
    const cleanEmail = email.trim().toLowerCase();
    // Local validation first — saves a round trip and gives a clearer
    // message than Supabase's "Invalid login credentials".
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
    <View style={styles.container}>
      {/* SI-6: accessibilityRole="header" so screen-reader users can navigate by heading */}
      <Text style={styles.title} accessibilityRole="header">
        AccessMap
      </Text>

      {/* SI-1: visible label above each input so the field name persists after typing */}
      <Text style={styles.inputLabel}>Email address</Text>
      <TextInput
        placeholder="Email"
        placeholderTextColor={color.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        accessibilityLabel="Email address"
        accessibilityHint="Enter the email you signed up with"
      />

      <Text style={styles.inputLabel}>Password</Text>
      <TextInput
        placeholder="Password"
        placeholderTextColor={color.textMuted}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        accessibilityLabel="Password"
        accessibilityHint="At least 6 characters"
      />

      {validationError ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {validationError}
        </Text>
      ) : null}
      {busy ? (
        <Text style={styles.busyText} accessibilityLiveRegion="polite">
          Signing you in…
        </Text>
      ) : null}
      <View accessibilityState={{ busy }}>
        <Button title="Sign in" onPress={() => submit('in')} disabled={busy} />
      </View>
      <Button title="Create account" onPress={() => submit('up')} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  // SI-1: visible field labels
  inputLabel: { fontSize: 14, fontWeight: '600', color: color.textMuted },
  input: {
    borderWidth: 1,
    borderColor: '#666', // SI-2: was '#ccc' (1.6:1) → '#666' (5.7:1, passes 3:1 non-text)
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#c0392b',
    fontSize: 13,
    textAlign: 'center',
  },
  busyText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
  },
});
