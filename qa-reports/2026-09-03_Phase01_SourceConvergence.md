# PHASE-01 — Canonical Source Convergence

**Receipt.** `qa-reports/2026-09-03_Phase01_SourceConvergence.md`

| | |
|---|---|
| **Phase** | PHASE-01 — Canonical Source Convergence |
| **Prompt ID** | `FLAGSTONE-PHASE-01-MAIN-OWNER-20260903` |
| **Date** | 2026-09-03 |
| **Repository remote** | `https://github.com/Skypie99/AccessMap.git` (Skypie99/AccessMap) |
| **Owned finding** | FDA-001 — main does not contain submitted Build 33 product code |
| **Internal tasks executed** | 01, 00B, INT |
| **Gate** | `SOURCE_CONVERGENCE_GATE: PASS` |
| **MAIN_MERGE_AUTHORIZED** | **NO** |
| **Branch** | `integration/flagstone-b33-convergence-20260903` (local only, never pushed) |
| **Worktree** | `/Users/skypie/AccessMap-worktrees/flagstone-b33-convergence-20260903` (clean) |
| **Canonical SHA** | `045d6d3996cf534ee3119a16df9c41baede96d7e` |
| **Canonical tree** | `f5c62d40313e64bf9862fb46184522736c69e866` |
| **Rollback reference** | `70b52a30e9fff0f7d538509b110212bb8d872391` (branch start = unchanged `origin/main`) |

> This receipt is committed on top of the canonical SHA above, so the branch tip advances by one
> documentation commit when it lands. The integration identity being certified is `045d6d39` /
> tree `f5c62d40`.

---

## 1. Outcome in one paragraph

`main` and the product source actually submitted to the App Store as Build 33 had diverged at
`a0bf4d04` — 5 release-governance commits on one side, 113 product commits on the other, with the
accepted OpenFreeMap web repair sitting 2 commits beyond Build 33 on a third. PHASE-01 built a
single canonical integration candidate containing **all three lineages, with both histories intact
and zero commit replay**, then completed the credential- and release-config-hygiene lane on top of
it. The result is `045d6d3996cf534ee3119a16df9c41baede96d7e` on `integration/flagstone-b33-convergence-20260903`, held
locally. **Nothing was pushed, nothing was merged to `main`, no credential was rotated, no history
was rewritten, and the live Build 33 App Store review was not touched.**

---

## 2. Identity verification (fresh, at phase start)

Every reference identity in the phase prompt was re-verified against real Git objects before any
write. All matched exactly.

| Identity | SHA | Tree | Verified |
|---|---|---|---|
| audit-time `main` = current `origin/main` | `70b52a30` | `847f39f6` | ✅ matches prompt |
| submitted Build 33 | `f5594171` | `a4a5e70c` | ✅ matches prompt |
| accepted OpenFreeMap descendant | `ebf091c2` | `6cb842e3` | ✅ exists |
| divergence point (merge-base) | `a0bf4d04` | `97b75c46` | ✅ **computed**, matches prompt |
| final audit SHA | `ea610fe7` | `0924c5a0` | ✅ exists, correctly excluded |

**Ancestry, as measured:**

- `merge-base(main, Build 33)` = `a0bf4d04` — exactly the documented divergence point.
- `a0bf4d04..main` = **5** commits — exactly the five main-only release-control commits, all reachable from `origin/main`.
- `a0bf4d04..Build 33` = **113** commits.
- `Build 33..web` = **2** commits.
- **Build 33 is NOT an ancestor of `main`** → **FDA-001 independently reverified as genuinely OPEN.**
- The audit branch `ea610fe7` descends from `main` but contains neither Build 33 nor the web tip — correctly excluded from the merge.

No merge, rebase, cherry-pick, revert, bisect or sequencer state was in progress. Working base was
unchanged at `94d86239` on `codex/spark-a11y-c2a-infra-20260830`.

---

## 3. Preservation manifest

A full census was taken before any write and re-taken after all work.

| | Phase start | Phase end |
|---|---|---|
| Registered worktrees | **35** | **38** (35 + the 3 created here) |
| Worktrees with dirty/untracked state | **12** | **12** (identical set, identical contents) |
| Prunable-but-preserved entries | 1 | 1 (**not pruned**) |
| `origin/main` | `70b52a30` | `70b52a30` (**unchanged**) |

**A full before/after diff of the census shows exactly three added lines — the three worktrees this
phase created, all clean. Not one pre-existing worktree was modified, cleaned, reset, stashed,
pruned, moved or reused.**

Worktrees created by this phase (all new paths, no collisions):

| Path | Branch / state | Purpose |
|---|---|---|
| `AccessMap-worktrees/flagstone-b33-convergence-20260903` | `integration/flagstone-b33-convergence-20260903` | canonical integration candidate |
| `AccessMap-worktrees/flagstone-00b-hygiene-20260903` | `hygiene/flagstone-00b-credential-config-20260903` | isolated TASK 00B source branch |
| `AccessMap-worktrees/_phase01-baseline-ebf091c` | detached at `ebf091c2` | A/B baseline for regression proof |

### Current-truth correction — the dirty-worktree count

PHASE-00 recorded **11** dirty worktrees; the fresh census found **12**. This is a **counting
convention difference, not a state change**: PHASE-00 counted the 11 *satellite* worktrees, while
the primary repository `/Users/skypie/AccessMap` is itself dirty (`M CLAUDE.md` + 94 untracked
paths) and is the 12th. No PHASE-00 receipt file exists in `qa-reports/`, consistent with its
"zero commits" record, so PHASE-00 did not create the delta. **Downstream phases should use 12.**

---

## 4. TASK 01 — controlled convergence

### Mechanics

Both merges were history-preserving `git merge --no-ff --no-commit`, resolved from evidence, then
committed. **No replay, no squash, no rebase, no reset, no force, no global `ours`/`theirs`.**

| Step | Command | Result |
|---|---|---|
| Branch | `git worktree add -b integration/… <path> 70b52a30` | clean at `70b52a30` / tree `847f39f6` |
| Merge 1 | `git merge --no-ff --no-commit f5594171` | **zero conflicts**; only `package.json` auto-merged |
| Commit 1 | — | `c10ed1b4` · tree `dffc4db5` · parents `70b52a30` + `f5594171` |
| Merge 2 | `git merge --no-ff --no-commit ebf091c2` | **zero conflicts**; the 13-file web delta |
| Commit 2 | — | `df6c0a9d` · tree `4fa30f0c` · parents `c10ed1b4` + `ebf091c2` |

Conflicts were forecast before touching anything: `git merge-tree --write-tree` on both pairs
returned **exit 0, zero conflicted paths**. The only file touched by both sides across the entire
divergence is `package.json`.

### Determinism cross-check

The committed merges reproduce the independent forecasts **bit-for-bit**:

- `merge-tree(main, Build 33)` → `dffc4db5` == tree of `c10ed1b4` ✅
- `merge-tree(main, web)` → `4fa30f0c` == tree of `df6c0a9d` ✅

The second is the stronger result: a **two-step** merge reproduced the **one-step** forecast exactly.
That is structurally guaranteed here (Build 33 is a strict ancestor of the web tip and both
merge-bases equal `a0bf4d04`), which makes the agreement meaningful evidence rather than coincidence.

### The decisive preserve proof

> `diff(tree of c10ed1b4, tree of Build 33)` = **exactly the 21 files unique to `main`, and nothing else.**
> `diff(tree of df6c0a9d, tree of the web tip)` = **exactly the same 21 files, and nothing else.**

Every one of Build 33's 334 changed product files, and every one of the web tip's files, is
**byte-identical** in the candidate. Subtree object IDs confirm it directly:

| Subtree | Candidate | Web tip | |
|---|---|---|---|
| `src` | `5cadb981` | `5cadb981` | ✅ identical |
| `supabase` | `b1f1ad00` | `b1f1ad00` | ✅ identical (and identical to Build 33) |

### No commit replay

| Check | Result |
|---|---|
| Commits reachable from HEAD | 1933 |
| `1816 (main) + 113 (B33) + 2 (web) + 2 (merges)` | **= 1933** ✅ exact |
| Newly authored commits (`HEAD --not main B33 web`) | **2**, both merges, zero non-merge |
| Branch reflog | 3 entries, forward-only: create → merge → merge. No reset/rebase/amend/force. |
| Audit branch `ea610fe7` an ancestor? | **No** ✅ correctly excluded |

### `package.json` — the one genuinely merged file

The single highest-risk file, and it carried a **semantic trap that a careless resolution would have
walked into**. Build 33 *deleted* the `deploy:testflight` / `deploy:appstore` scripts **and** rewrote
`src/__tests__/releaseScripts.guard.test.ts` to forbid them — while `main` (and 20+ docs) still
reference them. Git takes Build 33's test file silently, because `main` never touched it. A
"union the scripts object" resolution would have merged cleanly and then failed the guard.

The three-way merge resolved correctly: the result is the web tip's `package.json` **plus** main's
seven `release:*` scripts and nothing else — 24 scripts (17 + 7), 39 dependencies, `deploy:*`
**correctly still absent**, `@supabase/supabase-js` pin preserved. `releaseScripts.guard.test.ts`
passes. `package-lock.json` is byte-identical to the web tip (main never touched it) and its root
`dependencies` / `devDependencies` / `version` match `package.json` exactly.

### Migrations

**Zero migration conflicts, structurally.** `main`'s `supabase/` subtree is byte-identical to the
merge-base's (`cac9ea2c` at both) — its five commits touched nothing under `supabase/`. Build 33's
subtree (`b1f1ad00`) was therefore taken wholesale, and the merged tree's `supabase` entry *is*
Build 33's object. Nothing was resolved wholesale by policy; there was simply nothing to resolve.
Build 33 carries 77 CLI-timestamped migrations against main's 47 legacy date-named ones — the
2026-08-28 migration-map truth repair. **Migration integrity fully preserved.**

---

## 5. Gates — every one run, every one reconciled against a baseline

A dedicated baseline worktree was checked out at the accepted OpenFreeMap tip `ebf091c2` so that
**every** gate could be compared A/B under identical conditions. Nothing below is inferred.

| Gate | Command | Candidate | Baseline (`ebf091c2`) | Verdict |
|---|---|---|---|---|
| Typecheck | `npm run typecheck` | exit **0** | exit **0** | ✅ PASS, parity |
| Lint | `npm run lint` | exit 0 — 91 problems, **0 errors** | exit 0 — 91 problems, 0 errors | ✅ PASS, parity |
| Format | `npm run format:check` | exit 1 — 263 files | exit 1 — **263 files** | ⚠️ pre-existing, exact parity |
| Whitespace/markers | `git diff --check` | clean | — | ✅ PASS |
| Release preflight | `npm run release:preflight` | exit 0 — `PREFLIGHT: PASS` | — | ✅ PASS |
| Release verify | `npm run release:verify` | exit 0 — `RELEASE VERIFY: PASS` (20 `[PASS]`, 0 `[FAIL]`) | — | ✅ PASS |
| Release status | `npm run release:status` | exit 0 — `RELEASE STATUS: PASS` | — | ✅ PASS |
| Expo doctor | `npx expo-doctor` | exit 1 — 16/18 | exit 1 — **16/18, identical two** | ⚠️ pre-existing, exact parity |
| Web export | `npx expo export --platform web` | exit **0** — 4.6 MB built | — | ✅ PASS |
| Jest (full) | `npm test -- --ci` | see below | see below | ✅ zero regressions |

**Preserve-check register.** 126 concrete checks were derived from the three lineages and executed
against the candidate: **118 passed.** Of the 8 that did not, **none is a merge defect**: 1 was a
false negative in the check itself (`lucide-react-native` ships an `exports` map exposing only `.`
and `./icons`, so `require.resolve('…/package.json')` is blocked by Node encapsulation — the module
resolves fine and the authoritative lockfile-consistency check passes), 2 were the pre-existing red
described below, and 5 were *prescriptive* checks describing the desired post-TASK-00B state, which
TASK 00B then delivered.

**Release-control preservation is proven by execution, not just by file presence.** All 21 main-only
files are present and 20 of 21 are byte-identical to `main` (`package.json` is the legitimate merge).
More importantly the control plane *runs green on the converged tree* and reports honestly:

> `MAIN RELEASE-CODE CONVERGENCE: DEFERRED — origin/main 70b52a3 does not contain app source`

That is **correct and must stay correct**: PHASE-01 produces a candidate, it does not merge `main`.
`release/current.json` was deliberately **not** edited — changing `governance.releaseCodeIntegration`
before an actual main merge would be inventing release state.

### Web export proves the OpenFreeMap transplant end-to-end

The built web bundle contains `tiles.openfreemap.org` and **zero** occurrences of `cartocdn`. The
accepted web repair survives all the way through to a real build artifact.

### Test baseline reconciliation — the central regression claim

The first full run was executed while a typecheck was competing for CPU on an 8 GB machine and
reported 32 failing suites. That number is **not trustworthy** and is not used here: re-running the
same 32 suites under quiet conditions in **both** worktrees settled it.

| Run | Test Suites | Tests |
|---|---|---|
| Candidate `df6c0a9d`, 32-suite A/B | 21 failed / 11 passed | 17 failed / 346 passed |
| Baseline `ebf091c2`, same 32, same flags | **21 failed / 11 passed** | **17 failed / 346 passed** |

**Identical. Zero regressions, zero improvements — the same 21 suites, failing the same way.**
11 of the original 32 were CPU-contention flakes.

This is corroborated structurally: the candidate's `src/` and `supabase/` subtrees are *byte-identical*
to the web tip, and the failing test files themselves are byte-identical, so a merge-caused failure
was not possible in the first place.

---

## 6. TASK 00B — credential and release-config hygiene

Run on an isolated branch off the accepted convergence SHA. **Two commits** — `2e29913e` (the work)
and `44818f78` (closing the six MAJOR findings independent review raised against it; see §12).
Final source SHA `44818f78`, tree `e31b40a4`. 9 files touched in total. **No product source touched** — the only `src/` changes are under `src/__tests__/`.
`supabase/` stayed byte-identical to Build 33 and `app.json` was not touched at all.

### The census: exactly two tracked carriers

| # | Carrier | Disposition |
|---|---|---|
| (a) | `supabase/migrations/20260529181141_notify_flag_status_webhook_trigger.sql` — 64-hex webhook secret | **NOT edited.** Allowlisted with an argued entry. |
| (b) | `design-reviews/sim-walk/2026-08-19/PROMPT_AUTHED_PASS.md` — 14-char reviewer password | **Redacted.** |

Carrier (b) is now gone from the working tree — verified by recovering the literal programmatically
from the pre-edit blob into a variable and confirming `git grep -F` matches **zero** tracked files.
The value was never printed at any point.

Carrier (a) was deliberately left in place. The file's own header records it as reconstructed
*verbatim* from the hosted Supabase migration ledger (`schema_migrations` version `20260529181141`)
during the 2026-08-28 migration truth repair, and `qa-reports/2026-08-28_MigrationMapRepair_Evidence.md`
books it as `RECONSTRUCTED` in the 69/69 hosted-parity set. **Editing it to make a scanner green
would falsify a self-declared-verbatim file and break the hosted↔local parity that repair
established.** It is classified as an *immutable historical carrier of a dead credential*, given one
`ALLOWED` entry anchored on the HTTP **header name** — never the value — and canonical treatment is
deferred to PHASE-02.

Both literals are **dead**, per accepted PHASE-00 evidence re-stated in the new
`docs/CREDENTIAL_HISTORY.md`. **No credential was rotated. No history was rewritten.** Neither was
required, and rotating the reviewer account would have disturbed the live Build 33 review for no
security benefit.

### The guard was green-but-blind — now it actually sees

Before this commit the credential guard reported **0 findings while both dead literals sat in the
tree**. Two structural gaps, both closed:

1. **The topic gate skipped whole files.** A file was scanned only if it contained review/demo
   *account* language — which placed the entire non-login secret class (webhook secrets, API keys,
   bearer tokens, service-role keys) outside the guard *by construction*. It now scopes the two
   login detectors only.
2. **All 7–64-char hex was excused as "git SHA / hex digest"** — precisely the shape
   `openssl rand -hex 32` produces, the shape this repo's own webhook README instructs you to
   generate. A new **Detector 3** matches non-login secret labels (`secret`, `api_key`,
   `access_token`, `auth_token`, `service_role_key`), accepts `,` as a delimiter so a SQL
   `jsonb_build_object('X-…-Secret', <v>)` pair is reachable, and opts into long hex (≥ 32 chars;
   shorter stays a SHA prefix).

A third gap was found *by review, not by me*: the first version of Detector 3 anchored on `\b`, and
`_` is a word character, so it was blind to every underscore-prefixed label. And a fourth: the guard
was purely label-based, leaving it strictly weaker than the pre-commit hook on unlabelled
credentials. Both are closed — see §12 for the full accounting. **Detector 4** now adds
format-based, label-independent matching (service_role JWTs, `sb_secret_` keys, AWS access-key IDs,
PEM private-key headers).

**Measured:** detectors 3 and 4 together sweep the full tracked-file census —
**1 finding, 0 false positives**, the allowlisted immutable carrier and nothing else. Its non-vacuity is now pinned two ways: a new test `B2` proves it
fires on a synthetic 64-hex value assembled at runtime and stays silent on `process.env` indirection,
existing test `D` requires the allowlist entry to correspond to a **live** finding — so the exemption
cannot rot into a silent blanket pass — and `B3` proves the format detectors fire on synthetic
values while ignoring `Deno.env` indirection.

Test `E` was also repointed: it read a migration path the Build 33 migration-map repair had renamed,
so it threw `ENOENT` instead of asserting. **A guard that throws is a guard that is off.**

### A limitation found, measured, and honestly declined

The guard still cannot see a credential mentioned in *prose* — inline code in a sentence with no
`label: value` pair, which is exactly the shape carrier (b) had. A prose/inline-code detector was
built and measured: across the tracked tree it produced **16 findings of which 15 were false
positives** — ordinary code identifiers (`secureTextEntry`, `textContentType`, `autoComplete`) and a
non-secret App Store Connect Key ID. All 15 were individually inspected (values redacted) and
confirmed benign, so **no undiscovered credential is hiding behind that decision**. Shipping it
would have meant either a red CI or an allowlist large enough to defeat the point. It was rejected
and recorded as a known limit; prose carriers remain a review responsibility.

### The hook was leaking what it caught

`.husky/pre-commit` held the raw matched staged diff lines in `$MATCHES` and did `echo "$MATCHES" | head -5`
— printing **up to five raw offending lines, i.e. the secret itself**, into the developer's
scrollback and any log capturing it. That is precisely the disclosure the Jest guard goes out of its
way to avoid. It now prints a length-and-character-class shape and points the developer at
`git diff --cached`. Verified with a synthetic value: the value does not appear in the output. The
patched hook then ran for real on this very commit and passed.

### FDA-046 release config

| Item | Disposition |
|---|---|
| **Android submit** | **HARD-DISABLED.** The whole `submit.production.android` block removed, placeholder `serviceAccountKeyPath` included. An accidental `eas submit --platform android` now fails on *missing configuration* rather than later on a missing key file. Pinned by 5 new guards asserting: no `android` key in any submit profile, no `serviceAccountKeyPath` anywhere, no Google service-account JSON tracked in git, iOS submit intact, and no npm script or workflow carrying `--platform android`. |
| **Sentry** | Applied exactly the remediation `TESTFLIGHT_ACTION_ITEMS.md` NH-5 prescribed: `SENTRY_DISABLE_AUTO_UPLOAD` added to `build.production.env`. Every **distribution** profile now carries it consistently (`preview`, `preview2`/`preview3` by `extends`, `testflight`, `production`); `development` deliberately does not. Inert today — verified no `@sentry/*` dependency, no plugin, no source, no auth-token reference anywhere. |
| **`expo.owner`** | **Deliberately left absent and carried forward.** Absence is correct for a personal-account project (EAS resolves from the authenticated account plus `extra.eas.projectId`, which is set), and a *mismatched* owner is itself a hard build-blocker. Writing the correct value needs authoritative EAS account identity, which requires an authenticated remote call outside this phase's remit. **Guessing the slug would be worse than leaving it unset.** `slug` and `scheme` both verified still `accessmap`. |

`eas.json` remains valid JSON with no `//` comments, and the CI workflow's "Guard fixed EAS profiles"
step is unaffected (it asserts `submit.production.exists`, which still holds).

### TASK 00B gates

Typecheck **0** · lint **0 errors / 91 warnings — exactly the baseline count** · focused suites
**60/60** pass · all three release gates PASS · `eas.json` valid JSON with no `//` · hook `sh -n` clean.

**Full-suite reconciliation:** 20 failing suites against the quiet-conditions baseline of 21, and
**4,005 tests passing** (up 6 — the new guard tests). The failing set is **exactly the baseline set
minus `noCredentialsInTree.guard.test.ts`** — one real fix, **zero new failures**, verified again
after the review-fix commit.

---

## 7. New current truth (corrections to carry forward)

1. **Dirty worktrees are 12, not 11.** Counting-convention difference (PHASE-00 counted satellites
   only; the primary repo is the 12th). Not a state change.
2. **The canonical product lineage ships red: 20 failing test suites**, inherited verbatim from
   Build 33 as submitted — *not* caused by convergence. See §8; this is the most important
   downstream fact in this receipt.
3. **The credential guard was green-but-blind**, reporting 0 findings while two dead literals sat in
   the tree. Fixed here, but it means **every previous green run of that guard proved less than it
   appeared to**.
4. **`.husky/pre-commit` was printing caught secrets** into developer scrollback. Fixed here.
5. **`expo.owner` absence is correct**, not a gap — for a personal-account project EAS resolves from
   the authenticated account plus `extra.eas.projectId`. The open question is only whether the
   project ever moves to an Expo org. NH-6 restated accordingly rather than closed on an assumption.
6. **Android submit could never have worked** — the `serviceAccountKeyPath` was a literal `TODO_`
   placeholder and no such file has ever been tracked. The risk was *overstated readiness*, not
   accidental publication. Now hard-disabled.
7. **`main`'s `supabase/` subtree is byte-identical to the merge-base's**, so migration convergence
   was structurally a fast-forward, not a merge. Useful to know before PHASE-02 touches migrations.
8. **`src/lib/tileCache.ts` is now orphaned** — the OpenFreeMap transplant removed its only
   production reader and writer. Web offline tiles still work via the service worker, so this is
   dead code rather than a functional regression, but sign-out no longer purges cached map tiles.
9. **`delete-account` deployment/config drift persists** (deployed `verify_jwt=true`,
   `supabase/config.toml` declares `false`). Untouched here, as instructed; carried to the
   backend-contract phase.
10. **`docs/RELEASE_PLAYBOOK.md` §1c still claims `"version": "0.2.0"`** while `app.json` says
    `4.1.1`. Stale doc drift, not touched here.

---

## 8. ⚠️ The single most important carry-forward

**The canonical product lineage has 20 failing test suites, and they are not this phase's doing.**

They fail identically at the OpenFreeMap tip and at Build 33 itself — i.e. **the source submitted to
the App Store was already red.** Convergence neither caused nor cured them.

**Dominant root cause (12 of 20): stale file paths after the migration-map repair.** The 2026-08-28
repair renamed migrations from `YYYY-MM-DD_name.sql` to CLI-timestamp form, but several guards still
`readFileSync` the old paths and therefore **throw `ENOENT` instead of asserting**. Affected paths:

```
2026-05-30_trust_score_system.sql
2026-08-27_d1_option_a_account_deletion.sql
2026-08-27_d1f4_async_account_deletion.sql
20260828010000_d1f4r3_source_closure.sql
20260828020000_d1f4r3_fix2_review_replay_and_flag_delete.sql
20260828030000_d1f4r3_fix3_review_audit.sql
```

Two consequences deserve explicit attention:

- **`src/lib/__tests__/pointsSqlParity.test.ts` is dead code.** `CLAUDE.md` names it as the guard
  coupling the SQL trigger point values to `src/lib/points.ts`, which drives the Help FAQ copy and
  the Tasks flash banners. It currently errors on load, so **that coupling is unguarded.**
- **Two failing guards — `dismissalStandard.guard.test.ts` and `focusOnOpen.guard.test.ts` — are
  byte-identical to `main`'s own copies**, so they are guards `main` currently relies on. An
  independent reviewer checked the four failing accessibility guards and found them to be **stale
  guards, not real WCAG regressions** (e.g. the reduced-motion gate *is* wired in `SheetPull.tsx`;
  the guard's regex only looks for an inline ternary). That is reassuring for product quality but
  does not make CI green.

**This was deliberately left out of scope.** PHASE-01's task list is TASK 01, TASK 00B and TASK INT;
repairing 20 unrelated suites is none of them, and doing it here would have buried a source-convergence
change under an unrelated test-repair change. **But it is a genuine blocker for the eventual `main`
merge: converging this to `main` turns CI red.** It should be a properly scoped task of its own,
before any main merge is attempted.

---

## 9. Findings

| Finding | Status |
|---|---|
| **FDA-001** — main does not contain submitted Build 33 product code | **Closure proof delivered.** Reverified genuinely open at phase start, then a canonical candidate was built containing all three lineages with both histories preserved, independently accepted, and all preserve contracts green. **Remains formally OPEN until Sky merges to `main`** — the candidate is held locally and `release:verify` still correctly reports `MAIN RELEASE-CODE CONVERGENCE: DEFERRED`. |
| **FDA-007** (reviewer password) | Repository hygiene addressed: last tracked carrier redacted, situation documented. Confirmed **dead — no rotation**. Published history intentionally not rewritten. |
| **FDA-025** (webhook secret) | Repository hygiene addressed: classified as an immutable historical carrier, allowlisted with argument, guard taught to see the class. Confirmed **dead — no rotation**. |
| **FDA-046** (release config) | Android **resolved** (hard-disabled). Sentry **resolved** (NH-5 remediation applied). `expo.owner` **honestly left open** pending authoritative EAS identity. |
| **FDA-008** (leaked-password protection) | Untouched — owner-deferred until the current App Store review completes. |

---

## 10. TASK INT — controlled accepted-source integration

Invoked exactly once, to integrate the single accepted TASK 00B source SHA into the canonical branch.

**Preconditions verified before merging:**

| Precondition | Result |
|---|---|
| Canonical branch clean and at the accepted convergence SHA | ✅ `df6c0a9d` / tree `4fa30f0c` |
| Source SHA exists and is a commit | ✅ `2e29913e` |
| Source SHA **is** its branch head (no unreviewed later commits) | ✅ exact match |
| Source worktree clean | ✅ 0 dirty paths |
| Source has independent acceptance + rollback reference | ✅ see §12 |
| `merge-base(canonical, source)` == canonical | ✅ linear, exactly 1 commit ahead |
| `merge-tree` forecast | ✅ exit 0, **zero conflicts**, tree `d5472963` |
| Pre-integration backup pointer recorded | ✅ `df6c0a9d` (§11) |

Merged with `--no-ff --no-commit`, **not** a fast-forward, so both parent identities are recorded.

| | |
|---|---|
| **Integration merge** | `045d6d3996cf534ee3119a16df9c41baede96d7e` |
| **Tree** | `f5c62d40313e64bf9862fb46184522736c69e866` |
| **Parents** | `df6c0a9d` (canonical) + `2e29913e` (TASK 00B) |
| Changed files vs canonical | 8 — exactly the TASK 00B set, nothing else |

**Post-integration composition gates, re-run on the composed result:**

| Gate | Result |
|---|---|
| Ancestry — `main`, Build 33, OpenFreeMap tip, TASK 00B, all five main-only commits | ✅ all ancestors |
| Audit branch `ea610fe7` excluded | ✅ absent |
| Commits authored by PHASE-01 | **6** — 3 merges + the 3 TASK 00B commits; **zero replayed** |
| Branch reflog | 4 entries, forward-only. No reset, rebase, amend or force. |
| `package.json` / `package-lock.json` touched by INT | **0 files** |
| Typecheck | exit **0** |
| Lint | exit 0 — **91 problems, 0 errors** (baseline-identical) |
| `git diff --check` | clean |
| `release:preflight` / `release:verify` / `release:status` | exit 0 — **PASS / PASS / PASS** |
| Focused guard suites | **49/49** pass |
| Full Jest suite | 20 failed / 261 passed · 16 failed / **4,005 passed** — failing set an **exact match** to the inherited baseline minus the one genuinely fixed |
| Web export | exit **0**, 4.6 MB — `tiles.openfreemap.org` present, **zero** `cartocdn` |

Changed vs the web tip: **30 files** = main's 21 ∪ TASK 00B's 9, with no overlap and no residual.

---

## 11. Side effects, authority, and rollback

### What this phase did NOT do

No push (of any branch). No merge to `main`. No history rewrite. No force push. No branch deletion.
No worktree pruning. No mutation of any pre-existing worktree. No credential rotation. No Vault
mutation. No Auth mutation. No migration applied. No Edge Function deployed. No production database
access. No EAS build. No TestFlight submission. No App Store Connect action. No Vercel promotion.
No remote metadata change. **The only remote interaction in the entire phase was a single
non-pruning read-only `git fetch`.**

`origin/main` is still `70b52a30` — verified at phase start, mid-phase and at phase end. Neither
integration commit is an ancestor of it. Neither branch has a remote-tracking ref.

### Rollback

| Reference | Value |
|---|---|
| Pre-phase `origin/main` (unchanged) | `70b52a30e9fff0f7d538509b110212bb8d872391` |
| Convergence branch start point | `70b52a30e9fff0f7d538509b110212bb8d872391` |
| Pre-integration canonical SHA | `df6c0a9d752fd36083b9dff65a0cf29dee749c6b` |
| TASK 00B source SHA | `2e29913efda91f9194ff8edc18af627131dcd013` |
| Submitted Build 33 (untouched) | `f5594171e75bc5ec92a87d0392c361601ddedfba` |
| Accepted web tip (untouched) | `ebf091c21066d39898160b1357bde0aa35bdb8bf` |

**Rollback is total and costless**: every artifact of this phase lives on two brand-new local
branches in three brand-new worktrees. Deleting them returns the repository to its exact phase-start
state. No shared history, no published ref, and no pre-existing worktree would be affected. If a
committed integration result must be rejected after review, use a forward revert on the integration
branch rather than a reset.

### Environment notes (recorded, not hidden)

- The first `npm ci` **failed** (exit 243, `EACCES` renaming into the shared `~/.npm/_cacache`).
  The background-task wrapper reported exit 0 because it reported the `tee` exit, not npm's — caught
  by a follow-up check, **not** taken as a pass. Rerouted to an isolated cache; the real install
  then succeeded. The user's global npm cache was never modified.
- Jest discovery was explicitly verified (281 test files) to rule out the known silent-zero
  false-pass that occurs when running from a path containing `/.claude/`. All three phase worktrees
  live outside that path.
- Baseline worktrees reused the candidate's `node_modules` via APFS clone (`cp -Rc`, ~15 s), which
  is safe here because `package-lock.json` is byte-identical between the candidate and the web tip.

---

## 12. Independent acceptance

The implementation model was **not** the sole acceptor. Five independent reviewers were run
adversarially — each instructed to *falsify* the claims and to default to REJECT on anything they
could not reproduce themselves.

### TASK 01 — three reviewers, 0 blockers

| Reviewer | Verdict | Claims reproduced |
|---|---|---|
| Graph & release-control integrity (Rory lens) | **ACCEPT** | 23 / 23 hold |
| Build 33 product & accessibility preservation (Dani/Alex lens) | **ACCEPT_WITH_NOTES** | 12 / 18 hold |
| Exact-diff & gate audit (Terra/Sol lens) | **ACCEPT_WITH_NOTES** | 21 / 21 hold |

**They corrected me on three supporting claims, and those corrections are adopted here rather than
argued away:**

1. **`diff(Build 33 → HEAD)` returns 33 paths, not 21.** My acceptance prompt stated the wrong
   number for that particular pair. The two comparisons I actually executed were correct and both
   returned exactly 21 (`Build 33 → c10ed1b4`, and `web tip → HEAD`). The 33 decomposes exactly:
   21 main-only ∪ 13 web delta − 1 (`package.json` in both) = 33, **with zero residual**. Substance
   holds; the stated criterion was imprecise.
2. **16 surfaces adopt `presentation="expanded"`, not ~18** — and Build 33 also has exactly 16, so
   nothing was lost. My recon lane's figure was wrong.
3. **The "glass map chrome" spot-check does not discriminate** — `GlassSurface` and the Nearby
   surface exist at `main` too, so finding them at HEAD proves nothing about the merge. The genuinely
   discriminating markers are `TabBarGlass.tsx` / `tabBarGeometry.ts` / `TypeBlock`, all confirmed
   present at HEAD and absent at `main`.

A reviewer also flagged that my conflict-marker sweep command produced 35 false positives (ASCII
`=======` rules in `.txt` report archives). Not real conflicts — `git diff --check` and the
zero-conflict merges are the authoritative evidence — but the check as written was sloppy.

Two reviewers independently raised the 20 red suites as MAJOR, and one identified the
`pointsSqlParity` dead-guard problem. Both are recorded in §8.

### TASK 00B — two reviewers, 0 blockers, **6 MAJOR findings, all fixed**

| Reviewer | Verdict | Claims reproduced |
|---|---|---|
| Security (Steve lens) | **ACCEPT_WITH_NOTES** | 12 / 15 hold |
| Release config (Rory lens) | **ACCEPT_WITH_NOTES** | 12 / 16 hold |

This is the part of the phase where independent review earned its cost. Neither reviewer found a
blocker, but between them they found **six MAJOR defects in my own work — two of them false claims
in shipped documentation**, which is worse than the code bugs. All six were fixed in a second
commit (`44818f78`) rather than accepted past.

| # | Finding | Fix |
|---|---|---|
| M1 | **Detector 3 was anchored on `\b`, and `_` is a word character** — so `\b` could never match between `_` and the label. `webhook_secret:`, `WEBHOOK_SECRET=`, `SUPABASE_SERVICE_ROLE_KEY=`, `MY_API_KEY=`, `client_secret =` were all silently unreachable: the dominant real-world env-var shape, and the shape this repo's own `.env.example` uses. My claim to have closed "the whole non-login secret class" was **overstated**. | Re-anchored on non-alphanumeric boundaries. All ten shapes now hit; still 0 false positives. Pinned by a regression list. |
| M2 | **`docs/CREDENTIAL_HISTORY.md` said the webhook literal was on "10 refs, 3 public".** That figure came from the PHASE-00 handoff and **I never re-measured it.** A direct census of all 257 refs: **71 ref tips / 33 origin refs** for the webhook literal, and **226 / 48 for the reviewer password — including `origin/main`.** ~7× wider than written. | Corrected, with the error **recorded rather than silently overwritten**. Also now states that `origin/main` is not yet clean. |
| M3 | **Assertion `E` compared raw `Finding` objects with `toEqual([])`**, and `Finding` carries `lineText` — so a failure would have pretty-printed the matched credential into the CI log, in exactly the scenario the guard exists for. | Maps to the same shape string assertion `C` uses. |
| M4 | **NH-4 falsely claimed `eas submit --platform android` now "fails immediately".** A reviewer traced eas-cli's actual resolver: the *old* placeholder only warned and prompted, and with no key path at all eas-cli resolves via its credentials service off `app.json` → `android.package` and goes **interactive**. Neither state was a hard stop. | Claim **withdrawn**. Only what is repo-verifiable is asserted; the resolver detail is attributed to the reviewer, since eas-cli was not available here to re-verify. |
| M5 | **NH-6 claimed slug/scheme were "pinned by `appConfig.guard.test.ts`".** That file contained **zero** slug/scheme/owner assertions and no test anywhere asserted `expo.scheme`. **The claim was false when written.** | Made true: a new `describe()` pins `slug`, `scheme`, EAS `projectId`, both platform identifiers, and asserts `expo.owner` is **absent** — so filling it in on a guess now fails a test rather than a build. |
| M6 | The guard had **no format-based detectors at all**, making the tree-resident guard strictly *weaker* than `.husky/pre-commit` on exactly the class it exists for (something committed with `--no-verify` or predating the hook). | **Detector 4** added: service_role JWTs, `sb_secret_` keys, AWS access-key IDs, PEM private-key headers. New test `B3`. |

Also fixed from their MINOR/NOTE list: the android reachability guard scanned **1 of 6 workflow
files** and missed the `-p android` short flag (now scans all six, pins the count); the "no android
submit configuration" assertion was vacuous if `submit` were deleted wholesale; the docblock above
`ALLOWED` still read "Empty by design" directly above the entry I had just added; the allowlist
rationale said the webhook trigger "was dropped live" when `schema.sql` still creates it over a
Vault-reading body; and `.husky/pre-commit`'s formatter shaped the whole grep-prefixed diff line
while claiming to mirror `shapeOf()`.

One further correction adopted: the live-database claims underpinning "no rotation required" cannot
be confirmed from a read-only checkout, so `CREDENTIAL_HISTORY.md` now marks them explicitly as
**owner-attested from PHASE-00** rather than verified here, and cites the repo-side corroboration
(`schema.sql` uses Vault indirection with no literal) that *can* be checked.

**Net effect of the review round:** the guard went from *claiming* to cover the non-login secret
class to *actually* covering it, one real CI-log disclosure path was closed, and two false
statements were removed from documents whose entire purpose is to be the honest record.

### A verification pass on the fixes — and a third round

The fix commit was itself put through an independent verification pass, which returned
**`ALL_CLOSED` (8/8)** — and did the work to earn it: it re-derived both ref censuses from scratch
(**71/33** and **226/48**, matching exactly), re-ran the old and new regexes side by side to confirm
the boundary bug was real and the fix caused the change, re-swept the tree for false positives, and
**proved test non-vacuity by mutation** — drifting `slug`, `scheme`, `projectId`, both identifiers,
`name` and `owner` in turn and confirming each throws.

It also found **six residuals**, and the substantive ones were fixed in a third commit (`5fabe8ed`):

| Residual | Fix |
|---|---|
| **A self-contradiction I created.** NH-4 formally withdrew the "fails immediately" claim — but that claim survived *verbatim* in the comment of the very test file the doc names as its pin. A reader following the doc's own pointer landed on the withdrawn statement, presented as rationale. | Comment corrected to state only what the tests actually guarantee. |
| **A second echo path, same class as M3.** Assertion `E` used `toMatch` on the **raw text of both carrier files**; a `toMatch` failure echoes the entire received string. Proven empirically: a 3,327-char file produced a 3,426-char failure message containing the whole file. | Both assert on a boolean plus a filename. |
| **Label gaps the hook already covered** — `secret_key`, `SECRET_KEY`, `secretKey`, `access_key`, `ACCESS_KEY_ID`, `bearer`. `.husky/pre-commit` lists `secret_key` explicitly, so the residence guard was *still* weaker than the arrival gate on exactly the asymmetry my own rationale had complained about. | Added and pinned. A bare `token` label was measured (**49 findings, all false positives**) and rejected — and that exclusion is now itself a test, so nobody adds it later. |
| **The android tripwire had holes**: it knew only `--platform android`, so `eas build -p all --auto-submit-with-profile=production` — which *would* submit Android — passed both assertions. | Now matches `android\|all`, `-pandroid`, quoted values, any case; submit pattern catches `eas-cli submit`. |
| **Detector 4 suppressed whole lines** on any placeholder marker, hiding a real unlabelled credential that merely shared a line with `TODO` or `example.com`. | Tests the match, not the line — as Detector 3 already did. |
| Four plaintext files holding recovered dead credential values, left in the shared scratchpad by review subagents. | Shredded. Outside git and outside both gates' reach, so worth stating rather than leaving. |

**Two limits are stated rather than papered over:** the guard still cannot see a credential in
prose, and the android tripwire is defence in depth — what actually holds is `eas.json` declaring no
android submit block, plus the fact that no script or workflow can reach one.

TASK 00B therefore took **three commits** — `2e29913e` (work), `44818f78` (six MAJOR findings),
`5fabe8ed` (verification residuals) — ending at tree `f5c62d40`. Each round was driven by evidence
from an independent reviewer, not by my own re-reading.

---

## 13. Phase gate

```
SOURCE_CONVERGENCE_GATE: PASS
```

Issued against §18 of the phase prompt. Every required criterion is satisfied:
TASK 01, TASK 00B and TASK INT complete and independently accepted; FDA-001 closure proof delivered;
both histories and the OpenFreeMap lineage preserved; all five main-only release-control commits
preserved and *executing* green; Build 33 preserve checks pass; no existing worktree modified; fresh
current truth recorded; every required gate either run or explicitly classified below; exact final
SHA/tree and rollback references recorded; the implementation model is not the sole acceptor;
`MAIN_MERGE_AUTHORIZED` remains **NO**; and the Build 33 App Store review is untouched.

### Gates NOT run, or run and not green — declared, never disguised as PASS

| Gate | State | Blocking? |
|---|---|---|
| `npm run format:check` | **FAIL** — 263 files, byte-identical count at the baseline | No — pre-existing, unrelated to convergence |
| `npx expo-doctor` | **FAIL** — 16/18, identical two failures at the baseline (`privacyPolicyUrl` schema; 4 out-of-date packages) | No — pre-existing |
| Full Jest suite | **20 suites red**, exactly the inherited set minus one | No for *this phase* — **yes for a future `main` merge** (§8) |
| `release:verify --remote` live production-branch check | **SKIPPED** — network check off by default | No — a local substitute ref check passed |
| Live web identity | **RECORDED, not re-verified** — `legacy-triangulated` receipt; no release-meta endpoint exists for Build 33 | No |
| iOS build / TestFlight / App Store verification | **NOT RUN** — outside phase authority | No |
| Fresh-device reviewer sign-in evidence | **NOT RUN** — deferred release evidence from PHASE-00 | No |
| Steve / Rory human acceptance | **NOT OBTAINED** — automated independent review only | No — carried forward |

Nothing above is being reported as a pass. The two `FAIL` rows and the red suite count are
reproduced identically at the unmodified baseline, which is what makes them pre-existing rather
than regressions.
