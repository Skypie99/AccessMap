/**
 * Tests for the pure `mergeFlagRealtimePayload` helper in
 * src/lib/flagsRealtime.ts.
 *
 * The helper is the part of the realtime path that's easy to get wrong:
 * INSERT must respect the active status filter, UPDATE must remove a row
 * whose status moved out of the filter (and add one that moved in), and
 * DELETE must work off `old.id` because `new` is empty on delete events.
 *
 * Mocking Supabase channels in a unit test buys little — pinning the merge
 * behavior here lets the FlagsProvider effect stay a thin adapter.
 */

import { mergeFlagRealtimePayload } from '../flagsRealtime';
import type { FlagRealtimePayload } from '../flagsRealtime';
import type { FlagRow, FlagStatus } from '@/types/database';

function flag(overrides: Partial<FlagRow> = {}): FlagRow {
  return {
    id: 'a',
    user_id: 'u1',
    lat: 0,
    lng: 0,
    category: 'no_ramp',
    description: null,
    severity: 3,
    photo_url: null,
    status: 'open',
    created_at: '2026-05-23T12:00:00.000Z',
    ...overrides,
  };
}

const DEFAULT: FlagStatus[] = ['open', 'verified'];

describe('mergeFlagRealtimePayload — INSERT', () => {
  it('adds a new flag whose status is in the filter, newest first', () => {
    const older = flag({ id: 'a', created_at: '2026-05-23T11:00:00.000Z' });
    const incoming = flag({ id: 'b', created_at: '2026-05-23T12:00:00.000Z' });
    const next = mergeFlagRealtimePayload(
      [older],
      { eventType: 'INSERT', new: incoming, old: {} },
      DEFAULT,
    );
    expect(next.map((f) => f.id)).toEqual(['b', 'a']);
  });

  it('skips a flag whose status is not in the filter', () => {
    const list = [flag({ id: 'a' })];
    const incoming = flag({ id: 'b', status: 'resolved' });
    const next = mergeFlagRealtimePayload(
      list,
      { eventType: 'INSERT', new: incoming, old: {} },
      DEFAULT,
    );
    expect(next).toBe(list);
  });

  it('dedupes by id so an echo of a local insert is a no-op', () => {
    const list = [flag({ id: 'a' })];
    const echo = flag({ id: 'a' });
    const next = mergeFlagRealtimePayload(
      list,
      { eventType: 'INSERT', new: echo, old: {} },
      DEFAULT,
    );
    expect(next).toBe(list);
  });

  it('re-sorts when a late-arriving INSERT has an earlier created_at', () => {
    const newest = flag({ id: 'a', created_at: '2026-05-23T12:00:00.000Z' });
    const late = flag({ id: 'b', created_at: '2026-05-23T10:00:00.000Z' });
    const next = mergeFlagRealtimePayload(
      [newest],
      { eventType: 'INSERT', new: late, old: {} },
      DEFAULT,
    );
    expect(next.map((f) => f.id)).toEqual(['a', 'b']);
  });
});

describe('mergeFlagRealtimePayload — UPDATE', () => {
  it('patches an existing flag in place', () => {
    const before = flag({ id: 'a', severity: 2 });
    const after = flag({ id: 'a', severity: 5 });
    const next = mergeFlagRealtimePayload(
      [before],
      { eventType: 'UPDATE', new: after, old: before },
      DEFAULT,
    );
    expect(next[0]?.severity).toBe(5);
    expect(next).toHaveLength(1);
  });

  it('removes a flag whose new status fell out of the filter', () => {
    const before = flag({ id: 'a', status: 'verified' });
    const after = flag({ id: 'a', status: 'resolved' });
    const next = mergeFlagRealtimePayload(
      [before],
      { eventType: 'UPDATE', new: after, old: before },
      DEFAULT,
    );
    expect(next).toEqual([]);
  });

  it('adds a flag whose new status moved into the filter', () => {
    const after = flag({ id: 'b', status: 'verified' });
    const next = mergeFlagRealtimePayload(
      [flag({ id: 'a' })],
      { eventType: 'UPDATE', new: after, old: { id: 'b', status: 'resolved' } },
      DEFAULT,
    );
    expect(next.map((f) => f.id).sort()).toEqual(['a', 'b']);
  });

  it('ignores an UPDATE whose new status is outside the filter and was not in the list', () => {
    const list = [flag({ id: 'a' })];
    const after = flag({ id: 'b', status: 'resolved' });
    const next = mergeFlagRealtimePayload(
      list,
      { eventType: 'UPDATE', new: after, old: { id: 'b' } },
      DEFAULT,
    );
    expect(next).toBe(list);
  });
});

describe('mergeFlagRealtimePayload — DELETE', () => {
  it('removes the row identified by old.id', () => {
    const list = [flag({ id: 'a' }), flag({ id: 'b' })];
    const next = mergeFlagRealtimePayload(
      list,
      { eventType: 'DELETE', new: {}, old: { id: 'a' } },
      DEFAULT,
    );
    expect(next.map((f) => f.id)).toEqual(['b']);
  });

  it('is a no-op when old.id is missing', () => {
    const list = [flag({ id: 'a' })];
    const next = mergeFlagRealtimePayload(list, { eventType: 'DELETE', new: {}, old: {} }, DEFAULT);
    expect(next).toBe(list);
  });
});

describe('mergeFlagRealtimePayload — unknown events', () => {
  it('returns the list unchanged for an unrecognized eventType', () => {
    const list = [flag()];
    const next = mergeFlagRealtimePayload(
      list,
      { eventType: 'NOPE' as unknown as 'INSERT', new: flag(), old: {} } as FlagRealtimePayload,
      DEFAULT,
    );
    expect(next).toBe(list);
  });
});
