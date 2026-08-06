/**
 * Unit tests for src/lib/postgrestErrors.ts — the shared PostgREST error
 * classification extracted by code-qa 2026-08-06 (SLOP-3). These pins ARE the
 * family's behavior contract: the SR-092 embed early-out, the F38-narrow
 * function-missing fallback, and the column probe all live here now, so a
 * regression in this file would silently change how six call sites degrade.
 */
import { isRelationMissing, isFunctionMissing, isColumnMissing } from '../postgrestErrors';

describe('isRelationMissing', () => {
  it('classifies 42P01 by code', () => {
    expect(isRelationMissing({ code: '42P01', message: 'relation "flag_photos" does not exist' })).toBe(true);
  });

  it('classifies a message-only "does not exist" body (PostgREST 404 shape)', () => {
    expect(isRelationMissing({ message: 'relation flag_photos does not exist' })).toBe(true);
  });

  it('classifies a message that embeds the 42P01 code', () => {
    expect(isRelationMissing({ message: 'ERROR 42P01: no such relation' })).toBe(true);
  });

  it('SR-092: a PGRST201 embed failure is NOT a missing relation even when its message says "does not exist"', () => {
    expect(
      isRelationMissing({
        code: 'PGRST201',
        message: 'Could not embed because more than one relationship... column users.nope does not exist',
      }),
    ).toBe(false);
  });

  it.each(['PGRST200', 'PGRST202'])('embed early-out also covers %s', (code) => {
    expect(isRelationMissing({ code, message: 'x does not exist' })).toBe(false);
  });

  it('rejects unrelated errors (network, RLS)', () => {
    expect(isRelationMissing({ message: 'TypeError: Failed to fetch' })).toBe(false);
    expect(isRelationMissing({ code: '42501', message: 'permission denied' })).toBe(false);
  });

  it('tolerates non-object inputs', () => {
    expect(isRelationMissing(null)).toBe(false);
    expect(isRelationMissing(undefined)).toBe(false);
    expect(isRelationMissing('relation does not exist')).toBe(true);
  });
});

describe('isFunctionMissing', () => {
  it.each(['42883', 'PGRST202'])('classifies code %s', (code) => {
    expect(isFunctionMissing({ code, message: 'whatever' })).toBe(true);
  });

  it('classifies the PGRST202 phrasing when the code is absent', () => {
    expect(
      isFunctionMissing({ message: 'Could not find the function public.list_monthly_leaderboard(p_limit) in the schema cache' }),
    ).toBe(true);
  });

  it('F38-narrow: a bare "does not exist" message is NOT function-missing (a failure inside an RPC body must throw)', () => {
    expect(isFunctionMissing({ message: 'relation "flag_reopen_requests" does not exist' })).toBe(false);
  });

  it('rejects network/RLS errors', () => {
    expect(isFunctionMissing({ message: 'TypeError: Failed to fetch' })).toBe(false);
    expect(isFunctionMissing({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isFunctionMissing(null)).toBe(false);
  });
});

describe('isColumnMissing', () => {
  it('classifies PGRST204 by code', () => {
    expect(isColumnMissing({ code: 'PGRST204', message: 'anything' }, 'context_tags')).toBe(true);
  });

  it('classifies the message-only fallback when it names the column', () => {
    expect(
      isColumnMissing({ message: "could not find the 'context_tags' column" }, 'context_tags'),
    ).toBe(true);
    expect(
      isColumnMissing({ message: 'column "context_tags" of relation "flags" does not exist' }, 'context_tags'),
    ).toBe(true);
  });

  it('requires the column name in the message (unrelated failures must not match)', () => {
    expect(isColumnMissing({ message: 'column "other" does not exist' }, 'context_tags')).toBe(false);
  });

  it('requires a not-find/not-exist verb even when the column is named', () => {
    expect(
      isColumnMissing({ message: 'invalid input for context_tags' }, 'context_tags'),
    ).toBe(false);
  });

  it('tolerates non-object inputs', () => {
    expect(isColumnMissing(null, 'context_tags')).toBe(false);
    expect(isColumnMissing('context_tags does not exist', 'context_tags')).toBe(false);
  });
});
