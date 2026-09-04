/**
 * "Select multiple" — where it lives, and what has never changed about it.
 *
 * ─── THE HISTORY THIS PINS ────────────────────────────────────────────────
 * Sky's device report: the Tasks header eats half the screen. Measured at
 * 390x844 it was worse than "half" sounds — 451pt of chrome on an 844pt
 * display, with the first card starting 65% of the way down (DECISIONS §F
 * F-17). D3/C1 took the first bite: "Select multiple" had owned a whole row of
 * its own, right-aligned with nothing beside it, and moved onto the search
 * row's trailing edge.
 *
 * ─── RE-PINNED 2026-08-21 (art-direction Phase 2a, board 09) ──────────────
 * It has moved once more, for the same reason and one step further: the search
 * row now ends in two 44pt circles (filter, and ⋯), and "Select multiple" is a
 * row inside the ⋯ sheet. The pane is one row of controls instead of two.
 *
 * The three ways this move can be got wrong are the SAME three D3/C1 named, so
 * the assertions below are re-aimed rather than relaxed:
 *
 *   1. the gates could stop composing to the old truth table, so the control
 *      appears (or vanishes) in a state it didn't before;
 *   2. the target could drop below 44pt in its new container;
 *   3. the label could drift, breaking the muscle memory and the SR
 *      announcement of a control that has shipped for months.
 *
 * The honest cost, stated rather than smoothed over: this control is now TWO
 * taps from the chrome instead of one, and it is behind a ⋯ that does not name
 * it. Its discoverable twin — long-press any card — is unchanged and is still
 * how most users reach selection mode. The reclaimed points went to the cards.
 *
 * The reclaimed points are measured, not asserted here — a source test cannot
 * see layout. See design-reviews/device-tune/render-index.md and the phase
 * report's before/after table.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const tasks = readFileSync(join(__dirname, '..', 'TasksScreen.tsx'), 'utf8');

// Sliced by boundary rather than by regex: these blocks contain nested `)}`
// terminators, so a non-greedy match stops at the first inner close.
const searchRowBlock = (() => {
  const start = tasks.indexOf('<View style={styles.searchRow}>');
  const end = tasks.indexOf('An active filter must never', start);
  return start > -1 && end > start ? tasks.slice(start, end) : '';
})();

const toolSheetBlock = (() => {
  const start = tasks.indexOf('visible={toolSheetOpen');
  const end = tasks.indexOf('Points/notice flash', start);
  return start > -1 && end > start ? tasks.slice(start, end) : '';
})();

describe('D3/C1 — the dedicated row is gone', () => {
  it('no longer renders a selectEntryRow container', () => {
    expect(tasks).not.toMatch(/styles\.selectEntryRow/);
  });

  it('drops its now-dead style key', () => {
    expect(tasks).not.toMatch(/\n\s*selectEntryRow: \{/);
  });
});

describe('the control now lives in the ⋯ tool sheet', () => {
  it('found the two regions to reason about', () => {
    // Non-vacuity: an empty slice would make every assertion below pass while
    // checking nothing, which is the failure mode this whole file exists for.
    expect(searchRowBlock).not.toBe('');
    expect(toolSheetBlock).not.toBe('');
  });

  it('is mounted inside the sheet, and no longer inside the search row', () => {
    expect(toolSheetBlock).toMatch(/accessibilityLabel="Select multiple"/);
    expect(searchRowBlock).not.toMatch(/accessibilityLabel="Select multiple"/);
  });

  it('the search row ends in the two circles that replaced it', () => {
    const filterAt = searchRowBlock.indexOf('accessibilityLabel="Filter and sort"');
    const toolsAt = searchRowBlock.indexOf('accessibilityLabel="More task tools"');
    const clearAt = searchRowBlock.indexOf('accessibilityLabel="Clear search"');
    expect(clearAt).toBeGreaterThan(-1);
    // The input keeps the leading edge; the clear ✕ still belongs to the
    // textbox so it stays one predictable target; the circles come last.
    expect(filterAt).toBeGreaterThan(clearAt);
    expect(toolsAt).toBeGreaterThan(filterAt);
  });

  it('the ⋯ sheet leads with Clear filters when one is active', () => {
    // Board 09: Clear stays reachable from the drawer for a user who went
    // looking for the control rather than noticing the chip in the chrome.
    const clearAt = toolSheetBlock.indexOf('accessibilityLabel="Clear filters"');
    const selectAt = toolSheetBlock.indexOf('accessibilityLabel="Select multiple"');
    expect(clearAt).toBeGreaterThan(-1);
    expect(selectAt).toBeGreaterThan(clearAt);
  });

  it('VoiceOver order: search, then the circles, then the sheet rows', () => {
    // HONEST STATEMENT OF THE CHANGE. Before Phase 2a a VoiceOver user reached
    // "Select multiple" as the 4th control on the screen. It is now behind the
    // ⋯ button, which is the 6th — so it is one level deeper, not merely one
    // position later, and "VoiceOver order is unchanged" would be false.
    const search = tasks.indexOf('accessibilityLabel="Search flags"');
    const filter = tasks.indexOf('accessibilityLabel="Filter and sort"');
    const tools = tasks.indexOf('accessibilityLabel="More task tools"');
    const select = tasks.indexOf('accessibilityLabel="Select multiple"');
    const mine = tasks.indexOf('accessibilityLabel="Show all flags"');
    expect(search).toBeGreaterThan(-1);
    expect(filter).toBeGreaterThan(search);
    expect(tools).toBeGreaterThan(filter);
    expect(mine).toBeGreaterThan(tools);
    expect(select).toBeGreaterThan(mine);
  });

  it('drops the chip row it used to share, keeping only the conditional Clear', () => {
    // filterTriggerRow survives as the container for the Clear chip, which
    // mounts ONLY while something is genuinely filtering — so at rest the pane
    // is one row, which is the whole point of the compaction.
    expect(tasks).toMatch(/\{flags\.length > 0 && tasksFiltersActive && \(/);
    // The chip that used to say "Filter & sort" is gone; its word survives as
    // the title of the sheet it opened, so nothing had to be invented to drop it.
    expect(tasks).not.toMatch(/styles\.filterTriggerText\b/);
    expect(tasks).toMatch(/title="Filter &amp; sort"/);
  });
});

describe('the signed-in truth table is preserved and guests cannot select', () => {
  it('requires a user, a non-empty list, and not-already-selecting', () => {
    // The ⋯ circle that opens the sheet is inside the search row's own
    // `flags.length > 0` wrapper. Both the trigger and row now also require a
    // signed-in user because selection is a review capability. Re-entering
    // selection mode from here would call enterSelectionEmpty and silently
    // drop a selection the user had built.
    expect(tasks).toMatch(/\{flags\.length > 0 && \(\s*\n\s*<View style=\{styles\.searchRow\}>/);
    expect(toolSheetBlock).toMatch(/\{!!user && !selection\.active && \(/);
  });

  it('never opens an empty drawer and leaves guest-safe Clear filters reachable', () => {
    // A signed-in user sees tools while not selecting. A guest sees the ⋯ only
    // when an active filter gives the drawer its one guest-safe row.
    expect(searchRowBlock).toMatch(
      /\{\(\(!!user && !selection\.active\) \|\| tasksFiltersActive\) && \(/,
    );
    expect(toolSheetBlock).toContain(
      'visible={toolSheetOpen && (!!user || tasksFiltersActive)}',
    );
  });

  it('keeps the long-press path it was always the discoverable twin of', () => {
    // It matters more now that the button is two taps deep. The card owns the
    // matching auth gate, so guests cannot reach it through the twin either.
    expect(tasks).toMatch(/enterSelectionEmpty/);
    expect(tasks).toMatch(/onLongPress=\{user \? handleCardLongPress : undefined\}/);
  });
});

describe('nothing a user can HEAR has changed about the control', () => {
  it('keeps the label and hint byte-identical', () => {
    expect(tasks).toContain('accessibilityLabel="Select multiple"');
    expect(tasks).toContain(
      'accessibilityHint="Enter selection mode to verify or resolve multiple flags at once"',
    );
    expect(tasks).toContain('<AppText variant="label" style={styles.toolRowText}>Select multiple</AppText>');
  });

  it('keeps a >=44pt target in its new container', () => {
    const row = tasks.match(/toolRow: \{[\s\S]*?\n    \},/)?.[0] ?? '';
    expect(row).toMatch(/minHeight: 44/);
  });

  it('the two circles that replaced it are real 44x44 boxes, not slop', () => {
    for (const key of ['filterTriggerBtn', 'toolTriggerBtn']) {
      const block = tasks.match(new RegExp(`${key}: \\{[\\s\\S]*?\\n    \\},`))?.[0] ?? '';
      expect(`${key} height: ${/minHeight: 44/.test(block)}`).toBe(`${key} height: true`);
      // A circle sized only by its padding collapses to its glyph once the
      // label it used to hold is gone.
      expect(`${key} width: ${/minWidth: 44/.test(block)}`).toBe(`${key} width: true`);
      expect(`${key} shrink: ${/flexShrink: 0/.test(block)}`).toBe(`${key} shrink: true`);
    }
  });
});

describe('the fallback-height comment still matches the pane it describes', () => {
  it('keeps the measured history that the old comment silently omitted', () => {
    expect(tasks).toMatch(/mine\/All 60/);
    expect(tasks).toMatch(/it omitted the mine\/All row entirely/);
  });

  it('records why no web capture could ever have caught it', () => {
    expect(tasks).toMatch(/only renders\s*\n\/\/ when SIGNED IN/);
  });

  it('re-seeds the constant for the row Phase 2a removed', () => {
    // C3 took the pane to 210. Folding the filter trigger's 64pt row into the
    // search row as two circles takes it to 146. A 64pt seed error is a visible
    // first-paint jump, not a rounding difference, which is the whole reason
    // this constant is kept honest rather than left at a round number.
    expect(tasks).toMatch(/const CHROME_FALLBACK_HEIGHT = 146;/);
    expect(tasks).toMatch(/header 78 \+ control row 60 = 146/);
  });

  it('excludes the conditional Clear row from the seed, and says why', () => {
    expect(tasks).toMatch(/ONLY while a filter is\s*\n\/\/ active, so it is not part of the seed/);
  });
});
