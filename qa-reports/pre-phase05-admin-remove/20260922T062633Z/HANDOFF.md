# Pre-Phase-05 admin Remove safety handoff

## Identity and scope

- Canonical base: `df58cac8659498e6cba15bd0f8d2e5d572a6797a`; tree `182a9b36aabb02357043bd107e1d4d2caa68b306`. Fresh `git fetch origin main` confirmed both before worktree creation.
- Branch: `codex/flagstone-admin-remove-safety-20260921`.
- Worktree: `/Users/skypie/AccessMap-worktrees/flagstone-admin-remove-safety-20260921`.
- Implementation commit: `ac2d85da3d93cb64183e310b37564a3af249f2cb`; tree `090ee65cbd85dc03f8fdf2a0592caf3bbc33ab1c`.
- Status: implemented locally, awaiting fresh independent acceptance. No push or merge.

## Risk map and change

The Flags queue had a visible Remove control calling `deleteFlag`, which Phase 04 already refused. The Reports queue had a separate visible Remove control calling `removeFlagReport`; that wrapper sent `flag_removed` to `moderate_report`, and a successful response removed the report from local state. This path bypassed the disabled `deleteFlag` capability and could claim removal under an unsafe destructive contract. Phase 03B Reject uses `flag_rejected` with an explicit reason and expected flag status; it is separate.

The patch removes both admin flag Remove controls and their screen handlers. `removeFlagReport` now immediately throws the existing typed `FlagDeletionUnavailableError`, before any RPC. It cannot return `{ closed: true }`, remove a report locally, or dispatch `flag_removed`. Reject, Restore, comment removal, and no-action/target-unavailable decisions retain their existing paths. `deleteFlag` remains disabled. The client expectations manifest revision 11 states this temporary client-only contract and does not claim new backend deployment or FDA-004 live proof.

Source files changed: `src/screens/AdminScreen.tsx`, `src/lib/adminReports.ts`, `src/screens/__tests__/AdminScreen.test.tsx`, `src/lib/__tests__/adminReports.test.ts`, `src/__tests__/contractManifest.guard.test.ts`, `supabase/contract/client-expectations.v1.json`.

## Gates

| Command / gate | Actual result |
| --- | --- |
| `npx jest --ci -w 3 --silent src/screens/__tests__/AdminScreen.test.tsx src/lib/__tests__/adminReports.test.ts src/lib/__tests__/flags.supabase.test.ts src/__tests__/contractManifest.guard.test.ts src/screens/__tests__/phase03bModerationClient.guard.test.ts` | 5 suites, 86 tests passed (before the added Flags queue Reject test). |
| 25-suite focused Phase 03B/03C/Phase 04 command, including admin/moderation, client delete refusal, account deletion, photo gating, privacy, and contract guards | 25 suites, 513 tests passed. Jest noted a worker teardown warning after completion. |
| `npx tsc --noEmit` | PASS, exit 0, no output. |
| `npx eslint src --ext .ts,.tsx` | PASS_WITH_PREEXISTING_WARNINGS: 0 errors, 90 warnings. An intermediate run showed 92 warnings due to a duplicate import introduced here; that import was fixed and the baseline count restored. |
| `npx jest --ci -w 3` | 299 suites passed; 4,472 tests passed, 32 todo, 0 failed; exit 0. Jest reported a worker teardown warning after completion. |
| `git diff --cached --check` before implementation commit | PASS, no whitespace errors. |

The focused suite covered both admin queues and both Reject routes, direct repeated `removeFlagReport` refusal with zero RPC calls, client `deleteFlag` refusal, FDA-002/003/019 guards, Phase 03B moderation and notification semantics, Phase 03C privacy guards, and account-deletion tests. Full Jest covered the remaining repository suites. No native device or live moderation smoke was performed in this local-only window.

Exact focused regression command:

```bash
npx jest --ci -w 3 --silent src/lib/__tests__/flags.test.ts src/lib/__tests__/flags.supabase.test.ts src/lib/__tests__/photos.test.ts src/lib/__tests__/sr050DeleteFlagPhotos.test.ts src/lib/__tests__/d1f4r3CanonicalReportDelete.test.ts src/lib/__tests__/adminReports.test.ts src/screens/__tests__/ReportFlagModal.test.tsx src/screens/__tests__/AdminScreen.test.tsx src/components/__tests__/FlagDetailModal.refusal.test.tsx src/components/__tests__/ModerationReasonPicker.test.tsx src/__tests__/contractManifest.guard.test.ts src/__tests__/d1f4r3SourceClosure.guard.test.ts src/__tests__/d1f4r3Fix2ReviewReplay.test.ts src/__tests__/webResilience.test.ts src/__tests__/privacy.guard.test.ts src/__tests__/geoPrivacyFence.test.ts src/lib/__tests__/adminReportsPrivacy.guard.test.ts src/screens/__tests__/phase03bModerationClient.guard.test.ts src/__tests__/phase03bNotificationSemantics.test.ts src/lib/__tests__/account.test.ts src/lib/__tests__/accountDeletionAvailability.test.ts src/lib/__tests__/accountDeletionReceipt.test.ts src/screens/__tests__/ProfileScreen.deletion.test.tsx src/screens/__tests__/SignInScreen.test.tsx src/__tests__/d1f4AsyncAccountDeletion.guard.test.ts
```

## Mutation safety

Mutations were applied only in disposable copies of `src`, never in the candidate worktree. Each used the relevant Jest suite with exit evidence. The first M5 attempt survived because the existing screen suite covered only Reports queue Reject. A focused Flags queue Reject behavioral test was added; the rerun killed all five.

| Mutation | Result and detecting test |
| --- | --- |
| M1: add an actionable admin Remove control | KILLED, exit 1; Flags queue Remove-unavailable test. |
| M2: send `flag_removed` through `moderate_report` | KILLED, exit 1; direct refusal test. |
| M3: return fake `{ closed: true }` | KILLED, exit 1; direct refusal test. |
| M4: remove the flag from local Flags state | KILLED, exit 1; Flags queue retention and Reject tests. |
| M5: disable Flags queue Reject | KILLED, exit 1; Flags queue Reject reason/status test. |

## Diff audit and boundaries

Only the six listed source/test/manifest files changed in the implementation commit. No backend code, migration, Phase 03 evidence, dependency, account-deletion behavior, rejection semantics, privacy access, or unrelated UI design changed. The primary `/Users/skypie/AccessMap` checkout remained on its pre-existing branch with its pre-existing dirty state and received no writes. Production contact: NONE. Staging contact: NONE. Database action: NONE. Deployment: NONE. Push: NOT PERFORMED.

## DECISIONS FOR SKY

Decision: whether to accept and merge this local candidate after a fresh independent review. Recommendation: review the exact implementation commit and retain admin flag Remove as unavailable until a separately designed, proven destructive backend contract exists. Why: the current client cannot prove safe flag and photo removal. Alternative: leave this branch unmerged, which leaves the Reports queue `flag_removed` path available in the released code. Impact: this client patch preserves Reject while withholding admin Remove; it does not itself change any deployed app or backend.
