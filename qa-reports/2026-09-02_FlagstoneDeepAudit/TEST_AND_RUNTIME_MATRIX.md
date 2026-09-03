# TEST AND RUNTIME MATRIX

## Baseline validation (§23) — CURRENT_MAIN 70b52a30, worktree /Users/skypie/AccessMap-deep-audit-20260902, 2026-09-02 17:03–17:08 PDT

| Gate | Command | Result | Classification | Log |
|---|---|---|---|---|
| Dependencies | `HUSKY=0 npm ci --no-audit --no-fund` (`.npmrc` legacy-peer-deps=true) | exit 0 | — | logs/npm-ci.log |
| Typecheck | `npm run typecheck` (tsc --noEmit) | exit 0, 0 errors | PASS | logs/baseline-typecheck-lint.log |
| Lint | `npm run lint` (eslint src) | exit 0, 0 errors, warnings present (react-hooks/exhaustive-deps, no-explicit-any in tests, no-require-imports) | PASS (warnings = debt) | same |
| Format | `npm run format:check` | fails (known; deliberately not gated in CI — FDA-018) | STALE_GUARD / TEST_DEFECT | same |
| Unit/integration (Jest) | `CI=true npx jest --ci --silent` | 243 suites passed, 3657 tests passed, 32 todo, 0 failed, 143.8 s | PASS | logs/baseline-jest.log |
| Expo Doctor | `CI=1 npx expo-doctor@latest` | 16/18: FAIL app.json schema (`privacyPolicyUrl`), FAIL package versions (typescript 6.0.3 vs ~5.9.2; expo/expo-constants/jest-expo patch drift) | DEPENDENCY / config (FDA-011) | logs/baseline-expo-doctor.log |
| Release guards | `release:preflight`, `release:verify`, `release:status`, `release:render -- --check` | all PASS; verify prints MAIN RELEASE-CODE CONVERGENCE: DEFERRED (FDA-001) | PASS (identity only — not a backend-contract gate, FDA-005) | logs/baseline-release-guards.log |
| Migration tests | supabase/tests/ (pgTAP) | main: directory absent; Build 33: files exist, not runnable here (no Docker/Postgres) — never run in CI | TEST_INFRA gap (FDA-015) | — |
| CI state (GitHub Actions) | `gh run list` 2026-09-02 | main push runs green (CI, Release Identity, pages); Dependabot "typescript-and-tooling" PR: CI + Lighthouse FAILED | DEPENDENCY (FDA-011) | inline in SESSION_LOG |
| Build (iOS simulator, Release) | `expo run:ios --configuration Release --no-bundler` | #1 FAIL: CocoaPods 1.16.2/Ruby 4.0.5 Unicode crash under non-UTF-8 locale → ENVIRONMENT; #2 FAIL: Xcode 27-beta deployment-target floor 15.0 vs pod resource bundles at 9.0/11.0/12.4 → ENVIRONMENT; #3 PASS with LANG=en_US.UTF-8 + DEVELOPER_DIR=/Applications/Xcode.app (26.6). Expo's final devicectl install step fails with a Node stack trace when the simulator is shut down — NOISY, NON-FATAL (install manually). | ENVIRONMENT | logs/ios-build-main-release*.log, logs/ios-build-b33-release.log |

Failure classification key: PRODUCT_DEFECT / TEST_DEFECT / STALE_GUARD / ENVIRONMENT / DEPENDENCY / FLAKY / UNKNOWN. No PRODUCT_DEFECT surfaced by the automated gates — which is itself the Lane H finding (FDA-005/014/015): the shipped binary's broken admin delete, account deletion, report queue and photo upload are all invisible to every gate above.

## Runtime sessions

| Session | Device / OS | Source SHA | Build | Auth | Backend | Start route | Theme | Text size | What was exercised | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| R1 (main, session 1) | "Flagstone Audit iPhone 17 Pro" F6B9246F (iOS 26.5 sim) | 70b52a30 | Release, embedded bundle | guest (Browse without an account) | production kldlwszpfkdmsjrjhjym (read paths only; no submissions) | fresh install → onboarding | light | default | onboarding ×5 (permission CTAs dead → FDA-033), sign-in (visual), Home, location prompt (allowed), Explore (SF default → Kelowna after locate; raw error alert → FDA-034), Legend, List, Filter, More | screenshots/main-* |
| R2 (Build 33, session 1) | "Flagstone Audit B33 iPhone 17 Pro" FAA0564B (iOS 26.5 sim) | f5594171 | Release, embedded bundle | guest | production | fresh install → onboarding | light | default | onboarding ×5, sign-in | screenshots/b33-* |
| R3 (both, session 2) | same | same | same | guest | production | relaunch after simulator reboot | light → dark; default → XXXL | (in progress — see SCREEN_INVENTORY.md) | screenshots/ |
| Web | in-app Browser (desktop 800×450, mobile 375×812) | ebf091c (live) | Vercel prod | guest | production | flagstone.skypistudio.com | light | — | onboarding, Home list, service worker registered; console: CSP report-only worker-src violation, useNativeDriver warning, 4× "Expected value to be of type number, but found null". Pane became unresponsive before dark/full-map checks (EVIDENCE_GAP) | inline (SESSION_LOG), FDA-013/029 |

Not exercised (by rule or safety): any signed-in journey (no credentials handled), anonymous report submission (production write), account deletion, admin actions, push notifications, deep links with real ids (accessmap://flag/<id> — not tried; low value without sign-in), offline/airplane mode (not attempted on simulator).
