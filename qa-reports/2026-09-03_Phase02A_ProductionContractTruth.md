# PHASE-02A — Production migration ledger and contract-manifest reconstruction

| | |
|---|---|
| **Prompt code** | `FLAGSTONE REPAIR PROMPT 02A` |
| **Findings owned** | FDA-027 (discovery), foundation for FDA-005 |
| **Start SHA / tree** | `5a64c9174ae5d9d5a94ed543bc4663216df67e7f` / `edaa68182add5b9a41123f6864c7774f5969e03f` |
| **End SHA / tree** | `bbe51e2fd1150379050ce022cf5603e1eada6295` / `fda0a26b644218883f1d16c7b52483cece460b40` (rev 2, after independent review) |
| **Branch** | `repair/flagstone-p02-contract-truth-20260903` |
| **Worktree** | `/Users/skypie/AccessMap-worktrees/flagstone-p02-contract-truth-20260903` (clean) |
| **Production change** | **NONE** |
| **MAIN_MERGE_AUTHORIZED** | **NO** |

---

## 1. Source identity preflight

Ran before anything was created. Every locked identity matched exactly, including trees.

| Subject | Expected | Observed | Verdict |
|---|---|---|---|
| `origin/main` | `70b52a30` / `847f39f6` | identical | MATCH |
| Build 33 | `f5594171` / `a4a5e70c` | identical | MATCH |
| Divergence | `a0bf4d04` | identical; B33 +113, main +5 | MATCH |
| Web descendant | `ebf091c` / `6cb842e3` | identical, 2-commit descendant of B33 | MATCH |
| Audit branch | `ea610fe` / `0924c5a0` | identical | MATCH |
| Phase 01 base | `5a64c917`, integration `045d6d39` an ancestor | confirmed | MATCH |

`SOURCE_IDENTITY_PASS: YES`

**One deviation from the prompt, taken deliberately.** Prompt 02A's boilerplate says to stop on a
path collision. The Phase 01 branch and worktree already existed. They are not a collision — they
are this phase's declared precondition, independently reverified above, and the owner directed that
they be treated as satisfied rather than recreated. Nothing in the Phase 01 worktree was touched;
its cleanliness was re-checked at start and end.

Path safety for the new worktree was proven before creation: neither
`/Users/skypie/AccessMap-worktrees/flagstone-p02-contract-truth-20260903` nor the branch existed.
Worktree count 38 → 39; no existing worktree was reused, cleaned, reset, stashed, pruned or moved.

---

## 2. Production capture — read-only, captured twice

| | Capture 1 | Capture 2 |
|---|---|---|
| Time (UTC) | 2026-09-04 06:01:12 | 2026-09-04 06:26:49 |
| Object count | 323 | 323 |
| Fingerprint | `2ac50a3fe61c949c2b5e66ef9daa7952` | `2ac50a3fe61c949c2b5e66ef9daa7952` |
| Applied migrations | 71 | 71 |

**Zero drift across 25 minutes.** Fingerprint spans columns, function bodies, policy predicates,
triggers and ledger rows. Project `kldlwszpfkdmsjrjhjym`, Postgres 17.6.1.121, us-west-2,
ACTIVE_HEALTHY.

Every statement issued was a `SELECT` against catalog views. No `db push`, no `apply_migration`, no
DDL, no DML, no Edge deploy, no Auth/Storage/Vault change, no link mutation.

---

## 3. Migration crosswalk — FDA-027

`supabase/contract/migration-crosswalk.v1.json`, regenerable via `npm run contract:check`.

| Measure | Value |
|---|---|
| Applied in production ledger | **71** |
| Managed repo files | **77** |
| Applied **with** an exact source file + sha256 | **71 (100%)** |
| Applied **without** source (live-only) | **0** |
| Unapplied, backdated before ledger head | **6** |
| Unapplied, forward of head | **0** |
| Ledger-name vs repo-slug drift | **8** |

### What FDA-027 actually is

The audit recorded "repository migrations do not reproduce production". The crosswalk sharpens that
to something more actionable and less alarming:

- **Version-level lineage is complete.** Every one of the 71 applied versions has a same-version
  file. There is no unmapped authorization-critical object and no applied version whose source is
  missing — so the Phase 02 stop condition did not trigger.
- **The real defect is ordering.** All 6 unapplied files are timestamped *before* the ledger head
  `20260830130000`:

  | Version | File | Why it is unapplied |
  |---|---|---|
  | `20260818211920` | `reconcile_oob_grant_select_is_admin_for_replay_20260829` | reconciliation file, never run |
  | `20260828040000` | `mod1_moderation_release_safety` | MOD1 — design input only |
  | `20260828050000` | `mod1_admin_report_queue` | MOD1 — would create the FDA-004 columns |
  | `20260828060000` | `mod1r_fix1_report_and_insert_authz` | MOD1R |
  | `20260828070000` | `mod1r_fix1_pending_close_state` | MOD1R |
  | `20260828080000` | `mod1r_fix2_action_intent` | MOD1R |

  `supabase db push` resolves pending work by version order. Six files sorting behind the head is a
  live hazard: they apply out of sequence relative to the migration that is already the head. This
  is the concrete mechanism behind FDA-027, and it is now guarded (§6).

- **The 8 name drifts are cosmetic.** The version is the identity; the name column is descriptive
  and was recorded at apply time before later renames. Examples: ledger
  `2026-05-25_flag_edit_rls` vs repo slug `flag_edit_rls`; ledger
  `2026_05_23_status_update_trigger_proposal` vs repo `status_update_trigger_applied`. Recorded, not
  repaired — renaming an applied file is forbidden.

### `supabase/nonmanaged/` now has a provenance record

New `supabase/nonmanaged/PROVENANCE.md` classifies all 33 files across the 5 areas and holds two
claims strictly apart: **live in hosted catalog** vs **recorded applied in the ledger**.

**D1S-A reconfirmed object-by-object** — 6 of 6 groups live, still unrecorded in the ledger:

| Claimed effect | Live catalog | Verdict |
|---|---|---|
| RLS on all 7 `bk_2026_08_22_*` | `relrowsecurity = true` ×7 | CONFIRMED |
| privileges revoked from public/anon/authenticated ×7 | zero grants ×7 | CONFIRMED |
| `flag-photos auth upload` uid-folder predicate | policy live, predicate matches | CONFIRMED |
| `flag-photos owner delete` uid-folder predicate | policy live, predicate matches | CONFIRMED |
| `flag_photos: authenticated insert` ownership | policy live | CONFIRMED |
| `increment_*_request` EXECUTE revoked from anon/public | grantees `authenticated, service_role, postgres` | CONFIRMED |

---

## 4. Deployed-contract manifest and the four shipped mismatches

`supabase/contract/deployed-contract.v1.json` + `client-expectations.v1.json`.

Each mismatch was reproduced **read-only**, by asking the catalog directly rather than trusting a
receipt. `to_regprocedure` was checked at the exact signature *and* `pg_proc` was counted at **any**
signature, so "absent" means genuinely absent, not a signature mismatch.

| Finding | Client expects | Production has | Behaviour when absent |
|---|---|---|---|
| **FDA-019** | `prepare_flag_photo_upload`, `commit_flag_photo_upload`, `cancel_flag_photo_upload`, `commit_avatar_photo_upload` | **0 photo-upload functions at any signature** | **split** — **flag** photo upload is hard-broken; **avatar** upload recovers via a legacy fallback and works (see §13) |
| **FDA-002** | Edge `delete-flag` | not deployed (3 functions live) | **hard** — `deleteFlag` throws for owner *and* admin |
| **FDA-003** | Edge `account-deletion-status` | not deployed; `delete-account` **v4 live** | **hard** — status poll throws after a successful deletion |
| **FDA-004** | `feedback.moderation_reviewed_at / _resolution / _action_intent` | **0 moderation columns** | **hard** — `listOpenReports` throws 42703 |

**Prompt B is genuinely half-deployed**, exactly as the plan assumed: the read-side columns
`flags.photo_object_key`, `flag_photos.object_key`, `users.avatar_object_key` are all present, while
every write-intent RPC is absent.

### Two things the audit's 45 findings did not record

1. **`list_monthly_leaderboard` is absent but *correct*.** `listMonthlyLeaderboard()` detects the
   missing function via `isFunctionMissing` and returns `[]`. This is not a defect — it is the
   reference pattern the FDA-004 repair should copy. Consequence to record: the monthly leaderboard
   is permanently empty in production until `2026-06-18_monthly_leaderboard_rpc_PROPOSED.sql` is
   applied. Deferred, not a blocker.

2. **Five Edge Function sources exist locally; three are deployed.** `supabase/functions/` contains
   `delete-flag`, `account-deletion-status`, `account-deletion-review` and `account-deletion-worker`
   alongside the deployed three. Source presence is not deployment — this is precisely the
   confusion FDA-005 exists to prevent.

### FDA-002's repair path is confirmed available

The plan chose "restore strict direct Data API delete" over deploying `delete-flag`. The catalog
supports that: `flags delete own`, `admin delete any flag`, `flag-photos owner delete` and
`flag-photos admin delete` are all live. Likewise FDA-019's fallback: the storage policy
`flag-photos auth upload` (uid-folder INSERT) is live and authorized. Both Phase 04 choices rest on
verified deployed authorization, not assumption — and for FDA-019 the fallback is not hypothetical:
`uploadAvatar` already implements exactly it, in production, today (§13).

### Other findings reconfirmed live (no action this phase)

FDA-009 `flags_user_scoped` ALL/PUBLIC policy still present · FDA-010 six trigger functions retain
PUBLIC/anon EXECUTE · FDA-012 TRUNCATE granted broadly to anon/authenticated · FDA-020 `flags status
update by any authenticated` has no moderator gate · FDA-042 `flags readable by anon USING (true)`
exposes `user_id` with exact coordinates. `verify_webhook_secret` EXECUTE is **not** granted to
anon/PUBLIC — SR018's revoke held.

---

## 5. NEW — carried to Phase 05: account deletion cannot reach the backup tables

Discovered by the crosswalk, not present in the audit's 45 findings.

The 7 `bk_2026_08_22_*` tables have **zero foreign keys** to `public.users`, `auth.users` or
`public.flags`. `ON DELETE CASCADE` therefore never reaches them, and `delete-account` v4 does not
name them. They currently hold:

| Table | Rows | Distinct user_ids |
|---|---|---|
| `bk_2026_08_22_flags` | 15 | 3 |
| `bk_2026_08_22_flag_status_history` | 23 | 3 |
| `bk_2026_08_22_point_links` | 25 | — |
| `bk_2026_08_22_flag_photos` | 2 | — |
| `bk_2026_08_22_flag_comments` | 1 | 1 |
| **Total** | **66** | **3 of 5 live accounts** |

Deleting an account leaves identifiable reporter ids, comment text and photo URLs in place. They are
**contained** (RLS on, zero policies, zero anon/authenticated grants, unreachable through PostgREST
— D1S-A did its job) but they are **not erasable by any current code path**.

This extends **FDA-024** with a concrete mechanism and makes the FDA-030 policy-truth question
sharper. No change is proposed here: the disposition is a privacy decision. **Owner: Jordan, Phase
05.**

---

## 6. Eight dead guards restored — and why they were invisible

Build 33 reorganised `supabase/` into the layout Supabase actually applies. Eight suites went on
reading pre-reorganisation paths. **They did not fail loudly — they died at module load**, so every
summary counted them as suites while they asserted nothing at all.

| Suite | Was reading | Now reads | Assertions restored |
|---|---|---|---|
| `pointsSqlParity.test.ts` | `migrations/2026-05-30_trust_score_system.sql` | resolved by **slug** | 10 |
| `d1OptionAAccountDeletion.guard` | `migrations/2026-08-27_d1_option_a_…` | `nonmanaged/proposed/` | 63 |
| `d1f4AsyncAccountDeletion.guard` | `migrations/2026-08-27_d1f4_async_…` | `nonmanaged/proposed/` | ↴ |
| `d1f4r3Fix2ReviewReplay` | `migrations/20260828020000_…` | `nonmanaged/proposed/` | ↴ |
| `d1f4r3Fix3ReviewAudit` | `migrations/20260828030000_…` | `nonmanaged/proposed/` | ↴ |
| `d1f4r3SourceClosure.guard` | `migrations/20260828010000_…` | `nonmanaged/proposed/` | 42 across these 4 |
| `commentAuthor.test.ts` | `migrations/2026-07-27_drift_capture_…` | `nonmanaged/rollback-recovery/` | ↴ |
| `qaMergeConsolidation.test.ts` | `migrations/2026-06-01_perf_fk_…` | applied slug + manual record | 21 across these 2 |

`pointsSqlParity` is the one that matters most: it is the *only* thing pinning the app's nine point
values to the SQL that pays them, and it had been asserting nothing for the entire period it was
supposed to be doing that job. It now resolves by slug, so the next renumber moves the file without
disarming the guard.

### A stale content pin that could not report itself

Four suites pinned the D1S-A file at sha256 `d131d769…`. Actual content: `4caeebb5…`.

Rather than update the pin to go green, the divergence was traced: `d131d769` is the blob at
`c74fbd6`; commit `932388b` superseded it with the migration-history truth repair. The pin was
correct when written and was overtaken — and could not say so, because the suite was already dead.

Before advancing it, the change was proven to be documentation-only: stripping comments and blank
lines from both versions leaves **134 statement lines that are byte-identical**. The pin is advanced
to `4caeebb5` with that supersession recorded inline.

One assertion was rewritten rather than repointed. `d1OptionAAccountDeletion` asserted the D1S-A file
is byte-identical to its blob at approved base `ed37860` — which froze the file's *comments* as well
as its SQL and would have forbidden that legitimate correction. It now compares **executable
statements only**, preserving the real invariant (D1 Option A leaves D1S-A's effects untouched) while
permitting a documentation fix. One `git show <sha>:<path>` read was deliberately left on the
*historical* path, because the file genuinely was there in that commit.

### Two new gates

**`src/__tests__/migrationLineage.guard.test.ts`** (9 tests) — filename shape; no duplicate versions;
**every applied file immutable by sha256**; every applied version has exactly one source; **no NEW
backdated migration** (the 6 known are allowlisted, a 7th fails); destructive-data never in the
managed lineage; nonmanaged areas documented; and a meta-guard that fails when any test reads
migration SQL from a directory that does not hold it — the exact regression that disarmed the eight.
That meta-guard found 4 further stale references on its first run, including two in suites that were
otherwise passing.

**`src/__tests__/contractManifest.guard.test.ts`** (12 tests) — seeds the FDA-005 gate. It reproduces
all four mismatches from the manifests alone, and fails if the client gains a call to a contract
production does not deploy unless that call is declared **with its failure mode**. It does not
contact production and does not pretend to: the live half of the gate is Phase 06A's.

---

## 7. Tests and exit codes

| Command | Result | Note |
|---|---|---|
| `npx tsc --noEmit` | **exit 0** | clean |
| `npx eslint src --ext .ts,.tsx` | **0 errors**, 91 warnings | warnings are the inherited baseline |
| `npx prettier --check` (3 new files) | **PASS** | |
| `npm run contract:check` | **PASS** — crosswalk reproducible from the tree | |
| `npx jest` (full) | **12 failed / 271 passed** suites; **14 failed / 4146 passed** tests | see below |

### Jest baseline reconciliation

| | Suites red | Tests passing |
|---|---|---|
| Phase 01 inherited baseline (re-measured here) | **20** | 4005 |
| After Phase 02A (rev 2) | **12** | **4146** |

**8 suites recovered, +138 assertions now genuinely executing.** No suite regressed.

### Gates NOT run, or run and not green — declared, never disguised as PASS

| Gate | State | Blocking? |
|---|---|---|
| `npm run format:check` (repo-wide) | **FAIL** — inherited; 7 of the files touched here were already format-dirty at the Phase 01 base, verified by checking their blobs at `5a64c917` | No — pre-existing, FDA-018 owns it |
| 12 remaining red suites | **RED** — all UI/visual/copy guards (`dismissalStandard`, `focusOnOpen`, `hitTargetFrame`, `keyboardClass`, `privacy.guard`, `visualFreezeFixWave`, `TasksScreenFlagCard`, `Wave2ScreenGeometry`, `bp11PressVocabGuards`, `bp3TrustEngineGuards`, `mapChromeBudget`, `tasksHeaderReclaim`) | No for this phase — **yes for a future `main` merge**; owned by Phases 06B/08/09 |
| Disposable-database replay from zero | **NOT RUN** — needs a disposable Postgres; belongs to Prompt 02B | No |
| `supabase db diff` against staging | **NOT RUN** — no authorized staging environment exists | No |
| pgTAP discovery/run in CI | **NOT RUN** — FDA-015, owned by Phase 06A | No |
| Live contract re-capture as a release gate | **NOT BUILT** — FDA-005's live half is Phase 06A | No |
| `npx expo-doctor` | **NOT RUN** — unchanged by this phase, inherited 16/18 at baseline | No |

Nothing above is reported as a pass.

---

## 8. Negative tests

| Invariant | Result |
|---|---|
| No `supabase db push`, `apply_migration`, migration repair or link mutation | **PASS** — only catalog `SELECT`s issued |
| No production write, Edge deploy, Auth/Storage/Vault change | **PASS** |
| No applied migration file edited, renamed or replayed | **PASS** — all 71 hashes re-verified against the tree |
| No historical file deleted | **PASS** — additive commit plus one intra-test-dir move |
| No receipt treated as deployment proof | **PASS** — D1S-A credited only after object-by-object catalog reconfirmation |
| No unknown object assigned to the closest-looking migration | **PASS** — `bk_*` tables recorded as out-of-band with their own provenance, not attributed to a migration |
| No `ours`/`theirs` wholesale migration resolution | **PASS** — no merge performed |
| No existing worktree reused, cleaned, reset or pruned | **PASS** — 38 → 39, Phase 01 worktree clean at start and end |
| No credential or personal data in artifacts | **PASS** — manifests carry object names and shapes only; no row data beyond aggregate counts |
| Guards made to pass by weakening them | **NOT DONE** — the one stale pin was advanced only after proving statement-level identity, and one assertion was deliberately narrowed with its reasoning recorded |

---

## 9. Rollback

Every artifact is inert. Rollback is `git revert f393cbce` or abandoning the branch; production is
untouched, so there is nothing to restore.

| Artifact | sha256 |
|---|---|
| `supabase/contract/deployed-contract.v1.json` | see `git show f393cbce` |
| `supabase/contract/client-expectations.v1.json` | ” |
| `supabase/contract/migration-crosswalk.v1.json` | reproducible: `npm run contract:crosswalk` |

**Rollback rehearsed:** not required — this phase touches no staging or production surface. The
crosswalk's reproducibility was rehearsed instead (`--check` passes against the committed file),
which is the stronger property for a generated artifact.

---

## 10. Deferred

| Item | Owner | Trigger |
|---|---|---|
| Backup tables unreachable by deletion (extends FDA-024) | Jordan | Phase 05 privacy decision |
| 6 backdated unapplied migrations — normalize forward | Dana | Prompt 02B |
| Monthly leaderboard permanently empty in production | Quinn / Sky | product call, not a defect |
| 8 ledger-name drifts | — | none; recorded, renaming is forbidden |
| 12 remaining red UI suites | Gary | Phases 06B / 08 / 09 |
| Live contract re-capture gate (FDA-005 live half) | Rory | Phase 06A |
| Disposable replay + pgTAP in CI | Gary / Dana | Prompt 02B, Phase 06A |
| Repo-wide `format:check` | Gary | Phase 06B (FDA-018) |

## 11. Evidence gaps

- **No staging environment exists**, so "the repository reproduces production" is proven at the
  level of version+hash crosswalk, not by an executed replay with an empty `db diff`. Prompt 02B
  owns closing that, and until it does, FDA-027 is *characterized*, not closed.
- The catalog capture is a point-in-time read. It was taken twice with an identical fingerprint,
  but it is not a continuous guarantee — hence the Phase 06A live-recapture gate.
- Row counts for the backup tables are aggregates only; no row content was read.

---

## 13. Independent acceptance

Two acceptors were run, each briefed to **falsify** the implementer's claims rather than confirm
them, both read-only. The implementation model was not the sole acceptor.

### Acceptor A — database lineage (Dana role): **ACCEPT**

Recomputed every crosswalk number independently and re-hashed **all 71** applied files rather than
the 12 sampled: 71/71 match, byte counts included. Confirmed the ordering hazard, the PROVENANCE
file counts, and — by reading `2026-08-22_takedown_junk_flags_APPLIED.sql` directly — that its
STEP 2 is what created the seven `bk_2026_08_22_*` tables. Confirmed 21 tests genuinely executed
(not the 0-test false pass the repo's own worktree gotcha warns about).

It also proved the guards non-vacuous empirically, by replicating their logic against synthetic
violations — and found **five weaknesses**. All five are now closed:

| # | Weakness | Disposition |
|---|---|---|
| **W1** (HIGH) | The path guard's exemption was `/git\|show\|APPROVED_BASE/` **unanchored against the whole line** — a comment reading `// 14-digit version` disarmed it, because "digit" contains "git". Four bypasses demonstrated. | **FIXED.** Tightened to require `APPROVED_BASE`, a quoted `'show'`, or a literal `git show`. All four demonstrated bypasses now caught; the single legitimate exemption in `src/` still works. Verified case-by-case. |
| **W2** (MED) | "Byte for byte" immutability was **self-certifying**: the hash lives in the crosswalk, which regenerates from the same mutable file. Editing an applied migration and running `npm run contract:crosswalk` laundered the change past both `--check` and the hash test. | **FIXED.** New test pins all 71 applied files to their blobs in the **immutable Build 33 commit** `f5594171` — an external reference regeneration cannot touch. Reproduced the exact laundering attack: the new test fails and names `20260602060359`. |
| **W3** (MED) | Nothing compared the crosswalk to the committed evidence capture, so a *self-consistent* ledger forgery passed `--check`. | **FIXED.** New test asserts the crosswalk ledger ≡ `evidence/applied-versions.txt` on both version set and names. |
| **W4** (LOW) | The scan walked only `src/`, missing root `__tests__` and `scripts/__tests__`; the filter skipped `.test.js/.mjs`. | **FIXED.** Walks `src`, `__tests__`, `scripts`; filter widened. No offenders existed — closed while empty. |
| **W5** (LOW) | `contract:check` ran in neither CI nor the pre-commit hook. | **FIXED.** Wired into the CI test job, with `fetch-depth: 0` added so W2's Build 33 pin is real in CI rather than degrading to "cannot verify". |

Acceptor A's two housekeeping notes are both resolved: the receipt was untracked (now committed),
and the 8 repointed suites plus the new helper were outside its scope (covered by Acceptor B and by
the full-suite reconciliation in §7).

### Acceptor B — client contract (Steve role): **HOLD**

**The HOLD was correct and is the most valuable result of this phase.** Rev 1 of
`client-expectations.v1.json` was accurate at *name* granularity and wrong at *call-site*
granularity. Every claim was independently re-verified by the implementer before acting.

| Defect in rev 1 | Verified | Correction |
|---|---|---|
| **`src/lib/users.ts:100` classified `hard`** | Lines 107–110 detect `isFunctionMissing`, set `useLegacyOwnerPath`, and return a uid-folder key; upload proceeds through the live Storage policy and a direct `users` UPDATE | → **`graceful`**. **Avatar upload works in production today.** |
| `users.ts:133` classified `hard` | The legacy branch returns at line 130 before reaching it | → **`unreachable`** |
| `flags.ts:914` classified `hard` | Sole caller `ReportFlagModal.tsx:793` is `void Promise.all(...).catch(() => undefined)` | → **`swallowed`** |
| `flags.ts:902` classified flatly `hard` | Hard via `photos.ts:73`; via the report path the F57 catch keeps the report filed and says "Report filed. Photos not attached" | → hard **plus** a recorded degrade path |
| `users.ts:144` **omitted entirely** | Third `cancel_flag_photo_upload` call exists | → declared, `swallowed` |
| `increment_reopen_request` attributed to `disputes.ts` | Actually `flags.ts:1410`, and it has an `isFunctionMissing` fallback | → corrected file, line and classification |
| `log_realtime_event` attributed to `src/lib/realtime.ts` | **That file does not exist**; it is `realtimeLog.ts:26` | → corrected |
| Moderation **writes** not recorded at all | Three write sites: `adminReports.ts:239` (`ok:false`), `:275` (**no error check at all**), `:307` (throws) | → all three declared, with `:275` flagged as the hazard |

**The most important correction is the first.** FDA-019 is not one broken surface but two different
ones: flag-photo upload is genuinely hard-broken, while avatar upload already implements the exact
legacy-fallback pattern the plan proposes as the FDA-019 *repair*. Phase 04A should copy a pattern
this codebase already ships rather than design one.

The new hazard at `adminReports.ts:275` — `markPendingResolution` awaits and discards its result, so
against production it writes nothing and reports nothing — is carried to Phase 03B/04A.

Acceptor B's **structural criticism was decisive**: the rev-1 gate compared *name sets*, never
`file:line`, and never columns, and used `.some()` where `.every()` was meant. So a green
`npm test` was not evidence of manifest accuracy. **That is now fixed** — the gate keys on
`file:line`, covers column reads *and* writes, reads its vocabulary from the manifest, and asserts
the flag/avatar split explicitly. Rev 1's defects would all now fail it, which is the only
meaningful test of the correction.

`isFunctionMissing` was independently confirmed correct (42883 / PGRST202 / "could not find the
function"), with one caveat now recorded in the manifest: PGRST202 also fires on a **signature
mismatch**, so a future argument change degrades silently to an empty result rather than erroring.

Zero-write and zero-credential attestations were **CONFIRMED** by Acceptor B: no file under
`supabase/migrations/`, no Edge Function change, no `config.toml`, no DDL/DML in any added line; the
generator imports only `node:` builtins and writes one file inside the repo. The edit to
`noCredentialsInTree.guard.test.ts` was checked specifically — it is a single comment-line path
correction, no detector or threshold touched — and that guard passes 7/7 including its own
non-vacuity test.

### Acceptance verdict

`INDEPENDENT_ACCEPTOR: Acceptor A (lineage) ACCEPT · Acceptor B (contract) HOLD → resolved`

Acceptor B's HOLD was raised against manifest content only — no app code — and every falsified item
has been corrected in rev 2 and is now enforced by a gate that would have caught it. Both acceptors'
findings are closed. **`ACCEPTANCE_VERDICT: PASS (rev 2)`**

---

## 12. Phase gate

```
CONTRACT_TRUTH_GATE: PASS
```

Issued on: all 71 applied versions mapped to exact source with hashes and zero unmapped
authorization-critical objects; the four shipped mismatches reproduced read-only without writes;
production captured twice with an identical fingerprint; zero production change; 8 dead guards
restored with +138 assertions and no suite regressed; two new gates that fail on the regressions
this phase found; independent acceptance obtained (§13); and `MAIN_MERGE_AUTHORIZED` remaining
**NO**.

FDA-027 is **characterized and guarded**, not closed — closure requires Prompt 02B's replay.
FDA-005 has its **foundation**, not its gate — the live half is Phase 06A.

---

## 14. Structured handoff

```text
PROMPT_CODE: FLAGSTONE REPAIR PROMPT 02A
FINDINGS_OWNED: FDA-027 (discovery); foundation for FDA-005
START_SHA: 5a64c9174ae5d9d5a94ed543bc4663216df67e7f
START_TREE: edaa68182add5b9a41123f6864c7774f5969e03f
END_SHA: bbe51e2fd1150379050ce022cf5603e1eada6295
END_TREE: fda0a26b644218883f1d16c7b52483cece460b40
BRANCH: repair/flagstone-p02-contract-truth-20260903
WORKTREE: /Users/skypie/AccessMap-worktrees/flagstone-p02-contract-truth-20260903 (clean)
SOURCE_IDENTITY_PASS: YES — origin/main 70b52a30, Build 33 f5594171/a4a5e70c, base a0bf4d04,
  web ebf091c, audit ea610fe all matched exactly, trees included
PRODUCTION_CHANGE: NONE — catalog SELECTs only; independently attested by Acceptor B
PRODUCTION_IDENTITY: kldlwszpfkdmsjrjhjym · Postgres 17.6.1.121 · us-west-2 · ACTIVE_HEALTHY
  · 71 applied migrations · head 20260830130000
  · fingerprint 2ac50a3fe61c949c2b5e66ef9daa7952 (323 objects, captured twice 25 min apart)
TESTS: tsc 0 · eslint 0 errors/91 inherited warnings · prettier PASS (new files)
  · contract:check PASS · jest 271 passed / 12 failed suites, 4146 passed / 14 failed tests
  (inherited baseline was 20 failed suites / 4005 passed)
NEGATIVE_TESTS: PASS — no apply, no deploy, no push, no merge, no applied-file edit,
  no worktree mutation, no receipt credited as deployment proof; guard non-vacuity proven
  by reproducing the laundering attack and confirming the new pin fails
INDEPENDENT_ACCEPTOR: Acceptor A (DB lineage) ACCEPT with W1-W5, all five now closed;
  Acceptor B (client contract) HOLD, every falsified item corrected in rev 2
ACCEPTANCE_VERDICT: PASS (rev 2)
ROLLBACK_ARTIFACTS: git revert of this commit; crosswalk regenerable via npm run contract:crosswalk
ROLLBACK_REHEARSED: N/A for production (nothing applied); crosswalk reproducibility rehearsed,
  and the applied-file laundering attack rehearsed end-to-end and reverted
DEFERRED: backup-table erasure gap (Phase 05/Jordan) · 6 backdated migrations (Prompt 02B)
  · adminReports.ts:275 silent write (Phase 03B/04A) · monthly leaderboard empty (product)
  · 12 red UI suites (06B/08/09) · live re-capture gate (06A) · replay + pgTAP (02B/06A)
  · repo-wide format:check (06B)
EVIDENCE_GAPS: no staging environment, so FDA-027 is characterized and guarded, not closed by an
  executed replay with an empty db diff; catalog capture is point-in-time; backup-table figures
  are aggregate counts only
DIRTY_STATE_PRESERVED: YES — no existing worktree touched; Phase 01 worktree clean at start and
  end; primary checkout still at 94d86239 on codex/spark-a11y-c2a-infra-20260830; 38 -> 39 worktrees
APP_STORE_REVIEW_PROTECTED: YES — no build, submission, credential or ASC action
MAIN_MERGE_AUTHORIZED: NO
NEXT_REQUIRED_PROMPT: Prompt 02B — canonical forward-only migration source preparation
```

## 15. Handoff to the next phase

**Prompt 02B is next, not Phase 03A.** Phase 03A's dependency is an *accepted Phase 02*, and 02A
delivers only half of it: the crosswalk and manifest exist, but the repository still cannot
*reproduce* production. 02B owns the disposable replay from zero, pgTAP discovery, `schema.sql` as a
generated snapshot with a staleness guard, and normalizing the 6 backdated files forward. Until that
runs, FDA-027 stays characterized rather than closed.

### What 02B inherits

- Ledger head **`20260830130000`**. Every new migration must be **strictly after** it. The lineage
  guard already fails a 7th backdated file.
- 6 backdated unapplied files to normalize forward — the 5 MOD1/MOD1R files carry the FDA-004
  columns, so their renumbering is on Phase 03B's critical path.
- `supabase/nonmanaged/PROVENANCE.md` defines the replay exclusions: **`destructive-data/` must
  never be replayed** (it holds the takedown script that created the backup tables).
- `supabase/contract/*.v1.json` + `npm run contract:check`, now enforced in CI.

### What Phase 03A/04A should know now

- **FDA-002 and FDA-019 repair paths are confirmed deployed and authorized.** For FDA-019, do not
  design the fallback — `uploadAvatar` (`src/lib/users.ts:100-130`) already ships it and works in
  production. Copy that shape into `uploadFlagPhoto`.
- **FDA-004's capability gate has a reference implementation too**: `listMonthlyLeaderboard`.
- **New for 03B/04A:** `adminReports.ts:275` `markPendingResolution` has no error check at all.
  Against production it writes nothing and reports nothing. Fix it when the moderation contract
  lands, or gate it out with the queue.
- **Do not treat `supabase/functions/` as deployed.** Five sources, three deployments.
