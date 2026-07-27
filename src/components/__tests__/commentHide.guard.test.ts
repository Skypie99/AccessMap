/**
 * Apple 1.2(c) — the Hide affordance, as a set of source invariants.
 *
 * WHY A SOURCE SCAN. The interesting failures here are not "did the button
 * draw". They are ordering and scope failures that a render test would happily
 * report as green:
 *
 *   · the hide list read on every render instead of once per flag;
 *   · the local list advanced BEFORE the write lands, so a failed write leaves
 *     the reader believing a comment is hidden that will be back next launch;
 *   · `hideContent`'s deliberate throw swallowed, which is the one outcome
 *     `hiddenContent.ts` is written to prevent ("a hide that silently fails is a
 *     promise broken to someone who just told you they do not want to see
 *     something");
 *   · the filter creeping up into the loading / error / empty branches, which
 *     would make "No comments yet — share what you know." a lie told to anyone
 *     who had simply hidden them all;
 *   · Hide appearing on your OWN comment, where Delete is the affordance;
 *   · flag-level hide arriving quietly and letting somebody call 1.2(c) closed.
 *
 * SCOPE, STATED PLAINLY: §SKY-3h scopes 1.2(c) to COMMENTS. Guideline 1.2(c) is
 * therefore PARTIAL, not closed — `hiddenContent.ts` has carried a `flag` bucket
 * since it landed and nothing in the UI writes to it. The last describe below
 * pins that gap open so the next reader cannot mistake the half for the whole.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

const modal = read('components/FlagDetailModal.tsx');
const bubble = read('components/CommentBubble.tsx');

/** Slice from `start` to the first `end` after it — a scope, not a char budget. */
function between(src: string, start: string, end: string): string {
  const i = src.indexOf(start);
  if (i < 0) throw new Error(`anchor not found: ${start}`);
  const j = src.indexOf(end, i + start.length);
  if (j < 0) throw new Error(`closing anchor not found: ${end} (after ${start})`);
  return src.slice(i, j);
}

describe('1.2(c) — the list is read once per flag, not per render', () => {
  it('loadHidden is called exactly once in the modal, inside an effect', () => {
    expect(modal.match(/loadHidden\(\)/g)).toHaveLength(1);
    // The call sits between the effect's opening and its dependency array.
    const effect = between(modal, 'const hidden = await loadHidden();', '}, [');
    expect(effect).toContain('if (!cancelled) setHiddenComments(hidden.comment);');
  });

  it('the effect is keyed on the flag id and the modal being open', () => {
    expect(modal).toContain('}, [visible, shownFlagId]);');
    // Exhaustive by construction — no eslint suppression bought this.
    expect(modal).not.toMatch(/eslint-disable.*react-hooks\/exhaustive-deps/);
  });

  it('only the COMMENT bucket is read — §SKY-3h scopes this phase to comments', () => {
    expect(modal).toContain('setHiddenComments(hidden.comment)');
    expect(modal).not.toContain('hidden.flag');
  });
});

describe('1.2(c) — the filter is applied at the .map site and nowhere else', () => {
  it('filterHidden wraps the comment list exactly once', () => {
    expect(modal.match(/filterHidden\(/g)).toHaveLength(1);
    expect(modal).toContain('filterHidden(comments, hiddenComments, (c) => c.id).map((c) => (');
  });

  it('the loading / error / empty branches still test the UNFILTERED list', () => {
    // Three branch conditions, all on `comments`. If any of them started
    // reading the filtered list, hiding every comment on a flag would make the
    // app claim there were none — and offer to be told about something the
    // reader can already see they were told about.
    expect(modal).toContain('commentsError && comments.length === 0');
    expect(modal).toContain('commentsLoading && comments.length === 0');
    expect(modal).toContain(') : comments.length === 0 ? (');
    // The empty-state sentence is the thing those three protect.
    expect(modal).toContain('No comments yet — share what you know.');
  });
});

describe('1.2(c) — a write that fails is never reported as a success', () => {
  const handler = between(modal, 'const handleHideComment = async', 'const handleToggleWatch');

  it('the throw is caught and surfaced with notify(), not swallowed', () => {
    expect(handler).toContain('await hideContent(\'comment\', commentId);');
    expect(handler).toContain('notify(HIDE_FAILED_TITLE, errorMessage(e));');
    // `notify`, not `Alert.alert`: Alert is a silent no-op on react-native-web,
    // and a failed hide is a message the user MUST see.
    expect(handler).not.toContain('Alert.alert');
  });

  it('the failure path RETURNS — no state change, no announcement', () => {
    const settle = handler.indexOf('setHiddenComments((prev)');
    const bail = handler.indexOf('return;');
    expect(bail).toBeGreaterThan(-1);
    expect(settle).toBeGreaterThan(bail); // the early return precedes the commit
  });

  it('the local list advances only AFTER the await, so nothing needs rolling back', () => {
    expect(handler.indexOf('await hideContent')).toBeLessThan(
      handler.indexOf('setHiddenComments((prev)'),
    );
    expect(handler).toContain('prev.includes(commentId) ? prev : [...prev, commentId]');
  });

  it('WCAG 4.1.3 — the vanishing bubble is announced', () => {
    expect(handler).toContain(
      'AccessibilityInfo.announceForAccessibility(COMMENT_HIDDEN_ANNOUNCEMENT)',
    );
  });
});

describe('1.2(c) — Hide rides the same strict ownership gate as Report', () => {
  it('one predicate, spelled strictly at all four sites', () => {
    // `isOwn`, then the Delete / Report / Hide gates. SR-117: `user_id` is
    // nullable live, so `==` or a `?? ''` default would hand a signed-out
    // reader the AUTHOR's affordance on every orphaned comment.
    expect(modal.match(/c\.user_id === user\?\.id/g)).toHaveLength(4);
    expect(modal).not.toMatch(/c\.user_id\s*==[^=]/);
    expect(modal).not.toMatch(/c\.user_id\s*\?\?/);
  });

  it('onHide is undefined on your own row — Delete is the affordance there', () => {
    const prop = between(modal, 'onHide={', '}\n');
    expect(prop).toContain('c.user_id === user?.id');
    expect(prop).toContain('? undefined');
    expect(prop).toContain('void handleHideComment(c.id);');
  });
});

describe('1.2(c) — the composite-label law covers all three actions', () => {
  it('CommentBubble derives the flag from the three gates, never restates it', () => {
    expect(bubble).toContain('const showDelete = isOwn && !!onDelete;');
    expect(bubble).toContain('const showReport = !isOwn && !!onReport;');
    expect(bubble).toContain('const showHide = !isOwn && !!onHide;');
    expect(bubble).toContain(
      'const useCompositeLabel = !showDelete && !showReport && !showHide;',
    );
  });

  it('the footer layout is keyed on the FOOTER, not on one of its occupants', () => {
    expect(bubble).toContain('const showFooter = showReport || showHide;');
    expect(bubble).toContain('showFooter && styles.timeInFooter');
    expect(bubble).toContain('{showFooter ? (');
  });

  it('neither moderation control carries an accessibilityHint (the honesty fence)', () => {
    // Every hint that would help is a promise: a takedown, a review, or a claim
    // about other people's screens. The author-qualified NAME carries the
    // meaning instead.
    const footer = between(bubble, '<View style={styles.footerActions}>', '{timeNode}');
    expect(footer).toContain('accessibilityLabel={reportCommentA11yLabel(author)}');
    expect(footer).toContain('accessibilityLabel={hideCommentA11yLabel(author)}');
    expect(footer).not.toContain('accessibilityHint');
  });

  it('both controls read their visible word from copy.ts, never a literal', () => {
    const footer = between(bubble, '<View style={styles.footerActions}>', '{timeNode}');
    expect(footer).toContain('{REPORT_CONTROL_LABEL}');
    expect(footer).toContain('{HIDE_CONTROL_LABEL}');
    expect(footer).not.toMatch(/>\s*Hide\s*</);
    expect(footer).not.toMatch(/>\s*Report\s*</);
  });

  it('the two controls share ONE treatment — no second dialect, no eye-tuning', () => {
    // Report and Hide are peers on this row. They reuse the same already-banked
    // ink/fill pair (color.textMuted on color.surfaceNeutral), which is why
    // 1.2(c) needed no second arbiter run.
    expect(bubble.match(/styles\.footerBtn,/g)).toHaveLength(2);
    expect(bubble.match(/styles\.footerBtnText, \{ color: color\.textMuted \}/g)).toHaveLength(2);
    // The pre-rename names are gone, so nothing can style one control alone.
    expect(bubble).not.toContain('reportBtn:');
    expect(bubble).not.toContain('reportBtnText:');
  });

  it('the two hit-slop regions cannot overlap (an ambiguous tap picks a verb)', () => {
    // Each button carries hitSlop 8 per side, so the group gap must be >= 16 or
    // the boundary between "report this" and "hide this" becomes a coin flip.
    const group = between(bubble, 'footerActions: {', '},');
    expect(group).toContain('gap: spacing.lg');
    expect(bubble.match(/hitSlop=\{8\}/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe('1.2(c) is PARTIAL — flag-level hide is out of scope, and stays visibly so', () => {
  it('nothing in the app writes to the flag bucket yet', () => {
    // hiddenContent.ts has always had a `flag` bucket; §SKY-3h scoped this
    // phase to comments, so the bucket is real, tested, and unwired. This
    // assertion is the honest record of that — delete it in the work item that
    // actually ships flag-level hide, not before.
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!/(__tests__|__mocks__|node_modules)/.test(p)) walk(p);
        } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name)) {
          files.push(p);
        }
      }
    };
    walk(SRC);

    const writers = files.filter((f) => {
      if (f.endsWith(path.join('lib', 'hiddenContent.ts'))) return false; // the module itself
      return /hideContent\(\s*'flag'/.test(fs.readFileSync(f, 'utf8'));
    });
    expect(writers).toEqual([]);
  });

  it('the only hide the UI performs is on a comment', () => {
    const calls = modal.match(/hideContent\([^)]*\)/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("'comment'");
  });
});
