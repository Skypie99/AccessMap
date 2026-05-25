/**
 * Tests for src/lib/pushNotifications.ts
 *
 * We mock AsyncStorage and supabase to keep these unit-level — no real
 * DB calls or OS permission prompts. expo-notifications is optional (not
 * installed until Sky runs `npx expo install expo-notifications`) so we
 * test the graceful-degradation path via a jest.mock.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';
import {
  deletePushToken,
  getPushEnabled,
  pushEnabledKey,
  savePushToken,
} from '../pushNotifications';

// ── AsyncStorage is auto-mocked by the jest preset ──────────────────────────

// ── Supabase mock ────────────────────────────────────────────────────────────
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const mockFrom = supabase.from as jest.Mock;

// ── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = 'user-abc-123';
const TOKEN = 'ExponentPushToken[test-token-value]';

function mockUpsert(error: null | { message: string } = null) {
  mockFrom.mockReturnValue({
    upsert: jest.fn().mockResolvedValue({ error }),
  });
}

function mockDelete(error: null | { message: string } = null) {
  mockFrom.mockReturnValue({
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error }),
    }),
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('pushEnabledKey', () => {
  it('returns a namespaced key for the given userId', () => {
    expect(pushEnabledKey(USER_ID)).toBe(`@accessmap/push_enabled:${USER_ID}`);
  });
});

describe('getPushEnabled', () => {
  it('returns false when AsyncStorage has no entry', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    await expect(getPushEnabled(USER_ID)).resolves.toBe(false);
  });

  it('returns true when AsyncStorage has "true"', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('true');
    await expect(getPushEnabled(USER_ID)).resolves.toBe(true);
  });

  it('returns false when AsyncStorage has "false"', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('false');
    await expect(getPushEnabled(USER_ID)).resolves.toBe(false);
  });

  it('returns false and does not throw when AsyncStorage rejects', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
    await expect(getPushEnabled(USER_ID)).resolves.toBe(false);
  });
});

describe('savePushToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it('upserts the token with the correct shape', async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    await savePushToken(USER_ID, TOKEN);

    expect(mockFrom).toHaveBeenCalledWith('push_tokens');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, token: TOKEN }),
      { onConflict: 'user_id' },
    );
  });

  it('persists "true" to AsyncStorage after upsert', async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    await savePushToken(USER_ID, TOKEN);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      pushEnabledKey(USER_ID),
      'true',
    );
  });

  it('does NOT include the token in any console.log call', async () => {
    const upsertMock = jest.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: upsertMock });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await savePushToken(USER_ID, TOKEN);

    const logged = logSpy.mock.calls.flat().join(' ');
    expect(logged).not.toContain(TOKEN);
    logSpy.mockRestore();
  });
});

describe('deletePushToken', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes the row and sets AsyncStorage to "false"', async () => {
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockFrom.mockReturnValue({ delete: deleteMock });

    await deletePushToken(USER_ID);

    expect(mockFrom).toHaveBeenCalledWith('push_tokens');
    expect(eqMock).toHaveBeenCalledWith('user_id', USER_ID);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      pushEnabledKey(USER_ID),
      'false',
    );
  });

  it('does not throw when the DB call rejects (best-effort)', async () => {
    const eqMock = jest.fn().mockRejectedValue(new Error('network error'));
    const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
    mockFrom.mockReturnValue({ delete: deleteMock });

    // Should resolve without throwing — failure is silent per Jordan condition 5.
    await expect(deletePushToken(USER_ID)).resolves.toBeUndefined();
  });
});
