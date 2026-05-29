# AccessMap Worktree Audit — 2026-05-28

**Audit date:** 2026-05-28  
**Auditor:** Archi (Cycle 6-Shadow)  
**Total worktrees:** 16

---

## Summary

All 16 active worktrees are current (≤14 days old per Constitution 10.2). No worktrees flagged for removal. Majority are recent (0–2 days); all branches represent active development or completed feature work.

---

## Worktree Status Table

| Path | Branch | Last Commit | Age (days) | Recommendation |
|---|---|---|---|---|
| `/Users/skypie/AccessMap` | `main` | `b9b91d6 2026-05-28` Merge pull request #10 from Skypie99/release/auto-2026-05-28 | 0 | KEEP |
| `/private/tmp/alex-heatmap-a11y-2026-05-28` | `a11y/heatmap-2026-05-28` | `c797d9f 2026-05-28` perf: add performance baseline for all branches (2026-05-29) | 0 | KEEP |
| `/private/tmp/gary-exif-2026-05-28` | `test/gary-exif-2026-05-28` | `7361873 2026-05-28` test(flags): EXIF strip coverage — verifyExifStripped + native/web fail-safes | 0 | KEEP |
| `/private/tmp/gary-w3-verify` | `test/gary-wave3-2026-05-27` | `b8b44af 2026-05-27` test(tasks): pin category quick-filter + free-text search predicates | 1 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/agitated-archimedes-ff78d5` | `claude/agitated-archimedes-ff78d5` | `bb34d56 2026-05-26` style: run prettier on 8 files flagged by format check | 2 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/angry-bardeen-bdeca4` | `claude/angry-bardeen-bdeca4` | `57be87a 2026-05-25` perf(lists): memoize renderItems + removeClippedSubviews in NearbyFlagsModal, ActivityFeedModal | 2 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/condescending-ardinghelli-f1d7d9` | `claude/condescending-ardinghelli-f1d7d9` | `1459719 2026-05-27` docs(qa): Creative UI Polish report for 2026-05-27 | 0 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/dreamy-clarke-b0883a` | `claude/dreamy-clarke-b0883a` | `97c085f 2026-05-27` design(polish): ProfileScreen hero + ReportFlagModal + LegendModal + map pins | 0 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/dreamy-murdock-8d6903` | `claude/dreamy-murdock-8d6903` | `e8bd013 2026-05-26` Merge feat/recently-viewed-2026-05-25: Recently Viewed flags row in profile | 1 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/eloquent-morse-8339ec` | `claude/eloquent-morse-8339ec` | `e8bd013 2026-05-26` Merge feat/recently-viewed-2026-05-25: Recently Viewed flags row in profile | 1 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/funny-bohr-45d01b` | `claude/funny-bohr-45d01b` | `6c3194b 2026-05-25` docs(qa): Shamus leaderboard build report 2026-05-25 | 2 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/intelligent-merkle-6a7781` | `claude/intelligent-merkle-6a7781` | `57be87a 2026-05-25` perf(lists): memoize renderItems + removeClippedSubviews in NearbyFlagsModal, ActivityFeedModal | 2 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/nervous-ishizaka-01e1c4` | `claude/nervous-ishizaka-01e1c4` | `1459719 2026-05-27` docs(qa): Creative UI Polish report for 2026-05-27 | 0 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/vigorous-ishizaka-e4842e` | `claude/vigorous-ishizaka-e4842e` | `d9e33a4 2026-05-25` docs: AccessMap complete merge guide — CoWork + Cycle 4/5 branches | 2 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/wf_14081e6c-6d9-1` | `worktree-wf_14081e6c-6d9-1` | `b9b91d6 2026-05-28` Merge pull request #10 from Skypie99/release/auto-2026-05-28 | 0 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/wf_14081e6c-6d9-2` | `worktree-wf_14081e6c-6d9-2` | `b9b91d6 2026-05-28` Merge pull request #10 from Skypie99/release/auto-2026-05-28 | 0 | KEEP |
| `/Users/skypie/AccessMap/.claude/worktrees/wf_14081e6c-6d9-3` | `worktree-wf_14081e6c-6d9-3` | `b9b91d6 2026-05-28` Merge pull request #10 from Skypie99/release/auto-2026-05-28 | 0 | KEEP |

---

## Findings

- **All worktrees KEEP.** None exceed 14 days (Constitution 10.2). Latest commit is 2026-05-28 (today); oldest is 2026-05-25 (2 days).
- **9 worktrees at 0 days** (today's work or merged state):
  - Main branch (merged release)
  - 3 /tmp/ worktrees (alex, gary exif, condescending-ardinghelli, dreamy-clarke, nervous-ishizaka, wf_* locked)
- **5 worktrees at 1–2 days** (active feature/perf/docs work): gary-w3-verify, agitated-archimedes, angry-bardeen, funny-bohr, intelligent-merkle, vigorous-ishizaka
- **No stale branches detected.**

---

## Constitutional Compliance (Const. 10.2)

This audit is **read-only**. No worktrees removed. No commits, pushes, or checkouts performed.
