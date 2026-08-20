/**
 * A legal sheet opened from inside a modal must be mounted inside that modal.
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * iOS refuses to present a second modal from a view controller that is already
 * presenting one. `SharedModalsHost` mounts PrivacyScreen and TermsScreen as
 * siblings of the tab navigator, so they present from the ROOT view
 * controller. From a tab screen that is correct. From a surface that is itself
 * a Modal it is fatal, and fatal SILENTLY — the tap does nothing at all.
 *
 * Captured on an iPhone 17 Pro simulator, 2026-08-19, one line per dead tap:
 *
 *   [com.apple.UIKit:Presentation] Attempt to present <RCTModalHostViewController>
 *   on <UIViewController: 0x1130a9800> (from <UIViewController: 0x1130a9800>)
 *   which is already presenting <RCTModalHostViewController: 0x133c15e00>.
 *
 * Five entry points shipped this way — About's two links, ReportContentModal's
 * terms link, and the three blocked-content "view guidelines" alerts. The last
 * three are the Apple 1.2(a) affordance, dead in exactly the place it was
 * built for. Every one of them was invisible to jest, typecheck and lint,
 * because nothing about the JS is wrong — only the UIKit arrangement is.
 *
 * ─── WHAT THIS TEST ENFORCES ──────────────────────────────────────────────
 * If a source file renders its own `<Modal`, it may NOT reach for the shared
 * host to open a legal sheet. It uses `useLegalSheets()` and renders
 * `legal.sheets` inside its own Modal, which presents from that modal's VC.
 *
 * Tab screens are untouched: they have no Modal of their own, the root VC is
 * free when their rows fire, and `setOpen('privacy')` is right for them.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');

/** Every .tsx under src/, minus tests. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === '__mocks__') continue;
      sourceFiles(full, out);
    } else if (entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

/** The shared host itself is the one legitimate sibling mount. */
const HOST = join(SRC, 'navigation', 'RootNavigator.tsx');

const files = sourceFiles(SRC).filter((f) => f !== HOST);

/** Opens a legal sheet through the navigator-level shared host. */
const SHARED_LEGAL_OPEN = /setOpen\(\s*['"](?:terms|privacy)['"]\s*\)|setSharedModal\(\s*['"](?:terms|privacy)['"]\s*\)/;

/** Renders a Modal of its own — so its VC is the one already presenting. */
const RENDERS_MODAL = /<Modal[\s>]/;

describe('legal sheets present from the right view controller', () => {
  it('no surface that renders a Modal opens a legal sheet via the shared host', () => {
    const offenders = files.filter((f) => {
      const src = readFileSync(f, 'utf8');
      return RENDERS_MODAL.test(src) && SHARED_LEGAL_OPEN.test(src);
    });

    expect(offenders.map((f) => f.replace(`${SRC}/`, ''))).toEqual([]);
  });

  it('every surface using useLegalSheets actually renders legal.sheets', () => {
    const unmounted = files.filter((f) => {
      const src = readFileSync(f, 'utf8');
      return src.includes('useLegalSheets()') && !src.includes('legal.sheets');
    });

    // A hook whose element is never rendered is a link that opens nothing —
    // the same silent dead end, reached a different way.
    expect(unmounted.map((f) => f.replace(`${SRC}/`, ''))).toEqual([]);
  });

  it('the four known in-modal surfaces are on the local-mount path', () => {
    const expected = [
      'screens/AboutScreen.tsx',
      'screens/ReportFlagModal.tsx',
      'components/ReportContentModal.tsx',
      'components/FlagDetailModal.tsx',
    ];

    for (const rel of expected) {
      const src = readFileSync(join(SRC, rel), 'utf8');
      expect({ file: rel, usesHook: src.includes('useLegalSheets()') }).toEqual({
        file: rel,
        usesHook: true,
      });
    }
  });
});
