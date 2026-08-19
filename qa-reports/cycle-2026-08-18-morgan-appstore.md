---
role: Morgan (PM)
project: Flagstone (~/AccessMap)
date: 2026-08-18
mode: ACTIVE (direct /morgan)
delivery: in-session (iMessage disabled by Sky override 2026-05-28)
model_tier: Opus (Sky-initiated, direct invocation)
source: qa-reports/2026-08-18_AppStore_Readiness_Audit.md
coherence_score: 0.86
state_consistency: fail
duplicate_work_detected: yes
drift_risk: medium
---

# Morgan — App Store Readiness Briefing

## §1 Dependency Graph

nodes:
- `rory/b1-remove-sentry#merge` (Rory, conflict-resolve + merge)
- `gary/b1-remove-sentry#gate` (Gary, typecheck + jest)
- `dana/b2-seed#author` (Dana, write propose-only seed SQL)
- `steve/b2-seed#review` (Steve, SQL safety review)
- `sky/b2-seed#apply` (Sky, run in Supabase — agents forbidden)
- `jordan/b3-blocking#phase0` (Jordan, privacy gate)
- `shamus/b3-blocking#build` (Shamus, build block control)
- `alex/b3-blocking#a11y` (Alex, WCAG on new control)
- `gary/b3-blocking#gate` (Gary, typecheck + jest)
- `will/s1-reviewer-notes#docs` (Will, rewrite three sentences)
- `shamus/s2-guestmode#fix` (Shamus, one-line latch reset)
- `shamus/s3-displayname#filter` (Shamus, moderation call on display_name)
- `peter/s19-leaderboard#fix` (Peter, select('*') → select('id'))
- `rory/cred-purge#merge` (Rory, merge guard test main lacks)
- `sky/u1-eas-env#verify` (Sky, `eas env:list` — agents cannot run EAS)
- `morgan/housekeeping#qa-index` (Morgan, refresh 3-month-stale INDEX.md)

edges:
- `rory/b1-remove-sentry#merge` → `gary/b1-remove-sentry#gate` (gate: typecheck + jest green)
- `jordan/b3-blocking#phase0` → `shamus/b3-blocking#build` (gate: privacy approval, Const. 7.6)
- `shamus/b3-blocking#build` → `alex/b3-blocking#a11y` (gate: control renders)
- `alex/b3-blocking#a11y` → `gary/b3-blocking#gate` (gate: WCAG 2.2 AA pass)
- `dana/b2-seed#author` → `steve/b2-seed#review` (gate: SQL safety sign-off)
- `steve/b2-seed#review` → `sky/b2-seed#apply` (gate: Sky executes — Const. Art. 1, no agent touches a live DB)
- `sky/u1-eas-env#verify` → `sky/eas-build#submit` (gate: both EXPO_PUBLIC_SUPABASE_* present)
- `gary/b1-remove-sentry#gate` → `sky/eas-build#submit` (gate: B1 cleared)
- `gary/b3-blocking#gate` → `sky/eas-build#submit` (gate: B3 cleared)

## §2 Reason for Ordering

- **B1 first because it is already written.** `fix/remove-sentry` (3 commits off merge-base `8cdd6437`) already deletes `src/lib/sentry.ts`, `docs/SENTRY_SETUP.md`, and strips the crash-report / usage-analytics / Sentry claims from `docs/privacy/index.html`. Verified by diff, not by the branch name. Source: `qa-reports/2026-08-18_AppStore_Readiness_Audit.md` §B1.
- **B1 needs Rory, not Shamus,** because the merge conflicts. `git merge-tree main fix/remove-sentry` reports CONFLICT in `src/lib/__tests__/createAnonFlag.test.ts`, and the auto-merged `src/lib/flags.ts` contains a **duplicate** `containsBlockedTerm` call at lines 1777 **and** 1786. Cites LEARNINGS:2026-05-25 — *Parallel merge paths silently drop commits* and LEARNINGS:2026-05-25 — *Sequential merge/build discipline*.
- **B2 is Sky-only by Constitution, not by preference.** Const. Art. 1: *"Never apply anything to a live database."* Agents author the SQL as a file; Sky runs it. Cites LEARNINGS:2026-05-23 — *Propose-only migrations under `supabase/migrations/`*.
- **Jordan gates B3 before Shamus builds** (Const. Art. 7.6). Trigger fired: **new data persistence** (a block list) + **PII beyond auth** (author identity linkage). `src/lib/hiddenContent.ts:18-23` states server-side storage of this list *"would create exactly the user↔content linkage Jordan's hard condition refuses elsewhere in this codebase."* That is a live constraint on the design, not a note.
- **B3 scoped to comments only** because flags never display an author — `FlagDetailModal.tsx:1241-1257` renders only "You" / "Another community member" / "Anonymous". Comments are the sole surface with a visible `display_name`. Scoping there is what makes this half a day instead of a week. Source: audit §B3.
- **S3 (display_name filter) is a moderation-policy change**, which `src/lib/reports.ts:11-17` reserves to Sky. Precedent exists: Sky ruled YES on the identical class for anonymous flags, shipped as `189bf5a`. Treated as pre-decided by precedent, flagged in §3 for a one-word override.
- **Parallel work must be worktree-isolated.** Cites LEARNINGS:2026-05-24 — *Worktree isolation can silently collapse to one branch* and LEARNINGS:2026-05-28 — *Worktree node_modules must be symlinked for npm/jest to work*, plus LEARNINGS:2026-05-23 — *Jest must ignore `.claude/worktrees/`*.
- **Reviewer-password rotation is DOWNGRADED from blocking.** The audit verified guest browsing is real (`App.tsx:147`, `SignInScreen.tsx:283`) and the shipped notes are credential-agnostic. Apple's demo-account rule binds only when the app *requires* login. Supersedes `TASK_GRAPH.json#sky-rotate-reviewer-pw` priority and `PROJECT_STATE.md` "Open Risks".

## §3 Blocked Nodes

- `{node: sky/b2-seed#apply, why: Const. Art. 1 forbids any agent applying anything to a live database, unblock: Sky runs the seed SQL in the Supabase SQL editor, type: DECISION_FOR_SKY}`
- `{node: sky/u1-eas-env#verify, why: agents cannot run EAS CLI (TASK_GRAPH.json#sky-eas-build), unblock: Sky runs `eas env:list --environment production`, type: DECISION_FOR_SKY}`
- `{node: rory/b1-remove-sentry#merge, why: Const. Art. 1 reserves merges to main to Sky; standing "ship it always" directive (2026-06-03) may already cover it, unblock: Sky confirms the standing merge authorization applies to this batch, type: DECISION_FOR_SKY}`
- `{node: shamus/s3-displayname#filter, why: moderation-policy change reserved to Sky per src/lib/reports.ts:11-17, unblock: Sky says yes (precedent 189bf5a suggests yes), type: DECISION_FOR_SKY}`
- `{node: jordan/b3-blocking#phase0, why: Const. Art. 7.6 trigger — new data persistence + author-identity linkage, unblock: Jordan APPROVE or APPROVE-WITH-CONDITIONS, type: BLOCKER}`

## §4 Checkpoint References

- `{name: appstore-audit-verified, role: Morgan/audit-fanout, artifact: commit:189bf5a (working tree), qa-report: qa-reports/2026-08-18_AppStore_Readiness_Audit.md:1}`
- `{name: b1-fix-authored, role: unattributed prior session, artifact: branch:fix/remove-sentry#commit:291ada5 + c1e0718, qa-report: qa-reports/2026-08-18_AppStore_Readiness_Audit.md:24}`
- `{name: anon-filter-shipped, role: prior session, artifact: commit:189bf5a, qa-report: qa-reports/2026-08-18_AppStore_Readiness_Audit.md:169}`
- `{name: cred-purge-guard, role: Steve, artifact: branch:security/reviewer-cred-purge#commit:ae38d0a, qa-report: qa-reports/2026-08-13_Steve_ReviewerCredPurge.md:1}`
- `{name: admin-gate-applied-live, role: prior session, artifact: commit:0dc33af, qa-report: design-reviews/device-fixes/2026-08-18/04_CLOSEOUT.md:177}`

## §5 Duplication Report

- `{agents: [fix/remove-sentry#f417841, main#189bf5a], overlap: both independently implement the anonymous-report content filter in createAnonFlag — merged tree facd06f4 shows containsBlockedTerm called TWICE at src/lib/flags.ts:1777 and :1786, plus a hard CONFLICT in src/lib/__tests__/createAnonFlag.test.ts, resolution: main's 189bf5a KEEPS; Rory drops the branch's f417841 hunk during conflict resolution and takes main's test file}`
- `{agents: [security/reviewer-cred-purge, main], overlap: docs/APP_STORE_REVIEWER_NOTES.md redaction already present on main, resolution: branch STANDS DOWN on the doc; merge retained solely for src/__tests__/noCredentialsInTree.guard.test.ts, which main does not have}`

## §6 State Snapshot

**Live state vs. tracking docs — three of four are stale. This is the `state_consistency: fail`.**

| Doc | Claim | Reality |
|---|---|---|
| `APP_STORE_TODO.md` §0.1 | reviewer creds live in tree, must purge | **Stale** — tree clean since 2026-08-13 |
| `APP_STORE_TODO.md` §0.2 | anon filter hole open, Sky must decide | **Stale** — shipped `189bf5a` |
| `APP_STORE_TODO.md` §0.3/§0.4 | Terms sentence wrong, versions disagree | **Stale** — fixed `135a4ec`, `8855adf` |
| `PROJECT_STATE.md` | pins main `45bca1a`, self-flagged ARCHIVED | **Stale** — main is `189bf5a` |
| `qa-reports/INDEX.md` | last updated 2026-05-28 | **Stale by ~3 months** |
| `TASK_GRAPH.json` | rotate-reviewer-pw = blocking | **Downgraded** — guest mode removes the demo-account requirement |

- main: `189bf5a`, == `origin/main`. Working tree: clean of tracked modifications; 2 new untracked qa-reports (this file + the audit).
- Unmerged branches: 7. Two are live-relevant (`fix/remove-sentry`, `security/reviewer-cred-purge`); `fix/tasksflagcard-date-flake` and `fix/noscript-fallback` were previously marked for deletion (would delete 6 live tests / 225 commits behind).
- Live backend `kldlwszpfkdmsjrjhjym`: 13 tables, RLS on all, `delete-account` edge fn deployed + ACTIVE, 0 security-ERROR advisors, **0 open + 0 verified flags**.

## §7 Execution Plan Summary

- **Phases:** P0 Jordan gate · P1 parallel fixes · P2 Sky-only live actions · P3 EAS build.
- **Classification:** 16 total · **9 READY** · 2 LOCKED (awaiting upstream gate) · 5 BLOCKED (4 DECISION_FOR_SKY, 1 Jordan gate).
- **Critical path:** `jordan/b3#phase0 → shamus/b3#build → alex/b3#a11y → gary/b3#gate → sky/eas-build#submit`. B3 is the only item requiring a new binary; it sets the floor at ~half a day of agent time.
- **Parallelizable group A (no Sky input needed):** `will/s1`, `shamus/s2`, `peter/s19`, `dana/b2-seed#author`, `morgan/housekeeping`.
- **Parallelizable group B (after one Sky yes):** `rory/b1#merge`, `rory/cred-purge#merge`, `shamus/s3`.
- **BACKGROUND constraints:** N/A — ACTIVE mode, Sky-initiated.
- **acyclic:** true.

## §8 Learnings Digest

- LEARNINGS:2026-05-25 — *Parallel merge paths silently drop commits* — proven again this cycle: the anon filter got written twice because a branch sat unmerged while main solved the same problem.
- LEARNINGS:2026-05-23 — *Propose-only migrations under `supabase/migrations/`* — the pattern that keeps B2 safe.
- LEARNINGS:2026-05-23 — *Nominatim geocoder needs a User-Agent* — the same integration is now a **disclosure** gap (audit S11), not a functional one.
- **NEW (candidate for LEARNINGS.md):** *A stale in-repo code comment is as dangerous as a stale doc.* The audit's first pass declared the admin gate broken on the strength of a comment at `src/lib/admin.ts:35-42` that a live DB probe disproved. Verify comments against runtime state, not just docs against code.
