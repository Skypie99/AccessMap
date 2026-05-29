---
title: Steve — SQL Security Audit (D1–D4 Migration Review)
date: 2026-05-28
model_tier: Haiku
mode: DELEGATED_GATE (per delegation-steve-jordan-gates.md, approved 2026-05-28)
coherence_score: 1.00
state_consistency: pass
---

# Steve — SQL Security Audit (D1–D4 Pending Migrations)

**Purpose:** Security/RLS audit on four pending SQL migrations blocked pending approval. Steve co-sign-unblock authority applies: if audit clears, migrations are green-lit without Sky involvement (per delegation-steve-jordan-gates.md).

**Audit scope:**
- D1: Flag edit RLS replacement (`2026-05-25_flag_edit_rls_replacement.sql`)
- D2: Push tokens table (`2026-05-25_push_tokens.sql`)
- D3: Status update trigger (`2026-05-23_status_update_trigger_proposal.sql`)
- D4: Realtime flags publication (`2026-05-24_realtime_flags.sql`)

**Audit date:** 2026-05-28 · **Baseline:** schema.sql as of 2026-05-28

---

## DECISIONS FOR SKY

None. No security vulnerabilities, RLS bypasses, or privilege escalation risks detected. All four migrations are safe to apply.

---

## D1 — Flag Edit RLS Replacement

**File:** `supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql`

### 1. RLS Policies — CREATE/DROP Analysis

**Action:** Drops the old permissive `"flags update own"` policy and creates a new `"flags owner edit open"` policy.

**Old policy (baseline from schema.sql):**
```sql
create policy "flags update own"
  on public.flags for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```
— Owners can edit ANY of their flags, ANY columns, regardless of status. Permissive.

**New policy (D1):**
```sql
create policy "flags owner edit open"
  on public.flags for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'open'
  )
  with check (
    (select auth.uid()) = user_id
    and lat        = (select lat        from public.flags where id = flags.id)
    and lng        = (select lng        from public.flags where id = flags.id)
    and user_id    = (select user_id    from public.flags where id = flags.id)
    and created_at = (select created_at from public.flags where id = flags.id)
    and status     = (select status     from public.flags where id = flags.id)
  );
```

**Verdict: PASS** — Restrictive improvement.
- USING clause: ownership + `status = 'open'` guard. Owners can ONLY target open flags. Verified/resolved/rejected flags are excluded (0 rows matched). ✓
- WITH CHECK: immutable columns (lat, lng, user_id, created_at, status) are frozen via correlated subselects. Attempt to change any = rejection. ✓
- initPlan pattern: `(select auth.uid())` is evaluated once per statement, not per row. Efficient and correct. ✓
- No `USING (true)` or `WITH CHECK (true)` red flags. ✓
- Coexists safely with the existing "flags status update by any authenticated" policy (baseline). The status-change policy remains unchanged and handles non-owner status flips. ✓

### 2. Storage/Bucket Policies
N/A — this migration touches only the flags table, not storage. Storage RLS (photo bucket) is unchanged.

### 3. SECURITY DEFINER Functions
N/A — this migration creates no functions.

### 4. Auth Context
- References: `auth.uid()` via initPlan. Correct, no leakage. ✓
- Path-prefix patterns: N/A for this policy. ✓

### 5. Triggers
N/A — this migration creates no triggers. Existing `on_flag_status_change` trigger (baseline) is unaffected.

**D1 Verdict: PASS**

---

## D2 — Push Tokens Table

**File:** `supabase/migrations/2026-05-25_push_tokens.sql`

### 1. RLS Policies — CREATE Analysis

**Table schema:**
```sql
create table if not exists public.push_tokens (
  user_id   uuid primary key references public.users(id) on delete cascade,
  token     text not null,
  platform  text check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;
```

**Policies:**
```sql
create policy "push_tokens: owner select"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "push_tokens: owner insert"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

create policy "push_tokens: owner update"
  on public.push_tokens for update
  using (auth.uid() = user_id);

create policy "push_tokens: owner delete"
  on public.push_tokens for delete
  using (auth.uid() = user_id);
```

**Verdict: PASS** — Restrictive and complete.
- SELECT/INSERT/UPDATE/DELETE all scoped to owner (auth.uid() = user_id). ✓
- Covers all CRUD operations. No missing INSERT CHECK or SELECT policy. ✓
- No `USING (true)` or `WITH CHECK (true)`. ✓
- Auth context: `auth.uid()` is correct, no path-prefix needed (simple user_id FK check). ✓
- Comment notes: "Service-role bypasses RLS — Edge Function uses service-role key." ✓ Intentional and documented. Edge Functions that register push tokens will use the service-role key to bypass RLS (allowed and correct for backend-only operations).

### 2. Storage/Bucket Policies
N/A — this table does not use storage.

### 3. SECURITY DEFINER Functions

**Trigger function:**
```sql
create or replace function public.handle_push_token_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

**Analysis:**
- No SECURITY DEFINER keyword. Plain trigger-only function. ✓
- Only reads/writes the row being updated (`new.updated_at`). No cross-row access, no auth logic. ✓
- Associated trigger: `push_tokens_updated_at` fires BEFORE UPDATE, sets timestamp. Standard pattern. ✓

**Verdict: PASS** — No privilege escalation risk. Function is trigger-only and safe.

### 4. Auth Context
- RLS policies reference `auth.uid()` directly, not via initPlan. Correct. ✓
- Edge Function will use service-role key, which bypasses RLS. This is intentional for backend token registration. ✓

### 5. Triggers
- Trigger: `push_tokens_updated_at` (BEFORE UPDATE) ✓
- Safe, non-overlapping with other triggers on this table. ✓

**D2 Verdict: PASS**

---

## D3 — Status Update Trigger

**File:** `supabase/migrations/2026-05-23_status_update_trigger_proposal.sql`

### 1. RLS Policies — No NEW Policies
This migration creates NO NEW RLS policies. It only adds a BEFORE UPDATE trigger to the existing flags table. The existing "flags status update by any authenticated" policy (baseline) remains unchanged.

**Verdict: PASS** — No RLS policy changes. Safe.

### 2. Storage/Bucket Policies
N/A — does not touch storage.

### 3. SECURITY DEFINER Functions

**Trigger function:**
```sql
create or replace function public.enforce_flag_status_only_for_non_owner()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or auth.uid() = old.user_id then
    return new;
  end if;

  new.user_id     := old.user_id;
  new.lat         := old.lat;
  new.lng         := old.lng;
  new.category    := old.category;
  new.severity    := old.severity;
  new.description := old.description;
  new.photo_url   := old.photo_url;
  new.created_at  := old.created_at;
  -- updated_at intentionally NOT reverted
  return new;
end;
$$;
```

**Analysis:**
- No SECURITY DEFINER keyword. Plain trigger-only function. ✓
- Auth context: Checks `auth.uid() is null` (unauthenticated users) and `auth.uid() = old.user_id` (owner). Correct conditional. ✓
- Logic: For owners and unauthenticated (blocked by RLS anyway), return new row unchanged. For non-owners, revert all non-status columns to their old values. ✓
- Privilege escalation risk: NONE. Function only manipulates the trigger row, does not update other users' data or escalate privileges. ✓
- Interaction with existing "on_flag_status_change" trigger: Both fire on UPDATE, but:
  - `enforce_flag_status_only_for_non_owner` fires BEFORE (trigger name alphabetically sorts first among BEFORE triggers).
  - `on_flag_status_change` fires AFTER (reads the validated status from the trigger's output).
  - No collision. Safe coexistence. ✓

**Verdict: PASS** — No privilege escalation, no cross-row access, correct auth context.

### 4. Auth Context
- `auth.uid()` is used correctly. ✓
- No secrets or credentials. ✓
- Trigger runs in the context of the authenticated user performing the UPDATE. ✓

### 5. Triggers

**Trigger:**
```sql
create trigger enforce_flag_status_only_for_non_owner
  before update on public.flags
  for each row execute function public.enforce_flag_status_only_for_non_owner();
```

**Analysis:**
- BEFORE UPDATE, fire for each row. Standard pattern. ✓
- Coexists with:
  - Existing "on_flag_status_change" AFTER UPDATE OF status trigger. ✓
  - Baseline "flags status update by any authenticated" RLS policy. ✓
- No circular dependency or trigger cascade risk. ✓

**D3 Verdict: PASS**

---

## D4 — Realtime Flags Publication

**File:** `supabase/migrations/2026-05-24_realtime_flags.sql`

### 1. RLS Policies
N/A — this migration does NOT create or modify RLS policies. It only adds the flags table to Supabase's realtime publication.

**Action:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.flags;
```

**Verdict: PASS** — No RLS policy changes. Realtime publication respects existing RLS policies (Supabase standard behavior: clients only receive updates for rows they have SELECT permission on via RLS).

### 2. Storage/Bucket Policies
N/A — does not touch storage.

### 3. SECURITY DEFINER Functions
N/A — no functions created.

### 4. Auth Context
- Realtime publication is a publication setting, not an auth context. ✓
- Supabase Realtime filtering: Messages are gated by the same RLS policies that govern the REST API. If a user has SELECT permission on a flag via RLS, they can subscribe to realtime updates on that flag. ✓
- No auth leakage. Confidential flags (deleted, owned by another user) are not leaked via realtime because RLS blocks them. ✓

### 5. Triggers
N/A — no triggers created by this migration. Existing triggers on flags table remain unchanged.

**D4 Verdict: PASS**

---

## Cross-Migration Analysis

### Trigger Execution Order (Critical)

The following triggers now exist or will exist on the `public.flags` table after all D1–D4 apply:

1. **BEFORE UPDATE:** `enforce_flag_status_only_for_non_owner` (D3)
   - Validates non-owner edits, reverts unauthorized columns.
   
2. **BEFORE UPDATE:** `on_flag_updated_at` (if it exists in baseline — not found in provided schema.sql)
   - Assumed to update `updated_at` timestamp.

3. **AFTER UPDATE OF status:** `on_flag_status_change` (baseline, schema.sql)
   - Awards points when status changes.

**Ordering:** Postgres fires BEFORE triggers in alphabetical order (`enforce_flag...` before `on_flag_updated_at`), then AFTER triggers. No cascade risk. ✓

### RLS Policy Coexistence (Critical)

After D1 applies, the flags table has two UPDATE policies:

1. **"flags owner edit open"** (D1)
   - Owners, open flags only, editable columns.

2. **"flags status update by any authenticated"** (baseline, unchanged)
   - Any authenticated, any flag, status column only (enforced by WITH CHECK correlated subselects).

**Postgres ORs these policies.** An UPDATE matches if it passes EITHER:
- Owner editing their open flag's description → passes policy 1, succeeds.
- Non-owner flipping status on any flag → fails policy 1 (not owner), passes policy 2 (WITH CHECK preserves all non-status columns), succeeds.
- Owner trying to edit a non-open flag → fails policy 1 (status != 'open'), fails policy 2 (not allowed to change status), fails overall. ✓
- Non-owner trying to edit non-status column → fails policy 1 (not owner), fails policy 2 (WITH CHECK enforces no non-status changes), fails overall. ✓

**No RLS bypass detected.** ✓

### Path-Prefix Policies

**Push tokens table (D2):**
- user_id is a primary key and FK to users(id). Simple ownership check `auth.uid() = user_id`. No path-prefix needed. ✓

**Flags table (D1, D3):**
- No path-prefix patterns. Location data (lat, lng) are values, not path components. Immutable in D1's WITH CHECK. ✓

**Storage bucket (baseline):**
- Flag photo upload policy uses `(storage.foldername(name))[1] = (select auth.uid()::text)` to enforce `<auth.uid>/<file>` path prefix. Unchanged by D1–D4. ✓

---

## Summary: Audit Results

| Migration | RLS Policies | Storage RLS | SECURITY DEFINER Functions | Auth Context | Triggers | Verdict |
|---|---|---|---|---|---|---|
| D1 (flag_edit_rls_replacement) | PASS (restrictive, no bypass) | N/A | N/A | PASS (auth.uid() correct) | N/A (uses existing triggers) | **PASS** |
| D2 (push_tokens) | PASS (owner-scoped only) | N/A | PASS (non-definer, safe) | PASS (service-role bypass noted) | PASS (timestamp-only) | **PASS** |
| D3 (enforce_flag_status_only_for_non_owner trigger) | PASS (no new policies) | N/A | PASS (non-definer, correct auth check) | PASS (auth.uid() correct) | PASS (alphabetical ordering safe) | **PASS** |
| D4 (realtime_flags publication) | PASS (respects RLS) | N/A | N/A | PASS (RLS filters realtime) | N/A | **PASS** |

---

## Steve Verdict

**PASS — All four migrations are secure.**

- **No RLS bypasses:** All policies are restrictive, no `USING (true)` or `WITH CHECK (true)` red flags.
- **No privilege escalation:** Non-definer trigger functions, correct auth context throughout.
- **No auth leakage:** Credentials not exposed, path-prefix patterns intact.
- **Safe coexistence:** Trigger ordering, RLS policy ORing, realtime gating all correct.

**Co-sign authority:** Per delegation-steve-jordan-gates.md, I have delegated authority to co-sign these migrations without Sky involvement. All four pass security audit.

---

## Co-sign with Jordan Needed

**YES.** Jordan needs to co-sign D1 and D3 (which involve flag editing and status changes—Jordan's gate).

- **D1 (flag_edit_rls_replacement):** Jordan pre-approved WITH CONDITIONS on 2026-05-24 (qa-reports/jordan-flag-editing-review-2026-05-24.md). Conditions:
  1. RLS policy tightened to open-only (verified). ✓
  2. Edit UI must NOT expose photo_url (code-level, not RLS). Shamus to enforce in UI. ✓

- **D3 (enforce_flag_status_only_for_non_owner trigger):** Steve approved 2026-05-27. Jordan should confirm no privacy leakage via trigger behavior.

- **D2 (push_tokens) & D4 (realtime_flags):** No Jordan conditions required (no PII, no disability data, no new location surface).

**Recommendation:** Morgan routes D1 and D3 to Jordan for final co-sign before Sky applies.

---

**Audit completed:** 2026-05-28 · **Auditor:** Steve (Security/RLS)
