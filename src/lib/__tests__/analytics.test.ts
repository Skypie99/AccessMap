// Tests for the Sentry-backed analytics wrapper.
//
// @sentry/react-native is mocked globally in jest.setup.js, so `Sentry` here
// (re-exported by src/lib/sentry.ts) is a set of jest.fn()s we can assert on.

import {
  trackEvent,
  trackScreen,
  trackError,
  stripPII,
  commentLengthBucket,
  track,
} from '@/lib/analytics';
import { Sentry } from '@/lib/sentry';

// Keep the dev console quiet — analytics logs in __DEV__.
let logSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
});

describe('trackEvent', () => {
  it('forwards the event to Sentry as an analytics breadcrumb', () => {
    trackEvent('photo_added', { photo_count: 3, platform: 'ios' });

    expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(1);
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'analytics',
        message: 'photo_added',
        data: { photo_count: 3, platform: 'ios' },
      }),
    );
  });

  it('works with no properties', () => {
    trackEvent('app_session_started');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'app_session_started', data: undefined }),
    );
  });

  it('strips PII fields if they are accidentally passed', () => {
    trackEvent('flag_created', {
      flag_category: 'no_ramp',
      flag_severity: 4,
      // All of the following must be dropped:
      user_id: 'user-123',
      flag_id: 'flag-456',
      lat: 49.28,
      lng: -123.12,
      description: 'secret free text',
      display_name: 'Jane Doe',
      email: 'jane@example.com',
    });

    const breadcrumb = (Sentry.addBreadcrumb as jest.Mock).mock.calls[0][0];
    expect(breadcrumb.data).toEqual({ flag_category: 'no_ramp', flag_severity: 4 });
    // Belt-and-suspenders: none of the forbidden keys survived.
    expect(breadcrumb.data).not.toHaveProperty('user_id');
    expect(breadcrumb.data).not.toHaveProperty('flag_id');
    expect(breadcrumb.data).not.toHaveProperty('lat');
    expect(breadcrumb.data).not.toHaveProperty('lng');
    expect(breadcrumb.data).not.toHaveProperty('description');
    expect(breadcrumb.data).not.toHaveProperty('display_name');
    expect(breadcrumb.data).not.toHaveProperty('email');
  });

  it('does NOT over-strip allowed keys that contain ambiguous substrings', () => {
    // Regression: "platform" contains "lat", "comment_length_bucket" contains
    // "comment" — both must survive.
    trackEvent('comment_added', {
      comment_length_bucket: 'short',
      platform: 'android',
    });

    const breadcrumb = (Sentry.addBreadcrumb as jest.Mock).mock.calls[0][0];
    expect(breadcrumb.data).toEqual({
      comment_length_bucket: 'short',
      platform: 'android',
    });
  });
});

describe('trackScreen', () => {
  it('sets the screen tag and adds a navigation breadcrumb', () => {
    trackScreen('Map');
    expect(Sentry.setTag).toHaveBeenCalledWith('screen', 'Map');
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'navigation', message: 'Map' }),
    );
  });
});

describe('trackError', () => {
  it('captures the exception in Sentry', () => {
    const err = new Error('boom');
    trackError(err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err, undefined);
  });

  it('forwards scrubbed context as extra', () => {
    const err = new Error('boom');
    trackError(err, { screen: 'Map', user_id: 'should-be-dropped' });
    expect(Sentry.captureException).toHaveBeenCalledWith(err, {
      extra: { screen: 'Map' },
    });
  });
});

describe('legacy track()', () => {
  it('routes through the chokepoint and strips PII (flagId) from old events', () => {
    track('flag_status_changed', { flagId: 'flag-789', from: 'open', to: 'verified' });

    const breadcrumb = (Sentry.addBreadcrumb as jest.Mock).mock.calls[0][0];
    expect(breadcrumb.message).toBe('flag_status_changed');
    expect(breadcrumb.data).toEqual({ from: 'open', to: 'verified' });
    expect(breadcrumb.data).not.toHaveProperty('flagId');
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
