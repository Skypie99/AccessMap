import {
  ACCOUNT_DELETION_PAGE_SIZE,
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
    reviewReason: async () => null,
    captureHistoricalEvidence: async () => undefined,
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
