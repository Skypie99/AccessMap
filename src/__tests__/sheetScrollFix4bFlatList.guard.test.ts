/**
 * FIX4B — the FlatList half of the dead-ref pattern (sheetScrollFix4b.guard.test.ts
 * covers the ScrollView half). Same underlying bug as LegendModal
 * (legendScrollFix4.guard.test.ts), but FlatList needed one more step, and
 * this test pins BOTH halves so neither can quietly regress on its own.
 *
 * ─── WHY FLATLIST NEEDS MORE THAN THE IMPORT SWAP ─────────────────────────
 * A `ScrollView` imported from `'react-native-gesture-handler'` gets its
 * `.handlerTag` directly: it IS `createNativeWrapper(RNScrollView)`, and that
 * wrapper's `useImperativeHandle` (createNativeWrapper.tsx) literally mutates
 * `_ref.current.handlerTag = node.handlerTag` before exposing `_ref.current`
 * to whatever ref a consumer attaches. So `<ScrollView ref={x}>` gives `x` a
 * tagged ref directly — the LegendModal fix.
 *
 * RNGH's `FlatList` (GestureComponents.js) is different: it forwards the
 * consumer's `ref` straight to a PLAIN `react-native` `FlatList`
 * (`_jsx(RNFlatList, { ref, ... })`), never through `createNativeWrapper`.
 * `.handlerTag` never reaches that ref. What DOES change, once FlatList is
 * imported from RNGH, is FlatList's internal `renderScrollComponent` — it
 * now renders RNGH's `<ScrollView>` as the actual native scroller, and
 * `@react-native/virtualized-lists`' `VirtualizedList` (`_captureScrollRef`,
 * confirmed in its source) attaches ITS OWN ref directly to that. So the
 * tagged node exists — it's just one level down from the ref you're handed.
 *
 * `FlatList.getNativeScrollRef()` (react-native/Libraries/Lists/FlatList.js)
 * is the documented way down to it: `this._listRef.getScrollRef()`, which
 * (per VirtualizedList.js) either forwards through one more `getScrollRef()`
 * or returns `this._scrollRef` directly — the same tagged node
 * `_captureScrollRef` stored. So the fix is the import swap PLUS a ref
 * callback that calls `.getNativeScrollRef()` and stores THAT (not the
 * FlatList instance) in the ref `Sheet`'s `scrollRef` prop receives.
 *
 * Proven on the real iOS 26.5 simulator (Flagstone Audit iPhone 17 Pro),
 * same class of proof legendScrollFix4.guard.test.ts required: content
 * genuinely moves under a swipe, not just "the swipe was delivered".
 *
 * House idiom: static source scan. Can't run a gesture; can pin the two
 * lines a future edit could quietly drop.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

const FLATLIST_SHEETS = [
  ['LeaderboardScreen', 'screens/LeaderboardScreen.tsx'],
  ['MyReportsModal', 'components/MyReportsModal.tsx'],
  ['MyWatchedModal', 'components/MyWatchedModal.tsx'],
  ['FilterPresetsModal', 'components/FilterPresetsModal.tsx'],
  ['SavedPlacesModal', 'components/SavedPlacesModal.tsx'],
] as const;

describe('FIX4B — FlatList-based sheets import RNGH FlatList, not react-native\'s', () => {
  it.each(FLATLIST_SHEETS)('%s imports FlatList from react-native-gesture-handler', (_n, rel) => {
    const src = read(rel);
    expect(src).toMatch(/import\s*\{\s*FlatList\s*\}\s*from\s*'react-native-gesture-handler'/);
  });

  it.each(FLATLIST_SHEETS)('%s does not shadow it with a react-native FlatList', (_n, rel) => {
    const src = read(rel);
    const rnImports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'react-native';/g)];
    expect(rnImports.length).toBeGreaterThan(0);
    for (const m of rnImports) {
      expect(m[1]).not.toMatch(/\bFlatList\b/);
    }
  });

  it.each(FLATLIST_SHEETS)('%s bridges to the native scroll node via getNativeScrollRef(), not the FlatList ref directly', (_n, rel) => {
    const src = read(rel);
    // The import alone is inert: a ref attached straight to the FlatList
    // element (`ref={scrollRef}`) still resolves to the FlatList instance,
    // which has no `.handlerTag`. Only the node getNativeScrollRef() returns
    // has it, so that call MUST sit inside the ref callback.
    expect(src).toMatch(/ref=\{\(r\)\s*=>\s*\{\s*scrollRef\.current\s*=\s*r\?\.getNativeScrollRef\(\)\s*\?\?\s*null;?\s*\}\}/);
    // A plain `ref={scrollRef}` on the FlatList tag would be the regressed
    // (LegendModal-class) form of this bug — assert it's gone.
    expect(src).not.toMatch(/<FlatList[^>]*\bref=\{scrollRef\}/s);
  });

  it.each(FLATLIST_SHEETS)('%s still wires the bridged ref into SheetPull via Sheet\'s scrollRef prop', (_n, rel) => {
    const src = read(rel);
    expect(src).toMatch(/scrollRef=\{scrollRef\}/);
  });
});
