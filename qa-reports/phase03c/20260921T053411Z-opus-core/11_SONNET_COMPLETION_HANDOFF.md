# 11 — Sonnet Completion Handoff (Phase 03C)

## Identity

```
WORKTREE:        /Users/skypie/AccessMap-worktrees/flagstone-p03c-opus-20260920
BRANCH:          opus/flagstone-phase03c-core-implementation-20260920   (local only, never pushed)
CANONICAL_BASE:  origin/main 6e91ec65bd5f5bdca086fe21949c8477bdc18bac (tree 82d248608f6dec177e497dca7a90c5bc0cda36d4)
RECON_COMMIT:    94338ad36e7ba0899251a2907370fd51cbbf8060 (recon/flagstone-p03c-20260920)
OPUS COMMITS:    93bb764d1cfc30250c7273e6fff0286c8f4a4e22  docs(phase03c): review + locked contract
                 97dd04c10767949c53e2793406a3a24c4af38549  test(phase03c): suite + harness + F2   (tree a8379ec3b0ad0a7cd799b575ad2fd03367494b2c)
                 HEAD = the commit that adds this file (parent 97dd04c). Confirm with `git log --oneline -4`.
```

First, verify the state: `git status --short` must be empty, and
`git merge-base --is-ancestor 6e91ec65bd5f5bdca086fe21949c8477bdc18bac HEAD` must succeed.

## Outcome

- **Gaps fixed: 1.** F2, the false privacy comment in `src/lib/flags.ts`.
- **Not actually gaps: 5.** F1, F3, F4, F5, F6. Proof is in `08`.
- **Remaining in Phase 03C scope: 0.**
- **Ambiguities resolved: 2 of 2.** A1 and A2, both from accepted archived evidence.
- **Migrations created: none.** Production already enforces the contract (see `08` §"Why no migration").
- **Behavior changes: none.** The only source edit is a doc comment.

## Files changed vs recon commit

```
qa-reports/phase03c/20260921T053411Z-opus-core/08_OPUS_ARCH_REVIEW.md
qa-reports/phase03c/20260921T053411Z-opus-core/09_PRIVACY_ARCHITECTURE_DECISION.md
qa-reports/phase03c/20260921T053411Z-opus-core/10_OPUS_IMPLEMENTATION_RESULTS.md
qa-reports/phase03c/20260921T053411Z-opus-core/11_SONNET_COMPLETION_HANDOFF.md
qa-reports/phase03c/20260921T053411Z-opus-core/LIVE_READONLY_ACCEPTANCE.sql              (NOT RUN; owner-only)
qa-reports/phase03c/20260921T053411Z-opus-core/LOCAL_REPLAY_PHASE03C_RESULT.json
qa-reports/phase03c/20260921T053411Z-opus-core/LOCAL_REPLAY_PHASE03B_REGRESSION_RESULT.json
scripts/replay-phase03c.mjs                                  (new harness)
supabase/tests/phase03c-anon-contract.test.sql               (new, 85 assertions)
src/lib/flags.ts                                             (comment only, line-neutral)
```

## Focused gates already PASSED on 97dd04c (do not re-derive, just re-run)

- `node scripts/replay-phase03c.mjs --pgtap-sql=<pinned>` → PASS 208/208 (52 + 49 + 22 + 85)
- `node scripts/replay-phase03b.mjs --pgtap-sql=<pinned>` → PASS, including rollback and reapply
- `node scripts/run-pgtap.mjs --discover` → 22 suites, 0 problems
- `npx tsc --noEmit` → exit 0
- `npx eslint src/lib/flags.ts` → 0 errors. The 10 warnings are pre-existing, at lines 206–825, away from the edit.
- `npx jest --ci -w 3` over these 17 suites → 360/360:
  - `src/lib/__tests__/{flags,createAnonFlag,flagsPagination,tasksSearchFilter,dataExport,removeUploadedFlagPhotos,severityColor,anonRateLimit}.test.ts`
  - `src/__tests__/{d1f4r3SourceClosure.guard,contractManifest.guard,geoPrivacyFence,d1f4r3Fix2ReviewReplay,qaMergeConsolidation,privacy.guard,canonicalMigrationSource.guard}.test.ts`
  - `src/screens/__tests__/guestReviewGating.guard.test.ts`
  - `scripts/__tests__/phase03aReplay.test.ts`

## Remaining mechanical work for Sonnet

1. Set up the environment. Both steps are needed only in a fresh shell:
   - This worktree has no `node_modules`. Link the canonical-base worktree's copy. Its lockfile
     is byte-identical (sha256 `458e6ced…cb24a`), and `.git/info/exclude` already ignores the link:
     ```bash
     ln -s /Users/skypie/AccessMap-phase03b-merge-20260920/node_modules /Users/skypie/AccessMap-worktrees/flagstone-p03c-opus-20260920/node_modules
     ```
   - Use the pinned pgTAP. Verify its hash is `d4f9c8a4b0bfa6f2e29c751ab4deb79208e43f5935bab1948750b95bad3926b3` before use:
     ```bash
     shasum -a 256 /Users/skypie/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/pgtap-968eb53a33114e83042b3bdb0c664b5b80cf8bdf/sql/pgtap.sql
     ```
2. Run the full repo gates and record exact counts. Commands are below.
3. Re-run both socket-only harnesses on the final HEAD.
4. Optional doc: add a top-level pointer report
   `qa-reports/2026-09-21_Claude_Phase03CCoreImplementation.md` (summary + link to this directory +
   the 🔴 D-1…D-4 from `09` §7) so Morgan's scan finds it. Copy the decisions verbatim. Do not
   re-decide them.
5. Hand off to an **independent fresh review** before Sky's merge decision. Sky alone merges.

### Exact commands (run from the worktree root)

```bash
npx tsc --noEmit
```
```bash
npm run lint
```
```bash
npx jest --ci -w 3
```
```bash
npm run contract:check
```
```bash
node scripts/run-pgtap.mjs --discover
```
```bash
node scripts/replay-phase03c.mjs --pgtap-sql=/Users/skypie/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/pgtap-968eb53a33114e83042b3bdb0c664b5b80cf8bdf/sql/pgtap.sql
```
```bash
node scripts/replay-phase03b.mjs --pgtap-sql=/Users/skypie/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/pgtap-968eb53a33114e83042b3bdb0c664b5b80cf8bdf/sql/pgtap.sql
```

Both harnesses are socket-only: TCP off, temp cluster, allowlisted env. Never substitute a hosted DB.

## Things NOT to do or redo

- Do **not** add a migration to "fix" F1, F3 or F4. `08` proves each is either a no-op, a
  shipped-client break, an anon broadening, or pre-empting owner-gated Stage B.
- Do **not** revoke the Stage-A compat grants on `flag_comments`, `flag_photos`, `point_events`
  or the two `*_public` views. That is Stage B, and it is owner-authorized separately.
- Do **not** narrow `flags` for anon with a column REVOKE. It is a no-op, and the effective form
  breaks `createAnonFlag` `RETURNING *`.
- Do **not** re-litigate `flags.user_id` anon visibility. It is the founding Jordan decision;
  the observation is routed as D-3.
- Do **not** edit the exact-set expectations in `phase03c-anon-contract.test.sql` to make a
  failure pass. A failure means the anon surface changed, so escalate instead.
- Do **not** run `npm run format` / `prettier --write src`. It breaks the source-pinning guards.
- Do **not** change the line count of `src/lib/flags.ts` anywhere above its manifest-pinned call
  sites (currently lines 1421–1754). `contractManifest.guard.test.ts` pins them by exact line.
- Do **not** re-run the recon crawl, re-derive A1/A2, or re-open FDA-028, `is_admin`, or Stage B.
- Do **not** run `LIVE_READONLY_ACCEPTANCE.sql`. It is owner-only, under Sky's separate live
  authorization.
- Do **not** push, merge, deploy, contact production or staging, or touch `/Users/skypie/AccessMap`.

## Future acceptance (owner, not Sonnet)

Before Phase 03C is declared closed against live truth, Sky may run
`LIVE_READONLY_ACCEPTANCE.sql` read-only. Its expected values are inline, and it was validated
locally. It re-checks the ledger (87 / `20260915210413`) and every catalog invariant. It also
checks the one fact not present in the accepted capture: `relreplident` for `flags`,
`flag_comments` and `flag_photos` (expect `d`).
