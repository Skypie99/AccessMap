/**
 * FIX4C — the SectionList sheet FIX4B deliberately left alone.
 *
 * sheetScrollFix4b.guard.test.ts (ScrollView group) and
 * sheetScrollFix4bFlatList.guard.test.ts (FlatList group) cover 13 of the 14
 * Sheet/SheetPull consumers with the LegendModal dead-ref pattern. The 14th,
 * ActivityFeedModal, was explicitly NOT touched in that pass because RNGH
 * ships no SectionList wrapper at all (confirmed by reading
 * `GestureComponents.d.ts`: it exports ScrollView, FlatList, Switch,
 * TextInput, DrawerLayoutAndroid, RefreshControl — no SectionList), so the
 * ScrollView-group's import swap and the FlatList-group's
 * `getNativeScrollRef()` bridge both have no equivalent to reach for.
 *
 * ─── WHY THIS FIX HAS A DIFFERENT SHAPE THAN BOTH SIBLING GROUPS ───────────
 * The natural next guess — mirror FlatList's `ref={(r) => { scrollRef.current
 * = r?.getNativeScrollRef() ?? null; }}` pattern via SectionList's own
 * `getListRef()` — does not work. Confirmed by reading the actual runtime
 * source (`react-native/Libraries/Lists/SectionList.js`) and its generated
 * `.d.ts`: `SectionList` proxies `getScrollResponder`, `getScrollableNode`,
 * `recordInteraction`, `flashScrollIndicators` and `setNativeProps` through to
 * its internal `VirtualizedSectionList`, but never re-exposes
 * `getListRef()` itself — that method only exists one layer down, on
 * `VirtualizedSectionList`, which is not what `<SectionList>` gives a
 * consumer's ref. `scrollRef.current?.getListRef()` on a plain SectionList
 * ref throws at runtime and fails typecheck; it is not merely unproven, it is
 * wrong.
 *
 * A ref set directly on the element `renderScrollComponent` returns doesn't
 * work either: VirtualizedList always re-parents that ref onto itself
 * (`VirtualizedList.js`: `cloneElement(el, { ref: this._captureScrollRef })`),
 * discarding whatever ref the element already had.
 *
 * The fix that actually reaches the tagged node: pass `renderScrollComponent`
 * to `<SectionList>` (confirmed to flow through unmodified — SectionList.js
 * and VirtualizedSectionList.js both spread it through `...passThroughProps`
 * without consuming it) rendering `SectionListScrollRefBridge`, a
 * `forwardRef` component whose ref callback forwards the node it receives to
 * BOTH the incoming `ref` (so VirtualizedList's own `_captureScrollRef` still
 * gets it — required for scrolling/virtualization to keep working) AND to
 * `bridgeRef` (so SheetPull's `simultaneousHandlers` gets it too). This is
 * confirmed behaviorally equivalent to the RN default for this call site: per
 * `VirtualizedList.js`'s `_defaultRenderScrollComponent`, since
 * ActivityFeedModal passes `refreshControl={<RefreshControl .../>}` directly
 * rather than bare `onRefresh`/`refreshing`, the default's `onRefresh` branch
 * never applies here — the default IS `<ScrollView {...props} />`, which is
 * exactly what SectionListScrollRefBridge renders (RNGH's ScrollView instead
 * of react-native's, everything else byte-identical).
 *
 * House idiom: static source scan, same as both sibling files. Can't run a
 * gesture; can pin the shape a future edit could quietly drop. Real-device
 * swipe proof (content genuinely moves) AND pull-to-refresh proof (the
 * refresh spinner still appears) are mandatory before trusting this on a real
 * device — this test cannot substitute for either and does not claim to.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

const FILE = 'components/ActivityFeedModal.tsx';

describe('FIX4C — ActivityFeedModal (SectionList) bridges renderScrollComponent to a real scroll ref', () => {
  it('imports ScrollView from react-native-gesture-handler', () => {
    const src = read(FILE);
    expect(src).toMatch(/import\s*\{\s*ScrollView\s*\}\s*from\s*'react-native-gesture-handler'/);
  });

  it('does not shadow it with a react-native ScrollView', () => {
    const src = read(FILE);
    const rnImports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'react-native';/g)];
    expect(rnImports.length).toBeGreaterThan(0);
    for (const m of rnImports) {
      expect(m[1]).not.toMatch(/\bScrollView\b/);
    }
  });

  it('still imports SectionList from react-native (RNGH ships no SectionList wrapper)', () => {
    const src = read(FILE);
    const rnImports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'react-native';/g)];
    expect(rnImports.some((m) => /\bSectionList\b/.test(m[1]))).toBe(true);
  });

  it('does not attach a plain ref directly to SectionList (the dead-ref regression shape)', () => {
    const src = read(FILE);
    expect(src).not.toMatch(/<SectionList[^>]*\bref=\{scrollRef\}/s);
  });

  it('passes renderScrollComponent to SectionList, bridging to SectionListScrollRefBridge with scrollRef', () => {
    const src = read(FILE);
    expect(src).toMatch(/<SectionList[\s\S]*?renderScrollComponent=\{/);
    expect(src).toMatch(/<SectionListScrollRefBridge\s+\{\.\.\.scrollProps\}\s+bridgeRef=\{scrollRef\}/);
  });

  it('SectionListScrollRefBridge is a forwardRef component rendering RNGH ScrollView', () => {
    const src = read(FILE);
    expect(src).toMatch(/const SectionListScrollRefBridge = React\.forwardRef/);
    expect(src).toMatch(/<ScrollView\b/);
  });

  it('the bridge forwards the node to BOTH the incoming ref and bridgeRef — dropping either regresses something', () => {
    const src = read(FILE);
    // Dropping this half doesn't break the gesture fix — it breaks scrolling/
    // virtualization entirely, since VirtualizedList's own _captureScrollRef
    // would never receive the node.
    expect(src).toMatch(/if\s*\(typeof ref === 'function'\)\s*ref\(node\)/);
    expect(src).toMatch(/\(ref as React\.MutableRefObject<unknown>\)\.current = node/);
    // Dropping THIS half silently reintroduces the exact FIX4B/FIX4C defect:
    // SheetPull's simultaneousHandlers gets a ref that never resolves.
    expect(src).toMatch(/bridgeRef\.current = node/);
  });

  it('scrollRef is still wired into Sheet via the scrollRef prop', () => {
    const src = read(FILE);
    expect(src).toMatch(/scrollRef=\{scrollRef\}/);
  });

  it('pull-to-refresh wiring is unchanged: refreshControl still wraps RefreshControl with refreshing/onRefresh', () => {
    const src = read(FILE);
    expect(src).toMatch(
      /refreshControl=\{<RefreshControl\s+refreshing=\{loading\}\s+onRefresh=\{load\}/,
    );
  });
});

/**
 * FIX4C follow-up — the loadError banner lives INSIDE the scrollable, not
 * beside it.
 *
 * At accessibility-XXXL the banner's own text can grow taller than the
 * Sheet's 85% cap. A sibling View above <SectionList> has no scroll
 * mechanism of its own, so anything the Sheet's `overflow: hidden` card
 * clips is gone for good — verified on the real iOS 26.5 simulator
 * (Flagstone Audit iPhone 17 Pro): "That feature isn't available yet."
 * was cut off mid-word, "yet." and the Retry button's row never reachable.
 *
 * Fix: the banner renders via <SectionList>'s own `ListHeaderComponent`,
 * so it scrolls with the list instead of sitting outside it — same
 * scrollable, same SectionListScrollRefBridge, no second ScrollView.
 * `contentContainerStyle` has to stop forcing `styles.center` whenever
 * there's an error, too: centering shrinks the header to its intrinsic
 * width and pins it to the middle instead of the top, which is what let
 * it get clipped in the first place — the genuine empty state (no error,
 * zero sections) keeps centering, since EmptyState's icon+title+body
 * layout depends on it.
 */
describe('FIX4C follow-up — ActivityFeedModal error banner scrolls inside SectionList, not beside it', () => {
  it('does not render the error banner as a sibling before the list (the pre-fix clipped shape)', () => {
    const src = read(FILE);
    // The old shape: a standalone `{loadError ? (<View style={styles.errorBanner}>` block
    // sitting between the filter row and the loading/SectionList branch.
    expect(src).not.toMatch(/\{loadError \? \(\s*<View style=\{styles\.errorBanner\}>/);
  });

  it('passes the error banner to SectionList via ListHeaderComponent', () => {
    const src = read(FILE);
    expect(src).toMatch(/<SectionList[\s\S]*?ListHeaderComponent=\{/);
    expect(src).toMatch(/ListHeaderComponent=\{\s*loadError \? \(\s*<View style=\{styles\.errorBanner\}>/);
  });

  it('the header still carries the full error text and a working Retry button', () => {
    const src = read(FILE);
    // Scoped to the ListHeaderComponent block so this can't pass by matching
    // some other, unrelated banner elsewhere in the file.
    const headerMatch = src.match(/ListHeaderComponent=\{([\s\S]*?)\n {14}\}/);
    expect(headerMatch).not.toBeNull();
    const header = headerMatch![1];
    expect(header).toMatch(/<AppText variant="body" style=\{styles\.errorText\}>\{loadError\}<\/AppText>/);
    expect(header).toMatch(/onPress=\{load\}/);
    expect(header).toMatch(/accessibilityLabel="Retry loading activity"/);
  });

  it('contentContainerStyle only centers the genuine empty state, never the error state', () => {
    const src = read(FILE);
    // Must NOT be the old unconditional `sections.length === 0 ? styles.center` —
    // that centers (and thus can clip) the error banner too.
    expect(src).not.toMatch(/contentContainerStyle=\{sections\.length === 0 \? styles\.center/);
    expect(src).toMatch(
      /contentContainerStyle=\{!loadError && sections\.length === 0 \? styles\.center : styles\.list\}/,
    );
  });

  it('ListEmptyComponent still renders nothing extra on top of the header during an error', () => {
    const src = read(FILE);
    // Unchanged contract: the header IS the error state's only content;
    // EmptyState must not double up alongside it.
    expect(src).toMatch(/ListEmptyComponent=\{\s*loadError \? null : \(/);
  });
});
