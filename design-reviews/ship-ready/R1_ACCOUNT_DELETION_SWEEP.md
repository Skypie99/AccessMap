# R-1 · Account-deletion Storage sweep — **PROPOSED ARTIFACT, Sky deploys**

**Written 2026-07-28, Run 2 (§SKY-6: "R-1 artifact-only").**
**Nothing here has been deployed, and no agent may deploy it.** Deploying an edge function is a production
side effect; that is Sky's hand, not an agent's.

---

## The defect

`supabase/functions/delete-account/index.ts` contains **zero** references to `storage`, `flag-photos`, or
`avatar` — verified by grep, not assumed. So when a user deletes their account:

- their **avatar** — a face photo — stays in the `avatars` bucket, publicly fetchable, forever;
- every **flag photo** they ever uploaded stays in `flag-photos`, likewise;
- and both become **permanently un-deletable**, because the owner-only Storage DELETE policy is keyed on
  `auth.uid()` and that uid no longer exists. Nobody can remove them. Not the user, not an admin, not Sky
  through the app.

That last clause is what makes this worse than an orphan. It is not litter; it is a face photo with no
remaining owner and no remaining mechanism.

It contradicts three things at once: the deletion dialog's promise, the privacy policy, and Apple 5.1.1(v)'s
framing of account deletion. `05 §2` grades it **Blocking-adjacent** — RECOMMENDED only because the deletion
mechanism itself exists and Apple's letter-of-law is the mechanism.

## Why an edge function and not a policy

SR-050's admin half (§C-12) is a policy change because an admin still exists to act. Here **no principal
exists at all** after the row is gone, so there is no `auth.uid()` any policy could grant. The delete must
happen with the service role, from the server, *before or during* the account teardown — which means it
belongs inside the function that already owns teardown.

**Ordering matters and is easy to get backwards:** enumerate the objects **while the rows still exist**. Once
`public.flags` and `public.users` are gone, the only record of which objects belonged to that account is gone
with them, and the sweep has nothing to iterate.

## The artifact

```ts
// ============================================================================
// FILE:   supabase/functions/delete-account/index.ts  (ADDITION)
// STATUS: PROPOSED — *** SKY DEPLOYS. NEVER AUTO-DEPLOYED. ***
// WHAT:   Before tearing down the account, remove every Storage object it owns.
//         Runs with the service role, which is the only principal that still
//         has authority once auth.uid() is about to stop existing.
// WHERE:  Immediately BEFORE the existing auth.admin.deleteUser(...) call, and
//         before any DB cascade — the object paths are derived from rows that
//         the cascade is about to delete.
// ============================================================================

/**
 * Best-effort removal of every Storage object owned by `userId`.
 *
 * NEVER THROWS. Account deletion is the user's right and must not be blocked by
 * a Storage hiccup — a surviving object is a bug to sweep later, an account that
 * refuses to delete is a broken promise now. Failures are logged for exactly
 * that follow-up.
 *
 * Objects use a `<uid>/…` path prefix, so listing by that prefix enumerates an
 * account's objects without parsing a single URL. The service role is not
 * subject to the owner-only DELETE policy.
 *
 * ⚠️ CORRECTED 2026-07-31 — security audit train, finding PC-3. As originally
 * written this function would have swept the flag photos, reported success, and
 * LEFT THE AVATAR — the single object this artifact's own header calls the
 * worst case ("a face photo with no remaining owner and no remaining
 * mechanism"). Two independent defects, both fixed below:
 *
 *   1. It iterated `['flag-photos', 'avatars']`. There is no `avatars` bucket.
 *      `uploadAvatar` delegates to `uploadStrippedImage`, which uploads to
 *      FLAG_PHOTOS_BUCKET; `flag-photos` is the only bucket schema.sql creates.
 *      The second iteration was dead code against a bucket that does not exist.
 *
 *   2. Supabase Storage `list(prefix)` returns IMMEDIATE CHILDREN ONLY, and the
 *      avatar is one level deeper: `flag-photos/<uid>/avatar/<ts>.<ext>`. So
 *      `list(uid)` yielded a FOLDER entry named `avatar`, the loop pushed the
 *      path `<uid>/avatar`, and `.remove()` on a prefix that is not an object
 *      deletes nothing AND reports no error. Silent, clean-looking failure.
 *
 * The fix recurses one level into folder entries. Caught while this artifact is
 * still parked, which is the right time to catch it — the deferral was resting
 * on a sweep that would not have worked.
 */
async function sweepUserStorage(
  admin: SupabaseClient,
  userId: string,
): Promise<{ bucket: string; removed: number; error?: string }[]> {
  const results: { bucket: string; removed: number; error?: string }[] = [];

  // PC-3: `flag-photos` only. There is no `avatars` bucket — avatars live in
  // this same bucket under `<uid>/avatar/`.
  for (const bucket of ['flag-photos'] as const) {
    try {
      // Paginated: an account with more than a page of photos must not have the
      // tail silently left behind — the exact shape of bug this closes.
      const pageSize = 100;
      const paths: string[] = [];

      // PC-3: `list()` is NOT recursive. An entry with no `id` is a folder, not
      // an object; removing its path is a silent no-op. Flag photos sit at
      // `<uid>/<ts>.jpg` and the avatar at `<uid>/avatar/<ts>.jpg`, so we list
      // the user's prefix and then descend into any folder we find.
      const listPrefix = async (prefix: string): Promise<void> => {
        let offset = 0;
        for (;;) {
          const { data, error } = await admin.storage
            .from(bucket)
            .list(prefix, { limit: pageSize, offset });
          if (error) throw error;
          const page = data ?? [];
          for (const obj of page) {
            const full = `${prefix}/${obj.name}`;
            // Supabase returns `id: null` for synthetic folder rows.
            if (obj.id === null || obj.id === undefined) await listPrefix(full);
            else paths.push(full);
          }
          if (page.length < pageSize) break;
          offset += pageSize;
        }
      };
      await listPrefix(userId);

      if (paths.length === 0) {
        results.push({ bucket, removed: 0 });
        continue;
      }

      const { error: rmError } = await admin.storage.from(bucket).remove(paths);
      if (rmError) throw rmError;
      results.push({ bucket, removed: paths.length });
    } catch (e) {
      // Logged, not thrown. See the docblock.
      console.error(`[delete-account] storage sweep failed for ${bucket}:`, e);
      results.push({ bucket, removed: 0, error: String(e) });
    }
  }

  return results;
}

// --- call site, before the account is torn down ---------------------------
const sweep = await sweepUserStorage(admin, userId);
console.log('[delete-account] storage sweep:', JSON.stringify(sweep));
```

## Rollback

```
Redeploy the previous revision of the delete-account function.
  supabase functions deploy delete-account   # from the prior commit
```

The change is **purely additive** and touches no schema, so rollback is a redeploy and nothing else. Note the
honest asymmetry: **rollback restores the code, not the objects.** Anything the sweep has already removed is
gone, which is the intended effect — this is the one operation here that is not reversible, and that is
precisely what the user asked for when they deleted their account.

## Verify (read-only, after deploying)

```sql
-- 1. Pick a TEST account only. Never run this against a real user.
--    Before deletion, note the object count:
select name from storage.objects
 where bucket_id in ('flag-photos','avatars')
   and (storage.foldername(name))[1] = '<test-uid>';
```

```
-- 2. Delete that test account through the app's own Settings flow.
-- 3. Re-run query 1. Expect ZERO rows.
-- 4. Check the function log for the line: [delete-account] storage sweep: [...]
--    with a non-zero `removed` for each bucket that had objects.
```

## What this does NOT close

The sibling findings bundled under R-1 in `05 §2` are **not** addressed by this artifact and remain open:

| id | still open |
|---|---|
| SR-051 | the deletion dialog stays open with an enabled Delete button after a failure |
| SR-059 | `verify_jwt` precondition undocumented — **`supabase/config.toml` does not exist** |
| SR-060 | the cascade documentation omits `flag_comments` and `point_events` |
| SR-061 | old avatars are never reclaimed on re-upload (`upsert:false`, no `.remove()`) — a *live* leak, not a deletion one |
| SR-062 | the support line carries no address or link |

SR-061 is worth separating out: it leaks avatars **during normal use**, not only at deletion, so it is not
fixed by anything above and wants its own pass.
