# Independent stage-fix code review — ROUND 4

**Reviewer role:** independent, round 4. No authorship of Phase 03A, of the staging run, of
the corrections, or of the round-1 / round-2 / round-3 reviews. Read-only on the candidate.
The only file this review writes is this report.

**Candidate reviewed (frozen):**
- worktree `/Users/skypie/AccessMap-worktrees/flagstone-p03a-stagefix-20260910`
- `git rev-parse HEAD` → `41f3d63113b93f589ec02aec0399b4954ff08242` — matches the stated candidate
- `git rev-parse HEAD^{tree}` → `f9ce6fa01c6a6485c1c8154f0dc3eaf85a00f669` — matches
- branch `repair/flagstone-p03a-stage-mandatory-fixes-20260910`; `git status --porcelain`
  empty at start

**Containment.** No staging contact. No production contact. No network call to any Supabase
project. Project refs `ctshxbykuemeqnofqcdh` and `kldlwszpfkdmsjrjhjym` were never targeted;
they appear below only as strings read out of committed capture files. Every database
observation is from a disposable local PostgreSQL 17 instance (socket-only) created and
destroyed by me, or from the committed replay JSON. No commit, no push, no merge. No secret
value is reproduced.

*(status: IN PROGRESS — sections are appended as each is completed)*

---

# VERDICT

## ACCEPT WITH MANDATORY CHANGES — one MUST-FIX

This is a close call and I want to say so plainly. **Seven of the eight things I was asked to
check PASS, on my own evidence, including both priority items in substance.** The four
round-3 collisions are genuinely closed — I confirmed each against a live PostgreSQL 17, not
by reading the test. The evidence-gap correction is right, well-cited and hash-pinned. The
stale claim is gone. 254/254 with 0 failures and every gate flag true. Jest is exact in both
directions. FDA-028 is byte-identical. And an independent spot-check of the W5 question found
no third instance of the core defect — Stage A preserves every shipped Build 33 path I could
find, including one guest **write** path the author never called out.

One thing blocks a clean PASS, and it is the item round 3 asked me to press on:

**The `AUTHORIZATION_SURFACES` registry is a real improvement in coverage but its stated
strength is overstated, and the overstatement is measurably false.** The module header says
*"a surface with a test that does not actually detect its change fails too"*, and
`EIGHT_FIX_DISPOSITION.json` tells the owner each registry surface has *"a behavioural
collision test"*. I falsified both. The derived test is synthetic — it never touches
`CATALOG_SQL` or a database — so a registry entry can pass its own test while failing to
detect the real-world change it declares. I demonstrated this two ways, and then constructed
**fifth-generation collisions**, one of which takes `anon` from `permission denied for table
users` to a successful read with an **identical checksum, 0 residuals and an empty
`securityRelevantSections`**.

That meets two of the stated MUST-FIX criteria at once — it *hides an authorization change*
and it *puts a false statement in front of the owner*. I am not asking for a tenth field.
See MUST-FIX 1: the cheapest correct fix is to stop claiming the property, not to chase it.

**Nothing in the candidate's apply set does any of these things.** No shipped client breaks,
no database is mis-targeted, and the numbers are all real.

---

# X1 — The evidence-gap claim. **PASS.**

## The cited file is what it is claimed to be

I parsed `qa-reports/phase03a/2026-09-04/preflight/expanded-privileges.json` directly:

```
sha256 2fd4f60405aab4fbdddc1786d4b6e89b873aa07576644466f855848c52048bca  (43,514 bytes)
projectRef          kldlwszpfkdmsjrjhjym          <- production
readOnly            true
mutationsPerformed  false
captured_at_utc     2026-09-05T05:13:59.305Z
sourceSha           c2e36800b269ee22f29d0be35cfb88dace7c2afc
arrays: column_acls 18 · default_acls 108 · table_owners 33 · sequence_acls 18
        function_owners 28 · effective_users_columns 33
```

- **Production-scoped:** yes. `projectRef` is the production ref, not the staging ref.
- **Read-only:** `readOnly: true`, `mutationsPerformed: false`, and the artifact carries no
  DDL — it is a capture, not a script.
- **Corroborated, not free-floating:** `supabase/migrations-next/phase03a/candidate-contract.json`
  pins this exact file by hash — `evidenceSha256` is `2fd4f604…`, which equals the hash I
  computed independently. The claim now rests on a hash-pinned artifact, which is the right
  standard.

## The data supports the SUPPORTED claim, and only that

```
column_acls    — all 18 rows have grantee "authenticated". ZERO rows for anon.
effective_users_columns — 11 anon rows on public.users, every one can_select:false, incl.
  {"role_name":"anon","can_insert":true,"can_select":false,"can_update":true,
   "column_name":"display_name"}
```

So a column-level `GRANT SELECT (display_name) TO anon` **is** excluded by committed
production evidence. Combined with the absence of table-level SELECT for `anon` on `users`
(round 3 verified that from `production-catalog-capture.v2.json`; I did not re-derive it),
the guest comment embed — which needs SELECT on `public.users` — cannot succeed for `anon`
in production. **The claim the suite and packet §5 now make is the supported one.**

## Is it an overclaim in the other direction? **No.**

The restated text in `build33-compat.test.sql:116-126` and packet §5 says the guest comment
list "is already broken in production as well", cites the file by path, quotes the specific
record, and names the correction as a correction. It does not claim Stage A fixes or causes
it — the line "Either way Phase 03A neither causes nor fixes it" survives. It does not
generalise beyond `display_name`/`users`. That is correctly bounded.

## Nothing else in the tree contradicts it

I searched the tree for any artifact asserting `anon` holds SELECT on `public.users` or any
of its columns. There is none. Every other statement points the same way: the local pgTAP
fence assertions ("authenticated still has no table-wide users SELECT"), the Stage A grant
block, and the replay's own before/after capture (below, X5) all agree that no role holds
table-level SELECT on `public.users` at any point.

## SHOULD-FIX 1 — a small citation imprecision

Both the packet and the suite comment say the file "records column ACLs" and then quote
`{"role_name":"anon","column_name":"display_name","can_select":false}`. That object is not
from `column_acls` — it is from `effective_users_columns`. `column_acls` has no `can_select`
field; it is grant rows, and its contribution to the argument is the *absence* of any anon
row. Both arrays are in the cited file and both support the claim, so the substance is
right, but a reader who opens `column_acls` looking for that quoted record will not find it.
Name the array.

---

# X2 — The four round-3 collisions, and the test design

## X2a — are the four collisions DETECTED? **PASS. Measured against a real PostgreSQL 17.**

I did not take the synthetic Jest tests as proof. I built a disposable socket-only
PostgreSQL 17.11 instance, created a fixture mirroring this project's shapes (a
`security_invoker` view over an RLS-protected base table, a SECURITY DEFINER
`private.current_user_is_admin()` with `SET search_path = ''`, an
`enforce_flag_status_transition` trigger with a `WHEN` clause, the four Supabase roles),
then ran the candidate's **real `CATALOG_SQL`** through the candidate's **real
`normalizeCatalog` / `checksum` / `diffCaptures`** before and after each change:

| Round-3 collision | checksum changed | residuals | securityRelevantSections | revert restores checksum |
|---|---|---|---|---|
| `ALTER VIEW … SET (security_invoker = false)` | **yes** | 2 | `[relations]` | yes |
| `ALTER FUNCTION … OWNER TO` | **yes** | 2 | `[functions]` | yes |
| `ALTER ROLE anon BYPASSRLS` | **yes** | 2 | `[roles]` | yes |
| `GRANT postgres TO anon` | **yes** | 2 | `[roles]` | yes |

All four are genuinely closed: different checksum **and** reported as a security-relevant
residual, with the revert restoring the original checksum exactly (so the detection is the
field, not noise). `npx jest scripts/__tests__/structuralCatalog.test.ts` → **40 passed,
40 total**, as claimed.

## X2b — is the registry genuinely stronger, or a longer list? **Both, and the difference matters.**

**What is genuinely stronger.** The old test was `expect(sql).toContain(name)` over eight
hardcoded strings. The registry is a declared 20-entry contract that now (i) forces every
entry's `section` to appear in `diffCaptures`'s security-relevant list — a surface filed
under a section the classifier ignores now fails; (ii) forces every entry to carry a
`detects` sentence, so the intent is written down; (iii) is emitted into every capture
artifact as `authorizationSurfaces`, so a reader of a capture can see the declared scope;
and (iv) makes the list additive-by-default rather than something a reviewer must diff by
eye. That is a real structural gain, and the four round-3 items really are detected.

**What is not stronger: the derived test is synthetic.** The derived case is

```js
const before = { [surface.section]: [{ k: 'x', [surface.field]: 'BEFORE' }] };
const after  = { [surface.section]: [{ k: 'x', [surface.field]: 'AFTER'  }] };
expect(a.checksum).not.toBe(b.checksum);
```

It never executes `CATALOG_SQL` and never touches a database. Because `checksum` is a hash
of the whole normalized object, *any* field name changes the checksum. The assertion is
therefore satisfied by construction for any `{section, field}` pair whose `section` happens
to be in the hardcoded security-relevant list — including a field the capture query does not
emit, and including a field that does not exist in PostgreSQL. The only thing tying a
registry `field` to reality is the separate `expect(sql).toContain("'" + s.field + "'")` —
which is exactly the `toContain`-over-names check round 3 condemned, now iterating over the
registry instead of a hardcoded array.

## X2c — can a surface be in the registry and still fail to detect its real change? **YES. Two independent mechanisms, both measured.**

**(1) The SQL-text check is not section-aware.** The literal `'owner'` appears three times in
`CATALOG_SQL` (schemas, relations, functions) and `'acl'` appears five times (schemas,
relations, columns, functions, defaultAcls). So `functions.owner` — the entry added in
round 3 to close `ALTER FUNCTION … OWNER TO` — could be deleted from the functions block and
`expect(sql).toContain("'owner'")` would still pass on the `schemas`/`relations`
occurrences. Four of the five `*.acl` entries are in the same position. The registry's own
stated contract ("every entry must name a real captured key") is enforced at whole-file
granularity, not at the granularity of the surface it declares.

**(2) A registry surface whose real-world change the query cannot see.** `functions.body`
declares it detects *"a rewritten function body"*. It does not, for SQL-standard-body
(`BEGIN ATOMIC`) functions, which PostgreSQL 14+ stores in `prosqlbody` rather than
`prosrc`. Measured on the fixture:

```sql
create or replace function private.sqlbody_admin() returns boolean
  language sql security definer begin atomic select false; end;   -- capture A
create or replace function private.sqlbody_admin() returns boolean
  language sql security definer begin atomic select true;  end;   -- capture B
```

```
md5(coalesce(prosrc,'')) = d41d8cd98f00b204e9800998ecf8427e   == md5('')   (both states)
private.sqlbody_admin() now returns TRUE (it returned FALSE)
checksum: IDENTICAL · residualCount 0 · securityRelevantSections []
```

A SECURITY DEFINER admin predicate inverted from `false` to `true`, and the tool reports the
two captures as structurally identical. `functions.body` is in the registry, passes its
derived test, and does not detect its declared change. That is a direct answer to the
question round 3 posed.

## X2d — a FIFTH-generation collision the registry still misses. **FOUND.**

The sharpest one is inside `roles.memberof`, the entry added in round 3 to close
`GRANT postgres TO anon`. That entry captures *which* roles a role is a member of, as a
comma-joined string. It does not capture the **membership options** PostgreSQL 16+ stores
alongside them (`pg_auth_members.inherit_option`, `set_option`, `admin_option`) — and
`inherit_option` is the field that decides whether the membership confers anything.

Behavioural proof on the fixture (`privileged` holds `SELECT` on `public.users`; `anon` does
not):

```
GRANT privileged TO anon WITH INHERIT FALSE
  SET ROLE anon; SELECT count(*) FROM public.users;  ->  ERROR: permission denied for table users
  captured memberof string: "privileged"

GRANT privileged TO anon WITH INHERIT TRUE
  SET ROLE anon; SELECT count(*) FROM public.users;  ->  0        (the read now SUCCEEDS)
  captured memberof string: "privileged"

diffCaptures(before, after):
  checksum IDENTICAL · residualCount 0 · securityRelevantSections []
  (pg_auth_members row: privileged | admin_option f | inherit_option t | set_option t)
```

`anon` goes from denied to permitted on a table it must never read, and the repaired tool
calls the two captures structurally identical. This is the same family as round 3's
`GRANT postgres TO anon`, one level down: the round-3 fix detects the membership
*appearing*, not the option flip that makes it live.

Two further collisions, same harness, same run, all with unchanged checksum and 0 residuals:

| # | Change | status |
|---|---|---|
| G5-1 | membership `INHERIT FALSE` → `INHERIT TRUE` (`pg_auth_members.inherit_option`) | **COLLISION — escalation proven end to end** |
| G5-2 | `BEGIN ATOMIC` SECURITY DEFINER body rewritten `false` → `true` (`prosrc` empty) | **COLLISION — inversion proven** |
| G5-3 | function argument DEFAULT `true` → `false`, body byte-identical (`proargdefaults`) | COLLISION — real, impact modest |
| G5-4 | `ALTER ROLE anon SET search_path = private, public` (`rolconfig`) | COLLISION at catalog level |

**Discipline note — one candidate I withdrew.** I also tested the membership `SET` option
(`WITH SET FALSE` → `WITH SET TRUE`, i.e. whether `anon` may `SET ROLE privileged`). It
collides at the checksum level, but my behavioural test was invalid: the session
authenticated as a superuser, and a superuser may `SET ROLE` to anything regardless of the
option, so the differential I thought I saw was an artifact of my own harness. I am not
counting it. Likewise **G5-4 is reported as a catalog-level collision only**: in the Supabase
`authenticator → SET ROLE anon` model, a role's `rolconfig` is applied at login and is not
applied by `SET ROLE`, so I have no evidence it changes behaviour in this architecture and I
am not claiming it does. G5-1 and G5-2 are the two I stand behind.

## MUST-FIX 1 — stop claiming a property the tool does not have, and capture the two proven surfaces

Two artifacts make a strength claim that is measurably false:

- `scripts/structural-catalog.mjs:60-62` — *"so adding a surface without a test fails, and a
  surface with a test that does not actually detect its change fails too."* The second
  clause is false: `functions.body` has a passing test and does not detect its declared
  change (X2c-2).
- `qa-reports/phase03a/2026-09-10-stagefix/EIGHT_FIX_DISPOSITION.json:23` — *"the surfaces in
  `AUTHORIZATION_SURFACES`, each of which has a behavioural collision test"*. This is
  owner-facing. The tests are synthetic, not behavioural; none of them executes the capture
  query or a database.

**Required, and deliberately cheap:**

1. **Correct both statements.** Say what is true: the registry is a *declared* scope; each
   entry has a test that the section is classified security-relevant and that the field name
   appears in the capture query; the tests are synthetic and do not prove real-world
   detection. Nine collisions have been found by construction across four review rounds,
   which is itself evidence that the list is a floor, not a ceiling — say that too.
2. **Capture the two surfaces I proved.** Add `pg_auth_members.inherit_option` /
   `set_option` / `admin_option` to the `roles` section (G5-1 is a real `anon` escalation),
   and make the function-body hash cover `prosqlbody` as well as `prosrc` — e.g.
   `md5(coalesce(prosrc,'') || coalesce(pg_get_functiondef(p.oid),''))`, or hash
   `pg_get_functiondef` outright, which also subsumes G5-3.
3. **Fix the section-blind SQL check.** Assert the field appears *within its own section's
   `jsonb_build_object`*, not anywhere in the file, so `functions.owner` and four of the five
   `*.acl` entries stop being satisfied by an unrelated occurrence.

I am **not** asking for an exhaustive catalog surface, and I would push back on another
generate-and-patch round as the remedy. The durable fix is (1) — an accurate statement of
what a bounded diagnostic can and cannot prove. (2) and (3) are small and close the two
things I actually proved.

---

# X3 — Stale claim removed. **PASS.**

A case-insensitive search of the whole tree (excluding `node_modules` and `.git`) for
"nothing structural is excluded" returns **no live claim**:

- `scripts/structural-catalog.mjs:28` — *"An earlier version of this header said 'NOTHING
  structural is excluded'. That was an overclaim…"*. This is a historical note inside the
  module header explaining the correction, which the brief explicitly permits. It is
  immediately followed by the bounded SCOPE / WITHIN / EXCLUDED statement.
- `EIGHT_FIX_DISPOSITION.json:23` — the `normalizationDiscipline` value is **replaced**, not
  annotated. The false sentence is gone from the field, and the field now names the earlier
  revision's error explicitly. The sibling-key dodge round 3 objected to
  (`round2Correction` standing beside an uncorrected value) is gone; the collisions are now
  recorded in a `collisionsFoundByReviewAndClosed` array of nine entries.
- Packet §9:201 — *"Nothing structural may be excluded to make checksums agree."* This is a
  normative operator **rule** for the staging run, not a descriptive claim about the tool.
  Round 3 said the same and did not count it; I agree and do not count it either.

Every remaining hit is inside a prior review report (R1/R2/R3), quoting the claim in order to
condemn it. That is history, not a live claim.

---

# X4 — Full local proof. **PASS.**

```
node scripts/replay-migrations.mjs --with-next --local-only --phase03a \
  --phase03a-pgtap-sql=<pgtap.sql> --json
```

pgTAP input verified before use: `shasum -a 256` → `d4f9c8a4b0bfa6f2e29c751ab4deb79208e43f5935bab1948750b95bad3926b3`, matching the pinned hash exactly.

```
status                        LOCAL_CANDIDATE_PROOF_PASS
pgVersion                     PostgreSQL 17.11 (Homebrew)
source.sha                    41f3d63113b93f589ec02aec0399b4954ff08242   <- the candidate
source.tree                   f9ce6fa01c6a6485c1c8154f0dc3eaf85a00f669   <- the candidate
workingTreeClean              true
```

| Suite | planned | executed | failed | bailout | skipped | todo |
|---|---|---|---|---|---|---|
| `promptb_media_key_guards.test.sql` | 25 | 25 | 0 | 0 | 0 | 0 |
| `phase03a-foundation.test.sql` | 113 | 113 | 0 | 0 | 0 | 0 |
| `phase03a-privileges.test.sql` | 79 | 79 | 0 | 0 | 0 | 0 |
| `build33-compat.test.sql` | 37 | 37 | 0 | 0 | 0 | 0 |
| **TOTAL** | **254** | **254** | **0** | 0 | 0 | 0 |

Gate flags — all four true:

```
localProofPassed      true
privilegeProofPassed  true
restorationExact      true
reapplyDeterministic  true
   (also privilegeGuard.passed / privilegeGuardRehearsal.passed /
    reappliedPrivilegeGuard.passed — all true)
```

Safety block self-reports `tcpDisabled: true`, `productionInputsAccepted: false`,
`globalPostgresUnchanged: true`, `tempDestroyed: true`. The only stderr output was three
`vault secret missing - skipping` warnings from the webhook trigger, which is the designed
local behaviour, plus one declared `replayAdaptation` (a `pg_net` extension no-op), recorded
in the JSON rather than hidden.

`phaseGate` reports `BLOCKED`. That is not a failure: `scripts/replay-phase03a.mjs:158` sets
it unconditionally, so the harness can never self-authorize a hosted apply. Correct design;
noted so no reader mistakes it for a gate flag that did not flip.

---

# X5 — No third instance of the core defect. **PASS — independently spot-checked.**

I did not take round 3's W5 on trust and I did not redo it exhaustively. I took a different
route: instead of reading migrations, I diffed the **measured** before/after privilege
catalogs out of my own replay run (434 table-grant rows each side) and then checked every
loss against the shipped client source.

**Measured net effect on the two client roles (table-level SELECT):**

```
anon           before: comment_votes, feedback, flag_comments, flag_edit_history_public,
                       flag_photos, flag_status_history_public, flag_verifications, flags,
                       notification_preferences, point_events, push_tokens,
                       realtime_subscribe_log, users_self_email
               after:  flag_comments, flag_edit_history_public, flag_photos,
                       flag_status_history_public, flags, point_events

authenticated  after:  everything it had, minus realtime_subscribe_log and users_self_email
```

Neither role gained anything (`GAINED 0` for both) — Stage A is strictly a narrowing, which
is the right shape for a privilege repair.

**Every loss checked against the shipped client:**

| Lost | Role | Shipped guest path? | Evidence |
|---|---|---|---|
| `comment_votes`, `flag_verifications`, `notification_preferences` | anon | no | `authenticated` retains SELECT; these are signed-in flows |
| `feedback` SELECT | anon | no | the guest path is INSERT-only, by design (below) |
| `push_tokens` SELECT | anon | no | `src/lib/pushNotifications.ts` is an authenticated flow; `authenticated` retains SELECT |
| `realtime_subscribe_log` | anon + authenticated | no | `src/lib/realtimeLog.ts` writes via a server-side RPC; zero client SELECT |
| `users_self_email` | anon + authenticated | no | zero references anywhere in `src/` or `supabase/functions/` |

The guest surface the shipped app actually uses — `flags`, `flag_comments`, `flag_photos`,
and the two `_public` views — is retained in full. `public.users` had no table-level SELECT
for either role before **or** after, which independently corroborates X1.

**The guest WRITE path holds too, and this is the sharpest check I ran.**
`src/lib/feedbackStore.ts:83` carries an anonymous insert that the file's own comment flags
as user-visible and serious ("EVERY GUEST REPORT told the reporter it had failed"; guests are
the App Review cohort). Stage A revokes table-level ALL on `public.feedback` from `anon` —
so this is exactly the shape of the original defect. It is not an instance:

```sql
-- 20260905073925_phase03a_effective_privileges.sql:190
GRANT INSERT ("user_id","category","body","contact_email","platform")
  ON TABLE "public"."feedback" TO "anon";
```

The granted column list is **exactly** the object the shipped client inserts
(`feedbackStore.ts:53-58`: `user_id, category, body, contact_email, platform` — `id` and
`created_at` are defaulted and not sent). The path survives. I could not construct a third
instance.

## SHOULD-FIX 2 — that guest write path has no regression assertion

`build33-compat.test.sql` exists to "exercise the SHIPPED query shapes", and its guest
section covers every guest **read**. It does not assert the guest feedback **INSERT**.
`phase03a-privileges.test.sql:180,182` asserts guest SELECT and UPDATE throw — the fence —
but nothing asserts the write still LIVES. The grant is present and I verified it matches the
client row exactly, so nothing is broken today; there is simply no test that would catch it
being revoked tomorrow. One `lives_ok` on the shipped insert shape, in the guest block, closes it.

---

# X6 — Jest. **PASS. Exact in both directions.**

`npx jest --silent` at the candidate SHA, working tree clean:

```
Test Suites: 12 failed, 277 passed, 289 total
Tests:       14 failed, 32 todo, 4270 passed, 4316 total
```

Matches the claim exactly: **14 failed / 32 todo / 4270 passed / 4316 total.**

Reconciliation by exact failure name. All 14 are in `src/screens/__tests__` and
`src/**/__tests__` a11y/UI contract suites; not one is in a file this repair touches
(`scripts/`, `supabase/`, `src/__tests__/*guard*`):

```
BP11 / T3 — tab bar: haptic-only + forwards a11y › fires the haptic, forwards every injected prop…
Explore close targets › MapScreen heat notice close controls are real 44pt targets
FV-1 — focused fields stay in their owning scroller › Address Search scrolls the full body…
T8 — one spoken voice › each triage action names its flag (category + conditional distance)
THE KEYBOARD CLASS › Recipe D — every delegate is a real, live consumer (the list drains)
TaskCard — T8 › with a location, the label carries category THEN distance
TaskCard — T8 › with no location, action labels are category-only (no distance)
Wave 2 — expanded modal adoption › keeps Flag Detail hand-built and gives it expanded safe-area geometry
focus-in standard › every ALLOWED entry still matches exactly one live surface
map-chrome budget › (c) chromeBandPx is the bar height alone, and the bar hugs safe-area + 8
the control now lives in the ⋯ tool sheet › VoiceOver order: search, then the circles, then the sheet rows
the dismissal standard › C · every surface is still reduced-motion gated
the dismissal standard › J · focus return is wired end to end, and nothing else claims onDismiss
the privacy screen renders Sky's document, verbatim › every policy paragraph is present in PRIVACY_SECTIONS…
```

**The strongest corroboration is the delta, and it is arithmetic.** Round 3 measured
`14 / 32 / 4250 / 4296` at `80751ad`. The only Jest change since is
`scripts/__tests__/structuralCatalog.test.ts` growing from 20 to 40 tests (the derived
registry cases). `4296 + 20 = 4316` and `4250 + 20 = 4270` — both sides land exactly, with
failures and todo unchanged. Two independent reviewers' measurements reconcile to the commit.
`beyondBaseline: []` and `inheritedNowPassing: []` hold.

---

# X7 — FDA-028 untouched. **PASS.**

```
8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771
  supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql
eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302
  supabase/migrations-next/phase03a/rollback/20260909120000_fda028_v4_limiter.rollback.sql
```

Both match the stated values exactly. Tree hash:

```
git ls-tree -d HEAD                                      supabase/tests/fda028
  -> 04fec65effb8b347ae4e00dcbc3e7060672fe9cb
git ls-tree -d 21b2bd7a96cd69a8d8fc3ff8756b88a5fe28d912  supabase/tests/fda028
  -> 04fec65effb8b347ae4e00dcbc3e7060672fe9cb
```

Identical. Six rounds of accepted FDA-028 review are not reopened by this repair.

---

# X8 — Anything overclaimed, vacuous, or newly broken

**Overclaimed:** one, and it is MUST-FIX 1 — the "behavioural collision test" /
"a surface with a test that does not actually detect its change fails too" pair. Everything
else I checked is stated at or below what the evidence supports. Notably, several places
where the author *could* have overclaimed, they did not: `point_events` is explicitly
retained "for production fidelity, NOT because a guest path reads it"; the two `_public`
views are asserted as view-grant-present-but-read-still-throws rather than as working guest
paths; and the round-3 correction is labelled as a correction of a correction rather than
quietly swapped.

**Vacuous:** the 20 derived `detects a change to <section>.<field>` cases are substantially
vacuous at field granularity (X2b). They are not worthless — the section-classification half
is real — but they do not carry the weight the surrounding prose puts on them. Covered by
MUST-FIX 1; I am not raising it separately.

**Newly broken:** nothing. 254/254 with 0 failures, all four gate flags true, Jest exact in
both directions with the delta reconciling arithmetically to round 3's own measurement,
FDA-028 byte-identical, typecheck/lint claims consistent with the recorded baseline, and no
shipped Build 33 path degraded (X5).

**New MUST-FIX:** one (MUST-FIX 1, above).

---

# MUST-FIX

1. **Correct the "behavioural collision test" strength claim, and capture the two surfaces I
   proved.** `scripts/structural-catalog.mjs:60-62` and
   `EIGHT_FIX_DISPOSITION.json:23` state that a registry surface whose test does not actually
   detect its change will fail. It will not: the derived tests are synthetic and never
   execute `CATALOG_SQL` or a database. I falsified the claim with `functions.body`, which
   passes its test and does not detect a `BEGIN ATOMIC` SECURITY DEFINER body inversion, and
   I constructed a fifth-generation collision — `pg_auth_members.inherit_option` flipping
   `anon` from `permission denied for table users` to a successful read with an identical
   checksum, 0 residuals and an empty `securityRelevantSections`. Remedy: (a) restate both
   artifacts accurately — declared scope, synthetic tests, list is a floor not a ceiling;
   (b) capture membership options and `prosqlbody`; (c) make the SQL-text check
   section-scoped so `functions.owner` and four `*.acl` entries stop being satisfied by an
   unrelated occurrence elsewhere in the query. (a) is the durable part.

# SHOULD-FIX

1. **Name the right array.** Packet §5 and `build33-compat.test.sql:116-121` attribute
   `{"role_name":"anon","column_name":"display_name","can_select":false}` to `column_acls`.
   It is from `effective_users_columns`. `column_acls`'s contribution is the absence of any
   `anon` row. Both are in the cited file; just cite them correctly.
2. **Assert the shipped guest feedback INSERT.** `build33-compat.test.sql` covers every guest
   read and no guest write, while `src/lib/feedbackStore.ts:83` is a shipped guest write that
   Stage A's `REVOKE ALL … FROM anon` touches and re-grants at column level. One `lives_ok`
   on the shipped insert shape closes a real regression window. (X5)
3. **Round-3 SHOULD-FIX, still open.** The Stage A retention comment block
   (`20260905073925_phase03a_effective_privileges.sql:205-220`) still says, across all five
   relations including `flag_comments`, that revoking would mean "the client call THROWS".
   For `flag_comments` the guest call already throws — as this increment now establishes in
   both halves. `point_events` was carved out of that block; `flag_comments` was not.
4. **Consider naming `auth`, `vault` and `extensions` as known-uncaptured.**
   `CAPTURED_SCHEMAS` is `public, private, storage, limiter`, declared and honest. But in
   this project the webhook secret lives in Vault and `auth.uid()` underpins every policy, so
   a reader may reasonably assume those are in scope. One sentence naming them as outside it
   would prevent that. Not a defect — the scope is already declared.

---

# What I could not verify, and why

- **Anything hosted.** No staging or production contact was permitted or attempted. Every
  claim in the packet about hosted behaviour — the `09c42928` vs `c70e119a` divergence, the
  hosted 38/38 FDA-028 run, the role matrix — is outside what this review can confirm. The
  local round trip is exact (`restorationExact` and `reapplyDeterministic` both true), which
  narrows the hosted divergence to the hosted environment; that remains a narrowing, not a
  diagnosis, and the packet says so.
- **Production's column grants TODAY.** X1 rests on a capture taken `2026-09-05T05:13:59Z`
  and hash-pinned in the contract. It is the best available evidence and it is correctly
  cited, but it is a point-in-time capture, not a live reading. The packet's present tense
  ("is broken in production today") is doing slightly more work than a five-day-old capture
  strictly supports. I am not raising this — the artifact is dated in-file and pinned by
  hash, and no repo artifact grants `anon` anything on `users` — but a reader should know the
  claim is as fresh as that capture.
- **The 14 Jest failures as an inherited baseline.** I confirmed the count, the exact names,
  and that the delta since round 3 reconciles arithmetically to the 20 tests added. I did not
  re-run the unmodified source worktree to re-derive the baseline list from scratch; round 3
  did that at `80751ad`, and the arithmetic since is exact in both directions.
- **The membership `SET` option.** I tested it, found the behavioural half of my own test
  invalid (superuser `SET ROLE` bypasses the option), and withdrew it rather than report a
  collision I had not actually proven. It may well be a real gap; I have no evidence.
- **Exhaustive collision search.** I found two proven fifth-generation collisions in roughly
  the time I allotted to looking. I make no claim that the list is now complete — that is
  precisely the point of MUST-FIX 1(a).

---

**Containment closing statement.** The disposable PostgreSQL 17 instance created for this
review was socket-only and has been destroyed along with its data directory. No staging or
production project was contacted. No commit, push, merge or branch change was made. The only
file written is this report.
