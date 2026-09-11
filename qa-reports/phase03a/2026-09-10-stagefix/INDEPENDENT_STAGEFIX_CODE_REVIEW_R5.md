# Independent stagefix code review — ROUND 5

**Candidate** `e89d53deb2f0f003a7626c53f6cc8222fca69c3f` · tree `e49f462a7cb880792235e9538ddd4a14b9416252`
**Worktree** `/Users/skypie/AccessMap-worktrees/flagstone-p03a-stagefix-20260910`
**Adjudicating** `INDEPENDENT_STAGEFIX_CODE_REVIEW_R4.md` (one MUST-FIX, three parts)
**Date** 2026-09-10 · reviewer: independent, no authoring stake in this increment

> Source at `e89d53de` is byte-identical to `06088bec` apart from a qa-reports receipt, so
> every code claim below is a claim about `06088bec`. Verified: `git diff 06088bec e89d53de
> --stat` touches only `qa-reports/phase03a/2026-09-10-stagefix/`.

---

# VERDICT: **PASS**

Round 4's single MUST-FIX had three parts. All three are satisfied, and I verified each with
my own evidence rather than against the author's account:

- **(a)** the false strength claim is *withdrawn*, not annotated, in both the module and the
  owner-facing JSON, and a test now pins the withdrawal so it cannot silently regress;
- **(b)** both gaps round 4 demonstrated are closed **against a live PostgreSQL 17.11** —
  I reproduced the escalations and confirmed the checksum now moves;
- **(c)** the SQL-text check is genuinely section-scoped; I replicated its slicing
  independently and drove three negative controls through it, including the cross-section
  plant that the old whole-file check would have passed.

I then did what round 4 said it could not: I hunted a **sixth-generation collision, and found
one** — `anon` moves from `permission denied for table users` to a successful read with a
**bit-identical checksum, 0 residuals and an empty `securityRelevantSections`**. Under rounds
1–3 that would have been a MUST-FIX, because the artifact claimed a property the collision
falsified. **It is not one now, and that is the whole point of this increment**: the claim it
would contradict has been withdrawn, and the module's own `Known-uncaptured` clause —
"anything reachable only through catalog state this query does not read" — already covers it
in advance. A tool that says "this list is certainly incomplete" is not defeated by a sixth
example; it is confirmed by one. I am recording the collision as evidence that the withdrawal
was correct, not as a defect, and I explicitly decline to open a sixth generate-and-patch
round, which round 4 also pushed back on.

**MUST-FIX: none.** Four SHOULD-FIX, all evidence-layer, all smaller than round 4's. The
largest is a residual sentence of the *same species* as the two withdrawn claims that the
author did not sweep — see Y1(iii).

---

# Y1 — The withdrawn completeness claim. **PASS, with one residual of the same species (SHOULD-FIX 1).**

## (i) Is the claim withdrawn in both artifacts? YES, and replaced rather than annotated.

Round 4 cited two sentences. Both are gone from the tree:

```
$ grep -rn -i "behavioural collision\|behavioral collision" scripts/ supabase/ \
      qa-reports/phase03a/2026-09-10-stagefix/*.json \
      qa-reports/phase03a/2026-09-10-stagefix/STAGING_RERUN_AUTHORIZATION_PACKET.md
  (no matches)
```

- **`scripts/structural-catalog.mjs`** — the old clause *"…and a surface with a test that
  does not actually detect its change fails too"* is deleted. In its place, lines 58-88 carry
  a section headed `WHAT THE DERIVED TESTS ACTUALLY PROVE — read this before trusting the
  registry`, which states the tests feed **synthetic** objects, prove only that the
  *comparator* reacts, and "do NOT execute CATALOG_SQL and do NOT touch a database, so they
  do NOT prove the CAPTURE actually populates that field from the catalog, nor that the field
  is the right one." It then names round 4's own `functions.body` counter-example by name and
  concludes: *"this registry is a REVIEW AID and a regression net, NOT a completeness
  guarantee."*
- **`EIGHT_FIX_DISPOSITION.json:23`** (owner-facing) — the phrase *"each of which has a
  behavioural collision test"* is **removed from the field value**, not sidecar-annotated. The
  replacement carries the same synthetic/does-not-execute language and adds:
  *"TWO completeness claims about this file have now had to be withdrawn … The pattern is the
  lesson: do not assert completeness about a capture; assert what was demonstrated."*

This is the right shape of remedy. Round 3 objected to a `round2Correction` sibling key
standing beside an uncorrected value; that dodge is not repeated here.

## (ii) Does a test pin the honesty? YES, and it is a real pin, not a tautology.

`scripts/__tests__/structuralCatalog.test.ts` gains `states its own limits rather than
claiming completeness`, which reads the module **source off disk** and requires four literal
phrases to survive: `do NOT execute CATALOG_SQL`, `NOT a completeness guarantee`,
`Known-uncaptured`, `auth and vault`. Deleting the honest paragraph fails the suite.

I checked it is not vacuous in the way round 4 found the *derived* tests to be: it reads the
real file via `fs.readFileSync(path.join(root,'scripts','structural-catalog.mjs'))`, and the
`constant()` helper loads the real module in a child Node process (`execFileSync(process.execPath,
['--input-type=module', …], {cwd: root})`) rather than a jest mock. The assertions are against
the shipped bytes.

## (iii) Is the NEW wording accurate, or has it swung into a different misstatement?

I checked the new text sentence by sentence against measurement. Two observations, one
harmless and one that matters:

**Harmless.** The header now opens *"Four review rounds found eleven collisions here, every
one by naming a surface nobody had captured."* Strictly, round 4's two are a different
failure mode: `functions.body` **was** captured and `roles.memberof` **was** captured — each
was captured *unfaithfully* (empty `prosrc`; membership without its options) rather than
absent. The sentence flattens "surface absent" and "surface present but hollow" into one. It
is defensible read as "closed by naming a surface (`sqlbody`) nobody had captured", and the
distinction it elides is stated explicitly fifteen lines later — *"nor that the field is the
right one"*. **Not a finding.** I record it only because the brief asked whether the new
wording has itself swung wrong, and this is the closest thing I found in the new text.

**It matters — and it is the third one.** The author swept the two sentences round 4 cited
and did **not** sweep a third sentence of the same species that survives in both the module
and the owner-facing JSON:

```
scripts/structural-catalog.mjs:43
    *   EXCLUDED: only VOLATILE_FIELDS, each with a written justification.

EIGHT_FIX_DISPOSITION.json:23
    "… Only oid and planner statistics are excluded, each with a written justification."
```

Read literally, "only X is excluded" is a completeness claim about everything that is not X —
the identical grammatical move as "NOTHING structural is excluded" (withdrawn rounds 2-3) and
"a surface whose test does not detect its change fails too" (withdrawn round 4). And I
falsified it in Y2 below: I moved `anon` from `permission denied for table users` to a
successful read through catalog state that is neither `oid` nor a planner statistic, at a
**bit-identical checksum**.

**Why this is SHOULD-FIX and not MUST-FIX.** Three things defuse it, and I weighed each:

1. In the JSON the sentence is preceded by *"Scope is BOUNDED and declared: CAPTURED_SCHEMAS
   … and the AUTHORIZATION_SURFACES registry"* and followed, two sentences later, by *"NOT a
   completeness guarantee"* and *"do not assert completeness about a capture"*. An owner
   reading the field cannot come away believing the capture is total; the field argues
   against itself in the honest direction.
2. Under the charitable reading — "of the fields this query does read, the only ones dropped
   before hashing are oid and planner stats" — it is a true statement about `VOLATILE_FIELDS`
   and nothing more.
3. The module's own `Known-uncaptured` clause already covers my collision **in advance**:
   *"anything reachable only through catalog state this query does not read."* That is
   exactly what I exploited.

So the artifact does not put a *false* statement in front of the owner; it puts a
*carelessly-phrased* one next to three correct ones. Given that this exact grammatical
pattern has now cost three rounds, it is worth one more edit — but it does not block.

---

# Y2 — The two demonstrated gaps, and the scoping fix. **PASS on all three, measured live.**

**Rig.** A disposable socket-only PostgreSQL **17.11 (Homebrew)**, `initdb --auth=trust`, port
5599, no TCP listener, created for this review and destroyed after it. No staging or
production project was contacted; `ctshxbykuemeqnofqcdh` and `kldlwszpfkdmsjrjhjym` were never
resolved, referenced in a connection string, or typed into a tool. The capture query came from
`node scripts/structural-catalog.mjs sql` — the shipped `CATALOG_SQL`, 69 lines — and every
capture went through the shipped `capture` CLI.

Seed: roles `anon / authenticated / service_role / authenticator` plus a `privileged_reader`;
schemas `private / storage / limiter`; `public.users` owned by `postgres` with one row and
`SELECT` granted only to `privileged_reader`; a **SQL-standard `BEGIN ATOMIC`** SECURITY
DEFINER function `public.is_admin(int)`; and `GRANT privileged_reader TO anon WITH INHERIT
FALSE`. Baseline: `anon` is denied.

## Y2(a) — `BEGIN ATOMIC` body inversion now changes the checksum. **PASS.**

First, the premise round 4 asserted, confirmed on my own instance:

```
select coalesce(prosrc,'<null>'), pg_get_function_sqlbody(oid) is null, md5(coalesce(prosrc,''))
  from pg_proc where proname='is_admin';
 -> ''  |  f  |  d41d8cd98f00b204e9800998ecf8427e      <- md5 of the empty string
```

`prosrc` really is empty for such a body, so the old `md5(coalesce(prosrc,''))` really did
collide with itself. Now invert the function's meaning:

```
select public.is_admin(1);                                      -> f
create or replace function public.is_admin(uid int) returns boolean
  language sql security definer set search_path = public
  begin atomic select true; end;
select public.is_admin(1);                                      -> t     <- inverted
select md5(coalesce(prosrc,'')) from pg_proc …;  -> d41d8cd98f00b204e9800998ecf8427e  (UNCHANGED)
```

Capture and diff through the shipped CLI:

```
identical:      false
firstChecksum:  5d6b95c5…d2fe
secondChecksum: a3be35bb…62d2
residualCount:  2
residuals[0].functions:  body: d41d8cd9…  sqlbody: d889052504e17ff0d14fbaf306936913
residuals[1].functions:  body: d41d8cd9…  sqlbody: 24f5afe3e5002259e68b5a8b59d1fc15
securityRelevantSections: ["functions"]
```

`body` is byte-identical on both sides — round 4's gap is visible in my own residual — and the
new `sqlbody` field is the **only** thing carrying the difference. The gap is closed by the
field the author added, not incidentally by something else.

## Y2(b) — `pg_auth_members` membership options now change the checksum. **PASS, with the behavioural half reproduced.**

```
grant privileged_reader to anon with inherit true;      -- membership itself UNCHANGED
select roleid::regrole, admin_option, inherit_option, set_option
  from pg_auth_members where member='anon'::regrole;
 -> privileged_reader | f | t | t

set role anon; select count(*) from public.users;
  BEFORE -> ERROR:  permission denied for table users
  AFTER  -> 1                                            <- real escalation, not a proxy
```

```
identical:      false
residualCount:  2
roles / only-in-first :  memberof "privileged_reader:a=false,i=false,s=true"
roles / only-in-second:  memberof "privileged_reader:a=false,i=true,s=true"
securityRelevantSections: ["roles"]
```

Every other field of the `anon` role entry is byte-identical across the two residuals. The
member set is identical on both sides; only `i=` moves, and the checksum moves with it. The
round-4 escalation is captured.

**Isolation control.** I reverted `inherit` to `false` and re-captured before testing (a):
`identical: true`, `residualCount: 0`, checksum back to `5d6b95c5…d2fe`. So neither result is
contaminated by the other, and the capture is stable under a no-op round trip.

## Y2(c) — the SQL-text check is genuinely section-scoped. **PASS, verified independently and with negative controls.**

`npx jest scripts/__tests__/structuralCatalog.test.ts` → **42 passed, 42 total** (the author's
"42/42 on the harness" is exact).

I did not take the test's own pass as evidence that its *slicing* is right. I re-implemented
the anchoring in a standalone script against the real `CATALOG_SQL` and printed the boundaries:

```
schemas  [ 111, 347)  acl:IN
relations[ 347, 869)  acl:IN rls:IN forcerls:IN reloptions:IN
columns  [ 869,1541)  acl:IN default:IN
functions[1541,2370)  acl:IN secdef:IN config:IN owner:IN body:IN sqlbody:IN
policies [2370,2755)  qual:IN roles:IN
triggers [2755,3236)  enabled:IN when:IN
roles    [3236,4177)  bypassrls:IN memberof:IN super:IN
defaultAcls[4177,4648) acl:IN
```

The slices are contiguous, monotone, non-overlapping and cover the query. **The anchoring is
correct, and the author's account of why it is needed is correct**: the line-initial
`/^  'roles',/m` anchor matches the top-level `roles` section at 3236 and does **not** match
`'roles', roles::text` inside the policies object at six-space indent — which is exactly what
would have truncated the `policies` slice to before `'qual'` under a bare `indexOf`.

**Negative controls — does a removed field in its own section still fail?** Three mutations of
`CATALOG_SQL`, run through the same logic:

| Control | Mutation | Result |
|---|---|---|
| NC0 | unmodified | **PASS** (baseline) |
| NC1 | delete `'qual', coalesce(qual,''),` from `policies` | **FAIL: policies.qual** |
| NC2 | delete it from `policies` **and plant `'qual'` inside `triggers`** | **FAIL: policies.qual** |
| NC3 | delete `'owner', pg_get_userbyid(p.proowner),` from `functions` | **FAIL: functions.owner** |

NC2 is the one that matters: the **old** whole-file check would have passed it. NC3 is round
4's specific complaint (`functions.owner` satisfied by the `'owner'` in `schemas` /
`defaultAcls`) and it now bites. The check is scoped, not merely reworded.

**What it still is not.** It remains a *text-presence* check inside a slice — it cannot show
the field is populated correctly, only that its name occurs in the right region. That is
precisely what the module now says, so this is a limitation correctly declared, not an
overclaim.

## Y2(d) — a SIXTH-generation collision. **FOUND — and it does not reopen anything.**

The brief asked me to try to construct one. I did, in about twenty minutes:

```
create role mid_role nologin;
grant mid_role to anon with inherit true;     -- BASELINE. mid_role holds nothing.
set role anon; select count(*) from public.users;
  -> ERROR:  permission denied for table users
[capture SIX_BEFORE]

grant postgres to mid_role with inherit true; -- anon is NOT touched
set role anon; select count(*) from public.users;
  -> 1                                         <- anon now reads it
[capture SIX_AFTER]

$ node scripts/structural-catalog.mjs diff --first …SIX_BEFORE.json --second …SIX_AFTER.json
  identical:                 true
  firstChecksum:             24916555ea07820900a741ac394f5f58a9699aeb4b2807f6efdd04978ba26268
  secondChecksum:            24916555ea07820900a741ac394f5f58a9699aeb4b2807f6efdd04978ba26268
  residualCount:             0
  residuals:                 []
  securityRelevantSections:  []
  OK: captures are structurally identical.
```

**Mechanism.** `CATALOG_SQL` closes the `roles` subquery with
`where r.rolname in ('anon','authenticated','service_role','authenticator','postgres')`. Round
3 made the tool read `anon`'s own memberships and round 4 made it read that membership's
options — but both stop at **depth 1**. A mid role's own memberships are never read, because
the mid role is not one of the five names. So the privilege escalation happens one hop out of
the query's field of view.

**Disposition: not a MUST-FIX, and deliberately so.** I want to be explicit about why,
because under rounds 1-3 this would have been the headline finding.

- It contradicts **no live claim**. The module's `Known-uncaptured` clause already reads
  *"anything reachable only through catalog state this query does not read"* — pg_auth_members
  rows whose `member` is not one of the five names are exactly that. The claim that this
  result would have falsified is the one the author withdrew this round.
- The **packet makes no claim it touches**. `STAGING_RERUN_AUTHORIZATION_PACKET.md` §9 tells
  the operator to capture three times, diff, and classify every residual, and reports the local
  round trip as *"a narrowing, not a diagnosis"*. Nowhere does it tell the owner that an
  identical checksum proves no authorization changed. I looked for that sentence specifically;
  it does not exist.
- Round 4 said *"I am not asking for an exhaustive catalog surface, and I would push back on
  another generate-and-patch round as the remedy."* I agree, and raising this as a MUST-FIX
  would be commissioning precisely that sixth round while simultaneously certifying that the
  withdrawal of the completeness claim was correct. Those two positions do not coexist.

I record it under SHOULD-FIX 2 as a one-line addition to `Known-uncaptured` — naming the
depth-1 limit specifically, the way `auth` and `vault` are named — and as the evidence that
makes SHOULD-FIX 1 ("only oid and planner statistics are excluded") a real misstatement rather
than a stylistic quibble.

---

# Y3 — Full local proof. **PASS. 254/254, 0 failures, all four gate flags true.**

pgTAP input hash-verified **before** use:
`shasum -a 256 …/pgtap-968eb53a/sql/pgtap.sql` →
`d4f9c8a4b0bfa6f2e29c751ab4deb79208e43f5935bab1948750b95bad3926b3` — matches the pinned value.

```
node scripts/replay-migrations.mjs --with-next --local-only --phase03a \
  --phase03a-pgtap-sql=<pgtap.sql> --json        exit 0
```

```
phase03a.status        LOCAL_CANDIDATE_PROOF_PASS
pgVersion              postgres (PostgreSQL) 17.11 (Homebrew)
source.sha             e89d53deb2f0f003a7626c53f6cc8222fca69c3f   <- THIS candidate
source.tree            e49f462a7cb880792235e9538ddd4a14b9416252   <- THIS candidate
source.workingTreeClean true
```

The run self-identifies against the candidate SHA and tree in the brief, so this is a proof
*of this increment*, not a re-quote of round 4's run at `41f3d631`.

| Suite | planned | ok | not ok | bail | skip | todo |
|---|---|---|---|---|---|---|
| `promptb_media_key_guards.test.sql` | 25 | 25 | 0 | no | 0 | 0 |
| `phase03a-foundation.test.sql` | 113 | 113 | 0 | no | 0 | 0 |
| `phase03a-privileges.test.sql` | 79 | 79 | 0 | no | 0 | 0 |
| `build33-compat.test.sql` | 37 | 37 | 0 | no | 0 | 0 |
| **TOTAL** | **254** | **254** | **0** | **no** | **0** | **0** |

I parsed the TAP text out of the JSON myself rather than reading a reported total, and checked
each suite's `1..N` plan against its own `ok` count, so a truncated suite would surface as a
plan/ok mismatch rather than as a silent pass.

Gate flags:

```
localProofPassed              true
privilegeProofPassed          true
restorationExact              true
reapplyDeterministic          true
  privilegeGuard.passed             true
  privilegeGuardRehearsal.passed    true
  reappliedPrivilegeGuard.passed    true
```

`restoredSha256 == beforeSha256` (`1af75133…f45cc`) and `reappliedSha256 == afterSha256`
(`76aae53a…3f3d`) — the round trip is exact in both directions on the same numbers.

Safety block self-reports `tcpDisabled: true`, `productionInputsAccepted: false`,
`nonmanagedExecuted: false`, `globalPostgresUnchanged: true`, `tempDestroyed: true`. One
declared `replayAdaptation` (a `pg_net` `CREATE EXTENSION` no-op, recorded in the JSON, not
hidden). Stderr was three `vault secret missing - skipping` warnings, which is the designed
local behaviour for the webhook trigger.

`phaseGate: "BLOCKED"` — unchanged from round 4 and not a failure: the harness sets it
unconditionally so it can never self-authorize a hosted apply.

`npm run typecheck` exits **0**.

---

# Y4 — Jest. **PASS. Exact in both directions, reconciled by name.**

```
$ npx jest --silent
Test Suites: 12 failed, 277 passed, 289 total
Tests:       14 failed, 32 todo, 4272 passed, 4318 total
```

Every one of the four numbers matches the author's claim exactly, and `14 + 32 + 4272 = 4318`
closes. The author's note is also borne out: the reconciliation receipt is `e89d53de`, the
commit *after* the code change, which is consistent with the account that no Jest run had
covered `06088bec` until it was run before dispatch. I re-ran it myself; the claim now matches
reality.

The 14 failures by exact name, extracted from the run rather than from the author's list:

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

All fourteen are UI/accessibility source-contract suites under `src/`. **Not one of them is in
`scripts/`, `supabase/` or any path this increment edits** — this increment touches exactly
`scripts/structural-catalog.mjs`, `scripts/__tests__/structuralCatalog.test.ts` and two
qa-reports files. The inherited-baseline characterisation holds.

*Caveat, same as round 4's:* I confirmed the count and the names at this candidate. I did not
re-derive the baseline from an unmodified worktree; round 3 did that at `80751ad`, and the
deltas since reconcile.

---

# Y5 — Shipped Build 33 client safety. **PASS. Spot-checked on my own measurement, not on trust.**

I neither redid round 4's exhaustive sweep nor accepted it. I took the narrowest, sharpest
question available — **the one shipped path round 4 flagged as having no regression assertion**
— and measured it end to end against my own replay run.

**Measured Stage A delta** (from `phase03a.before/after.catalog.tableGrants`, 434 rows each
side): **411 table-level grants lost, 0 gained.** That is the intended least-privilege revoke.
Restricted to DML: `anon` loses 55, `authenticated` loses 44, and the question is whether any
of those losses is compensated at column level for a path the shipped client actually walks.

**The sharp case — the guest feedback INSERT (`src/lib/feedbackStore.ts`).** `anon` loses
table-level `INSERT` on `public.feedback`. Post-Stage-A effective privileges, measured from
`phase03a.privilegeCapture.relations`:

```
feedback / anon   table=[]  colSELECT=[]
                            colINSERT=["body","category","contact_email","platform","user_id"]
```

And the shipped row, `feedbackStore.ts:53-58`:

```js
const row = { user_id, category, body, contact_email, platform };
```

**Exact set equality** — five columns granted, the same five written, none extra. And the
guest branch at `:83` is `await supabase.from('feedback').insert(row)` with **no `.select()`**,
guarded by a long comment explaining that a guest cannot read its own row back. That matches
the measured `colSELECT=[]` precisely. The shipped guest write survives Stage A, and it
survives it for a reason the code already documents rather than by luck.

**Spot-checks on the other shipped surfaces**, same source:

| Table / role | post-Stage-A | shipped path |
|---|---|---|
| `flags` / `anon` | `SELECT` + all 18 cols | guest map read — intact |
| `flag_comments` / `anon` | `SELECT` (content, created_at, flag_id, id, user_id) | `src/lib/comments.ts` — table SELECT retained |
| `point_events` / `anon` | `SELECT` retained | the declared "production fidelity only" carve-out, consistent with the migration comment |
| `users` / `anon` | **nothing at all** | consistent with the packet's claim that the guest comment list is already broken via the `users(display_name)` join |
| `users` / `authenticated` | colSELECT incl. `is_admin`; colUPDATE `display_name, avatar_url, avatar_object_key` | `admin.ts` gate + profile edit — intact |
| `flags` / `authenticated` | colINSERT 10 cols; colUPDATE incl. **`status`** | report + verify/resolve — intact |
| `flag_verifications` / `authenticated` | `SELECT` + colINSERT `flag_id, verifier_id` | verify flow — intact |
| `comment_votes` / `authenticated` | `SELECT, DELETE` + colINSERT `comment_id, voter_id` | upvote flow — intact |

`service_role` shows no DML loss that removes a path the client reaches (it is the server-side
role and the guard passes on both the first apply and the reapply:
`reappliedPrivilegeGuard.passed: true`, 23 relations / 2 sequences / 35 functions reviewed).

Independently, **`build33-compat.test.sql` is 37/37 in my own run**, including
`B33 admin.ts: authenticated can still SELECT users.is_admin (no 42501)`.

**Conclusion: no Stage A change degrades a shipped Build 33 path for `anon`, `authenticated`
or `service_role`.** Round 4's SHOULD-FIX 2 stands — `build33-compat.test.sql` contains no
occurrence of the string `feedback`, so the guest write I just verified by measurement has
still not been pinned by an assertion. That is a coverage gap, not a defect: the behaviour is
correct today and I measured it.

---

# Y6 — FDA-028 untouched. **PASS.**

```
$ shasum -a 256 supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql
8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771   <- matches
$ shasum -a 256 supabase/migrations-next/phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql
eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302   <- matches

$ git ls-tree -d HEAD                                     supabase/tests/fda028
  040000 tree 04fec65effb8b347ae4e00dcbc3e7060672fe9cb
$ git ls-tree -d 21b2bd7a96cd69a8d8fc3ff8756b88a5fe28d912 supabase/tests/fda028
  040000 tree 04fec65effb8b347ae4e00dcbc3e7060672fe9cb            <- identical
```

Cross-check: `git diff --stat 21b2bd7a96cd69a8d8fc3ff8756b88a5fe28d912 HEAD -- supabase/`
lists 12 files and **no FDA-028 file among them**. Six rounds of accepted FDA-028 review are
not reopened.

---

# Y7 — Overclaimed, vacuous, newly broken; and the owner-facing packet

## Overclaimed

**One**, and it is the residual `"Only oid and planner statistics are excluded"` /
`"EXCLUDED: only VOLATILE_FIELDS"` pair from Y1(iii), falsified by Y2(d). SHOULD-FIX 1.

Everything else I checked is stated at or below what the evidence supports. Several places
where the author could have overclaimed and did not, which I note because they are the reason
this round is short: the new registry docstring calls itself *"a REVIEW AID and a regression
net, NOT a completeness guarantee"*; it names its own counter-example (`functions.body`) rather
than describing it abstractly; it says *"the list is certainly incomplete"*; and the JSON
records the withdrawal as *the second* withdrawal rather than presenting the new text as
having been right all along.

## Vacuous

Round 4 called the 20 derived `detects a change to <section>.<field>` cases substantially
vacuous at field granularity. They still are, in exactly the same way — but that is now
**declared in the code that defines them** (the test's own comment says it "feed[s] SYNTHETIC
objects" and "cannot show the capture actually populates the field"), so the vacuity is a
documented property rather than a hidden one. The two new tests are not vacuous: the
section-scoped check bites on three negative controls (Y2c) and the limits test reads the
shipped bytes off disk (Y1ii).

## Newly broken

**Nothing.** 254/254 with 0 failures and 0 bailouts; all four gate flags true; round trip exact
in both directions on matching SHA-256s; Jest exact in both directions with all 14 failures
outside every path this increment touches; typecheck exit 0; FDA-028 byte-identical; no shipped
Build 33 path degraded (Y5). The two SQL changes are additive — one new `jsonb_build_object`
key and a widened `string_agg` expression — and both are inside a read-only diagnostic query
that never runs against a live target.

## The owner-facing packet — statements contradicted by the current artifact

I read `STAGING_RERUN_AUTHORIZATION_PACKET.md` (234 lines) looking specifically for anything
the current tree falsifies. **Two stale test counts, no substantive contradiction.**

| Packet | Says | Actual | Verdict |
|---|---|---|---|
| §183 | "Hosted pgTAP, now **254** assertions" | 254 measured | correct |
| §94 | "`build33-compat.test.sql` (37 assertions)" | 37 measured | correct |
| §31 | "STAGE-MF-01 … **19 tests**" | `canonicalMigrationIdentity` 20 + `phase03aReplay` 9 | **stale, understates** |
| §32 | "STAGE-MF-02 … capture recipe published + **11 tests**" | `structuralCatalog.test.ts` = **42** | **stale, understates by 31** |
| `EIGHT_FIX_DISPOSITION.json:19` `howClosed` | "structural-catalog.mjs + **11 tests**" | 42 | **stale, same number** |

Both stale counts **understate** the work, so neither misleads an owner toward a decision they
would not otherwise make; but a packet whose whole purpose is to be checkable should not carry
a number a reader can falsify in one command. SHOULD-FIX 3.

**What the packet does NOT say, which I checked for deliberately.** §9 does not tell the owner
that an identical structural checksum proves no authorization changed. It prescribes a
procedure ("capture three times, diff, classify every residual, nothing structural may be
excluded to make checksums agree" — a normative operator *rule*, as rounds 3 and 4 both agreed)
and then reports the local-exact / hosted-divergent result explicitly as *"a narrowing, not a
diagnosis"*. Had that sentence existed, my Y2(d) collision would have made it a MUST-FIX. It
does not exist.

Round 4's SHOULD-FIX 1 (the `column_acls` mis-attribution) is **resolved**: `grep -rn
"column_acls"` over `supabase/` and the live packet returns nothing, and the surviving comment
in `build33-compat.test.sql:117-120` cites the evidence file and describes it as recording
"column ACLs", which is accurate for `effective_users_columns`.

## New MUST-FIX

**None.**

---

# MUST-FIX

**None.** Round 4's single MUST-FIX is discharged in all three parts, each verified against a
live PostgreSQL 17.11 or against the shipped bytes rather than against the author's account.

---

# SHOULD-FIX

1. **Sweep the third completeness claim.** `scripts/structural-catalog.mjs:43`
   (*"EXCLUDED: only VOLATILE_FIELDS, each with a written justification"*) and
   `EIGHT_FIX_DISPOSITION.json:23` (*"Only oid and planner statistics are excluded, each with a
   written justification"*) are the same grammatical move as the two claims already withdrawn,
   and Y2(d) falsifies the literal reading with a demonstrated `anon` escalation at an
   identical checksum. Both sit beside correct bounding language, which is why this is not a
   MUST-FIX. The one-word fix is *"Of the fields this query reads, the only ones dropped before
   hashing are…"*. Three rounds have now been spent on this sentence pattern; it is worth
   closing the family, not just the instances that were cited.
2. **Name the depth-1 role-graph limit in `Known-uncaptured`.** The `roles` subquery is fixed
   to five role names, so a mid role's own memberships are never read and
   `GRANT postgres TO <mid role>` is invisible while `anon` inherits from it (Y2d, measured).
   `auth` and `vault` are named; this deserves the same one line. I am explicitly **not** asking
   for a sixth generate-and-patch round — naming it is the remedy, consistent with round 4's
   own framing.
3. **Refresh two stale test counts.** Packet §31/§32 and `EIGHT_FIX_DISPOSITION.json:19`
   say "19 tests" and "11 tests"; the real numbers are 20+9 and 42. They understate, so nothing
   rests on them, but they are falsifiable in one command in an artifact built to be checked.
4. **Carried forward from round 4, still open** (neither is regressed; both are unchanged):
   - *R4 SHOULD-FIX 2* — `build33-compat.test.sql` contains no occurrence of `feedback`. The
     guest write at `feedbackStore.ts:83` is correct today (I measured it, Y5) but is the one
     shipped guest path with no assertion behind it. One `lives_ok` on the five-column insert
     shape closes the window.
   - *R4 SHOULD-FIX 3 / R3 SHOULD-FIX* — `20260905073925_phase03a_effective_privileges.sql:216-218`
     still says, of all five retained `anon` grants including `flag_comments`, that revoking
     them means *"the client call THROWS"*. For `flag_comments` the guest call already throws
     via the `users(display_name)` join, which this increment establishes in both halves.
     `point_events` got a carve-out in that block; `flag_comments` did not.

---

# What I could not verify, and why

- **Anything hosted.** No staging or production contact was permitted or attempted. Every
  packet claim about hosted behaviour — the `09c42928` vs `c70e119a` divergence, the hosted
  38/38 FDA-028 run, the hosted role matrix — is outside what this review can confirm. The
  local round trip is exact in both directions, which narrows the hosted divergence to the
  hosted environment; that remains a narrowing.
- **Production's column grants today.** Y5's production-side statement rests on the
  `2026-09-05T05:13:59Z` capture pinned by hash in the contract, not a live reading. I verified
  the *local, measured* post-Stage-A privileges directly; the production half inherits round
  4's caveat that a five-day-old capture is being spoken about in the present tense.
- **The 14 Jest failures as a pre-existing baseline.** Confirmed at this candidate by count and
  by exact name, and confirmed that none lies in a path this increment edits. I did not
  re-derive the baseline list from an unmodified worktree; round 3 did that at `80751ad`.
- **Exhaustiveness of the collision search.** I found one sixth-generation collision in the
  time I allotted. I make no claim there is not a seventh — which is now the artifact's own
  stated position, and is the reason I did not treat finding one as a defect.
- **`set_option` behaviour.** Like round 4, I captured `s=` in the residual but did not
  construct a behavioural escalation through it; superuser `SET ROLE` confounds the test. The
  field is captured; its necessity is unproven.

---

**Containment closing statement.** The disposable PostgreSQL 17.11 instance created for this
review was socket-only with TCP disabled, seeded with synthetic roles and one synthetic row,
and is destroyed along with its data directory. Project refs `ctshxbykuemeqnofqcdh` and
`kldlwszpfkdmsjrjhjym` were never contacted, resolved, or placed in any connection string. No
secret was read or printed. No commit, push, merge, branch change or stash was made. The only
file written is this report.
