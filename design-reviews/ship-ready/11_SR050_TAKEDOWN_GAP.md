# SHIP-READY Phase 3 — 11 · SR-050: the takedown lever does not remove the photo

**Date:** 2026-07-27 · **Provenance:** Opus 5, ultracode max effort · **Severity: HIGH**
**Status:** ⚠ **found UNDISPOSED by the conservation pass** (`10_CONSERVATION_TABLE.md §6`) — it was raised in
Phase 1 and appears **nowhere** in `05_THE_SUBMISSION_GAP_LIST.md`, so no phase ever owned it.
**This bears directly on Apple 1.2(b), the blocker Phase 3 is closing.**

---

## The finding, verified at HEAD

`deleteFlag` deletes the database row and nothing else:

```ts
export async function deleteFlag(flagId: string) {
  const { error } = await supabase.from('flags').delete().eq('id', flagId);
  if (error) throw error;
}
```

The flag's photo stays in the `flag-photos` bucket, at a **public, stable URL**, forever. `flags.ts:861`
already has the function that would remove it — `removeUploadedFlagPhotos(paths)` — and `flags.ts:665` even
names it as the intended cleanup path ("callers keep the `path` so a failed submit can clean up the
now-orphaned object via `removeUploadedFlagPhotos` — tracking the path directly avoids fragile URL parsing
later"). It is wired into the failed-submit path and **not** into deletion.

Phase 1 registered this as **"SR-001 evidence"** — SR-001 being the UGC-moderation blocker — with the note
that *a 1.2 report mechanism built on top of this queue would still be unable to remove the reported image.*
That is exactly the situation Phase 3 would otherwise have shipped.

## Why it matters more than "an orphaned blob"

The two callers are not equivalent, and the difference is the whole finding:

| Caller | Who | Storage RLS says | Result |
|---|---|---|---|
| `FlagDetailModal.tsx:619` | the flag's **owner**, deleting their own | `flag-photos owner delete` — permits it | photo **could** be removed client-side; it isn't |
| `AdminScreen.tsx:146` | an **admin**, taking down someone else's | owner-only — **denies** it | photo **cannot** be removed client-side at all |

So the moderation path — the one Apple 1.2(b) is about — is the half that is *structurally* unable to
complete. C-8 (applied 2026-07-27) lets an admin delete an abusive **comment**. `deleteFlag` lets an admin
delete an abusive **flag row**. Neither can remove the abusive **image**, which is the likeliest objectionable
payload in a photo-first accessibility app.

**A takedown that leaves the reported photo publicly fetchable is not a takedown.** Any 1.2 score that treats
the flag-takedown lever as complete is wrong in the same way that closing B-1 on the strength of W1 was wrong.

## Disposition — split, because the halves have different owners

### (a) The owner half — buildable, deliberately NOT built here

Wiring `removeUploadedFlagPhotos` into the owner's own delete is a few lines and the owner-only RLS permits
it. It is **not** built in this phase for one reason, stated so it reads as a choice rather than an oversight:
Sky scoped **R-1** — the sibling class (account-deletion Storage residue: the avatar and every flag photo
staying public forever) — to **artifact-only** for exactly this train (§SKY-3h). SR-050's owner half is the
same act on a narrower trigger, and quietly shipping a destructive Storage path here while the broader one
waits for her would be inconsistent. It is a one-commit follow-up the moment she says go.

⚠ One real constraint if it is built: `deleteFlag` receives only a flag **id**, while
`removeUploadedFlagPhotos` takes storage **paths**. `photo_url` is a public URL, and `flags.ts:665` explicitly
warns off URL parsing ("tracking the path directly avoids fragile URL parsing later"). So the honest owner-half
fix needs either the `flag_photos` junction rows (which carry paths) or a deliberate, tested URL→path
derivation — not a one-liner. Anyone who implements it in two lines has almost certainly parsed a URL.

### (b) The admin half — a FORK. Sky applies; an agent cannot.

Two ways to give a takedown the power to remove the image, both Sky's:

**Option A — extend the Storage delete policy to admins (Sky-applied SQL).** Add a second DELETE policy on
`storage.objects` for `bucket_id = 'flag-photos'` permitting `public.users.is_admin`. Smallest change; keeps
the takedown synchronous and in-app. It does widen who can delete from the bucket, which is a privacy-adjacent
authorization change and therefore Jordan-relevant.

**Option B — a server-side sweep (Sky-deployed edge function).** The same shape R-1's artifact takes, so the
two could share one function. Keeps client permissions untouched; adds a deploy step and makes takedown
asynchronous.

**Recommendation: A, and fold R-1 into B separately.** Takedown should be synchronous — a moderator needs the
image gone when they press the button, not on the next sweep — and a moderation-scoped delete policy is
narrower and easier to reason about than a function with service-role credentials. But this is a genuine
authorization change on user-uploaded content, so it goes to Sky with Jordan review, not into this branch.

**No SQL was written to this file deliberately:** a `storage.objects` policy addition is a privacy-sensitive
authorization change on disability-adjacent user content, and the fence puts drafting-then-Sky-applying that
behind her explicit yes rather than presenting it pre-written and one paste from live. Say the word and the
artifact lands with its rollback and a read-only pre-state probe, the same shape as the eleven in §SKY-3.

## Consequence for the Apple 1.2 score

Leg **(b)**'s takedown half must be reported as **incomplete for flags**, independent of how good the new
Report control is: reports can be filed and read, comments can be removed, flag rows can be removed, and the
reported **photo** cannot. That belongs in the verdict as a named gap with an owner, not averaged away.

## Why it was missed — the systemic cause

`05 §7` consolidates the device rows from `§6`'s script, `01 §P`, `02 §D`, `03 §6`, `01 §T` and `01 §M` — but
**not** from `01 §H`, which is where four other findings (SR-040/042/045/046) also went missing. `05 §8` then
asserted conservation for SR-001…039 only, while claiming a "close-out grep in HANDOFF" that does not exist.
Twelve findings fell through that seam. The fix is the table in `10_CONSERVATION_TABLE.md`, which enumerates
all 117 rather than asserting a range.

---

# ADDENDUM — Run 2 (2026-07-28): the owner half is BUILT; the admin half is an artifact

**§SKY-6 / §SKY-6a.** What changed, and the one thing that did not.

## (a) Owner half — ✅ BUILT

`deleteFlag` now gathers every photo URL belonging to the flag (the legacy
`flags.photo_url` **and** every `flag_photos` row), derives each Storage path,
deletes the row, then sweeps the objects. Order is load-bearing: the URLs live
on the rows being deleted, so gathering has to happen first.

**The blocker this document did not know about.** §(a) above says the honest fix
could use "the `flag_photos` junction rows (which carry paths)". **They do not.**
`flag_photos.url` is a public URL, not a path — `photos.ts:63` destructures only
`{ url }` from the upload tuple and discards the `path`. Verified: **no
`storage_path` column exists anywhere in `src/` or `supabase/`**, and there is no
SELECT policy on `storage.objects`, so `storage.list()` returns nothing either.
There was no path to read, anywhere.

So the menu reduced to the second option this document named — "a deliberate,
tested URL→path derivation" — which collides with `flags.ts:665`. Sky ruled
(§SKY-6a): **derivation, with the carve-out written INTO the law.** One named
helper, one bucket constant, an explicit "no other URL parsing anywhere"
restatement, and a guard test proving the marker literal appears in exactly one
file. It fails closed — `null` on any mismatch, and `null` deletes nothing,
because the failure mode of a wrong guess is destroying someone else's photo.
Her second amendment: **a null is LOUD** (warn + analytics event), since a silent
null would let the takedown hole return invisibly.

`storage_path` is on the backlog, not dropped. The day the URL shape changes — a
private bucket, signed URLs, a CDN — derivation becomes the wrong bet, the column
lands, and this helper becomes legacy-only.

## (b) Admin half — 📄 ARTIFACT WRITTEN, awaiting Sky

Option **A**, as recommended: `04b_sql_sweep_lens4b_RECOVERED.md` **§C-12**.
Fenced DDL + `-- ROLLBACK` + a read-only `-- VERIFY` + a read-only pre-state
probe, mirroring C-8 exactly. **Applied by nobody.**

Until it is applied, an admin takedown deletes the row and leaves the photo
publicly fetchable. The client half needs no change when it lands — the same
`deleteFlag` call simply starts succeeding for admins. **1.2(b) therefore reports
"mechanism complete, admin takedown incomplete", not closed.**

## R-1 — the sibling, still artifact-only by Sky's scoping

Account-deletion Storage residue (avatars + flag photos surviving account
deletion) remains **artifact-only**. See `R1_ACCOUNT_DELETION_SWEEP.md`, written
this run. Deploying an edge function is a production side effect an agent must
never take.
