import React from 'react';
import { act, render } from '@testing-library/react-native';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from '../auth';
import { supabase } from '../supabase';
import {
  getPushEnabled,
  requestExpoPushToken,
  savePushToken,
  showPushExplanation,
} from '../pushNotifications';

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock('../pushNotifications', () => ({
  getPushEnabled: jest.fn(),
  requestExpoPushToken: jest.fn(),
  savePushToken: jest.fn(),
  showPushExplanation: jest.fn(),
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
const mockGetPushEnabled = getPushEnabled as jest.Mock;
const mockRequestExpoPushToken = requestExpoPushToken as jest.Mock;
const mockSavePushToken = savePushToken as jest.Mock;
const mockShowPushExplanation = showPushExplanation as jest.Mock;
const mockUnsubscribe = jest.fn();
let mockAuthCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;

type AuthValue = ReturnType<typeof useAuth>;
let latestAuth: AuthValue | null = null;

function Probe() {
  latestAuth = useAuth();
  return null;
}

const sessionFor = (id: string) => ({ user: { id } }) as Session;

/** A promise whose completion is controlled by the test, never by elapsed time. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function resolveDeferred<T>(pending: ReturnType<typeof deferred<T>>, value: T) {
  await act(async () => {
    pending.resolve(value);
    await pending.promise;
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function emit(event: AuthChangeEvent, session: Session | null) {
  await act(async () => {
    mockAuthCallback?.(event, session);
    await Promise.resolve();
    await Promise.resolve();
  });
}

function currentAuth(): AuthValue {
  if (!latestAuth) throw new Error('Auth probe has not rendered');
  return latestAuth;
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockOnAuthStateChange.mockReset();
  mockGetPushEnabled.mockReset();
  mockRequestExpoPushToken.mockReset();
  mockSavePushToken.mockReset();
  mockShowPushExplanation.mockReset();
  mockUnsubscribe.mockReset();
  mockAuthCallback = null;
  latestAuth = null;
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockOnAuthStateChange.mockImplementation(
    (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
      mockAuthCallback = callback;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    },
  );
  mockGetPushEnabled.mockResolvedValue(false);
  mockRequestExpoPushToken.mockResolvedValue('ExponentPushToken[test]');
  mockSavePushToken.mockResolvedValue(undefined);
  mockShowPushExplanation.mockResolvedValue(true);
});

describe('AuthProvider — post-sign-in push sequencing', () => {
  it('queues education on SIGNED_IN without presenting from the auth callback', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);

    await emit('SIGNED_IN', sessionFor('user-1'));

    expect(currentAuth().pushEducationPending).toBe(true);
    expect(mockShowPushExplanation).not.toHaveBeenCalled();
    expect(mockRequestExpoPushToken).not.toHaveBeenCalled();
  });

  it('ignores duplicate SIGNED_IN events for the active cycle', async () => {
    const session = sessionFor('user-1');
    render(<AuthProvider><Probe /></AuthProvider>);

    await emit('SIGNED_IN', session);
    await emit('SIGNED_IN', session);

    expect(mockGetPushEnabled).toHaveBeenCalledTimes(1);
    expect(currentAuth().pushEducationPending).toBe(true);
  });

  it('silently refreshes an already-enabled user without education', async () => {
    mockGetPushEnabled.mockResolvedValue(true);
    render(<AuthProvider><Probe /></AuthProvider>);

    await emit('SIGNED_IN', sessionFor('user-1'));

    expect(currentAuth().pushEducationPending).toBe(false);
    expect(mockShowPushExplanation).not.toHaveBeenCalled();
    expect(mockRequestExpoPushToken).toHaveBeenCalledTimes(1);
    expect(mockSavePushToken).toHaveBeenCalledWith('user-1', 'ExponentPushToken[test]');
  });

  it('keeps INITIAL_SESSION silent and treats a duplicate SIGNED_IN as handled', async () => {
    mockGetPushEnabled.mockResolvedValue(true);
    const session = sessionFor('user-1');
    render(<AuthProvider><Probe /></AuthProvider>);

    await emit('INITIAL_SESSION', session);
    await emit('SIGNED_IN', session);

    expect(currentAuth().pushEducationPending).toBe(false);
    expect(mockShowPushExplanation).not.toHaveBeenCalled();
    expect(mockRequestExpoPushToken).toHaveBeenCalledTimes(1);
  });

  it('atomically consumes rapid attempts and runs the existing token path once', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await emit('SIGNED_IN', sessionFor('user-1'));

    await act(async () => {
      await Promise.all([
        currentAuth().consumePendingPushEducation(),
        currentAuth().consumePendingPushEducation(),
      ]);
    });

    expect(currentAuth().pushEducationPending).toBe(false);
    expect(mockShowPushExplanation).toHaveBeenCalledTimes(1);
    expect(mockRequestExpoPushToken).toHaveBeenCalledTimes(1);
    expect(mockSavePushToken).toHaveBeenCalledTimes(1);
  });

  it('skips duplicate education when Settings enabled push while pending', async () => {
    mockGetPushEnabled.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<AuthProvider><Probe /></AuthProvider>);
    await emit('SIGNED_IN', sessionFor('user-1'));

    await act(async () => {
      await currentAuth().consumePendingPushEducation();
    });

    expect(mockShowPushExplanation).not.toHaveBeenCalled();
    expect(mockRequestExpoPushToken).not.toHaveBeenCalled();
  });

  it('invalidates pending and in-flight work on sign-out, then allows a new cycle', async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    const session = sessionFor('user-1');
    await emit('SIGNED_IN', session);
    await emit('SIGNED_OUT', null);

    await act(async () => {
      await currentAuth().consumePendingPushEducation();
    });
    expect(mockShowPushExplanation).not.toHaveBeenCalled();
    expect(currentAuth().pushEducationPending).toBe(false);

    await emit('SIGNED_IN', session);
    expect(currentAuth().pushEducationPending).toBe(true);
    expect(mockGetPushEnabled).toHaveBeenCalledTimes(2);
  });

  it('ignores a preference read that resolves after sign-out', async () => {
    const preference = deferred<boolean>();
    mockGetPushEnabled.mockReturnValueOnce(preference.promise);
    render(<AuthProvider><Probe /></AuthProvider>);

    await emit('SIGNED_IN', sessionFor('user-1'));
    expect(mockGetPushEnabled).toHaveBeenCalledWith('user-1');

    await emit('SIGNED_OUT', null);
    await resolveDeferred(preference, false);

    expect(currentAuth().pushEducationPending).toBe(false);
    expect(mockShowPushExplanation).not.toHaveBeenCalled();
    expect(mockRequestExpoPushToken).not.toHaveBeenCalled();
    expect(mockSavePushToken).not.toHaveBeenCalled();
  });

  it('does not save a token whose request resolves after sign-out', async () => {
    const token = deferred<string | null>();
    mockGetPushEnabled.mockResolvedValue(true);
    mockRequestExpoPushToken.mockReturnValueOnce(token.promise);
    render(<AuthProvider><Probe /></AuthProvider>);

    await emit('SIGNED_IN', sessionFor('user-1'));
    expect(mockRequestExpoPushToken).toHaveBeenCalledTimes(1);

    await emit('SIGNED_OUT', null);
    await resolveDeferred(token, 'ExponentPushToken[stale]');

    expect(currentAuth().pushEducationPending).toBe(false);
    expect(mockSavePushToken).not.toHaveBeenCalled();
    expect(mockShowPushExplanation).not.toHaveBeenCalled();
  });

  it('keeps User A preference work from contaminating User B', async () => {
    const preferenceA = deferred<boolean>();
    const preferenceB = deferred<boolean>();
    mockGetPushEnabled.mockImplementation((userId: string) =>
      userId === 'user-a' ? preferenceA.promise : preferenceB.promise,
    );
    mockShowPushExplanation.mockResolvedValue(false);
    render(<AuthProvider><Probe /></AuthProvider>);

    await emit('SIGNED_IN', sessionFor('user-a'));
    await emit('SIGNED_IN', sessionFor('user-b'));

    await resolveDeferred(preferenceA, false);
    expect(currentAuth().user?.id).toBe('user-b');
    expect(currentAuth().pushEducationPending).toBe(false);

    await resolveDeferred(preferenceB, false);
    expect(currentAuth().pushEducationPending).toBe(true);

    await act(async () => {
      await currentAuth().consumePendingPushEducation();
    });

    expect(mockShowPushExplanation).toHaveBeenCalledTimes(1);
    expect(mockRequestExpoPushToken).not.toHaveBeenCalled();
    expect(mockSavePushToken).not.toHaveBeenCalled();
  });

  it('does not present education when its eligibility read resolves after sign-out', async () => {
    const eligibility = deferred<boolean>();
    mockGetPushEnabled
      .mockResolvedValueOnce(false)
      .mockReturnValueOnce(eligibility.promise);
    render(<AuthProvider><Probe /></AuthProvider>);
    await emit('SIGNED_IN', sessionFor('user-a'));

    let consume!: Promise<void>;
    await act(async () => {
      consume = currentAuth().consumePendingPushEducation();
      await Promise.resolve();
    });
    await emit('SIGNED_OUT', null);
    await resolveDeferred(eligibility, false);
    await act(async () => consume);

    expect(mockShowPushExplanation).not.toHaveBeenCalled();
    expect(mockRequestExpoPushToken).not.toHaveBeenCalled();
    expect(mockSavePushToken).not.toHaveBeenCalled();
  });

  it('does not present User A education after User B replaces the auth cycle', async () => {
    const eligibilityA = deferred<boolean>();
    mockGetPushEnabled
      .mockResolvedValueOnce(false)
      .mockReturnValueOnce(eligibilityA.promise)
      .mockResolvedValue(false);
    render(<AuthProvider><Probe /></AuthProvider>);
    await emit('SIGNED_IN', sessionFor('user-a'));

    let consumeA!: Promise<void>;
    await act(async () => {
      consumeA = currentAuth().consumePendingPushEducation();
      await Promise.resolve();
    });
    await emit('SIGNED_IN', sessionFor('user-b'));
    await resolveDeferred(eligibilityA, false);
    await act(async () => consumeA);

    expect(currentAuth().user?.id).toBe('user-b');
    expect(currentAuth().pushEducationPending).toBe(true);
    expect(mockShowPushExplanation).not.toHaveBeenCalled();
    expect(mockRequestExpoPushToken).not.toHaveBeenCalled();
    expect(mockSavePushToken).not.toHaveBeenCalled();
  });

  it('does not continue token work when an open explanation resolves after sign-out', async () => {
    const explanation = deferred<boolean>();
    mockGetPushEnabled.mockResolvedValue(false);
    mockShowPushExplanation.mockReturnValueOnce(explanation.promise);
    render(<AuthProvider><Probe /></AuthProvider>);
    await emit('SIGNED_IN', sessionFor('user-a'));

    let consume!: Promise<void>;
    await act(async () => {
      consume = currentAuth().consumePendingPushEducation();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockShowPushExplanation).toHaveBeenCalledTimes(1);

    await emit('SIGNED_OUT', null);
    await resolveDeferred(explanation, true);
    await act(async () => consume);

    expect(mockRequestExpoPushToken).not.toHaveBeenCalled();
    expect(mockSavePushToken).not.toHaveBeenCalled();
  });

  it('does not continue User A token work when User B arrives during the explanation', async () => {
    const explanationA = deferred<boolean>();
    mockGetPushEnabled.mockResolvedValue(false);
    mockShowPushExplanation
      .mockReturnValueOnce(explanationA.promise)
      .mockResolvedValue(false);
    render(<AuthProvider><Probe /></AuthProvider>);
    await emit('SIGNED_IN', sessionFor('user-a'));

    let consumeA!: Promise<void>;
    await act(async () => {
      consumeA = currentAuth().consumePendingPushEducation();
      await Promise.resolve();
      await Promise.resolve();
    });
    await emit('SIGNED_IN', sessionFor('user-b'));
    await resolveDeferred(explanationA, true);
    await act(async () => consumeA);

    expect(currentAuth().user?.id).toBe('user-b');
    expect(currentAuth().pushEducationPending).toBe(true);
    expect(mockRequestExpoPushToken).not.toHaveBeenCalled();
    expect(mockSavePushToken).not.toHaveBeenCalled();

    await act(async () => {
      await currentAuth().consumePendingPushEducation();
    });
    expect(mockShowPushExplanation).toHaveBeenCalledTimes(2);
    expect(mockRequestExpoPushToken).not.toHaveBeenCalled();
  });

  it('does not present education after the provider unmounts with eligibility in flight', async () => {
    const eligibility = deferred<boolean>();
    mockGetPushEnabled
      .mockResolvedValueOnce(false)
      .mockReturnValueOnce(eligibility.promise);
    const screen = render(<AuthProvider><Probe /></AuthProvider>);
    await emit('SIGNED_IN', sessionFor('user-a'));

    let consume!: Promise<void>;
    await act(async () => {
      consume = currentAuth().consumePendingPushEducation();
      await Promise.resolve();
    });
    screen.unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);

    await resolveDeferred(eligibility, false);
    await act(async () => consume);

    expect(mockShowPushExplanation).not.toHaveBeenCalled();
    expect(mockRequestExpoPushToken).not.toHaveBeenCalled();
    expect(mockSavePushToken).not.toHaveBeenCalled();
  });

  it('spends Not now once and offers education again only in a later sign-in cycle', async () => {
    const session = sessionFor('user-1');
    mockShowPushExplanation.mockResolvedValue(false);
    render(<AuthProvider><Probe /></AuthProvider>);

    await emit('SIGNED_IN', session);
    await act(async () => {
      await currentAuth().consumePendingPushEducation();
      await currentAuth().consumePendingPushEducation();
    });

    expect(currentAuth().pushEducationPending).toBe(false);
    expect(mockShowPushExplanation).toHaveBeenCalledTimes(1);
    expect(mockRequestExpoPushToken).not.toHaveBeenCalled();

    await emit('SIGNED_OUT', null);
    await emit('SIGNED_IN', session);
    expect(currentAuth().pushEducationPending).toBe(true);

    await act(async () => {
      await currentAuth().consumePendingPushEducation();
    });
    expect(mockShowPushExplanation).toHaveBeenCalledTimes(2);
    expect(mockRequestExpoPushToken).not.toHaveBeenCalled();
    expect(mockSavePushToken).not.toHaveBeenCalled();
  });
});
