# Flagstone Phase 04B — account-deletion client compatibility (FDA-003) — HANDOFF

STATUS: **IMPLEMENTED_AWAITING_INDEPENDENT_ACCEPTANCE** (local only; nothing pushed, merged, deployed or applied)

## 1. Identity

| Item | Value |
|---|---|
| Canonical base | `7159d2499607b9e8b90fb03d0fa761a8dbe6e7a5` (tree `c20bf70595c9f77b1a2a2c4e24323764647f5709`) — verified before editing |
| Corrected Phase 04 recon | `ee707600374c53039ca4541b48638db7c8d79476` (tree `e69330578162fd7743a6f104fc16a2c6470fa39d`), branch `recon/flagstone-phase04-current-truth-20260920` |
| Read-first handoff | `/Users/skypie/AccessMap-worktrees/flagstone-p04-recon-20260920/qa-reports/phase04/20260921T070613Z-current-truth-recon/09_04B_OPUS_HANDOFF.md` |
| Branch | `opus/flagstone-phase04b-deletion-20260921` (new, created from the exact base) |
| Worktree | `/Users/skypie/AccessMap-worktrees/flagstone-p04b-opus-20260921` (new) |
| Commit 1 (lib) | `a1ecdb9d70bef68c8ebc250ca8bfcbe29ead3391` (tree `d0632bfc06565a4e619b8f01ea9858541dcce8a4`) |
| Commit 2 (screens) — code candidate | `0a8af34b40ebf5aa18b95e66e0b828366864abdc` (tree `51278ef1a25435010b229f1744e3598272eff789`) |
| Commit 3 (this report packet, docs only) | resolve with `git log -1` on the branch (a file cannot contain its own commit hash) |
| Git status at report time | clean apart from this packet, which commit 3 adds |
| `node_modules` | symlink to `/Users/skypie/AccessMap-phase03b-merge-20260920/node_modules`; `package-lock.json` sha256 `458e6ced…cb24a` byte-identical on both sides (same method as Phase 03C); the symlink is ignored by the shared `info/exclude` |
| Primary checkout `/Users/skypie/AccessMap` | untouched: HEAD `94d86239…` and `status --porcelain` sha256 `a9ae6d23…7428` identical before and after (read with `--no-optional-locks`) |

## 2. Files changed (exact 04B ownership list only)

| File | Change |
|---|---|
| `src/lib/account.ts` | reply classification, typed outcomes, single-flight, terminal-receipt short-circuit, local cleanup; `invoke('delete-account')` kept on **line 19** |
| `src/lib/accountDeletionReceipt.ts` | capability-gated `getAccountDeletionStatus()`; terminal-receipt helpers; `loadAccountDeletionReceipt()` without a subject skips server-confirmed receipts; `invoke('account-deletion-status')` kept on **line 88** (`OPERATION_ID_RE` moved next to its only reader to make room for one import line) |
| `src/lib/accountDeletionAvailability.ts` | `accountDeletionAsyncStatusAvailable()` → `false` (needed: the Phase 05 capability gate) |
| `src/screens/ProfileScreen.tsx` | delete handler, status refresh, terminal "Account deleted" card, Delete Account disabled state |
| `src/screens/SignInScreen.tsx` | no status workflow while the capability is absent; terminal receipts dropped quietly |
| `src/lib/__tests__/account.test.ts` | rewritten matrix (5 → 41 tests) |
| `src/lib/__tests__/accountDeletionReceipt.test.ts` | +7 tests; status test runs with capability present |
| `src/lib/__tests__/accountDeletionAvailability.test.ts` | +1 test (capability absent in this build) |
| `src/screens/__tests__/SignInScreen.test.tsx` | +2 tests; B2-R suite precondition made explicit |
| `src/screens/__tests__/ProfileScreen.deletion.test.tsx` | **new** (13 tests) — needed: no screen-level deletion test existed (FDA-014) |

Not touched (verified with `git diff --name-only`): every 04A file (`flags.ts`, `photos.ts`, `adminReports.ts`, `ReportFlagModal.tsx`, `AdminScreen.tsx`, `FlagDetailModal.tsx` and their tests), `supabase/contract/client-expectations.v1.json`, `supabase/migrations/**`, `supabase/migrations-next/**`, `supabase/nonmanaged/**`, all Phase 03B/03C evidence, and the shared guards `contractManifest.guard.test.ts`, `privacy.guard.test.ts`, `d1f4AsyncAccountDeletion.guard.test.ts` (all run, all green). No new logging anywhere in the diff.

## 3. Step 1 — delete contract verified (spot-check only; no broad recon)

- `supabase/contract/deployed-contract.v1.json` (captured 2026-09-04, read-only): `delete-account` **v4 ACTIVE, verifyJwt true**; `account-deletion-status` **absent**.
- `/Users/skypie/AccessMap-deep-audit-20260902/qa-reports/2026-09-02_FlagstoneDeepAudit/evidence/build33-backend-contract-probe.md` §"Deployed `delete-account` v4": verify_jwt=true; POST; derives the user from the bearer; **ignores the request body**; anonymises flags, then `auth.admin.deleteUser`; returns **`200 {status:'deleted'}` or `500 {status:'error'}`**. FDA-003 ledger entry agrees.
- Installed SDK (2.106.2): `functions.invoke()` never throws; it returns `FunctionsFetchError` (network), `FunctionsRelayError`, `FunctionsHttpError` (non-2xx, `context.status`), or a parse error for an unreadable success body. `auth.signOut()` ignores 401/403/404 from `/logout`, so sign-out after v4 deletion succeeds when online.
- No contradictory evidence found; the accepted direction (P04-D03/P04-D04) was not reopened.

## 4. What the client now does

### Reply classification (`src/lib/account.ts`)

| Reply | Outcome | Sign-out | Receipt | Retry |
|---|---|---|---|---|
| `{status:'deleted'}` (also as JSON text) | **CONFIRMED** → resolves `{status:'deleted'}` | yes | marked terminal → cleared after sign-out | n/a |
| `FunctionsFetchError` / thrown invoke / timeout | unconfirmed `network` | no | kept | **none** |
| `FunctionsHttpError` 5xx/4xx (not 401/403), `{status:'error'}`, relay error | unconfirmed `server` | no | kept | none |
| `FunctionsHttpError` 401/403 | unconfirmed `auth` | no | kept | none |
| null/empty/array/non-string status/unreadable text/parse error | unconfirmed `malformed` | no | kept | none |
| unknown status string | unconfirmed `unexpected_status` | no | kept | none |
| `{status:'requested'}` while capability absent | unconfirmed `async_unavailable` | no | kept | none |
| unclassifiable error | unconfirmed `unknown` | no | kept | none |
| `{status:'requested'}` with capability present (Phase 05 only) | `{status:'requested', receipt, requestedAt}` | yes | kept (async recovery) | none |

Each unconfirmed reason is a distinct `AccountDeletionUnconfirmedError.reason` with its own message (no two shapes collapse). A receipt that cannot be prepared raises `AccountDeletionNotStartedError` ("No deletion request was made"); the web `AccountDeletionReceiptUnavailableError` passes through unchanged.

### Session cleanup (confirmed deletion)

`markAccountDeletionReceiptConfirmed()` (same opaque operation key, no subject-keyed record) → `signOut(userId)` → `clearAccountDeletionReceipt()` → resolve. Marker-write or clear failures are swallowed (the server result stands). A sign-out failure raises **`AccountDeletedSignOutPendingError`** — "Your account was deleted, but this device could not finish signing out…" — never a failure message; the terminal receipt survives for relaunch.

### Duplicate activation / destructive-retry safety

- Lib: concurrent `deleteAccount(id)` calls share **one** in-flight promise (one invoke).
- Screen: a synchronous `useRef` lock in `handleDeleteAccount`, plus the existing disabled/busy control (`a11yToggle({busy, disabled})` unchanged), and the settled attempt closes the confirmation so any later request needs a fresh Delete → confirm.
- No automatic retry exists anywhere. A deliberate later attempt is allowed and sends a new request; an `auth`/"account not found"-style reply to it is still **unconfirmed**, never read as proof of the earlier attempt.
- A server-confirmed (terminal) receipt short-circuits any later `deleteAccount()` to local cleanup — the destructive request is never sent again (relaunch safety).

### Absent async capability

`accountDeletionAsyncStatusAvailable()` returns `false`. While false: `getAccountDeletionStatus()` throws `AccountDeletionStatusUnavailableError` **before any network call**; ProfileScreen never calls it and never shows the status card or "Check deletion status"; SignInScreen shows no status workflow and calls nothing; `requested` is not accepted as an outcome. The Phase 05 code paths are preserved behind the capability (not deleted). No review route is referenced by the client.

### Screens

- **Confirmed success:** one global notice — title "Account deleted", body "Your account has been deleted, and this device is signed out." Global (Alert) because on native the auth gate unmounts the signed-in area on SIGNED_OUT; RN 0.81 presents alerts in their own `UIWindow` (`RCTAlertController.mm`), so the modal teardown cannot swallow it.
- **Unconfirmed:** existing title "Could not confirm deletion request" + the reason message; signed in; Delete Account stays available; no status workflow.
- **Confirmed, sign-out failed (now or after relaunch):** "Account deleted" notice (in-session) and a terminal card "Your account has been deleted. This device has not finished signing out." with **Finish signing out** (`completeConfirmedAccountDeletion()`: sign-out + terminal-receipt clear, never a deletion request); Delete Account disabled with an explanatory hint. State is keyed by user id, so it can never describe another account.
- **Relaunch after confirmed deletion:** signed out → SignInScreen: no status call, no card, terminal receipts cleared quietly (the one-time notice is not repeated).

### Logging / Phase 03C

No logging or analytics were added. A test asserts no console output contains the receipt secret, operation id or account id across failure and cleanup-failure flows. The diff is client-only: no SQL, RLS, grants, Storage policy, migration, anon read path or guest-identity change; deletion stays the authenticated owner's flow. C-1…C-10 are unaffected, and the 85-assertion anon suite replays identically (§6).

## 5. Test matrix → proof

| Required proof | Where |
|---|---|
| v4 `status=deleted` success, sign-out, receipt cleanup, order | `account.test.ts` › confirmed success (6); `ProfileScreen.deletion.test.tsx` › confirmed deletion |
| explicit v4/server error | `account.test.ts` table rows 0–2; ProfileScreen "explicit v4 error (500)" |
| timeout after possible completion / network ambiguity | table rows 5–6, thrown-invoke test; ProfileScreen "network timeout…" |
| 401 (and 403) | table rows 3–4; ProfileScreen "401"; later-attempt "account not found" test |
| malformed response | table rows 7–12; ProfileScreen "malformed reply" |
| duplicate tap / pending / re-render | lib single-flight (2); ProfileScreen double press inside one act scope; busy/disabled + re-render lock |
| relaunch after confirmed deletion | lib terminal short-circuit (2); ProfileScreen relaunch (terminal); SignIn 04B relaunch; receipt terminal tests |
| local cleanup failure | lib (2) + `completeConfirmedAccountDeletion` (3); ProfileScreen sign-out-failed flow incl. Finish signing out |
| absent async capability → zero status/review calls | receipt gate test; SignIn 04B suite; ProfileScreen global `afterEach` (no `account-deletion-status`/`account-deletion-review` invoke in any test) |
| forced failure never shows success | every unconfirmed case asserts no success title/no sign-out; distinct-message test |
| confirmed success never shows failure | confirmed + cleanup-failure cases assert no "Could not confirm…" title |
| `requested` only under proven capability | lib Phase 05 suite; `async_unavailable` row; ProfileScreen Phase 05 test |
| no sensitive logging | lib logging test |

**Mutation checks** (`evidence/mutate.py`, byte-exact restore, re-run on the committed code): **12/12 killed** — removing the screen lock, the lib single-flight, v4 success, adding an auto-retry, success-on-unconfirmed, the terminal short-circuit, either status gate, sign-out-on-unconfirmed, failure-on-cleanup-failure, accepting `requested` without capability, or the settle-close each fails at least one test (`evidence/mutation-results.json`).

**Existing tests changed — none weakened:**
- `account.test.ts` "does not sign out when the server did not acknowledge REQUESTED" fed the deployed v4 success `{status:'deleted'}` and asserted rejection with no sign-out — i.e. it asserted the FDA-003 defect. Replaced by the inverse assertions. The other four original cases survive (lost response keeps the receipt with no sign-out; receipt created before the request; REQUESTED + sign-out and sign-out-pending now under the explicit Phase 05 capability).
- `accountDeletionReceipt.test.ts` status-recovery test and the SignIn B2-R suite test the Phase 05 async surface; they now state the capability-present precondition. Their assertions are unchanged.

## 6. Gates (all local)

| Gate | Command | Exit | Result |
|---|---|---|---|
| Typecheck | `npx tsc --noEmit` | 0 | clean (baseline also clean) |
| Lint, 04B files | `npx eslint <10 owned files>` | 0 | 0 problems (baseline 0) |
| Lint, full | `npx eslint src --ext .ts,.tsx` | 0 | 0 errors, 90 warnings — all in 29 files 04B did not touch (`evidence/eslint-full-src.txt`) |
| Focused Jest + guards | 35 suites incl. contractManifest, privacy, D1/D1F4 guards, dialogTier, focusOnOpen, dismissalStandard, typeBlock, dynamicType, hitTarget… | 0 | **35/35 suites, 563/563** (`evidence/focused-jest-summary.txt`) |
| Full Jest | `npx jest --ci -w 3` | 0 | **298/298 suites, 4449 passed, 32 todo, 0 failed**, 30.8 s, first run, no flakes (`evidence/full-jest-summary.txt`). Base count per the committed 03C acceptance evidence (not re-run by 04B): 297 / 4390 / 32. Delta +1 suite / +59 tests = exactly the new and extended deletion tests (36 + 7 + 1 + 2 + 13) |
| Phase 03C replay | `node scripts/replay-phase03c.mjs --pgtap-sql=<pinned d4f9c8a4…26b3>` | 0 | **PASS 208/208** (52/49/22/85); `tcpDisabled`, `listen_addresses=''`, temp socket + data dir, `tempDestroyed`; per-suite `outputSha256` **identical** to the committed 03C evidence |
| Phase 03B regression | `node scripts/replay-phase03b.mjs --pgtap-sql=<pinned>` | 0 | **PASS**; safe rollback, reapply exact, temp destroyed; normalized result equal to committed evidence |
| Contract crosswalk | `node scripts/generate-migration-crosswalk.mjs --check` | 0 | `migration-crosswalk.v1.json is current` |
| Prettier | not run by design | — | `format:check` is ungated and all 9 owned files were already non-conformant at base; `prettier --write` would move the line-pinned call sites and break source-pinning guards |

Pinned pgTAP: `~/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/pgtap-968eb53a…/sql/pgtap.sql`, sha256 re-verified. PostgreSQL 17.11 (Homebrew, local). Nothing downloaded or installed.

**Not run (by boundary):** any device, simulator, EAS or web run — the app would contact the real Supabase project. No live `delete-account` call of any kind.

## 7. Proposed change to the 04A-owned manifest (NOT applied)

Exact proposal: `MANIFEST_DELTA_PROPOSAL.json` in this folder. Summary:
- Line anchors are **unchanged** (`account.ts:19`, `accountDeletionReceipt.ts:88`), so the manifest needs no line edits and the guard passes on this candidate as-is.
- Text updates for the `account-deletion` surface (notes, `callerDegrade`, `productionImpact`) and a `phase04bRevisionNote` + revision +1 over the post-04A value.
- `account-deletion-status` is now truthfully `unreachable`, but `src/__tests__/contractManifest.guard.test.ts:120` pins `'hard'`. **Option A** keeps `hard` (text-only, guard untouched). **Option B (recommended)** sets `unreachable` and updates guard line 120 in the same serialized integration commit, mirroring the FDA-004 precedent. The guard is shared; neither lane edits it now.

## 8. DECISIONS FOR SKY

None block this local candidate. Per the standing rule, each has a recommendation.

🔴 **D-04B-1 — Delete-dialog copy still describes the async (Phase 05) design**
- **What:** The dialog says "This starts deletion of your account and associated content. Deletion happens asynchronously and cannot be undone." and the button hint says "…starting asynchronous account deletion". Deployed v4 deletes synchronously, and per FDA-024 it anonymises reports and leaves photos, avatars and contact_email, which also differs from the published privacy-policy sentence on deletion.
- **Recommendation:** approve replacement copy in a separate copy/privacy pass, e.g. "This permanently deletes your Flagstone account. This can't be undone." / "When it's done, this device signs out and shows a confirmation." Route the "associated content" claim (dialog and privacy policy) to the Phase 05 / FDA-024 erasure decision.
- **Why:** the handoff reserves destructive-flow wording for you, and erasure scope and the policy text belong to Phase 05. 04B must not alter the policy.
- **Alternative:** leave it until Phase 05.
- **Impact:** until then the dialog is wrong about timing and scope. It never misreports an outcome, and the new 04B copy makes no content-erasure claim.

🔴 **D-04B-2 — Whether to resolve a lost reply with a follow-up auth check**
- **What:** After an unconfirmed reply, the app could call `auth.getUser()`. A 403 `user_not_found` would mean the account no longer exists.
- **Recommendation:** decide in Phase 05 (or a small follow-up) whether that signal may be shown as "deleted" and trigger sign-out. It is **not implemented** in 04B.
- **Why:** the accepted contract forbids treating an ambiguous error or "account not found" as success without a separately accepted server contract.
- **Alternative:** keep the current truthful "can't confirm" state.
- **Impact:** in the rare "deleted but the reply was lost" case, the person sees "can't confirm", and a retry reports an unverified sign-in until they sign out. They are never told a false success or failure.

🔴 **D-04B-3 — Ratify the new 04B copy (ledger below)**
- **Recommendation:** ratify as written.
- **Why:** the strings are minimal and truthful about the outcome, make no erasure claim, and keep the existing uncertainty title.
- **Alternative:** edit the wording. The strings live in `account.ts` messages plus three ProfileScreen literals, and the tests pin the key phrases.
- **Impact:** wording only.

🔴 **D-04B-4 — Manifest option at integration**
- **Recommendation:** Option B, `unreachable` plus a guard update in the integration commit.
- **Why:** after 04B, `hard` misdescribes the call site. The FDA-004 precedent did the same.
- **Alternative:** Option A, text only.
- **Impact:** only the integration lane's commit changes.

### Copy ledger (new or changed user-visible strings)

| Where | String |
|---|---|
| Notice (confirmed) | **Account deleted** — "Your account has been deleted, and this device is signed out." |
| Notice (confirmed, sign-out failed) | **Account deleted** — "Your account was deleted, but this device could not finish signing out. Check your connection, then choose Finish signing out on this screen." |
| Card (terminal) | **Account deleted** — "Your account has been deleted. This device has not finished signing out." · button **Finish signing out** / "Signing out…" · hint "Signs this device out of the deleted account" |
| Delete Account hint (terminal) | "Your account has already been deleted. Use Finish signing out above." |
| Unconfirmed bodies, under the existing title **Could not confirm deletion request** | network: "The connection dropped before Flagstone got a reply, so it can't confirm whether your account was deleted. It did not try again. Check your connection before you decide whether to retry." · server: "The deletion service reported an error, so Flagstone can't confirm whether your account was deleted. It did not try again." · auth: "Your sign-in could not be verified, so Flagstone can't confirm whether your account was deleted. It did not try again. Sign out and back in before you retry." · malformed: "Flagstone could not read the reply, so it can't confirm whether your account was deleted. It did not try again." · unexpected_status: "Flagstone did not recognize the reply, so it can't confirm whether your account was deleted. It did not try again." · async_unavailable: "The deletion service replied with a request this version of Flagstone can't track, so it can't confirm whether your account was deleted. It did not try again." · unknown: "Something went wrong, so Flagstone can't confirm whether your account was deleted. It did not try again." |
| Not started | **Could not start account deletion** — "No deletion request was made. Please try again." |
| Message-less unknown error, capability absent | fallback "Flagstone can't confirm whether your account was deleted. It did not try again." — replaces "Use Check deletion status below before trying again.", which points at a control that does not exist without the capability; kept verbatim when the capability is present |

Unchanged: the dialog copy (D-04B-1), "Deletion requested" (Phase 05 path), "Account deletion is unavailable in this browser", and every SignIn B2-R string.

## 9. Residual risks and limitations

1. **No runtime proof.** Behaviour is proven with the network boundary mocked. The v4 reply shape comes from archived read-only evidence (2026-09-02 management-API source read; 2026-09-04 capture), not a fresh live call, which is forbidden here. A disposable-account device test remains the release gate, as in the FDA-003 ledger's recommended acceptance test.
2. **Two notices on a sign-out failure.** `supabase.ts` `signOut()` shows its own "Couldn't sign you out" before 04B's "Account deleted…". This existing pattern is shared with the REQUESTED path, and `supabase.ts` is not a 04B file.
3. **Marker write fails and sign-out fails.** After a relaunch, the terminal state is lost, so a deliberate retry reports "can't confirm" (never success). This is rare and fails closed.
4. **Phase 05 ordering.** If the async backend ships before the client capability flips, `requested` is shown as unconfirmed (fail-closed). Phase 05 must ship the capability with or before the backend.
5. **Remount while a request is in flight.** A remount before the request settles could, in theory, show the success notice twice. The lib still sends one request. It is practically unreachable because the tab screen stays mounted and the modal blocks navigation.
6. **Content-type leniency.** A JSON text body `{"status":"deleted"}` is accepted as the server's own confirmation. The shape check stays strict.

## 10. Next actions

1. Independent review of the exact local candidate, i.e. this branch HEAD (code tree `51278ef1…` at `0a8af34`).
2. After 04A is integrated, apply 04B's source and tests plus the chosen manifest option once, in a fresh integration worktree. Then rerun tsc, full Jest (`-w 3`), the 03C/03B replays and the contract check.
3. Sky: D-04B-1…4.
4. Release: disposable-account device acceptance (FDA-003 ledger test), only under a separate release authorization.

**Read first:** this file → `MANIFEST_DELTA_PROPOSAL.json` → `src/lib/account.ts` → `src/screens/__tests__/ProfileScreen.deletion.test.tsx`.
**Do NOT redo:** the Sept 2 audit, the Phase 04 recon, the v4-`deleted`-is-success question, the Phase 03B/03C replays (identical-hash evidence here), a speculative status endpoint, Phase 05 erasure/backup-table work, any 04A file, or any write to `/Users/skypie/AccessMap`.

## 11. Boundary attestations

Production contact: NONE · staging contact: NONE · real account deletion: NONE · linked Supabase/project refs/remote DB URL: NONE · Edge Function/backend deploy: NONE · migrations applied: NONE (local disposable socket-only replays only) · push: NOT PERFORMED · merge/rebase/cherry-pick: NOT PERFORMED · `origin/main`: untouched · published privacy policy: untouched · 04A-owned files: untouched · `/Users/skypie/AccessMap`: untouched.
