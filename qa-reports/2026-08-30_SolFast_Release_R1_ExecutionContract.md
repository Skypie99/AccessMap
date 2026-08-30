# Flagstone Release R1 Exact Provenance Execution Contract

## Inputs

| Input | Verified value |
|---|---|
| Repository | `Skypie99/AccessMap` |
| R0 report commit | `ffe14b6b09e3596638914160aae0626d3162f207` |
| R0 report remote | `origin/codex/solfast-release-r0-preflight-20260830` |
| R0 audited source / required R1 base | `2762a5447600e8de55be912ccb26e95456484945` |
| R1 audit date | 2026-08-30 |
| R1 scope | Release-mechanics execution contract only; product read-only |

The R0 commit, its report, and the audited source commit were fetched from `origin` and resolved to the exact 40-character SHAs above. This R1 branch starts exactly at `2762a5447600e8de55be912ccb26e95456484945`.

R0's three established blockers remain present at the audited source:

1. `.github/workflows/eas-testflight-submit.yml` omits `testflight`, defaults to `preview`, and permits three internal-distribution profiles.
2. The workflow builds first and later submits `--latest`, so the submitted artifact is not bound to that build invocation.
3. `package.json` exposes two deploy commands that repeat build then `submit --latest`.

Direct source also shows one relevant current-documentation contradiction that R1 must correct: the release workflow exposes the repository secret as `EAS_TOKEN`, while current Expo CI documentation requires the EAS personal access token in the process environment as `EXPO_TOKEN`. The future source should reference a GitHub secret named `EXPO_TOKEN`; no secret value belongs in source or this report.

## Current Official Tooling Semantics

Only current official Expo and GitHub sources were used as tooling authority.

| Tooling fact | Current documented semantics | Contract consequence |
|---|---|---|
| EAS auto-submit | `eas build --auto-submit` passes the build to EAS Submit when it completes. | Build and submission can be one EAS-coupled operation rather than two artifact-discovery operations. |
| Auto-submit profile | Plain `--auto-submit` uses a submit profile with the same name as the build profile; `--auto-submit-with-profile=<name>` uses the named submit profile. | Use `build.testflight` with `--auto-submit-with-profile=production`; do not duplicate `submit.production` into `submit.testflight`. |
| Explicit EAS build selection | `eas build:submit --id <value>` submits the build with that ID. | Exact `--id` is safe, but unnecessary when documented build-coupled submission is available. |
| Latest EAS build selection | `--latest` means “Submit the latest build for specified platform.” | `--latest` is forbidden in every executable canonical release surface. |
| EAS JSON output | `eas build --json` is machine-oriented JSON output and implies non-interactive mode. | Explicit-ID extraction is supportable without parsing prose, but still adds output/schema plumbing that auto-submit does not need. |
| EAS wait | `eas build` supports `--wait`; the current CLI waits by default. | The canonical command states `--wait` explicitly so a failed build or auto-submission cannot be presented as a completed workflow. |
| EAS CLI version | The current official CLI reference is version `23.0.0`. | Pin canonical CI to `eas-cli@23.0.0`; do not resolve `latest` during a release run. |
| iOS submit boundary | EAS Submit uploads the binary to App Store Connect; it appears in TestFlight after Apple processing. Public release requires a later manual App Review submission. | This workflow is a TestFlight upload workflow, not an App Store review/release workflow. |
| `workflow_dispatch` SHA | `GITHUB_SHA` is the last commit on the dispatched `GITHUB_REF` branch or tag; the dispatch supplies a concrete ref and inputs. | A required accepted-SHA input can be compared to the event SHA, then to the checked-out HEAD. |
| Manual dispatch UI | The operator selects a branch/tag when running the workflow. | The selected ref must resolve to the accepted SHA at dispatch; branch movement before dispatch fails the SHA assertion. |
| Default checkout | For the triggering repository, checkout defaults to the ref/SHA for the event. | Use normal event checkout and prove HEAD equality; do not override checkout with an unrelated user string. |
| Re-runs | A re-run uses the original event's `GITHUB_SHA` and `GITHUB_REF`. | The same SHA assertions remain valid on re-run; record `GITHUB_RUN_ATTEMPT` separately. |

Official sources:

- Expo, **Automate submissions**: <https://docs.expo.dev/build/automate-submissions/>
- Expo, **EAS CLI reference** (current version `23.0.0`): <https://docs.expo.dev/eas/cli/>
- Expo, **Submit to the Apple App Store with EAS Submit**: <https://docs.expo.dev/submit/ios/>
- Expo, **Trigger builds from CI** (`EXPO_TOKEN`): <https://docs.expo.dev/build/building-on-ci/>
- GitHub, **Events that trigger workflows — workflow_dispatch**: <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch>
- GitHub, **Manually running a workflow**: <https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow>
- GitHub, **Contexts reference**: <https://docs.github.com/en/actions/reference/workflows-and-actions/contexts>
- GitHub, **Re-running workflows and jobs**: <https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs>

The pinned EAS CLI implementation was also inspected at npm package `eas-cli@23.0.0` / upstream commit `2e2aaa4ac902b653934d7dccdc0c9b72cb7b9cac`. With waiting enabled, its build command waits for linked auto-submissions and exits nonzero if a submission does not finish successfully. This implementation fact is why pinning and explicit `--wait` belong together. It does not prove Apple processing; TestFlight processing remains a separate human verification.

## Executive Decision

The smallest dependency-closed design is:

1. make the GitHub workflow the only canonical build-and-submit path;
2. remove its build-profile input and hard-code the `testflight` build profile;
3. require a full `expected_release_sha`, compare it to `GITHUB_SHA` before checkout, use normal event checkout, then compare checked-out HEAD to both values;
4. replace the detached submit command with one pinned, waiting EAS build command using `--auto-submit-with-profile=production`;
5. remove both npm deploy scripts rather than preserve a local approval/SHA bypass;
6. preserve D8 as an unconditional external precondition for this final-candidate TestFlight path until final-device proof exists;
7. remove the GitHub Release step because TestFlight upload is not a public release; and
8. update the existing release guard test to lock the complete source contract.

Implementation readiness: **READY WITH EXTERNAL RELEASE-GATE PROOF**. The source repair can proceed now. A final EAS run remains blocked on the GitHub environment/reviewer proof, D8 device evidence, EAS/Apple credentials and configuration, and final TestFlight reconciliation.

## Minimum Dependency-Closed Change Set

Exactly three future implementation files are required:

| File | Required change | Why it earns a place |
|---|---|---|
| `.github/workflows/eas-testflight-submit.yml` | Fix profile, SHA, coupling, CLI pin, auth environment name, approval-preserving permissions, D8 handling, evidence summary, and remove GitHub Release. | This is the canonical path and contains both P0 mechanics defects. Omitting it leaves the wrong-profile and `--latest` races. |
| `package.json` | Remove `deploy:testflight` and `deploy:appstore`; retain build-only scripts. | Otherwise two attractive first-party commands still bypass SHA/approval and submit `--latest`. |
| `src/__tests__/releaseScripts.guard.test.ts` | Replace the obsolete “at least two deploy scripts” assumptions with focused workflow/package/profile provenance invariants. | The current test positively requires the unsafe deploy surface to exist and does not test artifact identity. It must change with `package.json` and can cover the workflow without a new parser/dependency. |

`eas.json` is explicitly not changed. `build.testflight` already has store distribution, production EAS environment, `APP_ENV: production`, iOS Release configuration, non-simulator configuration, and auto-increment. `submit.production` already holds the submission mapping. The explicit CLI flag joins those two existing profiles without duplicating identifiers.

No new test file, YAML parser, npm dependency, lockfile edit, release document edit, native build, EAS build, or submission is required to implement and source-test R1.

## TestFlight vs App Store Review Boundary

**TESTFLIGHT UPLOAD:** the canonical EAS operation uploads the exact completed iOS build to App Store Connect. After Apple processing, it becomes a TestFlight build.

**APP STORE REVIEW SUBMISSION:** a later operator must select the processed build in App Store Connect, complete the required listing/review material, and submit it for App Review. EAS Submit/auto-submit does not perform that step by default.

Therefore:

- `deploy:testflight` names the destination more truthfully than `deploy:appstore`, but it is still unsafe and bypasses the canonical GitHub gate. Remove it.
- `deploy:appstore` is both unsafe and misleading: its command only uploads toward TestFlight/App Store Connect and does not submit for public App Review. Remove it.
- Do not create a replacement “appstore” script in R1.

R1 ends when the exact EAS build is processed in TestFlight and reconciled. It does not prove metadata, screenshots, privacy forms, review credentials, App Review submission, Apple approval, or public availability.

## Profile Contract

The canonical workflow has **no build-profile input**. A one-option choice still asks a human a question with only one safe answer and preserves unnecessary YAML/input surface.

The command contains the literal build selection `--profile testflight`. Before any future final run, source-level guards must prove:

- `build.testflight` exists;
- `distribution` is `store`;
- `environment` is `production`;
- `env.APP_ENV` is `production`;
- `ios.buildConfiguration` is `Release`;
- `ios.simulator` is `false`; and
- `submit.production.ios` exists.

The canonical workflow must expose no selectable `development`, `preview`, `preview2`, `preview3`, or `production` build profile. `production` remains the submit-profile name only, not an alternate build path.

## Source SHA Contract

Add one required string input: `expected_release_sha`.

Before checkout:

1. expose the input through an environment variable, not direct shell interpolation;
2. require the exact lowercase full-SHA pattern `^[0-9a-f]{40}$`;
3. log that SHA without secrets; and
4. require exact string equality with `GITHUB_SHA`.

Then run `actions/checkout` with its event-default ref/SHA. Immediately afterward require:

```text
expected_release_sha == GITHUB_SHA == git rev-parse HEAD
```

All three checks are useful:

- input versus `GITHUB_SHA` binds human acceptance to the immutable workflow event before repository code is used;
- normal checkout keeps the run faithful to GitHub's dispatched ref/SHA semantics; and
- HEAD versus both values catches checkout/worktree mismatch before dependency installation or EAS work.

Do **not** explicitly checkout `expected_release_sha`. That would allow a dispatch on one ref/SHA to build an arbitrary input commit, weakening the natural association among `GITHUB_REF`, `GITHUB_SHA`, the workflow run, and the checked-out source.

TOCTOU result:

- If the accepted branch moves before dispatch, the selected ref's event SHA differs from the typed accepted SHA and the run fails before checkout.
- If the branch moves after dispatch, the captured event SHA remains the run identity and default checkout still retrieves that commit.
- A re-run retains the original event SHA/ref and re-proves the same identity; `GITHUB_RUN_ATTEMPT` distinguishes attempts.

## Build-to-Submit Coupling

### Option comparison

| Criterion | A — one build with auto-submit | B — build, capture ID, submit `--id` |
|---|---|---|
| Exact artifact guarantee | Expo documents that EAS Build passes the completed build to EAS Submit. | Expo documents that `--id` selects the named build. |
| Race safety | Independent of any other EAS build becoming latest. | Independent of any other EAS build becoming latest. |
| CLI complexity | One command and one EAS-managed relationship. | Two commands plus durable extraction and validation of one ID. |
| Failure modes | Auth/config, build, or linked submission failure; pinned waiting CLI returns nonzero. | Same failures plus missing/malformed output, ID transfer, or wrong-variable failure. |
| Log/provenance quality | EAS prints build and linked submission detail URLs and stores the relationship. | Makes the ID explicit in shell state, but only after additional plumbing. |
| Implementation size | Replace build and submit steps with one literal command. | Requires JSON capture, schema-aware extraction, validation, and second command. |
| Testability | Static guard proves literal profile/coupling flags and absence of `--latest`. | Static guard must also prove supported JSON extraction and exact variable flow. |
| Human error surface | No intermediate artifact choice. | No artifact choice if implemented correctly, but more movable parts. |

### Chosen mechanism

Use exactly:

```bash
eas build --platform ios --profile testflight --auto-submit-with-profile=production --wait --non-interactive
```

This is an exact logical association maintained by EAS, not a time-based rediscovery. Another EAS build can start or finish before, during, or after this run without changing the artifact attached to this submission.

Option B is safe but rejected because it does not improve artifact identity and requires additional machine-output handling. If auto-submit support is removed from the pinned CLI in the future, stop and redesign; never fall back to `--latest`.

## Auto-Submit Profile Mapping

Choose existing-profile mapping:

```text
build.testflight
  + --auto-submit-with-profile=production
  -> submit.production
```

Do not add `submit.testflight`. Plain `--auto-submit` would otherwise require a same-name profile and duplicate the current Apple submission identifiers. The explicit flag is slightly longer but makes the asymmetric existing mapping visible at the invocation point, avoids `eas.json` changes, and prevents future readers from assuming same-name resolution.

## Artifact Safety vs Evidence Capture

### Required for artifact safety

- accepted-SHA format and equality assertions;
- default event checkout and HEAD assertion;
- fixed literal `testflight` build profile;
- guarded store/production/Release profile invariants;
- one `--auto-submit-with-profile=production` command;
- explicit `--wait` on pinned EAS CLI `23.0.0`;
- no executable `--latest` or alternate deploy path; and
- hard failure on any command error.

None of these requires parsing an EAS build ID into a shell variable.

### Evidence to retain

Automatic GitHub evidence:

- accepted 40-character SHA and `GITHUB_SHA` equality;
- checked-out HEAD equality;
- `GITHUB_RUN_ID`, `GITHUB_RUN_ATTEMPT`, `GITHUB_REF`, `GITHUB_WORKFLOW`, `GITHUB_WORKFLOW_REF`, and `GITHUB_WORKFLOW_SHA`;
- fixed build profile `testflight`, submit profile `production`, EAS project ID, and EAS CLI `23.0.0`;
- gate/test results and the EAS command exit status; and
- EAS build/submission detail URLs printed by the waiting auto-submit command.

Add a compact, non-secret `$GITHUB_STEP_SUMMARY` receipt with those static identifiers and the final command status. Do not parse undocumented prose merely to beautify it.

External/human capture after the successful command:

- EAS build ID and build details URL;
- app version and EAS-assigned iOS build number;
- EAS submission ID/details URL and its linked build ID;
- TestFlight processed version/build number and processing timestamp; and
- a statement that all values match the accepted SHA/run.

Existing GitHub, EAS, and App Store Connect records are the durable systems of record. No custom database and no per-release source commit are required.

## CLI Reproducibility

Verdict: **MUST PIN NOW**.

`eas-cli@latest` allows the same repository SHA to execute different build, auto-submit, wait, authentication, and output behavior at a later date. Those semantics are part of the provenance boundary, not a developer convenience.

Minimum strategy:

```bash
npm install --global eas-cli@23.0.0
eas --version
```

Then run the exact canonical command. Do not add `eas-cli` to project dependencies or change `package-lock.json` solely for R1. The exact global package pin is the smallest supportable correction to the current global `@latest` install. Any future upgrade must be an explicit source change with the focused guard updated and current Expo semantics reverified.

## Approval Gate

Preserve job-level:

```yaml
environment: release-approval
```

With a single release job, source can prove every checkout, gate, build, and submission step is inside the declared environment. After removal of the GitHub Release action, reduce `GITHUB_TOKEN` permission from `contents: write` to `contents: read`.

Source cannot prove the environment exists or is protected. The shortest final human proof is:

1. show repository Settings → Environments → `release-approval` with the intended required reviewer;
2. prove the reviewer is eligible and is not bypassable by the run actor under current settings; and
3. dispatch a harmless pre-build verification run or the final run and capture its actual “Waiting for approval” state plus the approval event.

Do not infer the gate from YAML comments.

## D8 Handling

Verdict: **PRESERVE TEMPORARILY AS A SEPARATE EXTERNAL PRECONDITION**.

Once the build-profile input is removed, the present condition “if profile is production” becomes unreachable and therefore cannot remain as-is. Do not leave dead privacy theater and do not mark D8 closed from comments.

The minimum future treatment is:

- retain `d8_closed` with default `no`;
- make the preflight reject every canonical final-candidate TestFlight run unless its exact value is `yes`;
- state that `yes` is authorized only after final-candidate real-device EXIF/GPS storage proof and privacy/release-owner sign-off; and
- keep the evidence external rather than making R1 solve or redesign D8.

R1 source implementation may proceed while D8 evidence is pending. The final EAS build must not. When a later, separately authorized change replaces or removes this temporary gate, it must cite durable D8 evidence; R1 does not make that decision.

## GitHub Release Step

Verdict: **REMOVE FROM THE CANONICAL TESTFLIGHT WORKFLOW**.

A manually dispatched tag ref can currently reach `softprops/action-gh-release` after only a TestFlight upload and create a non-prerelease GitHub Release. That can publicly signal “released” before App Review, Apple approval, or public availability.

No GitHub Release is required for build identity, EAS coupling, or the first TestFlight receipt. Remove the step and its `contents: write` permission. Do not design replacement release-note machinery in R1.

## Package Script Contract

| Script | Future class | Disposition |
|---|---|---|
| `build:testflight` | SAFE BUILD-ONLY / NON-CANONICAL | Retain. It creates a store-capable TestFlight-profile build but does not submit or carry GitHub approval/SHA assertions. |
| `build:production` | SAFE BUILD-ONLY / NON-CANONICAL | Retain. It builds only; it is not public App Store release proof and cannot enter the canonical TestFlight workflow. |
| `deploy:testflight` | MISLEADING AS CANONICAL / UNSAFE | Remove. Repairing its auto-submit flag would still leave a local bypass around accepted-SHA and GitHub environment approval. |
| `deploy:appstore` | MISLEADING / UNSAFE | Remove. It uses `--latest` and does not submit for App Review despite its name. |

After R1 there is exactly one first-party build-and-submit mechanism: the approved GitHub TestFlight workflow. Executable workflows and package scripts contain no `--latest`. Historical narrative mentions can be reconciled later and must not be treated as executable authority.

## Secret / Environment Proof

No values are recorded.

| Class | Required names/state | Proof rule |
|---|---|---|
| SOURCE-REFERENCED | GitHub secret `EXPO_TOKEN`; environment `release-approval`; build profile `testflight`; submit profile `production`; EAS environment name `production` | Guard exact names in source. Do not reference `EAS_TOKEN` as the CLI environment variable. |
| GITHUB-EXTERNAL | `EXPO_TOKEN` exists, is scoped appropriately, and authenticates to the owner/project; `release-approval` protections work | Prove by configuration and a non-secret authenticated/preflight result. Do not print the token. |
| EAS-EXTERNAL | Project `a7149107-fb9b-4853-a053-648320c05cb6`; production values `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; remote iOS build number; distribution credentials/provisioning profile; stored App Store Connect API key for non-interactive submit | Prove presence/mapping/status in EAS without exposing values. Missing auth/config must fail the command. |
| APPLE-EXTERNAL | Team access, App Store Connect app `6774709116`, bundle mapping `com.accessmap.app`, agreements, signing acceptance, and TestFlight processing | Prove in Apple portals and match version/build to EAS. |

Current Expo documentation names `EXPO_TOKEN` for CI. For iOS submission it recommends a stored App Store Connect API key; an app-specific-password alternative would use `EXPO_APPLE_APP_SPECIFIC_PASSWORD`, not the current workflow's `EXPO_APPLE_PASSWORD`. The canonical R1 design relies on the EAS-stored API key and therefore does not add Apple password secrets to GitHub.

## Test Contract

Modify the existing `src/__tests__/releaseScripts.guard.test.ts`; do not install a YAML parser. Read the canonical workflow as text and `package.json` / `eas.json` as JSON, following the existing filesystem-guard convention.

Focused groups:

1. **Fixed profile:** no `profile` dispatch input; literal `--profile testflight`; no selectable internal/development/production build path.
2. **Profile truth:** `build.testflight` is store, production environment, production `APP_ENV`, Release, and non-simulator; `submit.production.ios` exists.
3. **SHA binding:** required `expected_release_sha`; full-40 regex; equality with `GITHUB_SHA`; normal checkout; `git rev-parse HEAD` equality.
4. **Exact coupling:** one build command contains `--auto-submit-with-profile=production`, `--wait`, and `--non-interactive`; no detached `eas submit` step.
5. **No fallback:** canonical workflow and all package script values contain no `--latest`; no preview/development/production fallback logic.
6. **Package safety:** both deploy scripts are absent; retained build scripts contain build only and the expected profiles.
7. **CLI/auth:** exact `eas-cli@23.0.0` pin and `EXPO_TOKEN` source reference; no `eas-cli@latest` or `EAS_TOKEN` process mapping in the canonical workflow.
8. **Boundary/side effects:** `release-approval` remains job-level; D8 is unconditional; GitHub Release action/tag branch is absent; permissions are `contents: read`.
9. **Terminology:** workflow/step text says TestFlight or App Store Connect upload and does not claim App Review/public release.

Implementation verification:

```bash
npm test -- --runInBand --forceExit src/__tests__/releaseScripts.guard.test.ts
npm run typecheck
git diff --check
```

No simulator, native build, prebuild, EAS build, EAS submit, GitHub setting mutation, or App Store mutation is needed for R1 implementation.

## Minimum File Set

| Proposed file | What breaks if omitted | Can another file cover it? | Rollback impact |
|---|---|---|---|
| `.github/workflows/eas-testflight-submit.yml` | Canonical release remains wrong-profile and unbound. | No. | Reverting restores both P0 blockers and must disable release use. |
| `package.json` | Unsafe local deploy commands remain attractive bypasses. | No. | Reverting restores `--latest` paths. |
| `src/__tests__/releaseScripts.guard.test.ts` | The old test fails after script removal and no regression guard protects the new workflow. | It could be replaced by a new test, but modifying the existing purpose-built test is smaller. | Reverting either fails the intended package state or reaccepts unsafe mechanics. |

`eas.json`, `.github/workflows/eas-build.yml`, `package-lock.json`, product source, native projects, migrations, Supabase, release documentation, and all other tests are not part of the R1 writer's change set.

## Writer Ownership

One release-config writer owns all three implementation files. No concurrent writer may touch them. Read-only review may parallelize only after the writer's coherent diff exists.

R1 is independent of product UI work only while that UI work does not modify the canonical workflow, `package.json`, `eas.json`, or the release guard test. If ownership overlaps or the final candidate no longer contains the R1 mechanics, stop and rebase/revalidate rather than hand-merge competing release edits.

## Stop Conditions

The future writer or final operator must stop if:

- `expected_release_sha` is not exactly 40 lowercase hexadecimal characters;
- it differs from `GITHUB_SHA`;
- checked-out HEAD differs from either accepted/event SHA;
- the accepted SHA does not contain the canonical R1 workflow mechanics;
- `testflight` is absent, non-store, non-production-environment, non-production `APP_ENV`, non-Release, or simulator-enabled;
- an internal, development, preview, or production build choice can enter the canonical path;
- `submit.production.ios` is absent or the explicit mapping becomes invalid;
- EAS CLI `23.0.0` cannot be installed or no longer supports the documented coupling under test;
- any executable canonical path contains, proposes, or falls back to `--latest`;
- `release-approval` source reference is removed or its external reviewer gate cannot be proven;
- D8 final-device evidence does not authorize `d8_closed=yes`;
- `EXPO_TOKEN` is absent/invalid or resolves to the wrong EAS owner/project;
- EAS production environment, signing, or submission credentials are unavailable;
- build fails, auto-submission fails/cancels, or the waiting command does not finish successfully;
- EAS build/submission relationship is ambiguous or its IDs cannot be inspected;
- TestFlight reports a different version/build number than EAS;
- the GitHub runner terminates without a conclusive EAS submission state (inspect the already-linked EAS records; never rediscover with `--latest`); or
- implementation begins touching unrelated product/release architecture.

There is no profile switch, build retry to another profile, manual latest selection, or submit fallback. Failure means stop, preserve evidence, and investigate.

## Canonical Final TestFlight Path

```text
ACCEPTED FINAL 40-CHARACTER SHA
↓
MANUAL GITHUB DISPATCH ON THE REF RESOLVING TO THAT SHA
↓
RELEASE-APPROVAL ENVIRONMENT GATE
↓
EXPECTED SHA FORMAT + GITHUB_SHA ASSERTION
↓
DEFAULT EVENT CHECKOUT + HEAD ASSERTION
↓
SOURCE-LEVEL PROFILE / RELEASE GUARDS + TYPECHECK + TESTS
↓
FIXED build.testflight (STORE + PRODUCTION ENV + APP_ENV=production + RELEASE)
↓
PINNED EAS CLI 23.0.0
↓
ONE WAITING BUILD COMMAND WITH --auto-submit-with-profile=production
↓
EAS BUILD COMPLETES
↓
THAT SAME LINKED BUILD IS SUBMITTED; NO ARTIFACT REDISCOVERY
↓
EAS BUILD + SUBMISSION RECORDS CAPTURED
↓
TESTFLIGHT PROCESSED VERSION / BUILD VERIFIED AGAINST EAS AND THE ACCEPTED SHA
```

No branch in this path selects `latest`, an internal profile, a fallback profile, a local deploy script, or public App Review.

## Decision Table

| Decision | Chosen | Rejected alternative | Why |
|---|---|---|---|
| Profile interface | No profile input; literal `testflight` | One-option choice or `testflight + production` | A TestFlight workflow has one correct build profile; removing the question removes operator error. |
| Expected SHA | Required full 40-character input and three-way equality | Trust selected branch name/head alone | Branches move; explicit acceptance must be bound to the event and checkout. |
| Checkout | Default event checkout, then HEAD assertion | Explicit checkout of input SHA | Default preserves GitHub event/ref identity; assertions stop drift without letting input override the event. |
| Build/submit | `--auto-submit-with-profile=production --wait` | Capture ID then `eas submit --id` | Both are exact; auto-submit is EAS-native coupling with fewer failure surfaces and no output parsing. |
| Submit mapping | Existing `submit.production` named explicitly | Add duplicate `submit.testflight` and use plain `--auto-submit` | Avoids `eas.json` duplication/drift while keeping mapping explicit. |
| CLI version | Pin `eas-cli@23.0.0` | `eas-cli@latest` or new project dependency | Same SHA must not silently acquire different coupling behavior; exact global pin is sufficient and smaller. |
| `deploy:testflight` | Remove | Repair with local auto-submit | Any local deploy still bypasses GitHub SHA and environment approval and creates a competing canonical path. |
| `deploy:appstore` | Remove | Rename or retain | It is unsafe and cannot truthfully perform App Review/public release. |
| D8 | Preserve temporarily as unconditional final-candidate precondition | Leave production-only dead conditional or remove | Keeps privacy fail-closed without making provenance work adjudicate D8. |
| GitHub Release | Remove | Preserve tag-only non-prerelease release | TestFlight upload is not public release and the step adds false signaling and write permission. |

## R1 Implementation Contract

```text
R1 IMPLEMENTATION CONTRACT

BASE:
2762a5447600e8de55be912ccb26e95456484945

OWNER:
one release-config writer

FILES TO CHANGE:
.github/workflows/eas-testflight-submit.yml
package.json
src/__tests__/releaseScripts.guard.test.ts

FILES EXPLICITLY NOT TO CHANGE:
eas.json
.github/workflows/eas-build.yml
package-lock.json
app.json
product source
native projects
Supabase/migrations
release documentation
unrelated tests

CANONICAL TESTFLIGHT COMMAND / MECHANISM:
npm install --global eas-cli@23.0.0
eas build --platform ios --profile testflight --auto-submit-with-profile=production --wait --non-interactive

PROFILE CONTRACT:
No profile dispatch input. Literal build.testflight only. Guard store distribution, production EAS environment, APP_ENV=production, iOS Release, non-simulator, and existing submit.production. No internal/development/production build fallback.

SHA CONTRACT:
Require expected_release_sha matching ^[0-9a-f]{40}$. Before checkout assert expected_release_sha == GITHUB_SHA. Use normal event checkout. Immediately assert git rev-parse HEAD == GITHUB_SHA == expected_release_sha. Log only non-secret identifiers and fail before dependency/EAS work on mismatch.

BUILD-SUBMIT CONTRACT:
One waiting EAS build command uses --auto-submit-with-profile=production. Remove the detached eas submit step. Never parse or rediscover latest. The pinned CLI must return nonzero on build or linked-submission failure. TestFlight processing remains a later human check.

CLI VERSION CONTRACT:
Replace global eas-cli@latest with exact eas-cli@23.0.0 and log eas --version. No new package dependency or lockfile change. Future upgrades require explicit source review.

PACKAGE SCRIPT CONTRACT:
Retain build:testflight and build:production as non-canonical build-only helpers. Remove deploy:testflight and deploy:appstore. No package script may submit or use --latest.

D8 CONTRACT:
Retain d8_closed default no, but make its yes check unconditional for the final-candidate TestFlight path. yes requires final-SHA real-device stored-object EXIF/GPS proof and owner sign-off. R1 does not close D8.

GITHUB RELEASE CONTRACT:
Remove the tag-conditioned GitHub Release step. Reduce permissions to contents: read. Do not add replacement release-note machinery.

APPROVAL CONTRACT:
Preserve job-level environment: release-approval around every step. Externally prove the environment, required reviewer, reviewer eligibility, pending state, and actual approval. Source must not claim these settings exist.

AUTH / ENVIRONMENT CONTRACT:
Reference GitHub secret EXPO_TOKEN as the EAS CLI token. Do not use EAS_TOKEN as the process environment name. Rely on externally proven EAS-stored iOS/ASC credentials and production environment variables; expose no values.

SOURCE TESTS:
Update the existing releaseScripts guard for fixed testflight profile, exact SHA checks, auto-submit mapping, --wait, exact CLI pin, EXPO_TOKEN, no --latest, no deploy scripts/fallback, preserved approval, unconditional D8 gate, truthful TestFlight wording, no GitHub Release, and contents: read. Run focused Jest, typecheck, and git diff --check.

NO NATIVE BUILD NEEDED FOR R1 IMPLEMENTATION:
YES

NO EAS BUILD DURING R1 IMPLEMENTATION:
YES

FINAL EAS BUILD OCCURS:
only after final product SHA accepted and all external gates pass

FINAL HUMAN PROOF:
Prove release-approval behavior and D8 evidence; dispatch the ref whose GITHUB_SHA equals the accepted SHA; capture GitHub run identity, EAS build ID/version/build number, linked EAS submission ID, and matching processed TestFlight version/build. Then continue separately to App Store readiness/review.

STOP CONDITIONS:
Any SHA/profile/auth/approval/D8/coupling/build/submission/evidence mismatch; any --latest or fallback; ambiguous EAS relationship; different TestFlight version/build; unrelated architecture edits.

ROLLBACK:
Revert the workflow, package, and guard-test changes as one atomic unit. A rollback restores known unsafe release paths, so disable the canonical workflow and do not build/submit until the R1 fix is reinstated and reverified. No EAS/App Store rollback is needed because R1 implementation performs no external build or mutation.
```

## Implementation Readiness

**READY WITH EXTERNAL RELEASE-GATE PROOF**

The source implementation contract is complete and minimal. It is not blocked by credentials that are only required at final execution. The final run must still prove:

1. GitHub `release-approval` exists, has the intended eligible required reviewer, pauses, and records approval.
2. D8 final-candidate real-device EXIF/GPS stored-object evidence authorizes `d8_closed=yes`.
3. GitHub secret `EXPO_TOKEN` authenticates to the intended Expo owner/project.
4. EAS production environment has the required public backend variables without exposing values.
5. EAS iOS signing/provisioning and stored App Store Connect API key are valid.
6. Apple team/app/bundle mapping and agreements permit upload.
7. EAS build and linked submission records match the accepted SHA/version/build.
8. The same version/build finishes processing in TestFlight.

This status does not claim App Store metadata, screenshots, review credentials, privacy questionnaire, Submit for Review, Apple approval, or public availability.

## Future Retrieval

```bash
git fetch origin
git show origin/codex/solfast-release-r1-execution-contract-20260830:qa-reports/2026-08-30_SolFast_Release_R1_ExecutionContract.md
```
