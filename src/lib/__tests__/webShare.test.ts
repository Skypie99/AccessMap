/**
 * Tests for src/lib/webShare.ts.
 *
 * webShare.ts is a pure browser-environment wrapper with no Supabase dependency.
 * No supabase mock is needed.
 *
 * What this covers:
 *  - canWebShare() returns true when navigator.share is available.
 *  - canWebShare() returns true when only navigator.clipboard is available.
 *  - canWebShare() returns false when neither is available.
 *  - webShare() returns true on a successful navigator.share call.
 *  - webShare() returns false when the user cancels (AbortError).
 *  - webShare() throws on unexpected errors from navigator.share.
 *  - webShare() falls back to clipboard and returns true when navigator.share is absent.
 *  - webShare() returns false when clipboard write fails.
 *  - webShare() returns false when navigator is undefined (native guard).
 */

import { canWebShare, webShare } from '../webShare';

// ---------------------------------------------------------------------------
// Helpers to control the global navigator shape per test
// ---------------------------------------------------------------------------

function setNavigatorShare(fn: (() => Promise<void>) | undefined) {
  Object.defineProperty(global, 'navigator', {
    value: { share: fn, clipboard: undefined },
    writable: true,
    configurable: true,
  });
}

function setNavigatorClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(global, 'navigator', {
    value: { share: undefined, clipboard: writeText ? { writeText } : undefined },
    writable: true,
    configurable: true,
  });
}

function setNavigatorNone() {
  Object.defineProperty(global, 'navigator', {
    value: { share: undefined, clipboard: undefined },
    writable: true,
    configurable: true,
  });
}

function unsetNavigator() {
  Object.defineProperty(global, 'navigator', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  // Restore a benign navigator so other tests are unaffected.
  setNavigatorNone();
});

// ---------------------------------------------------------------------------
// canWebShare
// ---------------------------------------------------------------------------
describe('canWebShare', () => {
  it('returns true when navigator.share is available', () => {
    setNavigatorShare(jest.fn().mockResolvedValue(undefined));
    expect(canWebShare()).toBe(true);
  });

  it('returns true when navigator.clipboard.writeText is available (no share)', () => {
    setNavigatorClipboard(jest.fn().mockResolvedValue(undefined));
    expect(canWebShare()).toBe(true);
  });

  it('returns false when neither navigator.share nor clipboard is available', () => {
    setNavigatorNone();
    expect(canWebShare()).toBe(false);
  });

  it('returns false when navigator is undefined (native guard)', () => {
    unsetNavigator();
    expect(canWebShare()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// webShare — navigator.share path
// ---------------------------------------------------------------------------
describe('webShare — share supported', () => {
  it('returns true when navigator.share succeeds', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    setNavigatorShare(shareMock);
    const result = await webShare({ text: 'hello', title: 'Test' });
    expect(result).toBe(true);
    expect(shareMock).toHaveBeenCalledWith({ text: 'hello', title: 'Test' });
  });

  it('returns false when the user cancels (AbortError)', async () => {
    const abort = new Error('User cancelled');
    abort.name = 'AbortError';
    setNavigatorShare(jest.fn().mockRejectedValue(abort));
    const result = await webShare({ text: 'hello' });
    expect(result).toBe(false);
  });

  it('rethrows unexpected errors from navigator.share', async () => {
    const unexpected = new Error('Network failure');
    setNavigatorShare(jest.fn().mockRejectedValue(unexpected));
    await expect(webShare({ text: 'hello' })).rejects.toThrow('Network failure');
  });
});

// ---------------------------------------------------------------------------
// webShare — clipboard fallback path (navigator.share absent)
// ---------------------------------------------------------------------------
describe('webShare — share not supported, clipboard fallback', () => {
  it('returns true when clipboard.writeText succeeds', async () => {
    const clipMock = jest.fn().mockResolvedValue(undefined);
    setNavigatorClipboard(clipMock);
    const result = await webShare({ text: 'fallback text' });
    expect(result).toBe(true);
    expect(clipMock).toHaveBeenCalledWith('fallback text');
  });

  it('prefers the url over text when copying to clipboard', async () => {
    const clipMock = jest.fn().mockResolvedValue(undefined);
    setNavigatorClipboard(clipMock);
    await webShare({ text: 'body text', url: 'https://example.com' });
    expect(clipMock).toHaveBeenCalledWith('https://example.com');
  });

  it('returns false when clipboard.writeText rejects', async () => {
    const clipMock = jest.fn().mockRejectedValue(new Error('Permission denied'));
    setNavigatorClipboard(clipMock);
    const result = await webShare({ text: 'hello' });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// webShare — nothing available
// ---------------------------------------------------------------------------
describe('webShare — no sharing mechanism', () => {
  it('returns false when neither share nor clipboard is available', async () => {
    setNavigatorNone();
    const result = await webShare({ text: 'hello' });
    expect(result).toBe(false);
  });

  it('returns false when navigator is undefined (native guard)', async () => {
    unsetNavigator();
    const result = await webShare({ text: 'hello' });
    expect(result).toBe(false);
  });
});
