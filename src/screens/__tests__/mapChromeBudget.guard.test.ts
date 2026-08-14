/**
 * MAP-CHROME BUDGET guard (map-chrome compaction, Sky-locked B-refined 2026-08-12).
 *
 * SPEC §6c asks for a guard that pins the compaction's load-bearing invariants so
 * a later edit can't quietly re-inflate the persistent chrome band. Direction B
 * collapsed the old two rows (mapHeaderRow + topRow) into ONE command bar, so:
 *
 *   (a) DOM-ORDER — the command bar is the ONLY pre-conditional (persistent)
 *       chrome measured for the callout inset; the conditional layers (offline
 *       banner, ⋯ tool sheet, filter panel, banners, heat notices) come AFTER it
 *       and never feed chromeBandPx.
 *   (b) TOKENS — the four crystal floor literals (glassMapCrystal0/1 × light+dark)
 *       are pinned so a retint can't silently thicken (or thin past the arbiter)
 *       the one persistent pane.
 *   (c) FORMULA — chromeBandPx is the bar's measured height alone, and the bar
 *       hugs the status bar at safe-area + 8 (Sky's refinement ①).
 *
 * The RUNTIME quarter-budget proof (persistent band ≤ 25% of the viewport at
 * 430×932 / 393×852, with the numbers captured to the evidence folder) is the
 * web measure in tools/ (SPEC §7.3) — a full RN render pulls the native map, so
 * jest pins the SOURCE invariants and the web build proves the pixels.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const MAP = read('../MapScreen.tsx');
const THEME_LIGHT = read('../../theme.ts');
const THEME_DARK = read('../../theme/ThemeContext.tsx');

describe('map-chrome budget — the ONE persistent command bar', () => {
  it('(a) exactly one measured chrome row feeds chromeBandPx (the command bar)', () => {
    // One onLayout hook, one measured height. If a future edit adds a second
    // measured row it must justify re-inflating the callout inset here.
    expect((MAP.match(/onLayout=\{onCommandBarLayout\}/g) ?? []).length).toBe(1);
    expect((MAP.match(/const onCommandBarLayout = useCallback/g) ?? []).length).toBe(1);
    // The old two-row measure chain is gone — never resurrected.
    expect(MAP).not.toContain('onMapHeaderRowLayout');
    expect(MAP).not.toContain('onTopRowLayout');
    expect(MAP).not.toContain('MAP_HEADER_ROW_MARGIN_BOTTOM');
  });

  it('(a) the command bar sits in overlayTopGroup, ahead of the conditional layers', () => {
    const barAt = MAP.indexOf('style={styles.commandBar}');
    const groupAt = MAP.indexOf('style={styles.overlayTopGroup}');
    const sheetAt = MAP.indexOf('style={styles.toolSheet}');
    const panelAt = MAP.indexOf('style={[\n              styles.filterPanel');
    expect(groupAt).toBeGreaterThan(-1);
    expect(barAt).toBeGreaterThan(groupAt); // bar is inside the top group
    // The bar is measured BEFORE the conditional tool sheet + filter panel render.
    expect(sheetAt).toBeGreaterThan(barAt);
    if (panelAt > -1) expect(panelAt).toBeGreaterThan(barAt);
  });

  it('(b) the four crystal floor literals are pinned (light + dark)', () => {
    expect(THEME_LIGHT).toMatch(/glassMapCrystal0:\s*'rgba\(255,255,255,0\.70\)'/);
    expect(THEME_LIGHT).toMatch(/glassMapCrystal1:\s*'rgba\(255,255,255,0\.60\)'/);
    expect(THEME_DARK).toMatch(/glassMapCrystal0:\s*'rgba\(30,34,46,0\.80\)'/);
    expect(THEME_DARK).toMatch(/glassMapCrystal1:\s*'rgba\(30,34,46,0\.70\)'/);
  });

  it('(c) chromeBandPx is the bar height alone, and the bar hugs safe-area + 8', () => {
    // The formula is the bar's own measured height — no conditional layer added.
    expect(MAP).toMatch(/setChromeBandPx\(Math\.round\(commandBarH\.current\)\)/);
    // Sky ①: bar top = insets.top + 8 (both the overlay pad and the callout inset
    // use the same raised pad, so callout clearance tracks the raised bar).
    expect(MAP).toContain('const OVERLAY_TOP_PAD = 8;');
    expect(MAP).toContain('paddingTop: insets.top + OVERLAY_TOP_PAD');
    expect(MAP).toContain(
      'chromeInsetTop={insets.top + OVERLAY_TOP_PAD + chromeBandPx + CALLOUT_CHROME_MARGIN}',
    );
  });

  it('(c) the bar keeps its crystal material — liteColors (Android) + floorColor (iOS blur floor)', () => {
    // The C-lite switch is retired (full wins app-wide): the bar mounts live
    // blur on iOS with glassMapCrystal1 as the floor, and the engineered crystal
    // gradient (liteColors) on Android. Both survive the switch removal.
    expect(MAP).toContain('liteColors={[color.glassMapCrystal0, color.glassMapCrystal1]}');
    expect(MAP).toContain('floorColor={color.glassMapCrystal1}');
  });
});
