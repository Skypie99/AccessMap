/**
 * SignInScreen — A11Y-203 guard: client-side validation errors are ANNOUNCED.
 *
 * The defect this pins (3.3.1 + 4.1.3): the two client validation branches set
 * `validationError` and returned. The error row renders with
 * `accessibilityLiveRegion="assertive"` — which is Android-only in RN — and on
 * web the row node-inserts, which browser screen readers don't reliably speak.
 * So iOS VoiceOver and web SR users who mistyped an email or short password
 * heard nothing at the front door of the app, while the SERVER-failure branch
 * announced explicitly (F65). These tests assert the explicit announce fires
 * for every validation branch, exactly as it already did for server errors.
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
// jest.mock calls are hoisted above imports, so the component-under-test can
// be imported here with the rest (keeps import/first clean).
import SignInScreen from '../SignInScreen';

jest.mock('@/lib/supabase', () => ({
  signInWithEmail: jest.fn(async () => ({ error: null })),
  signUpWithEmail: jest.fn(async () => ({ error: null })),
}));

jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));
jest.mock('@/lib/confirm', () => ({ notify: jest.fn() }));

// PrivacyScreen pulls in the full policy surface — irrelevant here.
jest.mock('@/screens/PrivacyScreen', () => () => null);
jest.mock('@/components/LogoMark', () => () => null);

jest.mock('@/theme/ThemeContext', () => ({
  useColor: jest.fn(() => ({
    scheme: 'light',
    brand: '#1466E0',
    text: '#333',
    textStrong: '#222',
    textMuted: '#666',
    surface: '#fff',
    surfaceMuted: '#f7f9fc',
    dangerFg: '#b3261e',
    dangerBg: '#fdecea',
  })),
}));

describe('A11Y-203 guard — client validation errors are announced to AT', () => {
  let announceSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    announceSpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  });

  afterEach(() => {
    announceSpy.mockRestore();
  });

  it('announces the invalid-email error when submitting a bad email', () => {
    const { getByLabelText, getByText } = render(<SignInScreen />);

    fireEvent.changeText(getByLabelText('Email address'), 'not-an-email');
    fireEvent.changeText(getByLabelText('Password'), 'longenough');
    fireEvent.press(getByLabelText('Sign in'));

    // The row renders for sighted users…
    expect(getByText('Please enter a valid email address.')).toBeTruthy();
    // …and the SAME string is spoken (iOS VO / web live-region shim path).
    expect(announceSpy).toHaveBeenCalledWith('Please enter a valid email address.');
  });

  it('announces the short-password error when submitting a short password', () => {
    const { getByLabelText, getByText } = render(<SignInScreen />);

    fireEvent.changeText(getByLabelText('Email address'), 'sky@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'tiny');
    fireEvent.press(getByLabelText('Sign in'));

    expect(getByText('Password must be at least 6 characters.')).toBeTruthy();
    expect(announceSpy).toHaveBeenCalledWith('Password must be at least 6 characters.');
  });

  it('sign-up path announces validation errors too (same branches)', () => {
    const { getByLabelText, getByText } = render(<SignInScreen />);

    fireEvent.changeText(getByLabelText('Email address'), 'nope');
    fireEvent.changeText(getByLabelText('Password'), 'longenough');
    fireEvent.press(getByLabelText('Create account'));

    expect(getByText('Please enter a valid email address.')).toBeTruthy();
    expect(announceSpy).toHaveBeenCalledWith('Please enter a valid email address.');
  });
});
