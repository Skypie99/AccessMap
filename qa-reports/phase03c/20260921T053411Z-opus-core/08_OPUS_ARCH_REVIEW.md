# 08 — Opus Adversarial Architecture Review (Phase 03C)

```
RUN:            qa-reports/phase03c/20260921T053411Z-opus-core/
CANONICAL_BASE: origin/main = 6e91ec65bd5f5bdca086fe21949c8477bdc18bac (tree 82d248608f6dec177e497dca7a90c5bc0cda36d4)
RECON_COMMIT:   94338ad36e7ba0899251a2907370fd51cbbf8060 (tree 63e4957c9b24e19152545950524a12ed0755e6a6)
BRANCH:         opus/flagstone-phase03c-core-implementation-20260920
WORKTREE:       /Users/skypie/AccessMap-worktrees/flagstone-p03c-opus-20260920
LIVE CONTACT:   NONE (production and staging untouched; every "production" statement below is
                read from ACCEPTED ARCHIVED EVIDENCE committed in this repo)
```

## Method

Ran no fresh file crawl. Started from `07_OPUS_HANDOFF.md`, then checked each gap against
the strongest primary evidence, in this order:

1. **Accepted archived production evidence.** This is a read-only structural capture of
   production after the Phase 03B apply, on 2026-09-20:
   `qa-reports/phase03b/2026-09-20-second-live-post-apply-verification/NORMALIZED_STRUCTURE_EXCLUDING_EXACT_GATE.json`.
   It holds relations with RLS flags and ACLs, column ACLs, all 78 functions in
   `public/private/storage/limiter` with ACLs, all 51 policies, and default ACLs. The recon never
   opened it.
2. **Authoritative migration text** (`supabase/migrations/`, `migrations-next/` Stage A + 03B).
3. **Empirical execution** on a socket-only, disposable, production-equivalent local replay.
   It builds 71 + top-level next + Stage-A fixtures + Stage A + 03B, the same build as
   `scripts/replay-phase03b.mjs`. Every claim below marked **[EXEC]** was observed by running
   SQL as the real `anon` / `authenticated` roles against seeded data, then rolled back.
4. **Shipped-client callsites** (`src/lib/*`), because the live App Store app and the pinned
   web build send exactly these requests.

Baseline before any change: `node scripts/replay-phase03b.mjs --pgtap-sql=<pinned pgtap>` →
`status: PASS`. compatibility, moderation and points all pass on forward and on reapply, safe
rollback passes, reapply is schema-exact, and the temp cluster was destroyed. pgTAP is the pinned
1.3.4 build, `generatedSqlSha256 d4f9c8a4…26b3`, which matches
`migrations-next/phase03a/candidate-contract.json` `localPgTap`.

## Ambiguities A1 / A2 — both resolved from accepted evidence (no live contact)

| # | Question | Resolution | Evidence |
|---|---|---|---|
| A2 | Are Stage A (14) and Phase 03B (2) live? Is the ledger 87? | **YES, as of 2026-09-20/21.** The recon's arithmetic re-derived from primary files: R02 shows 71 applied + 14 pending, Stage B excluded. Stage A = 5 top-level + 9 `applyStage:"A"` = 14. Closure shows `ledger_count 87`, tip `20260915210413`. The post-apply production structural capture contains the Stage-A/03B objects (e.g. `flags rejected hidden from anon`, `private.current_user_is_admin`). | `R02_PRODUCTION_INSPECTION_COMPLETE.md:11-17`; `phase03a/candidate-contract.json` (10 entries, 9×A, 1×B); `CLOSURE_REPORT.md:30-33`; production capture (above) |
| A1 (= F5) | Are the 11 account-deletion RPCs live? | **NO.** The production capture's 78 functions contain no account-deletion routine. The only name matching `/delet\|account/` is `storage.protect_delete()`. Live deletion runs through the deployed **`delete-account` v4**, which does not use the RPC family. | production capture `catalog.functions`; `qa-reports/2026-09-03_Phase02A_ProductionContractTruth.md:135,150-153,179` |

Residual caveat, recorded rather than guessed: "live" means as of the latest accepted capture
(2026-09-20). Any future **apply** acceptance must re-verify read-only first. Phase 03C authors
no migration, so nothing here depends on the drift window.

## Gap review table

| GAP | OBJECT | RISK (recon) | AUTHORITATIVE_EVIDENCE | SONNET_PROPOSAL | OPUS_VERDICT | IMPLEMENTATION_DECISION |
|---|---|---|---|---|---|---|
| F1 | `flags.last_moderation_reason_code` (anon SELECT via table grant) | "anon-readable moderation reason, no recorded intent" | Writer: `phase03b/…210256:487-492`: reason is set only on reject, or on restore *from* rejected, and nulled otherwise. Guards: `enforce_flag_status_transition` (`:292-321`) + bridge (`:333-369`): the only exit from `rejected` is `rejected→open` via the audited RPC. Anon RLS: restrictive `status <> 'rejected'` (`:167-170`). Intent: `supabase/functions/notify-flag-status/README.md:29`, "approved public label… raw values are never echoed" (owner-directed notification copy). **[EXEC]** anon sees `1:open:-, 3:open:moderator_error`. The `abusive_or_spam` row is invisible, anon-visible reject-class count is 0, and admin direct `rejected→resolved` fails `P0001`. | `REVOKE SELECT (last_moderation_reason_code) ON flags FROM anon[, authenticated]` | **NOT_A_GAP** | No schema change. **The proposal is wrong twice.** (1) As written it is a **no-op**: a column REVOKE cannot remove a table-level grant. **[EXEC]** after it, `has_column_privilege(anon, reason, SELECT) = t` and anon still reads the column. (2) Made effective (table revoke + column allowlist), it **breaks the live app**. **[EXEC]** shipped `createAnonFlag` `insert(...).select()` = `RETURNING *` returns `42501`, and so does any `select=*`. Reject-class reasons can only coexist with `status='rejected'`, which RLS hides from anon. The anon-visible residue is restore-class labels (`moderator_error`, `new_evidence`, `corrected_report`, `other`) with no personal data. **Locked by pgTAP** (§09 C-4). |
| F2 | `src/lib/flags.ts:1065-1069` doc comment | stale/false privacy comment | Comment claims "RLS on the flags table ensures only authenticated users can read rows". This has been false since `20260529175842_anon_flags_select.sql`. No guard test pins the text (grep). | Rewrite comment | **CONFIRMED_FIX_REQUIRED** | Fixed. The comment now states the real contract and points to the executable proof. It is a doc correction, not a privacy control. |
| F3 | primary photo (anon-visible via `flags.photo_object_key` + public bucket) vs `flag_photos` rows (authenticated-only) | inconsistent public treatment | `flag-photos` bucket `public=true` by documented design (`docs/SUPABASE_SECURITY.md:26-28`; Privacy Policy photo caution). **[EXEC]** anon gets `flag_photos` **0 rows** (authenticated gets 1). **[EXEC + prod capture]** there is no `storage.objects` policy for `anon`/`public`, so anon cannot list or enumerate objects. | Owner decides: add an anon RLS policy on `flag_photos`, or rethink the public bucket | **NOT_A_GAP** | No change. The inconsistency makes extra photos *more* private than the primary one, which is not a leak. "Fixing" it toward consistency would **broaden** anon access, which is forbidden without an owner decision. A private bucket plus signed URLs would break the shipped `getPublicUrl` path. This is a product choice, recorded in §09 as an optional Sky decision. |
| F4 | anon table SELECT on `flag_comments`, `flag_photos`. **The recon missed three more:** `point_events`, and the views `flag_status_history_public` and `flag_edit_history_public` | "inert broader-than-needed grant; purely additive hardening, no behavior change" | `phase03a/20260905073925_…effective_privileges.sql:206-226` labels all five as **STAGE A COMPATIBILITY GRANTS**, removed by the *excluded, separately-authorized* Stage B (`20260911130000`, owner decision `MF05_AND_PRODUCTION_POLICY_PROPOSAL.md:6-12`): "Revoking them … does not degrade a guest to an empty list — the client call THROWS." **[EXEC]** effective exposure is nil. Tables return 0 rows (only `to authenticated` SELECT policies). The views return **42501**: `security_invoker=true` and there is no anon grant on the base tables. | `REVOKE SELECT ON flag_photos, flag_comments FROM anon` | **NOT_A_GAP** (for 03C) | No revoke. **The recon's "no behavior change" claim is false.** **[EXEC]** after its revoke, the shipped guest comment and photo reads **throw 42501** instead of returning 0 rows. Removing the grants is Stage B's owner-gated job. The latent risk (one permissive `TO anon` policy away from exposure) is closed in-repo by an **exact-set pgTAP invariant** (§09 C-3). A narrower server-side option that keeps behavior identical (restrictive anon-deny policies, which keep the grant) is offered to Sky in §09 D-2. It is not applied. |
| F5 | account-deletion RPC family (11 names) called by `supabase/functions/{delete-account,…}` | "uncertain live status; deletion promise may be unmet" | A1 above: **not live**. The deployed `delete-account` **v4** performs deletion (Phase 02A). The repo's newer `delete-account` source calls `request_account_deletion` (`index.ts:40`) and is **undeployed**. Deletion residue in `bk_2026_08_22_*` belongs to **Jordan, Phase 05** (Phase 02A §5). Repo-vs-deployment truth belongs to FDA-003/FDA-005, Phase 06A. | Verify live; treat as separate phase | **NOT_A_GAP** (not an anon/public-read exposure) | No change. It is a real item that already has owners, not a Phase 03C privacy gap. Anon holds EXECUTE on **0** functions in `public/private/limiter` (**[EXEC]** + prod capture), and postgres's GLOBAL default ACL is `{postgres=X/postgres}`, so any future RPC is **fail-closed for anon unless explicitly granted**. Locked by pgTAP (§09 C-6): a function and table created inside the test are provably not anon-reachable. Surfaced to Sky: never deploy the repo `delete-account` source before the RPC family ships. |
| F6 | legacy `flags_user_scoped` (ALL / PUBLIC) | "never dropped by name; needs live check" | Dropped by **live Stage A**: `phase03a/20260905055629_phase03a_flag_policies.sql:6` (`DROP POLICY flags_user_scoped` with no `IF EXISTS`, so it asserted presence at apply time). **Absent** from the production capture's 12 `flags` policies. The recon's DB agent read only `supabase/migrations/`. | Live `pg_policies` check | **NOT_A_GAP** (resolved) | No change. pgTAP asserts that no `flags` policy targets `PUBLIC` and none uses `ALL` (§09 C-3). |

Tally: **1 confirmed gap (F2, fixed) · 5 not actual gaps · 0 remaining in Phase 03C scope.**
There is no `BLOCKED_BY_AMBIGUITY` and no `LOCAL_HARDENING_POSSIBLE_LIVE_STATUS_PENDING`. Both
ambiguities resolved from accepted evidence, and no recommended change depends on unknown live
state.

## Challenges to the recon beyond the six gaps

1. **"No view is anon-reachable" / "`*_public` views granted to authenticated only" (02, 03) is
   false as stated.** Stage A grants anon SELECT on both views (`:224-225`, and in the production
   capture). They are safe only because `security_invoker=true` and the base tables have no anon
   grant. That makes them a two-condition invariant, and both conditions are now pinned by tests.
2. **"`point_events` owner-scoped authenticated only" is incomplete.** Anon holds a table grant
   (Stage-A compat), and only RLS returns 0 rows. It is now pinned.
3. **"`get_comment_author_profiles` needs live verification" is resolved.** EXECUTE is
   `authenticated` only (Stage A `:255,:259`; prod capture: no anon/PUBLIC EXECUTE on any
   function). The guest path never reaches it anyway: `withCommentAuthorProfiles` returns `[]` on
   0 rows (`src/lib/comments.ts:62-63`).
4. **Stage-A comment precision (no action).** The views' grant is described as "the only thing
   letting anon reach them". **[EXEC]** anon gets 42501 with the grant too, and
   `src/lib/statusHistory.ts:76-79` catches that and shows the placeholder. The behavior fails
   closed, so Stage B's revoke will change nothing for guests on the views.
5. **Realtime (not examined by recon).** `flags` is published with column list `(id, status)`.
   `flag_comments` is published with all columns, replica identity `d` (default) on all three
   tables, INSERT/UPDATE events are RLS-filtered, and DELETE events carry only the PK. There is
   no anon leak path. Replica identity is not in the accepted production capture: no migration
   sets `FULL`, the local replay shows `d`, and pgTAP pins it. See 11 for a future read-only check.
6. **FDA-042 (`flags.user_id` anon-readable), not re-litigated.** The founding decision
   *explicitly* lists `user_id (UUID only — not joined to users under the anon role)` among the
   approved anon columns (`20260529175842_anon_flags_select.sql`; Jordan gate `:116`). It stays in
   the contract. One premise observation for Jordan, non-blocking: any free authenticated account
   can map `user_id → display_name` (`users` column grant + `"users readable by authenticated"`),
   so the effective boundary for identity linkage is "anyone who signs up", not "anon". Changing
   this needs a coordinated client cutover, because `FLAG_READ_SELECT` and `RETURNING *` both
   carry `user_id`. That is a Jordan/Sky decision, not a Phase 03C code change.
7. **`photo_uploader_id` is not a hidden column.** `FLAG_READ_SELECT`'s comment omits it
   deliberately, but the column does not exist: `promptb_media_key_read_contract.sql` declined to
   add it, and it is absent from the prod capture. Nothing is hidden only by client convention.

## Why no migration

Every candidate server change fails at least one of the review questions:

| Candidate | Fails |
|---|---|
| F1 column revoke | no-op as written; the effective form breaks shipped anon submit (Q4) and authenticated create/edit `RETURNING *` (Q5) |
| F4 grant revoke | breaks shipped guest comment/photo reads (Q4); pre-empts owner-gated Stage B |
| F3 anon photo policy | broadens anon (forbidden without owner decision) |
| FDA-042 `user_id` narrowing | re-litigates ratified founding decision; breaks shipped reads (Q4) |

Production already enforces the intended contract. The Phase 03C deficit is that **nothing
executable proves it**: the recon's own `05_TEST_INVENTORY.md` gap. That proof is what Phase 03C
implements.
