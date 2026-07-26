# Morgan — Pre-Dawn Standup Digest

**Date:** 2026-06-01 (~04:03 PDT)
**Mode:** BACKGROUND · AUDIT-ONLY · no external sends, no commits, no merges
**Halt sentinel:** absent (`~/.claude/BACKGROUND_HALT` not present) — scan proceeded
**main HEAD:** `68c284b` — intact, no git drift

---

## OVERNIGHT ACTIVITY

Six fresh reports landed since ~01:00. The night's work was a **Phase 5 QA + accessibility sweep** across two unmerged feature branches plus already-merged a11y work.

**Merged to main (`68c284b` and parents):**
- `a11y/phase5-anon-banner-2026-05-31` — WCAG 4.1.2: expose anon banner "Sign In" link to VoiceOver
- `a11y/phase5-deep-2026-05-31` — Phase 5 deep WCAG audit, 6 issues fixed (trust score + onboarding)
- `feat/phase5-qa-sweep` — 94/94 tests passing, TS clean (Gary/Peter/Steve)
- `feat/phase5-copy-sweep` — warm UX copy polish, 6 screens
- `feat/phase5-a11y-audit` — WCAG 2.2 AA: touch targets, SR content, semantics (18 files)

**Reports written (newest 3 read in full):**

1. **`2026-06-01_Gary_TrustScore_AnonReporting_Gate.md`** — QA gate on the two
   still-unmerged Phase 5 branches. **Both verdicts: ❌ NOT READY** (see BLOCKERS).
2. **`2026-05-31_Alex_Phase5_DeepAudit.md`** — deep WCAG 2.2 AA audit of all Phase 5
   features. 7 issues found and fixed (1 contrast, 3 name-role-value, 1 decorative
   icon, 2 reduce-motion). All safe additive fixes, typecheck clean. **No Sky
   decision required.** Fixes live on the two a11y branches (now merged).
3. **`2026-06-01_Alex_TrustScoreA11y.md`** — targeted a11y pass on trust-score UI
   (progress bars, point history, leaderboard). 5 fixes, all applied to
   `feat/phase5-trust-score` (commit `383f746`), typecheck clean. No Sky decision.

**Test health:** mixed, and it depends on the branch.
- **main / merged work:** healthy — `feat/phase5-qa-sweep` landed 94/94 passing, TS clean.
- **`feat/phase5-trust-score`:** tsc ✅ clean, but jest shows **19 failures / 1433 pass**
  — caused by two anon-reporting test files stranded on the wrong branch.
- **`feat/phase5-anon-reporting`:** ❌ tsc fails + **all 90 suites fail to run** —
  `@sentry/react-native` is in package.json but not installed in node_modules.

---

## BLOCKERS

These are the gate blockers Gary surfaced. **Neither branch should merge until resolved.**
All require a human/agent action — none are Sky-decision-only.

### `feat/phase5-trust-score` (2 fixes, both quick)
1. **Stale flash-banner point values** — `TasksScreen.tsx:484, 491` still shows the
   OLD point amounts (+5/+10/+2/+5). The trust-score migration changes rewards to
   +10/+15/+3/+7. After the migration applies, users will see under-reported points
   ("+5" when they earned "+10"). CLAUDE.md explicitly documents this coupling.
   → 2-line fix.
2. **Stranded test files** — `createAnonFlag.test.ts` and `anonRateLimit.test.ts`
   were committed onto this branch but belong on anon-reporting. They reference
   functions/modules that don't exist here. → `git rm` both.

### `feat/phase5-anon-reporting` (2 fixes)
1. **`@sentry/react-native` not installed** — breaks tsc and all 90 test suites.
   → `npm install @sentry/react-native --legacy-peer-deps` (plus possible Expo
   plugin wiring). Zero test coverage on this branch until fixed.
2. **Missing anon INSERT RLS policy on `public.flags`** — `createAnonFlag()` runs as
   the `anon` role with `user_id = NULL`, but no INSERT policy exists for `anon`.
   It will fail at runtime with a PostgREST 403. Mocked tests don't catch this.
   → New PROPOSE-ONLY migration `2026-06-01_anon_flag_insert.sql` (Gary supplied SQL).
   ⚠️ **Privacy/RLS-sensitive** — Steve (security) + Jordan (privacy) gate, and
   anon reporting touches the location/identity boundary. Surface to Sky before apply.

### Doc lag (not a code blocker)
- **PROJECT_STATE.md is behind reality** — still lists trust-score as "Shamus
  building" and anon-reporting as the next merge, but main already carries the
  Phase 5 a11y merges through `68c284b`. Refresh recommended (Morgan, on next
  `/morgan` invocation — not a background action).

---

## READY FOR SKY

Decisions Gary flagged that genuinely need Sky (or Rory) input — surfaced here for
the next `/morgan` pickup; **not sent anywhere** (background mode):

1. **Confirm trust-score point values are final** (+10/+15/+3/+7). If they change
   again before merge, the flash banner needs re-updating. Blocks fix #1 above.
2. **Sentry integration scope** — full native `@sentry/react-native` (EAS plugin +
   iOS pod install + DSN in secrets) vs. lightweight stub? If premature (no DSN
   yet), reverting `sentry.ts` to the trust-score stub removes both anon-reporting
   tsc/jest blockers at once.
3. **Merge order** — if both land, trust-score should merge first (its point-trigger
   migration is a dependency). Verify no conflict between
   `2026-05-30_trust_score_system.sql` and the new anon-insert migration.
4. **anon INSERT RLS policy** — privacy/security-sensitive (anon writes to `flags`).
   Steve + Jordan gate; needs Sky sign-off before the migration is applied. The
   migration is PROPOSE-ONLY (a file with rollback), never auto-applied.

**Net:** No emergencies. main is clean and intact. Both Phase 5 feature branches
are close but gated on well-defined, mostly mechanical fixes. The one item needing
real human judgment is the anon-INSERT RLS policy (privacy boundary) and the Sentry
scope call.

---
*Morgan — background standup. Audit only. No commits, no merges, no messages sent.*
