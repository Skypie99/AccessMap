# STORE DATA READINESS — what MUST-1 actually needs now

Read against **live production** 2026-08-22 (read-only queries, nothing applied).
Companion to `DEVICE_GATE.md` item 24. Supersedes the data half of the dossier's
`03_screenshot-shotlist.md` precondition.

---

## The headline: MUST-1 is roughly half done already, and the half that's left is smaller than the dossier says

The dossier (2026-08-05) states the precondition as *"junk takedown + seeding
5–10 real Kelowna barriers"*. Since then, `2026-08-18_seed_reviewer_flags.sql`
**was applied**. Live counts:

| status | rows | of which seeded | anon | has photo |
|---|---|---|---|---|
| open | 9 | 8 | 8 | 0 |
| verified | 4 | 4 | 4 | 0 |
| rejected | 13 | 0 | 0 | 1 |
| resolved | 6 | 0 | 0 | 0 |

**12 honest Kelowna barriers are already live.** The seeding half of MUST-1 is
closed. Do not re-run the seed — it is guarded and would no-op anyway.

---

## What a screenshot can actually see

`src/lib/flags.ts:1670` — `DEFAULT_STATUSES = ['open','verified']`. Map, Tasks and
Nearby all use it. So **19 of the 20 non-seeded rows are already invisible** in
every default view, and cannot appear in a store shot.

That splits the remaining work in two, with different urgency:

| | What | Why it matters |
|---|---|---|
| **Shots** | Exactly **one** junk row is visible by default — `29718d8c`, *"Very steep sidewalk"*, open, severity 2 | The only junk row that can land in a screenshot. It is terse, not embarrassing. |
| **Review** | `af36e3bf` — description **"BUMBAKLOT"**, resolved, category other, severity 5 | Profanity, one filter tap from a reviewer. Profile, MyReports and FilterPresets all expose all four statuses. This is the row with real Guideline 1.1.1 exposure. |

Everything else is housekeeping on Sky's own account history: 9 rows with empty
descriptions, `"bad"` at severity 5, `"Curb"`, `"Mean dog"` (not an accessibility
barrier), one duplicate pair, and one visible concatenation artifact
(`"Construction barriers fully block the sidewalk.blocked"`).

**Takedown file:** `supabase/migrations/2026-08-22_takedown_junk_flags.sql` —
preview → backup → guarded delete, 15 rows, exact rollback. File only; Sky runs it.

---

## ⚠ Two shots in the list cannot be captured from current data

### Shot 24.5 — "detail with photo" is BLOCKED

`select count(*) from flags where status in ('open','verified') and photo_url is not null` → **0**.

The only photo in production sits on a *rejected* row, which no default view shows.
There is no visible flag with a photo to open a detail sheet on.

**The fix converges with the device gate.** DEVICE_GATE item 22 already asks you to
check *"a flag with photos in the new detail sheet — the strip, the alt texts in
VoiceOver."* Filing that one report from your phone during the walk, with a real
photo of a real Kelowna barrier, satisfies **item 22 and shot 24.5 at once** — and
it is genuine content, which is what Guideline 2.3.3 actually wants. Seeding a
photo instead would mean a manual bucket upload, which the 2026-08-18 seed
deliberately avoided.

**Do this early in the walk**, so the row exists by the time you capture.

### Every detail shot will show an empty comment thread

Two comments exist in the entire database, and **both are on rows the takedown
deletes**. After the takedown, `flag_comments` is empty — so the comment section
in shot 24.5 (and any detail shot) renders its empty state.

That is honest and not a blocker. But if you want the detail sheet to show the
community layer, the only non-fabricated way is to leave a real comment from your
own account on one of the seeded flags. **I did not seed comments** — anonymous
barrier reports are a real shipped feature, but invented conversations between
people who do not exist are closer to fabrication than to seeding.

---

## ⚠ The takedown is more dangerous than it looks — read before running

`public.flags` has six dependents. Verified against `information_schema`:

| child | on delete |
|---|---|
| `flag_comments` | **CASCADE** |
| `flag_edit_history` | **CASCADE** |
| `flag_photos` | **CASCADE** |
| `flag_status_history` | **CASCADE** |
| `flag_verifications` | **CASCADE** |
| `point_events` | **SET NULL** |

Deleting the 15 target rows silently takes **2 comments, 2 photo records and 30
status-history rows** with them, and **unlinks 36 point events**.

Your points survive — `point_events` is SET NULL, not CASCADE, so the leaderboard
score is untouched. But the link from each point event back to its flag is
destroyed and **cannot be rebuilt from a flags-only backup**. That is why the
migration backs up all seven tables before it deletes anything, and why its
rollback re-links `point_events` explicitly.

The rollback also has to **disable the flags insert triggers** — three BEFORE
INSERT rate limiters would otherwise reject a 15-row restore partway through, at
exactly the moment you least want a half-finished rollback. That is written into
the file.

---

## Order of operations

1. **Run the takedown** (preview → backup → delete). Kills the profanity row.
2. **Decide `29718d8c`** — improve the description, delete it, or leave it. §D of the migration has all three as ready statements.
3. **Build TestFlight** off `a1a94f6` with `dense`.
4. **Early in the device walk**, file one real photo report → clears item 22 and unblocks shot 24.5.
5. **Then capture the eight shots** at 1320×2868.

Steps 1 and 2 do not depend on the build, so they can happen before it finishes.
