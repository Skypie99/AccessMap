# FLAGSTONE SIMULATOR WALK — **PHASE A-2 (AUTHED) CLOSE-OUT**
**Fable 5 · 2026-08-20 · walk + diagnose only. Zero fixes, zero commits, zero tracked-file edits.**

## ★ COMMIT HANDSHAKE (repeated at close)
`git -C ~/AccessMap rev-parse main` = **`bc917891513da35265559f373b110b2a6bd8ea7f`** at session start **and unchanged at close**. Branch `main`, tracked tree clean (only untracked `design-reviews/` artifacts). The walked binary is still valid for every finding below. **Build type = sim-release** (Release config, embedded bundle). Every Session-5 ledger row carries this tag.

## ★★ THE GOVERNING CAVEAT — WHOSE ACCOUNT THIS WAS
Sky signed in with her **real account** (`skylerhalisky@gmail.com`), not the throwaway the prompt anticipated, and that account turned out to be an **ADMIN** (`is_admin = true`) — which she did not expect.
- Evidence: the drawer renders an **Admin** row; the tab-bar count moved 5 (guest) → **6** (signed in), and `RootNavigator.tsx:409` registers Admin only when `isAdmin === true`.
- **Why she didn't know:** `src/lib/admin.ts` documents that `authenticated` held no SELECT grant on `users.is_admin` until **2026-08-18** — the hook returned 42501 and `?? false` laundered it into a clean-looking "not an admin" for months. Her account did not change; the gate started working two days before this walk.
- **Consequence for coverage:** every authed surface here was seen through an admin's eyes. A **normal signed-in user's** view is still unwalked — listed as a real gap below, not silently absorbed.
- **Consequence for safety:** admin reject carries a −20 penalty against a real reporter, so the Production Law was tightened rather than relaxed. No real user's content was touched at any point.

## ★ COVERAGE ARITHMETIC (denominator = the 40-node code census)
| | Phase A | **This session** | **Total** |
|---|---|---|---|
| Fully walked | 27 | **+9** | **36** |
| Partial | 1 (C6 NearbyFlags) | — | 1 |
| **Exercised** | **28/40** | | **37/40** |

The 9 added: **A5b** Profile-signed-in · **C9** Achievements · **C10** ActivityFeed · **C11** MyReports · **C12** MyWatched · **C14** Leaderboard (all six SKY-QUEUE nodes) · **A8** Admin (read-only) · **E1** PhotoGallery · **C8** PhotoLightbox.

**The remaining 3, each explained — no silent gaps:**
| Node | Status |
|---|---|
| **E2 ReportContentModal** | **NOT a coverage gap — a confirmed defect.** Proven unreachable for every user (SW-46). Walking it is impossible until Phase B fixes it. |
| **E3 StatusHistoryModal** | Same — SW-46. |
| **C4 SavedPlaces save-flow** | Still deferred; identical local-CRUD pattern already proven end-to-end via C2 (Phase A judgement, unchanged). |

**Element level:** every walked screen has an AX census with frames under `screens/`; hit targets measured numerically against the 44pt floor throughout, never eyeballed. Both appearances exercised on the new surfaces; Dynamic Type at accessibility-extra-large spot-checked; console streamed continuously to `logs/console-authed.log` (it caught three findings that were invisible on screen).

## ★ WHAT THIS PASS ANSWERED (the questions the prompt asked)
1. **SW-26 — auth-gate bug or wiring bug? NEITHER.** It is an iOS modal-presentation conflict and it affects **every user, signed in or out**. Handlers fire; UIKit refuses. → **SW-46 (BLOCKER)**, with the fix already proven inside this codebase → **SW-46-A**.
2. **SW-30 signed in — worse, identical, or absent? IDENTICAL**, and now with a sharper repro: same-parent re-open does *not* crash; it needs a **second FlagDetail host for the same flagId**. Reproduced **4 times across 2 flags and 3 different second-parents**. → **SW-47**.
3. **SW-37 — auth or location?** **Location.** Signed in with location granted the report completes to the edge (Submit enabled, real coordinates). The missing manual-pin fallback for anyone who denies location is the real gap.
4. **SW-20 — resolved by auth?** Yes for the guest gating (switch reports `enabled=1` signed in), but a new intermittent-inertness defect appeared → **SW-49**.
5. **SW-31 — still true?** **No, not universally.** "Try again" recovered cleanly twice under auth → **SW-48** (a correction, not a new bug).
6. **SW-01** — unchanged; the consent line is a signed-out surface and auth does not touch it.

## ★ NEW FINDINGS THIS SESSION: SW-38 → SW-53 (16 rows), incl. **2 BLOCKERS**
- **SW-46 BLOCKER** — the Apple 1.2(b) abuse-report path is **100% unreachable app-wide**, for flags and comments. Store-review relevant.
- **SW-47 BLOCKER** — SW-30 confirmed identical under auth, with a precise mechanism.
- **SW-52 High (privacy)** — a photo attached to a **cancelled** report is silently published with your **next** report.
- **SW-42 High** — the two KAV-wrapped profile sheets render at 36.8% / 52.3% of screen and clip their own content; C12's empty-state instruction is 100% invisible.
- Full detail, with measurements and evidence paths, in `LEDGER.md` § Session-5.

## ★ `[SIMTEST]` CLEANUP PROOF (full ledger: `SIMTEST_CLEANUP.md`)
| Created | Deleted? |
|---|---|
| 1 flag — `d0246cef-b7cb-4580-ae28-d00e223cd673`, "[SIMTEST] automated QA row…" | ✅ **DELETED** — My Reports 7 → **6**, Home count back to its exact **13 barriers** baseline |
| 1 comment — "SIMTEST automated QA comment" | ✅ removed with its parent flag |
| `push_tokens` row (toggled off then on) | ✅ **RESTORED**, re-verified `value='1'` |
| "Notify on Open" preference (control experiment) | ✅ **RESTORED**, re-verified `value='1'` |
**No real user's content was verified, resolved, rejected, reported, edited or removed.** The only near-miss control was deliberately tapped at y722 — above the Verify row's y739 edge — so a miss could not fire a real verify.

**NOT reversible (Sky authorised explicitly, knowing the cost):** points **90 → 124**, tier **Bronze → Silver**, Achievements **3/13 → 4/13**. The trigger is forward-only; deleting the flag did not return them.
**⚠ Correction on the record:** I told Sky the "create + comment only" option would cost **zero** points. That was wrong — the live app awards +5 report / +3 photo / +1 comment (→ **SW-53**, CLAUDE.md documents none of them). She chose the full walk anyway, so the outcome is unchanged, but the premise she was given was wrong.

## ★ SMALL-SCREEN REPEAT (iPhone 17e, 390×844) — DONE
Sky signed in on the 17e separately. **A5b Profile PASSES** (124 pts / Silver / full activity feed / nav rows 342×69–85 ✓). **C12 MyWatched reproduces SW-42** with a diagnostic nuance worth Phase B's attention: the sheet card is **354pt on the 17e vs 352pt on the Pro Max — essentially constant across a 112pt difference in screen height**, so the cause looks like a fixed/collapsed height rather than a mis-evaluated `maxHeight:'85%'` (which would have given 717pt / 813pt). **SW-40 and SW-43 both confirmed at 390pt** (tier chip 83×32; row titles 326×22), while the Tasks action buttons all clear the floor (100/67/69/69 × 45).
**One deliberate substitution:** the prompt's "one verify action" was **not fired** on this device. The only remaining flags are real users' (forbidden — and this account is an admin, so a mis-tap carries a −20 penalty against a real reporter) and the `[SIMTEST]` row was already deleted; creating a second test flag would have cost **another ~+15 non-undoable points** for no new information, the verify/resolve path having already been walked end-to-end on the Pro Max. The same controls were **measured** at 390pt instead, which is the sizing evidence this pass exists for. Recorded as a substitution, not a silent skip. Detail: `screens/17e_authed_smallscreen.md`.
**Stale-cache check — clean:** the 17e arrived showing "14 barriers" and the deleted `[SIMTEST]` flag (real-time updates are OFF, so no refetch). **Pull-to-refresh cleared it immediately** — header back to "OPEN 9". Expected behaviour, no finding.
**Credential boundary held:** an iOS "Save Password?" sheet blocked the 17e on arrival. The agent did not touch it; Sky dismissed it herself (she chose Save). The app's own push priming alert stacked above it was cleared by the agent — an app dialog whose branches were already walked.

## ★ SIGN OUT — WALKED FOR REAL (final action)
Drawer → **Sign out** → `confirm()` dialog **"Sign out?"** with Cancel / Sign out (140×48 each ✓) → confirmed. Result: clean return to **SignInScreen** (Sign in · Create account · Browse without an account), tab bar gone, session fully cleared. `shots/promax-authed/W9_signed_out.png`. **Both simulators are now signed out / at rest.**

## ★ HONEST DEVICE-ONLY REMAINDER (the TestFlight pass owns these)
- **Real VoiceOver** reading order and rotor — the AX tree is a proxy, not a screen reader (SW-23 and SW-03 verdicts still ride on this).
- **Camera capture** and real-world EXIF — the sim has no camera; the sanitizer's *code path* is verified present (`flags.ts:810`) but was never observed executing, because it runs on upload.
- **Push notification delivery**, and the **OS notification permission dialog** — unreachable here: authorization was already determined in Phase A onboarding and `simctl privacy` has no `notifications` service, so only a fresh install can make iOS ask again.
- **Real GPS** drift/accuracy; **release-binary** performance and blur-over-live-tiles; **force-rotate** (portrait lock honoured, never physically rotated); real touch feel and haptics.
- **A normal (non-admin) signed-in user's view** — see the governing caveat.
- **Tie rendering on the leaderboard** — the live data has no ties (166/90/21/10), so it is unverified, not passed.

## ★ SEVERITY ROLLUP — GUEST + AUTHED COMBINED
**48 distinct finding IDs exist across all artifacts** (verified by sweeping every `SW-nn` in this directory). Numbering gaps SW-04/05/15/18/24 were never assigned.
*(Corrected 2026-08-20: an earlier version of this rollup listed 44 and omitted **SW-10** and **SW-13** — both are restored below.)*
- **BLOCKER — 2 defects across 3 IDs:** SW-30 ≡ **SW-47** (realtime re-subscribe crash, cross-parent, cross-tab blast radius) · **SW-46** (abuse-report path unreachable app-wide — Apple 1.2(b))
- **HIGH (7):** SW-01 (consent off-screen, worse on small) · SW-23 (FlagDetail AX void — PLAUSIBLE, device) · SW-28 (View-on-Map no focus) · SW-31 (boundary copy false — recovery half corrected by SW-48) · SW-37 (report dead-ends without location) · **SW-42** (profile sheets undersized + clipping) · **SW-52** (cancelled-report photo published with the next report)
- **MED (20):** SW-08, SW-09, SW-11, SW-12, **SW-13**, SW-20, SW-22, SW-25, SW-32, SW-33, **SW-38, SW-39, SW-40, SW-43, SW-44, SW-45, SW-48, SW-49, SW-50, SW-53**
- **LOW (15):** SW-02, SW-03, SW-06, **SW-10**, SW-16, SW-17, SW-19, SW-21, SW-27, SW-29, SW-34, SW-35, SW-36, **SW-41, SW-51**
- **OBS (2):** SW-07 (no forgot-password) · SW-14 (sparse guest profile)
- **SUPERSEDED (1):** SW-26 → **SW-46**
**Detail location note:** SW-08/09/10/11/12/13/14/16/17/19/20/21/25 have their detail in the per-screen banks under `screens/`, not as `LEDGER.md` rows — Phase B must read both.

## ★ VERIFIED-GOOD UNDER AUTH (worth Sky's confidence, and worth protecting in Phase B)
- **Achievements a11y is exemplary** — earned vs locked is carried in the accessible *name* ("…Earned." vs "…Progress: 6 of 10."), never by colour alone.
- **Leaderboard self-highlight** works and is announced ("2nd, Jarvis Mckneil, 90 points, **you**"); other contributors are correctly anonymised to "Member".
- **Per-photo alt-text field** ("Describe the photo for screen reader users") appears the moment a photo is attached — above-average for a UGC app.
- **Every destructive action is `confirm()`-guarded**, including both admin actions, with double-tap protection (`AdminScreen.tsx:145,169`), and the flag Delete dialog behaved correctly.
- **The EXIF promise is stated in the form, beside the control** — not buried in the privacy policy — and the sanitizer genuinely sits in the upload path.
- **Adaptive filter chips** in My Reports offer only statuses that exist (All 6 / Resolved 3 / Rejected 3).
- **Empty states are authored everywhere** — monthly leaderboard, watched flags, comments, hidden comments, blocked people.
- **Permission prompts fire only on user action** (photo library dialog correctly branded "Flagstone").
- The **submit retry banner** ("Still trying — check your signal") kept a slow submit honest instead of failing silently.

## GATE / ONE-WRITER
**Zero commits. Zero tracked-file edits.** All artifacts remain untracked under `design-reviews/sim-walk/2026-08-19/`. Phase B (Opus) owns fixes.

**Recommended Phase B order:** SW-46 first (it is the store-review blocker and the fix is a known-good pattern already in the repo), then SW-47, then SW-52 (privacy — surface to Sky before touching), then SW-42.

## ★ PHASE B IS BRIEFED AND QUEUED — `PHASE_B_MASTER_PLAN.md` (all 48) + `PHASE_B_WAVE_1_BLOCKERS.md` (Wave 1)
Sky's call (2026-08-20): **both Blockers deferred to Phase B rather than fixed in the walk window**, keeping diagnosis and fixes cleanly separated. A ready-to-run brief now sits beside this file — verified root causes, the recommended fix for each with the reasoning, the "do NOT fix it this way" traps, the four false code comments to correct, why the existing unit tests cannot catch SW-46, and per-blocker verification steps.
**Gate baseline partially pinned on `bc91789` during that session: typecheck 0 errors · lint 0 errors / 78 warnings (pre-existing). The jest baseline was NOT captured — Phase B must run it first.**
A scratch branch (`simwalk/sw-46-report-sheets`) was opened and then **deleted with zero commits**; `main` remains `bc91789`, untouched, and this session still stands at **zero commits and zero tracked-file edits**.

**STOP — Phase A-2 complete.**
