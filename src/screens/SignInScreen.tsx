import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { signInWithEmail, signUpWithEmail } from '@/lib/supabase';

export default function SignInScreen() {
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
    if (mode === 'up') {
      Alert.alert(
        'Check your email',
        `We sent a confirmation link to ${cleanEmail}. Open it to finish signing up.`,
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AccessMap</Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      {validationError ? (
        <Text style={styles.errorText} accessibilityLiveRegion="polite">
          {validationError}
        </Text>
      ) : null}
      <Button title="Sign in" onPress={() => submit('in')} disabled={busy} />
      <Button title="Create account" onPress={() => submit('up')} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#c0392b',
    fontSize: 13,
    textAlign: 'center',
  },
});
