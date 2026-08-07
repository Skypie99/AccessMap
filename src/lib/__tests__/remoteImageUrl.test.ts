/**
 * Guard tests for the remote-image allow-list (security audit 2026-07-31,
 * findings TB-3 / IO-3 / IO-1).
 *
 * The point of these tests is NON-VACUITY: they must fail if the allow-list is
 * removed. Each "blocks" case is a URL that renders fine today and would
 * beacon the viewer's IP to an attacker-controlled host. Each "allows" case is
 * a URL the app legitimately produces — if one of those regresses, real photos
 * stop rendering, which is a worse bug than the one being fixed.
 */

import { isAllowedImageUrl, safeImageUrl } from '../remoteImageUrl';

// jest.setup.js sets EXPO_PUBLIC_SUPABASE_URL; derive the same origin the
// module derived so the test does not hardcode the project ref.
const ORIGIN = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL as string).origin;
const GOOD = `${ORIGIN}/storage/v1/object/public/flag-photos/abc-123/1700000000000.jpg`;

describe('isAllowedImageUrl — the attack it exists to stop', () => {
  it('blocks an arbitrary attacker-controlled https host', () => {
    // This is the finding: a hostile row sets photo_url to a server it owns and
    // harvests the IP + timestamp of everyone who views the report.
    expect(isAllowedImageUrl('https://attacker.example/beacon.jpg')).toBe(false);
  });

  it('blocks a lookalike host that a substring check would let through', () => {
    // `.includes('supabase.co')` — the mistake this module deliberately avoids.
    expect(isAllowedImageUrl('https://evil-supabase.co.attacker.test/x.jpg')).toBe(false);
    expect(isAllowedImageUrl(`https://attacker.test/?u=${ORIGIN}/storage/v1/object/public/x`)).toBe(
      false,
    );
  });

  it('blocks a subdomain of the real origin', () => {
    const host = new URL(ORIGIN).host;
    expect(isAllowedImageUrl(`https://evil.${host}/storage/v1/object/public/x.jpg`)).toBe(false);
  });

  it('blocks the right host on a non-storage path', () => {
    expect(isAllowedImageUrl(`${ORIGIN}/rest/v1/users`)).toBe(false);
    expect(isAllowedImageUrl(`${ORIGIN}/`)).toBe(false);
  });

  it('pins the scheme — a same-host origin on the other scheme is rejected', () => {
    // Origin comparison includes the scheme, so in production (https://…) an
    // http:// twin is rejected. We assert the property rather than hardcoding
    // https, because the local/test Supabase legitimately runs on http://.
    const { protocol, host } = new URL(ORIGIN);
    const otherScheme = protocol === 'https:' ? 'http:' : 'https:';
    expect(
      isAllowedImageUrl(`${otherScheme}//${host}/storage/v1/object/public/flag-photos/a/b.jpg`),
    ).toBe(false);
  });

  it('blocks junk, relative paths and empties', () => {
    for (const bad of ['', '   ', 'not a url', '/relative/path.jpg', '//attacker.example/x.jpg']) {
      expect(isAllowedImageUrl(bad)).toBe(false);
    }
    expect(isAllowedImageUrl(null)).toBe(false);
    expect(isAllowedImageUrl(undefined)).toBe(false);
  });
});

describe('isAllowedImageUrl — what must keep working', () => {
  it('allows this project’s Storage public objects', () => {
    expect(isAllowedImageUrl(GOOD)).toBe(true);
    expect(
      isAllowedImageUrl(`${ORIGIN}/storage/v1/object/public/flag-photos/uid/avatar/1.png`),
    ).toBe(true);
  });

  it('allows local just-picked photo schemes (upload previews)', () => {
    // Breaking any of these breaks photo picking on some platform, which is
    // exactly the "hardening that breaks legitimate use" this must not be.
    const local = [
      'file:///var/mobile/tmp/pic.jpg',
      'content://media/external/images/media/42',
      'ph://ABC-123/L0/001',
      'assets-library://asset/asset.JPG?id=1&ext=JPG',
      'data:image/png;base64,iVBORw0KGgo=',
      'blob:http://localhost:8081/9f4c-1',
    ];
    for (const uri of local) expect(isAllowedImageUrl(uri)).toBe(true);
  });

  it('tolerates incidental whitespace around a good URL', () => {
    expect(isAllowedImageUrl(`  ${GOOD}  `)).toBe(true);
  });
});

describe('safeImageUrl', () => {
  it('passes a good URL through and nulls a hostile one', () => {
    expect(safeImageUrl(GOOD)).toBe(GOOD);
    expect(safeImageUrl('https://attacker.example/beacon.jpg')).toBeNull();
    expect(safeImageUrl(null)).toBeNull();
  });
});
