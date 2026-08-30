/**
 * VP1 fix3 (2026-08-29) — source-contract regression net for the UI polish
 * pass: the specific removals/additions Sky's screenshot review and the
 * authenticated real-iOS VP1 fix2 audit called for, pinned so a later edit
 * can't silently drift back.
 *
 * House idiom: static source scan (cf. dismissalStandard.guard.test.ts,
 * keyboardClass.guard.test.ts) — fast, no mount, fails the moment it breaks.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

describe('VP1 fix3 — expanded Legend: the redundant bottom Close button is gone', () => {
  const legend = read('screens/LegendModal.tsx');

  it('does not render a fixed bottom Close button or its styles', () => {
    // The bug this pins: a large fixed control below the ScrollView ate reading
    // height and clipped the last rows against it (the reported "Anonymous
    // report" clipping). Dismissal survives through the top-right X, the
    // backdrop tap, and the VoiceOver escape scrub — none of which this removes.
    expect(legend).not.toMatch(/closeBtn:\s*\{/);
    expect(legend).not.toContain('styles.closeBtn');
    // The visible label text of the removed control, not the (still-present)
    // accessibilityLabel="Close legend" strings on the scrim/X — a bare
    // `>Close<` JSX text node is what the fixed button rendered.
    expect(legend).not.toMatch(/>Close<\/AppText>/);
  });

  it('keeps the top-right X — dismissal is not left to the gesture alone', () => {
    expect(legend).toContain('headerCloseBtn');
    expect(legend).toMatch(/accessibilityLabel="Close legend"/);
    // sheetPull.guard.test.ts's ADOPTERS table pins the same string; this test
    // pins WHERE it still lives once the bottom button is gone.
  });

  it('the escape hatches that replace the removed button are still wired', () => {
    // A screen-reader user who scrolls to the end no longer has a reachable
    // bottom button, but the scrub-to-dismiss gesture fires from anywhere in
    // the modal, and the hardware/OS back path is unconditional.
    expect(legend).toContain('onAccessibilityEscape={onClose}');
    expect(legend).toContain('onRequestClose={onClose}');
  });

  it('the card grows to fill from the safe-area top to the nav boundary instead of a flat 85%', () => {
    expect(legend).not.toMatch(/cardShell:\s*\{[^}]*maxHeight:\s*'85%'/);
    expect(legend).toMatch(/cardShell:\s*\{[^}]*flexGrow:\s*1/);
    expect(legend).toContain('insets.top + spacing.sm');
    // The nav-clearance gap moved onto the scroll body's own bottom padding.
    expect(legend).toMatch(/paddingBottom:\s*Math\.max\(spacing\.sm,\s*effectiveTabBarHeight\)/);
  });
});

describe('VP1 fix3 — Login: the account-deletion status card cannot grow unbounded', () => {
  const signIn = read('screens/SignInScreen.tsx');

  it('wraps the deletion-status card in a TypeBlock cap, matching the footer below it', () => {
    // Every other peripheral element on this screen is capped (fields at 1.4,
    // the legal footer at TYPE_BLOCK.chrome) — this card was the one gap, and
    // at large Dynamic Type it grew unbounded and crowded Create Account/the
    // footer toward the bottom.
    const open = signIn.indexOf('<TypeBlock cap={TYPE_BLOCK.chrome}>');
    const card = signIn.indexOf('deletionStatusCard');
    expect(open).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(open);
    const close = signIn.indexOf('</TypeBlock>', card);
    expect(close).toBeGreaterThan(card);
  });
});

describe('VP1 fix3 — Explore: List renamed to Nearby, matching the sheet it opens', () => {
  const map = read('screens/MapScreen.tsx');
  const nearbyModal = read('screens/NearbyFlagsModal.tsx');

  it('the crystal pill now says "Nearby", not "List"', () => {
    expect(map).toContain('<AppText variant="label" style={styles.fabCrystalText}>Nearby</AppText>');
    expect(map).not.toMatch(/style=\{styles\.fabCrystalText\}>List</);
  });

  it('matches the destination sheet\'s own title', () => {
    expect(nearbyModal).toContain('Nearby flags');
  });
});
