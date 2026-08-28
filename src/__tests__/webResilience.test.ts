/**
 * Web resilience trio — source-level invariants (L2 + L3 + L7, re-sweep
 * 2026-06-09).
 *
 *  - L2: FlagDetailModal's coords copy button must NOT call a bare
 *        Share.share (unhandled rejection on Firefox desktop, where RN Web's
 *        Share rejects). It routes through handleCopyCoords: webShare helper
 *        on web (navigator.share → clipboard → window.alert fallback) and a
 *        try/caught Share.share on native.
 *  - L3: PlatformMap.web's marker popup photo renders through PopupPhoto,
 *        which swaps a failed <img> for a "Photo unavailable" placeholder
 *        via onError, keyed by src so a new URL retries fresh.
 *  - L7: blob object-URL leaks — ReportFlagModal releases draft photo URLs
 *        post-settle only (removeUri + reset, never the failure path), and
 *        ProfileScreen's avatar picker revokes its object URL when the
 *        upload settles (F25 pattern).
 *
 * These are SOURCE-LEVEL invariants in the established repo style (see
 * qaMergeConsolidation.test.ts): full renders of these components need a web
 * DOM / leaflet harness the suite intentionally doesn't carry. Behavioral
 * coverage for the L7 release lives in ReportFlagModal.test.tsx ("blob URL
 * release — L7"); webShare itself is unit-tested in lib/__tests__/webShare.
 * Anchors are stable semantic strings, not line numbers.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

/** Return a window of `len` chars starting at the first occurrence of `anchor`. */
function around(haystack: string, anchor: string, len = 500): string {
  const i = haystack.indexOf(anchor);
  if (i < 0) throw new Error(`anchor not found: ${anchor}`);
  return haystack.slice(i, i + len);
}

// ===========================================================================
// L2 — FlagDetailModal coords copy button
// ===========================================================================

describe('L2 — FlagDetailModal coords copy goes through handleCopyCoords', () => {
  const modal = read('components/FlagDetailModal.tsx');

  it('imports the tested webShare helper', () => {
    expect(modal).toContain("import { webShare } from '@/lib/webShare'");
  });

  it('the coords copy Pressable uses the handler, not an inline Share.share', () => {
    // RE-PINNED 2026-08-21 (GSP-02 §2.1, Q17): the coords ROW (selectable
    // monospace + a copy glyph) became one "Copy coordinates" LINK. The rule is
    // untouched — whatever draws it, the copy path goes through the tested
    // handler and never an inline Share.share.
    const row = around(modal, 'onPress={handleCopyCoords}', 900);
    expect(row).toContain('styles.copyCoordsLink');
    expect(row).not.toContain('Share.share');
  });

  it('web branch: webShare with the coords, window.alert(formattedCoords) as last resort', () => {
    const handler = around(modal, 'const handleCopyCoords', 2400);
    expect(handler).toContain("Platform.OS === 'web'");
    expect(handler).toMatch(/webShare\(\{ title: 'Flag coordinates', text: formattedCoords \}\)/);
    expect(handler).toContain('window.alert(formattedCoords)');
  });

  it('native branch: Share.share is wrapped in try/catch with silent user-cancel', () => {
    const handler = around(modal, 'const handleCopyCoords', 2400);
    expect(handler).toMatch(/try \{\s*await Share\.share\(\{ message: formattedCoords/);
    expect(handler).toMatch(/\/cancel\|dismiss\/i\.test\(msg\)/);
    expect(handler).toContain('Alert.alert("Couldn\'t copy coordinates"');
  });
});

// ===========================================================================
// L3 — PlatformMap.web popup photo error state
// ===========================================================================

describe('L3 — PlatformMap.web popup photo has an onError fallback', () => {
  const map = read('components/PlatformMap.web.tsx');

  it('defines PopupPhoto with a "Photo unavailable" placeholder keyed by src', () => {
    const cmp = around(map, 'function PopupPhoto', 1600);
    expect(cmp).toContain('useState<string | null>(null)');
    // Keyed/reset by src: the failure remembers WHICH url broke, so a new
    // photo url automatically gets a fresh attempt.
    expect(cmp).toContain('failedSrc === src');
    expect(cmp).toContain('onError={() => setFailedSrc(src)}');
    expect(cmp.match(/Photo unavailable/g)?.length).toBeGreaterThanOrEqual(2); // aria-label + visible text
  });

  it('the marker popup renders the photo through PopupPhoto, not a bare <img>', () => {
    // Security audit 2026-07-31 (TB-3): the popup photo is now gated by
    // `safeImageUrl`, so `photo_url` is no longer passed through raw. The
    // original intent — goes through PopupPhoto, never a bare <img> — still
    // holds and is still asserted; the allow-list is asserted alongside it.
    const popup = around(map, 'safeImageUrl(flag.photo_url) ? (', 400);
    expect(popup).toContain('<PopupPhoto');
    expect(popup).toContain('src={safeImageUrl(flag.photo_url)');
    expect(popup).not.toContain('<img');
  });
});

// ===========================================================================
// L7 — blob object-URL releases
// ===========================================================================

describe('L7 — ReportFlagModal releases draft blob URLs post-settle only', () => {
  const report = read('screens/ReportFlagModal.tsx');

  it('defines releaseUri with the blob:-prefix guard around revokeObjectURL', () => {
    const helper = around(report, 'const releaseUri', 400);
    expect(helper).toContain("uri.startsWith('blob:')");
    expect(helper).toContain('URL.revokeObjectURL(uri)');
  });

  it('removeUri releases the discarded pick', () => {
    const remove = around(report, 'const removeUri', 500);
    expect(remove).toContain('releaseUri(removed)');
  });

  it('reset() releases all remaining drafts (runs only after a successful submit)', () => {
    const reset = around(report, 'const reset = ()', 600);
    expect(reset).toContain('photoUris.forEach(releaseUri)');
  });

  it('the submit FAILURE path does not release — drafts must survive for retry', () => {
    // D1F4 delegates uncertain upload outcomes to the server, but must still
    // retain draft blob URLs for a report retry.
    const catchBlock = around(report, 'void Promise.all(preparedPhotos.map', 500);
    expect(catchBlock).toContain('cancelFlagPhotoUpload');
    expect(catchBlock).not.toContain('releaseUri');
    expect(catchBlock).not.toContain('revokeObjectURL');
  });
});

describe('L7 — ProfileScreen avatar picker revokes its object URL on settle', () => {
  const profile = read('screens/ProfileScreen.tsx');

  it('hoists the object URL and revokes it in .finally (F25 pattern)', () => {
    const pick = around(profile, 'input.onchange', 700);
    expect(pick).toContain('const url = URL.createObjectURL(file)');
    expect(pick).toContain('void doUploadAvatar(url).finally(() => URL.revokeObjectURL(url))');
  });
});

// ---------------------------------------------------------------------------
// A11Y-232 (SR-073) + L3-1 — the two web-shell accessibility affordances the
// 2026-07-31 a11y train added. Both live in public/index.html because they must
// exist BEFORE the JS bundle parses: a Reduce-Transparency user should never
// see a frame of blur, and a keyboard user's first Tab should already work.
// ---------------------------------------------------------------------------
describe('a11y web shell', () => {
  const shell = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'index.html'), 'utf8');

  it('A11Y-232: reduce-transparency has a media query twin, like reduce-motion', () => {
    expect(shell).toContain('@media (prefers-reduced-transparency: reduce)');
    expect(shell).toContain('backdrop-filter: none !important');
    // Its pair — proof the two accommodations are handled the same way.
    expect(shell).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('L3-1: a skip link exists, targets the app root, and is keyboard-only', () => {
    expect(shell).toContain('class="am-skip-link" href="#root"');
    expect(shell).toContain('Skip to content');
    // Off-screen until focused — never visible to pointer users.
    expect(shell).toMatch(/\.am-skip-link\s*\{[^}]*left:\s*-9999px/);
    expect(shell).toMatch(/\.am-skip-link:focus\s*\{[^}]*left:\s*0/);
  });
});
