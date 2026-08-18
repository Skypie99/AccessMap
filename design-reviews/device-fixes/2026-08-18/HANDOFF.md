# DEVICE-PASS FIXES — HANDOFF (read me first)

**Train:** Device-pass fixes — the keyboard class + the admin delete chain
**Phase A (Fable 5, diagnose, read-only):** ✅ COMPLETE 2026-08-18. Everything below is banked.
**Phase B (Opus 5, fix):** ✅ COMPLETE 2026-08-18 — see `04_CLOSEOUT.md`. Branch `fix/device-keyboard-admin-2026-08-18`, 3 commits, **not merged**. Gates green (3032 tests, typecheck clean, lint 0 errors). Phase A's diagnosis was independently re-verified before execution and held on every load-bearing claim.

**WHAT IS LEFT FOR SKY:** apply `03_SQL_ARTIFACTS.md` — **A1 first** (the `is_admin` column grant; this is what unblocks the junk-data delete), then **A2** (make her account admin) — then merge the branch. A3 turned out unnecessary: both admin delete policies already exist live.
**Repo state at diagnosis:** main @ `68fce6b` (d2a0991 is an ancestor — the feedback keyboard fix is on main). Phase A made **zero** code changes, zero commits, zero DB writes; live DB was read with SELECT-only queries (one grant-check ran inside a `begin…rollback` envelope).

---

## The two verdicts, plainly

**BUG B — "Could not delete flag: You don't have permission" → WORLD (b): owner-delete is broken live for EVERY authenticated user.**
Not an ownership mix-up. The `admin delete any flag` RLS policy's qual subselects `public.users.is_admin`, RLS quals evaluate with the *caller's* privileges, and the `authenticated` role has **no SELECT grant on the `is_admin` column** (the 2026-05-27 email-privacy migration replaced table-wide SELECT with a fixed column list written *before* `is_admin` existed). So every authenticated `DELETE FROM flags` — including a true owner deleting their own flag — errors with `42501 permission denied for table users` before RLS ever filters rows. `errorMessage()` maps 42501 to the exact copy Sky saw. Proven live (see 01 §B).
Side facts: the BUMBAKLOT flag belongs to `ranchin2023@gmail.com` (uid `7fe628a7…`), *not* `skylerhalisky@gmail.com` (uid `8f99f7e0…`) — "Reported by: You" is healthy uid-equality (`FlagDetailModal.tsx:513`), so the device was signed in as ranchin2023 and the delete failed anyway. The same missing grant also breaks: admin flag delete, owner **photo** delete + admin photo delete on Storage (both storage policies since the C-12 apply 2026-07-29 / admin_role apply), and the `useIsAdmin()` gate (it can never read the column → Admin renders for nobody, even after an is_admin=true grant).
**The whole chain is fixed by ONE Sky-applied statement** — Artifact A1 in `02_FIXPLAN.md` — plus Artifact A2 (is_admin=true for Sky's account). **Artifact "admin delete policy" is NOT needed: it already exists live** on both `flags` and `storage.objects` (banked evidence in 01 §C).

**BUG A — the keyboard class:** the house pattern is the **FeedbackModal Bug-3 stack** (`d2a0991`, pinned by `feedbackKeyboard.guard.test.ts`): KAV (iOS `padding`) + the **percentage cap ON the KAV** (G6/SR-099: `%` maxHeight only resolves against the definite-height backdrop) + keyboard-up bottom-inset reclaim + scrollable middle with pinned header/actions. Census of all **17 input-hosting surfaces**: 7 PASS, **10 FAIL** (2 device-confirmed by Sky's screenshots: AddressSearchModal, MyWatchedModal). The two prior guards missed this because (1) `keyboardAvoidance.guard.test.ts` is a hand allowlist asserting only *KAV presence* — AddressSearch "passed" while failing on hardware for want of the cap, and (2) surfaces whose input lives in the shared `SearchInputRow`/`Input` components never matched a `TextInput` grep — MyWatchedModal was invisible to the census. The fix plan closes both holes with a **source-derived census guard** (the `dismissalStandard.guard.test.ts` idiom).

---

## Files in this packet

- `01_DIAGNOSIS.md` — full evidence: Bug B causal chain with live query results; the admin chain end-to-end; the Bug A census table with per-surface findings.
- `02_FIXPLAN.md` — Phase B execution plan: commit order, per-item root cause → fix → guard; the class-guard spec; the fenced SKY-APPLIED DB artifacts (A1 grant, A2 admin flag; A3 explicitly not needed); new device rows for Sky's checklist.

## Phase B ground rules (from the train prompt)

- **ONE-WRITER LAW:** the Submission Sprint Cowork session may be live on this repo. Before ANY commit, confirm no other session is mid-write (check `git status` for fresh churn, ask Sky if in doubt). If the sprint is active, wait or coordinate through Sky.
- Pin the measured gate baseline first (`npm test` ≈2,950, `npm run typecheck`, `npm run lint`) — one commit per fix-plan item — gates green at every commit — verify-first — no scope smuggling — user-visible copy changes are SKY-WORDS-REQUIRED (the sweep should add none) — STOP on the branch, Sky merges.
- Jest-in-worktree gotcha: `npm test` from a `.claude/worktrees/` path silently finds 0 tests — run from the repo root or override `--testPathIgnorePatterns`.
- ZERO agent-applied migrations or live DB writes — the artifacts are Sky's to apply (her per-statement yes, in the Sprint session's Phase 4 or the Supabase dashboard).
