# AccessMap — Decisions Log

Structural decisions, append-only. New entries at the top. Do NOT re-litigate entries without Sky approval — conflicts with logged decisions are BLOCKERs (VL Coherence Check 1).

---

## 2026-05-27 — Security Wave 2 + D3 Trigger Decisions

- **Decision:** Security Hardening Wave 2 ready for merge; D3 trigger approved for application.
- **Rationale:** Steve completed audit of input validation, data exposure, RLS, and secrets. Three in-code defense-in-depth fixes (display name trim+cap, feedback body/email validation, flag description cap). Propose-only PII migration (users.email RLS) ready for Sky apply (Const. 2.4 privacy gate). D3 trigger (`enforce_flag_status_only_for_non_owner`) reviewed by Steve — no SQL injection risk, proper role isolation, correct trigger ordering, long-term security improvement for column protection. Typecheck ✅ (0 errors), tests ✅ (922/922), secrets audit clean.
- **Actions:** (1) Merge `security/hardening-wave2-2026-05-27` (zero migration dependencies); (2) Apply `2026-05-27_users_email_privacy.sql` same-cycle (Const. 2.4 privacy incident closure); (3) Apply `2026-05-23_status_update_trigger_proposal.sql` to unblock `shamus/marker-clustering-2026-05-25` merge.
- **Authority:** Steve (security review, sign-off 2026-05-27); Morgan (execution plan coordination); Const. Art. 2.4 (privacy), Art. 5 (no live-DB writes)
- **References:** qa-reports/2026-05-27_Steve_Security_Wave2.md, qa-reports/2026-05-27_D3_Steve_TriggerApproval.md, cycle-2026-05-27-morgan-security-final.md

---

## 2026-05-24 — Bootstrap Velocity Loop State Files

- **Decision:** Create PROJECT_STATE.md, DECISIONS_LOG.md, TASK_GRAPH.json for AccessMap as first-cycle bootstrap.
- **Rationale:** AGENT_OS v1.14 STATE AUTHORITY requires these three files as canonical state authority for all ACTIVE projects. Files were absent; every orchestrator run was rebuilding state from conversation context — a coherence risk. Morgan created them on first post-project audit cycle.
- **Supersedes:** Nothing (first entry).
- **Authority:** Morgan (ACTIVE mode — direct invocation; reversible write to project root per Const. 5.5)
