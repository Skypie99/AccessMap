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

  it('the screen title keeps its header landmark role (rides the AppText inside the long-press wrapper)', () => {
    const center = SRC.slice(SRC.indexOf('styles.barCenter'), SRC.indexOf('styles.barCenter') + 1000);
    expect(center).toContain('accessibilityRole="header"');
    expect(center).toContain('Explore');
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

describe('MapScreen command bar — the glass-mode long-press flip (Sky on-device A/B)', () => {
  it('threads the glass switch into the bar material (blur=full / crystal=lite)', () => {
    // forceEngineered={glassLite} = engineered crystal in lite, true blur in
    // full; floorColor keeps the blur floor == the engineered bottom stop.
    expect(SRC).toMatch(/style=\{styles\.commandBar\}[\s\S]*?forceEngineered=\{glassLite\}/);
    expect(SRC).toMatch(/floorColor=\{color\.glassMapCrystal1\}/);
  });

  it('the title is a 600ms long-press flip target that does NOT swallow button taps', () => {
    // accessible={false} keeps the SR tree unchanged; the wrapper holds only the
    // title (the menu/search/filter/⋯ buttons are its siblings, not its children).
    expect(SRC).toMatch(
      /<Pressable\s+onLongPress=\{handleGlassToggle\}\s+delayLongPress=\{600\}\s+accessible=\{false\}/,
    );
    expect(SRC).toMatch(/const handleGlassToggle = useCallback\(\(\) => \{\s*hapticSelection\(\);\s*toggleGlassMode\(\);/);
  });
});
