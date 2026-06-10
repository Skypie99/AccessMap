# AccessMap — Decisions Log

Structural decisions, append-only. New entries at the top. Do NOT re-litigate entries without Sky approval — conflicts with logged decisions are BLOCKERs (VL Coherence Check 1).

---

## 2026-06-09 — Re-Sweep Audit Branch Ready for Sky Review [RESWEEP-2026-06-09]
Second full-app audit on `audit/accessmap-resweep-2026-06-09` (17 commits off `main @ 3c0420d`, NOT merged — Sky's gate). 16 hunt units (6 adversarial over the F1–F27 fix diff + 10 fresh lenses) + per-finding adversarial refutation + a fresh-context second sweep over the run's own diff. 66 candidates → 4 killed → 57 distinct verified findings: **43 fixed (F28–F65)**, 15 verified-not-fixed (5 med/10 low, fix shapes documented), 9 propose-only. Headlines fixed: PNG screenshot uploads were deterministically rejected by a false-positive EXIF verify gate (rewritten structurally — needs Sky/Jordan sign-off, commit `57ba56d`); tile cache resurrected after sign-out; push opt-out could silently fail server-side; offline sign-out silently failed (and supabase-js can't do local-scope sign-out offline — surfaced honestly); stale-snapshot status writes silently reverted other users' resolutions (now compare-and-set + proposed DB trigger `2026-06-09_status_transition_guard_PROPOSED.sql`, NOT applied); all web failure feedback was silent (`Alert.alert` no-op) — new `notify()` helper; the test suite itself was flaky on clean main (order-dependent virtual mock, fixed first). All 8 prior refutations re-confirmed. Gates: typecheck 0 · 96 suites / 1,585 passed (+17 locking tests) · lint 0 errors / 169 warnings (= baseline). Report: `qa-reports/summaries/2026-06-09_AccessMap_ReSweep_Report.md`. Review: `git diff main..audit/accessmap-resweep-2026-06-09`. — 2026-06-09

## 2026-06-07 — Phase-4 Wins Banked (Pre-Build Step A) [PHASE4-WINS]
Orphaned `src/lib/onboarding.ts` + companion test removed (zero production imports confirmed; superseded by `onboardingState.ts` after F5 fix). Lint warnings cleared: 232 → 169 (63 cleared): all `@typescript-eslint/array-type` (Array<T>→T[], ReadonlyArray<T>→readonly T[]), all `react/no-unescaped-entities` apostrophes, `import/no-duplicates` merged splits in PlatformMap files, `react/display-name` named TabIcon in RootNavigator, stale `eslint-disable` comments removed. Remaining 169 are all intentional patterns (import/first hoisting, no-explicit-any catch, no-require-imports tests, react-hooks/exhaustive-deps logic, __DEV__ console instrumentation). Post-4b SHA: `c2ec499`. typecheck 0 · 96 suites / 1568 tests · lint 0 errors. — 2026-06-07

## 2026-06-07 — Deep-Audit Branch Merged to Main (Pre-Build Step A) [DEEP-AUDIT-MERGED]
`audit/accessmap-deep-2026-06-07` (15 commits including a pre-merge doc/state capture) merged --no-ff into main on Sky's explicit authorization (authority order: Sky's intent > Constitution Art. 1 "only Sky merges main"). Post-merge SHA: **`c6298df`**, pushed to `origin/main`. 27 verified fixes (F1–F27): 1 critical EXIF/GPS privacy fix (fail-closed on web), 10 broken flows restored, 9 race/double-submit guards, 7 lifecycle leaks fixed. +11 new tests (reopenRequests, tileCache concurrency, flagsStore D4). typecheck 0 · 97 suites / 1,575 tests · lint 0 errors. Rollback: `git revert -m 1 c6298df && git push`. Full report: `qa-reports/summaries/2026-06-07_AccessMap_PreBuild_StepA_Report.md`. — 2026-06-07

## 2026-06-03 — More-Expressive UI/UX Pass Merged + Pushed [UI-POLISH-EXPRESSIVE-MERGED]
On Sky's explicit choice (AskUserQuestion: "More expressive") + run-end-to-end, a whole-app UI/UX elevation pass merged into main via no-ff merge **`7018bd5`** and **pushed to origin**. Extend-don't-fork token adds: `a11y.focusRingWidth/Offset` (WCAG 2.4.7), `color.infoBg/infoFg` (both palettes), `gradient.{brand,brandHero,gold}` (mode-independent), `shadow.glow{Brand,Gold}`. Primitives: AppText auto header-role, Pill 44pt hitSlop, Card haptic+`elevated`, Button gradient+glow+focus-ring+press-haptic (Button still mostly unadopted). Screens: Admin full token migration (was hardcoded navy/Courier/raw Text), Tasks severity-stripe + photo Skeleton shimmer + StatusBadge, Report info/tip nudge + gradient submit + success haptic + 🔒→Lucide Lock, Profile gradient hero + GOLD progress fills, Settings lifted segmented-pill, Map hairline floating chrome. App now 100% Lucide/SVG. Held to WCAG AA + reduced-motion + 60fps. Privacy: presentational only — `context_tags` payload + disability-tag logic byte-identical. typecheck clean; 95 suites / 1564 tests. Report: `qa-reports/2026-06-03_AccessMap_UI_Polish_Report.md`. Rollback: `git revert -m 1 7018bd5 && git push`. — 2026-06-03

## 2026-06-04 — Brand-Font Cleanup Merged + Pushed [BRAND-FONTS-MERGED]
The flagged brand-font follow-up is done: ~180 raw `<Text>`→`<AppText>` across 24 secondary screens + modal/components (via a background general-purpose agent), so the brand fonts (Public Sans / Plus Jakarta) render everywhere instead of the system font. Merged no-ff **`f499fc8`** + pushed. Variants chosen by intended weight; visible copy + accessibility labels preserved verbatim. Intentionally left in system font: PlatformMap's 5 native-map callouts (marker font rendering is finicky — don't risk before a build) + RootNavigator's fixed dark-nav label. typecheck clean; 95 suites / 1564 tests; `expo export --platform ios` bundles clean. Rollback: `git revert -m 1 f499fc8 && git push`. — 2026-06-04

## 2026-06-03 — AccessMap Aesthetic Is Context-Dependent (More Expressive) [AESTHETIC-CONTEXT-DEPENDENT]
Sky chose **MORE EXPRESSIVE** for AccessMap (gradients, soft glows, celebratory gamification beats) and merged+pushed it live. The "Sky prefers understated / reverted the bold pass" learning is **specific to the portfolio's cinematic intro** (skypistudio.com) and does NOT generalize to AccessMap. RULE: ask the aesthetic direction per project/surface; for AccessMap, expressive-within-the-a11y-floor is approved. — 2026-06-03

## 2026-06-03 — No Sheet Migration; Sheet Is For New Bottom-Sheets Only [NO-SHEET-MIGRATION]
Audited modal usage: ~29 files render a raw `<Modal>`, only ChangelogModal uses the `Sheet` primitive. Decision: do NOT mass-migrate — most are intentionally full-screen page-sheets / lightboxes / drawers / dialogs that should NOT become bottom-sheets. `Sheet` is for new bottom-sheets only. **SUPERSEDES the prior `followon-sheet-rollout` task** (which framed it as "roll Sheet to ~18 modals"). — 2026-06-03

## 2026-06-03 — No Reanimated; Use RN Animated + expo-linear-gradient [NO-REANIMATED]
The UI-polish brief assumed `react-native-reanimated`; it is NOT installed. Used the existing RN `Animated` API + the project `motion` tokens (already native-driver + reduced-motion-gated). `expo-linear-gradient` + `expo-blur` were already installed and cover the expressive direction. No new dependency added. — 2026-06-03

## 2026-06-02 — QA Consolidation Merged to Main [QA-MERGE-PETER-ALEX]
Gary's final pre-tester QA merge: integrated `qa-peter/accessmap-2026-06-01` (perf) + `qa-alex/accessmap-2026-06-01` (a11y, incl. 2 HIGH screen-reader operability fixes) onto main via `qa-merge/accessmap-2026-06-02` → merge commit **`db7d1c6`**, annotated tag **`qa-merge-2026-06-02`** (one-step revert). `qa-steve` was SKIPPED — its security work was already in main (`git cherry` confirmed); merging the stale branch would have duplicated Alex's a11y commits. Gates: typecheck clean, **1564 tests/0 fail / 95 suites**, lint 0 errors, iOS+Android `expo export` clean. Plus MapScreen status-pill responsive fix (`708e23f`). — 2026-06-02

## 2026-06-02 — main Pushed to origin (Public Repo) [MAIN-PUSHED-TO-ORIGIN]
On Sky's explicit approval, main was pushed to **`origin/main`** (public GitHub `Skypie99/AccessMap`) for the first time — supersedes the "local only, NOT pushed" status in [UI-POLISH-MERGED] and [BRAND-REBRAND-MERGED]. Before pushing: redacted a hardcoded reviewer password from a migration comment, and fixed `eas.json` duplicate `preview2/preview3` build profiles (Rory pre-flight BLOCK1, `0908dc5`). Push triggers only `ci.yml` (tests/lint) — EAS build + TestFlight submit are dispatch-only + reviewer-gated, so no accidental ship. main currently `45f7964`, synced with origin. — 2026-06-02

## 2026-06-03 — Pre-Tester Security Gate Applied Live [SECURITY-GATE-COMPLETE]
The full pre-tester security gate was **applied to the live Supabase DB by Sky via Cowork** and verified read-only after each step: (1) dropped duplicate `trigger_flag_status_change` (double-points fix); (2) **F3** flag_photos INSERT ownership guard (`with check` path-scoped, was `true`); (3) **F2** `search_path=public` pin + EXECUTE revoke from public/anon/authenticated on 4 trigger fns (triggers still fire as owner — Steve-confirmed); (4) webhook secret rotation (see [WEBHOOK-VAULT-AUTH]); (5) is_admin bug fix (see [ADMIN-ROLE-MIGRATION-APPLIED]). All Const. Art. 5 compliant — Sky executed every live apply; agents only verified read-only. — 2026-06-03

## 2026-06-03 — Webhook Auth Now Vault-Based [WEBHOOK-VAULT-AUTH]
The notify-flag-status webhook secret was moved out of two hardcoded locations (trigger tgargs + function body) to **Supabase Vault**. Final architecture: the DB trigger function `notify_flag_status_webhook` reads the secret from Vault and POSTs it; the Edge Function verifies it via a new `public.verify_webhook_secret(text)` SECURITY DEFINER RPC (returns boolean — raw value never leaves Vault). Required `supabase/functions/notify-flag-status/config.toml` with `verify_jwt = false` (DB webhooks can't carry a JWT — the X-Webhook-Secret IS the auth; this was a pre-existing silent 401 — the webhook had NEVER fired successfully). Verified **200 ok**. Migration `2026-06-03_verify_webhook_secret.sql`. The `NOTIFY_WEBHOOK_SECRET` env var is now irrelevant. Future rotation = `vault.update_secret()` only. — 2026-06-03

## 2026-06-03 — admin_role Migration Applied Live [ADMIN-ROLE-MIGRATION-APPLIED]
`supabase/migrations/2026-05-30_admin_role.sql` was applied to live (Option A per Dana's proposal): adds `users.is_admin boolean NOT NULL DEFAULT false`, an admin-delete-any-flag RLS policy (dormant — 0 admins), and hardens the user-update policy against self-promotion. **This fixed a live bug**: `handle_flag_status_change` referenced `users.is_admin` (which didn't exist), so any flag REJECT or REOPEN transition errored on prod (Postgres doesn't short-circuit the AND in the rejected branch). Verified: column exists, 2 users / 0 admins, reject+reopen succeed. — 2026-06-03

## 2026-06-03 — Points-Value Drift (Sky Decision Pending) [POINTS-VALUES-DRIFT]
The **live** `handle_flag_status_change` awards reporter **+10 verified / +15 resolved**, actor **+3 / +7** (changed by the trust-score migration). `schema.sql`, `CLAUDE.md`, and [GATE-2-VERIFIED] (which says 5/10 + 2/5) are now STALE on this point. Dana recommends accepting the live 10/3/15/7 as canonical and updating the docs. **DECISION FOR SKY** — keep live values (update docs) or revert to 5/2/10/5. — 2026-06-03

## 2026-06-01 — UI/UX Polish Pass Merged to Main [UI-POLISH-MERGED]
On Sky's explicit in-session authorization, `ui-polish/auto-2026-06-01` (25 commits — design-system completion, dark-mode Light/Dark/System toggle, Input/Skeleton/Sheet primitives, expo-haptics, brand fonts across all screens, reduced-motion + bottom-safe-area + Dynamic-Type a11y, lint-gate fix, test de-flake) was merged into main via no-ff merge `5fb80ce` (executed by a Sonnet agent; gates: typecheck clean + lint 0 errors + 1553 tests green; independently re-verified). **Local only — main is ~41 commits ahead of origin, not pushed** (push withheld as an external side effect pending Sky's go-ahead; needed before any TestFlight build that builds from the remote). — 2026-06-01

## 2026-06-01 — ESLint Pinned to v9 (Lint Gate Restored) [ESLINT-PIN-V9]
ESLint had been bumped to 10.4.1, which removed `context.getFilename()` that the installed eslint-plugin-react / react-hooks (via eslint-config-expo ~10) still call → `npm run lint` crashed on every file. Fixed by pinning `eslint` to `^9.0.0` (resolves 9.39.4) + removing two config rules that only exist in eslint-plugin-react-hooks v6+ (`set-state-in-effect`, `globals`). Lint now passes (0 errors, 259 advisory warnings). **Durable: keep ESLint on v9; do not let it drift back to v10.** — 2026-06-01

## 2026-06-01 — Stale a11y-deep Branch Pruned [A11Y-DEEP-BRANCH-PRUNED]
`a11y/phase5-deep-2026-05-31` (86e3fbf) deleted from local + origin on Sky's authorization. It forked pre-brand-rebrand; merging it would have REVERTED the rebrand (137 files, −13,843 lines), and its Phase-5 a11y fixes are already in main (verified). Recoverable from SHA `86e3fbf` if ever needed. **Do not recreate or merge it.** — 2026-06-01

## 2026-06-01 — Brand Rebrand Merged to Main [BRAND-REBRAND-MERGED]
On Sky's explicit in-session authorization (overriding the standing "only Sky merges main" rule per the authority order: Sky's intent > Constitution), `feat/brand-rebrand-design-system` was merged into main via no-ff merge commit `b60f37c` (13 commits). typecheck clean + 1553 jest tests green on merged main. **Local only — not pushed to origin** (push withheld as an external side effect, pending Sky's go-ahead). Supersedes the "NOT pushed — Sky merges" status in [BRAND-REBRAND-COMPLETE] below. — 2026-06-01

## 2026-06-01 — Claude Design Brand Rebrand Complete [BRAND-REBRAND-COMPLETE]
Whole-app Claude Design brand applied on `feat/brand-rebrand-design-system` (12 commits, off main, NOT pushed — Sky merges). typecheck clean, 1553 tests green, verified live on web. Real LogoMark + CategoryIcon + TierIcon (SVG), severityColor synced to theme ramp, ALL emoji + Unicode glyph-icons → Lucide across ~35 files, web teardrop map pins, splash + DESIGN.md §10. Key discovery: main already had ~70% of the brand (tokens/fonts/gold/assets) — the bundle and main derive from the same 2026-05-30 brief. — 2026-06-01

## 2026-06-01 — Icons Are SVG-Only, No Emoji [ICONS-LUCIDE-NO-EMOJI]
Durable convention: product UI uses Lucide (`lucide-react-native`) + bespoke SVG (`CategoryIcon` / `TierIcon` / `LogoMark`) only. NO emoji, NO Unicode-glyph icons anywhere in the app. Civic Gold (`color.goldAccent`) reserved for gamification (points/streaks/badges) on ink text. All new UI must follow. — 2026-06-01

## 2026-06-01 — Sign-in Stays Dark Glassmorphism [SIGNIN-DARK-KEPT]
Sky chose to keep the existing dark glassmorphism sign-in (with the new white brand logo) over the design bundle's white mockup. Do not re-propose the white version. — 2026-06-01

## 2026-05-29 — Analytics Scaffold Jordan Gate Required [ANALYTICS-JORDAN-GATE]
`phase2/track-b-infrastructure` adds src/lib/analytics.ts with `identifyUser(userId)` — triggers Const. Art. 7.6 #5 (external API sending user data). Jordan reviewed and issued APPROVE WITH CONDITIONS. 5 blocking conditions must be met before wiring a real SDK. Stub is safe to merge as-is. Sky decisions required: (1) privacy policy author, (2) opt-in vs opt-out default, (3) confirm flagId removal from analytics events. — 2026-05-29

## 2026-05-29 — Plist Background Location: Jordan DROP-IT [PLIST-JORDAN-BLOCKED]
`fix/expo-notifications-and-plist` added NSLocationAlwaysAndWhenInUseUsageDescription + NSLocationAlwaysUsageDescription to app.json. Jordan DROP-IT (2026-05-29_Jordan_BackgroundLocationGate.md) — app uses zero background location APIs; risks App Store rejection (Guideline 5.1.1) + PIPEDA/CPRA over-collection. Rory removed both keys in commit `4239748`. Branch cleaned but not merged. — 2026-05-29

## 2026-05-29 — Lighthouse CI State Discrepancy [LIGHTHOUSE-PHANTOM-MERGE]
Prior parallel session claimed push to SHA 723e23f but actual main was 01362aa. Resolved: Rory merged ci/lighthouse-2026-05-30 + release/0.2.0-version-bump cleanly onto main. Main now at 78251b1. LEARNINGS:2026-05-25 concurrent-agent phantom merge pattern confirmed + resolved. — 2026-05-29

## 2026-05-29 — Heat-map Display Style: Gradient Layer (Sky)

- **Decision:** Heat-map display style = **gradient layer** (NOT density dots). Explicit Sky choice.
- **Rationale:** Sky selected gradient layer over density-dot rendering on 2026-05-29 as the canonical heatmap visual. All future heatmap UI work must use gradient; density dots are off the table unless Sky re-decides.
- **Authority:** Sky (explicit product choice); recorded by Rory (Phase 1 merge wave, Const. 10.2).
- **References:** HeatmapLayer.tsx (`displayStyle: 'gradient'`); reconciliation report `qa-reports/2026-05-29_Recon_lighthouse.md`

---

## 2026-05-29 — D5 Heatmap Gradient Approved (Sky)

- **Decision:** D5 heatmap color gradient = **YES**. Heatmap feature build unblocked.
- **Rationale:** Sky ruling 2026-05-29. Spec at qa-reports/2026-05-29_Shamus_D5Heatmap_Implementation.md; Jordan pre-approved (privacy trigger cleared — aggregate severity display, not per-user location exposure).
- **Authority:** Sky (product decision); recorded by Morgan (housekeeping, Const. 10.2). No code/main/DB change in this entry — record only.
- **References:** ~/qa-reports/2026-05-29_Sky_Morgan_ToDo_Tracker.md (A1, D5)

---

## 2026-05-27 — Security Wave 2 + D3 Trigger Decisions

- **Decision:** Security Hardening Wave 2 ready for merge; D3 trigger approved for application.
- **Rationale:** Steve completed audit of input validation, data exposure, RLS, and secrets. Three in-code defense-in-depth fixes (display name trim+cap, feedback body/email validation, flag description cap). Propose-only PII migration (users.email RLS) ready for Sky apply (Const. 2.4 privacy gate). D3 trigger (`enforce_flag_status_only_for_non_owner`) reviewed by Steve — no SQL injection risk, proper role isolation, correct trigger ordering, long-term security improvement for column protection. Typecheck ✅ (0 errors), tests ✅ (922/922), secrets audit clean.
- **Actions:** (1) Merge `security/hardening-wave2-2026-05-27` (zero migration dependencies); (2) Apply `2026-05-27_users_email_privacy.sql` same-cycle (Const. 2.4 privacy incident closure); (3) Apply `2026-05-23_status_update_trigger_proposal.sql` to unblock `shamus/marker-clustering-2026-05-25` merge.
- **Authority:** Steve (security review, sign-off 2026-05-27); Morgan (execution plan coordination); Const. Art. 2.4 (privacy), Art. 5 (no live-DB writes)
- **References:** qa-reports/2026-05-27_Steve_Security_Wave2.md, qa-reports/2026-05-27_D3_Steve_TriggerApproval.md, cycle-2026-05-27-morgan-security-final.md

---

## 2026-05-24 — Bootstrap Velocity Loop State Files

- **Decision:** Create PROJECT_STATE.md, DECISIONS_LOG.md, TASK_GRAPH.json for AccessMap as first-cycle bootstrap.
- **Rationale:** AGENT_OS v1.14 STATE AUTHORITY requires these three files as canonical state authority for all ACTIVE projects. Files were absent; every orchestrator run was rebuilding state from conversation context — a coherence risk. Morgan created them on first post-project audit cycle.
- **Supersedes:** Nothing (first entry).
- **Authority:** Morgan (ACTIVE mode — direct invocation; reversible write to project root per Const. 5.5)

## 2026-05-26 (Evening) — Wave 1 Completion + Gate 2 Verification

- **[WAVE6-MERGE-SEQUENCE]** 9 READY Wave 6 branches merge in ascending commit-count order (report-templates 1 → notif-prefs-screen 4 commits). Minimizes merge complexity and gate-passing risk. — 2026-05-26
- **[RLS-MIGRATION-APPLIED]** Flag editing RLS policy deployed to live Supabase (2026-05-25_flag_edit_rls.sql). Owners cannot edit flags once status ≠ 'open'. Constitution Art. 7.3 gap closed. Verified: RLS 403 on non-owner/non-open edits, points trigger active. — 2026-05-26
- **[GATE-2-VERIFIED]** Supabase backend integrity gate PASSED. RLS policies enforced, points trigger verified (5/10/2/5 points), schema consistent. Ready for Gate 3 (human understanding test). — 2026-05-26
