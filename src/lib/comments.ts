import { Platform } from 'react-native';
import { supabase } from './supabase';
import { errorMessage } from './errors';
import { isRelationMissing } from './postgrestErrors';
import { trackEvent, commentLengthBucket } from './analytics';
import { containsBlockedTerm } from '@/moderation/blockedTerms';
import { CONTENT_BLOCKED_MESSAGE } from './copy';
import type { CommentRow } from '@/types/database';

export { CommentRow };

export const MAX_COMMENT_LENGTH = 500;

// Cap how many comments one fetch pulls down. Threads are newest-first, so
// this keeps the most recent 200 — plenty for a flag discussion — instead of
// an unbounded query that grows forever with the table.
export const MAX_COMMENTS = 200;

// Thrown when the flag_comments table doesn't exist yet (migration pending).
// The UI catches this and shows "Comments coming soon" instead of crashing.
export class CommentsTableNotReadyError extends Error {
  constructor() {
    super('flag_comments table not yet available');
    this.name = 'CommentsTableNotReadyError';
  }
}

// INSERT returning reads only the caller's own profile. Keep its disambiguated
// embed in the same request so an author lookup cannot fail after a saved comment.
export const COMMENT_SELECT =
  'id, flag_id, user_id, content, created_at, users!flag_comments_user_id_fkey(display_name)';
export const COMMENT_READ_SELECT = 'id, flag_id, user_id, content, created_at';

// Raw shape returned by INSERT's own-profile embed before we flatten display_name.
// SR-117: `user_id` is nullable because live is (ON DELETE SET NULL, verified
// 2026-07-27) -- a comment outlives its author's account with the attribution
// dropped. `users` was already nullable for the same reason: the embed has
// nothing to join to once user_id is NULL, so display_name falls through to
// the `?? null` below and the bubble shows its anonymous author fallback.
type RawCommentRow = {
  id: string;
  flag_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  users: { display_name: string | null } | null;
};

function flattenComment(row: RawCommentRow): CommentRow {
  return {
    id: row.id,
    flag_id: row.flag_id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    display_name: row.users?.display_name ?? null,
  };
}

type BaseCommentRow = Omit<RawCommentRow, 'users'>;

async function withCommentAuthorProfiles(rows: BaseCommentRow[]): Promise<CommentRow[]> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.rpc('get_comment_author_profiles', {
    p_comment_ids: rows.map((row) => row.id),
  });
  if (error) throw new Error(errorMessage(error));
  const names = new Map((data ?? []).map((row) => [row.comment_id, row.display_name]));
  // A missing projection is not proof that an author is anonymous. A concurrent
  // deletion or incomplete response should let the reader retry the whole fetch.
  if (rows.some((row) => !names.has(row.id))) {
    throw new Error('Comment author details could not be loaded.');
  }
  return rows.map((row) => ({
    id: row.id,
    flag_id: row.flag_id,
    user_id: row.user_id,
    content: row.content,
    created_at: row.created_at,
    display_name: names.get(row.id) ?? null,
  }));
}

// This file's isTableMissingError was the house-canonical variant — the only
// one hardened by a production incident (its SR-092 embed early-out). It moved
// verbatim to postgrestErrors.ts as isRelationMissing (code-qa 2026-08-06
// SLOP-3) so photos.ts and friends inherit the hardening.

// Fetch comments for a flag, newest-first (capped at MAX_COMMENTS), with
// author display_name supplied by the contextual public projection.
// Throws CommentsTableNotReadyError if the migration hasn't been applied yet.
export async function listComments(flagId: string): Promise<CommentRow[]> {
  const { data, error } = await supabase
    .from('flag_comments')
    .select(COMMENT_READ_SELECT)
    .eq('flag_id', flagId)
    .order('created_at', { ascending: false })
    .limit(MAX_COMMENTS);

  if (error) {
    if (isRelationMissing(error)) throw new CommentsTableNotReadyError();
    throw new Error(errorMessage(error));
  }

  return withCommentAuthorProfiles(data ?? []);
}

// How many ids one `.in(...)` filter carries. PostgREST puts the filter in the
// QUERY STRING, so an unbounded list becomes an unbounded URL — and the request
// dies at whatever proxy hits its header limit first.
//
// ⚑ WHY CHUNK INSTEAD OF CAPPING. The obvious alternative is to slice the id
// list and fetch only the first N. That would be a silent lie: the Unhide
// surface renders any id it could not resolve as "no longer available", so a
// capped fetch would tell the user their comment had been deleted when in fact
// nobody ever asked the server about it. Chunking keeps that state meaning the
// one thing it claims to mean.
const FETCH_BY_ID_CHUNK = 100;

/**
 * Fetch specific comments by id, with author display_name projected.
 *
 * Used by the Unhide surface (Apple 1.2(c)): `hiddenContent.ts` stores bare ids
 * and nothing else, so the only way to show a reader WHICH comment they are
 * about to unhide is to re-read it now. Rows that no longer exist are simply
 * absent from the result — the caller is expected to treat a missing id as
 * "no longer available" and must still let the user unhide it, or the entry is
 * stuck in their hide list forever.
 *
 * Order is NOT guaranteed and callers must not rely on it; the hide list owns
 * its own ordering.
 */
export async function fetchCommentsByIds(commentIds: string[]): Promise<CommentRow[]> {
  if (commentIds.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < commentIds.length; i += FETCH_BY_ID_CHUNK) {
    chunks.push(commentIds.slice(i, i + FETCH_BY_ID_CHUNK));
  }

  const out: CommentRow[] = [];
  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from('flag_comments')
      .select(COMMENT_READ_SELECT)
      .in('id', chunk);

    if (error) {
      if (isRelationMissing(error)) throw new CommentsTableNotReadyError();
      throw new Error(errorMessage(error));
    }
    out.push(...(await withCommentAuthorProfiles(data ?? [])));
  }
  return out;
}

// Insert a comment. Enforces the 500-char limit client-side before sending.
// Returns the newly-created comment (with display_name joined from users).
export async function addComment(flagId: string, content: string): Promise<CommentRow> {
  const trimmed = content.trim();
  if (trimmed.length === 0) throw new Error('Comment cannot be empty.');
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comments must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
  }
  // Apple 1.2(a): the submit-time filter, at the same trust boundary as the
  // length guard and before any network call. Client-side only and bypassable —
  // see the header of `@/moderation/blockedTerms` for what that does and does
  // not buy.
  if (containsBlockedTerm(trimmed)) {
    throw new Error(CONTENT_BLOCKED_MESSAGE);
  }

  // The ONE cast TYPE-3 could not retire (2026-08-06): this insert sends no
  // user_id, yet inserts pass live RLS (WITH CHECK user_id = auth.uid()) —
  // so live must fill it via a default/trigger the 2026-07-27 drift capture
  // did not record, and the typed Insert (user_id required) cannot be
  // honestly loosened until Sky reads the live column default. Typing this
  // call would encode a guess about un-captured live schema.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('flag_comments')
    .insert({ flag_id: flagId, content: trimmed })
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    if (isRelationMissing(error)) throw new CommentsTableNotReadyError();
    throw new Error(errorMessage(error));
  }

  // Analytics: a comment was added. We log only a length *bucket* (never the
  // text itself) plus platform. No flag_id / user_id. See src/lib/analytics.ts.
  trackEvent('comment_added', {
    comment_length_bucket: commentLengthBucket(trimmed.length),
    platform: Platform.OS,
  });

  return flattenComment(data as RawCommentRow);
}

// Delete the current user's own comment. RLS on the server enforces ownership;
// this is just the client-side call.
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('flag_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    if (isRelationMissing(error)) throw new CommentsTableNotReadyError();
    throw new Error(errorMessage(error));
  }
}
