# Lane H — Test / CI confidence inventory (CURRENT_MAIN, with Build 33 deltas)

Worktree: /Users/skypie/AccessMap-deep-audit-20260902
CURRENT_MAIN evidence base: origin/main SHA `70b52a30` (worktree HEAD `019a0a86` is `70b52a30` + one docs-only commit `docs(qa): scaffold Flagstone deep audit state files` that touches only `qa-reports/2026-09-02_FlagstoneDeepAudit/*` — verified via `git show --stat`; zero app-code drift from CURRENT_MAIN).
Build 33 evidence base: commit `f5594171` (113 commits ahead of main), read via `git show f5594171:<path>` / `git ls-tree -r --name-only f5594171 <dir>`.
Status: DRAFT — being filled incrementally. Treat any section still marked `(pending)` as not yet audited.

---

## Test census table

Source: `find . -type f \( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.test.js" \) -not -path "*/node_modules/*" -not -path "*/.claude/*"` cross-checked against `npx jest --listTests` (both return 243 files — no silent exclusions beyond `jest.config.js`'s own `testPathIgnorePatterns`).

| Folder | Test files |
|---|---|
| `src/lib/__tests__/` | 105 |
| `src/__tests__/` (top-level guard/journey suites) | 39 |
| `src/components/__tests__/` | 38 |
| `src/screens/__tests__/` | 38 |
| `src/components/ui/__tests__/` | 9 |
| `src/navigation/__tests__/` | 6 |
| root `__tests__/` (MapClustering, OfflineIndicator, WatchedFlagsSearch) | 3 |
| `src/hooks/__tests__/` | 3 |
| `src/moderation/__tests__/` | 1 |
| `scripts/__tests__/` | 1 |
| **Total** | **243** |

Note: `jest.config.js` `testPathIgnorePatterns` excludes `/node_modules/`, `/.expo/`, `/.claude/` (orchestrator worktree mirrors), and `/__tests__/support/` (shared helpers, not suites — e.g. `src/__tests__/support/stripComments.ts`). No test files were found under `.claude/` mirrors that would double-count.

(Per-file `it`/`test` case counts and Build-33-delta test files are covered in later sections; this table is file-count census only, per SCOPE item 2.)

---

## Skips / todos / only (file:line)

`grep -rn` for `describe.skip`, `it.skip`, `test.skip`, `xit(`, `xdescribe(`, `.todo(`, `it.only`/`test.only`/`describe.only`/`fit(`/`fdescribe(` across `src/`, `__tests__/`, `scripts/` on CURRENT_MAIN:

- **`describe.skip` / `it.skip` / `test.skip` / `xit` / `xdescribe` / `.only` / `fit` / `fdescribe`: ZERO matches anywhere in the main tree.** No test is silently disabled via these mechanisms.
- **`it.todo(...)`: 32 matches, all in 4 files.** These are explicit, documented stubs for behavior that has never been exercised by any test — not soft-skips of previously-passing tests. No dates in the todo text (not stale-skip debt in the traditional sense; the files' own header comments explain why they're stubs — see Mock Truthfulness section).

| File | Lines | Count | What's stubbed |
|---|---|---|---|
| `src/screens/__tests__/MapScreen.heatmap.test.tsx` | 182,184,186,188,190,192,260,268,270,272,274,276,278,280 | 14 | Heatmap layer toggle visibility, recompute-on-filter-change, legend, k-anonymity disclaimer text, gradient/density rendering, cell tap interaction, filter-panel-driven updates, AsyncStorage persistence of visibility pref |
| `__tests__/MapClustering.test.tsx` | 64,66,68,70,72,74,76 | 7 | ClusterLayer DivIcon rendering, cluster-tap zoom, aria-label wiring, individual-pin rendering post-expansion, cluster count badge, bbox culling, supercluster index rebuild on flags-prop change |
| `__tests__/WatchedFlagsSearch.test.tsx` | 114,118,125,126,127,128 | 6 | MyWatchedModal empty-search-result state, clear-search restores list, status-chip filtering (Open/Resolved/All), combined text+chip filter |
| `__tests__/OfflineIndicator.test.tsx` | 133,135,137,139,141 | 5 | Badge visibility on/off `isOfflineCache`, `accessibilityLiveRegion="polite"` wiring, badge text, badge dismissal on network recovery |

Each file's header comment gives the same root cause: these are component/integration-level assertions that need a live DOM (react-leaflet `useMap()` + real `MapContainer`), a full native map render (react-native-maps), or a Supabase-backed navigation fixture — none of which Jest/jsdom can provide, and **no Playwright/Detox/Maestro harness exists anywhere in the repo** (`grep -rniE "playwright|detox|maestro"` over `package.json`/`eas.json`/`app.json` and a repo-wide filename search both return zero hits). The files explicitly recommend Playwright/Detox as the intended future home for these cases. Net effect: heatmap layer behavior, map clustering interaction, watched-flags search/filter UX, and the offline-cache indicator's actual on-screen behavior are **only pinned at the pure-function/string-constant level** (color mapping, k-anonymity math, aria-label string template, AsyncStorage key helpers) — the component wiring itself is untested by anything in CI.

(Build 33 delta skip/todo comparison: pending — see Section 29 and journey-coverage sections below.)

---

## CI workflows (name | trigger | gates | notes)

5 workflow files in `.github/workflows/`: `ci.yml`, `eas-build.yml`, `eas-testflight-submit.yml`, `lighthouse.yml`, `release-identity.yml`. All checked out here are from CURRENT_MAIN; Build 33 adds a 6th (`mod1r-fix1-rls-proof.yml`, not in main — covered under Section 29).

| Workflow | Trigger | Jobs / gates | Notes |
|---|---|---|---|
| `.github/workflows/ci.yml` | `pull_request` → main, `push` → main | `typecheck` (`tsc --noEmit`); `lint` (`eslint src --ext .ts,.tsx`); `test` (`npm run test:ci -- --passWithNoTests --forceExit --watchAll=false` = `jest --ci --coverage` with 80% global threshold on `src/**` per `jest.config.js` `collectCoverageFrom`); `perf-budget` (web bundle ≤2MB gzipped, `dist` missing → skip-pass) | `permissions: contents: read` (repo-wide). **`format:check` (Prettier) is NOT run anywhere in CI** — deliberately, per an in-file comment (ci.yml lines ~30-48): it has been red 25/25 runs since it was added, and running `prettier --write src` touches 178 files and breaks 5 guard tests (privacyLink, terms, bp10SeverityGrammarGuards, tasksHeaderReclaim, qaMergeConsolidation) that pin exact source whitespace for ratified copy/a11y wiring. `npm run format:check` exists as an npm script but is CI-dead — anyone can run it locally, nothing gates on it. This matches the lead auditor's note that `format:check` was run manually, not via CI. |
| `.github/workflows/eas-build.yml` | `workflow_dispatch` only (manual; comment states it was previously push-triggered on every branch and that was deliberately removed as unsafe) | typecheck + `npm test -- --passWithNoTests --forceExit` as "safety gate"; explicit guard step fails the run if `profile == production`; then `eas build` for development/preview/preview2/preview3 only, gated on `EAS_TOKEN` secret being set (silently skips the actual build step, not the workflow, if unset) | Cannot submit to the App Store (guarded out); can still consume EAS build minutes and produce an installable dev/preview build from any branch a human dispatches it from, with no environment/reviewer gate — the only human gate is "someone with repo write access clicked Run". |
| `.github/workflows/eas-testflight-submit.yml` | `workflow_dispatch` only, with a text input `d8_closed` (must literally be the string `"yes"` to unlock `profile=production`) | `environment: release-approval` (GitHub Environment protection — **cannot be confirmed from repo files; GitHub Environment reviewer config lives in repo Settings, not in tracked files, and this audit is network-free/read-only against the local worktree.** The workflow's own comment says: *"Until that environment exists with a reviewer, treat this workflow as not-yet-armed"* — i.e. the workflow author documents this as an open precondition, not a proven one); privacy gate blocks `profile=production` unless `d8_closed=yes`; typecheck + test as gates; then `eas build` **and** `eas submit --platform ios --profile production --latest --non-interactive` to App Store Connect; then optionally creates a GitHub Release. | **This is the one workflow in the repo that can ship to the App Store**, and the D8 privacy gate is purely self-attested: the guard only string-compares the dispatch input to `"yes"` — it does **not** read `PROJECT_STATE.md` or any code to verify D8 is actually closed, despite the comment directing the operator to check that file first. So the gate is "a human typed the word yes," not an automated proof. `permissions: contents: write` is explicitly declared (needed for `softprops/action-gh-release`) — the workflow's own header comment documents this was retrofitted after a 2026-07-31 security audit found it previously had NO `permissions:` block while holding `EAS_TOKEN` + Apple credentials, i.e. it inherited an undeclared (possibly org-wide read-write) `GITHUB_TOKEN`. Not push/tag-triggered (fixed from a prior version that auto-shipped on `v*` tags per its own comment). |
| `.github/workflows/lighthouse.yml` | `pull_request` → main | `npx expo export --platform web` + `serve` + `@lhci/cli autorun` against `.lighthouserc.js` (`categories:accessibility` hard-gated `error` at ≥0.90; performance/best-practices/SEO are `warn`-only, non-blocking) | `permissions: contents: read`, explicitly retrofitted post-audit (same 2026-07-31 finding pattern as above — no `permissions:` block previously). Only `error`-level Lighthouse assertion is accessibility; a performance or SEO regression cannot fail this workflow, only annotate it. |
| `.github/workflows/release-identity.yml` | `pull_request` (path-filtered to release/control-plane files) and `push` → main (same path filter) | `git fetch` full history + frozen `release/*` refs, refuses to run on a shallow clone; `npm run release:preflight`, `release:verify`, `release:status` — Node-built-ins-only scripts, no `npm ci` needed | Network-free by design (never calls `release:web:verify-live` or production). Proves Git-object-level consistency of `release/current.json` (SHA/tree provenance, EAS source == intended source, ancestry) — **it does not and cannot verify backend state**: whether a migration referenced by a release was actually applied to the Supabase project, or an Edge Function actually deployed, is entirely outside what any of `scripts/release-*.mjs` / `scripts/verify-*.mjs` check (confirmed by reading their header comments — see Release/build-submit guard review section). This is the general-purpose version of the Section 29 "migration not applied" / "Edge Function not deployed" blind spot: no CI workflow in this repo checks backend deployment state at all, for any feature. |

**Secrets referenced by workflows:** `EAS_TOKEN` (eas-build.yml, eas-testflight-submit.yml), `APPLE_TEAM_ID` (eas-build.yml), `EXPO_APPLE_TEAM_ID` / `EXPO_APPLE_ID` / `EXPO_APPLE_PASSWORD` (eas-testflight-submit.yml — an actual Apple Developer account password held as a GitHub Actions secret), `LHCI_GITHUB_APP_TOKEN` (lighthouse.yml, optional). Only `eas-build.yml` and `eas-testflight-submit.yml` touch EAS/Apple credentials or can produce a build artifact; only `eas-testflight-submit.yml` can submit one.

**Husky:** `.husky/pre-commit` — local-only (not a CI workflow, runs on `git commit` via the `prepare: husky` npm script). Secret-scan grep over staged diff only (Supabase service_role JWT `eyJ…`, new-format `sb_secret_…`, AWS keys, generic `api_key`/`token`/`secret` assignments ≥20 chars, PEM private-key blocks, hard-coded passwords incl. markdown-table and SQL-comment forms). Self-excludes its own file from scanning (documented rationale: the file necessarily contains the detector patterns themselves). Escape hatch is documented (`git commit --no-verify`) — this is a local dev-machine gate only; nothing in CI re-runs this scan, so a `--no-verify` commit or a push from a machine without the hook installed bypasses it entirely with no server-side backstop.

---

## Mock truthfulness + false-confidence patterns

*(pending)*

---

## Journey coverage matrix

*(pending)*

---

## Section 29 — admin delete test coverage (explicit answers)

*(pending)*

---

## Release / build-submit guard review

*(pending)*

---

## Stale fixtures

*(pending)*

---

## Candidate findings

*(pending — populated as sections above are finalized)*

---

## Coverage gaps

*(pending)*
