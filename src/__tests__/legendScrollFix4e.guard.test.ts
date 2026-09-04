/**
 * UI polish FIX4E (2026-08-30) — the expanded Legend still didn't scroll at
 * accessibility-XXXL, even after FIX4's RNGH-ScrollView-import repair.
 *
 * ─── WHAT WAS WRONG, AND WHY legendScrollFix4.guard.test.ts DIDN'T CATCH IT ──
 * FIX4 pinned the correct half of the fix: LegendModal imports `ScrollView`
 * from `react-native-gesture-handler` and wires it into SheetPull's
 * `simultaneousHandlers`. That ref genuinely resolves on device (confirmed via
 * live instrumentation: `scrollRef.current.handlerTag` is a real number).
 *
 * The remaining bug was one layer up: `cardShell` — the tap-swallow node
 * directly inside SheetPull, ancestoring the whole card including the
 * ScrollView — was a `Pressable`, not a `View`. A `Pressable` claims React
 * Native's classic responder system on touch-start (to track press state)
 * even with a no-op `onPress`, and that responder claim sits in the touch
 * tree between SheetPull's PanGestureHandler above and the RNGH ScrollView
 * below. Confirmed live at XXXL: with `cardShell` as a Pressable,
 * SheetPull's handler correctly ran BEGAN→FAILED (yielding the gesture, as
 * `activeOffsetY` intends) yet the ScrollView's `onScroll` fired ZERO times
 * across repeated real upward drags against content ~9x taller than the
 * viewport. Swapping it for a plain `View` (matching Sheet.tsx's own
 * `cardShadow` wrapper, used by every other SheetPull adopter) fixed it:
 * the same drag produced a smooth, momentum-decelerated scroll from offset 0
 * to the full content height.
 *
 * A source scan can't run a gesture. What it CAN pin, permanently, is the
 * one-line cause: which host component wraps the card inside SheetPull.
 * Regressing it back to `Pressable` reintroduces the exact bug this fixes.
 *
 * House idiom: static source scan (cf. legendScrollFix4.guard.test.ts).
 * Real-device scroll proof stays mandatory for any future change here; this
 * test cannot substitute for it.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

describe('FIX4E — expanded Legend: the SheetPull→ScrollView ancestor stays a View', () => {
  const legend = read('screens/LegendModal.tsx');

  // The cardShell tag, opening-brace to opening-brace: from whatever host
  // component carries the `cardShell` style through the end of its own
  // opening tag (the next bare `>` before the following JSX element).
  // FIX4F moved cardShell's inline marginTop off onto SheetPull's own style
  // (see the FIX4F describe block below), which turned this from an array
  // style (`style={[styles.cardShell, {…}]}`) into a bare reference
  // (`style={styles.cardShell}`) — the pattern accepts either shape so this
  // anchor survives that change and any future one like it.
  const cardShellTag = /<(\w+)\s*\n?\s*style={(?:\[)?styles\.cardShell(?:,[\s\S]*?\])?}[\s\S]*?\n\s*>/.exec(legend);

  it('finds the cardShell node at all (a broken anchor would make every check below vacuous)', () => {
    expect(cardShellTag).not.toBeNull();
  });

  it('is a plain View, not Pressable/Touchable', () => {
    // The bug this pins: Pressable (or any Touchable) claims RN's classic
    // responder system on touch-start even with a no-op onPress. Interposed
    // between SheetPull's PanGestureHandler and the RNGH ScrollView, that
    // responder claim starves the ScrollView's own native pan of the touch
    // stream it needs to activate — an upward drag moves nothing, and
    // SheetPull's own handler still correctly yields (BEGAN→FAILED), so the
    // gesture is simply lost.
    const tagName = (cardShellTag as RegExpExecArray)?.[1];
    expect(tagName).toBe('View');
    expect(tagName).not.toMatch(/Pressable|Touchable/);
  });

  it('keeps its VoiceOver containment contract (A11Y-214 / SR-072)', () => {
    // Opting cardShell out of the accessibility tree is a SEPARATE, older fix
    // (a Pressable — or a View — is accessible-by-default here would merge
    // every row and the in-card Close button into one unnamed VoiceOver
    // node). Changing the host component must not silently drop it.
    const tag = (cardShellTag as RegExpExecArray)?.[0] ?? '';
    expect(tag).toContain('accessible={false}');
    expect(tag).toContain('accessibilityViewIsModal');
    expect(tag).toContain('onAccessibilityEscape={onClose}');
  });

  it('never reintroduces a Pressable at the cardShell style site', () => {
    // Belt-and-braces against a partial revert: even if a future edit renamed
    // the captured group's anchor, this fails loudly on the exact regression
    // shape (a Pressable carrying the cardShell style, array or bare).
    expect(legend).not.toMatch(/<Pressable\s*\n?\s*style={(?:\[)?styles\.cardShell/);
  });
});

/**
 * UI polish FIX4F (2026-08-30) — the expanded Legend scrolled correctly
 * (FIX4E) but the grabber's at-top pull-to-dismiss did not commit, even for
 * a full-length human drag.
 *
 * ─── WHAT WAS WRONG ────────────────────────────────────────────────────────
 * SheetPull measures `cardHeight.current` from the node it wraps directly —
 * the Animated.View carrying `pullExpanded` — and uses it to compute the
 * dismiss-distance gate: `max(COMMIT_FLOOR_PT, cardHeight * COMMIT_FRACTION)`.
 * `cardShell`'s own `marginTop: insets.top + spacing.sm` used to live INSIDE
 * that measured node (as an inline style on cardShell, cardShell's parent
 * being the very node SheetPull measures), so the measured height included a
 * band of empty margin the visible card doesn't occupy. Confirmed live: the
 * measured wrap was 874px against the card's own true 804px (the exact
 * 70px = insets.top + spacing.sm gap) — inflating an already-large "expanded"
 * sheet's gate from a truthful 241.2px to 262.2px.
 *
 * Fix: move the SAME marginTop from cardShell's style onto SheetPull's own
 * `style` prop instead. Same visual position either way (the margin still
 * sits between the backdrop's top edge and the card's top edge — only which
 * side of the flex boundary it's on changes), but now the node SheetPull
 * measures ends exactly where the visible card ends. Confirmed live: wrap
 * and cardShell both measure 804px, and a real drag now commits
 * (translationY=672 > distanceGate=241.2 → commit() → onDismiss fires →
 * Legend closes) — a class of failure that never fires in the guard test
 * because it needs a live PanGestureHandler.
 *
 * A source scan can't run a gesture. What it CAN pin, permanently, is the
 * one-line cause: which of these two sibling nodes carries the margin.
 * Moving it back onto cardShell reintroduces the exact bug this fixes.
 */
describe('FIX4F — expanded Legend: SheetPull measures the true visible card height', () => {
  const legend = read('screens/LegendModal.tsx');

  // The <SheetPull …> opening tag, so its own `style` prop can be inspected.
  // Require whitespace after the component name so the generic
  // `useRef<SheetPullHandle>` declaration cannot become the source anchor.
  const sheetPullTag = /<SheetPull\s[\s\S]*?\n\s*>/.exec(legend);

  it('finds the SheetPull node at all (a broken anchor would make the checks below vacuous)', () => {
    expect(sheetPullTag).not.toBeNull();
  });

  it('SheetPull itself carries the top margin (the node it measures for its dismiss gate)', () => {
    // A flat object, not a style array: SheetPull's own `style` prop is typed
    // as plain `ViewStyle`, not `StyleProp<ViewStyle>` (confirmed by
    // `npm run typecheck` — an array here does not compile).
    const tag = (sheetPullTag as RegExpExecArray)?.[0] ?? '';
    expect(tag).toMatch(/style={{\s*\.\.\.styles\.pullExpanded,\s*marginTop:\s*insets\.top \+ spacing\.sm\s*}}/);
  });

  it('cardShell no longer carries its own marginTop — the phantom-height regression shape', () => {
    // The bug this pins: an inline marginTop back on cardShell would once
    // again push the visible card's top edge down WITHOUT shrinking the node
    // SheetPull measures, reopening the exact 70px (insets.top + spacing.sm)
    // gap between cardHeight.current and the card's own true height.
    expect(legend).not.toMatch(/style={\[styles\.cardShell,\s*{\s*marginTop:/);
    expect(legend).not.toMatch(/style={styles\.cardShell}[\s\S]{0,5}marginTop/);
  });
});
