# Flagstone Prompt B B2-R Receipt Scope Adjudication

## Inputs

- Repository: `Skypie99/AccessMap`.
- Audited product source: `2762a5447600e8de55be912ccb26e95456484945`.
- B2 report commit: `bd8ec619fdfaf862f1d568f80094242a324d610f`, whose sole parent is the audited product source and whose only changed file is `qa-reports/2026-08-30_SolMax_PromptB_B2_FinalArchitecture.md`.
- Fable report commit: `12c15cf26ef4765cb84d7d7ed04385a55669b3ed`, whose sole parent is the audited product source and whose only changed file is `qa-reports/2026-08-30_Fable_PromptB_UX_FinalReview.md`.
- Directly inspected product source at the audited SHA: `src/screens/SignInScreen.tsx`, `src/lib/accountDeletionReceipt.ts`, and `src/lib/confirm.ts`.
- Directly inspected focused tests only: `src/screens/__tests__/SignInScreen.test.tsx`, `src/lib/__tests__/accountDeletionReceipt.test.ts`, and `src/lib/__tests__/confirm.test.ts`.
- No deletion migrations, Edge-function internals, Storage architecture, unrelated deletion UI, Prompt-B media migrations, broad security reports, production Supabase state, simulator, or build were inspected.
- This adjudication changed no product source, tests, backend object, receipt, account, or deployment.

**Primary decision: A. INCLUDE IN PROMPT B.**

## Verified Current Behavior

The known source truth is materially correct:

1. `SignInScreen` owns `refreshDeletionStatus()`.
2. That callback sets `checkingDeletionStatus`, calls `loadAccountDeletionReceipt()`, and, when a receipt is returned, stores it before calling `getAccountDeletionStatus(receipt)`.
3. A successful no-receipt resolution clears receipt/status/unavailable UI state. A successful status read stores the status, clears `deletionStatusUnavailable`, and announces `COMPLETE`.
4. The single `catch` covers both receipt loading and remote status reading. It sets `deletionStatusUnavailable = true` without clearing an already loaded receipt.
5. The normal non-unavailable, non-`COMPLETE` branch already renders `Check status`, calls the same callback, disables the control while checking, exposes the busy/disabled accessibility state, and swaps the label to `Checking…`.
6. The unavailable branch renders only `Dismiss unavailable receipt`.
7. `dismissDeletionReceipt()` calls `clearAccountDeletionReceipt(deletionReceipt)` only when a receipt object is held, then clears the screen's receipt/status/unavailable state. It has no confirmation.
8. `confirm()` is already a platform-aware, fail-closed boolean helper. It uses `Alert.alert` on native and `window.confirm` on web.
9. `getAccountDeletionStatus(receipt)` invokes the existing `account-deletion-status` function with the existing `operationId` and `receiptSecret` payload.
10. `clearAccountDeletionReceipt(receipt)` deletes only that operation's SecureStore record and removes only that operation ID from the index. Omitting the argument is the separate clear-all form; the current screen does not omit it when a receipt is loaded.
11. The library intentionally retains multiple operation receipts, while the signed-out screen loads and displays the first recoverable receipt only.

One important source correction is required. Fable describes the unavailable body, `This device has a deletion receipt, but status is temporarily unavailable.`, as unconditionally truthful. It is truthful only when `deletionReceipt !== null`. Because the load and status read share one `try/catch`, a SecureStore/index load rejection can set the unavailable flag before the screen has any usable receipt object. Also, after a previously known nonterminal status, a failed refresh leaves the old `deletionStatus` in memory; the current body-selection order can display stale status prose even though the action branch has switched to unavailable. The accepted repair must make the unavailable state take presentation precedence and must not claim that a receipt is loaded when it is not.

## Safety Significance

This is a **recovery-capability safety defect**, not merely UX polish.

During a transient or ambiguous status failure, the screen's only prominent action invites the user to delete the local capability used to recover the operation's status. The user receives no in-place recovery action and no confirmation explaining the consequence. That combination makes an outage materially increase the likelihood of irreversible local capability loss.

The loss is local and narrower than account deletion itself, but it is meaningful: the server-side deletion can continue while this device loses the operation ID/secret pair needed to query that operation. This directly conflicts with B2's receipt-preservation and durable-ambiguity safety intent. A retry affordance and confirmation reduce that risk without pretending the status is known.

## Semantic Delta

| Affected operation | Classification | Exact effect |
|---|---|---|
| Unavailable-state `Check status` | **EXISTING READ REUSED** | Calls the existing `refreshDeletionStatus()`, which retries receipt discovery and, if found, the same status read. |
| Unavailable-state manual dismissal | **EXISTING LOCAL DESTRUCTIVE ACTION WRAPPED** | Keeps the same selected-receipt clear, but runs it only after explicit confirmation and only when a receipt object is held. |
| Unavailable presentation | Existing state made truthful | Gives `deletionStatusUnavailable` presentation precedence and uses receipt-dependent wording so the UI does not claim a loaded receipt in Case B. |
| Backend behavior | **NO NEW BACKEND BEHAVIOR** | Same function, method, payload, response handling, and status enum. |
| Deletion semantics | **NO NEW DELETION SEMANTIC** | No request, cancellation, worker, fence, review, completion, or lifecycle behavior changes. |
| Receipt semantics | **NO NEW RECEIPT SEMANTIC** | Same format, index, selection, persistence, and selected-clear operation. |
| Security boundary | **NO NEW SECURITY BOUNDARY** | No new endpoint, grant, credential store, authorization path, or secret exposure. |

The accepted delta does not cancel deletion, alter its state, or make a new deletion request. It changes only what the signed-out client offers while status is unknown.

## Edge Case — Unavailable Without Loaded Receipt

### Case A: receipt loaded, remote status read failed

- `setDeletionReceipt(receipt)` has already run before the status call fails.
- The unavailable card may truthfully say this device has the displayed receipt.
- `Check status` safely reruns the existing load-plus-read callback.
- `Dismiss unavailable receipt` is meaningful, but must be secondary, explicitly confirmed, and must clear exactly that loaded receipt.
- A repeated status failure must leave both the receipt and unavailable state intact. A later success must clear the unavailable state and show the returned real status.

### Case B: receipt load failed or no usable receipt object is held

This case is possible. `SecureStore.getItemAsync` and the index/record load chain are asynchronous operations that can reject, and the shared catch does not prove a receipt exists.

- `Check status` remains safe because it retries the complete existing discovery-plus-status path. If the retry resolves to no receipt, the current callback clears the card without making a status request.
- The UI must not render a targeted dismissal control when `deletionReceipt === null`.
- The UI must not say that this device “has a deletion receipt” when no receipt object is held. It may state only that deletion recovery information/status is temporarily unavailable and invite retry.
- No targeted clear may run, and `clearAccountDeletionReceipt` must not be called.
- If a previous in-memory receipt remains held despite a later load error, the governing safety predicate is the actual held object: targeted dismissal may be offered for that object after confirmation.

This edge correction remains wholly inside `SignInScreen.tsx`; it does not justify changing receipt discovery, indexing, or SecureStore behavior.

## Security / Backend Impact

Making retry visible does not expose `receiptSecret`, `subjectId`, or `operationId` in UI, logs, accessibility text, or a new caller. The existing library still sends only `operationId` and `receiptSecret` to the existing status endpoint. `subjectId` remains in native secure storage and is not added to the request.

There is no new endpoint, authorization mode, credential store, request payload, response shape, server bypass, or backend deletion action. The existing `checkingDeletionStatus` disabled/busy behavior is mandatory on the new unavailable-state retry control so a user cannot launch duplicate concurrent retries through the UI. Sequential manual retries after a request settles remain bounded and intentional.

Manual dismissal removes only the selected displayed operation's local SecureStore record and index entry. It does not remove other receipts, cancel deletion, change server state, or prove deletion success/failure. Confirmation copy must describe only the loss of this device's recovery capability.

- **BACKEND RE-ACCEPTANCE REQUIRED: NO.** No backend source, object, request contract, status semantic, authorization rule, or deployment changes.
- **SECURITY RE-ACCEPTANCE REQUIRED: NO.** The same capability endpoint and secure-storage boundary are reused; focused client verification is sufficient to prove no new disclosure or bypass.
- **FOCUSED CLIENT SAFETY TEST REQUIRED: YES.** The action gating, confirmation, selected clear, retry state, and no-receipt edge are new client contracts.
- **LIVE UI PROOF REQUIRED: YES.** The exact candidate must show the recovery and confirmation transitions through a safe local/mock or existing non-production receipt fixture, never a manufactured production deletion.

## Minimum Implementation Surface

**Production file count:** one added Prompt-B production surface.

- Modify: `src/screens/SignInScreen.tsx`.
- Reuse without modifying: `src/lib/confirm.ts` by extending the existing import from `notify` to `confirm, notify`.
- Do not modify: `src/lib/accountDeletionReceipt.ts`.

The complete behavior can remain in `SignInScreen.tsx`:

1. When `deletionStatusUnavailable` is true, make unavailable presentation take precedence over any retained nonterminal `deletionStatus`.
2. Render `Check status` first in the unavailable action set, wired to the existing `refreshDeletionStatus()`, with the existing disabled/busy accessibility state and `Checking…` label.
3. Render `Dismiss unavailable receipt` only when `deletionReceipt !== null`.
4. Route only that unavailable-state dismissal through `confirm()`. On cancel, retain all receipt and UI state. On confirm, call the existing selected-receipt dismissal path.
5. Preserve the existing direct `COMPLETE` action and its label, hint, selected clear, and no-new-confirmation behavior.
6. When unavailable without a held receipt, use concise truthful body copy that does not assert receipt existence; do not add a dismissal control.
7. Do not refactor the receipt loader, library, status function, storage format, or multiple-receipt model.

The signed-out surface may remain scoped to the current displayed receipt. No receipt indexing, selection, navigation, next-receipt presentation, or multi-receipt UX is authorized.

### Copy authority

**A. Exact confirmation wording may be safely authored during implementation.** A separate UX/copy approval is not required before the repair, but code review must enforce this semantic content:

- status is currently unknown;
- confirming removes this device's recovery receipt for the displayed operation;
- dismissal does not cancel deletion;
- without the receipt, this device may no longer be able to check that operation's status.

The no-loaded-receipt unavailable body may also be authored during implementation as one concise sentence, provided it does not claim a receipt exists or claim deletion failed/completed. No broader deletion prose or copy pass is authorized.

## Minimum Test Contract

Extend the focused screen test surface, preferably `src/screens/__tests__/SignInScreen.test.tsx`; retain the existing library and `confirm()` helper tests. Four behavioral tests are the minimum sensible grouping:

1. **Loaded receipt, outage, retry, and recovery:** initial loaded receipt plus failed status shows unavailable body, `Check status`, and targeted dismiss; retry calls the existing load/status path; a deferred retry shows disabled/busy plus `Checking…`; a repeated failure retains the receipt and unavailable state; a later success clears unavailable presentation and shows the real status.
2. **Confirmation and selected clear:** cancel leaves the card/receipt and never calls clear; confirm calls clear once with the exact displayed receipt, then clears local UI. The existing receipt-library test continues to prove that this selected clear leaves another operation's receipt intact.
3. **`COMPLETE` non-regression:** `Dismiss confirmation` keeps its existing action, accessible label/hint, and direct selected-receipt clear; the new unavailable confirmation is not applied to `COMPLETE`.
4. **No loaded receipt:** a receipt-load rejection shows retry but no targeted dismiss and no false “has a receipt” claim; retry-to-no-receipt clears the unavailable card, makes no status call, and never calls selected or clear-all deletion.

These four tests cover the ten requested assertions without creating ten independent tests. Existing `src/lib/__tests__/accountDeletionReceipt.test.ts` remains the authority that selected clear does not delete other operation receipts. Existing `src/lib/__tests__/confirm.test.ts` remains the authority for native/web confirm mechanics and fail-closed cancellation.

## Live Acceptance

This is a JS/TS-only candidate and introduces no native module, Expo configuration, entitlement, permission, privacy manifest, scheme, asset, Pod, or build-setting change. It can use B2's already-approved exact-JS-SHA development-shell path if the final candidate independently satisfies B2's native fingerprint and provenance gates.

Required focused live checks, using a safe local/mock fixture or an already existing non-production receipt:

1. loaded receipt plus controlled status failure shows truthful unavailable copy, `Check status` first, and confirmed dismissal second;
2. while retry is in flight, the button is disabled/busy and reads `Checking…`;
3. recovery shows the real returned status without remounting;
4. cancellation preserves the receipt/card;
5. confirmation copy states local capability loss and no cancellation; confirming clears only the disposable displayed receipt;
6. the no-loaded-receipt edge is covered deterministically by the focused component test and may be live-proven only if an existing safe harness can trigger it.

Do not create or delete a real production account to prove this UI. Do not mutate production Supabase. If a safe fixture cannot be prepared, stop live receipt testing and rely on the pre-native focused tests rather than manufacturing destructive state.

**NATIVE BUILD REQUIRED: NO.** This micro-delta can share Prompt B's B-5 development-shell acceptance and the same final native/TestFlight acceptance; it creates no additional build requirement.

## B2 Stop-Condition Decision

**DOES FABLE B-UX-007 CONSTITUTE SUFFICIENT NEW EVIDENCE TO LIFT THE STOP CONDITION FOR THIS EXACT CLIENT DELTA? YES.**

The evidence is sufficient because direct source confirms a high-severity, user-invited loss of a local recovery capability during ambiguity, and the repair is one production file using two existing operations and one existing helper.

**AUTHORIZED:**

- `src/screens/SignInScreen.tsx` unavailable-receipt presentation and actions only;
- reuse of `refreshDeletionStatus()`;
- unavailable-state busy/disabled `Check status`;
- receipt-object gating of targeted dismissal;
- `confirm()` around unavailable-state selected-receipt dismissal;
- concise truthful no-loaded-receipt unavailable copy;
- focused `SignInScreen` tests and the safe live UI checks above.

**NOT AUTHORIZED:**

- `src/lib/accountDeletionReceipt.ts` semantics or format;
- `src/lib/confirm.ts` behavior;
- deletion backend/functions/workers/status enum/request/response;
- migrations, database, grants, RLS, Storage, buckets, policies, account fences, review/audit/terminal evidence;
- receipt indexing, selection, navigation, discovery architecture, SecureStore design, or multi-receipt UX;
- `COMPLETE` dismissal redesign;
- authentication/session changes;
- production deletion fixtures or any real destructive account deletion;
- any other product file.

If implementation evidence requires any item in the “NOT AUTHORIZED” list, stop and return to scope adjudication.

## Final Scope Verdict

**A. INCLUDE IN PROMPT B.**

All inclusion thresholds are met:

- Fable evidence, strengthened by direct source, proves a material recovery-capability safety defect.
- The dependency-closed production delta is one additional client file.
- It changes neither deletion lifecycle semantics nor backend, receipt-format, storage-architecture, or security contracts.
- It naturally joins B2's existing `B2-PN08` receipt-preservation group and B-5 safe receipt UI acceptance.
- Keeping it separate would duplicate ownership, verification, rollback context, and final acceptance while preserving no meaningful isolation benefit.
- The blast radius and verification cost remain bounded: four focused component tests, existing helper/library tests, and one safe live UI flow.
- The repair does not destabilize the B2 minimum cut because it introduces no backend dependency and no new native build.

### Prompt-B client scope update

- **OLD B2 CLIENT FILE COUNT:** 7
- **NEW B2 CLIENT FILE COUNT:** 8
- **ADDED FILE:** `src/screens/SignInScreen.tsx`

The new count is eight because `SignInScreen.tsx` becomes the eighth changed production file. `src/lib/confirm.ts` and `src/lib/accountDeletionReceipt.ts` are reused/verified but remain unchanged and therefore do not increase the production-file count.

This is dependency-closed because the screen already owns the full retry lifecycle and selected receipt state, the library already separates status read from selected receipt clear, and the shared confirmation helper already supplies the only new control boundary. The existing Prompt-B receipt-preservation test and live acceptance lanes cover the safety invariant. No lifecycle, library, backend, storage, migration, or native dependency is needed.

## Implementation Micro-Contract

```text
OWNER
Prompt B B-3 React Native/TypeScript client writer; same independent B-4/B-5
review and acceptance owners already assigned by B2.

EXACT PRODUCT FILES
MODIFY ONLY src/screens/SignInScreen.tsx.
Reuse confirm from src/lib/confirm.ts without modifying that file.
Do not modify src/lib/accountDeletionReceipt.ts.

EXACT BEHAVIOR DELTA
When deletionStatusUnavailable is true, unavailable presentation wins over any
retained nonterminal status. Always offer Check status first, wired to existing
refreshDeletionStatus(), with checkingDeletionStatus disabled/busy state and
Checking… label. Offer Dismiss unavailable receipt only when deletionReceipt is
non-null. Before that unavailable-state selected clear, await confirm(); cancel
preserves all state, confirm calls the existing selected-receipt dismissal.
When no receipt object is held, show concise unavailable copy that does not
claim receipt existence and show no targeted dismiss.

PRESERVE
Existing status read, endpoint/payload, status enum, receipt persistence/format/
index, selected-only clear, SecureStore design, all status meanings, COMPLETE
copy/announcement/direct Dismiss confirmation behavior, auth/session behavior,
and all other SignIn behavior.

FORBIDDEN
Receipt-library or confirm-helper edits; backend/deletion/status/migration/
Storage/fence/review/worker changes; clear-all; multi-receipt selection or
navigation; new endpoint/payload/auth; secret/subject/operation logging or UI;
real production deletion; native/config changes; any other product file.

FOCUSED TESTS
Extend SignInScreen tests with four groups: loaded outage -> retry busy/repeated
failure/success; confirm cancel -> no clear and confirm -> exact displayed
receipt clear; COMPLETE dismissal unchanged; load failure/no receipt -> retry
only, no false receipt claim, no clear/status call. Retain existing selected-only
library test and confirm-helper tests.

LIVE PROOF
In B2 B-5, use a safe local/mock or existing non-production receipt fixture:
unavailable actions, busy Checking…, in-place recovery, cancel preservation,
truthful confirmation, and disposable selected clear. Never manufacture a
production deletion. No-receipt edge may remain deterministic component proof
unless a safe harness already exists.

NATIVE BUILD REQUIRED
NO. JS/TS only; reuse B2's compatible exact-SHA dev shell and the same final
native acceptance.

STOP CONDITIONS
Final Prompt-B base changes these source semantics; a second production file is
needed; retry requires a new request/backend contract; dismissal cannot remain
selected-only; no-receipt UI cannot be truthful; confirmation implies cancellation
or server-state change; tests fail; safe live fixture is unavailable and anyone
proposes a real production deletion; scope enters any forbidden area.
```

## Prompt-B Synthesis Input

```text
B2-R RECEIPT SCOPE DECISION: INCLUDE IN PROMPT B.

Fable B-UX-007 is sufficient new evidence to lift B2's deletion-edit stop only
for SignInScreen unavailable-receipt presentation/actions. Prompt B client
production scope changes from 7 to 8 files by adding src/screens/SignInScreen.tsx.

Implement in B-3 only:
- unavailable state takes presentation precedence;
- reuse existing refreshDeletionStatus as Check status;
- preserve checkingDeletionStatus disabled/busy + Checking…;
- show unavailable dismissal only with a held deletionReceipt;
- confirm before that selected local clear;
- no-receipt unavailable copy must not claim a receipt exists.

Do not edit accountDeletionReceipt.ts, confirm.ts, backend deletion, status
semantics, receipt format/index/storage, migrations, Storage, fences, workers, or
multi-receipt UX. COMPLETE dismissal remains unchanged.

Fold four focused SignInScreen cases into B2-PN08 and add the safe receipt action
flow to B-5. Backend re-acceptance: NO. Security re-acceptance: NO. Focused client
safety verification: YES. Live UI proof: YES with safe/mock or existing
non-production fixture only. Native build for this delta: NO.
```

## Future Retrieval

```bash
git fetch origin
git show origin/codex/solfast-prompt-b-b2r-receipt-scope-20260830:qa-reports/2026-08-30_SolFast_PromptB_B2R_ReceiptScope.md
```
