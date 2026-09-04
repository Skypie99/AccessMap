/**
 * Guard tests for the Vercel security headers (security audit 2026-07-31,
 * finding PL-1 / IO-6).
 *
 * The load-bearing risk here is NOT a missing header — it is a CSP that ships
 * enforcing and silently breaks the map. Every origin the web build actually
 * talks to is asserted against the source that uses it, so if someone swaps the
 * tile provider or adds an API host, this fails instead of the live site.
 *
 * The OpenFreeMap vector basemap requests styles, sprites, fonts, and tiles
 * from one host. It must be admitted to both image and connection policies;
 * Supabase Realtime still requires its websocket origin as well.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')) as {
  headers?: { source: string; headers: { key: string; value: string }[] }[];
};

const headerMap = new Map(
  (vercel.headers?.[0]?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]),
);
const csp = headerMap.get('content-security-policy-report-only') ?? '';

describe('PL-1 — the headers exist at all', () => {
  it('serves the four enforced headers Vercel does not add by default', () => {
    expect(headerMap.get('x-content-type-options')).toBe('nosniff');
    expect(headerMap.get('x-frame-options')).toBe('DENY');
    // Referrer-Policy is not cosmetic here: it strips the path from the Referer
    // sent to any third-party image host, which blunts the TB-3/IO-1 beacon.
    expect(headerMap.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(headerMap.get('permissions-policy')).toBeDefined();
  });

  it('ships CSP in Report-Only, not enforcing', () => {
    // Deliberate: one audit pass found four undocumented breakage vectors, so
    // the first ship must not be able to break the live demo. Flipping to
    // enforcing is Sky's call after she has watched the violation reports.
    expect(csp).not.toBe('');
    expect(headerMap.has('content-security-policy')).toBe(false);
  });

  it('does not declare HSTS — Vercel already serves it', () => {
    // Verified live 2026-07-31: `strict-transport-security: max-age=63072000`.
    // Restating it here would be a second source of truth for no benefit.
    expect(headerMap.has('strict-transport-security')).toBe(false);
  });
});

describe('PL-1 — the CSP admits every origin the app really uses', () => {
  it('allows the OpenFreeMap host in BOTH img-src and connect-src', () => {
    const openFreeMap = 'https://tiles.openfreemap.org';
    expect(csp).toMatch(new RegExp(`img-src[^;]*${openFreeMap}`));
    expect(csp).toMatch(new RegExp(`connect-src[^;]*${openFreeMap}`));
    expect(csp).not.toContain('cartocdn.com');
  });

  it('does NOT list the OpenStreetMap tile host the app no longer uses', () => {
    // Phase A's draft listed it. Shipping a policy written against the old
    // provider is how a CSP blocks every tile on the map.
    expect(csp).not.toContain('tile.openstreetmap.org');
  });

  it('allows the Supabase Realtime websocket origin', () => {
    // flagsStore and useComments both open realtime channels. `https://` in
    // connect-src does not cover `wss://`.
    expect(csp).toMatch(/connect-src[^;]*wss:\/\/[a-z0-9]+\.supabase\.co/);
  });

  it('allows Nominatim, used for address lookup', () => {
    expect(csp).toMatch(/connect-src[^;]*https:\/\/nominatim\.openstreetmap\.org/);
  });

  it('carries a hash for the single inline service-worker registration script', () => {
    // Without this, script-src 'self' blocks SW registration and kills the PWA.
    const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>(.*?)<\/script>/gs)].map(
      (m) => m[1],
    );
    expect(inline).toHaveLength(1);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require('crypto') as typeof import('crypto');
    const digest = crypto.createHash('sha256').update(inline[0], 'utf8').digest('base64');
    expect(csp).toContain(`'sha256-${digest}'`);
  });

  it('keeps style-src unsafe-inline — react-native-web injects styles at runtime', () => {
    // Not an oversight. Removing it breaks the whole UI on web.
    expect(csp).toMatch(/style-src[^;]*'unsafe-inline'/);
  });

  it("does not weaken script-src with 'unsafe-eval'", () => {
    // The async chunk loader uses script-tag injection, not eval; the eval
    // path is gated on `typeof window === 'undefined'` and never taken in a
    // browser. Adding it defensively would weaken the policy for nothing.
    expect(csp).not.toContain('unsafe-eval');
  });

  it('locks down framing, base URI and objects', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
  });
});

describe('PL-1 — Permissions-Policy matches what the app genuinely needs', () => {
  it('keeps geolocation and camera available to the app itself', () => {
    // The whole product is "drop a pin where you are, optionally with a photo".
    // A policy that denied these would be a security fix that breaks the app.
    const pp = headerMap.get('permissions-policy') ?? '';
    expect(pp).toContain('geolocation=(self)');
    expect(pp).toContain('camera=(self)');
  });

  it('denies microphone, which the app never uses', () => {
    expect(headerMap.get('permissions-policy')).toContain('microphone=()');
  });
});
