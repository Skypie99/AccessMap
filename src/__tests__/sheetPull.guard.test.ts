/**
 * THE PULL PRIMITIVE'S RAILS — the things that are true at a glance and wrong
 * six months later.
 *
 * SheetPull.test.tsx proves the gesture BEHAVES. This file proves the things
 * behaviour tests cannot see: that no sheet quietly lost its Close button once
 * "you can just swipe" became true, that a refactor did not tune a threshold
 * into meaninglessness, and that the gesture still routes through each
 * surface's own close handler instead of growing a second dismissal path.
 *
 * House idiom: static source scan (cf. dismissalStandard.guard.test.ts,
 * pageSheetSwipe.guard.test.ts).
 *
 * See design-reviews/map-gestures/2026-08-12/ SPEC §3.4.
 */
import fs from 'fs';
import path from 'path';
import {
  ACTIVATION_PT,
  COMMIT_FLOOR_PT,
  COMMIT_FRACTION,
  COMMIT_VELOCITY,
  COMMIT_VELOCITY_MIN_PT,
  FAIL_OFFSET_X,
} from '@/components/ui/SheetPull';

const SRC = path.join(__dirname, '..');
const PRIMITIVE = path.join(SRC, 'components', 'ui', 'SheetPull.tsx');

function stripComments(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank);
}

function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (['__tests__', '__mocks__', 'node_modules'].includes(entry.name)) continue;
      out.push(...walkTsx(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/**
 * Every surface that adopts the pull, DECLARED — so an adoption cannot land
 * half-wired. Asserted in both directions: a declared file must really import
 * the primitive, and a file that imports it without being declared FAILS. The
 * reverse direction is the one that matters, and it is why this list starting
 * empty is not a hole: the moment the first sheet adopts, it fails until it is
 * written down here and put through the checks below.
 *
 * `closeLabel` is the visible dismissal that must survive the gesture — Sky's
 * rule that gestures AUGMENT, never replace, expressed as a string this file
 * can actually look for.
 */
const ADOPTERS: readonly { rel: string; closeLabel: string }[] = [
  { rel: path.join('screens', 'ReportFlagModal.tsx'), closeLabel: 'Cancel and close' },
];

describe('SheetPull · the rails', () => {
  const primitiveSrc = stripComments(fs.readFileSync(PRIMITIVE, 'utf8'));

  it('the thresholds are real numbers in sane bands, not zeroes or infinities', () => {
    // The two failure shapes this blocks: a threshold refactored to 0 (the sheet
    // dismisses on the lightest touch — the trap) and one refactored huge (the
    // gesture is dead and nobody notices, because nothing errors).
    expect(ACTIVATION_PT).toBeGreaterThanOrEqual(8);
    expect(ACTIVATION_PT).toBeLessThanOrEqual(24);
    expect(COMMIT_FRACTION).toBeGreaterThan(0.15);
    expect(COMMIT_FRACTION).toBeLessThanOrEqual(0.5);
    expect(COMMIT_FLOOR_PT).toBeGreaterThanOrEqual(80);
    expect(COMMIT_FLOOR_PT).toBeLessThanOrEqual(200);
    expect(COMMIT_VELOCITY).toBeGreaterThanOrEqual(400);
    expect(COMMIT_VELOCITY).toBeLessThanOrEqual(1200);
    expect(COMMIT_VELOCITY_MIN_PT).toBeGreaterThan(0);
    expect(FAIL_OFFSET_X).toBeGreaterThan(0);
    // A flick must still travel less than a full deliberate drag, or the
    // velocity path is decorative.
    expect(COMMIT_VELOCITY_MIN_PT).toBeLessThan(COMMIT_FLOOR_PT);
  });

  it('the primitive gates its motion on the user preference', () => {
    expect(primitiveSrc).toContain('useReducedMotion');
    // Both settle paths have to branch, not just one: a spring-back that still
    // bounces under reduce-motion is the same violation as an animated exit.
    expect(primitiveSrc).toMatch(/if\s*\(reducedMotion\)/);
  });

  it('the primitive spends motion tokens, never bare durations', () => {
    // `duration: 180` would satisfy every other check here and silently drift
    // from DESIGN.md §8's scale.
    const bareDuration = /duration:\s*\d/.exec(primitiveSrc);
    expect(bareDuration?.[0] ?? null).toBeNull();
    expect(primitiveSrc).toContain('motion.duration.');
    expect(primitiveSrc).toContain('motion.spring.');
  });

  it('the drag runs on the native thread', () => {
    // useNativeDriver:false would still pass every behaviour test and every
    // other assertion here, while making the sheet stutter whenever JS is busy
    // — which, on the Report sheet, is exactly when flags are loading.
    expect(primitiveSrc).toContain('useNativeDriver: true');
    expect(primitiveSrc).not.toContain('useNativeDriver: false');
  });

  it('every adopter is declared, and every declared adopter really adopts', () => {
    const offenders: string[] = [];
    const declared = new Set(ADOPTERS.map((a) => a.rel));

    for (const file of walkTsx(SRC)) {
      const rel = path.relative(SRC, file);
      if (rel === path.join('components', 'ui', 'SheetPull.tsx')) continue;
      const src = stripComments(fs.readFileSync(file, 'utf8'));
      if (!/\bSheetPull\b/.test(src)) continue;
      if (!declared.has(rel)) {
        offenders.push(`${rel} → adopts SheetPull but is not declared in ADOPTERS`);
      }
    }
    for (const a of ADOPTERS) {
      const full = path.join(SRC, a.rel);
      if (!fs.existsSync(full)) {
        offenders.push(`${a.rel} → declared but the file does not exist`);
        continue;
      }
      if (!/\bSheetPull\b/.test(stripComments(fs.readFileSync(full, 'utf8')))) {
        offenders.push(`${a.rel} → declared but does not adopt SheetPull`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the gesture routes through each surface OWN close handler', () => {
    // The same-handler law, inherited from dismissalStandard assertion B. A
    // bespoke arrow here would typecheck and render, and would quietly skip the
    // focus-return choreography (`release()` / `restore()`) that lives in
    // onClose — leaving a screen-reader user's cursor stranded after a swipe.
    const offenders: string[] = [];
    for (const a of ADOPTERS) {
      const src = stripComments(fs.readFileSync(path.join(SRC, a.rel), 'utf8'));
      if (!/onDismiss=\{onClose\}/.test(src)) {
        offenders.push(`${a.rel} → SheetPull onDismiss is not the surface's onClose`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('NO adopter traded its close button for the gesture', () => {
    // Sky's rule as a test. It matters most for the people who never feel the
    // gesture at all: under VoiceOver the pull does not exist, so the button IS
    // the dismissal. Deleting it because "you can swipe now" would remove the
    // only door for the users this app is built for.
    const offenders: string[] = [];
    for (const a of ADOPTERS) {
      const src = stripComments(fs.readFileSync(path.join(SRC, a.rel), 'utf8'));
      if (!src.includes(a.closeLabel)) {
        offenders.push(`${a.rel} → lost its close affordance ("${a.closeLabel}")`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
