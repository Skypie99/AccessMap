# SHIP-READY Phase 1 — DECISIONS

Records every Sky pick + every audit-level judgment call (with rationale). Sky writes her picks in §SKY.

## §J Judgment calls made by the audit (execution-level, reversible, all read-only)

- **J-1 (2026-07-26)** Simulator evidence tier SKIPPED this train: local sim builds fail on untouched main (fmt pod vs Xcode 26.6 — fix lives on in-flight `fix/fmt-xcode26-local-sim-2026-07-25`, SEAM) and sim-MCP attach is broken. Evidence = web (static export) + code-inferred + NEEDS-SKY-DEVICE; binary-launch honesty stated top-line in 05.
- **J-2 (2026-07-26)** Brink protocol: live walks never click terminal mutating controls — the export talks to production Supabase. Submission efficacy is code+jest evidence. (An audit that inserts prod rows isn't read-only.)
- **J-3 (2026-07-26)** Live-DB drift check: only read-only Supabase MCP calls (`list_migrations`/`list_tables`/`get_advisors`) and only if the connected MCP project provably resolves to AccessMap; otherwise skipped and all SQL findings tagged `repo-inferred`. No SQL executed against the live DB in any case beyond those listed read-only calls.
- **J-4 (2026-07-26)** Reports are left UNTRACKED (repo convention: design-reviews/** is working-tree governance, untracked-by-design; R2/device-tune precedent). Sky may commit them like she did prior trains' docs — her call, noted for visibility.
- **J-5 (2026-07-26)** Evidence-tag vocabulary aligned with the established render-index set (`verified/web-approximated/code-inferred/NEEDS-SKY-DEVICE`), with `web-verified` reserved for functional truths the web build CAN prove. Rationale: consistency with device-tune/R2 index conventions.

- **J-6 (2026-07-26, recovery window)** Window-death recovery method: the original session died at 18:32 with three cluster walkers mid-run and the finished SQL sweep unbanked. Recovery = transcript mining (the SQL report banked VERBATIM as `04b_…RECOVERED.md` — zero transcription risk beats re-derivation), then three fresh agents each given their predecessor's transcript + original brief verbatim, instructed to mine-first/complete-gaps-only, with `[recovered]`/`[fresh]` provenance tags and §NOT-VERIFIED sections. No banked work was re-run; two predecessor FAILs were retracted as probe artifacts with evidence. Provenance: Fable 5 both windows.
- **J-7 (2026-07-26)** Traffic law held through recovery: the visual sweep launched only after a cluster walker completed (≤2 concurrent live walkers at all times); the surviving :8082 serve + export from the dead session were reused rather than rebuilt (same commit `512494a` — verified before reuse).
- **J-8 (2026-07-26)** SR-104/SR-105 (web SR-proxy + dropped map fit) graded HIGH **web-cohort**, not submission-blocking: the App Store artifact is the native binary, where SR-104's API is real and SR-105/107's native twins are unconfirmed (device rows). They remain HIGH because the web build is both the audit's guest-evidence proxy and a potentially user-facing surface; 05 R-13 carries the grading rationale.

## §SKY Sky's picks (empty — Phase 1 produces decisions, Sky makes them here or in 05's checklists)

_(picks recorded 2026-07-26 — see below)_

### §SKY — Ship-Ready Phase 1 picks (2026-07-26)

- **SQL slate:** APPLY ALL (post 04b §E queries 1+9 check) — rollbacks in hand
- **B-5 iPad:** IPHONE-ONLY (deliberate; iPad = future project if demand)
- **B-1 report-content:** BUILD W1 (auth-gated, F10 no-user-id shape, per fork briefs)
- **R-11 crash reporter:** ADD — crashes only, no analytics; disclosed in privacy rewrite
- **R-15 dead tables:** KEEP — flag_verifications reserved for C1 (documented)
- **SR-111 entry surface:** RATIFIED as-is

- **RLS pre-check** (04b §E q1+q9, 2026-07-26): **PASS** — `flags_user_scoped` is `ALL`/`{PUBLIC}` but owner-scoped (`USING`/`WITH CHECK` = `user_id = auth.uid()`), **not** `auth.uid() IS NOT NULL`; §F-1's CRITICAL hypothesis is falsified and non-owner DELETE of any flag is closed. q9 confirms `flags_close_nonowner_delete_and_fix_triage_20260601` (20260602060359) applied **after** `restore_flags_auth_user_only_triage_unblock_20260601` (20260602053522). SQL-slate precondition discharged.

---

## §J2 Judgment calls made during Phase 2 (execution-level, all reversible)

- **J2-1** The escape prop goes on the **containment node, not `<Modal>`** — RN 0.81.5 forwards an explicit
  allowlist and drops it. 03's G1 as written would have shipped zero behaviour with every proposed guard
  green. This supersedes 03 §2.1(B) and §3 G1's placement instruction; everything else in 03 stands.
- **J2-2** The escape pass was split into **six commits**, not one. J2-1 turns G1 from a mechanical prop
  insertion into a per-surface "identify the containment node" edit, and one commit would have put the
  PRESERVE-VERBATIM drawer and the behavioural guards inside the same revert.
- **J2-3** `flag_comments` uses one shared `COMMENT_SELECT` constant rather than two literals. Fixing one site
  and not the other is exactly how B-7 shipped as two identical bugs.
- **J2-4** `isTableMissingError` gained a PGRST200/201/202 early-out. Its loose `"does not exist"` match could
  swallow a relationship error and show "Comments coming soon" — a worse lie than an honest failure.
- **J2-5** G6's cap moves to the node whose **parent** is definite, which is the KAV on FeedbackModal (one
  extra layer) and `cardShadow` on `ui/Sheet` (a fifth surface 03 did not name). 03's suggested
  `flexShrink` on the card body could not have worked: About and Help already had it and still overflowed.
- **J2-6** B-4's icon flatten was treated as agent-buildable because the transform is deterministic and
  machine-provable (0 of 1,003,245 opaque pixels changed RGB). The **upload** remains unproven — only an EAS
  build closes ITMS-90717.
- **J2-7** R-11's crash reporter was **not** added despite Sky's ADD pick: it is a native module plus a DSN
  credential, and no agent handles credentials. Only the false comment was fixed.
- **J2-8** `expo-media-library`'s removal **required** deleting its two dead `jest.mock()` blocks in the same
  commit — a factory does not bypass module resolution. Confirmed empirically (both suites failed at load).
- **J2-9** W1 ships behind an explicit `DISPUTE_ENABLED = false` constant rather than a capability probe: the
  probe pattern selects the column, and `dispute_requests` does not exist, so it would 42703 the whole flag
  fetch and take the map down.
- **J2-10** The hide list is keyed on **content id, not author id** — most AccessMap content has no author
  (anonymous flags are `user_id IS NULL`), so "block this author" would hide every anonymous report.
- **J2-11** Exactly **one** new visible string shipped (the privacy-link label), as a PROPOSED constant in
  `copy.ts` per Sky's ratified approach, registered as a new BP16 row. `SettingsRow` gained an optional
  `subtitle` so the new row ships title-only rather than inventing a second line.
- **J2-12** G3 grabbers were **not built**. 03's "reuse the pill verbatim" is not buildable: `borderStrong` is
  undeclared in all 20 stacks manifests and lands ≈1.01–1.23 over chrome glass against a 3.0 floor. Arbiter
  first, then a mockup gate, then code — "the contrast script decides, not the eye".
- **J2-13** Read-only Supabase MCP calls were used to settle the B-7 constraint name and the applied-migration
  ledger, after confirming the connected project resolves to AccessMap (per J-3). No SQL was executed beyond
  catalog reads; no migration was applied.

## §SKY-2 Decisions Sky made for Phase 2 (2026-07-26)

- **B-1 scope:** W1 inert + the client-side block/hide list (rather than W1 alone).
- **New strings:** ship as PROPOSED constants in `copy.ts` (the `RETRY_VERB` precedent), registered as BP16 rows.
- **Focus-return:** the hook + 4 adoptions, with the remainder a counted residue — never a false green.
  *(Not delivered this phase — see `07_PHASE2_REPORT.md §3`.)*

---

## §SKY-3 Sky-triggered SQL slate — applied 2026-07-27 (Phase-3 prep window)

Supervised run, Sky as the per-statement trigger. Every item below: exact statement + rollback shown
to Sky · live pre-state re-read from the catalog immediately before apply · applied · post-state
verified read-only. Applied via `apply_migration` (not raw execute) so each lands with a **named row
in the migration ledger** — a direct response to the drift this session uncovered. Ledger versions
`20260727075327`–`20260727075821`.

- **2026-07-27 — applied C-2 (SR-009 `flag_verifications` null-safe INSERT), verified, rollback in hand.**
  Ledger `sr009_flag_verifications_null_safe_20260727`. Verified: `WITH CHECK` now carries
  `IS DISTINCT FROM` with the inner relation aliased. Rollback = commit `40433e0`.
- **2026-07-27 — applied Fork-2/OA + C-9(ii) folded (SR-008 actor guard + status-history INSERT), verified, rollback in hand.**
  Ledger `fork2_oa_actor_guard_null_safe_plus_status_history_20260727`. One `CREATE OR REPLACE`, no
  trigger DDL. Verified: history INSERT present, `is distinct from` guard present, old `<>` guard gone,
  grants still `{postgres,service_role}` only. Pre-checked safe: `flag_status_history.user_id` is
  nullable, `to_status` NOT NULL but always supplied, function is DEFINER/postgres so the
  `WITH CHECK(false)` policy is bypassed by ownership. Rollback = commit `ad09a24`.
- **2026-07-27 — applied C-10 (A4-3 owner-edit subquery alias fix), verified, rollback in hand.**
  Ledger `a4_3_owner_edit_subquery_alias_fix_20260727`. Verified: `f.id = flags.id` present,
  `flags_1.id = flags_1.id` gone. Rollback = commit `bfc1f66`.
- **2026-07-27 — applied C-3 (SR-024 `flag_photos` anon-collapse made explicit), verified, rollback in hand.**
  Ledger `sr024_flag_photos_anon_explicit_20260727`. Placeholder `RATIFIED 2026-07-XX` resolved to
  **2026-07-27** at Sky's instruction. Verified: both policies carry `user_id IS NOT NULL`; table
  comment reads back correct.
- **2026-07-27 — applied C-4 (SR-018 revoke `verify_webhook_secret` oracle), verified, rollback in hand.**
  Ledger `sr018_verify_webhook_secret_revoke_20260727`. Verified: `anon`/`authenticated` EXECUTE gone,
  `service_role` (the only real caller) intact. Live advisor confirms it dropped off the
  `security_definer_function_executable` list.
- **2026-07-27 — applied C-6 (A2-1 close the `context_tags` hole), verified, rollback in hand.**
  Ledger `a2_1_nonowner_revert_context_tags_20260727`. Verified: `context_tags` + `id` now reverted for
  non-owners, and the load-bearing `auth.uid() IS NULL` early-out is **preserved** (SR-010
  account-deletion anonymisation would break without it).
- **2026-07-27 — applied C-7 (A2-2 anon `feedback` throttle), verified, rollback in hand.**
  Ledger `a2_2_feedback_anon_throttle_20260727`. `feedback` had zero triggers pre-apply. Verified: one
  trigger `enforce_feedback_rate_limit`, `tgenabled='O'`. Cap 30/h PROPOSED — Sky tunes.
- **2026-07-27 — applied C-8 (SR-001 admin delete-comment), verified, rollback in hand.**
  Ledger `sr001_admin_delete_comment_20260727`. Verified: 2 DELETE policies on `flag_comments`.
  Closes the RLS half of the Apple 1.2 comment-moderation gap.
- **2026-07-27 — applied C-9(i) (A4-1 status-history view grant fix), verified, rollback in hand.**
  Ledger `a4_1_status_history_view_grant_fix_20260727`. Verified: exactly the named columns granted to
  `authenticated`; **`user_id` absent from both grants**, so Jordan privacy condition #1 is preserved by
  the grant itself. `anon` gets nothing.
- **2026-07-27 — applied C-11 (consolidated `auth_rls_initplan` rewrite), verified, rollback in hand.**
  Ledger `rls_initplan_consolidated_20260727`. 10 policies rewrapped. Verified with a **corrected**
  query (see §J3-4): bare-call count 11 → 1, policy counts unchanged (push_tokens 4,
  notification_preferences 3, flag_comments 4, flag_status_history 3), none lost or duplicated. Live
  advisor `auth_rls_initplan` list is now exactly one entry.
- **2026-07-27 — applied W1 (Fork 5 dispute counter), verified, rollback in hand.**
  Ledger `fork5_w1_dispute_counter_20260727`. Verified: both columns exist, RPC granted to
  `authenticated` only (`anon`/`public` revoked), reset trigger + function present. The resulting
  advisor WARN (authenticated can call a DEFINER RPC) is W1's stated design, not a regression.

### NOT applied — C-5 (SR-007 anon flag throttle). Sky's decision: SKIP.

**04b §A1-4 / SR-007 is FALSIFIED.** The finding was tagged `[repo-inferred]` and never checked
against live. `public.flags` carries **three** BEFORE INSERT rate-limit triggers, not one — including
`enforce_global_anon_rate_limit` → `check_global_anon_rate_limit()`, a repo-less, un-versioned
**global anon cap at 100/hour** that is functionally the artifact C-5 proposed to build (same shape,
same 1h window, same P0001 pause). Anonymous reporting was never uncapped server-side.

Applying C-5 would have added a second cap at 60/h; the tighter wins, so the true effect would have
been a silent tightening of the live ceiling 100 → 60 — not what the artifact claims, and not what
Sky consented to. Sky's rider had explicitly reasoned about "superseding the old client-only
decision"; that supersession had already happened, unversioned, by persons unknown.

Both un-versioned throttles banked verbatim in commit `bfc1f66` so they finally exist in version
control. **Open for Phase 3:** triggers 1 and 2 are redundant duplicates (both 20/24h per user, one
keyed on `NEW.user_id`, one on `auth.uid()`); deduplicating is a schema change and out of scope for a
Sky-triggered slate. Note before choosing which to drop: the `NEW.user_id` one also caps
service-role/dashboard inserts; the `auth.uid()` one does not.

## §J3 Judgment calls made during the Phase-3 prep apply (all reversible)

- **J3-1** Applied via `apply_migration` rather than raw `execute_sql`, so every change carries a named
  ledger row. The SQL itself is unedited. Rationale: this session found two live objects changed with
  no ledger trace; applying this slate unversioned would have repeated the exact failure being guarded
  against.
- **J3-2** Three drift-capture snapshots were banked as committed migrations **before** their fixes ran
  (C-2 `40433e0`; C-5 + Fork-2/OA `ad09a24`; C-10 `bfc1f66`), at Sky's direction, so each rollback
  points at a versioned file rather than at hand-written text in a chat transcript. Two of the four
  captured objects showed **no drift**; C-5's showed real drift, which is what stopped it.
- **J3-3** `flags_user_scoped` was **not** touched, though it is now the single remaining bare
  `auth.uid()` policy and its body is known (`user_id = auth.uid()`, ALL, owner-scoped — the same read
  that produced the RLS pre-check PASS). C-11 excludes it by name (§F-1). Rewrapping it is a
  one-line perf fix and a clean Phase-3 candidate, but it is outside every artifact Sky approved.
- **J3-4** 04b §C-11's own VERIFY regex is **unreliable and was not used as the gate**. Its
  `(^|[^.(])auth\.(uid|email)\(\)` both false-positives on already-wrapped calls (`( SELECT auth.uid()
  AS uid)` — the preceding char is a space, which the class accepts) and false-negatives on bare calls
  written as `(auth.uid() = user_id)` (preceded by `(`, which the class excludes — this is why all four
  `push_tokens` policies were invisible to it). Verification used a corrected form that strips the
  wrapped spelling before matching. Anyone re-running §C-11's verify as printed will get a wrong answer.
- **J3-5** 04b §A4-2's "two webhook triggers ⇒ double push notifications" is **falsified** — exactly one
  webhook trigger exists on `public.flags`, and there is no dashboard `supabase_functions.http_request`
  trigger, so SR-018's "literal secret in `pg_trigger.tgargs`" has no live object on this table. A4-2's
  "two `updated_at` triggers" is **confirmed** and harmless (identical bodies). Discovered incidentally
  by the C-5 pre-state read; effectively runs 04b §E probe 4.

---

## §SKY-3b Job 2 — DISPUTE_ENABLED flip (2026-07-27)

- **2026-07-27 — flipped `DISPUTE_ENABLED` to `true`, Sky-triggered, post-slate. Commit `4cb3c37`.**
  Two lines as the artifact's own header specified: the constant in `src/lib/disputes.ts`, and the guard
  test in `src/lib/__tests__/disputes.test.ts`. The guard was **inverted, not deleted** (Sky's call): it is
  a tripwire for constant-vs-migration divergence in EITHER direction, and its comment now says so and
  names the rollback path. The file header — which asserted "THIS FEATURE IS OFF … NOT applied" — was
  corrected in the same commit; shipping a comment that contradicts the constant directly beneath it is the
  same defect class as the stale Sentry claim removed in `b7a8398`.

- **GATE RESULT: tsc ✅ 0 errors · jest ✅ 167 suites / 2310 passed / 0 failed / 84 todo · eslint ⚠ NOT RUN.**
  jest is **byte-identical to the Phase-2 baseline** in HANDOFF (167 / 2310 / 0 / 84), measured across all
  eight shards. Zero failures anywhere.

  **eslint could not be run, and this is an environment limit, not a code result.** `node_modules` carries
  `@unrs/resolver-binding-darwin-arm64` (correct for Sky's Mac), but agent shell access executes in the
  Cowork **Linux VM** (`linux-arm64`), so `eslint-import-resolver-typescript`'s native binding fails to
  load and eslint aborts before linting. **Sky should run `npm run lint` locally to close this** — the
  79-warning baseline is expected to hold. Evidence the flip cannot plausibly break it: `eslint.config.js`
  declares no `max-len` and no `no-unnecessary-condition`; `prettier --check` reports the only two
  offending lines in the touched test file are **pre-existing** (the 42883/42501 mock calls, untouched by
  this commit); and the change is a boolean literal plus comments.

- **⚠ HONEST SCOPE OF THE FLIP: it changes no runtime behaviour today.** A repo-wide search finds **zero**
  consumers of `DISPUTE_ENABLED`, `DISPUTE_THRESHOLD` or `requestFlagDispute` outside `disputes.ts` and its
  own test. No screen, component or hook imports from `disputes`. The "client half" banked in `7343b0c` is
  the library only — it was never wired to UI. The flip makes the constant honest against live migration
  state; it does **not** surface a dispute affordance to users. B-1(b) is exactly as open as `07 §4` says.

- **RPC proven live end-to-end (read-only).** `increment_dispute_request` was called with a UUID matching
  no flag: returned `0` as designed, zero rows written (verified after: 18 flags, 0 non-zero
  `dispute_requests`). This is the only end-to-end proof that exists — see the backlog item below.

## §SKY-3c Job 3 — B-1 control wording (2026-07-27)

- **B-1 control label: "Flag as wrong"** — Sky's word, recorded verbatim.

- **Scope confirmation Sky required, answered from source: this control is ACCURACY-ONLY.** W1 increments
  `flags.dispute_requests`; its migration header calls it "a light signal of doubt that does NOT flip a
  flag's status", and the RPC is scoped `status in ('open','verified')`. There is no reason field, no
  category, no reporter identity, no admin queue, and it **cannot target comments at all**.

  **It is NOT the Apple 1.2(b) abuse / objectionable-content path, and that path still needs its own entry
  point.** `07_PHASE2_REPORT.md §4` records 1.2(b) as "not addressed" and states outright: *"Any report
  that closes B-1 on the strength of W1 is wrong."* C-8 (applied today) closes the **DB half** of comment
  takedown — an admin can now delete an abusive comment through the role model — but no user-facing abuse
  report control exists on flags or comments. **B-1 remains BLOCKING-OPEN.**

- **Correction, on the record:** "Hide" was offered as a candidate label in this session. That was an
  agent error, caught by Sky. `hiddenContent.ts` is the **1.2(c) block/hide mechanism** — a separate
  feature with its own affordance — not an alternate wording for the 1.2(b) report control. The two
  requirements are distinct and must not be collapsed into one control.

## §SKY-3d Job 4 — D-B6 (2026-07-27) · ⛔ BLOCKING GATE, PENDING-BUILD

**Status: UNVERIFIED. Route: TestFlight (Sky's pick).**

⛔ **This is a blocking gate. Phase 3 may NOT be marked complete, and `shipready/2-blockers-dismissal` may
NOT be merged to `main`, until Sky signs off the on-device check below.** No agent can see her phone, and
the check is meaningless without a build that CONTAINS the Phase-2 R-6 fix (commit `9235e3b`).

**Step 1 — cut the build (from the repo root, on the branch):**

```
git checkout shipready/2-blockers-dismissal
npm run deploy:testflight
```

That is `eas build --platform ios --profile testflight --non-interactive` followed by
`eas submit --platform ios --profile production --non-interactive`. Both halves were repaired in `40cccf1`
(R-12) — before that fix the script chained an internal-distribution profile that ASC cannot accept, so do
**not** substitute `build:preview`. The `testflight` profile is `distribution: store`, Release config,
`autoIncrement: true`.

**Step 2 — the 60-second check, on the device, on that build:**

1. Open **Help**. Look at the **top of the sheet**: is the **✕ close button fully visible on screen, and
   does tapping it actually close the sheet?**
2. Open **About**. Same two questions.
3. Increase text size and repeat both: **Settings → Accessibility → Display & Text Size → Larger Text →**
   turn on **Larger Accessibility Sizes** and drag the slider to the **largest (AX5)** setting. Reopen Help
   and About.

**What "failing" looks like:** the ✕ is cut off above the top edge of the sheet, or is on screen but
unreachable / does nothing when tapped. On touch there is no scrim-tap fallback, so a clipped ✕ means the
sheet **cannot be dismissed at all**.

**Verdict:**
- **PASS** (✕ visible and tappable in both sheets, at both text sizes) → **R-6 stays closed.** Record it here.
- **CLIP** (either sheet, either text size) → **R-6 upgrades from RECOMMENDED to BLOCKING.** Tell Phase 3
  immediately; it becomes a submission blocker, not a polish item.

*Why this can't be automated: `07 §1` measured the fix on the web export (About ✕ −65 → 97, Help −65 → 97,
wrapper exactly 90% of 812). Web is a proxy. The native binary is the App Store artifact, and Dynamic Type
at AX5 is a device-only condition.*

## §SKY-3e Backlog raised 2026-07-27 (not actioned this session)

1. **No end-to-end test for the dispute path.** `disputes.test.ts` mocks the Supabase client
   (`jest.mock('../supabase')`), so all six behavioural tests pass identically whether
   `increment_dispute_request` exists, works, or is broken. They cover the F38 error discipline only. The
   fork-discipline test re-reads a constant. Neither proves the RPC works. *(Sky raised this.)*
2. **`any` cast in `requestFlagDispute`.** Now that `increment_dispute_request` is typed in `database.ts`,
   the cast and its `eslint-disable` can retire. Deliberately deferred so type errors it surfaces don't mix
   into this batch.
3. **`flags_user_scoped`** is the last policy with a bare `auth.uid()`. C-11 excludes it by name (§F-1);
   its body is now known and benign (`user_id = auth.uid()`, owner-scoped). One-line perf fix.
4. **Duplicate per-user rate-limit triggers** on `public.flags` — see §SKY-3's C-5 entry.
5. **eslint cannot run from an agent shell** on this project (darwin binding vs Linux VM). Any future gate
   claiming "eslint green" from an agent session is claiming something it did not observe.
6. **`prettier --check` fails on `disputes.test.ts`** for two pre-existing lines (the 42883 / 42501 mock
   calls exceed printWidth 100). Untouched deliberately — out of scope for a Sky-triggered slate.

---

## §SKY-3f B-1 abuse leg (Apple 1.2(b)) — Phase 3 GREEN-LIT (2026-07-27)

**Sky's decision, recorded verbatim:**

> B-1 abuse leg (1.2(b)): Phase 3 is green-lit to design + build the MINIMAL
> abuse-report path — a visible "Report" action on flags and comments that
> captures a reason and routes through the existing feedback pipeline
> (verify-first; prefer zero new schema; any data half surfaced as a
> Sky-applied artifact, never auto-applied). Distinct from "Flag as wrong"
> (accuracy/W1) and from Hide (1.2(c)). Mockup-gate any visual judgment;
> Fable-optional per the routing clause.

**The three controls are distinct and must not be collapsed. This is now the
governing statement for all three:**

| Control | Requirement | Mechanism | State |
|---|---|---|---|
| **"Flag as wrong"** | — (product accuracy) | W1 `increment_dispute_request` — doubt counter on flags, no reason, no identity | DB applied 2026-07-27; `DISPUTE_ENABLED` true; **no UI consumer** |
| **"Report"** | **Apple 1.2(b)** | reason-capturing abuse report on flags **and comments**, routed to the feedback pipeline | **GREEN-LIT for Phase 3 — unbuilt** |
| **Hide** | Apple 1.2(c) | `hiddenContent.ts` client-side hide list, keyed on content id | mechanism built + tested (`bf2b36d`); visible affordance pending |

**Notes for whoever picks this up in Phase 3 — verify each before relying on it:**

- **The feedback pipeline Sky names already exists and already accepts anonymous
  writes.** `public.feedback` + `feedbackStore.submitFeedback` + `FeedbackModal`
  (global header, every screen). Its INSERT policy has no `TO` clause ⇒ role
  `public`, so guests can submit. As of today it also carries the C-7 anon
  throttle (`enforce_feedback_rate_limit`, 30/h global, applied this session) —
  factor that cap into any design that routes reports through it at volume.
- **"Prefer zero new schema" looks achievable.** `feedback` already has a
  `category` column typed by the `feedback_category` enum
  (`bug | idea | love | other`, confirmed live 2026-07-27) plus `body`,
  `contact_email`, `platform`, `user_id`. A report could ride existing columns.
  ⚠ But adding a `report` value to `feedback_category` **is** a schema change
  (`ALTER TYPE … ADD VALUE`) and therefore a Sky-applied artifact — do not
  auto-apply it. Encoding the report inside `body` avoids the migration
  entirely; that trade (queryability vs. zero-schema) is a Phase-3 fork worth
  putting to Sky explicitly rather than deciding silently.
- **Comments are the harder half and the reason this is blocking.** `feedback`
  has no `flag_id`/`comment_id` foreign key, so "which comment is being
  reported" has nowhere structured to live without schema. C-8 (applied today)
  gives an admin the *power* to delete an abusive comment; it does not give
  anyone a way to *tell* the admin which one.
- **Apple 1.2(b) requires acting on reports "in a timely manner", not merely
  collecting them.** A control that writes a row nobody reads does not close
  the requirement. Whatever ships needs a stated triage path — even a manual
  one (Sky reads the feedback table) — recorded here.
- **One new visible string minimum** ("Report"), so BP16 registration applies,
  per the `RETRY_VERB` / privacy-link precedent (`J2-11`).
- **B-1 stays BLOCKING-OPEN until this ships.** Applying W1 did not move
  1.2(b), and `07_PHASE2_REPORT.md §4`'s statement stands: *"Any report that
  closes B-1 on the strength of W1 is wrong."*

---

## §SKY-3g B-1 abuse-leg DESIGN — Sky's decision (2026-07-27), recorded verbatim

> B-1 abuse-leg design (Sky, 2026-07-27):
> Schema fork: OPTION B — encode-in-body via the existing feedback pipeline
> ("[REPORT]" prefix + structured first line: target type/id + reason field in
> the UI). NO enum ALTER, NO comment_id column now (enum additions are
> effectively irreversible — post-launch migration to structured columns is
> the recorded cleanup path).
> Triage path (state it visibly): Sky reviews [REPORT] feedback on a regular
> cadence; comment takedowns via the C-8 admin delete policy, flag takedowns
> via the existing hide/reject levers. Report → review → action, all live.

This resolves the Phase-3 fork §SKY-3f left explicitly open ("that trade —
queryability vs. zero-schema — is a Phase-3 fork worth putting to Sky
explicitly rather than deciding silently"). **Option B is chosen: zero schema.**
The `feedback_category` enum is NOT altered and no `comment_id` column is added.

## §SKY-3h Phase-3 scope decisions — Sky's picks (2026-07-27)

Given in-window at Phase-3 plan time (AskUserQuestion). Sky is the sole author
of answers; recorded here per the ledger-authorship rule.

- **G5 focus-return — SHIP 3, RE-DEFER THE 4th.** Adopt NearbyFlagsModal →
  ReportFlagModal → LegendModal (her Phase-2 picked order, minus the one that
  cannot be proven). **FlagDetailModal is re-deferred WITH its reason** as a
  counted residue in the census — never a false green. Evidence put to her:
  every one of its four openers is already focus-managed or unmounts its own
  trigger (pin callout closes on present · the Nearby row path deliberately
  leaves the list mounted so the platform already restores · TasksScreen's card
  is a `React.memo` row in a virtualized `SectionList`, where one shared ref is
  won by the last-mounted card · ProfileScreen's `handleDetailClose` **reopens**
  the list modal, which runs its own `useFocusOnOpen`, so a restore would fight
  it). Same precedent as **J2-1**: a spec superseded by a verified fact, recorded.
- **1.2(c) Hide affordance — COMMENTS ONLY.** Honest consequence she accepted:
  **1.2(c) is reported PARTIAL, not closed.** Flag-level hide (threading
  `filterHidden` through `flagsStore` → Map pins → Tasks → Home counts → the
  offline cache, plus an unhide surface in Settings) is a named follow-up, not
  this phase.
- **RECOMMENDED tier (05 §2) — BUILD: R-2, R-13, R-1 (artifact only), SR-117.**
  - **R-2** the guest reviewer-path honesty cluster ×4.
  - **R-13** the web-cohort pair (SR-104 + SR-105).
  - **R-1** deletion Storage residue — **author the edge function + rollback as a
    PROPOSED Sky-deployed artifact ONLY.** Deploying it is a production side
    effect an agent must never take.
  - **SR-117** the `flag_comments.user_id` type lie (live nullable /
    ON DELETE SET NULL vs the repo's NOT NULL / ON DELETE CASCADE).
  - **R-7 password reset was NOT picked** — deferred with reason, not dropped.

---

## §SKY-4 Moderation texts v1 — RATIFIED (2026-07-27)

Sky authored and ratified the moderation text set that B-1 / Apple 1.2 has been waiting on since Phase 3.
Banked verbatim at **`design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md`** (numbered `14_` because `13_`
was already taken by `13_B1_VERIFY_LEDGER.md`). Two resolutions were applied to the source draft on Sky's
instruction — the 24-hour commitment ratified and its 48-hour alternative struck, and the contact
placeholder resolved. Nothing else was altered; no app code, no SQL, no migration.

```
§SKY: Moderation texts ratified (2026-07-27)
Mission statement RATIFIED (v1, Sky's words): "The goal of AccessMap is to
  make the community and environment better for everyone, through those who
  have the capacity to help. Progress happens in the background for
  everyone's benefit, because accessibility benefits everyone."
  Lives in: About page, App Store description, README. Voice: Sky's, always.
ToS & Community Guidelines v1.0: RATIFIED per accessmap_moderation_texts_v1.md
  (contact = skylerhalisky@gmail.com; account-deletion wording
  matches live SET NULL behavior per SR-117)
Filter (1.2a): seed = LDNOOBW English + Sky-editable additions file;
  rejection copy ratified as drafted
Report categories: the five as listed
Response commitment: 24 hours, Sky's genuine commitment
REPORT_SENT_BODY: "Thanks, your report was sent. Reports are reviewed
  within 24 hours."
```

**Contact address resolved to `skylerhalisky@gmail.com`** — Sky-confirmed after being shown it is her
personal Gmail and that a published ToS is a more durable surface than an in-app alert. It is the same
address the report failure ladder surfaces, so doc and app agree: `FEEDBACK_EMAIL` in `src/lib/feedback.ts`
→ `reportFailedBody()` in `src/lib/copy.ts` → `ReportContentModal`. Leg 1.2(d) stays internally consistent.

**Exact text struck from §4 of the source draft** (recorded here so nothing is lost to the resolution):

> ⚠ SKY DECIDES: 24 hours is the standard commitment app reviewers expect for objectionable-content
> reports. Ratify it only if it's genuinely sustainable. The honest alternative is 48 hours. If you choose
> 48, update the Reports line in §1, the string in §5, and the DECISIONS entry to match.

Also struck from the ratification block: `[or: 48 hours. Strike whichever does not apply]` and
`[align to the chosen commitment]`. §1's "within 24 hours" and §5's string were already 24h and are
byte-identical to Sky's draft.

### This is banked text, not shipped behaviour — four follow-ups it opens

| # | Item | Why it is not closed by this commit |
|---|---|---|
| **M-1** | **`REPORT_SENT_BODY` still ships the old string.** Live code is `'Thanks — your report has been sent.'` (`src/lib/copy.ts:152`); §5 ratifies `'Thanks, your report was sent. Reports are reviewed within 24 hours.'` | App-code change, out of scope for a docs-only run. This is the §4-item-2 string Sky was asked to ratify personally — now ratified, awaiting a build |
| **M-2** | **Leg 1.2(a) filter is policy-only.** §2 specs `src/moderation/blockedTerms.ts` + LDNOOBW seed; no such file exists | Needs the gap-closer build run. 1.2(a) stays 🔴 until then |
| **M-3** | **Report categories are specced but the sheet ships free-text.** §3 lists five; the shipped sheet captures free-text by Sky's own §SKY-3h scoping | Needs a build; decide whether the five replace or supplement free-text |
| **M-4** | **The ToS account-deletion promise holds against the LIVE schema only.** "Anything you've contributed may stay in the app, with your name removed" matches live `ON DELETE SET NULL`, but the repo's `schema.sql` declares `NOT NULL` / `ON DELETE CASCADE` (SR-117). Applying repo schema as-written would delete contributions and make the published ToS false | SR-117 was already picked for build; this commit raises its stakes from a type-lie to a **published-promise** dependency |

⚠ **The banked file still carries its own `DRAFT for Sky's ratification` title line and the sentence "Every
word below requires Sky's explicit ratification before it ships."** Left byte-intact because the instruction
was verbatim-plus-two-resolutions, and retitling would have been a third unrequested edit. Sky's call whether
to flip that header to RATIFIED in a follow-up — this §SKY-4 entry is the authoritative ratification record
either way.
