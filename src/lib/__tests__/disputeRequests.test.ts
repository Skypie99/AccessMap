/**
 * W1 per-device dispute dedup — the byte-shape sibling of reopenRequests.test.ts.
 *
 * The last case is the one that is NOT decoration: the reopen list and the
 * dispute list must occupy DIFFERENT AsyncStorage keys. A shared key would make
 * one reopen vote silently spend this device's dispute vote on the same flag
 * (and vice versa), which is the kind of bug that only ever shows up as "the
 * button did nothing" on someone else's phone.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasRequestedDispute, recordDisputeRequest } from '../disputeRequests';
import { hasRequestedReopen, recordReopenRequest } from '../reopenRequests';

describe('disputeRequests (per-device dispute dedup, W1)', () => {
  const USER = 'user-1';

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns false before any request is recorded', async () => {
    expect(await hasRequestedDispute(USER, 'flag-1')).toBe(false);
  });

  it('records a request and reports it on the next check', async () => {
    await recordDisputeRequest(USER, 'flag-1');
    expect(await hasRequestedDispute(USER, 'flag-1')).toBe(true);
  });

  it('is scoped per flag', async () => {
    await recordDisputeRequest(USER, 'flag-1');
    expect(await hasRequestedDispute(USER, 'flag-2')).toBe(false);
  });

  it('is scoped per user', async () => {
    await recordDisputeRequest(USER, 'flag-1');
    expect(await hasRequestedDispute('user-2', 'flag-1')).toBe(false);
  });

  it('does not duplicate an already-recorded flag', async () => {
    await recordDisputeRequest(USER, 'flag-1');
    await recordDisputeRequest(USER, 'flag-1');
    const raw = await AsyncStorage.getItem('@accessmap/dispute_requested_v1:user-1');
    expect(JSON.parse(raw as string)).toEqual(['flag-1']);
  });

  it('tolerates corrupt stored JSON (returns false, recovers on next write)', async () => {
    await AsyncStorage.setItem('@accessmap/dispute_requested_v1:user-1', 'not json');
    expect(await hasRequestedDispute(USER, 'flag-1')).toBe(false);
    await recordDisputeRequest(USER, 'flag-1');
    expect(await hasRequestedDispute(USER, 'flag-1')).toBe(true);
  });

  it('DOES NOT share a key with the reopen list — the two votes are independent', async () => {
    await recordReopenRequest(USER, 'flag-1');
    expect(await hasRequestedDispute(USER, 'flag-1')).toBe(false);

    await recordDisputeRequest(USER, 'flag-2');
    expect(await hasRequestedReopen(USER, 'flag-2')).toBe(false);
  });
});
