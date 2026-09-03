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
