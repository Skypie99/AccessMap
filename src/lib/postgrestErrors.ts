/**
 * Shared PostgREST/Postgres error classification (code-qa 2026-08-06 SLOP-3).
 *
 * Before this module the same three questions — "is this a missing relation /
 * function / column?" — were answered by five hand-rolled variants across
 * comments.ts, photos.ts, users.ts, flags.ts (x2) and disputes.ts, with a real
 * diverging bug: photos' variant lacked the embed early-out below and could
 * misread a broken join as "table missing". The canonical forms here are
 * lifted from the variants hardened by production incidents (SR-092, F38);
 * their WHY comments moved here with them.
 *
 * NOT for display copy: errorMessage() (errors.ts) rewrites recognized
 * failures into friendly copy, so its OUTPUT can never be used for code/phrase
 * sniffing — these helpers inspect the raw error fields instead, and callers
 * must run them on the original error object.
 */

// PostgREST embed/relationship failures. These are NOT a missing table, and
// their message bodies can legitimately contain the phrase "does not exist"
// (a bad column inside an embed hint reads `column ... does not exist`).
// Without this early-out the loose message match below would show the user
// "Comments coming soon" for a broken join — a worse lie than an honest error,
// and exactly how SR-092 could have hidden itself.
const EMBED_ERROR_CODES = new Set([
  'PGRST200', // no relationship found between the two tables
  'PGRST201', // more than one relationship found (the SR-092 shape)
  'PGRST202', // function not found in the schema cache
]);

/**
 * Missing relation (table/view): PostgreSQL 42P01 = undefined_table. Supabase
 * sometimes embeds the code in the message when it comes back as a PostgREST
 * 404 body, so check both. Embed-aware per the SR-092 lesson above.
 */
export function isRelationMissing(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e ?? '');
  const code = String((e as { code?: string })?.code ?? '');
  if (EMBED_ERROR_CODES.has(code)) return false;
  return code === '42P01' || msg.includes('42P01') || msg.includes('does not exist');
}

/**
 * Missing function (RPC migration not applied): PostgREST PGRST202 = function
 * not in the schema cache; Postgres 42883 = undefined function. The message
 * fallback is deliberately NARROW — "could not find the function" is the
 * PGRST202 phrasing and can only mean migration-absent, whereas a broad
 * "does not exist" match could swallow a real failure raised INSIDE an RPC
 * body (the F38 class: anything that isn't migration-absent must throw so
 * callers show an honest error, never a success-sounding fallback).
 */
export function isFunctionMissing(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e ?? '');
  const code = String((e as { code?: string })?.code ?? '');
  return code === '42883' || code === 'PGRST202' || /could not find the function/i.test(msg);
}

/**
 * Missing column on an otherwise-present relation: PostgREST returns
 * 'PGRST204' for "column 'X' of relation 'Y' does not exist" (schema-cache
 * miss). On older Supabase deployments the message-only path is the fallback —
 * it must name the column to avoid misreading unrelated failures. Used by
 * createFlag to gracefully degrade when the context_tags migration hasn't
 * been applied yet.
 */
export function isColumnMissing(err: unknown, columnName: string): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  const message = (err as { message?: string }).message;
  if (code === 'PGRST204') return true;
  if (typeof message === 'string' && message.includes(columnName)) {
    // "could not find the 'context_tags' column" or "column ... does not exist".
    return /not (find|exist)/i.test(message);
  }
  return false;
}
