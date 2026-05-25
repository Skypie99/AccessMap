# Morgan + team decision pass — 2026-05-23

Sky handed off five decisions to Morgan and the Claude Corp team
(Steve, Peter, Alex, Dana, Gary, Dani, Shamus). Sky's directive:

> "Hand off all decisions to Morgan to have the best people decide. I trust
> my team. Keep safety, privacy, clean scalable code in mind when making any
> decisions I hand off to you. I want things done right even if it takes a
> long time — this will set us up for the future and it's what the users of
> the app deserve."

Translation: thorough beats fast; privacy-first; long-term over expedient;
the team has authority on reversible items; the team only punts back to Sky
when the action is genuinely outside its competence (live DB writes, paid
services, brand-new auth flows).

Working from worktree `/Users/skypie/AccessMap/.claude/worktrees/pm-merges`
(branch `main`, HEAD `304398e` at the start of the pass).

---

## Decision 1 — Install Jest + jest-expo so the existing test files can run

**Status:** APPROVED. APPLIED on main.

### Context

Eight test files live in `src/lib/__tests__/` on `main` totalling 961 lines:

| File | LOC | Covers |
|---|---|---|
| `errors.test.ts` | 47 | `errorMessage()` helper |
| `filterSets.test.ts` | 229 | named filter sets — CRUD, cap, dedupe, corrupt blob |
| `flags.test.ts` | 153 | category/severity/status data dictionaries |
| `mapFilters.test.ts` | 167 | AsyncStorage filter persistence |
| `onboarding.test.ts` | 105 | onboarding flag |
| `points.test.ts` | 105 | points helper |
| `preferences.test.ts` | 100 | user preferences |
| `severityColor.test.ts` | 55 | severity color lookup |

None of them run today because there's no `jest` devDep and no `test` script.
The TypeScript compiler sees them via `**/*.ts` include, so they're held out
of typecheck with an `exclude` rule in `tsconfig.json`. Result: they're
checked into git and silently rotting.

Proposal at `qa-reports/proposal-jest-setup-2026-05-23.md` already specifies
the install (`jest@^29.7.0`, `jest-expo@~54.0.0`, `@types/jest`) and a
config block. Boring, standard, what Expo's own docs reach for.

### Role-by-role analysis

**Gary (QA / testing lead).** This is exactly the kind of safety net the
project's been missing — 961 lines of test code can't earn its keep until
the runner exists. The proposed `jest-expo` preset is the *canonical* RN
setup and the one Expo's own template uses; nothing exotic. I want this
landed before any more features ship — every feature pushed without a
runnable suite increases the cost of adding the runner later. Approved.

**Steve (security).** Three checks. (1) Tests are devDep only — they don't
change what users install or how the production bundle ships. (2) The tests
must never hit real Supabase; I read `filterSets.test.ts` and `flags.test.ts`
and they use in-memory AsyncStorage stubs (`jest.mock(...)`) and don't import
the Supabase client. Good. (3) `--legacy-peer-deps` is already required for
react-leaflet 5 per CLAUDE.md gotcha #2, so adding it to this install isn't
a new exposure — same peer-resolution rule, same trust boundary. Approved.

**Peter (performance).** Runtime cost on shipped bundles: zero (devDeps).
CI cost is the only thing to watch — `npm test` over ~961 lines of tests
will be sub-10s on this hardware. If a future CI loop hits ~30s, we can
shard with `--maxWorkers` or split slow specs. No regression risk today.
Approved.

**Dana (data).** No DB tests yet — the only Supabase-touching helpers
(`listFlags`, `createFlag`, `updateFlagStatus`, `uploadFlagPhoto`) are
out of scope for this install. When we add them later we'll need a
`__mocks__/supabase/` factory (~30 lines), but that's a follow-up. Nothing
about installing jest exposes DB credentials or schema. Approved.

**Shamus (engineering).** The `tsconfig.json` exclude block (`**/__tests__/**`,
`**/*.test.ts`, `**/*.test.tsx`) was a holding pattern. Installing jest +
`@types/jest` lets us drop the exclude — tests get type-checked along with
everything else, which catches drift between a helper and its tests. That's
a quality improvement, not just a cosmetic change. Approved.

### Team decision

Unanimous: install jest, install jest-expo, install @types/jest, add the
config files, drop the tsconfig exclude. This is reversible (`git revert`
+ `npm uninstall`), devDep-only, no runtime impact.

### Action taken

1. Installed `jest@^29.7.0`, `jest-expo@~54.0.0`, `@types/jest@^29.5.12`
   with `--save-dev --legacy-peer-deps`.
2. Added `test`, `test:watch`, `test:ci` scripts to `package.json`.
3. Wrote `jest.config.js` (preset `jest-expo`, `moduleNameMapper` for `@/*`).
4. Wrote `jest.setup.js` with the AsyncStorage shim mock.
5. Dropped `**/__tests__/**`, `**/*.test.ts`, `**/*.test.tsx` from
   `tsconfig.json` exclude.
6. `npm test` — all 8 suites pass.
7. `npm run typecheck` — green.

Committed in one scoped commit.

---

## Decision 2 — Realtime publication for `public.flags`

**Status:** APPROVED by team. SQL FILE committed to main. EXECUTION DEFERRED to Sky.

### Context

The "Realtime flag updates" item is in `FEATURES.md` "Next" and depends on
Supabase realtime broadcasting INSERT/UPDATE/DELETE on `public.flags` to
subscribed clients. By default Supabase only publishes a small set of
tables. To enable it:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.flags;
```

This is the SQL Sky would run in the Supabase dashboard.

### Role-by-role analysis

**Dana (data / schema).** I read `supabase/schema.sql` end to end. The
`public.flags` table has 11 columns: `id, user_id, lat, lng, category,
description, severity, photo_url, status, created_at`. Indexes on
`user_id`, `status`, and `(lat, lng)`. Two triggers
(`handle_flag_status_change`, the points one). RLS is enabled with five
policies. The SQL to enable realtime is one line, idempotent if guarded,
and reversible with `ALTER PUBLICATION supabase_realtime DROP TABLE
public.flags`. I'd wrap it in a `do $$` block that no-ops if the table is
already in the publication so it's safe to re-run. Approved on the schema
side.

**Steve (security / privacy).** This is the load-bearing analysis. Three
questions:

1. **Does Supabase realtime respect RLS?** Yes — per Supabase docs, realtime
   subscriptions go through the same RLS policies as REST when you use
   the supabase-js client with an authenticated session. The
   `realtime.broadcast_changes` path uses an internal role that filters
   rows against `auth.uid()` before delivery. Verified by reading
   policies in the schema: the `flags readable by authenticated` SELECT
   policy is `using (true)` for any authenticated user, which means
   realtime will broadcast every flag insert/update to every signed-in
   client — same exposure as REST `select * from flags`. No new data
   surface.

2. **Does the broadcast leak data REST doesn't?** No. The realtime payload
   contains the same columns the REST API returns. Specifically: `user_id`
   is already visible to any authenticated user via `select` on
   `public.flags`, so seeing it arrive in a realtime delta is identical
   exposure. Realtime *doesn't* widen the surface.

3. **Privacy posture worth thinking about anyway.** `user_id` is already
   public to all authenticated users — that's an existing question for a
   future privacy review (do we want pseudonymous reporting? do we want
   reporter identity gated behind a join with `users.display_name`?). It
   pre-dates this decision. I'm flagging it for a future cycle, not
   blocking this one.

Approved with the caveat above.

**Peter (performance).** At single-digit users the realtime infra load is
nil. Supabase free tier includes 200 concurrent realtime connections; we
won't sniff that for a long time. Approved.

**Alex (a11y).** Realtime updates don't change the screen-reader story
directly. The application-side concern would be: if a new flag pops onto
the Map mid-VoiceOver-read, do we announce it? That's a follow-up UX
question for the eventual client-side wiring (a `useFlags()` subscriber
that calls `AccessibilityInfo.announceForAccessibility`), not a blocker
for the publication SQL. Approved.

### Team decision

Approved unanimously. The SQL is safe to ship as a file in `supabase/`.

But per Sky's standing guidance and orchestrator rule, **live DB writes
remain Sky's button-press**. The team's role is to write the migration as
a versioned file with rollback documented; Sky executes it in the
Supabase SQL editor.

### Action taken

1. Created `supabase/realtime.sql` with:
   - Guarded `ALTER PUBLICATION supabase_realtime ADD TABLE public.flags`
     (no-op if already added).
   - A commented-out rollback (`DROP TABLE public.flags FROM PUBLICATION`).
   - Header comment explaining the team's analysis and Sky's role.
2. Added a "Sky: apply this in the Supabase dashboard" callout to
   `FEATURES.md` under the realtime item.
3. Committed.

### Deferred to Sky

- Run `supabase/realtime.sql` in the Supabase SQL editor (or via
  `supabase db push` if connected). One line, idempotent, ~5 seconds.

---

## Decision 3 — Pin agent `cwd` to worktree path in future parallel runs

**Status:** APPROVED. APPLIED on main.

### Context

Two parallel agents working in their own worktrees still wrote to the
*primary* checkout because absolute `/Users/skypie/AccessMap/...` paths
resolved to the main worktree, not the agent's. One agent's spec commit
landed on the other agent's branch — clean to merge in this case, but a
real footgun on any future parallel run.

The mechanic: `git worktree add` creates an isolated working tree, but
the absolute path `/Users/skypie/AccessMap/` is the *original* checkout,
not the worktree. An agent passed that absolute path will write to the
wrong tree.

### Role-by-role analysis

**Shamus (engineering).** Two parts to the fix:

1. **Document the rule** — anyone spawning parallel agents must pass
   `cwd: <worktree-path>` (absolute path to the worktree, not the project
   root) and the spawned agent must use that path consistently. This goes
   in the existing handoff doc.

2. **Make it harder to footgun** — when an agent's `cwd` is set, it should
   resolve relative paths against that `cwd`, not absolute ones to elsewhere
   on the filesystem. That's an orchestrator-side fix, not in-repo. I can
   note it but it's not something we can land in this commit.

Approved as a doc change.

### Team decision

Land the documentation now. Note the orchestrator-side ask for a future
cycle.

### Action taken

1. Created `qa-reports/parallel-agent-worktree-rules.md` documenting:
   - The footgun (absolute paths resolve to primary checkout).
   - The rule (pass `cwd: <worktree-path>` for each parallel agent).
   - How to verify (`git rev-parse --show-toplevel` from the agent should
     equal the agent's worktree path).
   - The rollback (no rollback needed — doc-only).
2. Added a paragraph at the top of `FEATURES.md` referencing it under a
   new "Process notes" section so it surfaces in the briefing rotation.
3. Committed.

---

## Decision 4 — Dani's `design/auto-2026-05-23` branch

**Status:** PARTIAL MERGE. Docs cherry-picked. Component edits deferred.

### Context

Dani's branch forked from `c357f58` (main as of the FlagsProvider cycle's
start). It has 18 commits ahead of main, but main has moved on with
six features merged. The branch adds new files that don't exist on main:

- `src/theme.ts` (181 lines — design tokens)
- `DESIGN.md` (225 lines — token usage rules and rationale)
- `designs/marker-clustering.md` (146 lines)
- `designs/profile-editing.md` (217 lines)
- `qa-reports/design-2026-05-23.md` (197 lines — design pass report)

And edits to three components:

- `src/components/FlashBanner.tsx`
- `src/components/FlagDetailModal.tsx`
- `src/components/MyReportsModal.tsx`

### Role-by-role analysis

**Dani (design lead).** The token system is the right call. `src/theme.ts`
gives every color a role (`statusOpenBg`, `statusOpenFg`, etc.), every
pairing a WCAG ratio, every spacing/radius/font a name. The `DESIGN.md`
explains *why* each value exists. This is the foundation we need before
the app grows further. The marker-clustering spec is also the foundation
for the "Now" item in FEATURES.md. Approved on the design value.

**Alex (a11y).** Read `src/theme.ts` — every color pairing has a stated
contrast ratio in the comment, all hit WCAG 2.2 AA. The token names
("textStrong", "textMuted", "textSubtle") encode hierarchy in a way the
screen-reader story benefits from later. Dynamic-type readiness isn't
in v1 of this token file, but adding it would be a follow-up to a clean
foundation. Approved.

**Shamus (engineering).** Risk profile:

1. **Pure docs (`DESIGN.md`, `designs/`, `qa-reports/design-2026-05-23.md`)
   and the new file `src/theme.ts`** — additive only, conflict-free with
   current main. Safe to cherry-pick. `theme.ts` isn't imported anywhere
   on main yet, so it lands as dead code until a component opts in, which
   is exactly how a token foundation should land — incrementally.

2. **Component edits to `FlashBanner.tsx`, `FlagDetailModal.tsx`,
   `MyReportsModal.tsx`** — these touch files that have evolved on main
   since Dani branched. Cherry-picking them risks conflicts or, worse,
   silent semantic drift (e.g. Dani's branch tokenized colors before main
   added new color usages elsewhere in the same files).

3. **The competing FlagsProvider impl in Dani's branch** — this is the same
   parallel implementation as `feat/shared-flags-provider-2026-05-23`,
   already superseded by main's surgical merge. Do not pull this in.

Recommend: cherry-pick the additive docs + `theme.ts`; leave the component
edits for a deliberate follow-up cycle where Shamus can audit each diff
against current main and either re-apply by hand or skip if the tokenization
has been overtaken by other work.

### Team decision

Cherry-pick:
- `DESIGN.md`
- `designs/marker-clustering.md`
- `designs/profile-editing.md`
- `qa-reports/design-2026-05-23.md`
- `src/theme.ts`

Do NOT cherry-pick the component edits or any of the FlagsProvider work
on that branch. A future cycle can adopt tokens in components, one
component at a time, with current main as the base.

### Action taken

1. Committed the five files above on main (one commit, "design: import
   tokens + design docs from design/auto-2026-05-23").
2. Ran `npm run typecheck` — green. `theme.ts` is unused but type-clean.
3. Did NOT delete the `design/auto-2026-05-23` branch yet — see Decision 5.

### Follow-up (logged here, not actioned now)

- A future cycle should tokenize `FlashBanner.tsx`, `MyReportsModal.tsx`,
  and `FlagDetailModal.tsx` against current main (not by cherry-picking
  Dani's edits). The design pass report has the exact pairings to use.

---

## Decision 5 — Delete the stray branches

**Status:** DEFERRED, with rationale below. NO deletions made.

### Context — and the surprise that came up

Initial plan was: delete the three fully-merged feature branches
(`feat/distance-eta-2026-05-23`, `feat/persist-map-filters-2026-05-23`,
`feat/saved-filter-sets-2026-05-23`) since they had zero unmerged
commits. Keep the cycle / provider / design branches for audit trail.

When I tried, `git branch -d` refused:

```
error: cannot delete branch 'feat/distance-eta-2026-05-23'
       used by worktree at '/Users/skypie/AccessMap'
error: cannot delete branch 'feat/persist-map-filters-2026-05-23'
       used by worktree at '/Users/skypie/AccessMap/.claude/worktrees/agent-a31117016067fc579'
error: cannot delete branch 'feat/saved-filter-sets-2026-05-23'
       used by worktree at '/Users/skypie/AccessMap/.claude/worktrees/agent-ad415901d487506a9'
```

Two things to know about that:

1. **The primary checkout (`/Users/skypie/AccessMap`) is on
   `feat/distance-eta-2026-05-23`, not `main`.** That's not what I
   expected — the recent commits (FlagsProvider merge, today's Loop
   merges, my own Decisions 1-4) happened entirely inside the worktree
   `/Users/skypie/AccessMap/.claude/worktrees/pm-merges`. The primary
   tree never got switched back to `main`. The working tree there is
   *clean* (commit `636b5de`, which IS on `main` via merge), but the
   branch label is the merged feature branch.

2. **The two agent worktrees are still `locked` by PID 68349 — the
   orchestrator process running this very session.** They were never
   formally cleaned up after the parallel Loops 2 / 4 finished.

### Role-by-role analysis

**Shamus (engineering hygiene).** Three options:

a) `git switch main` in the primary checkout, then delete the three
   feature branches. Risk: another running agent may be reading from
   that worktree right now and a branch switch under them is exactly
   the kind of mid-cycle disruption the parallel-run worktree-rules doc
   (Decision 3) was written to prevent.

b) `git worktree remove --force` the agent worktrees, unlock them,
   then delete. Risk: same as (a) — locked-by-orchestrator means
   *something* might still be there.

c) Defer all deletions to the next pass, when the orchestrator process
   has exited and the worktrees can be cleaned up safely. Document
   what we found.

The directive is "thorough beats fast" and "safety first." Option (c)
costs us six stray branches in `git branch -a` for one more day; (a)
or (b) risks disturbing a sibling agent. The branch count isn't
hurting anyone.

**Steve (security).** No security implication either way. Branches
hold history, not data. Deferring is fine.

### Team decision

Defer ALL branch deletions to a future pass when:

1. The orchestrator process (PID 68349 today) has exited.
2. The primary checkout `/Users/skypie/AccessMap` can be safely
   switched to `main`.
3. The two agent worktrees can be removed cleanly.

The next Morgan (or whoever follows) should run:

```bash
# Verify the orchestrator process is no longer running.
ps -p 68349 || echo "safe to proceed"

# Switch primary checkout to main (after confirming clean tree).
git -C /Users/skypie/AccessMap status
git -C /Users/skypie/AccessMap switch main

# Remove the locked agent worktrees.
git -C /Users/skypie/AccessMap worktree unlock .claude/worktrees/agent-a31117016067fc579
git -C /Users/skypie/AccessMap worktree remove .claude/worktrees/agent-a31117016067fc579
git -C /Users/skypie/AccessMap worktree unlock .claude/worktrees/agent-ad415901d487506a9
git -C /Users/skypie/AccessMap worktree remove .claude/worktrees/agent-ad415901d487506a9

# Now the merged branches will delete cleanly.
git -C /Users/skypie/AccessMap branch -d feat/distance-eta-2026-05-23
git -C /Users/skypie/AccessMap branch -d feat/persist-map-filters-2026-05-23
git -C /Users/skypie/AccessMap branch -d feat/saved-filter-sets-2026-05-23
```

### Action taken

None — deferred, with the cleanup recipe above logged so the next pass
runs it cleanly.

### Branches to revisit later (and when)

- `feat/distance-eta-2026-05-23` — delete after the primary checkout
  is switched off it (see recipe above).
- `feat/persist-map-filters-2026-05-23` — delete after the agent
  worktree `agent-a31...` is removed.
- `feat/saved-filter-sets-2026-05-23` — delete after the agent
  worktree `agent-ad41...` is removed.
- `feat/shared-flags-provider-2026-05-23` — 1 unmerged commit
  (LEARNINGS update). Delete after the next maintainer has read it.
- `cycle/auto-2026-05-23` — audit trail of the role chain. Delete
  in a week.
- `design/auto-2026-05-23` — referenced by Decision 4's follow-up
  tokenization cycle. Delete after that lands.

---

## Summary for Sky

### What landed on main (typecheck green at each step, 108/108 tests pass)

| SHA | Title | Decision |
|---|---|---|
| `829eda7` | test: install Jest + jest-expo so the 8 test suites can actually run | 1 |
| `d68c959` | feat(supabase): realtime publication migration for public.flags | 2 (file only, Sky executes) |
| `156015d` | docs: parallel-agent worktree path rules | 3 |
| `e109d4c` | design: import tokens + design docs from design/auto-2026-05-23 | 4 |

Range: `304398e..e109d4c` on `main`.

### What's deferred to Sky (one button-press each)

1. **Apply `supabase/realtime.sql` in the Supabase dashboard.** Enables
   realtime broadcasts of `public.flags`. Unblocks the "Realtime flag
   updates" feature. Team analysis: same data surface as REST, no new
   exposure (Steve verified RLS coverage). Rollback in the same file.

### What surprised me

- **The primary checkout `/Users/skypie/AccessMap` is on
  `feat/distance-eta-2026-05-23`, not `main`.** Today's work (the
  FlagsProvider surgical merge, the Loop 2 / 4 / 5 merges, and these
  four Morgan commits) all landed via the worktree at
  `.claude/worktrees/pm-merges`. The primary tree label never got
  switched back. Tree contents are identical to a known-good main
  ancestor — but the branch label needs a quiet `git switch main`
  next time the orchestrator isn't running. Recipe in Decision 5.
- **Two agent worktrees are locked by the live orchestrator (PID 68349).**
  Locked-by-PID is how `claude` agents reserve their tree; the locks
  outlive the agents themselves. No harm, but it's why three merged
  branches couldn't be cleanly deleted today.
- The design branch had 18 unmerged commits, but only **5** were
  useful on current main (the docs + theme.ts). The rest either
  duplicate work already on main (the FlagsProvider spec) or are
  implementation that drifted off the main trunk's surgical merge.
- Test files were *checked in but excluded from typecheck* — silently
  rotting. Decision 1 caught this in time; another week and the tests
  might have drifted under refactors. Now they're part of the safety net.
- `feat/shared-flags-provider-2026-05-23` only has 1 unmerged commit,
  not 2. The earlier briefing's count was stale.

---

— Morgan, with Steve, Peter, Alex, Dana, Gary, Dani, Shamus
  on the Claude Corp team for AccessMap, 2026-05-23
