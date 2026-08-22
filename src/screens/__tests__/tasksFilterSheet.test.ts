/**
 * D3/C3 — the consolidated filter sheet (Sky's A-4 pick, candidate B).
 *
 * Three filter rows left the header for a sheet behind one trigger. That is the
 * change that takes the chrome pane from 399pt to 261pt and rest-visible cards
 * from 1.73 to ~2.74 — but it is also the change with the most ways to go
 * quietly wrong, because "the filters still work" and "the filters are still
 * DISCOVERABLE and their state is still VISIBLE" are different claims.
 *
 * The one that would hurt real users: a filter left on, the sheet closed, and no
 * sign on screen that the list is being filtered. Two independent signals
 * prevent that (the trigger's active fill and the Clear-filters chip) and both
 * are pinned here, because either one alone is a single point of failure.
 *
 * Source contracts. The rows' behaviour is unchanged by construction — they were
 * moved, not rewritten — and the working sheet is proved by banked captures
 * (assets/phase3/candB/…sheet-open.png and …filters-active.png) rather than by
 * mounting a screen that needs a navigator, a store, a map and a safe-area
 * provider.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const tasks = readFileSync(join(__dirname, '..', 'TasksScreen.tsx'), 'utf8');
// Comments stripped: these contracts are about what the screen RENDERS, and
// prose that mentions `variant="chrome"` must not count as a second pane.
const tasksCode = tasks.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const clearFilters =
  tasks.match(/const handleClearFilters = useCallback\([\s\S]*?\}, \[[^\]]*\]\);/)?.[0] ?? '';

const sheetBlock = (() => {
  const start = tasks.indexOf('<Sheet');
  const end = tasks.indexOf('</Sheet>', start);
  return start > -1 && end > start ? tasks.slice(start, end) : '';
})();

const paneBlock = (() => {
  const start = tasks.indexOf('<GlassSurface\n        variant="chrome"');
  const end = tasks.indexOf('</GlassSurface>', start);
  return start > -1 && end > start ? tasks.slice(start, end) : '';
})();

describe('D3/C3 — the rows left the header', () => {
  it('found both regions to reason about', () => {
    expect(sheetBlock).not.toBe('');
    expect(paneBlock).not.toBe('');
  });

  it('mine/All, category and sort are no longer in the chrome pane', () => {
    for (const marker of ['mineToggleRow', 'categoryWrapRow', 'sortRow']) {
      expect(`${marker} in pane: ${paneBlock.includes(marker)}`).toBe(`${marker} in pane: false`);
    }
  });

  it('and are all present in the sheet', () => {
    for (const marker of ['mineToggleRow', 'categoryWrapRow', 'sortRow']) {
      expect(`${marker} in sheet: ${sheetBlock.includes(marker)}`).toBe(`${marker} in sheet: true`);
    }
  });

  it('the header keeps only the search row and the trigger', () => {
    expect(paneBlock).toMatch(/styles\.searchRow/);
    expect(paneBlock).toMatch(/styles\.filterTriggerRow/);
  });
});

describe('D3/C3 — an active filter can never hide behind a closed sheet', () => {
  it('signals it two independent ways: an active trigger AND a Clear chip', () => {
    expect(tasks).toMatch(/tasksFiltersActive && styles\.filterTriggerBtnActive/);
    expect(tasks).toMatch(/\{tasksFiltersActive && \(/);
  });

  it('uses the ratified active grammar for the trigger', () => {
    expect(tasks).toMatch(/filterTriggerBtnActive: \{ backgroundColor: color\.ctaFill, borderColor: 'transparent' \}/);
    // RE-PINNED 2026-08-21 (Phase 2a). The trigger is a 44pt circle now, not a
    // text chip — its word became the title of the sheet it opens — so the
    // active ink lands on the ICON rather than on a label. Same fork, same two
    // tokens, on the only thing left inside the circle to paint. This is the
    // map's own filter-button grammar, which is where the circle came from.
    expect(tasks).toMatch(
      /color=\{tasksFiltersActive \? color\.textOnBrand : color\.glassChipInk\}/,
    );
  });

  it('counts a filter as active for every axis that actually filters', () => {
    expect(tasks).toMatch(
      /const tasksFiltersActive = mineOnly \|\| categoryFilter !== null \|\| debouncedSearchText !== '';/,
    );
  });

  it('excludes SORT — an order is not a filter', () => {
    // Clearing filters must never silently reset the ordering the user chose.
    const line = tasks.split('\n').find((l) => l.includes('const tasksFiltersActive')) ?? '';
    expect(line).not.toMatch(/sortMode/);
    expect(clearFilters).not.toBe('');
    expect(clearFilters).not.toMatch(/handleSortChange|setSortMode/);
  });

  it('clears exactly the three filtering axes', () => {
    expect(clearFilters).toMatch(/handleScopeChange\(false\)/);
    expect(clearFilters).toMatch(/handleCategoryChange\(null\)/);
    expect(clearFilters).toMatch(/setSearchText\(''\)/);
  });

  it('announces the trigger as expandable', () => {
    expect(tasks).toMatch(/\{\.\.\.a11yToggle\(\{ expanded: filterSheetOpen \}\)\}/);
  });
});

describe('D3/C3 — the sheet costs nothing it should not', () => {
  it('is the OPAQUE house sheet — zero live blur panes', () => {
    // Tasks must still own exactly ONE live pane (the chrome). A glass sheet
    // would add a second while open, against a budget that is already tight.
    expect(sheetBlock).toMatch(/glass=\{false\}/);
  });

  it('leaves Tasks with exactly one chrome pane', () => {
    expect(tasksCode.match(/variant="chrome"/g) ?? []).toHaveLength(1);
  });

  it('uses the shipped SOLID pair for chips inside the opaque card', () => {
    // A translucent glass-chip fill over an opaque card is a composite nobody
    // has arbitrated; the solid pair avoids owing an arbiter run.
    expect(tasks).toMatch(/sheetChip: \{[\s\S]*?backgroundColor: color\.surfaceNeutral,[\s\S]*?borderColor: color\.borderSubtle,/);
    expect(tasks).toMatch(/sheetSortChip: \{[\s\S]*?backgroundColor: color\.surfaceNeutral,/);
  });

  it('keeps the active-chip grammar unchanged inside the sheet', () => {
    expect(tasks).toMatch(/sheetChipActive: \{ backgroundColor: color\.ctaFill/);
    expect(tasks).toMatch(/sheetSortChipActive: \{ backgroundColor: color\.ctaFill/);
  });
});

describe('D3/C3 — the rows were moved, not rewritten', () => {
  it('keeps every filter handler wired exactly as before', () => {
    for (const handler of ['handleScopeChange(false)', 'handleScopeChange(true)', 'handleCategoryChange(null)', 'handleSortChange(mode)']) {
      expect(`${handler}: ${tasks.includes(handler)}`).toBe(`${handler}: true`);
    }
  });

  it('keeps every filter label and its selected-state announcement', () => {
    // A11Y-215 (SC 2.5.3): the "Mine" chip's name now CONTAINS its visible
    // text, so a voice-control user can speak what they see.
    for (const label of ['Show all flags', 'Mine, show only my flags', 'Show all categories', 'Filter by category', 'Sort order']) {
      expect(`${label}: ${tasks.includes(label)}`).toBe(`${label}: true`);
    }
    // A11Y-216: `pressed`, not `selected` — Chromium drops aria-selected on
    // role=button, so web screen readers heard no state at all. a11yToggle
    // mirrors pressed into the native trait, so VoiceOver is unchanged.
    expect(tasks).toMatch(/a11yToggle\(\{ pressed: !mineOnly, disabled: !mineOnlyHydrated \}\)/);
    expect(tasks).toMatch(/a11yToggle\(\{ pressed: categoryFilter === null \}\)/);
  });

  it('every control in the new row clears 44pt', () => {
    for (const key of ['filterTriggerBtn', 'clearFiltersBtn', 'sheetChip', 'sheetSortChip']) {
      const block = tasks.match(new RegExp(`${key}: \\{[\\s\\S]*?\\n    \\},`))?.[0] ?? '';
      expect(`${key}: ${/minHeight: 44/.test(block)}`).toBe(`${key}: true`);
    }
  });

  it('drops the horizontal strip’s overflow affordance with the strip itself', () => {
    // The wrap row cannot overflow, so an overflow fade would be a lie.
    expect(tasks).not.toMatch(/<OverflowFade/);
  });
});

describe('the seed constant matches the pane', () => {
  it('reflects the rows that remain after Phase 2a folded the trigger row in', () => {
    // C3 took the pane to 210 by moving three rows into the filter sheet.
    // Phase 2a folded the remaining trigger row into the search row as two
    // 44pt circles, so its 64 is gone: 8 + 78 + 60 = 146. The C3 arithmetic is
    // kept above it as history rather than overwritten, because the comment is
    // a record of how the pane got here and each step was measured.
    expect(tasks).toMatch(/const CHROME_FALLBACK_HEIGHT = 146;/);
    expect(tasks).toMatch(/header 78 \+ control row 60 = 146/);
  });
});
