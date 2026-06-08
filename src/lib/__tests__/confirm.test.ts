/**
 * Tests for the platform-aware confirm() helper.
 *
 * The helper exists because react-native-web treats Alert.alert as a no-op
 * (the same trap that bit R8 + R11). Settings sign-out routes through this,
 * so a regression here would silently break sign-out on the web build —
 * worth a focused test even though the helper itself is small.
 *
 * We re-require the module after mutating Platform.OS so each test gets a
 * fresh import that sees the platform we want. jest.resetModules() in the
 * beforeEach is the cleanest way to make that work.
 */

import { Alert, Platform } from 'react-native';

describe('confirm', () => {
  // Save the real Platform.OS so we can restore it after each test —
  // other suites in this repo (notably directions.test.ts) read Platform.OS
  // indirectly and would get confused if we left it on 'web'.
  const realPlatformOS = Platform.OS;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    // Restore Platform.OS. `as any` because the union type is read-only.
    (Platform as any).OS = realPlatformOS;
    jest.restoreAllMocks();
  });

  describe('on web', () => {
    // Save the real window.confirm (might be undefined in jsdom) so each test
    // can install a fresh mock and the afterEach can restore it cleanly.
    let originalWebConfirm: typeof window.confirm | undefined;

    beforeEach(() => {
      (Platform as any).OS = 'web';
      originalWebConfirm = window.confirm;
    });

    afterEach(() => {
      // Direct assign instead of spyOn — `confirm` isn't enumerable on jsdom's
      // window, which makes spyOn fail with "Property does not exist".
      if (originalWebConfirm === undefined) {
        delete (window as any).confirm;
      } else {
        window.confirm = originalWebConfirm;
      }
    });

    it('resolves true when window.confirm returns true', async () => {
      const mockConfirm = jest.fn(() => true);
      (window as any).confirm = mockConfirm;

      const { confirm } = require('../confirm');
      const result = await confirm('Sign out?', 'Are you sure?', 'Sign out', true);

      expect(result).toBe(true);
      expect(mockConfirm).toHaveBeenCalledWith('Sign out?\n\nAre you sure?');
    });

    it('resolves false when window.confirm returns false', async () => {
      (window as any).confirm = jest.fn(() => false);

      const { confirm } = require('../confirm');
      const result = await confirm('Title', 'Body');

      expect(result).toBe(false);
    });

    it('resolves false defensively when window.confirm is unavailable', async () => {
      // Simulate a stripped-down environment (SSR-ish) where window.confirm
      // doesn't exist. Better to silently cancel than to fire a destructive
      // action with no user confirmation.
      const originalConfirm = window.confirm;
      delete (window as any).confirm;

      try {
        const { confirm } = require('../confirm');
        const result = await confirm('Title', 'Body');
        expect(result).toBe(false);
      } finally {
        window.confirm = originalConfirm;
      }
    });
  });

  describe('on iOS', () => {
    beforeEach(() => {
      (Platform as any).OS = 'ios';
    });

    it('resolves true when the confirm button is pressed', async () => {
      // Capture the buttons array Alert.alert is called with, then fire
      // the confirm button's onPress to simulate the user tapping it.
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      const { confirm } = require('../confirm');
      const pending = confirm('Sign out?', 'Are you sure?', 'Sign out', true);

      // Alert.alert(title, message, buttons, options)
      const buttons = alertSpy.mock.calls[0]![2] as {
        text: string;
        style?: string;
        onPress?: () => void;
      }[];

      // The confirm button is the destructive one ("Sign out").
      const confirmButton = buttons.find((b) => b.text === 'Sign out');
      expect(confirmButton?.style).toBe('destructive');
      confirmButton?.onPress?.();

      await expect(pending).resolves.toBe(true);
    });

    it('resolves false when the cancel button is pressed', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      const { confirm } = require('../confirm');
      const pending = confirm('Title', 'Body');

      const buttons = alertSpy.mock.calls[0]![2] as {
        text: string;
        style?: string;
        onPress?: () => void;
      }[];
      const cancelButton = buttons.find((b) => b.text === 'Cancel');
      expect(cancelButton?.style).toBe('cancel');
      cancelButton?.onPress?.();

      await expect(pending).resolves.toBe(false);
    });

    it('resolves false on Android dismiss (tap outside the alert)', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      const { confirm } = require('../confirm');
      const pending = confirm('Title', 'Body');

      // Alert.alert(title, message, buttons, options)
      const options = alertSpy.mock.calls[0]![3] as {
        cancelable?: boolean;
        onDismiss?: () => void;
      };
      expect(options.cancelable).toBe(true);
      options.onDismiss?.();

      await expect(pending).resolves.toBe(false);
    });

    it('uses non-destructive style by default', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      const { confirm } = require('../confirm');
      const pending = confirm('Title', 'Body');

      const buttons = alertSpy.mock.calls[0]![2] as {
        text: string;
        style?: string;
        onPress?: () => void;
      }[];
      const confirmButton = buttons.find((b) => b.text === 'OK');
      expect(confirmButton?.style).toBe('default');

      // Resolve the promise so Jest doesn't leak an open handle.
      confirmButton?.onPress?.();
      await pending;
    });
  });
});
