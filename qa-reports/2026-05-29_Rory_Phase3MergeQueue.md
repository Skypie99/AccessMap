# Rory — Phase 3 Merge Queue
**Date:** 2026-05-29
**Role:** Rory (DevOps / Merge Manager)
**Main tip at time of writing:** `fbce562` (Phase 2 merges complete, pushed)
**Purpose:** Ordered merge queue ready to execute the moment Phase 3 branches land.

---

## Main State Confirmed

```
fbce562 merge(infra): phase2/track-b-infrastructure
23a24f2 merge(feat): feat/wave2-quick-wins — a11y touch targets + cluster contrast
1be62d4 chore(testflight): wire eas.json + app.json for first TestFlight build
e133c76 merge(fix): fix/expo-notifications-and-plist — plist keys + coverage exclusions
3cdb894 chore(deps): ignore react-native/expo/react in Dependabot
```

All Phase 2 branches merged and pushed. TSC clean, 1212 tests / 1230 total (78 suites) green.

---

## Unmerged Branches (as of 2026-05-29 post-Phase-2)

`git branch -r --no-merged main` returned 7 Dependabot branches only.
`git branch --no-merged main` (local) adds Jordan's branch.
Phase 3 branches from Steve / Gary / Alex / Peter / Shamus are **in-flight** — not yet pushed.

---

## Priority Queue

### TIER 1 — Phase 3 Incoming (merge immediately when pushed, in this order)

These branches are in-flight as of this writing. Merge order below follows dependency logic:
security/critical-path first, then a11y, then perf/docs, then QA tests.

| Priority | Branch (expected name pattern) | Owner | Classification | Notes |
|----------|-------------------------------|-------|---------------|-------|
| 1 | `fix/prelaunch-blockers-*` or `security/*` | Steve | **WIP → READY on arrival** | Steve handles security/RLS/auth. Merge first — security fixes gate everything else. |
| 2 | `fix/a11y-*` or `feat/a11y-*` | Alex | **WIP → READY on arrival** | A11y fixes are self-contained, no dependency on Steve. Can merge concurrently with #3. |
| 3 | `feat/heatmap-*` or `shamus/*` | Shamus | **WIP → READY on arrival** | Heatmap build; Dani COMMIT already issued, Jordan D5 pre-approval on file. |
| 4 | `test/*` or `gary/*` | Gary | **WIP → READY on arrival** | Test suites gate coverage threshold. Merge after Shamus so new code is covered. |
| 5 | `docs/*` or `perf/*` | Peter | **WIP → READY on arrival** | Docs / Lighthouse / web platform. No code deps, merge last in tier. |

**After each Phase 3 merge: run `npx tsc --noEmit` and `npx jest --passWithNoTests`. Gate is green = proceed.**

---

### TIER 2 — Currently Open, Ready to Merge Now

Safe to execute any time — low risk, patch-level only.

| Priority | Branch | Classification | Risk | Notes |
|----------|--------|---------------|------|-------|
| 6 | `dependabot/npm_and_yarn/navigation-6e8bb8dbec` | **READY TO MERGE** | 🟢 Patch | `@react-navigation/bottom-tabs` 7.16.1→7.16.2, `@react-navigation/native` 7.2.4→7.2.5. Pure patch bumps, 0 conflicts. |
| 7 | `dependabot/npm_and_yarn/supabase-cb5af0f2dc` | **READY TO MERGE** | 🟢 Patch | `@supabase/supabase-js` 2.106.0→2.106.2. Patch bump only, 0 conflicts. |

---

### TIER 3 — Needs Review Before Merge

These branches are open but require human or agent review before merging.

| Priority | Branch | Classification | Risk | Notes / Blockers |
|----------|--------|---------------|------|-----------------|
| 8 | `jordan/privacy-policy-gaps-2026-05-29` (local) | **NEEDS REVIEW** | 🟡 Medium | 3 commits: EAS CI hardening + privacy policy + incident response docs. **BLOCKER: Branch adds email (`skylerhalisky@gmail.com`) and Apple Team ID (`S78F8ZA8QU`) in plaintext eas.json comments.** Strip PII before merge. Also: EAS CI workflow changes (`.github/workflows/eas-build.yml`, `eas-testflight-submit.yml`) need Steve sign-off on trigger logic. |
| 9 | `dependabot/npm_and_yarn/testing-1892e18127` | **NEEDS REVIEW** | 🟠 Major | jest 29→30, @types/jest 29→30, jest-expo 54→56. All major bumps. jest 30 has breaking config changes. Needs a dedicated test run session — do NOT merge during Phase 3 wave. Schedule as a standalone task post-TestFlight. |
| 10 | `dependabot/npm_and_yarn/typescript-and-tooling-f9bad71ae8` | **NEEDS REVIEW** | 🔴 High | TypeScript 5.9→**6.0**, ESLint 9→**10**, babel-preset-expo 55→56. **ESLint 10 removed the flat config API — memory note confirms ESLint v9 is pinned for this reason.** TypeScript 6.0 is a major release with strict breaking changes. Requires dedicated upgrade session with full TSC + test validation. Do NOT merge during Phase 3 wave. |

---

### TIER 4 — Do Not Merge (Dedicated Upgrade Cycle Required)

These Dependabot branches propose major SDK upgrades that require a coordinated native rebuild. Not part of any Phase 3 wave.

| Branch | Classification | Notes |
|--------|---------------|-------|
| `dependabot/npm_and_yarn/expo-ecosystem-6783eb380c` | **DO NOT MERGE** | Expo 54→56, RN 0.81.5→0.85.3. **6 conflicts.** Moves react-native jest preset to `@react-native/jest-preset` (breaks current test setup). Requires native rebuild, new `expo prebuild`, and dedicated upgrade session. |
| `dependabot/npm_and_yarn/expo-ecosystem-d866db6920` (remote) | **DO NOT MERGE** | 18 packages, mixed SDK 54/56 versions, includes gesture-handler 2→3 (breaking) and async-storage 2→3 (breaking). |
| `dependabot/npm_and_yarn/expo-ecosystem-1e3a8a4cca` | **DO NOT MERGE** | 17 packages, expo core 54→56, gesture-handler 2→3, async-storage 2→3. Same upgrade cycle as above. 0 conflicts on paper, but will break at runtime/test time. |
| `dependabot/npm_and_yarn/expo-ecosystem-d866db6920` (local) | **DO NOT MERGE** | Local branch with extra `.npmrc` fix commit on top of the remote. Same risks as above. |

**Expo SDK upgrade plan:** Treat this as a separate sprint item after TestFlight is live. Steps: `expo upgrade`, `expo prebuild --clean`, full native rebuild, test suite validation, Gary gate.

---

## Security Branch (Parallel, Merge Alongside Tier 1)

| Branch | Status | Notes |
|--------|--------|-------|
| `security/eas-json-pii-cleanup` | **READY — pushed to origin** | Replaces hardcoded `ascAppId: "6774709116"` with `"$EXPO_ASC_APP_ID"` env var. Steve medium flag. Add `EXPO_ASC_APP_ID` to GitHub Secrets before TestFlight submit runs. |

---

## Known Conflict / Dependency Map

```
jordan/privacy-policy-gaps-2026-05-29
  └─ BLOCKED BY: PII in eas.json comments (strip email + team ID before merge)
  └─ DEPENDENCY: security/eas-json-pii-cleanup merged first (eas.json base is clean)
  └─ NEEDS: Steve sign-off on EAS CI trigger changes

testing-1892e18127
  └─ BLOCKED: jest 29→30 breaking config. Standalone session, post-TestFlight.

typescript-and-tooling-f9bad71ae8
  └─ BLOCKED: ESLint 10 breaks existing config (memory: v9 pinned). TypeScript 6 major.

expo-ecosystem-* (all 3 variants)
  └─ BLOCKED: SDK 54→56 requires native rebuild + full upgrade session.
  └─ NOTE: node_modules drift (expo 56 / RN 0.85 in disk vs lock 54/0.81) is pre-existing —
     cause unknown, possibly a prior `expo upgrade` outside npm. npm ci restores correct state.
```

---

## Phase 3 Merge Runbook (execute when branches arrive)

```bash
# For each Phase 3 branch (in Tier 1 priority order):
git fetch origin
git merge --no-commit --no-ff <branch>
# → if conflicts: take branch version for new files, main version for existing
# → resolve, git add, then:
git commit -m "merge(<type>): <branch> — <one-line description>"

# Post-merge gate (BOTH must be green before proceeding to next branch):
npx tsc --noEmit            # must exit 0
npx jest --passWithNoTests  # must exit 0, watch for count regression

# After ALL Phase 3 branches merged:
git push origin main
```

---

## DECISIONS FOR SKY

| # | Decision | Action |
|---|----------|--------|
| D1 | **Add `EXPO_ASC_APP_ID` to GitHub Secrets** | Settings → Secrets → Actions → New secret. Value: `6774709116` (your App Store Connect numeric Apple ID). Required for `eas submit` CI step to work after `security/eas-json-pii-cleanup` is merged. |
| D2 | **Jordan branch PII** | Before merging `jordan/privacy-policy-gaps-2026-05-29`, the eas.json comments block must be stripped (email + team ID in plaintext). Rory can apply fix on a fixup commit — give the go-ahead. |
| D3 | **ESLint 10 upgrade plan** | `typescript-and-tooling-f9bad71ae8` (ESLint 9→10, TypeScript 5→6) needs a dedicated upgrade sprint. Recommend scheduling post-TestFlight. Approve or defer. |
| D4 | **Expo SDK 56 upgrade** | All `expo-ecosystem-*` Dependabot PRs propose SDK 54→56 (or mixed). Plan a dedicated native rebuild sprint. Recommend closing mixed-SDK PRs and waiting for a clean SDK 56 PR after TestFlight ships. |
