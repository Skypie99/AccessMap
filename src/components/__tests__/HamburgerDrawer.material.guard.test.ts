/**
 * D2 (device-tune 2) — drawer material source contracts.
 *
 * C1's silent regression: **the footer comes back.** The
 * `AccessMap · Made with ♥ in Canada` row was retired on Sky's explicit
 * instruction (device-tune DECISIONS §A A-1), and with it went the panel's
 * ONLY bottom clearance — the row's own `paddingBottom`. A future "restore the
 * nice footer" edit would re-introduce a string Sky removed; a future "tidy the
 * unused padding" edit would push the last nav row onto the home indicator.
 * Both are pinned below.
 *
 * Static source scans in the house idiom (cf. navigation/__tests__/
 * drawerRoutes.guard.test.ts, perceptionGuards.test.ts): fast, mount-free, and
 * they fail the moment the contract breaks.
 *
 * NOTE ON SELF-MATCHING: the banned strings are ASSEMBLED at runtime from
 * fragments, so this file's own source never contains one contiguously.
 * Without that, the repo-wide sweep would match the guard itself and the test
 * could never fail honestly.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..', '..');
const DRAWER = join(SRC, 'components', 'HamburgerDrawer.tsx');
const SELF = join(__dirname, 'HamburgerDrawer.material.guard.test.ts');

const drawerSrc = () => readFileSync(DRAWER, 'utf8');

/** Every .ts/.tsx under src/, minus this guard (see NOTE ON SELF-MATCHING). */
function sourceFiles(dir: string = SRC, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry) && full !== SELF) {
      out.push(full);
    }
  }
  return out;
}

// ── The retired footer, spelled in fragments ────────────────────────────────

/** Every shape the footer row could come back as, checked in the drawer. */
const FOOTER_FRAGMENTS = [
  ['Made', 'with'].join(' '),
  '♥', // ♥ — the glyph the shipped footer used
  '❤', // ❤ — the variation-selector twin
  ['in', 'Canada'].join(' '),
];

/** The two unambiguous fingerprints, checked repo-wide. "in Canada" is
 *  deliberately NOT swept — it is plausible prose that a future honest string
 *  could contain, and a guard that cries wolf gets deleted. */
const FOOTER_FINGERPRINTS = [['Made', 'with'].join(' '), '♥', '❤'];

describe('D2/C1 — the drawer footer is retired (Sky, DECISIONS §A A-1)', () => {
  it.each(FOOTER_FRAGMENTS)('the drawer no longer contains %j', (fragment) => {
    expect(drawerSrc()).not.toContain(fragment);
  });

  it('no other source file resurrected the string either', () => {
    const offenders = sourceFiles()
      .filter((file) => {
        const src = readFileSync(file, 'utf8');
        return FOOTER_FINGERPRINTS.some((fragment) => src.includes(fragment));
      })
      .map((file) => file.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });

  it('the panel carries the bottom clearance the footer used to hold', () => {
    // The footer's paddingBottom was the ONLY thing keeping the last nav row
    // off the home indicator. Deleting the row without moving the clearance
    // onto the panel is the exact regression this pins — and it must be a real
    // inset, not another hardcoded guess.
    const src = drawerSrc();
    expect(src).toMatch(/SafeAreaInsetsContext/);
    expect(src).toMatch(/paddingBottom:\s*Math\.max\(bottomInset,/);
  });
});
