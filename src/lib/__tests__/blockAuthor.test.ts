/**
 * Apple Guideline 1.2(c) — the BLOCK leg.
 *
 * These test the thing the App Store audit actually found missing
 * (`qa-reports/2026-08-18_AppStore_Readiness_Audit.md` §B3): not that a block
 * row gets written, but that blocked content STOPS BEING RETURNED ON READ.
 * A block list nothing filters on is the exact shape of a faked compliance
 * feature, so the read side is what carries the weight here.
 *
 * The storage half rides on the existing `hiddenContent` tests; what is new is
 * the 'author' kind, its v1 blob migration, and `filterBlockedAuthors`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearHidden,
  filterBlockedAuthors,
  hideContent,
  loadHidden,
  unhideContent,
} from '../hiddenContent';

const STORAGE_KEY = '@accessmap/hidden_content_v1';

type Comment = { id: string; user_id: string | null; content: string };

const THREAD: Comment[] = [
  { id: 'c1', user_id: 'author-a', content: 'first' },
  { id: 'c2', user_id: 'author-b', content: 'second' },
  { id: 'c3', user_id: 'author-a', content: 'third — same author as c1' },
  { id: 'c4', user_id: null, content: 'author deleted their account' },
];

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('the author block list (storage)', () => {
  it('starts empty and round-trips one blocked author', async () => {
    expect((await loadHidden()).author).toEqual([]);
    await hideContent('author', 'author-a');
    expect((await loadHidden()).author).toEqual(['author-a']);
  });

  it('is idempotent — blocking twice does not duplicate the id', async () => {
    await hideContent('author', 'author-a');
    await hideContent('author', 'author-a');
    expect((await loadHidden()).author).toEqual(['author-a']);
  });

  it('unblocking removes only that author', async () => {
    await hideContent('author', 'author-a');
    await hideContent('author', 'author-b');
    await unhideContent('author', 'author-a');
    expect((await loadHidden()).author).toEqual(['author-b']);
  });

  /**
   * The kinds must not leak into each other. This is the assertion behind
   * SettingsScreen's bulk unblock calling `unhideContent('author', id)` per id
   * rather than `clearHidden()`: blocking a person and hiding a comment are two
   * different decisions by the reader, and undoing one must not undo the other.
   */
  it('blocking an author does not disturb hidden comments, or vice versa', async () => {
    await hideContent('comment', 'c9');
    await hideContent('author', 'author-a');

    await unhideContent('author', 'author-a');
    let hidden = await loadHidden();
    expect(hidden.author).toEqual([]);
    expect(hidden.comment).toEqual(['c9']);

    await hideContent('author', 'author-b');
    await unhideContent('comment', 'c9');
    hidden = await loadHidden();
    expect(hidden.comment).toEqual([]);
    expect(hidden.author).toEqual(['author-b']);
  });

  /**
   * THE MIGRATION, such as it is. A device that hid comments before blocking
   * existed holds a blob with no `author` key at all. The absent key IS the
   * correct old value, so there is no version bump and no rewrite — but that
   * only holds if the read defaults it rather than returning undefined, which
   * would make `.length` throw on the first render after an app update.
   */
  it('reads a pre-block v1 blob without losing the hidden comments', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ flag: [], comment: ['c9'] }));
    const hidden = await loadHidden();
    expect(hidden.comment).toEqual(['c9']);
    expect(hidden.author).toEqual([]);
  });

  it('survives a corrupt blob by hiding nothing, never by throwing', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not json{{');
    await expect(loadHidden()).resolves.toEqual({ flag: [], comment: [], author: [] });
  });

  it('clearHidden wipes the author list too', async () => {
    await hideContent('author', 'author-a');
    await clearHidden();
    expect((await loadHidden()).author).toEqual([]);
  });
});

describe('filterBlockedAuthors — the 1.2(c) read side', () => {
  it('returns the thread untouched when nobody is blocked', () => {
    expect(filterBlockedAuthors(THREAD, [], (c) => c.user_id)).toEqual(THREAD);
  });

  /**
   * The whole guideline in one assertion: blocking a PERSON removes every
   * comment they wrote, not just the one the reader was looking at. This is
   * what per-item hiding structurally cannot do and why Hide alone never
   * satisfied 1.2(c).
   */
  it('removes EVERY comment by a blocked author, not just one', () => {
    const visible = filterBlockedAuthors(THREAD, ['author-a'], (c) => c.user_id);
    expect(visible.map((c) => c.id)).toEqual(['c2', 'c4']);
  });

  it('leaves other authors alone', () => {
    const visible = filterBlockedAuthors(THREAD, ['author-b'], (c) => c.user_id);
    expect(visible.map((c) => c.id)).toEqual(['c1', 'c3', 'c4']);
  });

  it('handles several blocked authors at once', () => {
    const visible = filterBlockedAuthors(THREAD, ['author-a', 'author-b'], (c) => c.user_id);
    expect(visible.map((c) => c.id)).toEqual(['c4']);
  });

  /**
   * NULL AUTHORS ARE NEVER FILTERED, and this is the reason the helper exists
   * instead of a `?? ''` coercion through `filterHidden`. `flag_comments.user_id`
   * is nullable live (ON DELETE SET NULL — see the SR-117 drift capture), so a
   * comment whose author deleted their account belongs to nobody. Hiding those
   * would silently delete orphaned comments from every reader who has ever
   * blocked anyone.
   */
  it('never filters a comment whose author is null', () => {
    const visible = filterBlockedAuthors(THREAD, ['author-a', 'author-b'], (c) => c.user_id);
    expect(visible).toHaveLength(1);
    expect(visible[0].user_id).toBeNull();
  });

  it('an empty string in the block list cannot swallow null-authored comments', () => {
    // Defensive: '' is falsy, so the null guard short-circuits before the Set
    // lookup. Without that guard a stray '' would hide every orphaned comment.
    const visible = filterBlockedAuthors(THREAD, [''], (c) => c.user_id);
    expect(visible).toEqual(THREAD);
  });

  it('does not mutate the array it was given', () => {
    const copy = [...THREAD];
    filterBlockedAuthors(THREAD, ['author-a'], (c) => c.user_id);
    expect(THREAD).toEqual(copy);
  });
});

/**
 * The end-to-end shape the UI actually runs: block, then re-read from storage,
 * then filter. Written as one test because the bug this guards against is the
 * seam — a feature that writes correctly and reads correctly but never joins
 * the two is precisely the "block row written, nothing filtered" failure the
 * audit was looking for.
 */
describe('block → persist → filter, end to end', () => {
  it('a blocked author stays blocked across a reload', async () => {
    await hideContent('author', 'author-a');

    const { author: blocked } = await loadHidden();
    const visible = filterBlockedAuthors(THREAD, blocked, (c) => c.user_id);

    expect(visible.map((c) => c.id)).toEqual(['c2', 'c4']);
    expect(visible.some((c) => c.user_id === 'author-a')).toBe(false);
  });

  it('unblocking restores their comments', async () => {
    await hideContent('author', 'author-a');
    await unhideContent('author', 'author-a');

    const { author: blocked } = await loadHidden();
    expect(filterBlockedAuthors(THREAD, blocked, (c) => c.user_id)).toEqual(THREAD);
  });
});
