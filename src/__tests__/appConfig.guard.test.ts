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
