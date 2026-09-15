# Phase 03A production-prerequisite repairs — independent code review R2

```text
REVIEWED_COMMIT: 22e1db5aa7e58d7129551cb1325f921b37f95105
REVIEWED_TREE: 657f1b6ce01d3fdbb27102b5aa33616c918feade
DIFF_PARENT: 3a0235395b484fdbdf2aee9023ee5ab976fe648e
PRIOR_LEDGER_BINDING_BLOCKER: CLOSED
PRIOR_CREDENTIAL_SCAN_BLOCKER: CLOSED
INDEPENDENT_CODE_REVIEW: PASS
PRODUCTION_PLAN_ONLY_REPAIR: PASS
CREDENTIAL_GUARD_REPAIR: PASS
PRODUCTION_MUTATIONS: NONE
STAGING_MUTATIONS: NONE
HOSTED_CALLS: NONE
```

## Verdict

The exact corrected commit passes this bounded independent code review. Both blockers from `INDEPENDENT_CODE_REVIEW.md` are closed, and I found no new blocker in the originally requested falsification areas. This is local code-review acceptance only. It does not authorize a production dry-run, apply, deployment, or any hosted mutation.

## Prior blocker 1 — closed: frozen ledger and complete canonical identity binding

The planner now recomputes the ordered SHA-256 over every supplied `{version,name}` row using the production capture format, requires canonical input order, and compares the result exactly with the frozen `ledgerOrderedSha256` before workspace creation. The accepted retained ledger recomputes to `8fd1da6ea324d6b458951a41970d729e1e879b09b502b68f16ba22b09bb9dc9`.

`expectedLedgerIdentities()` constructs an 86-version map from all 71 baseline files and their crosswalk `ledgerName` values, the five Phase 02 adoption entries, and the nine Phase 03A declared candidates. `auditProductionLedgerNames()` checks every supplied ledger row whose version belongs to that complete map. Validation and this audit run before `buildWorkspace()`. A refusal therefore returns `workspace:null`, an empty plan, and `command:null`.

Independent adversarial probes confirmed both layers:

```text
alter baseline name, leave frozen digest unchanged:
  ok=false; refused by digest; workspace=null; command=null

alter an applied adoption name, recompute/update the digest so it matches:
  ok=false; refused by canonical version/name audit; workspace=null; command=null
```

The focused suite also covers reordered rows, duplicate rows, a changed row that preserves count/latest, a phantom version, an already-applied canonical migration, candidate/object mismatch, manifest hash mismatch, source ancestry, pending-file hash mismatch, Stage B leakage, and restore/reapply leakage. The successful exact plan reports the verified ordered digest and `expectedIdentityCount: 86`.

## Prior blocker 2 — closed: raw, always-on credential scanning

The always-on high-confidence label detector now includes password, passwd, and pwd forms, including underscore-delimited environment names such as `DATABASE_PASSWORD`. High-confidence labelled and known-format detectors run over raw lines; login/account-proximity heuristics alone continue to use comment-stripped source. A source comment and text following a URL can no longer disappear before the high-confidence scan.

Independent runtime-assembled probes printed only counts, shapes, and redaction booleans:

```text
uncontextualized password assignment: 1 finding, redacted
TypeScript URL followed by api_key assignment: 1 finding, redacted
TypeScript comment containing api_key assignment: 1 finding, redacted
QA/design-review account credential probe: detected, all findings redacted
bare 64-hex digest: not classified as a credential
64-hex value under a secret label: 1 finding, redacted
```

The existing narrow finding-ID prose exception remains bounded by the label, comma delimiter, known ID, multiple-ID context, and decision/status language. Assignment and header/value contexts remain detectable. Tracked QA and design-review files remain in the `git ls-files` census. Normal failure output contains only path, line, length, and character classes; neither the regression tests nor the independent probes emitted the synthetic secret body.

## Reattempted falsification matrix

- **Target ambiguity and whitespace/ref bypass:** The production-plan path accepts only the exact production ref. Missing, whitespace-suffixed, staging, malformed, and flag-shaped targets fail.
- **Accidental production mutation:** The result contains only `supabase db push ... --project-ref <exact-ref> --dry-run --skip-vault`, declares `applyAvailable:false`, and exposes no apply argv. The planner itself does not invoke Supabase.
- **Implicit linked targeting:** `--linked`, `--local`, `--db-url`, `--stage`, and `--apply` are rejected at the production-plan CLI boundary. Returned argv contains the explicit project ref and no linked or URL selector.
- **Stage B and recovery leakage:** Validation requires Stage B exclusion and rejects non-Stage-A, named/patterned Stage B, restore, and reapply entries. The exact 14-entry plan contains only Stage A artifacts.
- **Canonical identity, phantom, and duplicate handling:** The recomputed digest, canonical order check, complete 86-version name map, and existing ledger/workspace audit jointly reject altered, phantom, duplicate, impossible-order, and wrong-name rows.
- **False executable plan:** Evidence hash, exact source SHA/tree and verified ancestry, target ref, ledger digest, canonical ledger identities, entry order, and file hashes all bind before a dry-run command is returned. Both independent ledger tampering probes returned no command and no surviving workspace.
- **Hidden secrets and broad false negatives:** Password labels join the always-on high-confidence set; raw scanning covers comments and URL tails; recognizable credential formats remain label-independent.
- **QA/design-review blind spots:** Both trees remain included in the tracked census, and direct synthetic probes were detected.
- **SHA misclassification:** Bare digests remain suppressed while a long hex value under a high-confidence secret label remains conservatively detected.
- **Secret-body leakage:** Findings exposed to test output are shaped/redacted messages. The independent probes confirmed that no supplied synthetic value appeared in those messages.

## Verification

```text
git identity / tree / direct parent / ancestry: PASS
git diff --check 3a023539..22e1db5a: PASS
migration SQL changed in reviewed diff: NONE
node --check scripts/canonical-apply-workspace.mjs: PASS
npm run typecheck: PASS
focused Jest: PASS — 5 suites, 121 tests
independent altered-baseline probe: PASS (fail closed)
independent altered-adoption-with-matching-digest probe: PASS (fail closed)
independent credential blind-spot probes: PASS (detected and redacted)
hosted or Supabase commands: NONE
source edits: NONE
```

The focused Jest command covered:

- `scripts/__tests__/productionPlanOnly.test.ts`
- `scripts/__tests__/targetTokenSafety.test.ts`
- `scripts/__tests__/canonicalMigrationIdentity.test.ts`
- `scripts/__tests__/canonicalApplyWorkspaceGuard.test.ts`
- `src/__tests__/noCredentialsInTree.guard.test.ts`

The target-safety suite created one disposable local test workspace; I identified it by a pre/post temp-directory census and destroyed that exact marked workspace with the guarded destroy command. No pre-existing workspace was touched.

## Scope and remaining authority

No other code-review blocker remains in this repair diff. Accepted fresh-stage behavior, MF-03, MF-04, MF-05, production policy, owner decisions, and the prohibition on production execution remain unchanged. Any next packet or execution step must follow its own controlling authorization and evidence gate.

## DECISIONS FOR SKY

This review raises no new decision. The repair commit is suitable for the next explicitly authorized local evidence/preflight step. Production contact or execution remains a separate owner decision.
