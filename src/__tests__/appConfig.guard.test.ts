/**
 * SHIP-READY Phase 2 — app.json invariants that decide whether a build can be
 * uploaded at all.
 *
 * These are upload-time failures, not runtime ones: nothing in tsc, eslint or
 * the render tree can see them, and the first feedback is a rejected binary.
 * A static read of the config is the only cheap guard that exists.
 *
 * House idiom: static source/config scan (cf. perceptionGuards.test.ts,
 * drawerRoutes.guard.test.ts). No existing test parses app.json, so there is
 * no collision — verified before writing this file.
 */
import fs from 'fs';
import path from 'path';

const REPO = path.join(__dirname, '..', '..');
const app = JSON.parse(fs.readFileSync(path.join(REPO, 'app.json'), 'utf8')).expo;

describe('B-4 (SR-011) — the app icon carries no alpha channel', () => {
  // ITMS-90717: App Store Connect rejects an icon with an alpha channel. The
  // icon shipped as PNG color type 6 (RGBA) with genuinely transparent corners
  // (the SVG's rounded-corner mask), so this was an upload-blocking defect
  // that nothing in the test suite could see.
  //
  // Read the PNG header directly — no image library needed, and a header read
  // cannot be fooled by a re-save that leaves a tRNS chunk behind.
  const png = fs.readFileSync(path.join(REPO, 'assets', 'brand', 'app-icon.png'));

  it('is a 1024x1024 8-bit PNG', () => {
    expect(png.readUInt32BE(16)).toBe(1024); // IHDR width
    expect(png.readUInt32BE(20)).toBe(1024); // IHDR height
    expect(png[24]).toBe(8); // bit depth
  });

  it('is color type 2 (truecolor, NO alpha)', () => {
    // 6 = RGBA, which is what shipped and what ITMS-90717 rejects.
    expect(png[25]).toBe(2);
  });

  it('carries no tRNS chunk (which would re-introduce transparency)', () => {
    expect(png.includes(Buffer.from('tRNS'))).toBe(false);
  });

  it('is still the file app.json points at for both icon and splash', () => {
    // One asset, two references — a re-export changes both. Kept explicit so
    // the coupling is visible if either ever moves.
    expect(app.icon).toBe('./assets/brand/app-icon.png');
    expect(app.splash.image).toBe('./assets/brand/app-icon.png');
    expect(app.splash.backgroundColor).toBe('#1466E0');
  });
});

describe('B-5 (SR-012) — iPhone-only, so ITMS-90474 cannot fire', () => {
  // portrait + supportsTablet:true + no requireFullScreen is the documented
  // ITMS-90474 upload-failure shape. Sky's recorded pick (DECISIONS §SKY) is
  // IPHONE-ONLY for v1: it sidesteps ITMS-90474 AND the iPadOS-26 windowing
  // migration debt AND 02 §T's tablet-layout debt, and the app still runs on
  // iPad in compatibility mode.
  it('does not claim tablet support', () => {
    expect(app.ios.supportsTablet).toBe(false);
  });

  it('stays portrait-only (deliberate; only a problem alongside supportsTablet)', () => {
    expect(app.orientation).toBe('portrait');
  });

  it('needs no requireFullScreen once tablet support is off', () => {
    // If supportsTablet ever returns, this key becomes mandatory — the test
    // above fails first and points here.
    expect(app.ios.requireFullScreen).toBeUndefined();
  });
});
