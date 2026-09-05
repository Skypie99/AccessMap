# FLAGSTONE — Phase 03A Backend Foundation

Prompt: `FLAGSTONE-PHASE-03A-MAIN-OWNER-20260903`

Receipt date: 2026-09-04, America/Vancouver (captures dated 2026-09-05 UTC)

Repository: `https://github.com/Skypie99/AccessMap.git`

**BACKEND_FOUNDATION_GATE: BLOCKED**

**PHASE_GATE: BLOCKED**

**MAIN_MERGE_AUTHORIZED: NO**

Phase 02 remains accepted. Its exact SHA/tree and artifacts match current local evidence.
Phase 03A completed read-only intake and two independent preflight reviews, then stopped before
implementation on the owner-fact, scope and gateway-policy conditions in the supplied phase prompt
(§§5, 16, 20 and 22). Only new QA receipts and catalog evidence are prepared in this branch.
No new hardening migration, client change, integration, staging mutation or production mutation exists.

## DECISIONS FOR SKY

| ID | Decision | Recommendation and reason | Alternative and impact |
|---|---|---|---|
| B03A-01 | Identify a disposable staging project/branch and its baseline. | Name an existing isolated Flagstone staging target, or authorize a separately costed creation proposal. The connected Flagstone branch list contains only production; no inherited receipt identifies staging. Do not use the unrelated visible project. An identity answer alone does not authorize mutation. | Keep staging unselected; 03A-STAGE/03A-PROD and the phase gate stay blocked. No creation or cost has been authorized. |
| B03A-02 | Resolve FDA-026's necessary client-contract scope. | Permit the bounded caller changes in `src/lib/admin.ts`, the leaderboard/rank functions in `src/lib/flags.ts`, `src/lib/comments.ts`, corresponding database types and focused tests. Use a caller-scoped admin check, a bounded leaderboard/rank contract and an author-display contract that preserves existing comment access. Keep screens, navigation, anonymous flag reads and deletion pipelines outside the change. Restricting base-table user visibility without these adaptations would break existing behavior. | Retain current callers and leave FDA-026 explicitly blocked. No self-only RLS or column revoke should be presented as a complete repair while those callers remain incompatible. |
| B03A-03 | Choose the anonymous rate-limit identity/privacy policy. | Decide the identity basis, trusted gateway boundary, per-client thresholds, shared-network behavior and retention before SQL/config implementation. One review option is short-lived pseudonymous per-IP accounting at a verified gateway, subject to privacy approval and header-spoofing tests; another is a separately designed issued client token. Retain the current DB caps as emergency backstops. Neither option is accepted here. The audit records the earlier no-IP/device-key trade-off. | Preserve existing caps and client throttling; FDA-028 stays open and two-client isolation remains unproven. No IP/device collection, gateway setting or remote configuration is authorized by this receipt. |
| B03A-04 | Reconcile Phase 03A's app-delete smoke requirement with the accepted Phase 04 repair boundary. | Keep transitional database owner/admin DELETE proof in 03A, retain the known FDA-002 client defect, and explicitly decide sequencing for the required successful mobile/web delete smoke. The accepted client invokes an absent Edge Function. The current prompt does not authorize taking over Phase 04. | Separately authorize a bounded Phase 04 compatibility dependency before final 03A runtime acceptance. Without a sequencing decision, successful app-delete smoke cannot be claimed and the full phase stays blocked. |

These are concrete scope/environment/policy decisions, **not a request to approve an apply**.
Staging approval must later name exact accepted artifacts. Production approval must additionally
bind Phase 03A, the production project, source SHA, ordered migration hashes and rollback hashes.
Neither apply package is ready, so no staging/production token is requested now.

The stop comes from the supplied Phase 03A prompt, not an inferred skill approval requirement:
§16 limits client edits to those required to preserve admin/owner behavior; §20 requires a stop when
scope or privacy/security authority is unclear; §22 reserves gateway policy and remote mutation to Sky.
All unaffected read-only intake and evidence work was completed. No isolated grant patch was issued
before the combined privilege model and preservation obligations were resolved.

## Exact identity and worktrees

| Subject | Verified value |
|---|---|
| Accepted Phase 02 SHA | `c2e36800b269ee22f29d0be35cfb88dace7c2afc` |
| Accepted Phase 02 tree | `7a68541462f0a9e1d55f48d98ea54df0fc0b01b7` |
| Accepted predecessor branch | `codex/p02b-repair-rev2-20260904` |
| Accepted predecessor worktree | `/Users/skypie/AccessMap-codex/p02b-repair-rev2-20260904`, clean |
| New evidence branch | `repair/flagstone-p03a-backend-foundation-20260903` |
| New evidence worktree | `/Users/skypie/AccessMap-codex/p03a-backend-foundation-20260903` |
| Initial SHA/tree of new worktree | Exact accepted Phase 02 values above; clean at creation |
| Phase 03A implementation SHA/tree | **NONE — implementation did not begin** |
| Accepted Phase 03A SHA/tree | **NONE — no acceptance issued** |
| Final report commit SHA/tree | Resolved from the commit containing this receipt and recorded in the exported finalization receipt. A Git commit cannot embed its own SHA. This report commit is not an accepted implementation. |
| Upstream for predecessor/new branch | None; no branch push performed |
| Fresh remote default branch | `main`; verified by `git ls-remote --symref origin HEAD refs/heads/main` |
| Fresh remote and local main | `70b52a30e9fff0f7d538509b110212bb8d872391`; tree `847f39f6d8e5d7feb28af0f5da823034ce19f848`; ahead/behind `0 0` |
| Existing canonical integration worktree | `/Users/skypie/AccessMap-worktrees/flagstone-b33-convergence-20260903`, clean at `5a64c9174ae5d9d5a94ed543bc4663216df67e7f` / `edaa68182add5b9a41123f6864c7774f5969e03f`; unchanged |

The new worktree uses the estate's `AccessMap-codex/` lane instead of the older planning package's
`AccessMap-worktrees/` path. The approved branch name is retained. Both proposed path and ref were
absent before creation. No existing writer was reused.

Preflight inventoried all **40 registered worktrees**: 39 existing paths and one pre-existing
missing scratch path, preserved without pruning. Tracked/untracked status digests and active Git
operations are in [source-inventory.json](phase03a/2026-09-04/preflight/source-inventory.json).
No merge, rebase, cherry-pick, revert, bisect or sequencer state was found in existing worktrees.
The primary checkout remained on `94d86239fed85e9e9135522e5271af813d6dfc90`, with one tracked
modification and 1,178 untracked file entries. These are counts, not a content audit.
Creation adds one report-only worktree; its final clean state is verified in the finalization receipt.

The five main-only commits, Build 33, the accepted OpenFreeMap descendant, accepted 02A and the
Phase 02 revision history are ancestors of the accepted base. All prompt audit identities and
supplied trees were freshly verified. No lineage decision was reopened.

## Current production and staging truth

The production target is `kldlwszpfkdmsjrjhjym`, ACTIVE_HEALTHY, PostgreSQL 17.6.1.121,
us-west-2. The final catalog-only SELECT completed at **2026-09-05T05:18:03.745Z**.
It matches both the earlier fresh capture and the accepted Phase 02 raw capture across
all ten comparator-v3 sections, plus comparator version and scope metadata:

| Section | Current rows | Result against accepted capture |
|---|---:|---|
| Roles | 3 | Exact |
| Schemas | 3 | Exact |
| Tables | 23 | Exact |
| Structural columns | 152 | Exact |
| Policies | 47 | Exact |
| Triggers | 25 | Exact |
| Functions | 28 | Exact |
| Function ACLs | 49 | Exact |
| Table ACLs | 434 | Exact |
| Migration ledger | 71 | Exact; head `20260830130000` |

This is raw production-to-production comparison; **no backup-table residual was removed**.
It proves no observed drift within the comparator's declared scope, not behavioral or full-database parity.
See [capture](phase03a/2026-09-04/preflight/production-catalog.json),
[exact read-only query](phase03a/2026-09-04/preflight/production-catalog-query.sql), and
[comparison](phase03a/2026-09-04/preflight/catalog-comparison.json).

A separate catalog-only capture at **2026-09-05T05:13:59.305Z** adds 18 explicit column ACL entries,
108 default ACL entries, 18 sequence ACL entries, 28 function-owner entries, 33 object-owner entries
and 33 effective users-column privilege rows. These fields were absent from comparator v3;
there is no accepted historical comparison for them.
Authenticated has effective UPDATE privilege on all 11 users columns, including email, points and streaks.
The existing row policy separately constrains ownership and `is_admin`; an ACL result alone does not
prove a particular write succeeds. Broad defaults include TRUNCATE, REFERENCES, TRIGGER and MAINTAIN.
See [expanded privileges](phase03a/2026-09-04/preflight/expanded-privileges.json) and
[query](phase03a/2026-09-04/preflight/expanded-privileges-query.sql).

No `pgrst.db_pre_request`/`pgrst.db_schemas` entries were returned from the queried
`pg_roles.rolconfig` subset. This is **not proof of absent gateway protection**: external gateway
configuration and other setting scopes were not captured. The available connector lacks a direct
gateway-settings reader. Current Supabase documentation describes Data API pre-request controls
and explicitly limits them to PostgREST; it does not establish this project's configuration.
[Supabase API security documentation](https://supabase.com/docs/guides/api/securing-your-api).

Staging remains **NOT_IDENTIFIED**. The live Flagstone branch listing returned only its default
production branch. An unrelated visible project was not assumed disposable or authorized.
This does not rule out an inaccessible or separately managed staging environment.
See [sanitized discovery](phase03a/2026-09-04/preflight/staging-discovery.json).
The staging identity question is pending; no staging catalog could be captured.

A fresh read-only Edge Function listing also confirms `delete-flag` remains absent. It returns
`send-push-notification` v6, `notify-flag-status` v8 and `delete-account` v4 only.
See [sanitized Edge metadata](phase03a/2026-09-04/preflight/edge-function-metadata.json).
The B03A-04 dependency therefore rests on a fresh deployment listing as well as current source.

Only catalog metadata and definition hashes were collected. No application rows, credential
values, API keys, service-role material, personal identifiers, raw function bodies or raw policy
expressions were queried into these artifacts. No dashboard screenshots were taken.

## Owned findings and proposed correction

All seven findings remain **OPEN / NOT_CLOSED**. None was downgraded or transferred.
The table records reviewed source dependencies and a proposed implementation sequence, not authored SQL.

| Finding | Current evidence and proposed correction | Required preservation and proof |
|---|---|---|
| FDA-009 | `flags_user_scoped` remains an overlapping permissive ALL policy. Remove that overlap only after enumerating effective per-command policies. | Keep named owner/admin DELETE, existing anonymous SELECT, guest INSERT and unchanged status/reject semantics. Test owner/non-owner/admin behavior directly. |
| FDA-010 | Six recorded trigger functions retain broad EXECUTE. Revoke only exact reviewed signatures for PUBLIC/anon/authenticated; preserve the required callable RPC allowlist and trusted owners. | Trigger-function grants do not prove callable exploits outside trigger context. Confirm triggered media/timestamp behavior still succeeds and internal direct invocation is denied. |
| FDA-012 | Existing and default grants are broader than app needs. Design explicit object/column/function/sequence privileges; capture exact restoration state. | Keep transitional authenticated flag DELETE, required reads/inserts/sequences and service-worker access. Do not perform a blanket schema revoke. |
| FDA-021 | Effective table UPDATE defeats a narrower column-only grant. Remove broad UPDATE and retain `display_name, avatar_url, avatar_object_key` as required by current callers. | Avatar fallback writes a null object key; preserve the existing media-key guard. Refuse points/email/streak/timestamp/is_admin forgery; preserve owner profile returning projection and all trusted reward/streak writes. |
| FDA-023 | Authenticated owner INSERT lacks an open-status restriction; UPDATE transition guards do not constrain INSERT. Prepare a restrictive open-status check after effective-policy proof. | Positive open INSERT for user/guest and refusals for verified/resolved/rejected; preserve service behavior and existing reward semantics. Do not apply MOD1R wholesale. |
| FDA-026 | Admin checks, leaderboard/rank and comment-author embeds read `public.users`. Restrict enumeration only with compatible bounded contracts and caller changes. | B03A-02 is unresolved. Self-only users RLS would otherwise hide other authors and corrupt leaderboard/rank. Keep admin DELETE working through a private caller-scoped helper; no mutable-email authorization. |
| FDA-028 | Global caps remain 100 guest flags/hour and 30 guest feedback rows/hour; client-only throttle is five/24 hours. There is no accepted trusted per-client boundary. | B03A-03 is unresolved. Retain emergency caps; prove two-client isolation, spoof refusal, shared-network behavior and guest path compatibility in an authorized environment. |

Systemic causes were verified, **not repaired**: permissive policy overlap, table/default privilege
overreach, writable reputation fields, public admin-check dependencies and shared anonymous budgets.

The exact dependency review is in
[independent-preflight-reviews.md](phase03a/2026-09-04/independent-preflight-reviews.md).
Important source locators on the accepted base:

- `src/lib/admin.ts:30–34`: direct own-row admin-column read.
- `src/lib/flags.ts:1680–1722`: direct users leaderboard/rank queries.
- `src/lib/comments.ts:28–32`: users FK embed; also used by comment INSERT returning.
- `src/lib/users.ts:18–59,119`: profile projection and avatar fallback.
- `src/lib/flags.ts:1442–1453`: Edge-only flag deletion; the Phase 02 contract already records it broken.
- `supabase/schema.generated.sql:1952–2015`: guest/authenticated/ALL policy composition.
- `supabase/tests/d1f4r3_fix2_flags_delete_rls.test.sql:15–50`: deferred tests require direct DELETE denial,
  the opposite of Phase 03A's transitional contract. They must remain preserved and must not be
  counted as this phase's acceptance suite.

## Internal lanes and independent review

| Exact task ID | Work completed | Verdict / remaining work |
|---|---|---|
| 03A-CODE | Exact-base intake; source dependency review; production recapture; expanded privilege evidence; preserve and rollback inventory. | **BLOCKED before implementation** on B03A-02/03 and unresolved required environment evidence. No migration/test patch or accepted code SHA exists. |
| INT | Current canonical branch and predecessor identities inventoried read-only. | **NOT RUN / BLOCKED**: no accepted 03A-CODE SHA. No merge forecast/integration or backup ref is warranted for an unaccepted source. |
| 03A-STAGE | Accessible staging-target discovery. | **NOT RUN / BLOCKED**: staging identity, exact accepted code/hash set, pgTAP environment, restoration proof and explicit mutation approval absent. |
| 03A-PROD | Required read-only production preflight evidence collected. | **NOT RUN / BLOCKED**: no staging acceptance, exact apply/restoration package or Sky token. |

Two independent agents completed bounded, read-only reviews:
`03a_code_dependency_review` (authorization/call-site dependencies) and
`03a_predecessor_review` (migration/provenance/rollback preconditions).
They confirmed the accepted base and supplied the limits above. They did not author SQL,
mutate remote state or issue implementation acceptance. Their verdicts are **preflight evidence only**.
No Steve/Dana SQL sign-off, hosted staging acceptance, production witness sign-off or phase acceptance
is claimed. The phase owner retains the blocked verdict.

The predecessor reviewer also independently checked this draft receipt and its fresh catalog
artifacts. It reproduced final-production-to-accepted-production equality and confirmed that the
scope/privacy/environment stops support BLOCKED. Three wording corrections were incorporated:
source identity is separate from catalog equality; the linked logs are local checker outputs;
and the known-vulnerable production baseline is not described as safe. The reviewer did not
independently compare the unsaved first fresh capture; that repeat comparison is root evidence.

## Gates actually run

Local checker outputs are in [local-checks.json](phase03a/2026-09-04/preflight/local-checks.json).

| Command / operation | Actual result | Meaning |
|---|---|---|
| `git fetch --no-prune --no-tags origin` from accepted worktree | Exit 0 | Required remote-ref refresh; no push/prune |
| `git ls-remote --symref origin HEAD refs/heads/main` | First sandbox attempt exit 128, hostname resolution failed; authorized network retry exit 0 | Remote default and main verified; no auth retry loop |
| Git identity, worktree/status, interrupted-operation and ancestry checks | Expected identities; no active operation; independent ancestry checks pass | Intake/preservation metadata only |
| `node scripts/generate-migration-crosswalk.mjs --check` in new worktree | Exit 0: `migration-crosswalk.v1.json is current.` | Current source crosswalk |
| `node scripts/check-schema-snapshot.mjs` in new worktree | Exit 0: `schema.generated.sql is current (87 ordered inputs, stamp v2).` | Current source snapshot |
| `node scripts/run-pgtap.mjs --run` in new worktree | Exit 2: `UNAVAILABLE: pgTAP extension absent; suites NOT RUN. No installation was attempted.` | No behavioral PASS |
| `npm run typecheck` in unchanged accepted predecessor | Exit 127: `sh: tsc: command not found` | Toolchain/dependency unavailable in this session; not a new source failure |
| Production comparator SELECT, repeated | Successful tool results; exact 10-section equality | Current catalog evidence, no runtime proof |
| Supplemental privilege SELECT | Successful tool result | New catalog coverage; no behavioral proof |

The pgTAP runner discovers three suites: 7 and 26 assertions belonging to separately authorized
deletion staging, and a 25-assertion canonical media suite; one fixture and one raising proof are
classified separately. Installing an extension would not turn the two deferred deletion suites
into valid Phase 03A tests. No global extension installation or host cleanup was attempted.

**Not run:** new phase positive/negative role matrix; forgery/profile/reward tests; transitional
direct-delete tests; non-open insert refusal; enumeration/leaderboard/byline tests; function execution
allowlist; two-client load/isolation tests; REST/RPC role tests; mobile/web staging smoke;
rollback/reapply; full Jest, lint, Expo doctor, web export, device/VoiceOver/XXXL acceptance.
No implementation or integration occurred, so unrelated full-release checks were not rerun.

Historical Phase 02 results remain historical: 272 passing / 12 inherited failed Jest suites,
4,174 passing / 14 failing tests / 32 todo, 91 lint warnings and repo-wide formatting debt.
This phase neither reran nor repaired them. Current crosswalk/snapshot checks do not substitute
for those checks or pgTAP.

## Preservation, rollback and side effects

| Preserve item | Current result and boundary |
|---|---|
| PRESERVE-B33-PRODUCT | No application/UI/theme/navigation/sheet/web-provider files changed. Exact B33 and OpenFreeMap ancestry preserved. No new visual or accessibility PASS claimed. |
| PRESERVE-LOCAL-WORK | Existing worktrees not edited/reused/cleaned/reset/stashed/pruned/moved/deleted. Status inventory captured; final comparison recorded separately. |
| PRESERVE-MIGRATION-HISTORY | Independent review verified 71/71 file hashes/bytes and B33 blobs. Crosswalk and snapshot checks pass. No applied migration or five Phase 02 candidates changed. |
| PRESERVE-OWNER-AUTHORITY | Main unchanged; no push/merge/deploy/EAS/App Store/remote configuration action. Only authorized local evidence branch creation and report finalization. |
| PRESERVE-PRIVACY-TRUTH | Catalog-only evidence and explicit unrun gates. No row-data/credential capture and no unsupported security/privacy/accessibility or release claim. |

Five Phase 02 adoption candidates remain inert and outside a newly approved apply set.
Their rollback contract is explicitly disposable-only: four restore unsafe source baselines;
the fifth is a `NON_REVERSIBLE_SECURITY_REPAIR` whose rollback refuses atomically.
These artifacts are **not** a production restoration package for Phase 03A.
The [artifact hash index](phase03a/2026-09-04/artifact-hashes.json) pins their exact hashes and
the accepted manifest/crosswalk/comparator evidence.

New Phase 03A migration hashes: **NONE**. New forward restoration hashes: **NONE**.
Rollback rehearsal this phase: **NOT RUN**. Nothing in any database changed.
A future implementation must restore the captured pre-03A production-equivalent posture,
not replay an unsafe Phase 02 source-baseline rollback.

Seven contained production-only backup tables, FDA-027 production-ledger `NOT_CLOSED`,
the two historical host pg_net stubs and all unrelated/deferred findings remain with their
existing owners. No historical ledger was rewritten.

Changed-file scope: this main receipt, the dated Codex session report, two independent review
summaries, catalog-only SQL/JSON evidence, the hash index and preservation verification, all under
`qa-reports/`. Exact finalized file list is in the export receipt.
Local commit: documentation/evidence only. Pushes: none. Merges: none. Deployments: none.
Remote writes and metadata changes: none. App Store review: protected by no action; current
review status was not queried.

## Material reconciliation and process

The supplied phase-owner prompt is the execution authority. The planning package was located at
`/Users/skypie/Downloads/FLAGSTONE_POST_AUDIT_PHASED_REPAIR_PLANNING_PACKAGE_20260903.md`;
its program-preserve, Phase 03A and INT sections were read. Its older separate-prompt routing
does not require Sky to run subprompts. Audit findings, final report/handoff, historical and visual
evidence and local reconnaissance were used only for phase-relevant context.
Accepted Phase 02 receipts and exact live/local evidence supersede older statements that staging,
runtime deletion or safe production rollbacks already exist.

The important current-truth corrections for downstream work are: (1) captured production catalog
still matches Phase 02; (2) column/default/sequence ACL and owner evidence is newly captured;
(3) private admin helper already exists; (4) comment bylines join users; (5) current app deletion is
still an inherited contract defect, distinct from the available DB DELETE rights; and
(6) pgTAP discovery is not execution and the inherited deletion suites target a different contract.

No previous repair was recreated. Two read-only reviews ran beside fresh external verification;
one root writer owns the evidence worktree. A source-only privilege patch would have reduced
immediate work but left the unresolved contract and gateway requirements; the explicit stop contract
requires an honest blocked receipt instead of partial phase acceptance.

## Operational handoff — BLOCKED, not accepted

```text
PHASE_GATE:
BACKEND_FOUNDATION_GATE: BLOCKED

ACCEPTED_SHA:
NONE FOR PHASE 03A

ACCEPTED_TREE:
NONE FOR PHASE 03A

CURRENT_WORKING_BASE:
c2e36800b269ee22f29d0be35cfb88dace7c2afc
TREE: 7a68541462f0a9e1d55f48d98ea54df0fc0b01b7

WORKTREE:
/Users/skypie/AccessMap-codex/p03a-backend-foundation-20260903

BRANCH:
repair/flagstone-p03a-backend-foundation-20260903

REPOSITORY_REMOTE:
Skypie99/AccessMap

KEY_DECISIONS:
Pending B03A-01 staging identity; B03A-02 caller scope;
B03A-03 rate-limit policy; B03A-04 app-delete smoke sequencing.

NEW_CURRENT_TRUTH:
Phase 02 source identity remains exact. Fresh production catalog matches the accepted
Phase 02 production capture within comparator-v3 scope.
Expanded ACL/owner evidence captured; no staging identified.
Current app-delete defect remains distinct from DB DELETE capability.

INTERNAL_TASK_IDS_COMPLETED:
NONE at objective acceptance.
03A-CODE and 03A-PROD preflight evidence; INT inventory; 03A-STAGE discovery only.

OWNED_FINDINGS:
FDA-009, FDA-010, FDA-012, FDA-021, FDA-023, FDA-026, FDA-028

FINDINGS_CLOSED_OR_ACCEPTED:
NONE

CARRY_FORWARD:
Accepted Phase 02 source; five inert candidates; current catalog captures.
OPEN_FINDINGS:
All seven phase-owned findings.
DEFERRED_ITEMS:
Existing Phase 02/other-phase deferrals preserved; none newly closed.
EVIDENCE_GAPS:
Code, pgTAP, caller compatibility, staging, gateway, rollback and production acceptance.
BACKEND_MANIFEST_IDENTITY:
supabase/contract/deployed-contract.v1.json
sha256 a4f59651f3f59b918a54654bfd502e262637a8096f9219fe28d8944020bdb963

REMOTE_ACTIONS:
Read-only origin fetch/list and Supabase catalog/project/branch reads; public docs reads.
REMOTE_MUTATIONS: NONE

ROLLBACK_REFERENCES:
Inherited disposable-only contract pinned in artifact-hashes.json.
Phase 03A restoration package: NONE; rehearsal: NOT RUN.

DIRTY_STATE_PRESERVED:
YES; no existing worktree modified; metadata verification supplied.
APP_STORE_REVIEW_PROTECTED:
YES by no action; current review status unverified.
MAIN_MERGE_AUTHORIZED:
NO
NEXT_PERMITTED_PHASE:
RESUME PHASE 03A after named decisions and preconditions.
PHASE-03B HANDOFF NOT ISSUED.
```


## Resume addendum — authoritative current state after owner decisions

This appended section supersedes the earlier current-state statements while preserving the full preflight receipt above as historical evidence. The original 25918 bytes have SHA-256 35d0f4959cff8949b4d608b4d3e481aeffdbde74c2a914969e6e3d25502cc64d.

**BACKEND_FOUNDATION_GATE: BLOCKED. PHASE_GATE: BLOCKED. MAIN_MERGE_AUTHORIZED: NO. SAFE_TO_INTEGRATE: NO.**

Local candidate: 6a82b8212a2d0d3de96525d98b5824b4eb7121fb. Tree: d3b750fce6ae489f793b88867f1edeca23f5c9d4. Branch: repair/flagstone-p03a-backend-foundation-20260903. Worktree: /Users/skypie/AccessMap-codex/p03a-backend-foundation-20260903. Clean at final independent source verification.

The exact accepted Phase02 predecessor remains c2e36800b269ee22f29d0be35cfb88dace7c2afc / 7a68541462f0a9e1d55f48d98ea54df0fc0b01b7. Preflight commit 9469c43 and first local implementation 6080215 are preserved. Final source 6a82b82 includes the independent reviewer-requested synthetic fixture restriction.

Owner decisions now authorize bounded admin/leaderboard/comment-author caller changes, exact locked local tooling, and direct owner/admin database-role delete proof. Former B03A-02 and B03A-04 are resolved. The supplied privacy policy is adopted; the literal staging placeholder and unverified gateway implementation remain blockers.

Six forward candidates, six exact restoration files, bounded callers and real local tests exist. Independent reviewer 03a_predecessor_review verified the final clean source and issued PARTIAL LOCAL SUBSET PASS, with complete 03A-CODE HOLD. Actual local pgTAP: 25 media plus 113 Phase03A assertions, no failed/skipped/TODO/bailout/parse errors. Baseline ACL equality, exact restoration and deterministic reapply pass. Independent caller/parser suites: 106/106 PASS, carried forward by exact unchanged hashes.

Typecheck passes. Full lint passes with 0 errors and 91 inherited warnings. Full Jest remains red: 273 passed / 12 failed suites; 4,204 passed / 14 inherited failed / 32 TODO tests. No new failed names. No runtime, hosted pgTAP, REST/RPC/Storage, two-client limiter or hosted rollback result exists.

All findings FDA-009, FDA-010, FDA-012, FDA-021, FDA-023, FDA-026 and FDA-028 remain OPEN. FDA-012 is partial because postgres cannot alter supabase_admin-owned defaults. FDA-028 is unimplemented pending the gateway dependency/scope decision. The full app deletion pipeline remains Phase04-owned.

## DECISIONS FOR SKY — resume

| ID | Decision | Recommendation and reason | Alternative and impact |
|---|---|---|---|
| B03A-R01 | Actual separate staging project ref. | Name the intended disposable non-production project so existing conditional authority can be verified against a concrete target. | Leave unset; STAGE and later lanes remain blocked. No production or unrelated project substitution. |
| B03A-R02 | Gateway dependency / guest-ingestion scope. | Permit bounded gateway design and needed guest flag/feedback routing plus bypass prevention; require exact trusted short-lived key, issuance-abuse, retention, thresholds and two-client proof before remote approval. Current direct API capability is insufficiently verified. | Preserve current paths/caps; FDA-028 and complete code acceptance stay blocked. No purchase, deployment or changed privacy tradeoff is implied. |
| B03A-R03 | Managed-role default grants. | Obtain a supported platform/owner mechanism or explicit residual disposition; current postgres is not supabase_admin. | Keep FDA-012 OPEN and this local candidate partial. No role escalation or technical closure by waiver. |

03A-CODE remains PARTIAL/HOLD. INT is NOT RUN. 03A-STAGE is NOT RUN. 03A-PROD performed read-only preflight only; no apply or token. Phase03B is NOT STARTED. Do not request a production token before complete code, integration and staging acceptance.

The read-only production catalog at 2026-09-05T06:26:04.808Z matches earlier preflight within comparator-v3 scope. Expanded metadata verifies the platform default-grant limitation, Storage policy ownership bypass capability and exact global PUBLIC-function restoration precondition. No application rows or credentials collected. No hosted mutation occurred.

The Phase03A local-only supplemental fixture covers ACL/default fields omitted from the historical local model. It checks the saved 18 column, 108 default and 18 sequence entries before candidates. This is local fixture setup, not a rewrite or expanded historical acceptance claim. Local platform stubs remain separate from hosted truth.

All 40 pre-existing worktree HEAD/branch/status records and original QA/inherited artifacts remain unchanged. No applied migration, five accepted Phase02 candidates, package/lock or generated schema SQL changed. The screen delta is one rank-call argument removal; no visual/accessibility/runtime acceptance is claimed. App Store review is protected by no action; live status unverified.

The six restorations are UNSAFE_BASELINE_RESTORE and reopen captured weaknesses; only disposable local rehearsal is proven. Exact ordered migration, rollback, source and test hashes are recorded in the evidence. There were no pushes, merges, deployments, paid builds, production changes, external sends or Phase03B actions.

Full receipt: [2026-09-05_Codex_Phase03AResume.md](2026-09-05_Codex_Phase03AResume.md). Evidence: [artifact-hashes.json](phase03a/2026-09-04-resume/artifact-hashes.json), [independent final review](phase03a/2026-09-04-resume/independent-final-review-6a82b82.json), [test summary](phase03a/2026-09-04-resume/test-summary.json). The documentation-only final commit SHA/tree and final clean state are resolved after commit in the exported resume finalization receipt.
