// delete-account — Supabase Edge Function
// Permanently deletes the user's account and associated content.
// Called from the app's Profile screen after in-app confirmation.
//
// Security:
//   - verify_jwt: true (set in supabase/config.toml) — Supabase validates the
//     JWT before this function runs. No unauthenticated caller can reach here.
//   - The authenticated subject is the ONLY identity source. The caller never
//     supplies a user id.
//   - The service-role key creates the durable deletion lock, clears only that
//     user's Storage namespace, invokes the service-role-only atomic database
//     purge, and deletes auth.users LAST.
//   - Never logs user IDs, Storage paths, tokens, or backend error detail.
//
// Deletion sequence (order matters):
//   1. Insert (or retain) public.account_deletion_locks(user_id). From this
//      point every lock-aware client write is rejected in every active session.
//   2. Recursively remove only <userId>/ from the flag-photos bucket.
//   3. Call public.purge_deleting_account(userId), a single DB transaction that
//      purges the account's database rows + protected backup residue and proves
//      zero database residue. It intentionally does NOT delete auth.users.
//   4. Sweep the same Storage namespace again and require it to be empty.
//   5. adminClient.auth.admin.deleteUser(userId) LAST. Its cascade removes
//      public.users and therefore the durable deletion lock.
//
// If any step before auth deletion fails, the deletion lock intentionally stays
// in place. The user remains signed in to retry, but no session can write
// account-owned data while cleanup is pending.
//
// Deploy:
//   supabase functions deploy delete-account
//
// supabase/config.toml must include:
//   [functions.delete-account]
//   verify_jwt = true
//
// Returns:
//   200 { status: "deleted" }              — success; client should sign out locally
//   401 Unauthorized                        — missing/invalid JWT (Supabase-level)
//   500 { status: "error", error: string } — deletion failed; caller stays logged in

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FLAG_PHOTOS_BUCKET = 'flag-photos';
const STORAGE_PAGE_SIZE = 100;
const STORAGE_DELETE_BATCH_SIZE = 100;

// Admin client — service-role key, used only for the server-owned deletion
// workflow. The client-facing write boundary remains enforced by the D1
// migration's RLS policies and lock-aware helper.
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type StorageEntry = {
  name: string;
  id: string | null;
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return jsonResponse(405, { status: 'error', error: 'Method not allowed.' });
  }

  // Build a user-scoped client to resolve the caller's identity from their JWT.
  // Supabase already validated the token (verify_jwt: true), so getUser() here
  // is a cheap confirmation step, not a second verification round-trip.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse(401, { status: 'error', error: 'Not authenticated.' });
  }

  const userId = user.id;

  try {
    await createDeletionLock(userId);
    await clearAccountStorage(userId);
    await purgeAccountDatabase(userId);
    await clearAccountStorage(userId);
    await assertAccountStorageEmpty(userId);

    // Auth deletion is deliberately LAST. It cascades public.users and then
    // account_deletion_locks, the only successful path that releases the fence.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return jsonResponse(200, { status: 'deleted' });
  } catch {
    // An opaque marker is intentional: provider errors can contain object
    // paths, relation names, or other deletion-context detail.
    console.error('[delete-account] cleanup failed.');
    return jsonResponse(500, { status: 'error', error: 'Deletion failed unexpectedly.' });
  }
});

async function createDeletionLock(userId: string): Promise<void> {
  // The unique key makes repeated account-deletion calls a safe resume path.
  // We never delete this row on failure; only final Auth teardown removes it.
  const { error } = await adminClient
    .from('account_deletion_locks')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;
}

async function purgeAccountDatabase(userId: string): Promise<void> {
  const { error } = await adminClient.rpc('purge_deleting_account', {
    p_user_id: userId,
  });
  if (error) throw error;
}

/**
 * Recursively lists only the caller's Storage namespace. The list API exposes
 * directory entries with id=null; files have an object id. Each directory is
 * paginated independently so an account with many uploads is still complete.
 */
async function listAccountStoragePaths(userId: string): Promise<string[]> {
  const root = userId;
  const folders = [root];
  const files: string[] = [];

  for (let folderIndex = 0; folderIndex < folders.length; folderIndex += 1) {
    const folder = folders[folderIndex]!;
    for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
      const { data, error } = await adminClient.storage.from(FLAG_PHOTOS_BUCKET).list(folder, {
        limit: STORAGE_PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;

      const entries = (data ?? []) as StorageEntry[];
      for (const entry of entries) {
        // Storage list returns names relative to the folder. Reject malformed
        // values instead of ever broadening the deletion prefix.
        if (!entry.name || entry.name.includes('/') || entry.name === '.' || entry.name === '..') {
          throw new Error('Unexpected Storage entry.');
        }
        const path = `${folder}/${entry.name}`;
        if (entry.id === null) {
          folders.push(path);
        } else {
          files.push(path);
        }
      }

      if (entries.length < STORAGE_PAGE_SIZE) break;
    }
  }

  return files;
}

async function clearAccountStorage(userId: string): Promise<void> {
  const paths = await listAccountStoragePaths(userId);
  for (let start = 0; start < paths.length; start += STORAGE_DELETE_BATCH_SIZE) {
    const batch = paths.slice(start, start + STORAGE_DELETE_BATCH_SIZE);
    const { error } = await adminClient.storage.from(FLAG_PHOTOS_BUCKET).remove(batch);
    if (error) throw error;
  }
}

async function assertAccountStorageEmpty(userId: string): Promise<void> {
  const remainingPaths = await listAccountStoragePaths(userId);
  if (remainingPaths.length > 0) {
    throw new Error('Account Storage remains after cleanup.');
  }
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
