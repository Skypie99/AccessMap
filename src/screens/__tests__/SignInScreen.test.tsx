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
import { AccessibilityInfo, StyleSheet } from 'react-native';
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

// The REAL light palette, not a hand-written subset. The subset this replaces
// predated the `Input` primitive adopting this screen and was missing every
// token the primitive reaches for, so the fields rendered with undefined inks
// and the suite quietly stopped testing what ships.
jest.mock('@/theme/ThemeContext', () => {
  const { color } = jest.requireActual('@/theme');
  return { useColor: () => color };
});

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

/**
 * 2026-08-22 — the form moved onto the `Input` primitive, and with it the
 * question of WHERE an error is shown. A mistyped email is the email field's
 * problem; a server refusal is the form's. Shown once, in the place that can
 * act on it, and announced either way (A11Y-203 is untouched by the move).
 */
describe('the error lands on the field that caused it', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  });

  it('the invalid email is attached to the email field, not to the form', () => {
    const u = render(<SignInScreen />);
    fireEvent.changeText(u.getByLabelText('Email address'), 'not-an-email');
    fireEvent.changeText(u.getByLabelText('Password'), 'longenough');
    fireEvent.press(u.getByLabelText('Sign in'));

    // The primitive puts the message in the FIELD's own hint, which is what a
    // screen reader hears when the cursor lands back on the box to fix it.
    expect(u.getByLabelText('Email address').props.accessibilityHint).toBe(
      'Please enter a valid email address.',
    );
    // …and the password field is untouched: it did nothing wrong.
    expect(u.getByLabelText('Password').props.accessibilityHint).toBe('At least 6 characters');
    // Exactly one copy of the message on screen.
    expect(u.getAllByText('Please enter a valid email address.')).toHaveLength(1);
  });

  it('the short password is attached to the password field', () => {
    const u = render(<SignInScreen />);
    fireEvent.changeText(u.getByLabelText('Email address'), 'sky@example.com');
    fireEvent.changeText(u.getByLabelText('Password'), 'tiny');
    fireEvent.press(u.getByLabelText('Sign in'));

    expect(u.getByLabelText('Password').props.accessibilityHint).toBe(
      'Password must be at least 6 characters.',
    );
    expect(u.getByLabelText('Email address').props.accessibilityHint).toBe(
      'Enter the email you signed up with',
    );
  });
});

describe('the show/hide toggle survived the move into the field', () => {
  it('is still a 44pt labelled control, now inside the field row', () => {
    const u = render(<SignInScreen />);
    const toggle = u.getByLabelText('Show password');
    expect(StyleSheet.flatten(toggle.props.style).minHeight).toBe(44);
    expect(StyleSheet.flatten(toggle.props.style).width).toBe(44);
    fireEvent.press(toggle);
    expect(u.getByLabelText('Hide password')).toBeTruthy();
  });
});
