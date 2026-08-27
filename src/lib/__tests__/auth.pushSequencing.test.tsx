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
  jest.clearAllMocks();
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
});
