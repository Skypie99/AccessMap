import { Platform } from 'react-native';
import { supabase } from './supabase';
import { errorMessage } from './errors';
import { trackEvent, commentLengthBucket } from './analytics';
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
type RawCommentRow = {
  id: string;
  flag_id: string;
  user_id: string;
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

// PostgreSQL error code 42P01 = undefined_table. Inspect the raw error
// fields directly (same pattern as photos.ts) — errorMessage() now rewrites
// recognized failures into friendly copy, so its output can no longer be
// used for code/phrase sniffing. Supabase sometimes embeds the code in the
// message when it comes back as a PostgREST 404 body, so check both.
function isTableMissingError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e ?? '');
  const code = String((e as { code?: string })?.code ?? '');
  if (EMBED_ERROR_CODES.has(code)) return false;
  return code === '42P01' || msg.includes('42P01') || msg.includes('does not exist');
}

// Fetch comments for a flag, newest-first (capped at MAX_COMMENTS), with
// author display_name joined.
// Throws CommentsTableNotReadyError if the migration hasn't been applied yet.
export async function listComments(flagId: string): Promise<CommentRow[]> {
  // Cast through `any` for the join query: the flag_comments table has no
  // Relationships defined in database.ts (they can't be expressed without
  // regenerating the Supabase types), so the typed client rejects the
  // `users(...)` select clause at compile time.
  //
  // The `!flag_comments_user_id_fkey` hint is load-bearing, not decoration.
  // A bare `users(display_name)` is AMBIGUOUS: comment_votes has FKs to both
  // flag_comments and users, so PostgREST sees a second, many-to-many
  // flag_comments<->users relationship through it and answers PGRST201 /
  // HTTP 300 — which is how comments died in production the day
  // 2026-05-30_trust_score_system.sql landed. The hint names the direct FK.
  // (If that constraint is ever renamed, the column form `users!user_id(...)`
  // disambiguates without pinning a generated identifier.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('flag_comments')
    .select(COMMENT_SELECT)
    .eq('flag_id', flagId)
    .order('created_at', { ascending: false })
    .limit(MAX_COMMENTS);

  if (error) {
    if (isTableMissingError(error)) throw new CommentsTableNotReadyError();
    throw new Error(errorMessage(error));
  }

  return ((data ?? []) as RawCommentRow[]).map(flattenComment);
}

// Insert a comment. Enforces the 500-char limit client-side before sending.
// Returns the newly-created comment (with display_name joined from users).
export async function addComment(flagId: string, content: string): Promise<CommentRow> {
  const trimmed = content.trim();
  if (trimmed.length === 0) throw new Error('Comment cannot be empty.');
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comments must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('flag_comments')
    .insert({ flag_id: flagId, content: trimmed })
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    if (isTableMissingError(error)) throw new CommentsTableNotReadyError();
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
    if (isTableMissingError(error)) throw new CommentsTableNotReadyError();
    throw new Error(errorMessage(error));
  }
}
