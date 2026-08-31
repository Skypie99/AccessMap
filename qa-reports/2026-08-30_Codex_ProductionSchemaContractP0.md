# PROD-SCHEMA-CONTRACT Report — 2026-08-30

## 1. DECISIONS FOR SKY

- [ ] **Authorize the exact production schema-contract migration** — Apply only `supabase/migrations/20260830130000_promptb_media_key_read_contract.sql` to Supabase project `kldlwszpfkdmsjrjhjym`; do not run an unfiltered push from this branch.
  - **Recommendation:** Use an isolated deployment workspace containing the 70 production-applied migrations plus only version `20260830130000`, then run `supabase db push --dry-run --project-ref kldlwszpfkdmsjrjhjym --skip-vault`. Proceed only if the dry-run lists exactly `20260830130000_promptb_media_key_read_contract.sql`; run the same command without `--dry-run`, then perform the catalog, ledger, PostgREST, and app checks in §7.
  - **Why:** Production has 70 ledger entries ending at `20260819214410_photo_alt_text`, while this accepted tree has seven local-only versions. An unfiltered `--include-all` could apply six unrelated migrations (`20260818211920` plus five `20260828…` moderation files) as well as the P0 repair.
  - **Rollback:** Before any later canonical-media writer is deployed, run the migration's documented rollback (`20260830130000_promptb_media_key_read_contract.sql:46-59`) in one controlled transaction, verify the three columns/triggers are absent, and only then mark version `20260830130000` reverted in migration history. Rolling back while the accepted client is live restores the current 42703 outage, so prefer stopping and diagnosing unless the migration itself caused a new failure.
  - **Why deferred:** This is a production schema and migration-ledger write. Owner authorization is required.
  - **Owner:** Sky

## 2. BLOCKERS / FAIL_FAST

- **BLOCKER — database-executed controlled proof unavailable locally.** Supabase CLI `2.116.0` is installed, but `supabase status` reports no Docker/Podman executable; `psql` and `pg_isready` are also unavailable. The project has no existing development branch beyond `main`, and the brief forbids creating a paid branch without owner approval.
  - **Quarantined?** Yes. Repository tracing, fresh read-only production catalog/ledger checks, client tests, and static SQL review completed. Production was not mutated.
  - **Recommended path:** Apply only after the owner-authorized dry-run lists the single migration; execute `supabase/tests/promptb_media_key_guards.test.sql` in an authorized rollback-safe database before or immediately after the production change.

## 3. Summary

The root cause is a client/production schema-contract mismatch, not network or authentication failure. The accepted client selects canonical media keys that production lacks, while the accepted tree already contains the correct additive migration at `supabase/migrations/20260830130000_promptb_media_key_read_contract.sql`. No duplicate migration or client change is needed; the release repair is Path A, but production application remains owner-only and database-executed proof remains blocked until an authorized PostgreSQL environment is available.

## 4. What Changed

- Added this diagnosis/report only. Product code, migration SQL, tests, UI, production, and hosted configuration were unchanged.
- Branch: `claude/prompt-c-final-accessibility-20260830`
- Accepted product base: `92b89b7b368f784d55563deedef7975dd6080dc7` / tree `77ba1899b39a6227e27b2fea537e9832a6b8dc8e`

## 5. What's Proposed (Not Applied)

| Proposal | File path | What it does | Impact | Rollback documented? |
|---|---|---|---|---|
| Existing P0 media-key read contract | `supabase/migrations/20260830130000_promptb_media_key_read_contract.sql` | Adds three nullable `text` keys, the narrow `users.avatar_object_key` authenticated SELECT grant, and server-owned key guards | Restores accepted full-read projections while leaving legacy URLs/rows untouched | Yes, lines 46-59 |

Migration identity: Git blob `5a0882ccd62a8b9188854e99744ca4d694b66386`; SHA-256 `90fe2b532b8def860021d1d23cc3191f96a534834c24ffcee6c6a1ddf14c91c4`.

## 6. Findings by Domain

### Data / Schema (Dana)

- 🔴 **Production migration gap confirmed.** Read-only ledger SQL returned 70 versions ending at `20260819214410_photo_alt_text`; `20260830130000` is absent. The migration header's older “69 entries” note (`supabase/migrations/20260830130000_promptb_media_key_read_contract.sql:10-11`) is stale by one and is not deployment evidence. Read-only `information_schema` checks confirmed `flags.photo_object_key`, `users.avatar_object_key`, and `flag_photos.object_key` are absent, while `flags.photo_alt`, `users.avatar_url`, and `flag_photos.url` exist.
- 🔴 **Every full flag read requires the missing primary key.** `FLAG_READ_SELECT` includes `photo_object_key` and is used by `listFlags`, `listFlagsPage`, `listFlagsByUser`, `fetchFlagById`, `fetchFlagsByIds`, and `listRecentFlags` (`src/lib/flags.ts:1027-1151`, `src/lib/flags.ts:1470-1542`). A non-null key derives a display URL; NULL preserves the legacy `photo_url` (`src/lib/flags.ts:1039-1050`).
- 🔴 **Profile reads require the missing avatar key.** `updateUserProfile` and `ProfileScreen.load` select `avatar_object_key`; NULL preserves `avatar_url` (`src/lib/users.ts:49-63`, `src/lib/users.ts:130-137`, `src/screens/ProfileScreen.tsx:352-382`).
- 🔴 **Flag Detail also requires the third column in the same migration.** `listFlagPhotos` selects `flag_photos.object_key`; NULL falls back to the existing URL (`src/lib/photos.ts:18-50`). Applying only the two incident-log columns would leave seeded Flag Detail reads broken.
- 🟢 **Intended schema is proven by the accepted managed migration.** Each key is nullable `text`, has no default/backfill/comment/index/unique/FK, and preserves old rows. Existing RLS and table policies are unchanged. `flags` and `flag_photos` inherit existing table-level SELECT; `users.avatar_object_key` receives authenticated column SELECT only, with no anon SELECT (`supabase/migrations/20260830130000_promptb_media_key_read_contract.sql:19-39`, `:66-82`).
- 🟢 **Direct client key writes do not exist.** Uploads obtain server-created keys through `prepare_flag_photo_upload` and commit them through server RPCs (`src/lib/flags.ts:856-916`, `src/lib/users.ts:86-127`, `src/lib/photos.ts:53-101`). The accepted minimum migration deliberately does not enable those deferred writers (`supabase/migrations/20260830130000_promptb_media_key_read_contract.sql:15-17`, `:41-44`).
- 🟢 **Deletion/admin paths remain server-owned and unchanged.** Owner and admin removal delegate to `delete-flag`, which requests an exact canonical deletion plan, checks Storage ownership/absence, then finalizes relational deletion (`src/lib/flags.ts:1432-1454`, `src/lib/adminReports.ts:375-384`, `supabase/functions/delete-flag/index.ts:1-100`). This migration adds no cleanup or Storage-policy delta.

### Privacy (Jordan)

- 🟢 The repair adds storage object keys but does not backfill or expose uploader IDs. `users.avatar_object_key` is authenticated-read-only; anon receives no SELECT. No user, location, disability, auth, or Storage row data was read during this diagnosis.

### Tests / CI (Gary)

- `npx jest --ci --runInBand --watchman=false src/lib/__tests__/flags.test.ts src/lib/__tests__/users.test.ts src/lib/__tests__/photos.test.ts src/components/__tests__/FlagDetailModal.gallery.test.tsx` — PASS, 4 suites / 155 tests / 0 failures.
- `git diff --check` — PASS before report creation.
- `supabase/tests/promptb_media_key_guards.test.sql` — NOT RUN / BLOCKED (requires PostgreSQL + pgTAP). It contains 25 transactional assertions for type/nullability/defaults, grants, and guard behavior (`begin`/`rollback`).
- Full Jest, UI/a11y suites, native simulator work, and Visual Freeze were intentionally not rerun.

## 6.5 Process Self-Check

### Efficiency Check

Prior non-production ActivityFeed evidence was used only to retain the existing 42703 boundary; all decisive migration-ledger and catalog facts were freshly re-read against project `kldlwszpfkdmsjrjhjym`.

### Overlap Check

The accepted tree already contained Prompt B's migration and pgTAP proof. This run avoided duplicating them and classified the incident as an unapplied existing migration.

### Simplification Opportunities

Removing the fields from client projections would make requests return 200 but would discard the accepted canonical display-key contract and leave Flag Detail inconsistent. Applying only the existing migration is the smaller coherent repair.

## 7. How to Review

```bash
git show 26c593d08cbfa11cb7eb176bda9ab8bd9debf90a -- supabase/migrations/20260830130000_promptb_media_key_read_contract.sql supabase/tests/promptb_media_key_guards.test.sql
```

Owner-authorized production preflight (from an isolated deployment workspace containing the 70 applied migrations plus only the target migration):

```bash
supabase db push --dry-run --project-ref kldlwszpfkdmsjrjhjym --skip-vault
```

Stop unless the dry-run lists exactly `20260830130000_promptb_media_key_read_contract.sql`. After authorized application, verify:

- the production ledger records version `20260830130000`;
- all three columns are `text`, nullable, and defaultless;
- the six guard triggers exist;
- authenticated can select `users.avatar_object_key`, anon cannot, and existing table RLS/grants remain unchanged;
- the exact formerly failing flags/users/flag_photos projections return HTTP 200 without exposing their row contents in evidence;
- no fresh 42703 media-key errors appear;
- Home, Tasks, Profile, Map, one seeded Flag Detail, and representative history/feed data load.

## 8. Next Recommended Action

Sky authorizes and executes the single-migration production run after the isolated dry-run and pgTAP/catalog preflight; if those pass, perform only the minimum runtime reacceptance and restart Visual Freeze capture from the beginning.

## What's Left

- Owner-authorized migration application and ledger readback.
- Database-executed 25-assertion pgTAP proof.
- Minimum production-backed runtime proof listed above.
- Visual Freeze remains blocked until that runtime proof passes.

## Production Safety Record

- Production mutation: NONE
- Supabase production mutation: NONE
- Push: NONE
- Merge: NONE
- EAS/build/deploy: NONE
