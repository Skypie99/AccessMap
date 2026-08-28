import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const REPO = path.join(__dirname, '..', '..');
const APPROVED_BASE = 'ed37860e9cc7989802a87f9994b78ed258210cc7';
const read = (...parts: string[]) => fs.readFileSync(path.join(REPO, ...parts), 'utf8');

const migration = read('supabase', 'migrations', '2026-08-27_d1_option_a_account_deletion.sql');
const d1saMigration = read(
  'supabase',
  'migrations',
  '2026-08-27_d1sa_deployed_security_containment.sql',
);
const edgeFunction = read('supabase', 'functions', 'delete-account', 'index.ts');
const profile = read('src', 'screens', 'ProfileScreen.tsx');
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

const lockAwarePolicies = [
  'users update own row',
  'flags insert own',
  'flags owner edit open',
  'flags status update by any authenticated',
  'flags delete own',
  'admin delete any flag',
  'flag-photos auth upload',
  'flag-photos owner delete',
  'flag-photos admin delete',
  'flag_photos: authenticated insert',
  'flag_photos: flag owner delete',
  'flag_photos: flag owner update',
  'flag_comments: own insert',
  'flag_comments: own delete',
  'admin delete any comment',
  'flag_verifications own insert',
  'comment_votes insert own',
  'comment_votes delete own',
  'feedback_insert_self_or_anon',
  'feedback_delete_own',
  'push_tokens: owner insert',
  'push_tokens: owner update',
  'push_tokens: owner delete',
  'Users can upsert their own notification preferences',
  'Users can update their own notification preferences',
  'flag_edit_history insert by flag owner',
  'subscribe_log insert own',
];

function statementAfter(needle: string): string {
  const start = migration.indexOf(needle);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = migration.indexOf(');', start);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end + 2);
}

function functionBody(name: string): string {
  const start = migration.indexOf(`create or replace function public.${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = migration.indexOf('$$;', start);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end + 3);
}

describe('D1 Option A migration stays additive to deployed D1S-A', () => {
  it('does not alter the D1S-A artifact and preserves its containment anchors', () => {
    const d1saAtApprovedBase = execFileSync(
      'git',
      ['show', `${APPROVED_BASE}:supabase/migrations/2026-08-27_d1sa_deployed_security_containment.sql`],
      { cwd: REPO, encoding: 'utf8' },
    );

    expect(d1saMigration).toBe(d1saAtApprovedBase);
    expect(d1saMigration).toContain('D1S-A — deployed security containment');
    expect(d1saMigration).toContain('bk_2026_08_22_flags');
    expect(d1saMigration).toContain('flags status update by any authenticated');
    expect(executableSql).not.toMatch(/2026-08-27_d1sa_deployed_security_containment/i);
    expect(executableSql).not.toMatch(/(?:create|drop)\s+table[^;]*bk_2026_08_22/i);
    expect(executableSql).not.toMatch(/alter\s+schema/i);
  });

  it('creates a client-inaccessible lock that survives until public.users cascades', () => {
    expect(migration).toMatch(
      /create\s+table\s+if\s+not\s+exists\s+public\.account_deletion_locks\s*\(\s*user_id\s+uuid\s+primary\s+key\s+references\s+public\.users\(id\)\s+on\s+delete\s+cascade/i,
    );
    expect(migration).toMatch(/alter\s+table\s+public\.account_deletion_locks\s+enable\s+row\s+level\s+security;/i);
    expect(migration).toMatch(
      /revoke\s+all\s+privileges\s+on\s+table\s+public\.account_deletion_locks\s+from\s+public,\s*anon,\s*authenticated;/i,
    );
    expect(migration).toMatch(
      /grant\s+select,\s*insert\s+on\s+table\s+public\.account_deletion_locks\s+to\s+service_role;/i,
    );
    expect(executableSql).not.toMatch(/create\s+policy[^;]*account_deletion_locks/i);
    expect(executableSql).not.toMatch(/delete\s+from\s+public\.account_deletion_locks/i);
  });
});

describe('D1 Option A lock-aware boundaries', () => {
  it('uses a zero-argument, restricted, search-path-pinned policy helper', () => {
    const helper = functionBody('current_account_can_write()');
    expect(helper).toMatch(/returns\s+boolean/i);
    expect(helper).toMatch(/stable/i);
    expect(helper).toMatch(/security\s+definer/i);
    expect(helper).toMatch(/set\s+search_path\s*=\s*''/i);
    expect(helper).toContain('(select auth.uid()) is not null');
    expect(helper).toMatch(/from\s+public\.users\s+as\s+account/i);
    expect(helper).toMatch(/from\s+public\.account_deletion_locks\s+as\s+lock/i);
    expect(helper).not.toMatch(/\bp_[a-z_]+\b/i);
    expect(migration).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.current_account_can_write\(\)\s+from\s+public,\s*anon;/i,
    );
    expect(migration).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.current_account_can_write\(\)\s+to\s+authenticated;/i,
    );
  });

  it.each(lockAwarePolicies)('%s replaces its permissive policy with the lock helper', (policy) => {
    expect(migration).toContain(`drop policy if exists "${policy}"`);
    const body = statementAfter(`create policy "${policy}"`);
    expect(body).toContain('(select public.current_account_can_write())');
  });

  it('retains anonymous reporting and anonymous feedback without a lock bypass for signed-in writers', () => {
    expect(executableSql).not.toContain('drop policy if exists "flags anon insert"');
    const feedback = statementAfter('create policy "feedback_insert_self_or_anon"');
    expect(feedback).toMatch(/user_id\s+is\s+null\s+or\s*\(/i);
    expect(feedback).toMatch(
      /user_id\s*=\s*\(select\s+auth\.uid\(\)\)\s+and\s*\(select\s+public\.current_account_can_write\(\)\)/i,
    );
  });

  it.each([
    'log_realtime_event(p_event text, p_channel text)',
    'increment_reopen_request(p_flag_id uuid)',
    'increment_dispute_request(p_flag_id uuid)',
  ])('%s rejects a locked caller before mutating state', (name) => {
    const body = functionBody(name);
    expect(body).toMatch(/security\s+definer/i);
    expect(body).toMatch(/set\s+search_path\s*=\s*''/i);
    expect(body).toContain('if not public.current_account_can_write() then');
    expect(body).toContain("raise exception 'Account is no longer active.'");
  });
});

describe('D1 Option A atomic purge RPC', () => {
  const purge = functionBody('purge_deleting_account(p_user_id uuid)');

  it('is service-role-only, requires the durable lock, and never deletes auth.users', () => {
    const lockCheck = purge.indexOf("raise exception 'Deletion lock is required.'");
    const firstDelete = purge.indexOf('delete from public.comment_votes');

    expect(purge).toMatch(/security\s+definer/i);
    expect(purge).toMatch(/set\s+search_path\s*=\s*''/i);
    expect(lockCheck).toBeGreaterThanOrEqual(0);
    expect(firstDelete).toBeGreaterThan(lockCheck);
    expect(purge).not.toMatch(/delete\s+from\s+auth\.users/i);
    expect(migration).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.purge_deleting_account\(uuid\)\s+from\s+public,\s*anon,\s*authenticated;/i,
    );
    expect(migration).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.purge_deleting_account\(uuid\)\s+to\s+service_role;/i,
    );
  });

  it.each([
    'public.flags',
    'public.flag_comments',
    'public.flag_photos',
    'public.flag_status_history',
    'public.flag_verifications',
    'public.flag_edit_history',
    'public.comment_votes',
    'public.feedback',
    'public.push_tokens',
    'public.notification_preferences',
    'public.realtime_subscribe_log',
    'public.point_events',
  ])('removes and verifies live account residue in %s', (table) => {
    expect(purge).toContain(table);
  });

  it.each(backupTables)('removes and verifies retained backup residue in %s', (table) => {
    expect(purge).toContain(`public.${table}`);
  });

  it('raises on a non-zero residue count so PostgreSQL rolls all database work back', () => {
    expect(purge).toContain('select count(*) into residue_count');
    expect(purge).toContain('if residue_count <> 0 then');
    expect(purge).toContain("raise exception 'Account deletion residue remains.'");
  });
});

describe('D1 Option A Edge Function ordering and retry safety', () => {
  it('uses only the authenticated subject and preserves the exact destructive order', () => {
    const lock = edgeFunction.indexOf('await createDeletionLock(userId);');
    const initialStorage = edgeFunction.indexOf('await clearAccountStorage(userId);');
    const purge = edgeFunction.indexOf('await purgeAccountDatabase(userId);');
    const finalStorage = edgeFunction.lastIndexOf('await clearAccountStorage(userId);');
    const storageCheck = edgeFunction.indexOf('await assertAccountStorageEmpty(userId);');
    const authDelete = edgeFunction.lastIndexOf('adminClient.auth.admin.deleteUser(userId)');

    expect(edgeFunction).toContain('const userId = user.id;');
    expect(edgeFunction).not.toMatch(/req\.json\(|p_user_id:\s*req/i);
    expect(lock).toBeGreaterThanOrEqual(0);
    expect(initialStorage).toBeGreaterThan(lock);
    expect(purge).toBeGreaterThan(initialStorage);
    expect(finalStorage).toBeGreaterThan(purge);
    expect(storageCheck).toBeGreaterThan(finalStorage);
    expect(authDelete).toBeGreaterThan(storageCheck);
    expect(edgeFunction).not.toMatch(/update\(\{\s*user_id:\s*null\s*\}\)/i);
  });

  it('traverses only the exact Storage namespace recursively, paginates, batches, and does not log identifiers', () => {
    expect(edgeFunction).toContain('const root = userId;');
    expect(edgeFunction).toContain('const folders = [root];');
    expect(edgeFunction).toContain('folders.push(path);');
    expect(edgeFunction).toContain('offset += STORAGE_PAGE_SIZE');
    expect(edgeFunction).toContain('limit: STORAGE_PAGE_SIZE');
    expect(edgeFunction).toContain('start += STORAGE_DELETE_BATCH_SIZE');
    expect(edgeFunction).toContain('paths.slice(start, start + STORAGE_DELETE_BATCH_SIZE)');
    expect(edgeFunction).toContain("console.error('[delete-account] cleanup failed.');");
    expect(edgeFunction).not.toMatch(/console\.(?:log|error|warn)\([^)]*userId/i);
    expect(edgeFunction).not.toMatch(/console\.(?:log|error|warn)\([^)]*path/i);
  });

  it('leaves a failed pre-auth deletion retryable and preserves the successful response contract', () => {
    expect(edgeFunction).toContain("return jsonResponse(200, { status: 'deleted' });");
    expect(edgeFunction).toContain('If any step before auth deletion fails, the deletion lock intentionally stays');
    expect(edgeFunction).toContain("return jsonResponse(500, { status: 'error', error: 'Deletion failed unexpectedly.' });");
  });
});

describe('D1 Option A user-facing deletion copy', () => {
  it('states full permanent deletion and removes the prior anonymous-report/support claims', () => {
    expect(profile).toContain('complete report trees');
    expect(profile).toContain('direct contributions, feedback, and uploaded photos');
    expect(profile).toContain('associated content');
    expect(profile).not.toContain('remain on the map anonymously');
    expect(profile).not.toContain('get in touch with support');
  });
});
