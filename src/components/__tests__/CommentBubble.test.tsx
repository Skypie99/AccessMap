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
import { reportCommentA11yLabel } from '@/lib/copy';

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
const DELETE_NAME = `Delete ${AUTHOR}'s comment`;

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
      />,
    );

    // The name uses the SAME anonymous fallback the row displays, so the
    // button never claims a name the bubble does not show.
    const button = tree.getByRole('button', { name: reportCommentA11yLabel('Anonymous') });
    fireEvent.press(button);
    expect(gate.onReport).toHaveBeenCalledTimes(1);

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
      />,
    );

    expect(tree.getByRole('button', { name: DELETE_NAME })).toBeTruthy();
    expect(tree.queryByLabelText(REPORT_NAME)).toBeNull();
  });
});
