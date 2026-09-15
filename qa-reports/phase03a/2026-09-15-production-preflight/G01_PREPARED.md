# Phase 03A production preflight — generation 01

```text
PROMPT_ID: FLAGSTONE-P03A-PRODUCTION-PREFLIGHT-ONLY-R1
RUN_UNIT: PRODUCTION_PREFLIGHT_READ_ONLY
GENERATION: 01
STATUS: PREPARED
BANKED_AT_UTC: 2026-09-15T03:15:10Z
SOLE_WRITER: CODEX_PRIMARY_SESSION
PRODUCTION_AUTHORITY: READ_ONLY_INSPECTION_ONLY
PRODUCTION_MUTATION_AUTHORITY: NONE
STAGING_MUTATION_AUTHORITY: NONE
```

## Verified local identity

```text
repository: https://github.com/Skypie99/AccessMap.git
worktree: /Users/skypie/AccessMap-codex/flagstone-p03a-takeover-20260914
branch: codex/flagstone-p03a-takeover-20260914
HEAD: 949c11093922d0b7d7b8665eda84dfde710f0d1c
tree: a8ee59aac0e86239370aa55e14d897bed39c1a65
tracked/untracked changes before this preflight: none
main...origin/main: 0/0
```

The exact CODE, INT, frozen integration, harness, hosted evidence, independent review, and current HEAD identities all exist and form one ancestor chain. Their reported trees match Git. No reset, ref update, commit, stash, clean, prune, merge, or push was performed.

## Accepted versus fresh checks

Historically accepted and retained without rerun:

- fresh-stage R7 FDA-028: 31/31, negative control PASS, cleanup PASS;
- composed hosted pgTAP: 254/254;
- 25-way concurrency: allowance 10, ten real admissions, zero overshoot, zero orphans;
- accepted fresh-stage ledger: 103 rows, latest `20260913080000`;
- independent fresh-stage acceptance: PASS.

Freshly checked locally:

- exact branch, HEAD, tree, repository remote, clean starting state, and main/origin-main divergence;
- all reported Git identities and ancestry;
- no tracked `supabase/.temp/project-ref` or `supabase/.temp/linked-project.json` exists in the R7 review tree, packet tree, or current tree;
- only untracked `supabase/.temp/cli-latest` is present; it is not a project selector;
- latest operation records contain no `RUNNING`, `APPLIED_NOT_VERIFIED`, or `OUTCOME_UNKNOWN` production operation.

The independent R7 report's tracked production-link statement is preserved historically but corrected by exact tree inspection. No selector file was created, removed, restored, or edited.

## Production read target and access path

```text
production project: kldlwszpfkdmsjrjhjym
allowed access: Supabase MCP read tools and raw SELECT statements inside an explicit READ ONLY transaction
disallowed access: CLI remote query path that may initialize login roles; staging runner; any side-effecting function; raw application data; secret/endpoint values
```

The selected MCP path uses the already connected Supabase project API. It does not link the checkout or invoke the CLI login-role initialization observed in the staging harness transport. Every SQL request will start `BEGIN TRANSACTION READ ONLY`, contain only catalog queries and aggregate/presence checks, and end `COMMIT`. A failed read will be banked without fallback to a write-capable or ambiguous target mechanism.

## Intended production reads

1. Read project metadata for exact ref/name/region/status binding.
2. Read the canonical migration list and a sanitized ledger capture: ordered version/name pairs, count, latest version, and digest.
3. Read only relevant catalog shape: tables, columns/defaults, constraints, policies, functions, owners, ACLs, schema privileges, default privileges, and direct/indirect role relationships.
4. Read aggregate counts for relevant application and limiter tables; never return application rows, user identifiers, coordinates, descriptions, IPs, tokens, or key fingerprints.
5. Read MF-03 shape only: named secret row count and decoded byte-length validity; never return secret material.
6. Read MF-04 shape only: configuration row/key presence and non-empty/type state; never return endpoint or webhook secret values and never send a request.
7. Read existing limiter configuration names/types/values only where values are operational policy rather than credentials. Do not invoke admission, purge, ratchet, notification, or other side-effecting functions.
8. Compare production catalog and out-of-band grants with the accepted pre-apply contract and local client caller map.

## Stop conditions

- Any target mismatch, unexpected selector, write requirement, authentication path with initialization writes, unexplained executable drift, conflicting ledger identity, malformed secret/config shape, or uncertain response stops the affected operation.
- An absent migration-ledger row does not prove the catalog change is absent.
- No production dry-run will run unless the installed tool proves both target-explicit behavior and zero mutation.
- No production or staging mutation is authorized under this generation.

```text
NEXT_SAFE_ACTION: perform the exact bounded Supabase MCP project and read-only production metadata capture
```
