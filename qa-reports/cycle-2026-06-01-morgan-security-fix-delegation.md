# Morgan Cycle — Security Fix Delegation (2026-06-01)

```yaml
model_tier: opus            # Sky-initiated foreground session
coherence_score: 0.97
state_consistency: pass
duplicate_work_detected: no
drift_risk: low
mode: DIRECT /morgan (in-session delivery per Sky override — NO iMessage)
```

**LEARNINGS consulted:** `LEARNINGS:2026-06-01 — concurrent git churn` (shared tree;
commit own files, never `git add -A`); `LEARNINGS — live-DB drift` (trust
get_advisors/pg_policies, not migration files). Cited in §2.

## §1 Dependency Graph
nodes:
- steve/flags-rls-fix#analysis (Steve, security) — DONE (audit + live verification)
- dana/flags-rls-fix#impl (Dana, build trigger-based fix on qa-steve branch)
- dana/flags-rls-fix#apply (Dana, apply to prod + rolled-back verification)
- jordan/flags-rls-fix#privacy (Jordan, privacy sign-off — RLS change touches location-bearing table)

edges:
- dana/flags-rls-fix#impl → steve/flags-rls-fix#analysis (gate: design in 2026-06-01_flags_policy_consolidation.sql)
- dana/flags-rls-fix#apply → dana/flags-rls-fix#impl (gate: rolled-back probes green)
- dana/flags-rls-fix#apply → jordan/flags-rls-fix#privacy (gate: privacy sign-off; tightening-only, low risk)

## §2 Reason for Ordering
- Steve's analysis is complete + empirically confirmed on prod (non-owner edit+delete) → Dana inherits a specified fix, no re-discovery. (qa-reports/2026-06-01_Security_Robustness_QA_Report.md)
- RLS/schema safety routes to **Dana + Steve** (Const. 9.4 routing map). Dana owns the trigger redesign; Steve already holds the security sign-off.
- Jordan trigger fires: RLS/auth change on a table holding **location data** (Const. 7.6). Change is strictly *more* restrictive (locks non-owners to status) → Jordan sign-off expected fast, not a blocker. Cite trigger.
- `LEARNINGS — live-DB drift`: verify against get_advisors/pg_policies, apply with rolled-back probes, not blind SQL.

## §3 Blocked Nodes
- {node: dana/flags-rls-fix#apply, why: live status-change path fires notify_flag_status_webhook; net.http_post may be missing (LEARNINGS 2026-05-30), which would error status changes independent of RLS, why: must confirm owner status-change works before trusting triage, unblock: Dana verifies status-change path on prod (or surfaces it as a separate pre-existing blocker), type: BLOCKER}
- {node: reopen-requests-interaction, why: increment_reopen_request RPC mutates reopen_requests for non-owners; a naive column-lock trigger would block the reopen feature, unblock: Dana exempts reopen_requests from the non-owner lock, type: MISSING_INPUT}

## §4 Checkpoint References
- {name: security-audit, role: Steve, artifact: branch:qa-steve/accessmap-2026-06-01 (commit 4d4d095), qa-report: qa-reports/2026-06-01_Security_Robustness_QA_Report.md}
- {name: f1-design+test-plan, role: Steve, artifact: supabase/migrations/2026-06-01_flags_policy_consolidation.sql, qa-report: same}
- {name: prod-state, role: Steve, artifact: prod has flags_auth_user_only restored + anon photo-injection closed (verified), qa-report: same:Prod application this session}

## §5 Duplication Report
No duplications detected this cycle. (Steve hands off to Dana; no overlap — Steve = analysis/sign-off, Dana = implementation/apply.)

## DECISION / DELEGATION
Sky authorized prod apply (twice) + asked Morgan to delegate. **Routed to Dana** (backend/RLS/migrations) with Steve's security sign-off + Jordan privacy note (tightening-only).

## OUTCOME — ✅ RESOLVED on prod (same session)
Dana implemented + applied + verified (rolled-back probes):
- **Finding corrected:** non-owner EDIT was never exploitable (the `enforce_flag_status_only_for_non_owner` trigger reverts non-status columns; the first probe was fooled by rowcount). **DELETE was the real hole** and is now BLOCKED.
- **Fix applied** (`flags_close_nonowner_delete_and_fix_triage_20260601`): simple triage policy + dropped `flags_auth_user_only`; the existing trigger does the column-lock. Verified: non-owner DELETE blocked · content reverted · triage works (no RLS error) · owner edits work · spoofed INSERT blocked. `net.http_post` exists → status triage end-to-end OK.
- Both prior-cycle BLOCKERS (§3) cleared: net.http_post present; reopen_requests untouched by the fix (no trigger change).
- **New §3 items for next cycle (route Dana):** (1) rotate 2 hardcoded webhook secrets in trigger defs (pg_proc-extractable); (2) drop duplicate `AFTER UPDATE OF status` trigger → double-points bug; (3) lock context_tags in the trigger (low).
- No external send (in-session delivery per Sky override).
