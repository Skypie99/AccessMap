/**
 * D3/C1 (S-5) — "Select multiple" joins the search row.
 *
 * Sky's device report: the Tasks header eats half the screen. Measured at
 * 390x844 it is worse than "half" sounds — 451pt of chrome on an 844pt display,
 * with the first card starting 65% of the way down (DECISIONS §F F-17). One of
 * those rows was spent on a single right-aligned secondary control with nothing
 * beside it.
 *
 * This guard exists because the move is easy to get subtly wrong in three ways,
 * and all three would pass a casual eyeball:
 *
 *   1. the gates could stop composing to the old truth table, so the control
 *      appears (or vanishes) in a state it didn't before;
 *   2. the target could drop below 44pt once it has to share a row with a text
 *      input that wants to grow;
 *   3. the label could drift, breaking the muscle memory and the SR announcement
 *      of a control that has shipped for months.
 *
 * The reclaimed points are measured, not asserted here — a source test cannot
 * see layout. See design-reviews/device-tune/render-index.md and the phase
 * report's before/after table.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const tasks = readFileSync(join(__dirname, '..', 'TasksScreen.tsx'), 'utf8');

// Sliced by boundary rather than by regex: the row contains nested `)}`
// terminators, so a non-greedy match stops at the clear button.
const searchRowBlock = (() => {
  const start = tasks.indexOf('<View style={styles.searchRow}>');
  const end = tasks.indexOf('Mine-only toggle', start);
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

describe('D3/C1 — the control now rides the search row', () => {
  it('is mounted inside the search row', () => {
    expect(searchRowBlock).not.toBe('');
    expect(searchRowBlock).toMatch(/accessibilityLabel="Select multiple"/);
  });

  it('sits after the clear button, so the input keeps the leading edge', () => {
    const clearAt = searchRowBlock.indexOf('accessibilityLabel="Clear search"');
    const selectAt = searchRowBlock.indexOf('accessibilityLabel="Select multiple"');
    expect(clearAt).toBeGreaterThan(-1);
    expect(selectAt).toBeGreaterThan(clearAt);
  });

  it('moves exactly one position later in VoiceOver order — and no further', () => {
    // HONEST STATEMENT OF THE CHANGE (the banked ARIA trees show it):
    //   before: … subtitle → button "Select multiple" → textbox "Search flags"
    //   after:  … subtitle → textbox "Search flags"   → button "Select multiple"
    // S-5 put it after the clear button, so trading places with the search
    // field is the direct consequence, not a slip. It is still the 4th
    // interactive control on the screen and still precedes every filter, so
    // it remains trivially reachable — but "VoiceOver order is unchanged"
    // would be false, and this guard must not let anyone claim it.
    const search = tasks.indexOf('accessibilityLabel="Search flags"');
    const select = tasks.indexOf('accessibilityLabel="Select multiple"');
    const mine = tasks.indexOf('accessibilityLabel="Show all flags"');
    const category = tasks.indexOf('accessibilityLabel="Show all categories"');
    expect(search).toBeGreaterThan(-1);
    expect(select).toBeGreaterThan(search);
    expect(mine).toBeGreaterThan(select);
    expect(category).toBeGreaterThan(mine);
  });

  it('keeps the header rows themselves in their shipped order', () => {
    const search = tasks.indexOf('styles.searchRow');
    const mine = tasks.indexOf('styles.mineToggleRow');
    const categoryRow = tasks.indexOf('styles.categoryScroll');
    const sort = tasks.indexOf('styles.sortRow');
    expect(search).toBeLessThan(mine);
    expect(mine).toBeLessThan(categoryRow);
    expect(categoryRow).toBeLessThan(sort);
  });
});

describe('D3/C1 — the truth table is unchanged', () => {
  it('still requires a non-empty list AND not-already-selecting', () => {
    // Before: `{!selection.active && flags.length > 0 && (<View …>)}`
    // After:  the row's own `flags.length > 0` wrapper, with `!selection.active`
    //         nested inside it. Same conjunction, same states.
    expect(searchRowBlock).toMatch(/\{!selection\.active && \(/);
    expect(tasks).toMatch(/\{flags\.length > 0 && \(\s*\n\s*<View style=\{styles\.searchRow\}>/);
  });

  it('keeps the long-press path it was always the discoverable twin of', () => {
    expect(tasks).toMatch(/enterSelectionEmpty/);
  });
});

describe('D3/C1 — nothing a user can feel has changed about the control', () => {
  it('keeps the label and hint byte-identical', () => {
    expect(tasks).toContain('accessibilityLabel="Select multiple"');
    expect(tasks).toContain(
      'accessibilityHint="Enter selection mode to verify or resolve multiple flags at once"',
    );
    expect(tasks).toContain('<AppText variant="label" style={styles.selectEntryText}>Select multiple</AppText>');
  });

  it('keeps a >=44pt target and refuses to be squeezed by the input', () => {
    const btn = tasks.match(/selectEntryBtn: \{[\s\S]*?\n    \},/)?.[0] ?? '';
    expect(btn).toMatch(/minHeight: 44/);
    // Without this the flex row would shrink it as the TextInput grows.
    expect(btn).toMatch(/flexShrink: 0/);
  });

  it('keeps the pressed-fill vocabulary bp11 pins', () => {
    expect(tasks).toMatch(/selectEntryBtnPressed: \{ backgroundColor: color\.borderPressed \}/);
    expect(tasks).toMatch(/pressed && styles\.selectEntryBtnPressed/);
  });
});

describe('D3/C1 — the fallback-height comment now matches measured reality', () => {
  it('names the mine/All row the old comment silently omitted', () => {
    expect(tasks).toMatch(/mine\/All 60/);
    expect(tasks).toMatch(/it omitted the mine\/All row entirely/);
  });

  it('records why no web capture could ever have caught it', () => {
    expect(tasks).toMatch(/only renders\s*\n\/\/ when SIGNED IN/);
  });

  it('leaves the seed constant itself alone', () => {
    expect(tasks).toMatch(/const CHROME_FALLBACK_HEIGHT = 350;/);
  });
});
