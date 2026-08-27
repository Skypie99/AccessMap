import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  useNotificationPreferences,
} from '../useNotificationPreferences';

const mockGetItem = jest.fn<Promise<string | null>, [string]>();
const mockSetItem = jest.fn<Promise<void>, [string, string]>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));

const storageKey = (userId: string) => `@accessmap/push_notif_prefs_v1:${userId}`;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function renderLoaded(userId: string | null, raw: string | null = null) {
  mockGetItem.mockResolvedValue(raw);
  const hook = renderHook(() => useNotificationPreferences(userId));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

beforeEach(() => {
  // mockReset removes implementations and queued one-shot values as well as
  // call history, so no unresolved read/write can contaminate the next case.
  mockGetItem.mockReset();
  mockSetItem.mockReset();
  mockSetItem.mockResolvedValue(undefined);
});

describe('DEFAULT_NOTIFICATION_PREFERENCES', () => {
  it('preserves the exported all-true shape and immutability contract', () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES).toEqual({
      flagStatusUpdates: true,
      nearbyFlags: true,
      watchedFlagUpdates: true,
      bulkWatchAlerts: true,
    });
    expect(Object.isFrozen(DEFAULT_NOTIFICATION_PREFERENCES)).toBe(true);
  });

  it('returns a mutable state copy rather than the exported frozen object', async () => {
    const { result } = await renderLoaded('user-default-copy');

    expect(result.current.preferences).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(result.current.preferences).not.toBe(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(Object.isFrozen(result.current.preferences)).toBe(false);
  });
});

describe('real hook load behavior', () => {
  it('finishes with defaults when storage is empty', async () => {
    const { result } = await renderLoaded('empty-user');

    expect(mockGetItem).toHaveBeenCalledWith(storageKey('empty-user'));
    expect(result.current.preferences).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('loads a complete persisted object', async () => {
    const persisted: NotificationPreferences = {
      flagStatusUpdates: false,
      nearbyFlags: true,
      watchedFlagUpdates: false,
      bulkWatchAlerts: true,
    };
    const { result } = await renderLoaded('complete-user', JSON.stringify(persisted));

    expect(result.current.preferences).toEqual(persisted);
  });

  it('fills missing or invalid persisted fields from current defaults', async () => {
    const { result } = await renderLoaded(
      'partial-user',
      JSON.stringify({ nearbyFlags: false, watchedFlagUpdates: 'not-a-boolean' }),
    );

    expect(result.current.preferences).toEqual({
      flagStatusUpdates: true,
      nearbyFlags: false,
      watchedFlagUpdates: true,
      bulkWatchAlerts: true,
    });
  });

  it('fails soft to defaults for malformed JSON', async () => {
    const { result } = await renderLoaded('malformed-user', '{not-json');

    expect(result.current.preferences).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('fails soft to defaults when the storage read rejects', async () => {
    mockGetItem.mockRejectedValue(new Error('read unavailable'));
    const { result } = renderHook(() => useNotificationPreferences('read-error-user'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.preferences).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('finishes with defaults for a null user and makes updates a no-op', async () => {
    const { result } = renderHook(() => useNotificationPreferences(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPreference('nearbyFlags', false);
    });

    expect(result.current.preferences).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(mockGetItem).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

describe('real hook async lifecycle', () => {
  it('discards a deferred load that resolves after unmount', async () => {
    const pending = deferred<string | null>();
    mockGetItem.mockReturnValue(pending.promise);
    const invalidUpdateSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result, unmount } = renderHook(() =>
      useNotificationPreferences('unmounted-user'),
    );
    const beforeUnmount = result.current;

    expect(beforeUnmount.loading).toBe(true);
    unmount();
    await act(async () => {
      pending.resolve(JSON.stringify({ nearbyFlags: false }));
      await pending.promise;
      await Promise.resolve();
    });

    expect(result.current).toBe(beforeUnmount);
    expect(
      invalidUpdateSpy.mock.calls.some(([message]) =>
        String(message).includes('state update on an unmounted component'),
      ),
    ).toBe(false);
    invalidUpdateSpy.mockRestore();
  });

  it('prevents a late User A load from overwriting User B or changing B loading state', async () => {
    const userA = deferred<string | null>();
    const userB = deferred<string | null>();
    mockGetItem.mockImplementation((key) => {
      if (key === storageKey('user-a')) return userA.promise;
      if (key === storageKey('user-b')) return userB.promise;
      throw new Error(`unexpected key: ${key}`);
    });

    const hook = renderHook(
      ({ userId }: { userId: string }) => useNotificationPreferences(userId),
      { initialProps: { userId: 'user-a' } },
    );
    hook.rerender({ userId: 'user-b' });

    const bPreferences: NotificationPreferences = {
      flagStatusUpdates: true,
      nearbyFlags: false,
      watchedFlagUpdates: true,
      bulkWatchAlerts: false,
    };
    await act(async () => {
      userB.resolve(JSON.stringify(bPreferences));
      await userB.promise;
    });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    expect(hook.result.current.preferences).toEqual(bPreferences);

    await act(async () => {
      userA.resolve(
        JSON.stringify({
          flagStatusUpdates: false,
          nearbyFlags: true,
          watchedFlagUpdates: false,
          bulkWatchAlerts: true,
        }),
      );
      await userA.promise;
      await Promise.resolve();
    });

    expect(hook.result.current.loading).toBe(false);
    expect(hook.result.current.preferences).toEqual(bPreferences);
  });

  it('does not reload on an ordinary rerender, but loads exactly once for a new user', async () => {
    mockGetItem.mockImplementation(async (key) =>
      key === storageKey('user-a')
        ? JSON.stringify({ nearbyFlags: false })
        : JSON.stringify({ bulkWatchAlerts: false }),
    );
    const hook = renderHook(
      ({ userId }: { userId: string }) => useNotificationPreferences(userId),
      { initialProps: { userId: 'user-a' } },
    );
    await waitFor(() => expect(hook.result.current.loading).toBe(false));

    hook.rerender({ userId: 'user-a' });
    await act(async () => Promise.resolve());
    expect(mockGetItem).toHaveBeenCalledTimes(1);
    expect(mockSetItem).not.toHaveBeenCalled();

    hook.rerender({ userId: 'user-b' });
    await waitFor(() => {
      expect(hook.result.current.loading).toBe(false);
      expect(hook.result.current.preferences.bulkWatchAlerts).toBe(false);
    });
    expect(mockGetItem).toHaveBeenCalledTimes(2);
    expect(mockGetItem).toHaveBeenNthCalledWith(2, storageKey('user-b'));
    expect(mockSetItem).not.toHaveBeenCalled();
  });
});

describe('real hook persistence', () => {
  it('updates optimistically and writes the full next object to the per-user key', async () => {
    const write = deferred<void>();
    mockSetItem.mockReturnValue(write.promise);
    const { result, unmount } = await renderLoaded('optimistic-user');

    act(() => {
      result.current.setPreference('nearbyFlags', false);
    });

    const expected: NotificationPreferences = {
      flagStatusUpdates: true,
      nearbyFlags: false,
      watchedFlagUpdates: true,
      bulkWatchAlerts: true,
    };
    expect(result.current.preferences).toEqual(expected);
    expect(mockSetItem).toHaveBeenCalledWith(
      storageKey('optimistic-user'),
      JSON.stringify(expected),
    );

    unmount();
    await act(async () => {
      write.resolve();
      await write.promise;
    });
  });

  it('keeps optimistic state and warns once when persistence rejects', async () => {
    const writeError = new Error('disk full');
    mockSetItem.mockRejectedValue(writeError);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = await renderLoaded('write-error-user');

    act(() => {
      result.current.setPreference('watchedFlagUpdates', false);
    });

    await waitFor(() => expect(warnSpy).toHaveBeenCalledTimes(1));
    expect(result.current.preferences).toEqual({
      flagStatusUpdates: true,
      nearbyFlags: true,
      watchedFlagUpdates: false,
      bulkWatchAlerts: true,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to persist notification preferences',
      writeError,
    );
    warnSpy.mockRestore();
  });
});
