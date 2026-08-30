# Flagstone Prompt B B2 Final Architecture

## Inputs

- Repository: `Skypie99/AccessMap`.
- Audited product source: `2762a5447600e8de55be912ccb26e95456484945`.
- Audited source parent: `c365c5dafd645018efe469d46fe0f4c2149c5ce3`.
- B0: `0d93a7293e75b4efe27873a1e2b0ca3acfe3e078`, report `qa-reports/2026-08-30_SolFast_PromptB_RootCause_Prep.md`.
- B0-X: `c5dc5e1913d1f6cfdae93994948017c34c4cb066`, report `qa-reports/2026-08-30_SolMax_PromptB_B0X_Adjudication.md`.
- B1: `83a789604176db0aab06ae3ce652e543dde6be03`, report `qa-reports/2026-08-30_SolFast_PromptB_B1_ExecutionContract.md`.
- B0, B0-X, and B1 were fresh-fetched and verified to be one-file report commits whose sole parent is the audited source.
- Evidence order used: B0-X runtime evidence, direct audited-source evidence needed to resolve B2 disputes, B1 implementation mapping, then B0 reconnaissance.
- Linked production identity established by B0-X: project ref `kldlwszpfkdmsjrjhjym`, Flagstone `4.1.1`, iOS build `15`.
- B0-X runtime state on 2026-08-30: hosted ledger had 69 entries ending at `20260819214410 photo_alt_text`; `flags.photo_object_key`, `flags.photo_uploader_id`, `users.avatar_object_key`, `flag_photos.object_key`, and `flag_photos.uploader_id` were physically absent.
- This review was source and runtime-evidence read-only. It did not edit product source or tests, run a native build, mutate Supabase, deploy, or merge.

## Executive Decision

**Primary decision:** the minimum complete Prompt-B repair is a **read-contract migration plus one grouped client repair**, not B1's full canonical upload/deletion rollout.

The minimum backend semantic set is:

1. nullable `flags.photo_object_key`;
2. nullable `users.avatar_object_key` plus authenticated column-only SELECT;
3. nullable `flag_photos.object_key`, because gallery is retained as release-quality scope;
4. narrow database-boundary guards preventing ordinary clients from setting or changing those three keys while preserving all legacy URL writes and ordinary non-media writes; and
5. PostgREST catalog/grant/API verification, with an explicit cache reload only if normal invalidation leaves a catalog-correct but API-stale result.

The minimum client production set is:

1. one `FLAG_READ_SELECT` used by all six full flag readers, retaining `photo_object_key` and removing `photo_uploader_id`;
2. one caught Home refresh callback used by pull-to-refresh and both visible Retry controls;
3. terminal-punctuation-safe failure copy;
4. a location-specific native exception presentation boundary; and
5. truthful gallery loading: `listFlagPhotos()` throws every backend error, and `FlagDetailModal` owns per-flag loading/error/Retry state so failure cannot masquerade as empty content or leave stale prior-flag photos.

Everything else in B1's canonical writer island is deferred: uploader columns, gallery URL nullability, upload intents, prepare/commit/cancel RPCs, trusted canonical commit paths, Storage policy changes, account write-fence expansion, deletion inventory/review/cleanup changes, ordinary canonical deletion machinery, and the monthly leaderboard RPC.

This cut is dependency-closed because **Prompt B does not activate a canonical writer**. The new key fields remain nullable and unpopulated by this repair. Existing legacy rows remain unchanged; Prompt B does not touch deletion/Storage objects or claim deployed deletion health. If fresh preflight finds any deployed/executable canonical writer, or if photo/avatar upload is declared a release requirement, this minimum cut is invalid: stop and re-adjudicate the full writer, Storage, privacy, fence, and deletion island as one unit.

This decision narrows B0-X and B1 without contradicting their safety warning. B0-X correctly rejected adding display keys while leaving active canonical writers partially wired. B2 prevents that partial state by keeping all canonical writers disabled/out of scope and adding fail-closed key guards. B1 optimized for the old installed bundle to recover immediately after backend deployment; B2 instead optimizes for the exact candidate JS bundle. The old bundle still selects `photo_uploader_id` and is not a required compatibility target.

**Implementation readiness:** `READY WITH EXPLICIT BACKEND AUTHORITY`, subject to the fresh preflight and the no-active-writer condition.

**One-build verdict:** conditional. One final TestFlight build is safe only if an existing provenance-tied development shell is native-compatible and serves a forced-fresh bundle from the exact accepted candidate SHA.

### Reconciled agent disagreements

| Disagreement | Evidence | Final decision |
|---|---|---|
| B1 included the full writer/deletion island; Agents A, B, and C removed it. | Runtime-confirmed blockers are reads. Intent/RPC/fence/deletion objects are dependencies only when canonical writes are activated. | Defer the writer island. Preflight must prove no deployed writer can become active when keys appear. |
| B1 treated uploader columns as harmless server provenance. | `flags` and `flag_photos` have table-readable shapes. Adding uploader IDs can make contributor identity REST-readable; bare mutation-return `.select()` calls also expand to `*`. | Do not add uploader columns. Remove `photo_uploader_id` from client display reads. |
| B1 required `USER_PROFILE_SELECT`, `getUserProfile`, and a Profile refactor. | The existing Profile query and `updateUserProfile()` already use the same safe fields and both hydrate `avatar_object_key`. | Backend key/grant changes are required; Profile production refactor is safe defer; existing client paths are verify-only. |
| B1 called gallery client behavior verify-only. | `isRelationMissing()` broadly matches `does not exist`, and `FlagDetailModal` catches thrown loads with only `console.warn`, has no error UI, and can retain prior-flag photos. | `listFlagPhotos()` must throw every backend error, while `FlagDetailModal` must reset per flag and expose an accessible owned error/Retry state. |
| One reviewer recommended all-time canonical avatar support now. | No canonical avatar writer is enabled in this cut, so no new key-only avatar can be created. Existing all-time legacy behavior is unchanged. | All-time is verify-only for legacy behavior; key mapping is deferred. If avatar writer scope returns, all-time key mapping becomes required. |
| Repository simulator guidance normally requires an exact-SHA native build. | A compatible dev shell can execute exact candidate JS, but that is behavioral evidence rather than release-binary provenance. | Reuse is allowed only under the strict compatibility/provenance rule below; TestFlight supplies final binary provenance. |

## B1 Scope Challenge

### Group 1: flag key/uploader columns

- **STATUS:** `REQUIRED NOW`, narrowed.
- **DIRECT BLOCKER OR INVARIANT:** `flags.photo_object_key` is selected by all six full flag readers and is physically absent. Candidate reads must retain the display key. `photo_uploader_id` has no client display consumer.
- **WHY INCLUDED / DEFERRED:** add only nullable `flags.photo_object_key`. Defer `photo_uploader_id`; its inclusion is not needed once the candidate removes it and would broaden provenance disclosure through existing table reads.
- **WHAT BREAKS IF OMITTED:** every full helper still fails, or the client must permanently remove canonical display authority, which B0-X rejected.
- **NEW RISK IF INCLUDED:** a newly added key could become client-forgeable through existing INSERT/UPDATE paths. Group 5's narrow key guard is therefore mandatory.
- **PROOF REQUIRED:** clean and upgrade replay, no existing-row rewrite, exact candidate projection HTTP 200, client key/legacy normalization cases, direct key-forgery denial.

### Group 2: avatar key and narrow grant

- **STATUS:** `REQUIRED NOW`.
- **DIRECT BLOCKER OR INVARIANT:** Profile and `updateUserProfile()` select `users.avatar_object_key`; adding the column without the column grant can convert the current 400 into `42501`.
- **WHY INCLUDED / DEFERRED:** add nullable `users.avatar_object_key` and authenticated SELECT on that column only.
- **WHAT BREAKS IF OMITTED:** Profile load and display-name save remain failed; omitting the grant leaves the deployed API unauthorized.
- **NEW RISK IF INCLUDED:** table-wide SELECT would expose `users.email`; ordinary users could forge avatar display authority without a guard.
- **PROOF REQUIRED:** positive avatar-key privilege, negative email/anon/table-wide privilege, unchanged RLS, and Profile/read API proof. Key-mutation denial and display-name-update success run only in disposable replay/staging or an explicitly authorized rollback-safe sacrificial fixture, never against ordinary production rows.

### Group 3: gallery key/uploader/nullability

- **STATUS:** `REQUIRED NOW`, narrowed.
- **DIRECT BLOCKER OR INVARIANT:** `listFlagPhotos()` selects `flag_photos.object_key`; the hosted table lacks it and the client can silently false-empty the gallery.
- **WHY INCLUDED / DEFERRED:** add only nullable `flag_photos.object_key`. Defer `uploader_id` and keep legacy `url` NOT NULL because no canonical gallery writer is enabled.
- **WHAT BREAKS IF OMITTED:** the required gallery read remains broken or can appear empty despite existing legacy rows.
- **NEW RISK IF INCLUDED:** direct gallery insert/update could forge a display key; an over-broad guard could break legacy URL inserts.
- **PROOF REQUIRED:** legacy gallery rows remain byte-identical, exact gallery select returns 200 in position order, key write is denied, ordinary legacy URL behavior remains unchanged, every backend error throws, and the detail consumer clears stale rows then recovers through visible Retry.

### Group 4: upload-intent table

- **STATUS:** `SAFE TO DEFER`.
- **DIRECT BLOCKER OR INVARIANT:** none for the runtime-confirmed read failures.
- **WHY INCLUDED / DEFERRED:** an intent table is mandatory for safe server-created keys and ambiguous upload outcomes only when canonical uploads are activated.
- **WHAT BREAKS IF OMITTED:** photo/avatar upload remains outside the Prompt-B recovery claim; no in-scope read invariant breaks.
- **NEW RISK IF INCLUDED:** durable PREPARED/AMBIGUOUS operational state, service-role access, worker/reconciliation, and deletion dependencies enter the release.
- **PROOF REQUIRED:** no change proof now. If later activated, require complete writer-island replay, role, ambiguity, Storage, and deletion proof.

### Group 5: provenance triggers

- **STATUS:** `REQUIRED DEPENDENCY`, narrowed.
- **DIRECT BLOCKER OR INVARIANT:** canonicalization authority must remain server-owned. Existing table mutation privileges/policies do not automatically protect newly added columns.
- **WHY INCLUDED / DEFERRED:** add narrow guards for only `flags.photo_object_key`, `users.avatar_object_key`, and `flag_photos.object_key`. Do not promote B1's broader trusted-commit, uploader, or legacy-URL guard behavior while writers are deferred.
- **WHAT BREAKS IF OMITTED:** authenticated clients can forge display keys, violating a hard security/media invariant.
- **NEW RISK IF INCLUDED:** an over-broad trigger could block existing report, gallery, or display-name writes.
- **PROOF REQUIRED:** in disposable replay/staging or an explicitly authorized rollback-safe sacrificial fixture, direct key insert/update fails with zero row change while key-omitted/null inserts, legacy URL writes, non-key owner/moderator updates, and Profile display-name updates still pass. Guard functions are non-client-executable, use pinned search paths, and exist exactly once.

### Group 6: prepare/commit/cancel RPCs

- **STATUS:** `SAFE TO DEFER`.
- **DIRECT BLOCKER OR INVARIANT:** none for the proven read repair.
- **WHY INCLUDED / DEFERRED:** the audited client calls these RPCs, but no B0-X runtime evidence established upload as a Prompt-B blocker and the requested release-surface matrix does not add upload to scope.
- **WHAT BREAKS IF OMITTED:** photo/avatar upload is not repaired and must not be claimed.
- **NEW RISK IF INCLUDED:** SECURITY DEFINER, subject/key binding, Storage owner verification, ambiguity, uploader disclosure, write fence, and deletion closure all become mandatory.
- **PROOF REQUIRED:** if product declares upload release-required, stop and produce a separately authorized full writer-island contract. Never add RPCs alone.

### Group 7: account write-fence dependencies

- **STATUS:** `OUT OF PROMPT B`.
- **DIRECT BLOCKER OR INVARIANT:** none when no canonical writer is enabled.
- **WHY INCLUDED / DEFERRED:** these objects are a dependency of canonical prepare/commit, not of read-only display fields.
- **WHAT BREAKS IF OMITTED:** no in-scope behavior. Future canonical writes must not be enabled without them.
- **NEW RISK IF INCLUDED:** broad policy rewrites reopen accepted account-deletion and ordinary mutation semantics.
- **PROOF REQUIRED:** Prompt-B diff must not touch fence objects or policies; fresh preflight must detect any out-of-band writer that already depends on them.

### Group 8: deletion inventory/review/audit/cleanup

- **STATUS:** `VERIFY ONLY`.
- **DIRECT BLOCKER OR INVARIANT:** deletion/storage safety may not be weakened.
- **WHY INCLUDED / DEFERRED:** no in-scope writer creates non-null canonical keys, so Prompt B creates no new canonical deletion inventory. Preserve accepted machinery and receipts unchanged.
- **WHAT BREAKS IF OMITTED AS A CHANGE:** nothing. Removing non-regression proof would leave safety unverified.
- **NEW RISK IF INCLUDED:** largest service-role and irreversible lifecycle blast radius in B1.
- **PROOF REQUIRED:** Prompt-B diff does not touch deletion/Storage objects, accepted source suites remain green, and the migration creates no canonical inventory. This does not prove deployed ordinary/account deletion works.

### Group 9: ordinary flag deletion

- **STATUS:** `VERIFY ONLY`.
- **DIRECT BLOCKER OR INVARIANT:** current deletion behavior must not regress; relational deletion must never outrun canonical Storage deletion if a future writer is enabled.
- **WHY INCLUDED / DEFERRED:** keep current routes, policies, and Edge code unchanged. Canonical plan/finalize is not needed while keys remain unpopulated.
- **WHAT BREAKS IF OMITTED AS A CHANGE:** no Prompt-B read surface. If writers are activated later, this classification immediately flips to required.
- **NEW RISK IF INCLUDED:** could revoke a working delete path or couple this release to absent Edge/RPC objects.
- **PROOF REQUIRED:** source/diff non-regression plus existing deletion checks; no claim that canonical ordinary deletion was repaired.

### Group 10: monthly leaderboard avatar output

- **STATUS:** `SAFE TO DEFER`.
- **DIRECT BLOCKER OR INVARIANT:** none. The RPC is non-managed/optional and the client deliberately degrades a missing function to `[]`.
- **WHY INCLUDED / DEFERRED:** promoting it creates a new backend surface rather than fixing a runtime-confirmed Prompt-B blocker.
- **WHAT BREAKS IF OMITTED:** monthly leaderboard and canonical leaderboard-avatar recovery cannot be claimed.
- **NEW RISK IF INCLUDED:** privacy-shape, EXECUTE, aggregate, and drop/recreate migration risk.
- **PROOF REQUIRED:** no change now. A future enabled RPC requires aggregate-only output, key mapping, exact grants, and key-only avatar runtime proof.

### Group 11: PostgREST refresh/verification

- **STATUS:** `REQUIRED DEPENDENCY`.
- **DIRECT BLOCKER OR INVARIANT:** physical DDL and grants do not satisfy release behavior until the Data API exposes them.
- **WHY INCLUDED / DEFERRED:** catalog/grant/REST recheck is mandatory. An explicit cache reload is conditional, not a default migration step.
- **WHAT BREAKS IF OMITTED:** every user-facing blocker can persist despite correct PostgreSQL catalog state.
- **NEW RISK IF INCLUDED:** repeated blind reloads can conceal identity or migration problems.
- **PROOF REQUIRED:** exact candidate flag/Profile/gallery projections return 200 after normal invalidation; if catalog is correct but API remains stale, perform one approved reload and re-probe.

## Minimum-Cut Analysis

### Dependency graph

| Required node | Direct dependents | Why dependency-closed |
|---|---|---|
| `flags.photo_object_key` | `FLAG_READ_SELECT`, six full helpers, provider cohort, My Reports, Activity, Admin, Watched, Recently Viewed, deep links, realtime, export | The field is the display key. Client omits uploader, so no writer/provenance island is needed. |
| `users.avatar_object_key` + narrow grant | Profile load and update return | Existing client already selects and normalizes it. RLS remains unchanged. |
| `flag_photos.object_key` | gallery query and key-first normalizer | Restores required legacy gallery reads and retains future key-capable shape without enabling key-only writes. |
| Three key-only guards | all new display keys | Prevent ordinary clients from creating canonical authority. No trusted writer bypass is enabled. |
| PostgREST verification | all three REST shapes | Proves physical catalog, ACL, RLS, and cache agree. |

### Second-pass removal test

| Item retained after pass 1 | Could all blockers and hard invariants pass without it? | Exact failure if absent |
|---|---|---|
| `flags.photo_object_key` | No | Candidate's six full flag reads still fail, or canonical display authority must be removed from reads. |
| `users.avatar_object_key` | No | Profile and update return continue to fail. |
| Authenticated avatar-key column grant | No | The new Profile projection can fail with `42501`; using a table grant violates privacy. |
| `flag_photos.object_key` | No, because gallery is retained | Gallery select remains broken and can false-empty legacy evidence. |
| key-only authority guards | No | Ordinary clients can forge display keys. |
| PostgREST verification | No | A catalog-correct but API-stale deployment can leave all release blockers unresolved. |

All other B1 backend objects pass the absence test **only while canonical writers remain disabled**. No required read surface or hard invariant needs them in that state. This is object-minimal, not SQL-line-minimal.

### Conditional full-writer fork

If any of the following is true, stop and discard this minimum cut:

- an authenticated canonical writer already exists or becomes executable after the keys are added;
- product declares photo upload or avatar upload release-required;
- existing production has non-null canonical keys through an out-of-band schema or writer;
- old installed-build recovery before candidate JS is a hard requirement;
- canonical ordinary/account deletion is itself a Prompt-B release requirement.

The resulting scope must then include, as one security-reviewed unit: uploader provenance with a privacy-safe storage design, gallery URL nullability, durable upload intents, prepare/commit/cancel RPCs, trusted commit guards, exact Storage ownership/policies, account write fence, ordinary Storage-first deletion, account-deletion inventory/review/audit/cleanup, and enabled leaderboard key consumers. B2 does not approve that larger fork.

## Fresh Runtime Preflight

Run this read-only preflight immediately before any Prompt-B edit or mutation. Stop at the first mismatch.

| Check | Classification | Minimum evidence | Expected result / action |
|---|---|---|---|
| Exact independently accepted Prompt-A base | `MUST RECHECK` | Record 40-character SHA; compare only source-sensitive files/functions and relevant migration objects to audited `2762a544...`. | Revalidate every changed instruction. Any semantic drift is a focused re-adjudication stop. |
| Production project identity | `MUST RECHECK` | Correlate local linked ref, authenticated project metadata, and the project ref encoded by the candidate/client Supabase URL. | All equal `kldlwszpfkdmsjrjhjym`. Name alone is insufficient. |
| Hosted migration ledger | `MUST RECHECK` | Latest version/name/count and any entry affecting Prompt-B media objects. | Expected 69 entries ending `20260819214410 photo_alt_text`. Any different tip requires migration-order and scope re-adjudication. |
| Physical catalog | `MUST RECHECK` | Types/nullability for all five B0-X media fields plus legacy URL columns and `flag_photos.url` nullability. | Expected key/uploader fields absent, legacy URLs present, gallery URL still NOT NULL. Any difference is a stop. |
| Users ACL/RLS | `MUST RECHECK` | Table and column privileges for anon/authenticated, avatar key, email, public profile columns; exact relevant SELECT policies. | Column-limited authenticated reads; no broad users SELECT; no authenticated email; no anon avatar-key grant. |
| Flags/gallery DML and read ACL/RLS | `MUST RECHECK` | Current INSERT/UPDATE/SELECT privileges and policies for `flags` and `flag_photos`. | Required to design key-only guards without breaking legacy URL/non-media writes. |
| Out-of-band writer island | `MUST RECHECK` | Existence, signatures, execute grants, and enabled state for upload-intent table, prepare/commit/cancel RPCs, provenance triggers, Edge/service paths, and equivalent Storage policies. | No client-, service-role-, Edge-, trigger-, or other deployed canonical writer may execute or become active merely because keys appear. Any previously unproved deployed/executable writer path is a stop for focused adjudication. |
| Deletion object identity | `RECHECK ONLY IF SOURCE/RUNTIME CHANGED` | Only if writer/deletion source or runtime changed, record presence/signatures of ordinary/account deletion RPCs referenced by deployed Edge code. | Do not broaden into deletion discovery or repair. If deletion becomes a release claim/requirement, stop for separate authority and proof. |
| Exact API failure/control pairs | `MUST RECHECK` | Same authenticated app-role session: full flags projection vs same-filter status/category control; Profile projection vs points/is_admin control; gallery `url,object_key,position,alt_text` vs same-filter `url,position,alt_text` control. Six calls. Record status/statusText/content type; redact row values. | Expected full projections fail and controls succeed. Any changed result means stop and re-adjudicate. |
| Raw REST `code/message/details/hint` | `RECHECK ONLY IF SOURCE/RUNTIME CHANGED` | Exact raw body for the disputed request; also mandatory before any fallback/bridge re-enters scope. | Not required for this no-fallback strategy when source/runtime still match. Never invent the fields. |
| Historic PostgreSQL log messages and fan-out classification | `CAN TRUST FROM B0-X` | Trust only if every preceding identity/catalog/grant/API check matches the expected state. | Do not repeat broad log discovery. |
| Development-shell native fingerprint | `MUST RECHECK` | For the one-build target, prove shell anchor, bundle ID, native graph/config fingerprint, and candidate diff. | Must satisfy the compatibility section below before B-5. |

**Staleness stop:** any project mismatch, relevant future-base change, ledger-tip change, catalog/type/nullability difference, grant/RLS difference, writer existence, or changed failure/control status means no SQL, cache reload, client edit, deployment, or fallback. Perform a focused re-adjudication of the changed fact.

## Release Blocker Matrix

| Surface | Status | Why | Dependency | Implement or verify | Acceptance proof |
|---|---|---|---|---|---|
| Home | `P0 RELEASE BLOCKER` | Runtime-confirmed provider projection failure affects the landing surface; Home also has unhandled Retry calls and shared punctuation. | Shared flag contract, provider state, copy. | Implement shared projection, caught Home callback, punctuation; verify UI. | Failure to Retry to fresh rows, error/offline markers clear, no unhandled rejection, no `yet..`. |
| Tasks | `P0 RELEASE BLOCKER` | Same provider failure blocks core task lists. | Shared flag contract. | No Tasks query fork; verify existing caught Retry and pagination. | Rows render; pull/banner Retry recover; filters/pagination remain exact. |
| Map | `P0 RELEASE BLOCKER` | Core Explore surface shares provider failure; native location copy is independently defective. | Shared flag contract and location boundary. | Implement shared projection/location normalizer; verify map. | Default and widened statuses render markers; Retry clears; no native domain text; later location success works. |
| Nearby | `P0 RELEASE BLOCKER` | It has no fetch and is unusable when Map/provider rows fail. | Provider rows. | Consumer verify-only after shared implementation. | Sorts with/without location and renders returned media; no invented independent Retry. |
| Profile | `P0 RELEASE BLOCKER` | Runtime-confirmed missing avatar key breaks base load and update return projection. | Users key, narrow grant, key guard. | Backend implementation; existing client verify-only. | Legacy live load/Retry/counts/save work; key-hydration is proven with a unit/rollback-safe fixture; privacy negatives pass. No live key-only avatar claim. |
| My Reports | `P0 RELEASE BLOCKER` | Named Prompt-B failure; independent state owner uses `listFlagsByUser`. | Shared flag helper. | Shared implementation plus independent recovery proof. | Failure then local Retry renders own rows and clears local banner. |
| Recent Activity | `P0 RELEASE BLOCKER` | Named Prompt-B failure; independent state owner uses `listRecentFlags`. | Shared flag helper. | Shared implementation plus independent recovery proof. | Failure then Retry renders recent rows; watched-storage degradation remains nonfatal. |
| Admin | `P0 RELEASE BLOCKER` | Moderation queue/hydration uses `listRecentFlags` and `fetchFlagsByIds`; false-empty moderation is release-unsafe. | Shared flag helper. | No Admin query fork; independent admin-role verification. | Queue and report targets hydrate; an error never counts as proof of an empty queue. |
| My Watched | `VERIFY ONLY` | Uses `fetchFlagsByIds`; no consumer edit earns inclusion. | Shared flag helper. | Verify stored-ID consumer. | Expected rows/media render; missing IDs remain bounded. |
| Recently Viewed | `VERIFY ONLY` | Uses `fetchFlagsByIds` and intentionally best-effort degrades. | Shared flag helper. | Verify only. | View order restored; stale IDs drop; empty UI is not treated as backend-success evidence. |
| deep links | `VERIFY ONLY` | Map uses `fetchFlagById`; centralized helper is sufficient. | Shared flag helper. | Verify valid and stale IDs. | Valid target focuses expected content; stale/deleted target safely no-ops and can be retried. |
| realtime refresh | `SAFE POST-RELEASE DEFER` | Opt-in and nonfatal; manual refresh reconciles. Shared helper is corrected, but live-event proof is not in the minimum release gate. | `fetchFlagById`. | No dedicated edit beyond helper; defer live acceptance. | If later claimed, prove an enabled event produces a viewport-gated row/media update. |
| Settings export | `P0 RELEASE BLOCKER` | Subject-access export uses `listFlagsByUser`; deterministic projection failure makes the export incomplete/unavailable. | Shared flag helper. | Shared implementation; independent export verification. | Export contains expected owned records and no unintended private/internal fields. |
| gallery | `RELEASE-QUALITY REQUIRED` | Existing query selects missing key; helper/consumer behavior can silently false-empty or retain stale evidence. | Gallery key, truthful helper, per-flag detail error state. | Backend key; helper throws all errors; detail modal resets, shows accessible error, and retries same loader. | Legacy live REST/render works in order; pre-native failure -> visible Retry -> success clears/publishes; key-first mapper is a unit fixture only. |
| all-time leaderboard | `VERIFY ONLY` | Existing legacy avatar surface is not a proven blocker and no canonical avatar writer is enabled. | Existing `avatar_url`. | No key client edit; verify legacy avatar and monogram behavior. | Ranks/points and legacy avatars remain; no claim for key-only avatars. |
| monthly leaderboard | `SAFE POST-RELEASE DEFER` | RPC is optional/non-managed and intentionally graceful-empty. | Future privacy-reviewed RPC. | Defer backend and client key output. | If later shipped, prove aggregate-only response, exact EXECUTE, and key-only avatar rendering. |

## Minimum Backend Contract

One new managed forward migration may contain only the approved objects below. It must be synthesized against the exact future base. Do not move, rename, or apply the non-managed D1F4/R2/R3/FIX2/FIX3 proposals.

| Object | Change required | Dependency | Security requirement | Data-safety requirement | Replay proof | Hosted proof |
|---|---|---|---|---|---|---|
| Managed Prompt-B read-contract migration | One additive transaction containing the three keys, narrow grant, and key guards | Final Prompt-A migration order | No unrelated policy/RPC/Storage/deletion changes | No DML/backfill/default; forward-only | Clean replay and upgrade replay | Ledger records exact new migration once |
| `public.flags.photo_object_key` | Add nullable `text`, no default | key-only flag guard | Existing read/RLS behavior; ordinary clients cannot set/change key | `photo_url`, `photo_alt`, and all rows unchanged | Catalog type/nullability and legacy hashes/counts | Exact candidate projection without uploader returns 200 for every final supported read role, at least anon and authenticated if final ACL/RLS supports both |
| `public.users.avatar_object_key` | Add nullable `text`, no default | narrow grant and avatar-key guard | authenticated column SELECT only; no anon/table grant; RLS unchanged | `avatar_url`, email, and rows unchanged | ACL matrix plus rollback-safe display-name/key-write fixture | Profile/read projection 200; negative email/anon ACL probes; no ordinary production-row mutation |
| `public.flag_photos.object_key` | Add nullable `text`, no default; keep `url` NOT NULL | gallery key guard | Existing read policy; ordinary clients cannot set/change key | Legacy URL rows/order/alt text unchanged | Catalog and legacy row preservation | Exact gallery projection returns 200 and ordered legacy rows |
| Three narrow key guards | Reject ordinary INSERT/UPDATE of only the three new key fields | three columns | non-client-executable functions, pinned search path, enabled triggers; no trusted writer bypass in this release | Legacy URL and non-media writes remain allowed | rollback-safe malicious writes fail with zero row change; allowed legacy/non-media writes pass | Mutation probes only in disposable replay/staging or an explicitly authorized sacrificial fixture; no ordinary production-row DML |
| PostgREST visibility | Normal DDL invalidation and exact recheck | committed migration | No ACL/RLS alteration as a cache workaround | no row change | catalog correct before API probe | candidate projections 200; one approved reload only if catalog correct/API stale |

### Explicit backend answers

- Add `flags.photo_object_key` now? **YES.**
- Add `flags.photo_uploader_id` now? **NO.** Defer due no read dependency and provenance disclosure risk.
- Add `users.avatar_object_key` now? **YES**, with authenticated column-only SELECT and a key-write guard.
- Add `flag_photos.object_key` now? **YES**, because gallery is retained.
- Add `flag_photos.uploader_id` now? **NO.**
- Alter gallery URL nullability now? **NO.** Keep legacy `url` NOT NULL while canonical writers are disabled.
- Add upload-intent table now? **NO.**
- Add prepare/commit/cancel RPCs now? **NO.**
- Add provenance triggers now? **YES, but only narrow key-write guards.** Do not promote B1's full trusted-writer/uploader/legacy-URL guards.
- Change deletion machinery now or verify only? **VERIFY ONLY.** No product/object change.
- Add/change leaderboard RPC now? **NO.** Monthly is deferred; all-time remains legacy verify-only.
- PostgREST reload/recheck? **RECHECK MANDATORY; explicit reload conditional on proven cache staleness.**

## Verify-Only / Deferred Backend

| Object/group | Disposition | Why | Condition that reopens it |
|---|---|---|---|
| `flags.photo_uploader_id`, `flag_photos.uploader_id` | Safe defer | Not display dependencies; current table reads could expose contributor identity. | Any authorized canonical writer/provenance rollout, with a separate privacy-safe read design. |
| `flag_photos.url` nullability | Safe defer | Needed only for key-only canonical gallery commits. | Canonical gallery writer activation. |
| upload intents/index/RLS/service grants | Safe defer | No read dependency. | Photo/avatar upload declared release-required. |
| prepare/commit/cancel RPCs | Safe defer | Would activate the full writer island. | Same, with complete Storage/fence/deletion closure. |
| Storage insert/delete policies and owner helpers | Verify only | Prompt B performs no Storage write/policy change. | Writer or canonical deletion activation. |
| account write fence | Out of Prompt B | No in-scope writer calls it. | Canonical writer activation. |
| account deletion inventory/review/audit/cleanup | Verify only | No new canonical values are created; leave accepted source objects unchanged. | Writer activation or proven deletion defect under separate authority. |
| ordinary canonical flag deletion plan/finalize | Verify only | Current deletion paths remain untouched. | Canonical objects can be created or ordinary deletion becomes a release requirement. |
| monthly leaderboard RPC | Safe defer | Optional/non-managed surface, not a proven blocker. | Explicit later feature scope. |
| all-time key mapping backend | Safe defer | Direct users query needs no new backend object beyond the Profile key/grant. | Canonical avatar writer activation. |

## Data-Safety Invariants

The following are hard gates:

1. **DS-01 No destructive backfill:** no migration DML, URL-to-key derivation, uploader inference, default population, or Storage scan.
2. **DS-02 No migration or ordinary production-row changes:** before/after counts and hashes for legacy media columns must match. Migration DML and ordinary production-row `UPDATE` are high risk and excluded. Positive/negative mutation proof is limited to disposable replay/staging or an explicitly authorized rollback-safe sacrificial fixture.
3. **DS-03 Legacy primary photos survive:** never null or rewrite `flags.photo_url`.
4. **DS-04 Legacy gallery photos survive:** never null or rewrite `flag_photos.url`; keep its existing NOT NULL constraint in this cut.
5. **DS-05 Legacy avatars survive:** never null or rewrite `users.avatar_url`.
6. **DS-06 Key-capable reads remain:** full flag, Profile, and gallery reads retain their object keys and key-first display normalizers.
7. **DS-07 Server-owned authority:** ordinary clients cannot choose or mutate any added key. No trusted canonical writer is enabled by Prompt B.
8. **DS-08 No uploader inference:** never infer provenance from user IDs, URL prefixes, timestamps, current session, or legacy row ownership.
9. **DS-09 No fallback concealment:** no generic 400, `PGRST204`, `/does not exist/`, 401/403/42501, malformed response, or decode error may invoke a legacy projection or false-empty gallery.
10. **DS-10 Users privacy remains column-limited:** no table-wide `users` SELECT and no new anon/email access.
11. **DS-11 Display-key visibility is explicit:** `flags.photo_object_key` inherits the final flag-row read visibility, including anon if final ACL/RLS permits it; `flag_photos.object_key` inherits gallery visibility. This is accepted only because each key is opaque URL-equivalent display data, remains NULL in this cut, contains no uploader/subject identity, and grants no write/deletion authority. Any non-opaque future key is a privacy/design stop.
12. **DS-12 Storage remains untouched:** no object create/delete/rename/owner rewrite/inventory sweep and no Storage policy change in this repair.
13. **DS-13 Deletion safety is not weakened:** the Prompt-B diff does not touch account/ordinary deletion, fence, review/audit, terminal, Storage, or receipt objects; accepted source suites remain green; the new migration creates no canonical inventory. This is source/diff non-regression, not proof deployed deletion works.
14. **DS-14 Public readability is not deletion authority:** future deletion must continue to use exact bucket/key/owner evidence, never public URL parsing or object visibility.
15. **DS-15 Durable ambiguity remains:** where accepted intent/review objects exist, PREPARED/AMBIGUOUS intents, receipts, review items, audit, and terminal evidence may not be erased to make a retry appear successful.
16. **DS-16 Writer activation is atomic:** any later canonical writer requires uploader provenance, privacy-safe storage, intents, Storage owner checks, fence, and deletion closure in the same authorized rollout.
17. **DS-17 Honest media scope:** this cut restores key-capable read contracts and legacy gallery rendering. It does not prove or enable key-only canonical upload/gallery/leaderboard behavior.

### HIGH RISK: explicit authority required

The following are excluded and require separate written authority and security review:

- any migration or ordinary production-row `UPDATE`, including automatic URL nulling; rollback-safe disposable/staging proof fixtures are the only exception;
- any URL-to-key or uploader backfill;
- any Storage object creation, deletion, rename, owner rewrite, or inventory sweep;
- any population of canonical keys in production;
- any uploader-ID addition/exposure or table-grant rewrite;
- any activation of canonical upload RPCs;
- any account-deletion fence, review/audit, terminal evidence, receipt, or cleanup change;
- any direct-delete restoration;
- wholesale application of D1F4/R2/R3/FIX2/FIX3.

## Privacy Verdict

For `users.avatar_object_key`, the required permission invariant is:

```text
authenticated: SELECT on users.avatar_object_key as a column privilege
anon: no avatar_object_key column privilege
authenticated: no users.email column privilege
authenticated: no table-wide SELECT on public.users
RLS: unchanged and still authoritative for row visibility
```

Conceptually, the only new read permission is `GRANT SELECT (avatar_object_key) ON public.users TO authenticated`. `GRANT SELECT ON public.users`, `GRANT SELECT ON ALL COLUMNS`, or any table-wide equivalent is rejected.

Column ACL and RLS are both required. The column grant permits the field; existing RLS decides which rows are visible. The avatar key must have the same row visibility as the already-public `avatar_url`, while email remains available only through its established caller-scoped path.

Required positive proof:

- authenticated `has_column_privilege` for `avatar_object_key` is true;
- the exact safe Profile projection returns HTTP 200 for the authenticated subject;
- `updateUserProfile()` returns the same safe shape and preserves key hydration in unit/replay or a rollback-safe fixture;
- ordinary display-name update succeeds in disposable replay/staging or an explicitly authorized sacrificial fixture.

Required negative proof:

- authenticated email column privilege remains false;
- anon avatar-key privilege remains false;
- authenticated table-level users SELECT remains false;
- direct authenticated `select=email` and `select=*` remain denied;
- direct authenticated avatar-key mutation fails with `42501` and zero row change in a rollback-safe fixture;
- exact SELECT policy definitions and row visibility remain unchanged; anon still has no users access, and the new column grant creates or changes no policy. Test an out-of-policy row only if fresh preflight proves such a role/policy case exists.

Any unexpected `401`, `403`, or `42501` on an intended positive request is a stop condition. `42501` is expected only for deliberate negative privacy/forgery probes. Never treat authorization failure as permission to fall back.

Uploader IDs are specifically excluded. App-level omission is not access control: existing table-level reads could expose a new uploader column through REST or bare `.select()` mutation returns. A later provenance rollout needs a separate privacy-approved storage/read design.

The two display keys added to `flags` and `flag_photos` intentionally inherit those tables' final read visibility as URL-equivalent presentation data. Preflight and hosted proof must record the exact ACL/RLS, including anon flag access if supported. Keys must be opaque, reveal no uploader/subject identity, remain non-authoritative for writes/deletion, and remain NULL in this cut. Otherwise stop for a projection/view/privacy redesign.

## Minimum Client Contract

### B1 client proposal classification

| Proposal | Classification | Final decision |
|---|---|---|
| centralized `FLAG_READ_SELECT` | `MUST IMPLEMENT` | One exact projection for all six full helpers. |
| all six flag readers | `MUST IMPLEMENT` | Use the constant in `listFlags`, `listFlagsPage`, `listFlagsByUser`, `fetchFlagById`, `fetchFlagsByIds`, and `listRecentFlags`. |
| remove `photo_uploader_id` from display reads | `MUST IMPLEMENT` | No runtime display consumer; avoids needless dependency and provenance exposure. |
| preserve `photo_object_key` | `MUST IMPLEMENT` | Retain key-capable display and current key-first normalizer. |
| centralized `USER_PROFILE_SELECT` | `SAFE DEFER` | Existing load/update projections are already identical and safe. |
| `getUserProfile` helper | `SAFE DEFER` | Maintainability improvement, not a release dependency. |
| `updateUserProfile` return hydration | `VERIFY ONLY` | Already selects avatar key and calls `withAvatarDisplayUrl`. |
| Profile consumer | `VERIFY ONLY` | Already selects safe fields, hydrates key, and isolates optional counts/events. |
| gallery normalizer/error boundary | `MUST IMPLEMENT` | Preserve mapper, remove missing-relation degradation, and add per-flag owned loading/error/Retry state in the detail consumer. |
| all-time leaderboard avatar keys | `SAFE DEFER` | No avatar writer in scope. Becomes required if writer activation returns. |
| monthly leaderboard avatar keys | `SAFE DEFER` | RPC remains absent/disabled. |
| Home Retry rejection handling | `MUST IMPLEMENT` | Catch the provider's intentional no-cache rejection at all three Home entry points. |
| provider error clearing | `VERIFY ONLY` | Existing refresh already clears on genuine network success/usable cache, not unrelated activity. |
| punctuation normalization | `MUST IMPLEMENT` | Fix confirmed double-period composition. |
| location-specific normalization | `MUST IMPLEMENT` | Prevent raw Core Location text from reaching UI while keeping internal diagnostics. |
| deletion receipt preservation | `VERIFY ONLY` | Existing ambiguity retention/reuse/selected clearing is deliberate. |

### Required production changes

| File | Function/object | Why | Shared benefit | Blast radius |
|---|---|---|---|---|
| `src/lib/flags.ts` | `FLAG_READ_SELECT`; six full helpers | Fix every full-reader projection once; retain key, remove uploader | Provider, My Reports, Activity, Admin, Watched, Recently Viewed, deep links, realtime, export | Every full flag read. Preserve filters, ordering, limits, cursors, user/ID scope, batching, and not-found/error semantics. |
| `src/screens/HomeScreen.tsx` | one local caught refresh callback | Prevent unhandled rejection from three bare `void refresh()` paths | Pull-to-refresh and both visible Retry controls | Home only; provider remains error owner. |
| `src/lib/copy.ts` | `failureBannerText` | Trim, preserve retry dedupe, and add exactly one sentence boundary | Home, Tasks, Map failure banners | Shared failure copy only. Required output: `That feature isn't available yet. Tap to retry.` |
| `src/lib/location.ts` | location exception normalizer and `useUserLocation` catch | Stable human copy; raw native diagnostics internal only | Shared location hook | Exception presentation only; permission/timeouts/privacy/web behavior unchanged. |
| `src/screens/MapScreen.tsx` | native `requestLocation` catch | Use the location-specific boundary | Map and Report's delegated Use My Location action | Native catch only; no Report modal rewrite. |
| `src/lib/photos.ts` | `listFlagPhotos` query-error and catch paths | Throw every backend error, including a missing relation; never convert a required-table defect into `[]` | Prevent false-empty legacy/canonical galleries | Gallery loading only; preserve position ordering and key-first/legacy-fallback mapper. |
| `src/components/FlagDetailModal.tsx` | gallery load effect/callback and presentation | Clear rows/error on flag change, prevent stale completion, show accessible owned error and Retry, clear only after success | Makes helper failures truthful and recoverable | Flag Detail gallery only; preserve add-photo/write behavior, ordering, modal layout, and unrelated detail state. |

Do not import `withAvatarDisplayUrl` from `users.ts` into `flags.ts`; `users.ts` already imports `uploadStrippedImage` from `flags.ts`, which would create a cycle. This matters only if later leaderboard scope returns.

## Claim Boundaries

With the minimum cut, the implementation/release team may claim only:

- runtime-confirmed full flag and Profile read projections are aligned for the exact candidate;
- all six full flag helpers share one key-capable, uploader-free projection;
- existing legacy primary photo, gallery, and avatar values were preserved;
- gallery failures no longer masquerade as empty/stale content, if the helper-and-consumer proof passes;
- users privacy remains column-limited;
- Home Retry, failure punctuation, and native location presentation were repaired;
- Prompt-B did not touch deletion/Storage objects, accepted source suites remained green, and receipt behavior was reverified; deployed deletion functionality is not claimed.

The team must not claim:

- the old installed bundle recovers after backend deployment; it still selects `photo_uploader_id`;
- photo upload or avatar upload is repaired;
- canonical upload provenance is deployed;
- Storage ownership/commit behavior is accepted end to end;
- canonical ordinary or account deletion was repaired;
- key-only canonical media rendered without a real fixture;
- all canonical media paths recovered;
- canonical avatars work on all-time or monthly leaderboards;
- monthly leaderboard was restored or implemented;
- realtime subscription refresh recovered;
- provider success proves My Reports, Activity, Admin, export, deep-link, or gallery behavior;
- Profile HTTP 200 alone proves privacy;
- unit tests prove deployed grants, Storage readability, image decode, native location, or navigation persistence;
- dev-shell behavioral acceptance proves TestFlight/release-binary provenance.

Specific deferred-boundary statements:

- **Gallery:** claim legacy gallery read recovery and truthful errors only. Do not claim canonical gallery write or key-only gallery recovery.
- **Leaderboards:** claim only legacy all-time behavior was non-regressed. Do not claim canonical avatars everywhere. Monthly remains deferred.
- **Deletion:** claim only no Prompt-B regression. Do not claim D1F4 deletion machinery was promoted or repaired.
- **Uploads:** do not describe the release as restoring photo/avatar upload. If upload is release-required, stop and reopen the full writer island before implementation.
- **Realtime:** the shared helper is corrected, but live subscription behavior is post-release defer unless separately accepted.

## Test Rationalization

B1's 15 release-contract IDs collapse into **8 mandatory pre-native contract groups**. This is a grouping of evidence, not a reduction in assertions. Parameterized cases, existing focused files, typecheck, lint, full Jest, and required CI still run.

### Mandatory pre-native tests

| Test ID | Surface/contract | B1 IDs combined | Failure prevented |
|---|---|---|---|
| `B2-PN01` | Managed schema and privacy | B-T01 + B-T02 | Partial columns, wrong nullability, missing avatar grant, broad users SELECT, anon/email exposure, wrong RLS/guard grants. |
| `B2-PN02` | Key authority and backend safety non-regression | narrowed B-T03 | Client-forged keys, over-broad guards breaking key-omitted/null inserts, non-key owner/moderator updates or Profile display-name updates, Prompt-B touching Storage/deletion objects, deletion safety regression. Direct non-null key writes must fail. No canonical writer happy-path is required because writers are deferred. |
| `B2-PN03` | All six flag readers and media/query semantics | B-T04 + B-T05 + B-T06 | Fixing fewer than six, uploader reintroduction, hidden key media, stale URL precedence, changed filters/order/limit/cursor/scope/batching/not-found/error semantics. |
| `B2-PN04` | Profile load and update contract | B-T07 + B-T08 | `users` update/select/hydration tests plus a focused Profile load failure -> Retry -> success/publish/clear behavioral test prevent projection drift, email inclusion, avatar key loss after display-name save, and stale local error. No production Profile helper refactor is implied; B-5 repeats the behavior on live iOS. |
| `B2-PN05` | Recovery-state owner matrix | B-T09 + B-T10 + B-T13 | Prove no-cache failure -> caught Retry -> fresh rows plus cleared error/offline markers; non-owner activity does not clear; all three Home handlers are caught; My Reports/Activity recover independently. Prevents provider stale error, unhandled Home rejection, and provider-only coverage. |
| `B2-PN06` | User-facing error normalization | B-T11 + B-T12 | Double punctuation, duplicate Retry sentence, raw native location text, accidental generic/web error redesign. |
| `B2-PN07` | Gallery helper and consumer contract | relevant B-T14 subset | Missing relation, `PGRST204`/`42703` missing-column/cache, 401/403/42501, network, malformed/decode, and unrelated errors all throw. Detail state clears per flag, cannot retain stale photos, exposes accessible Retry, and failure -> Retry -> success clears error/publishes ordered rows. Also protects key/legacy mapping. Leaderboards are excluded. |
| `B2-PN08` | Deletion receipt preservation | B-T15 | Receipt not persisted before request, cleared on outage, not reusable for recovery, or wrong receipt cleared. |

### Combineable tests

- B-T01/B-T02 share one schema/ACL/RLS contract.
- B-T04/B-T05/B-T06 form one parameterized six-helper contract while retaining existing pagination assertions.
- B-T07/B-T08 form one Profile data contract without requiring a helper refactor.
- B-T09/B-T10/B-T13 form one recovery matrix with shared-provider and independent-owner cases.
- B-T11/B-T12 form one user-facing error-normalization group, though they remain in their natural test files.

### Redundant or unnecessary as separate release-contract IDs

- B-T05 does not need a standalone ID; exercise normalization through reader results.
- B-T06 remains an existing test file but not a separate release-contract ID.
- B-T08 does not justify a new Profile production helper/refactor; exact source wiring plus behavior is sufficient.
- B-T10 updates the existing Home source guard and focused behavior; no second screen-wide happy-path copy.
- Monthly/all-time portions of B-T14 are unnecessary while avatar writers/leaderboard key support are deferred.
- Six screen-specific happy-path copies are rejected. The shared helper matrix plus independent state-owner tests cover the real boundaries.

### Live-only acceptance checks

Pre-native tests do not prove:

- deployed catalog, migration ledger, ACL/RLS, cache freshness, exact REST status/body;
- public object existence/readability, remote image load/decode/render;
- Home/Tasks/Map/Nearby visual recovery and navigation persistence;
- Profile load/Retry/save in app;
- My Reports, Activity, Admin, Watched, Recently Viewed, export, and deep-link behavior;
- native Core Location alert copy and later successful Retry;
- SecureStore/UI receipt recovery on a real, safe non-destructive fixture;
- final EAS/TestFlight artifact provenance.

Do not manufacture a destructive production deletion scenario for B-5. Keep receipt lifecycle proof pre-native unless a safe existing non-production fixture already exists.

After focused suites pass, run the repository's typecheck, lint, full Jest suite, and required CI once against the exact candidate SHA. No native build begins while any gate is red or unexplained.

## Dev-Shell Compatibility

Evidence against the audited SHA supports feasibility, not final compatibility. Repository operating evidence identifies a prior Debug+Metro shell anchored at `2690d440fbd8e62059c9f93601638778a09853d3`. Audited `2762a544...` descends from it, and `app.json`, `eas.json`, `package.json`, `package-lock.json`, `metro.config.js`, `babel.config.js`, and `plugins/withFmtXcode26Fix.js` are byte-identical between those SHAs. The final Prompt-A/B candidate must be compared again.

**DEV SHELL COMPATIBLE IF:**

- the installed app is a Metro-capable custom development shell, not merely TestFlight build 15;
- shell provenance identifies its source anchor and native fingerprint;
- bundle ID is exactly `com.accessmap.app`;
- Expo SDK, React Native, Hermes/architecture, `expo-dev-client`, every autolinked native package/transitive version, and config-plugin output match the candidate;
- there are no package/native-module changes requiring rebuild;
- there are no Expo/native config, plugin, entitlement, permission, privacy manifest, scheme, native asset, Podfile/lock, Info.plist, Xcode project/build setting, native source, or deployment-target changes;
- any pure-JS dependency change is proven not to affect native linking and works in the shell;
- the shell can connect to Metro on the target simulator/device;
- environment/backend identity is exact and Metro is restarted after environment changes.

**DEV SHELL INVALID IF:**

- it is only a release/TestFlight app;
- shell source/fingerprint cannot be proven;
- bundle ID or any resolved native input differs;
- candidate needs a native API absent from the shell;
- the development launcher cannot load the candidate bundle;
- the installed shell was replaced and cannot be distinguished;
- final Prompt-A changes native inputs;
- any native/config edit appears during B-3 or after B-5.

**BEHAVIORAL PROOF MEANS:**

1. exact accepted candidate commit and tree SHA recorded;
2. tracked worktree/index clean before and after, with no relevant untracked source, resolver, or configuration input; only documented ignored runtime artifacts such as environment files, `node_modules`, and evidence/log output may remain;
3. candidate `package-lock.json` hash plus Node/npm versions recorded, followed by the repository-approved deterministic lockfile install (`npm ci --legacy-peer-deps` when that is the accepted command), or equivalent proof that installed `node_modules` resolves exactly from that lock;
4. native fingerprint rechecked against shell anchor;
5. all competing Metro servers stopped;
6. one cache-cleared Metro process started from the candidate's absolute worktree;
7. PID, working directory, port, startup time, candidate SHA, and backend identity recorded;
8. shell terminated/relaunched and forced to perform a full reload, not Fast Refresh;
9. a fresh iOS bundle request/completion captured after reload;
10. screenshots/video/logs tied to SHA, backend migration, shell fingerprint, lockfile/install identity, and timestamp.

This proves that the committed candidate JS/TS behaves correctly through compatible native bridges.

**BEHAVIORAL PROOF DOES NOT MEAN:** authoritative release-binary provenance. It does not prove EAS source packaging, Release-mode bundling/minification, production environment injection, signing, entitlements, App Store metadata, version/build identity, processing, or TestFlight installation.

## One-Build Decision

ONE FINAL RELEASE BUILD TARGET:
CONDITIONAL

Every prerequisite below is mandatory:

1. final Prompt-A SHA and source-sensitive findings revalidate;
2. B-0 runtime identity/ledger/catalog/grants/writer checks match this report;
3. explicit backend authority is granted;
4. managed migration, replay, deployment, catalog/grant/cache/API, key-guard, legacy-data, and non-regression proof pass;
5. B-3 introduces no native/config dependency change;
6. all 8 contract groups, typecheck, lint, full tests, and required CI pass at the exact candidate SHA;
7. installed dev shell satisfies every compatibility condition;
8. safe accounts, fixtures, and failure conditions are prepared before B-5;
9. B-5 exact-JS-SHA behavioral acceptance passes;
10. source and backend freeze after B-5;
11. approved release path builds the exact accepted SHA using the `testflight` store profile and production environment;
12. EAS build ID, source SHA, EAS `gitCommitHash`, profile, version, build number, and exact submitted artifact are captured from a clean exact checkout;
13. processed TestFlight artifact passes a narrow release-specific install/launch/backend smoke check.

**LIVE JS BEHAVIORAL ACCEPTANCE:** B-5 proves exact candidate JS behavior in a compatible development shell.

**FINAL NATIVE/TESTFLIGHT PROVENANCE:** B-6 proves the built, signed, processed artifact corresponds to the accepted SHA/profile/version/build.

If the shell is missing/incompatible, choose explicitly between a development build plus the final TestFlight build or delaying release. Do not use the only release build as the first exploratory behavioral test.

Release-path hazard: `eas.json` has a `testflight` profile, but the audited manual `.github/workflows/eas-testflight-submit.yml` choices omit it and submit `--latest`. Do not broaden Prompt B to repair that workflow. Use an already accepted path that pins the exact accepted SHA/profile/artifact. Ambiguous `--latest` provenance is a stop condition.

Expected native build count: **ONE**, only while every prerequisite remains true. Otherwise stop and explicitly authorize a two-build path.

## Final Waves

### B-0: fresh source/runtime/dev-shell preflight

- **OWNER:** independent release/backend reviewer.
- **OBJECTIVE:** prove the plan is not stale and the one-build premise is feasible.
- **FILES / OBJECTS:** exact Prompt-A candidate; linked project identity; ledger; relevant catalog/ACL/RLS/functions/triggers; target-host installed-shell inventory, provenance, fingerprint, and launch/Metro-capability smoke.
- **PRECONDITIONS:** none; read-only access only.
- **TESTS:** focused source diff and read-only catalog/API controls.
- **RUNTIME PROOF:** project `kldlwszpfkdmsjrjhjym`, expected ledger/catalog/grant/failure-control state, no active writer island.
- **PARALLEL SAFE?:** yes, independent read-only source/runtime/shell lanes; one reconciled verdict.
- **SIMULATOR REQUIRED?:** yes for the one-build target, but only for an early installed-shell inventory/launch/Metro-capability smoke; no behavioral acceptance and no build.
- **NATIVE BUILD REQUIRED?:** no.
- **STOP CONDITIONS:** any staleness, active writer, privacy difference, source contradiction, unprovable shell fingerprint, or installed shell that is absent, unlaunchable, or Metro-incompatible.
- **OUTPUT / EVIDENCE:** signed preflight packet with exact source, project, ledger, catalog, ACL, API, and shell identities.

### B-1: authorized minimal backend implementation

- **OWNER:** one backend/security writer.
- **OBJECTIVE:** create the one managed read-contract migration and backend tests only.
- **FILES / OBJECTS:** one new managed migration; backend contract tests for three keys, one grant, three key guards, legacy-data preservation.
- **PRECONDITIONS:** B-0 green; explicit backend authority; no canonical writer active; gallery remains approved release-quality scope.
- **TESTS:** B2-PN01 and B2-PN02 authoring/replay.
- **RUNTIME PROOF:** none yet; no deploy in this wave.
- **PARALLEL SAFE?:** no competing backend writer; read-only review may begin after a candidate SHA exists.
- **SIMULATOR REQUIRED?:** no.
- **NATIVE BUILD REQUIRED?:** no.
- **STOP CONDITIONS:** destructive DML, uploader/writer/deletion object enters diff, broad users grant, guard breaks legacy writes, dependency ambiguity.
- **OUTPUT / EVIDENCE:** backend candidate SHA, migration hash/version, clean/upgrade replay logs, object/grant diff.

### B-2: backend replay, deployment, REST, and security proof

- **OWNER:** authorized deployer plus independent backend/security reviewer who did not write B-1.
- **OBJECTIVE:** deploy through the approved path and prove catalog, ACL/RLS, cache, API, legacy preservation, key authority, plus source/diff non-regression for untouched deletion/Storage objects.
- **FILES / OBJECTS:** exact accepted B-1 SHA and linked project only.
- **PRECONDITIONS:** B-1 accepted; exact project reconfirmed; authorized deployment window.
- **TESTS:** B2-PN01/B2-PN02; exact role/API matrix.
- **RUNTIME PROOF:** candidate flags projection 200 for every final supported read role, at least anon and authenticated if applicable; Profile/gallery projections 200; read-only privacy negatives and controls remain correct; rollback-safe mutation probes are confined to disposable/staging or an authorized sacrificial fixture; no ordinary production-row, Storage, or deletion mutation.
- **PARALLEL SAFE?:** no concurrent schema/grant/deploy writer; read-only evidence capture after deployment settles is safe.
- **SIMULATOR REQUIRED?:** no.
- **NATIVE BUILD REQUIRED?:** no.
- **STOP CONDITIONS:** non-200 positive projection, unexpected 401/403/42501, catalog/cache disagreement, privacy broadening, writer activation, legacy change, or Prompt-B touching/breaking accepted deletion/Storage source contracts. If deployed deletion behavior must be claimed, stop for separate authorized runtime proof.
- **OUTPUT / EVIDENCE:** immutable backend proof packet tied to project, migration, deployment, role, and timestamps.

### B-3: one grouped client implementation

- **OWNER:** one React Native/TypeScript client writer.
- **OBJECTIVE:** implement only the seven production-file surfaces in the minimum client contract and corresponding focused tests.
- **FILES / OBJECTS:** `src/lib/flags.ts`, `src/screens/HomeScreen.tsx`, `src/lib/copy.ts`, `src/lib/location.ts`, `src/screens/MapScreen.tsx`, `src/lib/photos.ts`, `src/components/FlagDetailModal.tsx`; test files for B2-PN03 through B2-PN08.
- **PRECONDITIONS:** B-2 contract frozen and green.
- **TESTS:** author/update all remaining mandatory groups while editing.
- **RUNTIME PROOF:** none required during editing.
- **PARALLEL SAFE?:** no competing client writer; backend remains frozen.
- **SIMULATOR REQUIRED?:** no.
- **NATIVE BUILD REQUIRED?:** no.
- **STOP CONDITIONS:** generic fallback, Profile/provider/leaderboard/deletion production edit without new evidence, native/config change, helper semantic drift, backend drift.
- **OUTPUT / EVIDENCE:** one client candidate SHA and changed-surface manifest.

### B-4: exact-SHA pre-native verification

- **OWNER:** independent client reviewer; read-only test lanes may parallelize.
- **OBJECTIVE:** prove the exact candidate contract before native work.
- **FILES / OBJECTS:** B-3 diff, all 8 contract groups, repository gates, final native fingerprint.
- **PRECONDITIONS:** B-3 writer finished; worktree clean at exact candidate SHA.
- **TESTS:** B2-PN01 through B2-PN08, focused suites, typecheck, lint, full Jest, required CI.
- **RUNTIME PROOF:** recheck backend identity/API if time or deployment identity changed.
- **PARALLEL SAFE?:** yes for read-only tests/review; no writers until one verdict.
- **SIMULATOR REQUIRED?:** no.
- **NATIVE BUILD REQUIRED?:** no.
- **STOP CONDITIONS:** red/flaky unexplained test, mock does not assert projection arguments, dirty candidate, claim overreach, native fingerprint mismatch.
- **OUTPUT / EVIDENCE:** independently accepted exact SHA and pre-native proof packet.

### B-5: exact-JS-SHA iOS behavioral acceptance

- **OWNER:** one independent iOS controller, preferably not the client writer.
- **OBJECTIVE:** exercise the B-4 candidate against the exact B-2 backend in a compatible installed development shell.
- **FILES / OBJECTS:** no edits; one clean worktree and one Metro process.
- **PRECONDITIONS:** B-4 green; shell compatibility/provenance proven; safe accounts/fixtures ready.
- **TESTS:** provider cohort; Profile; My Reports; Activity; Admin; Watched; Recently Viewed; export; deep links; real legacy gallery render/order; punctuation; Home Retry; Map/Report location; safe receipt UI where feasible. Gallery helper/consumer fault-and-Retry cases remain pre-native and are exercised in B-5 only if a safe fault harness already exists. Realtime and monthly remain deferred; all-time is legacy smoke only.
- **RUNTIME PROOF:** evidence chain in Dev-Shell Compatibility tied to candidate/backend/shell/timestamp.
- **PARALLEL SAFE?:** one simulator/device controller only; observers may review evidence.
- **SIMULATOR REQUIRED?:** yes, or a compatible real iOS development device where required for native location behavior.
- **NATIVE BUILD REQUIRED?:** no, only if the shell is compatible.
- **STOP CONDITIONS:** provenance gap, unsafe/missing fixture, any acceptance failure, backend drift, source edit, competing Metro process.
- **OUTPUT / EVIDENCE:** exact-JS behavioral acceptance checklist and media/UI evidence.

### B-6: one final release/TestFlight build

- **OWNER:** release owner under Sky's explicit merge/release gate.
- **OBJECTIVE:** build and submit the exact B-5 accepted candidate once, then perform narrow artifact smoke.
- **FILES / OBJECTS:** no source edits after B-5; approved pinned TestFlight build path.
- **PRECONDITIONS:** all one-build prerequisites remain true; source/backend frozen.
- **TESTS:** release preflight, artifact identity verification, processed TestFlight install/launch/backend smoke.
- **RUNTIME PROOF:** clean exact checkout; EAS/TestFlight build ID, source SHA and `gitCommitHash` match, profile, environment, version/build, processing, and submission pinned to the captured build ID rather than `--latest`.
- **PARALLEL SAFE?:** no competing build from another SHA and no `--latest` ambiguity.
- **SIMULATOR REQUIRED?:** not for build; artifact smoke uses supported iOS install path.
- **NATIVE BUILD REQUIRED?:** yes, one target release build.
- **STOP CONDITIONS:** post-B-5 source/backend change, wrong profile/SHA/version, build/preflight failure, ambiguous artifact, release-only smoke failure.
- **OUTPUT / EVIDENCE:** final artifact provenance and release verdict. A failed artifact is not shipped even if that breaks the one-build target.

## Worker Ownership

| Role | Assignment rule | Concurrency rule |
|---|---|---|
| BACKEND WRITER | One strongest backend/Supabase/security implementation worker with explicit authority | Sole writer for migration/backend tests; no simultaneous schema/Edge writer |
| CLIENT WRITER | One React Native/TypeScript implementation worker | Sole writer for all listed client/test surfaces; starts after B-2 freeze |
| BACKEND INDEPENDENT REVIEW | Security-capable reviewer other than backend writer | Read-only after backend candidate/deploy settles |
| CLIENT INDEPENDENT REVIEW | Reviewer other than client writer | Exact-SHA read-only review/tests in B-4 |
| IOS ACCEPTANCE | One controller, preferably not client writer | One simulator/device controller and one Metro server |
| RELEASE BUILD | Release owner under Sky's gate | Exact accepted SHA only; no competing artifact |

Backend and client writers must not work concurrently against an unsettled contract. Parallelism is reserved for read-only review and test lanes.

## Implementation Readiness

**READY WITH EXPLICIT BACKEND AUTHORITY**

Prompt B implementation may start only when all of the following are true:

1. B-0 revalidates the exact final Prompt-A base and linked runtime;
2. explicit authority covers one managed migration, its deployment, narrow users grant, and key guards;
3. preflight proves no active canonical writer or out-of-band key data invalidates the minimum cut;
4. product/release ownership accepts that uploads, canonical deletion, canonical leaderboards, monthly leaderboard, and realtime live proof are not repaired/claimed by this Prompt B scope;
5. gallery remains approved in the minimal set;
6. one backend writer and one later client writer are assigned.

If photo/avatar upload, old installed-build recovery, or canonical deletion is release-required, status changes to `NOT READY` until the full writer/privacy/Storage/deletion architecture is separately authorized and re-adjudicated.

## Final Claude Execution Block

```text
FINAL PROMPT B INPUT

IMPLEMENTATION READINESS:
READY WITH EXPLICIT BACKEND AUTHORITY. Do not edit until B-0 matches and proves
no deployed canonical writer becomes active when display keys appear.

FRESH PREFLIGHT:
Revalidate exact final Prompt-A SHA, project kldlwszpfkdmsjrjhjym, hosted ledger,
media catalog/types/nullability, users and media ACL/RLS, every deployed writer
path/execution grant, exact flags/Profile/gallery failure-control pairs, and dev-
shell native fingerprint. Recheck deletion function identity only if its source
or runtime changed. Any difference means STOP and focused re-adjudication. No
mutation.

PROVEN ROOT CAUSE:
Production physically lacks flags.photo_object_key/photo_uploader_id and
users.avatar_object_key. Full flag/Profile reads fail while sibling projections
succeed. Gallery also selects physically absent flag_photos.object_key and can
misclassify missing-column failures as empty.

MINIMUM BACKEND CONTRACT:
One new managed additive migration only: nullable flags.photo_object_key;
nullable users.avatar_object_key plus authenticated column-only SELECT; nullable
flag_photos.object_key; three narrow key-only client-write guards. No default,
backfill, DML, URL change, or trusted canonical writer. PostgREST recheck is
mandatory; reload only for proven catalog-correct/API-stale cache.

BACKEND VERIFY ONLY:
Existing Storage/deletion/fence/review/audit/terminal objects and deletion
receipts; legacy table policies except the new key guards. Prove source/diff
non-regression only; do not claim deployed deletion functionality.

BACKEND DEFER:
Both uploader columns, gallery URL nullability, upload intents, prepare/commit/
cancel RPCs, trusted commit paths, Storage owner-policy changes, account write-
fence expansion, canonical deletion machinery, monthly leaderboard RPC.

MEDIA / PRIVACY INVARIANTS:
No existing-row update; preserve every legacy URL byte-for-byte; retain key-
capable reads and key-first display; no client key authority; no uploader
inference/exposure; authenticated avatar-key column SELECT only; no anon/email/
table-wide users SELECT; no fallback on 400/PGRST204/does-not-exist/401/403/
42501/malformed/decode; no Storage/deletion mutation.

CLIENT MUST IMPLEMENT:
src/lib/flags.ts: one FLAG_READ_SELECT used by all six full helpers, retain
photo_object_key, remove photo_uploader_id, preserve every query semantic.
HomeScreen: one caught refresh callback for all three entry points.
copy.ts: exactly one punctuation boundary and retry dedupe.
location.ts + MapScreen: location-only safe user copy/internal diagnostics.
photos.ts: listFlagPhotos throws every backend error, including missing relation,
column/cache/auth/network/malformed errors; preserve key-first/legacy mapping.
FlagDetailModal: reset gallery per flag, reject stale completions, show accessible
owned error/Retry, and clear error only when the same loader succeeds.

CLIENT VERIFY ONLY:
Existing Profile direct load and update return select/hydration; provider
success-owned error clearing; legacy all-time leaderboard; deletion receipt
retention/recovery; unchanged consumer wiring for Tasks/Nearby/My Reports/
Activity/Admin/Watched/Recently Viewed/deep links/export.

CLIENT DEFER:
USER_PROFILE_SELECT/getUserProfile refactor; all-time canonical avatar mapping;
monthly avatar mapping; realtime live acceptance; upload/delete client redesign.

PRE-NATIVE TESTS:
Eight contract groups B2-PN01..B2-PN08: schema/privacy; key guards and backend
safety; six flag readers/media/query semantics; Profile load/update; provider/
Home/modal recovery matrix; punctuation/location; gallery error/media contract;
receipt preservation. Then focused suites, typecheck, lint, full Jest, required CI.

BACKEND PROOF:
Clean+upgrade replay; exact catalog/nullability; zero legacy row/hash change;
narrow users ACL/RLS positive/negative matrix; key forgery denied and legacy
writes allowed; exact candidate flags/Profile/gallery REST 200; controls 200;
no writer activation or Storage mutation; Prompt-B diff excludes deletion objects
and accepted deletion source suites remain green. Do not claim deployed deletion.

DEV-SHELL ACCEPTANCE:
Only a provenance-tied Metro-capable com.accessmap.app shell with identical
resolved native graph/config. Prove exact lockfile-resolved dependencies and no
relevant untracked source/config inputs. One clean exact-candidate worktree, one
cache-cleared Metro process, forced full reload, fresh bundle request, evidence
tied to candidate SHA/backend/shell/timestamp. This is live JS behavior, not
final binary provenance.

FINAL RELEASE BUILD:
CONDITIONAL one TestFlight build after all backend/pre-native/B-5 gates are
green and source/backend freeze. Build exact accepted SHA with pinned testflight
profile/artifact; do not use ambiguous --latest. If shell incompatible, STOP and
authorize a dev build plus final build or delay.

CLAIM BOUNDARIES:
Do not claim old installed bundle recovery, photo/avatar upload, provenance
rollout, canonical ordinary/account deletion, key-only live media, canonical
avatars on leaderboards, monthly recovery, realtime recovery, or all canonical
media paths. Receipt behavior and provider architecture are preserved, not
rewritten; deletion/Storage objects are untouched, not proven operational.

DO NOT TOUCH:
Non-managed D1F4/R2/R3/FIX2/FIX3 promotion; uploader columns; Storage policies/
objects; account deletion/fence/review/audit/terminal logic; direct-delete
semantics; auth/session architecture; unrelated backend/security work; native
dependencies/config; release workflow; accepted Prompt-A UI work.

STOP / ESCALATE IF:
Source/project/ledger/catalog/ACL/RLS/error controls differ; any canonical writer
exists or upload becomes release-required; any 401/403/42501 positive failure;
table-wide users SELECT is proposed; legacy data changes; key guard breaks normal
writes; gallery still false-empties; deletion safety regresses; tests/CI fail;
dev-shell provenance/fingerprint fails; source/backend changes after acceptance;
claim exceeds evidence.

EXPECTED NATIVE BUILD COUNT:
ONE final TestFlight build only under every compatibility/proof prerequisite.
Otherwise stop and explicitly authorize two builds or delay.

STALENESS:
Revalidate all source-sensitive instructions against the exact independently
accepted Prompt-A SHA before editing.
```

## Fable UX Review Block

```text
FABLE UX REVIEW INPUT:

REVIEW ONLY:
- loading, error, Retry, and recovered transitions on Home, Tasks, Map, Profile,
  My Reports, Recent Activity, and Admin;
- whether a prior provider error should remain visible while Retry is in flight
  and disappear only after success;
- terminal punctuation and Retry wording;
- stable native location-failure copy with no platform/domain codes;
- gallery empty-versus-error presentation when loading truly fails;
- account-deletion receipt communication while status is unavailable.

TECHNICAL TRUTH ALREADY DECIDED:
- data recovery is handled by a shared backend/client read contract;
- no generic fallback or swallowed missing-column/auth error is allowed;
- provider error clears on genuine owner success, not unrelated navigation;
- Home catches Retry rejection while the provider owns visible error state;
- account-deletion receipt retention during ambiguity is mandatory;
- upload, canonical leaderboard, monthly leaderboard, and realtime work are not
  part of this UX review;
- database, security, privacy, Storage, and deletion architecture are fixed
  outside Fable's authority.

USER-FACING CHANGES PROPOSED:
- exactly: "That feature isn't available yet. Tap to retry.";
- stable location copy such as: "Could not get your location. Check Location
  Services and try again.";
- truthful gallery error state instead of a false empty gallery;
- recovered screens clear their own visible error only after successful reload;
- no new receipt dismissal or destructive-state shortcut.

PRESERVE:
- current screen hierarchy, loading placements, cache/offline semantics, banner
  ownership, navigation, theme behavior, permission prompts, map camera/manual
  pin behavior, Profile counts, modal filters, and receipt recovery capability.

QUESTIONS FOR FABLE:
1. Is the prior error remaining visible during Retry clear and reassuring, or
   should the same component switch to an explicit "Retrying..." state?
2. Is the proposed location copy concise enough while still actionable?
3. Should Profile, My Reports, Activity, and Admin use identical Retry verbs even
   though their error state is independently owned?
4. What is the clearest gallery failure copy that cannot be mistaken for "no
   photos"?
5. Does receipt-unavailable copy clearly distinguish uncertainty from failure
   without encouraging dismissal?
6. Are VoiceOver announcements ordered correctly for failure, Retry start, and
   successful recovery?

Fable may recommend copy and state-presentation refinements only. Fable must not
override database, security, privacy, Storage, or deletion architecture.
```

## Future Retrieval

```bash
git fetch origin
git show origin/codex/solmax-prompt-b-b2-final-architecture-20260830:qa-reports/2026-08-30_SolMax_PromptB_B2_FinalArchitecture.md
```
