import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const migration = read('supabase', 'migrations', '2026-08-27_d1f4_async_account_deletion.sql');
const worker = read('supabase', 'functions', 'account-deletion-worker', 'index.ts');
const request = read('supabase', 'functions', 'delete-account', 'index.ts');
const status = read('supabase', 'functions', 'account-deletion-status', 'index.ts');
const rootConfig = read('supabase', 'config.toml');
const profile = read('src', 'screens', 'ProfileScreen.tsx');
const receipts = read('src', 'lib', 'accountDeletionReceipt.ts');
const frozen = (name: string) => fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', name));

function slice(source: string, anchor: string): string {
  const start = source.indexOf(anchor);
  if (start < 0) throw new Error(`Missing source anchor: ${anchor}`);
  const end = source.indexOf('$$;', start);
  if (end < 0) throw new Error(`Missing SQL function terminator after: ${anchor}`);
  return source.slice(start, end + 3);
}

describe('D1F4R source safety guards', () => {
  it('preserves both frozen predecessor migrations byte-for-byte', () => {
    expect(crypto.createHash('sha256').update(frozen('2026-08-27_d1sa_deployed_security_containment.sql')).digest('hex'))
      .toBe('d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d');
    expect(crypto.createHash('sha256').update(frozen('2026-08-27_d1_option_a_account_deletion.sql')).digest('hex'))
      .toBe('a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01');
  });

  it('blocks the W-D1F4 anonymous forged-provenance attack at the database boundary and before worker Storage deletion', () => {
    const trigger = slice(migration, 'create or replace function public.prevent_untrusted_flag_photo_provenance_write');
    expect(migration).toContain('create policy "flags anon insert" on public.flags for insert to anon');
    expect(migration).toContain('user_id is null\n    and photo_url is null\n    and photo_object_key is null\n    and photo_uploader_id is null');
    expect(trigger).toContain("current_setting('app.d1f4_trusted_photo_commit', true)");
    expect(trigger).toContain("tg_op = 'INSERT'");
    expect(trigger).toContain('Canonical flag photo metadata is server managed.');
    expect(slice(migration, 'create or replace function public.commit_flag_photo_upload'))
      .toContain("set_config('app.d1f4_trusted_photo_commit', '1', true)");
    // The exact victim-key / forged uploader path is denied even if a malformed
    // application row exists: worker cleanup checks authoritative exact owner.
    expect(worker).toContain('canonical_key_has_foreign_storage_owner');
    expect(worker).toContain('storage_owner_changed_before_delete');
    expect(worker).toContain('never infer ownership from photo_uploader_id');
  });

  it('makes Transaction A the immediate stale-snapshot fence without making it the writer drain', () => {
    const transactionA = slice(migration, 'create or replace function public.request_account_deletion');
    const transactionB = slice(migration, 'create or replace function public.lock_requested_account_deletion');
    expect(transactionA).toContain("'REQUESTED'");
    expect(transactionA).toContain('set deletion_fence_version = deletion_fence_version + 1');
    expect(transactionA).not.toMatch(/from\s+public\.users[\s\S]{0,160}for\s+update/i);
    expect(transactionB).toContain('for update');
    expect(transactionB).toContain("status = 'LOCKED'");
    expect(migration).toContain('for key share');
  });

  it('uses the correct UUID comparison for every Storage owner expression', () => {
    const unsafeOwnerComparison = /owner_id\s*=\s*(?:\(select\s+)?(?:auth\.uid\(\)|v_[a-z_]+\.subject_id|v_operation\.subject_id)/i;
    expect(migration).toContain('owner_id::uuid');
    expect(migration).not.toMatch(unsafeOwnerComparison);
    expect(worker).toContain(".eq('owner_id', subjectId)");
    expect(worker).toContain('hasExactOwner');
  });

  it('persists AMBIGUOUS rather than raising it away inside the finalization transaction', () => {
    const photoCommit = slice(migration, 'create or replace function public.commit_flag_photo_upload');
    const avatarCommit = slice(migration, 'create or replace function public.commit_avatar_photo_upload');
    expect(photoCommit).toContain("set status = 'AMBIGUOUS'");
    expect(photoCommit).toContain("return 'AMBIGUOUS'");
    expect(photoCommit).not.toContain("raise exception 'Photo upload outcome requires review.'");
    expect(avatarCommit).toContain("'AMBIGUOUS'::text");
    expect(avatarCommit).not.toContain("raise exception 'Avatar upload outcome requires review.'");
  });

  it('keeps cancelled exact keys and requires a database-side exact absence check before cancellation', () => {
    const review = slice(migration, 'create or replace function public.resolve_account_deletion_review');
    expect(review.indexOf('insert into public.account_deletion_review_objects')).toBeLessThan(review.indexOf("set status = 'CANCELLED'"));
    expect(review).toContain('Visible intent object cannot be resolved as absent.');
    expect(review).toContain('Reviewed key set is not the complete owner inventory.');
    expect(worker).toContain(".select('object_key').eq('subject_id', subjectId).range(from, to)");
  });

  it('preserves a durable, safe retry phase and requires current lease ownership for every transition', () => {
    const retry = slice(migration, 'create or replace function public.retry_or_review_account_deletion');
    const beginCleaning = slice(migration, 'create or replace function public.begin_account_deletion_cleaning');
    const purge = slice(migration, 'create or replace function public.purge_deleting_account');
    expect(migration).toContain('resume_from text check');
    expect(retry).toContain("when v_operation.status = 'REQUESTED' then 'LOCK_DRAIN'");
    expect(retry).toContain("when v_operation.status = 'VERIFYING' then 'VERIFYING'");
    expect(retry).toContain("when p_error_code = 'auth_outcome_ambiguous' then 'AUTH_RECONCILIATION'");
    expect(migration).toContain('create or replace function public.resume_account_deletion_operation');
    expect(beginCleaning).not.toContain("'RETRY_REQUIRED'");
    expect(purge).toContain('p_lease_token uuid');
    expect(purge).toContain('worker_lease_token = p_lease_token');
    expect(worker).toContain("rpcOperation('renew_account_deletion_lease'");
    expect(worker.indexOf('await renewLease(operation.operation_id, leaseToken);\n    const { error } = await admin.auth.admin.deleteUser'))
      .toBeGreaterThanOrEqual(0);
  });

  it('uses explicit pagination for exact-key evidence and complete Storage owner inventory', () => {
    expect(worker).toContain('const PAGE_SIZE = 100');
    expect(worker).toContain('async function allRows');
    expect(worker).toContain('.range(from, to)');
    expect(worker).toContain('async function subjectOwnedStorageInventory');
    expect(worker).toContain('unexpected_subject_owned_storage_object');
    expect(worker).toContain('assertCompleteStorageInventory');
    expect(worker).not.toContain('.storage.from(BUCKET).list(');
  });

  it('defines authoritative root function configuration and browser CORS without weakening handler authorization', () => {
    expect(rootConfig).toContain('[functions.delete-account]');
    expect(rootConfig).toContain('[functions.account-deletion-worker]');
    expect(rootConfig).toContain('[functions.account-deletion-status]');
    expect(rootConfig).toContain('[functions.account-deletion-review]');
    expect(rootConfig).toContain('verify_jwt = false');
    expect(request).toContain("if (req.method === 'OPTIONS') return corsPreflight();");
    expect(status).toContain("if (req.method === 'OPTIONS') return corsPreflight();");
    expect(request).toContain('caller.auth.getUser()');
    expect(status).toContain('p_receipt_hash: await sha256Hex(body.receiptSecret)');
    expect(fs.existsSync(path.join(ROOT, 'supabase/functions/delete-account/config.toml'))).toBe(false);
  });

  it('does not emulate SecureStore on web, keeps native receipts operation-keyed, and exposes signed-in recovery', () => {
    expect(receipts).toContain("if (Platform.OS === 'web') throw new AccountDeletionReceiptUnavailableError()");
    expect(receipts).toContain('flagstone.accountDeletionReceipt.v2.');
    expect(receipts).toContain('pendingBySubject');
    expect(receipts).not.toMatch(/localStorage|AsyncStorage/);
    expect(profile).toContain('refreshAccountDeletionStatus');
    expect(profile).toContain('Check deletion status');
    expect(profile).toContain('AccountDeletionReceiptUnavailableError');
  });

  it('keeps Auth-last ordering and requires final inventory before COMPLETE', () => {
    const readyForAuth = worker.indexOf('mark_account_deletion_ready_for_auth');
    const authDelete = worker.indexOf('admin.auth.admin.deleteUser(operation.subject_id)');
    const complete = worker.indexOf("rpcVoid('complete_account_deletion'");
    const finalInventory = worker.lastIndexOf('assertCompleteStorageInventory');
    expect(readyForAuth).toBeGreaterThanOrEqual(0);
    expect(authDelete).toBeGreaterThan(readyForAuth);
    expect(complete).toBeGreaterThan(authDelete);
    expect(finalInventory).toBeLessThan(complete);
    expect(migration).toContain("status = 'COMPLETE', completed_at = now()");
    expect(migration).toContain('subject_id = null');
  });
});
