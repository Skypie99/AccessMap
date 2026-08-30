/**
 * FIX4C — the stateBody ScrollView gap FIX4B explicitly deferred.
 *
 * FIX4B (sheetScrollFix4b.guard.test.ts / sheetScrollFix4bFlatList.guard.test.ts,
 * commit 2762a54) hardened every other Sheet/SheetPull scroll ref in the app,
 * but its own commit message named one gap it deliberately left open:
 * MyReportsModal's and MyWatchedModal's loading/empty-state
 * `<ScrollView style={styles.stateBody}>` (the SW-42 scroll-not-clip fix)
 * carried NO ref into SheetPull at all. That is a different-shaped gap than
 * the rest of FIX4B, which fixed refs that resolved to the WRONG thing (a
 * dead `.handlerTag`) — this one never had a ref to begin with, so
 * `simultaneousHandlers` had nothing to resolve, dead or otherwise, whenever
 * the loading/empty branch was on screen.
 *
 * ─── WHY THIS BRANCH USES A CALLBACK REF, NOT A PLAIN ref={scrollRef} ─────
 * Both files' `scrollRef` is `useRef<unknown>(null)` (FIX4B's FlatList-group
 * change) so the same variable can also hold the node
 * `FlatList.getNativeScrollRef()` returns. TypeScript won't assign a
 * `RefObject<unknown>` straight to a plain `<ScrollView ref={...}>` (which
 * wants `Ref<ScrollView>`), so this branch uses a callback ref instead:
 * `ref={(r) => { scrollRef.current = r; }}`. No getNativeScrollRef()
 * indirection is needed here — RNGH's ScrollView (unlike its FlatList
 * wrapper) carries `.handlerTag` directly on its own ref, which is exactly
 * what FIX4B's ScrollView-group fix already relies on elsewhere
 * (sheetScrollFix4b.guard.test.ts covers that half of the mechanism).
 *
 * Same house idiom as every sibling guard here: a source scan, not a device
 * test — it can't run a gesture, but it CAN pin the one-line shape (a ref
 * that resolves to something real) so this specific gap can't quietly
 * reopen. Real-device swipe proof is mandatory before trusting the fix and
 * does not substitute for it, same as every guard in this family.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

const STATEBODY_SHEETS = [
  ['MyReportsModal', 'components/MyReportsModal.tsx'],
  ['MyWatchedModal', 'components/MyWatchedModal.tsx'],
] as const;

describe('FIX4C — stateBody ScrollView imports RNGH ScrollView and carries a real ref', () => {
  it.each(STATEBODY_SHEETS)('%s imports ScrollView from react-native-gesture-handler', (_n, rel) => {
    const src = read(rel);
    expect(src).toMatch(/import\s*\{[^}]*\bScrollView\b[^}]*\}\s*from\s*'react-native-gesture-handler'/);
  });

  it.each(STATEBODY_SHEETS)('%s does not shadow it with a react-native ScrollView', (_n, rel) => {
    const src = read(rel);
    const rnImports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'react-native';/g)];
    expect(rnImports.length).toBeGreaterThan(0);
    for (const m of rnImports) {
      expect(m[1]).not.toMatch(/\bScrollView\b/);
    }
  });

  it.each(STATEBODY_SHEETS)('%s wires its stateBody ScrollView to a real ref, not left dangling', (_n, rel) => {
    const src = read(rel);
    // The specific loading/empty-state scroller (SW-42's stateBody style) —
    // not any other ScrollView the file might carry (MyWatchedModal also has
    // two unrelated horizontal chip-rail ScrollViews that must stay ref-less;
    // this pattern's uniqueness on `styles.stateBody` keeps the assertion
    // pinned to the right element).
    expect(src).toMatch(
      /<ScrollView\s+style=\{styles\.stateBody\}[\s\S]*?ref=\{\(r\)\s*=>\s*\{\s*scrollRef\.current\s*=\s*r;?\s*\}\}/,
    );
  });

  it.each(STATEBODY_SHEETS)("%s still wires scrollRef into SheetPull via Sheet's scrollRef prop", (_n, rel) => {
    const src = read(rel);
    expect(src).toMatch(/scrollRef=\{scrollRef\}/);
  });
});
