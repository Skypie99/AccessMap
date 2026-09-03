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

### CURRENT_MAIN design (what's actually live in production today)

`src/lib/flags.ts:1401-1424` — `deleteFlag(flagId)` does a **direct client-side call**: `supabase.from('flags').delete().eq('id', flagId).select('id')`. The docblock immediately above it (`src/lib/flags.ts:~1364-1400`) states this is deliberate: *"RLS allows the row delete only when `user_id = auth.uid()`"* for owners, and for admins *"both [flags' `admin delete any flag` and the Storage `flag-photos admin delete` policy] were verified present in the live catalog on 2026-08-18"* / *"the column grant went live 2026-08-18 (verified against the live DB 2026-08-19: `authenticated` has SELECT on users.is_admin...). Delete works for owners and admins now."* This prose comment is the **only** record of that live-DB verification anywhere in the repo — it is not a re-runnable test, just a claim frozen in a comment on the date it was checked. It is consistent with this audit's given KNOWN PRODUCTION FACT that production `public.flags` still has the `admin delete any flag` policy and `authenticated` still holds DELETE — i.e. production is running CURRENT_MAIN's original (RLS-gated direct-delete) design, not Build 33's hardened design (see below).

Two call sites, both client components:
- `src/screens/AdminScreen.tsx:146,254,264` — `handleRemove(flag)` (admin path): confirm dialog ("Remove flag?") → `deleteFlag(flag.id)` → on success, purely local `setFlags((prev) => prev.filter((f) => f.id !== flag.id))` (**no re-fetch/reload from the server to confirm the row is actually gone**) → on failure, `Alert.alert('Error', errorMessage(e))`.
- `src/components/FlagDetailModal.tsx:1033-1055` — `handleDelete()` (owner path): confirm dialog ("Delete this flag?") → `deleteFlag(shownFlag.id)` → `onDeleted(shownFlag.id); onClose()` (again local-only, no reload) → failure → `notify('Could not delete flag', ...)`.

### Existing tests touching this, main branch

| Test file | What it asserts | Mocks backend? | Bypasses RLS? | Tests child/handler only? | Asserts persisted deletion? | Refreshes/reloads? | Auth role assumed | Stale? | Runs in CI? |
|---|---|---|---|---|---|---|---|---|---|
| `src/lib/__tests__/flags.supabase.test.ts:293-306` (`describe('deleteFlag')`) | `deleteFlag()` resolves on `{data:[{id:'f1'}], error:null}`; rejects and forwards Supabase error object on `{error:{...}}`. Uses a generic Proxy-based chain mock (`makeChain`, lines 55-94) that resolves any `.select()/.eq()/...` chain to a queued result — does not model the specific `.delete().eq().select()` call shape by construction, just its return value. | Yes, 100% (`jest.mock('../supabase', …)`, line 100) | Yes — RLS cannot execute inside Jest; the mock supplies whatever `{data,error}` the test author chose | Tests `deleteFlag()` the library function only, not any screen/component | Only within the mock's own state (asserts the *promise resolves*, not that a row is gone from anywhere real) | N/A (unit-level) | None modeled — no auth/session/role concept in this mock at all | No (matches current `flags.ts` signature) | Yes — `test:ci` in `ci.yml` |
| `src/lib/__tests__/sr050DeleteFlagPhotos.test.ts:152-313` | Much richer: photo cleanup ordering (gather-before-delete), dedup across legacy `photo_url` + `flag_photos` junction, "admin path degrades rather than throws when Storage refuses the photo delete" (lines 216-229, tagged "the ADMIN path" in a comment), and — the key block — **`describe('deleteFlag tells a refusal apart from a success')` (lines 295-313) explicitly tests the `{data:[], error:null}` shape** (an RLS-filtered "success over zero rows" response) and asserts `deleteFlag()` converts it into a thrown `code:'42501'` error, and that photos are left alone when the row-delete is refused. | Yes, 100% (`jest.mock('../supabase', …)`, line 35) — `mockFrom`, `mockStorageFrom`, `mockGetUser` are all hand-wired jest.fn()s | Yes — the "0 rows back" RLS-refusal behavior is *asserted as a hypothesis the mock is told to produce*, not observed from a real Postgres. This proves the **client-side interpretation logic** is correct (IF Supabase-the-real-thing really does return 0-rows-no-error on a denied DELETE, which is correct Postgres RLS semantics, THEN `deleteFlag()` correctly detects it) — it does **not** prove the *actual deployed* `flags` RLS policy set denies who it should deny | Tests `deleteFlag()` the library function only | Only within the mock | N/A | None modeled | No | Yes — `test:ci` |
| `src/lib/__tests__/admin.test.tsx` | `useIsAdmin()` hook (the gate that decides whether the **Admin tab itself renders**) — true/false/error-degrades-to-false/signed-out cases; plus a source-text guard on `RootNavigator.tsx` pinning `{isAdmin === true && (` (strict equality, not truthy) for the Admin route registration | Yes, fully mocked `supabase.auth.getUser` / `.from().select().eq().single()` | Yes | Tests the hook + a navigator source-string pin, not `AdminScreen` itself | N/A — doesn't touch delete at all | N/A | Admin / non-admin / errored-read / signed-out, for the **gate**, not the delete action | No | Yes — `test:ci` |
| `src/__tests__/qaMergeConsolidation.test.ts:77-`* | Reads `AdminScreen.tsx` as text (`read('screens/AdminScreen.tsx')`) and asserts severity renders as text+number, not colour alone (an accessibility guard, WCAG 1.4.1) | N/A — pure source-text grep, no mock/render at all | N/A | N/A — not a delete-flow test | No | No | N/A | No | Yes — `test:ci` |

\* Only other file anywhere that even opens `AdminScreen.tsx` in a test context; it is an accessibility copy/contrast guard, unrelated to the delete action itself.

**`AdminScreen.test.tsx` does not exist anywhere in the repo** (`src/screens/__tests__/` has 38 files; none is Admin-named — confirmed by directory listing). **No test renders `AdminScreen`, presses "Remove flag", or asserts `handleRemove`/`deleteFlag` was invoked with the tapped flag's id, that the confirm dialog gates it, that a failure shows `Alert.alert`, or that the local list update matches what the (mocked or real) backend reported.** Same for the owner path: `FlagDetailModal`'s only test file, `FlagDetailModal.sheetPresentation.test.tsx`, mounts the component with `onDeleted={jest.fn()}` purely to satisfy required-prop types for an unrelated bug (SW-46, modal-presentation VC nesting) — grep confirms `"Delete this flag"` (the button's `accessibilityLabel`) and `handleDelete` appear in **zero** test files anywhere in the repo (`grep -rln "Delete this flag"` / `grep -rln "handleDelete"` across all `*.test.ts(x)` both return empty). The two UI call sites of `deleteFlag()` — the only two places in the shipped app a human can actually trigger a flag deletion — are therefore **completely untested above the library-function layer**, on both main and Build 33.

### Build 33 delta (`f5594171`, submitted App Store source — NOT in main)

Build 33 rewrites `deleteFlag()` entirely: `src/lib/flags.ts` no longer calls `.from('flags').delete()` at all — it calls `supabase.functions.invoke('delete-flag', { body: { flagId } })`, confirmed textually by `src/__tests__/d1f4r3Fix2ReviewReplay.test.ts:186-190` (`expect(flags).toContain("supabase.functions.invoke('delete-flag'"); expect(flags).not.toMatch(/from\(['"]flags['"]\)\s*\.delete\(/)`). The companion migration (`20260828020000_d1f4r3_fix2_review_replay_and_flag_delete.sql`, referenced but not independently opened in this pass) is asserted (again textually) to `revoke delete on table public.flags from public, anon, authenticated` and `drop policy ... "admin delete any flag"` — i.e. Build 33's *intent* is to close the direct-delete surface entirely and funnel every delete through a service-role-only Edge Function.

| Test file | What it asserts | Mocks backend? | Bypasses RLS? | Persisted deletion? | Runs in CI? |
|---|---|---|---|---|---|
| `src/lib/__tests__/d1f4r3CanonicalReportDelete.test.ts` (37 lines, full text read above) | `deleteFlag()` calls `functions.invoke('delete-flag', {body:{flagId}})`; rejects with `'confirmed terminal result'` if the Edge Function reports a non-terminal `status:'pending'`; forwards the Edge Function's `error` verbatim rather than "erasing relational UI state optimistically" | Yes, 100% — `jest.mock('../supabase', ...)` stubs only `functions.invoke` | Yes | Only within the mock (`mockInvoke.mockResolvedValue(...)`) | Not in any CI workflow found in Build 33 (Build 33's `ci.yml` is **byte-identical** to main's — confirmed via `diff`) but *would* run under `npm run test:ci` same as any other `*.test.ts` if that workflow ran on this ref |
| `src/__tests__/d1f4r3Fix2ReviewReplay.test.ts` — `describe('D1F4R3-FIX2 direct flag deletion containment')` (bottom of file) | Reads the migration SQL, `supabase/schema.sql`, and `flags.ts` **as raw text** and asserts specific substrings are present/absent (`revoke delete on table public.flags from public, anon, authenticated;`, `drop policy if exists "admin delete any flag"...`, `supabase.functions.invoke('delete-flag'`, absence of `from('flags').delete(`) | N/A — no mock, no execution; pure `fs.readFileSync` + `.toContain()`/`.not.toMatch()` string assertions | N/A — never touches a database | **No** — proves the migration *file* contains the right SQL text, not that the SQL ever ran against any real catalog | Would run under `test:ci` if this ref's CI ran; same ci.yml as main |
| `supabase/tests/d1f4r3_fix2_flags_delete_rls.test.sql` (58 lines, full text read above) | **The one test in the whole repo (either branch) that actually exercises real Postgres RLS**: pgTAP assertions that `anon`/`authenticated` have no `DELETE` table privilege on `public.flags`, `service_role` retains it, no `DELETE`/`ALL` policy remains in `pg_policies`, and — the sharpest check — literally attempts `delete from public.flags where user_id = '<uid>'` (and a second attempt as a different uid targeting someone else's row) as `role authenticated` via `set_config('request.jwt.claim.sub', ...)`, asserting both throw `42501` | **No** — this is the one file designed to run against a real Postgres, not a mock | **No** — this is the one file that actually invokes RLS | **Yes, in principle** — but only for the grant/policy-absence side, and only if it is ever executed | **Never.** The file's own header comment says *"Staging-only pgTAP proof... Run after an authorized migration apply against the real catalog."* Confirmed by repo-wide search: it is referenced only in two hand-written qa-report writeups (`qa-reports/2026-08-28_Codex_D1F4R3_FIX2.md:90` — *"Applying the migration to an authorized non-production catalog... and executing `supabase/tests/d1f4r3_fix2_flags_delete_rls.test.sql`"* — listed as **not yet done** at time of writing) and a "proposed" migration file's own comment. **No package.json script and no GitHub Actions workflow reference this filename anywhere in Build 33.** The only workflow that spins up a real ephemeral Postgres, `.github/workflows/mod1r-fix1-rls-proof.yml`, is `push`-triggered on exactly two unrelated, non-`main` branch names (`claude/mod1r-fix1-acceptance-20260828`, `claude/mod1r-fix2-retry-durability-20260828`) and only runs a *different* SQL pair (`supabase/tests/mod1r_fix1/00_baseline.sql` + `10_proof.sql`, for a different pair of blockers — report-read authorization and direct INSERT into 'rejected' — per that workflow's own header comment). |
| `qa-reports/2026-08-28_Claude_D1F4R3_FIX3_ReviewAudit.md:58,88` (not a test file, but load-bearing evidence about test *execution*, not just existence) | States the sibling file `d1f4r3_fix3_review_audit.test.sql` **was** run once, by hand, "via a strict local shim implementing `plan`/`is`/`ok`/`throws_ok`/`finish`" — i.e. a human-written pgTAP-lookalike, not real pgTAP, not in CI, run during one work session | — | — | — | The same report explicitly lists as still-outstanding at that time: *"the real Supabase catalog and migration chain... effective deployed grants/RLS, owner/admin JWT direct-DELETE denial, the deployed Edge runtime, Storage/Auth behavior"* |
| `supabase/tests/promptb_media_key_guards.test.sql` | 25 transactional pgTAP assertions (different feature, media-key read contract) | — | — | — | `qa-reports/2026-08-30_Codex_ProductionSchemaContractP0.md:56` marks it explicitly **"NOT RUN / BLOCKED (requires PostgreSQL + pgTAP)"** — cited here only as corroboration that this repo's pattern is consistently "pgTAP file exists in the tree, is not wired to any automated runner." |

`.github/workflows/mod1r-fix1-rls-proof.yml` does not exist on CURRENT_MAIN at all (Build-33-only addition) — so even the narrow, wrong-branch, wrong-SQL-file version of "run a real Postgres in CI" has zero presence on the branch everything actually merges to.

### Explicit answers

**EXISTING_TEST_COVERAGE:** Extensive at the pure-function/mocked-client-library layer (`deleteFlag()` success/error/RLS-refusal-shape are all exercised with a fully mocked Supabase client, in both the main design (direct delete) and the Build 33 design (Edge Function invoke)); a real pgTAP proof of the actual RLS/grant state exists **only in Build 33** (`d1f4r3_fix2_flags_delete_rls.test.sql`) and is designed for manual staging execution, never wired into any CI workflow on any branch, and per the audit's own qa-reports was still unexecuted-against-a-real-catalog as of its last write-up. Zero coverage of the UI layer (`AdminScreen.handleRemove`, `FlagDetailModal.handleDelete`) on either branch — no test renders either screen/modal and exercises its delete button, in ANY form (not even a mocked-backend component test).

**DO_EXISTING_TESTS_PROVE_REAL_DELETE: NO.**

**WHY_TESTS_WOULD_NOT_CATCH_A_BROKEN_ADMIN_DELETE:**
1. **Mocked-backend class** — every Jest test for `deleteFlag()` (main and Build 33) fully replaces `../supabase`; the mock always returns exactly what the test author scripted. A real RLS policy that is missing, mis-scoped (e.g. matches the wrong `user_id`/`is_admin` predicate), or has a typo'd `USING` clause cannot make any of these tests fail — the tests never ask Postgres a question.
2. **"Edge Function not deployed" class** — Build 33's `deleteFlag()` depends on a `delete-flag` Edge Function that, per this audit's given production facts, is not deployed. `d1f4r3CanonicalReportDelete.test.ts` mocks `functions.invoke` directly, so it cannot express "the function doesn't exist on this project" as a distinct failure mode from "the function returned an error" — both collapse to the same mocked `{error}` shape. If Build 33 were live, every admin (and owner) delete would either hard-fail (safe-ish: user sees an error alert, per the `catch`/`Alert.alert` wiring in both call sites) or behave in some way no test anywhere describes, because nothing in the suite models a genuinely absent function.
3. **"Migration not applied" class** — Build 33's entire `flags` DELETE containment story (revoke grants, drop `admin delete any flag`, force everything through the Edge Function) lives in a migration that, per given production facts, is not applied. `d1f4r3Fix2ReviewReplay.test.ts`'s containment assertions and `d1f4r3SourceClosure.guard.test.ts` only read the migration **file** as text — a migration can be 100% textually correct and 100% unapplied, and every one of these guard tests still passes. The one artifact that would catch "unapplied in production" (re-running the pgTAP proof against the actual project) is never automated, per the point above.
4. **No UI-level test on either branch** — even a perfect backend gives no assurance the button wiring is intact: nothing asserts `AdminScreen`'s "Remove flag" press actually calls `deleteFlag` with the correct id, that a thrown error surfaces to the admin instead of silently no-op'ing, or that a stale `flags` array (the optimistic local `filter()`, not a re-fetch) doesn't mask a backend failure that a differently-shaped error object might slip past `catch`.
5. **No CI wiring even for the tests that exist and could catch a real bug** — the sole real-Postgres-backed RLS proof for flags-delete (`d1f4r3_fix2_flags_delete_rls.test.sql`) is scoped to nothing (no workflow references it); the one workflow that *does* boot a real Postgres in CI (`mod1r-fix1-rls-proof.yml`, Build-33-only) is triggered on two specific stale branch names, not `main`, not any branch carrying the flags-delete change, and runs a different SQL pair for a different pair of bugs. A regression here would need to be caught by a human manually running `psql` against a real catalog and remembering to do so — nothing automated will.

---

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
