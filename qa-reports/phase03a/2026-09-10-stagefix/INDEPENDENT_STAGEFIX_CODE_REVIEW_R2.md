# Independent stage-fix code review — ROUND 2

**Reviewer role:** independent, round 2. No authorship of Phase 03A, of the staging run,
of the corrections, or of the round-1 review. Read-only on the candidate. Every temporary
artifact I created lives outside the repository; the worktree was clean at start and at
finish.

**Candidate reviewed (frozen):**
- worktree `/Users/skypie/AccessMap-worktrees/flagstone-p03a-stagefix-20260910`
- `git rev-parse HEAD` → `a274b9dcc68000a3c9a144e087d6140e28338add` — matches the stated candidate
- `git rev-parse HEAD^{tree}` → `a1aa31db2932233caf27584ef08ab0b7b9c2af6b` — matches
- branch `repair/flagstone-p03a-stage-mandatory-fixes-20260910`; `git status --porcelain`
  empty at start and at finish

**Containment.** No staging contact. No production contact. No network call to any Supabase
project. Project refs `ctshxbykuemeqnofqcdh` and `kldlwszpfkdmsjrjhjym` were never targeted;
they appear below only as strings read out of committed capture files. Every database
observation is from disposable local PostgreSQL 17 instances I created and destroyed, or
from committed artifacts read off disk. No commit, no push, no merge, no branch change. No
secret value is reproduced anywhere in this report.

---

# VERDICT

## ACCEPT WITH MANDATORY CHANGES

Four of the five round-1 MUST-FIX are genuinely closed, and I could not break them. The
fifth is two-thirds closed and its unfinished third is not cosmetic — it is the part that
would have surfaced what I found next.

What survived direct attack, on my own measurements:

- **The guest breakage is really fixed.** I computed the effective privilege delta myself,
  at table *and* column granularity, over the whole Stage A apply set. All five relations
  survive Stage A and are revoked only by Stage B. Across ~1,350 measured privilege keys
  the Stage A delta contains **zero privilege gains** and no SELECT loss that any shipped
  Build 33 call site depends on, as `anon` or as `authenticated`. I looked for a third
  instance of the class and did not find one in the privilege dimension.
- **The author's correction of round 1 is correct**, and I verified it two independent ways.
- **253/253, zero failures, all four gate flags true**, reproduced in my own run, with the
  guest negative control provably non-vacuous.
- **FDA-028 is byte-identical**, confirmed by hash and by tree hash.
- **The tooling runs.** All seven CLI entrypoints work and exit with the right codes.
- **The Jest claim is now true.** I reproduced 14 / 32 / 4244 / 4290 exactly.

What is still open:

- **Round-1 MUST-FIX 2 is not fully closed.** The specific NULL-vs-`'{}'` collision is
  fixed and tested. The third clause of that MUST-FIX — correct the "nothing structural is
  excluded" claim — was not done; the claim is restated verbatim in the module header, in
  `EIGHT_FIX_DISPOSITION.json` and in the packet. I then constructed **five more
  collisions**, each a genuinely different authorization or enforcement state producing an
  identical checksum and `diffCaptures() → identical: true`, including a SECURITY DEFINER
  function silently losing `SET search_path`.
- **The compatibility contract's new guest section overstates its own fidelity**, in the
  one artifact whose entire purpose is fidelity — and the owner-facing packet was not
  updated at all for the guest half of Stage B.

Nothing here is unsafe right now: nothing has been applied anywhere, this increment
authorizes no mutation, and I measured no authorization widening. The three MUST-FIX below
are tractable without redoing the increment.

---

# V1 — Guest (anon) breakage

## V1a — do all five survive Stage A? **PASS.**

I did not read this off the migrations. I built my own replay harness outside the repo
(disposable PostgreSQL 17, socket-only, `listen_addresses = ''`), applied the 71 crosswalk
`APPLIED` migrations, then the declared local baseline supplement
`supabase/tests/phase03a-fixtures/baseline-extra.sql`, then the five Phase 02 adoption
candidates and the eight Stage A candidates, and probed **effective** privilege with
`has_table_privilege` / `has_column_privilege` / `has_function_privilege` / `has_schema_privilege`
for `anon`, `authenticated` and `service_role` across every relation and column in `public`
and `private` — so an inherited `PUBLIC` grant could not make me wrong.

| Relation (anon SELECT) | baseline | after Stage A | after Stage B |
|---|---|---|---|
| `public.flag_comments` | true | **true** | false |
| `public.flag_photos` | true | **true** | false |
| `public.flag_status_history_public` | true | **true** | false |
| `public.flag_edit_history_public` | true | **true** | false |
| `public.point_events` | true | **true** | false |
| `public.flags` (control) | true | true | true |

All five are retained by a labelled block in `20260905073925_phase03a_effective_privileges.sql`
naming its removal migration, registered in `application-privileges.v1.json` as
`stageACompatibilityRetentions`, and removed by the five `REVOKE`s in
`20260910120000_phase03a_fda026_stage_b_cutover.sql`. Round-1 MUST-FIX 1: **closed**.

## V1b — the author's correction. **VERIFIED CORRECT.**

The author corrected round 1 on `flag_status_history_public` and `flag_edit_history_public`,
claiming they are `security_invoker` views whose base tables `anon` never reached, so they
were never a working guest path. I verified this three independent ways and the author is
right:

1. **The view definitions.** `supabase/migrations/20260524211825_flag_status_history.sql:226`
   and `supabase/migrations/20260529063432_flag_edit_history_table.sql:184` both create the
   view `with (security_invoker = true)`. The first file also carries
   `revoke select on public.flag_status_history from anon, authenticated;` at line 210.
2. **My own measurement.** `has_table_privilege('anon', 'public.flag_status_history', 'SELECT')`
   is **false** at the baseline and **false** after Stage A; same for `flag_edit_history`.
   Executing the real shipped shape as `anon` raises
   `ERROR: permission denied for table flag_status_history` **before Stage A and after** —
   Stage A changes nothing about it.
3. **Production.** `supabase/contract/production-catalog-capture.v2.json` (read from disk)
   grants `SELECT` on both base tables to `service_role` only, and
   `qa-reports/phase03a/2026-09-04/preflight/expanded-privileges.json` — a production-ref,
   read-only column-ACL capture, hash-pinned by `candidate-contract.json` and re-verified
   by me — records **zero** column ACLs for `anon`.

So round 1 was wrong on those two and the author was right to say so. The suite now asserts
the honest behaviour (grant present, read still stops at the base table), which is the
correct way to record it.

## V1c — the attack: is there a third instance? **No new privilege breakage. One new contract-fidelity defect.**

Remaining `anon` SELECT losses in Stage A, all of which production holds today:
`comment_votes`, `feedback`, `flag_verifications`, `notification_preferences`,
`push_tokens`, `realtime_subscribe_log`, `users_self_email`.

Remaining `authenticated` SELECT losses: `realtime_subscribe_log`, `users_self_email` only —
matching round 1.

I extracted both shipped trees (`git archive f5594171… src`, `git archive ebf091c2… src`) and
searched them. **None** of those nine relations is read by any shipped client:
`comment_votes`, `flag_verifications`, `realtime_subscribe_log`, `users_self_email` and
`notification_preferences` appear only in `types/database.ts` and in comments;
`feedback.select` is `.eq('user_id', userId)` (authenticated only); `push_tokens` is written
and deleted, never read, by the client. Nine `.rpc()` names are called by the shipped
clients; the three that exist keep `authenticated` EXECUTE across Stage A. The nine trigger
functions that lose client `EXECUTE` are trigger functions — PostgreSQL does not check
`EXECUTE` at fire time, and the `promptb_media_key_guards` suite's INSERT/UPDATE assertions
pass after Stage A, which demonstrates it empirically.

I also ran the exact shipped statement shapes as `anon` and as `authenticated` against the
baseline, after Stage A and after Stage B. **No shipped shape that works at the baseline
stops working after Stage A**, for either role. Three authenticated shapes that *error* at
the baseline (`users` own-row read, `flags` delete, profile update — infinite RLS recursion)
start working after Stage A. Stage A is strictly a narrowing plus two documented retentions:

> Privilege **gains** across Stage A, measured against the declared baseline: **NONE**.

I checked the server side too, since round 1 left it as a SHOULD-FIX. The Edge Functions'
whole database surface is one table read — `send-push-notification` does
`.from('push_tokens').select('token').eq('user_id', …)` — and Stage A grants `service_role`
exactly `SELECT ("token","user_id")` on that table, so it survives. Its eleven other calls
are `account_deletion_*` RPCs that exist in neither `supabase/migrations/` nor the replayed
catalog, and Stage A's revokes are explicit per-object enumerations with no blanket
`REVOKE … ON ALL FUNCTIONS` touching `service_role`, so they are untouched.

**What I did find — MUST-FIX 1.** `build33-compat.test.sql` opens by claiming it
"exercises the exact query shapes in the submitted iOS tree f5594171 and the pinned web
tree ebf091c2". For the authenticated section that is true and I verified it. For the guest
section it is not:

- Assertion 16 is labelled **"src/lib/comments.ts listComments() does not raise for anon"**
  and executes `SELECT id FROM public.flag_comments LIMIT 1`. The real `listComments()` uses
  `COMMENT_SELECT` = `'id, flag_id, user_id, content, created_at, users!flag_comments_user_id_fkey(display_name)'`
  (`src/lib/comments.ts:31`). That embed forces a read of `public.users`, on which `anon`
  holds nothing — before Stage A, after Stage A, and in production (zero anon column ACLs).
  I ran the real shape as `anon`: `ERROR: permission denied for table users`, identical
  before and after Stage A. The guest comment list is **already** an error state in
  production; the Stage A retention of `flag_comments` buys the shipped guest path nothing.
  This is exactly the base-table rigor the author correctly applied to the two views and did
  not apply here.
- The Stage A comment block describes `point_events` as "guest-visible activity". The only
  shipped reads are `getPointEventHistory(userId)` and `getLifetimeReportOutcomes(userId)`
  in `pointEvents.ts`, consumed by `ProfileScreen` — an authenticated surface. No guest
  surface reads it, and every SELECT policy on it is `TO authenticated`, so `anon` gets zero
  rows regardless.
- Related: all three RLS tables (`flag_comments`, `flag_photos`, `point_events`) have SELECT
  policies `TO authenticated` only, so a guest already sees an empty list. The retention's
  real value is empty-list → error-banner, which is genuine for `flag_photos`
  (`photos.ts` throws, `FlagDetailModal.tsx:411` is ungated) but not for the other two.

Retaining the grants is the conservative choice and I am not asking for it to be reversed.
The defect is that the artifact whose job is truthful compatibility statements makes two
untrue ones, and they feed an owner decision (see MUST-FIX 2).

---

# V2 — ACL collision

**Round-1 MUST-FIX 2 is NOT fully closed. This is MUST-FIX 3.**

## What is fixed

`coalesce(<acl>::text, '')` is gone from `CATALOG_SQL` for all five ACL columns.
`normalizeAcl(null)` now returns `[ACL_DEFAULT_SENTINEL]`. Four regression tests pin it.
`npx jest scripts/__tests__/structuralCatalog.test.ts` → **14 passed, 14 total**. The
specific collision round 1 constructed is genuinely gone.

## What is not

Round-1 MUST-FIX 2 had three clauses. The third — "correct the 'nothing structural is
excluded' claim in the module header and in `EIGHT_FIX_DISPOSITION.json`" — was not done.
The claim is restated verbatim in `scripts/structural-catalog.mjs` ("NOTHING structural is
excluded"), in `EIGHT_FIX_DISPOSITION.json` ("Nothing structural is excluded; only oid and
planner statistics are") and in packet §9 ("Nothing structural may be excluded to make
checksums agree").

So I did what that clause exists to prevent: I built a live PostgreSQL 17 instance, ran the
module's own `CATALOG_SQL`, `normalizeCatalog`, `checksum` and `diffCaptures` against it,
made one real change at a time, and re-captured.

| # | Change made | checksum | `diffCaptures` |
|---|---|---|---|
| A | SECURITY DEFINER function loses `SET search_path` | **unchanged** | `identical: true`, 0 residuals |
| B | `ALTER TABLE … DISABLE TRIGGER` | **unchanged** | `identical: true`, 0 residuals |
| C | trigger `WHEN` clause removed | **unchanged** | `identical: true`, 0 residuals |
| D | column `DEFAULT false` → `DEFAULT true` on an `is_admin`-shaped column | **unchanged** | `identical: true`, 0 residuals |
| E | `FORCE ROW LEVEL SECURITY` toggled on | **unchanged** | `identical: true`, 0 residuals |
| F | control: a real `GRANT INSERT` | `bac74860…` → `db36483e…` | 2 residuals, section `relations` |

The control proves the harness works. The five above are real, security-relevant states
that the tool built to detect authorization regressions certifies as structurally identical.

The mechanism in each case is an uncaptured field, none of which is declared in
`VOLATILE_FIELDS`:

- **A:** `pg_proc.proconfig` is not captured. This project's own replay comparator *does*
  capture it (`configuration: ["search_path=\"\""]`), and Phase 03A's security posture
  depends on every SECURITY DEFINER helper carrying it. This is the most serious of the five.
- **B/C:** `pg_trigger.tgenabled` and `tgqual` are not captured. The repo's enforcement
  boundaries — `enforce_flag_status_transition`, `notify_flag_status_webhook`, the three
  object-key guards — can be silently disabled or have their `WHEN` clause changed with an
  identical checksum. Compounding it, `triggers` is **not** in `diffCaptures`'s
  `securityRelevantSections` list, so even a detected trigger residual would be classed
  cosmetic.
- **D:** `atthasdef` / the default expression is not captured.
- **E:** `relforcerowsecurity` is not captured (the replay comparator captures `rls_forced`).
- Additionally the `s` CTE scopes the capture to `public`, `private`, `storage`, `limiter`.
  `auth`, `vault`, `net` and `extensions` are invisible — a grant on `net.http_post` or
  `vault.secrets` would not appear. That is a defensible scope, but it is a sixth
  undeclared exclusion sitting under a "nothing is excluded" claim.

The existing test named *"excludes nothing structural — grants, policies and definitions
are all captured"* passes because it checks grants, policies and definitions. It does not
check the fields above, so it certifies the false claim rather than catching it.

**Secondary, carried from round 1 SHOULD-FIX 5 and still unfixed:** `normalizeAcl` splits on
`,` before stripping quotes, so a quoted role name containing a comma is silently corrupted
into a fabricated grantee and a lost one. Not reachable with current Supabase role names.

---

# V3 — Jest honesty

**PASS.**

I ran `npx jest --silent` myself at the frozen SHA on the committed tree:

```
Test Suites: 12 failed, 277 passed, 289 total
Tests:       14 failed, 32 todo, 4244 passed, 4290 total
```

Exactly the claimed 14 / 32 / 4244 / 4290. `src/__tests__/noCredentialsInTree.guard.test.ts`
is **not** in the failing set; run directly it passes **7/7**. The line that tripped it was
replaced with a description of the secret rather than its name — I read the diff and no
secret value is present.

Reconciliation to the inherited 14, by construction rather than by trusting the claim:

- `git diff --name-status 21b2bd7a…HEAD` (21b2bd7a is the merge base) shows **no non-test
  source file under `src/` changed** — only two new guard test files. The 12 failing suites
  are a11y/geometry/press-vocabulary guards reading unchanged sources, so they fail
  identically at the baseline.
- The four new Jest files contribute exactly **40** tests: running the five affected suites
  gives 47 passed, of which 7 belong to the pre-existing `noCredentialsInTree` guard.
  4290 − 40 = **4250**, which is the claimed baseline total. `todo` unchanged at 32.

I extracted all 14 failing test names; every one is in an untouched a11y/UI guard suite.

**Honest bound:** `LOCAL_ACCEPTANCE.json` asserts the reconciliation is "EXACT by failure
name" but never writes the 14 names down, so the by-name comparison cannot be performed
against a recorded baseline. My reconciliation is by construction and by arithmetic, and it
holds. Listing the names would make the claim checkable — SHOULD-FIX.

---

# V4 — Tooling is runnable

**PASS**, with residuals.

Every command executed, in this worktree:

| Command | Result | Exit |
|---|---|---|
| `npm run db:apply:plan` | `stage A, ok true, 8 candidates, problems []`, canonically ordered | **0** |
| `db:apply:verify -- --ledger <correct>` | `passed: true, problems: []` | **0** |
| `db:apply:verify -- --ledger <wall-clock-substituted>` | `passed: false`, 10 problems: 8 "ledgerless apply" + 2 "Wall-clock substitution … but its canonical version is …" | **1** |
| `db:apply:verify` (no `--ledger`) | clean usage error | **2** |
| `db:apply:command -- --project-ref someref` | `supabase db push --linked --project-ref someref --dry-run` plus the prohibited-mechanism list | **0** |
| `db:apply:command` (no ref) | refuses | **2** |
| `db:apply:restore -- --candidate 20260910120000_…stage_b_cutover.sql --reason test` | emits a complete forward migration | **0** |
| `db:catalog:sql` | prints the 3,028-byte query verbatim | **0** |
| `db:catalog:capture` ×2 | writes `CATALOG_<label>.json`, content before checksum | **0** |
| `db:catalog:diff` (different) | 2 residuals, `securityRelevantSections: ["functions"]` | **1** |
| `db:catalog:diff` (same file twice) | `identical: true` | **0** |

Round-1 MUST-FIX 4 ("there is no command that does this") is **closed**, and the packet now
names the runnable commands instead of a function.

**Is the forward-only restoration model now conforming, or still naming?** It is now more
than naming. `buildForwardRestoration()` emits a real migration: a canonical
`<version>_restore_<name>.sql` filename, a header explaining that the ledger will read
"applied, then deliberately undone", the reason string, and the rollback body verbatim.
That is a genuinely conforming artifact, not a string. Three residuals, all SHOULD-FIX:

1. It only **prints** ("OK: would be …"). Nothing writes it into a candidate set, and no
   artifact in `supabase/migrations-next/phase03a/rollback/` conforms to the model — the
   directory is unchanged. The ledger defect would still recur on the next rehearsal unless
   an operator manually captures stdout.
2. The canonical version is **wall-clock-derived**. Two runs 1.2 s apart produced
   `20260910234337_…` and `20260910234338_…`. A restoration legitimately needs a later
   version, so this is defensible, but it means the emitted artifact is not reproducible —
   in a module whose central fix was removing the clock from identity.
3. Round 1's residual is unaddressed and unrecorded: `verifyLedgerIdentity()` still compares
   version and name only. An apply of *different content* under the *correct* canonical
   version verifies clean. `planApply()` hash-binds at plan time; nothing binds the plan to
   the apply.

Minor: `--ledger` with an inline JSON array (rather than a file path) crashes with an
unhandled `ENAMETOOLONG` stack trace instead of a usage error. The documented contract is
`--ledger <file.json>`, so this is robustness, not a wrong contract.

---

# V5 — STAGE-MF-04 reclassification

**PASS.**

`EIGHT_FIX_DISPOSITION.json` now carries `"disposition": "OPEN — OWNER DECISION"`, a
`reclassifiedAfterReview` field that states plainly *"I marked this CLOSED. The independent
reviewer was right that it did not meet the acceptance proof I myself wrote for it"*, a
`whatTheGuardActuallyDelivers` field that does not overstate, and an `ownerDecisionRequired`
field naming both options. `summary.openByDesignAsOwnerDecisions` lists it alongside MF-03
and MF-05, and `summary.note` records the move.

The packet carries it to the owner. `git diff 2e4a9a1..HEAD` on the packet shows §2 changed
from `**CLOSED** — coupling asserted` to `**OPEN by design** — coupling asserted, decision
at §6`, and §6 gained a new numbered item 4 stating the two options and their consequence
(environment-derived URL makes the adoption candidate diverge from production and needs an
explicit contract-truth exception). That is an honest reclassification put in front of the
owner.

---

# V6 — The full local proof

**PASS.**

pgTAP provenance verified before anything built on it:
`shasum -a 256` of the prebuilt `pgtap.sql` →
`d4f9c8a4b0bfa6f2e29c751ab4deb79208e43f5935bab1948750b95bad3926b3`, matching the pinned
value exactly. The replay JSON independently reports the same `generatedSqlSha256` and
source commit `968eb53a33114e83042b3bdb0c664b5b80cf8bdf`.

```
node scripts/replay-migrations.mjs --with-next --local-only --phase03a \
  --phase03a-pgtap-sql=<pinned pgtap.sql> --json      → exit 0
```

| Suite | planned | executed | failed | skipped | todo | bailout |
|---|---|---|---|---|---|---|
| `promptb_media_key_guards.test.sql` | 25 | 25 | 0 | 0 | 0 | 0 |
| `phase03a-foundation.test.sql` | 113 | 113 | 0 | 0 | 0 | 0 |
| `phase03a-privileges.test.sql` | 79 | 79 | 0 | 0 | 0 | 0 |
| `build33-compat.test.sql` | 36 | 36 | 0 | 0 | 0 | 0 |
| **TOTAL** | **253** | **253** | **0** | **0** | **0** | **0** |

`localProofPassed`, `privilegeProofPassed`, `restorationExact`, `reapplyDeterministic` — all
four **true** in my own run. `executed == planned` everywhere; zero skips, zero TODOs, zero
bailouts, so the count is not inflated.

**Can the guest negative control pass vacuously? No, and the suite proves it internally.**

- The *same statement* flips across the in-transaction cutover. `SELECT id FROM
  public.flag_comments LIMIT 1` is `lives_ok` at assertion 16 and `throws_ok '42501'` at
  assertion 34. Same for `flag_photos` at 17 → 35. A control that cannot fail cannot produce
  that flip.
- The role switch is provably real. Assertions 19 and 21 sit *inside the same anon block* as
  16/17 and require `42501` on the two `_public` views. A session that had silently stayed
  `postgres` would not raise `42501` there, so those two assertions double as a live check
  that `SET LOCAL ROLE anon` took effect.
- Assertion 23 (`flags` still readable) and 36 (`flags` still readable after cutover) bound
  the blast radius, so a blanket lockout would fail too.
- `lives_ok` on a missing relation raises `42P01` and fails, so 16/17 cannot pass by absence.

I also confirmed the Stage B in-transaction replica is byte-faithful to
`20260910120000_phase03a_fda026_stage_b_cutover.sql` today: the file's seven operative
statements and the test's seven are identical. It is still a *replica*, not an execution of
the file (carried SHOULD-FIX from round 1, now with seven statements to drift instead of two).

---

# V7 — FDA-028 untouched

**PASS.** Computed independently.

```
supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql
  8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771
.../rollback/20260909120000_fda028_v4_limiter.rollback.sql
  eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302
```

Both match the accepted `8d1cc7e1…` / `eded3c9f…` and both match the values declared in
`candidate-contract.json`.

```
git rev-parse 21b2bd7a…:supabase/tests/fda028  → 04fec65effb8b347ae4e00dcbc3e7060672fe9cb
git rev-parse HEAD:supabase/tests/fda028       → 04fec65effb8b347ae4e00dcbc3e7060672fe9cb
```

`git diff --stat` over the test directory and both limiter artifacts is empty. No FDA-028
re-review is reopened. I ran no limiter behaviour tests and make no claim about them.

---

# V8 — Overclaimed, vacuous, or newly broken

1. **The packet's Build 33 section was not updated for the guest half.** This is
   **MUST-FIX 2**. `git diff 2e4a9a1..HEAD` on `STAGING_RERUN_AUTHORIZATION_PACKET.md` shows
   §5 and §8 untouched. So §5 still says "25 assertions" (it is 36), §8 still says "Hosted
   pgTAP, now **242** assertions … (+25 Build 33)" (it is 253, +36), and — materially — the
   §5 "After Stage B (cutover)" matrix still lists only the four authenticated call sites.
   Stage B now also revokes five `anon` grants. §6.3, the item that asks the owner to decide
   Stage B timing, still frames the question as "no client reading `public.users` directly".
   **The owner is being asked to authorize a Stage B whose scope the owner-facing artifact
   describes at roughly half its size.** Round-1 MUST-FIX 1 offered "or record the guest-surface
   degradation as a first-class rollout constraint in front of the owner"; the author took the
   other branch, which is the better one — but taking it moved the guest revocations into the
   thing the owner must separately authorize, and that document was not updated.
2. **`LOCAL_ACCEPTANCE.json` contradicts itself.** `runFinal_atFrozenSha` says +40 Jest tests
   ("3 + 3 + 20 + 14") and is correct — I measured 40. The `newTestsAdded` object in the same
   file still says `canonicalMigrationIdentity: 19`, `structuralCatalog: 11`,
   `build33-compat.test.sql: 25`, `"total": 61` and "36 of these are Jest tests". Those are
   the round-1 numbers, left in place beside the corrected ones. `composedPgTap.delta` also
   reads "+36 from build33-compat" when the delta from 242 is +11 and 36 is the file's total.
   This is the same "committed alongside a change without being re-derived" failure round 1
   caught, one artifact over.
3. **Round-1 SHOULD-FIX carried unaddressed** (each verified still open by me):
   SHOULD-FIX 1 (Stage B replica not bound to the file); SHOULD-FIX 3 (target-safety guards
   not widened; `projectTargetSafety.guard.test.ts` unchanged); SHOULD-FIX 4
   (`OP_RESTORE_REAPPLY.json:74` still carries *"No production target was ever reachable from
   the linked ref."* in place, with the retraction still living separately at line ~90);
   SHOULD-FIX 5 (`normalizeAcl` comma parsing); SHOULD-FIX 6 (`MUST_FIX_INVENTORY.json:123`
   still says "hard, 42501" for a gate that degrades silently); SHOULD-FIX 8
   (`baseline-backups.sql` still missing its `PGTAP_KIND` marker — correctly recorded as
   pre-existing).
4. **Round-1 SHOULD-FIX 2 (`service_role` blast radius) is now partly discharged — by me, not
   by the increment.** I inventoried the Edge Functions' entire database surface (one table
   read, eleven RPCs) and found no Stage A privilege loss that touches it. The receipt the
   round-1 reviewer asked for still does not exist in the increment.
5. **Other gates confirmed, not taken on trust.** `npm run typecheck` → exit 0, no output.
   `npm run contract:check` → *"migration-crosswalk.v1.json is current"*, exit 0.
6. **The `is_admin` retention survived a direct attack.** It looked, on first measurement,
   like a privilege *gain* — the repo's own 71 applied migrations never grant
   `SELECT (is_admin)` to `authenticated`, and my first harness run showed it flipping
   `false → true` across Stage A. It is not a gain: the grant was applied to production
   out-of-band on 2026-08-18 (the shipped `admin.ts` says so in its own comment), and the
   candidate declares it honestly as `localBaselineSupplement`
   (`baseline-extra.sql`, hash-pinned, evidence-pinned to a read-only production column-ACL
   capture, count-verified 18/108/18 by the replay). Re-running my harness with the declared
   supplement applied, the gain disappears and the Stage A delta contains **zero** gains. I
   record the attack because the conclusion is load-bearing: Stage A widens nothing.
   Worth noting for the owner, though: `production-catalog-capture.v2.json` carries **no
   column-level grants at all**, so every column-level production claim rests on the separate
   `expanded-privileges.json` preflight capture rather than on the headline capture.
7. **Not this increment's defect, recorded so it is not lost.** The shipped clients call nine
   RPCs; six of them (`prepare/commit/cancel_flag_photo_upload`, `list_monthly_leaderboard`,
   `claim_next_account_deletion_operation`) and the eleven Edge Function `account_deletion_*`
   RPCs exist in neither `supabase/migrations/` nor the replayed catalog. That is a
   repo-versus-production divergence predating Phase 03A, but it means the local model does
   not contain those objects and no local proof can speak about them.
8. **No vacuous passes found in the pgTAP suites** (zero skipped/TODO/bailout,
   `executed == planned`, and the Stage A ↔ Stage B divergence in measured results).

---

# MUST-FIX

1. **The Build 33 compatibility contract's guest section is not the shipped shape, and two
   of its guest claims are untrue.** `build33-compat.test.sql` assertion 16 is labelled
   `src/lib/comments.ts listComments() does not raise for anon` but executes
   `SELECT id FROM public.flag_comments`. The real `listComments()` embeds
   `users!flag_comments_user_id_fkey(display_name)` (`comments.ts:31`), which raises
   `42501 permission denied for table users` for `anon` — before Stage A, after Stage A, and
   in production, where `anon` holds zero column ACLs on `users`
   (`expanded-privileges.json`). Assert the real shape, and either drop the label or state
   plainly that the guest comment path is already broken. Likewise correct the Stage A
   comment block's claim that `point_events` is "guest-visible activity" — the only shipped
   reads are `getPointEventHistory(userId)` / `getLifetimeReportOutcomes(userId)` on the
   authenticated `ProfileScreen`. Retaining both grants is still the right conservative call;
   the rationale text and the assertion label are what must become true. This is the same
   base-table rigor the author applied correctly to the two `_public` views.

2. **The owner-facing packet does not describe the guest half of Stage B.**
   `STAGING_RERUN_AUTHORIZATION_PACKET.md` §5 and §8 were not touched by the fix commit. §5
   still says "25 assertions" and its "After Stage B" matrix lists only the four
   authenticated call sites, although Stage B now also revokes `anon` SELECT on
   `flag_comments`, `flag_photos`, `flag_status_history_public`, `flag_edit_history_public`
   and `point_events`. §6.3 frames the Stage B decision solely as "no client reading
   `public.users` directly". §8 still says the rerun must repeat "242" assertions (+25). Add
   a guest row to the §5 matrix with the honest effect of each of the five (photo gallery:
   empty → error banner; comments: already an error state; the two views: no change;
   `point_events`: no guest reader), fold the guest revocations into the §6.3 decision text,
   and re-derive 36 / 253.

3. **`scripts/structural-catalog.mjs` still hides real authorization changes, and still says
   it does not.** Round-1 MUST-FIX 2's third clause was not done. I constructed five
   collisions — a SECURITY DEFINER function losing `SET search_path`; a disabled trigger; a
   removed trigger `WHEN` clause; an `is_admin`-shaped column default flipped to `true`;
   `FORCE ROW LEVEL SECURITY` toggled — each producing an **unchanged checksum** and
   `diffCaptures() → identical: true, residualCount: 0`, with a `GRANT` control correctly
   detected in the same run. Capture `proconfig`, `tgenabled`, `tgqual`, `relforcerowsecurity`
   and column defaults; add `triggers` to `securityRelevantSections`; declare the four-schema
   scope; add tests pinning each; and correct the "NOTHING structural is excluded" claim in
   the module header, in `EIGHT_FIX_DISPOSITION.json` and in packet §9. The existing test
   *"excludes nothing structural"* currently certifies the false claim rather than catching it.

---

# SHOULD-FIX

1. **Reconcile `LOCAL_ACCEPTANCE.json` with itself.** The `newTestsAdded` object and
   `composedPgTap.delta` still carry the round-1 numbers (19 / 11 / 25 / 61 / "+36") beside
   the corrected `runFinal_atFrozenSha` (+40, 3+3+20+14). Measured: 40 new Jest tests,
   `build33-compat.test.sql` plan 36, suite total 253.
2. **Write the 14 inherited failure names down.** `LOCAL_ACCEPTANCE.json` asserts the
   reconciliation is "EXACT by failure name" but `beyondBaseline` is `[]` and the names appear
   nowhere, so the claim cannot be checked as stated.
3. **Make `db:apply:restore` write, and make its version deterministic.** It prints a
   conforming migration but writes nothing, no artifact under `rollback/` conforms to the
   model, and the canonical version is clock-derived (two runs 1.2 s apart differ).
4. **Bind the applied bytes to the plan.** `verifyLedgerIdentity()` compares version and name
   only; different content under the correct canonical version verifies clean. Round 1 raised
   this; it is neither fixed nor recorded as accepted.
5. **Bind the Stage B negative control to the Stage B file.** `build33-compat.test.sql`
   re-types all seven cutover statements. Exact today; nothing would notice drift.
6. **Handle `--ledger` given an inline JSON array** with a usage error instead of an
   unhandled `ENAMETOOLONG` stack trace.
7. **Record the `service_role` inventory.** I found the Edge Function surface intact
   (`push_tokens.token`/`user_id` retained; the `account_deletion_*` RPCs exist in neither the
   repo nor the replayed catalog and are untouched by Stage A's explicit per-object revokes),
   but the increment carries no such receipt. Note that Stage A's
   `ALTER DEFAULT PRIVILEGES … REVOKE ALL ON FUNCTIONS FROM … service_role` applies to any
   *future* postgres-owned function, including any account-deletion migration applied after
   Phase 03A.
8. **Carried, still open from round 1:** SHOULD-FIX 1, 3, 4, 5, 6, 8 — verified individually
   above in V8.3.
9. **Note in the packet that `production-catalog-capture.v2.json` carries no column-level
   grants.** Every column-level production claim in this increment rests on
   `qa-reports/phase03a/2026-09-04/preflight/expanded-privileges.json` instead, which is
   hash-pinned but is not the artifact a reader would look in.

---

# What I could NOT verify, and why

| Item | Why not |
|---|---|
| That a shipped Build 33 client — guest or signed-in — actually behaves as predicted against a Stage A database | Requires a hosted target. Out of bounds. Every client conclusion here is a measured privilege/RLS outcome in local PostgreSQL plus a reading of the shipped call sites, not an end-to-end client run. |
| Production state beyond the committed captures | No production contact. `production-catalog-capture.v2.json` (2026-09-05) and `expanded-privileges.json` (2026-09-05) were read from disk; I did not confirm either still reflects production today, and neither can be re-measured here. |
| Anything about staging `ctshxbykuemeqnofqcdh` | No staging contact. Every ledger, wall-clock-substitution and hosted-digest claim (the 14 problems, `09c42928` vs `c70e119a`, the held state) is taken from banked receipts. |
| Whether the hosted round-trip divergence is fixed | It does not reproduce locally — I confirmed `restorationExact` and `reapplyDeterministic` both true. Whether it recurs hosted is unknowable without a hosted run. The author states this as a narrowing, which is correct. |
| Whether `verifyLedgerIdentity()` catches a real Management-API apply | Verified against synthetic ledger files only; I could not perform an apply through either prohibited mechanism. |
| That the 14 Jest failures fail identically at the merge base | Not executed at 21b2bd7a — that would require checking out or adding a worktree, which I judged out of bounds. Established instead by construction: no non-test source file under `src/` differs between the merge base and HEAD. |
| The account-deletion and photo-upload RPC surface | Those functions exist in neither the repo migration set nor the replayed catalog, so no local proof — mine or the author's — can speak about them. |
| FDA-028 behaviour | Only byte identity was in scope and it holds exactly. I ran no limiter behaviour tests. |

---

*Round-2 independent reviewer. No authorship of the reviewed corrections or of the round-1
review. Local PostgreSQL only; staging and production never contacted. All temporary
harnesses, probes and extracted trees were written outside the repository. No commit, no
push, no merge, no branch change; `git status --porcelain` empty and HEAD/tree unchanged at
exit (`a274b9dc…` / `a1aa31db…`). No secret reproduced.*
