/**
 * UI polish FIX4 (2026-08-29) — the expanded Legend didn't scroll on real iOS.
 *
 * ─── WHAT WAS WRONG, AND WHY vp1Fix3.guard.test.ts DIDN'T CATCH IT ────────
 * The previous guard pins that `cardShell` has `flexGrow: 1` (a real,
 * bounded scroll container, not a flat 85%) — that part of the geometry was
 * always correct. What broke scrolling was one layer up: `SheetPull`'s
 * `PanGestureHandler` takes `simultaneousHandlers={scrollRef}` so the
 * pull-to-dismiss gesture and the body scroll can recognize the same touch
 * together. react-native-gesture-handler resolves that ref via
 * `ref.current.handlerTag` (utils.ts `transformIntoHandlerTags`) — a field
 * only a `createNativeWrapper`-wrapped component sets on its ref.
 * LegendModal imported `ScrollView` from `'react-native'`, whose ref has no
 * `.handlerTag`, so on native the "recognize simultaneously" relationship
 * silently resolved to an empty array. SheetPull's handler stayed the sole
 * recognizer for the gesture; the ScrollView's own native pan never
 * activated. A synthetic swipe (or a real finger) registered as delivered,
 * and no pixel moved — CONFIRMED against real iOS (see the FIX4 report).
 *
 * A source scan can't run a gesture. What it CAN pin, permanently, is the
 * one-line cause: which package `ScrollView` comes from. Regressing the
 * import back to `'react-native'` reintroduces the exact bug this fixes.
 *
 * House idiom: static source scan (cf. vp1Fix3.guard.test.ts) — fast, no
 * mount, fails the moment it breaks. Real-device scroll proof stays mandatory
 * for any future change here; this test cannot substitute for it.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

describe('FIX4 — expanded Legend: the body ScrollView actually scrolls on device', () => {
  const legend = read('screens/LegendModal.tsx');

  it('imports ScrollView from react-native-gesture-handler, not react-native', () => {
    // The bug this pins: a plain react-native ScrollView ref has no
    // `.handlerTag`, so SheetPull's `simultaneousHandlers={scrollRef}`
    // silently resolves to nothing on native and the pull handler blocks the
    // scroll gesture from ever activating.
    expect(legend).toMatch(/import\s*\{\s*ScrollView\s*\}\s*from\s*'react-native-gesture-handler'/);
    // The react-native import must NOT also bring in ScrollView from there —
    // a duplicate/shadowing import would silently win and reintroduce the bug.
    const rnImport = legend.match(/import\s*\{([^}]*)\}\s*from\s*'react-native';/);
    expect(rnImport).not.toBeNull();
    const rnNamedImports = (rnImport as RegExpMatchArray)[1];
    expect(rnNamedImports).not.toMatch(/\bScrollView\b/);
  });

  it('still wires the body scroll ref into SheetPull as simultaneousHandlers', () => {
    // The import alone is inert without this wiring — pin both halves of the
    // fix so a future edit can't quietly drop one.
    expect(legend).toContain('simultaneousHandlers={scrollRef}');
    expect(legend).toMatch(/<ScrollView[^>]*\bref=\{scrollRef\}/);
  });

  it('keeps the real, bounded scroll container this fix depends on', () => {
    // Redundant with vp1Fix3.guard.test.ts, kept local so this file stands on
    // its own: a `simultaneousHandlers` fix is meaningless without a genuine
    // overflow container to hand the gesture off to.
    expect(legend).toMatch(/scroll:\s*\{[^}]*flexGrow:\s*1/);
    expect(legend).toMatch(/scroll:\s*\{[^}]*flexShrink:\s*1/);
  });
});
