# Codex QA report: pre-Phase-05 admin Remove safety

## What changed

Admin flag Remove controls in both queues are withheld. The exported `removeFlagReport` application path throws a typed refusal before any RPC, while Phase 03B Reject remains operational. Six implementation files changed: `src/screens/AdminScreen.tsx`, `src/lib/adminReports.ts`, their focused tests, `src/__tests__/contractManifest.guard.test.ts`, and `supabase/contract/client-expectations.v1.json`. Full details are in [the handoff](pre-phase05-admin-remove/20260922T062633Z/HANDOFF.md).

## Branch + SHA

`codex/flagstone-admin-remove-safety-20260921` in `/Users/skypie/AccessMap-worktrees/flagstone-admin-remove-safety-20260921`, based on `df58cac8659498e6cba15bd0f8d2e5d572a6797a` / tree `182a9b36aabb02357043bd107e1d4d2caa68b306`. Implementation commit: `ac2d85da3d93cb64183e310b37564a3af249f2cb` / tree `090ee65cbd85dc03f8fdf2a0592caf3bbc33ab1c`. This report is committed separately to avoid embedding its own SHA.

## Gates

- Focused Phase 03B/03C/Phase 04 Jest: 25 suites, 513 tests passed.
- Scratch mutation safety: 5/5 killed; initial M5 survivor prompted one added behavioral test, then all five failed as intended.
- `npx tsc --noEmit`: exit 0.
- `npx eslint src --ext .ts,.tsx`: exit 0, 0 errors, 90 pre-existing warnings.
- `npx jest --ci -w 3`: exit 0, 299 suites passed, 4,472 tests passed, 32 todo, 0 failed. Jest noted a worker teardown warning after completion.
- `git diff --cached --check`: exit 0.

## What's left

Fresh independent acceptance and any owner-controlled merge/push. No production or staging contact, database action, deployment, or push occurred. No native device or live admin smoke was run.

## DECISIONS FOR SKY

Decide whether to accept and merge the exact local candidate after independent review. Recommendation: accept the client safety gate and keep admin flag Remove unavailable until a safe backend contract is designed and proven. The alternative is leaving the current released Reports queue removal path available; this local branch alone changes no deployment.
