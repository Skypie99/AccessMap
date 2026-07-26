# /new-window snapshot — accessmap — 2026-06-03

## 1. CONTEXT SNAPSHOT
Final pre-tester pass for AccessMap (Expo/RN + Supabase crowdsourced accessibility app). Gary ran the QA consolidation (merge three audit branches → main), then a Morgan-coordinated pre-tester **security gate that Sky applied to the live Supabase DB via Cowork**, with every live change independently verified read-only. main was also pushed to GitHub for the first time. Outcome: the app is security-gate-complete and build-ready; only operational/Sky-side steps remain before testers.

## 2. KEY ACTIONS
- Merged `qa-peter` (perf) + `qa-alex` (a11y, 2 HIGH fixes) → main (`qa-merge` → `db7d1c6`, tag `qa-merge-2026-06-02`); skipped stale `qa-steve` (already in main).
- Verified 1564 tests/0 fail, lint 0 errors, iOS+Android bundles; added MapScreen pill responsive fix.
- Redacted a hardcoded reviewer password; fixed `eas.json` duplicate profiles; **pushed main → public `origin`**.
- Applied (Sky via Cowork) + verified: drop duplicate points trigger · F3 flag_photos guard · F2 function hardening · webhook secret → Vault (RPC + `verify_jwt=false`, 200 ok) · `is_admin` bug fix via `admin_role` migration.
- Created reviewer account `reviewer@accessmap.com` (is_admin=false).
- Committed Edge Function (Vault-RPC auth) + `2026-06-03_verify_webhook_secret.sql` migration (`45f7964`).

## 3. OUTCOMES
- main `45f7964`, **synced with origin** (public `Skypie99/AccessMap`).
- Live DB hardened + correct: no hardcoded webhook secrets, no double-points, reject/reopen work, flag_photos insert scoped, trigger fns locked to owner.
- Repo files added/changed: `supabase/functions/notify-flag-status/index.ts` + `config.toml`, `supabase/migrations/2026-06-03_verify_webhook_secret.sql`, `eas.json` (dedup), `MapScreen.tsx`, `src/__tests__/qaMergeConsolidation.test.ts`.
- Reports written: Final_QA_Merge_Report, SECURITY_GATE_RUNBOOK, Dana/Steve/Alex/Rory gate reports, Dana webhook + is_admin proposals.

## 4. DECISIONS MADE
- `[QA-MERGE-PETER-ALEX]` Peter+Alex merged to main (db7d1c6, tag qa-merge-2026-06-02); qa-steve skipped.
- `[MAIN-PUSHED-TO-ORIGIN]` main pushed to public origin (first time); supersedes prior "local only" status.
- `[SECURITY-GATE-COMPLETE]` full security gate applied live + verified.
- `[WEBHOOK-VAULT-AUTH]` webhook auth now Vault-RPC; config.toml verify_jwt=false; env var irrelevant.
- `[ADMIN-ROLE-MIGRATION-APPLIED]` admin_role migration applied live; fixed reject/reopen is_admin bug.
- `[POINTS-VALUES-DRIFT]` live awards 10/3/15/7; docs stale — Sky decision pending.

## 5. NEXT ACTIONS
1. **Sky** — EAS TestFlight build + submit (local CLI: `npx eas-cli login` → `build … --profile testflight` → `submit … --profile production --latest`).
2. **Sky/Alex** — on-device VoiceOver/TalkBack pass on the 2 HIGH a11y fixes (script in `2026-06-02_Alex_PreTester_A11y_Gate.md`).
3. **Sky** — rotate reviewer password before App Store; creds only in App Store Connect Demo Account.
4. **Sky** — point-value drift decision.
5. **Rory** — BLOCK2 submit-workflow fix before arming GitHub releases (off critical path).

## 6. RISKS
- **Points-value drift** (live 10/3/15/7 vs docs 5/2/10/5) — Sky must pick canonical.
- **Reviewer password exposure** (old in public git history; new printed in chat) — low-risk/internal, rotate before App Store.
- **Schema drift** — live functions/triggers diverge from `supabase/schema.sql`; trust live catalog (`get_advisors`/`pg_*`) over the repo schema for backend reasoning.

---

## DECISIONS FOR SKY
1. **Point values:** accept the live `10/3/15/7` (verified/resolved reporter, actor) as canonical and update `schema.sql` + `CLAUDE.md`, OR revert the live trigger to the documented `5/2/10/5`?
2. **Reviewer password:** rotate it (and the old git-history one is dead) before App Store submission — confirm when done so it can be marked closed.
3. (Operational, not blocking) Kick the EAS build whenever ready — all gates are green.
