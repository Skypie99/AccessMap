# 09 — Phase 03C Privacy Architecture Decision (anonymous public-read contract)

**Status: LOCKED by evidence (08).** This records the intended boundary that production already
enforces as of the 2026-09-20 accepted capture. It proposes **no behavior change**. Each numbered
invariant (C-n) is enforced by
`supabase/tests/phase03c-anon-contract.test.sql` on the production-equivalent replay.
Jordan review of this document as the written contract is requested through Morgan (Const.
Art. 7.6). No code or behavior change here requires that gate.

Principles: least privilege; **server-enforced only** (client-side omission is not a control);
the founding anon decision (Jordan gate 2026-05-29 + `20260529175842`) is ratified and not
re-litigated; Stage-A compatibility grants stay until the owner-gated Stage B.

## 1. Roles

| Role | Who | How the boundary is enforced |
|---|---|---|
| `anon` | Every guest: web visitors (the app renders without a session) and native "browse as guest". No `signInAnonymously()` anywhere, so there is no JWT `sub`: `auth.uid()` is NULL, `auth.email()` is NULL. | Table/column GRANTs (privilege check, before RLS) → RLS (permissive OR'd, restrictive AND'd) → function EXECUTE ACLs → schema USAGE. |
| `authenticated` | Signed-in accounts (free sign-up). | Same layers, plus `auth.uid()` ownership predicates and `private.current_user_is_admin()` for admin. |
| `service_role` | Edge functions only; never the client. `BYPASSRLS`, but privileges still apply. | Narrow explicit grants (e.g. `flags.user_id`, `push_tokens(token,user_id)`, `verify_webhook_secret`, `flag_status_notifications_enabled`). It has no path to anon. Out of the anon contract. |

## 2. Anonymous PUBLIC surfaces (exhaustive)

| Surface | Rows | Fields / data class | Operations | Enforcing mechanism |
|---|---|---|---|---|
| `public.flags` read | every row with `status <> 'rejected'` | **All columns** (table-level grant): location (`lat`,`lng`), barrier data (`category`,`severity`,`description`,`context_tags`), photo refs (`photo_url`,`photo_object_key`,`photo_alt`), `status`, timestamps, community counters (`reopen_*`,`dispute_*`), `user_id` (pseudonymous UUID, founding-approved), `last_moderation_reason_code` (restore-class labels only on visible rows; see C-4) | SELECT | `GRANT SELECT ON flags TO anon` + permissive `"flags readable by anon" USING (true)` AND restrictive `"flags rejected hidden from anon" USING (status <> 'rejected')` |
| `public.flags` anonymous report | the inserted row only | `lat,lng,category,severity,description,photo_alt,context_tags,status` (+ `user_id`/`photo_url` must be NULL) | INSERT, incl. `RETURNING *` (shipped `createAnonFlag`) | column INSERT grants + permissive `"flags anon insert" WITH CHECK (user_id IS NULL AND photo_url IS NULL AND status='open')` AND restrictive `"flags insert status open only"`. The server-side rate limiter FDA-028 is out of scope. |
| `public.feedback` anonymous submit | none readable back | `category,body,contact_email,platform` (`user_id` must be NULL) | INSERT **without** RETURNING (shipped `feedbackStore.ts:83`) | column INSERT grants + `"feedback_insert_self_or_anon" WITH CHECK (user_id IS NULL OR user_id = auth.uid())`. No SELECT privilege, so read-back and RETURNING are 42501. |
| Primary photo bytes | object at a known public URL | image | HTTP GET of `/object/public/flag-photos/<key>` | `storage.buckets.public = true` (documented design, Privacy Policy photo caution). **No** `storage.objects` policy for anon/public, so no listing or enumeration. |
| Realtime | `flags` change events | `id, status` only (publication column list) | subscribe | `supabase_realtime` column list `(id,status)`. INSERT/UPDATE events are RLS-filtered for anon. DELETE events carry the PK only (replica identity `d`). |
| Static screens | — | — | — | No database surface. |

## 3. Anonymous-DENIED surfaces and why

| Surface | Anon result | Why anon cannot reach it |
|---|---|---|
| `flag_comments`, `flag_photos`, `point_events` | **0 rows**, no error | Stage-A **compatibility** table grant exists, but the only SELECT policies are `TO authenticated`. RLS default-deny returns zero rows. Kept so the shipped guest calls return empty instead of throwing (Stage B removes the grants). |
| `flag_status_history_public`, `flag_edit_history_public` | **42501** | Views are `security_invoker=true`. Anon has no privilege on the base tables `flag_status_history` / `flag_edit_history`, so the base-table check fails even though the view itself carries a compat grant. The shipped client catches this (`statusHistory.ts:76-79`). |
| `flag_status_history`, `flag_edit_history` (audit/history) | 42501 | No anon grant (column SELECT is `authenticated` only). |
| `users` (account/profile: email, display_name, points, is_admin) | 42501 | No anon table or column grant. `users_self_email` is `security_invoker`, needs `auth.uid()`, and has no anon grant. |
| `feedback` read (incl. `contact_email`, moderation columns) | 42501 | Anon holds INSERT columns only. The `{public}` SELECT policies are inert without the privilege. |
| `flag_moderation_events` (moderation audit: actor, reason, report link) | 42501 | No anon grant. Authenticated SELECT is admin-only by RLS. |
| `push_tokens`, `notification_preferences`, `realtime_subscribe_log`, `flag_verifications`, `comment_votes` | 42501 | No anon grant. |
| Reward tables (`flag_point_reward_claims`, `comment_reward_daily`, `comment_vote_reward_counts`) | 42501 | Revoked from every client role (03B). |
| `bk_2026_08_22_*` backups | 42501 | Revoked from every role (Stage A). Their erasure is Jordan / Phase 05. |
| **All functions** in `public`, `private`, `limiter` | 42501 | Anon holds EXECUTE on **none**. Anon has no USAGE on `private`/`limiter`. postgres's GLOBAL default ACL `{postgres=X/postgres}` makes future functions fail-closed. |
| Rejected flags | invisible | Restrictive `"flags rejected hidden from anon"`. |
| Any write other than the two INSERTs | 42501 / RLS violation | No UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER privilege for anon anywhere in `public`. |
| `storage.objects` listing and writes | denied | No anon/public storage policy. Upload/delete are `authenticated` own-folder policies (Stage A). |

## 4. Authenticated boundary (compatibility, unchanged by 03C)

- Reads all non-rejected `flags` (admin also sees rejected), all `flag_comments`, all `flag_photos`,
  both `*_public` history views, **own** `point_events` only, `users` public columns (`id,
  display_name, avatar_url, avatar_object_key, points, created_at`, plus the Stage-A compat
  `is_admin`), never another user's `email`. Non-admins do not see `feedback` rows whose body
  starts with `[REPORT]` (03B restrictive policy), and do not see `flag_moderation_events`.
- "Public" in object names (`*_public`) means **safe for any authenticated user**, never
  "anon-reachable". That vocabulary trap is permanent; the suite pins it.

## 5. Contract invariants (enforced by `phase03c-anon-contract.test.sql`)

- **C-1 anon read, positive.** Anon reads exactly the non-rejected fixture flags. The shipped
  `FLAG_READ_SELECT` projection and `select *` both work.
- **C-2 anon writes.** Anonymous `INSERT … RETURNING *` on `flags` works. Attributed, non-open or
  photo-URL inserts fail RLS. UPDATE/DELETE → 42501. Anonymous feedback insert works; spoofed
  `user_id` fails RLS; feedback RETURNING/SELECT → 42501. The anon INSERT column sets for
  `flags` and `feedback` are exact.
- **C-3 exact anon privilege surface.** Table-level SELECT set is exactly `{flags,
  flag_comments, flag_photos, point_events, flag_status_history_public,
  flag_edit_history_public}`. The any-column SELECT set is identical. Write privileges are only
  INSERT on `{flags, feedback}`. Permissive SELECT policies reaching `anon` or `PUBLIC` are exactly
  `{flags."flags readable by anon", feedback."feedback_select_maintainer",
  feedback."feedback_select_own"}` (the latter two inert: no anon SELECT privilege). No `flags`
  policy targets `PUBLIC` or uses `ALL`. **Any new anon grant or policy fails the suite and forces
  a deliberate contract update.**
- **C-4 moderation data.** Rejected rows are invisible to anon. After a real
  reject → restore cycle through the audited RPC, anon-visible reason codes are restore-class only.
  Anon sees 0 reject-class codes. Admin direct `rejected → resolved` fails. The restrictive policy
  exists and is restrictive.
- **C-5 compat surfaces yield nothing.** Anon gets 0 rows from `flag_comments`/`flag_photos`/
  `point_events` while an authenticated user sees the same fixture rows, which proves RLS is the
  discriminator. Anon gets 42501 from both views. Both views are `security_invoker=true`, and the
  base history tables grant anon nothing.
- **C-6 functions fail closed.** Anon EXECUTE count over `public/private/limiter` is 0. There is
  no anon USAGE on `private`/`limiter`. Representative RPCs throw 42501 for anon. A function and a
  table newly created by `postgres` in the test are not anon-accessible (default ACLs).
- **C-7 private tables.** Anon gets 42501 on every table in §3.
- **C-8 storage.** The `flag-photos` bucket is public, and no `storage` policy targets
  `anon`/`PUBLIC`.
- **C-9 realtime.** The `flags` publication column list is exactly `(id,status)`. `flags`,
  `flag_comments` and `flag_photos` are not `REPLICA IDENTITY FULL`.
- **C-10 authenticated compatibility.** Non-admin authenticated reads comments, photos and both
  views, sees own `point_events` only and no rejected flags, and cannot read `users.email`. Admin
  sees rejected flags and moderation events.

## 6. Constraints on any future change (design rules)

1. **Never narrow `flags` for anon with a column REVOKE.** It is a no-op against the table-level
   grant. An effective narrowing (table revoke + allowlist) breaks shipped `RETURNING *` and
   `select=*`. It requires a client cutover first (Stage-B pattern).
2. Never assume a `*_public` object is anon-safe. Anon exposure is a deliberate, tested contract
   change.
3. New tables and functions are fail-closed by default ACL. Any anon grant must update C-3/C-6.
4. Reject-class reasons must only ever coexist with `status='rejected'`. Any new moderation path
   must preserve C-4.

## 7. 🔴 Decisions for Sky (none block Phase 03C closure)

**D-1: Additional photos for guests (F3).**
- What: guests see the primary photo only; `flag_photos` rows are authenticated-only.
- Recommendation: **keep as-is.**
- Why: it is more private than the primary photo, and consistency would *broaden* anon.
- Alternative: an anon SELECT policy on `flag_photos`, after Jordan review.
- Impact: none now.

**D-2: Optional server-side defense-in-depth for the Stage-A compat grants (F4).**
- What: restrictive `TO anon USING (false)` SELECT policies on `flag_comments`, `flag_photos`,
  `point_events`. They are behavior-neutral by construction: restrictive policies can only remove
  rows, anon already gets 0, and authenticated is untouched.
- Recommendation: **do not apply separately**; let Stage B's revoke supersede it.
- Why: C-3 already catches repo drift, and a standalone production apply cycle costs more than it
  protects.
- Alternative: apply it now as a one-file migration if Stage B slips indefinitely.
- Impact: none now.

**D-3: FDA-042 premise drift, for Jordan (non-blocking).**
- What: anon cannot join `user_id` to identity, but any free account can (`users.display_name`).
  Pseudonymous clustering of one account's reports is therefore possible for anon, and
  name-linking is possible for anyone who signs up.
- Recommendation: **Jordan re-confirms or schedules a client-cutover narrowing.**
- Why: the founding premise was "anon", and the effective boundary is "anyone".
- Alternative: accept as-is.
- Impact: a future narrowing needs a native + web client release first.

**D-4: Repo `delete-account` source must not be deployed before the RPC family (F5).**
- What: the source calls `request_account_deletion`, which is absent in production.
- Recommendation: **route to Phase 06A (FDA-003/005) as a deploy-blocker note.**
- Why: deploying it would break the working v4 deletion path.
- Impact: none until someone deploys edge functions.
