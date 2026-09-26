# Flagstone / AccessMap public-estate P0/P1 reconciliation — 2026-09-26

## DECISIONS FOR SKY

- [ ] **Review the cumulative existing cleanup branch.** Recommend reviewing its existing privacy/documentation/image changes together with the one-command contributor fix. The alternative is deferring adoption while confirmed current-main exposures remain. This session reused the existing branch and created no competing product patch; Sky controls merge and deployment.
- [ ] **Finish P0-05 account/media adjudication.** Recommend a separate exact-candidate privacy review of remaining account-linked text and the 21 changed PNGs before declaring this finding closed. The alternative is explicitly accepting only the bounded text redactions and retaining a privacy HOLD. Captures, consent, and current/historical copies are not certified by this receipt.
- [ ] **Decide the historical privacy response.** Recommend a separately authorized history/other-ref inventory and remediation decision for known personal-contact and health/account material. The alternative is current-tree-only containment with acknowledged historical copies. Do not rewrite history without Sky’s explicit approval.

## Baseline, branch, and changes

Public main: `37b960cc89fde2b975ba222844df08a6c42cc63d`.
Existing cleanup tip at intake: `091b535e86bb49f62faac23deec7d0f1839212dd`, 21 ahead and zero behind main.
Reused branch: `claude/flagstone-public-repo-professionalize-nf1wg9`.
New contributor implementation commit: `1f98447e3986d8e69b9020f68a8be210ec1bada7`.

This session changes only docs/CONTRIBUTING.md:13 from the mismatched directory command to `cd AccessMap`, and adds this QA receipt. The existing 125-file cleanup, including 21 PNGs, is preserved. Its source/App/backend/scripts/workflow/package files are unchanged from public main. No release/native/privacy policy or product behavior changes were added. An isolated bare object store and Codex worktree were used because the managed tool was unavailable in this projectless chat and no valid local cleanup checkout existed. The shared primary checkout was read only.

Primary AGENTS.md and CLAUDE.md were read. Phase 6 preparation was completed/idle/HOLD when inspected; no overlapping cleanup writer was observed in the bounded thread/worktree samples. Unseen cloud/Claude writers remain unverified. The active Portfolio GSAP session was not touched. No active Flagstone integration or map-navigation checkout was altered.

## Privacy findings and scope

| ID | Category / source location | Branch result / remaining limit |
| --- | --- | --- |
| P0-01 | Personal phone fields in qa-reports/2026-05-28_Morgan_D2_BuildBlocker.md:33 and qa-reports/2026-05-28_morgan_dashboard-scope.md:25 | Existing branch removes both cited tokens. Exact normalized scan finds zero copies in scanned candidate text. Public main retains them. |
| P0-04 | Private health/capacity fields in APP_STORE_TODO.md:12 and qa-reports/cycle-2026-08-03-morgan-appstore-distance.md:129 | Existing branch replaces precisely each sensitive line; line counts and every surrounding line are preserved. Public main retains them. |
| P0-05 | Account-linked UI census fields at design-reviews/sim-walk/2026-08-19/screens/A5b_profile_census.json:94-96 and A5b_profile_17e_census.json:94-96; design-reviews/device-fixes/2026-08-18/HANDOFF.md:16 | Cited text redacted on existing branch. Finding remains PARTIAL: 21 changed PNGs are visually UNVERIFIED, and remaining contact/account-purpose candidates require adjudication. |

Before state: sensitive fields, values withheld. After state: existing neutral public-evidence redactions. No original contact, health detail, account identifier, or secret value is reproduced. A scan of 3271 tracked UTF-8 text files found zero normalized copies of the confirmed phone token; 490 binary/large/non-UTF8 files were excluded. This is a bounded token check, not secret-free or media certification. Independent contextual review removed 132 related literal lines across 91 files; 66 remain across 31 files, including intentional-contact/SQL/admin/catalog candidates. Those counts are not confirmed additional leaks.

## Gates and actual outcomes

The initial temporary dependency symlink reused primary packages. Typecheck exited 2 for three missing modules: @maplibre/maplibre-gl-leaflet, expo-crypto, and expo-secure-store. The symlink was removed; primary dependencies were preserved. The first local Jest command stopped with exit 1 because the existing Watchman socket refused connection before suite execution. Neither initial result was labelled a product regression.

```bash
npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund
```

Initial install exited 243: EACCES/EEXIST rename in the preexisting npm cache. No cache permissions/files were repaired or overwritten. The same command with `--cache <isolated-task-cache>` then exited 0: `added 1166 packages in 10s`, with deprecation warnings. The machine-specific cache path is withheld here. Lifecycle scripts were disabled. Package and lockfile bytes remain unchanged.

```bash
npm run typecheck -- --pretty false --incremental false
```

Final exit 0: `accessmap@4.1.1 typecheck`; `tsc --noEmit --pretty false --incremental false`. No emitted files.

```bash
npm run lint
```

Exit 0: `eslint src --ext .ts,.tsx`; `90 problems (0 errors, 90 warnings)`. Existing warnings were retained; no auto-fix was run.

```bash
npx --no-install jest --ci -w 3 --watchman=false
```

Exit 0. `Test Suites: 299 passed, 299 total`; `Tests: 32 todo, 4472 passed, 4504 total`; `Snapshots: 0 total`; `Time: 132.596 s`. Existing test-console warnings were present. Watchman was disabled only for local file discovery; assertions/mocks/configuration were unchanged. No native/physical-device/hosted acceptance is inferred from unit tests.

```bash
git diff --cached --check
```

Exit 0 before the implementation commit. Exact byte comparison against the existing cleanup confirms one directory command changed, and no other contributor text changed. The corrected command matches Git’s default clone destination. The file contains zero relative Markdown links to validate. No source formatting command was run.

## What remains

P0-01 and P0-04 are fixed on the branch only. P0-05 remains partial and owner-gated; public default exposure and historical copies remain. F-01 contributor entry is fixed on the branch. Existing P2/P3 native-status/setup/evidence issues were not expanded into this scope. Remote branch/PR identity and independent narrow review are recorded in the final owner handoff.

Rollback: before adoption leave or close the draft; after owner merge use a new inverse documentation commit rather than rewriting history. Reintroducing sensitive data is not recommended. No credential was established as live; no credential rotation was attempted.

## Process self-check

Efficiency: reused the exact public cleanup instead of duplicating 125 reviewed changes. Overlap: preserved primary work, all active product worktrees, and the Portfolio GSAP lane. Simplification: one contributor command plus a candid receipt; media review remains separate.

Main direct writes, merges, deployments, history rewrites, and credential rotations: NONE.
