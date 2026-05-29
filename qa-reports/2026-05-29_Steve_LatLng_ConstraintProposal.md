# Steve — Lat/Lng DB Range Constraint Proposal

**Date:** 2026-05-29
**Role:** Steve (Safety Engineer)
**Branch:** `qa/auto-2026-05-29` (NOT merged to main)
**Status:** ✅ APPLIED to live DB 2026-05-29 via Supabase MCP, on Sky's explicit verbal approval ("get Rory to do it via MCP I approve"). See "Apply result" + "Discrepancy found" below.

---

## Apply result (2026-05-29)

- **Target project:** `kldlwszpfkdmsjrjhjym` — "Accessable City App" (AccessMap **production**; us-west-2; ACTIVE_HEALTHY). No separate AccessMap staging project exists.
- **Applied via:** Supabase MCP `apply_migration` (name `latlong_range_constraint`). Returned `{"success":true}`.
- **Verified:** both `flags_lat_range_chk` and `flags_lng_range_chk` now present on `public.flags`. The single existing flag row passed validation (ADD CONSTRAINT would have errored otherwise).
- **Reversible:** rollback is the 2-line DROP CONSTRAINT in the migration header.

## ⚠️ Discrepancy found during apply (needs Sky's attention)

Before applying, I checked the live migration history (`list_migrations`) on the production project. **The entire SQL apply queue that PROJECT_STATE.md and `2026-05-29_Morgan_SQL_Apply_Checklist.md` describe as "PROPOSE-ONLY — AWAITING SKY APPLY" has ALREADY been applied to the live DB** — several items applied multiple times under different version timestamps. Examples on the live DB:

- `2026_05_27_users_email_privacy` — applied 3× (the PII fix the docs list as still-pending)
- `2026_05_23_status_update_trigger_proposal` / `d3_status_trigger` — applied
- `d1_flag_edit_rls` / `flag_edit_rls_replacement` — applied
- `data_layer_hardening` — applied 3× · `rls_initplan_and_non_owner_status_update` — applied 2×
- `push_tokens`, `d4_realtime_flags_filtered`, `d6_flag_edit_history`, `flag_edit_history_table` — all applied

All listed tables (`users`, `feedback`, `flag_edit_history`, `push_tokens`, `flag_status_history`, `realtime_subscribe_log`, `flags`) exist with RLS enabled. The lat/lng constraint was the ONLY genuinely-missing item.

**Two implications for Sky:**
1. **State docs are stale/wrong** — they show ~9 migrations awaiting apply that are in fact already live. PROJECT_STATE.md "Migrations — Status Summary" and the Morgan checklist need reconciling against the actual DB.
2. **The "never apply to live DB" rail (Const. Art. 5 / global CLAUDE.md hard prohibition) appears to have already been bypassed** — repeatedly, before this session — by some automated path applying via MCP. Worth investigating who/what applied these and whether that was intended.

---

## What was done

Created a new propose-only SQL migration:

- **File:** `supabase/migrations/2026-05-29_latlong_range_constraint.sql`

It adds two DB-level `CHECK` constraints on `public.flags`:

| Constraint | Rule |
|---|---|
| `flags_lat_range_chk` | `lat` between -90 and 90 |
| `flags_lng_range_chk` | `lng` between -180 and 180 |

The migration is **idempotent** — each constraint is dropped with
`DROP CONSTRAINT IF EXISTS` before being re-added, so it is safe to re-run and
doubles as the update path if the bounds ever change. A rollback comment is
included in the header.

## Why (defense-in-depth)

The client already validates coordinates at the trust boundary in
[`src/lib/flags.ts`](../src/lib/flags.ts) — `createFlag()` (~line 540) rejects
non-finite and out-of-range `lat`/`lng` before the insert. That covers the
normal app path, but a **direct SQL insert, a future code path, a test fixture,
or a different client** could still write invalid coordinates straight to the
table. A DB constraint is the last line of defense and makes the invariant hold
regardless of the writer.

## Caveat for the applier

The `ALTER ... ADD CONSTRAINT` will fail if any existing row already violates
the bounds. None are expected (the client guard has been in place), but if it
errors with a check-violation, inspect first:

```sql
SELECT id, lat, lng FROM public.flags
WHERE lat < -90 OR lat > 90 OR lng < -180 OR lng > 180;
```

## Apply steps (Sky only)

1. Open the Supabase SQL Editor for the AccessMap project.
2. Paste the contents of `supabase/migrations/2026-05-29_latlong_range_constraint.sql`.
3. Run. Expect success with no rows violating the bounds.

## Safety / constitution notes

- **No DB writes performed** by the agent — file is propose-only.
- **No merge to main** — committed on `qa/auto-2026-05-29` only.
- **No credentials** touched.
- Not a privacy-sensitive change (no location/disability/auth data semantics
  altered — only bounds-checks geographic validity of values already stored).

## DECISIONS FOR SKY

- None blocking. Just apply the migration when convenient (low risk, additive,
  reversible via the rollback comment).
