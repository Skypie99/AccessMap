import {
  DEFAULT_PREFS,
  isNotifiable,
  loadPrefs,
  prefKeyForStatus,
  savePrefs,
  type NotificationPrefs,
} from '../notificationPrefs';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => store.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        store.set(k, v);
      }),
      __reset: () => store.clear(),
      __setRaw: (k: string, v: string) => store.set(k, v),
    },
  };
});

const mockStorage =
  jest.requireMock('@react-native-async-storage/async-storage').default;

describe('DEFAULT_PREFS', () => {
  it('enables all status notifications by default', () => {
    expect(DEFAULT_PREFS).toEqual({
      notifyOnOpen: true,
      notifyOnVerified: true,
      notifyOnResolved: true,
      notifyOnRejected: true,
    });
  });
});

describe('prefKeyForStatus', () => {
  it('maps each status to the right pref key', () => {
    expect(prefKeyForStatus('open')).toBe('notifyOnOpen');
    expect(prefKeyForStatus('verified')).toBe('notifyOnVerified');
    expect(prefKeyForStatus('resolved')).toBe('notifyOnResolved');
    expect(prefKeyForStatus('rejected')).toBe('notifyOnRejected');
  });
});

describe('isNotifiable', () => {
  it('returns true for every status under DEFAULT_PREFS', () => {
    expect(isNotifiable('open', DEFAULT_PREFS)).toBe(true);
    expect(isNotifiable('verified', DEFAULT_PREFS)).toBe(true);
    expect(isNotifiable('resolved', DEFAULT_PREFS)).toBe(true);
    expect(isNotifiable('rejected', DEFAULT_PREFS)).toBe(true);
  });

  it('returns false when the matching pref is off', () => {
    const prefs: NotificationPrefs = {
      ...DEFAULT_PREFS,
      notifyOnRejected: false,
    };
    expect(isNotifiable('rejected', prefs)).toBe(false);
    expect(isNotifiable('verified', prefs)).toBe(true);
  });
});

describe('loadPrefs / savePrefs', () => {
  beforeEach(() => {
    mockStorage.__reset();
    jest.clearAllMocks();
  });

  it('returns DEFAULT_PREFS for a never-saved user', async () => {
    expect(await loadPrefs('u1')).toEqual(DEFAULT_PREFS);
  });

  it('round-trips a saved set', async () => {
    const prefs: NotificationPrefs = {
      notifyOnOpen: false,
      notifyOnVerified: true,
      notifyOnResolved: true,
      notifyOnRejected: false,
    };
    await savePrefs('u1', prefs);
    expect(await loadPrefs('u1')).toEqual(prefs);
  });

  it('returns DEFAULT_PREFS on invalid JSON', async () => {
    mockStorage.__setRaw('@accessmap/notification_prefs_v1:u1', '{not json');
    expect(await loadPrefs('u1')).toEqual(DEFAULT_PREFS);
  });

  it('defaults missing fields to true (defensive against partial writes)', async () => {
    mockStorage.__setRaw(
      '@accessmap/notification_prefs_v1:u1',
      JSON.stringify({ notifyOnOpen: false }),
    );
    const loaded = await loadPrefs('u1');
    expect(loaded.notifyOnOpen).toBe(false);
    expect(loaded.notifyOnVerified).toBe(true);
    expect(loaded.notifyOnResolved).toBe(true);
    expect(loaded.notifyOnRejected).toBe(true);
  });

  it('drops non-boolean values and falls back to defaults', async () => {
    mockStorage.__setRaw(
      '@accessmap/notification_prefs_v1:u1',
      JSON.stringify({
        notifyOnOpen: 'yes',
        notifyOnVerified: 1,
        notifyOnResolved: null,
        notifyOnRejected: false,
      }),
    );
    const loaded = await loadPrefs('u1');
    expect(loaded.notifyOnOpen).toBe(true); // string → default
    expect(loaded.notifyOnVerified).toBe(true); // number → default
    expect(loaded.notifyOnResolved).toBe(true); // null → default
    expect(loaded.notifyOnRejected).toBe(false); // explicit false survives
  });

  it('is per-user isolated', async () => {
    await savePrefs('alice', { ...DEFAULT_PREFS, notifyOnRejected: false });
    await savePrefs('bob', { ...DEFAULT_PREFS, notifyOnResolved: false });
    const alice = await loadPrefs('alice');
    const bob = await loadPrefs('bob');
    expect(alice.notifyOnRejected).toBe(false);
    expect(alice.notifyOnResolved).toBe(true);
    expect(bob.notifyOnRejected).toBe(true);
    expect(bob.notifyOnResolved).toBe(false);
  });
});
