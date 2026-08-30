# Flagstone Prompt B B1 Execution Contract

## Inputs

- Repository: `Skypie99/AccessMap`.
- Audited product source: `2762a5447600e8de55be912ccb26e95456484945`.
- Audited source parent: `c365c5dafd645018efe469d46fe0f4c2149c5ce3`.
- B0 input: `qa-reports/2026-08-30_SolFast_PromptB_RootCause_Prep.md` at `0d93a7293e75b4efe27873a1e2b0ca3acfe3e078` on `origin/codex/solfast-prompt-b-root-cause-prep-20260830`.
- B0-X input: `qa-reports/2026-08-30_SolMax_PromptB_B0X_Adjudication.md` at `c5dc5e1913d1f6cfdae93994948017c34c4cb066` on `origin/codex/solmax-prompt-b-b0x-adjudication-20260830`.
- Runtime authority: B0-X's read-only evidence from linked project `kldlwszpfkdmsjrjhjym` and Flagstone `4.1.1` / iOS build `15` is authoritative unless the future Prompt-B base or backend has changed.
- Proven runtime state: `flags.photo_object_key`, `flags.photo_uploader_id`, `users.avatar_object_key`, and `flag_photos.object_key` are physically absent; full relevant reads return HTTP 400 while sibling projections return HTTP 200; PostgreSQL names the absent columns.
- Report branch/base: `codex/solfast-prompt-b-b1-execution-contract-20260830`, created exactly from `2762a5447600e8de55be912ccb26e95456484945`.
- Scope: release-engineering contract only. No product, test, migration, Supabase, deployment, simulator, or native-build mutation was performed.

## Executive Plan

Prompt B is a **backend-first, dependency-closed contract alignment followed by one grouped client wave**. The shortest safe sequence is:

1. Revalidate every named file/function/object against the final independently accepted Prompt-A candidate.
2. Obtain explicit backend/security authority.
3. Create one new managed migration from the reviewed final object definitions, not by moving or applying the monolithic non-managed D1F4 files.
4. Replay and deploy that migration through the authorized backend path; refresh PostgREST; prove catalog, grants, exact REST projections, Storage ownership, and deletion behavior. No native build.
5. Run the already-installed client against the aligned backend. It should recover the primary provider and Profile reads before any client build.
6. Make one grouped client edit: centralize all six flag projections, preserve display keys, remove `photo_uploader_id` only from client reads, centralize Profile reads and mutation returns, close leaderboard key display, normalize failure punctuation and location errors, and catch Home Retry rejections.
7. Pass the 15-test pre-native contract, focused Jest, typecheck, lint, and required CI. No native build.
8. Use the existing compatible iOS development client for one exact-JS-SHA acceptance session.
9. Produce one release/TestFlight native build only after every earlier gate is green.

The one-build target is **CONDITIONAL**. It is valid only if the final Prompt-B change remains JS/TypeScript/SQL/Edge-only and a compatible installed development client is available for Wave B-5. Any native dependency/configuration change, unavailable compatible dev client, or failed pre-native/backend proof breaks the one-build premise and triggers escalation before building.

## Change-Surface Manifest

### Backend Contract

| ID | File | Function / object | Why change is required | Dependencies | Expected change type | Blast radius | Preserve |
|---|---|---|---|---|---|---|---|
| BC-01 | `supabase/migrations/<next_valid_timestamp>_prompt_b_canonical_media_contract.sql` (new; allocate after Prompt-A rebase) | Managed canonical-media contract | Hosted and managed schema lack the fields the installed client already requests. | BC-02 through BC-10; future-base migration ordering. | New additive, forward-only, security-reviewed managed migration synthesized from accepted final definitions. | Flags, profiles, gallery, uploads, Storage, ordinary deletion, account deletion. | All legacy URLs/rows; existing non-media schema; replay order. |
| BC-02 | Same new managed migration | `flags.photo_object_key`, `flags.photo_uploader_id` | Full flag readers 400 today; the key is display authority and uploader is deletion provenance. | Provenance triggers; intent commit; deletion inventory. | Add nullable `text` and nullable `uuid`; no backfill/nulling. | Every full flag read and canonical photo lifecycle. | `photo_url`, `photo_alt`, anonymous-photo boundary, existing rows. |
| BC-03 | Same new managed migration | `users.avatar_object_key` plus authenticated column grant | Profile and `updateUserProfile` return projection 400; adding the column without a grant risks `42501`. | Existing column-level privacy grants and own-row RLS. | Add nullable `text`; grant authenticated SELECT on this column only. | Profile, avatar commits, leaderboards. | No table-wide `users` SELECT; `email` remains unreadable; own-row/private behavior. |
| BC-04 | Same new managed migration | `flag_photos.object_key`, `flag_photos.uploader_id`, nullable `flag_photos.url` | Gallery already requests the key; canonical gallery writers persist key with URL null. | Intent commit, trigger, read RLS, delete cleanup. | Add nullable columns; drop only URL NOT NULL; keep read policy. | Flag Detail gallery and canonical deletion. | Legacy URL rows and ordering/alt text. |
| BC-05 | Same new managed migration | `flag_photo_upload_intents`, provenance guard functions/triggers, upload RPCs | Canonical writes must not be client-forged and must be recoverable/deletable. | Account write fence, Storage object ownership, BC-02 through BC-04. | Promote reviewed final definitions with least-privilege EXECUTE. | Report photos and avatars. | Server-derived subject/key; durable ambiguous outcomes; no URL parsing for authority. |
| BC-06 | Same new managed migration | Storage helper/policy contract for bucket `flag-photos` | A PREPARED server key must be the only client upload capability; commit must verify exact owner metadata. | `flag_photo_upload_intents`, `current_account_can_write`. | Replace only the relevant insert/delete policies and helper grants. | All photo uploads/deletes. | Public display readability; exact bucket/key/owner checks; no arbitrary inventory exposure. |
| BC-07 | Same new managed migration | Deletion fence and canonical account-deletion inventory/cleanup objects | Upload intents depend on the write fence; canonical keys and uploader IDs become privacy-terminal data that deletion must reconcile. | Final D1F4/R2/R3/FIX2/FIX3 definitions and worker signatures. | Extract dependency-closed final objects only; no blind monolith promotion. | Account writes, deletion worker, review/audit. | Receipt recovery, review durability, terminal evidence, foreign-owner preservation. |
| BC-08 | Same migration plus `supabase/functions/delete-flag/index.ts` | `account_deletion_prepare_flag_delete`, `account_deletion_finalize_flag_delete`, exact Storage lookup | Direct relational deletion can orphan canonical Storage; existing Edge route expects these service-role RPCs. | BC-02, BC-04, exact-object helper, client `deleteFlag`. | SQL promotion; Edge source verify-only unless signature drift is found. | Owner/admin ordinary flag deletion. | Browser sends only `flagId`; no service key/client inventory; Storage-first exact absence. |
| BC-09 | Same new managed migration | `list_monthly_leaderboard(integer)` return projection | Canonical avatar commit nulls `avatar_url`; monthly output currently has no key. | BC-03; client monthly mapper/types. | Managed create or replace/recreate with `avatar_object_key`; preserve privacy aggregation. | Monthly leaderboard only. | No point-event detail, email, verifier metrics, or broader EXECUTE. |
| BC-10 | Authorized deployment procedure | PostgREST schema cache | New columns/functions/grants are unusable until the API sees them. | Successful migration transaction. | Normal deployment reload; approved explicit reload only if probes show stale cache. | REST/RPC availability. | No client fallback and no repeated blind reload. |

### Client Data Contract

| ID | File | Function / object | Why change is required | Dependencies | Expected change type | Blast radius | Preserve |
|---|---|---|---|---|---|---|---|
| CD-01 | `src/lib/flags.ts` | New `FLAG_READ_SELECT`; `listFlags`, `listFlagsPage`, `listFlagsByUser`, `fetchFlagById`, `fetchFlagsByIds`, `listRecentFlags` | Six duplicated full projections can drift; each currently unnecessarily requests uploader provenance. | Backend BC-02; `FlagRow`; display normalizers. | One canonical select constant used by all six helpers. | Provider, My Reports, Activity, Admin, Watched, Recent, deep links, realtime, export. | Filters, ordering, limits, cursor, user scope, ID batching, null/not-found behavior. |
| CD-02 | `src/lib/flags.ts` | `withDisplayPhotoUrl(s)` | Key-only photos must remain displayable and legacy URLs must remain intact. | `FLAG_READ_SELECT`; public Storage URL. | Preserve behavior; make tests authoritative. | Every full flag consumer. | Key wins only when present; legacy URL unchanged otherwise. |
| CD-03 | `src/lib/users.ts` | New `USER_PROFILE_SELECT`, new `getUserProfile`, `updateUserProfile`, `withAvatarDisplayUrl` | Profile read is duplicated outside the module; mutation return must preserve/hydrate key-backed avatar. | Backend BC-03. | Centralize exact projection; normalize both read and mutation return. | Profile load and display-name save. | No email in public projection; validation/moderation; legacy avatar behavior. |
| CD-04 | `src/screens/ProfileScreen.tsx` | `load()` profile leg | Direct `users` projection must use CD-03 so load and update cannot diverge. | `getUserProfile`; independent status/event legs. | Replace direct profile query only. | Profile main load/retry. | Status counts, point-event graceful degradation, mounted guards, load-error clearing. |
| CD-05 | `src/lib/photos.ts` | `listFlagPhotos` | Already reads `url, object_key, position, alt_text`; backend currently lacks key. | BC-04. | Verify-only unless future base differs. | Flag Detail gallery. | Relation-missing-only degradation; other errors throw; legacy and canonical display. |
| CD-06 | `src/lib/flags.ts`, `src/lib/users.ts`, `src/screens/LeaderboardScreen.tsx` | `LeaderboardEntry`, `listLeaderboard`, `MonthlyLeaderboardEntry`, `listMonthlyLeaderboard` | Canonical avatars otherwise disappear because writers null legacy URL. | BC-03, BC-09. | Include/map `avatar_object_key` and derive display URL for all-time and monthly entries. | Leaderboard avatars. | Points/rank/privacy semantics and monogram fallback. |
| CD-07 | `src/types/database.ts` | `FlagRow`, `UserRow`, `flag_photos`, media RPC and monthly RPC shapes | Types already anticipate most keys but must match final managed nullability and RPC output. | Final SQL signatures. | Narrow type alignment; remove no provenance type needed by backend paths. | Compile-time contract only. | Optionality only if rollout sequencing still requires it; no invented server fields. |

Canonical field strings after the client wave:

```ts
const FLAG_READ_SELECT =
  'id, user_id, lat, lng, category, description, severity, photo_url, photo_object_key, photo_alt, status, created_at';

const USER_PROFILE_SELECT =
  'id, display_name, avatar_url, avatar_object_key, points, created_at';
```

`photo_uploader_id` remains a backend provenance/deletion field and a database type field, but it is absent from every display read.

### Client UX / Error Contract

| ID | File | Function / object | Why change is required | Dependencies | Expected change type | Blast radius | Preserve |
|---|---|---|---|---|---|---|---|
| UX-01 | `src/lib/flagsStore.tsx` | `FlagsProvider.refresh`, `loadMore`, realtime full-row re-fetch | Provider error must clear on genuine successful owner refresh, not unrelated requests; helper changes must reach all paths. | CD-01. | Preserve success-owned `setError(null)`; add/adjust tests only unless future base contradicts it. | Home, Tasks, Map, Nearby. | Cache fallback semantics, sequence guards, offline markers, throw contract. |
| UX-02 | `src/screens/HomeScreen.tsx` | Pull-to-refresh and two visible Retry handlers | Bare `void refresh()` can produce an unhandled rejection on no-cache failure. | `FlagsProvider.refresh` intentionally rethrows. | One local caught-promise callback reused by all Home retry entry points. | Home only. | Request still fires; provider owns error UI and successful clearing. |
| UX-03 | `src/lib/copy.ts` | `failureBannerText` | `FEATURE_UNAVAILABLE` already ends in punctuation, causing `yet..`. | `RETRY_VERB`. | Trim message; append one separator only when no terminal `.`, `!`, or `?`; retain retry-verb de-duplication. | Home/Tasks/Map failure banners. | Original message wording and exactly one Retry sentence. |
| UX-04 | `src/lib/location.ts`, `src/screens/MapScreen.tsx` | New location-specific normalizer; `useUserLocation`; `requestLocation` catch | Generic unmatched-error pass-through exposes `kCLErrorDomain`. | Existing permission branches and live-status retry. | Normalize only at location boundaries; log diagnostic internally; Map native alert uses stable copy. | Map, Report's delegated Use My Location, Tasks hook. | Generic `errorMessage`; web LiveStatus; Retry pointer; permission handling. |
| UX-05 | `src/lib/account.ts`, `src/lib/accountDeletionReceipt.ts`, `src/screens/ProfileScreen.tsx` | Receipt creation/status/clearing flow | Retention during ambiguity/outage is deliberate safety behavior. | SecureStore and deletion Edge functions. | No production change; focused regression tests only. | Account deletion recovery. | Receipt written before request, retained on unavailable status, selected explicit dismissal only. |

### Test / Verification

| ID | File | Function / object | Why change is required | Dependencies | Expected change type | Blast radius | Preserve |
|---|---|---|---|---|---|---|---|
| TV-01 | `supabase/tests/prompt_b_canonical_media_contract.test.sql` (new) | Schema, grants, triggers, RPCs, writer/media invariants | Managed contract needs executable proof independent of app UI. | BC-01 through BC-10. | New transactional SQL/pgTAP-style contract test. | Backend release gate. | No hosted mutation from the test itself. |
| TV-02 | `supabase/tests/d1f4r3_fix2_flags_delete_rls.test.sql`, `supabase/tests/d1f4r3_fix3_review_audit.test.sql` | Canonical delete and review/audit closure | Final extraction must retain already accepted deletion safety. | BC-07/BC-08. | Repoint/update only if new managed object source changes harness paths. | Deletion safety. | Direct authenticated DELETE stays denied; audit remains durable. |
| TV-03 | `src/lib/__tests__/flags.supabase.test.ts`, `src/lib/__tests__/flagsPagination.test.ts` | Six readers and exact projection | Existing mocks mostly discard projection arguments. | CD-01/CD-02. | Add exact select and normalization assertions. | All full flag reads. | Existing query semantics. |
| TV-04 | `src/lib/__tests__/users.test.ts`, new `src/screens/__tests__/ProfileScreen.dataContract.test.ts` | Profile read/update return projection | Both B-RC-002 paths must be locked. | CD-03/CD-04. | Behavioral helper tests plus narrow wiring invariant. | Profile. | Validation, event/count isolation. |
| TV-05 | `src/lib/__tests__/flagsStoreSwr.test.tsx`, `src/screens/__tests__/HomeScreenRefreshFailure.test.ts` | Success clearing and handled Retry rejection | Prevent stale error and unhandled-promise regressions. | UX-01/UX-02. | Add failure-to-success behavioral test; update source invariant. | Provider/Home. | Offline-cache behavior. |
| TV-06 | `src/screens/__tests__/bp13FailureVoice.test.ts`, new `src/lib/__tests__/location.test.ts`, `src/screens/__tests__/MapScreenLocateFailure.test.ts` | Punctuation and location normalization | Proven small reliability issues lack correct regression coverage. | UX-03/UX-04. | Extend/add focused tests. | Failure copy and location. | Web live-status behavior and generic errors. |
| TV-07 | `src/components/__tests__/MyReportsModal.test.tsx`, new `src/components/__tests__/ActivityFeedModal.test.tsx` | Independent failure-to-Retry recovery | These state owners are not proven by provider tests. | CD-01. | Add focused rejection then success tests. | My Reports/Recent Activity. | Local mounted guards and filters. |
| TV-08 | `src/lib/__tests__/photos.test.ts`, `src/screens/__tests__/LeaderboardScreen.monogram.test.tsx`, `src/lib/__tests__/accountDeletionReceipt.test.ts`, `src/lib/__tests__/account.test.ts` | Gallery/avatar media and receipt invariants | Global-media and deletion claims require independent gates. | CD-05/CD-06/UX-05. | Extend existing suites. | Gallery, leaderboard, deletion recovery. | Legacy display, privacy, explicit receipt dismissal. |

## Backend Authority Packet

The backend writer must create a **new managed forward migration from reviewed final definitions**. The non-managed D1F4/R2/R3/FIX2/FIX3 files are source evidence, not deployable artifacts. Do not rename, move, or apply them wholesale. Do not re-open unrelated completed backend/security work.

### BACKEND-01

**OBJECT ID:** BACKEND-01
**OBJECT:** `public.flags.photo_object_key text NULL`, `public.flags.photo_uploader_id uuid NULL`.
**SOURCE / PROPOSED SOURCE:** Extract the column definitions and final invariants from `supabase/nonmanaged/proposed/2026-08-27_d1f4_async_account_deletion.sql` into the new managed Prompt-B migration.
**WHY REQUIRED:** The installed full flag projection fails today; the key is canonical display authority and the uploader is server-side cleanup provenance.
**DEPENDENCY:** BACKEND-03 through BACKEND-09.
**SECURITY REQUIREMENT:** Ordinary client INSERT/UPDATE cannot set or alter either provenance field; trusted commit only. Reads may expose `photo_object_key`; the client no longer needs uploader ID.
**MIGRATION / REPLAY PROOF:** Clean replay and upgrade replay show exact types/nullability, no row rewrite, and unchanged `photo_url`/`photo_alt`.
**REST PROOF:** Pre-client installed projection including both fields returns 200; post-client projection excluding uploader also returns 200.
**ROLLBACK CONSIDERATION:** Once any canonical write occurs, do not drop either field. Disable writers first and preserve keys/provenance while correcting forward.

### BACKEND-02

**OBJECT ID:** BACKEND-02
**OBJECT:** `public.users.avatar_object_key text NULL` and authenticated SELECT on that column only.
**SOURCE / PROPOSED SOURCE:** Column from D1F4; new explicit grant composed with `supabase/migrations/20260529043812_email_privacy_closes_pii_exposure.sql` and later `is_admin` grant repair.
**WHY REQUIRED:** Profile and `updateUserProfile` return projection fail today; absent grant after adding the column would convert the failure to `42501`.
**DEPENDENCY:** Avatar commit RPC and leaderboard output.
**SECURITY REQUIREMENT:** `GRANT SELECT (avatar_object_key) ... TO authenticated` only. No table-wide SELECT; `anon` gets no new grant; `users.email` remains unreadable; existing row policies remain.
**MIGRATION / REPLAY PROOF:** `has_column_privilege(authenticated, ..., 'avatar_object_key', 'SELECT') = true`; email remains false; anon remains false; no broad table grant.
**REST PROOF:** Authenticated own-profile projection returns 200; sibling reads remain 200; unauthorized/private shapes remain denied.
**ROLLBACK CONSIDERATION:** Do not drop a populated key. If a grant error is discovered, correct the column grant forward without broadening table access.

### BACKEND-03

**OBJECT ID:** BACKEND-03
**OBJECT:** `public.flag_photos.object_key text NULL`, `public.flag_photos.uploader_id uuid NULL`, and nullable legacy `url`.
**SOURCE / PROPOSED SOURCE:** Base table from `20260531025237_flag_photos_junction.sql`; canonical additions from D1F4; final deletion inventory from R3/FIX2.
**WHY REQUIRED:** `listFlagPhotos` already selects `object_key`; canonical commits write URL null plus key/uploader.
**DEPENDENCY:** BACKEND-04 through BACKEND-09.
**SECURITY REQUIREMENT:** Authenticated read remains; direct client metadata insert/update is blocked; uploader is assigned only by trusted commit.
**MIGRATION / REPLAY PROOF:** Legacy URL rows survive byte-for-byte; new nullable columns exist; URL nullability changes without backfill.
**REST PROOF:** A legacy gallery row and canonical key row both return successfully in position order.
**ROLLBACK CONSIDERATION:** Never reinstate URL NOT NULL after canonical rows exist; never synthesize URLs into storage or erase keys.

### BACKEND-04

**OBJECT ID:** BACKEND-04
**OBJECT:** `public.flag_photo_upload_intents`, index, RLS, and service-role table privileges.
**SOURCE / PROPOSED SOURCE:** D1F4 intent definition, with any final constraints required by accepted R2/R3 deletion inventory.
**WHY REQUIRED:** Client upload code already calls prepare/commit/cancel; a durable intent is the authority for a server-created key and ambiguous upload outcome.
**DEPENDENCY:** Account write fence, exact Storage ownership, flags/users/flag_photos fields.
**SECURITY REQUIREMENT:** No direct `anon`/`authenticated` table access; service role only; client access only through narrow RPCs.
**MIGRATION / REPLAY PROOF:** Constraint vocabulary, unique key, subject/status index, RLS enabled, direct client privileges absent.
**REST PROOF:** Direct table access denied; authenticated narrow RPCs work only for caller-derived subject.
**ROLLBACK CONSIDERATION:** Preserve PREPARED/AMBIGUOUS records until reviewed; disabling RPCs is safer than deleting intent evidence.

### BACKEND-05

**OBJECT ID:** BACKEND-05
**OBJECT:** `prevent_untrusted_flag_photo_provenance_write`, `prevent_untrusted_avatar_provenance_write`, `prevent_untrusted_flag_photo_row_write` and their triggers.
**SOURCE / PROPOSED SOURCE:** Final accepted D1F4 definitions.
**WHY REQUIRED:** RLS cannot reliably compare every OLD/NEW provenance mutation; database-boundary triggers reserve canonical metadata for trusted commits.
**DEPENDENCY:** Transaction-local trusted marker set only inside commit RPCs.
**SECURITY REQUIREMENT:** SECURITY DEFINER with pinned empty search path; EXECUTE revoked from public/anon/authenticated; ordinary writes raise `42501`.
**MIGRATION / REPLAY PROOF:** Functions and enabled triggers exist once; grants are revoked; malicious direct writes fail while ordinary non-media profile/flag edits still pass.
**REST PROOF:** Authenticated attempts to forge keys/uploader fail; display-name and permitted flag-content updates still succeed.
**ROLLBACK CONSIDERATION:** Never remove guards while canonical writers remain enabled.

### BACKEND-06

**OBJECT ID:** BACKEND-06
**OBJECT:** `prepare_flag_photo_upload(text,text)`, `commit_flag_photo_upload(uuid,uuid,integer,text,boolean)`, `commit_avatar_photo_upload(uuid)`, `cancel_flag_photo_upload(uuid)`.
**SOURCE / PROPOSED SOURCE:** D1F4 signatures plus corrected owner comparisons from R2; use final definitions, not predecessor bodies.
**WHY REQUIRED:** They are the client-called canonical writers and bind object key, authenticated subject, Storage owner, and relational metadata.
**DEPENDENCY:** BACKEND-01 through BACKEND-05, BACKEND-07, write fence.
**SECURITY REQUIREMENT:** Authenticated EXECUTE only; caller cannot choose subject/key; commit checks exact bucket/key/owner and owned flag; ambiguous outcomes persist rather than roll back.
**MIGRATION / REPLAY PROOF:** Exact signatures/return types, pinned search path, grants, PREPARED→COMMITTED and PREPARED→AMBIGUOUS paths, `URL NULL + key` trusted writes.
**REST PROOF:** Authenticated prepare/commit fixture works; wrong subject/flag/key/owner is denied; anon cannot execute.
**ROLLBACK CONSIDERATION:** Stop new prepares first; retain intents, fields, and objects for reconciliation.

### BACKEND-07

**OBJECT ID:** BACKEND-07
**OBJECT:** `current_account_can_write`, `account_subject_can_write`, `users.deletion_fence_version`, `account_deletion_operations`, client-fence trigger, and the minimum policies needed by canonical upload.
**SOURCE / PROPOSED SOURCE:** D1F4 final write-fence model, reconciled with accepted R2/R3/FIX3 definitions.
**WHY REQUIRED:** Every upload RPC calls the durable account write gate; extracting media RPCs without it changes deletion semantics and is not dependency-closed.
**DEPENDENCY:** Account-deletion request/worker lifecycle and final review tables.
**SECURITY REQUIREMENT:** Authenticated callers can invoke only `current_account_can_write`; subject-level helper and fence trigger are not client-executable; no alternate write path bypasses an active deletion fence.
**MIGRATION / REPLAY PROOF:** Pre-request writer, REQUESTED drain, later write denial, and resume state all match accepted deletion tests.
**REST PROOF:** Normal active account upload works; fenced account cannot prepare/commit; unrelated permitted operations are unchanged.
**ROLLBACK CONSIDERATION:** Do not partially remove a fence after accepting deletion requests. A security owner must approve any isolation of media from the deletion system.

### BACKEND-08

**OBJECT ID:** BACKEND-08
**OBJECT:** Canonical account-deletion inventory and cleanup: `account_deletion_review_audit`, `account_deletion_review_items`, `account_deletion_terminal_evidence`; final `account_deletion_known_keys_page`, canonical/historical evidence capture, exact Storage lookup/inventory, preserved-foreign revalidation, terminal reconciliation, purge/complete, and final FIX3 review resolver.
**SOURCE / PROPOSED SOURCE:** Final definitions across D1F4, `20260828000000_d1f4r2_source_repair.sql`, `20260828010000_d1f4r3_source_closure.sql`, FIX2, and FIX3. Exclude obsolete/bulk resolver bodies superseded by final signatures.
**WHY REQUIRED:** New canonical keys/uploader IDs become deletion evidence. Completion may not orphan owned objects or delete foreign-owned objects, and receipt status must remain durable.
**DEPENDENCY:** BACKEND-01 through BACKEND-07 and existing account-deletion Edge worker signatures.
**SECURITY REQUIREMENT:** Operational/review tables and functions are service-role-only; inventories are bounded; legacy URLs are association evidence only, never deletion authority; review audit is written on first and replayed resolution.
**MIGRATION / REPLAY PROOF:** Existing D1F4/R2/R3/FIX2/FIX3 guard/adversarial/SQL suites pass against the extracted managed contract; terminal and review replay behavior is deterministic.
**REST PROOF:** Not a public REST surface. Prove Edge status receipt and worker RPC role boundaries; client roles cannot call service-only functions/tables.
**ROLLBACK CONSIDERATION:** Never drop audit/terminal evidence or clear receipts to roll back. Disable workers/writers, snapshot, and repair forward.

### BACKEND-09

**OBJECT ID:** BACKEND-09
**OBJECT:** `account_deletion_storage_exact_object`, `account_deletion_prepare_flag_delete`, `account_deletion_finalize_flag_delete`, direct `flags` DELETE revocation, and `supabase/functions/delete-flag/index.ts`.
**SOURCE / PROPOSED SOURCE:** R2 exact lookup; R3 plan/finalize; FIX2 direct-delete revocation; existing Edge handler.
**WHY REQUIRED:** A direct relational delete can destroy provenance before canonical Storage is removed.
**DEPENDENCY:** Key/uploader fields, gallery fields, service role, exact Storage absence.
**SECURITY REQUIREMENT:** Owner/admin authorization is server-derived; object owner must exactly match recorded uploader even for admin; client roles have no direct table DELETE; Edge does not reveal keys/roles/existence.
**MIGRATION / REPLAY PROOF:** `d1f4r3_fix2_flags_delete_rls.test.sql` and Edge contract tests pass; create/update/status paths still work.
**REST PROOF:** Direct authenticated owner/admin DELETE fails; Edge owner/admin delete succeeds only after exact Storage removal; wrong owner returns non-success without relational erase.
**ROLLBACK CONSIDERATION:** Do not restore direct client DELETE. Disable Edge and repair forward if plan/finalize is defective.

### BACKEND-10

**OBJECT ID:** BACKEND-10
**OBJECT:** `public.list_monthly_leaderboard(integer)` canonical-avatar output.
**SOURCE / PROPOSED SOURCE:** Privacy behavior from `supabase/nonmanaged/proposed/2026-06-18_monthly_leaderboard_rpc_PROPOSED.sql`; managed Prompt-B definition adds `avatar_object_key` to the return table/grouping.
**WHY REQUIRED:** Monthly leaderboard otherwise cannot display a canonical avatar after avatar commit nulls `avatar_url`.
**DEPENDENCY:** BACKEND-02 and client CD-06.
**SECURITY REQUIREMENT:** Return only `id`, `display_name`, `avatar_url`, `avatar_object_key`, aggregate monthly points; authenticated EXECUTE only; no ledger events, email, or verifier metrics.
**MIGRATION / REPLAY PROOF:** If the function exists, use a safe drop/recreate in one migration transaction because PostgreSQL cannot change a function return-table shape in place; restore exact EXECUTE and pinned search path. If it is absent at the future base/runtime, create it as a managed object with the canonical-avatar output.
**REST PROOF:** Monthly RPC returns expected aggregate rows and key field to authenticated, rejects anon, and exposes no point-event detail.
**ROLLBACK CONSIDERATION:** The client already degrades only when the function is absent. Dropping it is safer than retaining a privacy- or media-inconsistent signature, but this forfeits any monthly-board recovery claim.

### BACKEND-11

**OBJECT ID:** BACKEND-11
**OBJECT:** PostgREST/schema-cache refresh for columns/functions/grants.
**SOURCE / PROPOSED SOURCE:** Authorized deployment runbook; no repository product object.
**WHY REQUIRED:** A committed PostgreSQL migration is not sufficient until Data API metadata is refreshed.
**DEPENDENCY:** Successful, atomic BACKEND-01 through BACKEND-10 migration/deployment.
**SECURITY REQUIREMENT:** Refresh only the API schema cache; do not alter roles/policies as a cache workaround.
**MIGRATION / REPLAY PROOF:** Migration transaction commits first; catalog reflects exact objects.
**REST PROOF:** Exact projections/RPCs return 200 after reload and no `PGRST202`/cached-column error remains.
**ROLLBACK CONSIDERATION:** If catalog is correct but cache remains stale, stop and repair cache through the approved backend path; never add a client fallback.

## Media Safety Invariants

Every invariant is a hard acceptance gate.

- **MEDIA-INV-01 — Legacy photo continuity:** No migration, normalizer, or backfill changes or nulls an existing `flags.photo_url` or `flag_photos.url`. Legacy URL-only primary and gallery photos remain displayable throughout transition.
- **MEDIA-INV-02 — Canonical primary photo continuity:** A row with `photo_url = NULL` and a valid `photo_object_key` remains queryable and displays through the bucket-derived public URL in every full flag reader.
- **MEDIA-INV-03 — Canonical avatar continuity:** A row with `avatar_url = NULL` and a valid `avatar_object_key` remains displayable in Profile, after display-name save, after avatar reload, and on every enabled leaderboard.
- **MEDIA-INV-04 — Narrow user privacy:** `users.avatar_object_key` is granted only as an authenticated column SELECT under existing row policy. No table-wide `users` SELECT and no new `anon` access; email stays private.
- **MEDIA-INV-05 — Uploader provenance separation:** `photo_uploader_id` is omitted from all client display projections but remains populated and available to trusted writer, ordinary deletion, account-deletion inventory, and review logic.
- **MEDIA-INV-06 — Honest recovery claim:** No implementation may claim global media recovery until a known legacy primary photo, canonical primary photo, multi-photo legacy/canonical gallery, canonical Profile avatar, all-time leaderboard avatar, and monthly leaderboard avatar have all passed runtime verification.
- **MEDIA-INV-07 — Server-owned canonicalization:** Clients cannot choose or mutate canonical object keys/uploader IDs. Only a trusted commit after exact Storage bucket/key/owner proof may write them.
- **MEDIA-INV-08 — No fallback concealment:** No generic HTTP 400, friendly copy, `PGRST204`, `/does not exist/`, `401/403/42501`, malformed 200, or decode error may trigger a legacy projection.
- **MEDIA-INV-09 — Storage-first deletion:** Relational deletion cannot complete while any planned canonical object still exists; foreign-owner mismatch is preserved/escalated, never coerced into delete authority.
- **MEDIA-INV-10 — Ambiguity remains durable:** PREPARED/AMBIGUOUS upload intents, deletion receipts, review items, and terminal evidence are not erased merely to make a retry appear successful.

## Client Data Contract

### Canonical flag projection

Define one module-level `FLAG_READ_SELECT` in `src/lib/flags.ts` with exactly:

```text
id, user_id, lat, lng, category, description, severity, photo_url, photo_object_key, photo_alt, status, created_at
```

Use it without local additions or omissions in every full helper:

| Helper | Required semantics to retain |
|---|---|
| `listFlags(statuses)` | `.in('status', statuses)`, newest-first, limit 500. |
| `listFlagsPage(statuses, opts)` | Same status filter/order; configurable limit; optional strict `created_at < before`; current `nextCursor` rule. |
| `listFlagsByUser(userId)` | Exact user equality, newest-first, limit 200. |
| `fetchFlagById(flagId)` | Exact ID and `maybeSingle`; return null only for true not-found. |
| `fetchFlagsByIds(flagIds)` | Empty-input short circuit; `.in('id', ids)`; missing rows silently omitted. |
| `listRecentFlags(limit)` | All statuses, newest-first, caller limit. |

All six return through the existing key-preferred display normalizer. No screen-level fallback, optional second query, cached capability bit, or projection fork is permitted.

### Profile projection

Define `USER_PROFILE_SELECT` in `src/lib/users.ts` with exactly:

```text
id, display_name, avatar_url, avatar_object_key, points, created_at
```

Add `getUserProfile(userId)` in `src/lib/users.ts`; it performs `.eq('id', userId).maybeSingle()`, throws the exact backend error, and returns `null` or `withAvatarDisplayUrl(row)`. Replace only Profile's direct profile query with this helper. Keep Profile's status-only flag query and best-effort point-event calls separate and unchanged.

`updateUserProfile()` must select the same constant, call `.single()`, throw on error/no row, and return `withAvatarDisplayUrl(data)`. This prevents display-name save from replacing a derived canonical avatar URL with a null legacy URL.

### Leaderboards

- All-time `listLeaderboard` selects `id, display_name, avatar_url, avatar_object_key, points`, maps entries through a key-preferred avatar display normalizer, and exposes neither email nor verifier metrics.
- Monthly RPC returns `avatar_object_key`; `listMonthlyLeaderboard` derives display URL before mapping `monthly_points` to `points`.
- `LeaderboardScreen` remains a presentation consumer; no new fetch or privacy logic belongs there.

### Types

Align `src/types/database.ts` to the final managed contract and RPC signatures after SQL is final. Do not remove server provenance fields from types merely because display reads omit them. Do not use type declarations as evidence that a hosted column exists.

## Client UX / Reliability Contract

### Provider error clearing

- Preserve `FlagsProvider.refresh()` ownership of the shared error.
- Clear `error`, `isOfflineCache`, and `offlineCachedAt` only on a genuine successful network refresh; cache fallback continues to clear the settled network error because usable cached data owns the UI.
- Do not clear the provider error merely because navigation, theme, Profile, Admin, or another unrelated request succeeds.
- Do not clear at Retry start and flash a false healthy/empty state. Existing screens may render loading/Retrying while the prior failure remains until the attempt resolves.
- A failure followed by success must publish fresh rows and clear the shared error/offline markers in one state transition verified by test and real iOS.

### Retry promise handling

`FlagsProvider.refresh()` intentionally rethrows on a no-cache failure. In `HomeScreen`, create one local callback that calls `refresh().catch(() => {})` and use it for pull-to-refresh plus every visible Retry. The provider has already stored/announced the error; Home must not generate an unhandled rejection or duplicate notification. Tasks, Map, provider still-trying action, effects, and other already-caught callers stay unchanged unless the future base regresses.

### Punctuation

`failureBannerText` must:

1. trim surrounding whitespace;
2. return the message unchanged when it already contains `tap to retry` case-insensitively;
3. otherwise append `RETRY_VERB` after exactly one sentence boundary;
4. avoid adding a period when the message already ends in `.`, `!`, or `?`.

Required output: `That feature isn't available yet. Tap to retry.`

### Location-specific exception normalization

Add a small exported normalizer in `src/lib/location.ts`. It receives the raw exception, records only an internal diagnostic (`console.warn` or existing telemetry without coordinates/tokens), and returns stable human copy such as `Could not get your location. Check Location Services and try again.` Native domain/code text must never be presented.

Use it in:

- `useUserLocation`'s catch;
- `MapScreen.requestLocation`'s native Alert catch.

Report's “Use my location” delegates to Map's callback, so no Report modal rewrite is required. Preserve the web `LiveStatusRegion`, Retry ref, permission-denied branches, and generic `errorMessage()` behavior for non-location domains.

### Account-deletion receipt

No production behavior change is authorized. Tests must prove:

- the receipt is persisted before the first request;
- lost response/status outage retains it;
- a later recognized status recovers with the same operation/secret;
- explicit dismissal clears only the selected receipt;
- no failure path signs out or describes an ambiguous request as definitively failed.

## Secondary Surface Classification

| Surface | Classification | Exact dependency/action | Why safe / claim boundary |
|---|---|---|---|
| My Watched | **IMPLEMENT** | Receives CD-01 through `fetchFlagsByIds`; no consumer edit unless future-base drift. Add exact helper test and real-iOS verification. | Fixing the canonical helper repairs it without a second writer. Do not claim it recovered until stored IDs render key-backed media. |
| Recently Viewed | **IMPLEMENT** | Receives CD-01 through `fetchFlagsByIds`; preserve best-effort empty degradation. Verify ordering and media. | Central helper eliminates projection failure. Its catch still intentionally hides transient failure; do not infer an empty row means backend success. |
| Deep-link flag fetches | **IMPLEMENT** | `MapScreen` continues to use centralized `fetchFlagById`. Verify valid and stale IDs. | No screen edit is needed. Do not claim deep-link recovery from provider-list success alone. |
| Realtime refresh | **IMPLEMENT** | `FlagsProvider` continues to re-fetch through centralized `fetchFlagById`; preserve viewport gate and non-fatal catch. | Central helper repairs shape. Do not claim realtime recovery without an enabled subscription event and resulting media update. |
| Admin hydration | **IMPLEMENT** | Admin queue uses `listRecentFlags`; report hydration uses `fetchFlagsByIds`. Both receive CD-01. Verify independent error state and target hydration. | No Admin query fork. Do not treat “No open reports” beside/after an error as proof. |
| Settings export | **IMPLEMENT** | Continues through centralized `listFlagsByUser`; keep its narrower direct profile projection and subject-access semantics. | Flag export recovers without adding internal columns. Do not claim export success unless generated output contains the user's expected reports. |
| Flag photo gallery | **IMPLEMENT** | BACKEND-03 supplies `object_key`; existing `listFlagPhotos` is client verify-only because it already key-normalizes. | Safe only if relation-missing remains the sole swallowed error. No global media claim before legacy+canonical multi-photo runtime proof. |
| All-time leaderboard avatars | **IMPLEMENT** | CD-06 adds/selects/maps `avatar_object_key`. | Required once canonical avatar writers null legacy URL. No canonical-avatar claim until a key-only row renders. |
| Monthly leaderboard avatars | **IMPLEMENT** | BACKEND-10 + CD-06 create/replace the managed RPC output and map `avatar_object_key`; verify a key-only row. | A URL-only monthly board is unsafe once canonical uploads null the legacy URL. No monthly/global avatar claim before runtime proof. |
| Profile update counter/status-only reads | **VERIFY ONLY** | Existing `flags.select('status')` and point-event graceful degradation remain unchanged. | Same-session controls already succeed and do not use the broken full projection. Do not expand Prompt B into ledger work. |
| Unrelated Admin reports query, comments, notification settings | **OUT OF SCOPE** | No dependency on the broken full flag/profile projections except report hydration already listed. | Existing accepted backend/security work remains closed. No claim about these systems beyond non-regression CI. |

No listed secondary surface is deferred. B2 Ultra may challenge whether the monthly surface should instead be removed, but the executable B1 work order is to implement its canonical-avatar contract.

## Pre-Native Test Contract

Maximum reached: **15 contract tests**. Each ID may contain parameterized cases but counts as one release-contract item.

| Test ID | Test file | Source under test | Behavior | Regression prevented | Must pass before native |
|---|---|---|---|---|---|
| B-T01 | `supabase/tests/prompt_b_canonical_media_contract.test.sql` | Managed schema/catalog | Exact five media/provenance columns, nullability, flag_photos URL nullability, triggers and function signatures exist after replay. | Partial/three-column promotion or wrong types. | YES |
| B-T02 | Same SQL file | Grants/RLS/EXECUTE | Authenticated can select only required public profile columns including avatar key; email/anon/table-wide access absent; media RPC grants exact. | `42501` after column add or privacy broadening. | YES |
| B-T03 | Same SQL file plus existing D1F4 SQL tests | Writers/Storage/deletion | Trusted canonical commit produces URL-null/key-present rows; forged writes fail; wrong Storage owner fails; direct flags DELETE denied; exact Storage-first delete and receipt/review invariants hold. | Orphans, forged provenance, deletion-safety regression. | YES |
| B-T04 | `src/lib/__tests__/flags.supabase.test.ts` | Six full flag helpers | Parameterized assertion: all six use the identical `FLAG_READ_SELECT`, include `photo_object_key`, exclude `photo_uploader_id`, and throw backend errors unchanged. | Fixing only `listFlagsPage` or reintroducing uploader dependency. | YES |
| B-T05 | Same file | `withDisplayPhotoUrl(s)` via reader results | Canonical-only row derives public URL; legacy-only row preserves original URL; mixed row prefers key; neither row is dropped. | Hidden canonical media or stale URL precedence. | YES |
| B-T06 | `src/lib/__tests__/flagsPagination.test.ts` | `listFlagsPage` and centralized projection | Status filter, order, limit, before cursor, and `nextCursor` remain exact after centralization. | Projection refactor breaking pagination. | YES |
| B-T07 | `src/lib/__tests__/users.test.ts` | `USER_PROFILE_SELECT`, `getUserProfile`, `updateUserProfile` | Both read/mutation use same safe projection; no email; key-backed avatar is derived and survives display-name save. | B-RC-002 returning on mutation or avatar disappearing after save. | YES |
| B-T08 | `src/screens/__tests__/ProfileScreen.dataContract.test.ts` | `ProfileScreen.load` wiring | Screen uses `getUserProfile`, retains independent status/event calls, clears local error on Retry and publishes recovered profile. | A second direct stale projection or broad Profile rewrite. | YES |
| B-T09 | `src/lib/__tests__/flagsStoreSwr.test.tsx` | `FlagsProvider.refresh` | No-cache failure publishes error; caught Retry success publishes fresh rows and clears error/offline markers; unrelated action does not clear it. | Stale shared banner or false healthy state. | YES |
| B-T10 | `src/screens/__tests__/HomeScreenRefreshFailure.test.ts` | Home retry entry points | Pull-to-refresh and every Retry use the caught promise callback; no bare `void refresh()` remains. | Unhandled rejection while retaining same request behavior. | YES |
| B-T11 | `src/screens/__tests__/bp13FailureVoice.test.ts` | `failureBannerText` | Terminal `.`, `!`, `?` produce one boundary; existing retry text is not duplicated; exact FEATURE_UNAVAILABLE sentence passes. | `yet.. Tap to retry` and retry duplication. | YES |
| B-T12 | `src/lib/__tests__/location.test.ts`, `src/screens/__tests__/MapScreenLocateFailure.test.ts` | Location normalizer and Map wiring | `kCLErrorDomain`/native codes become stable human copy, diagnostics remain internal, generic `errorMessage` unchanged, web Retry/clear remains. | Raw native exception leakage or global error redesign. | YES |
| B-T13 | `src/components/__tests__/MyReportsModal.test.tsx`, `src/components/__tests__/ActivityFeedModal.test.tsx` | Independent modal loaders | First call rejects, visible Retry reissues same canonical helper, success clears local banner and renders rows. | Provider-only testing masking independent failures. | YES |
| B-T14 | `src/lib/__tests__/photos.test.ts`, `src/screens/__tests__/LeaderboardScreen.monogram.test.tsx` | Gallery and all enabled leaderboard mappers | Legacy+canonical gallery order/display and key-only all-time/monthly avatars render; monogram fallback remains for genuinely missing media. | False global-media claim and canonical avatar disappearance. | YES |
| B-T15 | `src/lib/__tests__/account.test.ts`, `src/lib/__tests__/accountDeletionReceipt.test.ts` | Deletion receipt lifecycle | Persist-before-request, retain on outage, reuse/recover later, and selected-only explicit dismissal. | Weakening deliberate ambiguity recovery. | YES |

After these focused suites pass, run:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

Then run the repository-required CI workflow/checks once on the exact client candidate SHA. No native compile begins while any test, typecheck, lint, replay, REST, or required CI check is red.

## Backend Proof Contract

All proof precedes client native work.

### SQL / replay proof

1. New managed migration version is later than every migration in the final Prompt-B base and collides with none.
2. Clean replay from zero succeeds.
3. Upgrade replay from the audited/hosted pre-Prompt-B schema succeeds atomically.
4. Catalog shows exact types/nullability for all five media/provenance columns.
5. No migration statement updates/nulls legacy URL values; before/after hashes/counts for legacy URL rows match.
6. Trigger/function definitions, security mode, pinned search path, RLS enablement, and grants match BACKEND-04 through BACKEND-10.
7. `has_column_privilege` matrix proves authenticated avatar-key SELECT, no authenticated email SELECT, no anon avatar-key SELECT, and no broad users table SELECT.
8. Canonical commit fixtures prove server-created key, exact owner check, URL-null/key-present writes, uploader provenance, and durable ambiguity.
9. Canonical ordinary deletion and account deletion prove exact Storage-first absence, preserved foreign ownership, bounded inventory, terminal evidence, and review audit/replay.
10. Existing legacy rows remain readable and unchanged.

### Hosted catalog and cache proof

After separately authorized deployment:

1. Record project ref, migration version, deployment SHA, timestamp, and role.
2. Query catalog for the exact fields/types and grants.
3. Confirm PostgREST refreshed normally. If catalog is correct but API still reports cached absence, perform one approved schema-cache reload, record it, and re-probe. No client fallback.
4. Confirm expected functions appear with exact signatures.
5. Confirm no new warning/error indicates missing columns, `42501`, trigger bypass, or Storage owner mismatch during happy-path probes.

### Exact REST proof

Use redacted fixtures and the same authenticated role as the app.

1. **Installed-client flag projection:** `id,user_id,lat,lng,category,description,severity,photo_url,photo_object_key,photo_uploader_id,photo_alt,status,created_at` returns HTTP 200.
2. **Post-client flag projection:** same without `photo_uploader_id` returns HTTP 200.
3. **Exact Profile projection:** `id,display_name,avatar_url,avatar_object_key,points,created_at` for the authenticated subject returns HTTP 200.
4. **Sibling controls:** flags status/category and users points/is_admin/base leaderboard reads remain HTTP 200.
5. **Gallery:** `url,object_key,position,alt_text` returns HTTP 200 with legacy and canonical fixtures.
6. **All-time leaderboard:** exact public columns including avatar key return 200 without email.
7. **Monthly leaderboard:** exact RPC returns canonical avatar key and aggregate only.
8. **Negative role matrix:** anon cannot read avatar key or execute media RPCs; authenticated cannot forge provenance, query service-only intent/review tables, or directly delete flags.

### Media usability proof

- SQL proves persisted keys and legacy URLs.
- REST proves fields/grants/cache.
- Storage proof confirms `getPublicUrl` output for seeded canonical objects is readable without exposing inventory or signed secrets.
- Unit tests prove client derivation.
- Real iOS proves image fetch/decode/render. SQL/REST alone cannot satisfy MEDIA-INV-06.

### Installed-client recovery checkpoint

Before any client edit or native build, run the already-installed Flagstone build against the aligned backend and verify the provider cohort and Profile no longer receive the proven 400s. Failure here means the backend packet is incomplete or runtime identity changed; stop rather than masking it in the client.

## Fewest Safe Waves

### WAVE B-1

**WAVE ID:** B-1 — Authorized backend implementation
**OWNER:** Strongest reasoning-capable backend implementation worker; single writer; explicit backend/security authority.
**OBJECTIVE:** Produce the new managed, dependency-closed canonical-media migration from final reviewed definitions only.
**FILES / OBJECTS:** BC-01 through BC-10; Edge files verify-only unless exact signature mismatch requires a reviewed edit.
**INPUT SHA:** Final independently accepted Prompt-A candidate, after staleness revalidation; audit reference `2762a5447600e8de55be912ccb26e95456484945`.
**TESTS:** B-T01 through B-T03 plus existing D1F4/R2/R3/FIX2/FIX3 guard/adversarial suites.
**PROOF:** Diff contains only authorized backend contract/test/necessary Edge alignment; clean and upgrade replay pass.
**PARALLEL SAFE?:** No parallel writer on backend schema/Edge surfaces. Read-only reviewer may prepare after writer SHA exists.
**NATIVE BUILD?:** NO.
**STOP CONDITION:** Authority missing; migration closure depends on an unreviewed object; any broad users grant; any legacy rewrite; any accepted deletion invariant fails.
**OUTPUT SHA / EVIDENCE:** Backend candidate SHA, migration hash/version, replay log, SQL role matrix, exact object diff.

### WAVE B-2

**WAVE ID:** B-2 — Backend deploy, replay, REST, and security verification
**OWNER:** Authorized backend deployer plus independent Codex/Sol reviewer; reviewer is not B-1 writer.
**OBJECTIVE:** Deploy through the approved path and prove physical schema, cache, grants, RPCs, Storage, deletion, and installed-client recovery.
**FILES / OBJECTS:** B-1 SHA; linked project only after identity confirmation.
**INPUT SHA:** Exact accepted B-1 SHA.
**TESTS:** Backend Proof Contract; B-T01 through B-T03 against replay/staging as authorized.
**PROOF:** Catalog/grant snapshots, exact REST statuses/bodies, role matrix, log correlation, cache refresh record, installed-client checkpoint.
**PARALLEL SAFE?:** No concurrent schema/grant/deployment writer. Independent read-only evidence capture is safe after deployment settles.
**NATIVE BUILD?:** NO.
**STOP CONDITION:** Any projection non-200; `42501`; catalog/cache disagreement; legacy/canonical fixture unavailable; privacy broadening; installed build still reproduces root cause.
**OUTPUT SHA / EVIDENCE:** Accepted backend SHA and immutable proof packet tied to project/deployment/migration identity.

### WAVE B-3

**WAVE ID:** B-3 — Grouped client implementation
**OWNER:** Claude Sonnet Max; single client writer.
**OBJECTIVE:** Implement CD-01 through CD-07 and UX-01 through UX-05 exactly, with no backend fallback.
**FILES / OBJECTS:** `src/lib/flags.ts`, `src/lib/users.ts`, `src/screens/ProfileScreen.tsx`, `src/types/database.ts`, `src/lib/flagsStore.tsx`, `src/screens/HomeScreen.tsx`, `src/lib/copy.ts`, `src/lib/location.ts`, `src/screens/MapScreen.tsx`; `src/lib/photos.ts` verify-only; leaderboard files as listed.
**INPUT SHA:** Final Prompt-B base containing accepted B-2 backend source, or a clearly documented client branch based on the exact accepted candidate.
**TESTS:** Author/update B-T04 through B-T15 while editing.
**PROOF:** One writer diff; six helpers use one constant; Profile read/update share one constant; no uploader display select; no generic fallback; production deletion receipt files unchanged unless staleness requires review.
**PARALLEL SAFE?:** No simultaneous client writer. Backend is frozen after B-2.
**NATIVE BUILD?:** NO.
**STOP CONDITION:** Future-base conflict changes helper semantics; any proposed fallback; gallery/monthly contract unresolved; a native dependency/config change appears; backend proof is stale.
**OUTPUT SHA / EVIDENCE:** Client candidate SHA and focused diff manifest.

### WAVE B-4

**WAVE ID:** B-4 — Pre-native verification
**OWNER:** Independent Codex/Sol reviewer, separate from B-3 writer.
**OBJECTIVE:** Prove the exact client contract and all narrow regressions before compilation.
**FILES / OBJECTS:** B-T04 through B-T15 test files plus the B-3 diff.
**INPUT SHA:** Exact B-3 candidate SHA.
**TESTS:** All 15 contract tests, focused Jest, typecheck, lint, full Jest/required CI.
**PROOF:** Green command logs tied to SHA; projection snapshots; changed-file review; no out-of-scope edits.
**PARALLEL SAFE?:** Read-only review/test lanes may run in parallel; no writers until consolidated verdict.
**NATIVE BUILD?:** NO.
**STOP CONDITION:** Any red/flaky unexplained test; mock does not assert projection arguments; native/config diff; claim exceeds proof.
**OUTPUT SHA / EVIDENCE:** Independently accepted client SHA and pre-native proof packet.

### WAVE B-5

**WAVE ID:** B-5 — One real-iOS acceptance session
**OWNER:** Sol Fast independent exact-SHA verifier.
**OBJECTIVE:** Exercise the B-4 JS bundle on a compatible already-installed iOS development client in one instrumented session.
**FILES / OBJECTS:** No edits. Test provider cohort, independent state owners, Profile, gallery, leaderboards, location, receipts, and secondary surfaces.
**INPUT SHA:** Exact accepted B-4 SHA and exact B-2 backend deployment identity.
**TESTS:** Real-iOS checklist below.
**PROOF:** Timestamped screenshots/video/logs correlated to JS SHA/backend migration; no raw native error or unhandled promise.
**PARALLEL SAFE?:** One simulator/device controller only; read-only observers may review evidence.
**NATIVE BUILD?:** NO, provided compatible dev client exists.
**STOP CONDITION:** No compatible installed dev client; any acceptance failure; seed fixtures unavailable; runtime identity cannot be proved. Stop before consuming the one release build.
**OUTPUT SHA / EVIDENCE:** Accepted exact JS SHA and signed acceptance checklist.

Real-iOS checklist:

1. Home, Tasks, default Map, widened-status Map, Nearby; Retry and pull-to-refresh; provider error clears only after success; pagination.
2. My Reports, Recent Activity, Admin queue/report hydration.
3. My Watched, Recently Viewed, Settings export, valid/stale deep link, enabled realtime re-fetch.
4. Profile load, counts, pull-to-refresh, display-name save, canonical avatar upload/reload.
5. Legacy and canonical primary photo, mixed multi-photo gallery, all-time and monthly leaderboard avatars.
6. Exact punctuation and no unhandled Home Retry rejection.
7. Map and Report location failure show stable human copy without `kCLErrorDomain`; subsequent Retry can succeed.
8. Account-deletion unavailable status retains the receipt; later recognized status recovers; selected explicit dismissal only.

### WAVE B-6

**WAVE ID:** B-6 — One release/TestFlight build
**OWNER:** Release owner/Rory under Sky's merge/release gate.
**OBJECTIVE:** Build the already accepted B-5 exact candidate once for TestFlight/release.
**FILES / OBJECTS:** No code edits after B-5 acceptance.
**INPUT SHA:** Exact B-5 accepted SHA.
**TESTS:** Repository release preflight and artifact identity verification only; no edit/build loop.
**PROOF:** EAS/TestFlight build ID, source SHA, version/build number, successful artifact processing.
**PARALLEL SAFE?:** No competing build from another SHA.
**NATIVE BUILD?:** YES — expected native build count: ONE.
**STOP CONDITION:** Any post-acceptance source change, preflight failure, mismatched SHA/version/backend, or need for native configuration edit returns to B-3/B-4 and invalidates the one-build approval.
**OUTPUT SHA / EVIDENCE:** Release SHA, build ID, artifact metadata, release verdict.

## Worker Routing

| Surface | Writer / verifier | Rule |
|---|---|---|
| Backend implementation | Strongest reasoning-capable backend worker | One writer for migration/Edge contract; explicit security authority; no blind D1F4 promotion. |
| Client implementation | Claude Sonnet Max | One writer for all grouped TS/TSX/test changes. No parallel writer on the same files. |
| Independent review | Codex / Sol, separate from writer | Exact-SHA review of dependency closure, projections, privacy, tests, and scope. |
| Real-iOS acceptance | Sol Fast | Exact-SHA, one controller, evidence-based acceptance; no edits. |
| Release build | Release owner under Sky gate | Build only accepted SHA once. |
| Sol Max escalation | Only contradictions or architecture/security ambiguity | Required for dependency-closure contradiction, privacy/grant ambiguity, or one-build premise failure; not for routine implementation. |

Backend and client writers may not work simultaneously against an unsettled contract. B-3 starts only after B-2 freezes the deployed/backend contract and proof.

## One-Build Decision

**CONDITIONAL.** Prompt B can safely target one native build after client implementation if and only if all of the following are true:

1. Backend authority, managed migration, replay, deployment, cache refresh, role/grant matrix, exact REST probes, Storage/deletion proof, and installed-client checkpoint all pass.
2. The final client diff contains no native dependency, Expo plugin, entitlement, permission, `app.json`, Pod, Xcode, or native configuration change.
3. All six flag helpers share the exact canonical projection; Profile load/update share the exact avatar projection; no fallback exists.
4. All 15 pre-native tests, focused Jest, typecheck, lint, full Jest/required CI pass at the exact candidate SHA.
5. Gallery and all-time/monthly leaderboard handling satisfies MEDIA-INV-06.
6. A compatible installed iOS development client can run the exact candidate JS bundle for B-5 without a new native build.
7. The one B-5 session passes every independent owner/secondary/media/location/receipt check.
8. No source changes occur between B-5 acceptance and B-6 release build.

If prerequisite 6 fails, stop and choose explicitly between a second development build plus release build or delaying release. Do not silently consume the only build on an unaccepted candidate.

## Claude Execution Block

```text
PROMPT B EXECUTION CONTRACT

PROVEN ROOT CAUSES:
B-RC-001: linked production physically lacks flags.photo_object_key and
flags.photo_uploader_id; full flag projections 400 while sibling reads 200.
B-RC-002: users.avatar_object_key is physically absent; Profile and
updateUserProfile return projection are affected; narrow authenticated column
SELECT is mandatory. B-RC-003: provider error is shared and success-owned;
punctuation joins two periods; Home bare Retry can reject unhandled. B-RC-004:
native location text crosses the generic error boundary. Account-deletion
receipt retention is deliberate safety behavior.

BACKEND AUTHORIZED WAVE:
Obtain explicit backend/security authority. Create one new managed forward
migration from reviewed final object definitions. Do not move/apply the
non-managed D1F4/R2/R3/FIX2/FIX3 files and do not promote the monolith blindly.

BACKEND OBJECTS:
flags.photo_object_key/photo_uploader_id; users.avatar_object_key plus only the
narrow authenticated SELECT grant; flag_photos.object_key/uploader_id and
nullable legacy URL; upload-intent table/index/RLS; three provenance guards and
triggers; prepare/commit/cancel media RPCs; exact Storage prepared-upload and
owner checks; deletion write fence; final canonical account-deletion
inventory/review/terminal cleanup dependencies; Storage-first ordinary flag
delete RPCs/Edge contract; canonical monthly-leaderboard avatar output; API
schema-cache refresh. Preserve legacy data and use final repaired definitions.

MEDIA INVARIANTS:
MEDIA-INV-01..10 in this report are hard gates: preserve legacy URLs; display
key-only photos/avatars; narrow users grants; omit uploader only from client
reads; server-own provenance; no generic fallback; Storage-first deletion;
durable ambiguity; no global media claim without gallery+leaderboard proof.

CLIENT FILES / FUNCTIONS:
src/lib/flags.ts: one FLAG_READ_SELECT used by listFlags, listFlagsPage,
listFlagsByUser, fetchFlagById, fetchFlagsByIds, listRecentFlags; keep
photo_object_key/photo_alt/photo_url; omit photo_uploader_id; preserve exact
filters/order/limits/cursor/scopes and key-preferred normalizer.
src/lib/users.ts + ProfileScreen: one USER_PROFILE_SELECT and getUserProfile;
updateUserProfile uses same select and avatar normalizer.
flags/users/LeaderboardScreen/types: canonical avatars for all enabled boards.
flagsStore: preserve success-owned error clearing.
Home: caught Retry callback at every entry point.
copy: one punctuation boundary.
location + Map: location-only safe normalizer; generic errors unchanged.
photos and deletion receipt production paths: verify/preserve.

IMPLEMENT IN ORDER:
1 revalidate final Prompt-B base; 2 authorized managed backend migration;
3 replay/deploy/cache/grant/REST/Storage/deletion proof; 4 installed-client
checkpoint; 5 one grouped client edit; 6 all pre-native tests/CI; 7 one
real-iOS session on existing compatible dev client; 8 one release build.

TEST BEFORE NATIVE:
Pass B-T01..B-T15, focused Jest, npm run typecheck, npm run lint, full Jest and
required CI at the exact candidate SHA. No native build while any gate is red.

BACKEND PROOF:
Clean+upgrade replay; exact catalog/types/nullability; legacy hash/count
preservation; narrow grant matrix; triggers/RPCs/RLS/Storage owner paths;
canonical commit and deletion; PostgREST refresh; installed and post-client
flag projections 200; Profile projection 200; sibling controls 200; gallery
and enabled leaderboard 200; negative role matrix; no 42501/privacy broadening.

ONE-BUILD PREREQUISITES:
Backend and all pre-native gates green; no native/config dependency change;
compatible installed development client; one exact-SHA real-iOS session green;
no source edits afterward. Then build the accepted release/TestFlight artifact
once. Otherwise STOP and re-authorize build count.

REAL-IOS ACCEPTANCE:
Provider cohort Home/Tasks/default+widened Map/Nearby; My Reports; Activity;
Admin; Watched; Recently Viewed; export; deep link; enabled realtime; Profile
load/name/avatar; legacy+canonical primary/gallery media; all-time and enabled
monthly avatar; punctuation; caught Retry; native location Map+Report; deletion
receipt outage/recovery/dismissal.

SECONDARY SURFACES:
IMPLEMENT through canonical helpers: Watched, Recently Viewed, deep link,
realtime, Admin hydration, export. IMPLEMENT backend/VERIFY client: gallery.
IMPLEMENT: all-time and monthly leaderboard canonical avatar output.
VERIFY ONLY: Profile status/event counters. OUT OF SCOPE: unrelated accepted
backend/security systems.

PRESERVE:
Legacy URLs/rows; key-preferred display; uploader provenance server-side;
users email privacy; exact query filters/order/cursors; provider cache/sequence
semantics; generic errors; web location live-status; account-deletion receipt
and review durability; existing accepted backend/security behavior.

DO NOT TOUCH:
No generic fallback/capability cache/optional swallowed media query; no
table-wide users SELECT; no legacy URL nulling/backfill; no direct client key or
uploader writes; no direct flags DELETE restoration; no account-receipt
lifecycle rewrite; no unrelated UI/error/auth/ledger redesign; no simultaneous
writers; no native build before proof.

STOP / ESCALATE IF:
Base/build/project/object differs and is not revalidated; backend authority is
missing; dependency closure needs an unreviewed object; exact evidence differs;
401/403/42501 or privacy broadening appears; catalog/cache disagree; legacy or
canonical media can be hidden/overwritten; deletion/review invariants fail;
monthly board remains media-blind; HTTP 200 boundary is unexplained; any
pre-native gate fails; no compatible dev client; claim exceeds proof.

EXPECTED NATIVE BUILD COUNT:
ONE release/TestFlight build after exact-SHA acceptance on an existing compatible
development client. If that client is unavailable, STOP and re-authorize a
two-build path rather than improvising.

STALENESS RULE:
This plan was prepared against audited source
2762a5447600e8de55be912ccb26e95456484945.

Prompt B will begin from the final independently accepted Prompt-A candidate.

Before editing:

compare every listed file/function/object against that exact Prompt-B base SHA.

Revalidate any changed recommendation.

Do not blindly apply stale source instructions.
```

## B2 Ultra Review Questions

1. Does BACKEND-07/BACKEND-08 represent the minimum genuinely dependency-closed extraction for canonical media, or does any final D1F4/R2/R3/FIX2/FIX3 object/policy still need inclusion—or explicit exclusion—to avoid changing deletion-fence semantics?
2. Does BACKEND-02's column-grant plan preserve the exact hosted `users` privacy/RLS matrix for Profile and all-time leaderboard without exposing email or creating `42501` after rollout?
3. Must the currently optional/non-managed monthly leaderboard be promoted with `avatar_object_key`, or is disabling/removing that surface the safer release choice; is the resulting global-media claim correctly bounded?
4. Can B-1/B-2 safely freeze the backend before B-3 without a dual-read rollout, given that the installed build requests uploader provenance and the new client omits it?
5. Are B-T01 through B-T15 and the installed-client checkpoint sufficient to make one release build reasonable, especially for independent modal/Admin/realtime state owners and handled Home Retry rejection?
6. Are the legacy/canonical primary, gallery, Profile, and leaderboard fixtures guaranteed to exist for B-2/B-5, or must the authorized backend owner create non-production staging fixtures before the one-build decision can be accepted?

## Future Retrieval

```bash
git fetch origin
git show origin/codex/solfast-prompt-b-b1-execution-contract-20260830:qa-reports/2026-08-30_SolFast_PromptB_B1_ExecutionContract.md
```
