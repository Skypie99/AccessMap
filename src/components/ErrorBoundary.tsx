import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font, radius, spacing } from '@/theme';
import { type ColorTheme, useColor } from '@/theme/ThemeContext';

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
 *
 * Dark-mode note: class components cannot call hooks directly. The error
 * fallback UI is extracted into ErrorFallback (a function component) so
 * it can call useColor() and respond to theme changes. The class boundary
 * itself delegates rendering the fallback to that component.
 */
interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const color = useColor();
  const styles = makeStyles(color);
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.body}>
        The app hit an unexpected problem and stopped. Try again, or close and reopen the app if
        it keeps happening.
      </Text>
      <Pressable
        onPress={onReset}
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
      return <ErrorFallback onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

const makeStyles = (color: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: color.surface,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
      gap: spacing.md,
    },
    title: {
      fontSize: font.size.h2,
      fontWeight: font.weight.bold,
      color: color.textStrong,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    body: {
      fontSize: font.size.md,
      color: color.text,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 320,
    },
    btn: {
      marginTop: spacing.md,
      backgroundColor: color.brand,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.circle,
      minHeight: 44,
      justifyContent: 'center',
    },
    btnPressed: { opacity: 0.85 },
    btnText: {
      color: color.textOnBrand,
      fontWeight: font.weight.bold,
      fontSize: font.size.md,
      letterSpacing: 0.2,
    },
  });
