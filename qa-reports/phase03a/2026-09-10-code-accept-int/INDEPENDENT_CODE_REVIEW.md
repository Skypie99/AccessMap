# Phase 03A Complete CODE Acceptance — Independent Review

**VERDICT: PASS**

PASS means: complete Phase 03A CODE may be frozen and a local INT may proceed. It authorizes NO
staging, production, push, or merge.

**Hash verification:** All 8 pinned FDA-028 v4 artifact hashes MATCH exactly (`LC_ALL=C shasum -a
256`, checked independently, not copied from any owner file). See §1.

Candidate SHA reviewed: `5edd6455cac5fc5a42cd7e327b7a53f844a75d05` (`git rev-parse HEAD`, tree
`a5ad04f4b16aa3158af0c5ef7f73710278922366`), branch `repair/flagstone-p03a-backend-foundation-20260903`.
FDA-028 V4 reviewed commit/tree: `eec51b6723d04105a7ba31bf2efd2573b95e8902` /
`23f352bec069522efe9a174a4551c2c484b91de2`.

---

## Findings table

| # | Item | Verdict |
|---|------|---------|
| 1 | Exact v4 bytes survived | CONFIRMED |
| 2 | All seven findings represented | CONFIRMED |
| 3 | No scope leakage | CONFIRMED |
| 4 | Migration history forward-only | CONFIRMED |
| 5 | Restoration artifacts correctly classified (8/8) | CONFIRMED |
| 6 | The manifest change | CONFIRMED |
| 7 | Caller dependency safety | CONFIRMED |
| 8 | No new security/regression issue from composition | CONFIRMED (one NOTE) |
| 9 | Reproduce owner's headline gate (217/217) | CONFIRMED |
| 10 | Jest reuse argument | CONFIRMED |
| 11 | Honesty of open items | CONFIRMED |
| 12 | Anything else that should block PASS | NONE FOUND |

No MUST-FIX. No SHOULD-FIX newly introduced by this composition (the three SHOULD-FIX items
already on record — R6-1/2/3 — are pre-existing residuals of the already-accepted v4 review, not
new findings from this review).

---

## Numbered findings

### 1. Exact v4 bytes survived — CONFIRMED

Ran independently:
```
LC_ALL=C shasum -a 256 supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql
  -> 8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771  (MATCH)
LC_ALL=C shasum -a 256 supabase/migrations-next/phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql
  -> eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302  (MATCH)
LC_ALL=C shasum -a 256 supabase/tests/fda028/{acceptance,acceptance2,acceptance3}.sql
  -> all MATCH pinned hashes
LC_ALL=C shasum -a 256 supabase/tests/fda028/{concurrency.sh,devkey.sql,fixture.sql}
  -> all MATCH pinned hashes
```
All 8/8 match exactly.

`git diff eec51b6723d04105a7ba31bf2efd2573b95e8902 HEAD --stat` touches exactly 7 files:
6 new files under `qa-reports/phase03a/2026-09-09-gab4/` and
`qa-reports/phase03a/2026-09-10-code-accept-int/` (bookkeeping), one modified
`qa-reports/phase03a/state.json`, and one modified
`supabase/migrations-next/phase03a/candidate-contract.json`. Zero non-QA files, zero SQL files,
outside candidate-contract.json. Confirmed by direct `git diff` inspection, not by trusting the
owner's stat.

### 2. All seven findings represented — CONFIRMED

Read every migration and cross-checked its actual DDL against (a) the original finding
descriptions in `qa-reports/phase03a/2026-09-04/independent-preflight-reviews.md:62-69` and (b)
`supabase/contract/deployed-contract.v1.json:72-86`, not the owner's mapping table alone.

- **FDA-009** (`20260905055629_phase03a_flag_policies.sql:6`) — `DROP POLICY flags_user_scoped ON
  public.flags`. `deployed-contract.v1.json:77` names this exact policy with the note
  `"FDA-009: legacy overlapping ALL policy still present"`. Genuine match.
- **FDA-023** (`20260905055630_phase03a_open_inserts.sql:6-7`) — adds a `RESTRICTIVE FOR INSERT`
  policy pinning `status = 'open'` for `authenticated`. The finding was "authenticated create omits
  status" and "another permissive policy would not constrain the OR composition" — a RESTRICTIVE
  policy is exactly the correct mechanism (AND, not OR). Genuine match.
- **FDA-021** (`20260905055632_phase03a_profile_updates.sql`) — revokes table-level and
  column-level UPDATE on `public.users` from PUBLIC/anon/authenticated, then grants back only
  `display_name, avatar_url, avatar_object_key`. Matches finding text verbatim: "Remove effective
  table UPDATE before a column allowlist can constrain writes." Genuine match.
- **FDA-010** (`20260905055635_phase03a_trigger_execute.sql:6-11`) — revokes EXECUTE on six named
  trigger functions. The six names are byte-for-byte identical to
  `deployed-contract.v1.json:80-87` `publicExecuteTriggerFunctions`. Genuine match.
- **FDA-012** (two migrations) — `client_privileges.sql` revokes TRUNCATE/REFERENCES/
  TRIGGER/MAINTAIN plus sets default privileges for future postgres-owned objects;
  `effective_privileges.sql` (242 lines) performs the full column-level ACL rewrite across every
  application table including backup tables and service_role. Matches "Table UPDATE and other
  excess grants remain," "future-object grants unresolved," and the candidate-contract's own
  documented limitation that a seventh migration was needed. Honest about the residual it does
  NOT fix (managed `supabase_admin` defaults — explicitly called out as HOLD in the file's own
  comment, not silently claimed done). Genuine match.
- **FDA-026** (`20260905055633_phase03a_contextual_profiles.sql`, 83 lines) — drops the broad
  `"users readable by authenticated"` policy and `SELECT(is_admin)`, replaces it with four
  SECURITY DEFINER→SECURITY INVOKER wrapper RPC pairs
  (`current_user_can_admin`, `list_public_leaderboard`, `get_my_leaderboard_rank`,
  `get_comment_author_profiles`) each gated on an authenticated caller. These four names are
  exactly `candidate-contract.json`'s `clientRpcRequirements`, and `src/lib/admin.ts`,
  `src/lib/flags.ts`, `src/lib/comments.ts`, `src/screens/LeaderboardScreen.tsx` genuinely call
  them (verified by grep, not assumed). Genuine match.
- **FDA-028** — the independently-accepted v4 limiter, byte-identical per §1. Not re-litigated
  (out of scope per the task's own instruction); its architecture already passed 6 independent
  review rounds.

### 3. No scope leakage — CONFIRMED

`grep -n "flags status update by any authenticated\|flags readable by anon\|FDA-020\|FDA-042\|03B\|03C\|Phase04\|phase04"` across every phase03a migration and rollback file: zero hits. Those two
policies are exactly the ones tagged `FDA-020` and `FDA-042` in `deployed-contract.v1.json:75-76`
and neither is touched. Full-phase diff (`git diff c2e36800..HEAD -- src/ App.tsx`) shows only 9
files, all directly attributable to FDA-026's new RPC surface (admin.ts, comments.ts, flags.ts,
LeaderboardScreen.tsx, database.ts, and their test files) — no unrelated UI/feature change, no
App.tsx change.

### 4. Migration history forward-only — CONFIRMED

`ls supabase/migrations/*.sql | wc -l` → 71. `git diff c2e36800b269ee22f29d0be35cfb88dace7c2afc HEAD
-- supabase/migrations/` → empty (zero changes). All 8 new candidates live exclusively under
`supabase/migrations-next/phase03a/`.

### 5. Restoration artifacts correctly classified (8/8) — CONFIRMED

`candidate-contract.json` lists exactly 8 forward/restoration pairs, all `"rollbackMode":
"UNSAFE_BASELINE_RESTORE"`. Read `scripts/replay-migrations.mjs:264-278`: the only two valid modes
are `UNSAFE_BASELINE_RESTORE` (requires `expectedCatalogRestored: true` — i.e. the rollback is
byte-exact and fully reversible, but the state it restores to is a known-weaker baseline) and
`NON_REVERSIBLE_SECURITY_REPAIR` (rollback must refuse). Every one of the 8 phase03a candidates is
a privilege/RLS/RPC-tightening migration whose rollback necessarily restores the pre-hardening
(weaker) posture — `UNSAFE_BASELINE_RESTORE` is the only correct label for all 8, not a rubber
stamp. For the v4 pair specifically: I independently reproduced the full replay (see §9) and
`restorationExact: true` was measured directly, i.e. the rollback really does restore byte-exact
catalog state while dropping the limiter schema entirely — exactly what the manifest note claims
("restoration removes the limiter entirely, returning guest ingestion to the pre-v4 posture
governed only by the global anonymous emergency caps"). No pair is misclassified.

### 6. The manifest change — CONFIRMED, and appending was the right call

`git diff eec51b6..HEAD -- supabase/migrations-next/phase03a/candidate-contract.json` shows exactly
one appended object (the v4 entry) with no other line touched — the seven pre-existing entries are
byte-identical. The appended `sha256`/`rollbackSha256` values match the actual files (§1). This
does not alter any previously-reviewed security semantics: it is pure manifest bookkeeping that
makes an already-true fact (the v4 pair exists on disk with these exact bytes) machine-checkable by
`replay-phase03a.mjs`'s own inventory guard (`scripts/replay-phase03a.mjs:39-44`), which literally
throws `'Phase03A migration/restoration inventory differs from the reviewed manifest'` if the
directory listing and the manifest disagree — I confirmed this is the real error string the STEP2
document quotes, not a paraphrase. Appending (rather than regenerating the whole manifest) is the
correct choice: it makes the diff of an already-reviewed artifact into a single, auditable,
minimal addition instead of re-touching every field of the seven previously-accepted entries where
a stray formatting change or typo could slip in unnoticed.

### 7. Caller dependency safety — CONFIRMED

`grep -rn "admit_guest_flag\|admit_guest_feedback\|limiter\." src/` → zero hits anywhere in `src/`.
`src/lib/flags.ts:1309` still does `supabase.from('flags').insert(basePayload)...`; `src/lib/
feedbackStore.ts:83,90` still does `supabase.from('feedback').insert(row)...`. The limiter's only
`GRANT EXECUTE` is to `service_role` (`20260909120000_fda028_v4_limiter.sql:684-689`), which no
client-side code can reach directly anyway. This is the correct, safe state for CODE: the schema
and functions exist and are proven internally consistent, but nothing in the product depends on an
undeployed capability, so there is no way for this composition to "ship prematurely" — wiring it up
is a distinct, future, Edge-Function-mediated change that hasn't happened yet.

### 8. No new security or regression issue from composition — CONFIRMED (one NOTE worth recording)

- v4 creates an entirely separate `limiter` schema (`CREATE SCHEMA IF NOT EXISTS limiter;` at
  line 18). FDA-012's `effective-privileges.sql` guard scopes its capture to
  `nspname IN ('public','private')` (confirmed at `effective-privileges.sql:8,13`), so limiter
  objects are structurally outside that guard's inventory — the owner's claim is correct, verified
  by reading the WHERE clauses myself, not just running the guard.
- FDA-010's EXECUTE revocation targets six specific `public` schema trigger functions; v4's grants
  are all on `limiter.*` functions. No name or schema overlap; no double-grant/double-revoke found.
- **NOTE (not a defect):** the v4 migration runs after FDA-012's `effective_privileges.sql` in
  timestamp order (`20260905073925` before `20260909120000`). `effective_privileges.sql:114-118`
  revokes ALL privileges on `public.flags` from PUBLIC/anon/authenticated/service_role and then
  (`:205-211`) grants back only `SELECT(user_id)`/`UPDATE(user_id)` to `service_role` — **no INSERT
  grant to service_role at all.** Same pattern for `public.feedback` (`:74-78`, `:190-192`). This
  means `limiter.admit_guest_flag_at`'s direct `INSERT INTO public.flags` (line ~587) only works
  because it is `SECURITY DEFINER`, executing with the function owner's (not service_role's)
  privileges — service_role itself has no independent path to insert into either table anymore.
  This is a **positive** composition property worth stating plainly to the owner: after both
  migrations apply, the reviewed limiter function becomes the *only* route by which a guest flag
  or feedback row can be created at all — FDA-012's tightening and FDA-028's gateway function
  reinforce rather than conflict with each other. This was not explicitly claimed anywhere in the
  owner's STEP2 document, so it's recorded here as an independently-discovered positive, not
  assumed from the owner's narrative.

### 9. Reproduce the owner's headline gate (217/217) — CONFIRMED, independently reproduced end-to-end

Read `scripts/replay-phase03a.mjs` in full before running anything. The pass condition it
implements (`parseTap`, lines 29-31, and `localProofPassed`, lines 137-138) is exactly what STEP2
describes: `planned == executed == expectedPlan AND failed=0 AND skipped=0 AND todo=0 AND
bailout=0 AND parseErrors=0`, for every suite, plus `restorationExact`, `reapplyDeterministic`, and
a three-way privilege-guard pass (`privilegeGuard`, `privilegeGuardRehearsal`,
`reappliedPrivilegeGuard`). Honestly described — no hidden weakening.

Independently rebuilt the toolchain from scratch (not reused from any owner artifact):
```
curl -sL -o pgtap.tar.gz https://codeload.github.com/theory/pgtap/tar.gz/968eb53a...
LC_ALL=C shasum -a 256 pgtap.tar.gz
  -> 78822aa24ab5119f6b1f57de1a25223e6c4a31f4df6d3ab16ca2aadd1dbdea6c   (MATCH)
tar xzf pgtap.tar.gz
LC_ALL=C make sql/pgtap.sql PG_CONFIG=/opt/homebrew/opt/postgresql@17/bin/pg_config
LC_ALL=C shasum -a 256 sql/pgtap.sql
  -> d4f9c8a4b0bfa6f2e29c751ab4deb79208e43f5935bab1948750b95bad3926b3   (MATCH)
```
Both pgTAP hashes reproduce exactly, independently, on this machine, from source.

Then ran the actual gate:
```
LC_ALL=C node scripts/replay-migrations.mjs --with-next --local-only --phase03a \
  --phase03a-pgtap-sql=<built pgtap.sql> --json
```
Result: **exit 0**. Parsed the JSON directly (`result.phase03a`):
```
status: LOCAL_CANDIDATE_PROOF_PASS
localProofPassed: true          privilegeProofPassed: true
restorationExact: true          reapplyDeterministic: true
privilegeGuard.passed: true     privilegeGuardRehearsal.passed: true
reappliedPrivilegeGuard.passed: true

promptb_media_key_guards.test.sql:  planned=25  executed=25  failed=0 skipped=0 todo=0 bailout=0 parseErrors=0 passed=true
phase03a-foundation.test.sql:       planned=113 executed=113 failed=0 skipped=0 todo=0 bailout=0 parseErrors=0 passed=true
phase03a-privileges.test.sql:       planned=79  executed=79  failed=0 skipped=0 todo=0 bailout=0 parseErrors=0 passed=true
TOTAL executed: 217
source.sha: 5edd6455cac5fc5a42cd7e327b7a53f844a75d05  (matches candidate)
```
217/217 executed, zero failed/skipped/todo/bailout/parseErrors, restoration exact, reapply
deterministic — reproduced, not taken on faith. Only stderr output was three benign
`WARNING: [notify_flag_status_webhook] vault secret missing - skipping` lines, which is itself
independent confirmation of §11's Vault-untested-locally claim.

**NOTE for completeness (not a defect):** none of the three composed pgTAP suite files contain the
string `"limiter"` (`grep -c limiter` on all three → 0/0/0). The 217 assertions prove migration
*composability* (all 8 SQL files apply in order without collision, roll back byte-exact, reapply
deterministically, and don't perturb the FDA-012 privilege guard) — they do **not** re-exercise the
limiter's own rate-limiting/concurrency logic. That functional proof is the separate,
already-accepted 120-assertion + 3-concurrency-shape suite from the 6-round v4 review
(`acceptance.sql`/`acceptance2.sql`/`acceptance3.sql`/`concurrency.sh`, hash-verified in §1 but
correctly not rerun here, per this task's explicit instruction not to reopen v4's architecture).
Nobody should read "217/217" as re-proof of the limiter's behavior; it proves the *composition*
didn't break, which is exactly what this review is scoped to.

### 10. The owner's Jest reuse argument — CONFIRMED independently

Found the actual Jest baseline run (4204 passed / 14 failed / 32 todo,
`qa-reports/phase03a/2026-09-05-owner-resume/full-jest.json`) was captured at source SHA
`0a6a6b03fd0cbe72f70f67260f6cab746e098f6a`. Independently diffed from that exact commit to HEAD:
```
git diff --name-only 0a6a6b03fd0cbe72f70f67260f6cab746e098f6a HEAD | grep -E '\.(ts|tsx|js|jsx)$'
  -> (empty — zero matches)
```
Confirmed zero `.ts`/`.tsx`/`.js`/`.jsx` files changed since that Jest run. The full diff (139
files) is exclusively `qa-reports/` documentation, the 8 v4 SQL/rollback/test artifacts under
`supabase/migrations-next/phase03a/` and `supabase/tests/fda028/`, and `candidate-contract.json`.
Also confirmed `candidate-contract.json` is not referenced anywhere in `src/`, `scripts/`, or
`jest.config.js` (`grep -rl "candidate-contract" src/ scripts/ jest.config*` → empty). Independently
reran `npm run typecheck` (clean, no errors) and `npm run lint` (0 errors, 91 warnings — exactly
matching the claimed baseline count). A full Jest rerun would not exercise any changed source and
is not required.

### 11. Honesty of open items — CONFIRMED

`VAULT_IO` and `IPV6_HOSTED_EVIDENCE` are consistently marked `OPEN`/`OPEN_FOR_STAGE`/
`UNVERIFIED_LOCALLY` across `V4_LOCAL_GATE.json`, `STEP0_PREPARED.json`, and
`STEP2_CODE_ACCEPTANCE.json` — never upgraded to a local pass anywhere. My own independent replay
run in §9 emitted the exact `vault secret missing - skipping` warning, which is corroborating
evidence (not just a repeated claim) that the Vault-dependent code path genuinely was not, and
could not be, exercised in this disposable local database. R6-1/R6-2/R6-3 are explicitly recorded
in `STEP0_PREPARED.json`'s `r6Residuals` as `"CARRY_TO_STAGE"` with `"ownerDisposition": "ACCEPTED
FOR STAGING EVALUATION. The passing V4 artifact must NOT be modified to eliminate them before
INT."` — carried forward honestly, not silently waived or quietly asserted as fixed.

### 12. Anything else — NONE FOUND that should block PASS

One item worth naming for completeness, not as a defect: `qa-reports/phase03a/2026-09-10-code-
accept-int/INT_PREPARED.json` exists on this branch (new since eec51b6). It is a plan/dry-run
document only — `"mutationPerformed": false"`, and it explicitly gates itself on
`"PHASE_03A_CODE_GATE": "PENDING - independent CODE review in flight; INT will not start until it
returns PASS"`. No staging/production/push action has occurred. This is appropriate pre-staging for
the local INT this review's PASS is meant to unblock, not scope creep.

---

## What the composition got right

- All seven findings are genuinely implemented, each verified against its own original finding
  text and the deployed-contract's exact object names — not accepted from the owner's mapping
  table.
- The v4 artifact bytes are provably unchanged since its own independent 6-round acceptance; the
  only post-acceptance change anywhere in the tree is a 9-line, purely-additive manifest entry
  whose hashes I independently verified.
- The manifest's own inventory guard did its job (caught the missing v4 entry) and the fix was the
  narrowest possible one.
- FDA-012's privilege lockdown and FDA-028's gateway function compose *well*: after both apply,
  service_role has no independent path to insert a flag or feedback row at all — the reviewed
  limiter function becomes the sole gateway. This is a real, positive security property that
  emerged from composing two independently-developed candidates correctly.
- The 217/217 composed pgTAP proof, the toolchain hashes, and the Jest-reuse argument all
  independently reproduced exactly as claimed, with zero shortcuts taken to get there.
- Every open item (VAULT_IO, IPV6_HOSTED_EVIDENCE, R6-1/2/3) is still honestly labeled open/carried,
  nothing quietly upgraded to "locally proven."

## Residual risk the owner must accept

- The limiter is fully built and internally proven, but genuinely inert — no caller reaches it yet.
  Wiring it up (an Edge Function using service_role, per the migration's own design comment) is a
  distinct future change that will need its own review before it can affect real guest traffic.
- The 217-assertion composed proof validates that the eight candidates apply/restore/reapply
  cleanly together and don't disturb the FDA-012 privilege guard — it does not re-validate the
  limiter's rate-limiting or concurrency behavior. That correctness rests entirely on the
  already-accepted, separate 6-round v4 review and its own 120-assertion + 3-concurrency-shape
  suite, which this review did not and should not rerun.
- R6-1/R6-2/R6-3 (advisory-lock freeze surface, PUBLIC-executable Postgres primitive, no CI race
  test) are real, disclosed, SHOULD-FIX items carried to staging by design. They are availability-
  only and require an already-trusted raw-SQL connection to exploit — but they are not fixed, and
  must not be silently forgotten before staging sign-off.
- VAULT_IO and IPV6_HOSTED_EVIDENCE remain completely unproven locally and can only be closed with
  hosted contact, which this phase correctly does not attempt.
- FDA-012's own residual (managed `supabase_admin` defaults) is explicitly out of local reach and
  stays open; it is not this composition's job to fix it, but it should not be forgotten either.
