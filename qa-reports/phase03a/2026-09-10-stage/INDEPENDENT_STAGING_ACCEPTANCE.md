# Phase 03A — independent staging acceptance

**Role:** independent acceptor. I did not author any Phase 03A work. My objective was to
falsify the staging claims, not to ratify them. Everything below marked PASS is backed by
evidence I obtained myself against the hosted staging branch.

**Reviewed state (pinned):**

| Item | Value |
|---|---|
| Worktree | `/Users/skypie/AccessMap-codex/p03a-backend-foundation-20260903` |
| Branch | `repair/flagstone-p03a-backend-foundation-20260903` |
| HEAD at review | `c1b7b2182e20cf955930b02eb2ce078f1276b195` |
| Uncommitted at review | `OP_RESTORE_REAPPLY.json` (modified — I reviewed the working-tree version, sha256 `474e4e677188b191c54e18f05b427efddb73163fc087badcc2631e04f71e4cb4`) |
| Hosted target | `ctshxbykuemeqnofqcdh`, branch `441acc38-d71c-4a87-883e-61ff87e0c52e` |
| Production ref | `kldlwszpfkdmsjrjhjym` — **never contacted** |

**My own conduct:** read-only throughout. No `INSERT`/`UPDATE`/`DELETE`/DDL, no apply, no
rollback, no deploy, no Vault change, no push, no merge, no branch deletion. I ran the
Supabase CLI from a **scratch working directory** (`…/scratchpad/wd`) holding a copy of
`supabase/config.toml` and `.temp/`, so nothing was written into the repo's `supabase/`
tree. Every hosted call was `supabase db query --file` with an explicit
`--project-ref ctshxbykuemeqnofqcdh`, and the identity gate below ran before anything else.
No secret value was printed, logged or written to disk (the anon key was held only in a
shell variable and used in-line).

> **Note on a moving target:** the author committed `STEPS 8-11` and `STEP 13` and modified
> `OP_RESTORE_REAPPLY.json` while this review was in progress. This verdict applies to the
> state pinned above.

---

# Verdict

## ACCEPT WITH MANDATORY CHANGES

The staging rehearsal itself is genuinely good work, and unusually honest: the receipts
volunteer their own defects (mis-versioned ledger rows, two candidates applied outside the
ledger, a flaky test that was the author's own bug, the round-trip digest FAIL, the open
bypass, the IPv6 transport split). I re-derived C1, C2, C4, C5, C6 and C8 from scratch and
they hold. Nothing I found contradicts a receipt claim.

What I am **not** willing to sign off is the downstream `PRODUCTION_AUTHORIZATION_PACKET.md`
as it currently stands. It contains one hosted claim with no receipt behind it, and — more
seriously — it presents "the Build 33 rollout constraint" as being solely about the limiter
cutover, when the proposed apply set contains **two changes that break already-shipped
Build 33 clients on day one, independently of the limiter**. That belongs in MUST-FIX, not
in a footnote, before an owner is asked to authorize anything.

Staging is clean, safe, and correctly left. No production surface was touched.

---

# C1 — Staging identity — **PASS**

Evidence I obtained (hosted, read-only):

```
ledger_count = 82        ledger_max = 20260910162409
limiter_schema = 1       limiter_functions = 20
auth.users = 0           public.users = 0
public.flags = 0         public.feedback = 0
vault.secrets = 1        webhook_secret = 0
pg_version = PostgreSQL 17.6 on x86_64-pc-linux-gnu
```

* The CLI connection resolves to pooler user `postgres.ctshxbykuemeqnofqcdh` at
  `aws-0-us-west-2.pooler.supabase.com`. The production ref string appears **nowhere** in
  the pooler URL.
* The CLI emitted `Initialising login role...` on connect — preview-branch behaviour.
* `supabase projects list` returns exactly two standalone projects:
  `kldlwszpfkdmsjrjhjym` ("Accessable City App", created 2026-05-20) and
  `zhpoqbrhaztejmtfjyad` ("studio-archive"). `ctshxbykuemeqnofqcdh` is **not** a standalone
  project, which is consistent with it being a preview/development branch of production.
* Every one of the 13 `public` base tables has **0 rows**; `auth.users`, `auth.identities`,
  `auth.sessions`, `auth.refresh_tokens`, `auth.audit_log_entries` and `storage.objects` are
  all 0. Production is a live app with real accounts; a database with zero users is not it.

**No production data. Distinct from production. Disposable.** Confirmed.

### Safety defect found while verifying C1 (MUST-FIX 1)

`supabase/.temp/linked-project.json` is **tracked in git** and its `ref` field is
**`kldlwszpfkdmsjrjhjym` — production**. The only things steering the CLI to staging are
the *untracked* `supabase/.temp/project-ref` file and the explicit `--project-ref` flag.

Consequence: anyone who clones this worktree, or who runs after `.temp/project-ref` is
cleaned, and issues `supabase db push --linked` or `supabase db query --linked` **without**
`--project-ref`, targets **production**. `OP_RESTORE_REAPPLY.json`'s statement
*"No production target was ever reachable from the linked ref"* is not accurate as written:
the repository's committed link state names production. I neutralised this in my own scratch
copy rather than trusting the flag alone.

### What I could not verify here

`isDefault: false`, `persistent: false`, `withData: false` come from the Management API
branches endpoint, which returns **HTTP 403** for this account
(`LegacyBranchesListUnexpectedStatusError`). I could not re-derive those three fields. They
are corroborated by everything above but are not independently proven by me.

---

# C2 — All 8 candidates present; on-disk hashes still match — **PASS**

## File hashes (locally recomputed with `shasum -a 256`)

All 8 forward and all 8 rollback files match `candidate-contract.json` **exactly**,
including the two load-bearing ones the task named:

```
8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771  20260909120000_fda028_v4_limiter.sql          MATCH
eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302  …rollback/20260909120000_fda028_v4_limiter.rollback.sql  MATCH
```

The three pgTAP suite hashes also match the contract (`9dff5146…` / `b341500a…` /
`5c9171b3…`), with plans 25 + 113 + 79 = **217**.

## Hosted catalog presence — all 8, verified individually

| # | Candidate | What I checked hosted | Result |
|---|---|---|---|
| 1 | `flag_policies` (FDA-009) | `flags_user_scoped` policy absent | ✅ |
| 2 | `open_inserts` (FDA-023) | `flags authenticated insert open` present, **RESTRICTIVE**, cmd INSERT | ✅ |
| 3 | `profile_updates` (FDA-021) | `authenticated` UPDATE columns on `public.users` = exactly `{avatar_object_key, avatar_url, display_name}`; table-wide UPDATE false; `anon` = `{}` | ✅ |
| 4 | `contextual_profiles` (FDA-026) | `users readable by authenticated` absent; 4 public RPCs + 3 private RPCs present; `is_admin` unreadable by anon **and** authenticated | ✅ |
| 5 | `trigger_execute` (FDA-010) | all 6 named trigger functions: EXECUTE false for `PUBLIC`, `anon`, `authenticated` | ✅ |
| 6 | `client_privileges` (FDA-012) | zero public tables carry TRUNCATE/REFERENCES/TRIGGER for anon or authenticated; sequence UPDATE revoked on both sequences; 7 `pg_default_acl` rows for `postgres` | ✅ |
| 7 | `effective_privileges` (FDA-012) | `service_role` has **no** table-wide SELECT on `flags` but **does** have column SELECT on `user_id`; no `service_role` INSERT on `flags` | ✅ |
| 8 | `fda028_v4_limiter` | see below | ✅ |

**The strongest single piece of evidence I obtained.** I pulled `prosrc` for all 20
`limiter` functions from the hosted catalog, extracted the 20 corresponding dollar-quoted
bodies from the accepted `20260909120000_fda028_v4_limiter.sql`, and compared md5s:

```
limiter function body md5 match: 20 identical, 0 mismatched, 0 missing
(file defines 20, hosted has 20)
```

Also confirmed hosted: 5 limiter tables (`bucket`, `config`, `grant`, `key_state`,
`translation_prefix`), the `guard_window_domain` trigger on `limiter.config`, FK
`(bucket_key, window_id) → limiter.bucket ON DELETE CASCADE`, 4 seeded translation
prefixes, config `86400/5/50/32/64/require_public_ip=true/enabled=true`, and `key_state`
at `epoch = -1, window_seconds = NULL` (unseeded, as designed).

## Ledger — author's disclosure independently confirmed

The hosted ledger holds **6** Phase 03A rows, recorded under wall-clock apply times
(`20260910162314`…`20260910162409`) rather than their canonical filename versions.
`phase03a_effective_privileges` and `fda028_v4_limiter` have **no ledger row at all**.
Both problems are exactly as the author recorded them, and MUST-FIX 1 in their packet
addresses it. Presence of candidates 7 and 8 is proven by the catalog, not the ledger —
which is why the body-hash comparison above matters.

---

# C3 — FDA-028 hosted behaviour — **PASS (split: dynamic for isolation, static for exhaustion)**

I did not call `limiter.admit_guest_flag` or any `admit_*` function: they write a real
`public.flags` row, which is a mutation. I therefore split this claim.

## What I proved DYNAMICALLY on hosted staging (read-only, pure functions only)

`limiter.normalize_source` (STABLE), `limiter.derive_bucket_key` (IMMUTABLE) and
`limiter.is_public_unicast` (IMMUTABLE) perform no writes; I called them directly and got
real hosted results, using a dummy 32-byte epoch key so no Vault read was triggered:

| Input | `normalize_source` | derived bucket key (16 B hex) |
|---|---|---|
| `203.0.113.10` | `v4:203.0.113.10/32` | `ae45ea134aef01c8cc8054fe00394469` |
| `203.0.113.10` (repeat) | `v4:203.0.113.10/32` | `ae45ea…` (identical) |
| `203.0.113.11` | `v4:203.0.113.11/32` | `131ddf5028b429f8770a0a50a27eaa32` |
| `2001:db8:1:1::5` | `v6:2001:db8:1:1::/64` | `91a2cbcca61f948bc7cbf7a0a22a8e4d` |
| `2001:db8:1:1::9999` | `v6:2001:db8:1:1::/64` | `91a2cb…` (identical — /64 grouping works) |
| `2001:db8:2:2::5` | `v6:2001:db8:2:2::/64` | `2a00322967a5092f3525b3099fefddc8` |
| `64:ff9b::203.0.113.10` | `v4:203.0.113.10/32` | `ae45ea…` (NAT64 unwrap) |
| `::ffff:203.0.113.10` | `v4:203.0.113.10/32` | `ae45ea…` (v4-mapped unwrap) |
| `10.0.0.5`, `192.168.1.1`, `fe80::1`, `::1` | `NULL` | refused (fail closed) |
| `203.0.113.0/24`, `""`, `"a, b"`, `not-an-ip`, `NULL` | `NULL` | refused (fail closed) |

Distinct epoch keys over the same prefix produce distinct bucket keys (key ratchet is
load-bearing). **The "a DIFFERENT source keeps an INDEPENDENT budget" half of C3 is proven
on the real hosted object**, because `limiter.bucket` is keyed `PRIMARY KEY (bucket_key,
window_id)` and distinct sources demonstrably derive distinct `bucket_key` values.

## What I proved STATICALLY only (by reading the hosted-verified function body)

Budget exhaustion. `limiter.admit_at` (body md5-identical to the accepted file):

* locks the bucket row (`INSERT … ON CONFLICT DO UPDATE` then `SELECT … FOR UPDATE`);
* `v_opening := LEAST(normal_allowance, bucket_allowance - units_consumed)`, and returns
  `REFUSED_BUCKET_EXHAUSTED` when `v_opening <= 0`;
* returns `REFUSED_BUCKET` when `units_consumed >= bucket_allowance` and `REFUSED_GRANT`
  when `g.units_consumed >= g.allowance`;
* otherwise increments both counters by exactly 1.

That is a correct exhaust-then-refuse structure. **A worth-stating nuance:** a caller that
never returns its grant mints a *fresh* grant on every call, so its effective per-window
budget is `BUCKET_ALLOWANCE` (50), **not** `NORMAL_ALLOWANCE` (5). The author does disclose
this (`RESET_CONTINUITY`: *"repeated resets terminate and never exceed BUCKET_ALLOWANCE"*),
so it is not an overclaim — but the packet's summary table is easy to misread on this point.

## Limitation, stated plainly

**The only way to truly falsify the exhaustion half is to execute real admissions, which is
a mutation. I did not do it.** I therefore cannot independently confirm the author's
`38/38 PASS, deterministic across 4 runs`, the `FULL_INSERT_ENFORCEMENT` result, or
`RESET_CONTINUITY`. Those rest on the author's suite plus the negative-control discipline
described in `OP_HOSTED_PGTAP.json`, which I judge sound but did not re-execute.

---

# C4 — R6-2: limiter advisory key not reachable from anon/authenticated — **PASS**

## From the live HTTP surface (real anon key, positive control included)

```
GET  /rest/v1/flags?select=id&limit=1                      → 200   (positive control: creds and host live)
GET  /rest/v1/key_state   [Accept-Profile: limiter]        → 406 PGRST106
     "Only the following schemas are exposed: public, graphql_public"
POST /rest/v1/rpc/admit_at [Content-Profile: limiter]      → 406 PGRST106  (same message)
POST /rest/v1/rpc/admit_guest_flag                         → 404 PGRST202
POST /rest/v1/rpc/pg_advisory_xact_lock                    → 404 PGRST202
```

**PostgREST states the exposed-schema list itself.** The author's claim is exact.

## From the catalog

| Check | Result |
|---|---|
| `anon` / `authenticated` USAGE on schema `limiter` | **false / false** (`service_role` true, `public` false) |
| limiter functions EXECUTE-able by anon or authenticated | **none (0 of 20)** |
| limiter tables SELECT/INSERT-able by anon or authenticated | **none** |
| functions in `public`/`graphql_public` callable by anon or authenticated whose body references `advisory`, `limiter.`, or `EXECUTE format/'…'` | **0** |
| functions named `%advisory%` in exposed schemas | **0** |
| total client-callable functions in `public` | 7 |
| `pg_catalog.pg_advisory_xact_lock(bigint)` EXECUTE by `anon` | **true** (platform default) |

The raw-catalog residual is real and the author disclosed it rather than hiding it. It is
only reachable by a principal that can already submit arbitrary SQL, and I confirmed no such
principal exists on the application surface.

## Edge surface

`supabase functions list` on staging returns **exactly three** functions with sha256s
matching the receipts byte for byte:

```
send-push-notification v6  verify_jwt=false  0434671ed6ad…
notify-flag-status     v8  verify_jwt=false  633db2d2ae65…
delete-account         v4  verify_jwt=true   9edfdaf21ee0…
```

No function was deployed during or for this run. None accepts a caller-supplied SQL
statement, function name or lock key.

`service_role` holds EXECUTE on only three limiter functions — `admit_guest_flag`,
`admit_guest_feedback`, `purge` — and **not** on any `*_at` variant, `admit_at`,
`current_epoch_key`, `read_epoch_key` or `write_epoch_key`. That matches the design intent
(a caller-supplied clock is owner-only).

---

# C5 — STEP 8 IPv6, normalization PASS / transport OPEN — **PASS, the split is honest**

Independently measured by me:

```
ctshxbykuemeqnofqcdh.supabase.co      A: 172.64.149.246, 104.18.38.10   AAAA: none
   (re-checked against 1.1.1.1 directly — still no AAAA)
db.ctshxbykuemeqnofqcdh.supabase.co   A: none                           AAAA: present
this host → https://one.one.one.one   HTTP 200 via 2606:4700:4700::1111  (IPv6 egress works)
```

So: no client can open IPv6 to the staging ingest hostname because none is published; the
test machine is demonstrably *not* the limitation; and the direct-DB hostname being
IPv6-only is irrelevant because the limiter never observes the DB peer address. I also
confirmed independently that the three deployed Edge Functions are the only ones and that
none is a guest-ingest path — so there is no hosted code path that reads `cf-connecting-ip`
and calls the limiter over **any** address family.

**The author neither overclaimed nor underclaimed.** Reporting `HOSTED_IPV6_NORMALIZATION:
PASS` and `HOSTED_IPV6_TRANSPORT_AND_INGESTION: OPEN` as two separate lines is the correct
call, and refusing to simulate transport and call it proof is the right instinct. The
"dormant, not dead" framing is fair: normalization becomes load-bearing the moment an AAAA
appears, with no deploy.

*(I did resolve the production hostnames' public DNS records for comparison. That is a
public-registry lookup that contacts no Supabase project; no production request was made and
no production object was read.)*

---

# C6 — STEP 10 `S3_LIMITER_PRESENT_BYPASS_OPEN` — **PASS, correctly stated, neither over- nor under-stated**

Verified by grants and policies only — I wrote no rows.

**Guest writes are open:**

```
anon column-level INSERT on public.flags    → category, context_tags, description, lat, lng,
                                               photo_alt, photo_url, severity, status, user_id
anon column-level INSERT on public.feedback → body, category, contact_email, platform, user_id

policy "flags anon insert"             PERMISSIVE INSERT TO anon
  WITH CHECK ((user_id IS NULL) AND (photo_url IS NULL) AND (status = 'open'))
policy "feedback_insert_self_or_anon"  PERMISSIVE INSERT TO public
  WITH CHECK ((user_id IS NULL) OR (user_id = (SELECT auth.uid())))
```

**Nothing routes those writes through the limiter:**

* zero limiter functions are EXECUTE-able by anon or authenticated;
* the `limiter` schema is not exposed by PostgREST (406 PGRST106, verified over HTTP);
* no trigger or client-callable function in `public` references `limiter.`;
* `limiter.bucket` and `limiter.grant` are both **0 rows** right now.

**Payload narrowing is genuinely live**, which is the part that *does* land on day one:
`anon` has no table-wide INSERT (column-scoped only), cannot set a `user_id`, cannot pre-set
`status`, and cannot read `public.users` at all (`users_select_cols_anon = {}`).

So the claim "the limiter is installed and correct, and nothing in the guest path calls it"
is exactly right. This is the author's most self-damaging claim and it survives scrutiny.
I could not re-derive their two HTTP 201 probes without writing rows, but the grant/policy
evidence is sufficient and arrives at the same conclusion.

---

# C7 — STEP 11 round-trip structural divergence — **PASS on characterisation; two things need tightening**

## The finding is correctly characterised and correctly severity-rated

`ROUND_TRIP_STRUCTURAL_IDENTITY: FAIL` with
`severity: MUST-FIX BEFORE ANY PRODUCTION ROLLBACK IS RELIED UPON` is the right call. The
author did not average it away, did not hide it behind the 286/286 behavioural result, and
explicitly owned the checkpoint-discipline failure (*"I hashed the original post-apply state
but did NOT retain its full structural JSON"*). The later-added
`furtherLocalisationAttempted` block is labelled `INCONCLUSIVE — not reported as a finding`,
which is the correct discipline. **Nothing is being smoothed over on this point.**

I independently confirmed the mechanism the author blames: the rollbacks really are
forward-restoration scripts, not exact inverses. Every rollback file is banner-marked
`UNSAFE_BASELINE_RESTORE`, and e.g. `20260905055629_…rollback.sql` recreates
`flags_user_scoped` from hand-written text
(`USING (user_id = auth.uid())`) rather than restoring the catalog's stored expression form
(the live catalog normalises to `(SELECT auth.uid() AS uid)`).

## What I could NOT verify

I cannot reproduce `09c42928…`, `2d7b9f65…` or `c70e119a…`: the digest recipe is described
in prose but not published as a script, and re-deriving any of them would require executing
a rollback. **SHOULD-FIX:** ship the digest generator alongside the JSON so a reviewer can
recompute it.

## Two things that ARE being under-stated

**(a) Header framing.** `OPERATION_STATE: "VERIFIED"`, `RESTORATION_REHEARSAL: "PASS"` and
`REAPPLY_REHEARSAL: "PASS"` sit directly above a `FAIL`. A reader skimming the top three
lines gets a materially rosier picture than the unit earned.

**(b) Staging now holds the DIVERGED catalog.** `stagingEndState.structural_sha256` is
`c70e119a…` — i.e. the post-round-trip variant, **not** the first-apply catalog on which
STEPS 5–10 were originally measured. The receipt presents this as an ordinary end state
without flagging it. Every later re-verification — including all of mine — measures the
diverged variant. I did verify that **all Phase 03A controls are present and correct in the
diverged state** (see C2/C4/C6), which bounds the risk to something non-security-relevant,
but the receipt should say this explicitly rather than leaving a reviewer to work it out.

## A concrete, untested localisation hypothesis (SHOULD-FIX)

The author's own data constrains the answer more than they used. A rollback that maps
**both** `09c42928…` **and** `c70e119a…` to the *same* `2d7b9f65…` is a collapsing map:
whatever differs is something the rollback normalises away. The classic candidates, neither
of which the author tested:

1. **ACL array ordering.** `REVOKE ALL` followed by re-`GRANT` reorders `aclitem` entries in
   `relacl`/`attacl`. If the digest serialises grants without an `ORDER BY`, a semantically
   identical catalog hashes differently.
2. **`pg_default_acl` entry presence.** Candidate 6 issues `ALTER DEFAULT PRIVILEGES …
   REVOKE`; a default-ACL row can exist-with-entries or vanish entirely depending on the
   revoke/grant path taken. I currently measure **7** `pg_default_acl` rows for `postgres`.

Cheapest test, no new mutation required: recompute the retained `c70e119a…` JSON with an
**order-insensitive** grant serialisation and see whether the digest is order-sensitive at
all. If it is, the mystery is bookkeeping, not posture.

## A finding the author missed entirely (SHOULD-FIX)

**The migration ledger was never rolled back.** `ledgerCountUnchangedThroughout: 82` is
presented as reassuring. It is not: the 6 `phase03a_*` ledger rows stayed present through
all three rollback cycles, so during each rolled-back window the ledger asserted that
migrations were applied which were **not**. On production that is a live integrity gap — a
subsequent `supabase migration list` / `db push` would consider those candidates applied and
skip re-applying them after a rollback. No receipt mentions this.

---

# C8 — Residue and privacy — **PASS**

## Residue (measured by me, hosted, just now)

```
auth.users 0   auth.identities 0   auth.sessions 0   auth.refresh_tokens 0
auth.audit_log_entries 0           storage.objects 0   storage.buckets 1
public: all 13 base tables have 0 rows (no table returned a non-zero count)
limiter.bucket 0   limiter.grant 0   limiter.key_state 1 (epoch -1, unseeded)
limiter.translation_prefix 4
vault.secrets = 1, name = ["fda028_limiter_epoch_key"]   webhook_secret = 0
limiter.dev_key_material exists = false
```

Every claimed residue target is met. Two extras worth recording as *good*:

* the `webhook_secret` standing constraint holds — its absence is what keeps
  `notify_flag_status_webhook`'s hardcoded **production** URL inert on staging;
* `limiter.dev_key_material` does **not** exist hosted, so the local-only keyless fallback
  branch is genuinely unreachable here and the Vault path is the only key path.

## Privacy scan of every file in `2026-09-10-stage/`

| Scan | Result |
|---|---|
| JWT-shaped tokens (`eyJ…`) | **none** |
| `sb_*` keys / service-role key material | **none** |
| email addresses | **none** |
| hex runs ≥ 40 chars | all are git SHAs / sha256 file digests / structural digests — **no 64-hex key material** |
| IPv4 literals | `172.64.149.246`, `104.18.38.10` (Cloudflare anycast infrastructure, not clients); `203.0.113.0/24` sentinels — **no real client address** |
| IPv6 literals | `2001:db8::/32` sentinels and reserved prefixes only |
| UUIDs | branch id `441acc38-…` (infrastructure) and one synthetic staging auth-user id |

**No secret, no real user identifier, no raw network address of a real client.** The
`203.0.113.x` / `2001:db8::` usage is exactly the documentation-sentinel discipline claimed.

### Stale receipt (SHOULD-FIX)

`OP_R6_RESIDUAL.json` still records the synthetic auth user as
`"deleted": false` and carries a write-ahead note listing its removal as a *required
follow-up*. The deletion **did** happen — I measured `auth.users = 0` — but that is stated
only in prose inside a different receipt (`OP_RESTORE_REAPPLY.json`). The R6 receipt should
be reconciled so it does not read as an open cleanup obligation.

---

# Additional findings from active hunting

## H1 — Build 33 clients ARE broken by this apply set, independently of the limiter (MUST-FIX)

This is the most significant thing I found, and no receipt raises it.

The receipts frame the Build 33 constraint **solely** as: *revoking `anon` INSERT would break
shipped clients, so we are not doing that* (`OP_ROLLOUT_TRUTH.json` →
`theCoordinatedRolloutConstraintRestated`; packet §5e). But two accepted candidates change
what **authenticated** Build 33 clients can read:

* `20260905055633_phase03a_contextual_profiles.sql` drops the `users readable by
  authenticated` policy and issues `REVOKE SELECT (is_admin) ON public.users FROM PUBLIC,
  anon, authenticated`.

I confirmed the resulting hosted posture:

```
public.users policies: exactly TWO, both TO authenticated
  "users own row full select"  SELECT  USING ((SELECT auth.uid()) = id)
  "users update own row"       UPDATE
authenticated SELECT columns on public.users: {avatar_object_key, avatar_url, created_at,
                                               display_name, id, points}   ← is_admin ABSENT
anon SELECT columns on public.users: {}   (none)
```

I then checked the **actual shipped Build 33 source**, both the iOS source commit
(`f5594171e75bc5ec92a87d0392c361601ddedfba`) and the deployed web commit
(`ebf091c21066d39898160b1357bde0aa35bdb8bf`) named in `release/current.json`. **Neither
contains a single reference** to `list_public_leaderboard`, `get_my_leaderboard_rank`,
`get_comment_author_profiles` or `current_user_can_admin`. Both read `public.users`
directly:

| Build 33 call site | What breaks after this apply |
|---|---|
| `src/lib/admin.ts:31` — `.from('users').select('is_admin').eq('id', user.id).single()` | **Hard break.** `is_admin` column SELECT is revoked → `42501`. Code degrades to non-admin. **Every admin on Build 33 silently loses the admin UI.** The code's own comment says *"a 42501 here would now mean a real regression."* |
| `src/lib/flags.ts:1682` — `listLeaderboard()` selects `id, display_name, avatar_url, points` across all users | **Silent data break.** Only the caller's own row is now visible. The top-20 leaderboard collapses to ≤1 entry. No error is raised. |
| `src/lib/flags.ts:1702/1717` — `getUserLeaderboardRank()` head-count `.gt('points', …)` | **Silent wrong data.** Counts only visible rows → every user's rank becomes 1. |
| `src/lib/comments.ts:32` — PostgREST embed `users!flag_comments_user_id_fkey(display_name)` | **Silent data break.** Every other author's `display_name` resolves to `null` → the whole comment UI falls back to "anonymous author". |

That the current app HEAD already migrated `comments.ts` to
`supabase.rpc('get_comment_author_profiles', …)`, and that `candidate-contract.json` lists
those four RPCs under `clientRpcRequirements`, is direct evidence that a coordinated client
release is **required** — the same class of constraint the author documented meticulously
for the limiter cutover, and omitted here.

None of this makes FDA-026 wrong; closing a broad profile-read hole is the point. But it
must be sequenced against a client release, and the owner must be told before authorizing,
not after an admin reports they have lost the admin tab.

## H2 — An unreceipted hosted claim is in the production packet (MUST-FIX)

`PRODUCTION_AUTHORIZATION_PACKET.md` §4, under the heading **"What staging actually
proved"**, contains:

> `Hosted concurrency | 25 parallel admissions, allowance 8 → exactly 8 admitted, 8 real rows, 8 ledger units, 0 orphans, no overshoot`

**There is no receipt for this in `2026-09-10-stage/`.** None of the nine operation records
mentions parallel admissions. The string appears in exactly two places: `state.json`
(`/stage/HOSTED_CONCURRENCY`) and the packet itself. The nearest actual evidence is
`qa-reports/phase03a/2026-09-09-gab4/V4EF_LOCAL_RESULTS.json`, which is explicitly
`"hostedContact": false`, ran on disposable **local** clusters, and records different
shapes (40/10, 60/25, 30/1) — not 25/8.

From my position this claim is **UNPROVEN**. It may well have been run; but a
production-authorization document must not carry a hosted result whose receipt does not
exist in the receipt set it cites. Either bank the receipt or strike the row.

## H3 — Things that could have passed vacuously, checked and cleared

* **The pgTAP `finish()` sink rewrite.** Replacing `select * from finish()` with
  `select count(*) … from finish()` is exactly the kind of change that can manufacture a
  zero. The author ran two negative controls (a deliberate `ok(false)` → 1 row; a plan/run
  mismatch → 1 row). That is the right control design and I accept it. I did **not** re-run
  the suites (executing them requires DDL/DML even inside a transaction).
* **Fixture-shadowing.** I checked all three suites for objects that could shadow the real
  ones. The only objects created are deliberate negative-control probes
  (`phase03a_default_probe`, `phase03a_ref_probes.*` used inside `throws_ok(…, '42501')`).
  The suites assert against the real `public`/`storage` catalog, not a private replica.
* **Suite integrity.** All three suite sha256s match `candidate-contract.json`, and the
  declared plans sum to exactly the reported 217.
* **The author's own two self-caught test bugs** (the `has_table_privilege` vs column-grant
  assertion, and the `order by grant_id desc` flakiness on a random UUID) are both cases of
  the author testing their own fixture rather than the real object — and in both cases they
  caught it, root-caused it, and recorded it rather than re-running until green. That is the
  behaviour I was looking for and did not find missing.

## H4 — Forward-looking residuals (SHOULD-FIX)

* `service_role` holds EXECUTE on `limiter.purge()`, which can zero every live budget. Same
  trusted-operator boundary as the `vault.decrypted_secrets` residual the author already
  recorded — worth pairing them in one explicit decision rather than two footnotes.
* When a guest-ingest path is eventually built, `p_source_raw` **must** be fed from the
  trusted edge signal (`cf-connecting-ip`), never from a client-supplied header. The
  receipts describe the DB contract as *"no fallback to any caller-controlled header"* — true
  of the function, but the function trusts its argument completely and
  `admit_guest_flag` is `service_role`-executable. The trust boundary lives in the caller
  that does not exist yet; write that constraint down now, while it is cheap.

---

# MUST-FIX

1. **The committed link state points at production.** `supabase/.temp/linked-project.json`
   is tracked in git with `ref: kldlwszpfkdmsjrjhjym`. Repoint it to staging, or untrack it
   and `.gitignore` `supabase/.temp/`, and make `--project-ref` mandatory in the production
   runbook. Correct the sentence in `OP_RESTORE_REAPPLY.json` claiming no production target
   was reachable from the linked ref.
2. **Record the Build 33 authenticated-read breakage as a first-class rollout constraint**
   (H1). FDA-026 plus the `is_admin` column revoke break Build 33's admin gate (hard, 42501),
   leaderboard, rank and comment-author display. Name the four call sites, state that a
   coordinated client release shipping the four new RPCs is required, and put the sequencing
   decision in front of the owner alongside §5b — not after it.
3. **Bank a receipt for the hosted concurrency claim, or strike it from the packet** (H2).
   `25 parallel / allowance 8` currently appears in `state.json` and
   `PRODUCTION_AUTHORIZATION_PACKET.md` §4 with no receipt in `2026-09-10-stage/`; the only
   real concurrency evidence is local, not hosted, and uses different shapes.
4. **Carry the author's own packet MUST-FIX 1 forward unchanged** — the apply mechanism used
   on staging is not fit for production. I independently confirmed both halves: 6 candidates
   are recorded under wall-clock versions (`20260910162314`…) instead of their canonical
   filenames, and candidates 7 and 8 have **no ledger row at all**.
5. **Retain full structural JSON, not just digests, around any production apply**, and
   publish the digest recipe so the round-trip delta (§C7) can be localised by someone other
   than its author.

# SHOULD-FIX

1. **Rollback must also unwind the ledger.** The 6 `phase03a_*` ledger rows survived all
   three rollback cycles, so a rolled-back database still claims those migrations are
   applied. Add ledger reconciliation to the rollback runbook. (Not raised in any receipt.)
2. **Test the ordering hypothesis for the round-trip divergence** before treating it as
   unlocalisable: recompute the retained structural JSON with an order-insensitive grant
   serialisation, and check `pg_default_acl` presence/absence around candidate 6's
   `ALTER DEFAULT PRIVILEGES`.
3. **Fix the receipt headers in `OP_RESTORE_REAPPLY.json`** so `OPERATION_STATE` /
   `RESTORATION_REHEARSAL` / `REAPPLY_REHEARSAL` do not read as unqualified PASS above a
   `FAIL`, and state explicitly that staging now holds the **diverged** catalog
   (`c70e119a…`), not the first-apply catalog.
4. **Reconcile `OP_R6_RESIDUAL.json`** — it still says `"deleted": false` for the synthetic
   auth user and lists its removal as an outstanding follow-up. The user is gone
   (`auth.users = 0`, verified).
5. **Fold `limiter.purge()` (service_role) into the same explicit decision** as the
   `vault.decrypted_secrets` residual, and record the "ingest caller must supply the trusted
   edge signal" constraint now.
6. **Make the `NORMAL_ALLOWANCE` vs `BUCKET_ALLOWANCE` distinction explicit** in the packet
   summary: a grant-less caller's effective per-window budget is 50, not 5.

---

# What I could NOT verify, and why

| Item | Why not |
|---|---|
| Budget exhaustion by real admissions (the second half of C3) | `limiter.admit_guest_flag*` writes a real `public.flags` row. I am a read-only acceptor. Verified statically from the hosted-verified function body instead. |
| The 217 / 31 / 38 / 24 / 286 assertion counts | Re-running the suites requires executing DDL/DML, even inside a transaction. I verified the suites' hashes, plans, sink design and negative-control design instead. |
| `RESTORATION_REHEARSAL` / `REAPPLY_REHEARSAL` PASS, and the three digests | Requires performing a rollback and a reapply. The digest recipe is also not published as a runnable script. |
| "A rollback does not break Build 33 clients" (`HTTP 201` while rolled back) | Requires both a rollback and guest writes. |
| The two `HTTP 201` guest-write probes in `OP_ROLLOUT_TRUTH.json` | Requires writing rows. I reached the same conclusion from grants and policies. |
| Branch `isDefault` / `persistent` / `withData` | Management API branches endpoint returns **HTTP 403** for this account. Corroborated by the projects listing and by an empty `auth.users`, but not directly proven. |
| Anything at all about production `kldlwszpfkdmsjrjhjym` | Out of bounds by instruction. The only production-related action I took was a public DNS lookup of its hostnames, which contacts no Supabase project. |
| Phase 02 candidates 1–5 pre-states | Those were consumed by the apply before I arrived. I verified their post-state effects in the current catalog only. |

---

**Bottom line.** The staging execution is accepted: identity is sound, the artifacts on
disk and in the hosted catalog are byte-exact, the security controls are present and
verified, the limiter is correctly installed and genuinely unreachable from clients, the
IPv6 and bypass claims are honestly bounded, and staging is left clean with no secret or
personal-data leakage. The round-trip digest FAIL is a real finding that the author
surfaced against their own interest and rated correctly.

The production authorization packet is **not** ready to go to the owner until MUST-FIX 1–5
are addressed — above all MUST-FIX 2, because the current packet would let an owner
authorize an apply that silently disables the admin gate, the leaderboard, user rank and
comment attribution for every already-shipped Build 33 client.

*Independent acceptor — no authorship of Phase 03A work. Read-only throughout. Production
never contacted.*
