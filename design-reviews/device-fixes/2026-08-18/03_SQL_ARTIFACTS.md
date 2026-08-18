# 03 — THE SQL ARTIFACT PACKET (Sky-applied, per-statement yes)

**Authored by Phase B. NOT applied by any agent.** No migration was run, no live
row was written. Every live query behind this file was a read.

Apply in the Supabase SQL editor (or the Sprint session's Phase 4). The editor
runs as `postgres`, which bypasses RLS — that is what makes A2 possible at all,
and the client-side self-promotion lock stays intact either way.

**Order matters: A1, then A2.** A2 on its own changes nothing you can see — the
gate cannot read the column it is about to set.

Verified against the live catalog on 2026-08-18 immediately before writing this.

---

## A1 — restore the `is_admin` column read to `authenticated`

**This is the one that unblocks your junk-data cleanup.** One statement fixes
five broken paths: owner flag delete, admin flag delete, owner photo delete,
admin photo delete, and the Admin-tab gate.

**Why it broke:** the 2026-05-27 email-privacy migration replaced table-wide
SELECT on `public.users` with an explicit column list. That list was written
three days before the `is_admin` column existed, and nobody extended it when
admin_role went live. Both delete policies subselect `users.is_admin`; RLS quals
run with the *caller's* privileges; so every authenticated delete errors 42501
before ownership is ever checked — including you deleting your own flag.

**Privacy note:** this exposes one boolean (is an account an admin) to signed-in
clients. The rows were already readable. The 2026-05-27 email protection is
untouched — `email` stays ungranted.

```sql
-- PRE-STATE (run first, keep the output)
select column_name
  from information_schema.column_privileges
 where table_schema='public' and table_name='users'
   and grantee='authenticated' and privilege_type='SELECT'
 order by column_name;
-- Expected today: avatar_url, created_at, display_name, id, points
-- (is_admin ABSENT — that absence is the bug)

-- THE CHANGE
grant select (is_admin) on public.users to authenticated;

-- VERIFY
--   1. Re-run the pre-state query → is_admin now appears in the list.
--   2. On the device, signed in as any account: delete one of YOUR OWN junk
--      flags → it disappears, no error. (Before this, that errored with
--      "You don't have permission.")

-- ROLLBACK (returns to today's known-broken state)
revoke select (is_admin) on public.users from authenticated;
```

---

## A2 — make `skylerhalisky@gmail.com` an admin

Main account only. `ranchin2023@gmail.com` stays non-admin — it is junk-slated.
Consequence to note: the Admin tab appears only on the device signed in as
skylerhalisky.

The change is written to look the account up by email so there is no UUID to
transcribe by hand; the expected id is shown so you can confirm the pre-state
matches. A mistyped email updates 0 rows rather than the wrong person.

```sql
-- PRE-STATE
select pu.id, u.email, pu.is_admin
  from public.users pu join auth.users u on u.id = pu.id
 where u.email = 'skylerhalisky@gmail.com';
-- Expected: 8f99f7e0-bbad-4fd8-b3d0-4b6b99bdc8b2 | skylerhalisky@gmail.com | false

-- THE CHANGE
update public.users set is_admin = true
 where id = (select id from auth.users where email = 'skylerhalisky@gmail.com');
-- Expected: UPDATE 1   (UPDATE 0 = the email did not match — change nothing else,
--                       re-check the pre-state)

-- VERIFY
select pu.is_admin from public.users pu
  join auth.users u on u.id = pu.id
 where u.email = 'skylerhalisky@gmail.com';         -- → true
-- App (A1 applied, signed in as skylerhalisky, relaunch): Admin appears in the
-- drawer and its flag list loads.

-- ROLLBACK
update public.users set is_admin = false
 where id = (select id from auth.users where email = 'skylerhalisky@gmail.com');
```

---

## A3 — admin DELETE policy: **NOT NEEDED, it already exists**

The brief allowed that the `flags` table might have no admin delete policy. It
has one. Verified live 2026-08-18:

| Policy | Table | Permissive | Roles | Applied |
|---|---|---|---|---|
| `admin delete any flag` | `public.flags` | PERMISSIVE | authenticated | (with admin_role) |
| `flag-photos admin delete` | `storage.objects` | PERMISSIVE | authenticated | §C-12, 2026-07-29 |

So the photo ride-along is already designed and built the way it should be:
AdminScreen's Remove calls the same `deleteFlag`, which gathers photo paths
first and removes them after the row (SR-050), and the Storage policy permits an
admin to do it. **Admin delete takes the row AND its photos.** That was the
deliberate C-12 pairing, and it needs no new artifact — only A1, because both
policies read the column A1 grants.

`flags.ts` carried a stale comment saying C-12 was "written and waiting"; that
is corrected in commit `4e884de`.
