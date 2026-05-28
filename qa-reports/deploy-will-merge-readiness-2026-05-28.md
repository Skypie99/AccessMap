# Task: Will — Full Merge Readiness Audit

**Assigned:** 2026-05-28 by Morgan  
**Deadline:** Friday 2026-05-29 EOD  
**Unblocks:** Merge wave confidence + quality sign-off

---

## Task

Comprehensive audit of all 12+ uncharted branches for merge-readiness:

### Checklist
- [ ] **Merge conflicts** — vs. main + cross-branch dependencies
- [ ] **Code quality** — npm run typecheck + linting rules + test pass
- [ ] **Commit hygiene** — clear messages, follows convention, no debug artifacts
- [ ] **Branch cleanup** — no console.logs, commented-out code, debug branches
- [ ] **Dependencies documented** — if branches depend on D1/D2/D3 SQL, clearly marked
- [ ] **Documentation** — LEARNINGS.md entries for new patterns, inline comments where non-obvious

---

## Output

Create a merge-readiness report:
```markdown
## Merge Readiness Summary

### READY TO MERGE (0 issues)
- feat/notify-flag-status-2026-05-27

### MERGE WITH CAUTION (minor issues)
- design/creative-polish-2026-05-27
  - Issue: Comment on line 142 should be removed before ship
  - Fix: delete or clarify intent

### BLOCKED (unresolved issues)
- fix/sql-cleanup-2026-05-27
  - Issue: Depends on D1 migration (not yet applied)
  - Unblock: Apply D1, then re-test
```

File: `qa-reports/merge-readiness-audit-2026-05-29.md`

---

**Authority:** Constitution Art. 10 (Will domain — merge hygiene)  
**Timeline:** Can execute in parallel with other audits (Will, Quinn, Jordan, Alex, Peter)
