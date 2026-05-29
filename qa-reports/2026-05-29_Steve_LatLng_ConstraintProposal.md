# Steve — Lat/Lng DB Range Constraint Proposal

**Date:** 2026-05-29
**Role:** Steve (Safety Engineer)
**Branch:** `qa/auto-2026-05-29` (NOT merged to main)
**Status:** PROPOSE-ONLY — Sky applies via Supabase SQL Editor

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
