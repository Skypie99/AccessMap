/**
 * ACCESSIBLE-PARENT TRAP guard (A11Y-213, the S13/L6-04 defect class).
 *
 * On iOS, a container with `accessible` (+ label/role) becomes ONE VoiceOver
 * leaf: every interactive child inside it is unreachable — announced never,
 * operated never. The house counter-pattern (S13, pinned for Tasks cards in
 * TasksScreenFlagCard.test.tsx) is: container NOT accessible; a summary node
 * carries the text semantics; each action stays an independent element.
 *
 * This guard pins the three sites the 2026-07-31 a11y train de-flattened —
 * each anchored by its style name, asserted on the PARSED OPEN TAG (comment-
 * stripped, brace-balanced), so prose can't match and a re-flatten fails:
 *
 *   1. MapScreen empty-filters recovery card (PROTECT-2 — the only zero-results
 *      recovery path; flattening it defeated the protection for VO users).
 *   2. AddressSearchModal search-failed card (swallowed "Try again").
 *   3. FlagDetailModal after-photo tip (swallowed "Add after photo").
 *
 * BLIND SPOT, stated: site-pinned, not class-wide — a NEW flattened container
 * elsewhere is not caught here (that standing net is the a11y-lint gap, L1-1,
 * parked). Reachability on hardware = device rows N-2..N-5.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');


/** The first open tag in `src` after `anchor`, brace-balanced to its '>'. */
function openTagAt(src: string, anchor: string, file: string): string {
  const at = src.indexOf(anchor);
  if (at === -1) throw new Error(`${file}: anchor not found: ${anchor}`);
  // Walk BACK to the '<' that opens the tag containing the anchor.
  const start = src.lastIndexOf('<', at);
  if (start === -1) throw new Error(`${file}: no tag open before anchor ${anchor}`);
  let depth = 0;
  let j = start;
  while (j < src.length) {
    const c = src[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) break;
    j++;
  }
  return src.slice(start, j + 1);
}

const read = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

/** Bare `accessible` prop (not accessible={false}, not accessibilityXxx). */
const hasBareAccessible = (tag: string) => /\baccessible\b(?!\s*=\s*\{)(?!\w)/.test(tag) || /\baccessible\s*=\s*\{\s*true\s*\}/.test(tag);

/** Explicit accessible={false} — the S13 opt-out that un-flattens a Pressable. */
const hasAccessibleFalse = (tag: string) => /\baccessible\s*=\s*\{\s*false\s*\}/.test(tag);

describe('A11Y-213 guard — labeled containers must not swallow their interactive children', () => {
  it('MapScreen empty-filters recovery card: material container is not an accessible leaf; summary node carries the alert', () => {
    const src = read('screens/MapScreen.tsx');
    const cardTag = openTagAt(src, 'styles.emptyCard}', 'MapScreen');
    expect(hasBareAccessible(cardTag)).toBe(false);
    expect(cardTag).not.toMatch(/accessibilityLabel/);
    // The summary node (title+body) still announces the zero-results state.
    const summaryTag = openTagAt(src, 'styles.emptyCardSummary}', 'MapScreen');
    expect(hasBareAccessible(summaryTag)).toBe(true);
    expect(summaryTag).toContain('accessibilityRole="alert"');
    expect(summaryTag).toContain('accessibilityLiveRegion="polite"');
    // Both recovery actions still exist as labeled buttons.
    expect(src).toContain('accessibilityLabel="Reset all filters"');
  });

  it('AddressSearchModal search-failed card: container plain; summary node announces; Try again reachable', () => {
    const src = read('components/AddressSearchModal.tsx');
    const cardTag = openTagAt(src, 'styles.errorCard}', 'AddressSearchModal');
    expect(hasBareAccessible(cardTag)).toBe(false);
    expect(cardTag).not.toMatch(/accessibilityLabel/);
    const summaryTag = openTagAt(src, 'styles.errorSummary}', 'AddressSearchModal');
    expect(hasBareAccessible(summaryTag)).toBe(true);
    expect(summaryTag).toContain('accessibilityLiveRegion="polite"');
    expect(src).toContain('accessibilityLabel="Try again, search this address"');
  });

  it('FlagDetailModal after-photo tip: container plain; Add-after-photo reachable', () => {
    const src = read('components/FlagDetailModal.tsx');
    const tipTag = openTagAt(src, 'styles.afterTip}', 'FlagDetailModal');
    expect(hasBareAccessible(tipTag)).toBe(false);
    expect(tipTag).not.toMatch(/accessibilityLabel/);
    expect(src).toContain('accessibilityLabel="Add after photo"');
  });
});

describe('A11Y-214 guard — accessible-by-default Pressables must not swallow nested actions (row form)', () => {
  it('MyWatchedModal row: Pressable opted out; summary node labeled; both row actions reachable', () => {
    const src = read('components/MyWatchedModal.tsx');
    const rowTag = openTagAt(src, 'styles.rowResolved', 'MyWatchedModal');
    expect(hasAccessibleFalse(rowTag)).toBe(true);
    expect(rowTag).not.toMatch(/accessibilityLabel/);
    const summaryTag = openTagAt(src, 'styles.rowSummary}', 'MyWatchedModal');
    expect(hasBareAccessible(summaryTag)).toBe(true);
    expect(summaryTag).toContain('accessibilityRole="button"');
    expect(src).toContain('accessibilityLabel="Stop watching this flag"');
  });

  it('MyReportsModal row: Pressable opted out; summary node labeled', () => {
    const src = read('components/MyReportsModal.tsx');
    const rowTag = openTagAt(src, '[styles.row, pressed && styles.rowPressed]', 'MyReportsModal');
    expect(hasAccessibleFalse(rowTag)).toBe(true);
    expect(rowTag).not.toMatch(/accessibilityLabel/);
    const summaryTag = openTagAt(src, 'styles.rowSummary}', 'MyReportsModal');
    expect(hasBareAccessible(summaryTag)).toBe(true);
    expect(summaryTag).toContain('accessibilityRole="button"');
  });

  it('ActivityFeedModal row: Pressable opted out; summary node labeled', () => {
    const src = read('components/ActivityFeedModal.tsx');
    const rowTag = openTagAt(src, '[styles.row, pressed && styles.rowPressed]', 'ActivityFeedModal');
    expect(hasAccessibleFalse(rowTag)).toBe(true);
    expect(rowTag).not.toMatch(/accessibilityLabel/);
    const summaryTag = openTagAt(src, 'styles.rowSummary}', 'ActivityFeedModal');
    expect(hasBareAccessible(summaryTag)).toBe(true);
    expect(summaryTag).toContain('accessibilityRole="button"');
  });

  it('PhotoGallery thumb: Pressable opted out; the image carries the imagebutton identity; Remove reachable', () => {
    const src = read('components/PhotoGallery.tsx');
    const thumbTag = openTagAt(src, 'styles.thumb, pressed', 'PhotoGallery');
    expect(hasAccessibleFalse(thumbTag)).toBe(true);
    expect(thumbTag).not.toMatch(/accessibilityRole="imagebutton"/);
    const imgTag = openTagAt(src, 'styles.thumbImage}', 'PhotoGallery');
    expect(hasBareAccessible(imgTag)).toBe(true);
    expect(imgTag).toContain('accessibilityRole="imagebutton"');
    expect(src).toMatch(/accessibilityLabel=\{`Remove photo \$\{index \+ 1\}`\}/);
  });

  it('LegendModal card shell (SR-072): the tap-swallow node is not an AT element', () => {
    const src = read('screens/LegendModal.tsx');
    // FIX4F moved cardShell's dynamic top-inset marginTop off onto SheetPull's
    // own style (see legendScrollFix4e.guard.test.ts's FIX4F block for why),
    // so the style prop went back to a bare `styles.cardShell}` — anything
    // unique inside the tag still locates it via openTagAt's brace-balanced
    // walk regardless of which shape the style prop takes.
    const shellTag = openTagAt(src, 'styles.cardShell}', 'LegendModal');
    expect(hasAccessibleFalse(shellTag)).toBe(true);
    // Its jobs stay: swallow taps, contain VO, handle escape.
    expect(shellTag).toContain('accessibilityViewIsModal');
    expect(shellTag).toContain('onAccessibilityEscape');
  });

  it('HomeScreen search (SR-040): outer Pressable opted out; summary labeled; Clear reachable', () => {
    const src = read('screens/HomeScreen.tsx');
    const searchTag = openTagAt(src, 'styles.searchPressable', 'HomeScreen');
    expect(hasAccessibleFalse(searchTag)).toBe(true);
    expect(searchTag).not.toMatch(/accessibilityLabel/);
    const summaryTag = openTagAt(src, 'styles.searchText,', 'HomeScreen');
    expect(hasBareAccessible(summaryTag)).toBe(true);
    expect(summaryTag).toContain('accessibilityRole="button"');
    expect(src).toContain('accessibilityLabel="Clear search"');
  });

  it('FilterPresetsModal preset row: container plain; its five controls reachable', () => {
    // Found 2026-08-20 while verifying SW-32, and it is the same class this
    // file exists for — an unpinned instance the docblock above predicts.
    //
    // The row wrapper carried accessibilityRole="button" + a label around
    // Apply, Rename, Delete and (mid-rename) a TextInput with Cancel and Save.
    // On web, role="button" makes descendants presentational and they leave the
    // tree; on iOS the props are inert without `accessible`, so it announced an
    // identity it never had — over a View with no press handler.
    const src = read('components/FilterPresetsModal.tsx');
    const rowTag = openTagAt(src, 'styles.row}', 'FilterPresetsModal');
    expect(rowTag).not.toMatch(/accessibilityRole/);
    expect(rowTag).not.toMatch(/accessibilityLabel/);
    expect(hasBareAccessible(rowTag)).toBe(false);

    // Non-vacuity: the controls it used to swallow must still be there, each
    // with its own identity.
    for (const label of [
      'accessibilityLabel="Save new name"',
      'accessibilityLabel="Cancel rename"',
      'accessibilityLabel="New preset name"',
    ]) {
      expect(src).toContain(label);
    }
    expect(src).toMatch(/accessibilityLabel=\{`Apply preset \$\{item\.name\}`\}/);
  });

  it('HomeScreen Clear-search meets the 44pt house floor (A11Y-223: 16pt glyph + 14 slop = 44 effective)', () => {
    const src = read('screens/HomeScreen.tsx');
    const clearTag = openTagAt(src, 'accessibilityLabel="Clear search"', 'HomeScreen');
    // Slop math, deliberately: a real 44 box would consume 28px of the glass
    // bar's text width; hitSlop extends the target without layout change, and
    // the only slop-neighbours are non-interactive (text / bar edge).
    expect(clearTag).toContain('hitSlop={14}');
  });
});
