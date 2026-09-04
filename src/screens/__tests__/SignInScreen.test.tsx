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
import { render, fireEvent, waitFor, configure } from '@testing-library/react-native';
// jest.mock calls are hoisted above imports, so the component-under-test can
// be imported here with the rest (keeps import/first clean).
import SignInScreen from '../SignInScreen';
import {
  loadAccountDeletionReceipt,
  getAccountDeletionStatus,
  clearAccountDeletionReceipt,
  type AccountDeletionReceipt,
  type AccountDeletionStatus,
} from '@/lib/accountDeletionReceipt';
import { confirm as confirmMock } from '@/lib/confirm';

// Matches useComments.test.ts's precedent: the Prompt B B2-R suite below
// chains two awaited mock resolutions per test, and RTL's 1000ms default
// asyncUtilTimeout was intermittently too tight under full-suite load.
configure({ asyncUtilTimeout: 10_000 });

jest.mock('@/lib/supabase', () => ({
  signInWithEmail: jest.fn(async () => ({ error: null })),
  signUpWithEmail: jest.fn(async () => ({ error: null })),
}));

jest.mock('@/lib/analytics', () => ({ track: jest.fn() }));
jest.mock('@/lib/confirm', () => ({ notify: jest.fn(), confirm: jest.fn() }));
jest.mock('@/lib/accountDeletionReceipt', () => ({
  loadAccountDeletionReceipt: jest.fn(),
  getAccountDeletionStatus: jest.fn(),
  clearAccountDeletionReceipt: jest.fn(),
}));

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

/**
 * Prompt B B2-R — SignInScreen deletion-receipt unavailable-state repair.
 *
 * The defect: when the mount-time status check failed, the ONLY offered
 * action was an unconfirmed "Dismiss unavailable receipt" — a transient
 * outage invited discarding the local recovery capability for a deletion
 * whose true state was unknown, and the body could claim "this device has a
 * deletion receipt" even when no receipt object had ever loaded (a
 * SecureStore/index rejection can set deletionStatusUnavailable before any
 * receipt exists). This repair adds an in-place Check status retry, gates
 * the dismiss control on an actually-held receipt, and requires confirm()
 * before that dismiss runs. Backend/receipt-format/security semantics are
 * unchanged — see accountDeletionReceipt.test.ts and confirm.test.ts for
 * those unchanged contracts.
 */
describe('Prompt B B2-R — account-deletion receipt unavailable-state repair', () => {
  const RECEIPT: AccountDeletionReceipt = {
    operationId: '11111111-1111-4111-8111-111111111111',
    receiptSecret: 'a'.repeat(64),
    subjectId: 'user-1',
    createdAt: '2026-08-01T00:00:00.000Z',
  };
  const REQUESTED_STATUS: AccountDeletionStatus = {
    status: 'REQUESTED',
    requestedAt: '2026-08-01T00:00:00.000Z',
    completedAt: null,
  };
  const COMPLETE_STATUS: AccountDeletionStatus = {
    status: 'COMPLETE',
    requestedAt: '2026-08-01T00:00:00.000Z',
    completedAt: '2026-08-02T00:00:00.000Z',
  };
  const UNAVAILABLE_WITH_RECEIPT =
    "This device has a deletion receipt, but status is temporarily unavailable.";
  const UNAVAILABLE_NO_RECEIPT = 'Account deletion status is temporarily unavailable.';

  const mockLoad = loadAccountDeletionReceipt as jest.Mock;
  const mockStatus = getAccountDeletionStatus as jest.Mock;
  const mockClear = clearAccountDeletionReceipt as jest.Mock;
  const mockConfirm = confirmMock as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  });

  it('loaded receipt + outage: shows the receipt-truthful unavailable body, Check status, and targeted dismiss', async () => {
    mockLoad.mockResolvedValue(RECEIPT);
    mockStatus.mockRejectedValue(new Error('network down'));

    const u = render(<SignInScreen />);
    await waitFor(() => expect(u.getByText(UNAVAILABLE_WITH_RECEIPT)).toBeTruthy());
    expect(u.getByLabelText('Check account deletion status')).toBeTruthy();
    expect(
      u.getByLabelText('Dismiss unavailable receipt. Account deletion status is unavailable.'),
    ).toBeTruthy();
  });

  it('retry busies immediately, and a continued failure retains the receipt and unavailable state', async () => {
    mockLoad.mockResolvedValue(RECEIPT);
    mockStatus.mockRejectedValue(new Error('network down'));

    const u = render(<SignInScreen />);
    await waitFor(() => expect(u.getByText(UNAVAILABLE_WITH_RECEIPT)).toBeTruthy());

    // fireEvent.press runs the handler synchronously up to its first await,
    // and setCheckingDeletionStatus(true) is the first statement in
    // refreshDeletionStatus, so the busy/disabled state is visible immediately.
    fireEvent.press(u.getByLabelText('Check account deletion status'));
    expect(u.getByText('Checking…')).toBeTruthy();
    expect(
      u.getByLabelText('Check account deletion status').props.accessibilityState.disabled,
    ).toBe(true);

    await waitFor(() => expect(mockStatus).toHaveBeenCalledTimes(2));
    expect(u.getByText(UNAVAILABLE_WITH_RECEIPT)).toBeTruthy();
    expect(
      u.getByLabelText('Dismiss unavailable receipt. Account deletion status is unavailable.'),
    ).toBeTruthy();
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('a later successful retry clears unavailable, shows the real status, and removes the dismiss control', async () => {
    mockLoad.mockResolvedValue(RECEIPT);
    mockStatus.mockResolvedValueOnce(REQUESTED_STATUS);

    const u = render(<SignInScreen />);
    await waitFor(() =>
      expect(
        u.getByText('Your deletion request was received and is waiting to begin.'),
      ).toBeTruthy(),
    );
    expect(u.queryByText(UNAVAILABLE_WITH_RECEIPT)).toBeNull();
    expect(
      u.queryByLabelText('Dismiss unavailable receipt. Account deletion status is unavailable.'),
    ).toBeNull();
  });

  it('cancelling the confirmation leaves the receipt, status, and card untouched', async () => {
    mockLoad.mockResolvedValue(RECEIPT);
    mockStatus.mockRejectedValue(new Error('network down'));
    mockConfirm.mockResolvedValueOnce(false);

    const u = render(<SignInScreen />);
    const dismiss = await u.findByLabelText(
      'Dismiss unavailable receipt. Account deletion status is unavailable.',
    );

    fireEvent.press(dismiss);
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect(mockClear).not.toHaveBeenCalled();
    // The card, receipt, and dismiss control are all still there — a cancel
    // is a true no-op.
    expect(u.getByText(UNAVAILABLE_WITH_RECEIPT)).toBeTruthy();
    expect(
      u.getByLabelText('Dismiss unavailable receipt. Account deletion status is unavailable.'),
    ).toBeTruthy();
  });

  it('confirming the dismissal clears exactly the displayed receipt, once, then clears the local card', async () => {
    mockLoad.mockResolvedValue(RECEIPT);
    mockStatus.mockRejectedValue(new Error('network down'));
    mockConfirm.mockResolvedValueOnce(true);

    const u = render(<SignInScreen />);
    const dismiss = await u.findByLabelText(
      'Dismiss unavailable receipt. Account deletion status is unavailable.',
    );

    fireEvent.press(dismiss);
    await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
    expect(mockClear).toHaveBeenCalledWith(RECEIPT);
    await waitFor(() => expect(u.queryByText(UNAVAILABLE_WITH_RECEIPT)).toBeNull());
  });

  it('COMPLETE keeps its own direct, unconfirmed dismissal — the new confirm() gate does not apply to it', async () => {
    mockLoad.mockResolvedValue(RECEIPT);
    mockStatus.mockResolvedValue(COMPLETE_STATUS);

    const u = render(<SignInScreen />);
    const dismiss = await u.findByLabelText('Dismiss confirmation');
    expect(u.getByText('Your account and associated content have been deleted.')).toBeTruthy();

    fireEvent.press(dismiss);
    await waitFor(() => expect(mockClear).toHaveBeenCalledTimes(1));
    expect(mockClear).toHaveBeenCalledWith(RECEIPT);
    // No new confirmation was introduced on this existing, already-safe path.
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('no loaded receipt: retry-only, no false "has a receipt" claim, and no targeted dismiss', async () => {
    // Case B (B2-R): the receipt load itself rejects, so
    // deletionStatusUnavailable is set before any receipt object exists.
    mockLoad.mockRejectedValueOnce(new Error('SecureStore unavailable'));

    const u = render(<SignInScreen />);
    await waitFor(() => expect(u.getByText(UNAVAILABLE_NO_RECEIPT)).toBeTruthy());
    expect(u.queryByText(UNAVAILABLE_WITH_RECEIPT)).toBeNull();
    expect(
      u.queryByLabelText('Dismiss unavailable receipt. Account deletion status is unavailable.'),
    ).toBeNull();
    expect(u.getByLabelText('Check account deletion status')).toBeTruthy();
    expect(mockStatus).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();

    // Retry resolves to "no receipt at all" — the whole card clears, no
    // status call is made, and no clear/clear-all runs.
    mockLoad.mockResolvedValueOnce(null);
    fireEvent.press(u.getByLabelText('Check account deletion status'));
    await waitFor(() => expect(u.queryByText(UNAVAILABLE_NO_RECEIPT)).toBeNull());
    expect(u.queryByLabelText('Check account deletion status')).toBeNull();
    expect(mockStatus).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
  });
});
