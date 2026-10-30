# Flagstone — Public Evidence

A curated route through the strongest evidence in this repository, for anyone who would rather
check the [README](../README.md)'s claims than take them on trust. Each row says what the evidence
shows, where it lives, and how current it is. "Current" means current as of **2026-10-29**.

This page routes; it does not restate. If a linked record and this page ever disagree, the record
wins, and for anything about what shipped, [`release/current.json`](../release/current.json)
outranks everything else.

## How authority works here

| Layer | What it is | Where |
|---|---|---|
| 1. Overview | What Flagstone is and where it stands | [README](../README.md) |
| 2. Router | This page | — |
| 3. Current authority | Machine-checked records and policy documents that are kept current | [`release/current.json`](../release/current.json), [RELEASE_IDENTITY.md](RELEASE_IDENTITY.md), [AGENTS.md](../AGENTS.md), [`supabase/contract/`](../supabase/contract/) |
| 4. Recent detailed QA | Dated reports from the latest work (September and October 2026) | [`qa-reports/`](../qa-reports/) files dated `2026-09-*` and `2026-10-*`, and the release receipts in [`qa-reports/releases/`](../qa-reports/releases/) |
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
| [Pre-Phase-05 safety handoff](../qa-reports/2026-09-21_Codex_PrePhase05AdminRemoveSafety.md) | A full local run on the branch that was then merged to `main`: **299 suites, 4,472 tests passing, 32 todo, 0 failing**; typecheck and lint clean | 2026-09-21; superseded by the October runs below |
| [October accessible-loading QA](../qa-reports/2026-10-24_OptionB_Accessible_Loading_QA.md) | The latest recorded full local runs, for the web release candidate: **303 suites, 4,483 passing, 32 todo, 6 failing**, and CI's coverage-gated command at 4,495 passing and 7 failing. The report traces the 6 to database-tooling guards that refuse a workspace path containing spaces (`main` fails the same 6 there) and the 7th to a timeout under load that passes when run alone. CI passed on the release merge | 2026-10-24 |
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

**Privacy review of historical evidence (2026-09-25) — a bounded pass, not a clearance.** Older QA
and design records were reviewed for personal information. Identifying account details were
replaced with bracketed markers such as `[REDACTED_EMAIL]`, `[OWNER_ACCOUNT]` and
`[TEST_ACCOUNT_1]`, and screenshots received visible hatched redaction boxes. Test outcomes,
findings and decisions are unchanged, and files that needed context carry a short sanitation note.
The review is forward-only: it does not rewrite Git history. The
[public-estate P0/P1 receipt](../qa-reports/2026-09-26_Codex_PublicEstateP0P1.md) records exactly
what the pass covered and what it does not certify. Specifically:

- **Historical exposure remains.** The redactions apply to the current tree only. Earlier commits,
  other refs and any copies already fetched or downloaded still contain the original material;
  history has not been rewritten, and doing so is an owner decision.
- **Residual exposure remains in the current tree.** The pass was bounded to confirmed tokens;
  further contact, account-purpose, SQL, admin and catalog candidates were left in place pending
  adjudication, so no file should be read as certified clean.
- **Image verification is incomplete.** The changed screenshots were not visually verified, so the
  redaction boxes on those images are unconfirmed.

No complete privacy clearance is claimed or implied: this is a bounded, text-first containment
pass with known residual and historical exposure.

## Release identity

| Evidence | What it shows | Currency |
|---|---|---|
| [`release/current.json`](../release/current.json) | The one machine-readable record of what shipped: the app 4.1.1 / iOS build 33 source commit and tree, the web source, the serving deployment and domains | Last verified 2026-10-25 |
| [RELEASE_IDENTITY.md](RELEASE_IDENTITY.md) | The release policy: commands, invariants, and why identity is proven by exact commit rather than branch names | 2026-09-02 |
| [CURRENT_RELEASE.md](../qa-reports/CURRENT_RELEASE.md) | Human view generated from the manifest; CI fails if it drifts | Generated |
| [Build 33 release receipt](../qa-reports/releases/2026-09-01_Flagstone_4.1.1_Build33_ReleaseIdentity.md), [web deployment decision](../qa-reports/2026-09-01_Build33_WebDeploymentDecision.md) | The immutable receipt, and the deployment decision with host state before and after and recruiter-path acceptance | 2026-09-01/02 |
| [October web release receipt](../qa-reports/releases/2026-10-25_Flagstone_4.1.1_Build33_OptionB_WebDeployment.md), [owner approvals on PR #35](https://github.com/Skypie99/AccessMap/pull/35) | The web-only production release of source `4a27691`: exact deployment identity, both domains verified, live browser checks, accepted limits and the rollback target, with separate owner approvals for the merge and for production | 2026-10-24/25 |
| [Release-identity CI](../.github/workflows/release-identity.yml) | Network-free verification of the manifest against real Git objects | Current |

`npm run release:verify` runs the same checks locally. The Release Identity workflow passed on
`main` at the 2026-10-25 release-record commit.

## Known limitations and current work (as of 2026-10-29)

- **The App Store is the source of truth for availability.** Flagstone 4.1.1 has been available
  there since 2026-09-15, in the United States and Canada only (storefront lookup rechecked
  2026-10-29), and the manifest's App Store field still reads `submitted_for_review` until the release tool updates it. No download, rating or usage figures are
  claimed.
- **The web is ahead of the iOS app.** The September 2026 work on `main` (contract and migration
  truth, moderation semantics, the anonymous-read contract, account-deletion accuracy) is partly
  database work, applied to the shared production backend from 2026-09-15 and serving both apps,
  and partly client code, which shipped to the web on 2026-10-25 and is not yet in a native build.
- **Two paths are deliberately switched off on `main`** until safer backend contracts exist:
  client-side flag deletion (commit `df58cac`) and admin flag removal (see the
  [pre-Phase-05 handoff](../qa-reports/2026-09-21_Codex_PrePhase05AdminRemoveSafety.md)).
- **The 2026-09-26 governance warning is resolved.** The manifest now records `main` convergence
  (`releaseCodeIntegration: converged`, 2026-10-25).
- **The October web release has accepted limits.** Its Lighthouse unused-JavaScript assertion still
  fails (accepted, threshold unchanged), and physical Safari, VoiceOver, iPhone and iPad testing of
  that release is still to do. See the
  [web release receipt](../qa-reports/releases/2026-10-25_Flagstone_4.1.1_Build33_OptionB_WebDeployment.md).
- **Some checks need real hardware.** VoiceOver on a physical device, push delivery, real GPS and
  release-binary performance are listed as device-only in the
  [simulator-walk close-out](../design-reviews/sim-walk/2026-08-19/00_CLOSEOUT_AUTHED.md).
- **Privacy clearance is bounded, not complete.** The 2026-09-25 pass over historical evidence left
  known historical and residual exposure, and the image redactions are visually unverified (see the
  [public-estate P0/P1 receipt](../qa-reports/2026-09-26_Codex_PublicEstateP0P1.md)). Nothing on
  this page should be read as a full privacy clearance.
- **The web version is pinned by design** to an exact source on a frozen release branch
  (`release/web-4.1.1-build33-optionb`). It does not follow `main`; a new web release needs its own
  approval and receipt.

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
