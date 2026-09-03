# FLAGSTONE DEEP AUDIT STATE

AUDIT_ID: FLAGSTONE-DEEP-AUDIT-20260902
LOCKED_BASE_SHA: 70b52a30e9fff0f7d538509b110212bb8d872391
LOCKED_BASE_TREE: 847f39f6d8e5d7feb28af0f5da823034ce19f848
LOCKED_BASE_MESSAGE: docs(release): finish source-lock documentation reconciliation
BUILD33_SOURCE_SHA: f5594171e75bc5ec92a87d0392c361601ddedfba (NOT ancestor of main; merge-base a0bf4d04)
WEB_SOURCE_SHA: ebf091c21066d39898160b1357bde0aa35bdb8bf (descends from Build 33)

AUDIT_BRANCH: claude/flagstone-deep-audit-20260902
AUDIT_WORKTREE: /Users/skypie/AccessMap-deep-audit-20260902

AUDIT_STATUS: IN_PROGRESS

CURRENT_PHASE: INVESTIGATION (lanes running in parallel)
CURRENT_LANE: A (release truth) + §29 (admin delete) by lead; J1/J2/E/I/H delegated to read-only subagents
CURRENT_SUBTASK: waiting for Release simulator build of locked main; verifying Build 33 backend-contract gaps (account deletion, moderation queue)

LAST_CHECKPOINT_LOCAL_TIME: 2026-09-02 18:25 PDT
LAST_CHECKPOINT_SHA: (see git log — checkpoint 2)
LAST_REMOTE_CHECKPOINT_SHA: (pushed with checkpoint 2)

COMPLETED_LANES: (none fully closed)
PARTIAL_LANES: A (source identity + guards done; TestFlight/App Store status still from docs only), §29 (root cause found; runtime reproduction pending), E (production catalog captured; static review delegated), H (baselines captured; inventory delegated)
NOT_STARTED_LANES: B C D F G K
BLOCKED_LANES: (none)

FINDINGS_TOTAL: 18
BLOCKER: 0
HIGH: 5
MEDIUM: 4
LOW: 8
NOTE: 1
FALSE_POSITIVE: 0

UI_FINDINGS: 0
ACCESSIBILITY_FINDINGS: 0
FUNCTIONAL_FINDINGS: 3
PRIVACY_SECURITY_FINDINGS: 5
PERFORMANCE_FINDINGS: 1
APP_STORE_FINDINGS: 2
RELEASE_FINDINGS: 3

OPEN_EVIDENCE_GAPS:
- Runtime reproduction of FDA-002 in the real Admin UI requires an admin sign-in (only 1 admin exists in production = Sky's account; credentials are never handled by the audit). Mechanism proven by catalog + endpoint probe; UI-path proof = EVIDENCE_GAP.
- SIGNED-IN JOURNEYS (Lane B/C/D): the audit may NOT create accounts or enter passwords (hard rule). All signed-in surfaces (Profile, My Reports, Watched, Achievements, Admin, comments, verify/resolve, account deletion) are evaluated statically + via Build 33 reports; simulator evidence covers guest/anonymous surfaces only. A Sky-assisted signed-in simulator pass is the recommended follow-up.
- Anonymous report SUBMISSION is not exercised (would write a production flag with no way for the audit to remove it); the flow is walked up to the final Submit and cancelled.
- TestFlight / App Store Connect live status not queried (manifest says submitted_for_review; EAS build 2f10f578 FINISHED 2026-09-01).
- Web demo interaction was cut short: the in-app Browser pane went unresponsive after the mobile-viewport reload; re-open for dark mode + full-map + detail checks.

SIMULATOR_STATE: main → "Flagstone Audit iPhone 17 Pro" F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC (iOS 26.5, shutdown until expo installs); Build 33 → "Flagstone Audit B33 iPhone 17 Pro" FAA0564B-6024-47B7-B1FF-C966A59721DD (iOS 26.5, created by the audit, shutdown). Dynamic Type: no simctl content_size on this Xcode → use `xcrun simctl spawn <udid> defaults write -g UIPreferredContentSizeCategoryName UICTContentSizeCategoryAccessibilityExtraExtraExtraLarge` + relaunch, or Settings app. Appearance: `xcrun simctl ui <udid> appearance dark|light`.

LONG_RUNNING_COMMANDS:
- Build #3 of locked main: `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer LANG=en_US.UTF-8 npx expo run:ios --configuration Release --device F6B9246F… --no-bundler` → logs/ios-build-main-release-3.log (builds #1/#2 failed: CocoaPods locale crash; Xcode 27-beta deployment-target floor — ENVIRONMENT class, not product defects).
- `HUSKY=0 npm ci` in the detached Build 33 reference worktree /Users/skypie/AccessMap-deep-audit-20260902-b33 (f5594171; created by the audit; remove with `git worktree remove` at the end) → logs/npm-ci-b33.log. Next: build it with the same command onto FAA0564B….
- PID 27303 `npx expo run:ios --configuration Release --device F6B9246F… --no-bundler` (started 18:15 PDT) → logs/ios-build-main-release.log. Builds locked main into the audit simulator with embedded JS bundle (no Metro needed).
- Subagents (background): J1 → evidence/laneJ1-historical-inventory-recent.md; J2 → evidence/laneJ2-historical-inventory-older.md; E → evidence/laneE-privacy-security-static.md; I → evidence/laneI-architecture-health.md; H → evidence/laneH-test-ci-inventory.md. They append incrementally; partial files are valid.

WORKTREE_UNTRACKED_TOOL_FILES (never commit): .env (copied from canonical, gitignored), ios/ (prebuild output, gitignored), node_modules/.

NEXT_EXACT_ACTION: (1) when logs/ios-build-main-release-3.log reports the app installed/launched, boot F6B9246F, screenshot to screenshots/ via `xcrun simctl io <udid> screenshot`, run Lane B/C/D guest screen families on MAIN; (2) launch the Build 33 Release build onto FAA0564B (same expo command from the -b33 worktree) and repeat the families — Build 33 is the submitted UI and the primary Lane C subject; (3) fold laneE/laneI/laneJ1/laneJ2 evidence into the ledger as they land; (4) reopen the web demo for dark/full-map/detail checks.

SAFE_TO_RESUME_WITH_DIFFERENT_MODEL: YES
