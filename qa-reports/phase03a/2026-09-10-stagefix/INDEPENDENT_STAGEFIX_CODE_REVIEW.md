# Independent stage-fix code review — Phase 03A corrective increment

**Reviewer role:** independent. No authorship of Phase 03A, of the staging run, or of these
corrections. Read-only on the candidate; the two temporary negative controls I created were
restored and the tree verified clean.

**Candidate reviewed (frozen):**
- worktree `/Users/skypie/AccessMap-worktrees/flagstone-p03a-stagefix-20260910`
- `PHASE03A_STAGEFIX_CODE_SHA` `2e4a9a15dc2e271e33c2ca2dbae6a19b2cdd23d9` — confirmed by `git rev-parse HEAD`
- tree `c9cc1d110725664b1b979e7df68e3125e11d1e52` — confirmed by `git rev-parse HEAD^{tree}`
- branch `repair/flagstone-p03a-stage-mandatory-fixes-20260910`, working tree clean at start and at finish

**Containment:** no staging contact, no production contact, no network call to any Supabase
project. Every database observation below comes from a disposable local PostgreSQL 17.11
instance created and destroyed by `scripts/replay-migrations.mjs`, or from committed capture
artifacts read off disk. No push, no merge, no commit to the repair branch. No secret is
reproduced anywhere in this report.

---

# VERDICT

## ACCEPT WITH MANDATORY CHANGES

The increment does real work and several of its claims survived direct attack: the 242/242
pgTAP result is genuine and reproducible, the Stage A/B split is coherent and its
in-transaction negative control is load-bearing rather than decorative, the STAGE-MF-07
guard fails exactly as advertised when the defect is reintroduced, and FDA-028 is
byte-for-byte preserved so no prior FDA-028 review is reopened.

But two of the six items marked `CLOSED` are not closed, and I found one new
shipped-client breakage of the same class the increment exists to eliminate:

- **STAGE-MF-06 is incomplete.** The Stage A/B split fixes the *authenticated* Build 33 read
  paths and I could not break that half. It does not address the **`anon` (guest) role**,
  and Stage A revokes five SELECT grants that production holds today and that the shipped
  guest path uses. This is the same silent-degradation defect the acceptor raised as H1,
  one role over, and the new compatibility contract has zero anon coverage.
- **STAGE-MF-02's normalization can hide a real authorization change.** I constructed the
  collision R5 asked for: `proacl` NULL (PUBLIC may EXECUTE) and `proacl` `'{}'` (nobody
  may EXECUTE) produce an identical checksum and `diffCaptures` reports `identical: true`.
- **The Jest baseline claim is false at the frozen SHA.** Two independent full runs both
  give 15 failures in 13 suites, deterministically. The 15th is new and self-inflicted by
  this increment's own final commit.

None of this is unsafe *right now* — nothing has been applied anywhere and this increment
authorizes no mutation. It is not safe to carry into a staging rerun or a production apply
in its current state, because the Stage A set as frozen would degrade every guest session.

I am not recording REJECT: the structure of the work is sound, the reasoning is largely
honest and self-critical, and all five MUST-FIX items below are tractable without redoing
the increment.

---

# R1 — Count reconciliation honesty

**PASS.**

I read `qa-reports/phase03a/2026-09-10-stage/INDEPENDENT_STAGING_ACCEPTANCE.md` myself
rather than trusting the summary.

- The `# MUST-FIX` section (line 546 onward) contains **exactly five** numbered items.
- The `# SHOULD-FIX` section (line 570 onward) contains **exactly six** numbered items.

This matches `MUST_FIX_INVENTORY.json`'s `whatTheReviewerActuallyIssued`
(`MUST_FIX: 5, SHOULD_FIX: 6`) exactly. The author was told the prompt said eight, checked,
found the prompt wrong, and said so in writing instead of padding to eight. That is the
correct behaviour and it is recorded against the author's own interest.

I verified the union is defensible rather than a dodge:

| Source | Item | Maps to |
|---|---|---|
| Reviewer MUST-FIX 1 | committed link state → production | STAGE-MF-07 |
| Reviewer MUST-FIX 2 | Build 33 breakage as rollout constraint | STAGE-MF-06 |
| Reviewer MUST-FIX 3 | hosted concurrency receipt | closed before this run |
| Reviewer MUST-FIX 4 | carry apply-mechanism forward | STAGE-MF-01 |
| Reviewer MUST-FIX 5 | retain structural JSON + publish recipe | STAGE-MF-02 |
| Reviewer SHOULD-FIX 1 | rollback must unwind the ledger | STAGE-MF-08 (elevated) |
| Author-originated | — | STAGE-MF-03, -04, -05 |

4 open reviewer MUST-FIX + 1 elevated SHOULD-FIX + 3 author-originated = 8. I confirmed
reviewer MUST-FIX 3 was genuinely closed earlier: `OP_HOSTED_CONCURRENCY.json` exists in
`2026-09-10-stage/`. Nothing was invented to reach eight and nothing was dropped to reach
eight.

**One fairness gap.** Reviewer SHOULD-FIX 2–6 are not tracked anywhere in the eight-item
working set. SHOULD-FIX 3 is asserted "already corrected"; see SHOULD-FIX 4 below — it is
only half corrected.

---

# R2 — STAGE-MF-06, the FDA-026 Stage A/B split

**PASS on the numeric claim. PASS on the negative control. See R3 for the completeness failure.**

## What I ran

First I verified the pgTAP source before trusting anything built on it:

```
shasum -a 256 .../pgtap-968eb53a/sql/pgtap.sql
d4f9c8a4b0bfa6f2e29c751ab4deb79208e43f5935bab1948750b95bad3926b3
```

Matches the pinned value exactly. Then:

```
node scripts/replay-migrations.mjs --with-next --local-only --phase03a \
  --phase03a-pgtap-sql=<pinned pgtap.sql> --json
```

Exit 0. Extracted from the JSON myself rather than reading the author's summary:

| Suite | planned | executed | failed | skipped | todo | bailout |
|---|---|---|---|---|---|---|
| `promptb_media_key_guards.test.sql` | 25 | 25 | 0 | 0 | 0 | 0 |
| `phase03a-foundation.test.sql` | 113 | 113 | 0 | 0 | 0 | 0 |
| `phase03a-privileges.test.sql` | 79 | 79 | 0 | 0 | 0 | 0 |
| `build33-compat.test.sql` | 25 | 25 | 0 | 0 | 0 | 0 |
| **TOTAL** | **242** | **242** | **0** | **0** | **0** | **0** |

`localProofPassed: true`, `privilegeProofPassed: true`, `restorationExact: true`,
`reapplyDeterministic: true` — all four confirmed true in my own run. The count is not
inflated by skips or TODOs: both are zero across all four suites, and the executed count
equals the planned count everywhere.

## Attack 1 — is the compatibility suite testing the real shipped shapes?

I extracted the actual shipped trees rather than trusting the comments:

```
git archive f5594171e75bc5ec92a87d0392c361601ddedfba src/lib/admin.ts | tar -xO
git archive f5594171e75bc5ec92a87d0392c361601ddedfba src/lib/flags.ts | tar -xO
```

The shapes are faithfully represented, not paraphrased into convenience:

- `admin.ts:31` really is `.from('users').select('is_admin').eq('id', user.id).single()`.
- `flags.ts:1682` `listLeaderboard()` really selects `id, display_name, avatar_url, points`
  ordered by `points` descending with a limit — the test uses exactly that column list.
- `flags.ts:1702/1717` `getUserLeaderboardRank()` really is `select('points').eq('id',…)`
  followed by a head-count `.gt('points', userPoints)`.

Two honest deviations, neither material: the rank test hardcodes `points > 200` from its own
fixtures instead of reading the caller's points back first, and the comment-author test reads
`display_name` directly rather than through the PostgREST embed. Both are equivalent for the
privilege and policy question being asked.

One genuine correction to the *acceptor's* wording, which the author inherited into
`MUST_FIX_INVENTORY.json` as "break Build 33's admin gate (**hard, 42501**)": the shipped
`admin.ts` catches the error, `console.warn`s it, and degrades to `isAdmin = false`. The gate
fails closed and silently, it does not crash. The author's own Stage B migration header states
this correctly ("the shipped catch degrades to isAdmin=false"), so the author understood it
better than the phrase they carried forward. Cosmetic, listed under SHOULD-FIX.

## Attack 2 — is the Stage B negative control real, or could it pass vacuously?

It is real, and I can show it is not vacuous from the measurements themselves. The *same
query text* produces different answers on either side of the in-transaction cutover:

- Stage A: the shipped leaderboard shape returns `>= 3` rows. Stage B: the same shape
  returns exactly `1`.
- Stage A: the shipped `is_admin` read passes `lives_ok`. Stage B: the same statement
  raises `42501` under `throws_ok`.
- Stage A: another account's `display_name` resolves to `'B33 Admin'`. Stage B: `NULL`.

A vacuous control could not produce that 3→1 collapse; it proves RLS is genuinely enforced
for the `authenticated` role in the test session, and that the broad policy is what was
carrying the reads. The replacements (`list_public_leaderboard`, `get_my_leaderboard_rank`,
`current_user_can_admin`) are asserted to still work *after* the cutover, which is the
substantive claim.

I also checked the control is a faithful replica of the real cutover. The test executes:

```sql
DROP POLICY "users readable by authenticated" ON public.users;
REVOKE SELECT (is_admin) ON public.users FROM PUBLIC, anon, authenticated;
```

`supabase/migrations-next/phase03a/20260910120000_phase03a_fda026_stage_b_cutover.sql`
contains those two statements and nothing else operative. The replica is currently exact.
It is a *replica*, not an execution of the file, so it can drift; see SHOULD-FIX 1.

## Attack 3 — is the split coherent in the migrations themselves?

Reviewed `git diff 21b2bd7a..HEAD` over the migration and rollback set. The split is clean:
the two closing statements moved out of `20260905055633` into the new Stage B file; the
Stage A rollback correctly stops re-creating a policy it no longer drops (which would have
raised "policy already exists" and aborted the whole restoration); `20260905073925`'s
rollback now restores the `is_admin` grant its own forward migration removed rather than
depending on a neighbour. The compatibility grant in `20260905073925` is labelled inline,
names its removal migration, and is registered in `application-privileges.v1.json` with a
`stageACompatibilityRetentions` entry. That is good discipline and it is the only change to
the allowlist.

---

# R3 — Is the Stage A/B split COMPLETE?

**FAIL. This is MUST-FIX 1.**

This is where I spent most of the review, and it is where the increment breaks.

## Method

Rather than reading migrations and hoping to spot something, I computed the **effective
privilege delta** empirically from the before/after catalog captures produced by my own
replay run — combining table-wide grants and column-level grants so a table-wide revoke that
is replaced by an explicit column list is not counted as a loss.

## Result for the authenticated role — the split holds

- **Zero** column privileges lost by `authenticated` across the entire Stage A apply set.
- Every other shipped `public.users` read is an own-row read (`ProfileScreen.tsx:372`,
  `SettingsScreen.tsx:479`, `users.ts:56`, `users.ts:124`, `points.ts:95`), all `.eq('id', userId)`
  against the caller's own id, all preserved by the retained `users own row full select` policy.
- The only two effective SELECT losses for `authenticated` are `realtime_subscribe_log` and
  `users_self_email`. I grepped the shipped tree: neither is read by any shipped call site.

I could not break the authenticated half. That part of STAGE-MF-06 is genuinely closed.

## Result for the anon role — the split does not cover it

Stage A revokes `anon`'s SELECT outright on five relations, with **no** column-level or
`PUBLIC` fallback. I falsification-tested this specifically, because an inherited `PUBLIC`
grant would have made the finding wrong:

| Relation | kind | anon SELECT before | anon SELECT after Stage A |
|---|---|---|---|
| `public.flag_photos` | table | yes | **none** |
| `public.flag_comments` | table | yes | **none** |
| `public.flag_status_history_public` | **view** | yes | **none** |
| `public.flag_edit_history_public` | **view** | yes | **none** |
| `public.point_events` | table | yes | **none** |

**This is not a local-baseline artifact.** I confirmed it against the committed production
capture `supabase/contract/production-catalog-capture.v2.json`
(`target.projectRef: kldlwszpfkdmsjrjhjym`, captured 2026-09-05, read from disk — no network):
production's `anon` holds SELECT on all five of those relations **today**.

**`anon` is a live shipped role.** `src/screens/GuestProfile.tsx:45` states it plainly —
"The default state of every web session and native guest." Guests browse the map; the
retained `flags readable by anon` policy is what lets them.

**The shipped guest path hits these and throws.** Neither call is gated on `user`:

- `FlagDetailModal.tsx:411` calls `listFlagPhotos()` unconditionally when the modal opens.
  `photos.ts` deliberately **throws** every backend error — its own comment says a false-empty
  gallery on an evidence surface "is an active false statement". A guest currently sees an
  empty gallery; after Stage A the `42501` becomes `GALLERY_LOAD_FAILED_TEXT`.
- `useComments.ts:85` calls `listComments()`, which **throws** on any error that is not
  "relation missing". Guest comment view becomes an error state.
- `statusHistory.ts:73` reads `flag_status_history_public` and swallows all errors to `[]`,
  so the guest timeline silently becomes the "not yet enabled" placeholder. Both `_public`
  relations are **views with `rls_enabled: false`** — the grant was their only gate, so this
  is a genuine loss of visible data, not an error-vs-empty distinction.

For the three RLS-protected tables the change is narrower than it first looks: `anon` had no
SELECT *policy* on them before either, so those reads already returned zero rows. The change
there is empty-result → hard `42501`, which the shipped client converts into a visible error
banner. For the two views the loss is real data.

## Why this is a MUST-FIX and not a note

The acceptor's H1 finding, which STAGE-MF-06 exists to close, was precisely "this apply set
silently degrades shipped clients, and no assertion was written against what the shipped
client actually asks for." The remedy scoped itself to four authenticated call sites,
declared the split complete, and `build33-compat.test.sql` never once assumes the `anon`
role. The identical defect therefore survives in the guest path, on the primary content
surface, for every web session. The revocations are *declared* in
`application-privileges.v1.json` with reasons, so this is a deliberate design decision — but
it has never been surfaced as a Build 33 rollout constraint, which is exactly what reviewer
MUST-FIX 2 demanded.

**Honest bound on this finding:** I proved the privilege loss and traced the client code
paths by reading the shipped trees. I did **not** execute a shipped client against a Stage A
database — that would require a hosted target, which is out of bounds. The inference from
"anon has no SELECT" to "PostgREST returns 42501" to "`listFlagPhotos` throws" is a code
reading, not an end-to-end measurement.

## Adjacent observation, not charged against this increment

`service_role` loses effective privileges on 181 relation/privilege keys across Stage A,
including SELECT on `public.users`, `flags` DML, `flag_photos`, `flag_comments` and
`point_events`. This is declared design in `application-privileges.v1.json` (most relations
list `service_role: tablePrivileges: []`), it predates this increment, and the allowlist diff
versus `21b2bd7a` touches only the `is_admin` retention. I raise it because any server-side
component running as `service_role` — the `notify-flag-status` Edge Function among them —
sits inside that blast radius, and I saw no receipt proving those components were inventoried.
Recorded as SHOULD-FIX 2, not as a defect of this increment.

---

# R4 — STAGE-MF-01 / STAGE-MF-08 tooling

**PARTIAL — logic PASS, enforcement FAIL. This is MUST-FIX 4.**

```
npx jest scripts/__tests__/canonicalMigrationIdentity.test.ts   → PASS
```
All four new suites together: **36 passed, 36 total**, matching the claimed 3+3+19+11.

## Are the refusals real?

The logic is real, not cosmetic, and it is well-targeted at the failures actually observed.
`planApply()` refuses non-canonical filenames, missing `applyStage`, duplicate canonical
versions, on-disk hash mismatch, absent files, and a version already in the ledger under a
different name — and it sorts the plan by canonical version because these migrations are not
commutative. `canonicalIdentity()` derives version and name from the **filename**, never the
clock, which is the correct fix for the wall-clock substitution.

**Could a wall-clock apply slip past `verifyLedgerIdentity()`? No.** I traced both loops.
A Management-API-style apply records the candidate under a wall-clock version, so no row
exists at the canonical version, and the first loop reports `NO ledger row for canonical
version … (ledgerless apply)`. The second loop independently catches the substitution
signature (a row whose *name* matches a candidate but whose *version* does not). Both the
observed staging failure modes are caught, and by two paths for one of them.

One residual: `verifyLedgerIdentity()` compares version and name only. It does not compare
the applied statements against the reviewed bytes, so an apply of *different content* under
the *correct* canonical version would verify clean. `planApply()` hash-binds at plan time,
but nothing binds the plan to the apply.

## The enforcement failure

`scripts/canonical-migration-identity.mjs` has a `#!/usr/bin/env node` shebang and **no CLI
whatsoever** — no `process.argv` handling, no main. Running it does nothing. I grepped the
whole repo: outside its own Jest test, the only references are three lines of prose in
`STAGING_RERUN_AUTHORIZATION_PACKET.md`. Same for `scripts/structural-catalog.mjs`.

The packet at lines 60–61 instructs the operator:

> Before any apply, `scripts/canonical-migration-identity.mjs` `planApply()` must return
> `ok: true`. After any apply, `verifyLedgerIdentity()` must return `passed: true`.

**There is no command that does this.** The apply is a human running `supabase db push`;
nothing consults the planner, nothing gates on it, and nothing verifies afterwards. The
guard rail is a library with an unreachable API and a runbook sentence pointing at it. That
is materially weaker than `EIGHT_FIX_DISPOSITION.json`'s `"disposition": "CLOSED"` implies.

## Is the forward-only restoration model sound, or does it rename the problem?

The *model* is sound. The acceptor's finding was that a rolled-back database still claimed
six migrations were applied — the ledger asserted a fiction. Recording restoration as a new
forward migration makes the ledger read as truthful history (applied → deliberately undone →
re-applied) without deleting or rewriting a row, which would be history rewriting in
production. The refusal to backdate a restoration before the migration it undoes is a real
and correct invariant, and it is tested.

But the delivery **is** closer to renaming the problem than the disposition admits:

- `forwardRestorationName()` returns a **string**. It generates no SQL, reconciles no ledger,
  and is called by nothing.
- No artifact conforms to the model. The rollback files are still
  `supabase/migrations-next/phase03a/rollback/<version>_<name>.rollback.sql` — not canonical
  `<later-version>_restore_<name>.sql` migrations. Applying them through the supported
  mechanism is therefore still impossible, so the exact defect the acceptor found (ledger
  rows surviving a rollback) would recur unchanged on the next rehearsal.

STAGE-MF-08's acceptance proof asked for "a proven forward-only restoration model where the
ledger's answer to 'what happened?' matches actual historical execution." A naming helper
plus a prose description is not that.

---

# R5 — STAGE-MF-02 capture harness and its normalization

**FAIL. This is MUST-FIX 2.**

```
npx jest scripts/__tests__/structuralCatalog.test.ts   → PASS (11 tests)
```

The responsive parts are real. `CATALOG_SQL` is published verbatim in the file, so the recipe
is reproducible by someone other than its author — that was reviewer MUST-FIX 5's actual ask.
`writeCapture()` writes the full normalized catalog to `CATALOG_<label>.json` and only then
computes the checksum, which fixes "hashed it and threw the content away". `VOLATILE_FIELDS`
carries a written justification per exclusion, and both exclusions (`oid`, planner statistics)
are defensible.

## The attack R5 asked for

I ran an adversarial battery against `normalizeAcl`. The set-ification is sound on every
axis I could think of — a privilege added, a grantor changed, a grant option added, a PUBLIC
entry appearing, an explicit owner ACL versus none: **all correctly DIFFER**. Pure reordering
correctly collides, which is the intended behaviour and does neutralise the acceptor's
leading hypothesis for the hosted divergence.

**But I found a genuine false negative.**

`CATALOG_SQL` uses `coalesce(<acl>::text, '')` on `relacl`, `attacl`, `proacl`, `nspacl` and
`defaclacl`. That conflates two states PostgreSQL treats as entirely different:

- **`NULL` ACL** = *default* privileges. For a function, `proacl IS NULL` means **`EXECUTE`
  is granted to `PUBLIC`**.
- **`'{}'` ACL** = all privileges explicitly revoked from everyone, owner included. For a
  function this means **nobody may EXECUTE it**.

`normalizeAcl('')` and `normalizeAcl('{}')` both return `[]`, so the two states are
indistinguishable downstream. Confirmed at the checksum level, not merely in the parser:

```
PUBLIC-can-execute checksum : 82356785e9d7223861c8998b50497e2a2fc56ae2076beeb7e1251030323bde14
nobody-can-execute checksum : 82356785e9d7223861c8998b50497e2a2fc56ae2076beeb7e1251030323bde14
>>> COLLISION
```

`diffCaptures()` compares the same normalized entries, so it reports `identical: true` and
`residualCount: 0` for this pair — and `functions` is on its own
`securityRelevantSections` list, so this is precisely the class of residual the harness
promises never to suppress.

The dangerous direction is not the restrictive one. If a function's `proacl` goes from `'{}'`
to `NULL`, **`PUBLIC` silently regains `EXECUTE` on it** and this harness certifies the two
catalogs as structurally identical. That is a real authorization regression rendered
invisible by the tool built to detect authorization regressions.

This directly contradicts the module's own stated contract — "NOTHING structural is
excluded", "It must also never hide a real one" — and `EIGHT_FIX_DISPOSITION.json`'s
"Nothing structural is excluded; only oid and planner statistics are". A third exclusion
exists, it is undeclared, it is security-relevant, and no test covers it. Per the review
instruction, a constructed collision between genuinely different privilege states is a
MUST-FIX.

**Secondary parser defect.** `normalizeAcl` splits on `,` before stripping quotes, so a
quoted role name containing a comma is destroyed:
`{"weird,role=r/postgres",anon=r/postgres}` normalizes to
`["anon=r/postgres","role=r/postgres","weird"]` — a fabricated grantee and a lost one. Not
reachable with Supabase's current role names, so SHOULD-FIX rather than MUST-FIX, but it is
silent corruption rather than a refusal.

---

# R6 — STAGE-MF-07 and STAGE-MF-04 guards, by negative control

**PASS on both negative controls. One overclaim, recorded as MUST-FIX 5.**

## STAGE-MF-07 — did the author repoint at staging, or actually untrack?

**Actually untracked.** `supabase/.temp/linked-project.json` and `supabase/.temp/cli-latest`
are deleted from the index in commit `235743a`, and `.gitignore` gained `supabase/.temp/`
with a comment explaining why repointing would only swap one stale dangerous target for
another. No tracked file was repointed at staging.

**Negative control, executed:**

```
printf '{"ref":"<production ref>"}' > supabase/.temp/linked-project.json
git add -f supabase/.temp/linked-project.json
npx jest src/__tests__/projectTargetSafety.guard.test.ts
→ Tests: 3 failed, 3 total
```

All three assertions fail when the defect is reintroduced. Restored with
`git rm --cached` + file removal; `git status --porcelain` empty, `HEAD` and tree hash
unchanged, guard back to 3 passed.

The third assertion fails by throwing (`git show HEAD:…` on a staged-but-uncommitted path)
rather than by a clean assertion — it fails, but for an incidental reason. Noted as
SHOULD-FIX 3 along with the narrowness of its `selectorLike` regex, which only inspects
`supabase/.temp/**` and `*/.supabase/**` JSON/TOML/YAML. I checked `supabase/config.toml`
— it is tracked but carries **no** `project_id`, so the gap is latent rather than live.

## STAGE-MF-04 — webhook target coupling

**Negative control, executed:** I added a scratch migration containing a second hardcoded
`https://<20-char ref>.supabase.co/functions/v1/…` URL. The enumeration assertion failed and
named the injected file. Scratch file removed; `git status --porcelain` empty.

The guard works. But it does not do what the item's own acceptance proof required.
`MUST_FIX_INVENTORY.json` states the acceptance proof for STAGE-MF-04 is:

> A test proving the trigger cannot aim a non-production database at the production Edge
> Function, **or** an explicit recorded owner decision to accept it.

The delivered test proves neither. It asserts that the coupling **still exists** (deliberately
— the adoption premise requires the repo to match production), that the fail-closed early
return precedes `net.http_post`, and that no *new* hardcoded URL has appeared. The actual
safety property rests on an operational rule stated in prose — never create `webhook_secret`
on a non-production target — which nothing enforces. That is the second option, an accepted
residual risk, and it should be routed to the owner exactly as STAGE-MF-03 and STAGE-MF-05
were. Instead it is marked `"disposition": "CLOSED"`. See MUST-FIX 5.

I also note the enumeration regex requires the `/functions/v1/` path segment, so a hardcoded
`https://<ref>.supabase.co/rest/v1/…` or Storage URL would not be caught (SHOULD-FIX 3).

---

# R7 — FDA-028 preservation

**PASS.** Computed independently.

```
shasum -a 256 supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql
8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771

shasum -a 256 .../rollback/20260909120000_fda028_v4_limiter.rollback.sql
eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302
```

Both match the accepted `8d1cc7e1…` / `eded3c9f…` exactly, and both match the values declared
in `candidate-contract.json`.

The test directory is byte-identical by tree hash, which is stronger than a file-by-file diff:

```
git rev-parse 21b2bd7a…:supabase/tests/fda028  → 04fec65effb8b347ae4e00dcbc3e7060672fe9cb
git rev-parse HEAD:supabase/tests/fda028       → 04fec65effb8b347ae4e00dcbc3e7060672fe9cb
```

`git diff --stat 21b2bd7a..HEAD` over `supabase/tests/fda028/` and both limiter artifacts is
empty. Six rounds of prior FDA-028 review are not reopened. The author's claim here is
accurate and I found nothing to qualify.

---

# R8 — Jest baseline honesty

**FAIL. This is MUST-FIX 3.**

I ran the full suite twice, independently, at the frozen SHA.

| Run | Suites failed | Tests failed | Todo | Passed | Total |
|---|---|---|---|---|---|
| My run 1 | 13 | **15** | 32 | 4239 | 4286 |
| My run 2 | 13 | **15** | 32 | 4239 | 4286 |
| Author run 1 | 13 | 15 | 32 | 4239 | 4286 |
| Author run 2 | 12 | **14** | 32 | 4240 | 4286 |

**Both of my runs produced identical results.** There is no flake at this SHA — the 15th
failure is deterministic, and I reconciled it by exact name.

My 13 failing suites are the author's 12 inherited suites plus one:
**`src/__tests__/noCredentialsInTree.guard.test.ts`**, contributing exactly one failing
assertion (`C · no tracked file carries a credential-shaped literal next to account
language`). Removing it gives 12 suites / 14 tests — an exact match to the stated baseline.
So inherited = 14 in 12 suites, and the 15th is new.

**The 15th failure is caused by this increment's own artifact.** The guard names
`qa-reports/phase03a/2026-09-10-stagefix/STAGING_RERUN_AUTHORIZATION_PACKET.md:154`.

I inspected that line under redaction. **It is not a leaked credential** — it is the Vault
secret's *name* (a 24-character lower+digit+underscore identifier) sitting next to the word
"secret", which trips the guard's heuristic. No secret value is exposed, and no security
incident exists. But the guard has an allowlist mechanism, with its own test D asserting
every allowlist entry still corresponds to a live finding, and it was not used.

**Why the claim is false rather than merely unlucky.** `git log` shows
`STAGING_RERUN_AUTHORIZATION_PACKET.md`, `LOCAL_ACCEPTANCE.json` and
`EIGHT_FIX_DISPOSITION.json` all landed in the **same** commit, `435cd4a`. The author ran
Jest, then wrote the packet that breaks the guard, then shipped the acceptance claim
alongside it without re-running. So `LOCAL_ACCEPTANCE.json`'s

> Run 2 reproduces the inherited 14 failures BY EXACT NAME and nothing else.

is not true of the artifact it is packaged inside. This is staleness, not fabrication — but
a "baseline honesty" claim that was never re-verified against the final tree is exactly the
claim that must hold.

**On the `useUserLocation` flake call specifically — I credit the author.** Being fair to a
finding that cuts the author's way: `src/lib/__tests__/useUserLocation.permission.test.tsx`
passes 10/10 in isolation for me, and did not fail in either of my full runs. Nothing in this
increment touches location or permission code. The flake diagnosis is defensible and was
recorded rather than quietly dropped, which is the right instinct. The author's error is not
the flake call — it is concluding from it that the tree was clean, and never re-running after
the final commit.

---

# R9 — Overclaims, vacuity, and anything else

1. **`EIGHT_FIX_DISPOSITION.json` marks six items `CLOSED`.** On my evidence, four are
   genuinely closed (MF-01 as logic, MF-06 for `authenticated`, MF-07, MF-08 as a model);
   **MF-02 and MF-06 are not**, and **MF-04 does not meet its own acceptance proof**.
2. **"242/242" is real but should not be read as broader assurance than it is.** The +25 is
   entirely `authenticated`-role coverage. The suite contains zero `anon` assertions, which
   is precisely how R3's finding survived a green run — the same structural blind spot that
   let 217 hosted assertions pass while every shipped client broke.
3. **`MUST_FIX_INVENTORY.json` inherits the acceptor's "hard, 42501" wording** for the admin
   gate. The shipped client catches it and degrades silently. The author's Stage B header
   gets this right, so the two artifacts disagree with each other.
4. **The narrowing claim about the hosted divergence is stated correctly.** "The LOCAL round
   trip is exact … the hosted divergence does NOT reproduce locally … stated as a narrowing,
   not as a diagnosis" — I reproduced `restorationExact: true` and `reapplyDeterministic: true`
   myself, and the claim is appropriately bounded. Good practice, noted in the author's favour.
5. **Reviewer SHOULD-FIX 3 is only half corrected.** `OP_RESTORE_REAPPLY.json` line 74 still
   contains the sentence "No production target was ever reachable from the linked ref."
   in place and unmarked; a `retractedText` field at line 90 retracts it separately. A reader
   of line 74 still reads the false statement. `OPERATION_STATE: VERIFIED` /
   `RESTORATION_REHEARSAL: PASS` / `REAPPLY_REHEARSAL: PASS` still sit above the recorded
   round-trip FAIL.
6. **No vacuous passes found in the pgTAP suites.** Zero skipped, zero TODO, zero bailouts,
   `executed == planned` in all four suites; the Stage A/Stage B divergence in measured
   results rules out a control that cannot fail.

---

# MUST-FIX

1. **Stage A silently degrades shipped guest (`anon`) reads — STAGE-MF-06 is not complete.**
   Stage A revokes `anon` SELECT on `flag_photos`, `flag_comments`,
   `flag_status_history_public`, `flag_edit_history_public` and `point_events`. Production
   holds all five today (verified against `production-catalog-capture.v2.json`). `anon` is
   the default role for every web session and native guest
   (`GuestProfile.tsx:45`). `FlagDetailModal.tsx:411` → `listFlagPhotos()` throws;
   `useComments.ts:85` → `listComments()` throws; `statusHistory.ts:73` degrades silently, and
   the two `_public` relations are views with no RLS, so that one is real data loss. Either
   add `anon` compatibility retentions to Stage A and move these revokes to the Stage B
   cutover, or record the guest-surface degradation as a first-class Build 33 rollout
   constraint in front of the owner alongside the authenticated one. Extend
   `build33-compat.test.sql` with `SET LOCAL ROLE anon` coverage of the shipped guest shapes —
   its absence is what let this through a 242/242 run.

2. **`structural-catalog.mjs` can hide a real authorization change.** `coalesce(acl::text,'')`
   conflates a `NULL` ACL (default privileges — for functions, `EXECUTE` to `PUBLIC`) with
   `'{}'` (all privileges revoked from everyone). Both normalize to `[]` and produce an
   identical checksum; `diffCaptures()` reports `identical: true`. A function whose `proacl`
   moves from `'{}'` to `NULL` silently re-grants `PUBLIC EXECUTE` and this harness certifies
   the catalogs as structurally identical. Distinguish the two states in `CATALOG_SQL`
   (emit a sentinel for `NULL` rather than `''`), add a test asserting they do not collide,
   and correct the "nothing structural is excluded" claim in the module header and in
   `EIGHT_FIX_DISPOSITION.json`.

3. **The Jest baseline claim does not hold at the frozen SHA.** Two independent full runs give
   15 deterministic failures in 13 suites, not 14 in 12. The 15th is
   `noCredentialsInTree.guard.test.ts` firing on this increment's own
   `STAGING_RERUN_AUTHORIZATION_PACKET.md:154`. It is a guard false positive on a secret
   *name*, not a leaked value — but it is a real new failure. Add the allowlist entry (or
   rephrase the line), re-run the full suite against the final tree, and correct
   `LOCAL_ACCEPTANCE.json`'s "nothing else" statement.

4. **The STAGE-MF-01 / STAGE-MF-08 tooling cannot be run.** Neither
   `scripts/canonical-migration-identity.mjs` nor `scripts/structural-catalog.mjs` has a CLI
   entrypoint, and nothing outside Jest imports either. The packet instructs an operator to
   make `planApply()` return `ok: true` before any apply and `verifyLedgerIdentity()` return
   `passed: true` after — there is no command that does either. Add real entrypoints (and an
   npm script), and either produce rollback artifacts that conform to the forward-only naming
   model or state plainly that STAGE-MF-08 delivers a model and a naming guard, not a
   reconciled ledger.

5. **STAGE-MF-04 is marked `CLOSED` without meeting its own acceptance proof.** The proof
   required either a test proving a non-production database cannot be aimed at the production
   Edge Function, or an explicit recorded owner decision. The delivered guard asserts the
   coupling and the fail-closed path; the actual protection is an unenforced prose rule
   ("never create `webhook_secret` on a non-production target"). Reclassify to
   `OPEN — OWNER DECISION` alongside STAGE-MF-03 and STAGE-MF-05.

---

# SHOULD-FIX

1. **Bind the Stage B negative control to the Stage B file.** `build33-compat.test.sql`
   re-types the two cutover statements. They match exactly today, but the replica can drift
   from `20260910120000_phase03a_fda026_stage_b_cutover.sql` without any test noticing.
2. **Inventory the `service_role` blast radius.** Stage A removes 181 effective
   relation/privilege keys from `service_role`, including SELECT on `public.users` and
   `flag_photos`/`flag_comments`/`point_events`. Declared design and pre-existing, but I saw
   no receipt confirming the Edge Functions and any server-side jobs were checked against it.
3. **Widen the two target-safety guards.** `projectTargetSafety` only inspects
   `supabase/.temp/**` and `*/.supabase/**` JSON/TOML/YAML and only greps the production ref —
   it would miss a `project_id` added to `supabase/config.toml` (tracked, currently clean) and
   ignores `candidate-contract.json`'s `stagingProjectRef`. Its third assertion fails by
   throwing rather than asserting. The webhook enumeration regex requires `/functions/v1/`,
   so a hardcoded `/rest/v1/` or Storage URL would pass.
4. **Finish reviewer SHOULD-FIX 3.** `OP_RESTORE_REAPPLY.json:74` still carries the retracted
   sentence in place; the retraction lives separately at line 90. Strike or annotate it
   in situ, and qualify the three `PASS`/`VERIFIED` headers that sit above the round-trip FAIL.
5. **Fix `normalizeAcl`'s quoted-role parsing.** It splits on `,` before stripping quotes, so
   a role name containing a comma is silently corrupted into fabricated and lost grantees.
   Not reachable with current Supabase role names, but it corrupts rather than refuses.
6. **Correct the inherited "hard, 42501" wording** in `MUST_FIX_INVENTORY.json` for
   STAGE-MF-06. The shipped `admin.ts` catches the error and degrades to `isAdmin = false`;
   the loss is silent, not hard. The Stage B migration header already states this correctly.
7. **Track reviewer SHOULD-FIX 2, 4, 5 and 6.** They appear nowhere in the eight-item working
   set and have no recorded disposition.
8. **Pre-existing, out of scope, still open:** `phase03a-fixtures/baseline-backups.sql` is
   missing a `PGTAP_KIND` marker. The author correctly identified this as pre-existing and did
   not fix it; recorded so it is not lost.

---

# What I could NOT verify, and why

| Item | Why not |
|---|---|
| That a shipped Build 33 guest client actually errors against a Stage A database | Requires a hosted target running Stage A. Out of bounds. MUST-FIX 1 rests on a measured privilege loss plus a reading of the shipped call sites, not an end-to-end client run. |
| Anything about production `kldlwszpfkdmsjrjhjym` beyond the committed capture | No production contact permitted. `production-catalog-capture.v2.json` was read from disk; I did not confirm it still reflects production as of today (it is stamped 2026-09-05). |
| Anything about staging `ctshxbykuemeqnofqcdh` | No staging contact permitted. Every ledger, wall-clock-substitution and hosted-digest claim (the 14 problems, `09c42928` vs `c70e119a`, the held state) is taken from banked receipts I could not re-measure. |
| Whether the hosted round-trip divergence is fixed | It does not reproduce locally, which I confirmed. Whether it recurs hosted is unknowable without a hosted run — the author states this correctly as a narrowing. |
| That `verifyLedgerIdentity()` catches a real Management-API apply | I verified the logic against synthetic ledgers only; I could not perform an actual apply through either prohibited mechanism. |
| Whether the author's run 2 (14 failures) ever existed as described | Not reproducible after the fact. My reconstruction from `git log` — Jest run, then packet written, then both committed together in `435cd4a` — is inference from commit contents, not a record of what was executed. |
| The `service_role` blast radius against live Edge Function behaviour | Requires a hosted target and the function's runtime role. Assessed statically from the capture and the allowlist. |
| FDA-028 behaviour | Only byte identity was in scope and it holds exactly. I ran no limiter behaviour tests and make no claim about them. |

---

*Independent reviewer. No authorship of the reviewed corrections. Local PostgreSQL only;
staging and production never contacted. Two temporary negative controls were created and
removed; `git status --porcelain` empty and `HEAD`/tree unchanged at exit. No commit, no push,
no merge. No secret reproduced.*
