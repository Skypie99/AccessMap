/**
 * B5 / PROTECT #7 — every animated <Modal> stays reduce-motion-gated.
 *
 * The app's ~30 Modal sites present with `animationType={reducedMotion ? 'none'
 * : 'slide' | 'fade'}` so the OS transition is suppressed under Reduce Motion
 * (WCAG 2.3.3). A future Modal that hardcodes `animationType="slide"` (or
 * "fade") would silently regress that guarantee for exactly the users who asked
 * for less motion — the same class of miss as the falsy-zero trap. This static
 * guard fails CI the moment any ungated animated Modal is introduced, so the
 * gated fleet cannot quietly shrink.
 *
 * `animationType="none"` is allowed (no motion to gate). HamburgerDrawer drives
 * its own Animated slide and correctly uses `animationType="none"`.
 */

import fs from 'fs';
import path from 'path';

function walkTsx(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === '__mocks__' || entry.name === 'node_modules') {
        continue;
      }
      out.push(...walkTsx(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.tsx')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

describe('B5 (PROTECT #7) — no ungated animated Modal', () => {
  const srcDir = path.join(__dirname, '..', '..'); // -> src/

  it('finds Modal usages to guard (sanity: the scan is actually looking at code)', () => {
    const files = walkTsx(srcDir);
    const withModal = files.filter((f) => /<Modal[\s>]/.test(fs.readFileSync(f, 'utf8')));
    // If this ever hits 0 the regex/paths drifted and the guard is vacuous.
    expect(withModal.length).toBeGreaterThan(10);
  });

  it('never sets animationType to a bare "slide"/"fade" literal (always the RM-gated ternary or "none")', () => {
    const offenders: string[] = [];
    for (const file of walkTsx(srcDir)) {
      const text = fs.readFileSync(file, 'utf8');
      // Matches only a STRING-LITERAL animationType (animationType="slide").
      // The gated form is animationType={reducedMotion ? 'none' : 'slide'} —
      // there `animationType=` is followed by `{`, so it is not matched.
      const bare = text.match(/animationType=(["'])(slide|fade)\1/g);
      if (bare) offenders.push(`${path.relative(srcDir, file)} → ${bare.join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });
});
