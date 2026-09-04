import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  processAccountDeletion,
  type AccountDeletionOperation,
  type AccountDeletionWorkerGateway,
  type RetryPhase,
} from '../../supabase/functions/_shared/accountDeletionWorkerCore';
import { parseReviewResolution } from '../../supabase/functions/_shared/accountDeletionReviewCore';

const ROOT = path.resolve(__dirname, '..', '..');
const fix = fs.readFileSync(
  path.join(ROOT, 'supabase', 'migrations', '20260828020000_d1f4r3_fix2_review_replay_and_flag_delete.sql'),
  'utf8',
);
// FIX3 supersedes the FIX2 resolver body (audit-before-return); resolver
// behavior assertions must target the effective definition, not FIX2's.
const fix3 = fs.readFileSync(
  path.join(ROOT, 'supabase', 'migrations', '20260828030000_d1f4r3_fix3_review_audit.sql'),
  'utf8',
);
const r3 = fs.readFileSync(
  path.join(ROOT, 'supabase', 'migrations', '20260828010000_d1f4r3_source_closure.sql'),
  'utf8',
);
const reviewRoute = fs.readFileSync(
  path.join(ROOT, 'supabase', 'functions', 'account-deletion-review', 'index.ts'),
  'utf8',
);
const flags = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'flags.ts'), 'utf8');
const config = fs.readFileSync(path.join(ROOT, 'supabase', 'config.toml'), 'utf8');
const schema = fs.readFileSync(path.join(ROOT, 'supabase', 'schema.sql'), 'utf8');

const SUBJECT = '11111111-1111-4111-8111-111111111111';
const OPERATION_ID = '00000000-0000-4000-8000-000000000001';

function workerGateway(calls: string[], resumeResult: AccountDeletionOperation): AccountDeletionWorkerGateway {
  const normal = (status: string): AccountDeletionOperation => ({
    operation_id: OPERATION_ID,
    subject_id: SUBJECT,
    status,
    resume_from: null,
  });
  return {
    resume: async () => { calls.push('resume'); return resumeResult; },
    lock: async () => { calls.push('transaction-b-lock'); return normal('LOCKED'); },
    beginCleaning: async () => { calls.push('begin-cleaning'); return normal('CLEANING'); },
    markVerifying: async () => { calls.push('verify'); return normal('VERIFYING'); },
    markReadyForAuth: async () => { calls.push('ready-auth'); return normal('READY_FOR_AUTH_DELETE'); },
    markAuthDeleted: async () => { calls.push('auth-deleted'); return normal('AUTH_DELETED'); },
    purge: async () => { calls.push('purge'); },
    complete: async () => { calls.push('complete'); },
    renew: async () => { calls.push('renew'); },
    retryOrReview: async () => { calls.push('retry-or-review'); },
    assertDeletionDrain: async () => { calls.push('assert-drain'); },
    reviewReason: async () => null,
    captureHistoricalEvidence: async () => { calls.push('historical'); },
    captureCanonicalEvidence: async () => { calls.push('canonical'); },
    captureExactReviewObject: async () => { calls.push('capture-review'); },
    revalidatePreservedForeign: async () => [],
    reconcileStorageTerminality: async () => { calls.push('terminality'); },
    completeStoragePlan: async () => ({ knownKeys: [], subjectOwnedKeys: [] }),
    removeExactOwnedKeys: async () => { calls.push('storage-remove'); },
    assertCompleteStorageInventory: async () => { calls.push('storage-assert'); },
    getUserById: async () => { calls.push('auth-lookup'); return 'ABSENT'; },
    deleteUser: async () => { calls.push('delete-auth'); return true; },
  };
}

function retryClaim(phase: RetryPhase): AccountDeletionOperation {
  return {
    operation_id: OPERATION_ID,
    subject_id: SUBJECT,
    status: 'RETRY_REQUIRED',
    resume_from: phase,
  };
}

describe('D1F4R3-FIX2 review lifecycle', () => {
  it('maps every legal stored review resume phase to its correct durable worker phase', () => {
    expect(fix3).toContain("when 'LOCK_DRAIN' then 'REQUESTED'");
    expect(fix3).toContain("when 'CLEANING' then 'CLEANING'");
    expect(fix3).toContain("when 'VERIFYING' then 'VERIFYING'");
    expect(fix3).toContain("when 'AUTH_DELETE' then 'READY_FOR_AUTH_DELETE'");
    expect(fix3).toContain("when 'AUTH_RECONCILIATION' then 'RETRY_REQUIRED'");
  });

  it.each([
    ['LOCK_DRAIN', 'REQUESTED'],
    ['CLEANING', 'CLEANING'],
    ['VERIFYING', 'VERIFYING'],
    ['AUTH_DELETE', 'READY_FOR_AUTH_DELETE'],
  ] as const)('%s executes the production worker from %s rather than collapsing to CLEANING', async (phase, status) => {
    const calls: string[] = [];
    await processAccountDeletion(
      workerGateway(calls, { operation_id: OPERATION_ID, subject_id: SUBJECT, status, resume_from: null }),
      retryClaim(phase),
      'lease-token',
    );

    expect(calls[0]).toBe('resume');
    if (phase === 'LOCK_DRAIN') {
      expect(calls.indexOf('transaction-b-lock')).toBeGreaterThan(calls.indexOf('resume'));
      expect(calls.indexOf('assert-drain')).toBeGreaterThan(calls.indexOf('transaction-b-lock'));
      expect(calls.indexOf('storage-remove')).toBeGreaterThan(calls.indexOf('assert-drain'));
    }
    if (phase === 'CLEANING') {
      expect(calls).not.toContain('transaction-b-lock');
      expect(calls.indexOf('storage-remove')).toBeGreaterThan(calls.indexOf('assert-drain'));
    }
    if (phase === 'VERIFYING') {
      expect(calls).not.toContain('transaction-b-lock');
      expect(calls).not.toContain('storage-remove');
      expect(calls).not.toContain('purge');
      expect(calls).toContain('ready-auth');
    }
    if (phase === 'AUTH_DELETE') {
      expect(calls).not.toContain('assert-drain');
      expect(calls).not.toContain('storage-remove');
      expect(calls).toContain('auth-lookup');
    }
  });

  it('keeps AUTH_RECONCILIATION on its Auth-last path instead of a cleanup retry', async () => {
    const calls: string[] = [];
    await processAccountDeletion(
      workerGateway(calls, retryClaim('AUTH_RECONCILIATION')),
      retryClaim('AUTH_RECONCILIATION'),
      'lease-token',
    );
    expect(calls).not.toContain('resume');
    expect(calls).not.toContain('assert-drain');
    expect(calls).not.toContain('storage-remove');
    expect(calls).toContain('auth-lookup');
  });

  it('fails closed before consuming the final review item for an unsupported stored resume phase', () => {
    const resolveAt = fix3.indexOf('create or replace function public.resolve_account_deletion_review_item');
    const finalItemCheckAt = fix3.indexOf('if not v_has_other_unresolved then', resolveAt);
    const resolveItemAt = fix3.indexOf('set resolution = p_action', resolveAt);
    expect(fix3.slice(resolveAt)).toContain("raise exception 'Deletion review has no safe resume phase.'");
    expect(finalItemCheckAt).toBeGreaterThan(resolveAt);
    expect(resolveItemAt).toBeGreaterThan(finalItemCheckAt);
  });

  it('returns validated durable truth for first execution and identical replay after later progress or COMPLETE', () => {
    expect(parseReviewResolution({ status: 'waiting_for_review', operation_status: 'FAILED_REVIEW_REQUIRED' }))
      .toEqual({ status: 'waiting_for_review', operationStatus: 'FAILED_REVIEW_REQUIRED' });
    expect(parseReviewResolution({ status: 'requeued', operation_status: 'REQUESTED' }))
      .toEqual({ status: 'requeued', operationStatus: 'REQUESTED' });
    expect(parseReviewResolution({ status: 'requeued', operation_status: 'VERIFYING' }))
      .toEqual({ status: 'requeued', operationStatus: 'VERIFYING' });
    expect(parseReviewResolution({ status: 'complete', operation_status: 'COMPLETE' }))
      .toEqual({ status: 'complete', operationStatus: 'COMPLETE' });
    expect(parseReviewResolution({ status: 'requeued', operation_status: 'COMPLETE' })).toBeNull();
    expect(parseReviewResolution({ status: 'resolved_item', operation_status: 'COMPLETE' })).toBeNull();
  });

  it('keeps replay safe after completion redacts subject_id and rejects a conflicting replay', () => {
    const resolveAt = fix3.indexOf('create or replace function public.resolve_account_deletion_review_item');
    const replayAt = fix3.indexOf("if v_item.resolution <> 'UNRESOLVED'", resolveAt);
    const subjectGuardAt = fix3.indexOf("v_operation.status <> 'FAILED_REVIEW_REQUIRED' or v_operation.subject_id is null", resolveAt);
    expect(replayAt).toBeGreaterThan(resolveAt);
    expect(subjectGuardAt).toBeGreaterThan(replayAt);
    expect(fix3.slice(replayAt, subjectGuardAt)).toContain("v_operation.status = 'COMPLETE'");
    expect(fix3.slice(replayAt, subjectGuardAt)).toContain("if v_item.resolution <> p_action then");
    expect(r3).toContain('subject_id = null');
    expect(reviewRoute).toContain('parseReviewResolution(data)');
  });
});

describe('D1F4R3-FIX2 direct flag deletion containment', () => {
  it('removes both authenticated DELETE grants and every known direct DELETE/ALL policy while retaining service-role authority', () => {
    expect(fix).toContain('revoke delete on table public.flags from public, anon, authenticated;');
    expect(fix).toContain('grant select, insert, update on table public.flags to authenticated;');
    expect(fix).toContain('grant select, insert, update, delete on table public.flags to service_role;');
    expect(fix).toContain('drop policy if exists "flags_user_scoped" on public.flags;');
    expect(fix).toContain('drop policy if exists "flags delete own" on public.flags;');
    expect(fix).toContain('drop policy if exists "admin delete any flag" on public.flags;');
    expect(schema).toContain('revoke delete on table public.flags from public, anon, authenticated;');
    expect(schema).toContain('drop policy if exists "flags_user_scoped" on public.flags;');
    expect(schema).toContain('drop policy if exists "flags delete own" on public.flags;');
    expect(schema).toContain('drop policy if exists "admin delete any flag" on public.flags;');
    expect(schema).not.toMatch(/create policy "flags delete own"[\s\S]{0,160}on public\.flags for delete/i);
  });

  it('retains exactly the authenticated server path: a client supplies flagId while delete-flag derives its caller', () => {
    expect(flags).toContain("supabase.functions.invoke('delete-flag'");
    expect(flags).toContain('body: { flagId }');
    expect(flags).not.toMatch(/from\(['\"]flags['\"]\)\s*\.delete\(/);
    expect(reviewRoute).not.toContain('verify_jwt = false');
    expect(config).not.toMatch(/\[functions\.delete-flag\][\s\S]*?verify_jwt\s*=\s*false/);
  });

  it('preserves both frozen migrations exactly', () => {
    const frozen = (name: string) => fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', name));
    expect(crypto.createHash('sha256').update(frozen('2026-08-27_d1sa_deployed_security_containment.sql')).digest('hex'))
      .toBe('d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d');
    expect(crypto.createHash('sha256').update(frozen('2026-08-27_d1_option_a_account_deletion.sql')).digest('hex'))
      .toBe('a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01');
  });
});
