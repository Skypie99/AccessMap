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

import { buildMailtoUrl, FEEDBACK_EMAIL } from '../feedback';

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
