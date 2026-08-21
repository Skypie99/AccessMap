/**
 * BP2 (R2 / T11 + T16) perception-floor guards.
 *
 * Locks the two structural repairs so a future edit can't silently regress them:
 *  - T16: the Tasks tab badge has ONE writer + ONE definition (open-only, capped,
 *    global/unfiltered). computeTasksBadge is that definition; TasksScreen writes
 *    no badge.
 *  - T11: inactive web scenes are `inert` (keyboard-focus isolation, WCAG 2.4.3);
 *    the named Map/Report chips announce state via aria-pressed (not the
 *    aria-selected channel Chromium drops on role=button).
 *
 * Behaviour of the DOM/inert wiring end-to-end is verified against the static
 * export by design-reviews/r2-audit/tools/probe-bp2-perception.mjs; these are the
 * fast in-CI guards for the pure logic + the source contracts.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { Platform } from 'react-native';
import { computeTasksBadge, applySceneInert } from '../perceptionHelpers';

describe('computeTasksBadge — the single Tasks-badge definition (T16)', () => {
  const f = (status: string) => ({ status });

  it('is undefined when there are no open flags (no badge at zero)', () => {
    expect(computeTasksBadge([])).toBeUndefined();
    expect(computeTasksBadge([f('verified'), f('resolved'), f('rejected')])).toBeUndefined();
  });

  it('counts ONLY open flags — never verified/resolved (global, unfiltered)', () => {
    expect(computeTasksBadge([f('open'), f('open'), f('verified'), f('resolved')])).toBe(2);
  });

  it('caps at 99', () => {
    expect(computeTasksBadge(Array.from({ length: 150 }, () => f('open')))).toBe(99);
    expect(computeTasksBadge(Array.from({ length: 99 }, () => f('open')))).toBe(99);
  });

  it('is one definition across a triage transition (open→verified drops the count)', () => {
    // pre-mount / post-triage from the SAME store must agree by construction —
    // this is exactly the mid-transition disagreement T16 removes.
    expect(computeTasksBadge([f('open'), f('open'), f('open')])).toBe(3);
    expect(computeTasksBadge([f('open'), f('open'), f('verified')])).toBe(2);
  });
});

describe('applySceneInert — web keyboard-focus isolation (T11 / F1-04)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('marks an INACTIVE scene inert on web (removes it from the tab order)', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const node: { inert?: boolean } = {};
    applySceneInert(node, false); // blurred → inert
    expect(node.inert).toBe(true);
    applySceneInert(node, true); // focused → interactive
    expect(node.inert).toBe(false);
  });

  it('is a no-op on native (focus is OS-drawn)', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const node: { inert?: boolean } = {};
    applySceneInert(node, false);
    expect(node.inert).toBeUndefined();
  });

  it('does not throw when the scene node is not mounted', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    expect(() => applySceneInert(null, false)).not.toThrow();
  });
});

describe('BP2 structural guards (source contracts)', () => {
  const readSrc = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');

  it('TasksScreen sets NO tabBarBadge — the single writer lives in RootNavigator', () => {
    expect(readSrc('screens/TasksScreen.tsx')).not.toMatch(/setOptions\([^)]*tabBarBadge/s);
  });

  // ADDED 2026-08-21 (art-direction Phase 0, item 0.6 / rule C7). The badge
  // counts what needs a look; it is not an OS alert, and the platform default
  // red was the one saturated colour in the app that meant nothing here.
  it('C7: the Tasks badge is painted ctaFill + textOnBrand, never the OS red default', () => {
    const src = readSrc('navigation/RootNavigator.tsx');
    expect(src).toMatch(
      /tabBarBadgeStyle: \{ backgroundColor: color\.ctaFill, color: color\.textOnBrand \}/,
    );
    // Non-vacuity: the badge itself has to still be wired, or the style above
    // is decoration on a control nobody renders.
    expect(src).toMatch(/tabBarBadge: tasksBadge/);
  });

  it('RootNavigator wires scene inert off focus (useIsFocused → applySceneInert)', () => {
    const src = readSrc('navigation/RootNavigator.tsx');
    expect(src).toMatch(/useIsFocused/);
    expect(src).toMatch(/applySceneInert/);
  });

  it('the named Map/Report chips announce via { pressed }, not the dropped { selected } channel', () => {
    // Chromium drops aria-selected on role=button, so these stateful chips must
    // not regress to a11yToggle({ selected: ... }). (checked/expanded/busy/disabled
    // and any future real role=tab are unaffected — they are not this pattern.)
    expect(readSrc('screens/MapScreen.tsx')).not.toMatch(/a11yToggle\(\{ selected:/);
    expect(readSrc('screens/ReportFlagModal.tsx')).not.toMatch(/a11yToggle\(\{ selected:/);
  });
});
