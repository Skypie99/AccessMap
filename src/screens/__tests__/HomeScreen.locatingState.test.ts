/**
 * D4/C2 — Home's peek caption may only say "Finding your location…" when that
 * is actually happening.
 *
 * Three separate honesty conditions have to hold at once, and each is easy to
 * drop in a later edit, so each is pinned here:
 *
 *   1. the probe must be genuinely in flight (`peekLocationState` — unit-tested
 *      in src/lib/__tests__/location.test.ts);
 *   2. there must be no center already known, so the slot can never contradict
 *      a screen that is already showing a place;
 *   3. the read must still be in flight after a reveal delay — a DENIED check
 *      returns in milliseconds while `loading` is true, so without the delay
 *      every denied user gets a one-frame claim that a search is happening.
 *
 * Source contracts rather than a render test: HomeScreen needs a navigator, a
 * safe-area provider, a flags store and a map before it will mount, and none of
 * that makes these conditions any truer. The felt behaviour on a real GPS —
 * including whether 300 ms is the right delay — is a Sky device item.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const readSrc = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');
const home = readSrc('screens/HomeScreen.tsx');
const mapScreen = readSrc('screens/MapScreen.tsx');

describe('D4/C2 — the probe reports its state, not just its result', () => {
  it('widens LocationProbe to deliver the collapsed state upward', () => {
    expect(home).toMatch(/onState: \(state: PeekLocationState\) => void/);
    expect(home).toMatch(/const \{ location, loading, error, permissionDenied \} = useUserLocation\(/);
    expect(home).toMatch(/const state = peekLocationState\(\{ location, loading, error, permissionDenied \}\)/);
  });

  it('routes it into the screen through the pure helper, not an ad-hoc condition', () => {
    expect(home).toMatch(/import \{ peekLocationState, useUserLocation, type PeekLocationState \}/);
    expect(home).toMatch(/onState=\{setProbeState\}/);
  });
});

describe('D4/C2 — all three honesty conditions gate the caption', () => {
  it('requires no known center, an in-flight read, AND the reveal delay', () => {
    expect(home).toMatch(
      /const showLocating = !hasCenter && probeState === 'locating' && locatingRevealed;/,
    );
  });

  it('arms the reveal delay only while locating, and disarms it otherwise', () => {
    expect(home).toMatch(/if \(probeState !== 'locating'\) \{\s*\n\s*setLocatingRevealed\(false\);/);
    expect(home).toMatch(/setTimeout\(\(\) => setLocatingRevealed\(true\), 300\)/);
  });

  it('clears the timer on unmount so a backgrounded screen cannot fire it late', () => {
    expect(home).toMatch(/return \(\) => clearTimeout\(timer\);/);
  });
});

describe('D4/C2 — one voice, one slot', () => {
  it('reuses the app’s already-shipped wording byte-for-byte', () => {
    const SHIPPED = 'Finding your location…';
    // The same words the Map already uses for the same state — not a second
    // vocabulary for one idea.
    expect(mapScreen).toContain(SHIPPED);
    expect(home).toContain(SHIPPED);
  });

  it('renders as quiet stage text — no card, no pane, no icon', () => {
    // The caption is an AppText on the screen's gradient. If it ever grows a
    // GlassSurface wrapper it has become a component, and that is a design
    // decision, not a refactor.
    expect(home).toMatch(/style=\{styles\.peekCaption\}/);
    expect(home).toMatch(/peekCaption: \{[\s\S]{0,220}?color: color\.inkOnStage,/);
    expect(home).not.toMatch(/<GlassSurface[^>]*peekCaption/);
  });

  it('announces politely and scales with Dynamic Type', () => {
    expect(home).toMatch(/accessibilityLiveRegion="polite"\s*\n\s*maxFontSizeMultiplier=\{1\.4\}/);
    expect(home).toMatch(/accessibilityRole="text"/);
  });

  it('sets no fixed height on the caption, so large type can grow it', () => {
    const block = home.match(/peekCaption: \{[\s\S]*?\},/)?.[0] ?? '';
    expect(block).not.toMatch(/\bheight:/);
    expect(block).toMatch(/lineHeight: 19/);
  });
});

describe('D4/C2 — the fix adds no motion to Home', () => {
  it('leaves Home free of Animated and reduce-motion plumbing', () => {
    // The caption appears and disappears; it does not animate. Home has never
    // needed a reduce-motion branch and must not acquire one here.
    expect(home).not.toMatch(/useReducedMotion/);
    expect(home).not.toMatch(/\bAnimated\./);
  });
});
