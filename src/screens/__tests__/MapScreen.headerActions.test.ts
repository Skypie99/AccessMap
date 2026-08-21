/**
 * MapScreen command-bar structure — source-scan guard.
 *
 * (Rewritten 2026-08-12 for Direction B, the map-chrome compaction. The old
 * guard pinned the two-row header — a box-none pair-container wrapping
 * <HeaderActions> beside a padded title chip. Direction B collapses that whole
 * header + the pill/tray row into ONE crystal command bar, so this guard now
 * pins the bar's structure in the SAME spirit: the box-none gesture law holds —
 * the bar is never a full-width touch-opaque strip — and the menu button keeps
 * its drawer focus-return contract now that MapScreen inlines it instead of
 * borrowing the shared HeaderActions cluster.)
 *
 * MapScreen is not cheaply mountable (heavy native-map + provider tree), so the
 * structure is pinned by a static source scan, in the idiom of
 * dynamicTypeGuard.test.ts. The felt gesture + visual proof (map still
 * pannable/zoomable through the bar's title + spacer gaps; the crystal material
 * reading over live tiles) is the device gate (NEEDS-SKY-DEVICE).
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../MapScreen.tsx'), 'utf8');

describe('MapScreen command bar (Direction B) — the box-none gesture law', () => {
  it('the command bar GlassSurface is box-none (its material is pointer-inert, map pans under it)', () => {
    // The bar is one continuous pill; box-none is what keeps the map pannable
    // through it — only the buttons + count (not the whole strip) take touches.
    expect(SRC).toMatch(
      /<GlassSurface\s+style=\{styles\.commandBar\}[\s\S]*?pointerEvents="box-none"/,
    );
  });

  it('carries a pannable box-none spacer, so the bar is never a full-width touch-opaque strip', () => {
    expect(SRC).toMatch(/<View style=\{styles\.barSpacer\} pointerEvents="box-none"/);
    // barSpacer is the flex gap the map shows through.
    expect(SRC).toMatch(/barSpacer:\s*\{[^}]*flex:\s*1/);
  });

  it('the inner row and the title/count cluster are both box-none', () => {
    expect(SRC).toMatch(/<View style=\{styles\.commandBarInner\} pointerEvents="box-none"/);
    expect(SRC).toMatch(/<View style=\{styles\.barCenter\} pointerEvents="box-none"/);
  });
});

describe('MapScreen command bar — the menu button keeps the drawer contract', () => {
  it('inlines the drawer focus-return trigger (register before opening), not <HeaderActions>', () => {
    // MapScreen now owns the trigger (Home/Profile idiom), so the drawer still
    // lands the SR cursor back on the map menu on a plain close.
    expect(SRC).toContain('const menuTrigger = useDrawerTrigger');
    expect(SRC).toMatch(/ref=\{menuTrigger\.ref\}/);
    expect(SRC).toMatch(/menuTrigger\.register\(\);\s*\n\s*drawer\.setOpen\(true\);/);
    expect(SRC).toContain('accessibilityLabel="Open navigation menu"');
    // The shared cluster is no longer imported here (feedback moved to the ⋯ sheet).
    expect(SRC).not.toContain("from '@/components/ui/HeaderActions'");
  });

  // RE-PINNED 2026-08-21 (art-direction Phase 0, item 0.1 / defect D1). The rule
  // used to be "the bar renders one header AppText". At accessibility-extra-large
  // that AppText rendered "Ex…" — a 1.4.4 content loss, and a contradiction of
  // the map-chrome SPEC §3.7 ("never clips"). The rule is now: BELOW the
  // recomposition point the bar is byte-identical; AT OR ABOVE it the word is
  // dropped and the header landmark survives as a clipped, still-accessible node.
  it('the title cluster carries the header landmark in BOTH Dynamic-Type branches', () => {
    const center = SRC.slice(SRC.indexOf('styles.barCenter'), SRC.indexOf('styles.barCenter') + 1600);
    // Non-vacuity: the slice has to actually contain the branch.
    expect(center).toContain('barTitleHidden ?');
    // The dropped-title branch keeps the landmark AND the accessible name.
    expect(center).toMatch(
      /accessible\s+accessibilityRole="header"\s+accessibilityLabel="Explore"/,
    );
    // The normal branch still renders the visible word as a header.
    expect(center).toContain('accessibilityRole="header"');
    expect(center).toContain('Explore');
  });

  it('the drop is driven by the shared recomposition threshold, not a local magic number', () => {
    expect(SRC).toContain('isAxRecompose');
    expect(SRC).toMatch(/const barTitleHidden = isAxRecompose\(fontScale\);/);
    // fontScale comes off the hook the screen already calls, so a text-size
    // change mid-session re-renders the bar instead of stranding "Ex…".
    expect(SRC).toMatch(/const \{ height: windowHeight, fontScale \} = useWindowDimensions\(\);/);
  });

  it('the accessibility stand-in is clipped, never zero-sized or transparent (iOS drops those)', () => {
    expect(SRC).toMatch(/barTitleClipped: \{ width: 1, height: 1, overflow: 'hidden' \}/);
    const block = SRC.slice(SRC.indexOf('barTitleClipped:'), SRC.indexOf('barTitleClipped:') + 200);
    expect(block).not.toContain('opacity: 0');
    expect(block).not.toContain('display:');
  });

  it('the count pill keeps the Android live region + full-sentence label (Q2: short visible, full spoken)', () => {
    // The count chip carries the live region AND the full honesty sentence as its
    // accessibilityLabel — the visible text is the short form ("8 flags").
    expect(SRC).toMatch(/style=\{styles\.countChip\}\s+accessibilityLiveRegion="polite"\s+accessibilityLabel=\{/);
    // The full 4-arm sentence still lives in source (as the label) — bp13/arrival
    // read it there; the visible AppText is the short derivative.
    expect(SRC).toContain('`Showing ${flags.length} flag${flags.length === 1 ? \'\' : \'s\'}`');
    expect(SRC).toContain('`${flags.length} flag${flags.length === 1 ? \'\' : \'s\'}`');
  });
});

describe('MapScreen command bar — full glass, no runtime switch (C-lite retired 2026-08-12)', () => {
  it('keeps the crystal material: liteColors (Android engineered) + floorColor (iOS blur floor)', () => {
    // Sky picked `full` app-wide, so the bar mounts live blur on iOS + the
    // crystal floor; liteColors is Android's engineered gradient. Both stay.
    expect(SRC).toContain('liteColors={[color.glassMapCrystal0, color.glassMapCrystal1]}');
    expect(SRC).toContain('floorColor={color.glassMapCrystal1}');
  });

  it('the glass-mode switch + the bar long-press flip are gone (the C-lite scaffolding is deleted)', () => {
    // The whole runtime toggle retired: no glassLite thread, no flip callback,
    // and the title is a bare header AppText — not a long-press wrapper.
    expect(SRC).not.toContain('glassLite');
    expect(SRC).not.toContain('handleGlassToggle');
    expect(SRC).not.toContain('barTitleWrap');
  });
});
