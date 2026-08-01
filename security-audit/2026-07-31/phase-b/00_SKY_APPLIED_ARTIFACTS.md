# SKY-APPLIED ARTIFACT PACKET — AccessMap security audit, Phase B

**Date:** 2026-07-31 · **Branch:** `sec/phase-b-hardening-2026-07-31` · **Base:** `main` @ `9964f8f`
**Live project:** `Accessable City App` `kldlwszpfkdmsjrjhjym` · Postgres 17.6

---

## ★ READ THIS BEFORE YOU RUN ANYTHING

**Nothing in this file has been applied. No agent may apply any of it.** Every statement below is
a document. The train that wrote it made zero server-side changes — Phase A ran read-only catalog
queries, Phase B wrote code and text. That is the prime law of this train and it held.

**None of this is urgent.** The live database holds 19 flags and 4 accounts, all yours. Today's
blast radius on everything below is approximately zero. These are graded for the day real testers
exist, which is the day they start being true. Schedule them; don't lose an evening to them.

### The one rule that matters more than the SQL

> ★ **CAPTURE THE LIVE PRE-STATE BEFORE YOU APPLY ANYTHING THAT REPLACES A FUNCTION OR POLICY.**

This is the C-5 rule, and this project has already been bitten by the class it protects against: a
prior pass nearly restored a *wrong function body* because it reasoned from repo files instead of
live state. Phase A found the repo and production disagree in **both** directions — 11 of the 12
migrations applied in late July have no file at all, and the `2026-07-27_drift_capture_*.sql` files
look like current-state definitions but are actually **pre-apply rollback snapshots**. One Phase A
lens misread one of those and produced a false finding before catching itself.

So each artifact below is tagged:

- **`[LIVE-VERIFIED]`** — the pre-state was read from the live catalog on 2026-07-31. Lower risk.
- **`[LIVE-VERIFIED, PARTIAL]`** — read live, but the capture elides part of the body. **Capture
  before applying.**
- **`[REPO-INFERRED]`** — the pre-state comes from repo files. **Mandatory live capture. Do not
  apply on repo inference alone.**

Where an artifact replaces a function, `CREATE OR REPLACE` overwrites the *whole body*. If the live
body differs from what is quoted here — extra clauses, a different header, a `SET search_path` you
did not expect — applying it silently deletes those differences. The capture is not ceremony.

### The generic pre-state capture

Run this first for whatever object the artifact touches, save the output, and diff it against the
"assumed pre-state" block in that artifact. If they differ, **stop and re-derive** rather than
adapting the statement on the fly.

```sql
-- Function bodies (exact, including header and search_path)
select p.oid::regprocedure as signature, pg_get_functiondef(p.oid) as body
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ( /* names from the artifact */ );

-- Policies
select policyname, cmd, roles, qual as using_expr, with_check
from pg_policies where schemaname = 'public' and tablename = '<table>';

-- Triggers on a table (13 exist on public.flags — know which you are touching)
select tgname, tgenabled, pg_get_triggerdef(oid)
from pg_trigger where tgrelid = 'public.<table>'::regclass and not tgisinternal;

-- Column privileges
select column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema='public' and table_name='<table>' and grantee in ('anon','authenticated')
order by column_name, grantee;

-- Constraints
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'public.<table>'::regclass;

-- Storage buckets
select id, public, file_size_limit, allowed_mime_types from storage.buckets;
```

### Suggested order

1. **A-01** (points revoke) — then **A-02** (self-award). A-02 protects nothing until A-01 lands.
2. **A-03** (bucket caps) — two dashboard fields, one minute, highest value per effort in the audit.
3. **A-05** (status-update throttle) — the only Critical with real-world harm.
4. **A-04**, **A-06**, **A-08** — throttle and constraint work.
5. Everything else, whenever.

Question-gated artifacts (**A-09**, **A-10**, **A-16**, **A-17**, **A-19**) present the trade
instead of a statement. They are deliberately not decided here.

---

# A-01 · Revoke direct client writes to points, streaks and email

**Findings:** TB-1 / A3-7 / A3-11 / AB-13 (three Phase A lenses found this independently)
**Severity:** HIGH · **Tag:** `[LIVE-VERIFIED]` — read from `information_schema.column_privileges`
**Prior ID:** SR-048, whose recorded disposition was never executed.

### What is wrong

`public.users` grants column `UPDATE` to `anon` and `authenticated` on every column. The row policy
`users update own row` pins `is_admin` — correctly, and that pin is the most important thing on the
table, **do not disturb it** — but nothing pins `points`, `streak_days`, `longest_streak_days`,
`last_active_date` or `email`.

So `PATCH /rest/v1/users?id=eq.<self>` with `{"points": 999999}` works. Tier, achievements and
leaderboard rank are all pure functions of `points`, so that one request buys permanent rank 1, top
tier and every achievement. `users_points_nonneg_chk` constrains the sign, not the magnitude.

### Assumed pre-state

`authenticated` holds `SELECT, INSERT, UPDATE, REFERENCES` on `points`; `INSERT, UPDATE,
REFERENCES` on `streak_days`, `longest_streak_days`, `last_active_date`, `is_admin`, `email`.
`email` correctly has **no** SELECT (that revoke holds — verified). The client legitimately writes
only `display_name` and `avatar_url`.

### The statement

This mirrors the `email` SELECT revoke that already works on this table. Postgres ignores
column-level grants while a bare table-level grant is in effect, so the bare grant is revoked first
and the wanted columns re-granted — same shape as `2026-05-27_users_email_privacy.sql`.

```sql
-- A-01 · lock the reputation columns to the server
begin;

revoke update on public.users from anon, authenticated;

grant update (display_name, avatar_url)
  on public.users
  to authenticated;

commit;
```

★ **`avatar_url` MUST be in that grant list.** `ProfileScreen` calls
`updateUserProfile(user.id, { avatar_url })` when a user changes their profile photo. Omitting it
breaks avatar upload — a security fix that breaks a working feature is a defect, not a fix.

Points continue to be awarded: `handle_flag_status_change` and `handle_comment_added` are
`SECURITY DEFINER` and run as the owner, so they are unaffected by a revoke on `authenticated`.

### Rollback

```sql
grant update on public.users to anon, authenticated;
```

### Verify (read-only)

```sql
-- expect: display_name + avatar_url only, for authenticated
select column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema='public' and table_name='users'
  and privilege_type='UPDATE' and grantee in ('anon','authenticated')
order by grantee, column_name;
```

Then confirm the app still works: change a display name, change a profile photo, and verify a
status change still awards points.

---

# A-02 · Close reporter self-award

**Findings:** A3-8 / TB-4 / AB-1 (three lenses) · **Severity:** HIGH
**Tag:** `[LIVE-VERIFIED, PARTIAL]` — ★ the capture elides the tail of the reporter branch.
**MANDATORY live capture of `handle_flag_status_change` before applying.**

### What is wrong

The points trigger guards the **actor** branch with `auth.uid() is distinct from new.user_id` — that
guard was added 2026-07-27 and holds. The **reporter** branch has no `auth.uid()` test at all, and
pays *more*: +10 on verify, +15 on resolve, against the actor's +3/+7.

So on your own flag: open → verified → resolved is **+25 points in three requests**, solo, no
collusion. With the 20-flags-per-24h cap that is 500 points a day.

### ★ Sequencing

**Apply A-01 first.** While `points` is directly writable, fixing the trigger protects nothing —
the attacker skips the trigger entirely and writes the column. A-02 alone is theatre; A-01 alone
leaves a slower farm. They are one piece of work.

### The change

One conjunct, into the reporter branch's `if`, mirroring the actor branch:

```
if reporter_bonus > 0
   and new.user_id is not null
   and auth.uid() is distinct from new.user_id then   -- << ADD THIS LINE
```

### ★ Why there is no full CREATE OR REPLACE in this file

Writing one would mean reproducing the entire live function body from a capture that is **known to
be incomplete** — the Phase A quote elides the reporter branch's tail, where the `point_events`
insert lives, and elides the column list of the `flag_status_history` insert. Reproducing it from
memory would delete whichever statements the elision hid. That is precisely the C-5 failure this
train exists to avoid, so the artifact stops here deliberately.

**Procedure:** capture `pg_get_functiondef` for `public.handle_flag_status_change()`, paste it into
an editor, add the one conjunct above, and apply that. Two things must survive verbatim:

- the `insert into public.flag_status_history (...)` at the top — the audit trail that makes the
  mass-flip in A-05 recoverable;
- the admin `rejected` branch and its spam penalty.

### Rollback

`supabase/migrations/2026-07-27_drift_capture_handle_flag_status_change.sql` is the pre-apply
snapshot of this function. ⚠️ It is **older than the 2026-07-27 actor-guard and history-insert
fixes**, so restoring it wholesale would revert those too. Roll back to **your fresh capture**, not
to the drift-capture file.

### Verify

```sql
select pg_get_functiondef(p.oid) from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='handle_flag_status_change';
```
Expect `is distinct from new.user_id` to appear **twice** (reporter and actor branches).

Behavioural check: verify your own flag — points must not move. Verify someone else's — actor
points must still be awarded.

---

# A-03 · Cap the flag-photos bucket ★ CHEAPEST HIGH-VALUE FIX IN THE AUDIT

**Findings:** A3-3 / AB-9 · **Severity:** HIGH · **Tag:** `[LIVE-VERIFIED]`
**This is dashboard configuration, not SQL. About one minute.**

### What is wrong

Read live from `storage.buckets`:

| id | public | file_size_limit | allowed_mime_types |
|---|---|---|---|
| `flag-photos` | **true** | **null** | **null** |

`null` means unlimited size and any MIME type. The only server-side constraint on upload is a path
prefix check (`(storage.foldername(name))[1] = auth.uid()::text`). Every other control — the 10 MB
cap, the extension allow-list, the magic-byte sniff, the EXIF strip — is TypeScript in
`uploadStrippedImage`, and all of it is bypassed by posting straight to the Storage API.

So one free account can upload unlimited files of any type and size into a world-readable bucket on
your project: an uncapped storage bill, and arbitrary content hosted under your project name with
no moderation queue.

### Do it

Supabase Dashboard → **Storage** → `flag-photos` → **Settings**:

1. **File size limit** → `10 MB`
2. **Allowed MIME types** → `image/jpeg, image/png, image/webp, image/heic`

These match what the client already enforces (`ALLOWED_PHOTO_EXTS`, `MAX_PHOTO_BYTES`), so honest
uploads are unaffected. **Banked question 5 was about these numbers — they are a suggestion, not a
finding. If your iPhone camera produces larger files, raise the cap; the point is that a number
exists.**

### Rollback

Set both fields back to empty (that is the current state: `null` / `null`).

### Verify

```sql
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id='flag-photos';
```

---

# A-04 · Throttle comment inserts

**Finding:** AB-4 · **Severity:** HIGH · **Tag:** `[REPO-INFERRED]` — ★ **mandatory live capture**:
confirm no trigger already exists on `public.flag_comments`.

### What is wrong

`flag_comments` is the one user-writable table that never got a rate-limit trigger. Its migration is
62 lines and contains no triggers at all; the only limit is a 500-character CHECK. Meanwhile
`handle_comment_added` pays **+1 point per insert**.

So scripted comment spam is simultaneously free points, harassment, and realtime fan-out to every
subscriber. It is also a second points-farm route that A-01 and A-02 do not touch.

### Pre-state capture

```sql
select tgname, tgenabled from pg_trigger
where tgrelid='public.flag_comments'::regclass and not tgisinternal;
-- expect: no rate-limit trigger. If one exists, STOP — re-derive.
```

### The statement

Modelled on `check_feedback_rate_limit`, which is applied and working — but with the cohort guard
**inverted**. The feedback throttle guards the anonymous cohort; `flag_comments` has no anon insert
policy, so this keys on the authenticated user, the way `check_flag_creation_rate_limit` does.

```sql
-- A-04 · per-user comment throttle
create or replace function public.check_comment_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent     integer;
  user_cap   constant integer := 20;   -- comments per hour per user (tune me)
begin
  if new.user_id is null then
    return new;
  end if;

  select count(*) into recent
    from public.flag_comments
   where user_id = new.user_id
     and created_at > now() - interval '1 hour';

  if recent >= user_cap then
    raise exception 'You are commenting too quickly. Please try again in a little while.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke execute on function public.check_comment_rate_limit() from public, anon, authenticated;

drop trigger if exists enforce_comment_rate_limit on public.flag_comments;
create trigger enforce_comment_rate_limit
  before insert on public.flag_comments
  for each row execute function public.check_comment_rate_limit();
```

**20/hour is a starting number, not a finding.** It is deliberately generous — a genuinely engaged
user in a busy thread should never hit it. The error message is written to be readable by a real
person who hit it by accident, and it is the string a screen reader will announce.

### Rollback

```sql
drop trigger if exists enforce_comment_rate_limit on public.flag_comments;
drop function if exists public.check_comment_rate_limit();
```

### Verify

```sql
select tgname, tgenabled from pg_trigger
where tgrelid='public.flag_comments'::regclass and not tgisinternal;
-- expect enforce_comment_rate_limit, tgenabled='O'
```

---

# A-05 · Throttle status updates ★ THE ONE WITH REAL-WORLD HARM

**Finding:** AB-2 · **Severity:** CRITICAL · **Tag:** `[REPO-INFERRED]` for the policy (file
self-attests applied+verified); `[LIVE-VERIFIED]` that **all three existing throttles are
`BEFORE INSERT`** and none covers UPDATE.

### What is wrong

The policy `flags status update by any authenticated` is `USING(true) WITH CHECK(true)`. **That
policy is deliberate** — it is how community triage works, and three migrations document the
reasoning. It is not the defect and this artifact does not touch it.

The defect is that **there is no throttle on the UPDATE path at all.** All three rate limits are
`BEFORE INSERT`. The compare-and-set in `updateFlagStatus` is a filter *our own client* supplies; a
hand-rolled REST call omits it.

So one free account sends one request:

```
PATCH /rest/v1/flags?status=eq.open   {"status":"resolved"}
```

PostgREST updates every matching row. The map now shows zero barriers. **This is the only finding
in the audit whose failure mode is a person in a wheelchair trusting a map that says the route is
clear.**

It is recoverable — `flag_status_history` is trigger-only and records actor plus from/to, so you can
reconstruct and identify. The residual harm is the **window**, and nothing alerts you.

Second-order: the bulk update fires the notify trigger once *per row*, so one request also becomes N
outbound webhook posts and N push fan-outs.

### The statement — a per-user throttle on status changes

```sql
-- A-05 · per-user status-change throttle
create or replace function public.check_status_update_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent   integer;
  user_cap constant integer := 40;   -- status changes per hour per user (tune me)
begin
  -- Only meter genuine status transitions by a signed-in actor. Owner edits and
  -- the null-uid path (account-deletion anonymisation) are untouched.
  if auth.uid() is null or new.status is null or new.status = old.status then
    return new;
  end if;

  select count(*) into recent
    from public.flag_status_history
   where user_id = auth.uid()
     and created_at > now() - interval '1 hour';

  if recent >= user_cap then
    raise exception 'You have changed a lot of reports in a short time. Please try again shortly.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke execute on function public.check_status_update_rate_limit() from public, anon, authenticated;

drop trigger if exists enforce_status_update_rate_limit on public.flags;
create trigger enforce_status_update_rate_limit
  before update of status on public.flags
  for each row execute function public.check_status_update_rate_limit();
```

★ **The `auth.uid() is null` early-out is load-bearing and must stay.** The same early-out in the
existing clamp trigger is what lets account-deletion anonymisation rewrite rows. Removing it would
break account deletion.

⚠️ **Ordering caveat to check during your capture.** This counts rows in `flag_status_history`,
which is written by `handle_flag_status_change`. If that trigger fires *before* this one on the same
statement, the current row may already be counted, making the effective cap `user_cap - 1`. Harmless,
but check `tgname` ordering (Postgres fires `BEFORE` triggers alphabetically) and adjust the constant
if you want an exact number.

### Rollback

```sql
drop trigger if exists enforce_status_update_rate_limit on public.flags;
drop function if exists public.check_status_update_rate_limit();
```

### Verify

```sql
select tgname, tgenabled from pg_trigger
where tgrelid='public.flags'::regclass and not tgisinternal order by tgname;
```

### ★ The throttle treats the symptom — banked question 6 is the real question

A throttle bounds the damage per account per hour. It does not answer *"should one stranger's single
tap be enough to mark a barrier resolved?"* That is a product decision with a safety consequence and
it is yours.

Three options, in increasing cost:

1. **Throttle only** (above). Cheapest. One account still flips 40 reports an hour.
2. **Throttle + transition guard.** `supabase/migrations/2026-06-09_status_transition_guard_PROPOSED.sql`
   is already written, complete with rollback, and never applied. It blocks illegal transitions —
   but explicitly **not** `open → resolved`, so it does **not** stop the mass-flip. Worth applying
   on its own merits; not a substitute.
3. **Quorum for non-owner resolution.** The machinery already exists and is dead: `flag_verifications`
   has a null-safe self-vote check and a `weight` column, but `updateFlagStatus` writes
   `flags.status` directly and never consults it. This is the real fix and the largest change.

**Also worth knowing:** there is currently **no working moderation UI** (see A-19), so your recovery
path today is the SQL editor.

---

# A-06 · CHECK constraints on user-supplied URLs

**Findings:** TB-3 / IO-3 (photo_url) · IO-1 (avatar_url) · **Severity:** HIGH
**Tag:** `[REPO-INFERRED]` — ★ **mandatory live capture**: confirm no constraint already exists.

### What is wrong

`flags.photo_url` and `users.avatar_url` are plain `text` with no CHECK. Any signed-in user can set
them to a URL on a server they control; those columns render as images on ~12 surfaces, several
guest-visible. It is a beacon: it harvests the IP and timestamp of everyone who views a barrier
report near the attacker.

**The client half of this is already fixed** on the Phase B branch — `src/lib/remoteImageUrl.ts`
rejects any URL outside the Storage origin at render time. That protects viewers against rows
already in the table. It cannot stop a hostile client from *writing* one, which is what this does.
Neither half is sufficient alone.

### ★ Pre-flight, and it is not optional

A `CHECK` bites on write, so existing bad rows survive but their owners' next profile edit starts
failing. Count them first:

```sql
select count(*) from public.flags
 where photo_url is not null
   and photo_url not like 'https://kldlwszpfkdmsjrjhjym.supabase.co/storage/v1/object/public/%';

select count(*) from public.users
 where avatar_url is not null
   and avatar_url not like 'https://kldlwszpfkdmsjrjhjym.supabase.co/storage/v1/object/public/%';
```

Both should be 0 today (there is 1 photo in the whole database). **If either is non-zero, decide what
happens to those rows before adding the constraint.**

### The statement

```sql
-- A-06 · pin user-supplied image URLs to our own Storage origin
begin;

alter table public.flags
  drop constraint if exists flags_photo_url_origin_chk;
alter table public.flags
  add constraint flags_photo_url_origin_chk check (
    photo_url is null
    or photo_url like 'https://kldlwszpfkdmsjrjhjym.supabase.co/storage/v1/object/public/flag-photos/%'
  );

alter table public.users
  drop constraint if exists users_avatar_url_origin_chk;
alter table public.users
  add constraint users_avatar_url_origin_chk check (
    avatar_url is null
    or avatar_url like 'https://kldlwszpfkdmsjrjhjym.supabase.co/storage/v1/object/public/flag-photos/%'
  );

commit;
```

The project ref is not a secret — it ships in the client bundle by design. `like` with a leading
literal is an anchored prefix match, so the `#fragment` trick that defeats a substring test does not
work here.

### Rollback

```sql
alter table public.flags drop constraint if exists flags_photo_url_origin_chk;
alter table public.users drop constraint if exists users_avatar_url_origin_chk;
```

### Verify

```sql
select conrelid::regclass as tbl, conname, pg_get_constraintdef(oid)
from pg_constraint
where conname in ('flags_photo_url_origin_chk','users_avatar_url_origin_chk');
```

---

# A-07 · Extend the clamp list; fix the dispute/reopen RPCs

**Findings:** A3-1 / A3-2 · **Severity:** MEDIUM (latent) — **reverts to HIGH the day a Disputed
badge ships, and `DISPUTE_THRESHOLD` is already 2**
**Tag:** `[LIVE-VERIFIED, PARTIAL]` — ★ the function header is elided and **the trigger name was
never captured**. Mandatory live capture.

### What is wrong

Two independent paths let any signed-in user set moderation counters to any value on **anyone's**
report.

**Path 1 — the stale clamp list.** `enforce_flag_status_only_for_non_owner()` reverts a hardcoded
allow-list of 10 columns for non-owner updates. Fork-5 added four columns
(`dispute_requests`, `dispute_requests_reset_at`, `reopen_requests`, `reopen_requests_reset_at`) and
**the trigger was never extended**. Combined with the deliberate permissive UPDATE policy, they are
freely writable.

**Path 2 — the RPCs.** `increment_dispute_request` and `increment_reopen_request` are
`SECURITY DEFINER`, so they bypass RLS entirely, and neither has per-user dedup or a rate limit.
Unlimited votes from one account. Dedup today is client-side AsyncStorage, which the user controls.

### Why it is only MEDIUM today

Nothing renders either counter. They are write-only. **This reverts to HIGH the moment a Disputed
badge ships** — and at threshold 2, one person marks any barrier report "Disputed" the instant a
surface reads it. **Fix this before that badge ships, not today.**

### ★ Capture first — two things are genuinely unknown

```sql
-- 1. the trigger name (Phase A named the FUNCTION only; 13 triggers exist on flags)
select tgname, pg_get_triggerdef(oid) from pg_trigger
where tgrelid='public.flags'::regclass and not tgisinternal order by tgname;

-- 2. the full function bodies — increment_reopen_request was NEVER quoted,
--    only asserted to be "identical in shape" to its sibling. Verify that.
select p.oid::regprocedure, pg_get_functiondef(p.oid) from pg_proc p
join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
and p.proname in ('enforce_flag_status_only_for_non_owner',
                  'increment_dispute_request','increment_reopen_request');

-- 3. all 16 columns, so the allow-list below is complete
select column_name from information_schema.columns
where table_schema='public' and table_name='flags' order by ordinal_position;
```

### Direction for path 1 — invert the list so it fails closed

The current trigger names the columns to **revert**, which is why adding a column silently opened a
hole. Invert it: name the columns a non-owner may **change** (`status`, and whatever your capture
shows is legitimately mutable), and revert everything else by assignment from `old`. Then the next
column added to `flags` is protected by default instead of exposed by default.

Write it from your captured body — the elided header carries the `LANGUAGE` / `SECURITY DEFINER` /
`SET search_path` clauses, and re-creating it from the fragment in Phase A would drop them.

★ **Preserve the `auth.uid() is null or auth.uid() = old.user_id` early-out verbatim.** It is
load-bearing for account-deletion anonymisation.

### Direction for path 2 — count rows, do not blind-increment

The durable fix is a `flag_disputes(flag_id, user_id)` table with a unique constraint, the RPC
inserting a row and returning a **count of distinct rows**. That makes one-vote-per-user a database
guarantee rather than a client courtesy, and it is what the client comments already wish existed.

⚠️ **Privacy tension, and it is a real one.** Storing `(flag_id, user_id)` is exactly the linkage a
prior Jordan gate deliberately avoided when it specified that these RPCs store no `user_id` — the
same concern as A-16. A hash of `(user_id, flag_id)` with a per-table salt gives you dedup without a
readable join. **This is a design decision, not a patch. It is yours.**

**Zero-cost interim:** raise `DISPUTE_THRESHOLD` in `src/lib/disputes.ts` from 2. One client
constant, no migration, no privacy cost. It does not fix the hole; it raises the bar while you decide.

### Rollback / verify

Rollback for path 1 is your captured `CREATE OR REPLACE`. Verify with `pg_get_functiondef` and by
confirming a non-owner cannot move a counter.

---

# A-08 · Anchor the flag_photos INSERT policy and add the ownership check

**Finding:** A3-4 · **Severity:** MEDIUM · **Tag:** `[LIVE-VERIFIED]` for the expression;
⚠️ **the policy NAME is ambiguous in the Phase A capture — read it live before writing SQL.**

### What is wrong

Live `WITH CHECK` on `flag_photos` INSERT:

```sql
POSITION((('/flag-photos/' || auth.uid()::text) || '/') IN url) > 0
```

Two defects:

1. **Unanchored.** `POSITION(x IN y) > 0` means "appears anywhere", so
   `https://attacker.example/payload.jpg#/flag-photos/<own-uid>/` passes.
2. **No flag-ownership check.** Nothing requires the `flag_id` to be a flag you own — so you can
   attach an image to *anyone's* report. The sibling UPDATE and DELETE policies on this same table
   **do** carry exactly that `EXISTS` check; INSERT is the odd one out.

This partially defeats prior finding F3, which is recorded as closed.

### Capture first

```sql
select policyname, cmd, roles, qual, with_check from pg_policies
where schemaname='public' and tablename='flag_photos';
```
Note the **exact** INSERT policy name, and copy the `EXISTS` clause from the sibling UPDATE/DELETE
policies rather than retyping it.

### Direction

Replace the substring test with an anchored prefix match on the full public-object URL (same shape
as A-06), and add the ownership `EXISTS` that its siblings already use:

```sql
with check (
  url like 'https://kldlwszpfkdmsjrjhjym.supabase.co/storage/v1/object/public/flag-photos/'
           || auth.uid()::text || '/%'
  and exists (
    select 1 from public.flags f
     where f.id = flag_photos.flag_id and f.user_id = auth.uid()
  )
)
```

Fill in the real policy name from your capture. Rollback is `DROP POLICY` + re-create from the
captured definition.

---

# A-09 · Make flag_edit_history an actual audit trail  ⟨direction only⟩

**Finding:** A3-6 · **Severity:** MEDIUM · **Tag:** `[LIVE-VERIFIED]`

`flag_edit_history` is **client-written** — the policy lets the flag owner insert rows, and the
client supplies `old_values` / `new_values`. An attacker simply does not write the row, or writes a
flattering one. It is security theatre against a motivated actor, and it currently *looks* like
protection, which is worse than nothing.

**The correct design already exists in this database.** `flag_status_history` is trigger-only with
`WITH CHECK false` on direct insert, and it is correct. Mirror it: move the write to an `AFTER
UPDATE` trigger on `flags` and set the client-insert policy to `WITH CHECK false`. Live confirmation
that no such trigger exists today: the trigger list on `public.flags` contains no `AFTER UPDATE`
history writer (`on_flag_insert_history` fires on INSERT only).

Left as direction rather than a statement because the trigger body needs to decide *which* column
changes are worth recording, and that is a product judgement about what the edit history is for.

---

# A-10 · The owner-edit rule  ⟨QUESTION-GATED — banked question 2⟩

**Finding:** A3-5 · **Severity:** MEDIUM · **Tag:** `[LIVE-VERIFIED, PARTIAL]` — four elisions in
the captured `WITH CHECK`; **you cannot reconstruct this policy from Phase A's capture.**

**Written policy:** "owner may edit only while `open`, never move the pin."
**Live behaviour:** owner may edit `lat`, `lng`, `category`, `severity`, `description`, `photo_url`,
`created_at` and `status` — **at any status, forever.**

The policy `flags owner edit open` that was meant to enforce the written rule is **dead code**:
permissive policies are OR-ed, so the broad triage policy subsumes it. It can never be the binding
constraint.

**The risk is verification laundering:** get a benign flag verified by the community, then relocate
and rewrite it. The community's trust travels with the row.

**This is a product question before it is a migration, and it is yours.** Which did you mean? The
gap matters most for a report others have already verified. Once you answer, the fix is a clamp in
the same trigger as A-07, not a new policy — and it needs the same live capture.

---

# A-11 · The anonymous rate limit  ⟨QUESTION-GATED — banked question 3 · ★ DO NOT "FIX" REFLEXIVELY⟩

**Findings:** A3-9 / TB-6 · **Severity:** MEDIUM · **Tag:** `[LIVE-VERIFIED]`

The anonymous flood cap is **global**: 100 anonymous reports per hour across the entire app, not per
actor. So one script consumes the budget and **switches off anonymous reporting for everyone** — and
the anonymous path is the privacy-preserving one, used by exactly the people most at risk.

**I am not proposing a fix, and that is deliberate.** Every alternative costs something real:

| Option | Cost |
|---|---|
| IP-keyed limits | Means logging IPs against disability-adjacent reports — a privacy regression your constraints deliberately avoided. |
| Require an account | Removes the anonymous path entirely. |
| Raise the global cap | Raises the cost of the DoS without closing it. |
| Accept | One script can pause anonymous reporting for an hour. Recoverable, visible, no data loss. |

The function's own comment is honest about the bind: *"No server-side per-user limit is possible
without IP or device ID."*

**A global cap with a documented no-IP constraint may well still be the right trade for a solo
maintainer serving this user base.** Accepting it is a legitimate answer and it is recorded as such
in the accepted-risks register. What would be wrong is changing it without you choosing.

⚠️ **Do not apply the old C-5 proposal.** You skipped it on 2026-07-27 for a good reason: it would
silently tighten the live cap from 100 to 60.

---

# A-12 · Grant tidying  ⟨low risk, bundle with anything⟩

**Finding:** A3-10 · **Severity:** LOW · **Tag:** `[LIVE-VERIFIED]` · Not exploitable.

Three trigger functions (`set_flag_updated_at`, `update_flags_updated_at`,
`handle_push_token_updated_at`) still carry EXECUTE for `anon` and `authenticated`. **Not
reachable** — PostgREST does not expose trigger-returning functions as RPC. Housekeeping.

The three views (`flag_edit_history_public`, `flag_status_history_public`, `users_self_email`) carry
Supabase's default blanket `GRANT ALL`. All three correctly have `security_invoker=true` (Phase A
checked; this would have been a Critical otherwise). Narrowing to `SELECT` is hygiene.

```sql
revoke execute on function public.set_flag_updated_at() from anon, authenticated;
revoke execute on function public.update_flags_updated_at() from anon, authenticated;
revoke execute on function public.handle_push_token_updated_at() from anon, authenticated;

revoke all on public.flag_edit_history_public   from anon, authenticated;
revoke all on public.flag_status_history_public from anon, authenticated;
revoke all on public.users_self_email           from anon, authenticated;
grant select on public.flag_edit_history_public   to authenticated;
grant select on public.flag_status_history_public to authenticated;
grant select on public.users_self_email           to authenticated;
```

⚠️ Confirm current view grants before running — if any surface reads a view as `anon`, that read
breaks. Not worth its own apply window; bundle it.

**Rollback:** re-grant from your capture. **Verify:** `\dp` on the views; `has_function_privilege`
on the three functions.

---

# A-13 · Enable leaked-password protection

**Finding:** A3-13 (prior ID F4, still open since 2026-06-01) · **Severity:** LOW · Dashboard toggle.

Supabase Auth → **Authentication → Policies → Leaked password protection** → enable. Checks new
passwords against HaveIBeenPwned at signup. One toggle, no code, no migration.

Live advisor still reports: *"Leaked password protection is currently disabled."*

---

# A-14 · Back-fill the missing migrations

**Findings:** X-2 / IO-4 · **Severity:** MEDIUM · **Tag:** `[LIVE-VERIFIED]` · Pure documentation —
changes nothing running.

Of the 12 migrations applied live on 2026-07-27/29, **11 have no file** in `supabase/migrations/`.
Only `rls_initplan_consolidated` has one.

Missing: `sr009`, `fork2_oa_actor_guard`, `a4_3`, `sr024`, `sr018`, `a2_1`, `a2_2`, `sr001`, `a4_1`,
`fork5_w1_dispute_counter`, `sr050`.

**The SQL is not lost** — it is recorded in `design-reviews/ship-ready/04b_sql_sweep_lens4b_RECOVERED.md`,
`DECISIONS.md` and `10_CONSERVATION_TABLE.md`.

**Why it matters:** a fresh bootstrap — new staging project, new machine, disaster recovery —
produces a database **less secure than production**.

**`sr018` is already done.** Phase B committed
`supabase/migrations/2026-07-27_sr018_verify_webhook_secret_revoke.sql` and added the missing REVOKE
to `schema.sql`, because that one had verbatim recovered DDL and was the sharpest instance.

**The other 10 are deliberately not written here.** Re-deriving ten migrations from prose
descriptions would risk inventing SQL that does not match production — the exact failure this train
is built to avoid. The honest procedure is: for each name, `pg_get_functiondef` / `pg_policies` the
live objects it created, and write the file from **live state**, not from the report. That is an
afternoon of mechanical work with the live DB open, and it is safe because it changes nothing.

---

# A-15 · The deleted-user UUID that survives in photo_url

**Finding:** PC-2 · **Severity:** HIGH · **Tag:** `[REPO-INFERRED]` · ⟨QUESTION-GATED⟩

Account deletion nulls `flags.user_id` — "your name is removed, your reports stay". But every photo
lives at `<uploader-uuid>/<timestamp>.<ext>`, and that path is embedded in `flags.photo_url`, a
column readable by anyone with the public anon key.

So all of a deleted person's photo-bearing reports still share one identifier. Worse, that UUID *is*
their former `user_id` — anyone who pulled the flags table before deletion holds a UUID→identity map
and can re-attach it. **The deletion promise is partly false**, and there is no control that removes it.

The policy already admits photos may survive. It does not say their address is a stable identifier.

**Three options, and the choice is yours:**

- **(a) Forward-only.** Switch new uploads to an opaque object name, leaving history as-is. One
  client change, no live data touched.
- **(b) (a) plus a one-time re-key** of existing objects, rewriting `photo_url` and
  `flag_photos.url`. Touches live data. This is what actually keeps the promise already made to
  anyone who has already deleted.
- **(c) Delete photo objects on account deletion.** Cuts against the ratified "reports stay whole"
  decision.

⚠️ **Real design tension in (a) that must not be missed:** the Storage RLS policy enforces
`(storage.foldername(name))[1] = auth.uid()::text`. Any opaque scheme **must keep the `<uid>/` first
segment** or both that policy and "only you can delete your photos" break. So the opacity has to go
in a deeper segment — which limits how much (a) actually buys, and is worth knowing before choosing it.

---

# A-16 · Per-person location histories  ⟨SKY + JORDAN ONLY — no agent may action this⟩

**Findings:** TB-9 / AB-7 / PC-7 (three lenses) · **Severity:** HIGH (privacy)
**Constitution Art. 2.4 — this is your decision, and it wants a privacy review, not a patch.**

Any signed-in account can join `flags.user_id` to `users.display_name` and produce, for any named
person, every location where they reported a barrier — including `rejected` rows the UI hides.

The prior privacy approval reasoned **only about the `anon` role**: *"the `user_id` UUID cannot be
reverse-looked-up under the anon role because public.users has no anon SELECT policy."* That is
true and remains true. **Becoming `authenticated` is free and self-serve**, and that qualifier is the
whole finding.

For disability-adjacent data this is the highest-value scrape in the app.

**The internal-consistency argument is strong:** this codebase refuses exactly this linkage in four
other places — the reopen counter, the dispute counter, the status-history grant (which deliberately
withholds `user_id` from `authenticated`), and a Jordan condition on the admin screen. `flags`
publishes it directly.

Options recorded, none drafted: drop `user_id` from the anon exposure (closes the signed-out half
only); withhold `display_name` from the broad grant and re-expose via a purpose-built RPC (closes the
join, but breaks "My Reports" and owner-scoped UI unless carefully scoped); or accept and disclose it.

**No SQL is offered here on purpose.** Each option changes what the product is.

---

# A-17 · Whether the k≥3 heat floor should be real  ⟨QUESTION-GATED — banked question 4⟩

**Finding:** PC-4 · **Severity:** CRITICAL as a claim; the underlying exposure is a ratified design.

`LegendModal` tells users: *"**To protect reporters**, heat zones only appear where at least 3 flags
have been submitted."*

That floor is `if (acc.count < kFloor) continue;` — a **client-side render filter** over rows the
client has already downloaded. It hides a rectangle; it removes nothing from the wire. Anyone with
the public anon key reads every underlying report at full precision, including the suppressed ones.

**Two separately-approved decisions that nobody cross-read.** The k-floor is correct for what it was
reviewed as (a heat-layer control, and Jordan verified it repeatedly). The anon SELECT is correct for
what *it* was reviewed as. Together they void the sentence.

**The app already words this honestly elsewhere.** `MapScreen` says: *"Heat zones only appear where
at least 3 flags have been reported."* — states the rule, claims no protection. **One string
disagrees with the rest of the app**, and it is the one making the promise.

**Phase B did not change it**, for two reasons: it is under the BP16 copy gate awaiting your
per-string picks, and it needs a Jordan Art. 7 k≥3 sign-off. More importantly —

★ **Do not just reword it.** The question is *which are you buying*: honest copy (cheap, and the
honest phrasing already exists two screens away), or real protection (server-side aggregation and/or
coordinate fuzzing, which is a genuine architectural change and interacts with A-16). Rewording alone
is the right answer only if you decide the protection was never promised.

**Nothing here is urgent** — but a user who reports a barrier outside their home believing that
sentence is not hidden, and that is the harm to weigh.

---

# A-18 · A server-side cap on display_name

**Findings:** IO-8 / TB-7 · **Severity:** LOW · **Tag:** `[REPO-INFERRED]`

`users.display_name` has no length CHECK. The 60-character limit lives in `MAX_DISPLAY_NAME_LEN`,
whose own comment calls itself "defense-in-depth" — but with no column constraint, **it is the only
layer**. A REST client bypasses the UI entirely.

Same for `flags.context_tags` (no cardinality limit; client caps at 5) and photo count (client caps
at 5).

```sql
alter table public.users
  drop constraint if exists users_display_name_len_chk;
alter table public.users
  add constraint users_display_name_len_chk
  check (display_name is null or char_length(display_name) <= 60);
```

★ Count violating rows first (`select count(*) from public.users where char_length(display_name) > 60`)
— should be 0 with 4 accounts. Mechanically identical to the existing `flags_description_length_chk`.
Bundle with A-06. **Rollback:** `drop constraint`.

---

# A-19 · The Admin tab renders for nobody  ⟨QUESTION-GATED — banked question 7⟩

**Finding:** new, found live during Phase A · **Severity:** MEDIUM · **Tag:** `[LIVE-VERIFIED]`

`is_admin` is **not SELECT-able by `authenticated`** (`has_column_privilege` → false), but
`admin.ts` does `.select('is_admin')`. So the Admin tab is invisible to everyone — **including you**.

It fails *closed*, which is the safe direction, so this is not an exposure. But **AccessMap has no
working moderation UI**, and that interacts directly with A-05: the recovery story for a mass status
flip currently runs through the SQL editor.

Intended, or a regression to repair? If you want it back, the fix is a column-level
`grant select (is_admin) on public.users to authenticated` — ⚠️ which makes every user's admin status
publicly readable. The better shape is a `SECURITY DEFINER` function returning only
`is_admin` for `auth.uid()`. **Your call; not applied either way.**

---

# A-20 · Confirm whether email confirmation is on  ⟨one dashboard check, high leverage⟩

**Finding:** X-1 · **Tag:** `[LIVE-INFERRED — strong, not verified]`

```sql
select count(*), count(confirmation_sent_at),
       count(*) filter (where confirmation_sent_at is null and email_confirmed_at is not null)
from auth.users;
--> 4 users | 0 confirmation emails EVER sent | 4 confirmed with no email
```

All four accounts are confirmed while `confirmation_sent_at` is NULL for every one. If "Confirm
email" were on, GoTrue would stamp that column at signup. GoTrue config is not stored in the
database, and dashboard-created users can look like this too — hence *inferred*, not verified.

**Check:** Dashboard → Authentication → Providers → Email → **"Confirm email"**.

**Why it is worth 30 seconds:** it sets the *price* of every account-gated finding in this audit.
A-01, A-02, A-04, A-05, A-06 and A-08 all assume "an attacker can get the `authenticated` role". If
confirmation is off, that costs one HTTP request and no working email address. It changes no
severity by itself — it is the multiplier under all of them.
