# Project Manager Briefing — 2026-05-24
**Window covered:** Since last cross-project Morgan briefing (decisions-2026-05-23-morgan.md + cycle-1-auth-gate-2026-05-23.md)
**Trigger:** Sky answered some decisions — verifying state and surfacing what's now unblocked.

---

## 0. Five-Section Spine (Const. 9.6)

### 1. Dependency Graph

**nodes:**
- `sky/mutualmesh-schema#apply-dashboard` (Sky, execute)
- `dana/mutualmesh-cycle2#start` (Dana, backend)
- `sky/accessmap-realtime#apply-dashboard` (Sky, execute)
- `sky/accessmap-feedback-table#apply-dashboard` (Sky, execute)
- `sky/accessmap-clustering-deps#approve` (Sky, decision)
- `shamus/accessmap-r7#merge` (Sky, merge)
- `shamus/accessmap-r8#merge` (Sky, merge)
- `shamus/accessmap-r9#merge` (Sky, merge)
- `peter/accessmap-perf-2026-05-24#merge` (Sky, merge)
- `sky/promptlib-n3-cleanup#merge` (Sky, merge)

**edges:**
- `sky/mutualmesh-schema#apply-dashboard → dana/mutualmesh-cycle2#start` (gate: Cycle 2 marketplace data cannot wire until schema exists in Supabase)
- `sky/accessmap-realtime#apply-dashboard → shamus/accessmap-realtime-wiring` (gate: SQL must be live before client subscription can be built)
- `sky/accessmap-clustering-deps#approve → shamus/accessmap-marker-clustering` (gate: dep install requires Sky approval per Const. Art. 1.4)
- `shamus/accessmap-r7#merge, r8#merge, r9#merge` (merge: independent, no ordering required — disjoint file sets per qa-reports/cycle-r7-r9-handoff-2026-05-23.md)

### 2. Reason for Ordering

- **MutualMesh schema first:** Const. Art. 1.3 prohibits agents from applying live DB changes — only Sky can execute. LEARNINGS:2026-05-23 MutualMesh — "schema is a FILE; Sky applies via dashboard." Cycle 2 (Marketplace Feed with real data) is fully gated on this.
- **AccessMap SQL applies before client wiring:** Per qa-reports/decisions-2026-05-23-morgan.md Decision 2, team approved the realtime publication; Steve confirmed RLS is not widened. ASSUMPTION: order of realtime vs feedback-table apply doesn't matter (both idempotent), but both must land before Shamus can build the client subscription.
- **R7/R8/R9 in any order:** Per qa-reports/cycle-r7-r9-handoff-2026-05-23.md, all three branch off the same main HEAD, touch disjoint file sets, all typecheck-green and tests-green. No sequencing required.
- **Prompt Library merge last:** The n3-cleanup branch tip (`ae48607`) contains 20 features + CVE fix + accessibility cleanup. Merging to main is a fast-forward; no conflicts possible (linear history off main). Per Const. Art. 1.2 only Sky merges.

### 3. Blocked Nodes

- `{node: dana/mutualmesh-cycle2, why: supabase/schema.sql not yet applied; tables/RLS/realtime do not exist in any live Supabase project, unblock: Sky executes steps A.1–A.8 in qa-reports/cycle-1-auth-gate-2026-05-23.md, type: DECISION_FOR_SKY}`
- `{node: shamus/accessmap-realtime-wiring, why: supabase/realtime.sql not yet applied; realtime publication for public.flags does not exist, unblock: Sky pastes supabase/realtime.sql into Supabase SQL editor (one idempotent line), type: DECISION_FOR_SKY}`
- `{node: shamus/accessmap-feedback-history, why: supabase/migrations/2026-05-23_feedback_table.sql not yet applied; My Feedback modal shows empty state, unblock: Sky pastes migration into Supabase SQL editor (idempotent; rollback is DROP TABLE public.feedback CASCADE), type: DECISION_FOR_SKY}`
- `{node: shamus/accessmap-marker-clustering, why: react-native-map-clustering + supercluster deps not approved; Steve's review is complete and positive (signed, maintained), unblock: Sky says "approve" and Shamus installs, type: DECISION_FOR_SKY}`

### 4. Checkpoint References

- `{name: mutualmesh-privacy-approved, role: Jordan+Sky, artifact: branch:main#local-no-remote, qa-report: qa-reports/decisions-applied-2026-05-23.md:1}`
- `{name: mutualmesh-cycle1-complete, role: Dana+Shamus+Steve+Alex+Gary+Will+Morgan, artifact: branch:main#local-no-remote, qa-report: qa-reports/cycle-1-auth-gate-2026-05-23.md:1}`
- `{name: accessmap-r4-r6-polished, role: Shamus+Steve+Alex+Gary, artifact: commit:aa9cdaf (merged main), qa-report: qa-reports/qa-r4-r6-2026-05-23.md:1}`
- `{name: accessmap-r7-ready, role: Shamus+Gary, artifact: branch:feat/tasks-sort-2026-05-23#commit:e4e7cb6, qa-report: qa-reports/cycle-r7-r9-handoff-2026-05-23.md:13}`
- `{name: accessmap-r8-ready, role: Shamus, artifact: branch:feat/map-longpress-drop-2026-05-23#commit:0bc2b81, qa-report: qa-reports/cycle-r7-r9-handoff-2026-05-23.md:13}`
- `{name: accessmap-r9-ready, role: Shamus+Gary, artifact: branch:feat/profile-nearest-flag-jump-2026-05-23#commit:1f31d06, qa-report: qa-reports/cycle-r7-r9-handoff-2026-05-23.md:13}`
- `{name: accessmap-perf-2026-05-24, role: Peter, artifact: branch:perf/auto-2026-05-24#commit:ffec5b5, qa-report: qa-reports/perf-sweep-2026-05-23.md (verify line)}`
- `{name: promptlib-n3-cleanup-complete, role: Shamus+Alex+Steve+Peter+Gary+Will, artifact: branch:cycle/auto-2026-05-23-n3-cleanup#commit:ae48607, qa-report: qa-reports/cycle-n3-cleanup-final-2026-05-23.md:1}`

### 5. Duplication Report

No duplications detected this cycle. Prior 7 days of qa-reports across AccessMap, MutualMesh, and Prompt Library surveyed. No role was asked to repeat shipped work. Each agent operated in its own domain lane per Const. Art. 4.

---

## 1. Decisions Needed from You

*(Ordered by value/urgency)*

### MutualMesh — Sky must execute (highest priority)

**A. Apply the Supabase schema (8 steps)** — this is THE blocker for Cycle 2.
Source: `qa-reports/cycle-1-auth-gate-2026-05-23.md` sections A.1–A.8.

Steps at a glance:
1. Dashboard → Extensions → enable `pgcrypto` + `pg_cron`
2. SQL Editor → paste `supabase/schema.sql` → Run
3. SQL Editor → paste `supabase/realtime.sql` → Run
4. Storage → resource-photos → confirm "Public bucket" toggle is OFF
5. Add `.env` (URL + anon key) → `npm start` → sign up via app
6. Promote yourself to admin + set `config.sky_uuid` (SQL in the report)
7. Verify `pg_cron` is running (query in the report)
8. Optional: run RLS test suite against a TEST project first

Once done: kick off Cycle 2 with the prompt in the briefing (Marketplace Feed wired to real data).

**B. City dropdown subset (DFS-C1.2)** — which cities to activate at launch.
Default in code: Toronto, Hamilton, Vancouver, Montréal, Ottawa, Other (all 6 active).
Recommendation: launch with 1 seeded city; comment out the rest. Sky's call on which city.

**C. DFS-C1.1 handle-validator copy** — implemented; await Sky's approve or edit.
Copy: *"Reminder: your handle is public — don't use your real name unless you're choosing to. Try the randomized suggestion if you want privacy."*

---

### AccessMap — Sky button-presses needed

**D. Apply `supabase/realtime.sql`** — one idempotent SQL line.
Unlocks: Realtime flag updates (feature currently stub-guarded in code).
Risk: None — Steve confirmed RLS is not widened; same data surface as REST.
Rollback: `ALTER PUBLICATION supabase_realtime DROP TABLE public.flags;`

**E. Apply `supabase/migrations/2026-05-23_feedback_table.sql`** — idempotent.
Unlocks: My Feedback history in Profile (currently shows empty state).
Rollback: `DROP TABLE public.feedback CASCADE;`

**F. Approve marker clustering deps: `react-native-map-clustering` + `supercluster`**
Steve's analysis: both signed, actively maintained, no new attack surface.
Gary's gate: snapshot test on cluster collapse/expand before merge.
Sky's call: approve → Shamus installs and builds.

**G. Merge R7, R8, R9** — all green, disjoint, ready now.

| Branch | Feature | Tests | Notes |
|---|---|---|---|
| `feat/tasks-sort-2026-05-23` | Tasks screen sort (Newest/Oldest/Severity) | +18 (368 total) | Persists via AsyncStorage |
| `feat/map-longpress-drop-2026-05-23` | Long-press map to drop a flag | 0 new (350 passing) | Pure UI — existing tests cover |
| `feat/profile-nearest-flag-jump-2026-05-23` | Profile: nearest open flag quick-jump | +9 (359 total) | Geo math unit-tested |

Merge order: any. All branch off the same main HEAD, no conflicts.

**H. Merge `perf/auto-2026-05-24`** (Peter's perf sweep, today)
Commits: 4 memoization fixes (activity feed rows, modal lists, nearby flag rows, profile achievements).
All behavior-preserving (Const. Art. 4). TypeScript green. Review and merge if happy.

**I. Branch cleanup (Decision 5, deferred)**
Primary checkout is on `feat/distance-eta-2026-05-23`, not `main`. Two agent worktrees may still be locked. Recipe in `qa-reports/decisions-2026-05-23-morgan.md` Decision 5 — run after confirming no orchestrator process is active.

---

### Prompt Library — merge the night's work

**J. Merge `cycle/auto-2026-05-23-n3-cleanup` into main**
Contains: 20 features (n3 cycle) + Next.js CVE fix (15.1.6 → 15.5.18, 2 moderate CVEs patched) + accessibility cleanup + sweep verifications. All builds green.

```bash
cd "/Users/skypie/Documents/Claude/Projects/Prompt Library Tool"
git checkout main
git merge cycle/auto-2026-05-23-n3-cleanup
```

**K. Vitest wire-up (Gary recommendation, non-blocking)**
One install command unlocks ~270 existing test cases. Gary's prompt in `qa-reports/cycle-n3-final-2026-05-23.md` item 5. Sky's call on timing.

**L. Title maxLength hardening (Steve, non-blocking)**
`maxLength={200}` on `PromptForm.tsx` title input + matching cap in `library.ts`. 5-line fix. Queue for next cycle.

---

## 2. What Sky Answered (Documented)

### MutualMesh — All 22 PRIVACY.md gating items answered ✅
Source: `qa-reports/decisions-applied-2026-05-23.md`

| Items | Result |
|---|---|
| D1–D10 (Jordan's privacy decisions) | ✅ 10/10 approved (D1+D2 edited/strengthened) |
| S1–S8 (Steve's security decisions) | ✅ 8/8 approved |
| Q1–Q4 (open questions) | ✅ 4/4 answered |

**What this unlocked:** Phase 0b gating lifted. Cycle 1 fully executed (Loops 11–20). Schema, types, AuthProvider, 3-step OTP signup, Gate routing, WaitingRoom all built. 91 jest tests green. The app is ready for a live Supabase project.

### AccessMap — 5 team decisions handed off; team resolved 4 ✅
Source: `qa-reports/decisions-2026-05-23-morgan.md`

| Decision | Outcome |
|---|---|
| D1 — Install Jest + jest-expo | ✅ Applied. 8 suites, now 195 tests running. |
| D2 — Realtime SQL publication | ✅ File committed. Sky applies. |
| D3 — Parallel worktree path rules | ✅ Documented. |
| D4 — Dani's design tokens branch | ✅ Docs + theme.ts merged; component edits deferred. |
| D5 — Branch cleanup | ⬜ Deferred (active worktrees). Run recipe when ready. |

**What this unlocked:** Test suite live (was silently rotting). Design token foundation on main. Realtime SQL ready to apply. Worktree safety rules documented.

---

## 3. Status by Project

### MutualMesh
**Health:** 🟡 Waiting on Sky's Supabase dashboard actions.
**What shipped:** Full Cycle 1 (auth gate, schema, OTP signup, Gate routing, WaitingRoom). 91 tests. Build chain green (typecheck + lint + format:check).
**What's open:** Schema not yet in any live Supabase project. App cannot run end-to-end until Sky applies steps A.1–A.8.
**What's next:** Cycle 2 — Marketplace Feed wired to real Supabase (`useResources()` hook + realtime merge). Kickoff prompt in the Cycle 1 briefing.
**Trajectory:** Strong foundation. Privacy-first architecture is solid. Team learned from AccessMap (NativeWind, ESLint, pure helpers, mounted-ref pattern, pagination cap all in from Day 1).

### AccessMap
**Health:** 🟢 Active development, healthy test suite (195 tests / 15 suites).
**What shipped:** R1–R6 + PL1–PL9 (activity feed, update banner, flag search, notification prefs, photo lightbox — all QA'd and polished). F5 (Watched Flags) + F6 (Category quick-cycle). Peter's perf sweep (today).
**What's open:** 3 branches ready to merge (R7/R8/R9). 2 SQL migrations pending apply. Marker clustering pending dep approval. Branch cleanup pending.
**What's proposed (not started):** Full-team planning session (today) ranked 20 items. "Now" window: Profile editing, severity/category legend, system-wide toast, deep-link handler. These are NOT blocked on SQL applies — they can start independently.
**Trajectory:** Strong. The "Now" backlog is the right next focus; SQL applies unlock two features that are already built but stubbed.

### Prompt Library Tool
**Health:** 🟡 20 features + CVE fix on a branch; one merge away from being current.
**What shipped:** n3 cycle (20 features) + cleanup (CVE patch, accessibility fixes, sweep verifications) — all on `cycle/auto-2026-05-23-n3-cleanup`.
**What's open:** Branch not yet merged to main. Vitest wire-up deferred. maxLength hardening deferred.
**Trajectory:** Good. The CVE fix landing alongside features is the right call — no need to track separately. Once merged, the project is current and the test infrastructure (Vitest) is the next leverage point.

---

## 4. What the Team Has Been Doing

**Shamus (Feature Dev):** Built MutualMesh Cycle 1 screens (Splash, SignIn 3-step OTP, CompleteProfile, WaitingRoom, Gate) + handle helpers. AccessMap R7/R8/R9 features. Prompt Library n3 cycle (20 features).

**Steve (Security):** MutualMesh Cycle 1 RLS test suite (12+ PASS assertions, 8 scenarios). Q4 inactive-admin policy draft. AccessMap realtime RLS analysis (no new exposure). Approved dep analysis for marker clustering.

**Alex (Accessibility):** MutualMesh Cycle 1 a11y audit (11 WCAG 2.2 AA criteria, all ✅). AccessMap R4-R6 a11y pass (4 majors fixed in PL7-PL9). Prompt Library n3 sweep (5 advisory items, 3 applied).

**Gary (QA):** MutualMesh Cycle 1 gate state-machine tests (+10 tests, 91 total). AccessMap QA R1-R6 (350 tests). R7/R9 new tests.

**Dana (Backend):** MutualMesh schema.sql (576 lines: 6 tables, 7 RPCs, 4 triggers, RLS, Storage RLS, pg_cron schedule). Realtime.sql.

**Will (Docs):** MutualMesh Cycle 1 CLAUDE.md + LEARNINGS.md. AccessMap docs.

**Peter (Performance):** AccessMap perf sweep today — 4 memoization wins (activity feed, modal lists, nearby rows, profile derivations). On branch `perf/auto-2026-05-24`.

**Morgan (PM):** AccessMap team decision pass (D1-D4 applied, D5 deferred). AccessMap full-team planning session (today, 12 feature brainstorm + prioritized backlog).

---

## 5. Cross-Cutting Insights

**Decision backlog is healthy but needs a clearance pass.** Sky has 12 actions outstanding (A–L above). The ones with the highest unlock-ratio are: MutualMesh schema apply (unblocks Cycle 2 entirely) and AccessMap R7/R8/R9 merge (zero risk, three features waiting).

**MutualMesh is the most time-sensitive project.** Cycle 1 is done and the team is idle, waiting for a live Supabase project to exist. The longer the schema sits unapplied, the more time-pressure accumulates before Cycle 2.

**AccessMap is the most active.** 195 tests, 50+ features shipped, a full-team roadmap now exists. The planning session was a valuable forcing function — the team now knows exactly what "Next" and "Later" mean, which means Shamus won't build the wrong thing.

**Prompt Library is feature-rich and stable.** The n3 cycle added 20 more features; the CVE patch is a bonus. One merge completes it.

**Worktree hygiene: primary AccessMap checkout still on a feature branch.** Not urgent, but `git switch main` should happen before the next orchestrator run, or it'll confuse the next agent.

---

## 6. What Each Role Recommends Next

**Dana:** Write `supabase/schema.sql` Cycle 2 additions when Sky applies the Cycle 1 schema. Nothing to do until then.

**Steve:** Draft `PRIVACY-AI.md` covering EXIF stripping, audio metadata, model hosting, retention, opt-out for AI Photo-to-Category and Voice-First Reporting (Planning session item #2).

**Alex:** Plan partner-user test program for Spatial Audio Walking Mode (national org recruitment). Design "Still There?" non-spatial badge on Tasks tab.

**Gary:** Set up component-test harness (Testing Library for RN) + CI rule: new screens require ≥1 integration test before merge (Planning session item #5).

**Peter:** Spike routing-engine comparison (OSRM vs Mapbox vs Google) with cost-at-1000-users and license summary, before route-planning build starts.

**Shamus:** AccessMap — Profile editing, severity/category legend, system-wide toast pattern, deep-link handler (Now window from planning session). None are blocked on SQL applies.

**Quinn:** Pressure-test Part 3 design decisions from the planning session (avatar source, a11y prefs location, legend placement, toast pattern).

---

## 7. Learnings Digest

From LEARNINGS.md (MutualMesh, AccessMap) — notable durable patterns:
- **Pure Gate routing** — `decideGateRoute` is a pure function; 10 gate-state tests with no mocks. Pattern validated in both AccessMap and MutualMesh.
- **Pending-handle convention** — `handle_new_user` writes `pending-XXX`, not email-local-part. Signup step 3 overrides. No real name ever touches the DB automatically.
- **Security-definer RPCs bypass RLS safely** — all state-mutating ops (claim, approve, delete-account) use RPCs, never direct client UPDATE. This is load-bearing.
- **Mounted-ref pattern on all async screens** — every `await → setState` chain guards via mounted ref. Prevents setState on unmounted component during navigation.
- **Per-user AsyncStorage keys** — `@accessmap/<feature>_v1:{userId}` pattern prevents cross-user leakage on shared devices.
- **Worktree agent cwd must be the worktree path** — not the project root. Absolute paths resolve to primary checkout. Documented in `qa-reports/parallel-agent-worktree-rules.md`.

---

## 8. Data Notes

- **MutualMesh has no git remote** — all work is local. No `git push` has been run. The initial commit (`debb399`) is local only.
- **Prompt Library git log** was read from current HEAD (`cycle/auto-2026-05-23-n3-cleanup`) — `--merged HEAD` was used, not `--merged main`. Main state not directly verified; recommend a `git log main..HEAD --oneline` before merging to confirm commit count.
- **Pac-Man Code Trainer** — no qa-reports directory found. No activity in this window to report.
- **AI Portfolio** — no qa-reports directory found. No activity in this window to report.
- **AccessMap unmerged branch list** contains stale worktree-agent branches (`worktree-agent-a31117016067fc579`) — these are locks from prior orchestrator runs, per Decision 5.

---

*Morgan — 2026-05-24 · Mode: direct /morgan invocation*
