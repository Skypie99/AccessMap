/**
 * S4 / D6 — ONE SURFACE AT A TIME ABOVE THE MAP.
 *
 * ─── THE FINDING ──────────────────────────────────────────────────────────
 * The cold walk opened the filter panel, tapped a pin, left for Home, came back
 * and tapped Report. The report sheet landed on a map that STILL had the filter
 * panel and the callout open beneath it — three surfaces stacked, with
 * "SEVERITY 4 OF 5" peeking above the sheet's top edge and the callout's blue
 * "Open details" button ghosting through the panel, the legend and the chip
 * rail (§14d, §15, §16, §18, D3, D5 — five sightings, worst in dark).
 *
 * Nothing on this screen ever put the map's own surfaces away, so they simply
 * accumulated, and the map remembered a half-finished filter session across
 * tabs an hour later (D3).
 *
 * ─── WHAT THE RULE IS, AND WHAT IT IS NOT ─────────────────────────────────
 * `clearMapSurfaces` closes the two INLINE panel-class surfaces (the filter
 * panel and the ⋯ tool sheet — neither is a Modal, neither joins the dismissal
 * census) and hides the callout.
 *
 * It deliberately does NOT:
 *   · close modals — the Nearby list stays up UNDER the detail sheet on the
 *     screen-reader path, because that is what returns the cursor to its row;
 *   · move the camera — where you were looking survives a sheet, and survives
 *     leaving the tab;
 *   · clear `focusedFlagId` — which pin you came for is not a surface.
 *
 * ─── WHY IT COULD NOT BE `setFocusedFlagId(null)` ─────────────────────────
 * That prop only drives marker OPACITY (PlatformMap `opacity={focusedFlagId &&
 * ...}`). The native callout belongs to the marker, so putting it away has to
 * be imperative — the mirror image of `showCallout`, which is why the handle
 * gained `hideCallout` on both platforms rather than a state flag.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
const MAP = read('../MapScreen.tsx');
const NATIVE = read('../../components/PlatformMap.tsx');
const WEB = read('../../components/PlatformMap.web.tsx');

describe('S4 — the clearer itself', () => {
  it('closes both inline surfaces and hides the callout, and nothing else', () => {
    const fn = MAP.slice(
      MAP.indexOf('const clearMapSurfaces = useCallback'),
      MAP.indexOf('const hasAutoOpenedListRef'),
    );
    expect(fn).toContain('setFiltersOpen(false)');
    expect(fn).toContain('setToolsOpen(false)');
    expect(fn).toContain('mapRef.current?.hideCallout()');
    // The three deliberate non-actions. Each one is a real bug if it creeps in.
    expect(fn).not.toContain('setNearbyOpen');
    expect(fn).not.toContain('setFocusedFlagId');
    expect(fn).not.toContain('animateTo');
  });

  it('both platform handles can actually hide a callout', () => {
    expect(NATIVE).toContain('hideCallout: () => {');
    expect(NATIVE).toContain('marker?.hideCallout()');
    expect(WEB).toContain('hideCallout: () => {');
    expect(WEB).toContain('mapInstance.current?.closePopup()');
    // One contract, declared once and implemented twice.
    expect(NATIVE).toContain('hideCallout: () => void;');
    expect(WEB).toContain('hideCallout: () => void;');
  });
});

describe('S4 — every sheet that opens from the map calls it', () => {
  // The seven surfaces named in the rule, each pinned at the site that opens it.
  const OPENERS: [string, string][] = [
    ['Report — the FAB', 'reportTrigger.register();\n                  clearMapSurfaces();'],
    ['Report — the Home pill arrival (openReport param)', 'clearMapSurfaces();\n    setReportOpen(true);'],
    ['Report — the long-press drop pin', 'reportTrigger.register();\n    clearMapSurfaces();'],
    ['FlagDetail — the pin callout', 'onOpenDetails={handleOpenDetails}'],
    ['FlagDetail — the Nearby screen-reader branch', 'clearMapSurfaces();\n            setSelectedFlag(flag);'],
    ['Nearby — the List pill', 'nearbyTrigger.register();\n                clearMapSurfaces();'],
    ['Nearby — the screen-reader auto-open', 'nearbyTrigger.register();\n      clearMapSurfaces();'],
    ['Address search', 'onPress={() => { clearMapSurfaces(); setSearchOpen(true); }}'],
    ['Saved places', 'onPress={() => { clearMapSurfaces(); setPlacesOpen(true); }}'],
    ['Filter presets', 'onPress={() => { clearMapSurfaces(); setPresetsModalOpen(true); }}'],
  ];

  it.each(OPENERS)('%s', (_name, snippet) => {
    expect(MAP).toContain(snippet);
  });

  it('the Legend opens it from BOTH doors', () => {
    // The pill and the older ⋯ row. Both close the sheet they came from.
    const opens = MAP.match(/clearMapSurfaces\(\);\n\s*legendTrigger\.register\(\);/g) ?? [];
    expect(opens.length).toBe(2);
  });

  it('Send feedback too — the rule is "any sheet", not just the seven named', () => {
    // Not in the prompt's enumeration, but it is a modal opening over the map
    // from the same tool sheet, and leaving it out would mean one door still
    // ghosts a callout through its sheet.
    expect(MAP).toContain("onPress={() => { clearMapSurfaces(); setSharedModal('feedback'); }}");
  });

  it('no OPENER still closes the tool sheet by hand — that path forgets the callout', () => {
    // Before S4, `setToolsOpen(false)` was the idiom at every one of these sites
    // and it put away exactly one of the three surfaces. Four uses survive, and
    // none of them opens a sheet:
    const byHand = MAP.match(/setToolsOpen\(false\)/g) ?? [];
    expect(byHand.length).toBe(4);
    //   1. inside clearMapSurfaces itself, and 2. the tab-blur cleanup (above);
    //   3. the filter button, which SWAPS one inline panel for the other;
    expect(MAP).toContain('onPress={() => { setToolsOpen(false); setFiltersOpen((v) => !v); }}');
    //   4. Refresh flags, which opens nothing — so the callout correctly stays.
    expect(MAP).toContain('onPress={() => { setToolsOpen(false); refreshFlags().catch(() => {}); }}');
  });
});

describe('D3 — leaving the tab does not preserve a half-finished filter session', () => {
  it('the blur cleanup closes the panel and the tool sheet', () => {
    const eff = MAP.slice(MAP.indexOf('useFocusEffect('), MAP.indexOf('useFocusEffect(') + 400);
    expect(eff).toContain('setFiltersOpen(false)');
    expect(eff).toContain('setToolsOpen(false)');
  });

  it('and KEEPS the camera — where you were looking is worth remembering', () => {
    const eff = MAP.slice(MAP.indexOf('useFocusEffect('), MAP.indexOf('useFocusEffect(') + 400);
    expect(eff).not.toContain('animateTo');
    expect(eff).not.toContain('snapToRegion');
    expect(eff).not.toContain('currentRegionRef');
  });
});
