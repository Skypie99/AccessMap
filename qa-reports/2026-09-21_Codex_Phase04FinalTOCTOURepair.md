# Codex Phase 04 final TOCTOU repair

Branch `codex/flagstone-phase04-integration-20260921` in `/Users/skypie/AccessMap-worktrees/flagstone-p04-integration-20260921`. Starting SHA `ea5d98e152540eca4dbce10a0a12090cdd64d13d` / tree `3cd45c8d4a20eb261e8726fe485cd9eedbb84877`. The repair commit is the branch HEAD after this report is committed.

Sky approved D-04A-4: disable client flag deletion for every flag. `deleteFlag()` now immediately throws a typed capability error, closing the photo-check-to-row-delete race without backend changes. The full changed-file list, exact commands and outputs, 5/5 killed mutation evidence, finding statuses, and remaining decisions are in [the Phase 04 repair handoff](phase04/20260922T043000Z-d04a4-final-repair/HANDOFF.md). The prior integrated candidate receipt remains intact as historical evidence.

Gates: focused 21/21 suites and 474/474 tests; Phase 03C 208/208; Phase 03B rollback/reapply PASS; typecheck PASS; lint 0 errors with the same 90 warnings; full Jest 299/299 suites, 4,470 passed, 32 todo, 0 failed. Accepted 04B source/test files are byte-identical. No production or staging contact, deployment, push, or primary checkout write occurred.

## DECISIONS FOR SKY

- **Final independent acceptance:** Recommendation: review the exact local repair commit and tree independently before Sky's merge/push decision. Reason: these are author-side gates. Alternative: keep the branch local. Impact: Phase 04 remains an unshipped candidate.
- **Future deletion contract and FDA-004 live proof:** Recommendation: defer both to separately authorized phases. Reason: Phase 04 has neither an atomic backend deletion contract nor live FDA-004 proof. Alternative: keep those capabilities unavailable/open. Impact: no backend or deployed-runtime claim is made here.
