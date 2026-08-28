// Source-level D1F4 contract guards. These preserve the forward-only design
// around the actual SQL and worker sources; the accompanying client tests
// exercise lost-response and failed authoritative-commit paths. Hosted
// PostgreSQL/Storage ordering remains an explicit staging acceptance gate.
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const migration = fs.readFileSync(path.join(ROOT, 'supabase/migrations/2026-08-27_d1f4_async_account_deletion.sql'), 'utf8');
const worker = fs.readFileSync(path.join(ROOT, 'supabase/functions/account-deletion-worker/index.ts'), 'utf8');
const request = fs.readFileSync(path.join(ROOT, 'supabase/functions/delete-account/index.ts'), 'utf8');
const frozen = (name: string) => fs.readFileSync(path.join(ROOT, 'supabase/migrations', name));
const slice = (source: string, anchor: string) => source.slice(source.indexOf(anchor), source.indexOf('$$;', source.indexOf(anchor)) + 3);

describe('D1F4 forward-only deletion control plane', () => {
  it('does not modify either frozen D1 artifact', () => {
    expect(crypto.createHash('sha256').update(frozen('2026-08-27_d1sa_deployed_security_containment.sql')).digest('hex'))
      .toBe('d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d');
    expect(crypto.createHash('sha256').update(frozen('2026-08-27_d1_option_a_account_deletion.sql')).digest('hex'))
      .toBe('a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01');
  });

  it('keeps REQUESTED as the immediate operation fence and Transaction B as the drain/version transition', () => {
    const transactionA = slice(migration, 'create or replace function public.request_account_deletion');
    const transactionB = slice(migration, 'create or replace function public.lock_requested_account_deletion');
    expect(transactionA).toContain("'REQUESTED'");
    expect(transactionA).not.toContain('set deletion_fence_version');
    expect(transactionB).toContain('for update');
    expect(transactionB).toContain('set deletion_fence_version = v_fence + 1');
    expect(transactionB).toContain("status = 'LOCKED'");
    expect(migration).toContain('for key share');
  });

  it('closes authenticated NULL-feedback bypass and has no new URL/prefix ownership rule', () => {
    expect(migration).toContain('create policy "feedback_insert_anon_only" on public.feedback for insert to anon');
    expect(migration).toContain('create policy "feedback_insert_authenticated_self" on public.feedback for insert to authenticated');
    expect(migration).toContain('user_id = (select auth.uid()) and (select public.current_account_can_write())');
    expect(migration).not.toContain("position('/flag-photos/");
    expect(migration).not.toContain('storage.foldername');
  });

  it('models an uncertain direct upload as a durable review hold, never an automatic terminal proof', () => {
    expect(migration).toContain("status in ('PREPARED', 'COMMITTED', 'CANCELLED', 'AMBIGUOUS')");
    expect(migration).toContain("set status = 'AMBIGUOUS'");
    expect(migration).toContain("return 'unresolved_upload_intent'");
    expect(migration).toContain('account_deletion_requires_review(p_operation_id)');
    expect(worker).toContain('assertExactKeysAbsent');
    expect(worker).not.toContain('.storage.from(BUCKET).list(');
  });

  it('keeps Auth last and commits completion only after reconciliation/redaction', () => {
    expect(worker.indexOf('mark_account_deletion_ready_for_auth')).toBeLessThan(worker.indexOf('admin.auth.admin.deleteUser'));
    expect(worker.indexOf('admin.auth.admin.deleteUser')).toBeLessThan(worker.indexOf('complete_account_deletion'));
    expect(migration).toContain("status = 'COMPLETE', completed_at = now()");
    expect(migration).toContain('subject_id = null');
    expect(request).toContain('p_subject_id: user.id');
  });
});
