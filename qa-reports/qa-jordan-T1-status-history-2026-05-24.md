# Jordan — Privacy Review: T1 Status History Audit Trail

**Date:** 2026-05-24
**Reviewer:** Jordan (privacy/PIPEDA advisor — NOT a lawyer; findings require professional legal review)
**Branch:** `feat/status-history-2026-05-24` (worktree `wt-t1`, commit `79544b9`)
**Trigger:** Const. Art. 7.6 #4 (RLS/auth change) + #6 (new persistence layer)
**Mode:** READ-ONLY. No code changes. No external sends. Migrations are propose-only.

---

## VERDICT

**APPROVE WITH CONDITIONS**

The design is fundamentally privacy-respectful — narrow column set, append-only,
SECURITY DEFINER trigger isolation, `on delete set null` for the user FK
(supports right-to-be-forgotten), and the client UI already obscures attribution
("by a community member" / "by anonymous"). However, two MED-severity issues
must be resolved before merge — the broad `select using (true)` policy combined
with `user_id` being stored at all creates an unnecessary re-identification risk
in a community of disabled users where triage patterns can be sensitive. A
minor copy update to the About screen is also required to keep openness/PIPEDA
Principle 8 (Openness) satisfied.

---

## Findings

### 1. [MED] `user_id` is readable by every authenticated user via the broad SELECT policy

**Where:** `supabase/migrations/2026-05-24_status_history_table.sql` lines
129–132 (`flag_status_history readable by authenticated ... using (true)`).

**What:** The SELECT policy returns ALL columns — including `user_id` — to any
authenticated user. The client's `listStatusHistory` does `select('*')` and the
returned `StatusHistoryEntry` interface exposes `user_id: string | null`.

**Why it matters (PIPEDA Principle 4 — Limiting Collection; Principle 7 —
Safeguards):** The README/CLAUDE.md UI today shows only "Reported by: You / Another
community member" on flags — deliberately pseudonymous. The audit table breaks
that envelope. A curious user (or a scraper) can pull the full `flag_status_history`,
join it to `public.flags.lat/lng` and `public.users.display_name/email`
(also broadly readable via "users readable by authenticated"), and reconstruct
**"User X verifies most flags in this 4-block radius"** — a behavioral profile
of who triages flags in a neighborhood. In a community of disabled users, that
profile can include location-of-presence inference (where they spend time
verifying things), and in some categories the act of flagging itself is sensitive.

The trigger writes the right data, but the SELECT policy and client surface
make the attribution PII-equivalent in practice even though the UI text hides it.

**Remediation (pick ONE — both are acceptable):**

- **Option A (preferred — least change):** Restrict the SELECT policy column
  list. Postgres RLS doesn't do column-level filtering directly, so do it via
  a SECURITY INVOKER view that omits `user_id`, grant SELECT on the view to
  `authenticated`, and revoke direct SELECT on the table:
  ```sql
  create or replace view public.flag_status_history_public
  with (security_invoker = true) as
  select id, flag_id, from_status, to_status, created_at
  from public.flag_status_history;
  grant select on public.flag_status_history_public to authenticated;
  revoke select on public.flag_status_history from authenticated;
  ```
  Then update `src/lib/statusHistory.ts` to query the view, drop `user_id`
  from `StatusHistoryEntry`, and remove the `attribution: e.user_id ? ... : ...`
  ternary in `StatusHistoryModal` (use a single neutral string — see Finding 4).

- **Option B (if attribution is wanted later for "by you"):** Keep `user_id` on
  the table, but tighten the SELECT policy so non-owners receive `user_id` as
  NULL. Achievable by exposing two policies + a view that masks the column
  when `auth.uid() <> user_id`. Heavier than Option A and unnecessary for v1
  since the modal doesn't render the UUID anyway.

### 2. [MED] No retention bound / no documented cascade-on-flag-delete proof point

**Where:** Migration line 99 has `references public.flags(id) on delete cascade`
(good — history dies with the flag). But there is no retention policy for
long-lived flags, and the runbook in the migration header doesn't surface this
to Sky.

**What:** A "resolved" flag from 2026 still has its history rows in 2030, with
`changed_at` timestamps that can be cross-referenced against time-of-day
patterns. PIPEDA Principle 5 (Limiting Use, Disclosure, Retention) says personal
information shall be retained only as long as necessary for the identified
purpose.

**Why it matters:** The stated purpose ("community trust — show who has been
touching the flag") doesn't require timestamps with second-precision retained
indefinitely. After 12–24 months a coarse "first/last touched" summary on the
flag itself would serve the trust purpose without keeping the raw audit trail
forever.

**Remediation (gate at merge — minimum):**

- Document an explicit retention statement in the migration header AND in the
  About > Your privacy section. Suggested: "Status-change history is retained
  for the lifetime of the flag and deleted when the flag is deleted."
- Recommended (follow-up, NOT a merge blocker): add a future migration that
  truncates `created_at` to date-precision (drop the time component) for rows
  older than 90 days, OR drop rows older than 24 months. Track as a backlog
  item, not a v1 requirement.

User-deletion cascade is already correct: `user_id ... on delete set null`
keeps the audit but strips attribution. That part is well done.

### 3. [LOW] Migration is purpose-specified in code comments but not in the privacy surface

**Where:** Migration lines 10–12 say "Foundational for community trust — users
can see the lifecycle of any flag." Good — that's a clear stated purpose for
the engineers reading the file. But PIPEDA Principles 2 (Identifying Purposes)
and 3 (Consent) require the user to know about the collection before/at the
time of collection.

**What:** The current About > Your privacy line says: "We store flag reports
and your profile. Location is requested only when you use the map. No tracking,
no ads." It does NOT mention an audit log of status changes.

**Remediation:** Update the About copy. Draft below in "Suggested copy".

### 4. [LOW] Client surface — modal attribution string is correct but should be reviewed once Finding 1 is fixed

**Where:** `StatusHistoryModal.tsx` lines 91–94.

**What:** Current code reads `attribution: e.user_id ? 'by a community member' : 'by anonymous'`.
This is fine — it never renders the UUID, name, or email. The author's own
comments acknowledge the intent ("most honest thing"). However, once Finding 1
is fixed (Option A), `user_id` is gone from the client and this ternary becomes
moot — collapse it to a single string ("by a community member") to remove a
last vestige of the leak. If you take Option B instead, this code stays.

### 5. [LOW] `auth.uid()` inside SECURITY DEFINER trigger — verify Sky/maintainer is not silently logged on direct DB edits

**Where:** Migration line 184: `values (new.id, auth.uid(), old.status, new.status)`.

**What:** If Sky uses the Supabase dashboard SQL editor to fix a flag's status
manually, `auth.uid()` will be NULL (service-role context). That's fine — the
audit row records "system action" via null. But if Sky logs in via the
dashboard's "Impersonate user" feature, the impersonated user's UID gets
written as if THEY did it. This is a known Supabase footgun and a possible
audit-integrity issue.

**Remediation (informational — not a blocker):** Add a one-line note to the
migration header WARNING section that maintainer actions via "Impersonate" will
appear as that user in the history. Sky should avoid impersonation for status
changes, or do them via direct UPDATE (which records as system/null).

### 6. [LOW] Combination risk with the existing `public.users` broad-read policy

**Where:** `supabase/schema.sql` lines 132–136 — `users readable by authenticated`
returns ALL columns including `email`.

**What:** This is a pre-existing issue, NOT introduced by T1, but T1 makes it
materially worse. Today, knowing a `user_id` from a flag gets you the email.
With T1's audit trail also exposing `user_id`, the cross-join "who emailed
verified a flag at coordinates X" becomes one query. Out of T1's scope to
fix the underlying users-read policy, but flagging here so it's tracked.

**Remediation:** Out of scope for T1, but Jordan recommends a follow-up
proposal to restrict `public.users` SELECT to `id, display_name, avatar_url,
points` (drop `email`) via the same view-pattern as Finding 1. Track as a
separate backlog item — call it "U1: Limit users table read surface."

---

## Conditions for merge

Must-fix before T1 lands on main:

1. **Finding 1** — Restrict `user_id` exposure. Implement Option A (view +
   revoke), update `statusHistory.ts` and `StatusHistoryModal.tsx`
   accordingly. Verify by running the existing unit test plus a manual check
   that the REST endpoint `/rest/v1/flag_status_history` returns 403 or empty
   for authenticated users.
2. **Finding 2 (documentation portion only)** — Add a one-line retention
   statement to the migration header. The follow-up data-minimization migration
   is a backlog item, not a merge gate.
3. **Finding 3** — Update About > Your privacy copy. Draft sentence below.

Recommended but not blocking:
- **Finding 4** — Collapse the `attribution` ternary to a single string once
  Finding 1's Option A is applied.
- **Finding 5** — Add the "impersonation" warning to the migration header.
- **Finding 6** — File the U1 follow-up proposal.

---

## Suggested copy (for AboutScreen.tsx > "Your privacy" section)

Replace the existing single line with:

> We store the flag reports you create, your profile (email, display name,
> points), and an audit log of status changes (which flag changed, from what
> to what, and when) so the community can see how a report has progressed.
> The audit log does not show usernames to other users. Location is requested
> only when you use the map. Audit entries are kept for the lifetime of the
> flag and removed when the flag is deleted. No tracking, no ads.

(Sky / Will may want to wordsmith — Jordan's priority is that the audit log
exists, is bounded by flag lifetime, and does not surface usernames. Keep all
three points.)

---

## What was reviewed

- `supabase/migrations/2026-05-24_status_history_table.sql` (full file, 258
  lines) — table DDL, indexes, RLS policies, two trigger functions, idempotency
  pattern, rollback procedure.
- `src/lib/statusHistory.ts` (104 lines) — client API, defensive empty-array
  fallback, pure formatter.
- `src/components/StatusHistoryModal.tsx` (264 lines) — UI surface,
  attribution string, empty/loading state copy.
- `src/components/FlagDetailModal.tsx` (modified portion — lines 36, 70,
  95–100, 507–518, 604–608, 749–754) — History button + sibling-Modal
  pattern.
- `supabase/schema.sql` (lines 1–150 for context) — existing flags/users
  tables, RLS policies, the trigger this migration extends.
- `src/screens/AboutScreen.tsx` (full file, 218 lines) — current privacy copy.

Test file `src/lib/__tests__/statusHistory.test.ts` was not opened in this
review — Jordan's review is on data flow, not behavior; Gary owns test
coverage.

## What was NOT reviewed

- The full `public.users` SELECT policy change history (Finding 6 is informational).
- The realtime.sql channel — verify separately whether `flag_status_history`
  is on a realtime channel that broadcasts user_id to subscribers.

## Out-of-scope reminder

Per Const. Art. 5.3, the migration file remains propose-only. Jordan does NOT
apply it; Sky reviews and applies via the Supabase dashboard after the
conditions above are met. Per Const. Art. 9, Jordan does not message Sky —
Morgan picks up this report on the next status sweep.
