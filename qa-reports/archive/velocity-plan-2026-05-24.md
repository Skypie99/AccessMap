# AccessMap — Velocity Build Plan — 2026-05-24

**Morgan, AccessMap · 2026-05-24 · velocity Phase 0**

> Plan surfaced **before** execution per the velocity prompt rails. The
> velocity prompt was originally written for MutualMesh; this is the
> AccessMap-retargeted run. ACTIVE mode (Sky pasted directly) — Const.
> 12.5 AUDIT-ONLY default does not apply.

---

## TL;DR — what this cycle ships

Three features, all pure-additive, no schema changes, no new deps, no
privacy-sensitive surface. All chosen to *not conflict* with the 10+
parked branches already awaiting your hand.

| # | Feature | Why now | Branch | Privacy hit | Schema |
|---|---|---|---|---|---|
| F1 | `<DecorativeGlyph>` a11y wrapper + Android-fix sweep | Note 2 from cycle-2026-05-24-v2.md. 12 callsites split between right + wrong a11y combo; this fixes the wrong ones. | `feat/decorative-glyph-2026-05-24` | None | None |
| F2 | `color.placeholderText` token + 5-callsite migration | B2 from cycle-2026-05-24-v2.md. 4 placeholderText sites fail AA at 2.7:1 on `#f7f9fc`. | `chore/placeholder-text-token-2026-05-24` | None | None |
| F3 | `<SearchInputRow>` extraction (component only — no migration this cycle) | Note 4 from cycle-2026-05-24-v2.md. R10/R13/R14 search inputs are near-identical. | `feat/search-input-row-2026-05-24` | None | None |

---

## Triage findings (read before deciding to merge anything else)

**Two FEATURES.md items are stale** — already shipped to `main`:

1. **Deep-link handler (`accessmap://flag/{id}`)** — listed as "Next" in
   FEATURES.md, but `src/navigation/RootNavigator.tsx` line 40 already
   has `prefixes: ['accessmap://']`, MapScreen line 704 handles arrival,
   and `app.json` line 7 has `"scheme": "accessmap"`. **Action:** Will
   updates FEATURES.md in the final sweep.
2. **Distance test coverage** — listed as "Next" but
   `src/lib/__tests__/distance.test.ts` already exists.
   **Action:** Will updates FEATURES.md.

---

## Section 1 — Dependency Graph (5-section spine, Const. 9.6)

```
                              ┌──────────────────────────┐
                              │  main @ 40d7dd2          │
                              │  (Cleanup: orphan dirs)  │
                              └────────────┬─────────────┘
                                           │  branched off
              ┌────────────────────────────┼─────────────────────────┐
              ▼                            ▼                         ▼
      ┌────────────────┐         ┌─────────────────────┐     ┌──────────────────┐
      │ F1: Decorative │         │ F2: placeholderText │     │ F3: SearchInput  │
      │     Glyph      │         │     theme token     │     │     Row extract  │
      └───────┬────────┘         └──────────┬──────────┘     └────────┬─────────┘
              │                             │                          │
   Quinn → Dani → Jordan → Shamus → Steve → Alex → Gary → Dani-Compiler
              │                             │                          │
              └─────────────────────────────┴──────────────────────────┘
                                           │
                                ┌──────────▼───────────┐
                                │  Final safety sweep  │
                                │  Steve / Alex / Gary │
                                │       / Will         │
                                └──────────┬───────────┘
                                           │
                                ┌──────────▼───────────┐
                                │  Morgan briefing     │
                                │  (this file's twin)  │
                                └──────────────────────┘
```

**Nodes (per feature):**
- Q (Quinn: light spec polish — skip if backlog item already specced)
- D (Dani: design spec for UI surface; tokens / props)
- J (Jordan: privacy review — APPROVE/CONDITIONS/BLOCK)
- S (Shamus: vertical slice on `<feat|chore>/<...>` branch)
- St (Steve: light security pass)
- A (Alex: light a11y pass)
- G (Gary: tests)
- DC (Dani Design Compiler: 7-layer compile gate, UI features only)

**Edges:** Q→D→J→S→St→A→G→DC (sequential per Const. 1.1).

**Parallelism in this cycle:** None at role-level (Const. 1.1). The three
features themselves are sequential within this conversation. Each
feature gates the next at "typecheck GREEN."

---

## Section 2 — Reason for Ordering (5-section spine, Const. 9.6)

1. **F1 before F2 before F3 — by reversibility.**
   - F1 (Glyph wrapper + sweep) touches 7+ files; needs typecheck
     stability before stacking F2.
   - F2 (theme token + 5 callsites) is the smallest scope; lands fast.
   - F3 (SearchInputRow extract) is the highest cognitive load (API
     design); runs last so we don't block F1/F2 if F3 takes longer than
     expected.

2. **Don't conflict with parked branches.** F1 touches
   LegendModal/OnboardingModal/FeedbackModal/MyReportsModal/NearbyFlagsModal/SettingsScreen
   for the "no" → "no-hide-descendants" sweep. The 10+ parked branches
   (R7–R15 + chore/brandtext + chore/lift-shared-modals +
   feat/status-history + feat/time-of-day-tags + cycle/auto + perf/auto)
   each touch their own files; we verify no overlap before each commit.
   (`git diff --name-only main..<parked-branch>` is the canary.)

3. **Jordan reviews every feature** (Const. Art. 7.6 + v1.11.4 trigger
   spec). AccessMap is privacy-load-bearing (location + disability
   data), so even pure-additive UI changes pass through Jordan. Expected
   verdict: APPROVE for all three (no new data collected, no new
   surface touching location/disability data).

4. **Born-accessible from commit 1** — F1 *is* an a11y fix; F2 is a
   contrast fix; F3 inherits a11y from migrated patterns. Alex's
   per-feature pass is a verification, not a fix-up.

5. **No live DB apply, ever** (Const. Art. 1). None of the three
   features touch the schema, so this is automatic — but flagging it as
   a hard rule that holds across the whole session.

6. **LEARNINGS.md consulted in full** per Const. 9.6:
   - 2026-05-23 "Merge-on-done > stacking branches" — this cycle
     produces 3 branches, NOT merged here. Sky merges. The merge-on-done
     rule cannot apply inside an orchestrator run (orchestrator never
     touches main per Const. Art. 1).
   - 2026-05-23 "Nominatim geocoder needs a User-Agent" — none of the
     three features touch geocode; no impact.
   - 2026-05-23 "SectionList > FlatList when statuses are visually
     distinct" — none touch list-rendering; no impact.

---

## Section 3 — Blocked Nodes (5-section spine, Const. 9.6)

`{node, why, unblock, type}`

### B0 — Velocity prompt source/target mismatch (resolved at planning)
- **node:** `velocity-plan-2026-05-24.md`
- **why:** The velocity prompt body is hard-coded for MutualMesh
  (mentions `~/MutualMesh`, PRIVACY.md, Cycle 1 Auth+Gate). Sky asked
  to apply it to AccessMap.
- **unblock:** Adapted in place — work targets `~/AccessMap`,
  PRIVACY.md is N/A (AccessMap doesn't have one; Jordan applies Const.
  Art. 7.6 directly), and feature picks come from AccessMap's
  FEATURES.md + cycle-2026-05-24-v2.md notes.
- **type:** RESOLVED (informational; no Sky action needed)

### B1 — Carry-forward from cycle-2026-05-24-v2.md: 5 unapplied migrations
- **node:** Not in this cycle, but inherited debt:
  1. `supabase/realtime.sql`
  2. `supabase/migrations/2026-05-23_feedback_table.sql`
  3. `supabase/migrations/2026-05-23_rls_initplan_and_non_owner_status_update.sql`
  4. `supabase/migrations/2026-05-23_data_layer_hardening.sql`
  5. `supabase/migrations/2026-05-23_status_update_trigger_proposal.sql`
  + 2 NEW from parked branches:
  6. `supabase/migrations/2026-05-24_status_history_table.sql` (on
     `feat/status-history-2026-05-24`)
  7. `supabase/migrations/2026-05-24_flag_context_tags.sql` (on
     `feat/time-of-day-tags-2026-05-24`)
- **why:** Const. Art. 1 — never apply to live DB.
- **unblock:** Sky applies in Supabase SQL editor.
- **type:** DECISION_FOR_SKY (priority: low — none of this cycle's
  three features depend on any migration)

### B2 — Carry-forward: R9 location-prompt decision (still open)
- **node:** `feat/profile-nearest-flag-jump-2026-05-23`
- **why:** Quinn HIGH from prior cycle — privacy decision needs your
  call. Const. Art. 7.6.
- **unblock:** Sky picks Option 1/2/3 from cycle-2026-05-24-v2.md §B1.
- **type:** DECISION_FOR_SKY

### B3 — Carry-forward: 13+ unmerged feature branches
- **node:** `git branch --no-merged main` lists 18 today (was 12
  yesterday).
- **why:** Adding three more in this cycle compounds the triage burden.
- **unblock:** Sky merges in any order (each branch is independent per
  prior Morgan's verification).
- **type:** DECISION_FOR_SKY (priority: medium — visual noise + risk of
  features being lost)
- **recommendation:** After Sky reviews this cycle, sit down for ~30
  min and merge the 4–5 best branches; archive or close the rest.

---

## Section 4 — Checkpoint References (5-section spine, Const. 9.6)

| # | Type | Reference | Verified |
|---|---|---|---|
| 1 | main HEAD | `40d7dd2 Cleanup: orphan directions + AboutModal dedupe + Alert→confirm migration + cap normalize` | ✓ (`git log -1` at plan-write time) |
| 2 | branch (planned) | `feat/decorative-glyph-2026-05-24` | not yet — will be created in Phase 1 |
| 3 | branch (planned) | `chore/placeholder-text-token-2026-05-24` | not yet — Phase 2 |
| 4 | branch (planned) | `feat/search-input-row-2026-05-24` | not yet — Phase 3 |
| 5 | qa-report (this) | `qa-reports/velocity-plan-2026-05-24.md` | written this turn |
| 6 | qa-report (planned) | `qa-reports/cycle-velocity-2026-05-24.md` | will be written in final sweep |
| 7 | LEARNINGS.md | last modified 2026-05-23 23:23 (~242 lines per CLAUDE.md spec); consulted in full | ✓ |
| 8 | FEATURES.md | last modified 2026-05-24 03:28 (~256 lines); two stale items identified (deep-link, distance tests) | ✓ |

---

## Section 5 — Duplication Report (5-section spine, Const. 9.6)

**Checked against:**
- All 18 unmerged branches (`git branch --no-merged main`)
- All `feat/*-2026-05-24` and `chore/*-2026-05-24` branches' diffs

**Findings:**

1. **`chore/brandtext-theme-token-2026-05-24` overlaps with F2 on `src/theme.ts`.**
   - That branch added `color.brandText` (1 token).
   - F2 adds `color.placeholderText` (1 token).
   - Different token names — additive. No conflict at code-merge level
     (both insert distinct lines).
   - **Resolution:** F2 proceeds; Sky should merge brandtext-theme FIRST
     (it's already done) so the AA-fix story for both tokens lands
     together. If brandtext-theme isn't merged before F2, F2 will still
     apply cleanly — token names don't collide.

2. **`chore/lift-shared-modals-2026-05-24` touches `RootNavigator.tsx`.**
   - F1 / F2 / F3 do NOT touch RootNavigator → no conflict.

3. **`feat/status-history-2026-05-24` touches `FlagDetailModal.tsx`.**
   - F1 *may* touch FlagDetailModal if I find a stale a11y combo there.
   - **Resolution:** I'll grep-verify before committing F1. If
     FlagDetailModal needs a fix, I'll either (a) skip that file in F1
     and surface as DECISION_FOR_SKY (recommend Sky merges
     status-history first, then I run a follow-up), or (b) confirm
     status-history-branch's FlagDetailModal already uses the right
     combo (in which case no F1 work needed there).
   - **Outcome:** Verified at execution time, before commit.

4. **No other overlaps.** F1's other targets (LegendModal,
   OnboardingModal, FeedbackModal, MyReportsModal, NearbyFlagsModal,
   SettingsScreen) are not touched by any parked branch.

**Conclusion:** No duplications detected this cycle. One adjacency to
verify at F1 execution (FlagDetailModal vs status-history branch).

---

## Jordan Trigger Evaluation (per v1.11.4, MANDATORY in MutualMesh; advisory but kept for AccessMap because Const. Art. 7.6 still applies)

| Trigger | F1 (DecorativeGlyph) | F2 (placeholderText) | F3 (SearchInputRow) |
|---|---|---|---|
| 1. Location data? | NO | NO | NO |
| 2. Marginalized-group / disability data? | YES (a11y wrapper — improves screen-reader UX for visually impaired users) | YES (low-vision users benefit from AA-compliant contrast) | NO (extraction is purely structural) |
| 3. PII beyond auth? | NO | NO | NO |
| 4. RLS/auth/session change? | NO | NO | NO |
| 5. External API outbound? | NO | NO | NO |
| 6. New data persistence layer? | NO | NO | NO |
| **Trigger count** | 1 (a11y-positive) | 1 (a11y-positive) | 0 |

**Expected Jordan verdict for all three:** APPROVE. The trigger 2 hits
are *improvements* for marginalized groups (visually impaired users),
not new collection — the opposite of a privacy risk.

---

## Execution order (this conversation, sequential)

1. **F1 build cycle** — Quinn(skip) → Dani(spec) → Jordan(approve) →
   Shamus(build) → Steve(light) → Alex(verify) → Gary(tests) → Dani
   Compiler(no UI surface — N/A).
2. **F2 build cycle** — same role chain.
3. **F3 build cycle** — same role chain. Skip migration (proposal only).
4. **Final safety sweep** — Steve / Alex / Gary across all three
   branches; Will updates LEARNINGS + FEATURES + CLAUDE.md.
5. **Morgan final briefing** — `qa-reports/cycle-velocity-2026-05-24.md`
   with 5-section spine + per-feature deltas + DECISIONS FOR SKY.

**Stop conditions** (Const. 8.5.3):
- 3 features built + final sweep done + briefing written → STOP CLEANLY
- Any role hits typecheck red → Orion FIRST (max 3 attempts per
  Const. 8.7.4); halt feature if no safe path; surface to Sky via
  Morgan
- Privacy/safety/a11y BLOCKER → halt cycle, surface as DECISION FOR SKY
- Capacity low → finish current role to green, run sweep, write briefing

---

## Hard rules carried forward (all branches, this whole session)

- Never modify `main` — only Sky merges
- Never apply anything to live Supabase
- No external sends — no email, Slack, push-notif, deploy
- No role other than Morgan contacts Sky (Const. Art. 9 — and this
  Morgan, inside an orchestrator-style run, writes to qa-reports only
  per Const. 9.4)
- Never touch `~/.claude/**` or `~/ClaudeCorp/.claude/**`
  (Const. 12.6 — applies in all modes)
- Database types use `type` not `interface` (AccessMap LEARNINGS-load-bearing)
- NativeWind tokens / `src/theme.ts` tokens only for visual values

---

— Morgan, 2026-05-24 (velocity Phase 0, plan written before execution)
