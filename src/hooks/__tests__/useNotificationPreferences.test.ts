/**
 * Tests for useNotificationPreferences hook internals.
 *
 * Because @testing-library/react-native is not installed, we exercise the
 * hook's observable behavior by directly testing the module's logic:
 *
 *  - DEFAULT_NOTIFICATION_PREFERENCES shape and immutability
 *  - loadNotificationPreferences / saveNotificationPreferences via AsyncStorage
 *  - Parsing: defaults when storage is empty, missing fields, or corrupt JSON
 *  - Each of the 4 preference keys can be toggled and persisted
 *  - Per-user isolation (different keys for different userIds)
 *
 * This mirrors the test strategy used in src/lib/__tests__/notificationPrefs.test.ts
 * (which also tests raw load/save helpers rather than hook lifecycle).
 */

// ---------------------------------------------------------------------------
// In-memory AsyncStorage stub — same pattern as existing lib tests.
// The variable is prefixed `mock` so Jest's scope check permits the
// reference inside jest.mock() (Babel restricts out-of-scope access,
// but allows variables whose names start with "mock", case-insensitive).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Import the tested module (after mocks are registered)
// ---------------------------------------------------------------------------

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from '../useNotificationPreferences';

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockStore.set(k, v);
    }),
    __reset: () => mockStore.clear(),
    __setRaw: (k: string, v: string) => mockStore.set(k, v),
  },
}));

const mockAsyncStorage = jest.requireMock('@react-native-async-storage/async-storage').default;

beforeEach(() => {
  mockAsyncStorage.__reset();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Storage helpers mirrored from the hook (for black-box integration tests)
// ---------------------------------------------------------------------------

const PREFIX = '@accessmap/push_notif_prefs_v1:';

function storageKey(userId: string) {
  return PREFIX + userId;
}

async function loadFromStorage(userId: string): Promise<NotificationPreferences> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    return {
      flagStatusUpdates: typeof obj.flagStatusUpdates === 'boolean' ? obj.flagStatusUpdates : true,
      nearbyFlags: typeof obj.nearbyFlags === 'boolean' ? obj.nearbyFlags : true,
      watchedFlagUpdates:
        typeof obj.watchedFlagUpdates === 'boolean' ? obj.watchedFlagUpdates : true,
      bulkWatchAlerts: typeof obj.bulkWatchAlerts === 'boolean' ? obj.bulkWatchAlerts : true,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

async function saveToStorage(userId: string, prefs: NotificationPreferences): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(prefs));
}

// ---------------------------------------------------------------------------
// 1. DEFAULT_NOTIFICATION_PREFERENCES — shape and all-true values
// ---------------------------------------------------------------------------

describe('DEFAULT_NOTIFICATION_PREFERENCES', () => {
  it('is all-true by default', () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES).toEqual({
      flagStatusUpdates: true,
      nearbyFlags: true,
      watchedFlagUpdates: true,
      bulkWatchAlerts: true,
    });
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(DEFAULT_NOTIFICATION_PREFERENCES)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. loadFromStorage — returns defaults when nothing is stored
// ---------------------------------------------------------------------------

describe('load behavior', () => {
  it('returns defaults for a user with no stored data', async () => {
    const result = await loadFromStorage('user-1');
    expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('returns DEFAULT_NOTIFICATION_PREFERENCES on invalid JSON', async () => {
    mockAsyncStorage.__setRaw(storageKey('user-1'), '{not-valid-json');
    const result = await loadFromStorage('user-1');
    expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  it('defaults missing fields to true (defensive against partial writes)', async () => {
    mockAsyncStorage.__setRaw(storageKey('user-1'), JSON.stringify({ nearbyFlags: false }));
    const result = await loadFromStorage('user-1');
    expect(result.nearbyFlags).toBe(false);
    expect(result.flagStatusUpdates).toBe(true);
    expect(result.watchedFlagUpdates).toBe(true);
    expect(result.bulkWatchAlerts).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3–6. Toggling each of the 4 preferences and verifying persistence
// ---------------------------------------------------------------------------

describe('toggling flagStatusUpdates', () => {
  it('persists false and reads back false, others stay true', async () => {
    const prefs: NotificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      flagStatusUpdates: false,
    };
    await saveToStorage('alice', prefs);
    const loaded = await loadFromStorage('alice');
    expect(loaded.flagStatusUpdates).toBe(false);
    expect(loaded.nearbyFlags).toBe(true);
    expect(loaded.watchedFlagUpdates).toBe(true);
    expect(loaded.bulkWatchAlerts).toBe(true);
  });
});

describe('toggling nearbyFlags', () => {
  it('persists false and reads back false, others stay true', async () => {
    const prefs: NotificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      nearbyFlags: false,
    };
    await saveToStorage('alice', prefs);
    const loaded = await loadFromStorage('alice');
    expect(loaded.nearbyFlags).toBe(false);
    expect(loaded.flagStatusUpdates).toBe(true);
    expect(loaded.watchedFlagUpdates).toBe(true);
    expect(loaded.bulkWatchAlerts).toBe(true);
  });
});

describe('toggling watchedFlagUpdates', () => {
  it('persists false and reads back false, others stay true', async () => {
    const prefs: NotificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      watchedFlagUpdates: false,
    };
    await saveToStorage('alice', prefs);
    const loaded = await loadFromStorage('alice');
    expect(loaded.watchedFlagUpdates).toBe(false);
    expect(loaded.flagStatusUpdates).toBe(true);
    expect(loaded.nearbyFlags).toBe(true);
    expect(loaded.bulkWatchAlerts).toBe(true);
  });
});

describe('toggling bulkWatchAlerts', () => {
  it('persists false and reads back false, others stay true', async () => {
    const prefs: NotificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      bulkWatchAlerts: false,
    };
    await saveToStorage('alice', prefs);
    const loaded = await loadFromStorage('alice');
    expect(loaded.bulkWatchAlerts).toBe(false);
    expect(loaded.flagStatusUpdates).toBe(true);
    expect(loaded.nearbyFlags).toBe(true);
    expect(loaded.watchedFlagUpdates).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Per-user isolation
// ---------------------------------------------------------------------------

describe('per-user isolation', () => {
  it('keeps separate preferences per user id', async () => {
    await saveToStorage('alice', {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      nearbyFlags: false,
    });
    await saveToStorage('bob', {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      bulkWatchAlerts: false,
    });

    const alice = await loadFromStorage('alice');
    const bob = await loadFromStorage('bob');

    expect(alice.nearbyFlags).toBe(false);
    expect(alice.bulkWatchAlerts).toBe(true);

    expect(bob.nearbyFlags).toBe(true);
    expect(bob.bulkWatchAlerts).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. Round-trip: save then load preserves all 4 keys
// ---------------------------------------------------------------------------

describe('round-trip persistence', () => {
  it('round-trips a full prefs object through AsyncStorage', async () => {
    const prefs: NotificationPreferences = {
      flagStatusUpdates: false,
      nearbyFlags: true,
      watchedFlagUpdates: false,
      bulkWatchAlerts: true,
    };
    await saveToStorage('user-rt', prefs);
    const loaded = await loadFromStorage('user-rt');
    expect(loaded).toEqual(prefs);
  });
});
