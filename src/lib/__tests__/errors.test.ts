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
    expect(errorMessage({ message: 'duplicate key value' })).toBe('duplicate key value');
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
    expect(errorMessage(null, 'Could not load your reports.')).toBe('Could not load your reports.');
  });
});

describe('errorMessage friendly mapping', () => {
  const FEATURE_UNAVAILABLE = "That feature isn't available yet.";
  const ITEM_NOT_FOUND = "That item couldn't be found. It may have been deleted.";
  const NO_PERMISSION = "You don't have permission to do that.";
  const NETWORK_TROUBLE = 'Check your internet connection and try again.';

  // --- code-based mappings (one per row) ---

  it('maps 42P01 (undefined_table) to the feature-unavailable copy', () => {
    expect(errorMessage({ code: '42P01', message: 'relation "flag_comments" does not exist' })).toBe(
      FEATURE_UNAVAILABLE,
    );
  });

  it('maps 42883 (undefined_function) to the feature-unavailable copy', () => {
    expect(
      errorMessage({ code: '42883', message: 'function public.increment_reopen_request(uuid) does not exist' }),
    ).toBe(FEATURE_UNAVAILABLE);
  });

  it('maps PGRST202 (function not in schema cache) to the feature-unavailable copy', () => {
    expect(errorMessage({ code: 'PGRST202', message: 'Could not find the function' })).toBe(FEATURE_UNAVAILABLE);
  });

  it('maps PGRST204 (column not in schema cache) to the feature-unavailable copy', () => {
    expect(errorMessage({ code: 'PGRST204', message: "Could not find the 'context_tags' column" })).toBe(
      FEATURE_UNAVAILABLE,
    );
  });

  it('maps PGRST116 (zero rows) to the not-found copy', () => {
    expect(errorMessage({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' })).toBe(
      ITEM_NOT_FOUND,
    );
  });

  it('maps 42501 (insufficient_privilege) to the permission copy', () => {
    expect(errorMessage({ code: '42501', message: 'permission denied for table flags' })).toBe(NO_PERMISSION);
  });

  // --- message-regex mappings (one per row) ---

  it('maps fetch-style network failures to the connection copy', () => {
    expect(errorMessage(new Error('TypeError: Failed to fetch'))).toBe(NETWORK_TROUBLE);
    expect(errorMessage(new Error('Network request failed'))).toBe(NETWORK_TROUBLE);
    expect(errorMessage(new Error('NetworkError when attempting to fetch resource.'))).toBe(NETWORK_TROUBLE);
  });

  it('maps RLS violations to the permission copy', () => {
    expect(errorMessage({ message: 'new row violates row-level security policy for table "flags"' })).toBe(
      NO_PERMISSION,
    );
  });

  it('maps "permission denied" messages to the permission copy', () => {
    expect(errorMessage({ message: 'permission denied' })).toBe(NO_PERMISSION);
  });

  it('maps "does not exist" messages to the feature-unavailable copy', () => {
    expect(errorMessage({ message: 'relation "public.feedback" does not exist' })).toBe(FEATURE_UNAVAILABLE);
  });

  // --- precedence ---

  it('lets the code win over a message that matches a different row', () => {
    // 42501 (permission) beats the "does not exist" message regex.
    expect(errorMessage({ code: '42501', message: 'relation "flags" does not exist' })).toBe(NO_PERMISSION);
    // PGRST116 (not found) beats the network message regex.
    expect(errorMessage({ code: 'PGRST116', message: 'Failed to fetch' })).toBe(ITEM_NOT_FOUND);
  });

  // --- unmatched errors keep the old pass-through behavior ---

  it('passes unmapped messages through raw — no blanket generic', () => {
    expect(errorMessage(new Error('duplicate key value violates unique constraint'))).toBe(
      'duplicate key value violates unique constraint',
    );
    expect(errorMessage({ code: '23505', message: 'duplicate key value' })).toBe('duplicate key value');
    expect(errorMessage('something went wrong')).toBe('something went wrong');
  });

  it('keeps the network regex narrow — bare "network" wording passes through', () => {
    // useComments tests rely on 'network down' surviving untouched.
    expect(errorMessage(new Error('network down'))).toBe('network down');
  });
});
