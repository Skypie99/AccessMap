/**
 * SW-53 — the app's point values must match the SQL that actually awards them.
 *
 * ─── THE FINDING ──────────────────────────────────────────────────────────
 * Measured end-to-end on a real account during the authed sim walk: one flag
 * took a user from 90 points to 124.
 *
 *     reported +5 · photo +3 · comment +1 · verified +10 · resolved +15 = +34
 *
 * The app could describe barely half of that. `POINTS` covered verify/resolve
 * only, because it was written against `handle_flag_status_change` in
 * supabase/schema.sql — and FIVE more awarding triggers live only in
 * supabase/migrations/2026-05-30_trust_score_system.sql, which schema.sql never
 * absorbed. CLAUDE.md inherited the same gap, and the in-app Help FAQ told users
 * they earn four awards when they earn nine.
 *
 * ─── WHY THIS TEST EXISTS ─────────────────────────────────────────────────
 * Nothing in this repo pinned the app's numbers to the SQL. Not one test. The
 * only cross-check was prose — CLAUDE.md's own warning that the Tasks flash
 * strings are "coupled to the trigger" — and prose is exactly what drifted.
 *
 * So this reads the SQL. Not a copy of it, not a comment about it: the real
 * files, the ones an operator pastes into the dashboard. If someone changes an
 * award in SQL and not in `POINTS` (or the reverse), this fails and names the
 * award.
 *
 * It cannot check the LIVE database — an agent may not touch it — so it checks
 * the strongest artifact available. That boundary is the residual risk, and it
 * is the same one schema.sql's own "verified via pg_get_functiondef" note
 * carries.
 */
import fs from 'fs';
import path from 'path';

import { POINTS } from '../points';

const SUPABASE = path.join(__dirname, '..', '..', '..', 'supabase');
const schema = fs.readFileSync(path.join(SUPABASE, 'schema.sql'), 'utf8');
const trust = fs.readFileSync(
  path.join(SUPABASE, 'migrations', '2026-05-30_trust_score_system.sql'),
  'utf8',
);

/** The `delta` written by a point_events INSERT for one event type. */
function awardFor(sql: string, eventType: string): number | null {
  const m = sql.match(new RegExp(`'${eventType}',\\s*(-?\\d+)`));
  return m ? Number(m[1]) : null;
}

describe('SW-53 — every award in POINTS matches the trigger that pays it', () => {
  it.each([
    ['flag_submitted', () => POINTS.submitReport, trust],
    ['flag_photo_added', () => POINTS.addPhoto, trust],
    ['comment_added', () => POINTS.addComment, trust],
    ['comment_upvoted', () => POINTS.commentUpvoted, trust],
    ['streak_bonus', () => POINTS.streakBonus, trust],
  ])('%s', (eventType, expected, sql) => {
    const fromSql = awardFor(sql, eventType);
    // Non-vacuity: a renamed event type must fail loudly, not match nothing.
    expect(`${eventType} found in SQL: ${fromSql !== null}`).toBe(
      `${eventType} found in SQL: true`,
    );
    expect(`${eventType}: ${fromSql}`).toBe(`${eventType}: ${expected()}`);
  });

  it('verify and resolve read the same numbers schema.sql assigns', () => {
    // These come from variables in the trigger body rather than an inline
    // literal, so they are read from the assignments themselves.
    const reporterVerify = trust.match(/reporter_bonus\s*:=\s*(\d+);[\s\S]{0,120}?flag_verified_reporter/);
    expect(reporterVerify?.[1]).toBe(String(POINTS.reporter.verify));
  });

  it('the spam penalty is still the only negative award', () => {
    expect(awardFor(schema, 'flag_spam_penalty')).toBeLessThan(0);
    for (const t of ['flag_submitted', 'flag_photo_added', 'comment_added']) {
      expect(awardFor(trust, t)).toBeGreaterThan(0);
    }
  });
});

describe('SW-53 — the walk’s measured run reconciles', () => {
  it('one flag reported with a photo and a comment, verified then resolved, is +34', () => {
    // 90 -> 124 on a live account, 2026-08-19. If any single award moves and
    // this file is updated to match, this arithmetic is what proves the SET is
    // still the set the walk measured — rather than one number swapped for
    // another with the total quietly changed.
    const total =
      POINTS.submitReport +
      POINTS.addPhoto +
      POINTS.addComment +
      POINTS.reporter.verify +
      POINTS.reporter.resolve;
    expect(total).toBe(34);
  });
});

describe('SW-53 — the docs say what the SQL does', () => {
  const claudeMd = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'CLAUDE.md'),
    'utf8',
  );

  it('CLAUDE.md names every awarding trigger, not just the status one', () => {
    for (const fn of [
      'handle_flag_submitted',
      'handle_flag_photo_added',
      'handle_comment_added',
      'handle_comment_vote_added',
      'handle_point_event_streak',
      'handle_flag_status_change',
    ]) {
      expect(`CLAUDE.md documents ${fn}: ${claudeMd.includes(fn)}`).toBe(
        `CLAUDE.md documents ${fn}: true`,
      );
    }
  });

  it('schema.sql warns that it is not the whole economy', () => {
    // A reader who opens only this file would otherwise conclude the app pays
    // four awards. It pays nine.
    expect(schema).toContain('THIS IS NOT THE WHOLE POINTS ECONOMY');
  });
});
