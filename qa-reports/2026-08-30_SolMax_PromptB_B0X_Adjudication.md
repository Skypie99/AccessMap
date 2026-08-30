# Flagstone Prompt B B0-X Technical Adjudication

## Inputs

- Repository: `Skypie99/AccessMap`.
- Audited product source: `2762a5447600e8de55be912ccb26e95456484945` (`claude/ui-polish-fix4b-sheet-scroll-hardening-20260829`).
- Audited source parent: `c365c5dafd645018efe469d46fe0f4c2149c5ce3`.
- Canonical B0 report: `qa-reports/2026-08-30_SolFast_PromptB_RootCause_Prep.md` at commit `0d93a7293e75b4efe27873a1e2b0ca3acfe3e078` on `origin/codex/solfast-prompt-b-root-cause-prep-20260830`.
- B0 integrity: B0's only parent is the audited source SHA above.
- B0-X report branch/base: `codex/solmax-prompt-b-b0x-adjudication-20260830`, created exactly from the audited source SHA.
- Runtime identity: the audited tree's `supabase/.temp/linked-project.json` identifies project `kldlwszpfkdmsjrjhjym` (`Accessable City App`); correlated native traffic identifies Flagstone `4.1.1`, iOS build `15` (`app.json:12,21`).
- Runtime inspection was read-only. No SQL was executed; no row, schema, cache, policy, grant, function, project, or deployment was changed.
- Read-only runtime evidence captured on 2026-08-30:
  - the hosted `public` catalog;
  - the hosted migration ledger;
  - recent Data API request logs; and
  - recent PostgreSQL logs.
- Limitation: the API and PostgreSQL logs establish the status, request projection, and server message, but did not expose the raw client-visible REST JSON body. Its `code`, `details`, and `hint` remain uncaptured and must not be invented.
- Current official mechanism references: [Supabase PostgREST error codes](https://supabase.com/docs/guides/api/rest/postgrest-error-codes), [stale schema-cache troubleshooting](https://supabase.com/docs/guides/troubleshooting/postgrest-not-recognizing-new-columns-or-functions-bd75f5), and [schema-cache reload procedure](https://supabase.com/docs/guides/troubleshooting/refresh-postgrest-schema).

## Executive Verdict

1. **B-RC-001 is technically sound and is now runtime-confirmed for the linked production project.** The deployed catalog physically lacks both `flags.photo_object_key` and `flags.photo_uploader_id`. Correlated Flagstone/15 full-projection reads return HTTP 400; same-session, same-table base/status projections return HTTP 200; PostgreSQL logs repeatedly state `column flags.photo_object_key does not exist`. The first absent selected column terminates the request, while catalog proof independently establishes that the uploader column is absent too.
2. **B-RC-002 is runtime-confirmed in today's failure mechanism, but it is not repair-equivalent to B-RC-001.** The deployed catalog physically lacks `users.avatar_object_key`; the full Profile projection returns HTTP 400 while sibling `users` projections return HTTP 200; PostgreSQL logs name the absent column. However, `users` has privacy-preserving column-level SELECT grants. Adding the column without narrowly granting authenticated SELECT on it can turn the failure into `42501`. The proposed D1F4 SQL adds the column but contains no such grant.
3. **The current failures are not stale-cache, RLS/auth, HTTP-200-shape, or client-decode failures.** Those remain branches in the general decision tree, but the catalog + 400 + sibling-200 + PostgreSQL evidence excludes them for the observed requests.
4. **Do not implement a permanent legacy-only projection or a generic missing-column fallback.** Canonical photo/avatar commits intentionally persist the legacy URL as `NULL` and the object key as the display authority. Removing or swallowing the key can make requests succeed while silently hiding legitimate media after canonical storage is enabled.
5. **The safest durable strategy is backend-first, dependency-closed contract alignment, represented in managed migration truth, followed by one centralized client read contract.** This is Strategy F below. It must include the canonical-media dependencies and the narrow avatar column grant; it must not blindly apply the explicitly local-only monolithic proposal.
6. **The current proof triggers an authority stop before Prompt B product editing if Prompt B still forbids backend work.** Schema/backend mutation is necessary for the recommended durable repair. Claude must escalate for a separately authorized, security-reviewed backend wave rather than disguising the mismatch with a client fallback.
7. **After authorized backend alignment, the installed client already requests the intended fields and should recover without a native build.** Then group the remaining client-only work—centralized projections, unused uploader-field removal, punctuation, handled Home Retry, and location-specific error normalization—into one edit/test/native-acceptance wave.
8. **Account-deletion receipt retention remains deliberate recovery safety.** Add or retain focused verification only; do not change lifecycle semantics without a distinct, proven terminal invalid-receipt state.

## Agent Findings

### Agent A — Database Truth

- No file in the audited `supabase/migrations/` chain creates `flags.photo_object_key`, `flags.photo_uploader_id`, or `users.avatar_object_key`.
- The managed base creates only legacy `flags.photo_url` and `users.avatar_url` (`supabase/migrations/20260523020620_accessmap_schema.sql:9-34`). The latest relevant managed media migration adds only `photo_alt`/`alt_text` (`supabase/migrations/20260819214410_photo_alt_text.sql:24-30`).
- The manual bootstrap also omits all three (`supabase/schema.sql:45-83`). It explicitly says the live catalog/`pg_dump` is authoritative and warns against wholesale live reapplication (`supabase/schema.sql:4-18`).
- All three first appear together only in the explicitly non-managed, local-only D1F4 proposal (`supabase/nonmanaged/proposed/2026-08-27_d1f4_async_account_deletion.sql:4-10,110-118`). Later D1F4R2/R3 proposals presuppose them and are also local-only.
- B0 missed one apparent alternate: `supabase/tests/mod1r_fix1/00_baseline.sql:169-170` adds the two `flags` columns to an ephemeral test harness. Its header and CI workflow prove it is disposable test infrastructure, not bootstrap, managed migration, or hosted deployment truth. It does not add `users.avatar_object_key`.
- Hand-maintained optional types in `src/types/database.ts:1-21,47-55,75-83` describe client expectations; they do not prove or create runtime schema.
- Additional affected path missed by B0: `updateUserProfile()` selects `avatar_object_key` in its mutation return projection (`src/lib/users.ts:55-63`), so display-name save can fail from B-RC-002 too.
- Read-only hosted ledger inspection corroborated the repository result: the 69 recorded hosted migrations end at `20260819214410 photo_alt_text`; no D1F4 migration is recorded.

### Agent B — Failure Mechanism / Runtime Proof

- On linked project `kldlwszpfkdmsjrjhjym`, the deployed catalog currently has:
  - `public.flags`: legacy `photo_url` and managed `photo_alt`, but neither `photo_object_key` nor `photo_uploader_id`;
  - `public.users`: legacy `avatar_url`, but no `avatar_object_key`; and
  - `public.flag_photos`: legacy `url` and `alt_text`, but no `object_key` or `uploader_id`.
- Correlated Flagstone/15 requests show:
  - full `flags` projection with both provenance fields: HTTP 400;
  - `flags.select('status')` and `flags.select('category,severity')` controls in the same native session: HTTP 200;
  - full Profile `users` projection with `avatar_object_key`: HTTP 400; and
  - sibling `users` projections such as `points` and `is_admin`: HTTP 200.
- PostgreSQL logs repeatedly identify `column flags.photo_object_key does not exist` and `column users.avatar_object_key does not exist` at correlated times.
- Source completes the causal path: every full helper throws before normalization (`src/lib/flags.ts:1053-1061,1099-1117,1131-1139,1458-1465,1483-1490,1523-1530`); Profile throws `profileErr` before publishing data (`src/screens/ProfileScreen.tsx:362-381`); `/does not exist/i` maps to `FEATURE_UNAVAILABLE` (`src/lib/errors.ts:50,57-64`).
- The observed failures therefore classify as **physical schema/client-contract mismatch**. A stale schema cache cannot explain a catalog that physically lacks the fields. Pure RLS/auth cannot explain the exact absent-column PostgreSQL messages plus successful sibling reads. HTTP-200/decode theories cannot explain the correlated 400s.
- Disagreement with B0: do not call the captured GET error `PGRST204`. Current Supabase/PostgREST documentation defines `PGRST204` for a column absent from a `columns` query parameter; these requests use `select=...`. The raw REST body is missing, so neither `PGRST204` nor SQLSTATE `42703` is a captured client code.
- Any client compatibility predicate still needs one exact client-visible error capture: HTTP status/statusText and raw `code`, `message`, `details`, `hint`.

### Agent C — Repair Strategy / Data Safety

- Canonical flag commits write `flag_photos.url = NULL`, `flags.photo_url = NULL`, and set the object keys/uploader (`supabase/nonmanaged/proposed/2026-08-27_d1f4_async_account_deletion.sql:665-705`). Canonical avatar commit writes `users.avatar_url = NULL` and `avatar_object_key = key` (`:709-745`). Client normalizers derive display URLs from keys and retain legacy URLs only when a key is absent (`src/lib/flags.ts:1027-1039`; `src/lib/users.ts:130-138`).
- Therefore, removing `photo_object_key`/`avatar_object_key`, splitting them into a swallowed optional query, or falling back broadly can hide canonical-only media or show stale legacy media.
- `photo_uploader_id` is different: exact source search finds no client runtime use outside full projections/types. It is server provenance, not display data. It may be omitted from client reads while remaining mandatory in the backend writer/deletion contract.
- `users` has a distinct privilege hazard. A managed privacy migration revokes table-wide SELECT and grants authenticated SELECT only on `id, display_name, avatar_url, points, created_at` (`supabase/migrations/20260529043812_email_privacy_closes_pii_exposure.sql:6-11`; repeated in later privacy migrations). D1F4 adds `avatar_object_key` but does not narrowly grant it. Never restore table-wide `users` SELECT because `users.email` exists.
- The current physical absence means those columns cannot currently hold canonical-only values. It does **not** prove Storage contains no orphan/pending objects, and it does not make a permanent legacy client safe for the future canonical rollout.
- Separate canonical-media gaps prevent any claim of global media recovery:
  - `listFlagPhotos()` selects `flag_photos.object_key` (`src/lib/photos.ts:30-51`), but the managed table lacks it (`supabase/migrations/20260531025237_flag_photos_junction.sql:28-34`); the detail UI catches the error and can appear gallery-empty.
  - all-time and monthly leaderboards still select/map only `avatar_url` (`src/lib/flags.ts:1668-1675`; `src/lib/users.ts:140-180`), so a Profile-only avatar repair cannot prove canonical avatars globally.

### Agent D — Implementation Economy

- Home, Tasks, Map, and Nearby truly share one `FlagsProvider` request/state. Nearby performs no fetch; it receives Map's provider rows.
- My Reports, Recent Activity, and Admin run independent requests and own independent error/retry state even though they reuse helpers in `src/lib/flags.ts`.
- The supposed “one projection” is currently six duplicated literals: `listFlags`, `listFlagsPage`, `listFlagsByUser`, `fetchFlagById`, `fetchFlagsByIds`, and `listRecentFlags` (`src/lib/flags.ts:1053-1061,1099-1117,1131-1139,1458-1465,1483-1490,1523-1530`). Fixing only `listFlagsPage` restores the default provider cohort but leaves non-default filters, modals, Admin, Watched, deep links, and realtime refresh broken.
- Secondary failures beyond B0's named surfaces include My Watched, Recently Viewed, Profile's update counter, Settings data export, Admin reported-content hydration, Map deep links, and realtime row refresh. Some fail visibly; others silently degrade to empty/stale state.
- Existing tests do not fully lock the contract:
  - flag-query mocks generally discard projection arguments;
  - My Reports lacks failure→Retry coverage;
  - Activity Feed lacks a focused failure→Retry suite;
  - `HomeScreenRefreshFailure.test.ts:40-45` currently pins bare `void refresh()` even though the provider rethrows without cache;
  - `MapScreenLocateFailure.test.ts:56-60` pins the raw native `errorMessage(e)` path; and
  - `bp13FailureVoice.test.ts:26-42` lacks terminal-punctuation normalization.
- Typecheck, focused Jest, and lint are separate from native EAS builds (`package.json` scripts). The data contract, retry transitions, punctuation, and exception normalizer can be proven before native compilation.

## Conflicts and Reconciliation

| Disputed point | Evidence | Reconciled conclusion |
|---|---|---|
| B0 treated deployed column absence as a strong hypothesis. | Live catalog omits all three; full projections 400; sibling projections 200; PostgreSQL names missing columns. | Upgrade B-RC-001 and today's B-RC-002 mechanism to runtime-confirmed physical schema/client-contract mismatches for the linked project. |
| B0 suggested a missing-column/PostgREST-cache shape, including `PGRST204`. | Raw REST body is uncaptured; current docs scope `PGRST204` differently; PostgreSQL logs expose messages, not the client code. | Do not invent the code. The server root cause is proven, but an exact client-error capture remains mandatory before any error-gated client bridge. |
| B-RC-002 looked analogous to B-RC-001. | Same proposed D1F4 origin and same current physical-absence mechanism, but `users` uses narrow column grants and D1F4 omits the new grant. | Analogous today at schema-drift/root-cause level; not equivalent for repair, authorization, fan-out, or acceptance. |
| B0 implied one shared repair could recover six surfaces. | Four surfaces share provider state; the other reads are independent; six helper projections are duplicated. | One coherent contract repair can recover them, but only if every helper is centralized/aligned and each independent state owner is accepted separately. |
| Client fallback is the shortest code edit. | Canonical writers null legacy URLs; cache/grant failures can coexist with real key-only media. | A generic fallback is shorter but unsafe. Backend-first dependency-closed alignment is the shortest **safe durable** path and may recover the installed client without a native build. |
| B0's implementation contract prohibited backend work. | Current durable repair requires schema, grant, function, and cache alignment. | That scope now hits a stop condition. Escalate for backend authority before editing; do not improvise a permanent client downgrade. |
| “Media recovered” might follow once primary reads work. | `flag_photos.object_key` and leaderboard avatar consumers remain independently inconsistent. | Either include them in the canonical-media contract wave or explicitly defer them; never claim global media recovery without acceptance. |

## B-RC-001 Final Verdict

**VERDICT: TECHNICALLY SOUND; RUNTIME-CONFIRMED ON THE LINKED PROJECT.**

- The audited client requests two fields that neither the managed replay/bootstrap nor the deployed physical table supplies.
- The exact full request fails with HTTP 400; same-session controls on `flags` succeed; PostgreSQL identifies the absent first selected field.
- This is sufficient to explain the observed provider failure and deterministic Retry recurrence.
- It explains one upstream failure fan-out to Home, Tasks, Map, and Nearby. The same contract defect separately affects My Reports, Recent Activity, and Admin through independent helpers/state.
- `photo_object_key` is display-critical. `photo_uploader_id` is server provenance and unused by the client; it should not remain an unnecessary read dependency.
- A correct repair must cover all six full helper variants, not six screen catch blocks and not only the provider's first-page helper.
- A correct acceptance must also prove filters, cursor/pagination, user scoping, ID batching, deep links, and realtime re-fetch still preserve their exact semantics.

## B-RC-002 Final Verdict

**VERDICT: RUNTIME-CONFIRMED CURRENTLY, ANALOGOUS IN ORIGIN/FAILURE, BUT NOT REPAIR-EQUIVALENT.**

- Today, `users.avatar_object_key` is physically absent and the full Profile projection fails with HTTP 400 while sibling `users` and Profile `flags.status` reads succeed. The current primary failure is not auth, RLS, cache, or decode.
- The column shares the same non-managed D1F4 origin and key-preferred display semantics as the flag fields.
- It is operationally separate: a direct `users` request, local Profile error state, no shared flag-provider recovery, and a second affected path in `updateUserProfile()`'s mutation response.
- It has a unique authorization constraint: the existing `users` privacy contract uses column-level grants. Schema promotion must add **only** the necessary authenticated SELECT grant for `avatar_object_key`; table-wide SELECT is rejected.
- If the column is later present but the narrow grant is absent, a `42501` is an authorization defect. Claude must stop; it must not retry a legacy projection because canonical avatars may exist only in the key field.
- Profile load, display-name save, avatar upload/reload, and leaderboard avatar behavior require separate acceptance.

## Minimum Runtime Proof

### Evidence already sufficient for the current verdict

| Artifact | `flags` result | `users` result | Diagnostic value |
|---|---|---|---|
| Exact runtime/project identity | Flagstone 4.1.1/build 15; linked project ref matches audited source | Same | Excludes a different backend/build. |
| Exact request/status | Full selected shape returns 400 | Full Profile shape returns 400 | Proves the failing requests are non-2xx, not decode-after-200. |
| Same-session control | Status/category projections return 200 | Points/is_admin/base leaderboard projections return 200 | Excludes table outage and pure session/table-access failure. |
| Physical catalog | Both target fields absent | Target field absent | Distinguishes physical absence from cache-only drift. |
| PostgreSQL log | `column flags.photo_object_key does not exist` | `column users.avatar_object_key does not exist` | Identifies the server rejection. |
| Raw REST error body | Not captured | Not captured | Still required only if a client fallback is proposed; do not invent code/details/hint. |

### Smallest complete packet for future/stale runtimes

Capture once per exact failing request, with secrets and row values redacted:

1. App version/build, audited source SHA, project ref, timestamp/trace ID, auth role, and a non-reversible subject hash.
2. HTTP method; decoded URL `select`, filters, order, limit/cursor; status; statusText; content-type; raw response body.
3. Supabase result at the call boundary: `status`, `statusText`, `data` top-level shape, and raw `error.code/message/details/hint`.
4. A same-session, same-table, same-filter base-projection control.
5. Read-only catalog rows for physical existence/type and `has_column_privilege` for `anon`/`authenticated`.
6. Only if access is implicated, the relevant SELECT grants and `pg_policies` rows.
7. Only for an HTTP 200 failure, a three-point trace: raw body → Supabase-js result → app normalizer/consumer result.

### Diagnostic classification

| Runtime evidence | Classification | Prompt B action |
|---|---|---|
| Catalog column absent; exact GET non-2xx; database log names it; same-session base projection succeeds | **Physical column absent** — current result | Stop for authorized backend contract alignment. A temporary client bridge is conditional only after exact error capture and media/writer proof; do not call it media-complete. |
| Catalog column exists with correct type/grant; REST reports cached API absence or cannot see it | **Schema cache stale** | Stop for approved cache/backend repair; reload/redeploy cache, then re-run modern projection. No legacy fallback. |
| Catalog/cache/grants correct; target-only probe works; actual request has a wrong field/alias/schema/stale-build projection | **Bad client projection** | Correct one centralized projection contract, add exact query-construction tests, then rebuild once. Preserve URL + key. |
| `401`, JWT error, wrong subject, `403`, or `42501`; or same query differs by role | **Auth/grant/RLS** | Stop for security review. Never retry anonymously, broaden RLS, expose privileged credentials, or table-grant `users`. |
| Exact request returns 200 with `[]`/`null` despite a known row | **Row visibility/missing row**, often RLS rather than projection | Verify subject, row existence, grants, and SELECT policy. Do not treat an empty 200 as column capability. |
| Raw HTTP 200 is HTML, invalid JSON, or wrong top-level shape | **Malformed/unexpected transport response** | Preserve body/content-type and stop. No schema compatibility path. |
| Raw 200 JSON is valid but Supabase-js errors/throws | **Library/polyfill/modifier decode** | Reproduce against pinned `@supabase/supabase-js` with a fixture; fix/upgrade the client boundary only after review. |
| Supabase returns expected data but a row normalizer/consumer throws | **Unrelated app decode/normalization failure** | Fix the exact boundary with runtime-shape fixtures; no schema workaround. |
| Request and helper both succeed | **B0 hypothesis stale for that runtime** | Do not implement B0's data repair; trace the correlated UI/state failure. |

## Repair Strategy Matrix

| Strategy | Correctness | Media-data risk | RLS/auth risk | Client change? | Backend/schema change? | Reversibility | Testability | Release risk | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| **A. Remove new provenance/avatar fields from reads** | Works only against today's legacy-only physical schema; contradicts intended canonical contract | **High:** key-only media becomes invisible; stale legacy URLs can win | Low directly, but masks drift | Yes | No | High | Easy but proves the wrong contract | High future regression | **REJECTED** |
| **B. Retry with legacy projection on missing-column errors** | Can bridge today's physically absent columns if gated to the exact captured relation/column/read signature | **High after rollout/cache/grant drift:** can hide canonical-only media | Medium if generic 400, `PGRST204`, `/does not exist/`, or `42501` is caught | Yes | No | High | Good with strict negative cases | Medium-high; temporal coupling/sunset required | **CONDITIONAL emergency bridge only** |
| **C. Capability-detect and select projection** | Sound only with an authoritative, versioned server capability that attests schema + cache + grant + writer state | High for ad-hoc probe/cached-negative capability; low with atomic server contract | Medium | Yes | Usually yes for authoritative capability | Medium | Good if contract is explicit | Medium; rollout coordination | **CONDITIONAL; ad-hoc client probing REJECTED** |
| **D. Align runtime schema with intended product contract** | Restores the contract the installed client already requests | Low if additive, legacy-preserving, and dependency-closed | Medium: grants/policies/functions must be exact | No for primary read recovery; later cleanup recommended | Yes | Partial once canonical writes occur | Strong: replay, grants, REST role matrix, installed-client proof | Medium | **RECOMMENDED durable direction** |
| **E. Promote required proposed schema into managed migration truth** | Necessary to make fresh replay match hosted intent, but only if reviewed dependency closure is promoted | Low if legacy URLs are preserved; high if only columns or destructive backfill are copied | Medium-high; proposed SQL omits avatar SELECT grant and spans sensitive deletion/storage logic | No | Yes | Partial | Strong but broad | Medium-high security blast | **CONDITIONAL required companion; never blindly copy proposal** |
| **F. Backend-first dependency-closed D+E, then centralized media-safe client reads; omit only unused `photo_uploader_id` from reads** | Correct now and through canonical rollout; installed client can recover immediately after backend alignment | **Lowest:** retains URL + display key; uploader provenance stays server-side | Controlled by narrow grants and role matrix | Small cleanup/tests after backend | Yes, separately authorized | Partial backend; high client | Best end-to-end testability | Lowest safe total release risk | **RECOMMENDED** |
| **G. Base query plus swallowed optional provenance query/merge** | Produces rows but creates partial truth, pagination/merge races, and ambiguity | **High:** canonical media silently disappears | Medium; can swallow grant/cache errors | Yes | No | High | Complex and misleading | High | **REJECTED** |

### Dangerous / rejected details

- Never permanently omit `photo_object_key` or `avatar_object_key`.
- Never interpret friendly `FEATURE_UNAVAILABLE`, generic HTTP 400, arbitrary `/does not exist/`, generic `PGRST204`, or `42501` as permission to fall back.
- Never cache “column unavailable” for the JS-bundle lifetime across a backend rollout.
- Never add only the three columns while leaving `flag_photos.object_key`, upload-intent RPCs, trusted triggers, Storage ownership checks, deletion cleanup, and grants inconsistent.
- Never grant table-wide SELECT on `public.users`; it contains email.
- Never null legacy URLs as a migration/backfill shortcut. Existing legacy display data must remain readable.
- Never call a primary-list recovery “global media recovery” while gallery and leaderboard canonical-media paths remain unproved.

## Client-vs-Schema Decision Tree

```text
START — revalidate future base + exact runtime identity
  |
  +-- Exact failing request is non-2xx?
  |     |
  |     +-- Catalog target column ABSENT
  |     |     -> physical contract drift (CURRENT)
  |     |     -> STOP for backend authority
  |     |     -> preferred: dependency-closed managed schema alignment
  |     |     -> only if backend is explicitly deferred: separately approve a
  |     |        temporary exact-error bridge after raw error + writer/media proof
  |     |
  |     +-- Catalog column PRESENT, correct type
  |           |
  |           +-- REST/cache cannot see it -> cache repair under backend authority;
  |           |                              no fallback
  |           +-- 401/403/42501 -> grant/RLS/auth security review; no fallback
  |           +-- exact field probe works -> bad client projection/stale build;
  |                                       fix centralized client contract
  |
  +-- Exact failing request is HTTP 200?
        |
        +-- []/null but known row -> row existence/subject/RLS proof
        +-- malformed body/content-type -> preserve evidence and STOP
        +-- raw JSON != Supabase result -> client-library boundary proof
        +-- Supabase result succeeds but app throws -> normalizer/consumer fix
        +-- helper succeeds -> B0 is stale; trace UI/state instead

AT EVERY BRANCH
  - If flags succeeds and users fails (or vice versa), split the clusters.
  - If media can be hidden, grants broadened, or backend mutation is unauthorized,
    STOP rather than improvise.
```

### Action for the current result

The decision tree lands on **physical contract drift for both clusters**. Prompt B must not begin with screen edits or a fallback. It must first obtain authority for a dependency-closed backend migration/deployment plan. If that authority is outside Prompt B, stop and hand the evidence to the backend/security owner.

## Shared Recovery / Independent Verification

### What one coherent repair can recover

- One backend contract alignment plus one centralized full-flag read contract can recover:
  - Home;
  - Tasks;
  - Map;
  - Nearby (derived from Map rows);
  - My Reports;
  - Recent Activity; and
  - Admin's flag queue.
- It also reaches the same defect's secondary consumers: My Watched, Recently Viewed, Profile update counter, Settings export, Admin report hydration, Map deep links, pagination/non-default filters, and realtime row refresh.
- It is **not** literally one existing query today. All six helper projections must be centralized or individually aligned. The provider quartet shares one request/state; the modal/Admin paths do not.

### Independent acceptance still required

1. **Provider cohort, one navigation session but four behaviors:**
   - Home rows/photos, stale-data notice, handled Retry rejection, success-cleared error;
   - Tasks rows, banner Retry, pull-to-refresh, pagination;
   - Map default statuses and a widened status filter to exercise `listFlagsPage` and `listFlags`, markers/photos;
   - Nearby receives Map/provider rows, sorts correctly with/without location, and displays media.
2. **Independent fetch/state owners:** My Reports, Recent Activity, Admin flag queue.
3. **Secondary helper consumers:** My Watched, Recently Viewed, Settings export, Map deep link, Admin reported-content hydration, realtime refresh when enabled, and Profile update count.
4. **Profile cluster:** identity, points/counts, canonical/legacy avatar display, Retry, pull-to-refresh, display-name save, avatar upload/reload.
5. **Independent media contract:** known canonical primary-photo row; known multi-photo Flag Detail gallery; known canonical avatar; all-time and monthly leaderboard avatar rows.
6. **Presentation issues:** exactly one punctuation boundary; no settled provider error after success/navigation/theme change; no unhandled Home promise.
7. **Native location:** Map and Report “Use my location” show stable human copy with no `kCLErrorDomain`/native code; diagnostics remain internal; subsequent Retry can succeed.
8. **Account deletion:** unavailable status retains the receipt; later recognized status recovers; explicit dismissal removes only the chosen receipt. No lifecycle rewrite.

Source/unit tests cannot prove deployed grants/RLS, cache state, Storage-object readability, image decode, native Core Location presentation, VoiceOver announcement, or navigation persistence. Those require deployed/runtime or real-iOS acceptance.

## Fewest Safe Implementation Waves

### Wave 0 — Runtime proof and authority gate (no build)

- **Already complete for root-cause classification:** project/build correlation, physical catalog, exact projections/statuses, sibling controls, PostgreSQL messages.
- Capture the raw client-visible REST error object only if any client bridge remains under consideration.
- Because the current result requires backend/schema work, **STOP here until explicit backend/security authority is granted**. This report does not grant it.

### Wave 1 — One authorized backend contract wave (no native build)

- Convert the reviewed, dependency-closed canonical media contract into managed migration truth; do not apply the non-managed proposal wholesale.
- Include at minimum: all three primary fields; `flag_photos.object_key/uploader_id`; required intent tables/functions/triggers; narrow function execution; Storage ownership checks; deletion cleanup dependencies; and a narrow authenticated SELECT grant for `users.avatar_object_key`.
- Preserve every legacy URL and row. Do not canonicalize or null data as part of reliability repair.
- Prove before deployment: clean replay, migration ordering, pgTAP/SQL invariants, role/grant matrix, RLS, RPC writer behavior (`URL NULL + key` only on trusted commit), and legacy preservation.
- After authorized deployment/cache refresh, repeat catalog + same-role REST probes for canonical and legacy projections.
- Exercise the already-installed Flagstone build against the corrected backend. A successful provider/Profile recovery here avoids an unnecessary native build for the data root cause.

### Wave 2 — One coherent client/source edit wave

- Centralize the six full-flag reads around one media-safe projection containing `photo_url`, `photo_object_key`, and `photo_alt`; omit client-unused `photo_uploader_id` while retaining it server-side.
- Centralize/lock the Profile base read and `updateUserProfile()` return contract with both `avatar_url` and `avatar_object_key`.
- Resolve or explicitly defer the gallery/leaderboard canonical-media gaps before claiming global recovery.
- Fix `failureBannerText()` terminal punctuation.
- Handle Home's retry promise; retain provider success-clearing behavior.
- Add a location-specific native exception normalizer/log boundary; do not broaden generic `errorMessage()`.
- Add account-deletion recovery tests only; do not change receipt lifecycle.

### Wave 3 — One pre-native verification wave

Before native compilation, prove:

- exact projection construction for all six helpers, filters, ordering, limits, cursor, IDs, and user scope;
- canonical-only row → derived public URL; legacy row → unchanged legacy URL; no row/media dropped;
- no fallback on network, 401/403/42501, unrelated PostgREST error, malformed 200, or decode error;
- provider no-cache failure → Retry → fresh rows + cleared `error`/offline markers;
- My Reports and Activity failure → Retry → rows + cleared local banner;
- Profile base load and display-name update preserve avatar key hydration;
- punctuation is exactly `That feature isn't available yet. Tap to retry.`;
- native-domain input maps to stable location copy while raw diagnostics are logged only;
- account-deletion outage retains its receipt and recovers later.

Run the focused Jest suites, changed-file lint, typecheck, and then one repository-required CI pass. Do not interleave native builds with these edits.

### Wave 4 — One native acceptance wave, then one release build

- Reuse a matching installed development client when possible; otherwise create one development build after Wave 3 is green.
- Complete the independent acceptance list above in one instrumented real-iOS session.
- Only after all acceptance is green, create the release/TestFlight build once.

This sequence is the fewest safe loop:

```text
read-only proof (done)
-> authority
-> backend contract + REST proof (no native build)
-> one client edit wave
-> one pre-native test wave
-> one native acceptance build/session
-> one release build
```

## Claude Stop Conditions

Maximum eight; each is mandatory:

1. **Identity/staleness contradiction:** future Prompt-B base, packaged app build, linked project, or relevant projection/migration differs from this report and has not been revalidated.
2. **Evidence contradiction:** exact runtime error does not name the expected relation/field, or catalog and REST/cache truth disagree.
3. **Unauthorized backend work:** any schema, cache, grant, RLS, RPC, Storage policy, function, migration, deployment, or Supabase mutation is necessary without explicit authority. **This condition is currently met for the recommended strategy.**
4. **Auth/security implication:** any 401/403/42501, JWT/subject-dependent result, column-grant issue, or RLS difference appears; never broaden access or fall back.
5. **Media safety uncertainty:** any plan can omit/overwrite key-only media, prefer stale legacy URLs, null legacy data, or proceeds without known canonical-writer/gallery/leaderboard behavior.
6. **Unexplained HTTP 200:** raw body, Supabase result, and app helper/consumer disagree and one focused trace cannot identify the exact failing boundary.
7. **Incomplete migration contract:** proposed promotion is not dependency-closed, lacks the narrow avatar grant, requires table-wide `users` SELECT, or changes upload/deletion ownership/recovery semantics without a separate security acceptance.
8. **Claim exceeds proof:** gallery, leaderboard, secondary helper, or independent state-owner behavior remains unexplained while implementation claims global flag/media/Profile recovery.

## B1 INGEST BLOCK

```text
B1 INPUT:

ADJUDICATED ROOT CAUSES:
B-RC-001 is runtime-confirmed on linked project kldlwszpfkdmsjrjhjym: the physical flags table lacks photo_object_key and photo_uploader_id; full Flagstone/15 reads return 400; sibling reads return 200; PostgreSQL names flags.photo_object_key. One contract defect fans out, but six helper projections are duplicated.
B-RC-002 is runtime-confirmed today: users.avatar_object_key is physically absent and the full Profile read 400s while sibling reads succeed. It shares D1F4 origin but has a distinct column-level SELECT-grant hazard and also breaks updateUserProfile's return projection.
B-RC-003 remains confirmed: provider error persistence and failureBannerText punctuation create cross-tab stale-looking state and `yet..`; they are presentation/recovery issues, not the data root cause.
B-RC-004 remains confirmed: native location exceptions pass raw Core Location text through generic errorMessage.
Account-deletion receipt retention remains intentional recovery safety; tests only unless a distinct terminal invalid state is proved.

RUNTIME PROOF FIRST:
Current root-cause proof is complete from catalog + correlated 400s + same-session 200 controls + PostgreSQL messages. Raw REST code/details/hint is still required before ANY client error-gated bridge. Revalidate if the future base/backend/build changes.

DECISION TREE:
Catalog absent -> physical contract drift -> backend authority gate.
Catalog present + REST/cache missing -> approved cache repair, no fallback.
Catalog present + 401/403/42501 -> security/grant/RLS escalation, no fallback.
Catalog/cache/grants good + request wrong -> centralized client projection fix.
HTTP 200 -> trace raw body -> Supabase result -> app normalizer; do not apply schema workaround without the exact failing boundary.

RECOMMENDED STRATEGY:
Strategy F: backend-first, dependency-closed intended-contract alignment represented in managed migration truth, including flag_photos dependencies and narrow users.avatar_object_key SELECT grant; preserve all legacy URLs. Then centralize media-safe client reads retaining photo_object_key/avatar_object_key and omit only unused photo_uploader_id from client projections.

REJECTED/DANGEROUS:
Permanent legacy-only reads; generic missing-column retry; fallback on friendly copy/PGRST204/42501; ad-hoc cached capability probes; swallowed optional provenance queries; partial three-column migration; table-wide users SELECT; legacy-URL nulling; claims of global media recovery without gallery/leaderboard proof.

IMPLEMENTATION WAVES:
0 runtime proof + authority stop.
1 separately authorized backend contract/replay/role/REST proof, no native build.
2 one coherent client wave: centralized reads, Profile load+update path, punctuation, handled Home Retry, location normalizer, receipt tests only.
3 focused Jest + projection assertions + lint + typecheck + one CI pass before compilation.
4 one real-iOS development acceptance session, then one release/TestFlight build.

INDEPENDENT ACCEPTANCE:
Provider cohort Home/Tasks/Map/Nearby; My Reports; Recent Activity; Admin; Profile load/name save/avatar; Watched/Recently Viewed/export/deep-link/realtime/report hydration; canonical primary photo; multi-photo gallery; Profile and leaderboard canonical avatars; punctuation/retry clearing; native location; account-deletion receipt recovery.

STOP IF:
Base/build/project changed; evidence contradicts expected fields; backend authority is missing; auth/RLS/grants implicated; media can be hidden or legacy data nulled; HTTP 200 remains unexplained; migration is dependency-incomplete or broadens users access; implementation claims more recovery than independent proof supports.

STALENESS:
Revalidate all source-sensitive conclusions against the exact future Prompt-B base before editing.
```

## FUTURE RETRIEVAL

```bash
git fetch origin
git show origin/codex/solmax-prompt-b-b0x-adjudication-20260830:qa-reports/2026-08-30_SolMax_PromptB_B0X_Adjudication.md
```
