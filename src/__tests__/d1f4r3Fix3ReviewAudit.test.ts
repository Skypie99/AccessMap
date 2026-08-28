import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const FIX3_NAME = '20260828030000_d1f4r3_fix3_review_audit.sql';
const fix3 = fs.readFileSync(path.join(MIGRATIONS_DIR, FIX3_NAME), 'utf8');
const fix2 = fs.readFileSync(
  path.join(MIGRATIONS_DIR, '20260828020000_d1f4r3_fix2_review_replay_and_flag_delete.sql'),
  'utf8',
);

function resolverBody(source: string): string {
  const start = source.indexOf('function public.resolve_account_deletion_review_item');
  if (start < 0) throw new Error('resolver definition missing');
  const end = source.indexOf('$$;', start);
  if (end < 0) throw new Error('resolver terminator missing');
  return source.slice(start, end + 3);
}

const body = resolverBody(fix3);

describe('D1F4R3-FIX3 review-audit evidence chain', () => {
  it('is the effective resolver: no later migration redefines the function', () => {
    const later = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith('.sql') && name > FIX3_NAME)
      .filter((name) =>
        fs
          .readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8')
          .includes('function public.resolve_account_deletion_review_item'),
      );
    expect(later).toEqual([]);
    expect(fix3).toContain('create or replace function public.resolve_account_deletion_review_item');
  });

  it('marks the item resolved, then writes the audit row, and only then returns waiting_for_review', () => {
    const resolveAt = body.indexOf('set resolution = p_action');
    const auditAt = body.indexOf('insert into public.account_deletion_review_audit');
    const waitingReturnAt = body.indexOf("'waiting_for_review'", resolveAt);
    expect(resolveAt).toBeGreaterThan(-1);
    expect(auditAt).toBeGreaterThan(resolveAt);
    expect(waitingReturnAt).toBeGreaterThan(auditAt);
  });

  it('writes the audit row before the final resume-state transition so both success paths share one INSERT', () => {
    const auditAt = body.indexOf('insert into public.account_deletion_review_audit');
    const nonFinalBranchAt = body.indexOf('if v_has_other_unresolved then', auditAt);
    const resumeUpdateAt = body.indexOf('update public.account_deletion_operations');
    expect(nonFinalBranchAt).toBeGreaterThan(auditAt);
    expect(resumeUpdateAt).toBeGreaterThan(nonFinalBranchAt);
    expect(body.split('insert into public.account_deletion_review_audit')).toHaveLength(2);
  });

  it('records the supplied evidence digest through the existing audit model, no second audit system', () => {
    const auditAt = body.indexOf('insert into public.account_deletion_review_audit');
    const insertValues = body.slice(auditAt, body.indexOf(');', auditAt));
    expect(insertValues).toContain('p_evidence_digest');
    expect(insertValues).toContain("'privacy_reviewer', 'sky', 'review_item_' || p_action");
    expect(fix3).not.toContain('create table');
  });

  it('keeps the resolved-item replay branch ahead of every first-resolution effect so replay cannot duplicate audit evidence', () => {
    const replayAt = body.indexOf("if v_item.resolution <> 'UNRESOLVED' then");
    const conflictAt = body.indexOf("raise exception 'Review item already has a different resolution.'");
    const resolveAt = body.indexOf('set resolution = p_action');
    const auditAt = body.indexOf('insert into public.account_deletion_review_audit');
    expect(replayAt).toBeGreaterThan(-1);
    expect(conflictAt).toBeGreaterThan(replayAt);
    expect(conflictAt).toBeLessThan(resolveAt);
    expect(replayAt).toBeLessThan(resolveAt);
    expect(replayAt).toBeLessThan(auditAt);
    expect(body.slice(replayAt, resolveAt)).toContain("v_operation.status = 'COMPLETE'");
  });

  it('keeps the accepted FIX2 replay ordering: replay truth before the subject_id guard, fail-closed resume validation before consuming the item', () => {
    const replayAt = body.indexOf("if v_item.resolution <> 'UNRESOLVED' then");
    const subjectGuardAt = body.indexOf("v_operation.status <> 'FAILED_REVIEW_REQUIRED' or v_operation.subject_id is null");
    const phaseGuardAt = body.indexOf("raise exception 'Deletion review has no safe resume phase.'");
    const resolveAt = body.indexOf('set resolution = p_action');
    expect(subjectGuardAt).toBeGreaterThan(replayAt);
    expect(phaseGuardAt).toBeGreaterThan(subjectGuardAt);
    expect(phaseGuardAt).toBeLessThan(resolveAt);
  });

  it('preserves the accepted FIX2 review resume phase mapping exactly', () => {
    expect(body).toContain("when 'LOCK_DRAIN' then 'REQUESTED'");
    expect(body).toContain("when 'CLEANING' then 'CLEANING'");
    expect(body).toContain("when 'VERIFYING' then 'VERIFYING'");
    expect(body).toContain("when 'AUTH_DELETE' then 'READY_FOR_AUTH_DELETE'");
    expect(body).toContain("when 'AUTH_RECONCILIATION' then 'RETRY_REQUIRED'");
    expect(body).not.toContain("then 'COMPLETE'");
    expect(body).not.toContain("set status = 'COMPLETE'");
  });

  it('changes only the resolver: no table DDL, no policy changes, no flags or Storage statements, service-role-only grant re-asserted', () => {
    expect(fix3).not.toContain('alter table');
    expect(fix3).not.toContain('create policy');
    expect(fix3).not.toContain('drop policy');
    expect(fix3).not.toContain('on table public.flags');
    expect(fix3).not.toContain('storage.buckets');
    expect(fix3).not.toContain('verify_jwt');
    expect(fix3).toContain(
      'revoke all on function public.resolve_account_deletion_review_item(uuid, text, uuid, text)\n  from public, anon, authenticated;',
    );
    expect(fix3).toContain(
      'grant execute on function public.resolve_account_deletion_review_item(uuid, text, uuid, text)\n  to service_role;',
    );
  });

  it('leaves the accepted FIX2 direct-DELETE containment fully intact', () => {
    expect(fix2).toContain('revoke delete on table public.flags from public, anon, authenticated;');
    expect(fix2).toContain('grant select, insert, update on table public.flags to authenticated;');
    expect(fix2).toContain('grant select, insert, update, delete on table public.flags to service_role;');
    expect(fix2).toContain('drop policy if exists "flags_user_scoped" on public.flags;');
    expect(fix2).toContain('drop policy if exists "flags delete own" on public.flags;');
    expect(fix2).toContain('drop policy if exists "admin delete any flag" on public.flags;');
    expect(fix3).not.toContain('grant delete');
  });

  it('preserves both frozen migrations exactly', () => {
    const frozen = (name: string) => fs.readFileSync(path.join(MIGRATIONS_DIR, name));
    expect(crypto.createHash('sha256').update(frozen('2026-08-27_d1sa_deployed_security_containment.sql')).digest('hex'))
      .toBe('d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d');
    expect(crypto.createHash('sha256').update(frozen('2026-08-27_d1_option_a_account_deletion.sql')).digest('hex'))
      .toBe('a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01');
  });
});
