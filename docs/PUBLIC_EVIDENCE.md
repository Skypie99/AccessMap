# Flagstone — Public Evidence

A curated route through the strongest evidence in this repository, for anyone who would rather
check the [README](../README.md)'s claims than take them on trust. Each row says what the evidence
shows, where it lives, and how current it is. "Current" means current as of **2026-09-26**.

This page routes; it does not restate. If a linked record and this page ever disagree, the record
wins, and for anything about what shipped, [`release/current.json`](../release/current.json)
outranks everything else.

## How authority works here

| Layer | What it is | Where |
|---|---|---|
| 1. Overview | What Flagstone is and where it stands | [README](../README.md) |
| 2. Router | This page | — |
| 3. Current authority | Machine-checked records and policy documents that are kept current | [`release/current.json`](../release/current.json), [RELEASE_IDENTITY.md](RELEASE_IDENTITY.md), [AGENTS.md](../AGENTS.md), [`supabase/contract/`](../supabase/contract/) |
| 4. Recent detailed QA | Dated reports from the latest work (September 2026) | [`qa-reports/`](../qa-reports/) files dated `2026-09-*` |
| 5. Historical receipts | Dated evidence from earlier work: true for its date, not current authority | older [`qa-reports/`](../qa-reports/), [`design-reviews/`](../design-reviews/), [`security-audit/`](../security-audit/) |

## Product and architecture

| Evidence | What it shows | Currency |
|---|---|---|
| [README](../README.md) | Product, status, stack, how to run it | Current |
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Layers, data flow, auth flow, error-handling policy | Revised 2026-08-17. Predates the September backend work, and its platform line lists Android, which has not shipped. |
| [DESIGN.md](../DESIGN.md), [GLASS.md](../GLASS.md) | The design system and material rules behind `src/theme.ts` | Revised 2026-08-22 |
| [DATABASE.md](DATABASE.md) | Tables, row-level security, realtime | Revised 2026-08-17; predates the Phase 03–04 backend changes |
| [`supabase/migrations/`](../supabase/migrations/), [client contract](../supabase/contract/client-expectations.v1.json) | The canonical schema (ordered, forward-only migrations) and the client–database contract, pinned by [`contractManifest.guard.test.ts`](../src/__tests__/contractManifest.guard.test.ts) | Current |
| [DECISIONS_LOG.md](../DECISIONS_LOG.md), [architecture decision records](adr/README.md) | Structural decisions with their rationale, append-only | Newest entry 2026-09-01 |

## Automated testing and QA

| Evidence | What it shows | Currency |
|---|---|---|
| [CI workflow](../.github/workflows/ci.yml) | On every pull request and push to `main`: TypeScript, ESLint, the Jest suite, a migration-crosswalk freshness check, a full migration replay against PostgreSQL 17, and a performance budget | Current |
| [Pre-Phase-05 safety handoff](../qa-reports/2026-09-21_Codex_PrePhase05AdminRemoveSafety.md) | Latest recorded full run on `main`'s newest code: **299 suites, 4,472 tests passing, 32 todo, 0 failing**; typecheck and lint clean | 2026-09-21; since merged to `main` |
| [Phase 04 integration gate](../qa-reports/phase04/20260922T032010Z-final-integration/FINAL_INTEGRATION.md) | Serialized integration of two accepted branches, with exact commit and tree identities and full test gates | 2026-09-22 (UTC); since merged to `main` |
| [Guard tests](../src/__tests__/) | 55 "guard" tests that turn invariants into executable checks: accessibility wiring, ratified legal copy, privacy fences, credential hygiene, release scripts, migration lineage | Current |
| [Simulator walk](../design-reviews/sim-walk/2026-08-19/00_CLOSEOUT.md), [signed-in pass](../design-reviews/sim-walk/2026-08-19/00_CLOSEOUT_AUTHED.md), [ledger](../design-reviews/sim-walk/2026-08-19/LEDGER.md) | A full walk of a Release build on the largest and smallest iPhone simulators, with measured hit targets and accessibility-tree censuses, findings SW-01 to SW-53, and a four-wave fix pass | 2026-08-19 to 2026-08-20 |

## Accessibility

| Evidence | What it shows | Currency |
|---|---|---|
| [Accessibility statement](accessibility.html) | The published statement: a WCAG 2.2 AA target and the concrete commitments behind it | 2026-08-31 |
| [Accessibility audit and fix train](../design-reviews/a11y-qa/2026-07-31/CLOSE-OUT.md) | An audit lens by lens (automated checks, screen reader, touch targets, keyboard, contrast, reflow and Dynamic Type, motion, forms, images, claims), then fixes locked in with guards | 2026-07-31 |
| [VoiceOver test script](VOICEOVER_TEST_SCRIPT.md) | The on-device VoiceOver pass to run before declaring accessibility support | 2026-08-19 |
| Guards such as [`hitTargetFrame`](../src/__tests__/hitTargetFrame.guard.test.ts), [`labelInName`](../src/__tests__/labelInName.guard.test.ts), [`focusOnOpen`](../src/__tests__/focusOnOpen.guard.test.ts), [`dynamicTypeGuard`](../src/__tests__/dynamicTypeGuard.test.ts), [`brandInkAA`](../src/__tests__/brandInkAA.guard.test.ts) | Touch-target size, accessible names, focus placement, Dynamic Type and colour contrast, enforced in CI | Current |

## Privacy and security

| Evidence | What it shows | Currency |
|---|---|---|
| [In-app privacy policy](../design-reviews/ship-ready/15_PRIVACY_POLICY_v1.md) | The ratified policy text; [`privacy.guard.test.ts`](../src/__tests__/privacy.guard.test.ts) keeps the app's copy identical to it | Ratified 2026-07-29 (v1) |
| [Published privacy page](privacy/index.html) | This repository's web copy of the policy (v1.1); the app links the same page on skypistudio.com | 2026-07-31 |
| [Geo-privacy fence](../src/__tests__/geoPrivacyFence.test.ts) | The viewer's location never reaches the server: no query filters by the viewer's coordinates, only named screens may ask for permission, and nothing streams position continuously | Current |
| [Anonymous-read privacy contract](../qa-reports/2026-09-21_Claude_Phase03CCoreImplementation.md) | What signed-out visitors can read, proven by an 85-assertion pgTAP suite (208/208 together with the moderation suites) | 2026-09-20/21; since merged to `main` |
| [Credential history](CREDENTIAL_HISTORY.md) | A candid account of two historical credentials in published Git history: why both are dead, and why history is not rewritten | Written 2026-09-03. Its note that `origin/main` still carried one redacted string predates the redaction commit (`2e29913e`) reaching `main`. |
| [`noCredentialsInTree.guard.test.ts`](../src/__tests__/noCredentialsInTree.guard.test.ts), [pre-commit secret scan](../.husky/pre-commit) | Secret detection in CI and at commit time; both report a shape, never the value | Current |

**Privacy review of historical evidence (2026-09-25).** Older QA and design records were reviewed
for personal information. Identifying account details were replaced with bracketed markers such as
`[REDACTED_EMAIL]`, `[OWNER_ACCOUNT]` and `[TEST_ACCOUNT_1]`, and screenshots received visible
hatched redaction boxes. Test outcomes, findings and decisions are unchanged, and files that needed
context carry a short sanitation note. The review is forward-only: it does not rewrite Git history.

## Release identity

| Evidence | What it shows | Currency |
|---|---|---|
| [`release/current.json`](../release/current.json) | The one machine-readable record of what shipped: the app 4.1.1 / iOS build 33 source commit and tree, the web source, the serving deployment and domains | Last verified 2026-09-02 |
| [RELEASE_IDENTITY.md](RELEASE_IDENTITY.md) | The release policy: commands, invariants, and why identity is proven by exact commit rather than branch names | 2026-09-02 |
| [CURRENT_RELEASE.md](../qa-reports/CURRENT_RELEASE.md) | Human view generated from the manifest; CI fails if it drifts | Generated |
| [Build 33 release receipt](../qa-reports/releases/2026-09-01_Flagstone_4.1.1_Build33_ReleaseIdentity.md), [web deployment decision](../qa-reports/2026-09-01_Build33_WebDeploymentDecision.md) | The immutable receipt, and the deployment decision with host state before and after and recruiter-path acceptance | 2026-09-01/02 |
| [Release-identity CI](../.github/workflows/release-identity.yml) | Network-free verification of the manifest against real Git objects | Current |

`npm run release:verify` runs the same checks locally. As of 2026-09-26 it passes with one
governance warning, listed below.

## Known limitations and current work (as of 2026-09-26)

- **Current App Store state is not asserted here.** The manifest records Build 33 as
  `submitted_for_review` (last verified 2026-09-02), and a 2026-09-09 report still describes it as
  under review. The App Store itself is the source of truth for availability.
- **`main` is ahead of the shipped app.** The September 2026 work on `main` (contract and
  migration truth, moderation semantics, the anonymous-read contract, account-deletion accuracy)
  is not yet in a released build.
- **Two paths are deliberately switched off on `main`** until safer backend contracts exist:
  client-side flag deletion (commit `df58cac`) and admin flag removal (see the
  [pre-Phase-05 handoff](../qa-reports/2026-09-21_Codex_PrePhase05AdminRemoveSafety.md)).
- **Release-manifest governance warning.** The manifest still marks `main` convergence as
  deferred, although the Build 33 source is already in `main`'s history. `release:verify` reports
  this as a warning; updating the manifest is an owner decision.
- **Some checks need real hardware.** VoiceOver on a physical device, push delivery, real GPS and
  release-binary performance are listed as device-only in the
  [simulator-walk close-out](../design-reviews/sim-walk/2026-08-19/00_CLOSEOUT_AUTHED.md).
- **The web demo is pinned by design** to the Build 33 lineage on a frozen branch. It does not
  follow `main`.

## Reading older files

- **The name.** Files written before 2026-08-17 call the product AccessMap. That is history, not
  a mistake.
- **Named roles.** Names such as Morgan, Rory, Gary, Alex, Steve, Shamus, Dani and Jordan in older
  reports are roles in the project's multi-agent AI workflow (see [LEARNINGS.md](../LEARNINGS.md)),
  not additional human contributors. Report filenames that name `Claude` or `Codex` identify the
  AI coding tool that produced them.
- **Status lines are dated.** A report's "not merged" or "HOLD" line describes the moment it was
  written. For what is on `main`, read the Git history; for what shipped, read the release
  manifest.
