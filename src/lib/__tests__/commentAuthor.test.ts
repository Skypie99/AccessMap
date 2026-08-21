/**
 * SR-117 — a comment can outlive its author, and a NULL author is not ownership.
 *
 * public.flag_comments.user_id is nullable live with ON DELETE SET NULL
 * (verified read-only 2026-07-27; both drifts banked in
 * supabase/migrations/2026-07-27_drift_capture_flag_comments_user_id.sql). The
 * repo migration still declares NOT NULL / ON DELETE CASCADE, so the types
 * claimed `user_id: string` and were a lie for every comment whose author had
 * deleted their account. They now say `string | null`.
 *
 * That honesty creates one real hazard, which is what this file exists to pin.
 * Ownership is decided by comparing the comment's author to the viewer:
 *
 *     isOwn={c.user_id === user?.id}
 *
 * For a signed-out reader `user?.id` is `undefined`, and an orphaned comment's
 * `user_id` is `null`. With `===` that is false — correct. With `==` it is
 * TRUE, and every guest would be handed the Delete affordance on every
 * orphaned comment. `?? ''` on either side has the same effect once two
 * orphaned rows are compared. So the test asserts the SEMANTICS (the table
 * below) and then source-scans the call sites, because the semantics live in
 * inline JSX and a refactor is exactly how this would regress.
 *
 * The B-1 moderation work makes this load-bearing rather than theoretical: the
 * same predicate decides whether a row shows Delete (yours) or Report
 * (someone else's), so getting it wrong would put a takedown control on the
 * wrong rows.
 */
import fs from 'fs';
import path from 'path';

const REPO = path.join(__dirname, '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf8');

/** The predicate under test, spelled exactly as the call sites spell it. */
const isOwn = (commentUserId: string | null, viewerId: string | undefined) =>
  commentUserId === viewerId;

describe('SR-117 — ownership of a comment whose author may be gone', () => {
  const ME = '11111111-1111-1111-1111-111111111111';
  const THEM = '22222222-2222-2222-2222-222222222222';

  it.each([
    ['my own comment, signed in → mine', ME, ME, true],
    ["someone else's comment, signed in → not mine", THEM, ME, false],
    ['an orphaned comment, signed in → not mine', null, ME, false],
    ['an orphaned comment, signed OUT → not mine (the == trap)', null, undefined, false],
    ["someone else's comment, signed OUT → not mine", THEM, undefined, false],
  ] as const)('%s', (_label, commentUserId, viewerId, expected) => {
    expect(isOwn(commentUserId, viewerId)).toBe(expected);
  });

  it('the == trap this file exists to prevent is real, not hypothetical', () => {
    // Documented so nobody "simplifies" the comparison back into a bug: for a
    // signed-out reader looking at an orphaned comment, loose equality claims
    // ownership. This assertion fails the day someone changes === to ==.
    const orphan: string | null = null;
    const guest: string | undefined = undefined;
    // eslint-disable-next-line eqeqeq
    expect(orphan == guest).toBe(true); // the bug
    expect(orphan === guest).toBe(false); // the shipped behaviour
  });
});

describe('SR-117 — the types tell the truth about live', () => {
  it('both Row shapes carry a nullable author; Insert does not', () => {
    const db = read('types/database.ts');

    // CommentRow (the flattened app-facing shape) and the schema Row.
    expect(db).toContain('user_id: string | null;');
    // The Insert shape must stay non-nullable: the app always supplies an
    // author and the RLS policy requires user_id = auth.uid(). Only READS can
    // observe the NULL that ON DELETE SET NULL leaves behind.
    const insertBlock = db.slice(db.indexOf('flag_comments: {'));
    const insert = insertBlock.slice(insertBlock.indexOf('Insert: {'), insertBlock.indexOf('Update:'));
    expect(insert).toContain('user_id: string;');
    expect(insert).not.toContain('user_id: string | null;');

    // CLAUDE.md gotcha #1: these must stay `type`, never `interface`, or
    // postgrest-js infers Schema = never and every .insert() breaks.
    expect(db).toContain('export type CommentRow = {');
  });

  it('the raw PostgREST row is nullable too, so flatten cannot narrow it away', () => {
    const src = read('lib/comments.ts');
    const raw = src.slice(src.indexOf('type RawCommentRow = {'), src.indexOf('function flattenComment'));
    expect(raw).toContain('user_id: string | null;');
  });

  it('the drift is banked, so the type change has a versioned justification', () => {
    const migration = path.join(
      REPO,
      '..',
      'supabase',
      'migrations',
      '2026-07-27_drift_capture_flag_comments_user_id.sql',
    );
    expect(fs.existsSync(migration)).toBe(true);
    const sql = fs.readFileSync(migration, 'utf8');
    // Both halves of the drift must be on the record, not just nullability.
    expect(sql).toContain('ON DELETE SET NULL');
    expect(sql).toContain('SKY-APPLIES, NEVER AUTO-RUN');
  });
});

describe('SR-117 — the call sites compare strictly', () => {
  it('FlagDetailModal decides comment ownership with === and never ==', () => {
    const src = read('components/FlagDetailModal.tsx');

    // Every call site spelled strictly. It started as two (isOwn + the delete
    // gate); the B-1 moderation work added Report and then Hide, and each new
    // affordance re-decides ownership at its own prop. The floor rises with
    // them on purpose — a refactor that hoists three of the four into one
    // loose comparison should fail here rather than pass on a stale minimum.
    const strict = src.match(/c\.user_id === user\?\.id/g) ?? [];
    expect(strict.length).toBeGreaterThanOrEqual(4);

    // No loose comparison, and no default that would collapse null and
    // undefined into the same value before comparing.
    expect(src).not.toMatch(/c\.user_id\s*==[^=]/);
    expect(src).not.toMatch(/c\.user_id\s*\?\?/);

    // A null author still renders a fallback rather than an empty byline —
    // the display half of the same drift.
    //
    // SW-34 (Sky ratified 2026-08-21): the fallback is 'Member', not
    // 'Anonymous'. 'Anonymous' is reserved for a DELIBERATE choice — a flag
    // with user_id IS NULL, which FlagDetailModal renders as its own pill. A
    // comment with no display_name is a different fact (no name set, or the
    // author's account is gone under ON DELETE SET NULL), and labelling it
    // 'Anonymous' claimed a privacy choice the person never made. 'Member' is
    // the word the leaderboard already uses for exactly this case.
    expect(src).toContain("c.display_name ?? 'Member'");
    expect(src).not.toContain("c.display_name ?? 'Anonymous'");
  });
});
