# FABLE CONTINUATION CHECKPOINT — FLAGSTONE-DEEP-AUDIT-20260902

Canonical restart ledger. Read this, then AUDIT_STATE.md → FINDINGS_LEDGER.md → evidence/. A future session must be able to continue from here without the chat.

## Identity
- REPO: Skypie99/AccessMap (public). WORKTREE: /Users/skypie/AccessMap-deep-audit-20260902. BRANCH: claude/flagstone-deep-audit-20260902 (tracks origin).
- LOCKED BASE (CURRENT_MAIN): origin/main 70b52a30e9fff0f7d538509b110212bb8d872391 (tree 847f39f6) — re-verified unchanged at 2026-09-02 23:13 PDT.
- SUBMITTED BUILD 33: f5594171e75bc5ec92a87d0392c361601ddedfba (tree a4a5e70c). Provenance: EAS build 2f10f578-a406-4354-86fb-677480234859, profile testflight, gitCommitHash == f5594171, FINISHED 2026-09-01T04:26Z, distribution STORE (evidence/eas-build-identity.md). NOT an ancestor of main; merge-base a0bf4d04 (= EAS Build 30). Build 33 has 113 commits main lacks; main has 5 docs/guard commits Build 33 lacks.
- WEB (live demo): ebf091c21066d39898160b1357bde0aa35bdb8bf (descends from Build 33; Vercel deployment HMszH26wADRRDd1CqH4UkJ8kAugQ; flagstone.skypistudio.com).
- BACKEND: Supabase project kldlwszpfkdmsjrjhjym (production, the only app project). Read-only facts captured 2026-09-02 in evidence/db-proof-flags-delete-authorization.md, evidence/build33-backend-contract-probe.md, evidence/supabase-advisors.md.
- SIMULATORS: main → "Flagstone Audit iPhone 17 Pro" F6B9246F-2B95-4C5C-BC7F-CDD4D3D1E4DC (iOS 26.5; main Release build installed, bundle hash verified; app state: guest, location granted, onboarding done). Build 33 → "Flagstone Audit B33 iPhone 17 Pro" FAA0564B-6024-47B7-B1FF-C966A59721DD (iOS 26.5; Build 33 Release build installed from the detached worktree /Users/skypie/AccessMap-deep-audit-20260902-b33; app state: guest, onboarding done). Both were Shutdown at 23:13; boot with `xcrun simctl boot <udid>`; apps persist. Capture helper: tools/snap.sh <udid> <name> [wait]. Drive taps with the iOS Simulator MCP (tap works; its screenshot action crashes — use snap.sh).

## Model provenance
Session 1 Fable 5.1 (17:00–19:06 PDT, two 429 interruptions). Session 2 Fable 5.1 continuation from 23:13 PDT. Subagents: Sonnet 5 (J1, J2, I, H, J3-partial), Fable (E).

## Lane register
| Lane | Status | Where |
|---|---|---|
| A release/source/build truth | COMPLETE (App Store Connect live status = EVIDENCE_GAP; manifest says submitted_for_review) | FDA-001, evidence/eas-build-identity.md, logs/baseline-release-guards.log |
| B end-to-end journeys | PARTIAL — guest journeys on MAIN done through Explore/Legend/List/Filter/More; Build 33 through Home. Signed-in journeys = EVIDENCE_GAP by rule (audit never creates accounts or enters passwords). Anonymous report SUBMISSION not exercised (production write). | SCREEN_INVENTORY.md, screenshots/ |
| C premium UI | PARTIAL — matrix rows for Onboarding, Sign-in, Home, Explore, Legend, List, Filter (MAIN). Build 33 families + dark + XXXL pending. | UI_VISUAL_ACCEPTANCE.md |
| D accessibility | PARTIAL — static counts done; VoiceOver not available headless; Dynamic Type XXXL + Reduce Motion pending; FDA-033 a11y implication recorded. | AUDIT_STATE.md, ledger |
| E privacy/security | COMPLETE (static + production catalog) | evidence/laneE-*.md → FDA-002..004, 007..010, 012, 019..032 |
| F performance | PARTIAL — advisors + static counts; runtime startup/map timings pending (dataset is 21 flags / 5 users: no scale evidence possible) | evidence/supabase-advisors.md |
| G App Store | MOSTLY COMPLETE — reviewer notes, privacy manifest keys, URLs (all 200), demo-account gap (FDA-006), policy-vs-code (FDA-030); metadata sheet in name-forge not re-read | ledger |
| H test/CI | COMPLETE | evidence/laneH-*.md → FDA-005, 014..018 |
| I architecture | COMPLETE | evidence/laneI-*.md → FDA-011, 027, 035, 036, 037 |
| J historical | J1 + J2 COMPLETE (inventories); J3 reconciliation PARTIAL (evidence/laneJ3-reconciliation-draft.md, agent died on 429 mid-write) | HISTORICAL_RECONCILIATION.md not yet assembled |
| K kill shot | NOT STARTED (synthesis) | FINAL_AUDIT_REPORT.md |
| §29 admin delete | ROOT CAUSE COMPLETE (FDA-002); runtime UI reproduction = EVIDENCE_GAP (admin credentials) | ledger, evidence/db-proof-*, evidence/build33-backend-contract-probe.md |

## Findings state (see FINDINGS_LEDGER.md index for the authoritative list)
37 IDs assigned (FDA-001..037); 1 FALSE_POSITIVE (FDA-032). HIGH: 001, 002, 003, 004, 005, 019, 020, 021. MEDIUM: 006, 007, 009, 014, 015, 022, 023, 024, 025, 026, 030, 033, 034, 035, 036. LOW/NOTE: the rest.
Build 33 vs main applicability is recorded per finding in AFFECTED_STATE. Key split: FDA-002/003/004/019 are SUBMITTED_BUILD_33-only client→backend contract breaks (main's older client is compatible with production); FDA-020/021/023/026 are BACKEND (both); FDA-033/034/036 are MAIN-observed (Build 33 fixed FDA-034's copy per src/lib/location.ts; FDA-033/036 on Build 33 unverified).

## DO-NOT-REDO register
- Baselines on locked main (typecheck 0, lint 0 errors, jest 243 suites/3657 pass/32 todo, expo-doctor 2/18 fail, release:preflight/verify/status PASS) — logs/. Valid unless the tree changes.
- npm ci in both worktrees (HUSKY=0) — done.
- Simulator builds: main Release (DerivedData Flagstone-czysmrq…), Build 33 Release (DerivedData Flagstone-<b33 hash>, see logs/ios-build-b33-release.log). Build failures #1/#2 were ENVIRONMENT (CocoaPods UTF-8 locale; Xcode 27-beta 15.0 floor) — fixed by LANG=en_US.UTF-8 + DEVELOPER_DIR=/Applications/Xcode.app. Expo's final `devicectl` install step always fails with a Node stack trace when the sim is shut down — NOISY, NON-FATAL; install manually with `xcrun simctl install`.
- Production read-only facts (policies, grants, migration ledger, edge functions, advisors, column lists, trigger bodies) — captured; do not re-query unless a specific new question needs it.
- Endpoint probes (delete-flag 404 etc.) — done.
- Historical inventories J1/J2 — done; J3 partially reconciled (resume from draft, do not restart).
- Screenshots listed in screenshots/ — adequate for their surfaces; do not recapture.
- Design-intent decisions verified: sign-in dark hero = INTENTIONAL_DECISION [SIGNIN-DARK-KEPT].
- Rejected/merged: FDA-032 (zz_backup tables) FALSE_POSITIVE; Lane I CAND-I-03 merged into FDA-001/027; CAND-I-13 = FDA-011; Lane E CAND-E-01/02/03 = FDA-003/002/019+004; CAND-E-06 merged into FDA-009; CAND-E-11 = FDA-006/007; CAND-E-14 = FDA-027; CAND-E-16 = FDA-013/029; CAND-E-18 = FDA-031; Lane H CAND-H-01/02/05 = FDA-014; H-03 = FDA-015; H-04 = FDA-016; H-06 = FDA-017; H-07/08 = FDA-018.
- Known noisy/non-fatal: iOS Simulator MCP `screenshot` action crashes the MCP server ("restarting after a crash") — use snap.sh; `xcrun simctl ui … content_size` unsupported on this Xcode; `timeout` binary absent on macOS.

## Hard constraints (unchanged)
No product edits; no merges/pushes to anything but the audit branch; no production mutation; never create accounts or enter passwords; never print credentials (one historical literal surfaced accidentally in a shell transcript — not recorded anywhere).

## Remaining queue (priority order)
P0-1 Bank + push this checkpoint (this commit).
P0-2 Build 33 guest families on FAA0564B: Explore, Legend, List, Filter, More, Search+keyboard, Report flow to Submit (cancel), Flag detail, Tasks, Profile(guest), Drawer, Settings, About/Resources/HowToHelp, Help/Feedback sheets; then dark mode + XXXL on Home/Explore/Details/Tasks/Report. Same on MAIN for the not-yet-captured families (Search, Report, Detail, Tasks, Profile, Drawer, Settings, sheets), then dark + XXXL.
P0-3 Resume J3 reconciliation from the draft; assemble HISTORICAL_RECONCILIATION.md (P2 still-open list is the deliverable Sky asked for).
P0-4 Adjudicate remaining candidates (FDA-035 disposition, FDA-036 Build-33 applicability, FDA-033 on Build 33), normalize ledger, run tools/update_state_counts.py.
P0-5 TEST_AND_RUNTIME_MATRIX.md (baselines + runtime sessions), EVIDENCE_INDEX.md completion, PLANNING_HANDOFF.md, FINAL_AUDIT_REPORT.md (with the §29 subsection and ADMIN_FLAG_DELETE_ACCEPTANCE_PLAN), Lane K kill shot, final consistency pass, AUDIT_STATUS: COMPLETE, final push.
P1 Lane F runtime timings (cold launch, map settle) on both sims; web demo dark/full-map/detail recheck (pane was unresponsive).
P2 Reduce Motion pass; iPad/other iPhone sizes (only 17-family sims installed).
P3 Cosmetic enumeration beyond the matrix.

## Exact next action
Boot both simulators, then run P0-2 Build 33 families (Explore first) while a narrow workflow resumes J3 from the draft and traces FDA-036/033 applicability on Build 33.
