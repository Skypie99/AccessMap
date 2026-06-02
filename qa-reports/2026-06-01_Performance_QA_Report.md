# Performance QA Report — AccessMap — 2026-06-01

**Author:** Peter (Performance Engineer) · **Branch:** `qa-peter/accessmap-2026-06-01` (off `main` `5fb80ce`, isolated worktree, **not merged**)
**Baseline:** `npm run typecheck` ✅ · `npm run lint` ✅ (0 errors, 259 pre-existing warnings) · whole-app deep pass
**Bottom line:** AccessMap is **already well-optimized for launch**. This was a verify-heavy pass: 1 tiny clean-file commit, and a measured scale roadmap to apply as data grows. No performance blocker for human testing.

---

## ⚠️ DECISIONS FOR SKY (read first)

None block testing. All are about scaling *beyond* the current 7 flags. In rough priority:

1. **Photo thumbnails (P1).** Map callouts/lists download **full-resolution** photos into ~240px slots. Two ways to fix — **(a)** enable Supabase **Storage image transforms** (requires the **Pro plan — a paid upgrade**, your call), or **(b)** generate a small thumbnail at upload time (free, but a code + schema change touching the photo flow, which is privacy-adjacent → wants a Jordan glance). **Recommend (b)** unless you're already on Pro. ~80% less photo bandwidth per view at scale.
2. **Viewport/bbox query (P2).** The map feed loads the **50 most-recent flags globally**, not the ones in your current view. At city scale that's both a *relevance* problem and a data-volume one. Fix = fetch by map region. Proposed as **migration file(s) + a code change** — needs your go-ahead because it changes the data-fetch model. Not urgent at 7 flags; do it before real density.
3. **Index migrations (P3).** Two safe, additive DB changes proposed as **migration files (NOT applied)**: drop a **duplicate index** on `flags`, and add **covering indexes for 7 unindexed foreign keys** (helps joins + account-deletion cascades at scale). Apply when convenient; order + SQL below.
4. **RLS performance (P4) — routed to Steve.** Supabase flags `auth_rls_initplan` and `multiple_permissive_policies` on `flags` and others. These are real perf-at-scale items but live in **RLS/security policy** — Steve's lane, and the parallel security audit owns `schema.sql`. **I did not touch them.** Exact advisor list handed off below.

Everything else is monitor-only.

---

## Summary

I profiled the whole app — every screen, the data layer, the map, lists, animations, cold
start, and the live database (read-only) — through a measure-first lens at 1× / 10× / 100×
data growth. The dominant finding is that **the costly things are already handled**:
bounded + paginated queries, a shared stale-while-revalidate flag store, marker clustering,
virtualized memoized lists, and native-driver animations all shipped in prior work. The
skill's old hotspot map is stale; I verified against current code rather than re-proposing
solved problems.

- **Committed (1):** C1 — hoisted two re-allocated inline style objects in `MapScreen.tsx`
  into a shared `makeStyles` entry. Zero behavior change; conflict-free file.
- **Proposed (7):** photo thumbnails, viewport/bbox query, index migrations, RLS perf
  (→ Steve), a ProfileScreen fetch-dedupe, and bundle/startup monitoring.
- **typecheck + lint:** green before and after.

---

## Baseline (measured)

| Signal | Value |
|---|---|
| `main` | `5fb80ce` (ui-polish merged + lint restored). Merge touched **no** perf-critical file. |
| typecheck / lint | ✅ / ✅ (259 pre-existing `import/first` warnings in tests; 0 errors) |
| Live DB | "Accessable City App", **Postgres 17**; `flags` = **7 rows**, `users` = 2, all other tables ~0 |
| Tests | ~1,550 across 65 files |

Because the data is tiny, **nothing is slow today** — every finding below is framed as
"what happens as flags grow to 1k / 10k / 100k."

---

## Already optimized — verified, not changed (so you know the foundation is solid)

| Area | Status | Evidence |
|---|---|---|
| Query bounds | ✅ | `listFlags` `.limit(500)`; `listFlagsPage` cursor-paginated 50/20; explicit column lists everywhere (no `select('*')`) — [flags.ts](src/lib/flags.ts) |
| Cross-screen fetch dedupe | ✅ | Shared `FlagsProvider`: SWR offline cache (24h, user-scoped), `refreshIfStale(30s)`, sequence-tagged fetches, memoized context value + `flagsMap` — [flagsStore.tsx](src/lib/flagsStore.tsx). **React Query would be redundant.** |
| Map markers | ✅ | Clustering shipped (react-native-map-clustering native + supercluster web), inside `PlatformMap`; native pins (`pinColor` + `<Callout>`, no custom marker views → no `tracksViewChanges` churn); `PlatformMap` is `memo`'d with stabilized props (`initialRegion`, `handleMapLongPress`, `filteredFlags` all memoized) |
| Lists | ✅ | Virtualized; `FlagCard` is `React.memo`; stable `keyExtractor`; `removeClippedSubviews` |
| Realtime | ✅ | Opt-in channel with proper teardown + viewport geofence — [flagsStore.tsx](src/lib/flagsStore.tsx) |
| Animations | ✅ | `Skeleton` shimmer = `Animated.loop` + `useNativeDriver:true` on opacity, reduce-motion gated; `Sheet` = native `Modal` slide; tier/progress bars gate the driver correctly |
| Startup | ✅ | Lean provider tree; fonts bundled (~150KB) and gated to first paint; Supabase client init deferred to first query; Sentry is a no-op stub |
| N+1 | ✅ | None found; `fetchFlagsByIds` batches by `.in(...)` |

---

## Optimization committed (branch `qa-peter/accessmap-2026-06-01`)

### C1 · MapScreen inline style objects → shared `makeStyles` entry · Low severity
- **Location:** [MapScreen.tsx:1495](src/screens/MapScreen.tsx) (Save-preset button) and [MapScreen.tsx:1667](src/screens/MapScreen.tsx) (Report FAB).
- **Cost:** two identical `{ flexDirection:'row', alignItems:'center', gap:6 }` objects allocated on **every** MapScreen render (the FAB one is always mounted), each forcing the inner `View` to reconcile a fresh style identity.
- **Fix:** added one `iconLabelRow` entry to `makeStyles` and pointed both call sites at `styles.iconLabelRow`.
- **Impact:** removes 2 per-render object allocations on the app's most-rendered screen; identical rendering. **Renders avoided: 0; allocations avoided: 2/render.** Tiny but free and clean.
- **Why only this:** the genuinely valuable wins are all either structural (propose-only) or in screen/shared files the parallel audits may also touch. Committing churn there would create needless merge conflicts for marginal gain (see SHARED-FILE section). Restraint is deliberate.

---

## Proposals — NOT applied (need your review)

### P1 · Photo thumbnails — biggest bandwidth win at scale · High (at scale)
- **Problem:** `uploadFlagPhoto` stores the **full object URL** ([flags.ts:364](src/lib/flags.ts)); the map callout renders it full-res into a 244×120 slot ([PlatformMap.tsx:233](src/components/PlatformMap.tsx)). Multi-photo rows (`flag_photos.url`) do the same. A 0.7-quality phone photo is ~1–3 MB; the slot needs ~50–80 KB. Every callout open / list paint over-downloads ~10–40×.
- **Path A — Supabase Storage render transforms (needs Pro plan):** request a sized URL via `getPublicUrl(path, { transform: { width: 480, height: 240, resize: 'cover' } })`. Requires a URL→path helper (we store the full URL, and the transform endpoint differs from the object endpoint). **DECISION: enabling transforms is a paid-tier upgrade — yours to make.**
- **Path B — upload-time thumbnail (free, recommended):** in `uploadFlagPhoto`, after EXIF strip, also produce a downscaled copy with `expo-image-manipulator` (already a dependency) and store it (e.g. `flag_photos.thumb_url` / a `photo_thumb_url` column). Render thumb in callouts/lists, full image only in the lightbox. **DECISION: small schema + photo-flow change; privacy-adjacent (touches the upload path) → worth a Jordan glance.**
- **Impact:** ~80% less image bandwidth per callout/list view as photo count grows.

### P2 · Viewport / bounding-box flag query — #1 scale + relevance item · High (at scale)
- **Problem:** the feed loads by **recency** (50/page), not location ([flagsStore.tsx:228](src/lib/flagsStore.tsx) → `listFlagsPage`). At density the map shows the 50 newest flags *anywhere*, not the ones you're looking at — wrong data **and** unbounded relevance loss. Clustering fixes *render* cost, not *which rows* you fetch.
- **Lightweight fix (no PostGIS):** add lat/lng bounds to the query keyed to the current map region, debounced on region change:
  ```ts
  // in listFlagsPage / a new listFlagsInView(region)
  .gte('lat', minLat).lte('lat', maxLat).gte('lng', minLng).lte('lng', maxLng)
  ```
  The existing `flags_geo_idx (lat,lng)` btree partially serves this; a `(lat, lng)`-ordered scan handles the lat range. Code change in `flagsStore.tsx` (+ MapScreen passes its region). **Propose-only** (changes the fetch model).
- **Scalable fix (PostGIS):** `geography(Point,4326)` column + **GiST** index + a `flags_in_view(min_lat,min_lng,max_lat,max_lng)` RPC using `&&` / `ST_MakeEnvelope`; call via `supabase.rpc(...)` debounced. Industry-standard "load what's on screen."
- **Impact:** rows fetched per map interaction = only in-view (e.g. ~20–200) instead of "newest 50 globally." Correctness + scale.

### P3 · Index migrations (additive, safe) — propose as migration files · Med (at scale)
Grounded in live Supabase advisors. **Not applied.** Apply order: drop-duplicate first, then FK indexes.

**(P3a) Drop the duplicate index on `flags`** — advisor `duplicate_index`:
```sql
-- flags has TWO identical indexes; keep the one defined in supabase/schema.sql,
-- drop the other so writes don't maintain both. (Confirm which name is canonical.)
drop index if exists public.idx_flags_status_created_at_desc;
-- (keeps flags_status_created_at_idx)
```
> Note: a `(status, created_at desc)` index **already exists** — do NOT add another.

**(P3b) Covering indexes for 7 unindexed foreign keys** — advisor `unindexed_foreign_keys`. Helps joins and **account-deletion cascades** (the `account_deletion_cascade` migration makes these FKs cascade-delete; without a covering index each cascade does a seq scan):
```sql
create index if not exists comment_votes_voter_id_idx          on public.comment_votes(voter_id);
create index if not exists flag_comments_user_id_idx           on public.flag_comments(user_id);
create index if not exists flag_edit_history_user_id_idx       on public.flag_edit_history(user_id);
create index if not exists flag_status_history_user_id_idx     on public.flag_status_history(user_id);
create index if not exists flag_verifications_verifier_id_idx  on public.flag_verifications(verifier_id);
create index if not exists point_events_flag_id_idx            on public.point_events(flag_id);
create index if not exists realtime_subscribe_log_user_id_idx  on public.realtime_subscribe_log(user_id);
```
> At current size these are instant. If applied to a large live table later, use `CREATE INDEX CONCURRENTLY` (outside a transaction).
>
> **Do NOT act on the `unused_index` advisories** (context_tags, reopen_requests, status/created_at, etc.): "unused" here just means the tables are too small (≤7 rows) for Postgres to pick any index yet. They earn their keep at scale — removing them would be a regression. The *only* index to drop is the true duplicate (P3a).

### P4 · RLS performance — ROUTED TO STEVE (security domain) · Med–High (at scale)
Supabase advisors flag, on the live DB:
- **`auth_rls_initplan` (WARN):** policies re-evaluate `auth.<fn>()` per row on `flags`
  (`flags_auth_user_only`, `flags_user_scoped`), `flag_photos` (owner update/delete),
  `push_tokens` (4), `notification_preferences` (3), `flag_status_history` (1),
  `flag_comments` (insert/delete). Fix is the documented `(select auth.uid())` rewrite —
  >100× at scale, zero functional change.
- **`multiple_permissive_policies` (WARN):** `flags` has **3 overlapping SELECT policies**
  for `authenticated` (`flags readable by authenticated`, `flags_auth_user_only`,
  `flags_user_scoped`); similar on `feedback`, `users`, `flag_edit_history`,
  `flag_status_history`. Each permissive policy runs per query — consolidation is a perf win.
- **Why I didn't fix it:** RLS is Steve's domain and the parallel security audit owns
  `schema.sql`; editing it here would be out-of-lane and a guaranteed merge conflict.
  **Handed off** with the exact list above.

### P5 · ProfileScreen reads the user's flags twice per focus · Low–Med
- **Where:** on every Profile focus ([ProfileScreen.tsx:434](src/screens/ProfileScreen.tsx)), `load()` runs `flags.select('status').eq('user_id')` (line 305) **and** `refreshUpdateCount()` runs `listFlagsByUser()` (line 366) — two reads of the same rows.
- **Proposed fix:** compute the status counts from the `listFlagsByUser()` result; drop the separate `select('status')` query. One fewer round-trip per focus, zero behavior change.
- **Not a staleness gate:** Profile points/counts must refresh on focus (the points banner depends on it) — so don't gate it, just dedupe.
- **Why propose, not commit:** `ProfileScreen.tsx` is a screen file the **accessibility sibling audit likely also touches** → keeping it out of my committed diff avoids a merge conflict for a small win.

### P6 · Bundle / startup — monitor · Low
- **lucide-react-native** imported across ~8 files (~35 icons of the set). Verify tree-shaking in a production build (`eas build … --profile production`); if icons land >50 KB, consolidate imports or use a sprite.
- **8 font weights** load at startup (3 families). Trim only a weight you can prove is unreferenced in `theme.ts`.
- Consider lazy-loading the admin-gated screen if it grows.

### P7 · Forward suggestions
- Adopt **`expo-image`** (built-in memory/disk cache + better decode) for remote thumbnails once P1 lands — pairs naturally with sized URLs.
- Minor: each `Skeleton` runs its own native-driver loop (bounded, native-thread, load-only). A single shared `Animated.Value` would be marginally leaner — only worth it if you ever render many skeletons at once.

---

## SHARED-FILE edits — for clean merge with the sibling audits

- **Committed edits: 1 file — `src/screens/MapScreen.tsx`** (C1). The ui-polish merge did
  **not** touch it, and it's not in the data/RLS surface the security audit works on. Low
  collision risk; if the a11y audit also edits MapScreen, the conflict is a trivial
  2-line style hoist.
- **Deliberately NOT committed (proposed only):** `ProfileScreen.tsx` (P5),
  `LeaderboardScreen.tsx` (an `AvatarCircle` `React.memo`, negligible at top-20),
  `flagsStore.tsx`/`MapScreen.tsx` for P2 (structural), `schema.sql`/RLS (P4, Steve's).
- **Heads-up:** if the security/accessibility branches forked the **pre-merge** `main`
  (before `5fb80ce`), their base differs from mine — a rebase onto current `main` before
  merging will keep things clean.

---

## Remaining performance risk going into testing

- **None blocks testers at current scale (7 flags).** Cold start, scroll, map pan/zoom,
  and transitions are all in good shape on the verified-optimized foundation above.
- **The scale cliffs to watch** (all addressed by the proposals): (1) photo bandwidth on
  metered connections (P1); (2) the recency-not-viewport feed showing wrong/over-fetched
  data as density grows (P2); (3) per-row RLS evaluation cost at high row counts (P4).
- **Real-device caveat:** all timings here are reasoned from code + the live DB, not
  measured on hardware. Confirm on real mid-range devices (below).

---

## How to review

```bash
# See everything on the branch:
git diff main..qa-peter/accessmap-2026-06-01

# It's an isolated worktree at .claude/worktrees/qa-peter-perf on branch
# qa-peter/accessmap-2026-06-01. Not merged. To discard:
#   git worktree remove .claude/worktrees/qa-peter-perf && git branch -D qa-peter/accessmap-2026-06-01
```

**Proposed migrations to apply, in order (only when you choose to):**
1. **P3a** — `drop index if exists public.idx_flags_status_created_at_desc;` (drop duplicate)
2. **P3b** — the 7 FK covering-index `create index` statements above
3. **P2** — viewport bbox (lightweight) or PostGIS path, with the matching code change
4. **P1** — photo thumbnails (Path B recommended) — coordinate with Jordan
5. **P4** — RLS `(select auth.uid())` rewrite + policy consolidation — **via Steve**

**Profile on real iOS + Android (mid-range, e.g. iPhone SE / a Pixel-a):**
- Cold start to first interactive frame (kill app, relaunch) — watch the font gate.
- Map pan/zoom FPS with many pins: temporarily seed ~500–1,000 flags and check cluster
  expand/collapse smoothness and callout-open latency (photo download).
- Tasks list fling FPS + Profile tab-switch latency (the double-read in P5).
- Network panel: bytes per callout open (validates the P1 photo win once applied).

---

## Constitution note

The task asked to email this to skylerhalisky@gmail.com. Per the standing rule +
Constitution Art. 9 (only Morgan messages Sky), **I did not email it.** This report is
saved at `qa-reports/2026-06-01_Performance_QA_Report.md` on the branch — **invoke
`/morgan` to relay it.**
