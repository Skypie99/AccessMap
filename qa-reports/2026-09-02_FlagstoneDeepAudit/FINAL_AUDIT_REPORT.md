# FLAGSTONE DEEP AUDIT — FINAL REPORT

**AUDIT_ID:** FLAGSTONE-DEEP-AUDIT-20260902 · **Completed:** 2026-09-03 · **Repo:** Skypie99/AccessMap · **Product:** Flagstone

## Verdict

**READY FOR PLANNING.**

This audit does not authorize release. It establishes what shipped, what is on `main`, what is actually true in production, and which of 45 findings are worth acting on and in what order.

---

## Source identity

| | Commit | Tree | Proof |
|---|---|---|---|
| **Submitted iOS Build 33** | `f5594171e75bc5ec92a87d0392c361601ddedfba` | `a4a5e70c` | EAS build `2f10f578-a406-4354-86fb-677480234859`, profile `testflight`, `gitCommitHash` == f5594171, FINISHED 2026-09-01T04:26Z, distribution STORE (`evidence/eas-build-identity.md`) |
| **Current main (locked base)** | `70b52a30e9fff0f7d538509b110212bb8d872391` | `847f39f6` | re-verified unchanged at session start and end |
| **Live web demo** | `ebf091c21066d39898160b1357bde0aa35bdb8bf` | `6cb842e3` | frozen branch `release/web-4.1.1-build33-openfreemap`, Vercel deployment `HMszH26wADRRDd1CqH4UkJ8kAugQ` |
| **Backend** | Supabase `kldlwszpfkdmsjrjhjym` | 71 applied migrations, last `20260830130000` | read-only catalog capture 2026-09-02 |

**The central structural fact: Build 33 is not on `main`.** They diverge at `a0bf4d04` (which was itself EAS Build 30). Build 33 carries 113 commits `main` lacks; `main` carries 5 docs/guard commits Build 33 lacks. No build has ever been cut from any commit on `main` after `a0bf4d04`. Every finding below is therefore labelled BUILD 33 / MAIN / BOTH / BACKEND, and the two release-risk judgments are kept separate.

## Models used

Claude Fable 5.1 (sessions 1–2, lanes A–K, all subagents except where noted) → Claude Opus 5 (continuation from 2026-09-03 00:00: report-journey verification, Dynamic Type control, historical assembly, FDA-033/034/036/019 adjudication, FDA-038…046, final synthesis). Read-only subagents: Sonnet 5 (J1, J2, I, H, J3), Fable 5.1 (E, FDA-036 trace, design-intent map).

## Lane completeness

| Lane | Status | Notes |
|---|---|---|
| A release/source/build truth | COMPLETE | App Store Connect live status not queried (EVIDENCE_GAP) |
| B end-to-end journeys | SUBSTANTIAL | every guest journey walked on both lineages; signed-in journeys static-only by rule |
| C premium UI | SUBSTANTIAL | 16 surface rows scored across both lineages, light + dark; Dynamic Type blocked (environment) |
| D accessibility | PARTIAL | static review complete (`evidence/laneD-static-a11y-signed-in.md`); VoiceOver and Dynamic Type not runnable here |
| E privacy/security | COMPLETE | source + full production catalog |
| F performance | PARTIAL | advisors + static; no meaningful scale data (21 flags / 5 users in production) |
| G App Store | SUBSTANTIAL | `evidence/laneG-appstore-truth-table.md` partial (agent hit a rate limit) |
| H test/CI | COMPLETE | |
| I architecture | COMPLETE | |
| J historical | SUBSTANTIAL | 140 of ~290 catalogued items verified; gaps named |
| K cross-system kill shot | COMPLETE | folded into severity calibration below |
| §29 admin flag deletion | ROOT CAUSE COMPLETE | runtime UI proof blocked (admin credentials) |

## Baseline validation

Typecheck 0 errors · ESLint 0 errors · **Jest 243 suites / 3,657 passed / 32 todo / 0 failed** · release guards PASS · expo-doctor 16/18. Full matrix and failure classification: `TEST_AND_RUNTIME_MATRIX.md`.

**The most important line in this section:** every gate above is green on a tree whose shipped sibling has a dead admin-delete button, a dead account-deletion flow, a dead moderation queue and dead photo uploads. That gap is FDA-005.

## Findings totals

45 findings (FDA-001…046, one FALSE_POSITIVE excluded) — **0 BLOCKER · 8 HIGH · 16 MEDIUM · 18 LOW · 3 NOTE**. By area: privacy/security 14 · functional 11 · release 6 · App Store 5 · UI 3 · accessibility 1.

## Top 10 findings

1. **FDA-001 (HIGH)** — `main` does not contain the submitted product code. Gates every other repair's target branch.
2. **FDA-002 (HIGH, BUILD 33)** — admin "Remove flag" calls the `delete-flag` Edge Function, which is **not deployed**. Sky's reported defect; root cause proven.
3. **FDA-003 (HIGH, BUILD 33)** — account deletion: production's `delete-account` v4 deletes the account and returns `deleted`; the Build 33 client demands `requested`, so the user is told it failed **while their account is already gone**. Apple 5.1.1(v) exposure.
4. **FDA-019 (HIGH, BUILD 33)** — signed-in photo reports fail: `prepare_flag_photo_upload` doesn't exist in production. Guests are unaffected (they have no photo control).
5. **FDA-004 (HIGH, BUILD 33)** — admin Reports queue selects `feedback.moderation_*` columns production doesn't have → 42703, queue never loads.
6. **FDA-005 (HIGH)** — nothing ties the accepted client to the production backend contract. The reason 2, 3, 4 and 19 all shipped with every gate green.
7. **FDA-020 (HIGH, BACKEND+BOTH)** — any signed-in user can permanently reject any report; `rejected` is terminal, excluded from default views, and the reporter is never notified.
8. **FDA-021 (HIGH, BACKEND)** — `users.points`, `streak_days`, `email` are client-writable on one's own row; the leaderboard is forgeable with one PATCH.
9. **FDA-042 (MEDIUM, BACKEND)** — anonymous readers receive every reporter's `user_id` with precise coordinates; the schema comment claiming flags hold no PII is false.
10. **FDA-024 (MEDIUM, BACKEND)** — account deletion leaves photos and avatars world-readable, keeps `contact_email`, and leaves the deleted user's UUID in `photo_url`.

## Premium UI / visual assessment

**Overall visual maturity: 4 / 5 on Build 33, 3.5 / 5 on main.** Full per-surface matrix: `UI_VISUAL_ACCEPTANCE.md` (16 rows, both lineages, light + dark).

The design language is real and largely delivered — this is not a generic app. Editorial headline type, a coherent Flagstone-blue accent, a genuine glass system with documented tokens, and unusually honest state copy ("Location isn't on yet. Showing the most recent flags, not ones near you."; "Your report appears on the map right away for everyone… Flagstone doesn't notify the city.").

- **Strongest surfaces:** the **anonymous Report sheet** on Build 33 (5/5 — the best surface in the app: privacy-respectful location line with a *Show* link instead of raw coordinates, a lock-badged anonymity banner, plain-language severity helper, and expectation-setting copy most products never write); Build 33's **Legend** and **Filter** sheets (5/5, expanded presentation using the full height); **Flag Details** in both themes; **Home** on both lineages.
- **Weakest surfaces:** main's **Explore chrome** (3/5 — six floating pieces competing; the locate/+/− circles are opaque white against an otherwise glass system; cluster discs and teardrop pins are two visual languages for one concept); main's **Filter panel** (3/5 — a drop-down card that clips its own LAYERS section); main's **Legend** (stops above the tab bar instead of using the height Build 33 gives it); the **Task tools** sheet (3/5 — a full sheet for a single row); the **sign-in-required alert** (3/5 — correct gate, dead end, no Sign in action).
- **Material consistency:** Build 33 unified the map controls into the glass system; main did not. The one material inconsistency Build 33 keeps deliberately is the opaque white map callout.
- **Navigation:** Build 33's grounded tab capsule with a subtle blue selected chip is exactly the stated intent — it hugs the bottom and does not read as a floating island. Main still uses the older bordered bar.
- **Sheets/modals:** the single biggest lineage difference. Build 33 introduced `Sheet presentation="expanded"` and opted 17 surfaces into it; main has none. That one change is why Build 33's Legend, Filter, Nearby and search sheets all feel finished and main's feel truncated.
- **Light/dark:** both lineages render a genuine dark design (deep navy surfaces, adjusted inks, retired shadows), not an inversion. The dark map, dark glass chrome and dark Details sheet all hold up.
- **Dynamic Type: NOT ASSESSED.** See Evidence gaps — this is an environment failure, not a pass and not a fail.
- **Top visual findings:** FDA-039, FDA-034, FDA-033, FDA-036.

## Historical reconciliation

140 historical items verified against current code and production: **59 fixed · 31 still open · 29 cannot-verify · 21 obsolete/intentional · 0 regressed**. Full tables: `HISTORICAL_RECONCILIATION.md`.

The dominant shape is `FIXED(B33) / STILL_OPEN(main)` — a direct consequence of FDA-001. Long-open items now carrying FDA IDs: S14/P6 → FDA-040 (no password reset), S17 → FDA-042, S4 → FDA-024, S13 → FDA-004, DFS#2 → FDA-041, MR-3 → FDA-045, §0.1 → FDA-007, U1 → FDA-044, MR-4 → FDA-016, P3 → FDA-027.

## Release-risk synthesis

### A. Submitted Build 33 (what Apple has)

| Dimension | Rating |
|---|---|
| Apple / review risk | **MODERATE** — the deletion flow (5.1.1(v)) reports failure while succeeding; a reviewer attaching a photo to a report hits a hard failure; the demo account is unverified |
| User trust / harm | MODERATE — admin takedown and moderation queue are inert; deletion misreports |
| Privacy | MODERATE — anon `user_id` + coordinates; incomplete erasure |
| Security | LOW–MODERATE — no exploitable break found; forgeable points and open reject are integrity issues |
| Accessibility | **INSUFFICIENT EVIDENCE** — static review is good, Dynamic Type and VoiceOver unproven |
| Product correctness | MODERATE — four client→backend contract breaks |
| Moderation / reputation | HIGH — the moderation queue does not load and reject is ungated |
| Reliability | LOW |
| Performance | **INSUFFICIENT EVIDENCE** (21 flags in production) |
| Premium UI/UX | **CLEAR** — the strongest dimension |

**No true release blocker.** The guest journey a reviewer can complete without credentials — browse, search, open a flag, report anonymously — works end to end and looks excellent.

### B. Current main (what a next build would ship)

| Dimension | Rating |
|---|---|
| Apple / review risk | LOW–MODERATE — no moderation queue at all; raw error text on the map |
| User trust / harm | MODERATE — Reject on every Tasks card for every user |
| Privacy | MODERATE — same backend findings |
| Security | LOW–MODERATE — same |
| Accessibility | **INSUFFICIENT EVIDENCE**, and main lacks every Build 33 XXXL repair |
| Product correctness | LOW — main's older client matches production, so 002/003/004/019 do not apply |
| Moderation | MODERATE |
| Reliability | LOW |
| Premium UI/UX | MODERATE — visibly behind Build 33 (sheets, tab bar, map chrome) |
| Architecture | MODERATE — migrations no longer reproduce production (FDA-027) |

**Main is functionally safer against today's backend and visually behind.** That asymmetry is the whole convergence problem.

### Classification

- **True release blockers:** none.
- **Recommended pre-release fixes:** FDA-006, 007, 025 (Sky-only credentials); FDA-003; FDA-019; FDA-002/004 if admin moderation must work at launch.
- **First post-release fixes:** FDA-020, 021, 042, 024, 041, 040, 005, 035.
- **Non-blocking quality debt:** FDA-033, 034, 036, 038, 039, 043, 045, and the sub-4 UI rows.
- **Architecture debt:** FDA-027, 037, 011, 009, 012, 015, 017, 018.
- **Optional polish:** the remaining NOTE items.

## Admin flag deletion defect (§29)

**ADMIN_FLAG_DELETE_REPRODUCED:** PARTIAL — mechanism proven from source + production catalog; the UI reproduction needs an admin sign-in the audit may not perform (production has exactly 1 admin: Sky's own account).

**ADMIN_FLAG_DELETE_FINDING_ID:** FDA-002.

**ROOT_CAUSE:** Build 33 replaced the direct Data-API delete with `supabase.functions.invoke('delete-flag')` (`flags.ts:1442-1447`). That Edge Function is **not deployed** (production has only `send-push-notification`, `notify-flag-status`, `delete-account`), and the three RPCs it needs — `account_deletion_prepare_flag_delete`, `account_deletion_finalize_flag_delete`, `account_deletion_storage_exact_object` — do not exist in `pg_proc`. An unauthenticated probe of `/functions/v1/delete-flag` returns 404 `NOT_FOUND`, identical to a deliberately bogus slug. So the admin taps Remove, confirms, and the invoke fails → `Alert.alert('Error', …)` → the row is untouched. **CONFIDENCE: HIGH.**

**AFFECTED_STATE:** SUBMITTED_BUILD_33 and WEB. **Not** CURRENT_MAIN.

**ADMIN_DELETE_DB_AUTHORIZATION: YES.** Production still has the permissive `admin delete any flag` DELETE policy, `authenticated` holds table DELETE, `users.is_admin` is SELECT-grantable so the policy's subselect resolves, no DELETE trigger exists, and every FK to `flags` is ON DELETE CASCADE (`point_events` SET NULL). Main's direct-DELETE path would work today. **The old 42501 story is dead** — that was fixed by the 2026-08-18 `is_admin` column grant. Anyone re-diagnosing this from stale comments will reach the wrong answer.

**UI conclusion:** the interaction itself is sound — `confirm()` with "This permanently deletes the flag and cannot be undone", medium haptic, a synchronous per-flag re-entrancy guard (F18), destructive styling, and a deliberate comment explaining why the card must not be `accessible` so VoiceOver can reach the buttons. The defect is purely the backend contract.

**WHY TESTS MISSED IT:** `EXISTING_TEST_COVERAGE` — `deleteFlag()` is unit-tested against a fully mocked Supabase client on both lineages (including the RLS-refusal "0 rows back" shape); `AdminScreen` has **no test of any kind**; Build 33's guard tests assert only that the source *text* contains `functions.invoke('delete-flag'`; the one real pgTAP proof of flags-DELETE RLS is never run by CI. **DO_EXISTING_TESTS_PROVE_REAL_DELETE: NO** — no test can observe whether an Edge Function is deployed or a migration applied.

**RECOMMENDED_FIX (smallest evidence-backed):** either (a) point `deleteFlag` back at the direct `.delete().eq('id',…).select('id')` path main uses, keeping the SR-050 photo sweep — SMALL, works against production today; or (b) deploy `delete-flag` plus its three RPCs and the D1F4R3-FIX2 migration — MEDIUM–LARGE, preserves the Storage-first takedown ordering that FIX2 was written to enforce. **Files:** `src/lib/flags.ts`, `src/lib/adminReports.ts`, `supabase/functions/delete-flag/`, `supabase/nonmanaged/proposed/20260828020000_*.sql`. DB change: (a) NO / (b) YES. Migration: (a) NO / (b) YES. UI change: NO. Test change: YES. Simulator validation: YES. Backend validation: (a) NO / (b) YES. **Repair size:** SMALL or MEDIUM–LARGE by option. **Risk:** option (a) re-opens the ordering FIX2 closed; option (b) applies unmanaged migrations to production.

**ADMIN_FLAG_DELETE_ACCEPTANCE_PLAN:** 1. Admin signs in through the real app. 2. A disposable test flag exists. 3. Admin opens Admin → flag list. 4. Deletes that exact flag via the visible control. 5. Confirmation appears and is honoured. 6. Backend confirms the row is gone (or reaches the intended deleted state). 7. It disappears from the list. 8. Relaunch does not restore it. 9. Other flags untouched. 10. A non-admin cannot perform the same deletion (expect refusal, not silent success). 11. A forced failure surfaces visible, actionable feedback — never a silent success. 12. VoiceOver reaches Remove and Dismiss, and the row's removal is announced.

**Historical relation:** SR-050 (takedown gap, applied 2026-07-29) and the 42501 saga (fixed 2026-08-18/19) are **RELATED_BUT_DISTINCT** and both closed. D1F4R3-FIX2 is **HISTORICAL_STILL_OPEN** — written, never applied, but shipped in the client.

## Risk summaries

**App Store:** deletion misreport (5.1.1(v)), photo-report failure for signed-in users, unverified demo account, policy claims exceeding behaviour (FDA-030/045), inert moderation controls (1.2). **Accessibility:** INSUFFICIENT EVIDENCE — the single largest hole in this audit. **Privacy/security:** anon `user_id` + coordinates, incomplete erasure, forgeable reputation, two credential literals awaiting Sky-only rotation. **Functional:** four Build-33 contract breaks, no password reset, notification preferences that do nothing. **Performance/reliability:** insufficient evidence at 21 flags; no runtime defect observed. **Test confidence:** LOW where it matters — every destructive user path is untested at the UI level and no gate can see the backend contract.

## Evidence gaps

1. **Dynamic Type (XXXL)** — unprovable here; Apple's own Settings app failed to scale (`evidence/dynamic-type-environment-gap.md`). Needs a real device.
2. **VoiceOver** — not runnable headless.
3. **Every signed-in journey** — the audit never creates accounts or enters passwords. Covers admin delete, account deletion, comments, verify/resolve, photo upload, Profile, Watched, Achievements.
4. **Anonymous report submission** — walked to the Submit button and cancelled; submitting writes to production.
5. **App Store Connect state** — not queried.
6. **Web demo** — dark mode, full-map and detail checks incomplete (browser pane became unresponsive).
7. **~150 historical items** un-reconciled (both J3 passes hit rate limits); the highest-value unread files are named in `HISTORICAL_RECONCILIATION.md`.
8. **Lane G truth table** partial (agent rate-limited).
9. **Performance at scale** — impossible with 21 flags.

## Planning handoff

`PLANNING_HANDOFF.md` — ordering, five safe parallel clusters, four dependency chains, the high-risk set, and quick wins. The gating decision is FDA-001: **which lineage the next build is cut from.** Nothing else can be sequenced until that is answered.
