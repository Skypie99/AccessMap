# Flagstone Phase 04B (FDA-003 account-deletion client compatibility) Report — 2026-09-21

Full packet: `qa-reports/phase04/04B-20260921T092711Z/HANDOFF.md` (evidence, copy ledger, manifest proposal).

## 1. DECISIONS FOR SKY

None blocks the local candidate. Full What/Why/Impact for each is in HANDOFF §8.

- [ ] **D-04B-1 Delete-dialog copy** — the dialog still says deletion is "asynchronous" and removes "associated content". Deployed v4 is synchronous and, per FDA-024, anonymises rather than removes some content.
  - Approve replacement copy in a separate copy/privacy pass and route the "associated content" claim to Phase 05 / FDA-024 (Recommended)
  - Leave until Phase 05
- [ ] **D-04B-2 Resolving a lost reply with `auth.getUser()` → `user_not_found`**
  - Decide in Phase 05; not implemented because it would infer success from an indirect signal (Recommended)
  - Keep the truthful "can't confirm" state permanently
- [ ] **D-04B-3 New 04B copy** (success, unconfirmed reasons, terminal card)
  - Ratify as written (Recommended)
  - Edit the wording
- [ ] **D-04B-4 Manifest option at integration** (04A-owned file; shared guard pins `hard`)
  - Option B: `unreachable` plus a guard update in the integration commit, following the FDA-004 precedent (Recommended)
  - Option A: text-only update

## 2. BLOCKERS / FAIL_FAST

None. No repair attempt failed; no stop condition was hit.

## 3. Summary

The shipped client told people a completed deletion had failed and never signed them out. The cause was that deployed `delete-account` v4 answers `status: 'deleted'`, while the client demanded the never-deployed async `requested` shape. Now:
- A validated `deleted` reply is a confirmed success: the device signs out, the receipt is cleared, and the success is announced once.
- Every other reply is a typed unconfirmed outcome: never success, never a sign-out, never retried.
- One press sends at most one request.
- The absent async status route is never called.

Gates: full Jest 298/298 suites (4449 passed, 0 failed); tsc clean; lint 0 errors; the Phase 03C 208/208 and 03B replays are identical to the committed evidence. Mutation checks: 12/12 killed.

## 4. What Shipped (local commits only; not pushed or merged)

- `a1ecdb9` — lib: `account.ts` reply classification, single-flight, terminal receipt, cleanup; capability-gated status read; lib tests
- `0a8af34` — screens: ProfileScreen and SignInScreen flows, SignIn tests, new `ProfileScreen.deletion.test.tsx`
- report commit — this file and the packet

## 5. What's Proposed (Not Applied)

| Proposal | File path | What it does | Impact | Rollback documented? |
|---|---|---|---|---|
| Manifest delta | `qa-reports/phase04/04B-20260921T092711Z/MANIFEST_DELTA_PROPOSAL.json` | Updates the `account-deletion` surface text; optional `unreachable` plus a guard edit | Metadata only; line anchors unchanged | Yes: revert the integration commit |

## 6. Findings by Domain

### Security / Privacy
- 🟢 No logging added; a test proves no receipt secret, operation id or account id reaches console output.
- 🟢 Client-only diff: Phase 03C C-1…C-10 are untouched and the anon 85/85 suite replays identically.

### Test confidence
- 🟢 FDA-014 (no screen-level test on destructive paths) is now partly closed for account deletion.
- 🟡 No device or runtime proof. Running the app would contact real Supabase, so this is deferred to a separately authorized disposable-account test.
