/**
 * HIGH-2 — `buildHiddenCommentItems`, tested directly.
 *
 * This is the function that decides what a row CLAIMS about a comment it could
 * not show, and that claim is the whole reason the Unhide surface is honest or
 * not. The three states are not cosmetic:
 *
 *   missing   we asked the server and it did not have this comment
 *   unloaded  we never got to ask
 *
 * Collapsing the second into the first tells a user on a train that a comment
 * was deleted. These tests exist to keep them apart.
 */
import { buildHiddenCommentItems } from '../HiddenCommentsModal';
import type { CommentRow } from '@/types/database';

const row = (id: string, over: Partial<CommentRow> = {}): CommentRow => ({
  id,
  flag_id: 'f1',
  user_id: 'u1',
  content: `text of ${id}`,
  created_at: '2026-01-01T00:00:00Z',
  display_name: 'Jordan M',
  ...over,
});

describe('buildHiddenCommentItems — the three row states', () => {
  it('an id whose row came back is loaded, with the real author and text', () => {
    const [item] = buildHiddenCommentItems(['c1'], [row('c1')], false);
    expect(item).toEqual({
      id: 'c1',
      state: 'loaded',
      author: 'Jordan M',
      createdAt: '2026-01-01T00:00:00Z',
      content: 'text of c1',
    });
  });

  it('an id absent from a SUCCESSFUL fetch is missing', () => {
    const [item] = buildHiddenCommentItems(['c1'], [], false);
    expect(item).toEqual({ id: 'c1', state: 'missing' });
  });

  it('an id absent because the fetch FAILED is unloaded, never missing', () => {
    // The load-bearing distinction. `missing` renders "no longer available",
    // which is a claim about the comment; `unloaded` renders a claim about the
    // request. Reporting a dropped connection as a deletion is the one lie this
    // screen must not tell.
    const [item] = buildHiddenCommentItems(['c1'], [], true);
    expect(item).toEqual({ id: 'c1', state: 'unloaded' });
  });

  it('a failed fetch does not downgrade rows that did come back', () => {
    // Defensive: if a caller ever reports partial success, loaded still wins.
    const items = buildHiddenCommentItems(['c1', 'c2'], [row('c2')], true);
    expect(items.map((i) => i.state)).toEqual(['loaded', 'unloaded']);
  });

  it('a comment whose author account is gone renders the Anonymous fallback', () => {
    // Byte-identical to FlagDetailModal's `c.display_name ?? 'Anonymous'`, so
    // the row and the bubble never disagree about who wrote something.
    const [item] = buildHiddenCommentItems(['c1'], [row('c1', { display_name: null })], false);
    expect(item).toMatchObject({ state: 'loaded', author: 'Anonymous' });
  });
});

describe('buildHiddenCommentItems — ordering', () => {
  it('is most-recently-hidden first, i.e. the reverse of storage order', () => {
    // hideContent appends, so the last id in storage is the newest hide — and
    // the one a user who just mis-tapped is looking for.
    const items = buildHiddenCommentItems(['old', 'mid', 'new'], [], false);
    expect(items.map((i) => i.id)).toEqual(['new', 'mid', 'old']);
  });

  it('does not reorder by the comment\'s own timestamp', () => {
    // The list is a record of what YOU did, not of when the comments were
    // written. Sorting by created_at would also strand unresolvable rows, which
    // have no timestamp to sort by at all.
    const items = buildHiddenCommentItems(
      ['a', 'b'],
      [
        row('a', { created_at: '2020-01-01T00:00:00Z' }),
        row('b', { created_at: '2026-01-01T00:00:00Z' }),
      ],
      false,
    );
    expect(items.map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('does not mutate the caller\'s id array', () => {
    const ids = ['a', 'b', 'c'];
    buildHiddenCommentItems(ids, [], false);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('an empty hide list produces no rows', () => {
    expect(buildHiddenCommentItems([], [], false)).toEqual([]);
  });

  it('ignores fetched rows that are not in the hide list', () => {
    // The server answering with something we did not ask about must never add
    // a row — that would put a comment the user never hid onto their hide list.
    const items = buildHiddenCommentItems(['c1'], [row('c1'), row('stranger')], false);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('c1');
  });
});
