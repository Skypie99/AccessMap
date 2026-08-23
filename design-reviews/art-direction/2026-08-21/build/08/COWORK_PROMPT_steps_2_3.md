# COWORK PROMPT — Flagstone: the 4.1.1 version record, and the production junk takedown

Paste this whole file into a fresh Cowork/Claude window. It is self-contained —
it assumes no memory of the session that produced it.

**Repo:** `~/AccessMap` · **Branch:** `main` · **Everything below is already pushed:**
`main` == `origin/main` == `2e510e9`, verified with `git ls-remote`.

**Current state, so you do not re-derive it:**
- App name **Flagstone**, version **4.1.1**, bundle `com.accessmap.app`
- App Store Connect app id `6774709116`, Apple team `S78F8ZA8QU`, Apple ID `skylerhalisky@gmail.com`
- EAS project `a7149107-fb9b-4853-a053-648320c05cb6`, logged in as `skypie911`
- Gate on `main`: typecheck 0 errors · lint 0 errors / 82 warnings · jest **242 suites / 3605 passed / 32 todo / 0 failed**
- Supabase project **"Accessable City App"** ref `kldlwszpfkdmsjrjhjym`

---

## TASK 2 — Create the 4.1.1 version record in App Store Connect

**This is a website task and it needs Sky's Apple ID + 2FA. An agent must not
enter those.** Either Sky does it, or she drives it in a browser where she is
already signed in and the agent only reads the screen and advises.

**Why it is needed:** the TestFlight build will carry
`CFBundleShortVersionString = 4.1.1`. If the App Store Connect record is still
sitting at **3.0.0** in *Prepare for Submission*, a 4.1.1 build will not attach
to it. Discovering that after a 20-minute paid build is the failure mode this
task exists to prevent.

**Steps:**
1. App Store Connect → **Apps** → **Flagstone**.
2. Look at the left sidebar under **iOS App**. Note what version is there and
   what state it is in (*Prepare for Submission*, *Waiting for Review*, etc.).
3. Then **one** of:
   - If a **4.1.1** record already exists → nothing to do. Confirm and stop.
   - If a version exists but is **not yet submitted** (e.g. 3.0.0 in *Prepare
     for Submission*) → the simplest fix is to change that record's **Version**
     field to `4.1.1` and save. No new record needed.
   - If the existing version is already **submitted / in review / released** →
     use **(+) macOS App / iOS App** → **iOS App** to add a new version, and
     enter `4.1.1`.
4. Report back: what version existed, what state it was in, and which of the
   three paths was taken.

**Do not** submit anything for review, change pricing, or accept agreements.
Creating or renaming the version record is the entire task.

---

## TASK 3 — Run the production junk takedown

**File:** `~/AccessMap/supabase/migrations/2026-08-22_takedown_junk_flags.sql`

**⚠ Read the file's own header before running a line of it.** It is written as
four ordered steps and Step 3 refuses to run if Step 2 did not.

### Why this exists

Production carries 32 flags. **12 of them are honest seeded Kelowna barriers**
(tagged `seed_2026_08_18`) and are fine. The other 20 are Sky's own development
junk. The takedown removes **15** of those 20.

The two that matter:
- **`af36e3bf`** — description **"BUMBAKLOT"**, resolved, severity 5. Profanity,
  and it is one filter tap from an App Store reviewer (Profile, MyReports and
  FilterPresets all expose all four statuses). This is the real reason to run it.
- **`29718d8c`** — *"Very steep sidewalk"*, open, severity 2. The **only** junk
  row visible under the default filter, so the only one that can land in a store
  screenshot. **It is deliberately NOT in the delete list** — §D of the file
  offers improve / delete / leave as three ready statements. **Ask Sky which.**

### ⚠ The part that makes this dangerous

`public.flags` has six dependents, verified against `information_schema`:

| child | on delete |
|---|---|
| `flag_comments` · `flag_edit_history` · `flag_photos` · `flag_status_history` · `flag_verifications` | **CASCADE** |
| `point_events` | **SET NULL** |

Deleting the 15 rows silently takes **2 comments, 2 photo records and 30
status-history rows**, and **unlinks 36 point events**. Sky's points survive (SET
NULL, not CASCADE — the leaderboard is unaffected), but the link from each point
event back to its flag is destroyed and **cannot be rebuilt from a flags-only
backup**. That is why Step 2 of the file backs up **seven** tables.

### How to run it

1. **Step 1 — PREVIEW.** Read-only. Expect **15 rows**. If the count differs,
   **STOP** — the dataset moved since 2026-08-22 and the ID list needs
   re-deriving before anything is deleted.
2. **Step 2 — BACKUP.** Creates seven `bk_2026_08_22_*` tables. Idempotent.
   Confirm the counts the file lists before going on.
3. **Step 3 — DELETE.** Guarded: aborts unless the backup holds every target
   row, and aborts if any target carries the seed tag.
4. **Step 4 — VERIFY.** Expected after: open 9 · rejected 2 · resolved 2 ·
   verified 4 = **17 total**. And
   `select count(*) from public.flags where description ilike '%bumbaklot%'` → **0**.

**Rollback** is at the foot of the file. Read its trigger caveat *before* you
need it: three BEFORE INSERT rate limiters will reject a 15-row restore partway
through unless they are disabled for the restore.

### ⚠ Who may run it

**Sky's Constitution: no agent applies anything to a live database.** If Sky has
not explicitly waived that in this session, the agent's job is to hand her the
SQL and read the results back — not to execute it. Ask; do not assume.

---

## TASK 3b — The two blocked store shots (context, not a task)

Do not try to solve these with SQL:

- **Shot "detail with photo" is blocked** — zero visible flags have a photo. The
  fix is for Sky to file **one real photo report from her phone** early in the
  device walk. That also clears item 22 of `build/08/DEVICE_GATE.md`, and it is
  genuine content, which is what Guideline 2.3.3 wants. Seeding a photo would
  mean a manual storage-bucket upload, which the original seed deliberately avoided.
- **Every detail shot will show an empty comment thread** — the only 2 comments
  in the database sit on rows the takedown deletes. **Do not seed comments.**
  Anonymous barrier reports are a real shipped feature; invented conversations
  between people who do not exist are fabrication. If Sky wants the community
  layer visible, she leaves a real comment from her own account.

---

## What NOT to do

- **Do not merge `security/reviewer-cred-purge`.** It rewrites the reviewer notes
  to say the barriers are in **downtown Vancouver** (they are in **Kelowna**),
  claims 5 seeded flags (there are 12) and 25 points (the account has 124). Its
  one good commit — the credential guard — was already cherry-picked onto `main`.
- **Do not merge `fix/tasksflagcard-date-flake`** (would revert art-direction
  Phase 2a) or **`fix/fmt-xcode26-local-sim-2026-07-25`** (stale by 1307 files;
  its payload is already on `main`).
- **Do not fire a paid EAS build** without Sky saying so. The command, when she
  does: `npx eas build --platform ios --profile testflight`
- **Do not run `prettier --write src`** — it breaks 5 source-pinning guard tests.
