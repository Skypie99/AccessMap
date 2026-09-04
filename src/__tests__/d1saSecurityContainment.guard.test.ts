import fs from 'fs';
import path from 'path';

const migration = fs.readFileSync(
  path.join(__dirname, '..', '..', 'supabase', 'nonmanaged', 'live-out-of-band', '2026-08-27_d1sa_deployed_security_containment.sql'),
  'utf8',
);
const executableSql = migration.replace(/^\s*--.*$/gm, '');

const backupTables = [
  'bk_2026_08_22_flags',
  'bk_2026_08_22_flag_comments',
  'bk_2026_08_22_flag_photos',
  'bk_2026_08_22_flag_status_history',
  'bk_2026_08_22_flag_verifications',
  'bk_2026_08_22_flag_edit_history',
  'bk_2026_08_22_point_links',
];

function functionBody(name: string): string {
  const start = migration.indexOf(`create or replace function public.${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = migration.indexOf('$$;', start);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end + 3);
}

describe('D1S-A deployed security containment migration', () => {
  it.each(backupTables)('%s is RLS-protected and has no client privileges', (table) => {
    expect(migration).toMatch(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security;`, 'i'));
    expect(migration).toMatch(new RegExp(`revoke\\s+all\\s+privileges\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+public,\\s*anon,\\s*authenticated;`, 'i'));
    expect(migration).not.toMatch(new RegExp(`create\\s+policy[^;]*${table}`, 'i'));
  });

  it('does not force RLS or create, move, or drop backup tables', () => {
    expect(executableSql).not.toMatch(/force\s+row\s+level\s+security/i);
    expect(executableSql).not.toMatch(/(?:create|drop)\s+table[^;]*bk_2026_08_22/i);
    expect(executableSql).not.toMatch(/alter\s+schema/i);
  });

  it('keeps Storage UID namespaces and adds the surviving-account check', () => {
    for (const policy of ['"flag-photos auth upload"', '"flag-photos owner delete"']) {
      const start = migration.indexOf(`create policy ${policy}`);
      const end = migration.indexOf(');', start);
      const body = migration.slice(start, end + 2);
      expect(body).toContain("bucket_id = 'flag-photos'");
      expect(body).toContain('(storage.foldername(name))[1] = (select auth.uid()::text)');
      expect(body).toMatch(/from\s+public\.users\s+as\s+account/i);
      expect(body).toMatch(/account\.id\s*=\s*\(select\s+auth\.uid\(\)\)/i);
    }
  });

  it('requires a caller-owned path, current account, and target-flag ownership for photo metadata', () => {
    const start = migration.indexOf('create policy "flag_photos: authenticated insert"');
    const end = migration.indexOf(');', start);
    const body = migration.slice(start, end + 2);

    expect(body).toContain("position('/flag-photos/' || (select auth.uid())::text || '/' in url) > 0");
    expect(body).toMatch(/from\s+public\.users\s+as\s+account/i);
    expect(body).toMatch(/from\s+public\.flags\s+as\s+flag/i);
    expect(body).toMatch(/flag\.id\s*=\s*flag_photos\.flag_id/i);
    expect(body).toMatch(/flag\.user_id\s*=\s*\(select\s+auth\.uid\(\)\)/i);
  });

  it('requires a current account for community status triage without adding ownership or role redesign', () => {
    const start = migration.indexOf('create policy "flags status update by any authenticated"');
    const end = migration.indexOf(');', start);
    const body = migration.slice(start, end + 2);

    expect(body).toMatch(/to\s+authenticated/i);
    expect(body).toMatch(/using\s*\(\s*exists/i);
    expect(body).toMatch(/with\s+check\s*\(\s*exists/i);
    expect(body).toMatch(/from\s+public\.users\s+as\s+account/i);
    expect(body).not.toMatch(/is_admin|flag\.user_id/i);
  });

  it.each([
    ['increment_reopen_request', 'reopen_requests = reopen_requests + 1', "status = 'resolved'"],
    ['increment_dispute_request', 'dispute_requests = dispute_requests + 1', "status in ('open', 'verified')"],
  ])('%s rejects a missing account before preserving its counter semantics', (name, update, status) => {
    const body = functionBody(`${name}(p_flag_id uuid)`);
    const guard = body.indexOf("raise exception 'Account is no longer active.' using errcode = 'P0001';");
    const mutation = body.indexOf(update);

    expect(body).toContain('security definer');
    expect(body).toContain('set search_path = public');
    expect(body).toMatch(/from\s+public\.users\s+as\s+account/i);
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(mutation).toBeGreaterThan(guard);
    expect(body).toContain(status);
    expect(body).not.toMatch(/voter|user_id/i);
  });

  it('retains authenticated-only counter execution and removes client execution of the trigger function', () => {
    for (const name of ['increment_reopen_request', 'increment_dispute_request']) {
      expect(migration).toMatch(new RegExp(`revoke\\s+execute\\s+on\\s+function\\s+public\\.${name}\\(uuid\\)\\s+from\\s+public,\\s*anon;`, 'i'));
      expect(migration).toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${name}\\(uuid\\)\\s+to\\s+authenticated;`, 'i'));
    }
    expect(migration).toMatch(/revoke\s+execute\s+on\s+function\s+public\.enforce_flag_status_transition\(\)\s+from\s+public,\s*anon,\s*authenticated;/i);
    expect(executableSql).not.toMatch(/create\s+table|voter|rate.limit/i);
  });
});
