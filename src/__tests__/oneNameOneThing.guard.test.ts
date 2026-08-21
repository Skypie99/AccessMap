/**
 * SW-21 / SW-34 — one name per thing, and one thing per name.
 *
 * Two unrelated findings with the same shape: a word doing two jobs.
 *
 * ─── SW-21: "Notifications" meant two different features ──────────────────
 * The Profile "updates" banner ("N updates since your last visit") has a
 * preferences sheet, and that sheet was titled **Notifications** — while
 * SettingsScreen separately offers **"Push notification types"**, which is
 * actual push. Two unrelated features, one word, and one of them really is
 * notifications.
 *
 * The reported finding was narrower: the Settings row said "in-app updates
 * banner" and the sheet said "surface on your Profile". That mismatch was real
 * but it was the symptom; the collision underneath it was the defect. Five
 * strings named this one feature four ways.
 *
 * Sky's call, 2026-08-21: name it after its own artifact — the banner says
 * "updates", and `UpdateBanner` renders ONLY on Profile — and vacate
 * "Notifications" for push.
 *
 *   sheet title ......... "Updates"          (was "Notifications")
 *   Settings row ........ "Update preferences"
 *   Profile row ......... "Updates"          (was "Notifications")
 *
 * ─── SW-34: "Anonymous" meant two different people ────────────────────────
 * The finding said attribution "drifts between 'Another community member' and
 * 'Anonymous' for the same anonymized case. Pick one string." **That premise
 * did not hold** — see the ledger. FlagDetailModal renders THREE distinct
 * cases and they are all correct:
 *
 *   user_id IS NULL ................. "Anonymous"                (a choice)
 *   a known account, yours .......... "You"
 *   a known account, not yours ...... "Another community member"
 *
 * Showing "Another community member" for a null-`user_id` flag was already
 * reported and fixed in May 2026 as semantically incorrect. Collapsing them
 * would have walked that back.
 *
 * The real defect was one layer down: COMMENTS fell back to 'Anonymous' when
 * `display_name` was null. That is a different fact — the author never set a
 * name, or their account is gone (`flag_comments.user_id` is ON DELETE SET
 * NULL) — and labelling it "Anonymous" claimed a privacy choice the person
 * never made. The leaderboard had already solved exactly this case with
 * 'Member', and SW-44's fix comment calls that "correct and privacy-preserving".
 *
 * So: **'Anonymous' is reserved for deliberate anonymity. 'Member' is the word
 * for a person with no display name.** Ratified 2026-08-21.
 *
 * NOT changed, deliberately: `dataExport.ts`'s `display_name ?? '(not set)'`.
 * That is YOUR OWN missing name in YOUR OWN data export, sitting beside
 * `email ?? '(no email on file)'` — "you haven't set one", not a privacy
 * placeholder for a stranger. A close-out draft called this a third word for
 * one condition; it is a different condition, and it is correct as it stands.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');
const code = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

describe('SW-21 — the updates sheet does not call itself Notifications', () => {
  const sheet = code('components/NotificationPrefsModal.tsx');

  it('the sheet is titled Updates', () => {
    // Non-vacuity: its purpose line is the one string that was accurate all
    // along, and it must survive the rename.
    expect(sheet).toContain('Choose which flag updates surface on your Profile.');
    expect(sheet).toContain('Updates');
  });

  it('nothing in the sheet still calls the feature Notifications', () => {
    expect(sheet).not.toContain('aria-label="Notifications"');
    expect(sheet).not.toContain('Close notifications settings');
    expect(sheet).not.toContain('Sign in to save notification preferences.');
  });

  it('both entry points name it the same thing', () => {
    const settings = code('screens/SettingsScreen.tsx');
    const profile = code('screens/ProfileScreen.tsx');

    expect(settings).toContain('title="Update preferences"');
    expect(settings).not.toContain('Update banner preferences');
    expect(settings).not.toContain('in-app updates banner');

    expect(profile).toContain('accessibilityLabel="Updates"');
  });

  it('the OTHER feature keeps the word it actually earns', () => {
    // Must-not-regress: "Push notification types" is real push, and vacating
    // "Notifications" is the entire point of the rename. If this row is ever
    // renamed to plain "Notifications" the collision comes straight back.
    expect(code('screens/SettingsScreen.tsx')).toContain('title="Push notification types"');
  });
});

describe('SW-34 — Anonymous means a choice, not a missing name', () => {
  it('comments fall back to Member', () => {
    expect(code('components/FlagDetailModal.tsx')).toContain(
      "author={c.display_name ?? 'Member'}",
    );
    expect(code('components/HiddenCommentsModal.tsx')).toContain(
      "author: row.display_name ?? 'Member',",
    );
  });

  it('no comment surface still calls a nameless author Anonymous', () => {
    for (const f of ['components/FlagDetailModal.tsx', 'components/HiddenCommentsModal.tsx']) {
      expect(code(f)).not.toContain("display_name ?? 'Anonymous'");
    }
  });

  it('the leaderboard keeps Member — this fix adopted its word, not the reverse', () => {
    // Must-not-regress. 'Member' was already the ratified privacy placeholder
    // here (SW-44); the comment surfaces came to it.
    expect(code('screens/LeaderboardScreen.tsx')).toContain("displayName ?? 'Member'");
  });

  it('FLAGS keep all three cases — the reported premise did not hold', () => {
    // The finding asked for one string. These are three different facts about
    // a person and every one of them is correct. Pinned so a later sweep does
    // not "finish" SW-34 by collapsing them.
    const detail = code('components/FlagDetailModal.tsx');
    expect(detail).toContain('accessibilityLabel="Reported anonymously"');
    expect(detail).toContain("{isOwn ? 'You' : 'Another community member'}");
  });

  it('a data export still says (not set) about your own name', () => {
    // Deliberately untouched: a different condition in a different context.
    expect(code('lib/dataExport.ts')).toContain("input.user.display_name ?? '(not set)'");
  });
});
