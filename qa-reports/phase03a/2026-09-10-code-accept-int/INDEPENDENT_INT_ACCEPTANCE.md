# Independent INT Acceptance Review — Phase 03A Integration Merge

**VERDICT: PASS**

The local integration merge `7c43c07e69f74db4d65aa4ea329f419b6c715fb4` did what it claims, safely, losing nothing beyond the six explicitly-claimed byte-identical renames, and changing nothing it should not have. This PASS authorizes NO staging, production, push, or main merge — those remain separate owner decisions.

Reviewed independently, from scratch, in a fresh subagent with no access to the prior (usage-limit-terminated) attempt's output. All checks below were run against the actual worktrees, not taken from the claim documents.

## Summary table

| # | Item | Verdict |
|---|------|---------|
| 1 | Merge identity | CONFIRMED |
| 2 | Nothing lost | CONFIRMED |
| 3 | 71-migration claim at Phase 02 baseline | CONFIRMED |
| 4 | Nothing gained that shouldn't be | CONFIRMED |
| 5 | FDA-028 v4 survived (8 hashes) | CONFIRMED |
| 6 | Build 33 / release control preserved | CONFIRMED |
| 7 | Post-INT gates reproduced on merged tree | CONFIRMED (one NOTE on raw archive bytes, see Finding 7c) |
| 8 | Applied migration integrity | CONFIRMED |
| 9 | Write-ahead discipline | CONFIRMED |
| 10 | Authority boundaries | CONFIRMED |
| 11 | Owner claim accuracy | CONFIRMED — no overstatement found |
| 12 | Staging packet sanity | CONFIRMED |

## Numbered findings

**Finding 1 — Merge identity (MUST-FIX: none).**
`git rev-list --parents -n1 7c43c07e69f74db4d65aa4ea329f419b6c715fb4` returns exactly `7c43c07e6… 5a64c9174ae5d9d5a94ed543bc4663216df67e7f cee5f8e48f436bee9be72abe870b3606b1d40088` — a true two-parent merge commit, tree `11de0eb4cf0cbf718fe17fa8a8cab8defef21af8`. `git reflog` on the integration branch shows a single `merge cee5f8e4…: Merge made by the 'ort' strategy` entry with no reset/rebase/cherry-pick around it. Not a fast-forward, squash, rebase, or cherry-pick.

**Finding 2 — Nothing lost (MUST-FIX: none).**
`git diff --name-status -M 5a64c917 7c43c07e` shows zero `D` (delete) lines and exactly six `R100` lines, all moving `supabase/migrations/*.sql` → `supabase/nonmanaged/proposed/*.sql`. Independently cross-checked with a raw `git ls-tree -r --name-only` set difference (`comm -23` between the pre-INT and merge file lists): exactly the same six paths, no others — this method cannot be fooled by rename-detection masking a real deletion because it does not use rename detection at all. All six were `shasum -a 256`-verified byte-identical between their pre-INT and post-INT paths.

**Finding 3 — 71-migration claim (MUST-FIX: none).**
`git ls-tree -r --name-only c2e36800…:supabase/migrations/` → exactly 71 `.sql` files. None of the six renamed files exist at that baseline (`git cat-file -e` fails for all six, as expected). None of the six appear in `supabase/contract/migration-crosswalk.v1.json` (grep returns 0 hits for all six basenames).

**Finding 4 — Nothing gained that shouldn't be (MUST-FIX: none).**
Full `--name-status -M` diff between pre-INT target and merge: 299 lines, categorized by top-level path — 186 in `qa-reports/phase03a`, 32 in `supabase/migrations-next`, 15 in `supabase/tests`, 11 in `src/lib`, 10 in `src/__tests__`, plus CI/tooling and a handful of `src/screens`/`src/types` files. Grepped the entire diff, and separately just the `.sql`/`.ts`/`.tsx` content, for `FDA-020`, `FDA-042`, `Phase 03B`, `Phase 03C`, `Phase 04`: every hit is inside `qa-reports/*` prose *documenting that those items are explicitly out of scope/not started* (e.g. `"notGranted": [...,"Phase 03B"]`, `"scopeLeakage": "NONE - no FDA-020, FDA-042, Phase 03B, 03C or 04 reference in any candidate"`); zero hits in any `.sql`/`.ts`/`.tsx` file. Traced the `src/lib`/`src/screens`/`src/types` changes to a single source-branch commit, `fix(db): prepare Phase 03A local foundation candidate` — in-scope Phase 03A caller code, not new/unrelated UI. `noCredentialsInTree.guard.test.ts` run directly: 7/7 pass. `.github/workflows/ci.yml` and `package.json` diffs are additive CI/tooling for the migration-replay and contract-check gates (Phase 02A/02B) — nothing that touches release, deploy, or credentials.

**Finding 5 — FDA-028 v4 survived (MUST-FIX: none).**
Recomputed all 8 sha256 hashes in the TARGET worktree directly; every one matches the pinned value exactly:
`8d1cc7e1…387771` limiter.sql, `eded3c9f…c8302` rollback, `5dccef0b…f24e2` acceptance.sql, `7283dcf8…4543c` acceptance2.sql, `b60720e4…c24e2*` acceptance3.sql, `061dfe7c…905` concurrency.sh, `4abb7b96…ea20e6eae7ba` devkey.sql, `2186cc19…ca` fixture.sql — all 8/8 exact.

**Finding 6 — Build 33 / release control preserved (MUST-FIX: none).**
`git diff --stat` between pre-INT target and merge for `release/current.json`, `docs/RELEASE_IDENTITY.md`, `vercel.json`, `app.json`, `eas.json` is empty (also checked parent2 alone — also empty, so no merge-resolution silently took the "wrong side"). Read `release/current.json` directly: `app.version` 4.1.1, `app.iosBuild` 33, `web.sourceCommit` / `deployedCommit` `ebf091c21066d39898160b1357bde0aa35bdb8bf`, `web.deployment.deploymentId` `HMszH26wADRRDd1CqH4UkJ8kAugQ`, `web.overlay.reason` "Accepted OpenFreeMap web basemap repair for the Build 33 demo" — all intact and matching the claim.

**Finding 7 — Post-INT gates reproduced (see 7a–7d).**

*7a — pgTAP proof.* Independently downloaded `theory/pgtap` at commit `968eb53a…` from `codeload.github.com`, built `sql/pgtap.sql` with `make PG_CONFIG=/opt/homebrew/bin/pg_config` on Postgres 17.11. The built SQL's sha256 (`d4f9c8a4b0bfa6f2e29c751ab4deb79208e43f5935bab1948750b95bad3926b3`) matches the pinned value **exactly**, and `scripts/replay-phase03a.mjs` itself hard-enforces this hash before it will run (`throw` on mismatch) — so this is not a self-reported number, the gate script would have refused to proceed on a mismatch. Ran `LC_ALL=C node scripts/replay-migrations.mjs --with-next --local-only --phase03a --phase03a-pgtap-sql=<built> --json` against the TARGET worktree at the merge commit: **exit 0**. `source.sha` in the result equals the merge commit `7c43c07e…` exactly. `status: LOCAL_CANDIDATE_PROOF_PASS`; `localProofPassed`, `privilegeProofPassed`, `restorationExact`, `reapplyDeterministic`, `privilegeGuard.passed`, `privilegeGuardRehearsal.passed`, `reappliedPrivilegeGuard.passed` all `true`. Suite counts: `promptb_media_key_guards.test.sql` 25/25, `phase03a-foundation.test.sql` 113/113, `phase03a-privileges.test.sql` 79/79 — **217/217, 0 failed**, matching the claim exactly.

*7b — typecheck / contract:check / lint.* `npm run typecheck` → exit 0, no errors. `npm run contract:check` → `migration-crosswalk.v1.json is current.` `npm run lint` → **0 errors**, 91 warnings (pre-existing style warnings unrelated to this merge; CLAUDE.md's own bar is "0 errors").

*7c — pgTAP archive-byte NOTE (SHOULD-FIX: none, informational only).* My own `curl`+`shasum` of the raw `pgtap.tar.gz` from codeload produced `672c047d…` — **not** the pinned `78822aa2…`. This is a known GitHub codeload characteristic: the gzip container bytes for a tarball-by-commit-SHA are not guaranteed stable over time even though the underlying tree is; the archive-level hash is recorded in the tool's output as a passed-through/claimed value and is not itself enforced by the replay script. What *is* enforced and *is* the load-bearing artifact — the generated `pgtap.sql` — reproduced bit-for-bit. Flagging for visibility only; does not affect the verdict.

*7d — four Phase 03A contract guard suites.* `canonicalMigrationSource.guard.test.ts` + `contractManifest.guard.test.ts` + `migrationLineage.guard.test.ts` (jointly 52 tests) + `scripts/__tests__/phase03aReplay.test.ts` (9 tests) = **61/61 passing across 4 suites**, matching the claim exactly.

*7e — full Jest on the merged tree.* Ran `npx jest --ci --forceExit --watchAll=false` fresh (not reused from any prior run): **4204 passed / 14 failed / 32 todo / 4250 total, 12 failed suites / 273 passed suites / 285 total** — an **exact** match to the owner's claimed baseline. Confirmed the 12 failing suites (`mapChromeBudget.guard`, `visualFreezeFixWave.guard`, `Wave2ScreenGeometry`, `bp11PressVocabGuards`, `keyboardClass.guard`, `privacy.guard`, `tasksHeaderReclaim.guard`, `bp3TrustEngineGuards`, `hitTargetFrame.guard`, `focusOnOpen.guard`, `dismissalStandard.guard`, `TasksScreenFlagCard`) are all UI/a11y/geometry/copy-guard suites, and none of their test files (nor any file in their obvious dependency path) were touched by this merge (`git diff --stat` between pre-INT and merge for all 12 files is empty) — consistent with "inherited," not introduced by the INT.

**Finding 8 — Applied migration integrity (MUST-FIX: none).**
Exactly 71 `.sql` files under `supabase/migrations/` in TARGET. `git diff --name-status c2e36800… HEAD -- supabase/migrations/` returns nothing at all (zero add/modify/delete) — the applied-migrations directory in TARGET is byte-identical to the accepted Phase 02 baseline. `supabase/migrations-next/phase03a/` holds exactly 8 timestamped forward candidates (7 numbered FDA files + `fda028_v4_limiter.sql`) plus 2 non-candidate reference files (`catalog.sql`, `effective-privileges.sql`, correctly not counted), and `rollback/` holds exactly 8 matching `.rollback.sql` files, one per candidate.

**Finding 9 — Write-ahead discipline (MUST-FIX: none).**
Source-branch commit sequence: `8faf899` (STEP 4 — CODE frozen) → `cee5f8e4` ("INT RUNNING: write-ahead state before merge", diff vs `8faf899` touches only `INT_PREPARED.json` itself) → merge `7c43c07e` created in TARGET → `725330f` ("INT APPLIED_NOT_VERIFIED... recorded before verification") → `9a0dc52` ("STEP 5: INT VERIFIED") → `be6d35d`/`f08b8c7` (staging packet + docs bank). This is exactly PREPARED → RUNNING → APPLIED_NOT_VERIFIED → VERIFIED. Rollback pointer `git -C <integration worktree> reset --hard 5a64c917` is correct and sufficient: confirmed the merge commit is the exact current tip of the integration branch (`git log --oneline -3` shows nothing after `7c43c07`), so a hard reset to the recorded parent1 fully and cleanly undoes the INT with no other commits to lose.

**Finding 10 — Authority boundaries (MUST-FIX: none).**
`main` and `origin/main` both resolve to `70b52a30e9fff0f7d538509b110212bb8d872391` — unchanged, matches required value exactly. `git remote -v` shows only `origin`; no evidence of any push (reflog on both worktrees' HEADs shows only the expected local commits/merges, ending each at the current known tip). Both worktrees are `git status` clean except the one output file this review is permitted to write. No Supabase/hosted contact was made; no `supabase` CLI apply/deploy command was run; the two disposable local Postgres clusters spun up during this review (one by `replay-migrations.mjs` itself, one implicitly by the pgTAP proof run) were both self-torn-down by the scripts (`Temp destroyed: true; global PostgreSQL unchanged: true`) and no `postgres`/`psql` server process was left running at the end (`ps aux | grep postgres` → empty).

**Finding 11 — Owner claim accuracy (MUST-FIX: none).**
Compared `INT_PREPARED.json`, `INT_RESULT.json`, `CODE_FREEZE.json`, `STAGING_AUTHORIZATION_PACKET.md`, and the four source-branch commit messages against everything independently measured above — no discrepancy found; every number and hash in those documents reproduced exactly. Specifically re-verified the corrected claim in `INT_PREPARED.json.migrationCollisionInspection`: the initial misreading ("INT deletes six applied migrations") is explicitly retracted in favor of "R100 renames, byte-identical, zero content lost" — and that corrected statement is itself accurate per Finding 2. No overstatement found anywhere in the claim set.

**Finding 12 — Staging packet sanity (MUST-FIX: none; document review only, no hosted contact was made).**
`STAGING_AUTHORIZATION_PACKET.md` names SHAs/trees that match Findings 1 and 5 exactly, an apply order (baseline reconciliation → 5 Phase 02 adoption candidates → 8 Phase 03A candidates in the same order verified in Finding 8) that is internally consistent, and an honest pre-state (`with_data:false`, three named Edge Functions, explicit "if any of this differs, STOP and re-verify"). Section 9 ("What this packet does not authorize") lists staging mutation, production, push, main merge, credential rotation, App Store, Phase 03B — it authorizes nothing. Independently re-verified 7 of the 8 candidate sha256 prefixes/suffixes in the packet's table 1:1 against the actual files in TARGET (all match). **Vault prerequisite claim verified true against source**: read `supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql` directly — `limiter.write_epoch_key` (line ~452) looks up the secret id via `SELECT id FROM vault.secrets WHERE name = 'fda028_limiter_epoch_key'`, and if `v_id IS NULL` it `RAISE EXCEPTION 'FDA028: limiter epoch key secret not provisioned'`. There is no `vault.create_secret` call anywhere in the file (`grep -c create_secret` → 0 hits). The packet's claim that the secret "must be provisioned before first use" and that `write_epoch_key` "deliberately never calls `vault.create_secret`" is **literally true of the source**.

## What the integration got right

- A genuinely boring, low-risk merge: target was a strict git ancestor of source, so the merge tree equals the source tree exactly — no conflicts, no manual resolution, nothing to get wrong at the content level.
- The rename reclassification (6 never-applied migrations moved out of `supabase/migrations/`) is exactly what it says it is, byte-identical, and independently confirmed by two different diffing methods so rename-detection can't hide a real deletion.
- Every load-bearing artifact hash (FDA-028 v4's 8 files, the 7 other Phase 03A candidates, the pgTAP-generated SQL) reproduces independently, from scratch, on this machine.
- Release/Build-33 control-plane files are untouched, and the values inside them (app 4.1.1/33, web deployment ID/sourceCommit) are correct.
- The write-ahead log (PREPARED → RUNNING → APPLIED_NOT_VERIFIED → VERIFIED) is real, legible in `git log`, and the rollback pointer is exact and sufficient.
- No authority boundary was crossed: no push, no main merge, no staging/production contact, main sits exactly where it should.
- The owner's self-correction about the "6 deletions" is itself accurate — a rare and good sign of calibration rather than a red flag.

## Residual risk the owner must accept

- This PASS covers the **local integration merge only**. FDA-028's Vault I/O, reset continuity across real time windows, and the three R6 residual-attack scenarios are explicitly still open and can only be proven hosted, on staging — none of that was exercised here (nor could it be, under this review's scope and the read-only/no-hosted-contact constraint).
- The 12 failing Jest suites (UI/a11y/geometry/copy guards) are pre-existing on the integration branch and untouched by this merge, but they are still failing — accepting this INT does not fix them, and they remain open technical debt on `integration/flagstone-b33-convergence-20260903` independent of Phase 03A.
- The Vault secret `fda028_limiter_epoch_key` genuinely will not self-provision; the very first hosted call to the limiter after this candidate is applied will raise `FDA028: limiter epoch key secret not provisioned` unless someone runs the provisioning step first. This is correctly flagged in the staging packet as an explicit staging-time prerequisite, not a bug — but it is a real manual step that is easy to forget.
- The `pgtap.tar.gz` archive-level sha256 is not reproducible via codeload as a byte-for-byte artifact (see Finding 7c). This does not weaken the actual gate (the enforced hash is on the generated SQL, which does reproduce exactly), but anyone re-verifying in the future should expect the same archive-hash mismatch and not treat it as tampering.
