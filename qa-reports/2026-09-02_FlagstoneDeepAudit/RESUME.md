# RESUME — Flagstone Deep Audit (zero-context restart card)

1. PURPOSE: evidence-driven audit of Flagstone (repo AccessMap). Output = findings + evidence for Sky + ChatGPT to plan repair waves. THIS AUDIT DOES NOT FIX, MERGE, DEPLOY, OR SUBMIT.
2. LOCKED SHA: 70b52a30e9fff0f7d538509b110212bb8d872391 (origin/main, "docs(release): finish source-lock documentation reconciliation"). Build 33 (submitted) = f5594171 — NOT in main. Web = ebf091c2.
3. WORKTREE: /Users/skypie/AccessMap-deep-audit-20260902 (ALWAYS use absolute paths / `git -C`; the shell cwd resets to a scratch dir).
4. BRANCH: claude/flagstone-deep-audit-20260902 (tracks origin).
5. RULE: no product-code changes. Writes ONLY under qa-reports/2026-09-02_FlagstoneDeepAudit/. Canonical /Users/skypie/AccessMap is READ-ONLY (it is dirty on another session's branch — expected). Production Supabase (ref kldlwszpfkdmsjrjhjym) is READ-ONLY: SELECT-only SQL, catalog reads, unauthenticated endpoint probes; never mutate.
6. COMPLETED LANES: none closed. Baselines done (typecheck 0, lint 0, jest 3657 pass/32 todo, expo-doctor 2 fails, release guards PASS).
7. CURRENT PARTIAL LANES: A, §29, E, H (see AUDIT_STATE.md).
8. LAST COMPLETED SUBTASK: §29 root cause — Build 33 client calls undeployed `delete-flag` Edge Function (FDA-002); production DB authorizes direct admin DELETE (so main's path is DB-authorized).
9. NEXT ACTION: AUDIT_STATE.md → NEXT_EXACT_ACTION.
10. EVIDENCE FILES: EVIDENCE_INDEX.md; evidence/*.md; logs/*.log.
11. SIMULATOR STATE: audit sim F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC booted; app install in progress via expo run:ios (Release). If the app is missing after a restart, re-run: `cd <worktree> && CI=1 npx expo run:ios --configuration Release --device F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC --no-bundler` (needs .env copied from /Users/skypie/AccessMap/.env — do not print it).
12. BACKGROUND PROCESS/LOG STATE: see AUDIT_STATE.md LONG_RUNNING_COMMANDS. Read logs/ before rerunning anything expensive.
13. CHECKPOINT SHA: git log -1 on the audit branch.
14. CHECKPOINT PUSHED: YES (every checkpoint is pushed; verify with `git -C <worktree> status -sb`).
15. MODEL PROVENANCE: Claude Fable 5.1 max (session 1, 2026-09-02 17:00 PDT; hit session limit ~17:15, resumed ~18:10). Subagents: Sonnet 5 (J1, J2, I, H), Fable (E).
16. OPEN EVIDENCE GAPS: AUDIT_STATE.md OPEN_EVIDENCE_GAPS.

DO_NOT_RESTART_COMPLETED_LANES: YES
