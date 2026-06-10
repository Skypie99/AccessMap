import { Platform } from 'react-native';
import { supabase } from './supabase';
import { errorMessage } from './errors';
import { trackEvent, commentLengthBucket } from './analytics';
import type { CommentRow } from '@/types/database';

export { CommentRow };

export const MAX_COMMENT_LENGTH = 500;

// Thrown when the flag_comments table doesn't exist yet (migration pending).
// The UI catches this and shows "Comments coming soon" instead of crashing.
export class CommentsTableNotReadyError extends Error {
  constructor() {
    super('flag_comments table not yet available');
    this.name = 'CommentsTableNotReadyError';
  }
}

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

// PostgreSQL error code 42P01 = undefined_table. Inspect the raw error
// fields directly (same pattern as photos.ts) — errorMessage() now rewrites
// recognized failures into friendly copy, so its output can no longer be
// used for code/phrase sniffing. Supabase sometimes embeds the code in the
// message when it comes back as a PostgREST 404 body, so check both.
function isTableMissingError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e ?? '');
  const code = String((e as { code?: string })?.code ?? '');
  return code === '42P01' || msg.includes('42P01') || msg.includes('does not exist');
}

// Fetch comments for a flag, newest-first, with author display_name joined.
// Throws CommentsTableNotReadyError if the migration hasn't been applied yet.
export async function listComments(flagId: string): Promise<CommentRow[]> {
  // Cast through `any` for the join query: the flag_comments table has no
  // Relationships defined in database.ts (they can't be expressed without
  // regenerating the Supabase types), so the typed client rejects the
  // `users(display_name)` select clause at compile time.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('flag_comments')
    .select('id, flag_id, user_id, content, created_at, users(display_name)')
    .eq('flag_id', flagId)
    .order('created_at', { ascending: false });

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
    .select('id, flag_id, user_id, content, created_at, users(display_name)')
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
