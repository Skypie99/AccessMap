import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const originalMigration = read('supabase', 'migrations', '2026-08-27_d1f4_async_account_deletion.sql');
const repairMigration = read('supabase', 'migrations', '20260828000000_d1f4r2_source_repair.sql');
const worker = read('supabase', 'functions', 'account-deletion-worker', 'index.ts');
const workerCore = read('supabase', 'functions', '_shared', 'accountDeletionWorkerCore.ts');
const review = read('supabase', 'functions', 'account-deletion-review', 'index.ts');
const request = read('supabase', 'functions', 'delete-account', 'index.ts');
const status = read('supabase', 'functions', 'account-deletion-status', 'index.ts');
const sharedSupabase = read('supabase', 'functions', '_shared', 'supabase.ts');
const rootConfig = read('supabase', 'config.toml');
const profile = read('src', 'screens', 'ProfileScreen.tsx');
const availability = read('src', 'lib', 'accountDeletionAvailability.ts');
const packageJson = read('package.json');
const packageLock = read('package-lock.json');
const frozen = (name: string) => fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', name));

function slice(source: string, anchor: string): string {
  const start = source.indexOf(anchor);
  if (start < 0) throw new Error('Missing source anchor: ' + anchor);
  const end = source.indexOf('$$;', start);
  if (end < 0) throw new Error('Missing SQL function terminator after: ' + anchor);
  return source.slice(start, end + 3);
}

describe('D1F4R2 source and database-contract guards', () => {
  it('preserves both frozen predecessor migrations byte-for-byte', () => {
    expect(crypto.createHash('sha256').update(frozen('2026-08-27_d1sa_deployed_security_containment.sql')).digest('hex'))
      .toBe('d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d');
    expect(crypto.createHash('sha256').update(frozen('2026-08-27_d1_option_a_account_deletion.sql')).digest('hex'))
      .toBe('a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01');
  });

  it('preserves the accepted P0 fence/provenance repair and adds photo_alt to the anonymous boundary', () => {
    const trigger = slice(originalMigration, 'create or replace function public.prevent_untrusted_flag_photo_provenance_write');
    expect(trigger).toContain("current_setting('app.d1f4_trusted_photo_commit', true)");
    expect(originalMigration).toContain("set deletion_fence_version = deletion_fence_version + 1");
    expect(repairMigration).toContain('flags_anonymous_photo_free');
    expect(repairMigration).toContain('and photo_alt is null');
    expect(repairMigration).toContain('not valid');
  });

  it('uses exact text-safe owner comparisons and a narrow fixed-bucket Storage metadata boundary', () => {
    const exact = slice(repairMigration, 'create or replace function public.account_deletion_storage_exact_object');
    const page = slice(repairMigration, 'create or replace function public.account_deletion_storage_owned_page');
    expect(exact).toContain("o.bucket_id = 'flag-photos'");
    expect(page).toContain('o.owner_id::text = p_subject_id::text');
    expect(page).toContain('order by o.name asc');
    expect(page).toContain('p_limit > 100');
    expect(repairMigration).toContain('owner_id::text = v_intent.subject_id::text');
    expect(repairMigration).not.toMatch(/owner_id::uuid/);
    expect(worker).not.toContain("schema('storage')");
    expect(worker).toContain("rpc('account_deletion_storage_exact_object'");
    expect(worker).toContain("rpc('account_deletion_storage_owned_page'");
    expect(workerCore).toContain('hasExactTextOwner');
  });

  it('records legacy avatar, primary/gallery, and backup-photo evidence before purge can erase it', () => {
    const capture = slice(repairMigration, 'create or replace function public.capture_account_deletion_historical_evidence');
    expect(capture).toContain("'LEGACY_AVATAR'");
    expect(capture).toContain("'LEGACY_PRIMARY_PHOTO'");
    expect(capture).toContain("'LEGACY_GALLERY_PHOTO'");
    expect(capture).toContain("'BACKUP_FLAG_PHOTO'");
    expect(capture).not.toContain('photo_url)');
    expect(workerCore).toContain('captureHistoricalEvidence');
    expect(workerCore.indexOf('captureHistoricalEvidence')).toBeLessThan(workerCore.indexOf('completeStoragePlan'));
  });

  it('uses bounded server-owned review items, never a client-supplied bulk inventory', () => {
    expect(repairMigration).toContain('create table if not exists public.account_deletion_review_items');
    expect(repairMigration).toContain('resolve_account_deletion_review_item');
    expect(repairMigration).toContain('unique (operation_id, kind, source_ref)');
    expect(repairMigration).toContain('revoke all on function public.resolve_account_deletion_review');
    expect(review).toContain('p_review_item_id: body.reviewItemId');
    expect(review).toContain('p_action: body.action');
    expect(review).not.toContain('absentIntentIds');
    expect(review).not.toContain('exactObjectKeys');
  });

  it('gives upload ambiguity and thresholded Auth ambiguity one bounded review item so neither can dead-end', () => {
    const capture = slice(repairMigration, 'create or replace function public.capture_account_deletion_historical_evidence');
    const retry = slice(repairMigration, 'create or replace function public.retry_or_review_account_deletion');
    expect(capture).toContain("'UPLOAD_INTENT'");
    expect(capture).toContain("'intent:' || i.intent_id::text");
    expect(retry).toContain("'AUTH_OUTCOME_AMBIGUOUS'");
    expect(retry).toContain("'auth:' || p_operation_id::text");
    expect(repairMigration).toContain("set status = 'CANCELLED', review_reason = 'sky_reviewed_account_deletion'");
  });

  it('persists Auth reconciliation through retry threshold and never uses review as a false COMPLETE shortcut', () => {
    const retry = slice(repairMigration, 'create or replace function public.retry_or_review_account_deletion');
    const move = slice(repairMigration, 'create or replace function public.move_account_deletion_to_review');
    const resolve = slice(repairMigration, 'create or replace function public.resolve_account_deletion_review_item');
    expect(retry).toContain("when p_error_code = 'auth_outcome_ambiguous' then 'AUTH_RECONCILIATION'");
    expect(retry).toContain('review_resume_from = v_resume_from');
    expect(move).toContain("'AUTH_RECONCILIATION'");
    expect(resolve).toContain("then 'RETRY_REQUIRED' else 'CLEANING' end");
    expect(resolve).not.toContain("'COMPLETE'");
    expect(workerCore).toContain('await reconcileAuth');
  });

  it('uses deterministic pagination and final lease revalidation for every real Storage delete batch', () => {
    expect(worker).toContain('collectKeysetPages');
    expect(worker).toContain('ACCOUNT_DELETION_PAGE_SIZE');
    expect(worker).toContain('removeCheckedStorageBatches');
    expect(worker).toContain('admin.storage.from(BUCKET).remove');
    expect(worker).not.toContain('.storage.from(BUCKET).list(');
    expect(workerCore).toContain('storage inventory page is not strictly ordered');
    expect(workerCore).toContain('await renewLease();\n    await remove(batch);');
    expect(workerCore).toContain('completeStoragePlan(');
    expect(workerCore).toContain('finalPlan.knownKeys');
  });

  it('makes the web path truthful before confirmation while leaving native flow intact', () => {
    expect(availability).toContain("if (platform === 'web')");
    expect(availability).toContain('No deletion request was made.');
    expect(profile).toContain('const handleOpenAccountDeletion');
    expect(profile).toContain('onPress={handleOpenAccountDeletion}');
    expect(profile).toContain('await deleteAccount(user.id)');
  });

  it('pins all four D1F4 Edge imports and the matching root dependency exactly', () => {
    expect(sharedSupabase).toContain('npm:@supabase/supabase-js@2.106.2');
    for (const source of [worker, review, request, status]) {
      expect(source).toContain("from '../_shared/supabase.ts'");
      expect(source).not.toContain('https://esm.sh/@supabase/supabase-js');
    }
    expect(packageJson).toContain('"@supabase/supabase-js": "2.106.2"');
    expect(packageLock).toContain('"@supabase/supabase-js": "2.106.2"');
  });

  it('retains the root function configuration and browser handler authorization', () => {
    expect(rootConfig).toContain('[functions.delete-account]');
    expect(rootConfig).toContain('[functions.account-deletion-worker]');
    expect(rootConfig).toContain('[functions.account-deletion-status]');
    expect(rootConfig).toContain('[functions.account-deletion-review]');
    expect(request).toContain('caller.auth.getUser()');
    expect(status).toContain('p_receipt_hash: await sha256Hex(body.receiptSecret)');
  });
});
