# Build 33 backend-contract probe (PRODUCTION, non-destructive)

Date: 2026-09-02 ~18:20 PDT. Project: kldlwszpfkdmsjrjhjym. Method: unauthenticated `curl -X POST … -d '{}'` to `/functions/v1/<slug>` (no auth header, no user data). A deployed function answers 401 (JWT gate) or a function-specific status; an undeployed slug answers 404 `{"code":"NOT_FOUND","message":"Requested function was not found"}` — identical to a deliberately bogus slug.

| slug | HTTP | body (truncated) | deployed? |
|---|---|---|---|
| delete-flag | 404 | {"code":"NOT_FOUND","message":"Requested function was not found"} | NO |
| account-deletion-status | 404 | NOT_FOUND | NO |
| account-deletion-review | 404 | NOT_FOUND | NO |
| account-deletion-worker | 404 | NOT_FOUND | NO |
| delete-account | 401 | {"code":"UNAUTHORIZED_NO_AUTH_HEADER",…} | YES (v4, updated 2026-05-31) |
| notify-flag-status | 401 | Unauthorized | YES (v8) |
| does-not-exist-probe (control) | 404 | NOT_FOUND | — |

RPC probe caveat: `POST /rest/v1/rpc/<fn>` with an empty body returns 404 PGRST202 for BOTH missing functions and existing functions whose signature needs parameters, so the RPC probe is inconclusive on its own. Function existence is instead proven by the read-only `pg_proc` listing in db-proof-flags-delete-authorization.md: production has NO `account_deletion_*` functions (the delete-flag route needs `account_deletion_prepare_flag_delete`, `account_deletion_finalize_flag_delete`, `account_deletion_storage_exact_object`).

## Build 33 client calls that depend on undeployed backend

| client file (Build 33) | call | production state | consequence |
|---|---|---|---|
| src/lib/flags.ts:1447 `deleteFlag` | functions.invoke('delete-flag') | 404 | admin Remove flag + owner delete fail (FDA-002) |
| src/lib/account.ts:19 `deleteAccount` | functions.invoke('delete-account', {operationId, receiptSecret}) then requires `data.status === 'requested'` | deployed v4 is the pre-D1 handler (source captured separately) | contract mismatch — see FDA-003 |
| src/lib/accountDeletionReceipt.ts:88 `getAccountDeletionStatus` | functions.invoke('account-deletion-status') | 404 | status surface always errors |
| src/lib/adminReports.ts | `.from('feedback')` ×4 | table exists; MOD1 column/RPC additions NOT applied | verified separately (feedback columns) |

## Deployed `delete-account` v4 (source read via management API, read-only)

Behaviour: verify_jwt=true; POST only; derives user from bearer; ignores the request body; step 1 `UPDATE public.flags SET user_id = NULL WHERE user_id = <uid>` via service role; step 2 `auth.admin.deleteUser(uid)`; returns `200 {status:'deleted'}` or `500 {status:'error'}`.
Build 33 client expectation: `202 {status:'requested', requestedAt}` (D1F4 Transaction A). Mismatch → FDA-003.
