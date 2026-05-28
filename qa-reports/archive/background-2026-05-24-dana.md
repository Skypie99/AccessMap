# Dana — Backend & Data audit (AccessMap)

- **mode:** background
- **model_tier:** opus
- **project:** AccessMap
- **cycle_id:** dana-background-2026-05-24
- **role:** Dana (Backend & Database Engineer)
- **branch:** none (AUDIT-ONLY per Const. 12.5 — AccessMap is privacy-sensitive)
- **scope:** data-layer audit — schema, migrations, RLS, types, Storage, client persistence
- **outcome:** AUDIT — no code changes, no commits, no live-DB applies. Findings + propose-only items below for Sky's review.

---

## Baseline (what's on disk)

**Schema source of truth:** [supabase/schema.sql](supabase/schema.sql) (223 lines) — `public.users`, `public.flags`, plus RLS, Storage bucket `flag-photos` policies, two triggers (`handle_new_user`, `handle_flag_status_change`).

**Migrations folder (FILES, not applied):**

| File | Status | Notes |
|---|---|---|
| `2026-05-23_data_layer_hardening.sql` | propose | adds `updated_at` + BEFORE UPDATE trigger |
| `2026-05-23_feedback_table.sql` | propose | creates `public.feedback` (mirrored in types) |
| `2026-05-23_rls_initplan_and_non_owner_status_update.sql` | applied? | initplan rewrite + triage policy already in schema.sql |
| `2026-05-23_status_update_trigger_proposal.sql` | propose | enforces "only status column changes" via trigger (more precise than RLS subselect chain) |
| `2026-05-24_flag_context_tags.sql` | propose | adds `text[] context_tags` + GIN index |
| `2026-05-24_status_history_table.sql` | propose | new audit table + SECURITY INVOKER public view that omits `user_id` (Jordan condition #1) |

**Type layer:** [src/types/database.ts](src/types/database.ts) — `flags`, `users`, `feedback` declared with `type` (CLAUDE.md gotcha #1 honored). `Relationships` uses the `EmptyRelationships` alias. `FlagRow.updated_at` is currently `string | undefined`, with a comment that points to the data-layer-hardening migration.

**RLS posture:** All policies use `(select auth.uid())` wrapper for initplan caching (Postgres re-evaluates once per statement instead of per row). No bare `auth.uid()` references inside `using` / `with check`. Triage policy is in place — non-owners can `UPDATE` only the `status` column via correlated subselects.

**Storage:** `flag-photos` bucket is **public** with path-scoped insert/delete RLS (`<auth.uid>/<ts>.<ext>`). The "no SELECT policy on purpose" comment is correct — public buckets resolve `/object/public/...` without RLS, and adding a broad SELECT would only enable bucket listing.

---

## Findings

### F1 — Type drift: `context_tags` and `flag_status_history_public` not yet in `database.ts` 🟡 medium

Both 2026-05-24 migrations have shipped client code (`src/lib/contextTags.ts`, `src/lib/statusHistory.ts`) but `src/types/database.ts` does **not** declare `context_tags` on `FlagRow` or model the new view. The status_history client deliberately casts through `unknown` to a hand-rolled shape (statusHistory.ts:51-70), which is fine while the migration is propose-only — but the `flags` row already accepts `context_tags?: string[]` writes through `createFlag`, and the type doesn't reflect that.

**Why it's still safe today:** the type is `Partial<FlagRow>` on `Update` and the `Insert` shape is permissive enough that the missing field doesn't cause a compile error. But anyone editing `FlagRow` won't realize they're touching a column the runtime now knows about.

**Propose-only fix (data/ branch, after Sky applies the migration):** add `context_tags?: string[]` to `FlagRow`, then drop the optional once backfill confirms every row has `{}`. For the view, add a top-level `Views` block to the `Database` type and type `flag_status_history_public` there — then drop the `unknown`-cast escape hatch in `statusHistory.ts`. Don't do this until the migration is live, or `select *` from `flags` will pull a phantom column that doesn't exist.

### F2 — `users.email` uniqueness is enforced in DB but not surfaced in the Insert type 🟢 low

`public.users` has `email text not null unique`. The `Insert` type in `database.ts` honors `not null` (no `email?: string`) but a duplicate-email insert from a future seed/migration script would fail at runtime with `23505` and no client wrapper catches it specifically. Today the only inserter is the `handle_new_user` trigger (uses `on conflict do nothing`), so this is theoretical. **No action; documenting for future-self.**

### F3 — `flags.severity` is `smallint check (between 1 and 5)` but the type is the narrower `FlagSeverity = 1|2|3|4|5` 🟢 low

That's correct — the literal union is more restrictive than the DB check, which is what we want. A direct `UPDATE flags SET severity = 7 WHERE id = ...` from the dashboard would pass the type but fail the check. No client surface allows that today. **No action.**

### F4 — Two UPDATE policies on `flags` rely on Postgres's OR-merge semantics 🟢 low

Owners pass `flags update own`; non-owners pass `flags status update by any authenticated`. Both apply on every UPDATE; Postgres requires at least one to allow. The WITH CHECK on the triage policy compares every non-status column against the OLD row via correlated subselects to enforce "only status changed." This is **correct but subtle** — anyone tightening this should be aware that adding a new column to `public.flags` REQUIRES adding it to every `... = (select ... from public.flags where id = flags.id)` line in the triage policy, or non-owner UPDATEs will start failing the WITH CHECK for the new column.

**Existing migration `2026-05-23_status_update_trigger_proposal.sql` solves this** — it shifts the enforcement to a BEFORE UPDATE trigger that compares NEW vs OLD, so adding a column to `flags` doesn't break the policy. Worth Sky applying once the current schema stabilizes.

### F5 — `flags_geo_idx on (lat, lng)` is a btree, not a spatial index 🟡 medium

The current index supports range scans on `lat` then `lng`, which is fine for the current `select * from flags where status in (...) order by created_at desc limit 500`. But if the app ever adds "flags near me" (haversine within X km), this index won't help — Postgres can't use a btree for radius lookups.

**Propose-only fix (when "flags near me" is on the roadmap):** add PostGIS (`create extension postgis`) and a `geography(Point, 4326)` generated column with a GIST index. Don't pre-build this — adding PostGIS to a Supabase project enables an extension and bumps the DB version, which is a non-reversible change.

### F6 — No `created_at` index on `flags` 🟢 low

`listFlags` orders by `created_at desc limit 500`. With ≤500 rows that's a sequential scan + sort; under, say, 50k rows it'll still be fast enough but eventually the sort cost will dominate. **Propose-only:** `create index if not exists flags_created_at_idx on public.flags(created_at desc);` — paired with the `status` predicate this becomes a btree index-only scan once the table grows. Worth bundling with the same migration as F5 if PostGIS lands.

### F7 — Storage bucket is public; photos may contain EXIF GPS 🟡 medium (privacy)

`flag-photos` is `public = true`. Anyone with the URL can fetch the file. The `uploadFlagPhoto` helper in `src/lib/flags.ts` `fetch`es the local URI and uploads the raw bytes — **no EXIF strip pass**. MutualMesh's CLAUDE.md gotcha #7 codifies that exact concern; AccessMap doesn't enforce it. A flag photo taken in someone's home/workplace can leak its capture location via EXIF GPS — and the photo's lat/lng EXIF and the flag's `lat`/`lng` may not even match (the user might be reporting a sidewalk in front of a house they live in).

**This is a privacy-sensitive finding** — Constitution Art. 7.6 makes Jordan review + Sky approval mandatory before merging anything that touches it. **Recommended action:** Morgan picks up this report and surfaces to Sky. The fix is a small client patch — `expo-image-manipulator` re-encode pass (`manipulateAsync(uri, [], { compress: 0.8, format: SaveFormat.JPEG })`) before `uploadFlagPhoto`. That re-encode also drops EXIF as a side effect.

**Not a data-layer change** — Dana flags this and hands off to Steve (security) and/or Shamus (client) once Sky approves the direction.

### F8 — `handle_flag_status_change` reads `auth.uid()` inside a `security definer` function 🟢 low

The function awards the actor bonus to `auth.uid()`. Inside `security definer`, `auth.uid()` still returns the caller's UID (definer = the function's owner, the executing role is unchanged), so this is correct. Documenting because it surprised me on first read — security definer changes who owns the function's privileges, not who `auth.uid()` resolves to.

---

## Decisions for Sky

None of the items above block anything. The two worth deciding on:

1. **F7 (privacy / EXIF):** approve the EXIF-strip patch path? If yes, Morgan should route this to Steve (security review) → Shamus (client patch) on a feature branch.
2. **Migration cadence:** the propose-only stack is now five files deep. Worth a "migrations apply day" where Sky reviews + applies all five in dashboard order? Each is idempotent; recommended order: `2026-05-23_data_layer_hardening.sql` → `2026-05-23_feedback_table.sql` → `2026-05-23_status_update_trigger_proposal.sql` → `2026-05-24_flag_context_tags.sql` → `2026-05-24_status_history_table.sql`. Then I can drop the `?` from `updated_at` and the `unknown` cast in `statusHistory.ts` on a follow-up `data/` branch.

---

## What I did NOT do (BACKGROUND mode discipline)

- No commits. No branch creation. No edits to `src/types/database.ts` (would require live-DB sync first).
- No external sends — no email, no Slack, no Morgan. Per Const. 12.2 + 9.4.
- No live-DB applies. Per Const. 5.3 — never, BACKGROUND or otherwise.
- No edits under `~/.claude/**` or `~/ClaudeCorp/.claude/**`. Per Const. 12.6.

Morgan picks this up on the next status sweep.
