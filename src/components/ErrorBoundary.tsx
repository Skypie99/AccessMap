import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radius } from '@/theme';

/**
 * Top-level error boundary.
 *
 * Wrapped around the whole app in App.tsx so an uncaught render error
 * (a thrown exception, a bad ref, a stray undefined access) falls to a
 * "Something went wrong" screen with a Try-again button instead of a
 * blank white screen. The error is also logged so a future Sentry-style
 * tool can pick it up without us touching call sites.
 *
 * Intentionally tiny: this is the safety net, not a feature surface.
 * If we ever wire up real crash reporting, do it in componentDidCatch.
 */
interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Best-effort logging; safe to ignore if console isn't around.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] uncaught render error:', error, info);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container} accessibilityRole="alert">
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected problem and stopped. Try again, or close and reopen the app if
            it keeps happening.
          </Text>
          <Pressable
            onPress={this.handleReset}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            accessibilityHint="Resets the app screen after an error"
          >
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#222', textAlign: 'center' },
  body: {
    fontSize: 15,
    color: '#444',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  btn: {
    marginTop: 12,
    backgroundColor: '#2f80ed',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.circle,
    minHeight: 44,
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.85 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
