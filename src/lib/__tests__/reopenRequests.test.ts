import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasRequestedReopen, recordReopenRequest } from '../reopenRequests';

describe('reopenRequests (per-device reopen dedup, F8)', () => {
  const USER = 'user-1';

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns false before any request is recorded', async () => {
    expect(await hasRequestedReopen(USER, 'flag-1')).toBe(false);
  });

  it('records a request and reports it on the next check', async () => {
    await recordReopenRequest(USER, 'flag-1');
    expect(await hasRequestedReopen(USER, 'flag-1')).toBe(true);
  });

  it('is scoped per flag', async () => {
    await recordReopenRequest(USER, 'flag-1');
    expect(await hasRequestedReopen(USER, 'flag-2')).toBe(false);
  });

  it('is scoped per user', async () => {
    await recordReopenRequest(USER, 'flag-1');
    expect(await hasRequestedReopen('user-2', 'flag-1')).toBe(false);
  });

  it('does not duplicate an already-recorded flag', async () => {
    await recordReopenRequest(USER, 'flag-1');
    await recordReopenRequest(USER, 'flag-1');
    const raw = await AsyncStorage.getItem('@accessmap/reopen_requested_v1:user-1');
    expect(JSON.parse(raw as string)).toEqual(['flag-1']);
  });

  it('tolerates corrupt stored JSON (returns false, recovers on next write)', async () => {
    await AsyncStorage.setItem('@accessmap/reopen_requested_v1:user-1', 'not json');
    expect(await hasRequestedReopen(USER, 'flag-1')).toBe(false);
    await recordReopenRequest(USER, 'flag-1');
    expect(await hasRequestedReopen(USER, 'flag-1')).toBe(true);
  });
});
