/**
 * useKeyboardVisible — is the soft keyboard on screen right now?
 *
 * Added for the sheet pull-to-dismiss gate (SheetPull): while the user is
 * typing, a downward drag is far more likely to be an attempt to dismiss the
 * KEYBOARD than the sheet, and dismissing the whole form under them would be
 * the worst possible reading of that gesture. So the pan is disabled while the
 * keyboard is up, and the first drag drops the keyboard instead
 * (keyboardDismissMode="on-drag"); a second drag then dismisses the sheet.
 *
 * iOS fires the `Will` events (they lead the animation, so the gate closes
 * before the keyboard is actually up); Android only reliably fires `Did`.
 * Subscribing to the platform's own pair rather than all four avoids a
 * double-set on iOS.
 */
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

export default useKeyboardVisible;
