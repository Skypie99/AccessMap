/**
 * FIX4B — sheet scroll hardening: every OTHER consumer of the same dead-ref
 * pattern LegendModal hit (legendScrollFix4.guard.test.ts).
 *
 * ─── THE BUG, ONE MORE TIME ────────────────────────────────────────────────
 * `SheetPull`'s `PanGestureHandler` takes `simultaneousHandlers={scrollRef}`
 * (wired either directly, or via `Sheet`'s `scrollRef` prop, which forwards
 * to the same place — see Sheet.tsx) so pull-to-dismiss and the body scroll
 * can recognize the same touch together. react-native-gesture-handler
 * resolves that ref via `ref.current.handlerTag` (utils.ts
 * `transformIntoHandlerTags`) — a field only a component wrapped by RNGH's
 * `createNativeWrapper` sets on its ref (confirmed by reading
 * `createNativeWrapper.tsx`: the wrapper's `useImperativeHandle` literally
 * mutates `_ref.current.handlerTag = node.handlerTag`). A plain `ScrollView`
 * imported from `'react-native'` has no such ref, so the relationship
 * silently resolves to an empty array on native and SheetPull's own handler
 * stays the sole recognizer for the gesture — the scroll never activates,
 * even though the swipe is delivered and "succeeds" at the OS level.
 *
 * This is a source scan, not a device test, for the same reason
 * legendScrollFix4.guard.test.ts is one: it can't run a gesture, but it CAN
 * pin the one-line cause permanently — which package the scrollable's ref
 * comes from — so a future edit can't quietly reintroduce it file by file.
 * Real-device swipe proof (content genuinely moves, not just "swipe
 * delivered") is mandatory before trusting this fix on any given sheet;
 * this test cannot substitute for that and does not claim to.
 *
 * ─── SCOPE OF THIS FILE ────────────────────────────────────────────────────
 * Covers the 8 files whose scrollable is a `ScrollView` — the same component
 * LegendModal fixed, so the same RNGH wrapper is a proven, prop-compatible
 * drop-in. The 5 `FlatList`-based sheets and the 1 `SectionList`-based sheet
 * are NOT here: RNGH's `FlatList` wrapper forwards its ref straight to a
 * plain, un-wrapped `react-native` `FlatList` (confirmed by reading
 * `GestureComponents.js` — `_jsx(RNFlatList, { ref, ... })`, never routed
 * through `createNativeWrapper`), so the identical import swap does not
 * obviously carry the same guarantee and needs its own, separately verified,
 * coverage once real-device proof settles what actually fixes it. RNGH ships
 * no `SectionList` wrapper at all.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

// [name, file, ref name, how the ref reaches SheetPull]
const SCROLLVIEW_SHEETS = [
  ['NotificationPrefsModal', 'components/NotificationPrefsModal.tsx', 'scrollRef', 'sheet'],
  ['FeedbackModal', 'components/FeedbackModal.tsx', 'scrollRef', 'sheet'],
  ['AchievementsModal', 'components/AchievementsModal.tsx', 'scrollRef', 'sheet'],
  ['ChangelogModal', 'components/ChangelogModal.tsx', 'scrollRef', 'sheet'],
  ['StatusHistoryModal', 'components/StatusHistoryModal.tsx', 'scrollRef', 'sheet'],
  ['ReportContentModal', 'components/ReportContentModal.tsx', 'scrollRef', 'sheet'],
  ['ReportFlagModal', 'screens/ReportFlagModal.tsx', 'scrollRef', 'raw'],
  ['FlagDetailModal', 'components/FlagDetailModal.tsx', 'bodyScrollRef', 'raw'],
] as const;

describe('FIX4B — ScrollView-based sheets import RNGH ScrollView, not react-native\'s', () => {
  it.each(SCROLLVIEW_SHEETS)('%s imports ScrollView from react-native-gesture-handler', (_n, rel) => {
    const src = read(rel);
    expect(src).toMatch(/import\s*\{\s*ScrollView\s*\}\s*from\s*'react-native-gesture-handler'/);
  });

  it.each(SCROLLVIEW_SHEETS)('%s does not shadow it with a react-native ScrollView', (_n, rel) => {
    // A duplicate/shadowing import from 'react-native' would silently win and
    // reintroduce the exact bug this pins — matches every named import block,
    // since a file can wrap its react-native import across several statements.
    const src = read(rel);
    const rnImports = [...src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'react-native';/g)];
    expect(rnImports.length).toBeGreaterThan(0);
    for (const m of rnImports) {
      expect(m[1]).not.toMatch(/\bScrollView\b/);
    }
  });

  it.each(SCROLLVIEW_SHEETS)('%s still wires that ScrollView into SheetPull as simultaneousHandlers', (_n, rel, refName, wiring) => {
    const src = read(rel);
    // The import alone is inert without the wiring — pin both halves so a
    // future edit can't quietly drop one. `sheet`-wiring goes through
    // Sheet.tsx's `scrollRef` prop (which itself forwards to SheetPull's
    // `simultaneousHandlers`, see Sheet.tsx); `raw`-wiring passes
    // `simultaneousHandlers` directly to <SheetPull>.
    if (wiring === 'sheet') {
      expect(src).toMatch(new RegExp(`scrollRef=\\{${refName}\\}`));
    } else {
      expect(src).toMatch(new RegExp(`simultaneousHandlers=\\{${refName}\\}`));
    }
    expect(src).toMatch(new RegExp(`<ScrollView[^>]*\\bref=\\{${refName}\\}`, 's'));
  });
});
