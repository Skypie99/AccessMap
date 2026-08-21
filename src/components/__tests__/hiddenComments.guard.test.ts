/**
 * HIGH-2 — the Unhide surface, as a set of source invariants.
 *
 * WHY A SOURCE SCAN, again. The sibling `commentHide.guard.test.ts` explains the
 * general case; these are the failures specific to UNhiding, and every one of
 * them renders perfectly:
 *
 *   · "Unhide all" reaching for `clearHidden()`, which also empties the `flag`
 *     bucket — a control doing strictly more than its label says;
 *   · the bulk loop fired concurrently, so N read-modify-writes race on one
 *     AsyncStorage key and silently lose ids;
 *   · the row advanced before the write lands, so a failed unhide leaves the
 *     reader believing a comment is back that will be hidden again next launch;
 *   · `unhideContent`'s deliberate throw swallowed — the exact failure
 *     `hiddenContent.ts`'s write policy exists to prevent, in the other
 *     direction;
 *   · the success announcement dropped, which is silent for VoiceOver users
 *     precisely because the row they were focused on has just gone;
 *   · the pill wearing `color.brand`, which the Car-4 arbiter measured as an AA
 *     failure as text on this material.
 *
 * SCOPE IS UNCHANGED. §SKY-3h keeps 1.2(c) on comments. This surface unhides
 * comments and nothing else, and the last describe pins that.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../__tests__/support/stripComments';

const SRC = path.resolve(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

const modal = read('components/HiddenCommentsModal.tsx');
const settings = read('screens/SettingsScreen.tsx');


/** Code only. Use for every ban; use `modal` when asserting something IS said. */
const modalCode = stripComments(modal);

/**
 * NON-VACUITY. Every assertion below is a substring check against these two
 * files, so a bad path, a rename, or an empty read would turn this entire suite
 * green while proving nothing. Sizes are floors, not measurements — they only
 * have to be large enough that an empty or stub file cannot clear them.
 */
describe('the guard is reading real files', () => {
  it('both sources are present and substantial', () => {
    expect(modal.length).toBeGreaterThan(4000);
    expect(settings.length).toBeGreaterThan(4000);
  });

  it('the sources are the ones this suite thinks they are', () => {
    expect(modal).toContain('export default function HiddenCommentsModal');
    expect(modal).toContain('export function buildHiddenCommentItems');
    expect(settings).toContain('export default function SettingsScreen');
  });
});

describe('1.2(c) — "Unhide all" does exactly what it says', () => {
  it('never calls clearHidden', () => {
    // clearHidden removes the whole storage key, flag bucket included. The
    // gate board ruled this out before any pick was made: "a button labelled
    // about comments must not silently do more than it says."
    expect(modalCode).not.toContain('clearHidden');
    // It is not merely unimported — it is unreferenced anywhere in the code.
    expect(modalCode).not.toMatch(/clearHidden\s*\(/);
  });

  it('unhides comment-by-comment through the comment-scoped primitive', () => {
    expect(modal).toContain("await unhideContent('comment', id);");
    // Every unhideContent call in the file is comment-scoped — no bare kind
    // variable that could carry 'flag' in from somewhere else.
    const calls = modalCode.match(/unhideContent\([^)]*\)/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call).toContain("'comment'");
  });

  it('the bulk loop is sequential, not Promise.all', () => {
    // Concurrent calls read-modify-write the same AsyncStorage key and lose
    // ids. `for ... of` with an await inside is the only safe shape here.
    expect(modal).toContain('for (const id of prevIds) {');
    expect(modalCode).not.toContain('Promise.all');
  });

  it('confirms before acting', () => {
    expect(modal).toContain('await confirm(');
    expect(modal).toContain('UNHIDE_ALL_CONFIRM_TITLE');
  });
});

describe('1.2(c) — writes are awaited and their failures surface', () => {
  it('the single unhide awaits the write before announcing success', () => {
    const i = modal.indexOf("await unhideContent('comment', id);\n      AccessibilityInfo");
    expect(i).toBeGreaterThan(-1);
  });

  it('both handlers catch and report rather than swallowing the throw', () => {
    expect(modal).toContain('notify(UNHIDE_FAILED_TITLE, errorMessage(e));');
    expect(modal).toContain('notify(UNHIDE_ALL_FAILED_TITLE, errorMessage(e));');
    // notify(), not Alert.alert() — Alert with no buttons is a silent no-op on
    // react-native-web, which is the F46 bug confirm.ts exists to prevent.
    expect(modalCode).not.toContain('Alert.alert');
  });

  it('a failed single unhide restores the row at its ORIGINAL index', () => {
    expect(modal).toContain('next.splice(Math.min(idx, next.length), 0, id);');
  });

  it('a failed bulk unhide re-reads storage instead of assuming a clean rollback', () => {
    // Partial failure is real — some ids may already be written. Assuming the
    // whole batch rolled back would put ids back that are no longer hidden.
    expect(modal).toContain('setIds((await loadHidden()).comment);');
  });
});

describe('1.2(c) — WCAG 4.1.3, both actions announce', () => {
  it('the single unhide announces', () => {
    expect(modal).toContain(
      'AccessibilityInfo.announceForAccessibility(COMMENT_UNHIDDEN_ANNOUNCEMENT);',
    );
  });

  it('the bulk unhide announces a COUNT', () => {
    // One "Comment unhidden" for an action that cleared eleven under-reports
    // what happened, to the users who can least afford an under-report.
    expect(modal).toContain(
      'AccessibilityInfo.announceForAccessibility(commentsUnhiddenAnnouncement(prevIds.length));',
    );
  });
});

describe('1.2(c) — a row that cannot be shown is still honest, and still works', () => {
  it('distinguishes a failed fetch from a deleted comment', () => {
    expect(modal).toContain('HIDDEN_COMMENT_UNAVAILABLE');
    expect(modal).toContain('HIDDEN_COMMENT_NOT_LOADED');
  });

  it('the Unhide control is rendered for every row, not just resolvable ones', () => {
    // An unresolvable row without an Unhide button is a permanently stuck
    // entry in a device-local list the user has no other way to clear.
    const rowBlock = modal.slice(
      modal.indexOf('const renderItem = useCallback('),
      modal.indexOf('// Bottom-anchored sheet'),
    );
    expect(rowBlock.length).toBeGreaterThan(500);
    // The Pressable is not inside any `isLoaded &&` branch.
    expect(rowBlock).toContain('accessibilityLabel={\n              isLoaded ? unhideCommentA11yLabel(item.author) : UNHIDE_UNAVAILABLE_A11Y_LABEL\n            }');
  });

  it('the load error is a banner, never a replacement for the list', () => {
    // Unhiding is a local write and needs no network, so a failed re-read must
    // not take the working half of the screen away with it.
    expect(modal).toContain('{loadError && items.length > 0 && !loading && (');
  });
});

describe('1.2(c) — the dismissal standard and the escape law', () => {
  it('onRequestClose is on the Modal', () => {
    expect(modal).toContain('onRequestClose={onClose}');
  });

  it('onAccessibilityEscape is on the containment View, never the Modal tag', () => {
    // RN does not forward onAccessibilityEscape to RCTModalHostView, so the
    // plausible mistake typechecks and does nothing.
    expect(modal).toContain('accessibilityViewIsModal\n            onAccessibilityEscape={onClose}');
    const modalTag = modal.slice(modal.indexOf('<Modal'), modal.indexOf('</Modal>'));
    const openTag = modalTag.slice(0, modalTag.indexOf('>'));
    expect(openTag).not.toContain('onAccessibilityEscape');
  });

  it('animation is reduced-motion safe', () => {
    expect(modal).toContain("animationType={reducedMotion ? 'none' : 'slide'}");
  });

  it('ships no custom gesture handling', () => {
    for (const banned of ['PanResponder', 'GestureDetector', 'Swipeable']) {
      expect(modalCode).not.toContain(banned);
    }
  });
});

describe('1.2(c) — the arbitrated ink', () => {
  it('the pill uses brandOnSoft, not brand', () => {
    // Car 4 measured color.brand as text on this material at 3.70:1 light /
    // 3.56:1 dark against a 4.5 floor. brandOnSoft on brandSofter measures
    // 6.33:1 light / 8.51:1 dark.
    expect(modal).toContain('color: color.brandOnSoft');
    expect(modalCode).not.toMatch(/color:\s*color\.brand,/);
  });

  it('both pills clear 44pt', () => {
    const pills = modal.match(/minHeight: 44/g) ?? [];
    expect(pills.length).toBeGreaterThanOrEqual(2);
  });
});

describe('HIGH-2 — the Settings entry point (§SKY-7 pick S1)', () => {
  it('lives in the Feedback section, after My feedback history', () => {
    const feedbackSection = settings.slice(
      settings.indexOf('          Feedback\n'),
      settings.indexOf('          Your data\n'),
    );
    expect(feedbackSection.length).toBeGreaterThan(200);
    expect(feedbackSection).toContain('HIDDEN_COMMENTS_TITLE');
    expect(feedbackSection.indexOf('My feedback history')).toBeLessThan(
      feedbackSection.indexOf('HIDDEN_COMMENTS_TITLE'),
    );
  });

  it('uses the shared copy consts, never a string literal', () => {
    expect(settings).not.toMatch(/title="Hidden comments"/);
    expect(settings).toContain('title={HIDDEN_COMMENTS_TITLE}');
    expect(settings).toContain('subtitle={HIDDEN_COMMENTS_ROW_SUBTITLE}');
  });

  it('is mounted exactly once', () => {
    expect(settings.match(/<HiddenCommentsModal\b/g)).toHaveLength(1);
  });
});

describe('1.2(c) is still comments-only — the scope fence holds', () => {
  it('the Unhide surface never reads or writes the flag bucket', () => {
    expect(modalCode).not.toContain('hidden.flag');
    expect(modalCode).not.toMatch(/unhideContent\(\s*'flag'/);
    expect(modalCode).not.toMatch(/hideContent\(\s*'flag'/);
  });

  it('it reads the comment bucket, explicitly', () => {
    expect(modal).toContain('(await loadHidden()).comment');
  });
});
