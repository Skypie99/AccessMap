---
model_tier: Sonnet
coherence_score: 0.97
state_consistency: pass
duplicate_work_detected: no
drift_risk: low
---

# Morgan Briefing — EAS Credentials Audit + Phase 5 Merge State
**Date:** 2026-05-31
**Mode:** Direct /morgan — iMessage + qa-report artifact
**Trigger:** Rory EAS credentials audit complete

---

## §1 Dependency Graph

```
nodes:
  - rory/eas-creds-fix#complete (Rory, ops) — DONE: production env Supabase vars added
  - rory/eas-rebuild#pending (Rory, ops) — BLOCKED: needs Sky approval
  - sky/github-secrets#pending (Sky, manual) — BLOCKED: requires Sky to add 4 repo secrets
  - alex/a11y-deep-merge#ready (merge, ops) — READY: 6 commits, a11y/phase5-deep-2026-05-31
  - alex/a11y-anon-banner-merge#ready (merge, ops) — READY: 2 commits, a11y/phase5-anon-banner-2026-05-31
  - dani/anon-reporting-token-sweep#ready (merge, ops) — READY: 1 commit, feat/phase5-anon-reporting
  - shamus/trust-score#pending (Shamus, build) — IN PROGRESS: 5 commits on feat/phase5-trust-score
  - sky/eas-submit (Sky, ops) — BLOCKED: needs fresh build with Supabase vars baked in

edges:
  - rory/eas-creds-fix#complete → rory/eas-rebuild#pending (gate: Sky approval to spend build minutes)
  - rory/eas-rebuild#pending → sky/eas-submit (gate: ~35-45 min build completes)
  - alex/a11y-deep-merge#ready → alex/a11y-anon-banner-merge#ready (gate: deep must land first, per memory)
  - alex/a11y-anon-banner-merge#ready → rory/eas-rebuild#pending (optimization: include all merged a11y before rebuild)
  - dani/anon-reporting-token-sweep#ready → rory/eas-rebuild#pending (optimization: include Dani polish before rebuild)
```

---

## §2 Reason for Ordering

- **EAS production env missing Supabase vars (CONFIRMED, FIXED):** Rory's audit confirmed `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` were absent from the EAS `production` environment. Baked into EXPO_PUBLIC_* at Metro compile time — any build without them produces a crashing binary. Fixed this session by copying vars from `preview` env. No credentials echoed. `ASSUMPTION:NONE` — confirmed by `eas env:list --environment production`.

- **Build 13 compiled 4:00 AM before fix:** Build 13 (`3a42b491`, testflight profile) finished at 4:00 AM today, prior to Rory adding the Supabase vars to production env. That IPA is stale. `eas submit --latest` would submit a crashing app. LEARNINGS:2026-05-23 — "Never present an unmerged branch as done" applies equally to stale builds.

- **a11y deep before anon-banner:** Per [[phase5-a11y-audit-2026-05-31]] memory entry — `a11y/phase5-anon-banner-2026-05-31` was branched from `6c91c4d` (on main). `a11y/phase5-deep-2026-05-31` must merge first so the anon-banner's base is clean. LEARNINGS:2026-05-23 — "Merge-on-done > stacking branches."

- **Merge before rebuild:** All three ready branches (a11y deep, a11y anon-banner, Dani token sweep) should land on main BEFORE triggering the next EAS build. This ensures the new IPA is the most complete snapshot. LEARNINGS:2026-05-25 — "Sequential merge/build discipline."

- **GitHub Secrets gap:** `gh secret list` shows only `EXPO_ASC_APP_ID`. The `eas-testflight-submit.yml` workflow needs `EAS_TOKEN`, `EXPO_APPLE_ID`, `EXPO_APPLE_PASSWORD`, `EXPO_APPLE_TEAM_ID` to run unattended. Confirmed absent. ASSUMPTION:NONE — verified by `gh secret list`.

---

## §3 Blocked Nodes

- `{node: rory/eas-rebuild#pending, why: spending EAS cloud build minutes (~35-45min) requires Sky approval, unblock: Sky confirms "yes rebuild testflight" — Rory kicks eas build --platform ios --profile testflight, type: DECISION_FOR_SKY}`

- `{node: sky/github-secrets#pending, why: GitHub repo Secrets require owner-level GitHub access, unblock: Sky adds EAS_TOKEN + EXPO_APPLE_ID + EXPO_APPLE_PASSWORD + EXPO_APPLE_TEAM_ID to repo Settings → Secrets — optional if submitting from local CLI but required for CI workflow, type: MISSING_INPUT}`

- `{node: sky/eas-submit, why: build 13 (3a42b491) is stale — Supabase URL/key were missing from production env at compile time — submitting it produces a crashing app, unblock: fresh build after EAS env fix lands, type: BLOCKER}`

---

## §4 Checkpoint References

- `{name: rory-eas-creds-audit-2026-05-31, role: Rory, artifact: session(this), qa-report: cycle-2026-05-31-morgan-eas-credentials-audit.md:this}`
- `{name: gary-phase5-coverage-audit, role: Gary, artifact: commit:bb74454, qa-report: 2026-05-31_Gary_Phase5CoverageAudit.md:1}`
- `{name: alex-a11y-deep, role: Alex, artifact: branch:a11y/phase5-deep-2026-05-31#commit-86e3fbf, qa-report: (inline in branch commits)}`
- `{name: alex-a11y-anon-banner, role: Alex, artifact: branch:a11y/phase5-anon-banner-2026-05-31#commit-fc94032, qa-report: (inline in branch commits)}`
- `{name: design-system-complete, role: Dani/Morgan, artifact: commit:6c91c4d, qa-report: cycle-2026-05-31-morgan-design-system-merge-complete.md:1}`
- `{name: testflight-build-13-stale, role: EAS, artifact: eas-build-id:3a42b491, qa-report: n/a — EAS dashboard only}`
- `{name: dani-anon-reporting-token-sweep, role: Dani, artifact: branch:feat/phase5-anon-reporting#commit-73638ed, qa-report: 2026-05-31_Dani_DesignCompile_AnonReportingUI.md:1}`

---

## §5 Duplication Report

No duplications detected this cycle.

---

## §6 State Snapshot

### EAS / DevOps State (Updated This Session)

| Item | Before | Now |
|---|---|---|
| Production EAS `EXPO_PUBLIC_SUPABASE_URL` | ❌ MISSING | ✅ SET |
| Production EAS `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ❌ MISSING | ✅ SET (sensitive) |
| Production EAS `EXPO_PUBLIC_SENTRY_DSN` | ✅ set | ✅ set |
| Production EAS `GOOGLE_SERVICES_JSON` | ✅ set | ✅ set |
| Latest testflight IPA (build 13) | compiled 4:00 AM | **STALE — Supabase vars absent at bake time** |
| Apple Distribution Certificate | valid (build 13 succeeded) | ✅ valid |
| `ascAppId` in eas.json | ✅ `6774709116` | ✅ confirmed |
| GitHub Secret: `EAS_TOKEN` | ❌ missing | ❌ still missing |
| GitHub Secret: `EXPO_APPLE_ID` | ❌ missing | ❌ still missing |
| GitHub Secret: `EXPO_APPLE_PASSWORD` | ❌ missing | ❌ still missing |
| GitHub Secret: `EXPO_APPLE_TEAM_ID` | ❌ missing | ❌ still missing |

### Branches Ready to Merge (in order)

| Branch | Commits ahead | What | Gate |
|---|---|---|---|
| `a11y/phase5-deep-2026-05-31` | 6 | Trust score + onboarding WCAG 2.2 AA fixes | Alex approved ✅ — merge FIRST |
| `a11y/phase5-anon-banner-2026-05-31` | 2 | Anon reporting banner VoiceOver fix | Alex approved ✅ — merge SECOND |
| `feat/phase5-anon-reporting` | 1 | Dani Design Compile token sweep | Dani approved ✅ — merge THIRD |
| `feat/phase5-trust-score` | 5 | Full trust score feature | Shamus in-progress, QA gate pending |

### QA Health (Gary, bb74454)

- Suites: 94 | Tests: 1,530 passing | Coverage: 87.17% lines (gate: 80%) ✅
- 7 theme tests updated for Wayfinder Blue design tokens
- No typecheck errors

### Main Branch (HEAD: 9fd1cd9)

Latest commits:
- `9fd1cd9` feat: App Store reviewer test account migration + notes
- `f41b6b6` fix: expo-notifications plugin + CI submit workflow
- `41b38c2` fix: favicon for Expo web
- `bb74454` Gary coverage audit — 94 suites, 1530 tests
- `6c91c4d` Design system Phase 4 + merge conflict cleanup (design system LIVE)

---

## §7 Execution Plan Summary

```
Phase 1 — MERGE READY BRANCHES (before rebuild)
  READY: alex/a11y-deep-merge#ready
  READY: alex/a11y-anon-banner-merge#ready (after deep)
  READY: dani/anon-reporting-token-sweep#ready

Phase 2 — REBUILD (after Sky approval)
  BLOCKED: rory/eas-rebuild#pending [DECISION_FOR_SKY]
  Command: eas build --platform ios --profile testflight --non-interactive

Phase 3 — SUBMIT (after build completes)
  BLOCKED: sky/eas-submit (needs build 14+)
  Command: eas submit --platform ios --latest --non-interactive
  Note: will prompt for Apple app-specific password if EXPO_APPLE_APP_SPECIFIC_PASSWORD not in shell env

Phase 4 — CI SETUP (parallel, optional but recommended)
  BLOCKED: sky/github-secrets#pending [MISSING_INPUT]
  Secrets needed: EAS_TOKEN, EXPO_APPLE_ID, EXPO_APPLE_PASSWORD, EXPO_APPLE_TEAM_ID

acyclic: true
critical path: merge-3-branches → rebuild (~45 min) → submit
parallelizable: github-secrets setup can happen during rebuild
```

---

## DECISIONS FOR SKY

### Decision 1 — Rebuild EAS testflight (BLOCKER for App Store submission)

Build 13 is stale. The Supabase URL and anon key were absent from the EAS production environment when it compiled this morning. The app would crash at launch. Rory fixed the env; a fresh build is all that's needed.

**To approve:** Reply "yes rebuild" → Rory kicks:
```bash
eas build --platform ios --profile testflight --non-interactive
```
~35–45 min. After it lands, `eas submit --platform ios --latest --non-interactive` from CLI.

### Decision 2 — Add GitHub Secrets (enables CI submit workflow)

The `eas-testflight-submit.yml` CI workflow can't run unattended without 4 secrets. Not blocking today's submit (can do via CLI), but needed before the workflow is usable.

Secrets to add at `github.com/[your-repo]/settings/secrets/actions`:
- `EAS_TOKEN` — from expo.dev account settings
- `EXPO_APPLE_ID` — `skylerhalisky@gmail.com`
- `EXPO_APPLE_PASSWORD` — Apple app-specific password
- `EXPO_APPLE_TEAM_ID` — `S78F8ZA8QU`

### Decision 3 — Merge 3 ready branches (before rebuild)

Three branches cleared QA/design gates and are sitting idle. Merge them before the rebuild so the new IPA includes all fixes:

1. `a11y/phase5-deep-2026-05-31` (WCAG fixes: trust score + onboarding)
2. `a11y/phase5-anon-banner-2026-05-31` (WCAG fix: anon banner VoiceOver) — after deep
3. `feat/phase5-anon-reporting` (Dani token sweep: 1 commit) — after anon-banner

No conflicts expected (each is a clean set of commits off current main).

---

## LEARNINGS Cited This Cycle

- `LEARNINGS:2026-05-25 — Sequential merge/build discipline` — applies: merge all branches before triggering rebuild
- `LEARNINGS:2026-05-23 — Merge-on-done > stacking branches` — applies: 3 branches cleared gates, should land before rebuild
- `LEARNINGS:2026-05-28 — EXIF stripping functions should be exported for test coverage` — noted; no action needed this cycle (Gary coverage at 87%)
