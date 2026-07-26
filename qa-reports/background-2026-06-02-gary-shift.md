# Gary QA Health Scan — Background Shift
**Date:** 2026-06-02  
**Mode:** BACKGROUND / AUDIT-ONLY  
**Scope:** AccessMap (`~/AccessMap`, branch: main)

---

## TSC Status

**✅ 0 errors** — `npx tsc --noEmit` completed with no output (clean exit).

---

## Jest Test Results

**✅ PASS — 1564 tests passed, 0 failed**

```
Test Suites: 95 passed, 95 total
Tests:       136 todo, 1564 passed, 1700 total
Snapshots:   0 total
Time:        4.506 s
```

Counts match the 2026-06-02 Final QA Merge Report baseline exactly (1564 / 95). No regression.

---

## Last 3 QA Report Scan

Files reviewed:
1. `2026-06-02_Final_QA_Merge_Report.md`
2. `2026-06-01_Performance_QA_Report.md`
3. `2026-06-01_Accessibility_UX_QA_Report.md`

**No new regressions found.** Key notes from reports:

- **Final QA Merge (2026-06-02):** Baseline locked at 1564 passed / 95 suites / 0 TSC errors. A transient 5-test `pushPermission` failure was noted and traced to `expo export` side-effects during testing — not a real regression; confirmed isolated.
- **Perf QA (2026-06-01):** Clean pass noted at time of merge.
- **A11y QA (2026-06-01):** 94 suites / 1553 tests at time of that report (11 new regression assertions were added in the final merge; current 1564 count is consistent with that delta).

**Open known items (not regressions, carry-forwards from prior reports):**
- Sign-up error alert title reads "Couldn't sign you in" instead of "Couldn't create your account" — flagged in Final Merge Report as a known low-priority cosmetic issue.
- ESLint v9 pinned — lint run not included in this scan (lint is broken on Sonnet/ESLint v10 per project CLAUDE.md; Gary does not fix, only notes).

---

## Summary

| Check | Status |
|---|---|
| TSC | ✅ 0 errors |
| Jest | ✅ 1564 passed / 0 failed / 95 suites |
| Regressions vs baseline | ✅ None |

**Overall: GREEN.** Main branch is stable. No action required.

---

*Gary — BACKGROUND mode. AUDIT-ONLY. No code modified, no commits, no external sends.*
