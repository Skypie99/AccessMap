# AccessMap — Monthly leaderboard (UX #8) — apply steps for Sky

**Decision (Sky, 2026-06-18):** build it · **monthly** window · count **only contributions verified by OTHER people**.

This feature needs ONE database function. Per the rules, I wrote it as a **file** and did **not** touch your live database — **you apply it** when ready. The app code ships alongside it and **degrades gracefully**: until you run the SQL, the "This Month" tab simply shows an empty state — nothing breaks.

---

## What the function does (plain English)
It ranks people by points they earned **this calendar month**, but only from **their own reports that someone else verified or resolved** — i.e. peer-validated work. It deliberately ignores raw self-submissions and "I verified someone else's flag" points, so the monthly board can't be farmed by spamming reports or rubber-stamping. It returns only each person's **name, avatar, and monthly points** — never any private event detail.

## How to apply it (≈2 minutes)
1. Open your Supabase project → **SQL Editor** → **New query**.
2. Open the file `supabase/migrations/2026-06-18_monthly_leaderboard_rpc_PROPOSED.sql`, copy its **entire** contents, paste into the editor.
3. Click **Run**. You should see "Success. No rows returned."
4. (Optional sanity check) In a new query, run:
   ```sql
   select * from public.list_monthly_leaderboard(20);
   ```
   It returns the current month's top contributors (may be empty early in a month — that's expected).

That's it. The "This Month" tab in the app will start showing real data immediately after step 3.

## How to undo it
Run this in the SQL editor:
```sql
drop function if exists public.list_monthly_leaderboard(integer);
```
The app keeps working (the "This Month" tab returns to its empty state).

## Why it's safe (the privacy/security notes)
- **No new data is stored** — it only reads the existing `point_events` ledger you already have.
- **No private data leaves** — it returns only aggregate monthly points + the name/avatar that the all-time leaderboard already shows publicly. It never returns individual point events or flag IDs.
- It runs as `SECURITY DEFINER` with `search_path = public` (the same hardening pattern as your other functions) and is callable only by signed-in users.
- **Jordan (privacy):** no new privacy surface — aggregate points are the same disclosure class as the existing all-time leaderboard.

## App code shipped with this (already on the branch)
- `src/lib/users.ts` — `listMonthlyLeaderboard()` (calls the function; returns `[]` gracefully if you haven't applied it yet).
- `src/types/database.ts` — typed the function.
- Leaderboard screen + modal — an **All-time / This Month** toggle.

## Not included (deferred, optional Phase 2)
Exact "this was THE resolution event" tagging would need a `point_events` schema column; the current month-window + peer-validated-event filter is accurate without it. Revisit only if you ever want a different definition of "counts."
