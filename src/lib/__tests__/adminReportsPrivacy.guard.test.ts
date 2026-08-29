/**
 * MOD1 — "do not fetch/render reporter identity unnecessarily" as a source
 * invariant, not a convention someone has to remember.
 *
 * WHY A SOURCE SCAN: AdminReport (src/lib/adminReports.ts) simply never
 * selects `user_id` from `public.feedback` in the first place — the
 * reporter's identity never enters the client at all, so there is no
 * runtime value a render test could assert is hidden. The guarantee lives
 * in the SELECT column list and the RLS policy scope, and this pins both.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('MOD1 — the admin report queue never reads reporter identity', () => {
  const lib = read('src/lib/adminReports.ts');

  it('REPORT_SELECT never lists user_id (or any *_id belonging to the reporter)', () => {
    const selectLine = lib.match(/const REPORT_SELECT = '([^']+)';/);
    expect(selectLine).toBeTruthy();
    const columns = (selectLine as RegExpMatchArray)[1].split(',').map((c) => c.trim());
    expect(columns).not.toContain('user_id');
    // Exactly the columns this feature needs — a stray `select('*')` would
    // pull user_id back in without this test's other assertion noticing.
    expect(columns).toEqual([
      'id',
      'created_at',
      'body',
      'moderation_reviewed_at',
      'moderation_resolution',
    ]);
  });

  it('no code path in this file references feedback.user_id', () => {
    // The narrowest possible pattern: literally the string a reporter-id
    // read would need. AdminReport's own fields (reviewedBy, etc.) don't
    // match this.
    expect(lib).not.toMatch(/\buser_id\b/);
  });
});

describe('MOD1 — the report row never renders a reporter field', () => {
  const screen = read('src/screens/AdminScreen.tsx');
  const rowSection = screen.slice(
    screen.indexOf('const renderReportItem = '),
    screen.indexOf("if (viewMode === 'reports')"),
  );

  it('renderReportItem never reads a reporter-shaped field off AdminReport', () => {
    // display_name/content DO appear here — that's the reported comment's
    // AUTHOR, legitimate moderation context, not the person who filed the
    // report. What must never appear is a field naming the reporter.
    expect(rowSection).not.toMatch(/item\.report(er|edBy)/i);
    expect(rowSection).not.toMatch(/reporterName|reporterId|reporter_id/i);
  });
});

describe('MOD1 — RLS scopes admin access to report-shaped rows only', () => {
  const migration = read('supabase/migrations/20260828050000_mod1_admin_report_queue.sql');

  it('both the select and update policies require the [REPORT] prefix, not blanket feedback access', () => {
    const selectPolicy = migration.slice(
      migration.indexOf('create policy "feedback_select_moderation"'),
      migration.indexOf('create policy "feedback_update_moderation"'),
    );
    const updatePolicy = migration.slice(migration.indexOf('create policy "feedback_update_moderation"'));
    for (const policy of [selectPolicy, updatePolicy]) {
      expect(policy).toContain("body like '[REPORT]%'");
      expect(policy).toContain('account.is_admin = true');
    }
  });

  it('the update grant is column-scoped to the three moderation fields, never a blanket UPDATE', () => {
    expect(migration).toContain('revoke update on public.feedback from authenticated;');
    expect(migration).toMatch(
      /grant update \(moderation_reviewed_at, moderation_reviewed_by, moderation_resolution\)\s*\n\s*on public\.feedback to authenticated;/,
    );
    // Never a bare, all-columns grant reintroduced anywhere in this file.
    expect(migration).not.toMatch(/grant update on public\.feedback to authenticated;/);
  });

  it('an admin may only record themselves as reviewer, never backdate a decision to someone else', () => {
    const updatePolicy = migration.slice(migration.indexOf('create policy "feedback_update_moderation"'));
    expect(updatePolicy).toContain(
      'and (moderation_reviewed_by is null or moderation_reviewed_by = (select auth.uid()))',
    );
  });

  it('never queries public.feedback from within a policy defined on public.feedback (the recursion trap)', () => {
    // The prior lost attempt hit "infinite recursion detected in policy for
    // relation feedback" this exact way. Every EXISTS/subquery here must
    // target public.users, never public.feedback.
    const subqueries = [...migration.matchAll(/exists\s*\(\s*select[\s\S]*?\)/g)].map((m) => m[0]);
    expect(subqueries.length).toBeGreaterThan(0);
    for (const sub of subqueries) {
      expect(sub).not.toMatch(/from\s+public\.feedback/i);
    }
  });

  it('the half-reviewed state is structurally impossible', () => {
    expect(migration).toContain(
      'check (\n    (moderation_reviewed_at is null) = (moderation_resolution is null)\n  );',
    );
  });

  it('the resolution vocabulary matches the locked list exactly', () => {
    const constraint = migration.slice(
      migration.indexOf('add constraint feedback_moderation_resolution_vocabulary'),
    );
    for (const value of ['no_action', 'flag_rejected', 'flag_removed', 'comment_removed', 'target_unavailable']) {
      expect(constraint).toContain(`'${value}'`);
    }
  });
});
