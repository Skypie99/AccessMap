# Morgan cycle — AccessMap expressive-overhaul momentum (2026-06-17)

```yaml
model_tier: opus (Sky-initiated, interactive)
coherence_score: 0.93
state_consistency: pass
duplicate_work_detected: no
drift_risk: low
mode: direct /morgan (delivered in-chat; iMessage offered, not auto-sent — Sky live in session)
```

## §1 Dependency Graph
nodes:
- jordan/fence-5-photos#privacy-review (Jordan, review)
- jordan/fence-7-voice#privacy-review (Jordan, review)
- jordan/fence-8-leaderboard#privacy-review (Jordan, review)
- gary/overhaul-feature-tests (Gary, test — lock the 6 new features)
- gary/dynamic-type-ci-snapshot (Gary, test — render primitives @1.8×, flag overflow)
- review/overhaul-branch-adversarial (Steve+Gary, review — compensates for no device)
- dani/visual-enforcement-sweep (Dani/Shamus, build — token+comment hygiene, elevation doc, more GlassSurface)
- dana/fence-8-schema (Dana+Steve, design — points-period columns/trigger, FILE-only)
- shamus/fence-5-build (Shamus, build — after Jordan)
edges:
- gary/overhaul-feature-tests → (none; READY now, no device needed)
- gary/dynamic-type-ci-snapshot → (none; READY now)
- review/overhaul-branch-adversarial → gary/overhaul-feature-tests (gate: tests green)
- shamus/fence-5-build → jordan/fence-5-photos#privacy-review (gate: Jordan APPROVE)
- dana/fence-8-schema → jordan/fence-8-leaderboard#privacy-review (gate: Jordan + Sky ethics)
- dani/visual-enforcement-sweep → (none; READY now)

## §2 Reason for Ordering
- **No-device constraint → shift-left verification is the spine.** With EAS/device off the table, the eye-verification gate is gone; compensate by maximizing automated verification BEFORE merge. Cites LEARNINGS:2026-05-?? — `numberOfLines={2}` banner pattern (LEARNINGS.md:613): layout-at-scale bugs are caught by explicit constraints + tests, not by eyeballing. → prioritize gary/* + review/* nodes.
- **Jordan Phase-0 on all 3 fence features (Const. Art. 7.6).** Triggers fire: #5 photos = location data (EXIF/GPS) + new persistence (junction) + PII; #7 voice = external API sending user audio + new permission; #8 leaderboard = new data persistence. ALL require Jordan review BEFORE Shamus/Dana build.
- **Migrations are FILES (Const. Art. 5).** dana/fence-8-schema produces a migration file + rollback, never applied to live DB.
- **READY-now nodes need no Sky decision** (tests, CI snapshot, visual hygiene) — keep momentum without blocking on the fence calls.

## §3 Blocked Nodes
- {node: shamus/fence-5-build, why: privacy + Sky go/no-go on touching photo-upload/EXIF path, unblock: Jordan APPROVE + Sky "yes", type: DECISION_FOR_SKY}
- {node: dana/fence-8-schema, why: weekly-leaderboard ethics is a product/values call + backend, unblock: Sky ethics decision + Jordan review, type: DECISION_FOR_SKY}
- {node: jordan/fence-7-voice, why: mic permission + audio leaves device — privacy posture decision, unblock: Sky priority signal (recommend PARK), type: DECISION_FOR_SKY}

## §4 Checkpoint References
- {name: overhaul-branch, role: multi, artifact: branch:ui/expressive-overhaul-2026-06-17 (12 commits), qa-report: qa-reports/2026-06-17_AccessMap_Creative_UIUX_Audit.md}
- {name: fence-proposals, role: workflow, artifact: commit:9c57748, qa-report: qa-reports/2026-06-17_AccessMap_FenceFeature_Proposals.md}
- {name: features-verified, role: gary-equiv, artifact: full suite 103 suites/1680 passed @ each commit, qa-report: this file}

## §5 Duplication Report
No duplications detected this cycle. (One avoided: #4 swipe-to-triage was CUT pre-build — would have duplicated TasksScreen's existing inline Verify/Resolve/Reject buttons.)

## §6 STATE SNAPSHOT
PROJECT_STATE.md updated this session (commit 9c57748). Branch ui/expressive-overhaul-2026-06-17 = 12 commits, NOT merged, code-verified-not-eye-verified. Next-cycle pending: 3 Jordan privacy reviews, 2 Gary test nodes, 1 Dani hygiene node, 1 adversarial review.

## §7 Execution Plan Summary
- READY now (no device, no Sky decision): gary/overhaul-feature-tests · gary/dynamic-type-ci-snapshot · dani/visual-enforcement-sweep · review/overhaul-branch-adversarial (after tests).
- LOCKED on Sky: shamus/fence-5-build · dana/fence-8-schema · jordan/fence-7-voice.
- Critical path to "merge-confident": feature-tests → adversarial-review → Sky merge decision.
- Parallelizable: the 4 READY nodes run independently.
- Housekeeping: 31 branches unmerged into main + stale `.claude/worktrees/*` causing jest-haste-map collisions → flag for cleanup (Const. 10.2).
- acyclic: true.

## Housekeeping flag
`.claude/worktrees/` holds ≥6 stale agent worktrees (beautiful-kalam, determined-wescoff, peaceful-solomon, unruffled-visvesvaraya, qa-peter-perf, …) producing `jest-haste-map: duplicate manual mock` + `Haste module naming collision: accessmap` noise on every test run. Safe to prune (Const. 10.2 housekeeping authority) — recommend Sky/Rory clear them.
