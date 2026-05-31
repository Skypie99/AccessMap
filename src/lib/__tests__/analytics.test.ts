// Tests for the analytics wrapper (Sentry removed — stubs in place until Phase 6).

import {
  trackEvent,
  trackScreen,
  trackError,
  stripPII,
  commentLengthBucket,
  track,
} from '@/lib/analytics';

// Keep the dev console quiet — analytics logs in __DEV__.
let logSpy: jest.SpyInstance;

beforeEach(() => {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
});

describe('trackEvent', () => {
  it('runs without throwing', () => {
    expect(() => trackEvent('photo_added', { photo_count: 3, platform: 'ios' })).not.toThrow();
  });

  it('works with no properties', () => {
    expect(() => trackEvent('app_session_started')).not.toThrow();
  });
});

describe('trackScreen', () => {
  it('runs without throwing', () => {
    expect(() => trackScreen('Map')).not.toThrow();
  });
});

describe('trackError', () => {
  it('runs without throwing', () => {
    expect(() => trackError(new Error('boom'))).not.toThrow();
  });
});

describe('legacy track()', () => {
  it('runs without throwing', () => {
    expect(() =>
      track('flag_status_changed', { flagId: 'flag-789', from: 'open', to: 'verified' }),
    ).not.toThrow();
  });
});

describe('stripPII', () => {
  it('drops non-primitive values', () => {
    const out = stripPII({
      ok: 'yes',
      n: 1,
      b: true,
      obj: { nested: 'pii' },
      arr: [1, 2, 3],
      nil: null,
      undef: undefined,
    } as Record<string, unknown>);
    expect(out).toEqual({ ok: 'yes', n: 1, b: true });
  });

  it('is case-insensitive on PII keys', () => {
    const out = stripPII({ User_ID: 'x', LAT: 1, keep: 'me' });
    expect(out).toEqual({ keep: 'me' });
  });

  it('drops exact PII keys (lat, lng, email, etc.)', () => {
    const out = stripPII({
      lat: 49.28,
      lng: -123.12,
      email: 'jane@example.com',
      platform: 'ios',
    });
    expect(out).toEqual({ platform: 'ios' });
  });

  it('drops substring PII keys (user_id, flag_id, display_name, etc.)', () => {
    const out = stripPII({
      user_id: 'u-123',
      flag_id: 'f-456',
      display_name: 'Jane',
      category: 'no_ramp',
    });
    expect(out).toEqual({ category: 'no_ramp' });
  });

  it('does NOT over-strip allowed keys with ambiguous substrings', () => {
    const out = stripPII({ comment_length_bucket: 'short', platform: 'android' });
    expect(out).toEqual({ comment_length_bucket: 'short', platform: 'android' });
  });
});

describe('commentLengthBucket', () => {
  it('buckets by length', () => {
    expect(commentLengthBucket(0)).toBe('short');
    expect(commentLengthBucket(79)).toBe('short');
    expect(commentLengthBucket(80)).toBe('medium');
    expect(commentLengthBucket(299)).toBe('medium');
    expect(commentLengthBucket(300)).toBe('long');
    expect(commentLengthBucket(5000)).toBe('long');
  });
});
