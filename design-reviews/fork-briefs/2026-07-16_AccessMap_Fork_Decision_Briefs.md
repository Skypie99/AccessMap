# AccessMap — Fork Decision Briefs

**Date:** 2026-07-16 · **Authored by:** Fable 5 (max effort, Sky-fired session) · **Mode:** READ-ONLY product-strategist analysis
**Ground rule of this document:** nothing here was built, branched, or applied. Every SQL block is a **PROPOSED, Sky-applied artifact** — an agent never runs it. The fork discipline is the *subject* of this run, not suspended by it.

**Repo state at authoring:** `main` @ `01f7392` (uplift P0→P5 = proposals S1–S20 all landed, + the TasksScreenFlagCard date-flake test fix committed directly to main) · working tree parked on `bench/4-quality` @ `a8549ff` (bench B1–B11 built, **NOT merged**) · unmerged branches: `bench/1–4`, `fix/noscript-fallback`. (`fix/tasksflagcard-date-flake` is *superseded* — its fix already sits on main as `01f7392`.) Every file:line cite below is branch-tagged **`main:`** or **`bench:`**; main was read via `git show main:<path>` with no checkouts.

**Fork provenance:** the Round-1 fork canon (`design-reviews/fable-audit/partials/slate-integration.md` §2, Forks 1–9 — none yet decided), the BENCH-1 discovery ledger, and the R2 audit tree. The root state docs (PROJECT_STATE.md, DECISIONS_LOG.md) predate the fork canon and are cited only where they carry a live open decision (POINTS-VALUES-DRIFT).

---

## HANDOFF

`briefs-done: ALL FOUR ✓ (Fork 1 · Fork 5 · Fork 2/B1 · icon) + interaction map + decision summary + appendix — document COMPLETE 2026-07-16, single-provenance (Fable 5 max). Nothing remaining.`

---

## How to read this document

- Each brief ends in a **RECOMMENDATION**. That is a strategist's position with reasoning — **not a decision. Sky decides.** DO-NOTHING is always presented as a real option with its own case: the shipped state in every one of these forks is a *designed honest default*, not a placeholder.
- Every migration is fenced, carries `STATUS: PROPOSED — SKY-APPLIES, NEVER AUTO-RUN`, a save-as filename, a rollback, and (where the house practice applies) a rolled-back verification probe. Apply order and dashboard steps are spelled out per artifact.
- Effort tiers use the audits' register: **S** ≈ half-day or less · **M** ≈ 1–2 days · **L** ≈ multi-day and/or a Sky device gate.
- **No usage data was invented.** Where a decision would genuinely benefit from a signal Sky doesn't have, the brief says so and provides a copyable read-only SQL one-shot (Supabase SQL editor) instead.

---

## Cross-fork interaction map — read before any single brief

These four decisions are not independent. The couplings, strongest first:

1. **Fork 5(write) × Fork 2 — one anonymous-participation posture, not two decisions.** A guest "flag as wrong" write (Fork 5) and a points reward on anon-flag triage (Fork 2) both extend what anonymous participation *does* in the trust economy — one adds an anonymous **dispute** channel, the other adds a **reward** channel on anonymous content. Deciding either constrains the other's abuse ceiling: a dispute channel plus a reward channel on the same anonymous surface compounds (farm points on anon flags, then dispute the ones you dislike — both without identity). They also share the same missing infrastructure: **there is no server-side anonymous rate limit anywhere today** (the "5/day" precedent is client-side AsyncStorage only — `bench:src/lib/anonRateLimit.ts:4-5`; the DB trigger counts only `auth.uid()`). F10's own migration already concluded client dedup is "soft enforcement only" (`supabase/migrations/2026-05-30_flag_reopen_requests.sql:199-208`). **Recommendation-level guidance: settle Fork 2 and Fork 5's write-half in one sitting, as a single "what can anonymous hands do" posture.**
2. **Fork 5 × Fork 2 — the same SQL-NULL bug family.** The trap Fork 2 exists to fix (`auth.uid() <> NEW.user_id` = SQL-NULL on anon flags → actor bonus skipped, `trust_score_system.sql:186-188`) sits **verbatim in Fork 5's attestation path**: `flag_verifications`' INSERT policy WITH CHECK contains `verifier_id <> (SELECT user_id FROM public.flags WHERE id = flag_id)` (`trust_score_system.sql:69-76`) — NULL for anon-reported flags, so authenticated users could never attest exactly the flags that most need community confirmation. Whichever fork Sky decides first establishes the `IS DISTINCT FROM` pattern; both artifacts in this document carry the same fix shape.
3. **Fork 1 × Fork 5 — locality changes what trust signals mean.** A geo-scoped fetch shrinks the visible set to a neighborhood: a verifier count or dispute badge becomes *locally legible* (three attestations in your suburb is strong signal) and *locally brigade-able* (three hostile taps in one suburb flips the visible ratio of a small set). Geo also unlocks "verified near you" semantics that a global feed can't honestly claim. Neither blocks the other; sequencing just decides which meaning ships first.
4. **Fork 1 × R2 T7/T9 — the arrival surface is already owned.** R2 slate item T7 fixes the false-frame arrival (bounds-fit over already-fetched rows + the undetermined-voice banner) and explicitly fences itself off this fork: "it must not introduce proximity querying or cross Fork 1's DECISION half" (`design-reviews/r2-audit/2026-07-10_AccessMap_R2_Design_Review.md:351`). T9 owns the failure-voice pill. **Fork 1's options are therefore framed post-T7** — DO-NOTHING still receives T7's honesty fixes; the geo options change what T7's "loaded rows" *are*.
5. **Fork 5(count) × R2 T1 (the open CRITICAL).** R2's sole CRITICAL, F2-01, is the pin callout compositing *under* the map chrome — the exact surface a verifier count would ride. Sequence any count display **after T1 lands** (T1 is NEEDS-SKY-DEVICE), or the new trust signal ships occluded.
6. **Icon fork — weak coupling, one existential dependency.** The blocked_path collision exists **only on the unmerged bench line** (main still shows distinct ⛔/🚗 template emoji). If bench never merges, this fork is moot; if it merges (the intended direction — PROTECT-24 retires decorative emoji), the fork activates. Its only other tie to the rest is style law (PROTECT-16/24: bespoke CategoryIcon family, no emoji return, no raw Lucide imports on this surface).
7. **Adjacent, deliberately NOT briefed:** Fork 3 (auth-wall & guest contract) is a *prerequisite posture* for Fork 5's anonymous write-half — a guest dispute affordance presupposes a settled guest contract; and Fork 4's k-anonymity posture informs Fork 1's tile-quantization privacy option. They appear here as dependencies only; briefing them would re-litigate open Sky decisions.

**The one-sitting suggestion:** decide **Fork 2 + Fork 5's write-half together** (thread 1), **Fork 5's count-half after T1** (thread 5), **Fork 1 on its own timetable** (it's the largest data call, thread 4 protects the interim), and **the icon fork at the bench device gate** (thread 6).

---

## BRIEF 1 — Fork 1 · Proximity architecture (geo query vs honest global UI)

*Authored: Fable 5 (max effort) · 2026-07-16 · read-only · cites re-verified this session*

### F1 · The decision in one line

Does AccessMap make FIND literally true — a geographically-scoped flag fetch — and at what architectural weight, or does it ratify the shipped honest-global feed ("Showing N flags") and defer spatial querying until the data outgrows it?

### F1 · Why it was parked — the audit's own framing

The Round-1 fork canon (`design-reviews/fable-audit/partials/slate-integration.md:93-97`):

> **Fork 1 — Proximity architecture** *(behind S4 · L3-2 CRITICAL, L7-03)*
> Every flag fetch is a global most-recent page with no `lat/lng` predicate and no `onRegionChange` re-scope (`flags.ts:606-615/:652-671`).
> - **(A) Build the geo query** — add bounded / `ST_DWithin`-style spatial queries **+** a region-change re-fetch, and keep the word "nearby." *Cost:* a data-layer feature (migration + fetch rework, Sky-applied); *win:* the FIND promise becomes literally true.
> - **(B) Stop claiming "nearby"** — ship S4's UI-only honesty ("N reports loaded" / "Showing most recent") and defer the spatial query. *Cost:* the map stays global-recent, not proximity-true; *win:* zero backend risk now, honest immediately.
> - *Stakes:* at 5 flags invisible; **at real scale, pin-absence reads as barrier-absence — the mission's dangerous failure mode.** S4 ships (B)'s UI half regardless; (A) is the larger data call.

P1 then shipped (B)'s UI half and re-parked the data half explicitly (`qa-reports/2026-07-05_Uplift_P1_Access_Report.md:49`): *"does AccessMap add a bounded/`ST_DWithin` geo-scoped query (+ region-change fetch) so the FIND promise is real, or keep the UI honest as shipped here? The SF `DEFAULT_REGION` (where a no-location user's map centers) rides this decision — untouched by P1."*

Cite-currency note: the canon's `flags.ts:606-615/:652-671` is **still exact on `main`** (`listFlags` at main:606, `listFlagsPage` at main:652); on the bench line the same untouched functions sit at bench:687/:733 (the B8 EXIF/resize block above them added lines). The shipped pill string is **"Showing N flags"** — the canon's sketch copy ("N reports loaded") was superseded at build time (`uplift-assets/P1-verification-evidence.md:22`).

### F1 · Shipped state today (verified)

- **The fetch is global.** `listFlags` (main:606-615): `.from('flags').select(…).in('status', statuses).order('created_at', desc).limit(500)` — no lat/lng predicate. The default feed is `listFlagsPage` (main:652-671), cursor-paginated `INITIAL_PAGE_SIZE = 50` / `NEXT_PAGE_SIZE = 20` (main:42-43). So first paint shows **the 50 most-recent open+verified flags on Earth**, not the nearest.
- **"Nearby" is client-side math** over whatever loaded: `haversineKm` (`distance.ts:26`) in `NearbyFlagsModal.tsx:89,121` and `TasksScreen.tsx:1499`.
- **The honest pill** (main:1429-1439, inside a `GlassSurface` with `accessibilityLiveRegion="polite"` at main:1427) has four arms: `Loading flags…` (cold) / `Updating…` (revalidate, S11) / `` `${filteredFlags.length} of ${flags.length} shown` `` (filtered) / `` `Showing ${flags.length} flag(s)` `` (settled). The denied-location announce (main:1063): *"Location is off, so the map shows the most recent flags, not ones near you…"*
- **`DEFAULT_REGION` = San Francisco** 37.7749, −122.4194 (main:137-142), the `initialRegion` fallback whenever `location` is null (main:1254-1265). A second SF constant, `FALLBACK_PEEK_REGION` (HomeScreen main:56-63), is deliberately visual-only — *"NEVER a distance origin."*
- **Location never leaves the device today.** Every fetch is location-free; the D4 realtime publication broadcasts only `{id, status}` (flagsStore main:479-483); the viewport geofence is client-side (flagsStore main:154-156, :485-489). This is the strongest possible privacy posture — worth naming as a *thing Fork 1 spends*, not just a default.
- **No PostGIS.** The only extension is `uuid-ossp` (`schema.sql:30`). The hardening migration dropped the btree geo index (`2026-05-23_data_layer_hardening.sql:140-142`) with the note that a future bounded-box fetch "should come back as a GIST index on a geography column (separate proposal — needs PostGIS)" (:27-31). Drift footnote: `schema.sql:78` still declares `flags_geo_idx(lat,lng)` — fresh-applies and the live DB can disagree here; O1's artifact settles it.
- **Pending owners on this surface (not this fork):** R2 **T7** fixes the false-frame arrival (bounds-fit over already-fetched rows + the undetermined-voice line) and explicitly fences itself: *"it must not introduce proximity querying or cross Fork 1's DECISION half"* (`r2-audit/2026-07-10_AccessMap_R2_Design_Review.md:351`); **T9** adds the pill's honest failure arm. **This brief frames every option post-T7/T9.**

### F1 · Options

#### F1-O0 · DO-NOTHING — ratify the honest global feed (the shipped design)

The real case for it: **at today's data volume the global feed IS the complete dataset.** While total flags fit inside the loaded pages, the map shows everything that exists, the pill is exactly true, and proximity scoping would add zero recall. Post-T7 the arrival frame becomes true as well (viewport fits the loaded rows instead of hardcoded SF). Zero backend work, zero new privacy surface — location keeps never leaving the device.

- **Product value:** full — *until* the dataset outgrows a page window. Then distant-but-recent crowds out near-but-old and the mission's failure mode activates silently (L3-2's stakes line). O0's honest weakness: **it has no tripwire** — nothing tells Sky when "showing everything" stops being true.
- **Trust:** honest today by construction; degrades invisibly with growth.
- **Privacy:** best-in-class (nothing sent). **Abuse:** unchanged. **Schema cost:** none. **Effort:** 0.
- **What it forecloses:** nothing — O1/O2 stay open. **DEFAULT_REGION disposition:** post-T7 the SF constant survives only as the empty/singleton fallback frame; swapping it to Kelowna (the app's real market — *"For a Canadian app with flags in Kelowna, the SF default makes the wrongness maximal,"* R1 report :85) is an **S-tier standalone** worth doing under ANY option.
- **If chosen:** adopt the tripwire signal below (§F1 · Missing signal) so O0 is a monitored decision, not a forgotten one.

#### F1-O1 · Viewport-scoped fetch, no PostGIS — the bounded-box half of canon (A)  ⭐ the strategist's build pick

The map fetches what the camera sees: the visible region, **snapped outward to a coarse tile grid** (~0.05° ≈ a 4–5 km cell), sent as a bbox via supabase-js `.gte/.lte` on `lat`/`lng`, still `created_at desc` + limit within the box; re-fetch on settled region change (debounced, event-driven — no watchers, PROTECT-6).

- **Fetch-mode duality (the design's core):** `located → viewport mode; unlocated → today's global-recent mode`. A no-location user keeps the complete honest global feed + T7's bounds-fit; a located user gets a literally-true viewport. Nobody loses data; "nearby" language returns **only where it's true**.
- **Product value:** FIND becomes real for the moving map; bandwidth drops (fetch a neighborhood, not the world); scales past the page-window ceiling; unlocks honest local density.
- **Trust:** the pill's numbers become spatial truth. The one new honesty duty: a dense tile that hits its limit must say so (arm spec'd below) or pin-absence-inside-the-box returns.
- **★ Privacy (the first location-shaped byte to leave the device):** what the server sees is a **quantized tile**, not a precise viewport — city-block-scale at minimum zoom-out, never a doorstep. Nothing is stored (the bbox lives in a WHERE clause); it appears in Supabase's API/Postgres logs for their retention window — say that honestly. Mitigations built into the spec: tile-size floor (never send a bbox smaller than one tile), **no location-derived keys ever written to the on-device cache** (offline cache stays global-page-only — preserves Jordan Condition 4's shape), guests stay on the same anon key as today (no new linkage). Fork 4's k-anonymity posture is the natural home for ratifying the tile size.
- **★ Abuse:** no new surface — flags are already fully enumerable by anyone via the global fetch; a bbox parameter narrows what one call returns. (The docblock at main:600-604 claiming "only authenticated users can read rows" is stale — the anon SELECT policy shipped 2026-05-29; noted for the record, no action here.)
- **Data/schema cost:** ONE trivial migration — re-create `flags_geo_idx` btree `(lat,lng)` with an honest rationale comment. (Correcting the hardening note's overbroad claim: a btree on `(lat,lng)` cannot serve *radius* queries, but it serves exactly this lat-range + lng-filter bbox shape; GIST/PostGIS is only needed for O2's semantics. At current row counts even a seqscan is fine — the index is cheap insurance, and applying it closes the `schema.sql:78`-vs-hardening drift.)
- **Effort:** **M** (flagsStore mode duality + tile util + MapScreen wiring + pill arms + tests; migration is minutes). **What it forecloses:** nothing — O2 layers cleanly on top later (same tile cache, richer query). **DEFAULT_REGION disposition:** unlocated users never enter viewport mode, so the SF/Kelowna fallback question is unchanged from O0 (swap to Kelowna anyway).

#### F1-O2 · Full PostGIS — geography column + GIST + `ST_DWithin` RPC

True server-side distance semantics: radius queries, distance-ordered results ("nearest 20 regardless of box"), and the foundation for server clustering/heatmaps.

- **Product value:** what O1 can't do — *distance-sorted* lists at scale (the Nearby modal's client haversine is only correct while the loaded set is complete; once fetches are partial, "nearest" needs the server). Not needed until that's a product requirement.
- **Trust:** same as O1. **★ Privacy:** slightly worse minimization than O1 — a center-point + radius is sharper than a tile; the artifact mitigates by rounding the center client-side to 3 decimals (~110 m) and flooring the radius at 1 km.
- **Data/schema cost:** the full bundle (extension into the `extensions` schema, nullable `geography(Point,4326)` column + sync trigger, backfill, GIST index, SECURITY **INVOKER** read RPC riding the anon SELECT policy, grants, rollback that never drops the extension). **Effort:** **L**. **Forecloses:** nothing, but it's weight the app carries forever.
- **Rejected middle path, named:** `cube`/`earthdistance` (radius without PostGIS) — it's still an extension add, without PostGIS's ecosystem; the house's own hardening note already points at PostGIS as the destination. If an extension is being added at all, add the right one.

### F1 · Recommendation (a position, not a decision — Sky decides)

**Ratify O0 today — with the tripwire — and pre-commit to O1-quantized as the build the moment FIND matters or the tripwire fires.** The dataset currently fits the loaded window, so the honest global feed isn't a compromise, it's *complete*; spending M-effort now buys recall the data can't use yet. What O0 lacks is a bell — adopt the missing-signal query below (60 seconds in the SQL editor, run occasionally) and the decision becomes monitored instead of forgotten. Build O1 when (a) total flags outgrow ~2–3 page loads, (b) Sky wants the word "nearby" back in the UI, or (c) a second metro appears in the data. O2 is a scale instrument — defer until distance-sorted server queries are a product need. **Do the Kelowna `DEFAULT_REGION`/`FALLBACK_PEEK_REGION` swap now regardless (S-tier, rides T7 cleanly).**

**Constrains other forks:** choosing O1/O2 later makes Fork 5's trust signals *locally* legible and locally brigade-able (interaction thread 3); the tile size belongs to Fork 4's k-anonymity posture; a locate-first arrival variant would touch Fork 3's guest contract — the fetch-mode duality deliberately avoids needing it.

### F1 · Build-ready spec — O1 (viewport fetch, quantized)

**UI/store half (no migration required to merge — see degradation row):**
- `src/lib/geoTile.ts` (new): `snapRegionToTileBbox(region, TILE_DEG = 0.05)` → `{south, west, north, east}` snapped outward to the grid; export `TILE_DEG` for tests. Document the antimeridian non-case (single-region app) in one comment.
- `src/lib/flags.ts`: `listFlagsPage` gains optional `bbox?: {south,west,north,east}` → chains `.gte('lat', south).lte('lat', north).gte('lng', west).lte('lng', east)`. Column list unchanged (privacy docblock pattern preserved).
- `src/lib/flagsStore.tsx`: fetch-mode duality — `mode: 'global' | 'viewport'`; viewport mode only when a bbox is registered (MapScreen registers via the existing D4-style callback-ref pattern, flagsStore main:495+); cache key extends `statuses` → `statuses + tileKey`; **the AsyncStorage offline cache stays global-mode-only** (never persist location-derived keys — Jordan posture); SWR paint logic untouched for global mode. D4 realtime unchanged (client geofence already filters out-of-view events).
- `src/screens/MapScreen.tsx`: on settled region change (existing `currentRegionRef` plumbing, main:508+), debounce ~500 ms → if snapped bbox changed, re-fetch. No intervals, no `watchPositionAsync` (PROTECT-6); overlay `pointerEvents="box-none"` law untouched; no PlatformMap internals touched (PROTECT-14).
- **Pill arms in viewport mode** (extends T9's recipe, em-dash grammar PROTECT-19; all strings PROPOSED — SKY-EDITABLE): settled → `Showing N flags in view` · tile at cap → `Showing the newest N here — zoom in to see all` · unlocated/global mode → today's `Showing N flags` unchanged · loading/updating/filtered/failure arms untouched (S11 + T9 own them).
- **SR/RM:** the pill is already the polite live region — the new arms ride it; no new announce path, no new motion (data-only change), nothing for the RM net to gate.
- **Pre-migration degradation:** none functional — the bbox query works without the index (slower at scale, never broken). UI half merges before Sky applies the artifact.
- **Guard tests:** `src/lib/__tests__/geoTile.test.ts` (snap math: containment, outward growth, stability within a tile) · `src/lib/__tests__/flags.viewportQuery.test.ts` (bbox → the four range filters; no bbox → byte-identical legacy query) · `src/screens/__tests__/MapScreen.viewportFetch.test.ts` (unlocated stays global; pan across a tile boundary triggers exactly one debounced re-fetch; pill exact-string matrix incl. cap arm; live-region assertion; grep guard: zero new `setInterval`/`watchPositionAsync`).
- **PROTECT held:** 1 (Nearby modal content untouched — in viewport mode its input set is the in-view rows, copy already location-gated per S4/L3-8), 6, 10 (distances still never fabricated), 14, 19, 20; T7's bounds-fit consumes whatever rows the store holds — unchanged contract.

**Data half — Sky-applied artifact.** Save as `supabase/migrations/2026-07-16_fork1_viewport_bbox_index_PROPOSED.sql`; apply via Dashboard → SQL Editor → paste → Run:

```sql
-- ============================================================================
-- FILE:    2026-07-16_fork1_viewport_bbox_index_PROPOSED.sql
-- FEATURE: Fork 1 / O1 — viewport (bounded-box) flag fetch support
-- STATUS:  PROPOSED — *** NOT YET APPLIED — SKY APPLIES, NEVER AUTO-RUN ***
--
-- WHAT: re-creates the btree index on (lat, lng) to serve the new bbox
--       fetch (lat range as the index condition, lng filtered in-index).
-- WHY:  2026-05-23_data_layer_hardening.sql dropped flags_geo_idx as "pure
--       write overhead" while no bounded-box query existed. That query now
--       ships. (The old note's "would need GIST" applies to RADIUS/KNN
--       queries — Fork 1/O2 — not to this bbox shape.) This also settles the
--       schema.sql:78-vs-hardening drift in schema.sql's favor.
-- COST: ~1s on a small table. At current row counts the planner may ignore
--       it (seqscan is fine) — it is cheap insurance for growth.
-- ============================================================================
create index if not exists flags_geo_idx
  on public.flags (lat, lng);

-- ROLLBACK:
--   drop index if exists flags_geo_idx;
```

### F1 · Build-ready spec — O2 (PostGIS), banked for the later scale call

Client half: `listFlagsNearby(center, radiusM, statuses)` calling the RPC below; **missing-RPC degradation** (house law, mirror `requestFlagReopen` flags.ts main:964+ / bench:1043+): PGRST202/42883 → fall back to the global fetch, log once. Center rounded to 3 decimals client-side before sending; radius floored at 1 km (privacy minimization lives in the client too, not just the artifact). Save as `supabase/migrations/2026-07-16_fork1_postgis_nearby_PROPOSED.sql`:

```sql
-- ============================================================================
-- FILE:    2026-07-16_fork1_postgis_nearby_PROPOSED.sql
-- FEATURE: Fork 1 / O2 — PostGIS radius query ("nearest N", server-side)
-- STATUS:  PROPOSED — *** NOT YET APPLIED — SKY APPLIES, NEVER AUTO-RUN ***
--
-- PRIVACY NOTE (Fork 1 brief, 2026-07-16): the client sends a center point
--   + radius. Minimization: client rounds the center to 3 decimals (~110 m)
--   and floors radius at 1 km. Nothing is stored server-side; the parameters
--   transit Supabase's API/Postgres logs for their retention window only.
--   No user identity is attached beyond the same anon/authed key the global
--   fetch already uses (Jordan no-linkage posture preserved).
--
-- ORDER MATTERS. Apply top to bottom in one run.
-- ============================================================================

-- 1. Extension — into the extensions schema (Supabase advisor-clean).
create extension if not exists postgis with schema extensions;

-- 2. Geography column (nullable; synced by trigger, not GENERATED — house
--    trigger style, and GENERATED would need fully-qualified st_* at DDL).
alter table public.flags
  add column if not exists geog extensions.geography(point, 4326);

-- 3. Sync trigger — keeps geog true to lat/lng on insert and coordinate edit.
create or replace function public.sync_flag_geog()
  returns trigger
  language plpgsql
  security definer
  set search_path = public, extensions
as $$
begin
  new.geog := extensions.st_setsrid(
    extensions.st_makepoint(new.lng, new.lat), 4326)::extensions.geography;
  return new;
end;
$$;
revoke execute on function public.sync_flag_geog() from public, anon, authenticated;

drop trigger if exists on_flag_geog_sync on public.flags;
create trigger on_flag_geog_sync
  before insert or update of lat, lng on public.flags
  for each row execute function public.sync_flag_geog();

-- 4. Backfill (safe: lat/lng are range-CHECK-constrained since 2026-05-29).
update public.flags
  set geog = extensions.st_setsrid(
    extensions.st_makepoint(lng, lat), 4326)::extensions.geography
  where geog is null;

-- 5. Spatial index.
create index if not exists flags_geog_gist_idx
  on public.flags using gist (geog);

-- 6. Read RPC — SECURITY INVOKER (a proximity READ must ride the existing
--    RLS posture: the "flags readable by anon" SELECT policy governs).
create or replace function public.nearby_flags(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer default 5000,
  p_statuses text[] default array['open','verified'],
  p_limit integer default 100
)
  returns setof public.flags
  language sql
  stable
  security invoker
  set search_path = public, extensions
as $$
  select f.*
  from public.flags f
  where f.status = any(p_statuses)
    and f.geog is not null
    and extensions.st_dwithin(
          f.geog,
          extensions.st_setsrid(
            extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
          greatest(p_radius_m, 1000))
  order by f.geog <-> extensions.st_setsrid(
            extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
  limit least(p_limit, 200);
$$;
revoke execute on function public.nearby_flags(
  double precision, double precision, integer, text[], integer)
  from public;
grant execute on function public.nearby_flags(
  double precision, double precision, integer, text[], integer)
  to anon, authenticated;

comment on function public.nearby_flags(
  double precision, double precision, integer, text[], integer) is
  'Fork 1/O2: distance-ordered flags within a radius. SECURITY INVOKER - RLS
   governs. Client rounds center to ~110m and floors radius at 1km.';

-- ROLLBACK (in order; NEVER drop the postgis extension — CASCADE would eat
-- unrelated future dependents silently; leave it installed, unused):
--   drop function if exists public.nearby_flags(
--     double precision, double precision, integer, text[], integer);
--   drop index if exists flags_geog_gist_idx;
--   drop trigger if exists on_flag_geog_sync on public.flags;
--   drop function if exists public.sync_flag_geog();
--   alter table public.flags drop column if exists geog;
```

### F1 · Missing signal (no analytics invented — run this instead)

There is no usage data on where flags actually live or how big the dataset is relative to the page window. One read-only SQL-editor query answers both (the O0 tripwire):

```sql
-- Fork 1 tripwire: is the global feed still "everything"? Where is the data?
select
  count(*)                                   as total_flags,
  count(*) filter (where status in ('open','verified')) as feed_flags,
  (count(*) filter (where status in ('open','verified'))) > 50  as beyond_first_paint,
  (count(*) filter (where status in ('open','verified'))) > 150 as beyond_casual_scroll,
  min(lat) as south, max(lat) as north, min(lng) as west, max(lng) as east,
  count(*) filter (where lat between 49.7 and 50.1
               and lng between -119.7 and -119.3) as in_kelowna_box
from public.flags;
```

`beyond_casual_scroll = true`, or a second metro outside the Kelowna box → the O0 ratification has expired; build O1.

### F1 · The single question for Sky

**"Ratify the honest global feed with the tripwire (O0), or build the viewport fetch now (O1, M effort + one index migration)?"** — with the Kelowna default-region swap recommended immediately under either answer, and O2 explicitly deferred to a future scale trigger.

---

## BRIEF 2 — Fork 5 · Trust-model scope (verifier count + guest "flag as wrong")

*Authored: Fable 5 (max effort) · 2026-07-16 · read-only · cites re-verified this session*

### F5 · The decision in one line

Two halves, separable: does the trust ledger grow a **verifier COUNT** display (which secretly requires a new, repeatable attestation write to mean anything), and does anyone get an in-place **"flag as wrong" counter-affordance** — and if so, signed-in users only, or guests?

### F5 · Why it was parked — the audit's own framing

The Round-1 fork canon (`design-reviews/fable-audit/partials/slate-integration.md:117-121`):

> **Fork 5 — Trust-model scope** *(behind S3 · L8-2, L8-3 HIGH)*
> "Verified" is never defined at a decision point, never shows a verifier count, and the built ledger (`flag_verifications`, `flag_status_history`, `StatusHistoryModal`) is unreachable from the map. Untrusted content ("BUMBAKLOT · verified · sev 5") wears full institutional confidence with no in-place counter-affordance.
> - **(A) Expose the ledger fully** — S3 surfaces the receipt **and** a verifier COUNT rides the callout, **and** guests can flag-content-as-wrong. *Win:* maximal provenance + moderation reach; *cost:* a guest-write surface + count semantics to design.
> - **(B) Expose the receipt only** — S3 surfaces the status *history* (already shipped) with **no raw count** and **no guest counter-affordance**. *Win:* the ledger becomes reachable with zero new write surface.
> - *S3 scopes only the read side (B by default); the count and the guest-flag-content write side are this fork.*

P3 built exactly (B)'s read side and re-parked the rest (`uplift-assets/P3-verification-evidence.md:56-60`): *"FORK 5 — the write/count half left for Sky (NOT built) — ❌ a verifier COUNT display on the callout ('Verified by N people') — ❌ a guest 'flag as wrong' write affordance. S3 shipped only the read side… Both halves above are Sky's product/data decision."* The read-only scope is even guard-tested: *"FORK-5 read-only (no 'Verified by', no 'flag as wrong')"* (:43).

### F5 · Shipped state today (verified)

- **The read side is live** (P3, `b584747`): the callout carries the freshness line `Reported {relativeTime(f.created_at)}` — commented *"the read-half of the trust ledger"* — and the `Open details ›` affordance (native `PlatformMap.tsx main:319-346`; web renders an `Open details` button in Wayfinder Blue, `PlatformMap.web.tsx main:470-490`) into `FlagDetailModal`, from which `StatusHistoryModal` (the status-change log) is reachable (main:1470).
- **Verification is a one-way status flip, not a tally.** `canVerify = status === 'open'` (`FlagDetailModal.tsx main:351`); the write is `updateFlagStatus` → `.update({ status })` with a compare-and-set guard (`flags.ts main:925-952`). Nothing writes `flag_verifications` — **the table is dead**: it exists in the DB (`trust_score_system.sql:49-56`, `UNIQUE(flag_id, verifier_id)`, `weight` default 1.0) and in the types (`database.ts:231-248`, *"Optional until … trust_score_system.sql is applied"*, `Update: Record<string, never>` — no update path), but zero client code reads or writes it. **A displayed count today would be 0 everywhere.** Even deriving from `point_events` yields at most one `flag_verified_actor` row per resolution cycle — a status-flip echo, not community weight.
- **Its RLS carries the Fork-2 NULL trap.** The INSERT policy's WITH CHECK includes `verifier_id <> (SELECT user_id FROM public.flags WHERE id = flag_id)` (`trust_score_system.sql:69-76`) — SQL-NULL when the flag is anonymous (`user_id IS NULL`), and a non-TRUE check **rejects the row**. So even with UI, authenticated users could never attest *anon* flags — the reports that most need community confirmation. Any activation artifact must ship `IS DISTINCT FROM` (interaction thread 2).
- **The counter-affordance landscape is lopsided.** Signed-in users already hold the *heavy* verb: any authenticated user can **Reject** an open/verified flag (`canReject`, `FlagDetailModal.tsx main:352-353`; RLS "status update by any authenticated"; confirm-gated in Tasks). Guests — the web build's *entire* signed-out audience plus native "browse without account" (`App.tsx:110-150`) — hold **nothing**: anon RLS is SELECT + photo-less INSERT only. L8-3's gap is real, and it is a *guest* gap.
- **The house has already ruled on two adjacent questions.** (1) *Public verifier exposure:* the Leaderboard deliberately starves its own `verifiedCount` display — *"W6-1: pass verifiedCount=0 — exposing verifier activity publicly would let users single out moderators"* (`LeaderboardScreen.tsx main:255-263`). (2) *Anonymous write throttling:* the 5/day anon limit is client-side AsyncStorage (`anonRateLimit.ts:3-5`) and F10's own OPEN QUESTIONS call that class of dedup *"soft enforcement only — a determined user could clear storage and vote again"*, parking server-side hardening as future work (`flag_reopen_requests.sql:199-208`).
- **The count's landing surface has an open CRITICAL.** R2's sole CRIT, **F2-01**, is the callout compositing *under* the map chrome — "the S3 trust doorway, the signature text itself occluded" (`r2-audit/02_feel_findings.md:72,:171-173`); its fix is R2 slate **T1** ("★ DO-FIRST", NEEDS-SKY-DEVICE; R2 report :212). New callout content sequences **after T1 lands**.
- Footnote: `docs/TRUST_SCORE_SPEC.md`, which the trust migration's header cites as the table's rationale doc, **does not exist in the repo** — this brief is the de-facto spec for what `flag_verifications` is for.

### F5 · Options — count half

#### F5-C0 · DO-NOTHING on the count (half of canon (B), the shipped design)

The case is unusually strong right now: **(1) there is nothing to count** — the table is empty and the status model produces no tally; a UI count would read "Verified by 0/1" everywhere, which is *anti*-trust. **(2)** At today's community size, "Confirmed by 1 person" per flag effectively names the one moderator — the exact exposure W6-1 refused. **(3)** The receipt already shipped: status badge + freshness + reachable history is real provenance. **(4)** The landing surface has an open CRITICAL (F2-01). Cost: "verified" keeps meaning *one stranger pressed a button once* — institutional confidence without community weight (L8-2's point, unresolved). Effort 0 · forecloses nothing.

#### F5-C1 · The real count — activate attestations ("Still accurate?") + a thresholded badge

Name the hidden feature honestly: a meaningful count requires a **new, repeatable, identity-deduped write** — authenticated users confirming a flag is still accurate. `flag_verifications` was built for exactly this and is waiting.

- **Product value:** "Verified" gains community weight and a decay answer (fresh confirmations vs a stale one-time flip). The badge is the visible half; the *accumulating ledger* is the real asset (future trust-score, staleness detection).
- **Trust:** strong positive **if displayed qualitatively** — `Confirmed by N people` only at N≥2; below that, show nothing new (avoids the "by 1" anti-signal and the W6-1 single-out). Raw always-on numbers are the wrong register for this community size.
- **★ Privacy — the honest tension:** `flag_verifications` stores `verifier_id ↔ flag_id` — a user↔location trail. Jordan's F10 hard-condition refused precisely this shape for reopen votes (*"no user_id stored for reopen votes, ever"* — pattern-of-life inference). The counter-argument: **the linkage class already exists** — every verify/resolve writes `point_events(user_id, …, flag_id)` — so attestations increase its *density*, not its *kind*, and attesting (like verifying) is an accountable act, not a vote. The alternative shape — an F10-style aggregate counter with no rows — cannot dedup server-side (`UNIQUE` needs identity) and makes the count storage-clear gameable. **Position: rows, with a Jordan review gate before the artifact is applied** (this is a privacy-sensitive change class; surfacing first is the constitutional path).
- **★ Abuse:** low by construction — authenticated-only, `UNIQUE(flag_id, verifier_id)`, **zero points awarded** (deliberate: Sky's own 2026-06-18 leaderboard ruling excluded `flag_*_actor` points as "the rubber-stamp-grind risk" — attestations must not create a new grind surface).
- **Data/schema cost:** one artifact, four moves (below) — policy fix (NULL trap + status guard), retraction policy, clear-on-reopen trigger, definer count RPC. **Effort: M** (+ device gate rides T1's).
- **What it forecloses:** the no-linkage aggregate variant (named above, rejected with reasons); nothing else — `weight` stays 1.0 as the future trust-score hook.
- **Rejected lite variant, named:** deriving a count from `point_events` via a definer RPC — the data is ≤1 per cycle and conflates status-flips with community confirmation; it would ship a number that can't grow. No.

### F5 · Options — write half (the counter-affordance)

#### F5-W0 · DO-NOTHING (the other half of canon (B))

Signed-in users keep the heavy verb (Reject, confirm-gated); guests keep none. Honest reading: the L8-3 gap **persists for the majority cohort**, but every mitigation of it opens a write surface the infrastructure can't yet police. While the community is tiny and Fork 3 (the guest contract) is unsettled, W0 is coherent, not negligent. Effort 0 · forecloses nothing.

#### F5-W1 · Dispute counter — authenticated writes, guest-visible affordance

A light "Flag as wrong" that **signals doubt without flipping status** — filling the gap between *nothing* and *unilateral Reject*. Guests see the affordance; pressing it routes them to sign-in (the S15/S19 copy register). Data shape = an F10 clone: aggregate counter on `flags`, SECURITY DEFINER RPC, **no user_id stored — ever** (Jordan's hard-condition honored verbatim), client-side per-cycle dedup (the F10 Q2 trade, accepted for authenticated users where account friction bounds abuse).

- **Product value:** de-escalation — today the only pushback on a wrong flag is a status-flip by one stranger; a dispute tally is community signal without moderation power. At threshold (≥2) the flag wears a `Disputed` treatment — additive, not a status change.
- **Trust:** honest counter-weight to "verified" confidence; the redundancy risk is real and must be handled in copy — **Reject** = "remove this" (moderation), **Flag as wrong** = "I doubt this" (signal). Never adjacent in the same visual register.
- **★ Abuse:** bounded by account friction (server-side identity exists even though the counter stores none); dedup is soft (F10 Q2) — acceptable at this scale for the same reason F10 accepted it.
- **Cost/effort:** one artifact + one UI pass. **M.** **Forecloses:** nothing; W2 is a one-line grant away *if* its preconditions are ever met.

#### F5-W2 · Guest/anon dispute write — canon (A)'s full version

The case *for* is real: guests are the biggest cohort and the ones with zero verbs, and untrusted content wears full confidence precisely in front of them. The case *against* is currently decisive:

- **★ Abuse (the headline):** this would be the **first anonymous write since flag-insert**, and there is **no server-side anon throttle anywhere** — the 5/day precedent is device-local AsyncStorage; the DB rate trigger counts `auth.uid()` only, so anon is uncounted. An anon dispute counter is a free **censorship lever**: storage-clear (or curl on the public anon key) → push any legitimate barrier report to "Disputed". On a civic disability-data app, brigading legitimate reports is a mission-inverting failure.
- **Mitigations, honestly priced:** per-IP hashing inside the RPC collides with Jordan's no-linkage hard-condition unless hashed+expiring (exactly the "server-side bloom filter or hashed token scheme" F10 Q2 parked as *future hardening*); a global/per-flag cap is an exhaustible lever an attacker can spend to lock out legitimate doubt; real throttling means an edge function/Turnstile — new infrastructure, **L**.
- **Dependency:** Fork 3 hasn't settled what guests *are* on this product. A guest write before a guest contract is scope inversion.
- **Verdict inside the option set:** not now; preconditions are named in the W1 artifact so this stays a deliberate future step, not a forgotten one.

### F5 · Recommendation (a position, not a decision — Sky decides)

**Ratify canon (B) — the shipped read-only ledger — on both halves today, with the two builds banked behind named triggers.** The count half (C1) becomes right when three things are true: **T1 has landed** (the callout is un-occluded), **Sky wants the attestation mechanic itself** (the count is its display, not the feature), and **Jordan has reviewed the linkage question**. The write half should be decided **in the same sitting as Fork 2** (interaction thread 1 — they are one "what can anonymous hands do" posture): when the community grows enough that unilateral Reject feels dangerous, build **W1** (auth-gated, guest-visible); **W2 stays parked** behind Fork 3 + real server-side throttling. This is not a both-sides dodge: the shipped state is the *correct* state for a ~zero-attestation, pre-Fork-3, occluded-callout present — and both specs below are build-ready the day the triggers fire.

**Constrains other forks:** W1/W2 chosen ⇒ Fork 2's OA farming cap becomes more urgent (two anon-adjacent mechanics compound); Fork 1's geo scope later makes both the badge and the dispute tally locally legible/brigade-able (thread 3); C1's row-linkage decision sets precedent for any future per-user trust data.

### F5 · Build-ready spec — C1 (attestation + thresholded badge)

**UI half (mergeable before the migration — degradation row below):**
- **FlagDetailModal** (`src/components/FlagDetailModal.tsx`): a "Community confirmations" row in the meta section (below Status, above Date): at `n≥2` render `Confirmed by {n} people` (PROPOSED — SKY-EDITABLE); at `n<2` render nothing. Affordance: a secondary-tier button `Still accurate? Confirm` visible when `status === 'verified' && signedIn && !isOwn && !attestedByMe`; after success the row updates and the app announces `Confirmation recorded — thanks` (em-dash grammar, PROTECT-19) via `AccessibilityInfo.announceForAccessibility` (native) / the `announce.ts` shim (web, PROTECT-26). If `attestedByMe`: the same row offers `Undo your confirmation` (retraction). **Verb discipline (copy register):** "Verify" = the status flip; "Confirm still accurate" = attestation — the two never share a label, hint, or row.
- **Callout — only after T1:** one plain line under the freshness line, `Confirmed by {n} people` at n≥2, in **both** platform files (`PlatformMap.tsx` + `PlatformMap.web.tsx` — CLAUDE.md gotcha 3; the web popup is unthemed white chrome, plain text).
- **RM:** no new motion (text swap). If a count-change pulse is ever wanted it rides `motion.pulse` + the 220 ms gate and extends the RM guard net (PROTECT-22) — not in this scope.
- **Pre-migration degradation (house law):** probe the count RPC once (PGRST202/42883 → capability `unavailable`, mirror the `contextTagsCapability` pattern, `flags.ts main:704-733`); when unavailable, the row and the affordance render nothing. The UI half merges safely before Sky applies SQL.
- **Data access in client:** `src/lib/verifications.ts` (new): `attestFlag(flagId)` (`.insert()`, treat `23505` as already-attested), `retractAttestation(flagId)` (delete own), `haveIAttested(flagId)` (the existing self-only SELECT is exactly this query), `flagConfirmationCounts(flagIds)` (the RPC, batched).
- **Guard tests:** `src/lib/__tests__/verifications.test.ts` (insert / 23505-as-success / delete-own / RPC parse / missing-RPC degradation) · a FlagDetailModal attest test beside the modal's existing tests (badge threshold matrix: n=0,1 → absent; n=2 → exact string; announce fired; verb-discipline grep guard: "Still accurate" never appears on the Verify action and vice versa).
- **PROTECT held:** 1 (Nearby untouched) · 3 · 8 (no points attached — see artifact) · 12 · 18/19/25/26 · the P3 map-sync law (*always `patchFlag`, never `removeFlag`* — P3 evidence :40) · box-none overlay law · T1 sequencing.

**Data half — Sky-applied artifact.** Save as `supabase/migrations/2026-07-16_fork5_attestation_activation_PROPOSED.sql`:

```sql
-- ============================================================================
-- FILE:    2026-07-16_fork5_attestation_activation_PROPOSED.sql
-- FEATURE: Fork 5 / C1 — activate flag_verifications as an attestation ledger
-- STATUS:  PROPOSED — *** NOT YET APPLIED — SKY APPLIES, NEVER AUTO-RUN ***
--
-- PRIVACY NOTE (Fork 5 brief, 2026-07-16 — JORDAN REVIEW GATE):
--   This table stores verifier_id <-> flag_id rows: a user<->location linkage.
--   F10's reopen counter refused that shape for votes (Jordan hard-condition).
--   The distinction relied on here: attestation is an accountable ACT (like
--   verify/resolve, which already write user_id+flag_id to point_events),
--   not a vote; rows are what make server-side dedup (UNIQUE) possible.
--   DO NOT APPLY until Jordan/Sky has reviewed and accepted that distinction.
--   Awards NO points (no new grind surface — Sky's 2026-06-18 leaderboard
--   ruling deliberately excluded actor-point farming).
--
-- WHAT (in order):
--   1. Fix the INSERT policy's SQL-NULL trap so anon-reported flags are
--      attestable (IS DISTINCT FROM — same bug family as Fork 2), and gate
--      attestation to live statuses.
--   2. Add a DELETE-own policy (retraction).
--   3. Clear attestations when a resolved flag reopens (a new resolution
--      cycle voids old "still accurate" claims — mirrors F10's reset law).
--   4. Add the definer count RPC: the SELECT policy is deliberately
--      self-only, so a normal client can never aggregate others' rows —
--      same argument, verbatim, as list_monthly_leaderboard (2026-06-18):
--      definer reads the table, returns ONLY aggregates.
-- ============================================================================

-- 1. INSERT policy — null-safe, status-gated.
drop policy if exists "flag_verifications own insert" on public.flag_verifications;
create policy "flag_verifications own insert"
  on public.flag_verifications for insert
  to authenticated
  with check (
    (select auth.uid()) = verifier_id
    and verifier_id is distinct from
        (select user_id from public.flags where id = flag_id)
    and exists (
      select 1 from public.flags f
      where f.id = flag_id and f.status in ('open', 'verified')
    )
  );

-- 2. Retraction — delete your own attestation only.
drop policy if exists "flag_verifications delete own" on public.flag_verifications;
create policy "flag_verifications delete own"
  on public.flag_verifications for delete
  to authenticated
  using ((select auth.uid()) = verifier_id);

-- 3. Reset on reopen (resolved -> open), mirroring handle_flag_reopen_reset.
create or replace function public.handle_flag_attestation_reset()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if old.status = 'resolved' and new.status = 'open' then
    delete from public.flag_verifications where flag_id = new.id;
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_flag_attestation_reset()
  from public, anon, authenticated;

drop trigger if exists on_flag_attestation_reset on public.flags;
create trigger on_flag_attestation_reset
  after update of status on public.flags
  for each row execute function public.handle_flag_attestation_reset();

-- 4. Count RPC — aggregates only; callable by guests (they see callouts).
create or replace function public.flag_verification_counts(p_flag_ids uuid[])
  returns table (flag_id uuid, confirmations bigint)
  language sql
  stable
  security definer
  set search_path = public
as $$
  select fv.flag_id, count(*)::bigint as confirmations
  from public.flag_verifications fv
  where fv.flag_id = any (p_flag_ids[1:200])   -- clamp batch size
  group by fv.flag_id;
$$;
revoke all on function public.flag_verification_counts(uuid[]) from public;
grant execute on function public.flag_verification_counts(uuid[])
  to anon, authenticated;

comment on function public.flag_verification_counts(uuid[]) is
  'Fork 5/C1: attestation counts per flag. SECURITY DEFINER because the
   SELECT policy is self-only; returns aggregates only - never verifier ids,
   weights, or timestamps (W6-1 posture: no public verifier exposure).';

-- ROLLBACK (in order):
--   drop function if exists public.flag_verification_counts(uuid[]);
--   drop trigger if exists on_flag_attestation_reset on public.flags;
--   drop function if exists public.handle_flag_attestation_reset();
--   drop policy if exists "flag_verifications delete own"
--     on public.flag_verifications;
--   drop policy if exists "flag_verifications own insert"
--     on public.flag_verifications;
--   create policy "flag_verifications own insert"        -- restore original
--     on public.flag_verifications for insert
--     to authenticated
--     with check (
--       (select auth.uid()) = verifier_id
--       and verifier_id <> (select user_id from public.flags where id = flag_id)
--     );
```

### F5 · Build-ready spec — W1 (dispute counter, auth-gated, guest-visible)

**UI half:** FlagDetailModal action area gains a tertiary, *non-destructive-register* `Flag as wrong` (hint: `Signals doubt — doesn't change the report's status`; PROPOSED — SKY-EDITABLE). Signed-in press → `confirm()` (house destructive-confirm law does **not** apply — it's non-destructive; a plain confirm keeps mis-taps cheap) → RPC → announce `Doubt recorded — thanks for keeping the map honest` (em-dash grammar). Guest press → the sign-in route with a context line (S15/S19 register), never a dead button. At `dispute_requests ≥ 2`: a `Disputed` chip beside the status badge (detail modal; callout only post-T1) — **additive signal, never a status change**. Client-side per-cycle dedup: AsyncStorage `{flag_id, disputed_at}` vs `dispute_requests_reset_at` (the F10 Q2 pattern, same soft-enforcement caveat). Pre-migration: missing RPC → affordance hidden (the `requestFlagReopen` null pattern, `flags.ts main:958-975`). Guard tests: dispute RPC missing/present matrix · chip threshold exact-strings · guest routing · a grep guard that `Flag as wrong` never carries destructive styling tokens.

**Data half — Sky-applied artifact.** Save as `supabase/migrations/2026-07-16_fork5_dispute_counter_PROPOSED.sql`:

```sql
-- ============================================================================
-- FILE:    2026-07-16_fork5_dispute_counter_PROPOSED.sql
-- FEATURE: Fork 5 / W1 — "flag as wrong" dispute counter (authenticated)
-- STATUS:  PROPOSED — *** NOT YET APPLIED — SKY APPLIES, NEVER AUTO-RUN ***
--
-- PRIVACY NOTE: mirrors F10 (2026-05-30_flag_reopen_requests.sql) exactly —
--   a raw counter, NO user_id stored, ever (Jordan hard-condition; prevents
--   pattern-of-life inference). Dedup is client-side per cycle (F10 Q2's
--   accepted "soft enforcement" trade — bounded here by account friction,
--   since only authenticated may call the RPC).
--
-- W2 (guest/anon writes) IS DELIBERATELY NOT GRANTED. Preconditions before
-- anyone proposes `grant execute ... to anon`:
--   (a) Fork 3 (guest contract) decided; (b) a real server-side anon
--   throttle exists (edge function / Turnstile-class); (c) Jordan sign-off.
-- ============================================================================

alter table public.flags
  add column if not exists dispute_requests          integer     not null default 0,
  add column if not exists dispute_requests_reset_at timestamptz;

create or replace function public.increment_dispute_request(p_flag_id uuid)
  returns integer
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_new_count integer;
begin
  update public.flags
    set dispute_requests = dispute_requests + 1
    where id = p_flag_id
      and status in ('open', 'verified')   -- doubt targets live reports only
    returning dispute_requests into v_new_count;
  return coalesce(v_new_count, 0);
end;
$$;
revoke execute on function public.increment_dispute_request(uuid) from public, anon;
grant  execute on function public.increment_dispute_request(uuid) to authenticated;

-- Reset on ANY status change: a transition starts a new evidentiary cycle.
create or replace function public.handle_flag_dispute_reset()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.dispute_requests          := 0;
    new.dispute_requests_reset_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_flag_dispute_reset()
  from public, anon, authenticated;

drop trigger if exists on_flag_dispute_reset on public.flags;
create trigger on_flag_dispute_reset
  before update of status on public.flags
  for each row execute function public.handle_flag_dispute_reset();

comment on function public.increment_dispute_request(uuid) is
  'Fork 5/W1: doubt counter on live flags. SECURITY DEFINER; no user_id
   stored (Jordan). Authenticated-only; W2 anon grant is gated - see header.';

-- ROLLBACK (in order):
--   drop trigger if exists on_flag_dispute_reset on public.flags;
--   drop function if exists public.handle_flag_dispute_reset();
--   drop function if exists public.increment_dispute_request(uuid);
--   alter table public.flags
--     drop column if exists dispute_requests,
--     drop column if exists dispute_requests_reset_at;
```

### F5 · Missing signal (no analytics invented — run this instead)

Nothing is known about actual verification/rejection activity. One read-only query grounds all three claims this brief leans on (dead table · tiny verify volume · how often the heavy verb fires):

```sql
-- Fork 5 grounding: what does trust activity actually look like?
select
  (select count(*) from public.flag_verifications)                                        as attestation_rows,      -- expect 0
  (select count(*) from public.point_events where event_type = 'flag_verified_actor')     as verify_actor_events,
  (select count(*) from public.point_events where event_type = 'flag_resolved_actor')     as resolve_actor_events,
  (select count(*) from public.flags where status = 'rejected')                           as rejected_flags,
  (select count(*) from public.flags where user_id is null)                               as anon_flags,
  (select count(*) from public.flags)                                                     as total_flags;
```

### F5 · The single question for Sky

**"Ratify the read-only trust ledger (recommended), or activate a write half — and if so, which first: the attestation count (C1 — after T1 lands + Jordan review), or the dispute affordance (W1 auth-gated now vs W2 guest, which stays parked behind Fork 3 + real throttling)?"** Decide the write half together with Fork 2 (one anonymous-participation posture).

---

## BRIEF 3 — Fork 2 / B1 · Points-economy honesty (the anon-triage flash)

*Authored: Fable 5 (max effort) · 2026-07-16 · read-only · cites re-verified this session*

### F2 · The decision in one line

When a signed-in user triages an **anonymously-reported** flag, the UI flashes "+3/+7 points" that the database never awards — make the flash **true** (a one-line, Sky-applied trigger migration) or make it **silent** (client-side suppression)? Riding the same decision: **which point values are canon** — the live 10/3/15/7 or the documented 5/2/10/5 — because the doc-drift cleanup can't be written until that's ratified.

Scoping sentence (a common misreading, pre-empted): this fork is about signed-in actors triaging anonymous *content* — guests cannot triage at all (no anon UPDATE policy exists). Fork 5/W2 owns the "anonymous *actors*" question.

### F2 · Why it was parked — the audit's own framing

The Round-1 fork canon (`design-reviews/fable-audit/partials/slate-integration.md:99-103`):

> **Fork 2 — Points-economy honesty** *(behind bench B1 · L3-4 HIGH)*
> The actor-bonus trigger `auth.uid() <> NEW.user_id` is SQL-NULL (not TRUE) for anon flags, so triaging an anon report awards 0 while the UI flashes "+3/+7" (`schema.sql:163-165`, `TasksScreen.tsx:760`).
> - **(A) Fix the trigger** — one-line `IS DISTINCT FROM` **DB migration, Sky-applied, never auto-run**; the flash becomes true. *Also fold in:* correct the CLAUDE.md "Database" section, which still teaches the OLD 5/2/10/5 values while the live trigger + UI use 10/3/15/7 (`schema.sql:112` carries an unresolved "DECISION PENDING (Sky)") …
> - **(B) Suppress the UI** — promote B1's clean **S** flash-suppression (hide the actor-flash when `item.user_id === null`); leave the trigger. *Cost:* actors genuinely earn 0 on anon triage (arguably correct); *win:* no migration.
> - *Either way, resolve the CLAUDE.md doc drift* so a future edit can't regress the honesty chain.

The bench carried it to the end unbuilt — *"B1 … **FORK #2 — surfaced, never built** … Open for Sky"* (`bench-assets/BENCH-4-verification-evidence.md:105`) — and the slate called it *"Benched not for weakness but because it is fundamentally a data-honesty fork … **Highest-value bench entry**"* (`partials/slate-proposals.md:482`).

### F2 · Shipped state today (verified)

- **The lie, mechanically.** The actor branch (`supabase/migrations/2026-05-30_trust_score_system.sql:186-188`, mirrored `schema.sql:163-165`) requires `auth.uid() <> NEW.user_id`. For an anon flag `NEW.user_id IS NULL`, so the comparison is SQL-NULL — not TRUE — and the whole award is skipped: **0 points, no `point_events` row.** Meanwhile `applyStatusChange` (TasksScreen main:646-661) takes the `isOwn=false` branch (an anon flag can't be "own": `item.user_id === userId` is `null === uuid`, main:760) and both **flashes and SR-announces** `` `Verified! +${POINTS.actor.verify} points` `` / `` `Resolved! +${POINTS.actor.resolve} points` `` — the pill at main:1057-1078 (2200 ms, RM-gated spring at :447-459, `accessibilityLiveRegion="polite"` for TalkBack + `announceForAccessibility` per call site for VoiceOver). **The false claim is spoken to screen readers, not just drawn.**
- **The values drift is live in the law files.** The root `CLAUDE.md` "Database" section still teaches *"Reporter: +5 … +10 … Actor: +2 verified, +5 resolved"* while its own "Recent QA pass" section says the live trigger awards 10/15 + 3/7; `docs/DATABASE.md:75-77` teaches +5/+2, +10/+5; `schema.sql:112-113` carries *"DECISION PENDING (Sky): live awards 10/3/15/7; original schema.sql had 5/2/10/5. Trust the live catalog (this file now matches live as of 2026-06-07)"*; and `DECISIONS_LOG.md:61-62` holds the open entry — *"Dana recommends accepting the live 10/3/15/7 as canonical and updating the docs. **DECISION FOR SKY**."* The client is internally consistent: `POINTS` (`points.ts:11-18`) mirrors the live trigger and feeds every UI string (*"single source of truth … If the trigger ever changes, change it HERE"*).
- **No migration file exists.** The `IS DISTINCT FROM` fix is prose in the audits only; `supabase/migrations/` contains nothing for it. The artifact below is the first written version.
- **This trigger has bitten production twice** — the discipline below is earned, not ceremonial: (1) a duplicate trigger double-awarded points until 2026-06-03 (*"trigger_flag_status_change was dropped 2026-06-03 (duplicate trigger)"*, schema.sql:178-179); (2) the rejected branch referenced a then-nonexistent `users.is_admin`, erroring every reject/reopen on prod (*"Postgres doesn't short-circuit the AND"*, DECISIONS_LOG.md:58-60).
- **PROTECT-8** protects the client's `POINTS` single-source and names this exact defect the exception: *"L3-4 is a trigger-side exception, not a reason to fork it"* (`partials/protect-merged.md:15`) — i.e., the fix belongs on the trigger side (or in suppression), never in forked UI values.

### F2 · Options

#### F2-O0 · DO-NOTHING

Its fair case: zero effort; no user has reported it (unknowable without the signal below — the community is tiny); and if Sky is about to revisit point values anyway, any doc fix written first would churn. That is the whole case. Against it: this is the app whose signature is *honesty* — R1's audit thesis — and O0 preserves a knowingly false statement in the app's reward voice, **spoken to assistive tech**, on the mission's core loop. The audit rated the finding HIGH (L3-4); every month it stands, the doc drift (also unresolved under O0) invites the regression PROTECT-8 warns about. This is the one fork in this document where DO-NOTHING is genuinely weak.

#### F2-OA · Fix the trigger — `IS DISTINCT FROM` (one line), flash becomes true  ⭐ the strategist's pick

- **Product value:** the flash tells the truth, and **anon reports become equally rewarding to triage**. That's mission-aligned: anonymous flags are the reports whose credibility depends *entirely* on community triage (no accountable reporter), and today they're the *unrewarding* corner of the queue.
- **Trust:** the reward voice becomes exactly true; the honesty chain (trigger → `point_events` → `POINTS` → flash → SR announce) closes end-to-end.
- **★ Abuse, honestly priced:** `IS DISTINCT FROM` cannot distinguish "a different person" from "the reporter who submitted anonymously" — self-triage of your own anon flag becomes rewarding and is **undetectable by design** (no user_id stored on anon flags; that's Jordan's posture, not an oversight). Farming shape: anon-submit → sign in → self-verify (+3). Bounds today: the 5/day anon client cap (soft, storage-clearable) and nothing server-side (anon inserts are invisible to the 20/24h trigger, which counts `auth.uid()`). Scale-honest verdict: the economy is tiny, points have no redemption value, and **Sky's own 2026-06-18 leaderboard ruling already quarantined actor points** out of the monthly board as "the rubber-stamp-grind risk" — so farmed +3s inflate only the all-time number. A scale-gated concern, not a blocker; a companion cap is spec'd below as optional.
- **Data/schema cost:** ONE artifact — `CREATE OR REPLACE` of the function body with only the guard changed (vehicle notes below). **Effort: S** (the migration is minutes; the doc-fix companion is the bulk).
- **What it forecloses:** nothing. Reversible by re-applying the old guard.
- **Interaction:** if Fork 5's W1/W2 ever ships, anon content gains both a reward and a dispute channel — revisit the cap then (thread 1).

#### F2-OB · Suppress the flash client-side (bench B1's S-tier UI half)

- **Product value / trust:** honest immediately, no migration — the flash simply stops claiming points on anon triage (`Verified — thank you`), matching the 0 the DB awards.
- **The cost the canon's "(arguably correct)" undersells:** OB *ratifies* the perverse incentive — the reports most in need of community triage become the only unrewarding ones to triage. It also leaves the trigger asymmetry live and silent: any future surface that assumes "actor bonus on triage" (a widget, a stats screen, a re-write of the flash) re-lies by default. OB treats the symptom at one call site.
- **Scope it honestly:** suppression must cover **both** announce paths — the single-card path (main:648-660) *and* the bulk path (`runBulkAction`'s own `announceForAccessibility`, main:533) — or SR users keep hearing the claim sighted users no longer see.
- **Effort: S.** **Forecloses:** nothing technically; psychologically it parks the trigger fix indefinitely.

#### The rider — which values are canon (required by OA's doc-fix *and* by any doc cleanup under O0/OB)

- **Ratify live 10/3/15/7** (Dana's standing recommendation, DECISIONS_LOG :61-62): a docs-only change — root `CLAUDE.md` Database section, `docs/DATABASE.md:75-77`, resolve the `schema.sql:112` comment, close the DECISIONS_LOG entry. (`status_history_table.sql:275-281` stays untouched — historical snapshot.) Zero behavior change; the app already lives these values.
- **Revert to 5/2/10/5**: a values migration + `points.ts` change (PROTECT-8 surface) + the same doc pass + re-verifying every UI string — real work, and no argument for it exists in the record except that the stale docs say so.
- Position: **ratify live.** The live values have been the lived reality since 2026-06-03 and the client mirrors them.

### F2 · Recommendation (a position, not a decision — Sky decides)

**OA + ratify-live, in one sitting: apply the one-line guard fix, ratify 10/3/15/7, and let the build close the whole doc-drift set the same day.** It is the cheapest honesty repair in this entire document — one changed line in one function — and it converts a HIGH-severity standing lie into a true statement while making the least-accountable content the *equally*-rewarded content to triage. The companion cap stays banked (apply if/when Fork 5 opens an anon write channel or the community grows teeth). OB is the fallback only if Sky wants zero DB motion this season — if so, take OB *and* still ratify the values so the doc drift dies.

**Constrains other forks:** OA sets the `IS DISTINCT FROM` pattern Fork 5's attestation policy needs anyway (thread 2); the anon-participation posture should be decided together with Fork 5's write half (thread 1).

### F2 · Build-ready spec — OA

**Client half: none required.** The flash strings already derive from `POINTS` and already claim the actor bonus — after the migration they're simply true. One guard test is still worth adding: `src/screens/__tests__/TasksScreen.pointsFlash.test.ts` — source-invariant style (the house `fs.readFileSync + around()` idiom): the flash strings interpolate `POINTS.*` constants (never literals) in both the single-card and bulk paths, and no `user_id === null` suppression exists (pinning OA's intent against a future half-OB drift).

**Doc-fix companion (the build's same-day checklist, alongside saving the artifact):**
1. Root `CLAUDE.md` "Database" section → 10/3/15/7 + the `IS DISTINCT FROM` guard described.
2. `docs/DATABASE.md:75-77` → same values + note the null-safe guard.
3. `supabase/schema.sql` → guard line at :163-165 updated to match live post-apply; the :112 "DECISION PENDING" comment resolved to "RATIFIED 2026-07-XX (Sky): 10/3/15/7".
4. `DECISIONS_LOG.md` → close [POINTS-VALUES-DRIFT] with the ratification + migration filename.
5. Leave `2026-05-24_status_history_table.sql:275-281` untouched (historical snapshot, not living doc).

**Data half — Sky-applied artifact.** Save as `supabase/migrations/2026-07-16_fork2_actor_guard_null_safe_PROPOSED.sql`:

```sql
-- ============================================================================
-- FILE:    2026-07-16_fork2_actor_guard_null_safe_PROPOSED.sql
-- FEATURE: Fork 2 / OA — actor bonus on anonymous-flag triage (L3-4, B1)
-- STATUS:  PROPOSED — *** NOT YET APPLIED — SKY APPLIES, NEVER AUTO-RUN ***
--
-- WHAT: replaces ONE line in handle_flag_status_change. The actor guard
--   `auth.uid() <> new.user_id` is SQL-NULL (not TRUE) when the flag is
--   anonymous (user_id IS NULL), so the actor branch is skipped and the
--   UI's "+3/+7" flash lies. `IS DISTINCT FROM` is null-safe: TRUE whenever
--   auth.uid() is non-null and differs — so triaging an anon flag awards
--   the actor bonus, while self-triage of your OWN (accountable) flag
--   still awards nothing.
--
-- DISCIPLINE (this function has bitten prod twice — duplicate-trigger
--   double-points, fixed 2026-06-03; and the is_admin reference error):
--   * CREATE OR REPLACE of the FULL body only — the body below is the
--     schema.sql mirror ("matches live as of 2026-06-07",
--     pg_get_functiondef-verified) with ONLY the guard line changed.
--   * NO trigger DDL. on_flag_status_change already exists and stays.
--   * Verify with the rolled-back probe at the bottom.
--
-- KNOWN TRADE (accepted, see Fork 2 brief): a reporter who submitted
--   anonymously CAN self-triage for +3/+7 — undetectable by design (anon
--   flags store no user_id; Jordan posture). Scale-gated; optional daily
--   cap variant described in the brief.
-- ============================================================================

create or replace function public.handle_flag_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reporter_bonus    int := 0;
  reporter_event    text;
  actor_bonus       int := 0;
  actor_event       text;
begin
  if new.status is null or new.status = old.status then
    return new;
  end if;

  if new.status = 'verified' and old.status = 'open' then
    reporter_bonus  := 10;
    reporter_event  := 'flag_verified_reporter';
    actor_bonus     := 3;
    actor_event     := 'flag_verified_actor';
  elsif new.status = 'resolved' and old.status in ('open', 'verified') then
    reporter_bonus  := 15;
    reporter_event  := 'flag_resolved_reporter';
    actor_bonus     := 7;
    actor_event     := 'flag_resolved_actor';
  elsif new.status = 'rejected' and auth.uid() in (
      select id from public.users where is_admin = true
    ) then
    -- Spam penalty: only when admin explicitly rejects
    if new.user_id is not null then
      update public.users
        set points = greatest(0, points - 20)
        where id = new.user_id;
      insert into public.point_events (user_id, event_type, delta, flag_id)
        values (new.user_id, 'flag_spam_penalty', -20, new.id);
    end if;
    return new;
  end if;

  if reporter_bonus > 0 and new.user_id is not null then
    update public.users
      set points = points + reporter_bonus
      where id = new.user_id;
    insert into public.point_events (user_id, event_type, delta, flag_id)
      values (new.user_id, reporter_event, reporter_bonus, new.id);
  end if;

  if actor_bonus > 0
     and auth.uid() is not null
     and auth.uid() is distinct from new.user_id then   -- << THE ONE CHANGED LINE
    update public.users
      set points = points + actor_bonus
      where id = auth.uid();
    insert into public.point_events (user_id, event_type, delta, flag_id)
      values (auth.uid(), actor_event, actor_bonus, new.id);
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_flag_status_change()
  from public, anon, authenticated;

-- ============================================================================
-- VERIFY — rolled-back probe (house practice: "verified on prod with
-- rolled-back probes"). Run as a SEPARATE query after applying. Everything
-- inside rolls back: the status flip, the points, the point_events row.
--
--   begin;
--   -- 0. Need one anonymous OPEN flag to probe against. Confirm:
--   select id from public.flags
--    where user_id is null and status = 'open' limit 1;
--   -- (If none: submit one as a guest from the app first, then re-run.)
--
--   -- 1. Simulate an authenticated actor (YOUR uuid from public.users):
--   set local role authenticated;
--   set local request.jwt.claims to
--     '{"sub":"<YOUR-USER-UUID>","role":"authenticated"}';
--
--   -- 2. Triage it:
--   update public.flags set status = 'verified'
--    where id = (select id from public.flags
--                where user_id is null and status = 'open' limit 1);
--
--   -- 3. EXPECT one fresh row (+3, your uuid) — the award the old guard skipped:
--   select user_id, event_type, delta from public.point_events
--    where event_type = 'flag_verified_actor'
--    order by created_at desc limit 1;
--
--   rollback;
-- ============================================================================

-- ROLLBACK (restores the pre-fix guard): re-run this same file with the
-- marked line reverted to:
--      and auth.uid() <> new.user_id then
```

**Optional companion — the daily actor cap** (banked; apply only if Fork 5 opens an anon write channel or farming appears): the same artifact with **one 5-line insertion** at the top of the actor branch —

```sql
     and (select count(*) from public.point_events
           where user_id = auth.uid()
             and event_type in ('flag_verified_actor', 'flag_resolved_actor')
             and created_at >= now() - interval '24 hours') < 20
```

— capping actor bonuses at 20 events/day/user (values PROPOSED — Sky tunes). Not recommended as a default: it adds a per-triage count query and polices a farm that today has nothing worth farming.

**PROTECT held:** 8 (POINTS single-source untouched — the trigger comes *to* the client's values, exactly the "trigger-side exception" resolution), 17/18/19/26 untouched (no UI change), no trigger churn (the incident law).

### F2 · Build-ready spec — OB (fallback)

- **TasksScreen** (`applyStatusChange`, main:646-661): thread the flag's `user_id` (or an `isAnonFlag` boolean) into the flash decision; when `!isOwn && user_id === null` → flash + announce `Verified — thank you` / `Resolved — thank you` (em-dash grammar PROTECT-19; PROPOSED — SKY-EDITABLE), **no points clause**. Same suppression in the **bulk path** (`runBulkAction` announce, main:533): bulk messages drop per-item points claims when the batch contains anon flags (simplest honest rule: bulk claims points only when *every* item is non-anon; exact wording at build).
- **FlagDetailModal:** verify/resolve from the detail sheet routes through the same status-change flow — confirm at build whether it flashes points (its `runStatusChange` main:407-414 calls `updateFlagStatus` directly); if it announces points anywhere, suppress identically.
- **Guard tests:** `TasksScreen.pointsFlash.test.ts` — matrix: own flag → reporter string · other's accountable flag → actor string · anon flag → thank-you string with **no digits**, in both single and bulk paths; grep guard that `POINTS.actor` still feeds the accountable-path strings (PROTECT-8).
- **No DB half.** Pre-migration row: n/a. **Effort: S.**
- The doc-drift rider still applies under OB — ratify values and close the four doc sites regardless.

### F2 · Missing signal (no analytics invented — run this instead)

Nobody knows how often this lie has actually fired. Approximate it (current-status based; reopen cycles blur history — stated caveat):

```sql
-- Fork 2 grounding: how big is the anon corpus, and how often did the flash lie?
select
  (select count(*) from public.flags where user_id is null)                       as anon_flags,
  (select count(*) from public.flags where user_id is null
     and status in ('verified','resolved'))                                       as anon_flags_triaged,
  (select count(*) from public.flags f
    where f.user_id is null and f.status in ('verified','resolved')
      and not exists (select 1 from public.point_events pe
                       where pe.flag_id = f.id
                         and pe.event_type in ('flag_verified_actor',
                                               'flag_resolved_actor')))           as lied_flashes_approx;
```

`lied_flashes_approx` ≈ every time a signed-in user was told "+points" the trigger never paid.

### F2 · The single question for Sky

**"Apply the one-line `IS DISTINCT FROM` migration and ratify 10/3/15/7 (OA — recommended), or suppress the flash client-side (OB) — and if OB, do you still ratify the live values so the doc drift can finally close?"**

---

## BRIEF 4 — The blocked_path icon collision (BENCH-1 discovery #3)

*Authored: Fable 5 (max effort) · 2026-07-16 · read-only · cites re-verified this session*

### ICON · The decision in one line

When the bench line merges, the two `blocked_path` templates — "Blocked by construction" and "Parked vehicle blocks path" — will share one category glyph in the report picker: accept **labels-as-disambiguation** (BENCH-1's shipped design) or introduce **distinct per-template icons** in the house style?

### ICON · Why it was parked — the bench's own framing

This fork is a BENCH-1 *discovery*, not a Round-1 canon fork. The build record (`design-reviews/fable-audit/bench-assets/BENCH-1-verification-evidence.md:45`):

> **`blocked_path` collision** (⛔ construction / 🚗 parked share the category) is resolved by design: both render the category glyph, disambiguated by their labels — correct for a category-icon system. Per-template distinction is a flagged follow-up, **not** self-resolved.

And discovery #3 (:81): *"if the shared category icon on the two blocked_path chips reads too-samey on device, a follow-up can introduce distinct per-template Lucide icons (candidates for Sky's eye)."* R2's baseline ledger carries it forward verbatim as an *"open-for-Sky bench discovery"* (`r2-audit/r2_part3_synthesis.md:17`).

Two framing corrections for the record: **(1)** the shared glyph is **not Lucide** — it's the bespoke `CategoryIcon` circle+slash (the house set is *"drawn on the same grid as Lucide"* but hand-authored, `CategoryIcon.tsx:1-10, :56-62`); the discovery's "Lucide icons" is loose wording, and PROTECT-16/24 mean any follow-up icons must be **bespoke, in-family** — not emoji, not raw Lucide imports. **(2)** the collision **exists only on the unmerged bench line** — this fork is conditional on the bench merge.

### ICON · Shipped state today (verified, both branches)

- **On `main` (shipped reality):** the picker chips render per-template emoji — `glyph: '⛔'` / `glyph: '🚗'` in `reportTemplates.ts main:71-84`, drawn at `ReportFlagModal.tsx main:591-597` with `accessibilityElementsHidden` — so the two templates are **visually distinct on main**, and the distinction was *always label-borne for screen-reader users* (the emoji are decorative). This is also the state PROTECT-24 retires: the emoji are a DESIGN.md §10 violation (L2-9's family).
- **On `bench/4-quality` @ `a8549ff` (the intended future):** B2-ii removed the `glyph` field from `ReportTemplate` and all 7 templates (`reportTemplates.ts bench:71-84` — no glyph key) and the chip renders `<CategoryIcon category={t.category} size={18} … decorative />` (`ReportFlagModal.tsx bench:606-611`). Both `blocked_path` chips therefore wear the **identical circle+slash** (`CategoryIcon.tsx:56-62` — byte-identical on both branches), distinguishable only by their labels. The bench test pins the new world: *"The chip icon is now the bespoke CategoryIcon, keyed off `category` — no per-template glyph field to pin"* (`src/lib/__tests__/reportTemplates.test.ts:7-8`, bench).
- **The collision is picker-only, structurally.** Flags store only `category` (`schema.sql:59-62` — six values, no template column), so template identity dies at submit: map pins were category-keyed on **both** branches all along (`PlatformMap.tsx main:286`; web path string `PlatformMap.web.tsx main:112`), and Tasks cards are text-only. Pin-level or detail-level template distinction is **impossible without a schema change** — that boundary defines option I-O2.
- **Perceptual verdict does not exist yet:** BENCH-1's native chip render is `NEEDS-SKY-DEVICE` (:47) — the "reads too-samey?" question this fork turns on has not been answered by anyone's eyes on a device. (Sky's 2026-07-09 device reads settled D9/D10 only.)

### ICON · Options

#### ICON-O0 · DO-NOTHING — labels disambiguate (BENCH-1's shipped design)

- **The case:** category-icon purity — one glyph vocabulary meaning *category*, identical in the picker, the map pins, the legend, and Admin. The two chips say what they are in words ("Blocked by construction" / "Parked vehicle blocks path"), exactly as they always did for SR users. Zero cost, zero new art to maintain, and the flagged failure condition ("reads too-samey **on device**") is a perceptual claim nobody has verified.
- **Product cost:** a sighted reporter scanning the picker loses the one-fixation distinction the emoji used to give; the picker is the reporting front door, so a slower choose-one scan is a real (small) friction. Only sighted-scan is affected — the SR experience is unchanged by construction.
- **Trust/abuse/privacy/schema:** none. **Effort:** 0. **Forecloses:** nothing.

#### ICON-O1 · Distinct per-template bespoke glyphs — picker-only, in-family  (the pre-spec'd follow-up)

Two new hand-drawn SVGs in the CategoryIcon family style (24-grid, 2 px stroke, round caps), shown **only on the picker chips**; the category vocabulary everywhere else (pins, legend) stays untouched.

- **Product value:** restores the one-fixation scan at the reporting front door — the only surface where *template* (not category) is the unit of choice.
- **Trust/cohesion:** contained dilution — icons now mean "template" in exactly one place and "category" everywhere else; acceptable because the picker is the one surface whose semantics genuinely *are* template-level. PROTECT-16 is extended ("wear it MORE"), PROTECT-24 honored (no emoji), PROTECT-3 untouched (chip internals only — B2-ii's own precedent).
- **Effort:** **S** — two glyphs + a render branch + tests. **Schema cost:** none. **Forecloses:** nothing (I-O2 stays available; if template identity ever enters the schema, these glyphs become the ready pin art).
- **A11y/RM:** decorative icons, labels unchanged, no motion — nothing for the RM net.

#### ICON-O2 · Template identity into the data model (named for completeness, not proposed)

A `template_id` (or subcategory) column on `flags` would let pins, detail sheets, and analytics distinguish construction-blocks from parked-vehicle-blocks. Real costs: a migration + insert-path change + a copy/legend system for template-level pins — for a need no finding names. The audit scoped the collision to the picker; O2 is the boundary that shows what O1 deliberately does **not** buy. Park it until a product need (e.g., "notify me about construction barriers") names itself. **Effort:** M.

#### Rejected by PROTECT, named: restoring the emoji

⛔/🚗 (or any emoji badge) cannot return — PROTECT-24 verbatim: *"no decorative UI emoji returns."*

### ICON · Recommendation (a position, not a decision — Sky decides)

**O0 through the bench device gate — let the flagged condition be tested by the only instrument it names: Sky's eye on a device.** BENCH-1 already made the *design* argument (category-icon systems disambiguate same-category variants by label, correctly); what's untested is the *perceptual* claim. When the bench build reaches Sky's hands (the chip render is already on the NEEDS-SKY-DEVICE list), look at the two chips at 390 pt in both themes: if they read too-samey in practice, **O1 is pre-spec'd below and is a same-day S build**; if they read fine, O0 stands ratified and this fork closes with zero code. Deciding O1 from the desk today would spend art and a vocabulary exception on an unverified perception.

**Constrains other forks:** none — this is the weakest-coupled fork in the set. Its only dependencies run inward: the bench merge activates it, and PROTECT-16/24 bound its option space.

### ICON · Build-ready spec — O1 (distinct per-template glyphs)

**Where the art lives:** `src/components/CategoryIcon.tsx` — keep one icon home (PROTECT-16's family file). Export a sibling:

```tsx
export type TemplateGlyphName = 'construction_barrier' | 'parked_vehicle';
export function TemplateGlyph({ name, size = 18, color, decorative }: {...}) { … }
```

**The two motifs (PROPOSED starting coordinates — Sky's eye tunes; same 24-grid / 2 px stroke / round caps as the family):**
- `construction_barrier` — a barricade: two legs + one plank + one stripe:
  `<Path d="M4 9 H20" /><Path d="M6 9 V19" /><Path d="M18 9 V19" /><Path d="M9 9 L13 5" />` *(plank high, legs down, one diagonal stripe cue)*
- `parked_vehicle` — a car in profile: body + two wheels:
  `<Path d="M4 15 V12 L7 8 H15 L19 12 V15 H4 Z" /><Circle cx={8} cy={16} r={2} /><Circle cx={16} cy={16} r={2} />`

**Wiring:**
- `src/lib/reportTemplates.ts`: optional `templateIcon?: TemplateGlyphName` on the interface; set it on **only** the two `blocked_path` entries. (Do NOT resurrect the `glyph` string field — that's the retired emoji shape.)
- `src/screens/ReportFlagModal.tsx` (chip, bench:606-611 pattern): `t.templateIcon ? <TemplateGlyph name={t.templateIcon} …/> : <CategoryIcon category={t.category} …/>` — same `size={18}`, same active-tint logic, `decorative` always (labels keep carrying the meaning).
- **Nothing else changes:** map pins, legend, Admin, Tasks stay category-keyed (`PlatformMap.tsx main:286` untouched).
- **Guard tests:** extend `src/lib/__tests__/reportTemplates.test.ts` — the two `blocked_path` templates carry **distinct** `templateIcon` values and no other template sets one; grep guards — no `glyph:` field returns to `reportTemplates.ts`, no emoji in `ReportFlagModal.tsx`/`reportTemplates.ts` (PROTECT-24 pin); a chip render source-invariant (TemplateGlyph branch present, CategoryIcon fallback preserved).
- **PROTECT held:** 3 (chip internals only — sticky footer / severity buttons / 44 pt target untouched, B2-ii's own fence), 16 (family extended in-file), 24 (no emoji). **Pre-migration row:** n/a — pure UI, no data half.
- **Device row (rides the same bench gate):** the two chips at 390 pt, light + dark + RT — distinct at a glance, active tint legible on both.

### ICON · Missing signal (no analytics invented — run this instead)

How often do reporters even face this choice? Template choice isn't stored (that's I-O2's whole point), but category share bounds it:

```sql
-- Icon fork grounding: how much of the corpus is blocked_path at all?
select category, count(*) as flags,
       round(100.0 * count(*) / greatest(sum(count(*)) over (), 1), 1) as pct
from public.flags
group by category
order by flags desc;
```

A small `blocked_path` share argues the collision is a rare-moment cost either way; a large share raises O1's value.

### ICON · The single question for Sky

**"At the bench device gate, do the two `blocked_path` chips read too-samey?"** — No → O0 stands ratified (labels disambiguate, by design; fork closes with zero code). Yes → fire O1 (pre-spec'd above; S-tier, same-day). And if bench never merges, this fork is moot — main still wears the distinct emoji.

---

## One-screen decision summary

All recommendations are the strategist's positions — **Sky decides.** Every migration named is a Sky-applied PROPOSED artifact written out in its brief.

| # | Fork | Recommendation | Cost if built | The single question for Sky |
|---|------|----------------|---------------|------------------------------|
| 1 | **Fork 1 · Proximity** | **Ratify the honest global feed (O0) + adopt the tripwire query + swap the SF default to Kelowna (S).** O1 (viewport fetch, quantized) is pre-spec'd for the moment the tripwire fires or Sky wants FIND literal; O2 (PostGIS) deferred to a scale trigger. | O1: **M** + one index migration · O2: **L** + the PostGIS bundle | Ratify-with-tripwire, or build the viewport fetch now? |
| 2 | **Fork 5 · Trust scope** | **Ratify the read-only ledger (canon B) on both halves.** C1 (attestations + thresholded badge) banked behind T1 + Jordan review; W1 (auth dispute, guest-visible) banked; W2 (guest write) parked behind Fork 3 + real throttling. | C1: **M** + one migration · W1: **M** + one migration | Ratify read-only — or which write half first: count (C1) or dispute (W1/W2)? |
| 3 | **Fork 2 · Points honesty** | **Build OA now: the one-line `IS DISTINCT FROM` migration + ratify 10/3/15/7 + close the doc drift.** The cheapest honesty repair in the set; OB (flash suppression) is the fallback only if zero DB motion is wanted. | **S** — one changed line + the doc pass | Apply the migration + ratify live values — or suppress the flash (and still ratify values)? |
| 4 | **Icon collision** | **Defer to the bench device gate (O0 default).** If the two chips read too-samey on device, O1 (two bespoke in-family glyphs, picker-only) is pre-spec'd and same-day. Moot if bench never merges. | O1: **S**, no data half | At the device gate: do the two `blocked_path` chips read too-samey? |

**Sequencing guidance (from the interaction map):** decide **Fork 2 + Fork 5's write half in one sitting** (one anonymous-participation posture; their artifacts share the `IS DISTINCT FROM` pattern) · Fork 5's count half waits for **T1** regardless · Fork 1 runs on its own timetable with the tripwire watching · the icon fork waits for the **bench device gate**. Net-new Sky actions if all recommendations are taken as-is: **apply one migration (Fork 2's), answer one values question, run three read-only signal queries at leisure, and look at two chips whenever the bench build lands.**

---

## Appendix — provenance & verification

### Method

Planned in a Sky-approved plan-mode pass (plan: `~/.claude/plans/fable-5-max-effort-melodic-cupcake.md`): three read-only exploration agents (paper trail · code reality · data layer) plus one plan-validation agent, then **write-time re-verification of every cite in this document** — each file:line was re-read in this session via `Read` or `git show main:<path>` (no checkouts; the working tree stayed parked on `bench/4-quality` throughout). Every cite is branch-tagged `main:` / `bench:`; repo-tracked files identical on both branches are cited from the branch shown. Fork canon is quoted verbatim from `design-reviews/fable-audit/partials/slate-integration.md` §2 with cite-currency footnotes where line numbers have drifted.

### Read-only guarantee

No branches created or switched · no code, test, or doc files edited · no migration applied (all SQL in this document is PROPOSED, fenced, and Sky's to run) · no external sends. The only filesystem writes of this run: this document and its directory (`design-reviews/fork-briefs/`), both untracked audit artifacts like the rest of `design-reviews/`.

### Corrections to the received framing (verify-first log — "the context may have moved," and it had)

1. **The icon collision exists only on the unmerged bench line** — `main` still renders distinct ⛔/🚗 template emoji; and the shared bench glyph is the **bespoke CategoryIcon SVG**, not Lucide (Brief 4 carries both corrections).
2. **The Fork 1 canon's code cites are still exact on `main`** (`flags.ts:606/:652`) — it's the *bench* line that shifted (+~81 lines from the B8 EXIF block). The stale-cite risk ran the opposite direction from the plan's assumption.
3. **The shipped pill string is "Showing N flags"** — the canon's sketch copy ("N reports loaded" / "Showing most recent") was superseded at P1 build time.
4. The "5/day" anon rate limit is **client-side AsyncStorage only** — there is no server-side anonymous throttle anywhere; F10's own OPEN QUESTIONS already said so. Load-bearing for Fork 5.
5. `flag_verifications`' INSERT policy carries the **same SQL-NULL trap** Fork 2 exists to fix — found during planning verification, now interaction-map thread 2.
6. Recorded in passing (no action taken, read-only): the `listFlags` privacy docblock (`flags.ts main:600-604`) still claims "only authenticated users can read rows" — stale since the 2026-05-29 anon SELECT policy.

### The four signal queries (index)

Each brief carries a copyable read-only SQL one-shot in place of analytics that don't exist: **F1** data-spread + page-window tripwire · **F5** trust-activity grounding (attestation rows / actor events / rejects / anon corpus) · **F2** anon corpus + the historical lie count · **ICON** category share. All are SELECT-only, safe in the Supabase SQL editor.

### Model provenance

Authored end-to-end by **Fable 5 (`claude-fable-5`), max effort**, in a Sky-fired interactive session on 2026-07-16 (Sky's explicit model choice for this run). No background/scheduled execution, no Opus involvement, no resume occurred — all four briefs plus this appendix are single-provenance. Subagents used for exploration/planning inherited the same session model.
