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

// The one select string both read paths use. Shared deliberately: the list
// query and the insert's returning-clause carry the same embed, and fixing
// only one of them leaves the other broken (SR-092 was live on both).
export const COMMENT_SELECT =
  'id, flag_id, user_id, content, created_at, users!flag_comments_user_id_fkey(display_name)';

// Raw shape returned by the PostgREST join before we flatten display_name.
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

// This file's isTableMissingError was the house-canonical variant — the only
// one hardened by a production incident (its SR-092 embed early-out). It moved
// verbatim to postgrestErrors.ts as isRelationMissing (code-qa 2026-08-06
// SLOP-3) so photos.ts and friends inherit the hardening.

// Fetch comments for a flag, newest-first (capped at MAX_COMMENTS), with
// author display_name joined.
// Throws CommentsTableNotReadyError if the migration hasn't been applied yet.
export async function listComments(flagId: string): Promise<CommentRow[]> {
  // The `!flag_comments_user_id_fkey` hint is load-bearing, not decoration.
  // A bare `users(display_name)` is AMBIGUOUS: comment_votes has FKs to both
  // flag_comments and users, so PostgREST sees a second, many-to-many
  // flag_comments<->users relationship through it and answers PGRST201 /
  // HTTP 300 — which is how comments died in production the day
  // 2026-05-30_trust_score_system.sql landed. The hint names the direct FK.
  // (If that constraint is ever renamed, the column form `users!user_id(...)`
  // disambiguates without pinning a generated identifier.) The typed client
  // resolves the hint via the hand-authored Relationships entry in
  // database.ts (TYPE-3).
  const { data, error } = await supabase
    .from('flag_comments')
    .select(COMMENT_SELECT)
    .eq('flag_id', flagId)
    .order('created_at', { ascending: false })
    .limit(MAX_COMMENTS);

  if (error) {
    if (isRelationMissing(error)) throw new CommentsTableNotReadyError();
    throw new Error(errorMessage(error));
  }

  return ((data ?? []) as RawCommentRow[]).map(flattenComment);
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
 * Fetch specific comments by id, with author display_name joined.
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
    // Same `!flag_comments_user_id_fkey` disambiguation as listComments —
    // see the note there for why the hint is required.
    const { data, error } = await supabase
      .from('flag_comments')
      .select(COMMENT_SELECT)
      .in('id', chunk);

    if (error) {
      if (isRelationMissing(error)) throw new CommentsTableNotReadyError();
      throw new Error(errorMessage(error));
    }
    out.push(...((data ?? []) as RawCommentRow[]).map(flattenComment));
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
