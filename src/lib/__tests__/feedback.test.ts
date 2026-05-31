/**
 * Tests for src/lib/feedback.ts — specifically the pure buildMailtoUrl
 * helper. sendFeedback / openFeedbackComposer are integration paths that
 * delegate to Linking and would need a platform mock; we cover the
 * URL-building contract here, which is the part that can silently break
 * when, say, the subject changes or someone forgets to URL-encode.
 *
 * What this protects against:
 *  - A change to the canonical recipient email going un-noticed.
 *  - The reply-to / signature footer drifting out of the body so the
 *    owner can't see which platform / which user the message came from.
 *  - A long body silently being handed to the OS as a 5000-char URL,
 *    which Outlook + older mail clients will truncate or refuse.
 *  - Special characters in the body (newlines, &, ?) breaking the
 *    mailto: query parameters via incorrect / missing escaping.
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
}));

import { buildMailtoUrl, sendFeedback, openFeedbackComposer, FEEDBACK_EMAIL } from '../feedback';

const mockLinking = jest.requireMock('react-native').Linking as {
  canOpenURL: jest.Mock;
  openURL: jest.Mock;
};
const mockAlert = jest.requireMock('react-native').Alert as { alert: jest.Mock };
const mockPlatform = jest.requireMock('react-native').Platform as { OS: string };

describe('FEEDBACK_EMAIL', () => {
  it('points at the maintainer inbox', () => {
    // If this assertion ever flips, every feedback message in the app
    // would silently redirect — make the change loud.
    expect(FEEDBACK_EMAIL).toBe('skylerhalisky@gmail.com');
  });
});

describe('buildMailtoUrl', () => {
  it('addresses the maintainer with the canonical subject', () => {
    const url = buildMailtoUrl({ body: 'hello' });
    expect(url.startsWith(`mailto:${FEEDBACK_EMAIL}?`)).toBe(true);
    expect(url).toContain(`subject=${encodeURIComponent('AccessMap feedback')}`);
  });

  it('appends the category label to the subject when one is given', () => {
    const url = buildMailtoUrl({ body: 'x', category: 'bug' });
    expect(url).toContain(`subject=${encodeURIComponent('AccessMap feedback: Bug')}`);
  });

  it('prefixes the body with a Category line when one is given', () => {
    const url = buildMailtoUrl({ body: 'something cool', category: 'love' });
    const bodyParam = url.split('&body=')[1] ?? '';
    const decoded = decodeURIComponent(bodyParam);
    expect(decoded).toContain('Category: Love');
    expect(decoded).toContain('something cool');
  });

  it('omits the Category prefix when no category is given (About flow)', () => {
    const url = buildMailtoUrl({ body: 'general thoughts' });
    const bodyParam = url.split('&body=')[1] ?? '';
    const decoded = decodeURIComponent(bodyParam);
    expect(decoded).not.toContain('Category:');
    expect(decoded.startsWith('general thoughts')).toBe(true);
  });

  it('combines reply-to + category prefixes when both are given', () => {
    const url = buildMailtoUrl({
      body: 'both',
      contactEmail: 'me@example.com',
      category: 'idea',
    });
    const bodyParam = url.split('&body=')[1] ?? '';
    const decoded = decodeURIComponent(bodyParam);
    // Reply-to should come before the Category line.
    const replyIdx = decoded.indexOf('Reply to:');
    const catIdx = decoded.indexOf('Category:');
    expect(replyIdx).toBeGreaterThanOrEqual(0);
    expect(catIdx).toBeGreaterThan(replyIdx);
  });

  it('URL-encodes the body so newlines and specials survive', () => {
    const url = buildMailtoUrl({ body: 'line 1\nline & 2\n? line 3' });
    // The encoded body section should contain percent-escaped versions
    // of newline (%0A), ampersand (%26), and question mark (%3F).
    const bodyParam = url.split('&body=')[1] ?? '';
    expect(bodyParam).toContain('%0A'); // newline
    expect(bodyParam).toContain('%26'); // ampersand
    expect(bodyParam).toContain('%3F'); // question mark
  });

  it('prepends the reply email to the body when provided', () => {
    const url = buildMailtoUrl({
      body: 'love it',
      contactEmail: 'me@example.com',
    });
    const bodyParam = url.split('&body=')[1] ?? '';
    const decoded = decodeURIComponent(bodyParam);
    expect(decoded.startsWith('Reply to: me@example.com\n\n')).toBe(true);
    expect(decoded).toContain('love it');
  });

  it('omits the reply prefix when no contact is given', () => {
    const url = buildMailtoUrl({ body: 'anon thoughts' });
    const bodyParam = url.split('&body=')[1] ?? '';
    const decoded = decodeURIComponent(bodyParam);
    expect(decoded.startsWith('Reply to:')).toBe(false);
    expect(decoded.startsWith('anon thoughts')).toBe(true);
  });

  it('appends a platform footer so the owner sees iOS vs Android vs web', () => {
    const url = buildMailtoUrl({ body: 'x' });
    const bodyParam = url.split('&body=')[1] ?? '';
    const decoded = decodeURIComponent(bodyParam);
    expect(decoded).toContain('Sent from AccessMap on ios');
  });

  it('caps an oversized body to keep the URL under mail-client limits', () => {
    // 3000 'a's is well over the 1800-char cap defined in feedback.ts.
    // Verify the decoded body's user-supplied portion has been clipped.
    const big = 'a'.repeat(3000);
    const url = buildMailtoUrl({ body: big });
    const bodyParam = url.split('&body=')[1] ?? '';
    const decoded = decodeURIComponent(bodyParam);
    // Strip footer to count just the user-supplied portion.
    const userPortion = decoded.split('\n\n---\n')[0] ?? '';
    expect(userPortion.length).toBeLessThanOrEqual(1800);
  });

  it('trims surrounding whitespace from the body before encoding', () => {
    const url = buildMailtoUrl({ body: '   spaced out   ' });
    const bodyParam = url.split('&body=')[1] ?? '';
    const decoded = decodeURIComponent(bodyParam);
    const userPortion = decoded.split('\n\n---\n')[0] ?? '';
    expect(userPortion).toBe('spaced out');
  });
});

// ---------------------------------------------------------------------------
// sendFeedback — integration paths (Linking mocked)
// ---------------------------------------------------------------------------

describe('sendFeedback', () => {
  beforeEach(() => {
    mockLinking.canOpenURL.mockReset();
    mockLinking.openURL.mockReset();
    mockPlatform.OS = 'ios';
  });

  it('returns {status: "opened"} when mail client is available', async () => {
    mockLinking.canOpenURL.mockResolvedValue(true);
    mockLinking.openURL.mockResolvedValue(undefined);
    const result = await sendFeedback({ body: 'hello' });
    expect(result).toEqual({ status: 'opened' });
    expect(mockLinking.openURL).toHaveBeenCalledTimes(1);
  });

  it('returns {status: "unavailable"} when canOpenURL is false on native', async () => {
    mockLinking.canOpenURL.mockResolvedValue(false);
    const result = await sendFeedback({ body: 'hello' });
    expect(result.status).toBe('unavailable');
    expect((result as { status: 'unavailable'; url: string }).url).toMatch(/^mailto:/);
    expect(mockLinking.openURL).not.toHaveBeenCalled();
  });

  it('skips canOpenURL check on web and calls openURL directly', async () => {
    mockPlatform.OS = 'web';
    mockLinking.openURL.mockResolvedValue(undefined);
    const result = await sendFeedback({ body: 'web feedback' });
    expect(result).toEqual({ status: 'opened' });
    expect(mockLinking.canOpenURL).not.toHaveBeenCalled();
    expect(mockLinking.openURL).toHaveBeenCalledTimes(1);
  });

  it('returns {status: "error"} when openURL throws', async () => {
    mockLinking.canOpenURL.mockResolvedValue(true);
    mockLinking.openURL.mockRejectedValue(new Error('no handler'));
    const result = await sendFeedback({ body: 'hello' });
    expect(result.status).toBe('error');
    expect((result as { status: 'error'; message: string }).message).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// openFeedbackComposer — convenience wrapper
// ---------------------------------------------------------------------------

describe('openFeedbackComposer', () => {
  beforeEach(() => {
    mockLinking.canOpenURL.mockReset();
    mockLinking.openURL.mockReset();
    mockAlert.alert.mockReset();
    mockPlatform.OS = 'ios';
  });

  it('does not show an alert when mail opens successfully', async () => {
    mockLinking.canOpenURL.mockResolvedValue(true);
    mockLinking.openURL.mockResolvedValue(undefined);
    await openFeedbackComposer();
    expect(mockAlert.alert).not.toHaveBeenCalled();
  });

  it('shows a fallback Alert with the email address when unavailable', async () => {
    mockLinking.canOpenURL.mockResolvedValue(false);
    await openFeedbackComposer();
    expect(mockAlert.alert).toHaveBeenCalledTimes(1);
    const [, bodyArg] = mockAlert.alert.mock.calls[0] as [string, string];
    expect(bodyArg).toContain(FEEDBACK_EMAIL);
  });

  it('shows a fallback Alert when openURL throws', async () => {
    mockLinking.canOpenURL.mockResolvedValue(true);
    mockLinking.openURL.mockRejectedValue(new Error('blocked'));
    await openFeedbackComposer();
    expect(mockAlert.alert).toHaveBeenCalledTimes(1);
  });
});
