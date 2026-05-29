# Jordan — Privacy & Safety Review: Flag Editing Feature
**Date:** 2026-05-24
**Reviewer:** Jordan (Privacy & Safety)
**Feature:** Allow a reporter to edit their own flag's `description`, `category`, or `severity` — restricted to flags still in `open` status.
**Gate:** Phase-0 — must PASS before Shamus builds.

---

## VERDICT: APPROVE WITH CONDITIONS

The core feature is safe and privacy-preserving, but the current RLS model has a **gap that must be resolved before Shamus writes a single line of UI code.** Two conditions are mandatory; three are strongly recommended. Details below.

---

## Review Answers

### 1. Is editing restricted to `open` flags only?

**Not enforced at the database layer today.** The current "flags update own" policy is:

```sql
create policy "flags update own"
  on public.flags for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

This permits the owner to UPDATE any column on their own row **at any status** — including `verified`, `resolved`, and `rejected` flags. There is no `status = 'open'` guard anywhere in the existing policies.

This is a **mandatory condition**: the replacement policy must add `status = 'open'` to the `USING` clause (not just `WITH CHECK` — the `USING` clause gates which rows are even targetable). See the proposed SQL below.

### 2. Does the proposed RLS pattern safely restrict edits to the owner's own rows?

The existing ownership check (`auth.uid() = user_id`) is sound and follows the established initPlan pattern. The proposed update policy (see below) extends it correctly. One structural note: Postgres ORs all UPDATE policies, so the new owner-edit policy will coexist with the existing non-owner status-only policy ("flags status update by any authenticated"). That pairing is safe **as long as** the new owner policy does not allow status changes on open flags — which the proposed SQL prevents by explicitly blocking status mutation via `WITH CHECK`.

### 3. Fields that must NOT be editable

The following fields must be read-only after initial submission, regardless of `open` status:

| Field | Reason |
|---|---|
| `id` | Primary key — immutable by convention |
| `user_id` | Attribution — changing this would transfer ownership |
| `lat` / `lng` | Location is the fundamental fact of the report. Allowing relocation would undermine community verification: verifiers checked a specific physical spot. A user who submitted the wrong location should delete and resubmit. |
| `status` | The owner-edit policy should not permit self-escalation (e.g., reopening a rejected flag by editing it back to `open`). Status transitions belong to the triage flow. |
| `created_at` | Immutable audit field |
| `photo_url` | See privacy note below — photo replacement is a separate, higher-risk operation |

**Editable fields (propose):** `description`, `category`, `severity`, `context_tags` (if the migration has been applied).

`photo_url` is a special case: a user might legitimately want to add or remove a photo. However, photo operations involve storage bucket actions (upload/delete) beyond a simple column update, and a replaced photo_url pointing to another user's storage path would break the storage RLS invariant (`<auth.uid>/<file>`). **Recommend: exclude `photo_url` from the edit flow in v1.** If photo editing is added later, it must be implemented as a paired upload-then-update, with the old object deleted from storage first.

### 4. Privacy concerns for users (disability/mobility context)

AccessMap handles sensitive data — the physical accessibility needs of its users are implicitly encoded in every flag they create. The `category` and `description` fields in particular may reveal a user's disability or mobility context (e.g., a flag for "steep_grade" or "no_ramp" submitted repeatedly by the same user reveals that person uses a wheelchair or similar device).

**Editing raises two specific concerns:**

**4a. Edit history / accountability.** If a user edits a flag after community members have already read or bookmarked it (e.g., a Watched Flag), the edited version is what they see — no indication the content changed. A user could submit a credible severity-5 flag to attract verifiers, then downgrade it after verification to avoid moderation. This is low-risk in the current app (no gamification exploit is obvious) but worth monitoring.

**4b. Data minimization — keep edit surface small.** Since `description` can contain free-form text that reveals disability context, limiting editable fields to only what's necessary (description, category, severity) is consistent with data minimization principles. Do not expose `photo_url`, `lat`, `lng`, or `user_id` in any edit form or API call.

**Privacy risk for the editing feature itself: LOW**, provided the conditions below are met. The data already exists on the server; editing is a correction flow, not a new data-collection surface.

### 5. Should edit history be logged?

**Yes — strongly recommended, but not a blocker for v1.**

The `flag_status_history` table (migration `2026-05-24_status_history_table.sql`, already proposed) is an append-only audit trail of status changes. **Content changes (description, category, severity) are not currently captured anywhere.**

The privacy tension here is real: logging edit history means storing multiple snapshots of potentially sensitive descriptions. However, NOT logging creates accountability gaps — particularly because a verified flag's original content may have influenced the verifier's decision.

**Recommendation:** Before v1 ships the edit UI, add a companion `flag_edit_history` table (or extend the existing audit approach) that records `changed_fields`, `old_value`, and `new_value` for each edit, with `user_id` protected via the same view-projection pattern used in `flag_status_history_public`. This is a **strongly recommended condition**, not a mandatory blocker for Phase-0.

---

## Mandatory Conditions (must be resolved before Shamus builds)

### Condition 1 — Scoped UPDATE policy with open-only guard and column allowlist

The existing "flags update own" policy must be **replaced** with a more constrained version. The new policy must:

1. Restrict the targetable rows to `status = 'open'` in the `USING` clause.
2. Freeze immutable fields via the `WITH CHECK` clause — specifically `lat`, `lng`, `user_id`, `created_at`, and `status`.

**Proposed SQL (propose-only — do NOT apply; Sky applies in the Supabase dashboard):**

```sql
-- ---------------------------------------------------------------------------
-- Flag Editing v1 — replace the owner UPDATE policy with a tighter version.
-- ---------------------------------------------------------------------------
-- PROPOSE-ONLY. Do not apply. Sky applies in Supabase Dashboard → SQL Editor.
--
-- What changes:
--   - USING clause adds `and status = 'open'` so reporters can only target
--     rows that are still in the open state. Verified/resolved/rejected flags
--     are invisible to this policy and will silently return 0 rows on attempt.
--   - WITH CHECK freezes the immutable columns (lat, lng, user_id, created_at,
--     status). Any attempt to change those columns will fail the WITH CHECK
--     and the UPDATE is rejected at the database layer.
--   - The existing non-owner status-update policy ("flags status update by any
--     authenticated") is LEFT UNCHANGED — it still lets verifiers flip status
--     on any flag, including open ones. Postgres ORs both policies; both can
--     coexist without conflict.
--   - The storage policies and all other flag policies are LEFT UNCHANGED.
--
-- Rollback:
--   Paste back the original "flags update own" policy from schema.sql
--   (the one with just the auth.uid() = user_id check, no status guard).
-- ---------------------------------------------------------------------------

drop policy if exists "flags update own" on public.flags;
create policy "flags update own"
  on public.flags for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'open'
  )
  with check (
    (select auth.uid()) = user_id
    -- Immutable columns must not change.
    -- The correlated subselects see the OLD row under READ COMMITTED isolation
    -- (same pattern as "flags status update by any authenticated").
    and lat        = (select lat        from public.flags where id = flags.id)
    and lng        = (select lng        from public.flags where id = flags.id)
    and user_id    = (select user_id    from public.flags where id = flags.id)
    and created_at = (select created_at from public.flags where id = flags.id)
    and status     = (select status     from public.flags where id = flags.id)
  );
```

**After applying, Sky should smoke-test:**
1. Reporter on their own `open` flag: edit description/category/severity — should succeed.
2. Reporter attempts to change `lat`/`lng`/`status`/`user_id` via direct REST PATCH — should be rejected (WITH CHECK fails).
3. Reporter attempts to edit a `verified` flag they own — should return 0 rows (USING clause blocks the target).
4. Non-owner attempts to edit another user's `open` flag's description — should be rejected (USING clause: `auth.uid() = user_id` fails).
5. Non-owner still able to flip status on any flag via the existing triage policy — must remain working.

### Condition 2 — `photo_url` excluded from the edit form

The edit UI (when Shamus builds it) must not expose `photo_url` as an editable field. The `updateFlag` function in `src/lib/flags.ts` should explicitly omit `photo_url` from the payload type/call. This is a **code-level condition** enforceable during Shamus's build, but Jordan flags it here so it is not forgotten.

---

## Strongly Recommended (not blockers, but should be addressed in v1 or v1.1)

### Rec A — Edit history table

Add a `flag_edit_history` table (or extend `flag_status_history`) to log content changes. Captures `flag_id`, `user_id`, `changed_at`, and the before/after values of `description`, `category`, `severity`. Apply the same user_id privacy guard as `flag_status_history_public` (view projection, no direct authenticated SELECT on the raw table). This is the audit paper trail for content integrity.

### Rec B — UI affordance for immutability of location

The edit UI should not show lat/lng fields at all (not even disabled/grayed-out). Showing them disabled implies they could be enabled. Instead, show a static "Location cannot be changed — delete and resubmit to move a flag" note. This prevents user confusion and makes the immutability intentional rather than accidental.

### Rec C — Description length guard on the client

The database enforces `char_length(description) <= 2000` via `flags_description_length_chk` (from `2026-05-23_data_layer_hardening.sql`). The edit form should enforce this client-side as well so the error is surfaced before the round-trip, not after. Show a character counter (e.g., "412 / 2000") consistent with any existing form UX.

---

## Fields Immutability Summary

| Field | Editable in v1? | Enforcement layer |
|---|---|---|
| `description` | YES | client validation (length) + DB constraint |
| `category` | YES | — |
| `severity` | YES | — |
| `context_tags` | YES (if migration applied) | — |
| `photo_url` | NO | code-level omission from payload |
| `lat` / `lng` | NO | WITH CHECK in RLS policy |
| `user_id` | NO | WITH CHECK in RLS policy |
| `status` | NO | WITH CHECK in RLS policy |
| `created_at` | NO | WITH CHECK in RLS policy |
| `id` | NO | never in UPDATE payload |

---

## Privacy Risk Assessment

**Overall: LOW**, with mandatory conditions satisfied.

| Risk | Level | Mitigation |
|---|---|---|
| Owner edits verified flag after community verification | LOW | Open-only guard in RLS blocks edits once verified |
| Attacker edits another user's flag | LOW | RLS USING clause: auth.uid() = user_id |
| Owner self-escalates status via edit | LOW | Status frozen in WITH CHECK |
| Owner relocates flag (lat/lng) | LOW | lat/lng frozen in WITH CHECK |
| Disability context exposure via edit history | MEDIUM (if no audit trail) | Recommend edit history table (Rec A) |
| photo_url pointing to another user's storage | LOW (if excluded from form) | Code-level omission (Condition 2) |

The medium risk on disability-context / edit history drops to LOW once Rec A is implemented.

---

## Interaction with Existing Architecture

- **`handle_flag_status_change` trigger** — fires on `UPDATE OF status`. An edit that changes only `description`/`category`/`severity` does NOT fire this trigger (the trigger is column-specific via `AFTER UPDATE OF status`). No unintended points awards or history rows.
- **`on_flag_updated_at` trigger** — fires on any UPDATE and sets `updated_at = now()`. This is correct and desirable — edited flags get a fresh `updated_at`, which is useful for UI "recently updated" indicators and realtime de-dup.
- **`flag_status_history` table** — not affected by content edits (only status changes write to it). Confirmed: edit-only UPDATEs do not produce spurious history rows.
- **Non-owner triage policy** — the "flags status update by any authenticated" policy explicitly pins all non-status columns to their OLD values. An edit by the owner (via the updated "flags update own" policy) does not interfere with this — Postgres evaluates both policies independently.

---

## Decisions for Sky

1. **Rec A (edit history table):** Do you want Jordan to spec a `flag_edit_history` migration before Shamus builds the UI, or is v1 fine without it (with the understanding that pre-v1.1 edit history is unrecoverable)?
2. **photo_url editing:** Confirmed out of scope for v1? If yes, no action needed. If photo editing is wanted in v1.1, Jordan will need to review the paired upload/delete flow separately before Shamus builds it.

---

*Jordan — READ-ONLY review. No code was modified. Proposed SQL is propose-only and must be applied by Sky in the Supabase Dashboard.*
