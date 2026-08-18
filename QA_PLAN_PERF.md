# QA_PLAN_PERF — Flagstone performance audit plan (2026-06-01)

Peter (Performance Engineer). Final pre-tester performance pass. Branch
`qa-peter/accessmap-2026-06-01` off `main` (`5fb80ce`), in an isolated worktree.
Measure-first; fix only what's safely fixable in conflict-free files; propose the rest.

## Scope & method

- **Lens:** speed, render cost, query/network efficiency, startup, memory, motion — at
  1× / 10× / 100× data growth. Not features, security, or visual polish.
- **Measure before touching.** Profile/reason about the dominant cost, then fix the hot
  path. No guess-driven edits.
- **Parallel-safe.** Two sibling audits (security, accessibility) run off the same base.
  Keep edits localized/additive; committed edits confined to files the siblings won't
  touch (data layer + map); flag every shared-file consideration.
- **Never** weaken correctness/RLS/privacy for speed; never apply schema/index/dependency
  changes to the live DB (propose as migration files); keep typecheck + lint green.

## Baseline (measured 2026-06-01)

- `main` = `5fb80ce` (ui-polish merged + lint restored). Working tree audited == main.
  The merge touched **no** perf-critical file (`flags.ts`, `flagsStore.tsx`,
  `MapScreen.tsx`, `PlatformMap.tsx/.web.tsx`, `schema.sql` byte-identical).
- `npm run typecheck` ✅ green. `npm run lint` ✅ green (0 errors, 259 pre-existing warnings).
- Live DB ("Accessable City App", Postgres 17): `flags` = 7 rows, `users` = 2, all other
  tables ~0 → effectively pre-scale; findings are growth-curve projections.
- Supabase performance advisors captured (auth_rls_initplan, multiple_permissive_policies,
  unindexed_foreign_keys ×7, duplicate_index ×1, unused_index — mostly "too small to use yet").

## What I audited (whole app)

- **Data/queries** ([flags.ts](src/lib/flags.ts), [flagsStore.tsx](src/lib/flagsStore.tsx)):
  every Supabase read/write — limits, column lists, pagination, dedupe, refetch-on-focus,
  N+1, photo URL construction, realtime channel lifecycle.
- **Render/lists/motion**: MapScreen (filter panel, FAB, markers), PlatformMap native/web
  (markers, clustering, callouts), TasksScreen/LeaderboardScreen lists, ProfileScreen,
  new primitives (Skeleton/Sheet/Input), ThemeContext value stability, animation drivers.
- **Startup/bundle**: App.tsx cold-start path, font loading, provider tree, RootNavigator
  static imports, dependency footprint (lucide, maps, supabase).
- **DB**: indexes, FK coverage, RLS evaluation cost, row counts (via read-only advisors).

## Plan of action

1. **Phase 0 — measure** (done): typecheck/lint baseline + read-only Supabase introspection.
2. **Commit (clean files only):** C1 — hoist two inline icon-row style objects in
   `MapScreen.tsx` into a shared `makeStyles` entry. C2 — scan for other unambiguous
   clean-file micro-wins; commit only the safe ones.
3. **Propose (never applied):** photo thumbnails; viewport/bbox query; FK covering indexes
   + drop duplicate index (migration files); RLS initplan + policy consolidation (hand to
   Steve); ProfileScreen double-read consolidation; bundle/startup monitoring.
4. **Verify:** typecheck + lint green after each commit and at the end; diff review for no
   behavior/RLS/privacy regression, no secrets, no scope creep.
5. **Report:** `qa-reports/2026-06-01_Performance_QA_Report.md`, leading with DECISIONS FOR
   SKY. Per Constitution Art. 9, **not emailed** — Morgan relays.

## Headline

Flagstone is **already well-optimized** (limit + pagination + shared SWR store + marker
clustering + virtualized memoized lists + native-driver motion all shipped). This pass is
verification + a few tiny clean-file wins + a measured scale roadmap — deliberately not a
churn-heavy "fix" pass.
