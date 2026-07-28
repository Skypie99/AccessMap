# SHIP-READY — HANDOFF (live resume pointer)

Updated: 2026-07-27 · Branch **`shipready/3-polish-submission`**, cut off the Phase-2 tip **`f6ac258`**
`main == origin/main == 512494a` (verify-first note: a memory pointer claiming main advanced to `d43f867`
is **stale** — the base was re-read this session).
Plan: `~/.claude/plans/first-action-before-anything-dreamy-squid.md` · Provenance: **Opus 5, ultracode max effort.**

**Phase 2 is closed and recorded** — see `07_PHASE2_REPORT.md` (report), `06_dismissal_census_verified.md`
(census), and `DECISIONS.md §J2/§SKY-2`. Its own handoff text is superseded by this file; nothing in it was lost.

---

## ★ STEP 0 — THE LINT GAP IS CLOSED

The Cowork prep run could not execute eslint: `node_modules` carries
`@unrs/resolver-binding-darwin-arm64` (correct for Sky's Mac) but that session's shell ran in a Linux VM
(`linux-arm64`), so `eslint-import-resolver-typescript`'s native binding failed to load and eslint aborted
**before linting**. It recorded this as an environment limit and asked for a local run rather than claiming green.

**Verified 2026-07-27 on Sky's Mac, at the Phase-2 tip `f6ac258` (which includes the `4cb3c37` flip and the
`007523d` `database.ts` addition):**

```
npm run lint  →  exit 0
✖ 79 problems (0 errors, 79 warnings)
```

**The baseline holds exactly — 0 errors / 79 warnings.** The prep run's reasoning was sound: `eslint.config.js`
declares no `max-len` and no `no-unnecessary-condition`, and the flip was a boolean literal plus comments.
The 79 warnings are the known set (`featureFlags` unused import ×1 · `flags.ts` console/any ×10 ·
`flagsStore.tsx` console ×3 · `NearbyFlagsModal` exhaustive-deps ×1 — the four files that have carried them
all along). **Backlog item §SKY-3e#5 is discharged for this tip.**

## Gate baseline this train must hold

| Gate | Baseline |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors / **79** warnings |
| `npm test` | 167 suites · 2310 passed · 0 failed · 84 todo |
| `src/components/ui/GlassSurface.tsx` | **0 changed lines** |
| migrations applied by an agent | **0** |

Coverage: `src/lib/**` is in scope at an 80% threshold on all four metrics; `src/screens/**`,
`src/components/**`, `src/hooks/**` are excluded — so every new `src/lib/` module needs its own tests.

Hygiene verified this session: `_to_delete/` contains **no** test files (stale git lock files only), so the
jest counts above are honest. ⚠ `.claude/launch.json` shows deleted-unstaged in Sky's working tree — **not
this train's file, deliberately untouched.**

---

## Completed

| Commit | Item |
|---|---|
| `58cd047` | **Step 0 · the FIRST ACTION** — `DECISIONS.md §SKY-3g` (Sky's B-1 Option-B design, verbatim) + `§SKY-3h` (her Phase-3 scope picks) |
| `58bea81` | **Step 0 · the lint gap CLOSED** — 0 errors / exactly 79 warnings, run locally |
| `b288ffc` | **SR-117a** drift-capture — and a **second** drift nobody had found (`ON DELETE SET NULL`); DDL half = a Sky fork, Option B flagged destructive |
| `5904657` | **SR-117b** type honesty (`string \| null` on Row shapes only) + 10 tests pinning the `==` ownership trap |
| `1d8237c` | **G5 · C1** `useSurfaceTrigger` + 10 unit tests |
| `cf0aff9` | **G5 · C2** `PressableScale` forwards a ref |
| `47a4810` `4e8e229` `4e653cc` | **G5 · C3/C4/C5** Nearby · Report · Legend |
| `0e27df2` | **G5 · C6** guard assertion **J** |
| `f406d1b` | **A0-2 · G3** the arbiter ran first and **decided the ink**; 4 shipped proof sets re-run exit 0; fork tabled, no code |
| `2129fbe` | **G5 fix** `release()` returned focus at close INTENT — 3/3 adversarial lenses converged; now Android-only and deferred |
| `65dd85e` | **G5 fix** guard J's mirror hole — counts the hook's call sites repo-wide |
| `dfebc65` | **G5 fix** the screen-reader auto-open had no focus return + the hook memoizes its return |
| `b9a74a8` | **fix** two tests that were not testing — a vacuous assert and an intermittent load flake |
| `79c1b86` | **docs** stale ref-count corrected + a `newArchEnabled` warning |

## ⛔ THE VERDICT — read `12_READY_OR_NOT.md` first

**NOT READY TO SUBMIT.** Four blockers, every one of them Sky's: B-1 (Apple 1.2 — see the leg-by-leg score),
B-3 (privacy policy content), B-6 (reviewer credentials), and SR-021 (**no binary-launch evidence exists at
all** — the first proof this app launches on iOS is Sky's next EAS build). Plus the conditional D-B6 gate,
which forbids marking Phase 3 complete or merging until she checks Help/About on a device at AX5.

**Final gate: typecheck 0 · lint 0 errors / exactly 79 warnings · jest 177 suites / 2543 passed / 0 failed /
84 todo · `GlassSurface.tsx` 0 changed lines · box-none 6 sites · migrations applied by an agent: 0.**

## Current

Nothing in flight.

## Remaining — the work-item ledger

| # | Item | State |
|---|---|---|
| **A0-1** | **G5 focus-return** | ✅ **DONE** — 3 adoptions + guard J, adversarially verified, 5 real defects fixed. Record: `09_G5_FOCUS_RETURN.md`. One item **SURFACED not fixed** (the Report submit handoff → PROTECT-18/BP12 seam + device row D-B15) |
| **SR-117** | comment author type lie | ✅ **DONE** — code half shipped; the DDL fork awaits Sky |
| **A0-2** | **G3** grabbers | ⏸ **STOPPED FOR SKY** — arbiter done, ink decided (`inkGlassMuted`, the only candidate clearing 3.0 everywhere), 4 options tabled in `08_G3_GRABBER_ARBITER.md`. No code by design |
| **A0-3** | **B-1** — Report (1.2(b)) · Hide on comments (1.2(c), PARTIAL) · "Flag as wrong" (W1) + dedup | ✅ **BUILT** (8 commits, zero schema change as specified). Adversarially verified: **4 defects fixed**, incl. guest reports falsely reporting failure; **3 HIGH open** → `13_B1_VERIFY_LEDGER.md`. **B-1 does NOT close** — see the leg-by-leg score |
| **A0-4** | the **D-B6 conditional** | ✅ carried verbatim into `12_READY_OR_NOT.md` |
| **Class B** | submission collateral | ✅ **DONE** (`c33dcd4`) — export compliance, the 4 accessed-API reason codes, and the manifest's truth against the new report path now pinned by tests; all were true and asserted by nothing |
| **Class C** | conservation · verdict · Sky's list · device list | ✅ **DONE** — `10_CONSERVATION_TABLE.md` (all 117, and the 12 nobody disposed), `11_SR050_TAKEDOWN_GAP.md`, `12_READY_OR_NOT.md`, `13_B1_VERIFY_LEDGER.md` |
| **Class A** | R-2 guest honesty ×4 · R-13 web-cohort pair · R-1 artifact-only | ❌ **NOT BUILT — the phase's one unmet commitment.** Sky picked all three; the runway went to the B-1 blocker and the defects the adversarial passes surfaced. Reported as a counted residue, never a false green — the same honesty Phase 2 applied to G5. All three remain fully specced in the plan and in `05 §2`; SR-117, the fourth pick, IS done |

**Sequencing law:** SR-117 before A0-3's comment work (a nullable author column changes how ownership is
decided on the very rows Report is added to); A0-1 before A0-3's new `<Modal>` (so guard J and the dismissal
census enrol in that order).

## Carry forward — the two laws Phase 2 discovered

1. **`onAccessibilityEscape` on `<Modal>` is a silent no-op.** RN 0.81.5 forwards an explicit allowlist to
   `RCTModalHostView`; the prop is not in it and typechecks only because `ModalProps` spreads `ViewProps`. It
   works **on a View**. Every escape handler rides the containment node, and guard **B2** fails if one is ever
   moved back. Any new surface this phase obeys the same law.
2. **rn-web drops the prop entirely**, along with `accessibilityViewIsModal`, and stubs
   `setAccessibilityFocus` to an empty body — so **all of A0-1 has zero web-observable delta.** Its first real
   proof is Sky's device pass. Never dress jest green as device green.

## Next action (if resuming cold)

Read this file → `07_PHASE2_REPORT.md` → `DECISIONS.md §SKY-3g/§SKY-3h` → the plan. Verify
`git log --oneline f6ac258..HEAD` matches the Completed table, re-run the gate, then start at the first
not-started row in the ledger.
