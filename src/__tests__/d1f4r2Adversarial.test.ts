import {
  ACCOUNT_DELETION_PAGE_SIZE,
  collectCompositeKeysetPages,
  collectKeysetPages,
  hasExactTextOwner,
  processAccountDeletion,
  removeCheckedStorageBatches,
  type AccountDeletionOperation,
  type AccountDeletionWorkerGateway,
} from '../../supabase/functions/_shared/accountDeletionWorkerCore';

const OPERATION: AccountDeletionOperation = {
  operation_id: '00000000-0000-4000-8000-000000000001',
  subject_id: '11111111-1111-4111-8111-111111111111',
  status: 'RETRY_REQUIRED',
  resume_from: 'AUTH_RECONCILIATION',
};

function gateway(overrides: Partial<AccountDeletionWorkerGateway> = {}): AccountDeletionWorkerGateway {
  return {
    resume: async () => OPERATION,
    lock: async () => OPERATION,
    beginCleaning: async () => OPERATION,
    markVerifying: async () => OPERATION,
    markReadyForAuth: async () => OPERATION,
    markAuthDeleted: async () => ({ ...OPERATION, status: 'AUTH_DELETED', resume_from: null }),
    purge: async () => undefined,
    complete: async () => undefined,
    renew: async () => undefined,
    retryOrReview: async () => undefined,
    assertDeletionDrain: async () => undefined,
    reviewReason: async () => null,
    captureHistoricalEvidence: async () => undefined,
    captureCanonicalEvidence: async () => undefined,
    captureExactReviewObject: async () => undefined,
    revalidatePreservedForeign: async () => [],
    reconcileStorageTerminality: async () => undefined,
    completeStoragePlan: async () => ({ knownKeys: [], subjectOwnedKeys: [] }),
    removeExactOwnedKeys: async () => undefined,
    assertCompleteStorageInventory: async () => undefined,
    getUserById: async () => 'ABSENT',
    deleteUser: async () => true,
    ...overrides,
  };
}

describe('D1F4R2 adversarial worker core', () => {
  it('uses exact text-safe ownership and fails closed for null, malformed, and foreign values', () => {
    const subject = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    expect(hasExactTextOwner({ owner_id: subject }, subject)).toBe(true);
    expect(hasExactTextOwner({ owner_id: subject.toUpperCase() }, subject)).toBe(false);
    expect(hasExactTextOwner({ owner_id: null }, subject)).toBe(false);
    expect(hasExactTextOwner({ owner_id: 'not-a-uuid' }, subject)).toBe(false);
    expect(hasExactTextOwner({ owner_id: '99999999-9999-4999-8999-999999999999' }, subject)).toBe(false);
  });

  it.each([99, 100, 101, 199, 200, 201, 501])(
    'enumerates a %i-object inventory with fixed keyset pages',
    async (count) => {
      const keys = Array.from({ length: count }, (_, index) => 'object-' + String(index).padStart(4, '0'));
      const seen = await collectKeysetPages(async (after) => {
        const start = after === null ? 0 : keys.indexOf(after) + 1;
        const items = keys.slice(start, start + ACCOUNT_DELETION_PAGE_SIZE);
        return {
          items,
          nextCursor: items.length === ACCOUNT_DELETION_PAGE_SIZE ? items[items.length - 1]! : null,
        };
      }, (key) => key);
      expect(seen).toEqual(keys);
    },
  );

  it.each([99, 100, 101, 199, 200, 201, 250, 500, 501])(
    'enumerates a %i-row application inventory with a unique composite cursor',
    async (count) => {
      const rows = Array.from({ length: count }, (_, index) => ({
        objectKey: 'object-' + String(Math.floor(index / 2)).padStart(4, '0'),
        sourceRef: index % 2 === 0 ? 'gallery_uploader' : 'subject_report_tree',
        sourceId: String(index).padStart(4, '0'),
      })).sort((a, b) => `${a.objectKey}\u0000${a.sourceRef}\u0000${a.sourceId}`.localeCompare(
        `${b.objectKey}\u0000${b.sourceRef}\u0000${b.sourceId}`,
      ));
      const seen = await collectCompositeKeysetPages(async (after) => {
        const afterValue = after ? `${after.objectKey}\u0000${after.sourceRef}\u0000${after.sourceId}` : null;
        const start = afterValue === null ? 0 : rows.findIndex((row) =>
          `${row.objectKey}\u0000${row.sourceRef}\u0000${row.sourceId}` === afterValue,
        ) + 1;
        const items = rows.slice(start, start + ACCOUNT_DELETION_PAGE_SIZE);
        return { items, nextCursor: items.length === ACCOUNT_DELETION_PAGE_SIZE ? items[items.length - 1]! : null };
      }, (row) => row);
      expect(seen).toEqual(rows);
    },
  );

  it('rejects a duplicate or non-advancing inventory page instead of accepting partial Storage evidence', async () => {
    await expect(collectKeysetPages(
      async () => ({ items: ['object-1'], nextCursor: 'object-1' }),
      (key) => key,
    )).rejects.toThrow('uniquely enumerable');
    await expect(collectKeysetPages(
      async () => ({ items: ['object-1', 'object-1'], nextCursor: null }),
      (key) => key,
    )).rejects.toThrow('uniquely enumerable');
  });

  it('does not call the real Storage remover if the final lease renewal fails', async () => {
    const remove = jest.fn();
    const renew = jest.fn().mockRejectedValue(new Error('lease expired'));
    await expect(removeCheckedStorageBatches(
      ['uploads/a.jpg'],
      async () => ({ object_key: 'uploads/a.jpg', owner_id: OPERATION.subject_id }),
      renew,
      remove,
      OPERATION.subject_id!,
    )).rejects.toThrow('lease expired');
    expect(renew).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
  });

  it('fails closed before any cleanup or purge when a corrupt CLEANING claim lacks the durable drain proof', async () => {
    const remove = jest.fn();
    const purge = jest.fn();
    const captureHistoricalEvidence = jest.fn();
    const g = gateway({
      assertDeletionDrain: async () => { throw new Error('Durable Transaction-B deletion lock is required.'); },
      captureHistoricalEvidence,
      removeExactOwnedKeys: remove,
      purge,
    });
    await expect(processAccountDeletion(g, { ...OPERATION, status: 'CLEANING', resume_from: null }, 'lease-token'))
      .rejects.toThrow('Durable Transaction-B deletion lock is required.');
    expect(captureHistoricalEvidence).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(purge).not.toHaveBeenCalled();
  });

  it('returns a pre-lock retry through REQUESTED and Transaction B before cleanup', async () => {
    const calls: string[] = [];
    const retry = { ...OPERATION, status: 'RETRY_REQUIRED', resume_from: 'LOCK_DRAIN' as const };
    const locked = { ...OPERATION, status: 'LOCKED', resume_from: null };
    const cleaning = { ...OPERATION, status: 'CLEANING', resume_from: null };
    const verifying = { ...OPERATION, status: 'VERIFYING', resume_from: null };
    const ready = { ...OPERATION, status: 'READY_FOR_AUTH_DELETE', resume_from: null };
    const authDeleted = { ...OPERATION, status: 'AUTH_DELETED', resume_from: null };
    const g = gateway({
      resume: async () => { calls.push('resume-lock-drain'); return { ...OPERATION, status: 'REQUESTED', resume_from: null }; },
      lock: async () => { calls.push('transaction-b-lock'); return locked; },
      assertDeletionDrain: async () => { calls.push('assert-drain'); },
      captureHistoricalEvidence: async () => { calls.push('historical'); },
      captureCanonicalEvidence: async () => { calls.push('canonical'); },
      completeStoragePlan: async () => ({ knownKeys: ['uploads/a.jpg'], subjectOwnedKeys: ['uploads/a.jpg'] }),
      beginCleaning: async () => { calls.push('begin-cleaning'); return cleaning; },
      removeExactOwnedKeys: async () => { calls.push('storage-remove'); },
      assertCompleteStorageInventory: async () => { calls.push('storage-assert'); },
      reconcileStorageTerminality: async () => { calls.push('terminality'); },
      purge: async () => { calls.push('purge'); },
      markVerifying: async () => { calls.push('verify'); return verifying; },
      markReadyForAuth: async () => { calls.push('ready-auth'); return ready; },
      getUserById: async () => 'ABSENT',
      markAuthDeleted: async () => { calls.push('auth-deleted'); return authDeleted; },
      complete: async () => { calls.push('complete'); },
    });
    await processAccountDeletion(g, retry, 'lease-token');
    expect(calls.indexOf('transaction-b-lock')).toBeGreaterThan(calls.indexOf('resume-lock-drain'));
    expect(calls.indexOf('storage-remove')).toBeGreaterThan(calls.indexOf('transaction-b-lock'));
    expect(calls.indexOf('purge')).toBeGreaterThan(calls.indexOf('storage-remove'));
  });

  it('captures a precise owner-change item before holding a formerly preserved foreign key', async () => {
    const captureExactReviewObject = jest.fn();
    const remove = jest.fn();
    const g = gateway({
      revalidatePreservedForeign: async () => ['uploads/owner-changed.jpg'],
      captureExactReviewObject,
      removeExactOwnedKeys: remove,
    });
    await expect(processAccountDeletion(g, { ...OPERATION, status: 'CLEANING', resume_from: null }, 'lease-token'))
      .rejects.toMatchObject({ reason: 'preserved_foreign_owner_changed', objectKey: 'uploads/owner-changed.jpg' });
    expect(captureExactReviewObject).toHaveBeenCalledWith(
      OPERATION.operation_id,
      'lease-token',
      'uploads/owner-changed.jpg',
      'preserved_foreign_owner_changed',
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it('reconciles a lost Auth-delete response through AUTH_DELETED and final Storage proof before COMPLETE', async () => {
    const calls: string[] = [];
    const g = gateway({
      getUserById: async () => {
        calls.push('auth-lookup');
        return 'ABSENT';
      },
      markAuthDeleted: async () => {
        calls.push('mark-auth-deleted');
        return { ...OPERATION, status: 'AUTH_DELETED', resume_from: null };
      },
      completeStoragePlan: async () => {
        calls.push('storage-plan');
        return { knownKeys: ['uploads/a.jpg'], subjectOwnedKeys: [] };
      },
      assertCompleteStorageInventory: async (keys) => {
        calls.push('assert-' + keys.join(','));
      },
      complete: async () => {
        calls.push('complete');
      },
    });

    await processAccountDeletion(g, OPERATION, 'lease-token');

    expect(calls).toEqual([
      'auth-lookup',
      'mark-auth-deleted',
      'storage-plan',
      'assert-uploads/a.jpg',
      'complete',
    ]);
  });

  it('never completes when Auth still exists after an ambiguous outcome', async () => {
    const retryOrReview = jest.fn();
    const complete = jest.fn();
    const g = gateway({
      getUserById: async () => 'PRESENT',
      deleteUser: async () => false,
      retryOrReview,
      complete,
    });

    await processAccountDeletion(g, OPERATION, 'lease-token');

    expect(retryOrReview).toHaveBeenCalledWith(OPERATION.operation_id, 'lease-token', 'auth_outcome_ambiguous');
    expect(complete).not.toHaveBeenCalled();
  });
});
