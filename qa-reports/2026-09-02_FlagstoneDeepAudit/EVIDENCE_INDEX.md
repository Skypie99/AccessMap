# EVIDENCE INDEX

| Evidence ID | Path | Lane | Description |
|---|---|---|---|
| EV-001 | (inline, SESSION_LOG.md) | A | git rev-parse origin/main == 70b52a30 at 2026-09-02 fetch |
| EV-002 | (inline) | A | merge-base(f5594171, origin/main) = a0bf4d04; main has 5 commits not in Build 33; Build 33 has 113 commits not in main |
| EV-003 | logs/npm-ci.log | H | worktree dependency install (HUSKY=0 npm ci) exit 0 |
| EV-004 | logs/baseline-typecheck-lint.log | H | tsc 0 errors; eslint 0 errors (warnings present); prettier check |
| EV-005 | logs/baseline-jest.log | H | 243 suites / 3657 passed / 32 todo / 0 failed, 143.8 s |
| EV-006 | logs/baseline-expo-doctor.log | H/I | 16/18 checks; FAIL app.json `privacyPolicyUrl` not in schema; FAIL typescript 6.0.3 vs ~5.9.2 + 3 patch drifts |
| EV-007 | logs/baseline-release-guards.log | A | release:preflight PASS, release:verify PASS (DEFERRED convergence), release:status, render --check |
| EV-008 | evidence/db-proof-flags-delete-authorization.md | E/29 | production pg_policies/grants/migration ledger/edge functions (read-only) |
| EV-009 | evidence/build33-backend-contract-probe.md | 29/E/G | unauthenticated endpoint probes of Edge Functions / RPCs (404 vs 401) |
| EV-010 | logs/ios-build-main-release.log | B/C | `expo run:ios --configuration Release` of locked main onto audit simulator |
| EV-011 | evidence/laneE-privacy-security-static.md | E | static privacy/security review (Fable subagent), 18 candidates → FDA-019..032 |
| EV-012 | evidence/laneH-test-ci-inventory.md | H | test/CI inventory, §29 test answers → FDA-014..018 |
| EV-013 | evidence/laneI-architecture-health.md | I | architecture metrics + 13 candidates → FDA-011/027/035/036/037 |
| EV-014 | evidence/laneJ1-historical-inventory-recent.md | J | historical inventory ≥2026-07 + Build-33-only reports (126 rows) |
| EV-015 | evidence/laneJ2-historical-inventory-older.md | J | historical inventory <2026-07 + root docs (164 rows) |
| EV-016 | evidence/laneJ3-reconciliation-draft.md (+ part2 when written) | J | reconciliation of historical IDs against current code/prod |
| EV-017 | evidence/supabase-advisors.md | E/F | security + performance advisor output |
| EV-018 | screenshots/main-*.png | B/C/D | CURRENT_MAIN simulator captures (see SCREEN_INVENTORY.md) |
| EV-019 | screenshots/b33-*.png | B/C/D | SUBMITTED_BUILD_33 simulator captures |
| EV-020 | logs/ios-build-b33-release.log, logs/npm-ci-b33.log | B/C | Build 33 reference worktree install + Release build |
| EV-021 | FABLE_CONTINUATION_CHECKPOINT.md | all | restart ledger + DO-NOT-REDO register |
