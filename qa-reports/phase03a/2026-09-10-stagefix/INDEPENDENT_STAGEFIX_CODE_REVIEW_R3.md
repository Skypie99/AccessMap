# Independent stage-fix code review — ROUND 3

**Reviewer role:** independent, round 3. No authorship of Phase 03A, of the staging run, of
the corrections, or of the round-1 / round-2 reviews. Read-only on the candidate. Every
temporary artifact was created outside the repository and destroyed; the only file this
review writes is this report.

**Candidate reviewed (frozen):**
- worktree `/Users/skypie/AccessMap-worktrees/flagstone-p03a-stagefix-20260910`
- `git rev-parse HEAD` → `80751ad68f1b02ffa0c16e4c8a3bfd1f30114b1f` — matches the stated candidate
- `git rev-parse HEAD^{tree}` → `fb4c69870793f99cb32dfce95c1f88968979e121` — matches
- branch `repair/flagstone-p03a-stage-mandatory-fixes-20260910`; `git status --porcelain`
  empty at start and at finish

**Containment.** No staging contact. No production contact. No network call to any Supabase
project. Project refs `ctshxbykuemeqnofqcdh` and `kldlwszpfkdmsjrjhjym` were never targeted;
they appear below only as strings read out of committed capture files. Every database
observation is from a disposable local PostgreSQL 17 instance (socket-only,
`listen_addresses = ''`) that I created and destroyed, or from the committed replay JSON and
committed captures read off disk. No commit, no push, no merge, no branch change. No secret
value is reproduced anywhere in this report.

---

# VERDICT

## ACCEPT WITH MANDATORY CHANGES

The substance of all three round-2 MUST-FIX is genuinely addressed. I reproduced every
headline number independently and could not break the core claims:

- **The five round-2 structural collisions are all closed.** I rebuilt the collision harness
  from scratch against a live PostgreSQL 17 and re-ran all five plus the GRANT control.
  Every one of the five now changes the checksum and is reported as a security-relevant
  residual. That is a real fix, not a restatement.
- **The guest assertions now test the shipped shape,** in both halves, and the "already
  broken locally, independent of Phase 03A" claim is TRUE — I measured it.
- **The packet now presents Stage B at full scope** — both halves, 37 assertions, 254 total,
  §6.3 rewritten.
- **254 / 254, 0 failures, all four gate flags true**, in my own replay run.
- **Jest 14 / 32 / 4250 / 4296**, exact in both directions, reproduced.
- **FDA-028 byte-identical.**

Two things block a clean PASS:

1. **I constructed four NEW checksum collisions** against the repaired
   `scripts/structural-catalog.mjs`. Two of them are unambiguously inside the tool's own
   declared scope, and one of them — flipping a `security_invoker` view to run as its owner —
   **is the exact mechanism this increment's own guest reasoning rests on**. The author's
   method for finding these is still "wait for a reviewer to construct one", and it is still
   producing new ones at the same rate.
2. **The false claim the MUST-FIX explicitly named is still in `EIGHT_FIX_DISPOSITION.json`,
   verbatim, at line 23**, with the correction bolted on beside it as a sibling key rather
   than replacing it. That is the third clause of round-1 MUST-FIX 2, repeated as round-2
   MUST-FIX 3, and it is still not done in that file.

Separately, the increment traded a guest overclaim for a **guest underclaim that is
factually wrong about this tree's own evidence**, and it put that underclaim in the
owner-facing packet. See W1.

**No third instance of the core defect was found.** I searched all three roles across tables,
columns, functions, sequences, schemas, views, policies and PostgREST embeds, against both
shipped trees and the shipped Edge Function set. Stage A gains nothing and degrades no shipped
Build 33 path. The author's *privilege* method is now sound; it is the *checksum* method that
is still incomplete.

---

# W1 — Guest assertions test the shipped shape

## W1a — does the suite now assert both halves honestly? **PASS.**

`supabase/tests/build33-compat.test.sql` (plan 36 → 37) replaces the single paraphrase with
two separate assertions:

```sql
SELECT lives_ok($$ SELECT id, flag_id, user_id, content, created_at FROM public.flag_comments LIMIT 1 $$,
  'B33 guest: the flag_comments columns themselves stay readable by anon under Stage A');
SELECT throws_ok(
  $$ SELECT c.id, u.display_name FROM public.flag_comments c
     LEFT JOIN public.users u ON u.id = c.user_id LIMIT 1 $$,
  '42501', NULL,
  'B33 guest: listComments()''s users embed raises for anon — PRE-EXISTING, not caused by Stage A');
```

Both halves are present, correctly labelled, and the "PRE-EXISTING" framing is in the
assertion name itself rather than only in a comment. The `point_events` assertion was also
converted from a misleading `lives_ok` ("point_events is readable by anon") to a
`has_table_privilege` check whose name states there is **no shipped guest reader**, and the
matching rationale in `20260905073925_phase03a_effective_privileges.sql:214-216` was corrected
the same way. Both were explicitly demanded by round-2 MUST-FIX 1.

The suite executes 37/37 with 0 failures in my own replay (W4).

Minor, recorded not raised: the throws_ok uses a `LEFT JOIN` as a stand-in for the PostgREST
resource embed. It is the right *privilege* proxy — both require SELECT on `public.users` —
but it is a proxy, and the label says "embed". Acceptable; noted for completeness.

## W1b — is "already broken locally, independent of Phase 03A" TRUE? **PASS.**

Verified three ways, none of them by reading the author's text:

1. **Shipped source.** I extracted both shipped trees (`git archive f5594171… src`,
   `git archive ebf091c2… src`) and searched them for every PostgREST embed. There are exactly
   **four** embed strings in the whole shipped surface, and they are all the same one:
   `users!flag_comments_user_id_fkey(display_name)` / `users!user_id(...)`. `COMMENT_SELECT`
   forces a read of `public.users`.
2. **Local measurement.** On my own PostgreSQL 17 fixture, an `anon` read that crosses to
   `public.users` raises `ERROR: permission denied for table users`. Stage A grants `anon`
   nothing on `public.users` — I read the whole grant block
   (`20260905073925_phase03a_effective_privileges.sql:139-143` revokes every `anon` privilege
   on `users`; lines 241/252/253 re-grant to `authenticated` only). So it raises before Stage
   A and after.
3. **The suite proves it internally.** Assertion 16 (`lives_ok` on the bare columns) and the
   new `throws_ok` sit in the *same* `SET LOCAL ROLE anon` block, so the role switch is
   provably live and the embed assertion cannot pass by absence.

Stage A neither causes nor fixes it. The claim is true.

## W1c — the BOUNDED production restatement. **FAIL — it is now wrong in the OTHER direction, and it is in the owner-facing packet. NEW MUST-FIX 1.**

The author's bound, in `build33-compat.test.sql` and repeated in
`STAGING_RERUN_AUTHORIZATION_PACKET.md` §5, is:

> the committed production capture … carries column DEFINITIONS only and no column privilege
> data at all, so a column-level `GRANT SELECT (display_name) TO anon` **cannot be excluded
> from committed evidence** … Confirming production's column grants needs a read-only capture
> **that this tree does not currently contain**, and that is a gap in the evidence base.

**Half of that is exactly right, and I verified it.** I parsed
`supabase/contract/production-catalog-capture.v2.json` myself:

- `catalog` keys are `roles, scope, tables, columns, schemas, policies, triggers, functions,
  tableGrants, functionGrants, migrationHistory, comparatorVersion` — there is **no**
  `columnGrants` key, and zero occurrences of any column-privilege field. The `columns`
  records carry `data_type / is_nullable / column_default / ordinal_position / …` —
  definitions only. **Confirmed: no column-privilege data.**
- `tableGrants` for `public.users` gives `anon` → `DELETE, INSERT, MAINTAIN, REFERENCES,
  TRIGGER, TRUNCATE, UPDATE` and **no SELECT**; `service_role` is the only grantee with
  table-level SELECT. **Confirmed exactly as stated.**

**The other half is false.** The tree *does* contain a read-only, production-ref,
column-granular capture, and the round-2 reviewer named it explicitly. I read it:

`qa-reports/phase03a/2026-09-04/preflight/expanded-privileges.json`
— `projectRef` is the production ref, `readOnly: true`, `mutationsPerformed: false`,
captured `2026-09-05T05:13:59Z` — carries two relevant arrays:

- `column_acls` (18 rows): every grantee is `authenticated`. **Zero rows for `anon`.**
- `effective_users_columns` (33 rows): a per-column effective-privilege probe on
  `public.users`. The `anon` rows number 11 and **not one has `can_select: true`**. The
  specific row is:

```json
{"role_name": "anon", "can_insert": true, "can_select": false, "can_update": true, "column_name": "display_name"}
```

That is a direct, committed, production measurement of the exact privilege the packet says
cannot be excluded. A column-level `GRANT SELECT (display_name) TO anon` **is** excluded by
committed evidence, and the sentence "needs a read-only capture that this tree does not
currently contain" is wrong about the tree.

Why this is a MUST-FIX and not a note: round-2 MUST-FIX 1 existed because an artifact whose
job is truthful compatibility statements was making untrue ones. The fix replaced an
overclaim with an underclaim, moved it into the **owner-facing authorization packet**, and
invented an evidence gap that does not exist — on a privacy-relevant question (can an
anonymous session read user display names in production). `EIGHT_FIX_DISPOSITION.json`
compounds it: `independentReviewRound2.evidenceGapTheyExposed` states the gap as fact.

**Required:** cite `expanded-privileges.json` in the test comment, in packet §5 and in the
disposition, state the bound as what it is — *production's headline capture carries no column
privileges, so this claim rests on the hash-pinned preflight capture instead, which records
zero `anon` column ACLs and `can_select: false` on `users.display_name`* — and delete the
"gap in the evidence base" framing. Round-2 SHOULD-FIX 9 asked for precisely this pointer and
it was not added.

## W1d — residual, SHOULD-FIX

The Stage A retention comment block
(`20260905073925_phase03a_effective_privileges.sql:205-220`) still reads, over the whole
five-relation list including `flag_comments`:

> shipped Build 33 reads them **without gating on a signed-in user** … Revoking them in
> Stage A does not degrade a guest to an empty list — **the client call THROWS**.

`point_events` was carved out of that block. `flag_comments` was not. For `flag_comments` the
client call throws **already**, so the stated reason for the retention does not hold for that
relation either. The retention is still the right conservative call; the rationale text is
still not true of all five.

---

# W2 — The five round-2 structural collisions

## W2a — are the five closed? **PASS. Measured, not read.**

I built a disposable PostgreSQL 17 (socket-only), created a fixture mirroring this project's
shapes (a `security_invoker` view over a blocked base table, a SECURITY DEFINER
`private.current_user_is_admin()` with `SET search_path = ''`, an
`enforce_flag_status_transition` trigger with a `WHEN` clause, an `is_admin`-shaped boolean
column with `DEFAULT false`), then drove the module's own exported `CATALOG_SQL`,
`normalizeCatalog`, `checksum` and `diffCaptures` — one real change at a time, each undone and
re-verified back to the baseline checksum.

`SCHEMA_VERSION` reported by the module: **3** (was 2). Baseline checksum `f0fcc62ecfa0…`.

| # | Change made | checksum | `diffCaptures` | section |
|---|---|---|---|---|
| a | SECURITY DEFINER function loses `SET search_path` | **changed** `ebe13c66f63f…` | `identical: false`, 2 residuals | `functions` |
| b | `ALTER TABLE … DISABLE TRIGGER` | **changed** `63670aa0851b…` | `identical: false`, 2 residuals | `triggers` |
| c | trigger `WHEN` clause removed | **changed** `f896d48901a5…` | `identical: false`, 2 residuals | `triggers` |
| d | column `DEFAULT false` → `DEFAULT true` | **changed** `0530ff4a07dd…` | `identical: false`, 2 residuals | `columns` |
| e | `FORCE ROW LEVEL SECURITY` toggled | **changed** `589650c7aeaa…` | `identical: false`, 2 residuals | `relations` |
| f | control: a real `GRANT INSERT` | **changed** `fb3bed00af3e…` | `identical: false`, 2 residuals | `relations` |

All five are now residuals **and** all five land in `securityRelevantSections` — `triggers`
was added to that list, so b and c are no longer classed cosmetic. The capture query gained
`relforcerowsecurity`, `pg_get_expr(ad.adbin, ad.adrelid)` + `attgenerated`,
`array_to_string(p.proconfig,'|')` + `proleakproof`, and `tgenabled` +
`pg_get_triggerdef(tg.oid)`. Round-2 MUST-FIX 3's substance: **closed**.

`npx jest scripts/__tests__/structuralCatalog.test.ts` → **20 passed, 20 total** (was 14),
including five new named regression tests, one per collision, plus
`declares its schema scope instead of implying it covers everything`.

## W2b — the header claim. **PASS in the module. FAIL in `EIGHT_FIX_DISPOSITION.json`. MUST-FIX 2.**

The module header no longer claims it. `scripts/structural-catalog.mjs:26-46` now says the
earlier claim "was an overclaim", names the five collisions, and states a bounded
SCOPE / WITHIN / EXCLUDED contract with an exported `CAPTURED_SCHEMAS`. That is a genuine,
self-incriminating correction and it is the right shape.

`grep -rni "structural is excluded"` across the tree, however, still returns:

```
qa-reports/phase03a/2026-09-10-stagefix/EIGHT_FIX_DISPOSITION.json:23
  "normalizationDiscipline": "… Nothing structural is excluded; only oid and planner
   statistics are, each with a written justification a test enforces."
```

verbatim and unedited, with the correction added at a **sibling key** (`round2Correction`,
line 27) rather than replacing it. A reader of `normalizationDiscipline` is told the false
thing. This is the same "corrected value committed beside the stale one" failure the round-2
reviewer caught in `LOCAL_ACCEPTANCE.json` — and unlike that one, it is the literal text the
MUST-FIX named, in both rounds.

Packet §9 line 198 ("Nothing structural may be excluded to make checksums agree") reads as an
operator *rule* rather than a claim about the tool, and I do not count it as unfixed.

## W2c — the attack: a SIXTH collision. **FOUND — four of them. MUST-FIX 3.**

Same harness, same control. Each change below produced an **unchanged checksum** and
`diffCaptures() → identical: true, residualCount: 0, securityRelevantSections: []`, in the
same run in which the `GRANT INSERT` control was correctly detected.

| # | Change | checksum | in declared scope? |
|---|---|---|---|
| **6a** | `ALTER VIEW … SET (security_invoker = false)` | **UNCHANGED** | **YES** — a `public` view the tool enumerates |
| **6b** | `ALTER FUNCTION <SECURITY DEFINER> OWNER TO service_role` | **UNCHANGED** | **YES** — a `private` function the tool enumerates |
| 6c | `ALTER ROLE anon BYPASSRLS` | **UNCHANGED** | roles are not schema-scoped; nothing is captured |
| 6d | `GRANT postgres TO anon` | **UNCHANGED** | role membership; nothing is captured |

**6a is the serious one, and it is serious *here* specifically.** `relations` captures
`s, n, kind, rls, owner, acl, forcerls` — it does **not** capture `pg_class.reloptions`, so
`security_invoker` is invisible. This increment's entire defence of the two `_public` view
retentions is that they are `security_invoker` views and therefore confer nothing. Flip that
one reloption and the retained `anon` grant becomes a live read of a base table `anon` must
never reach — and the tool built to detect authorization regressions says "identical".

I proved it is a real authorization change, not a theoretical one, on a view shaped exactly
like `flag_status_history_public` (a view over a table `anon` cannot read, with the view
granted to `anon`):

```
-- security_invoker = true  (the shipped shape)
set role anon; select count(*) from public.users_public;
ERROR:  permission denied for table users

-- alter view public.users_public set (security_invoker = false);
set role anon; select count(*) from public.users_public;
 0        <-- succeeds

structural-catalog: baseline 2f8eb4818a48…  after 2f8eb4818a48…
                    identical = true | residuals = 0 | securityRelevantSections = []
```

A denied guest read of `public.users` becomes a permitted one, and the checksum does not move.

**6b:** `functions` captures `secdef` but not `proowner`. For a SECURITY DEFINER function the
owner *is* the effective privilege set — re-owning `private.current_user_is_admin()` or any
`handle_*` trigger function silently changes what it can do. Unchanged checksum.

**6c / 6d:** the module captures no `roles` section at all — no attributes, no memberships.
`ALTER ROLE anon BYPASSRLS` defeats every RLS policy the tool *does* carefully compare. These
are arguably outside the new header's stated schema scope, but note that this project's **own**
replay comparator captures roles with `bypass_rls` (I read them in the replay JSON:
`before.catalog.roles[].bypass_rls`), so the structural catalog is strictly weaker than the
comparator sitting next to it on exactly this axis.

**Method note, and the reason this is a MUST-FIX rather than a note.** The new test named
`captures every catalog surface that can carry authorization`
(`scripts/__tests__/structuralCatalog.test.ts:190`) is a **string-containment check over
`CATALOG_SQL`** for a hardcoded list of eight field names. It cannot fail for a surface nobody
thought of, and its name asserts completeness it does not test — the same failure the round-2
reviewer identified in the test it replaced ("excludes nothing structural"), reproduced one
generation later. Three rounds have each found new collisions because the tool is being fixed
case-by-case from reviewer findings rather than derived from a catalog inventory.

**Required:** capture `pg_class.reloptions` (or at minimum the `security_invoker` /
`security_barrier` view options), `pg_proc.proowner`, and role attributes + memberships for the
three application roles; add a named regression test per surface; and replace the
containment-style coverage test with one that enumerates catalog surfaces and fails on an
uncaptured one.

---

# W3 — Packet presents Stage B at full scope

**PASS.**

`git diff a274b9dc..HEAD -- STAGING_RERUN_AUTHORIZATION_PACKET.md` shows §5 rebuilt:

- assertion count **25 → 37**, with "exercises the shipped shapes as BOTH `authenticated` and
  `anon`, then applies Stage B in-transaction as a negative control for each half";
- an explicit "**Stage B has TWO halves**" statement that says plainly an earlier draft
  described only the first "which would have put a decision to the owner at about half its
  real scope";
- the authenticated matrix retained, plus a new **five-row guest matrix** — `flag_comments`,
  `flag_photos`, `point_events`, `flag_status_history_public`, `flag_edit_history_public` —
  each with its post-Stage-A state, post-Stage-B state (`42501` / revoked) and its actual
  shipped reader, including "none — retained for production fidelity only" for `point_events`;
- the two caveats an owner needs (the `_public` views were never a working guest path; the
  guest comment list is broken independent of Phase 03A).

§6.3 now reads "no client is still in the field reading `public.users` directly **or** reading
`flag_comments` / `flag_photos` as a guest. Both halves gate on the same evidence." §8 reads
"Hosted pgTAP, now **254** assertions … (+37 Build 33, authenticated *and* guest)".

Both round-2 MUST-FIX 2 clauses are satisfied and the counts match what I measured in W4. The
only defect in §5 is the evidence-bound paragraph adjudicated in W1c.

---

# W4 — Full local proof

**PASS.**

pgTAP provenance verified before anything was built on it:

```
shasum -a 256 …/pgtap-968eb53a/sql/pgtap.sql
d4f9c8a4b0bfa6f2e29c751ab4deb79208e43f5935bab1948750b95bad3926b3   ← matches the pinned value
```

and the replay JSON independently reports the same `generatedSqlSha256` with source commit
`968eb53a33114e83042b3bdb0c664b5b80cf8bdf`.

```
node scripts/replay-migrations.mjs --with-next --local-only --phase03a \
  --phase03a-pgtap-sql=<pinned pgtap.sql> --json        → exit 0
```

| Suite | planned | executed | failed | skipped | todo | bailout |
|---|---|---|---|---|---|---|
| `promptb_media_key_guards.test.sql` | 25 | 25 | 0 | 0 | 0 | 0 |
| `phase03a-foundation.test.sql` | 113 | 113 | 0 | 0 | 0 | 0 |
| `phase03a-privileges.test.sql` | 79 | 79 | 0 | 0 | 0 | 0 |
| `build33-compat.test.sql` | **37** | **37** | 0 | 0 | 0 | 0 |
| **TOTAL** | **254** | **254** | **0** | **0** | **0** | **0** |

`localProofPassed`, `privilegeProofPassed`, `restorationExact`, `reapplyDeterministic` — all
four **true** in my own run. `executed == planned` in every suite; zero skips, zero TODOs, zero
bailouts, so the count is not inflated. `status: LOCAL_CANDIDATE_PROOF_PASS`,
`safety.tcpDisabled: true`, `safety.productionInputsAccepted: false`,
`safety.globalPostgresUnchanged: true`, `safety.tempDestroyed: true`, and the JSON's recorded
source is `80751ad6… / fb4c6987…` with `workingTreeClean: true` — the frozen candidate.

The only stderr output is three benign `[notify_flag_status_webhook] vault secret missing -
skipping` warnings, which are the intended local-environment degradation and are not counted
as passes.

---

# W5 — Hunt for a THIRD instance of the core defect

**No third instance found.** This is the answer I expected to have to argue against, and I
could not.

I did not re-run the round-2 reviewer's privilege sweep. I attacked the dimensions their
report explicitly bounded out — they wrote "I looked for a third instance of the class and did
not find one **in the privilege dimension**" — and the dimensions where a shipped path can
break without any table-level privilege delta.

**Shipped surface, re-derived from the shipped trees, not from the report.** Extracting
`git archive f5594171… src` and `git archive ebf091c2… src`:

- `.from()` targets, all of them: `flags` (32), `users` (20), `feedback` (14),
  `flag_comments` (8), `push_tokens` (4), `point_events` (4), `flag_status_history_public` (2),
  `flag_photos` (2). Nothing else.
- `.rpc()` names: nine, as previously reported.
- PostgREST embeds: exactly one distinct embed in the whole surface
  (`users!flag_comments_user_id_fkey(display_name)`), already adjudicated in W1. **No second
  embed class exists.**
- Edge Functions, extracted from the shipped tree (`git archive f5594171… supabase/functions`):
  six functions plus `_shared`. Their entire database surface is `.from('push_tokens')` ×1 and
  eleven `account_deletion_*` / `resolve_…` / `request_…` RPCs. Confirms the round-2 inventory
  independently.

**1. RLS policy dimension (untested by round 2).** I diffed the replay's own `before` and
`after` catalogs — real applied state, not migration text. Across Stage A exactly one policy is
removed, one added, three altered:

```
REMOVED : public.flags "flags_user_scoped"            (PERMISSIVE, ALL, TO public)
ADDED   : public.flags "flags authenticated insert open" (RESTRICTIVE, INSERT, TO authenticated)
CHANGED : "admin delete any flag" / "admin delete any comment" / storage "flag-photos admin delete"
          — using_expression_md5 only (the `(SELECT private.current_user_is_admin())` rewrite)
```

The dropped policy was a permissive OR-term. After the drop every command still has a
dedicated permissive policy for the right role — `flags anon insert`, `flags insert own`,
`flags delete own`, `flags owner edit open`, `flags status update by any authenticated`,
`flags readable by anon`, `flags readable by authenticated`, `admin delete any flag`. Nothing
loses its only path.

The new RESTRICTIVE `WITH CHECK (status = 'open')` is the one that could bite. I read the
shipped `createFlag()` payload (`lib/flags.ts`): `basePayload` is
`{user_id, lat, lng, category, severity, description, photo_url, photo_alt}` (+`context_tags`
on the tagged attempt) — **`status` is never sent**, so the column default applies and the
`WITH CHECK` is evaluated against `'open'`. No shipped insert can violate it. The policy is
`TO authenticated`, so the anonymous-report path is untouched.

**2. Write-verb dimension for `authenticated` (round 2 reported SELECT losses only).** I read
the whole Stage A grant block and matched it against every shipped write:

| Shipped write | Stage A grant | verdict |
|---|---|---|
| `createFlag` insert (8–9 cols) | `INSERT (user_id, lat, lng, category, severity, description, photo_url, photo_alt, context_tags, status)` to `authenticated` **and** `anon` | covered |
| `updateFlag` `.update(guarded)` — `description/category/severity` | `UPDATE (description, category, severity, status, photo_url, photo_alt, context_tags)` | covered |
| `updateFlagStatus` `.update({status})` | same | covered |
| `.update(...).select()` / `.insert(...).select()` — the `RETURNING` half | table-level `SELECT` on `flags` to both roles | covered |
| `addComment` `.insert({flag_id, content})` | `INSERT (flag_id, user_id, content)`; `user_id` is not sent so its default applies and no privilege is checked for it | covered |
| `deleteComment` | `SELECT, DELETE ON flag_comments` | covered |
| `updateProfile` `.update(clean)` — `display_name`, then `avatar_url`/`avatar_object_key` | `UPDATE (display_name, avatar_url, avatar_object_key)` | covered |
| profile `.select('id, display_name, avatar_url, avatar_object_key, points, created_at')` | granted column-for-column | covered |
| `listLeaderboard` `.select('id, display_name, avatar_url, points')` | granted | covered |
| `admin.ts` `.select('is_admin')` | Stage A compatibility retention | covered |
| `listFlagPhotos` `.select('url, object_key, position, alt_text')` | table-level `SELECT` on `flag_photos` to both roles | covered |
| `push_tokens` insert/update/delete | `SELECT, DELETE` + `INSERT/UPDATE (user_id, token, platform)` | covered |
| `feedback` insert | `INSERT (user_id, category, body, contact_email, platform)` to **both** roles | covered |

Stage A's `authenticated` column set on `public.users` is exactly the seven columns production
grants (`avatar_object_key, avatar_url, created_at, display_name, id, is_admin, points` —
verified against `expanded-privileges.json.column_acls`), and its `flag_status_history` set is
exactly production's five. No shipped write needs a verb Stage A withholds. The things
`authenticated` loses that production has — `UPDATE` on `flag_comments`, `comment_votes`,
`feedback`, and table-level `UPDATE` on `users` — are not written by any shipped call site.

**3. Sequences (round 2 probed table/column/function/schema only).** Stage A revokes `ALL` on
`point_events_id_seq` and `realtime_subscribe_log_id_seq` from all three roles
(`…effective_privileges.sql:149-150`), and production holds `USAGE` on both for all three
(`expanded-privileges.json.sequence_acls`, 18 rows). This would break any client-side INSERT
into either table. It does not: no shipped path inserts into `point_events` (the four
`.from('point_events')` hits are `getPointEventHistory` / `getLifetimeReportOutcomes`, both
reads), and `realtime_subscribe_log` is written only through
`public.log_realtime_event(text,text)`, which I read at
`supabase/migrations/20260529053642…:46` — `security definer`, `set search_path = public`,
owned by postgres, so the sequence is reached as the owner. `service_role` is equally
unaffected: no Edge Function touches either table.

**4. `service_role` blast radius (round 2 discharged this by hand; I re-derived it).** After
Stage A, `service_role` holds only `SELECT/UPDATE (user_id)` on `flags`,
`SELECT (token, user_id)` on `push_tokens`, and `EXECUTE` on `verify_webhook_secret(text)` —
four grants, which I counted directly (`grep -c 'TO "service_role"'` → 4). That is a very
large narrowing. It is survivable because the function revokes are an **explicit 35-line
per-object enumeration** of repo-known functions only — I read the whole block — with **no**
`REVOKE … ON ALL FUNCTIONS IN SCHEMA`. The eleven out-of-band `account_deletion_*` RPCs are not
in the list, so their existing grants are untouched, and `verify_webhook_secret` (the only
direct DB call the `notify-flag-status` webhook makes) is explicitly re-granted. The
`ALTER DEFAULT PRIVILEGES` statements at `20260905055636…:29-37` and
`…effective_privileges.sql:269-272` are default-privilege changes affecting **future**
postgres-owned objects only; they do not revoke anything that exists.

**5. Storage.** Stage A contains no `storage.objects` / `storage.buckets` grant change at all
(`grep '"storage"' …effective_privileges.sql` → no hits). The only storage touch is the
`flag-photos admin delete` policy rewrite, which changes the admin check's form, not its role.

**6. Direction check.** Computing the table-level privilege delta across Stage A myself from
the replay's `before`/`after` catalogs: **zero privilege gains** for `anon`, `authenticated` or
`service_role`, on any table, anywhere. Stage A is strictly a narrowing plus its two declared
compatibility retentions. (The delta shows large *table-level* losses that are re-granted at
column level in the same migration — the table-level view alone is not a degradation
signal, and I checked each against the column grants above.)

**Conclusion.** Rounds 1 and 2 each found a real instance because the author was reasoning
from migration text; this increment's privilege reasoning now matches measured behaviour, and I
could not find a third. What I *did* find (W2c) is that the same case-by-case method is still
live in the checksum tool, where it is still producing new misses.

**Recorded, not this increment's defect:** the eleven `account_deletion_*` RPCs and the six
photo-upload / leaderboard RPCs exist in neither `supabase/migrations/` nor the replayed
catalog. No local proof — mine or the author's — can speak about them, so the `service_role`
conclusion above is bounded to "Stage A's explicit enumeration does not name them".

---

# W6 — Jest, exact in both directions

**PASS.** `npx jest --silent` at the frozen SHA on the committed tree:

```
Test Suites: 12 failed, 277 passed, 289 total
Tests:       14 failed, 32 todo, 4250 passed, 4296 total
```

Exactly the claimed **14 / 32 / 4250 / 4296**, matching
`LOCAL_ACCEPTANCE.json.jestBaselineReconciliation.runFinal_atFrozenSha` field for field.

Reconciliation by construction rather than by trusting the claim:

```
git diff --name-status 21b2bd7a96cd69a8d8fc3ff8756b88a5fe28d912..HEAD -- src/
A  src/__tests__/projectTargetSafety.guard.test.ts
A  src/__tests__/webhookTargetCoupling.guard.test.ts
```

**No non-test source file under `src/` differs from the merge base.** The 12 failing suites are
a11y / geometry / press-vocabulary / privacy-copy guards reading unchanged sources, so they
fail identically at the baseline. I extracted all 14 failing test names; every one belongs to
an untouched guard suite (`TaskCard — T8…` ×2, `T8 — one spoken voice…`, `the dismissal
standard` ×2, `focus-in standard…`, `map-chrome budget…`, `Wave 2 — expanded modal adoption`,
`THE KEYBOARD CLASS…`, `Explore close targets`, `FV-1 — focused fields…`, `BP11 / T3 — tab
bar…`, `the control now lives in the ⋯ tool sheet`, `the privacy screen renders Sky's
document, verbatim`). None is a Phase 03A artifact.

Arithmetic also closes now, which it did not at round 2: `newTestsAdded` reports
`total: 83`, `jestSubtotal: 46`, with a note explaining that the 37 pgTAP assertions do not run
in Jest. `4250 + 46 = 4296` ✓, and `composedPgTap` was re-derived to 254 / plan 37. Round-2
SHOULD-FIX 1 (`LOCAL_ACCEPTANCE.json` contradicting itself) is **closed**.

**Carried SHOULD-FIX:** `runFinal_atFrozenSha.reconciliation` still says "EXACT by failure name
in BOTH directions" while `beyondBaseline` and `inheritedNowPassing` are both `[]` and the 14
names are written nowhere. My reconciliation is by construction and it holds, but the file's
own claim still cannot be checked against a recorded baseline. Round-2 SHOULD-FIX 2 remains
open. Also note `runFinal_atFrozenSha.measuredAtCommit` is `834becc…`, one commit before HEAD,
with a stated delta of "EIGHT_FIX_DISPOSITION.json only" — that is honest, and my run at HEAD
reproduces it exactly, so the substitution is sound.

---

# W7 — FDA-028 untouched

**PASS.** Computed independently.

```
supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql
  8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771
.../rollback/20260909120000_fda028_v4_limiter.rollback.sql
  eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302

git rev-parse 21b2bd7a…:supabase/tests/fda028  → 04fec65effb8b347ae4e00dcbc3e7060672fe9cb
git rev-parse HEAD:supabase/tests/fda028       → 04fec65effb8b347ae4e00dcbc3e7060672fe9cb
```

Both file hashes match the accepted `8d1cc7e1…` / `eded3c9f…`, and the test tree hash is
identical at the candidate and at `21b2bd7a96cd69a8d8fc3ff8756b88a5fe28d912`. No FDA-028
re-review is reopened. I ran no limiter behaviour tests and make no claim about them.

---

# W8 — Overclaimed, vacuous, or newly broken

1. **The evidence-gap statement in packet §5 is newly false.** Adjudicated in W1c. It is the
   only *new* untrue claim this increment introduces, and it is in the owner-facing artifact.
   MUST-FIX 1.
2. **`EIGHT_FIX_DISPOSITION.json:23` still states the claim the MUST-FIX named.** W2b.
   MUST-FIX 2.
3. **The new coverage test certifies its own name.** `captures every catalog surface that can
   carry authorization` is a `toContain` check over eight hardcoded field names. It passes
   while four real collisions exist. Structurally identical to the round-2 finding about
   `excludes nothing structural`. Folded into MUST-FIX 3.
4. **`CAPTURED_SCHEMAS` duplicates a hardcoded list.** `scripts/structural-catalog.mjs:55`
   exports `['public','private','storage','limiter']`, and `CATALOG_SQL:75` independently
   hardcodes `unnest(array['public','private','storage','limiter'])`. They agree today;
   nothing binds them. The declared scope could drift from the captured scope silently.
   SHOULD-FIX.
5. **Round-2 SHOULD-FIX carried, each verified still open by me:** SF-2 (14 failure names not
   recorded — W6); SF-3 (`db:apply:restore` still prints rather than writes, version still
   clock-derived); SF-4 (`verifyLedgerIdentity()` still compares version + name only, not
   applied bytes); SF-5 (the Stage B in-transaction replica is still re-typed, not bound to
   `20260910120000_…stage_b_cutover.sql`); SF-6 (`--ledger` with inline JSON still throws
   `ENAMETOOLONG`); SF-7 (no `service_role` receipt in the increment — I re-derived it in W5
   but the increment still carries no such artifact); SF-9 (the
   `expanded-privileges.json` pointer was not added — and its absence is now load-bearing,
   see W1c). Round-1 SHOULD-FIX 5 (`normalizeAcl` splits on `,` before stripping quotes) and 8
   (`baseline-backups.sql` missing its `PGTAP_KIND` marker, correctly recorded as pre-existing)
   also remain.
6. **Gates confirmed, not taken on trust.** Replay exit 0 with all four flags true;
   `npx jest scripts/__tests__/structuralCatalog.test.ts` 20/20; full Jest reproduced exactly;
   FDA-028 hashes and tree hash recomputed; the frozen SHA/tree verified at entry and at exit.
7. **Nothing here is unsafe right now.** Nothing has been applied anywhere, this increment
   authorizes no mutation, and I measured zero privilege gains across Stage A for any of the
   three roles.
8. **No vacuous passes in the pgTAP suites**: `executed == planned` in all four,
   zero skipped / TODO / bailout, and the guest half flips from `lives_ok` to
   `throws_ok '42501'` across the in-transaction cutover on the *same statements*, which a
   control that cannot fail could not produce.

---

# MUST-FIX

1. **The packet tells the owner an evidence gap exists that does not.**
   `STAGING_RERUN_AUTHORIZATION_PACKET.md` §5 and the matching comment in
   `build33-compat.test.sql` say a column-level `GRANT SELECT (display_name) TO anon`
   "cannot be excluded from committed evidence" and that confirming it "needs a read-only
   capture that this tree does not currently contain".
   `qa-reports/phase03a/2026-09-04/preflight/expanded-privileges.json` **is** in this tree, is
   a read-only production-ref capture, records **zero** `anon` column ACLs, and carries an
   effective per-column probe whose `users.display_name` row for `anon` is
   `"can_select": false`. Round-2 SHOULD-FIX 9 asked for exactly this pointer. Cite it, state
   the bound as *"production's headline capture carries no column privileges, so this claim
   rests on the hash-pinned preflight capture, which excludes the grant"*, and remove the
   invented gap — including from
   `EIGHT_FIX_DISPOSITION.json.independentReviewRound2.evidenceGapTheyExposed`, which states it
   as fact.

2. **`EIGHT_FIX_DISPOSITION.json:23` still carries the false claim the MUST-FIX named.**
   `"normalizationDiscipline"` still reads *"Nothing structural is excluded; only oid and
   planner statistics are, each with a written justification a test enforces."* verbatim, with
   the correction added as a sibling key at line 27 instead of replacing it. This clause has now
   been issued twice (round-1 MUST-FIX 2 clause 3, round-2 MUST-FIX 3) and is still open in that
   file. Rewrite line 23 to the bounded statement the module header already uses.

3. **`scripts/structural-catalog.mjs` still hides real authorization changes — four more.**
   Each of the following produced an **unchanged checksum** and
   `diffCaptures() → identical: true, residualCount: 0`, with a `GRANT` control detected in the
   same run:
   - **`ALTER VIEW … SET (security_invoker = false)`** — `reloptions` is not captured. Proven
     to turn a *denied* `anon` read of `public.users` into a *permitted* one on a view shaped
     exactly like `flag_status_history_public`. This is the precise mechanism this increment's
     own guest reasoning depends on.
   - **`ALTER FUNCTION <SECURITY DEFINER> OWNER TO …`** — `proowner` is not captured, and for a
     SECURITY DEFINER function the owner is the effective privilege set.
   - **`ALTER ROLE anon BYPASSRLS`** and **`GRANT postgres TO anon`** — no role attributes or
     memberships are captured at all, while this project's own replay comparator captures both.
   Capture `reloptions` (or at minimum `security_invoker` / `security_barrier`), `proowner`, and
   role attributes + memberships; add a named regression test per surface; and replace
   `captures every catalog surface that can carry authorization` — which is a `toContain` check
   over eight hardcoded field names and passes while all four of these exist — with a test that
   enumerates catalog surfaces and fails on an uncaptured one. Three rounds have each produced
   new collisions because the tool is repaired case-by-case from reviewer findings rather than
   derived from an inventory.

---

# SHOULD-FIX

1. **Correct the `flag_comments` line in the Stage A retention rationale**
   (`20260905073925_phase03a_effective_privileges.sql:205-220`). The block still says the five
   relations are read by shipped Build 33 "without gating on a signed-in user" and that revoking
   them "does not degrade a guest to an empty list — the client call THROWS". For
   `flag_comments` the call throws *already*. `point_events` was carved out; `flag_comments`
   was not.
2. **Bind `CAPTURED_SCHEMAS` to `CATALOG_SQL`.** The exported constant and the hardcoded
   `unnest(array[…])` inside the query are two independent lists that agree only by inspection.
3. **Write the 14 inherited Jest failure names down.** `runFinal_atFrozenSha.reconciliation`
   claims "EXACT by failure name in BOTH directions" while `beyondBaseline` and
   `inheritedNowPassing` are both `[]`. Round-2 SHOULD-FIX 2, still open.
4. **Label the guest embed assertion as the privilege proxy it is.** The `throws_ok` executes a
   `LEFT JOIN`, not the PostgREST embed. Correct proxy, imprecise label.
5. **Carried and still open** (each verified by me): round-2 SHOULD-FIX 3 (`db:apply:restore`
   prints instead of writing; clock-derived version), 4 (`verifyLedgerIdentity()` does not bind
   applied bytes to the plan), 5 (Stage B replica not bound to the cutover file), 6 (`--ledger`
   inline JSON crashes with `ENAMETOOLONG`), 7 (no `service_role` inventory receipt in the
   increment), 9 (the `expanded-privileges.json` pointer — now escalated to MUST-FIX 1); and
   round-1 SHOULD-FIX 5 (`normalizeAcl` comma/quote parsing) and 8 (`baseline-backups.sql`
   `PGTAP_KIND` marker, pre-existing).
6. **Record the `ALTER DEFAULT PRIVILEGES` forward effect for `service_role`.** Stage A's
   `ALTER DEFAULT PRIVILEGES FOR ROLE postgres … REVOKE ALL ON FUNCTIONS FROM … service_role`
   applies to any *future* postgres-owned function, which includes any account-deletion
   migration applied after Phase 03A. Harmless today, load-bearing later; it belongs in the
   packet, not only in a reviewer's report.

---

# What I could NOT verify, and why

| Item | Why not |
|---|---|
| That a shipped Build 33 client — guest or signed-in — actually behaves as predicted against a Stage A database | Requires a hosted target. Out of bounds. Every client conclusion here is a measured privilege / RLS / policy outcome in local PostgreSQL plus a reading of the shipped call sites, not an end-to-end client run. |
| Production state beyond the committed captures | No production contact. `production-catalog-capture.v2.json` and `expanded-privileges.json` (both 2026-09-05) were read from disk; I did not confirm either still reflects production today, and neither can be re-measured here. My W1c finding says the tree's evidence excludes an `anon` column grant — not that production is unchanged since the capture. |
| Anything about staging `ctshxbykuemeqnofqcdh` | No staging contact. Every ledger, wall-clock-substitution and hosted-digest claim is taken from banked receipts. |
| Whether the hosted round-trip divergence is fixed | It does not reproduce locally — `restorationExact` and `reapplyDeterministic` were both true in my run. Whether it recurs hosted is unknowable without a hosted run. |
| Whether `verifyLedgerIdentity()` catches a real Management-API apply | Not exercised in this round; both apply mechanisms are prohibited here. |
| That the 14 Jest failures fail identically at the merge base | Not executed at `21b2bd7a…`. Established by construction instead: no non-test source file under `src/` differs between the merge base and HEAD. |
| The account-deletion, photo-upload and leaderboard RPC surface (17 functions) | They exist in neither the repo migration set nor the replayed catalog, so no local proof can speak about them. My `service_role` conclusion is bounded to "Stage A's explicit per-object revoke list does not name them". |
| FDA-028 behaviour | Only byte identity was in scope and it holds exactly. I ran no limiter behaviour tests. |
| Whether collisions 6c / 6d are in or out of the tool's intended scope | The new header scopes the tool to `CAPTURED_SCHEMAS`, and roles are not schema-scoped. I record them as real misses with that caveat; 6a and 6b are unambiguously in scope. |

---

*Round-3 independent reviewer. No authorship of the reviewed corrections or of the round-1 /
round-2 reviews. Local PostgreSQL only; staging and production never contacted. All temporary
harnesses, probes and extracted trees were written outside the repository and destroyed. No
commit, no push, no merge, no branch change; `git status --porcelain` empty and HEAD/tree
unchanged at exit (`80751ad6…` / `fb4c6987…`). No secret reproduced.*
