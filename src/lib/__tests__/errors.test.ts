/**
 * Tests for the errorMessage helper.
 *
 * The catch blocks throughout the app trust this function to never return
 * an empty string or undefined — Alert.alert('title', undefined) would
 * silently drop the body, which is exactly the kind of "looks fine but
 * is missing information" bug that's easy to miss in code review.
 *
 * Uses Jest globals — runner setup is in proposal-testing-2026-05-23.md.
 */

import { errorMessage } from '../errors';

describe('errorMessage', () => {
  it('returns the message from an Error', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns the message from a plain object with a string message field', () => {
    // Supabase sometimes throws a plain object, not an Error.
    expect(errorMessage({ message: 'permission denied' })).toBe('permission denied');
  });

  it('returns a thrown string as-is', () => {
    expect(errorMessage('something went wrong')).toBe('something went wrong');
  });

  it('falls back when message is missing entirely', () => {
    expect(errorMessage({})).toBe('Unknown error.');
    expect(errorMessage(null)).toBe('Unknown error.');
    expect(errorMessage(undefined)).toBe('Unknown error.');
  });

  it('falls back when message is present but empty or non-string', () => {
    // Defensive: a buggy thrower could give us message=''. Don't show the
    // user a banner with an empty body — use the fallback instead.
    expect(errorMessage({ message: '' })).toBe('Unknown error.');
    expect(errorMessage({ message: 42 })).toBe('Unknown error.');
    expect(errorMessage('')).toBe('Unknown error.');
  });

  it('respects the optional fallback argument', () => {
    expect(errorMessage(null, 'Could not load your reports.')).toBe(
      'Could not load your reports.',
    );
  });
});
