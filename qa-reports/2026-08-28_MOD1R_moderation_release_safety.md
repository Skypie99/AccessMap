# MOD1R — Moderation Release-Safety Recovery Implementation — 2026-08-28

## Summary

Reimplementation of the MOD1 moderation-safety contract from scratch, from the
independently accepted base `3403003b` (branch
`claude/d1f4r3-fix3-review-audit-20260828`), on a fresh branch
`claude/mod1r-moderation-release-safety-20260828`. The prior MOD1
implementation was built and reportedly verified in an ephemeral Claude Code
Cloud workspace but was lost before it was ever pushed to GitHub — nothing
here reuses its commit history, and no evidence from that lost run is treated
as proof of anything about THIS branch. Every number below was produced by
running the actual tools in this session, on this worktree.

Two checkpoints, each committed, pushed, and verified against a fresh
`git fetch` before the next one began:

- **Checkpoint A** (`b31ff3e`) — admin-only reject/restore at the DB trigger
  layer, community Reject gated (not deleted) behind `useIsAdmin()` in
  `FlagDetailModal` and `TasksScreen`, Admin Restore added to `AdminScreen`.
- **Checkpoint B** (`c820515`) — durable admin report-moderation queue over
  the existing `[REPORT]` envelope in `public.feedback`, least-privilege RLS,
  partial-failure-safe action layer, Admin Reports UI.

Final HEAD: `c820515d47e5a422afe6cf06196786e1e51ce9a8`, pushed and confirmed
identical on `origin/claude/mod1r-moderation-release-safety-20260828` via
fresh fetch. Working tree clean. **Not merged** — this branch is implementation
only, pending independent acceptance per the task's own instructions.

## Checkpoint A — Authorization core

**Commit:** `b31ff3e324c6f4f55cb831bef8c50d0cb3da7c6e` — `fix(moderation): enforce admin reject and restore`

- `supabase/migrations/20260828040000_mod1_moderation_release_safety.sql`
  (new, source-only) — rewrites `enforce_flag_status_transition()` so every
  transition INTO `rejected` (previously unconditional for `open`/`verified`)
  and the new `rejected → open` ("Restore") both require
  `auth.uid() in (select id from public.users where is_admin = true)`. The
  RLS policy on `flags` UPDATE is deliberately untouched — the trigger was
  already the single point of transition-legality authority (per its own
  2026-08-19 header), so narrowing it there keeps the fix at the layer that
  already owned this decision.
- `src/components/FlagDetailModal.tsx` — `useIsAdmin()` added; the Reject
  cell's `show` gains `&& isAdmin === true`; a new Restore cell
  (`rejected → open`, admin-only) added to the same `segmentCells` array;
  `DetailAction` gains `'restore'` (kept distinct from the pre-existing
  `'reopen'`, which is a different mechanism — community threshold vote off
  a *resolved* flag, not an admin write off a *rejected* one).
- `src/screens/TasksScreen.tsx` — the Reject cell in `TaskCard`'s action array
  is now conditionally spread on `isAdmin` (no Restore cell added here:
  `TRIAGE_STATUSES` excludes `rejected`, so a rejected flag never reaches
  this screen — confirmed by reading the filter, not assumed).
- `src/screens/AdminScreen.tsx` — new `handleRestore`; the per-row action that
  was always "Dismiss" now swaps to "Restore" when `item.status === 'rejected'`.

**Why gated, not deleted:** the locked spec says "remove community unilateral
Reject from every reachable path" and, separately, "do not silently remove
unrelated functionality." Deleting the control would satisfy the first and
violate the second for admin viewers, who had it before. Gating satisfies
both.

### Checkpoint A test changes
- `src/components/__tests__/FlagDetailModal.sheetPresentation.test.tsx` — the
  one assertion that a signed-in non-admin sees Reject is corrected to assert
  the opposite; five new tests cover admin-sees-Reject and Restore
  visibility (admin+rejected / non-admin+rejected / non-rejected-any-admin).
- `src/screens/__tests__/TasksScreenFlagCard.test.tsx` — five existing tests
  that implicitly required Reject now explicitly render as
  `{ isAdmin: true }`; three new tests cover the non-admin-hides-Reject case.
- `guestReviewGating.guard.test.ts` and `disputeControl.guard.test.ts` needed
  **no changes** — verified by reading both against the new source before
  touching anything (the former's assertion is a `toContain` substring match
  that the new, longer `show` expression still contains; the latter doesn't
  inspect the `reject` cell's gating at all).

## Checkpoint B — Durable report queue / privacy

**Commit:** `c820515d47e5a422afe6cf06196786e1e51ce9a8` — `feat(moderation): add durable admin report queue`

- `supabase/migrations/20260828050000_mod1_admin_report_queue.sql`
  (new, source-only) — adds `moderation_reviewed_at` / `moderation_reviewed_by`
  / `moderation_resolution` to `public.feedback`; a CHECK constraint making
  `(reviewed_at IS NULL) = (resolution IS NULL)` (no half-reviewed row is
  storable); a resolution-vocabulary CHECK against the exact five locked
  values. RLS: `feedback_select_moderation` / `feedback_update_moderation`,
  both scoped with `body like '[REPORT]%'` **and** an admin check against
  `public.users` (never against `public.feedback` itself — see below). The
  write side additionally narrows via a plain column-level GRANT
  (`revoke update on public.feedback from authenticated` then
  `grant update (moderation_reviewed_at, moderation_reviewed_by,
  moderation_resolution) ...`) rather than an RLS `WITH CHECK` that pins the
  untouched columns.
- **On the recursion the prior lost attempt reportedly hit:** the task
  description said it found `infinite recursion detected in policy for
  relation feedback` from a self-referencing RLS subquery, and used
  column-level grants instead. I could not reproduce or inspect that
  original SQL (it doesn't exist anywhere in this repo or its history), so I
  designed a policy that structurally cannot hit that failure — every
  `EXISTS` in the new migration subqueries `public.users`, never
  `public.feedback` — and pinned it with a dedicated guard test
  (`adminReportsPrivacy.guard.test.ts`) that greps every subquery in the file
  and fails if any references `public.feedback`. I was **not able to test
  this against a real disposable PostgreSQL** — see Known gaps below — so
  this is a design verified by static reasoning and test, not by executing
  the SQL.
- `src/types/database.ts` — `ModerationResolution` type; `FeedbackRow` gains
  the three columns; `Insert` keeps them optional so `submitFeedback()` /
  `submitContentReport()` call sites are unaffected.
- `src/lib/adminReports.ts` (new) — `listOpenReports()` hydrates each
  `[REPORT]` row against live flag/comment data in two batched queries (not
  N+1); malformed bodies are surfaced (`malformed: true`), never dropped;
  `closeReport()` is the sole writer, guarded by
  `.is('moderation_reviewed_at', null)` so re-closing an already-closed
  report is a safe no-op. `rejectFlagReport` / `removeFlagReport` /
  `removeCommentReport` each perform their content mutation **first**,
  throwing untouched if it fails, then call `closeReport` through a
  3-attempt retry (`closeAfterContentAction`) before ever reporting
  `{closed: false}` to a caller — so a transient failure on the bookkeeping
  write is very unlikely to ever put an admin in the position of wondering
  whether to press the same destructive button twice.
- `src/screens/AdminScreen.tsx` — a `Flags`/`Reports` `SegmentedControl`
  toggle (no new navigator route — this screen already has no nested stack);
  a report row per target kind, with distinct action sets for available
  flag / available comment / unavailable target / malformed body (exactly
  four states, never overlapping).
- **Reporter identity:** `AdminReport` and its `REPORT_SELECT` column list
  never include `feedback.user_id` — this is structural (there is no field
  to accidentally render), not a UI-layer omission, and is pinned by a guard
  test rather than left as a convention to remember.

### Checkpoint B test changes (all new)
- `src/lib/__tests__/adminReports.test.ts` (15 tests) — hydration (flag
  target / comment target / malformed / deleted target / query error),
  `closeReport`'s idempotence guard, and the ordering + retry contract for
  all three composite actions (content-throws-before-close /
  content-succeeds-close-fails-after-all-retries /
  content-succeeds-close-recovers-on-retry).
- `src/lib/__tests__/adminReportsPrivacy.guard.test.ts` (9 tests) — the
  `user_id`-never-selected guarantee, the report-row-never-renders-reporter
  guarantee, and five RLS-source-scan assertions (prefix scoping, column-only
  grant, self-only reviewer, no self-referencing subquery, resolution
  vocabulary).
- `src/screens/__tests__/AdminScreen.test.tsx` (11 tests) — the queue toggle,
  per-target-kind action gating (flag / comment / unavailable / malformed),
  the reject/remove/delete-comment wiring, and the partial-failure UI
  behavior (report stays visibly open, content action isn't repeated).

## Checkpoint C — Final hardening

- **Adversarial re-sweep for other reject/status-transition assumptions**
  (beyond the two files Checkpoint A already fixed): searched all of
  `src/screens/*.tsx` and `src/components/*.tsx` for other `'reject'`
  literals, all test files for `actions.length`/`toHaveLength(3|4)` action-
  count assertions, and every remaining `DetailAction` import site
  (`ProfileScreen.tsx`, `MapScreen.tsx`) for exhaustiveness risk from the new
  `'restore'` union member. Nothing further needed changing — both remaining
  `DetailAction` consumers ignore the `action` parameter entirely, and no
  other reject control or action-count assertion exists.
- **A real regression was caught and fixed during this pass:** the initial
  Reports-queue action buttons ("Reject flag", "Remove flag", "Delete
  comment") shipped with `accessibilityLabel`s that did not literally contain
  their visible text (e.g. visible "Reject flag", label "Reject the reported
  flag") — a genuine WCAG 2.5.3 (Label in Name) violation, caught by the
  pre-existing `labelInName.guard.test.ts` on the first full-suite run after
  Checkpoint B's UI was written. Fixed by making each label's visible text a
  literal prefix (e.g. `"Reject flag — the reported flag"`); full suite
  re-run clean after.
- **Migration filename collision check:** re-confirmed
  `supabase/migrations/20260828040000_mod1_moderation_release_safety.sql`
  did not exist before this branch created it (Checkpoint A's Gate 0
  research); Checkpoint B's migration used the next free timestamp,
  `20260828050000`, rather than reopening Checkpoint A's already-committed
  file.
- **Unused speculative code removed:** an initial `listReportsById()` helper
  in `adminReports.ts` had no caller anywhere in the app and was deleted
  before the Checkpoint B commit, rather than left as unused surface area.

### Final gate results (this session, this worktree, HEAD `c820515`)

| Gate | Result |
|---|---|
| `npm run typecheck` | Clean, 0 errors |
| `npm run lint` | 0 errors, 91 warnings (all pre-existing, none in changed files except one `import/first` warning in `adminReports.test.ts` matching this repo's own established mock-before-import idiom) |
| `npx jest` (full suite, `.claude/`-worktree ignore-pattern override applied — see Known gaps) | **266/266 suites, 3,903 tests, 3,871 passed + 32 pre-existing todo, 0 failed** |

No regression survived to the final run. The one regression found
(WCAG 2.5.3 above) was fixed within the same pass that introduced it, before
either checkpoint commit.

## Changed files (12 total, both checkpoints)

```
src/components/FlagDetailModal.tsx                                    | 43 +-
src/components/__tests__/FlagDetailModal.sheetPresentation.test.tsx   | 60 ++-
src/lib/__tests__/adminReports.test.ts                                | 350 (new)
src/lib/__tests__/adminReportsPrivacy.guard.test.ts                   | 116 (new)
src/lib/adminReports.ts                                               | 226 (new)
src/screens/AdminScreen.tsx                                           | 486 ++++-
src/screens/TasksScreen.tsx                                           | 39 +-
src/screens/__tests__/AdminScreen.test.tsx                            | 314 (new)
src/screens/__tests__/TasksScreenFlagCard.test.tsx                    | 39 +-
src/types/database.ts                                                 | 27 +-
supabase/migrations/20260828040000_mod1_moderation_release_safety.sql | 73 (new)
supabase/migrations/20260828050000_mod1_admin_report_queue.sql        | 119 (new)
```

## Known gaps / deferred (explicitly, not silently)

- **No local disposable PostgreSQL was available in this environment** —
  `docker` is not installed here, so `supabase start` (which needs it) could
  not run. The RLS/trigger design was verified by careful manual reasoning,
  cross-checked against the exact idioms already live and working in this
  codebase (the same `auth.uid() in (select id from public.users where
  is_admin = true)` pattern already proven by the pre-existing
  resolved→rejected admin gate), and pinned with source-scan guard tests —
  but it has **not been executed against a real Postgres**. This is the one
  place this implementation falls short of what the task asked for ("Prove
  the final SQL against real disposable local PostgreSQL if available") —
  it wasn't available, and I'm flagging that rather than skipping the
  caveat.
- **Hosted application is out of scope by design** (Migration Hold, per the
  task) — both migration files are source-only. Hosted Supabase, Storage,
  and Auth were not touched by this session in any way; no MCP call to any
  Supabase project-management tool was made.
- **A manual retry after a rare partial failure surfaces a generic error,
  though it stays safe.** If `closeReport`'s 3 internal attempts are *all*
  exhausted (transient failure that outlasts ~3 round-trips) and an admin
  presses the same action button again, the composite function re-runs the
  content mutation with the stale pre-action status it still has in local
  state. For `rejectFlagReport` specifically, the flag's status trigger CAS
  (F53, pre-existing) will then reject the second write as a conflict — so
  the flag is never double-mutated and nothing incorrect is stored, but the
  admin sees a generic conflict error rather than a "this was already
  handled, just retrying the close" message. I judged this an acceptable
  residual rough edge (the safety property holds; only the error copy is
  imprecise) rather than something to fix by adding a refetch-after-partial-
  failure path, given how rare hitting it requires two independent failures
  in sequence.
- **No AdminReports UI polish pass** — the Reports queue is functionally
  complete (every locked requirement has a control and a code path) but has
  not been visually reviewed against the app's Design Compiler / luxury-UI
  bar the way a shipped feature normally would; it reuses `AdminScreen`'s
  existing card/button styles rather than introducing new visual treatment.
- **Deferred exactly as instructed:** immutable report-content snapshots,
  server-side objectionable-content filtering, migration-ledger repair,
  unrelated visual polish, unrelated refactors. None of these were touched.

## Hosted-state confirmation

- Hosted Supabase DB mutation: **NO**
- Hosted Storage/Auth mutation: **NO**
- `supabase db push` / migration repair / hosted SQL editor: **NOT RUN**
- Merge to `main`: **NOT DONE** (explicitly out of scope for this branch)

## What independent acceptance still needs to check

This report documents implementation completion, not acceptance — per the
task's own instruction, those are different things and this branch does not
self-certify. In particular, an independent reviewer should re-verify the
RLS design against a real database before it is ever applied to hosted
Supabase, given the local-Postgres gap above.
