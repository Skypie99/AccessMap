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
const worker = read('supabase', 'functions', 'account-deletion-worker', 'index.ts');
const workerCore = read('supabase', 'functions', '_shared', 'accountDeletionWorkerCore.ts');
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
  'flags_user_scoped',
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

  it('fences the legacy owner ALL policy for locked-owner INSERT, UPDATE, and DELETE paths', () => {
    const legacyOwnerPolicy = statementAfter('create policy "flags_user_scoped"');
    const lockedOwnerPredicate =
      /\(select\s+auth\.uid\(\)\)\s*=\s*user_id\s+and\s+\(select\s+public\.current_account_can_write\(\)\)/i;

    // The old TO public policy's auth.uid owner condition could not pass for
    // anonymous callers. The authenticated scope preserves that behavior and
    // avoids granting anon access to the authenticated-only lock helper.
    expect(legacyOwnerPolicy).toMatch(/on\s+public\.flags\s+for\s+all\s+to\s+authenticated/i);
    // WITH CHECK governs INSERT (and the new row of UPDATE); USING governs
    // UPDATE's old row and DELETE. A locked owner fails both policy paths.
    expect(legacyOwnerPolicy).toMatch(new RegExp(`using\\s*\\(\\s*${lockedOwnerPredicate.source}`, 'i'));
    expect(legacyOwnerPolicy).toMatch(new RegExp(`with\\s+check\\s*\\(\\s*${lockedOwnerPredicate.source}`, 'i'));
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

  it('captures subject point-event ids before live deletion and uses the complete predicate for backup links', () => {
    const capture = purge.indexOf('into backup_point_event_ids');
    const liveEventDelete = purge.indexOf('delete from public.point_events where user_id = p_user_id;');
    const backupLinkDelete = purge.indexOf('delete from public.bk_2026_08_22_point_links');
    const backupLinkResidue = purge.lastIndexOf('union all select 1 from public.bk_2026_08_22_point_links');
    const completePredicate =
      /point_event_id\s*=\s*any\(backup_point_event_ids\)\s+or\s+flag_id\s*=\s*any\(backup_flag_ids\)/i;

    expect(purge).toContain("backup_point_event_ids bigint[] := '{}'::bigint[];");
    expect(purge).toContain("select coalesce(array_agg(id), '{}'::bigint[])");
    expect(capture).toBeGreaterThanOrEqual(0);
    expect(liveEventDelete).toBeGreaterThan(capture);
    expect(backupLinkDelete).toBeGreaterThan(liveEventDelete);
    expect(backupLinkResidue).toBeGreaterThan(backupLinkDelete);
    expect(purge.slice(backupLinkDelete, backupLinkResidue)).toMatch(completePredicate);
    expect(purge.slice(backupLinkResidue)).toMatch(completePredicate);
  });

  it('models cross-owner point links and a no-live-row retry without deleting another account’s content', () => {
    const shouldDeleteBackupLink = (
      link: { pointEventId: number; flagId: string },
      subjectPointEventIds: number[],
      subjectBackupFlagIds: string[],
    ) =>
      subjectPointEventIds.includes(link.pointEventId) || subjectBackupFlagIds.includes(link.flagId);

    // User A earned event 101 for activity on User B's flag. User B's event
    // and report stay intact when A's event-linked backup row is removed.
    const backupLinks = [
      { pointEventId: 101, flagId: 'user-b-flag' },
      { pointEventId: 202, flagId: 'user-b-flag' },
    ];
    const afterUserADeletion = backupLinks.filter(
      (link) => !shouldDeleteBackupLink(link, [101], ['user-a-flag']),
    );

    expect(afterUserADeletion).toEqual([{ pointEventId: 202, flagId: 'user-b-flag' }]);
    // Once the subject's live event and owned-backup rows are already absent,
    // the coalesced empty arrays make a retry a no-op for User B's row.
    expect(
      afterUserADeletion.filter((link) => shouldDeleteBackupLink(link, [], [])),
    ).toEqual([]);
  });

  it('raises on a non-zero residue count so PostgreSQL rolls all database work back', () => {
    expect(purge).toContain('select count(*) into residue_count');
    expect(purge).toContain('if residue_count <> 0 then');
    expect(purge).toContain("raise exception 'Account deletion residue remains.'");
  });
});

describe('D1F4 request endpoint and worker split', () => {
  it('uses the authenticated subject only to commit a durable request; it never performs destructive work', () => {
    expect(edgeFunction).toContain('p_subject_id: user.id');
    expect(edgeFunction).toContain('p_operation_id: body.operationId');
    expect(edgeFunction).toContain('p_receipt_hash: await sha256Hex(body.receiptSecret)');
    expect(edgeFunction).toContain("return json(202, { status: 'requested', requestedAt: data.requested_at });");
    expect(edgeFunction).not.toMatch(/p_subject_id:\s*body\./i);
    expect(edgeFunction).not.toMatch(/storage\.from\(/i);
    expect(edgeFunction).not.toMatch(/auth\.admin\.deleteUser/i);
  });

  it('keeps exact-key storage reconciliation and Auth deletion in the worker, with Auth last', () => {
    const exactStorageDelete = worker.indexOf('admin.storage.from(BUCKET).remove');
    const authDelete = worker.indexOf('admin.auth.admin.deleteUser(subjectId)');
    const coreStorageDelete = workerCore.indexOf('await gateway.removeExactOwnedKeys');
    const coreAuthDelete = workerCore.indexOf('await deleteAuthLast(gateway, operation');

    expect(worker).toContain("const { data, error } = await admin.rpc('claim_next_account_deletion_operation'");
    expect(worker).toContain("lock: (operationId, leaseToken) => rpcOperation('lock_requested_account_deletion'");
    expect(workerCore).toContain('await gateway.lock(operation.operation_id, leaseToken)');
    expect(worker).not.toMatch(/\.list\(/i);
    expect(exactStorageDelete).toBeGreaterThanOrEqual(0);
    expect(authDelete).toBeGreaterThanOrEqual(0);
    expect(coreStorageDelete).toBeGreaterThanOrEqual(0);
    expect(coreAuthDelete).toBeGreaterThan(coreStorageDelete);
    expect(worker).not.toMatch(/console\.(?:log|error|warn)\([^)]*(?:subject_id|object_key|operation_id)/i);
  });

  it('uses a receipt-recoverable request response rather than claiming immediate deletion', () => {
    expect(edgeFunction).toContain("return json(202, { status: 'requested', requestedAt: data.requested_at });");
    expect(edgeFunction).toContain("return json(409, { status: 'error' });");
    expect(edgeFunction).toContain('The already stored receipt is the recovery capability.');
    expect(edgeFunction).not.toMatch(/status:\s*['\"]deleted['\"]/i);
  });
});

describe('D1F4 user-facing deletion copy', () => {
  it('states asynchronous deletion and local completion confirmation without an unsupported time promise', () => {
    expect(profile).toContain('This starts deletion of your account and associated content. Deletion happens asynchronously and cannot be undone.');
    expect(profile).toContain('This device will show confirmation when deletion is complete.');
    expect(profile).not.toMatch(/\b30\s*(?:calendar\s*)?days?\b/i);
    expect(profile).not.toContain('remain on the map anonymously');
    expect(profile).not.toContain('get in touch with support');
  });
});
