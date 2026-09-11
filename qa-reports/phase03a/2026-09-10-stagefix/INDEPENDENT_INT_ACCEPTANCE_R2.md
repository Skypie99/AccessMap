# INDEPENDENT INT ACCEPTANCE — Phase 03A stage-fix integration (R2)

**Verdict: ACCEPT WITH MANDATORY CHANGES**

**MUST-FIX: 2.** Neither impugns the merge's honesty, and neither is a defect the merge
introduced by composition. Both are things that are true of the integrated tree and that
no prior round caught.

| | |
|---|---|
| Acceptor | Independent. Did not perform the integration. |
| Integration worktree | `/Users/skypie/AccessMap-worktrees/flagstone-b33-convergence-20260903` |
| Merge commit | `c9c80aa12713400345732547c88edbc71e113ede` |
| parent1 | `7c43c07e69f74db4d65aa4ea329f419b6c715fb4` (previously accepted INT) |
| parent2 | `38bb76fa6ed1d4795a359f9fd54fd5390e81bb87` (round-5 PASS stage-fix candidate) |
| Branch at HEAD | `integration/flagstone-b33-convergence-20260903` |
| Working tree | clean (`git status --porcelain` empty) |
| Staging / production contact | **NONE.** No command in this acceptance named `ctshxbykuemeqnofqcdh` or `kldlwszpfkdmsjrjhjym`. All database work was the disposable local `flagstone_replay`. |
| Mutations to the repo | none. This file is the only thing written. No commit, push, merge, rebase, reset or amend. |

---

## Headline

The merge is honest and lossless, and the composed tree passes its own proof at full
strength on my own run: **254/254 pgTAP, 0 failures**, all four Phase 03A gate flags true,
`tsc --noEmit` silent, Jest reconciling to the inherited baseline by exact name in both
directions, and `release:verify` **PASS** — the Build 33 release identity survives the
integration intact.

The two MUST-FIX items are:

1. **`db:snapshot:check` was GREEN on parent1 and is RED on the integrated tree.** Cause
   isolated to a single input: `package.json`. Green→red at this boundary, in a gate the
   repo ships. Not listed among the candidate's own gates, so no round checked it.
2. **`qa-reports/phase03a/state.json` — the owner-facing gate bank — is now false about
   the tree it ships in.** It still reads `openMustFixCount: 8`, omits the
   `2026-09-10-stagefix` generation entirely, and states in the present tense that
   `supabase/.temp/linked-project.json` "is tracked in git with ref = the PRODUCTION
   project" — which this very integration made untrue.

---

## Z1 — The merge is honest

**PASS.**

Raw object, read directly rather than through a formatter:

```
tree a3d7fa8bf3d6094c60b2b0f4ef788a44a66d6f49
parent 7c43c07e69f74db4d65aa4ea329f419b6c715fb4
parent 38bb76fa6ed1d4795a359f9fd54fd5390e81bb87
```

- **Exactly two parents, in the stated order.** parent1 is the accepted INT; parent2 is the
  candidate. No third parent, no octopus.
- **Both historical SHAs still resolve** (`git cat-file -t` → `commit` for each) **and both
  are reachable** from the merge (`git merge-base --is-ancestor` succeeds for both).
- **parent1 is not amended, rebased or rewritten.** Its own parents still resolve
  (`5a64c9174ae5d9d5a94ed543bc4663216df67e7f` and `cee5f8e48f436bee9be72abe870b3606b1d40088`),
  its tree is still `11de0eb4cf0cbf718fe17fa8a8cab8defef21af8` — the exact
  `ACCEPTED_INTEGRATION_TREE` recorded in `state.json` at the prior gate — and its author
  timestamp is unchanged at `2026-09-10 02:25:06 -0700`.
- **`5a64c917`, the b33-convergence rollback pointer, is still an ancestor of the merge.**
  The accepted lineage is intact, not re-parented.
- **No squash, no rebase, no force.** parent1 contributes exactly one commit not present in
  parent2 (`git rev-list --count 38bb76fa..7c43c07e` = 1, and that one commit is parent1
  itself); parent2 contributes 31. `git log --graph` shows the expected two-lane topology
  with the stage-fix lane rejoining at `2e4a9a1` and the whole prior INT history — down
  through `2ef51ba PHASE_03A_INT_GATE: PASS` — still on the trunk, unrewritten.
- **The merge tree equals the candidate tree exactly:** `a3d7fa8b…` on both. `git diff
  38bb76fa c9c80aa` is empty — zero lines.

The commit message's own claim ("The previously accepted INT `7c43c07e` is the first parent
and is not amended, rebased or rewritten") is true, and I verified it rather than taking it.

---

## Z2 — Nothing lost or silently changed

**PASS. No clobbering. Nothing in the tree that is in neither parent.**

### The strongest form of the check

I did not rely on the name-status diff alone. I enumerated every path and every blob in all
three trees and asked directly:

| Question | Answer |
|---|---|
| Paths in the merge tree present in **neither** parent | **0** |
| Blobs in the merge tree matching **neither** parent's blob at that path | **0** |

Every byte in the integrated tree came from one of the two declared parents. There is no
smuggled content, no merge-resolution artifact, no hand-edit baked into the merge.

### Accounting for all 49 changes parent1 → merge

`git diff --name-status 7c43c07e c9c80aa` yields 49 entries. All 49 fall into five groups,
and nothing falls outside them:

| Group | Count | Disposition |
|---|---|---|
| `qa-reports/**` (evidence, reports, banks) | 29 | additive evidence + `state.json` update |
| `scripts/**` (2 new tools, 2 new test files, `replay-phase03a.mjs`) | 5 | the STAGE-MF-01/02/06 tooling |
| `supabase/migrations-next/phase03a/**` | 9 | the candidates, Stage B, contract, privileges fixture |
| `src/__tests__/*.guard.test.ts` | 2 | **tests only** — no product source |
| `.gitignore`, `package.json`, `supabase/.temp/**` | 4 | ignore rule, 7 npm scripts, 2 deletions |

The **only deletions** in the entire merge are `supabase/.temp/cli-latest` and
`supabase/.temp/linked-project.json` — the intended STAGE-MF-07 untracking. Nothing else was
removed.

`git diff --name-status 7c43c07e c9c80aa` filtered to paths outside
`qa-reports/ scripts/ supabase/ src/__tests__/ .gitignore package.json` returns **nothing**.
No product source file changed.

### The five named preservation targets

| Target | Required | Measured | |
|---|---|---|---|
| Build 33 app `sourceCommit` | `f5594171e75bc5ec92a87d0392c361601ddedfba` | present in `release/current.json`, and the **blob is byte-identical across parent1, parent2 and the merge** (`60a41f9ce3cae537760a206fc6fedecf3cc38095`) | PASS |
| Build 33 product source | untouched | `src/` differs from parent1 by exactly two **added test files**; `app.json`, `package-lock.json`, `release/`, `supabase/schema.sql` all blob-identical | PASS |
| `supabase/migrations/` | exactly 71, unmodified | **71 files** in all three trees, and the whole directory tree object is identical: `a1a68103897a39dcb2c7f29cf764050da3be9cbb` in parent1, parent2 and the merge. Not "71 files that happen to match" — the same tree object. | PASS |
| OpenFreeMap web basemap | preserved | `release:verify` passes the full web chain on the merged tree: overlay approved, receipt present, deployed SHA `ebf091c2…`, deployment ID `HMszH26wADRRDd1CqH4UkJ8kAugQ`, production branch `release/web-4.1.1-build33-openfreemap` at the expected head. **`RELEASE VERIFY: PASS`.** | PASS |
| `supabase/.temp/` untracked | required | `git ls-tree -r c9c80aa \| grep supabase/\.temp` → **0 matches**. `.gitignore:47` now carries `supabase/.temp/` with the reasoning inline. The `projectTargetSafety.guard.test.ts` invariant passes in-tree. | PASS |

### FDA-028 v4 — all three hashes

Computed fresh from the integrated working tree:

```
8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771  20260909120000_fda028_v4_limiter.sql
eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302  rollback/20260909120000_fda028_v4_limiter.rollback.sql
```

Both match the required values exactly.

`supabase/tests/fda028` tree hash in the merge: `04fec65effb8b347ae4e00dcbc3e7060672fe9cb`.
The same path at the reference commit `21b2bd7a96cd69a8d8fc3ff8756b88a5fe28d912`:
`04fec65effb8b347ae4e00dcbc3e7060672fe9cb`. **Identical.** PASS.

---

## Z3 — Composition actually works

**PASS.** I ran the full proof myself, on the integrated tree, and read the JSON rather than
a summary.

pgTAP source verified before use:
`d4f9c8a4b0bfa6f2e29c751ab4deb79208e43f5935bab1948750b95bad3926b3` — matches the required
hash and the manifest's `localPgTap.generatedSqlSha256`.

The replay's own provenance block proves it ran where it claims:

```json
"source": {
  "sha":    "c9c80aa12713400345732547c88edbc71e113ede",
  "tree":   "a3d7fa8bf3d6094c60b2b0f4ef788a44a66d6f49",
  "branch": "integration/flagstone-b33-convergence-20260903",
  "workingTreeClean": true
}
```

That is the merge commit and the merge tree. This is a measurement of the integrated tree,
not of either parent.

### pgTAP: 254/254, 0 failures

| Suite | Planned | Executed | Failed | Skipped | Todo | Bailout | Parse errors | `passed` |
|---|---|---|---|---|---|---|---|---|
| `promptb_media_key_guards.test.sql` | 25 | 25 | 0 | 0 | 0 | 0 | 0 | true |
| `phase03a-foundation.test.sql` | 113 | 113 | 0 | 0 | 0 | 0 | 0 | true |
| `phase03a-privileges.test.sql` | 79 | 79 | 0 | 0 | 0 | 0 | 0 | true |
| `build33-compat.test.sql` | 37 | 37 | 0 | 0 | 0 | 0 | 0 | true |
| **Total** | **254** | **254** | **0** | **0** | **0** | **0** | **0** | |

Every suite's `planned == executed == plan`, so this is 254 assertions actually run against
a plan of 254 — not a short run reported as green.

### Gate flags

| Flag | Value |
|---|---|
| `restorationExact` | **true** |
| `reapplyDeterministic` | **true** |
| `privilegeProofPassed` | **true** |
| `localProofPassed` | **true** |
| `status` | `LOCAL_CANDIDATE_PROOF_PASS` |

All four true. Note the hosted `09c42928` vs `c70e119a` round-trip divergence still does not
reproduce locally — consistent with the candidate's own narrowing, and unchanged by the
integration.

Safety block from the same run: `tcpDisabled: true`, `inheritedPgEnvironment: false`,
`productionInputsAccepted: false`, `globalPostgresUnchanged: true`, `tempDestroyed: true`.

`phaseGate` reads `BLOCKED`. That is **not** a finding: `scripts/replay-phase03a.mjs:158`
assigns `result.phaseGate = 'BLOCKED'` unconditionally, by design. I checked the source
rather than reading the value as a regression.

### Typecheck

`npx tsc --noEmit` → exit 0, **zero lines of output**.

### Jest — reconciled by exact name, in both directions

```
Test Suites: 12 failed, 277 passed, 289 total
Tests:       14 failed, 32 todo, 4272 passed, 4318 total
```

Counts match the inherited baseline exactly: **14 failures, 32 todo**, 12 failing suites.

I extracted the 14 failure names from **my own run's output**, then compared them against the
independently banked baseline list in `2026-09-09-gab4/full-jest-failure-names.txt` and the
list in `INDEPENDENT_STAGEFIX_CODE_REVIEW_R5.md`:

1. `BP11 / T3 — tab bar: haptic-only + forwards a11y (source contract) › fires the haptic, forwards every injected prop, adds no visual dim`
2. `Explore close targets › MapScreen heat notice close controls are real 44pt targets`
3. `FV-1 — focused fields stay in their owning scroller › Address Search scrolls the full body, including its focused input`
4. `T8 — one spoken voice (source contract) › each triage action names its flag (category + conditional distance)`
5. `THE KEYBOARD CLASS — every input-hosting surface carries a mechanism › Recipe D — every delegate is a real, live consumer (the list drains)`
6. `TaskCard — T8: each action names its flag › with a location, the label carries category THEN distance`
7. `TaskCard — T8: each action names its flag › with no location, action labels are category-only (no distance)`
8. `Wave 2 — expanded modal adoption › keeps Flag Detail hand-built and gives it expanded safe-area geometry`
9. `focus-in standard — every dismissable moves the SR cursor in on open › every ALLOWED entry still matches exactly one live surface`
10. `map-chrome budget — the ONE persistent command bar › (c) chromeBandPx is the bar height alone, and the bar hugs safe-area + 8`
11. `the control now lives in the ⋯ tool sheet › VoiceOver order: search, then the circles, then the sheet rows`
12. `the dismissal standard › C · every surface is still reduced-motion gated`
13. `the dismissal standard › J · focus return is wired end to end, and nothing else claims onDismiss`
14. `the privacy screen renders Sky's document, verbatim › every policy paragraph is present in PRIVACY_SECTIONS, in order and verbatim`

**Set equality, both directions: nothing in my run that is not in the baseline, nothing in
the baseline that is not in my run.** Zero failures beyond the inherited 14. All fourteen
are UI/accessibility source-contract suites under `src/`; not one is in `scripts/`,
`supabase/`, or any path this integration touches. The 12 failing suite files match too.

All four tools added by this increment pass on the merged tree:
`scripts/__tests__/canonicalMigrationIdentity.test.ts`,
`scripts/__tests__/structuralCatalog.test.ts`,
`src/__tests__/projectTargetSafety.guard.test.ts`,
`src/__tests__/webhookTargetCoupling.guard.test.ts`.

`npm run lint`: **0 errors, 91 warnings** — the project baseline.

---

## Z4 — The Stage A / Stage B split survived integration

**PASS.**

| Requirement | Evidence |
|---|---|
| Cutover migration present | `supabase/migrations-next/phase03a/20260910120000_phase03a_fda026_stage_b_cutover.sql` (3,723 bytes) and its rollback both present in the merged tree |
| Declared `applyStage: "B"` | `candidate-contract.json` — the only entry with `"applyStage": "B"`; the other eight are `"A"` |
| Withheld by the replay | `scripts/replay-phase03a.mjs:67-68` splits `declared` into `candidates` (Stage A) and `withheld` (Stage B); only `candidates` reach `applySqlFile`. Line 63 hard-throws on any candidate whose `applyStage` is neither A nor B, so a new migration cannot slip in unstaged. |
| Withholding actually happened in **my** run | The replay's own `migrations` array: eight entries `applyStage: "A", appliedLocally: true`, and exactly one — the FDA-026 cutover — `applyStage: "B", appliedLocally: false`, with `withheldReason` recorded. |
| Stage B still hash-verified | Yes. `verified()` runs over **all** declared migrations before the split, so the withheld file's forward and rollback hashes are both checked even though it is never applied. Withheld ≠ unchecked. |

### `build33-compat.test.sql` exercises both halves

`SELECT plan(37)`, and the file is structurally in three parts:

- **Authenticated half** (through line ~100): `users.is_admin` column grant, the
  `users readable by authenticated` policy, `points` / `display_name` / `avatar_url` column
  reads, `list_public_leaderboard(integer)` and `current_user_can_admin()` EXECUTE grants,
  then behaviour **as a real authenticated caller** via
  `SET LOCAL ROLE authenticated` with a JWT sub claim.
- **Guest (anon) half** (lines 102–167): explicitly role-switched with
  `RESET ROLE; SET LOCAL request.jwt.claim.role = 'anon'; SET LOCAL ROLE anon;`. Covers
  `flag_comments` column readability, the `listComments()` users-embed raise (correctly
  labelled **PRE-EXISTING, not caused by Stage A**), `listFlagPhotos()`, the
  `flag_status_history_public` / `flag_edit_history_public` view grants **and** the
  `security_invoker` base-table stop, `point_events`, and that the map still loads for anon.
  The file's own comment names the reason the half exists: a Stage A that broke guests
  "would still have produced a green 242/242 run."
- **Stage B negative control** (lines 169+): applies the cutover **inside the transaction**
  and asserts the breakages flip — `is_admin` grant gone, broad policy gone, the shipped
  `admin.ts` read raising 42501, leaderboard collapsing to the caller, rank reporting 1 for
  everyone, another account's `display_name` disappearing — while
  `list_public_leaderboard()` still returns every user. If these did not flip, the split
  would not be load-bearing and the test would say so.

Both halves ran and both passed in my run (37/37).

---

## Z5 — What the integration broke that the candidate alone did not

This was my highest-priority hunt. I checked for composition failures across six axes:

| Interaction probed | Result |
|---|---|
| Duplicate / conflicting migrations between `supabase/migrations/` (71) and `migrations-next/phase03a/` | `comm -12` on the two basename sets → **empty**. No collisions. |
| Manifest drift — crosswalk vs. managed inventory | `npm run contract:check` → `migration-crosswalk.v1.json is current.` |
| Scripts diverging from what the manifest declares | `npm run db:apply:plan` produces a clean, canonically-ordered 8-candidate Stage A plan whose per-file `sha256` values match `candidate-contract.json` entry for entry. The replay's own `verified()` re-hashes every declared artifact and did not throw. |
| Jest test-name / test-file collisions from merging two test-adding lines | `git ls-files '*.test.ts' '*.test.tsx' '*.test.sql' \| basename \| uniq -d` → **empty**. No duplicate basenames. Jest suite count 289 with no new failures. |
| Release-identity interaction — stage-fix landing on the b33 release line | `release:verify` → **`RELEASE VERIFY: PASS`**. APP IDENTITY PASS, WEB IDENTITY PASS, ancestry PASS, `CURRENT_RELEASE.md` matches manifest. Main convergence still correctly reported DEFERRED, not "broken". |
| A tracked file acting as a project-target selector after composition | 0 tracked files under `supabase/.temp/`; the STAGE-MF-07 guard passes in-tree. The other files naming a project ref are documentation and contract captures present on **both** parents, not selectors. |

**One genuine green→red transition found at this boundary**, documented as MUST-FIX 1
below. It is strictly the candidate's doing rather than the composition's — but this merge
is where it lands on the accepted b33 line, and it is the first time anyone has measured it.

Everything else composed correctly. I could not construct a case where the two individually
correct sides produce a wrong whole.

---

## Z6 — MUST-FIX

### MUST-FIX 1 — `db:snapshot:check` was green on parent1 and is red on the integrated tree

```
$ npm run db:snapshot:check
SCHEMA SNAPSHOT IS STALE:
  - ordered snapshot inputs changed, moved, appeared, or disappeared
```

**This is a real regression across the merge boundary, and I isolated it to one file.**

`scripts/check-schema-snapshot.mjs` builds an 87-entry ordered input manifest and compares
its SHA-256 against the recorded stamp. I recomputed the content hash of all 87 stamp inputs
against each of the three trees, reading blobs straight out of git:

| Tree | Stamp inputs differing |
|---|---|
| parent1 `7c43c07e` (accepted INT) | **NONE** — gate green |
| parent2 `38bb76fa` (candidate) | `package.json` |
| merge `c9c80aa` | `package.json` |

The stamp file `supabase/schema.generated.stamp.json` is blob-identical (`298a5bb2…`) in all
three trees, so the stamp did not move — the inputs did.

**Cause:** the stage-fix added seven npm scripts (`db:apply:plan`, `db:apply:verify`,
`db:apply:command`, `db:catalog:sql`, `db:catalog:capture`, `db:catalog:diff`,
`db:apply:restore`). `package.json` is input #87 in the snapshot provenance manifest.

**Severity — bounded honestly.** The checker reported exactly **one** problem, not four. It
did *not* report `generated snapshot content changed` (so `schema.generated.sql` still
matches its own content hash) and did *not* report `input path/order manifest changed` (so
no input appeared, disappeared or moved). This is **provenance-stamp staleness, not schema
divergence.** Nothing about the database schema is wrong.

It is nonetheless a MUST-FIX because a gate the repo ships went from passing to failing in
the tree being accepted, and no round caught it: `LOCAL_ACCEPTANCE.json` lists `typecheck`,
`contract:check`, `db:rollback:verify`, the rollback rehearsal and `lint` under `otherGates`
— `db:snapshot:check` is absent from that list, which is why five review rounds and the
prior INT all missed it.

**Fix:** run `npm run db:snapshot` (regenerate and rewrite the stamp) and confirm
`npm run db:snapshot:check` returns
`schema.generated.sql is current (87 ordered inputs, stamp v2).` If the stamp is instead
considered deliberately frozen at the accepted CODE identity, then say so explicitly in the
bank — but it cannot simply stay red and unmentioned.

I did not fix it: I am the acceptor, and my instructions are report-only.

### MUST-FIX 2 — `qa-reports/phase03a/state.json` is now false about the tree it ships in

`state.json` is the top-level, owner-facing Phase 03A gate bank — the first artifact an
owner or a resuming agent reads. In the integrated tree it still carries the **pre-fix**
staging state:

| Field | Says | Actually |
|---|---|---|
| `currentGeneration` | `"2026-09-10-stage"` | `2026-09-10-stagefix` exists with five review reports and a disposition matrix |
| `generations[]` | ends at `"2026-09-10-stage"` | omits `2026-09-10-stagefix` entirely |
| `openMustFixCount` | `8` | 5 CLOSED, 3 open **by design as owner decisions** (`EIGHT_FIX_DISPOSITION.json`) |
| `gatesPreserved.STAGE` | `"STEPS_1_TO_14_COMPLETE; ACCEPT_WITH_MANDATORY_CHANGES"` | superseded by round-5 PASS, zero MUST-FIX |
| `stage.COMMITTED_LINK_STATE` | *"FAIL — MUST-FIX. `supabase/.temp/linked-project.json` **is tracked in git** with ref = the PRODUCTION project. **Not fixed here** because it is a tracked non-qa file…"* | **False of this tree.** This integration untracked it. 0 tracked files under `supabase/.temp/`, and `.gitignore` now excludes the directory. |
| `stage.BUILD33_COMPATIBILITY` | `"FAIL — MUST-FIX. Applying this set silently breaks admin … on every shipped Build 33 client"` | Stage A demonstrably does not: `build33-compat.test.sql` 37/37, with Stage B as the negative control proving the split is load-bearing |
| `nextSafeAction` | *"Put the staging authorization packet to Sky and STOP"* | superseded by `STAGING_RERUN_AUTHORIZATION_PACKET.md` |

The `COMMITTED_LINK_STATE` entry is the sharpest: it is written in the present tense, it
describes a **production** project reference sitting in the repo, and this integration is
precisely what made it untrue. An owner reading the bank would believe a production target
selector is still committed. That is an owner-facing artifact that is now false.

**Two points of fairness, which is why I am not treating this as a merge defect:**

1. **The merge did not cause it.** `state.json` is blob-identical to parent2's. Round 5
   passed the candidate carrying this same file. It is inherited, not composed.
2. **The repo's own convention puts the fix exactly here.** `state.json` is written by
   gate-transition commits, not by candidate commits — the previous INT's acceptance did
   exactly this at `2ef51ba "PHASE_03A_INT_GATE: PASS — independent integration
   acceptance"`. The stage-fix author was also aware of it and deliberately deferred:
   `MUST_FIX_INVENTORY.json` names the `openMustFixCount: 8` echo explicitly, and
   `EIGHT_FIX_DISPOSITION.carriedForwardShouldFix` records a policy of not re-touching
   source after a PASS.

So the mandatory change is not a code change. **The commit that banks this INT acceptance
must also bring `state.json` current**: add the `2026-09-10-stagefix` generation, correct
`openMustFixCount` to the 5-closed / 3-owner-decision split, retire or past-tense the
`COMMITTED_LINK_STATE` and `BUILD33_COMPATIBILITY` entries, record
`ACCEPTED_INTEGRATION_SHA` = `c9c80aa1…` / tree `a3d7fa8b…`, and repoint `nextSafeAction`.
Accepting this merge without that update ships a bank that contradicts its own tree.

---

## SHOULD-FIX

1. **Add `db:snapshot:check` to the standing gate list.** Its absence from
   `LOCAL_ACCEPTANCE.json → otherGates` is the reason MUST-FIX 1 survived five review
   rounds, a staging run and a prior INT acceptance. The gate works; nobody was running it.
2. **`canonical-migration-identity.mjs verify` has no local self-test path.** It requires
   `--ledger <file.json>` — real hosted ledger rows — so on this tree it can only be
   exercised via `plan`. Consider committing a small fixture ledger so `verify` has a
   local regression path that does not need staging.
3. **Carry forward the completeness-claim SHOULD-FIX** already recorded in
   `EIGHT_FIX_DISPOSITION.carriedForwardShouldFix` (the surviving `"EXCLUDED: only
   VOLATILE_FIELDS"` / `"Only oid and planner statistics are excluded"` phrasing). I did not
   re-litigate it; round 5 rated it SHOULD-FIX and I concur with deferring rather than
   opening a sixth round.

---

## What I could not verify, and why

| Item | Why not |
|---|---|
| Hosted / staging behaviour of any kind | Hard prohibition. No contact with `ctshxbykuemeqnofqcdh` or `kldlwszpfkdmsjrjhjym`. Every hosted claim in the bank — `HOSTED_PGTAP 217/217`, the role matrix, FDA-028 38/38, the concurrency and IPv6 runs, and the `09c42928` vs `c70e119a` round-trip divergence — is **inherited, not re-verified by me.** |
| `db:apply:verify` against real ledger rows | Requires the hosted ledger. `plan` exercised locally; `verify` could not be. |
| Whether the hosted round-trip divergence is now fixed | Local round trip is exact (`restorationExact` and `reapplyDeterministic` both true), which narrows but does not resolve it. Unchanged by this integration. |
| Production / EAS / web deployment state beyond the manifest | `release:verify` confirms recorded identity and local refs; the live-origin check is `[SKIP]` by default (`--remote` not passed — deliberately, it is a network call). Live identity is `RECORDED (legacy-triangulated receipt)`, not independently re-measured. |
| That parent1's tree was itself correct | Out of scope. I verified parent1 is unrewritten and its content preserved; I did not re-run the prior INT's acceptance. |

---

## Verdict

**ACCEPT WITH MANDATORY CHANGES.**

Z1 PASS · Z2 PASS · Z3 PASS · Z4 PASS · Z5 one green→red transition, no composition defect
· Z6 two MUST-FIX.

The merge is honest: two parents in the declared order, the accepted INT unrewritten and
still reachable, the merge tree byte-identical to the reviewed candidate tree, and not one
path or blob in the tree that came from outside the two parents. Nothing was clobbered —
Build 33 source, `release/current.json`, the 71-file migration tree object, the FDA-028 v4
triple and the OpenFreeMap web chain all survive intact, and `supabase/.temp` is untracked
as intended. The composed tree passes its own proof at full strength on my own run, and
Jest reconciles to the inherited baseline by exact name in both directions with nothing
beyond it.

What stops this being a clean PASS is not the merge. It is two artifacts that describe the
tree inaccurately: a provenance gate that quietly went red because seven npm scripts were
added and nobody was watching that gate, and an owner-facing state bank that still warns
about a committed production target selector this very integration removed. Both are cheap
to correct and neither requires reopening the candidate. Correct them in the commit that
banks this acceptance, and the integration is sound.

---

*No staging or production contact. No push, merge, commit, rebase, reset or amend. No
secret printed. This report is the only file written.*
