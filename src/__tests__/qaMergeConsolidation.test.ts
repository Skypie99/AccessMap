/**
 * QA consolidation invariants — 2026-06-02 (Gary, final pre-tester merge).
 *
 * The pre-tester QA merge integrated three domains into one tree:
 *   - Steve  (security/robustness) — already on main: RemoteImage, error boundaries,
 *            offline banner, input validation.
 *   - Peter  (performance)         — MapScreen `iconLabelRow` style hoist + index record.
 *   - Alex   (accessibility)       — 12 a11y fixes incl. 2 HIGH operability bugs.
 *
 * The one place two agents' edits physically interleaved is the MapScreen Report FAB
 * (Peter's hoisted `iconLabelRow` View sits inside the Pressable whose accessibilityHint
 * Alex made conditional). A future edit or a botched re-merge could silently drop one
 * side. These are SOURCE-LEVEL invariants (the codebase defers full screen renders to
 * Detox/Playwright — see MapScreen.heatmap.test.tsx), asserted on stable semantic anchors
 * rather than line numbers, so they survive refactors but trip if a fix is reverted.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

/** Return a window of `len` chars starting at the first occurrence of `anchor`. */
function around(haystack: string, anchor: string, len = 500): string {
  const i = haystack.indexOf(anchor);
  if (i < 0) throw new Error(`anchor not found: ${anchor}`);
  return haystack.slice(i, i + len);
}

describe('QA merge — MapScreen Report FAB combines Peter + Alex (the one overlap point)', () => {
  const map = read('screens/MapScreen.tsx');
  // Window widened from 600 → 800: the hint now has a third (web) branch, which
  // pushes the inner iconLabelRow View further down the FAB block.
  const fab = around(map, 'accessibilityLabel="Report a flag here"', 800);

  it("keeps Alex's conditional accessibilityHint (disabled-state guidance)", () => {
    expect(fab).toMatch(/Dimmed until location is on/);
    // Disabled state is now web-aware (reportDisabled = !location on native,
    // never on web) but the FAB still announces its disabled state.
    // S9: the disabled state is now emitted via a11yToggle (accessibilityState
    // + flat aria-disabled for web SRs); the FAB still announces disabled.
    expect(fab).toContain('a11yToggle({ disabled: reportDisabled })');
  });

  it("keeps Peter's hoisted iconLabelRow style on the FAB's inner View", () => {
    expect(fab).toContain('<View style={styles.iconLabelRow}>');
  });

  it('defines and reuses iconLabelRow (hoist did not leave a dangling style)', () => {
    expect(map).toMatch(/iconLabelRow:\s*\{\s*flexDirection:\s*'row'/);
    // 2 use sites (Save-preset + Report FAB) + 1 definition
    expect(map.match(/iconLabelRow/g)?.length).toBe(3);
  });
});

describe('QA merge — Alex HIGH #1: realtime + push switches are operable by screen readers', () => {
  it('Profile realtime <Switch> carries role + checked state itself (not a handler-less wrapper)', () => {
    const block = around(read('screens/ProfileScreen.tsx'), 'onValueChange={handleRealtimeToggle}', 520);
    expect(block).toContain('accessibilityRole="switch"');
    expect(block).toContain('a11yToggle({ checked: realtimeEnabled');
  });

  it('Settings push <Switch> carries role + checked state itself', () => {
    const block = around(read('screens/SettingsScreen.tsx'), 'onValueChange={handlePushToggle}', 520);
    expect(block).toContain('accessibilityRole="switch"');
    expect(block).toContain('a11yToggle({ checked: pushEnabled');
  });
});

describe('QA merge — Alex HIGH #2: Admin moderation buttons reachable + severity not colour-only', () => {
  const admin = read('screens/AdminScreen.tsx');

  it('shows severity as text (1.4.1, not a colour dot alone)', () => {
    // Severity now renders as a label + number pill (e.g. "Moderate · 3") via the
    // design-system severity ramp — strictly more than colour alone (WCAG 1.4.1).
    expect(admin).toContain('{sev.label} · {item.severity}');
  });

  it('marks the flag list with the list role (1.3.1)', () => {
    expect(admin).toContain('accessibilityRole="list"');
  });
});

describe('QA merge — Steve security/robustness survived the merge (not reverted off main)', () => {
  it('RemoteImage fail-safe component is present', () => {
    expect(fs.existsSync(path.join(SRC, 'components/ui/RemoteImage.tsx'))).toBe(true);
  });

  it('flags.ts still validates the severity envelope on create', () => {
    expect(read('lib/flags.ts')).toMatch(/severity < 1 \|\| severity > 5/);
  });

  it('MapScreen still renders the offline cache banner', () => {
    expect(read('screens/MapScreen.tsx')).toContain('offlineBanner');
  });
});

describe('QA merge — Peter performance record present', () => {
  it('the FK covering-index migration file is recorded in the repo', () => {
    expect(
      fs.existsSync(path.join(SRC, '..', 'supabase/migrations/2026-06-01_perf_fk_covering_indexes.sql')),
    ).toBe(true);
  });
});
