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

describe('R-8 (SR-003/004) — a durable privacy manifest that survives prebuild', () => {
  // `ios/` is gitignored, so the hand-written ios/AccessMap/PrivacyInfo.xcprivacy
  // never shipped — and its NSPrivacyCollectedDataTypes was empty anyway, which
  // contradicts what the app actually collects. Declaring the manifest in
  // app.json is what makes it survive every EAS prebuild.
  const pm = app.ios.privacyManifests;

  it('declares no tracking', () => {
    expect(pm.NSPrivacyTracking).toBe(false);
    expect(pm.NSPrivacyTrackingDomains).toEqual([]);
  });

  it('declares exactly the 7 data types the app really collects', () => {
    expect(pm.NSPrivacyCollectedDataTypes).toHaveLength(7);
    expect(pm.NSPrivacyCollectedDataTypes.map((d: { NSPrivacyCollectedDataType: string }) => d.NSPrivacyCollectedDataType).sort())
      .toEqual([
        'NSPrivacyCollectedDataTypeDeviceID',
        'NSPrivacyCollectedDataTypeEmailAddress',
        'NSPrivacyCollectedDataTypeName',
        'NSPrivacyCollectedDataTypeOtherUserContent',
        'NSPrivacyCollectedDataTypePhotosorVideos',
        'NSPrivacyCollectedDataTypePreciseLocation',
        'NSPrivacyCollectedDataTypeUserID',
      ]);
  });

  it('every declared type is untracked and app-functionality only', () => {
    for (const d of pm.NSPrivacyCollectedDataTypes) {
      expect(d.NSPrivacyCollectedDataTypeTracking).toBe(false);
      expect(d.NSPrivacyCollectedDataTypePurposes).toEqual(['NSPrivacyCollectedDataTypePurposeAppFunctionality']);
    }
  });

  it('declares NO Diagnostics or Usage data (nothing ships that collects it)', () => {
    // This must stay absent until a crash reporter actually ships (R-11). The
    // manifest and the App Store Connect nutrition labels are cross-read by
    // reviewers, so an aspirational row here becomes an inconsistency there.
    const names = pm.NSPrivacyCollectedDataTypes.map((d: { NSPrivacyCollectedDataType: string }) => d.NSPrivacyCollectedDataType);
    expect(names.some((n: string) => /Diagnostic|Crash|ProductInteraction|Usage/.test(n))).toBe(false);
  });
});

describe('R-8 (SR-005) — no boilerplate purpose strings regenerate on prebuild', () => {
  // Expo autolinks dependency plugins even when they are not listed in
  // `plugins[]`, so their DEFAULT purpose strings regenerate into Info.plist
  // on every prebuild — including a microphone string for a feature this app
  // does not have. `false` removes the key entirely (Expo plugin convention).
  const plugins = app.plugins as unknown[];
  const propsFor = (name: string) =>
    (plugins.find((p) => Array.isArray(p) && p[0] === name) as [string, Record<string, unknown>])[1];

  it('kills both Always-location strings', () => {
    const loc = propsFor('expo-location');
    expect(loc.locationAlwaysPermission).toBe(false);
    expect(loc.locationAlwaysAndWhenInUsePermission).toBe(false);
  });

  it('kills the microphone string (there is no audio feature)', () => {
    expect(propsFor('expo-image-picker').microphonePermission).toBe(false);
  });

  it('the kept purpose strings are byte-identical to ios.infoPlist (no new copy)', () => {
    // The honesty fence: this commit authors no wording. Every string the
    // overrides keep is the one already shipped.
    const loc = propsFor('expo-location');
    const pick = propsFor('expo-image-picker');
    expect(loc.locationWhenInUsePermission).toBe(app.ios.infoPlist.NSLocationWhenInUseUsageDescription);
    expect(pick.photosPermission).toBe(app.ios.infoPlist.NSPhotoLibraryUsageDescription);
    expect(pick.cameraPermission).toBe(app.ios.infoPlist.NSCameraUsageDescription);
  });
});

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
