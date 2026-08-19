/**
 * APPLE 1.2(c) — THE WIRING GUARD.
 *
 * `blockAuthor.test.ts` proves the storage and the filter work in isolation.
 * That is not the thing that gets an app rejected. The failure mode this file
 * exists for is the one the readiness audit actually found across the industry
 * and in this repo's own history: a control that WRITES a block correctly, and
 * a filter that WOULD work, which are never joined — so the button is real, the
 * row is written, and the abusive comments keep rendering.
 *
 * `hiddenContent.ts` shipped exactly that shape for eleven weeks: it declared a
 * `'flag'` kind, and `hideContent('flag', …)` had ZERO production call sites
 * while the tests passed. Unit tests cannot see that gap. A source scan can.
 *
 * These are deliberately source-text assertions, in the same spirit as
 * `commentHide.guard.test.ts` — they pin the SEAM, not the implementation, so
 * refactoring is free but deleting the wiring is not.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

const MODAL = read('components/FlagDetailModal.tsx');
const BUBBLE = read('components/CommentBubble.tsx');
const STORE = read('lib/hiddenContent.ts');
const SETTINGS = read('screens/SettingsScreen.tsx');

describe('the block WRITE side is wired', () => {
  it('FlagDetailModal writes the block through the author kind', () => {
    expect(MODAL).toContain("hideContent('author'");
  });

  it('the Block control is actually passed to CommentBubble', () => {
    expect(MODAL).toContain('onBlock=');
    expect(BUBBLE).toContain('onBlock');
  });

  /**
   * The two-condition gate. `c.user_id &&` is not decoration: without it a
   * comment whose author deleted their account (user_id NULL live — SR-117)
   * would render a Block button that can never act.
   */
  it('the Block gate requires a non-null author AND a different viewer', () => {
    expect(MODAL).toContain('c.user_id && c.user_id !== user?.id');
  });
});

describe('the block READ side is wired — the assertion that matters', () => {
  /**
   * Without this call the feature is theatre. It is asserted against the modal
   * source rather than a render because the render test would pass just as
   * happily against a filter applied to the wrong array.
   */
  it('FlagDetailModal filters the comment list by blocked author', () => {
    expect(MODAL).toContain('filterBlockedAuthors(comments, blockedAuthors');
  });

  it('the blocked-author list is loaded from storage, not left empty', () => {
    expect(MODAL).toContain('setBlockedAuthors(hidden.author)');
  });

  it('the filter and the loaded state refer to the same variable', () => {
    const loads = MODAL.includes('setBlockedAuthors(hidden.author)');
    const filters = /filterBlockedAuthors\(\s*comments,\s*blockedAuthors/.test(MODAL);
    expect(loads && filters).toBe(true);
  });
});

describe('the way back out exists', () => {
  it('Settings can unblock, and does it per-author rather than by wiping the key', () => {
    expect(SETTINGS).toContain("unhideContent('author'");
    // clearHidden() would ALSO un-hide every individually hidden comment — two
    // separate decisions by the reader, and one must not silently undo the
    // other. HiddenCommentsModal records the same rule for its bulk action.
    //
    // Asserted against the IMPORT rather than the whole file: the rule is
    // discussed by name in a JSDoc a few lines above the handler, and a naive
    // substring scan would fire on the explanation of why we do not do it.
    const imports = SETTINGS.slice(0, SETTINGS.indexOf('export default'));
    expect(imports).not.toContain('clearHidden');
  });

  it('the unblock surface is reachable from the Settings list', () => {
    expect(SETTINGS).toContain('BLOCKED_PEOPLE_ROW_TITLE');
    expect(SETTINGS).toContain('handleUnblockAllPress');
  });
});

describe('the scope decision is recorded, not accidental', () => {
  /**
   * Blocking is comments-only this phase (Jordan Phase-0 gate 2026-08-18,
   * answer 5; mirrors Sky's §SKY-3h scoping for Hide). That is a decision, and
   * an undocumented decision is indistinguishable from a bug to the next
   * reader — who would then "fix" it by threading blocked ids into listFlags.
   */
  it('hiddenContent explains why the flag kind is declared but unused', () => {
    expect(STORE).toContain("WHY `'flag'` IS DECLARED BUT UNUSED");
  });

  it('the author kind exists in the type and the empty map', () => {
    expect(STORE).toContain("'flag' | 'comment' | 'author'");
    expect(STORE).toMatch(/EMPTY: HiddenMap = \{[^}]*author: \[\]/);
  });

  /**
   * The correction from the same gate (condition 8). The old header justified
   * device-local storage by citing a "Jordan hard condition" that, on review,
   * covered user<->LOCATION linkage and admin enumeration — not this. The
   * overgeneralised sentence was being inherited as a design constraint it
   * never was, so its removal is pinned here to stop it being restored.
   */
  it('the overgeneralised privacy claim has not come back', () => {
    expect(STORE).not.toContain("user<->content linkage Jordan's hard condition refuses");
  });
});
