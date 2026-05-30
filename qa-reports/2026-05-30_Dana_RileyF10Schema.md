# Dana — F10 Flag Reopen Schema
**Date:** 2026-05-30
**Branch:** `feat/riley-f10-schema-2026-05-30`
**Status:** PROPOSE-ONLY — Sky applies via Supabase SQL Editor

---

## What was delivered

- `supabase/migrations/2026-05-30_flag_reopen_requests.sql` — propose-only migration
- `src/types/database.ts` — two new optional fields on `FlagRow` (inherits to `Update` via `Partial<FlagRow>`)

---

## Exact column names for Shamus

Use these in the TypeScript layer with no `any` casts:

| Column | TypeScript type | Notes |
|---|---|---|
| `reopen_requests` | `number` (optional until migration applied) | Anonymous aggregate vote count for the current resolution cycle |
| `reopen_requests_reset_at` | `string \| null` (optional until migration applied) | ISO 8601 timestamp of the last counter reset; `null` on new flags |

In code, access them as:

```ts
flag.reopen_requests         // number | undefined → treat undefined as 0 pre-migration
flag.reopen_requests_reset_at  // string | null | undefined → null means no reopen cycle yet
```

The RPC to cast a vote:

```ts
const { data: newCount } = await supabase
  .rpc('increment_reopen_request', { p_flag_id: flagId });
// newCount: number — the updated counter. 0 means the flag wasn't in 'resolved' status.
```

The Database `Functions` type needs a corresponding entry (not yet added — Shamus should add it when wiring the UI call, or Dana can add in a follow-up):

```ts
increment_reopen_request: {
  Args: { p_flag_id: string };
  Returns: number;
};
```

---

## Jordan compliance — no user_id linkage confirmed

- The migration stores **zero per-user data** for reopen votes.
- `reopen_requests` is a plain `integer` counter on the `flags` row — no join table, no user FK.
- `increment_reopen_request()` is `SECURITY DEFINER` and calls only `UPDATE public.flags SET reopen_requests = reopen_requests + 1` — `auth.uid()` is never read or stored inside the function body.
- `reopen_requests_reset_at` timestamps when a new resolution cycle starts; it is NOT derived from any user identifier.
- Client-side dedup (one vote per user per cycle) is enforced in AsyncStorage using `{ flag_id, voted_at }` persisted locally — the server never sees it.
- Jordan hard condition satisfied: **no pattern-of-life inference is possible from DB data alone.**

---

## Quinn open question: reset per-cycle vs. accumulate

### Option A — Per-cycle reset (IMPLEMENTED — recommended)

`reopen_requests` resets to `0` and `reopen_requests_reset_at` is stamped `now()` whenever a flag transitions `resolved → open`.

**Pros:**
- Matches Quinn's "one reopen request per user per flag per resolution cycle" language exactly.
- `reopen_requests_reset_at` is essential for client-side dedup: the client compares its stored `voted_at` against `reopen_requests_reset_at` to know if it already voted in the current cycle. Without this reset timestamp, cycle-scoped dedup is impossible without storing user_id.
- Prevents vote debt inflation: a contentious flag that was resolved and reopened five times doesn't get an accumulated 15-vote head-start on reopening in cycle 6.
- Fairer for newer users who weren't present for earlier cycles.

**Cons:**
- Each new resolution cycle starts from zero — a flag that's genuinely fixed but flagged again needs a fresh vote quorum.

### Option B — Accumulate (not implemented)

`reopen_requests` never resets. Every vote ever cast counts toward the threshold.

**Pros:**
- Simpler: no reset trigger, `reopen_requests_reset_at` column is not needed.
- Long-standing community concern is easier to reopen (accumulated social proof).

**Cons:**
- Cannot enforce one-vote-per-user-per-cycle without user_id storage (Jordan blocker).
- A flag that was repeatedly contested accumulates votes toward a permanently lower effective threshold — vote inflation over time.
- Violates Quinn's "per resolution cycle" framing.

### Dana recommendation: Option A (per-cycle reset)

Option B is structurally incompatible with Jordan's no-user_id ruling if per-cycle dedup is required. Option A is the only path that satisfies both Jordan (no user_id stored) and Quinn (per-cycle dedup). If Sky decides votes should accumulate without per-cycle dedup — i.e., any user can vote unlimited times — Option B becomes viable, but that would be a new Quinn decision.

To switch to Option B: remove the `handle_flag_reopen_reset` trigger/function block and the `reopen_requests_reset_at` column from the migration before applying.

---

## PROPOSE-ONLY notice

**This migration has NOT been applied to any Supabase environment.**

Sky applies it via the Supabase SQL Editor. Steps:

1. Open Supabase dashboard → SQL Editor
2. Paste the full contents of `supabase/migrations/2026-05-30_flag_reopen_requests.sql`
3. Run
4. Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'flags' AND column_name LIKE 'reopen%';` should return two rows.
5. Verify the RPC: `SELECT public.increment_reopen_request('<a-real-resolved-flag-uuid>');` should return 1.

**Rollback** is included at the bottom of the migration file — DROP trigger → DROP functions → DROP index → DROP columns.
