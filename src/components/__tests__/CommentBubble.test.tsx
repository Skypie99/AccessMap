/**
 * CommentBubble — THE COMPOSITE-LABEL LAW, re-derived for a second action.
 *
 * WHY THIS SUITE EXISTS. The most fragile line in this component is not visual:
 *
 *     const useCompositeLabel = !onDelete;
 *
 * `accessible={true}` on the bubble row collapses every descendant into ONE
 * VoiceOver node — a child Pressable inside a composite row cannot be reached
 * or activated AT ALL. That line was correct only while delete was the only
 * action, and the whole B-1 work item is a SECOND action. Get it wrong and the
 * Apple 1.2(b) report control is invisible to exactly the users the App Store
 * accessibility requirements exist for, while looking perfectly fine on screen
 * and passing every render test that only asks "did it draw?".
 *
 * So this file asserts the LAW, not the pixels:
 *   · composite ⇔ no child Pressable is rendered (both directions);
 *   · the non-composite text label branches on `isOwn`, never on which action
 *     is present — Report ships on OTHER people's comments, where "Your
 *     comment" would be a lie told only to screen-reader users;
 *   · an own bubble is byte-identical to what it rendered before Report
 *     existed, proven by a structural diff rather than by assertion;
 *   · an ORPHANED comment (SR-117: `user_id` is nullable live) is reportable
 *     and NOT deletable — the outcome the `===` in FlagDetailModal produces.
 *
 * NOTE ON THE ORPHAN CASE. CommentBubble takes `isOwn`, not a user id; the
 * ownership predicate lives at the call site. `gateAt` below reproduces that
 * call site exactly, so this suite tests the pair (predicate → props) that
 * actually ships. src/lib/__tests__/commentAuthor.test.ts pins the predicate
 * itself and source-scans FlagDetailModal for it; this is the render half.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { CommentBubble } from '../CommentBubble';
import { blockAuthorA11yLabel, hideCommentA11yLabel, reportCommentA11yLabel } from '@/lib/copy';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

const AUTHOR = 'Alice';
const TEXT = 'The ramp is blocked again.';

// 5m30s ago → relativeTime() floors to "5m ago" and stays there for a ±29s
// drift, so the expected label is deterministic without faking timers (fake
// timers and RNTL's async act() do not mix comfortably).
const CREATED_AT = new Date(Date.now() - 5 * 60_000 - 30_000);
const TIME_LABEL = '5m ago';

const OTHER_LABEL = `Comment by ${AUTHOR}: ${TEXT}, ${TIME_LABEL}`;
const OWN_LABEL = `Your comment: ${TEXT}. ${TIME_LABEL}`;
const REPORT_NAME = reportCommentA11yLabel(AUTHOR);
const HIDE_NAME = hideCommentA11yLabel(AUTHOR);
const DELETE_NAME = `Delete ${AUTHOR}'s comment`;
const BLOCK_NAME = blockAuthorA11yLabel(AUTHOR);

/**
 * The props of the node whose ONLY child is `needle`.
 *
 * The timestamp is hidden from the accessibility tree, so RNTL's text queries
 * cannot see it — and the timestamp's layout is exactly what the
 * `showReport` → `showFooter` rename protects. Reaching it through the rendered
 * JSON is the only way to assert on a node that is deliberately unreachable to
 * the queries.
 */
function propsOfTextNode(node: unknown, needle: string): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = propsOfTextNode(child, needle);
      if (hit) return hit;
    }
    return null;
  }
  if (node === null || typeof node !== 'object') return null;
  const n = node as { props?: Record<string, unknown>; children?: unknown[] | null };
  if (n.children?.length === 1 && n.children[0] === needle) return n.props ?? {};
  return propsOfTextNode(n.children ?? [], needle);
}

/** RN style props arrive as nested arrays with `false` holes; flatten to one object. */
function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  if (style && typeof style === 'object') return style as Record<string, unknown>;
  return {};
}

/** Props of the single root node CommentBubble renders (the bubble row). */
function rootProps(tree: ReturnType<typeof render>): Record<string, unknown> {
  const json = tree.toJSON();
  if (!json || Array.isArray(json)) {
    throw new Error('CommentBubble must render exactly one root node');
  }
  return json.props as Record<string, unknown>;
}

/**
 * The rendered tree with every function-valued prop stripped.
 *
 * Pressability mints fresh handler identities on every render, so a raw
 * `toJSON()` comparison of two renders can never be equal even when nothing
 * about the output changed. Everything a user or a screen reader can perceive
 * — element types, resolved styles, a11y props, text children — survives the
 * strip, which is exactly the surface the "own bubbles are unchanged" claim is
 * about.
 */
function structure(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(structure);
  if (node === null || typeof node !== 'object') return node;
  const n = node as { type: string; props?: Record<string, unknown>; children?: unknown[] | null };
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(n.props ?? {})) {
    if (typeof value === 'function') continue;
    props[key] = value;
  }
  return {
    type: n.type,
    props,
    children: n.children ? n.children.map(structure) : n.children,
  };
}

/**
 * FlagDetailModal's gating, reproduced verbatim: ONE strict comparison decides
 * both affordances, so a row can never offer Delete and Report at once.
 */
function gateAt(commentUserId: string | null, viewerId: string | undefined) {
  const isOwn = commentUserId === viewerId;
  return {
    isOwn,
    onDelete: isOwn ? jest.fn() : undefined,
    onReport: isOwn ? undefined : jest.fn(),
    onHide: isOwn ? undefined : jest.fn(),
    // 1.2(c) Block, gated on TWO conditions rather than one — verbatim from
    // FlagDetailModal. A null author is nobody to block, so the control is
    // withheld rather than drawn inert. This is the only affordance on the row
    // whose gate is not simply `isOwn`.
    onBlock: !isOwn && commentUserId ? jest.fn() : undefined,
  };
}

describe('CommentBubble — the Report control on other people’s comments', () => {
  it('renders a Report button that a screen reader can reach and press', () => {
    const onReport = jest.fn();
    const tree = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={false}
        onReport={onReport}
      />,
    );

    // Author-qualified name: a thread renders many buttons whose visible text
    // is the same word, and "Report" alone would be ambiguous in the rotor.
    const button = tree.getByRole('button', { name: REPORT_NAME });
    fireEvent.press(button);
    expect(onReport).toHaveBeenCalledTimes(1);

    // The fence: a hint here would have to promise a moderation outcome.
    expect(button.props.accessibilityHint).toBeUndefined();
  });

  it('drops the composite row node, or the button would be unreachable', () => {
    const tree = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={false}
        onReport={jest.fn()}
      />,
    );

    const props = rootProps(tree);
    expect(props.accessible).toBe(false);
    expect(props.accessibilityLabel).toBeUndefined();
    expect(props.accessibilityRole).toBeUndefined();
  });

  it('gives the text node the NON-own label — never "Your comment"', () => {
    const tree = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={false}
        onReport={jest.fn()}
      />,
    );

    // Asserted ON THE TEXT NODE, found by its rendered content — not merely
    // "this string exists somewhere in the tree". The composite row would
    // carry the very same sentence, so a bare getByLabelText(OTHER_LABEL)
    // passes even when the row has wrongly stayed composite and the button is
    // unreachable. Querying the node first is what makes this test bite.
    expect(tree.getByText(TEXT).props.accessibilityLabel).toBe(OTHER_LABEL);
    expect(tree.getByText(TEXT).props.accessible).toBe(true);
    expect(tree.queryByLabelText(OWN_LABEL)).toBeNull();
    expect(tree.queryByLabelText(/Your comment/)).toBeNull();

    // And it is spoken once: the byline is folded into that sentence rather
    // than left as a bare orphan node ahead of it. queryByText honours
    // accessibilityElementsHidden, so this is null only because the byline is
    // really hidden from the a11y tree here.
    expect(tree.queryByText(AUTHOR)).toBeNull();
  });

  it('stays a single composite node when no action is wired', () => {
    const tree = render(
      <CommentBubble author={AUTHOR} text={TEXT} createdAt={CREATED_AT} isOwn={false} />,
    );

    const props = rootProps(tree);
    expect(props.accessible).toBe(true);
    expect(props.accessibilityRole).toBe('text');
    expect(props.accessibilityLabel).toBe(OTHER_LABEL);

    // No Pressable at all — which is the only reason the composite node above
    // is legal.
    expect(tree.queryByRole('button')).toBeNull();
    expect(tree.queryByLabelText(REPORT_NAME)).toBeNull();

    // The byline is NOT hidden here — the row absorbs it. The hiding above is
    // conditional on the non-composite path, not a blanket suppression.
    expect(tree.getByText(AUTHOR)).toBeTruthy();
    // The text node stays silent so the row's one sentence is the only read.
    expect(tree.getByText(TEXT).props.accessible).toBe(false);
    expect(tree.getByText(TEXT).props.accessibilityLabel).toBeUndefined();
  });
});

describe('CommentBubble — the Hide control (Apple 1.2(c))', () => {
  it('renders a Hide button that a screen reader can reach and press', () => {
    const onHide = jest.fn();
    const tree = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={false}
        onHide={onHide}
      />,
    );

    const button = tree.getByRole('button', { name: HIDE_NAME });
    fireEvent.press(button);
    expect(onHide).toHaveBeenCalledTimes(1);

    // Same fence as Report: every useful hint here ("this removes it", "it
    // won't come back") is either a moderation promise or a claim about other
    // people's screens that a device-local filter cannot make.
    expect(button.props.accessibilityHint).toBeUndefined();
  });

  it('drops the composite row node when Hide is the ONLY action wired', () => {
    // The third action has to extend the composite-label law, not ride on
    // Report's coat-tails. A Hide-only bubble left composite would draw a
    // perfect button that VoiceOver cannot reach — the same silent 4.1.2
    // defect, one action later.
    const tree = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={false}
        onHide={jest.fn()}
      />,
    );

    const props = rootProps(tree);
    expect(props.accessible).toBe(false);
    expect(props.accessibilityLabel).toBeUndefined();
    expect(props.accessibilityRole).toBeUndefined();

    // And the text node picks up its own non-own sentence, as it does for Report.
    expect(tree.getByText(TEXT).props.accessibilityLabel).toBe(OTHER_LABEL);
    expect(tree.queryByLabelText(/Your comment/)).toBeNull();
  });

  it('keeps the timestamp inside the footer when Hide is the only action', () => {
    // The layout branch is keyed on the FOOTER, not on Report. Spelled
    // `showReport` (as it was when Report was alone down there) the timestamp
    // keeps `alignSelf: 'flex-end'`, which inside a row means BOTTOM — it would
    // drop below the Hide label on every Hide-only bubble.
    const withHide = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={false}
        onHide={jest.fn()}
      />,
    );
    const inFooter = flattenStyle(propsOfTextNode(withHide.toJSON(), TIME_LABEL)?.style);
    expect(inFooter.alignSelf).toBe('center');

    // ...and an actionless bubble still pins the timestamp to the bubble's
    // right edge, so the footer style is conditional, not blanket.
    const plain = render(
      <CommentBubble author={AUTHOR} text={TEXT} createdAt={CREATED_AT} isOwn={false} />,
    );
    expect(flattenStyle(propsOfTextNode(plain.toJSON(), TIME_LABEL)?.style).alignSelf).toBe(
      'flex-end',
    );
  });

  it('offers Report and Hide as two separately-named buttons on the same row', () => {
    const onReport = jest.fn();
    const onHide = jest.fn();
    const tree = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={false}
        onReport={onReport}
        onHide={onHide}
      />,
    );

    // §SKY-3c: the controls are DISTINCT and must not collapse. Two buttons,
    // two names, and pressing one must never fire the other.
    expect(tree.getAllByRole('button')).toHaveLength(2);
    fireEvent.press(tree.getByRole('button', { name: REPORT_NAME }));
    expect(onReport).toHaveBeenCalledTimes(1);
    expect(onHide).not.toHaveBeenCalled();

    fireEvent.press(tree.getByRole('button', { name: HIDE_NAME }));
    expect(onHide).toHaveBeenCalledTimes(1);
    expect(onReport).toHaveBeenCalledTimes(1);

    expect(REPORT_NAME).not.toBe(HIDE_NAME);
  });
});

describe('CommentBubble — an own bubble is unchanged', () => {
  it('keeps the delete contract exactly as it shipped', () => {
    const tree = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn
        onDelete={jest.fn()}
      />,
    );

    const props = rootProps(tree);
    expect(props.accessible).toBe(false);
    expect(props.accessibilityLabel).toBeUndefined();

    const del = tree.getByRole('button', { name: DELETE_NAME });
    // Delete IS allowed a hint — it promises nothing about moderation, only
    // about permanence, which is a fact about the user's own action.
    expect(del.props.accessibilityHint).toBe('Permanently removes your comment');

    expect(tree.getByLabelText(OWN_LABEL)).toBeTruthy();
    expect(tree.queryByLabelText(REPORT_NAME)).toBeNull();
  });

  it('refuses Report on your own comment even when one is wired', () => {
    const onDelete = jest.fn();
    const base = (
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn
        onDelete={onDelete}
      />
    );
    const withReport = (
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn
        onDelete={onDelete}
        onReport={jest.fn()}
      />
    );

    // The byte-identity claim, checked rather than asserted: handing an own
    // bubble an onReport must change NOTHING it renders. Reporting yourself is
    // not a thing, and Delete is already your affordance on that row.
    expect(structure(render(withReport).toJSON())).toEqual(
      structure(render(base).toJSON()),
    );
    expect(render(withReport).queryByLabelText(REPORT_NAME)).toBeNull();
  });

  it('refuses Hide on your own comment even when one is wired', () => {
    const onDelete = jest.fn();
    const base = (
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn
        onDelete={onDelete}
      />
    );
    // Both moderation props at once — the shape the real call site would take
    // if its `isOwn` gate were ever loosened.
    const withBoth = (
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn
        onDelete={onDelete}
        onReport={jest.fn()}
        onHide={jest.fn()}
      />
    );

    // Hiding your own comment from yourself is not a want anyone has, and the
    // 1.2(c) requirement is about somebody ELSE's content. The own bubble must
    // still render exactly what it rendered before either control existed —
    // including no footer row, so the timestamp keeps its old position.
    expect(structure(render(withBoth).toJSON())).toEqual(structure(render(base).toJSON()));

    const tree = render(withBoth);
    expect(tree.queryByLabelText(HIDE_NAME)).toBeNull();
    expect(tree.queryByLabelText(REPORT_NAME)).toBeNull();
    expect(tree.getAllByRole('button')).toHaveLength(1); // Delete, and only Delete
  });
});

describe('CommentBubble — SR-117: a comment can outlive its author', () => {
  it('an orphaned comment read by a guest is reportable, not deletable', () => {
    // null author, undefined viewer. With `==` this pair claims ownership and
    // hands a guest the Delete button on every orphaned row; with `===` it is
    // someone else's comment, which is both true and the useful outcome — a
    // comment whose author deleted their account is still reportable.
    const gate = gateAt(null, undefined);
    expect(gate.isOwn).toBe(false);

    const tree = render(
      <CommentBubble
        author="Anonymous"
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={gate.isOwn}
        onDelete={gate.onDelete}
        onReport={gate.onReport}
        onHide={gate.onHide}
      />,
    );

    // The names use the SAME anonymous fallback the row displays, so neither
    // button claims a name the bubble does not show.
    const button = tree.getByRole('button', { name: reportCommentA11yLabel('Anonymous') });
    fireEvent.press(button);
    expect(gate.onReport).toHaveBeenCalledTimes(1);

    // An orphan is hideable for the same reason it is reportable: a comment
    // outliving its author is still somebody else's comment.
    fireEvent.press(tree.getByRole('button', { name: hideCommentA11yLabel('Anonymous') }));
    expect(gate.onHide).toHaveBeenCalledTimes(1);

    expect(tree.queryByLabelText("Delete Anonymous's comment")).toBeNull();
    expect(tree.queryByLabelText(/^Delete /)).toBeNull();
  });

  it('the same gate still gives me Delete and withholds Report on my own row', () => {
    const ME = '11111111-1111-1111-1111-111111111111';
    const gate = gateAt(ME, ME);
    expect(gate.isOwn).toBe(true);

    const tree = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={gate.isOwn}
        onDelete={gate.onDelete}
        onReport={gate.onReport}
        onHide={gate.onHide}
      />,
    );

    expect(tree.getByRole('button', { name: DELETE_NAME })).toBeTruthy();
    expect(tree.queryByLabelText(REPORT_NAME)).toBeNull();
    expect(tree.queryByLabelText(HIDE_NAME)).toBeNull();
  });
});

describe('CommentBubble — content robustness (the two still-true wave6 rows, implemented)', () => {
  it('a very long comment from a very long author name survives into the composite label untruncated', () => {
    const longAuthor = 'Anastasia-Wilhelmina Featherstonehaugh-Cholmondeley the Third of Llanfairpwllgwyngyll';
    const longText = 'The accessible entrance on the north side is blocked again. '.repeat(40).trim();

    const tree = render(
      <CommentBubble author={longAuthor} text={longText} createdAt={CREATED_AT} isOwn={false} />,
    );

    // Composite row (no actions wired) — the one VoiceOver node must carry the
    // FULL text: silent truncation here would clip what a screen reader hears.
    const label = String(rootProps(tree).accessibilityLabel);
    expect(label).toContain(longAuthor);
    expect(label).toContain(longText);
  });

  it('a comment from the far past still renders with a composite label (relativeTime does not choke)', () => {
    const ancient = new Date('2020-01-01T00:00:00Z');

    const tree = render(
      <CommentBubble author={AUTHOR} text={TEXT} createdAt={ancient} isOwn={false} />,
    );

    expect(String(rootProps(tree).accessibilityLabel)).toMatch(new RegExp(`^Comment by ${AUTHOR}: `));
  });
});

/**
 * APPLE 1.2(c) — THE BLOCK CONTROL.
 *
 * The audit finding this closes was not "no block button": it was that the app
 * had no way to stop seeing a PERSON, only individual items. So the assertions
 * that matter are (a) the control is reachable — the composite-label law now
 * has a fourth action to stay in sync with — and (b) it is withheld precisely
 * where there is nobody to block.
 */
describe('CommentBubble — the Block control (Apple 1.2(c))', () => {
  const ME = '11111111-1111-1111-1111-111111111111';

  it('renders a Block button a screen reader can reach and press', () => {
    const onBlock = jest.fn();
    const tree = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={false}
        onBlock={onBlock}
      />,
    );

    const btn = tree.getByLabelText(BLOCK_NAME);
    fireEvent.press(btn);
    expect(onBlock).toHaveBeenCalledTimes(1);
  });

  /**
   * THE COMPOSITE-LABEL LAW, fourth action. A row that renders a Pressable must
   * NOT be composite, or VoiceOver collapses the whole bubble into one node and
   * the Block button becomes unreachable while looking perfect on screen. This
   * is the failure mode the suite header describes, one action later.
   */
  it('a Block-only bubble is NOT composite, so the button stays reachable', () => {
    const tree = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={false}
        onBlock={jest.fn()}
      />,
    );

    expect(rootProps(tree).accessible).not.toBe(true);
    // Non-composite does not mean the sentence is lost — it MOVES to the text
    // node, exactly as the Report suite asserts at the same seam. What matters
    // is that the row is no longer one collapsed node, so the button below is
    // its own reachable element.
    expect(tree.getByText(TEXT).props.accessibilityLabel).toBe(OTHER_LABEL);
    expect(tree.getByLabelText(BLOCK_NAME)).toBeTruthy();
  });

  it('the accessible name says the PERSON, distinguishing it from Hide on the same row', () => {
    const tree = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={false}
        onHide={jest.fn()}
        onBlock={jest.fn()}
      />,
    );

    expect(tree.getByLabelText(HIDE_NAME)).toBeTruthy();
    expect(tree.getByLabelText(BLOCK_NAME)).toBeTruthy();
    expect(BLOCK_NAME).not.toBe(HIDE_NAME);
  });

  it('the timestamp still renders when Block is the only footer action', () => {
    const tree = render(
      <CommentBubble
        author={AUTHOR}
        text={TEXT}
        createdAt={CREATED_AT}
        isOwn={false}
        onBlock={jest.fn()}
      />,
    );

    // showFooter must include showBlock — spelling it `showReport || showHide`
    // would drop the timestamp under a Block-only bubble.
    expect(propsOfTextNode(tree.toJSON(), TIME_LABEL)).not.toBeNull();
  });

  it('never offers Block on your own comment', () => {
    const gate = gateAt(ME, ME);
    expect(gate.onBlock).toBeUndefined();

    const tree = render(
      <CommentBubble author={AUTHOR} text={TEXT} createdAt={CREATED_AT} {...gate} />,
    );
    expect(tree.queryByLabelText(BLOCK_NAME)).toBeNull();
  });

  /**
   * SR-117: `flag_comments.user_id` is nullable live (ON DELETE SET NULL), so a
   * comment whose author deleted their account has no owner. Report stays —
   * the CONTENT is still reportable — but Block is withheld, because there is
   * no account for it to act on. A drawn-but-inert Block button would be a
   * promise the app cannot keep.
   */
  it('withholds Block on an ORPHANED comment, while Report survives', () => {
    const gate = gateAt(null, undefined);
    expect(gate.onBlock).toBeUndefined();
    expect(gate.onReport).toBeDefined();

    const tree = render(
      <CommentBubble author={AUTHOR} text={TEXT} createdAt={CREATED_AT} {...gate} />,
    );
    expect(tree.queryByLabelText(BLOCK_NAME)).toBeNull();
    expect(tree.getByLabelText(REPORT_NAME)).toBeTruthy();
  });
});
