import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const r3 = read('supabase', 'migrations', '20260828010000_d1f4r3_source_closure.sql');
// The review resolver was superseded twice (FIX2 return contract, FIX3 audit
// ordering); behavior assertions on it must read the effective FIX3 body.
const fix3 = read('supabase', 'migrations', '20260828030000_d1f4r3_fix3_review_audit.sql');
const worker = read('supabase', 'functions', 'account-deletion-worker', 'index.ts');
const workerCore = read('supabase', 'functions', '_shared', 'accountDeletionWorkerCore.ts');
const review = read('supabase', 'functions', 'account-deletion-review', 'index.ts');
const ordinaryDelete = read('supabase', 'functions', 'delete-flag', 'index.ts');
const flags = read('src', 'lib', 'flags.ts');
const frozen = (name: string) => fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', name));

function slice(source: string, anchor: string): string {
  const start = source.indexOf(anchor);
  if (start < 0) throw new Error('Missing source anchor: ' + anchor);
  const end = source.indexOf('$$;', start);
  if (end < 0) throw new Error('Missing SQL function terminator after: ' + anchor);
  return source.slice(start, end + 3);
}

describe('D1F4R3 source-closure database contracts', () => {
  it('preserves the frozen containment and predecessor deletion migrations byte-for-byte', () => {
    expect(crypto.createHash('sha256').update(frozen('2026-08-27_d1sa_deployed_security_containment.sql')).digest('hex'))
      .toBe('d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d');
    expect(crypto.createHash('sha256').update(frozen('2026-08-27_d1_option_a_account_deletion.sql')).digest('hex'))
      .toBe('a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01');
  });

  it('routes every REQUESTED retry through LOCK_DRAIN and makes the drain proof mandatory before destructive work', () => {
    const retry = slice(r3, 'create or replace function public.retry_or_review_account_deletion');
    const resume = slice(r3, 'create or replace function public.resume_account_deletion_operation');
    const begin = slice(r3, 'create or replace function public.begin_account_deletion_cleaning');
    const purge = slice(r3, 'create or replace function public.purge_deleting_account');
    expect(retry).toContain("when v_operation.status = 'REQUESTED' then 'LOCK_DRAIN'");
    expect(retry).not.toContain("when v_operation.status = 'REQUESTED' then 'CLEANING'");
    expect(resume).toContain("when 'LOCK_DRAIN' then 'REQUESTED'");
    expect(begin).toContain('deletion_lock_confirmed_at is null');
    expect(purge).toContain('deletion_lock_confirmed_at is not null');
    expect(workerCore).toContain('await gateway.assertDeletionDrain');
    expect(workerCore.indexOf('assertDeletionDrain')).toBeLessThan(workerCore.indexOf('removeExactOwnedKeys'));
  });

  it('opens every held state with a bounded durable item and gives repeated Auth ambiguity a server-owned generation', () => {
    const move = slice(r3, 'create or replace function public.move_account_deletion_to_review');
    const retry = slice(r3, 'create or replace function public.retry_or_review_account_deletion');
    expect(r3).toContain('review_generation integer not null default 0');
    expect(r3).toContain('account_deletion_review_items_generation_key');
    expect(move).toContain('insert into public.account_deletion_review_items');
    expect(move.indexOf('insert into public.account_deletion_review_items')).toBeLessThan(move.indexOf("set status = 'FAILED_REVIEW_REQUIRED'"));
    expect(retry).toContain("'auth:' || p_operation_id::text");
    expect(retry).toContain('review_generation = v_generation');
  });

  it('makes replay idempotent and returns a truthful review state', () => {
    const resolve = slice(fix3, 'create or replace function public.resolve_account_deletion_review_item');
    expect(resolve).toContain("if v_item.resolution <> 'UNRESOLVED'");
    expect(resolve).toContain("if v_item.resolution <> p_action then");
    expect(resolve).toContain("raise exception 'Review item already has a different resolution.'");
    expect(resolve).toContain("'waiting_for_review'");
    expect(resolve).toContain("'requeued'");
    expect(review).toContain("parseReviewResolution(data)");
    expect(review).toContain('JSON.stringify(resolution)');
    expect(review).not.toContain("JSON.stringify({ status: 'requeued' })");
  });

  it('keeps PRESERVE_FOREIGN durable, non-authoritative, and revalidated against later owner changes', () => {
    const resolve = slice(fix3, 'create or replace function public.resolve_account_deletion_review_item');
    expect(resolve).toContain("disposition = 'PRESERVED_FOREIGN'");
    expect(resolve).toContain("Preserve requires a currently foreign exact object.");
    expect(r3).toContain('account_deletion_revalidate_preserved_foreign');
    expect(workerCore).toContain('preserved_foreign_owner_changed');
    expect(workerCore).toContain('await gateway.captureExactReviewObject');
  });

  it('records exact historical associations before purge and refuses to acknowledge an unresolved public-object obligation', () => {
    const capture = slice(r3, 'create or replace function public.capture_account_deletion_historical_evidence');
    const resolve = slice(fix3, 'create or replace function public.resolve_account_deletion_review_item');
    expect(capture).toContain('account_deletion_legacy_object_key_from_url');
    expect(capture).toContain("'LEGACY_AVATAR'");
    expect(capture).toContain("'LEGACY_PRIMARY_PHOTO'");
    expect(capture).toContain("'LEGACY_GALLERY_PHOTO'");
    expect(capture).toContain("'BACKUP_FLAG_PHOTO'");
    expect(capture).toContain("'BLOCKED_ASSOCIATION'");
    expect(resolve).toContain('Unknown historical association cannot be acknowledged.');
    expect(r3).toContain('account_deletion_terminal_evidence');
    expect(r3).toContain("'PROVED_ABSENT', 'PRESERVED_FOREIGN', 'NO_STORAGE_OBJECT_ASSOCIATED'");
  });

  it('keeps long exact keys out of source_ref and uses a unique production composite keyset cursor instead of offsets', () => {
    const capture = slice(r3, 'create or replace function public.capture_account_deletion_exact_review_object');
    const knownPage = slice(r3, 'create or replace function public.account_deletion_known_keys_page');
    expect(capture).toContain("'object:sha256:' || encode(extensions.digest(p_object_key, 'sha256'), 'hex')");
    expect(capture).toContain("'flag-photos', p_object_key");
    expect(knownPage).toContain('(c.object_key, c.source_ref, c.source_id) >');
    expect(knownPage).toContain('order by c.object_key asc, c.source_ref asc, c.source_id asc');
    expect(worker).toContain("rpc('account_deletion_known_keys_page'");
    expect(worker).not.toContain('.range(');
    expect(workerCore).toContain('collectCompositeKeysetPages');
  });

  it('rejects NULL privileged page limits and removes the obsolete bulk review surface', () => {
    const ownedPage = slice(r3, 'create or replace function public.account_deletion_storage_owned_page');
    expect(ownedPage).toContain('p_limit is null');
    expect(r3).toContain('drop function if exists public.resolve_account_deletion_review');
    expect(r3).toContain('revoke all on function public.account_deletion_known_keys_page');
    expect(r3).toContain('grant execute on function public.account_deletion_known_keys_page');
  });

  it('uses a narrow owner/admin report-delete route and retains relational evidence until exact Storage absence', () => {
    const plan = slice(r3, 'create or replace function public.account_deletion_prepare_flag_delete');
    const finalize = slice(r3, 'create or replace function public.account_deletion_finalize_flag_delete');
    expect(plan).toContain('v_flag.user_id <> p_actor_id');
    expect(plan).toContain('a.is_admin');
    expect(finalize).toContain('Canonical Storage cleanup is incomplete.');
    expect(r3).toContain('drop policy if exists "flag-photos admin delete"');
    expect(ordinaryDelete).toContain('caller.auth.getUser()');
    expect(ordinaryDelete).toContain("rpc('account_deletion_prepare_flag_delete'");
    expect(ordinaryDelete).toContain('await exactObject(item.objectKey)');
    expect(ordinaryDelete).toContain("rpc('account_deletion_finalize_flag_delete'");
    expect(flags).toContain("supabase.functions.invoke('delete-flag'");
    expect(flags).not.toContain('collectFlagPhotoCleanupPlan');
  });
});
