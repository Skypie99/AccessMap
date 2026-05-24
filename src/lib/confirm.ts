import { Alert, Platform } from 'react-native';

/**
 * Platform-aware confirm dialog.
 *
 * - Native (iOS / Android): uses `Alert.alert` with a Cancel button and a
 *   confirm action. Resolves true if the user taps the confirm action,
 *   false if they cancel or dismiss the alert.
 * - Web: `Alert.alert` is a no-op on react-native-web (see LEARNINGS — same
 *   trap that bit R8 + R11), so we use `window.confirm` instead. The title
 *   and message are joined with a blank line because `window.confirm` only
 *   takes a single string.
 *
 * Always returns a boolean so callers can write a single `if (await
 * confirm(...))` branch and not worry about the platform.
 *
 * @param title - Dialog title (shown in Alert; concatenated into message on web)
 * @param message - Dialog body
 * @param confirmLabel - Label for the confirm button (default "OK")
 * @param destructive - On native, marks the confirm button as `destructive`
 *   (iOS shows it in red). Ignored on web — `window.confirm` has no styling.
 */
export async function confirm(
  title: string,
  message: string,
  confirmLabel: string = 'OK',
  destructive: boolean = false,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    // Defensive: if for some reason `window` or `window.confirm` is gone
    // (SSR, a sandboxed iframe, a stripped-down test environment), treat
    // the user as if they cancelled. Better to do nothing than to call
    // a destructive action without confirmation.
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
      return false;
    }
    return window.confirm(`${title}\n\n${message}`);
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      // `onDismiss` only fires on Android when the user taps outside the
      // alert; iOS doesn't allow that gesture. Either way, treat "no
      // explicit choice" as a cancel so the promise always settles.
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
