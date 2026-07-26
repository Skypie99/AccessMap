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

// ── C2 · the always-dark literals are gone and stay gone ────────────────────

/**
 * The drawer spent its whole life hardcoding a dark panel with light inks, and
 * six comment blocks asserted that theme tokens "would go invisible in light
 * mode". C2 disproved that — the reverted `271e8ec` was a PARTIAL binding
 * (inks tokenized on a still-dark surface; DECISIONS §F F-8) — and rebound the
 * surface and its inks together. These literals are the fingerprint of a
 * relapse, so they are banned by name. Comments count: the scan reads the whole
 * source, which is why the rewritten comments name no hexes.
 */
const DARK_LITERALS = [
  ['rgba(13', '18', '32,'].join(','), // the hardcoded deep-field panel fill
  ['#f5f5', 'f5'].join(''), // textStrong dark, hardcoded as a light-ink literal
  ['#4E89', 'EF'].join(''), // brand DARK, hardcoded for icons in BOTH schemes
  ['rgba(255', '255', '255,'].join(','), // white-alpha inks / washes / hairlines
  ['rgba(168', '192', '224,'].join(','), // the cool dark-chrome hairline family
  ['rgba(0', '0', '0,0.5)'].join(','), // the hardcoded backdrop scrim
];

/** The flattened RT tone — legal in exactly one place. */
const RT_TONE = ['#0D12', '20'].join('');

describe('D2/C2 — the drawer is scheme-bound, not always-dark', () => {
  it.each(DARK_LITERALS)('the drawer no longer hardcodes %s', (literal) => {
    expect(drawerSrc()).not.toContain(literal);
  });

  it('the one surviving dark literal is the RT tone, and it lives in the RT fork', () => {
    // Reduce Transparency needs a designed OPAQUE fill, and dark mode keeps the
    // shipped flattened tone byte-for-byte (DECISIONS §A A-3). That is the ONLY
    // place a raw dark literal is still legal — anywhere else is a relapse.
    const src = drawerSrc();
    const hits = [...src.matchAll(new RegExp(RT_TONE, 'gi'))];
    expect(hits).toHaveLength(1);
    const lineNo = src.slice(0, hits[0].index ?? 0).split('\n').length;
    expect(src.split('\n')[lineNo - 1]).toMatch(/rtFill/);
  });

  it('the panel fill, edge, lip and scrim all read from the palette', () => {
    const src = drawerSrc();
    expect(src).toMatch(
      /backgroundColor:\s*reduceTransparency\s*\?\s*rtFill\s*:\s*color\.glassChromeLite0/,
    );
    expect(src).toMatch(/borderRightColor:\s*color\.glassChromeEdge/);
    expect(src).toMatch(/backgroundColor:\s*color\.glassChromeLip/);
    expect(src).toMatch(/backgroundColor:\s*color\.scrim/);
  });

  it('DrawerItem takes the palette — its rows cannot be scheme-blind again', () => {
    // makeItemStyles() used to take NO colour argument at all, which is what
    // made the nav rows structurally incapable of following the theme.
    const src = drawerSrc();
    expect(src).toMatch(/const makeItemStyles = \(color: ColorTheme\)/);
    expect(src).toMatch(/makeItemStyles\(color\)/);
  });

  it('the muted row label satisfies the GLASS §2 type law (>=500 on glass)', () => {
    expect(drawerSrc()).toMatch(/labelMuted:\s*\{[\s\S]*?fontWeight:\s*font\.weight\.medium/);
  });
});
