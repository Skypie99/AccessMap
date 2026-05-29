# Ready-to-Send Dispatch Messages — Copy & Paste

**For Sky to relay to team immediately.**

---

## TO: Will

**Subject:** Assignment: Full Merge Readiness Audit (45 min, Friday EOD)

You're approved for a comprehensive merge readiness audit of our 12+ uncharted branches from the last merge cycle.

**Your task:** Check all branches for merge readiness across six dimensions:
1. Merge conflicts (vs. main and cross-branch dependencies)
2. Code quality (typecheck passes, linting, tests clean)
3. Commit hygiene (clear messages, follows convention)
4. Branch cleanup (no console.logs, debug code, or commented-out logic)
5. Dependencies documented (if any branch depends on D1/D2/D3 SQL, mark it clearly)
6. Documentation (LEARNINGS.md entries added, non-obvious logic has inline comments)

**Deadline:** Friday 2026-05-29 EOD

**Deliverable:** Create `qa-reports/merge-readiness-audit-2026-05-29.md` with:
- READY TO MERGE (0 issues) — list branches
- MERGE WITH CAUTION (minor issues) — branch + issue + fix
- BLOCKED (unresolved issues) — branch + blocker + unblock path

**Full spec:** `qa-reports/deploy-will-merge-readiness-2026-05-28.md`

This unblocks our merge wave Friday morning. Thanks.

---

## TO: Quinn

**Subject:** Assignment: Feature Priority + Product Readiness (40 min, Friday EOD)

You're approved to assess the product readiness of all 12+ uncharted branches from the last build cycle.

**Your task:** For each branch, evaluate:
1. **Feature complete?** Does this meet MVP definition? Core flow working?
2. **Solves user problem?** Product fit check — does this address a real need?
3. **Edge cases handled?** Battle-tested or needs more work?
4. **Merge priority** — which features ship first to maximize user value?
5. **Rollout strategy** — gradual rollout, beta flag, or full ship?
6. **Metrics ready?** Can we measure impact post-launch?

**Deadline:** Friday 2026-05-29 EOD

**Deliverable:** Create `qa-reports/product-readiness-report-2026-05-29.md` with:
- Priority ranking (SHIP IMMEDIATELY / SHIP WEEK 1 / SHIP WEEK 2 / HOLD)
- Rationale for each (why this priority)
- Rollout strategy notes

**Full spec:** `qa-reports/deploy-quinn-product-readiness-2026-05-28.md`

This determines our ship sequence Friday morning. Thanks.

---

## TO: Jordan

**Subject:** Assignment: Privacy + Data Audit (45 min, Friday EOD)

You're approved for a privacy and data compliance audit of all 12+ uncharted branches.

**Your task:** Audit each branch for:
1. **Location data** — any new tracking? User consent clear? Retention policy defined?
2. **PII storage** — any new PII persisted? Storage method safe? Sign-out cleanup wired?
3. **EXIF/metadata** — photo branches stripping GPS? Thumbnails safe?
4. **Disability data** — a11y branches handling preference data securely? Opt-in vs opt-out?
5. **Consent flows** — new prompts needed? Privacy policy in sync? GDPR ready?

**Deadline:** Friday 2026-05-29 EOD

**Deliverable:** Create `qa-reports/privacy-audit-report-2026-05-29.md` with:
- ✅ PASS (no compliance issues)
- ⚠️ CONDITIONAL PASS (minor updates needed)
- 🚫 BLOCKED (privacy violations)
- Action items for team

**Authority:** Constitution Art. 7.6 (mandatory privacy gate)

**Full spec:** `qa-reports/deploy-jordan-privacy-audit-2026-05-28.md`

This is our compliance sign-off before merge. Thanks.

---

## TO: Alex

**Subject:** Assignment: Comprehensive A11y Audit (60 min, Friday EOD or later)

You're approved for an accessibility audit of all 12+ uncharted branches for WCAG 2.1 AA compliance.

**Your task:** Check each branch for:
1. **Visual design** — color contrast ≥4.5:1, focus states visible, 44pt touch targets, text resizing works
2. **Screen reader** — semantic HTML, aria-labels, form labels associated, decorative content marked
3. **Keyboard navigation** — tab order logical, no traps, all interactive elements reachable
4. **Regressions** — compare to baseline, track any new a11y debt introduced

**Deadline:** Friday 2026-05-29 EOD (or later if needed — less critical than other audits)

**Deliverable:** Create `qa-reports/a11y-audit-report-2026-05-29.md` with:
- ✅ WCAG 2.1 AA PASS (compliant branches)
- ⚠️ MINOR ISSUES (fix before ship)
- 🚫 REGRESSION DETECTED (if any)
- Action items + timeline

**Full spec:** `qa-reports/deploy-alex-a11y-audit-2026-05-28.md`

This prevents a11y regressions before ship. Thanks.

---

## TO: Peter

**Subject:** Assignment: Performance Baseline Audit (50 min, flexible)

You're approved for performance profiling of all 12+ uncharted branches.

**Your task:** Run performance tests on each branch:
1. **Bundle size delta** — any significant increases vs. main?
2. **Render time regression** — does map or list slow down?
3. **Memory leaks** — AsyncStorage cleanup? Subscriptions unsubscribed?
4. **Network waterfall** — requests faster or slower?
5. **Baseline metrics** — capture numbers for rollout comparison

**Deadline:** Friday 2026-05-29 (or flexible — this is optional but valuable)

**Deliverable:** Create `qa-reports/performance-baseline-2026-05-29.md` with:
- Bundle size comparison
- Render time baseline
- Memory profile
- Network metrics
- Recommendation: ship as-is, monitor, or optimize

**Authority:** Const. 9.4 (performance expert)

This gives us early-warning system + baseline for post-launch. Thanks.

---

## For Sky

Ready to send. Copy each message above → paste into iMessage/Slack/email to respective person. Done.

All five will have their full spec files to reference. Friday EOD deadline. All parallel.
